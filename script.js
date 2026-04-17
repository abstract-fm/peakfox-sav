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
  orderDate:              { type: "text",     label: "Date de la commande",                      placeholder: "jj/mm/aaaa",                                                                  required: false },
  returnId:               { type: "text",     label: "Numéro / ID du retour*",                   placeholder: "RTG-12345",                                                                   required: true  },
  modifDetail:            { type: "textarea", label: "Détail de la modification*",               placeholder: "Décrivez ce que vous souhaitez modifier…",                                    required: true  },
  annulRaison:            { type: "textarea", label: "Raison de la demande d'annulation*",       placeholder: "Pourquoi souhaitez-vous annuler ? Depuis combien de temps ?",                 required: true,
                            hint: "Soyez précis — cela nous permet de traiter votre demande plus rapidement." },
  suivi_retard_context:   { type: "textarea", label: "Contexte du retard*",                      placeholder: "Depuis combien de temps ? Dernier statut affiché ? Date d'expédition ?",     required: true  },
  suivi_bloque_context:   { type: "textarea", label: "Informations sur le blocage*",             placeholder: "Numéro de suivi, date d'expédition, transporteur, dernier statut…",          required: true  },
  suivi_perdu_context:    { type: "textarea", label: "Informations sur la perte*",               placeholder: "Numéro de suivi, date d'expédition, depuis combien de temps sans MAJ…",     required: true  },
  suivi_relais_context:   { type: "textarea", label: "Description du problème*",                 placeholder: "Nom et adresse du point relais, nature du problème…",                        required: true  },
  checkVoisins:           { type: "checkbox", label: "J'ai vérifié auprès de mes voisins / concierge si le colis n'a pas été livré chez eux", required: true },
  suivi_non_recu_context: { type: "textarea", label: "Décrivez la situation*",                   placeholder: "Depuis quand indique-t-il livré ? Avis de passage ? Contact transporteur ?", required: true  },
  retour_suivi_context:   { type: "textarea", label: "Contexte de votre demande",                placeholder: "Décrivez votre situation…",                                                   required: false },
  retour_remb_context:    { type: "textarea", label: "Contexte de votre demande",                placeholder: "Date du retour, montant attendu…",                                            required: false },
  retour_echange_context: { type: "textarea", label: "Contexte de votre demande",                placeholder: "Décrivez le problème avec votre échange…",                                    required: false },
  retour_bloque_context:  { type: "textarea", label: "Décrivez le problème rencontré*",          placeholder: "Que se passe-t-il ? Message d'erreur ?",                                      required: true  },
  defect_context:         { type: "textarea", label: "Description du défaut*",                   placeholder: "Décrivez précisément le défaut, depuis quand il est apparu…",                 required: true  },
  photoUpload_opt:        { type: "file",     label: "Joindre une pièce jointe (optionnel)",     required: false },
  photoUpload_req:        { type: "file",     label: "Joindre une pièce jointe obligatoire (photo ou capture d'écran)*", required: true }
};

// ─── FLOW ─────────────────────────────────────────────────────────────────────
const FLOW = {
  rootQuestion: "Pourquoi nous contactez-vous ?",
  categories: [
    {
      id: "annulation", label: "Annulation de commande",
      question: "Depuis combien de temps avez-vous passé votre commande ?",
      children: [
        {
          id: "annul_moins_24h", label: "Moins de 24h",
          outcome: "selfservice",
          selfservice: {
            title: "Annulation sous 24h",
            body: "Bonne nouvelle — votre commande est peut-être encore annulable ! Consultez notre article dédié pour suivre la procédure en autonomie.",
            ctaLabel: "Annuler ma commande →", ctaHref: ART.annulation
          }
        },
        {
          id: "annul_plus_24h", label: "Plus de 24h",
          outcome: "ticket",
          topText: "⚠️ Cette demande est hors procédure standard. Nous allons vérifier le statut de votre commande. Si elle est déjà expédiée, l'annulation ne sera pas possible.",
          fields: ["email", "orderNumber", "annulRaison"],
          agentNote: "Vérifier Shopify/Shippingbo si commande expédiée."
        }
      ]
    },
    {
      id: "modification", label: "Modification de commande",
      outcome: "ticket",
      topText: "Décrivez précisément ce que vous souhaitez modifier (adresse, article, taille, couleur…).",
      fields: ["email", "orderNumber", "modifDetail"],
      agentNote: "Vérifier Shopify/Shippingbo. NON expédiée→modifier. OUI→orienter vers retour."
    },
    {
      id: "suivi", label: "Problème avec le suivi",
      question: "Quel est votre problème ?",
      children: [
        {
          id: "suivi_pas_suivi", label: "Retard expédition — pas encore de suivi",
          outcome: "ticket",
          fields: ["email", "orderNumber", "orderDate"],
          agentNote: "Vérifier statut Shippingbo."
        },
        {
          id: "suivi_retard", label: "Retard du transporteur",
          outcome: "ticket",
          topText: "💬 Depuis combien de temps attendez-vous ? Quel est le dernier statut affiché ?",
          fields: ["email", "orderNumber", "suivi_retard_context", "photoUpload_opt"],
          agentNote: "Vérifier tracking. Ouvrir enquête si retard >5j."
        },
        {
          id: "suivi_bloque", label: "Commande bloquée chez le transporteur",
          outcome: "ticket",
          topText: "📋 Un colis bloqué ne doit pas avoir eu de mise à jour depuis au moins 3 jours.",
          fields: ["email", "orderNumber", "suivi_bloque_context", "photoUpload_opt"],
          agentNote: "Contacter transporteur pour déblocage."
        },
        {
          id: "suivi_perdu", label: "Commande perdue par le transporteur",
          outcome: "ticket",
          topText: "📋 Un colis est considéré perdu après au moins 5 jours sans mise à jour de suivi.",
          fields: ["email", "orderNumber", "suivi_perdu_context", "photoUpload_opt"],
          agentNote: "Ouvrir enquête transporteur."
        },
        {
          id: "suivi_relais", label: "Problème avec un point relais",
          outcome: "ticket",
          topText: "📋 Indiquez le nom et l'adresse du point relais ainsi que la nature du problème.",
          fields: ["email", "orderNumber", "suivi_relais_context", "photoUpload_opt"],
          extraLink: { label: "Je n'ai pas reçu mon code Mondial Relay — que faire ?", href: ART.pointRelais },
          agentNote: "Vérifier suivi au point relais."
        },
        {
          id: "suivi_livre_non_recu", label: "Marqué livré mais non reçu",
          outcome: "ticket",
          topText: "📋 Avant de soumettre, merci de vérifier auprès de vos voisins / concierge.",
          fields: ["checkVoisins", "email", "orderNumber", "suivi_non_recu_context", "photoUpload_req"],
          agentNote: "Vérifier preuve de livraison transporteur."
        }
      ]
    },
    {
      id: "reception", label: "J'ai reçu ma commande mais j'ai un problème",
      topBanner: "⚠️ Passé 7 jours après la réception, il n'est plus possible de traiter ces demandes.",
      question: "Quel est le problème à la réception ?",
      children: [
        {
          id: "recep_endommage", label: "Produit endommagé",
          outcome: "selfservice",
          selfservice: { title: "Produit endommagé", body: "Consultez notre article pour la procédure de retour / échange pour produit non conforme.", ctaLabel: "Voir l'article →", ctaHref: ART.nonConforme }
        },
        {
          id: "recep_manquant", label: "Produit(s) manquant(s)",
          outcome: "selfservice",
          selfservice: { title: "Produit manquant", body: "Un article manquait dans votre colis ? Consultez notre article pour la procédure.", ctaLabel: "Voir l'article →", ctaHref: ART.nonConforme }
        },
        {
          id: "recep_mauvais", label: "Mauvais produit reçu",
          outcome: "selfservice",
          selfservice: { title: "Mauvais produit reçu", body: "Vous avez reçu un article qui n'est pas le vôtre ? Consultez notre article pour la procédure d'échange.", ctaLabel: "Voir l'article →", ctaHref: ART.nonConforme }
        }
      ]
    },
    {
      id: "retour", label: "Retour",
      question: "Avez-vous déjà initié un retour pour cette commande ?",
      children: [
        {
          id: "retour_oui", label: "Oui, j'ai déjà un retour en cours",
          question: "Quel est votre problème avec ce retour ?",
          children: [
            {
              id: "retour_suivi", label: "Je veux suivre mon retour",
              outcome: "ticket",
              fields: ["email", "returnId", "retour_suivi_context", "photoUpload_opt"],
              agentNote: "Vérifier statut retour dans ReturnGO."
            },
            {
              id: "retour_remb", label: "Problème de remboursement",
              outcome: "ticket",
              fields: ["email", "returnId", "retour_remb_context", "photoUpload_opt"],
              agentNote: "Vérifier statut remboursement Shopify/ReturnGO."
            },
            {
              id: "retour_echange", label: "Problème avec mon échange",
              outcome: "ticket",
              fields: ["email", "returnId", "retour_echange_context", "photoUpload_opt"],
              agentNote: "Vérifier workflow échange ReturnGO."
            }
          ]
        },
        {
          id: "retour_non", label: "Non, je veux faire un retour",
          outcome: "selfservice",
          selfservice: { title: "Initiez votre retour en ligne", body: "La procédure est simple et rapide via notre portail dédié.", ctaLabel: "Accéder au portail retour →", ctaHref: ART.retour }
        },
        {
          id: "retour_bloque", label: "J'ai essayé mais ça ne fonctionne pas",
          outcome: "ticket",
          topText: "Décrivez le problème rencontré. Une pièce jointe (capture d'écran) est requise.",
          fields: ["email", "orderNumber", "retour_bloque_context", "photoUpload_req"],
          agentNote: "Vérifier éligibilité ReturnGO. Créer retour manuellement si besoin."
        }
      ]
    },
    {
      id: "defectueux", label: "Défectueux",
      question: "Depuis combien de temps votre colis a-t-il été livré ?",
      children: [
        {
          id: "defect_moins_10j", label: "Moins de 10 jours",
          outcome: "selfservice",
          selfservice: { title: "Produit défectueux — sous 10 jours", body: "Vous êtes dans le délai pour faire une demande via notre portail.", ctaLabel: "Produit défectueux — faire un retour →", ctaHref: ART.defectueux }
        },
        {
          id: "defect_plus_10j", label: "Plus de 10 jours",
          outcome: "ticket",
          topText: "⚠️ Votre demande est hors délai standard (10 jours). Elle sera étudiée au cas par cas.",
          fields: ["email", "orderNumber", "defect_context", "photoUpload_req"],
          agentNote: "Défectueux hors délai. Étudier au cas par cas."
        }
      ]
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
      .filter(([k]) => k.endsWith("_context"))
      .map(([, v]) => v).join("\n") || "";

    const res  = await fetch("/api/zendesk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email:       state.values.email       || "",
        orderNumber: state.values.orderNumber || "",
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


