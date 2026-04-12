require("dotenv").config();
const express = require("express");
const path = require("path");

const app = express();
const PORT = 3000;

// Sert les fichiers statiques (index.html, styles.css, script.js)
app.use(express.static(__dirname));
app.use(express.json());

// ─── Route : création de ticket Zendesk ───────────────────────────────────────
app.post("/api/zendesk", async (req, res) => {
  const { email, orderNumber, tracking, returnId, note, returnOpened, category, subIssue, agentRecap } = req.body;

  // Validation minimale
  if (!email || !orderNumber) {
    return res.status(400).json({ error: "Email et numéro de commande requis." });
  }

  // Authentification Zendesk
  const auth = Buffer.from(
    `${process.env.ZENDESK_EMAIL}/token:${process.env.ZENDESK_TOKEN}`
  ).toString("base64");

  // Construction du sujet du ticket
  const subject = `[SAV] ${category || "Demande"} – ${subIssue || ""} – Commande ${orderNumber}`;

  // Corps du ticket (le récap agent + toutes les infos)
  const body = `
${agentRecap || ""}

──────────────────────────────
Détails techniques du formulaire :
- Email client     : ${email}
- N° commande      : ${orderNumber}
- N° suivi         : ${tracking || "Non renseigné"}
- ID ReturnGO      : ${returnId || "Non renseigné"}
- Retour déjà ouvert : ${returnOpened ? "Oui" : "Non"}
- Note client      : ${note || "Aucune"}
  `.trim();

  // Payload Zendesk
  const payload = {
    ticket: {
      requester: {
        name: email,
        email: email
      },
      subject,
      comment: {
        body
      },
      tags: [
        "sav_formulaire",
        category || "",
        subIssue || ""
      ].filter(Boolean)
    }
  };

  try {
    const { default: fetch } = await import("node-fetch");

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
      console.error("Erreur Zendesk:", errorData);
      return res.status(response.status).json({ error: "Erreur Zendesk API", details: errorData });
    }

    const data = await response.json();
    const ticketId = data.ticket?.id;

    console.log(`✅ Ticket Zendesk créé : #${ticketId}`);
    return res.json({ success: true, ticketId });

  } catch (err) {
    console.error("Erreur serveur:", err);
    return res.status(500).json({ error: "Erreur interne du serveur." });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Serveur lancé sur http://localhost:${PORT}`);
});
