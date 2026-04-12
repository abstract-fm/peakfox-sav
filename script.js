const FIELD_DEFS = {
  email: {
    type: "email",
    label: "Adresse e-mail*",
    placeholder: "vous@email.com",
    required: true
  },
  orderNumber: {
    type: "text",
    label: "Numéro de commande*",
    placeholder: "Ex : #124324",
    required: true
  },
  tracking: {
    type: "text",
    label: "Numéro de suivi*",
    placeholder: "Numéro de suivi",
    required: true
  },
  returnId: {
    type: "text",
    label: "ID ReturnGO*",
    placeholder: "Ex : RTG-12345",
    required: true
  },
  photoUpload: {
    type: "file",
    label: "Photo",
    accept: "image/*",
    required: false
  },
  proofUpload: {
    type: "file",
    label: "Preuve / suivi du retour",
    required: false
  },
  note: {
    type: "textarea",
    label: "Informations complémentaires (optionnel)",
    placeholder: "Ajoutez un détail utile si besoin",
    required: false
  },
  returnOpened: {
    type: "checkbox",
    label: "J’ai déjà ouvert un retour",
    required: false
  }
};

const FLOW = {
  categories: [
    {
      id: "annulation",
      label: "Annulation",
      children: [
        {
          id: "moins_24h",
          label: "Moins de 24h",
          title: "Annulation sous 24h",
          fields: ["email", "orderNumber", "returnOpened"],
          hints: [
            "Annulation possible si la commande est encore dans la fenêtre autorisée."
          ],
          resolve: () => ({
            tone: "success",
            title: "Annulation potentiellement possible",
            text: "La demande est dans la bonne fenêtre. Vérifiez maintenant le statut réel de la commande avant annulation.",
            summary: "Action suggérée : vérification Shopify / Shippingbo puis annulation si non expédiée."
          })
        },
        {
          id: "plus_24h",
          label: "Plus de 24h",
          title: "Annulation après 24h",
          fields: ["email", "orderNumber"],
          linkBox: {
            text: "L’annulation n’est généralement plus possible après 24h. Consultez l’article d’explication puis passez par le retour si applicable.",
            linkLabel: "Voir l’article",
            href: "#"
          },
          resolve: () => ({
            tone: "warning",
            title: "Annulation non standard",
            text: "Au-delà de 24h, l’annulation n’est généralement plus possible. Orientez vers l’article puis vers le flux retour.",
            summary: "Action suggérée : article explicatif + redirection retour."
          })
        },
        {
          id: "deja_retour",
          label: "J’ai déjà un retour",
          title: "Retour déjà ouvert",
          fields: ["email", "orderNumber", "returnId"],
          hints: [
            "Utilisé si un retour ReturnGO existe déjà."
          ],
          resolve: () => ({
            tone: "success",
            title: "Retour existant identifié",
            text: "Le dossier peut être repris à partir de l’ID ReturnGO existant.",
            summary: "Action suggérée : lookup ReturnGO."
          })
        }
      ]
    },
    {
      id: "retour",
      label: "Retour",
      children: [
        {
          id: "moins_14j",
          label: "Retour à moins de 14 jours",
          title: "Retour à moins de 14 jours",
          fields: ["email", "orderNumber", "returnOpened"],
          linkBox: {
            text: "Retour possible dans la fenêtre de 14 jours via ReturnGO.",
            linkLabel: "Accéder à ReturnGO",
            href: "#"
          },
          resolve: () => ({
            tone: "success",
            title: "Retour standard éligible",
            text: "Le client est dans la fenêtre de 14 jours et peut être redirigé vers ReturnGO.",
            summary: "Action suggérée : afficher / envoyer lien ReturnGO."
          })
        },
        {
          id: "plus_14j",
          label: "Retour à plus de 14 jours",
          title: "Retour à plus de 14 jours",
          fields: ["email", "orderNumber"],
          hints: [
            "Au-delà de 14 jours, le retour standard n’est plus éligible."
          ],
          resolve: () => ({
            tone: "warning",
            title: "Retour standard non éligible",
            text: "Le délai de 14 jours semble dépassé. Ce cas doit sortir du flux retour standard.",
            summary: "Action suggérée : refus ou revue manuelle selon politique."
          })
        },
        {
          id: "cant_do_it",
          label: "Je n’arrive pas à faire le retour",
          title: "Je n’arrive pas à faire le retour",
          fields: ["email", "orderNumber", "returnOpened", "returnId", "proofUpload"],
          linkBox: {
            text: "Si le portail ne fonctionne pas, ajoutez une preuve ou un suivi du retour.",
            linkLabel: "Aide retour",
            href: "#"
          },
          resolve: () => ({
            tone: "warning",
            title: "Blocage sur le portail retour",
            text: "Le client n’arrive pas à effectuer son retour. Une assistance manuelle ou une reprise du dossier est nécessaire.",
            summary: "Action suggérée : aide manuelle + vérification ReturnGO."
          })
        },
        {
          id: "pb_remboursement",
          label: "Problème remboursement / délai",
          title: "Problème remboursement / délai",
          fields: ["email", "orderNumber", "returnOpened", "returnId", "proofUpload"],
          resolve: () => ({
            tone: "warning",
            title: "Problème remboursement / délai",
            text: "Le retour existe mais le remboursement ou son délai pose problème.",
            summary: "Action suggérée : contrôle statut retour + statut remboursement."
          })
        },
        {
          id: "echange_produit",
          label: "Échange produit",
          title: "Échange produit",
          fields: ["email", "orderNumber", "returnOpened", "returnId", "note"],
          resolve: () => ({
            tone: "success",
            title: "Demande d’échange capturée",
            text: "La demande d’échange peut être routée selon les règles de stock, variante et politique SAV.",
            summary: "Action suggérée : contrôle stock + workflow échange."
          })
        },
        {
          id: "cheminement_retour",
          label: "Suivi / cheminement retour",
          title: "Cheminement retour",
          fields: ["email", "orderNumber", "returnOpened", "returnId", "proofUpload"],
          resolve: () => ({
            tone: "success",
            title: "Suivi retour capturé",
            text: "Le client demande le cheminement du retour. Le dossier peut être vérifié à partir du suivi ou de ReturnGO.",
            summary: "Action suggérée : lookup tracking / ReturnGO."
          })
        }
      ]
    },
    {
      id: "defectueux_reception",
      label: "Défectueux / Réception",
      children: [
        {
          id: "produit_casse",
          label: "Produit cassé",
          title: "Produit cassé",
          fields: ["email", "orderNumber", "photoUpload", "note"],
          resolve: (values) => ({
            tone: "success",
            title: "Cas réception validable avec preuve",
            text: values.photoUpload
              ? "Une photo a été ajoutée. Le dossier peut être traité plus vite."
              : "Aucune photo ajoutée. Une preuve visuelle peut être demandée avant résolution.",
            summary: "Action suggérée : remplacement / enquête / crédit selon politique."
          })
        },
        {
          id: "wrong_one",
          label: "Mauvais produit reçu",
          title: "Mauvais produit reçu",
          fields: ["email", "orderNumber", "photoUpload", "note"],
          resolve: (values) => ({
            tone: "success",
            title: "Cas réception validable avec preuve",
            text: values.photoUpload
              ? "Une photo a été ajoutée. Le dossier peut être traité plus vite."
              : "Aucune photo ajoutée. Une preuve visuelle peut être demandée avant résolution.",
            summary: "Action suggérée : remplacement / enquête / crédit selon politique."
          })
        },
        {
          id: "manque_produit",
          label: "Produit manquant",
          title: "Produit manquant",
          fields: ["email", "orderNumber", "note"],
          resolve: () => ({
            tone: "success",
            title: "Produit manquant signalé",
            text: "Le dossier peut être vérifié via la commande et le contenu expédié.",
            summary: "Action suggérée : contrôle préparation / logistique."
          })
        }
      ]
    },
    {
      id: "expedition",
      label: "Expédition",
      children: [
        {
          id: "pas_traite",
          label: "Commande non traitée",
          title: "Commande non traitée",
          fields: ["email", "orderNumber"],
          hints: [
            "Cas expédition : commande non encore traitée."
          ],
          resolve: () => ({
            tone: "warning",
            title: "Commande non traitée",
            text: "Le dossier concerne l’expédition avant transit. Vérifier l’état de préparation de la commande.",
            summary: "Action suggérée : contrôle Shippingbo / préparation."
          })
        }
      ]
    },
    {
      id: "transit",
      label: "Transit",
      children: [
        {
          id: "retard",
          label: "Retard",
          title: "Retard de transit",
          fields: ["email", "orderNumber", "tracking"],
          hints: [
            "Le suivi est requis pour les cas de transit."
          ],
          resolve: () => ({
            tone: "warning",
            title: "Retard",
            text: "Le dossier transit est prêt à être traité à partir du numéro de suivi.",
            summary: "Action suggérée : enquête transporteur / support agent."
          })
        },
        {
          id: "bloque",
          label: "Bloqué",
          title: "Colis bloqué",
          fields: ["email", "orderNumber", "tracking"],
          hints: [
            "Le suivi est requis pour les cas de transit."
          ],
          resolve: () => ({
            tone: "warning",
            title: "Bloqué",
            text: "Le dossier transit est prêt à être traité à partir du numéro de suivi.",
            summary: "Action suggérée : enquête transporteur / support agent."
          })
        },
        {
          id: "perdu",
          label: "Perdu",
          title: "Colis perdu",
          fields: ["email", "orderNumber", "tracking"],
          hints: [
            "Le suivi est requis pour les cas de transit."
          ],
          resolve: () => ({
            tone: "danger",
            title: "Perdu",
            text: "Le dossier transit est prêt à être traité à partir du numéro de suivi.",
            summary: "Action suggérée : enquête transporteur / support agent."
          })
        },
        {
          id: "livre_non_recu",
          label: "Livré non reçu",
          title: "Livré non reçu",
          fields: ["email", "orderNumber", "tracking"],
          hints: [
            "Le suivi est requis pour les cas de transit."
          ],
          resolve: () => ({
            tone: "danger",
            title: "Livré non reçu",
            text: "Le dossier transit est prêt à être traité à partir du numéro de suivi.",
            summary: "Action suggérée : enquête transporteur / support agent."
          })
        }
      ]
    },
    {
      id: "modification_commande",
      label: "Modification commande",
      children: [
        {
          id: "modif_cmd",
          label: "Modifier ma commande",
          title: "Modifier la commande",
          fields: ["email", "orderNumber", "note"],
          hints: [
            "Numéro de commande requis. Plus tard, lookup possible via API Shopify."
          ],
          resolve: () => ({
            tone: "success",
            title: "Demande de modification capturée",
            text: "La demande peut être traitée selon le statut réel d’expédition de la commande.",
            summary: "Action suggérée : vérifier le script modif + Shopify."
          })
        }
      ]
    }
  ]
};

const EMPTY_VALUES = {
  email: "",
  orderNumber: "",
  tracking: "",
  returnId: "",
  note: "",
  returnOpened: false,
  photoUpload: false,
  proofUpload: false
};

const state = {
  step: 1,
  category: "",
  subIssue: "",
  values: { ...EMPTY_VALUES },
  result: null
};

const stepRoot = document.getElementById("stepRoot");
const resultRoot = document.getElementById("resultRoot");
const progressBar = document.getElementById("progressBar");
const stepLabel = document.getElementById("stepLabel");
const pathLabel = document.getElementById("pathLabel");

function getCategory(id) {
  return FLOW.categories.find((category) => category.id === id) || null;
}

function getSubIssue() {
  const category = getCategory(state.category);
  if (!category) return null;
  return category.children.find((item) => item.id === state.subIssue) || null;
}

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function resetFlow(full = true) {
  Object.assign(state, {
    step: 1,
    category: full ? "" : state.category,
    subIssue: "",
    values: { ...EMPTY_VALUES },
    result: null
  });
}

function updateMeta() {
  stepLabel.textContent = `Étape ${state.result ? 3 : state.step} / 3`;

  const category = getCategory(state.category);
  const subIssue = getSubIssue();
  const path = [];

  if (category) path.push(category.label);
  if (subIssue) path.push(subIssue.label);

  pathLabel.textContent = path.length ? path.join(" → ") : "Aucun chemin sélectionné";

  let progress = 15;
  if (state.step === 2) progress = 50;
  if (state.step === 3 || state.result) progress = 90;
  progressBar.style.width = `${progress}%`;
}

function render() {
  updateMeta();
  resultRoot.classList.add("hidden");
  resultRoot.innerHTML = "";

  if (state.result) {
    stepRoot.innerHTML = "";
    renderResult();
    return;
  }

  if (state.step === 1) renderCategoryStep();
  if (state.step === 2) renderSubIssueStep();
  if (state.step === 3) renderDynamicStep();
}

function renderCategoryStep() {
  stepRoot.innerHTML = `
    <h2 class="question">Veuillez sélectionner la catégorie de votre problème</h2>
    <div class="options">
      ${FLOW.categories.map((category) => `
        <button class="option-btn" data-category="${category.id}">
          ${category.label}
        </button>
      `).join("")}
    </div>
  `;

  document.querySelectorAll("[data-category]").forEach((button) => {
    button.addEventListener("click", () => {
      state.category = button.dataset.category;
      state.step = 2;
      render();
    });
  });
}

function renderSubIssueStep() {
  const category = getCategory(state.category);
  if (!category) return;

  stepRoot.innerHTML = `
    <h2 class="question">${category.label}</h2>
    <div class="options">
      ${category.children.map((item) => `
        <button class="option-btn" data-subissue="${item.id}">
          ${item.label}
        </button>
      `).join("")}
    </div>

    <div class="actions">
      <button class="secondary-btn" id="backBtn">Retour</button>
    </div>
  `;

  document.getElementById("backBtn").addEventListener("click", () => {
    resetFlow(true);
    render();
  });

  document.querySelectorAll("[data-subissue]").forEach((button) => {
    button.addEventListener("click", () => {
      state.subIssue = button.dataset.subissue;
      state.step = 3;
      render();
    });
  });
}

function renderField(fieldKey) {
  const def = FIELD_DEFS[fieldKey];
  const value = state.values[fieldKey];

  if (!def) return "";

  if (def.type === "checkbox") {
    return `
      <label class="inline-check">
        <input id="${fieldKey}" type="checkbox" ${value ? "checked" : ""} />
        <span>${def.label}</span>
      </label>
    `;
  }

  if (def.type === "textarea") {
    return `
      <div class="field">
        <label for="${fieldKey}">${def.label}</label>
        <textarea id="${fieldKey}" placeholder="${escapeHtml(def.placeholder || "")}">${escapeHtml(value || "")}</textarea>
      </div>
    `;
  }

  if (def.type === "file") {
    const accept = def.accept ? `accept="${def.accept}"` : "";
    return `
      <div class="field">
        <label for="${fieldKey}">${def.label}</label>
        <input id="${fieldKey}" type="file" ${accept} />
      </div>
    `;
  }

  return `
    <div class="field">
      <label for="${fieldKey}">${def.label}</label>
      <input
        id="${fieldKey}"
        type="${def.type}"
        placeholder="${escapeHtml(def.placeholder || "")}"
        value="${escapeHtml(value || "")}"
      />
    </div>
  `;
}

function renderDynamicStep() {
  const subIssue = getSubIssue();
  if (!subIssue) return;

  stepRoot.innerHTML = `
    <h2 class="question">${subIssue.title}</h2>
    <div class="stack">
      ${subIssue.fields.map(renderField).join("")}

      ${subIssue.hints ? subIssue.hints.map((hint) => `
        <div class="hint">${hint}</div>
      `).join("") : ""}

      ${subIssue.linkBox ? `
        <div class="link-box">
          ${subIssue.linkBox.text}<br />
          <a href="${subIssue.linkBox.href}">${subIssue.linkBox.linkLabel}</a>
        </div>
      ` : ""}
    </div>

    <div class="actions">
      <button class="secondary-btn" id="backToSubBtn">Retour</button>
      <button class="primary-btn" id="continueBtn">Continuer</button>
    </div>
  `;

  bindFieldEvents(subIssue.fields);

  document.getElementById("backToSubBtn").addEventListener("click", () => {
    state.step = 2;
    state.result = null;
    render();
  });

  document.getElementById("continueBtn").addEventListener("click", resolveFlow);
}

function bindFieldEvents(fields) {
  fields.forEach((fieldKey) => {
    const element = document.getElementById(fieldKey);
    const def = FIELD_DEFS[fieldKey];

    if (!element || !def) return;

    if (def.type === "checkbox") {
      element.addEventListener("change", (event) => {
        state.values[fieldKey] = event.target.checked;
      });
      return;
    }

    if (def.type === "file") {
      element.addEventListener("change", (event) => {
        state.values[fieldKey] = Boolean(event.target.files && event.target.files.length);
      });
      return;
    }

    element.addEventListener("input", (event) => {
      state.values[fieldKey] = event.target.value.trim();
    });
  });
}

function validateFields(subIssue) {
  for (const fieldKey of subIssue.fields) {
    const def = FIELD_DEFS[fieldKey];
    if (!def || !def.required) continue;

    if (def.type === "checkbox" || def.type === "file") continue;

    const value = state.values[fieldKey];
    if (!value || !String(value).trim()) {
      alert(`Merci de renseigner : ${def.label}`);
      return false;
    }
  }

  return true;
}

function refreshValuesFromDom(subIssue) {
  subIssue.fields.forEach((fieldKey) => {
    const def = FIELD_DEFS[fieldKey];
    const element = document.getElementById(fieldKey);

    if (!def || !element) return;

    if (def.type === "checkbox") {
      state.values[fieldKey] = element.checked;
      return;
    }

    if (def.type === "file") {
      state.values[fieldKey] = Boolean(element.files && element.files.length);
      return;
    }

    state.values[fieldKey] = element.value.trim();
  });
}

function formatValueForRecap(fieldKey, value) {
  if (typeof value === "boolean") {
    return value ? "Oui" : "Non";
  }

  if (!value) {
    if (fieldKey === "photoUpload" || fieldKey === "proofUpload") {
      return "Non fourni";
    }
    return "Non renseigné";
  }

  return String(value);
}

function buildAgentRecap(subIssue, result) {
  const category = getCategory(state.category);

  const lines = [
    "Recap SAV",
    `Categorie : ${category ? category.label : "-"}`,
    `Sous-categorie : ${subIssue.label}`,
    `Diagnostic automatique : ${result.title}`,
    `Action suggeree : ${result.summary}`
  ];

  const importantFields = subIssue.fields.map((fieldKey) => {
    const def = FIELD_DEFS[fieldKey];
    const cleanLabel = (def?.label || fieldKey).replace("*", "");
    const value = formatValueForRecap(fieldKey, state.values[fieldKey]);
    return `- ${cleanLabel} : ${value}`;
  });

  lines.push("", "Informations client :");
  lines.push(...importantFields);

  if (state.values.note) {
    lines.push("", `Note client : ${state.values.note}`);
  }

  const checks = [];

  if (state.category === "annulation") {
    checks.push("Verifier le statut de preparation / expedition avant action.");
  }

  if (state.category === "retour") {
    checks.push("Verifier le dossier ReturnGO et l'etat du retour.");
  }

  if (state.category === "transit") {
    checks.push("Verifier le tracking transporteur et l'historique du colis.");
  }

  if (state.category === "defectueux_reception") {
    checks.push("Verifier les preuves jointes et la conformite du colis.");
  }

  if (state.category === "modification_commande") {
    checks.push("Verifier si la commande est encore modifiable avant expedition.");
  }

  if (state.values.returnId) {
    checks.push("Controle rapide du dossier ReturnGO a partir de l'ID fourni.");
  }

  if (state.values.photoUpload) {
    checks.push("Une photo a ete annoncee par le client.");
  }

  if (state.values.proofUpload) {
    checks.push("Une preuve / un justificatif a ete annonce par le client.");
  }

  if (checks.length) {
    lines.push("", "Points de verification agent :");
    checks.forEach((check) => lines.push(`- ${check}`));
  }

  return lines.join("\n");
}

async function resolveFlow() {
  const subIssue = getSubIssue();
  if (!subIssue) return;

  refreshValuesFromDom(subIssue);

  if (!validateFields(subIssue)) return;

  state.result = subIssue.resolve(state.values);
  state.result.agentRecap = buildAgentRecap(subIssue, state.result);

  // ── Envoi vers Zendesk ──────────────────────────────────────────────────────
  try {
    const category = getCategory(state.category);

    const response = await fetch("/api/zendesk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: state.values.email,
        orderNumber: state.values.orderNumber,
        tracking: state.values.tracking,
        returnId: state.values.returnId,
        note: state.values.note,
        returnOpened: state.values.returnOpened,
        category: category ? category.label : state.category,
        subIssue: subIssue.label,
        agentRecap: state.result.agentRecap
      })
    });

    const data = await response.json();

    if (data.success) {
      state.result.ticketId = data.ticketId;
      console.log("Ticket Zendesk créé :", data.ticketId);
    } else {
      console.warn("Zendesk non disponible :", data.error);
    }
  } catch (err) {
    console.warn("Impossible de contacter le serveur :", err.message);
  }
  // ───────────────────────────────────────────────────────────────────────────

  render();
}

function renderResult() {
  resultRoot.classList.remove("hidden");
  resultRoot.innerHTML = `
    <div class="result ${state.result.tone}">
      <h3>${state.result.title}</h3>
      <p>${state.result.text}</p>
      <div class="summary">${state.result.summary}</div>
    </div>

    ${state.result.ticketId ? `
    <div class="result success" style="margin-top:12px">
      <p>✅ Ticket Zendesk créé avec succès — <strong>#${state.result.ticketId}</strong></p>
    </div>` : ""}

    <div class="agent-recap">
      <div class="agent-recap-header">
        <h4>Récapitulatif agent SAV</h4>
        <button class="secondary-btn" id="copyRecapBtn" type="button">Copier le récap</button>
      </div>
      <p class="agent-recap-sub">Texte prêt à transmettre à un agent pour vérification manuelle.</p>
      <textarea id="agentRecapText" class="agent-recap-text" readonly>${escapeHtml(state.result.agentRecap || "")}</textarea>
    </div>

    <div class="actions">
      <button class="secondary-btn" id="restartBtn">Recommencer</button>
      <button class="primary-btn" id="editBtn">Modifier ce chemin</button>
    </div>
  `;

  document.getElementById("copyRecapBtn").addEventListener("click", async () => {
    const recap = state.result.agentRecap || "";
    try {
      await navigator.clipboard.writeText(recap);
      document.getElementById("copyRecapBtn").textContent = "Copié";
      window.setTimeout(() => {
        const button = document.getElementById("copyRecapBtn");
        if (button) button.textContent = "Copier le récap";
      }, 1200);
    } catch (error) {
      const textArea = document.getElementById("agentRecapText");
      textArea.focus();
      textArea.select();
    }
  });

  document.getElementById("restartBtn").addEventListener("click", () => {
    resetFlow(true);
    render();
  });

  document.getElementById("editBtn").addEventListener("click", () => {
    state.result = null;
    state.step = 3;
    render();
  });
}

render();
