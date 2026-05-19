import { FIELD_DEFS, ORDER_NUMBER_RE, RETURNGO_ID_RE, normalizeOrderNumber } from "./flow-data.mjs";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateStep(node, values) {
  for (const key of (node.fields || [])) {
    const def = FIELD_DEFS[key];
    if (!def || !def.required) continue;

    const val = values[key];
    if (def.type === "checkbox" && !val) return `Veuillez cocher : "${def.label}"`;
    if (def.type === "file" && !val) return "Une pièce jointe est obligatoire pour cette demande.";
    if (def.type !== "checkbox" && def.type !== "file" && (!val || !String(val).trim())) {
      return `Le champ "${(def.label || key).replace("*", "")}" est requis.`;
    }
    if (key === "email" && val && !EMAIL_RE.test(String(val).trim().toLowerCase())) {
      return "Adresse e-mail invalide.";
    }
    if ((key === "orderNumber" || key === "orderNumberOpt") && val && !ORDER_NUMBER_RE.test(normalizeOrderNumber(val))) {
      return "Le numero de commande doit contenir uniquement des chiffres.";
    }
    if ((key === "returnId" || key === "returnIdOpt") && val && !RETURNGO_ID_RE.test(String(val).trim())) {
      return "L'ID ReturnGo doit etre au format ARM10984430 ou RMA10984430.";
    }
  }

  return null;
}
