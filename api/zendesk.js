const fs = require("fs");
const path = require("path");

const mappingPath = path.join(__dirname, "..", "zendesk-field-mapping.json");
const MAX_NOTE_LENGTH = 3000;
const MAX_TEXT_LENGTH = 160;
const MAX_PATH_IDS = 6;
const MAX_FILES = 3;
const MAX_FILE_SIZE = 15 * 1024 * 1024;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ORDER_NUMBER_RE = /^\d+$/;
const RETURNGO_ID_RE = /^(ARM|RMA)\d{8}$/i;
const ALLOWED_FILE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".pdf", ".doc", ".docx"]);
const CATEGORY_IDS = new Set([
  "annulation",
  "modification",
  "suivi",
  "retour",
  "remboursement",
  "reception",
  "autre"
]);
const KNOWN_PATH_IDS = new Set([
  ...CATEGORY_IDS,
  "modif_non_expediee",
  "modif_expediee",
  "retour_delai_oui"
]);
const SUBISSUE_RULES = {
  annul_plus_24h: { categoryId: "annulation", requireOrder: true },
  annul_oms_plus_24h: { categoryId: "annulation", requireOrder: true },
  annul_introuvable: { categoryId: "annulation", requireOrder: true },

  modif_non_exp_adresse: { categoryId: "modification", requireOrder: true, requireNote: true },
  modif_non_exp_produit: { categoryId: "modification", requireOrder: true, requireNote: true },
  modif_non_exp_info: { categoryId: "modification", requireOrder: true, requireNote: true },
  modif_exp_adresse: { categoryId: "modification", requireOrder: true, requireNote: true },
  modif_exp_information: { categoryId: "modification", requireOrder: true, requireNote: true },
  modif_introuvable: { categoryId: "modification", requireOrder: true, requireNote: true },

  suivi_pas_suivi: { categoryId: "suivi", requireOrder: true },
  suivi_retard: { categoryId: "suivi", requireOrder: true },
  suivi_bloque: { categoryId: "suivi", requireOrder: true },
  suivi_relais: { categoryId: "suivi", requireOrder: true, requireNote: true },
  suivi_livre_non_recu: { categoryId: "suivi", requireOrder: true, requireNote: true, requireAttachment: true },

  retour_delai_non: { categoryId: "retour", requireNote: true },
  retour_bloque: { categoryId: "retour", requireOrder: true, requireNote: true },

  remb_non_recu: { categoryId: "remboursement", requireNote: true },
  remb_montant_incorrect: { categoryId: "remboursement", requireNote: true },

  recep_endommage: { categoryId: "reception", requireOrder: true, requireNote: true, requireAttachment: true },
  recep_manquant: { categoryId: "reception", requireOrder: true, requireNote: true },
  recep_mauvais: { categoryId: "reception", requireOrder: true, requireNote: true, requireAttachment: true },
  recep_incompatible: { categoryId: "reception", requireOrder: true, requireNote: true },
  defectueux: { categoryId: "reception", requireOrder: true, requireNote: true },

  autre: { categoryId: "autre", requireNote: true }
};

Object.keys(SUBISSUE_RULES).forEach(id => KNOWN_PATH_IDS.add(id));

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

function cleanText(value, maxLength = MAX_TEXT_LENGTH) {
  const text = value == null ? "" : String(value).trim();
  return text.length > maxLength ? text.slice(0, maxLength) : text;
}

function normalizeOrderNumber(value) {
  return String(value || "").replace(/\D/g, "");
}

function validateFile(file) {
  if (!file || !file.buffer?.length) return "Piece jointe vide.";
  if (file.buffer.length > MAX_FILE_SIZE) return `Piece jointe trop lourde: ${file.filename}.`;

  const extension = path.extname(file.filename || "").toLowerCase();
  if (!ALLOWED_FILE_EXTENSIONS.has(extension)) {
    return `Format de piece jointe non autorise: ${file.filename}.`;
  }

  return null;
}

function validateSubmission(body = {}, files = []) {
  const sanitized = {
    email: cleanText(body.email, 254).toLowerCase(),
    orderNumber: normalizeOrderNumber(cleanText(body.orderNumber, 40)),
    tracking: cleanText(body.tracking, 80),
    returnId: cleanText(body.returnId, 40).toUpperCase(),
    note: cleanText(body.note, MAX_NOTE_LENGTH),
    category: cleanText(body.category),
    categoryId: cleanText(body.categoryId, 80),
    subIssue: cleanText(body.subIssue),
    subIssueId: cleanText(body.subIssueId, 80),
    orderStatusOms: cleanText(body.orderStatusOms, 80),
    pathIds: Array.isArray(body.pathIds) ? body.pathIds.map(id => cleanText(id, 80)).filter(Boolean) : []
  };

  const errors = [];
  const rule = SUBISSUE_RULES[sanitized.subIssueId];

  if (!EMAIL_RE.test(sanitized.email)) errors.push("Adresse e-mail invalide.");
  if (!CATEGORY_IDS.has(sanitized.categoryId)) errors.push("Categorie inconnue.");
  if (!rule) errors.push("Sous-categorie inconnue.");
  if (rule && rule.categoryId !== sanitized.categoryId) errors.push("Sous-categorie incompatible avec la categorie.");
  if (sanitized.orderNumber && !ORDER_NUMBER_RE.test(sanitized.orderNumber)) {
    errors.push("Le numero de commande doit contenir uniquement des chiffres.");
  }
  if (sanitized.returnId && !RETURNGO_ID_RE.test(sanitized.returnId)) {
    errors.push("L'ID ReturnGo doit etre au format ARM10984430 ou RMA10984430.");
  }
  if (rule?.requireOrder && !sanitized.orderNumber) errors.push("Numero de commande requis.");
  if (rule?.requireReturn && !sanitized.returnId) errors.push("ID ReturnGo requis.");
  if (rule?.requireNote && !sanitized.note) errors.push("Message client requis.");
  if (body.note && String(body.note).trim().length > MAX_NOTE_LENGTH) {
    errors.push(`Message client limite a ${MAX_NOTE_LENGTH} caracteres.`);
  }
  if (sanitized.pathIds.length > MAX_PATH_IDS) errors.push("Chemin de formulaire invalide.");
  if (sanitized.pathIds.some(id => !KNOWN_PATH_IDS.has(id))) errors.push("Chemin de formulaire inconnu.");
  if (sanitized.pathIds.length && !sanitized.pathIds.includes(sanitized.categoryId)) {
    errors.push("Chemin de formulaire sans categorie.");
  }
  if (sanitized.pathIds.length && !sanitized.pathIds.includes(sanitized.subIssueId)) {
    errors.push("Chemin de formulaire sans sous-categorie.");
  }
  if (files.length > MAX_FILES) errors.push(`Maximum ${MAX_FILES} pieces jointes autorisees.`);
  if (rule?.requireAttachment && files.length === 0) errors.push("Piece jointe obligatoire pour cette demande.");

  files.forEach(file => {
    const error = validateFile(file);
    if (error) errors.push(error);
  });

  return { errors, sanitized };
}

function readRequestBuffer(req) {
  if (Buffer.isBuffer(req.body)) return Promise.resolve(req.body);
  if (typeof req.body === "string") return Promise.resolve(Buffer.from(req.body, "latin1"));

  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", chunk => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function parseContentDisposition(value) {
  const result = {};
  String(value || "").split(";").forEach((part) => {
    const [rawKey, ...rawValue] = part.trim().split("=");
    if (!rawKey || !rawValue.length) return;
    result[rawKey.toLowerCase()] = rawValue.join("=").trim().replace(/^"|"$/g, "");
  });
  return result;
}

function parseMultipartBody(buffer, contentType) {
  const boundaryMatch = String(contentType || "").match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!boundaryMatch) return { fields: {}, files: [] };

  const boundary = Buffer.from(`--${boundaryMatch[1] || boundaryMatch[2]}`);
  const fields = {};
  const files = [];
  let cursor = buffer.indexOf(boundary);

  while (cursor !== -1) {
    cursor += boundary.length;
    if (buffer[cursor] === 45 && buffer[cursor + 1] === 45) break;
    if (buffer[cursor] === 13 && buffer[cursor + 1] === 10) cursor += 2;

    const headerEnd = buffer.indexOf(Buffer.from("\r\n\r\n"), cursor);
    if (headerEnd === -1) break;

    const headerText = buffer.slice(cursor, headerEnd).toString("latin1");
    const headers = {};
    headerText.split("\r\n").forEach((line) => {
      const separator = line.indexOf(":");
      if (separator === -1) return;
      headers[line.slice(0, separator).toLowerCase()] = line.slice(separator + 1).trim();
    });

    const nextBoundary = buffer.indexOf(boundary, headerEnd + 4);
    if (nextBoundary === -1) break;

    let contentEnd = nextBoundary;
    if (buffer[contentEnd - 2] === 13 && buffer[contentEnd - 1] === 10) contentEnd -= 2;
    const content = buffer.slice(headerEnd + 4, contentEnd);
    const disposition = parseContentDisposition(headers["content-disposition"]);

    if (disposition.filename) {
      files.push({
        fieldName: disposition.name || "attachments",
        filename: path.basename(disposition.filename),
        contentType: headers["content-type"] || "application/octet-stream",
        buffer: content
      });
    } else if (disposition.name) {
      fields[disposition.name] = content.toString("utf8");
    }

    cursor = nextBoundary;
  }

  return { fields, files };
}

async function getRequestPayload(req) {
  const contentType = req.headers["content-type"] || "";
  if (contentType.includes("multipart/form-data")) {
    const buffer = await readRequestBuffer(req);
    const parsed = parseMultipartBody(buffer, contentType);
    const payload = parsed.fields.payload ? JSON.parse(parsed.fields.payload) : {};
    return { body: payload, files: parsed.files };
  }

  return { body: req.body || {}, files: [] };
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

async function uploadZendeskFile({ zendeskDomain, auth, file }) {
  const response = await fetch(
    `https://${zendeskDomain}/api/v2/uploads.json?filename=${encodeURIComponent(file.filename)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": file.contentType,
        Accept: "application/json",
        Authorization: `Basic ${auth}`
      },
      body: file.buffer
    }
  );

  const rawBody = await response.text();
  let data;
  try {
    data = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    data = { error: rawBody || `HTTP ${response.status}` };
  }

  if (!response.ok) {
    const error = new Error(formatZendeskError(data));
    error.status = response.status;
    error.details = data;
    throw error;
  }

  return data.upload?.token;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let requestData;
  try {
    requestData = await getRequestPayload(req);
  } catch (error) {
    return res.status(400).json({
      error: "Requete invalide.",
      details: error?.message || "Payload impossible a lire."
    });
  }

  const files = requestData.files.filter(file => file.buffer.length > 0);

  const validation = validateSubmission(requestData.body, files);
  if (validation.errors.length) {
    return res.status(400).json({
      error: validation.errors[0],
      details: validation.errors
    });
  }

  const {
    email,
    orderNumber,
    tracking,
    returnId,
    note,
    category,
    categoryId,
    subIssue,
    subIssueId,
    orderStatusOms,
    pathIds
  } = validation.sanitized;

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

  const referenceLabel = orderNumber
    ? `Commande ${orderNumber}`
    : returnId
      ? `Retour ${returnId}`
      : "Sans reference";
  const subject = `[SAV] ${category || "Demande"} - ${subIssue || ""} - ${referenceLabel}`;
  const resolvedClientNote = note || "";

  const body = resolvedClientNote || "Aucune note client.";

  const context = {
    email,
    orderNumber,
    tracking,
    returnId,
    note: resolvedClientNote,
    category,
    categoryId,
    subIssue,
    subIssueId,
    orderStatusOms,
    pathIds
  };

  try {
    const uploadTokens = [];
    for (const file of files) {
      const token = await uploadZendeskFile({ zendeskDomain, auth, file });
      if (token) uploadTokens.push(token);
    }

    const customFieldConfig = loadZendeskMapping();
    const routing = buildZendeskRouting(customFieldConfig, context);
    const payload = {
      ticket: {
        requester: { name: email, email },
        subject,
        comment: {
          body,
          ...(uploadTokens.length ? { uploads: uploadTokens } : {})
        },
        tags: routing.tags.length ? routing.tags : ["sav_formulaire"]
      }
    };

    if (routing.customFields.length) {
      payload.ticket.custom_fields = routing.customFields;
    }

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
