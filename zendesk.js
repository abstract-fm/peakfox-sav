export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, orderNumber, tracking, returnId, note, returnOpened, category, subIssue, agentRecap } = req.body;

  if (!email || !orderNumber) {
    return res.status(400).json({ error: "Email et numéro de commande requis." });
  }

  const auth = Buffer.from(
    `${process.env.ZENDESK_EMAIL}/token:${process.env.ZENDESK_TOKEN}`
  ).toString("base64");

  const subject = `[SAV] ${category || "Demande"} – ${subIssue || ""} – Commande ${orderNumber}`;

  const body = `
${agentRecap || ""}

──────────────────────────────
Détails techniques du formulaire :
- Email client       : ${email}
- N° commande        : ${orderNumber}
- N° suivi           : ${tracking || "Non renseigné"}
- ID ReturnGO        : ${returnId || "Non renseigné"}
- Retour déjà ouvert : ${returnOpened ? "Oui" : "Non"}
- Note client        : ${note || "Aucune"}
  `.trim();

  const payload = {
    ticket: {
      requester: { name: email, email },
      subject,
      comment: { body },
      tags: ["sav_formulaire", category || "", subIssue || ""].filter(Boolean)
    }
  };

  try {
    const response = await fetch(
      `https://${process.env.ZENDESK_DOMAIN}/api/v2/tickets.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Basic ${auth}`
        },
        body: JSON.stringify(payload)
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json({ error: "Erreur Zendesk API", details: errorData });
    }

    const data = await response.json();
    return res.json({ success: true, ticketId: data.ticket?.id });

  } catch (err) {
    return res.status(500).json({ error: "Erreur interne du serveur." });
  }
}
