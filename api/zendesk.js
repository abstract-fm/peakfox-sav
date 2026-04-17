const fs = require("fs");
const path = require("path");

const mappingPath = path.join(__dirname, "..", "zendesk-field-mapping.json");

function loadZendeskMapping() {
  const raw = fs.readFileSync(mappingPath, "utf8");
  const parsed = JSON.parse(raw);
  return parsed.customFields || {};
}

function toZendeskTag(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function getValueByPath(source, context) {
  return String(source || "")
    .split(".")
    .filter(Boolean)
    .reduce((current, key) => (current == null ? undefined : current[key]), context);
}

function pushCustomField(customFields, id, value) {
  const normalizedId = Number(id);
  if (!normalizedId || value == null || value === "") return;
  customFields.push({ id: normalizedId, value });
}

function formatZendeskError(errorData) {
  if (!errorData) return "Erreur Zendesk API";
  if (typeof errorData === "string") return errorData;
  if (Array.isArray(errorData.details?.base) && errorData.details.base.length) {
    return errorData.details.base.join(", ");
  }
  if (typeof errorData.description === "string" && errorData.description) {
    return errorData.description;
  }
  if (typeof errorData.error === "string" && errorData.error) {
    return errorData.error;
  }
  return "Erreur Zendesk API";
}

function getRequiredEnv(name) {
  const value = process.env[name];
  return typeof value === "string" ? value.trim() : "";
}

function buildZendeskRouting(customFieldConfig, context) {
  const customFields = [];

  Object.values(customFieldConfig).forEach((field) => {
    if (!field || !field.id || !field.source) return;

    const rawValue = getValueByPath(field.source, context);
    const mappedValue = field.values && rawValue != null
      ? (field.values[rawValue] ?? "")
      : rawValue;

    pushCustomField(customFields, field.id, mappedValue);
  });

  const tags = [
    "sav_formulaire",
    context.categoryId,
    context.subIssueId,
    ...(Array.isArray(context.pathIds) ? context.pathIds : [])
  ].map(toZendeskTag).filter(Boolean);

  return { customFields, tags };
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const {
    email,
    orderNumber,
    tracking,
    returnId,
    note,
    returnOpened,
    category,
    categoryId,
    subIssue,
    subIssueId,
    path,
    pathIds,
    formValues,
    articleLinks,
    agentRecap
  } = req.body;

  if (!email || (!orderNumber && !returnId)) {
    return res.status(400).json({ error: "Email et numero de commande ou ID retour requis." });
  }

  const zendeskEmail = getRequiredEnv("ZENDESK_EMAIL");
  const zendeskToken = getRequiredEnv("ZENDESK_TOKEN");
  const zendeskDomain = getRequiredEnv("ZENDESK_DOMAIN");

  if (!zendeskEmail || !zendeskToken || !zendeskDomain) {
    return res.status(500).json({
      error: "Configuration Zendesk manquante",
      details: {
        ZENDESK_EMAIL: Boolean(zendeskEmail),
        ZENDESK_TOKEN: Boolean(zendeskToken),
        ZENDESK_DOMAIN: Boolean(zendeskDomain)
      }
    });
  }

  const auth = Buffer.from(
    `${zendeskEmail}/token:${zendeskToken}`
  ).toString("base64");

  const referenceLabel = orderNumber ? `Commande ${orderNumber}` : `Retour ${returnId}`;
  const subject = `[SAV] ${category || "Demande"} - ${subIssue || ""} - ${referenceLabel}`;

  const body = `
${agentRecap || ""}

------------------------------
Details techniques du formulaire :
- Email client       : ${email}
- N commande         : ${orderNumber}
- N suivi            : ${tracking || "Non renseigne"}
- ID ReturnGO        : ${returnId || "Non renseigne"}
- Retour deja ouvert : ${returnOpened ? "Oui" : "Non"}
- Categorie ID       : ${categoryId || "Non renseigne"}
- Sous-sujet ID      : ${subIssueId || "Non renseigne"}
- Chemin             : ${path || "Non renseigne"}
- Note client        : ${note || "Aucune"}
  `.trim();

  const context = {
    email,
    orderNumber,
    tracking,
    returnId,
    note,
    returnOpened,
    category,
    categoryId,
    subIssue,
    subIssueId,
    path,
    pathIds,
    formValues: formValues || {},
    articleLinks: articleLinks || {}
  };

  const customFieldConfig = loadZendeskMapping();
  const routing = buildZendeskRouting(customFieldConfig, context);
  const payload = {
    ticket: {
      requester: { name: email, email },
      subject,
      comment: { body },
      tags: routing.tags.length ? routing.tags : ["sav_formulaire"]
    }
  };

  if (routing.customFields.length) {
    payload.ticket.custom_fields = routing.customFields;
  }

  try {
    const response = await fetch(
      `https://${zendeskDomain}/api/v2/tickets.json`,
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
      const rawError = await response.text();
      let errorData;
      try {
        errorData = rawError ? JSON.parse(rawError) : {};
      } catch {
        errorData = { error: rawError || `HTTP ${response.status}` };
      }

      console.error("Erreur Zendesk API:", {
        status: response.status,
        body: errorData
      });

      return res.status(response.status).json({
        error: formatZendeskError(errorData),
        details: errorData
      });
    }

    const rawSuccess = await response.text();
    const data = rawSuccess ? JSON.parse(rawSuccess) : {};
    return res.json({ success: true, ticketId: data.ticket?.id });
  } catch (error) {
    console.error("Erreur serveur /api/zendesk:", {
      message: error?.message,
      stack: error?.stack,
      causeMessage: error?.cause?.message,
      causeCode: error?.cause?.code
    });

    return res.status(500).json({
      error: error?.message || "Erreur interne du serveur.",
      details: {
        causeMessage: error?.cause?.message || null,
        causeCode: error?.cause?.code || null,
        zendeskDomain
      }
    });
  }
};
