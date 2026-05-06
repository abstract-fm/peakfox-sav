import { FIELD_DEFS, normalizeOrderNumber } from "./flow-data.mjs";

function collectContextNote(values) {
  return Object.entries(values)
    .filter(([key, value]) => {
      if (!value || typeof value !== "string" || !value.trim()) return false;
      return key.endsWith("_context")
        || key.endsWith("Message")
        || key === "message"
        || key === "messageOpt"
        || key === "modifDetail"
        || key === "newAddress";
    })
    .map(([, value]) => value)
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

  const res = await fetch("/api/zendesk", {
    method: "POST",
    body: formData
  });

  const rawResponse = await res.text();
  let data;
  try {
    data = rawResponse ? JSON.parse(rawResponse) : {};
  } catch {
    throw new Error(`Réponse non JSON du serveur: ${rawResponse.slice(0, 300) || "vide"}`);
  }

  if (!data.success) {
    const detailText =
      data.details && typeof data.details === "object"
        ? JSON.stringify(data.details)
        : "";
    throw new Error([data.error || "Erreur inconnue", detailText].filter(Boolean).join(" - "));
  }

  return data;
}
