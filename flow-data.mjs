export const ART = {
  annulation:  "#annulation",
  retour:      "#faire-retour",
  nonConforme: "#non-conforme",
  defectueux:  "#defectueux",
  pointRelais: "#point-relais"
};

export const ORDER_NUMBER_RE = /^\d+$/;
export const RETURNGO_ID_RE = /^(ARM|RMA)\d{8}$/i;

export function normalizeOrderNumber(value) {
  return String(value || "").replace(/\D/g, "");
}

export const FIELD_DEFS = {
  email:                  { type: "email",    label: "Adresse e-mail*",                          placeholder: "vous@email.com",                                                              required: true  },
  orderNumber:            { type: "text",     label: "Numéro de commande*",                      placeholder: "#12345",                                                                      required: true  },
  orderNumberOpt:         { type: "text",     label: "Numéro de commande",                       placeholder: "#12345",                                                                      required: false },
  trackingNumber:         { type: "text",     label: "Numéro de suivi",                          placeholder: "Numéro de suivi si vous l'avez",                                              required: false },
  returnId:               { type: "text",     label: "ID ReturnGo*",                             placeholder: "ARM10984430",                                                                 required: true  },
  returnIdOpt:            { type: "text",     label: "ID ReturnGo",                              placeholder: "ARM10984430 ou RMA10984430",                                                   required: false },
  message:                { type: "textarea", label: "Message*",                                 placeholder: "Décrivez votre demande.",                                                     required: true  },
  messageOpt:             { type: "textarea", label: "Message",                                  placeholder: "Ajoutez des précisions si besoin.",                                           required: false },
  modifDetail:            { type: "textarea", label: "Message*",                                 placeholder: "Décrivez ce que vous souhaitez modifier.",                                    required: true  },
  newAddress:             { type: "textarea", label: "Nouvelle adresse*",                        placeholder: "Nom, adresse, complément, code postal, ville, pays, téléphone.",               required: true  },
  neighborCheck:          { type: "checkbox", label: "J'ai vérifié chez mes voisins*",           required: true  },
  photoUpload_opt:        { type: "file",     label: "Joindre une pièce jointe (optionnel)",     required: false },
  photoUpload_req:        { type: "file",     label: "Joindre une photo obligatoire*",           required: true  },
  attestationUpload_req:  { type: "file",     label: "Joindre l'attestation sur l'honneur signée*", required: true }
};

export const FLOW = {
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
        },
        {
          id: "annul_introuvable", label: "Commande introuvable",
          outcome: "ticket",
          orderStatusOms: "not_found",
          topText: "Nous n'avons pas trouvé votre commande automatiquement. Vérifiez votre numéro avant d'envoyer la demande.",
          fields: ["email", "orderNumber"],
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
            { id: "modif_non_exp_adresse", label: "Adresse", outcome: "ticket", fields: ["email", "orderNumber", "newAddress"] },
            { id: "modif_non_exp_produit", label: "Produit", outcome: "ticket", fields: ["email", "orderNumber", "message"] },
            { id: "modif_non_exp_info", label: "Information de commande", outcome: "ticket", fields: ["email", "orderNumber", "message"] }
          ]
        },
        {
          id: "modif_expediee", label: "Commande expédiée",
          orderStatusOms: "shipped",
          question: "Que souhaitez-vous modifier ?",
          children: [
            { id: "modif_exp_adresse", label: "Adresse", outcome: "ticket", fields: ["email", "orderNumber", "message"] },
            { id: "modif_exp_produit", label: "Produit", outcome: "selfservice", selfservice: { title: "Retour / échange", body: "La commande est expédiée. Pour modifier un produit, utilisez le parcours Retour / échange.", ctaLabel: "Accéder au parcours Retour / échange", ctaHref: ART.retour } },
            { id: "modif_exp_information", label: "Information", outcome: "ticket", fields: ["email", "orderNumber", "message"] }
          ]
        },
        {
          id: "modif_introuvable", label: "Commande introuvable",
          outcome: "ticket",
          orderStatusOms: "not_found",
          fields: ["email", "orderNumber", "message"],
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
        },
        {
          id: "suivi_retard", label: "Mon colis est en retard",
          outcome: "ticket",
          fields: ["email", "orderNumber", "trackingNumber", "messageOpt"],
        },
        {
          id: "suivi_bloque", label: "Mon suivi n'avance plus / colis bloqué",
          outcome: "ticket",
          fields: ["email", "orderNumber", "trackingNumber", "messageOpt"],
        },
        {
          id: "suivi_relais", label: "Problème avec le point relais",
          outcome: "ticket",
          fields: ["email", "orderNumber", "trackingNumber", "message"],
          extraLink: { label: "Je n'ai pas reçu mon code Mondial Relay — que faire ?", href: ART.pointRelais },
        },
        {
          id: "suivi_livre_non_recu", label: "Mon colis est indiqué livré mais je ne l'ai pas reçu",
          outcome: "ticket",
          topText: "Téléchargez l'attestation sur l'honneur générée, signez-la, puis joignez le document à votre demande.",
          fields: ["email", "orderNumber", "trackingNumber", "message", "neighborCheck", "attestationUpload_req"],
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
        },
        {
          id: "remb_montant_incorrect", label: "Le montant remboursé est incorrect",
          outcome: "ticket",
          fields: ["email", "returnIdOpt", "message"],
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
        },
        {
          id: "recep_manquant", label: "Produit manquant",
          outcome: "ticket",
          fields: ["email", "orderNumber", "photoUpload_opt", "message"],
        },
        {
          id: "recep_mauvais", label: "Mauvais produit reçu",
          outcome: "ticket",
          fields: ["email", "orderNumber", "photoUpload_req", "message"],
        },
        {
          id: "recep_incompatible", label: "Produit incompatible / mauvaise taille",
          outcome: "ticket",
          fields: ["email", "orderNumber", "message"],
        },
        {
          id: "defectueux", label: "Produit défectueux",
          outcome: "ticket",
          fields: ["email", "orderNumber", "photoUpload_opt", "message"],
        }
      ]
    },
    {
      id: "autre", label: "Autre demande",
      outcome: "ticket",
      fields: ["email", "orderNumberOpt", "message"],
    }
  ]
};
