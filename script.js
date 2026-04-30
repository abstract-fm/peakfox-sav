// ─── CONFIG ───────────────────────────────────────────────────────────────────
const ART = {
  annulation:  "#annulation",
  retour:      "#faire-retour",
  nonConforme: "#non-conforme",
  defectueux:  "#defectueux",
  pointRelais: "#point-relais"
};

// ─── FIELD DEFINITIONS ────────────────────────────────────────────────────────
const FIELD_DEFS = {
  email:                  { type: "email",    label: "Adresse e-mail*",                          placeholder: "vous@email.com",                                                              required: true  },
  orderNumber:            { type: "text",     label: "Numéro de commande*",                      placeholder: "#12345",                                                                      required: true  },
  orderNumberOpt:         { type: "text",     label: "Numéro de commande",                       placeholder: "#12345",                                                                      required: false },
  trackingNumber:         { type: "text",     label: "Numéro de suivi",                          placeholder: "Numéro de suivi si vous l'avez",                                              required: false },
  returnId:               { type: "text",     label: "ID ReturnGo*",                             placeholder: "RTG-12345",                                                                   required: true  },
  message:                { type: "textarea", label: "Message*",                                 placeholder: "Décrivez votre demande.",                                                     required: true  },
  messageOpt:             { type: "textarea", label: "Message",                                  placeholder: "Ajoutez des précisions si besoin.",                                           required: false },
  modifDetail:            { type: "textarea", label: "Message*",                                 placeholder: "Décrivez ce que vous souhaitez modifier.",                                    required: true  },
  photoUpload_opt:        { type: "file",     label: "Joindre une pièce jointe (optionnel)",     required: false },
  photoUpload_req:        { type: "file",     label: "Joindre une photo obligatoire*",           required: true }
};

// ─── FLOW ─────────────────────────────────────────────────────────────────────
const FLOW = {
  rootQuestion: "Pourquoi nous contactez-vous ?",
  categories: [
    {
      id: "annulation", label: "Annuler ma commande",
      question: "Avez-vous reçu un suivi ?",
      children: [
        {
          id: "annul_suivi_non", label: "Non",
          outcome: "ticket",
          topText: "Votre annulation semble possible. Nous allons vérifier et traiter la demande.",
          fields: ["email", "orderNumber"],
          agentNote: "Annulation possible : vérifier que la commande n'a pas encore de suivi."
        },
        {
          id: "annul_suivi_oui", label: "Oui",
          outcome: "selfservice",
          selfservice: { title: "Retour / remboursement", body: "Votre commande a déjà un suivi. L'annulation n'est plus le bon parcours : utilisez le retour ou le remboursement.", ctaLabel: "Accéder au portail retour", ctaHref: ART.retour }
        },
        {
          id: "annul_suivi_inconnu", label: "Je ne sais pas",
          outcome: "ticket",
          topText: "Nous allons vérifier le statut de votre commande.",
          fields: ["email", "orderNumber"],
          agentNote: "Vérification SAV : contrôler le statut d'expédition avant annulation."
        }
      ]
    },
    {
      id: "modification", label: "Modifier ma commande",
      question: "Avez-vous reçu un suivi ?",
      children: [
        {
          id: "modif_suivi_non", label: "Non",
          question: "Que souhaitez-vous modifier ?",
          children: [
            { id: "modif_adresse", label: "Adresse", outcome: "ticket", fields: ["email", "orderNumber", "modifDetail"], agentNote: "Modification adresse avant suivi." },
            { id: "modif_produit", label: "Produit", outcome: "ticket", fields: ["email", "orderNumber", "modifDetail"], agentNote: "Modification produit avant suivi." },
            { id: "modif_information", label: "Information", outcome: "ticket", fields: ["email", "orderNumber", "modifDetail"], agentNote: "Modification information avant suivi." }
          ]
        },
        {
          id: "modif_suivi_oui", label: "Oui",
          outcome: "selfservice",
          selfservice: { title: "Retour / remboursement", body: "Votre commande a déjà un suivi. La modification n'est plus le bon parcours : utilisez le retour ou le remboursement.", ctaLabel: "Accéder au portail retour", ctaHref: ART.retour }
        },
        {
          id: "modif_suivi_inconnu", label: "Je ne sais pas",
          outcome: "ticket",
          fields: ["email", "orderNumber", "message"],
          agentNote: "Vérifier le statut de suivi avant modification."
        }
      ]
    },
    {
      id: "suivi", label: "Problème de livraison / suivi",
      question: "Quel est votre problème ?",
      children: [
        {
          id: "suivi_pas_suivi", label: "Je n'ai pas encore de suivi",
          outcome: "ticket",
          fields: ["email", "orderNumber"],
          agentNote: "Vérifier statut Shippingbo."
        },
        {
          id: "suivi_retard", label: "Mon colis est en retard",
          outcome: "ticket",
          fields: ["email", "orderNumber", "trackingNumber", "messageOpt"],
          agentNote: "Vérifier tracking et délai transporteur."
        },
        {
          id: "suivi_bloque", label: "Mon colis est bloqué",
          outcome: "ticket",
          fields: ["email", "orderNumber", "trackingNumber", "messageOpt"],
          agentNote: "Contacter transporteur pour déblocage."
        },
        {
          id: "suivi_perdu", label: "Mon colis semble perdu",
          outcome: "ticket",
          fields: ["email", "orderNumber", "trackingNumber", "messageOpt"],
          agentNote: "Ouvrir enquête transporteur."
        },
        {
          id: "suivi_relais", label: "Problème point relais",
          outcome: "ticket",
          fields: ["email", "orderNumber", "trackingNumber", "message"],
          extraLink: { label: "Je n'ai pas reçu mon code Mondial Relay — que faire ?", href: ART.pointRelais },
          agentNote: "Vérifier suivi au point relais."
        },
        {
          id: "suivi_livre_non_recu", label: "Livré mais non reçu",
          outcome: "ticket",
          fields: ["email", "orderNumber", "trackingNumber", "message"],
          agentNote: "Vérifier preuve de livraison transporteur."
        }
      ]
    },
    {
      id: "retour", label: "Retour / remboursement",
      question: "Délai depuis réception ≤ 14 jours ?",
      children: [
        {
          id: "retour_delai_non", label: "Non",
          outcome: "ticket",
          fields: ["email", "message"],
          agentNote: "Hors délai 14 jours : traitement manuel SAV."
        },
        {
          id: "retour_delai_oui", label: "Oui",
          question: "Que souhaitez-vous faire ?",
          children: [
            {
              id: "retour_non", label: "Faire un retour",
              outcome: "ticket",
              fields: ["email", "orderNumber"],
              agentNote: "Demande de création de retour."
            },
            {
              id: "retour_suivi", label: "Suivre mon retour",
              outcome: "ticket",
              fields: ["email", "returnId"],
              agentNote: "Vérifier statut retour dans ReturnGO."
            },
            {
              id: "retour_remb", label: "Problème avec mon remboursement",
              outcome: "ticket",
              fields: ["email", "returnId", "message"],
              agentNote: "Vérifier statut remboursement Shopify/ReturnGO."
            },
            {
              id: "retour_echange", label: "Problème avec mon échange",
              outcome: "ticket",
              fields: ["email", "orderNumber", "message"],
              agentNote: "Vérifier workflow échange ReturnGO."
            },
            {
              id: "retour_bloque", label: "Le portail retour ne fonctionne pas",
              outcome: "ticket",
              fields: ["email", "orderNumber", "message"],
              agentNote: "Vérifier éligibilité ReturnGO. Créer retour manuellement si besoin."
            }
          ]
        }
      ]
    },
    {
      id: "reception", label: "Problème avec un produit reçu",
      question: "Quel est le problème ?",
      children: [
        {
          id: "recep_endommage", label: "Produit endommagé",
          outcome: "ticket",
          fields: ["email", "orderNumber", "photoUpload_req", "message"],
          agentNote: "Produit endommagé : photo obligatoire."
        },
        {
          id: "recep_manquant", label: "Produit manquant",
          outcome: "ticket",
          fields: ["email", "orderNumber", "photoUpload_opt", "message"],
          agentNote: "Produit manquant."
        },
        {
          id: "recep_mauvais", label: "Mauvais produit reçu",
          outcome: "ticket",
          fields: ["email", "orderNumber", "photoUpload_req", "message"],
          agentNote: "Mauvais produit reçu : photo obligatoire."
        },
        {
          id: "defectueux", label: "Produit ne fonctionne pas / défectueux",
          outcome: "ticket",
          fields: ["email", "orderNumber", "photoUpload_opt", "message"],
          agentNote: "Produit défectueux."
        }
      ]
    },
    {
      id: "autre", label: "Autre demande",
      outcome: "ticket",
      fields: ["email", "orderNumberOpt", "message"],
      agentNote: "Autre demande : orienter selon le contenu."
    }
  ]
};

// ─── STATE ────────────────────────────────────────────────────────────────────
const state = {
  path:     [],
  values:   {},
  done:     false,
  ticketId: null
};

// ─── DOM REFS ─────────────────────────────────────────────────────────────────
const stepRoot    = document.getElementById("stepRoot");
const resultRoot  = document.getElementById("resultRoot");
const progressBar = document.getElementById("progressBar");
const stepLabel   = document.getElementById("stepLabel");
const pathLabel   = document.getElementById("pathLabel");

// ─── HELPERS ──────────────────────────────────────────────────────────────────
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
  const pct   = Math.min(Math.round((depth / 3) * 88) + 6, 92);
  progressBar.style.width = `${pct}%`;
  stepLabel.textContent   = `Étape ${Math.min(depth + 1, 3)} / 3`;
  pathLabel.textContent   = state.path.length
    ? state.path.map(n => n.label).join(" → ")
    : "Aucun chemin sélectionné";
}

// ─── RENDER ───────────────────────────────────────────────────────────────────
function render() {
  updateMeta();
  resultRoot.classList.add("hidden");
  resultRoot.innerHTML = "";
  stepRoot.innerHTML   = "";

  if (state.done)   { renderConfirm(); return; }

  const node = currentNode();
  if (!node)                                    { renderOptions({ question: FLOW.rootQuestion, children: FLOW.categories }); return; }
  if (node.children && node.children.length)    { renderOptions(node); return; }
  if (node.outcome === "selfservice")            { renderSelfService(node); return; }
  renderForm(node);
}

// ── Options ───────────────────────────────────────────────────────────────────
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

// ── Self-service ──────────────────────────────────────────────────────────────
function renderSelfService(node) {
  const ss = node.selfservice;
  const isHashLink = typeof ss.ctaHref === "string" && ss.ctaHref.startsWith("#");
  stepRoot.innerHTML = `
    <div class="result success">
      <h3>${escapeHtml(ss.title)}</h3>
      <p>${escapeHtml(ss.body)}</p>
    </div>
    <div class="actions" style="margin-top:24px">
      <button class="secondary-btn" id="backBtn">Retour</button>
      <a class="primary-btn" href="${escapeHtml(ss.ctaHref)}" ${isHashLink ? "" : 'target="_blank" rel="noopener"'}
         style="display:inline-flex;align-items:center;justify-content:center;text-decoration:none">
        ${escapeHtml(ss.ctaLabel)}
      </a>
    </div>
  `;
  stepRoot.querySelector("#backBtn").addEventListener("click", () => { state.path.pop(); render(); });
}

// ── Form ──────────────────────────────────────────────────────────────────────
function renderForm(node) {
  const fields = node.fields || [];
  stepRoot.innerHTML = `
    ${node.topText ? `<div class="hint" style="margin-bottom:18px">${escapeHtml(node.topText)}</div>` : ""}
    <div class="stack">
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
      <button class="primary-btn"   id="sendBtn">Envoyer ma demande</button>
    </div>
  `;

  bindFieldEvents(fields);
  stepRoot.querySelector("#backBtn").addEventListener("click", () => { state.path.pop(); render(); });
  stepRoot.querySelector("#sendBtn").addEventListener("click", () => submitForm(node));
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
    const el  = document.getElementById("f-" + key);
    const def = FIELD_DEFS[key];
    if (!el || !def) return;
    if (def.type === "checkbox")      el.addEventListener("change", e => { state.values[key] = e.target.checked; });
    else if (def.type === "file")     el.addEventListener("change", e => { state.values[key] = e.target.files && e.target.files.length > 0; });
    else                              el.addEventListener("input",  e => { state.values[key] = e.target.value.trim(); });
  });
}

// ── Validation ────────────────────────────────────────────────────────────────
function validate(node) {
  for (const key of (node.fields || [])) {
    const def = FIELD_DEFS[key];
    if (!def || !def.required) continue;
    const val = state.values[key];
    if (def.type === "checkbox" && !val) return `Veuillez cocher : "${def.label}"`;
    if (def.type === "file"     && !val) return "Une pièce jointe est obligatoire pour cette demande.";
    if (def.type !== "checkbox" && def.type !== "file" && (!val || !String(val).trim()))
      return `Le champ "${(def.label || key).replace("*", "")}" est requis.`;
  }
  return null;
}

// ── Submit ────────────────────────────────────────────────────────────────────
async function submitForm(node) {
  (node.fields || []).forEach(key => {
    const el  = document.getElementById("f-" + key);
    const def = FIELD_DEFS[key];
    if (!el || !def) return;
    if (def.type === "file")          state.values[key] = el.files && el.files.length > 0;
    else if (def.type === "checkbox") state.values[key] = el.checked;
    else                              state.values[key] = el.value.trim();
  });

  const err = validate(node);
  if (err) {
    const box = document.getElementById("errBox");
    box.textContent = "⚠ " + err;
    box.classList.remove("hidden");
    return;
  }

  const sendBtn = document.getElementById("sendBtn");
  sendBtn.textContent = "Envoi en cours…";
  sendBtn.disabled    = true;

  try {
    const contextNote = Object.entries(state.values)
      .filter(([key, value]) => {
        if (!value || typeof value !== "string" || !value.trim()) return false;
        return key.endsWith("_context") || key.endsWith("Message") || key === "message" || key === "messageOpt" || key === "modifDetail";
      })
      .map(([, value]) => value)
      .join("\n") || "";

    const res  = await fetch("/api/zendesk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email:       state.values.email       || "",
        orderNumber: state.values.orderNumber || state.values.orderNumberOpt || "",
        tracking:    state.values.trackingNumber || "",
        returnId:    state.values.returnId    || "",
        note:        contextNote,
        photoUpload: !!(state.values.photoUpload_opt || state.values.photoUpload_req),
        category:    state.path[0]?.label     || "",
        categoryId:  state.path[0]?.id        || "",
        subIssue:    state.path[state.path.length - 1]?.label || "",
        subIssueId:  state.path[state.path.length - 1]?.id    || "",
        agentNote:   node.agentNote           || "",
        path:        state.path.map(n => n.label).join(" › "),
        pathIds:     state.path.map(n => n.id),
        pathLabels:  state.path.map(n => n.label),
        formValues:  state.values,
        articleLinks: {
          annulation: ART.annulation,
          retour: ART.retour,
          nonConforme: ART.nonConforme,
          defectueux: ART.defectueux,
          pointRelais: ART.pointRelais
        }
      })
    });

    const rawResponse = await res.text();
    let data;
    try {
      data = rawResponse ? JSON.parse(rawResponse) : {};
    } catch {
      throw new Error(`Réponse non JSON du serveur: ${rawResponse.slice(0, 300) || "vide"}`);
    }

    if (data.success) {
      state.ticketId = data.ticketId;
      state.done     = true;
      render();
    } else {
      const detailText =
        data.details && typeof data.details === "object"
          ? JSON.stringify(data.details)
          : "";
      throw new Error([data.error || "Erreur inconnue", detailText].filter(Boolean).join(" - "));
    }

  } catch (error) {
    const box = document.getElementById("errBox");
    const errorMessage = error?.message || "Impossible d'envoyer. Reessayez ou contactez-nous directement.";
    box.innerHTML = `<strong>Erreur</strong> - ${escapeHtml(errorMessage)}`;
    box.classList.remove("hidden");
    sendBtn.textContent = "Envoyer ma demande";
    sendBtn.disabled    = false;
  }
}

// ── Confirmation ──────────────────────────────────────────────────────────────
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
    state.path = []; state.values = {}; state.done = false; state.ticketId = null;
    render();
  });
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
render();

function toggleFaq(btn) {
  const body = btn.nextElementSibling;
  const isOpen = btn.classList.contains("open");

  document.querySelectorAll(".faq-article-btn").forEach((item) => {
    item.classList.remove("open");
    if (item.nextElementSibling) item.nextElementSibling.classList.remove("open");
  });

  if (!isOpen && body) {
    btn.classList.add("open");
    body.classList.add("open");
  }
}

function filterFaqArticles(query) {
  const normalized = String(query || "").toLowerCase().trim();

  document.querySelectorAll(".faq-article-card").forEach((card) => {
    const haystack = `${card.dataset.search || ""} ${card.textContent || ""}`.toLowerCase();
    card.style.display = !normalized || haystack.includes(normalized) ? "" : "none";
  });

  document.querySelectorAll(".faq-section-block").forEach((block) => {
    const visible = [...block.querySelectorAll(".faq-article-card")].some((card) => card.style.display !== "none");
    block.style.display = visible ? "" : "none";
  });
}

function openFaqFromHash() {
  const hash = window.location.hash.replace("#", "");
  if (!hash) return;

  const target = document.getElementById(`art-${hash}`);
  if (!target) return;

  target.click();
  setTimeout(() => {
    target.scrollIntoView({ behavior: "smooth", block: "center" });
  }, 60);
}

window.addEventListener("DOMContentLoaded", openFaqFromHash);
window.addEventListener("hashchange", openFaqFromHash);


