import { FIELD_DEFS, normalizeOrderNumber } from "./flow-data.mjs";
const SUBMIT_TIMEOUT_MS = 15000;
const DEFAULT_SUBMIT_ERROR = "Impossible d'envoyer votre demande pour le moment. Reessayez dans quelques instants.";
const TIMEOUT_ERROR = "Le serveur met trop de temps a repondre. Reessayez dans quelques instants.";
const VALIDATION_ERROR = "Certaines informations sont manquantes ou invalides. Verifiez le formulaire puis reessayez.";
const FORBIDDEN_ERROR = "La demande ne peut pas etre envoyee depuis cette page.";
const RATE_LIMIT_ERROR = "Trop de demandes ont ete envoyees. Reessayez plus tard.";
const SERVICE_ERROR = "Le service est temporairement indisponible. Reessayez plus tard.";

const CLEAN_SERVER_MESSAGES = new Set([
  "Adresse e-mail invalide.",
  "Numero de commande requis.",
  "Le numero de commande doit contenir uniquement des chiffres.",
  "Cette commande est introuvable. Verifiez le numero saisi ou contactez-nous directement.",
  "ID ReturnGo requis.",
  "L'ID ReturnGo doit etre au format ARM10984430 ou RMA10984430.",
  "Message client requis.",
  "Une piece jointe est obligatoire pour cette demande.",
  "Une pièce jointe est obligatoire pour cette demande.",
  "Piece jointe obligatoire pour cette demande.",
  "Trop de demandes. Reessayez plus tard.",
  "Service temporairement indisponible.",
  "Impossible de creer la demande pour le moment."
]);

function createSubmitError(message) {
  const error = new Error(message || DEFAULT_SUBMIT_ERROR);
  error.isUserFacing = true;
  return error;
}

function cleanServerMessage(data, status) {
  const message = typeof data?.error === "string" ? data.error : "";

  if (message && CLEAN_SERVER_MESSAGES.has(message)) return message;
  if (status === 400) return VALIDATION_ERROR;
  if (status === 403) return FORBIDDEN_ERROR;
  if (status === 429) return RATE_LIMIT_ERROR;
  if (status === 504 || status === 408) return TIMEOUT_ERROR;
  if (status >= 500) return SERVICE_ERROR;
  return DEFAULT_SUBMIT_ERROR;
}

function collectContextNote(values) {
  const excludedKeys = new Set([
    "email",
    "orderNumber",
    "orderNumberOpt",
    "trackingNumber",
    "returnId",
    "returnIdOpt"
  ]);

  return Object.entries(values)
    .filter(([key, value]) => {
      if (!value || typeof value !== "string" || !value.trim()) return false;
      return !excludedKeys.has(key);
    })
    .map(([key, value]) => `${FIELD_DEFS[key]?.label?.replace("*", "") || key}: ${value}`)
    .join("\n") || "";
}

export function buildZendeskPayload(state) {
  const orderStatusNode = [...state.path].reverse().find(item => item.orderStatusOms);

  return {
    email:       state.values.email       || "",
    orderNumber: normalizeOrderNumber(state.values.orderNumber || state.values.orderNumberOpt || ""),
    tracking:    state.values.trackingNumber || "",
    returnId:    state.values.returnId    || state.values.returnIdOpt || "",
    note:        collectContextNote(state.values),
    category:    state.path[0]?.label     || "",
    categoryId:  state.path[0]?.id        || "",
    subIssue:    state.path[state.path.length - 1]?.label || "",
    subIssueId:  state.path[state.path.length - 1]?.id    || "",
    orderStatusOms: orderStatusNode?.orderStatusOms || "",
    pathIds:     state.path.map(n => n.id),
    formRenderedAt: state.formRenderedAt,
    companyWebsite: ""
  };
}

export async function submitZendeskRequest({ node, state }) {
  const formData = new FormData();
  formData.append("payload", JSON.stringify(buildZendeskPayload(state)));

  (node.fields || []).forEach(key => {
    const def = FIELD_DEFS[key];
    const el = document.getElementById("f-" + key);
    if (def?.type !== "file" || !el?.files?.length) return;
    [...el.files].forEach(file => formData.append("attachments", file, file.name));
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SUBMIT_TIMEOUT_MS);

  let res;
  try {
    res = await fetch("/api/zendesk", {
      method: "POST",
      body: formData,
      signal: controller.signal
    });
  } catch (error) {
    if (error?.name === "AbortError") throw createSubmitError(TIMEOUT_ERROR);
    throw createSubmitError(DEFAULT_SUBMIT_ERROR);
  } finally {
    clearTimeout(timeoutId);
  }

  const rawResponse = await res.text();
  let data;
  try {
    data = rawResponse ? JSON.parse(rawResponse) : {};
  } catch {
    throw createSubmitError(cleanServerMessage(null, res.status));
  }

  if (!data.success) {
    throw createSubmitError(cleanServerMessage(data, res.status));
  }

  return data;
}
