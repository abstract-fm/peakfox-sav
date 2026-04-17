import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
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

export default async function handler(req, res) {
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

  if (!email || !orderNumber) {
    return res.status(400).json({ error: "Email et numero de commande requis." });
  }

  const auth = Buffer.from(
    `${process.env.ZENDESK_EMAIL}/token:${process.env.ZENDESK_TOKEN}`
  ).toString("base64");

  const subject = `[SAV] ${category || "Demande"} - ${subIssue || ""} - Commande ${orderNumber}`;

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
  } catch {
    return res.status(500).json({ error: "Erreur interne du serveur." });
  }
}
