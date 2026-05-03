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
  returnIdOpt:            { type: "text",     label: "ID ReturnGo",                              placeholder: "RTG-12345 si vous l'avez",                                                    required: false },
  message:                { type: "textarea", label: "Message*",                                 placeholder: "Décrivez votre demande.",                                                     required: true  },
  messageOpt:             { type: "textarea", label: "Message",                                  placeholder: "Ajoutez des précisions si besoin.",                                           required: false },
  modifDetail:            { type: "textarea", label: "Message*",                                 placeholder: "Décrivez ce que vous souhaitez modifier.",                                    required: true  },
  newAddress:             { type: "textarea", label: "Nouvelle adresse*",                        placeholder: "Nom, adresse, complément, code postal, ville, pays, téléphone.",               required: true  },
  neighborCheck:          { type: "checkbox", label: "J'ai vérifié chez mes voisins*",           required: true  },
  photoUpload_opt:        { type: "file",     label: "Joindre une pièce jointe (optionnel)",     required: false },
  photoUpload_req:        { type: "file",     label: "Joindre une photo obligatoire*",           required: true  },
  attestationUpload_req:  { type: "file",     label: "Joindre l'attestation sur l'honneur signée*", required: true }
};

// ─── FLOW ─────────────────────────────────────────────────────────────────────
const FLOW = {
  rootQuestion: "Pourquoi nous contactez-vous ?",
  categories: [
    {
      id: "annulation", label: "Annuler ma commande",
      question: "Vérification commande (Shippingbo)",
      topBanner: "Renseignez votre e-mail et votre numéro de commande après le choix du statut Shippingbo.",
      children: [
        {
          id: "annul_moins_24h", label: "Commande < 24h",
          outcome: "selfservice",
          orderStatusOms: "under_24h",
          fields: ["email", "orderNumber"],
          selfservice: { title: "Annulation en self-service", body: "Votre commande est éligible au portail ReturnGo. Aucun ticket SAV n'est créé.", ctaLabel: "Accéder au portail ReturnGo", ctaHref: ART.retour }
        },
        {
          id: "annul_plus_24h", label: "Commande > 24h",
          outcome: "ticket",
          orderStatusOms: "over_24h",
          fields: ["email", "orderNumber"],
          agentNote: "Annulation > 24h : créer ticket et bloquer la commande dans Shippingbo."
        },
        {
          id: "annul_expediee", label: "Commande déjà expédiée",
          outcome: "selfservice",
          orderStatusOms: "shipped",
          fields: ["email", "orderNumber"],
          selfservice: { title: "Annulation impossible", body: "La commande est déjà expédiée. L'annulation n'est plus possible et aucun ticket n'est créé.", ctaLabel: "Voir les retours / échanges", ctaHref: ART.retour }
        },
        {
          id: "annul_oms_moins_24h", label: "Commande bloquée OMS (< 24h)",
          outcome: "selfservice",
          orderStatusOms: "blocked_under_24h",
          fields: ["email", "orderNumber"],
          selfservice: { title: "Annulation en self-service", body: "Votre commande est bloquée OMS et éligible au portail ReturnGo. Aucun ticket SAV n'est créé.", ctaLabel: "Accéder au portail ReturnGo", ctaHref: ART.retour }
        },
        {
          id: "annul_oms_plus_24h", label: "Commande bloquée OMS (> 24h)",
          outcome: "ticket",
          orderStatusOms: "blocked_over_24h",
          fields: ["email", "orderNumber"],
          agentNote: "Commande bloquée OMS > 24h : créer ticket."
        },
        {
          id: "annul_introuvable", label: "Commande introuvable",
          outcome: "ticket",
          orderStatusOms: "not_found",
          topText: "Nous n'avons pas trouvé votre commande automatiquement. Vérifiez votre numéro avant d'envoyer la demande.",
          fields: ["email", "orderNumber"],
          agentNote: "Commande introuvable : créer ticket et avertir le client."
        }
      ]
    },
    {
      id: "modification", label: "Modifier ma commande",
      question: "Vérification commande (Shippingbo)",
      topBanner: "Renseignez votre e-mail et votre numéro de commande dans l'étape finale.",
      children: [
        {
          id: "modif_non_expediee", label: "Commande non expédiée",
          orderStatusOms: "not_shipped",
          question: "Que souhaitez-vous modifier ?",
          children: [
            { id: "modif_non_exp_adresse", label: "Adresse", outcome: "ticket", fields: ["email", "orderNumber", "newAddress"], agentNote: "Commande non expédiée : mettre à jour l'adresse et créer un ticket informatif." },
            { id: "modif_non_exp_produit", label: "Produit", outcome: "ticket", fields: ["email", "orderNumber", "message"], agentNote: "Commande non expédiée : bloquer la commande et créer un ticket." },
            { id: "modif_non_exp_info", label: "Information de commande", outcome: "ticket", fields: ["email", "orderNumber", "message"], agentNote: "Commande non expédiée : créer ticket pour information de commande." }
          ]
        },
        {
          id: "modif_expediee", label: "Commande expédiée",
          orderStatusOms: "shipped",
          question: "Que souhaitez-vous modifier ?",
          children: [
            { id: "modif_exp_adresse", label: "Adresse", outcome: "ticket", fields: ["email", "orderNumber", "message"], agentNote: "Commande expédiée : créer ticket SAV / transporteur pour adresse." },
            { id: "modif_exp_produit", label: "Produit", outcome: "selfservice", selfservice: { title: "Retour / échange", body: "La commande est expédiée. Pour modifier un produit, utilisez le parcours Retour / échange.", ctaLabel: "Accéder au parcours Retour / échange", ctaHref: ART.retour } },
            { id: "modif_exp_information", label: "Information", outcome: "ticket", fields: ["email", "orderNumber", "message"], agentNote: "Commande expédiée : créer ticket pour information." }
          ]
        },
        {
          id: "modif_introuvable", label: "Commande introuvable",
          outcome: "ticket",
          orderStatusOms: "not_found",
          fields: ["email", "orderNumber", "message"],
          agentNote: "Commande introuvable : créer ticket."
        }
      ]
    },
    {
      id: "suivi", label: "Problème de livraison / suivi",
      question: "Quel est votre problème ?",
      children: [
        {
          id: "suivi_pas_suivi", label: "Je n'ai pas encore reçu de lien de suivi",
          outcome: "ticket",
          fields: ["email", "orderNumber"],
          agentNote: "Créer ticket : client sans lien de suivi."
        },
        {
          id: "suivi_retard", label: "Mon colis est en retard",
          outcome: "ticket",
          fields: ["email", "orderNumber", "trackingNumber", "messageOpt"],
          agentNote: "Vérifier tracking et délai transporteur."
        },
        {
          id: "suivi_bloque", label: "Mon suivi n'avance plus / colis bloqué",
          outcome: "ticket",
          fields: ["email", "orderNumber", "trackingNumber", "messageOpt"],
          agentNote: "Contacter transporteur pour déblocage."
        },
        {
          id: "suivi_relais", label: "Problème avec le point relais",
          outcome: "ticket",
          fields: ["email", "orderNumber", "trackingNumber", "message"],
          extraLink: { label: "Je n'ai pas reçu mon code Mondial Relay — que faire ?", href: ART.pointRelais },
          agentNote: "Vérifier suivi au point relais."
        },
        {
          id: "suivi_livre_non_recu", label: "Mon colis est indiqué livré mais je ne l'ai pas reçu",
          outcome: "ticket",
          topText: "Téléchargez l'attestation sur l'honneur générée, signez-la, puis joignez le document à votre demande.",
          fields: ["email", "orderNumber", "trackingNumber", "message", "neighborCheck", "attestationUpload_req"],
          agentNote: "Livré non reçu : checkbox voisins obligatoire et attestation sur l'honneur signée à joindre."
        }
      ]
    },
    {
      id: "retour", label: "Retour / échange",
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
              id: "retour_faire", label: "Faire un retour",
              outcome: "selfservice",
              fields: ["email", "orderNumber"],
              selfservice: { title: "Retour en self-service", body: "Votre demande est éligible au portail ReturnGo. Aucun ticket SAV n'est créé.", ctaLabel: "Accéder au portail ReturnGo", ctaHref: ART.retour }
            },
            {
              id: "retour_echange", label: "Faire un échange",
              outcome: "selfservice",
              fields: ["email", "orderNumber"],
              selfservice: { title: "Échange en self-service", body: "Votre demande est éligible au portail ReturnGo. Aucun ticket SAV n'est créé.", ctaLabel: "Accéder au portail ReturnGo", ctaHref: ART.retour }
            },
            {
              id: "retour_suivi", label: "Suivre mon retour / échange",
              outcome: "selfservice",
              fields: ["email", "returnId"],
              selfservice: { title: "Suivi ReturnGo", body: "Le suivi de votre retour ou échange se fait directement depuis le portail ReturnGo.", ctaLabel: "Accéder au portail ReturnGo", ctaHref: ART.retour }
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
      id: "remboursement", label: "Remboursement",
      question: "Quel est votre problème ?",
      children: [
        {
          id: "remb_non_recu", label: "Je n'ai pas reçu mon remboursement",
          outcome: "ticket",
          fields: ["email", "returnIdOpt", "message"],
          agentNote: "Remboursement non reçu : vérifier statut ReturnGo / paiement."
        },
        {
          id: "remb_montant_incorrect", label: "Le montant remboursé est incorrect",
          outcome: "ticket",
          fields: ["email", "returnIdOpt", "message"],
          agentNote: "Montant remboursé incorrect : vérifier lignes de retour et paiement."
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
          id: "recep_incompatible", label: "Produit incompatible / mauvaise taille",
          outcome: "ticket",
          fields: ["email", "orderNumber", "message"],
          agentNote: "Produit incompatible / mauvaise taille."
        },
        {
          id: "defectueux", label: "Produit défectueux",
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
  const pct   = Math.min(Math.round((depth / 4) * 88) + 6, 92);
  progressBar.style.width = `${pct}%`;
  stepLabel.textContent   = `Étape ${Math.min(depth + 1, 4)} / 4`;
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
    fields.forEach(key => {
      const el = document.getElementById("f-" + key);
      const def = FIELD_DEFS[key];
      if (!el || !def) return;
      if (def.type === "file") state.values[key] = el.files && el.files.length > 0;
      else if (def.type === "checkbox") state.values[key] = el.checked;
      else state.values[key] = el.value.trim();
    });

    const err = validate(node);
    if (!err) return;

    event.preventDefault();
    const box = document.getElementById("errBox");
    box.textContent = "⚠ " + err;
    box.classList.remove("hidden");
  });
}

// ── Form ──────────────────────────────────────────────────────────────────────
function renderForm(node) {
  const fields = node.fields || [];
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
      <button class="primary-btn"   id="sendBtn">Envoyer ma demande</button>
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
    const orderStatusNode = [...state.path].reverse().find(item => item.orderStatusOms);
    const contextNote = Object.entries(state.values)
      .filter(([key, value]) => {
        if (!value || typeof value !== "string" || !value.trim()) return false;
        return key.endsWith("_context") || key.endsWith("Message") || key === "message" || key === "messageOpt" || key === "modifDetail" || key === "newAddress";
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
        returnId:    state.values.returnId    || state.values.returnIdOpt || "",
        note:        contextNote,
        photoUpload: !!(state.values.photoUpload_opt || state.values.photoUpload_req),
        category:    state.path[0]?.label     || "",
        categoryId:  state.path[0]?.id        || "",
        subIssue:    state.path[state.path.length - 1]?.label || "",
        subIssueId:  state.path[state.path.length - 1]?.id    || "",
        orderStatusOms: orderStatusNode?.orderStatusOms || "",
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


