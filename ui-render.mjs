import { FIELD_DEFS, FLOW } from "./flow-data.mjs";
import { validateStep } from "./validation.mjs";
import { submitZendeskRequest } from "./api-submit.mjs";

const state = {
  path: [],
  values: {},
  done: false,
  ticketId: null,
  formRenderedAt: 0
};

let stepRoot;
let resultRoot;
let progressBar;
let stepLabel;
let pathLabel;

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function currentNode() {
  return state.path.length ? state.path[state.path.length - 1] : null;
}

function updateMeta() {
  const depth = state.path.length;
  const pct = Math.min(Math.round((depth / 4) * 88) + 6, 92);
  progressBar.style.width = `${pct}%`;
  stepLabel.textContent = `Étape ${Math.min(depth + 1, 4)} / 4`;
  pathLabel.textContent = state.path.length
    ? state.path.map(n => n.label).join(" → ")
    : "Aucun chemin sélectionné";
}

function render() {
  updateMeta();
  resultRoot.classList.add("hidden");
  resultRoot.innerHTML = "";
  stepRoot.innerHTML = "";

  if (state.done) { renderConfirm(); return; }

  const node = currentNode();
  if (!node) { renderOptions({ question: FLOW.rootQuestion, children: FLOW.categories }); return; }
  if (node.children && node.children.length) { renderOptions(node); return; }
  if (node.outcome === "selfservice") { renderSelfService(node); return; }
  renderForm(node);
}

function renderOptions(node) {
  const items = node.children || FLOW.categories;

  stepRoot.innerHTML = `
    ${node.topBanner ? `<div class="hint" style="margin-bottom:18px">${escapeHtml(node.topBanner)}</div>` : ""}
    <h2 class="question">${escapeHtml(node.question || node.label || FLOW.rootQuestion)}</h2>
    <div class="options">
      ${items.map(c => `<button class="option-btn" data-id="${escapeHtml(c.id)}">${escapeHtml(c.label)}</button>`).join("")}
    </div>
    ${state.path.length ? `<div class="actions"><button class="secondary-btn" id="backBtn">Retour</button></div>` : ""}
  `;

  stepRoot.querySelectorAll(".option-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const child = items.find(c => c.id === btn.dataset.id);
      if (child) { state.path.push(child); render(); }
    });
  });

  const back = stepRoot.querySelector("#backBtn");
  if (back) back.addEventListener("click", () => { state.path.pop(); render(); });
}

function renderSelfService(node) {
  const ss = node.selfservice;
  const fields = node.fields || [];
  const isHashLink = typeof ss.ctaHref === "string" && ss.ctaHref.startsWith("#");
  stepRoot.innerHTML = `
    <div class="result success">
      <h3>${escapeHtml(ss.title)}</h3>
      <p>${escapeHtml(ss.body)}</p>
    </div>
    ${fields.length ? `
      <div class="stack" style="margin-top:18px">
        ${fields.map(renderField).join("")}
      </div>
      <div id="errBox" class="result danger hidden" style="margin-top:16px"></div>
    ` : ""}
    <div class="actions" style="margin-top:24px">
      <button class="secondary-btn" id="backBtn">Retour</button>
      <a class="primary-btn" id="selfServiceCta" href="${escapeHtml(ss.ctaHref)}" ${isHashLink ? "" : 'target="_blank" rel="noopener"'}
         style="display:inline-flex;align-items:center;justify-content:center;text-decoration:none">
        ${escapeHtml(ss.ctaLabel)}
      </a>
    </div>
  `;
  bindFieldEvents(fields);
  stepRoot.querySelector("#backBtn").addEventListener("click", () => { state.path.pop(); render(); });
  stepRoot.querySelector("#selfServiceCta").addEventListener("click", (event) => {
    collectCurrentFieldValues(fields);
    const err = validateStep(node, state.values);
    if (!err) return;

    event.preventDefault();
    const box = document.getElementById("errBox");
    box.textContent = "⚠ " + err;
    box.classList.remove("hidden");
  });
}

function renderForm(node) {
  const fields = node.fields || [];
  state.formRenderedAt = Date.now();
  stepRoot.innerHTML = `
    ${node.topText ? `<div class="hint" style="margin-bottom:18px">${escapeHtml(node.topText)}</div>` : ""}
    <div class="stack">
      ${fields.includes("attestationUpload_req") ? renderAttestationDownload() : ""}
      ${fields.map(renderField).join("")}
      ${node.extraLink ? `
        <div class="link-box">
          <a href="${escapeHtml(node.extraLink.href)}" target="_blank" rel="noopener">
            🔗 ${escapeHtml(node.extraLink.label)}
          </a>
        </div>` : ""}
    </div>
    <div id="errBox" class="result danger hidden" style="margin-top:16px"></div>
    <div class="actions">
      <button class="secondary-btn" id="backBtn">Retour</button>
      <button class="primary-btn" id="sendBtn">Envoyer ma demande</button>
    </div>
  `;

  bindFieldEvents(fields);
  stepRoot.querySelector("#backBtn").addEventListener("click", () => { state.path.pop(); render(); });
  stepRoot.querySelector("#sendBtn").addEventListener("click", () => submitForm(node));
}

function renderAttestationDownload() {
  const doc = `
    <html><body>
      <h1>Attestation sur l'honneur</h1>
      <p>Je soussigne(e) ______________________________ atteste sur l'honneur ne pas avoir recu le colis indique livre.</p>
      <p>Numero de commande : ______________________________</p>
      <p>Numero de suivi : ______________________________</p>
      <p>Fait a ______________________, le ____ / ____ / ______</p>
      <p>Signature :</p>
    </body></html>
  `.trim();
  const href = `data:application/msword;charset=utf-8,${encodeURIComponent(doc)}`;

  return `
    <div class="link-box">
      <a href="${href}" download="attestation-sur-l-honneur.doc">
        Télécharger l'attestation sur l'honneur (.doc)
      </a>
    </div>`;
}

function renderField(key) {
  const def = FIELD_DEFS[key];
  if (!def) return "";
  const val = state.values[key] || "";

  if (def.type === "checkbox") return `
    <label class="inline-check">
      <input id="f-${key}" type="checkbox" ${val ? "checked" : ""} />
      <span>${def.label}</span>
    </label>`;

  if (def.type === "textarea") return `
    <div class="field">
      <label for="f-${key}">${def.label}</label>
      <textarea id="f-${key}" placeholder="${escapeHtml(def.placeholder || "")}">${escapeHtml(val)}</textarea>
      ${def.hint ? `<small style="color:#8b7355;font-size:13px">ℹ️ ${escapeHtml(def.hint)}</small>` : ""}
    </div>`;

  if (def.type === "file") return `
    <div class="field">
      <label for="f-${key}">${def.label}</label>
      <input id="f-${key}" type="file" accept="image/*,.pdf,.doc,.docx" />
    </div>`;

  return `
    <div class="field">
      <label for="f-${key}">${def.label}</label>
      <input id="f-${key}" type="${def.type}" placeholder="${escapeHtml(def.placeholder || "")}" value="${escapeHtml(val)}" />
    </div>`;
}

function bindFieldEvents(fields) {
  fields.forEach(key => {
    const el = document.getElementById("f-" + key);
    const def = FIELD_DEFS[key];
    if (!el || !def) return;
    if (def.type === "checkbox") el.addEventListener("change", e => { state.values[key] = e.target.checked; });
    else if (def.type === "file") el.addEventListener("change", e => { state.values[key] = e.target.files && e.target.files.length > 0; });
    else el.addEventListener("input", e => { state.values[key] = e.target.value.trim(); });
  });
}

function collectCurrentFieldValues(fields) {
  fields.forEach(key => {
    const el = document.getElementById("f-" + key);
    const def = FIELD_DEFS[key];
    if (!el || !def) return;
    if (def.type === "file") state.values[key] = el.files && el.files.length > 0;
    else if (def.type === "checkbox") state.values[key] = el.checked;
    else state.values[key] = el.value.trim();
  });
}

async function submitForm(node) {
  collectCurrentFieldValues(node.fields || []);

  const err = validateStep(node, state.values);
  if (err) {
    const box = document.getElementById("errBox");
    box.textContent = "⚠ " + err;
    box.classList.remove("hidden");
    return;
  }

  const sendBtn = document.getElementById("sendBtn");
  sendBtn.textContent = "Envoi en cours…";
  sendBtn.disabled = true;

  try {
    const data = await submitZendeskRequest({ node, state });
    state.ticketId = data.ticketId;
    state.done = true;
    render();
  } catch (error) {
    const box = document.getElementById("errBox");
    const errorMessage = error?.isUserFacing
      ? error.message
      : "Impossible d'envoyer votre demande pour le moment. Reessayez dans quelques instants.";
    box.innerHTML = `<strong>Erreur</strong> - ${escapeHtml(errorMessage)}`;
    box.classList.remove("hidden");
    sendBtn.textContent = "Envoyer ma demande";
    sendBtn.disabled = false;
  }
}

function renderConfirm() {
  resultRoot.classList.remove("hidden");
  resultRoot.innerHTML = `
    <div class="result success" style="text-align:center;padding:32px">
      <h3 style="font-size:28px;margin-bottom:12px">✅ Demande envoyée !</h3>
      <p>Nous avons bien reçu votre message et vous répondrons dans les meilleurs délais.</p>
      ${state.ticketId ? `<div class="summary">Référence : <strong>#${escapeHtml(String(state.ticketId))}</strong></div>` : ""}
    </div>
    <div class="actions" style="margin-top:24px;justify-content:center">
      <button class="secondary-btn" id="restartBtn">Nouvelle demande</button>
    </div>
  `;
  resultRoot.querySelector("#restartBtn").addEventListener("click", () => {
    state.path = [];
    state.values = {};
    state.done = false;
    state.ticketId = null;
    state.formRenderedAt = 0;
    render();
  });
}

export function initFormRenderer() {
  stepRoot = document.getElementById("stepRoot");
  resultRoot = document.getElementById("resultRoot");
  progressBar = document.getElementById("progressBar");
  stepLabel = document.getElementById("stepLabel");
  pathLabel = document.getElementById("pathLabel");

  render();
}
