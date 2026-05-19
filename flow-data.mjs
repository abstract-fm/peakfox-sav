export const ART = {
  annulation: "#annulation",
  retour: "#faire-retour",
  pointRelais: "#point-relais"
};

export const RETURN_GO_PORTAL_URL = "https://mygarminstraps.fr/a/service/returns?";
export const ORDER_TRACKING_PORTAL_URL = "https://mygarminstraps.fr/a/service/tracking";

export const ORDER_NUMBER_RE = /^\d+$/;
export const RETURNGO_ID_RE = /^(ARM|RMA)\d{8}$/i;

export function normalizeOrderNumber(value) {
  return String(value || "").replace(/\D/g, "");
}

const returnGoSelfservice = {
  title: "Portail ReturnGo",
  body: "Cette demande se fait directement depuis le portail ReturnGo.",
  ctaLabel: "Accéder au portail ReturnGo",
  ctaHref: RETURN_GO_PORTAL_URL
};

const orderTrackingSelfservice = {
  title: "Suivi de commande",
  body: "Vous pouvez suivre votre commande directement depuis notre portail de suivi.",
  ctaLabel: "Suivre ma commande",
  ctaHref: ORDER_TRACKING_PORTAL_URL
};

const orderTrackingLink = {
  label: "Suivre ma commande",
  href: ORDER_TRACKING_PORTAL_URL
};

export const FIELD_DEFS = {
  email: { type: "email", label: "Adresse e-mail*", placeholder: "vous@email.com", required: true },
  orderNumber: { type: "text", label: "Numéro de commande*", placeholder: "#12345", required: true },
  trackingNumber: { type: "text", label: "Numéro de suivi", placeholder: "Numéro de suivi si vous l'avez", required: false },
  returnId: { type: "text", label: "Numéro ReturnGo*", placeholder: "ARM10984430", required: true },
  message: { type: "textarea", label: "Message*", placeholder: "Décrivez votre demande.", required: true },
  messageOpt: { type: "textarea", label: "Message", placeholder: "Ajoutez des précisions si besoin.", required: false },
  fullName: { type: "text", label: "Nom / prénom*", placeholder: "Votre nom et prénom", required: true },
  newAddress: { type: "textarea", label: "Nouvelle adresse complète*", placeholder: "Rue, bâtiment, appartement, complément...", required: true },
  postalCode: { type: "text", label: "Code postal*", placeholder: "75001", required: true },
  city: { type: "text", label: "Ville*", placeholder: "Paris", required: true },
  country: { type: "text", label: "Pays*", placeholder: "France", required: true },
  phone: { type: "tel", label: "Téléphone*", placeholder: "+33 6 12 34 56 78", required: true },
  currentProduct: { type: "text", label: "Produit actuel*", placeholder: "Produit ou variante actuelle", required: true },
  desiredProduct: { type: "text", label: "Nouveau produit souhaité*", placeholder: "Produit ou variante souhaitée", required: true },
  watchModel: { type: "text", label: "Modèle de montre*", placeholder: "Ex. Apple Watch Series 9 45 mm", required: true },
  neighborCheck: { type: "checkbox", label: "J'ai vérifié chez mes voisins*", required: true },
  attestationUpload_req: { type: "file", label: "Joindre l'attestation sur l'honneur signée*", required: true }
};

export const FLOW = {
  rootQuestion: "Pourquoi nous contactez-vous ?",
  categories: [
    {
      id: "annulation",
      label: "Annuler ma commande",
      outcome: "ticket",
      fields: ["email", "orderNumber"]
    },
    {
      id: "modification",
      label: "Modifier ma commande",
      question: "Que souhaitez-vous modifier ?",
      children: [
        {
          id: "modif_adresse",
          label: "Adresse de livraison",
          outcome: "ticket",
          fields: ["email", "orderNumber", "fullName", "newAddress", "postalCode", "city", "country", "phone"]
        },
        {
          id: "modif_produit",
          label: "Produit / variante",
          outcome: "ticket",
          fields: ["email", "orderNumber", "currentProduct", "desiredProduct", "message"]
        },
        {
          id: "modif_information",
          label: "Information de commande",
          outcome: "ticket",
          fields: ["email", "orderNumber", "message"]
        }
      ]
    },
    {
      id: "suivi",
      label: "Problème de livraison / suivi",
      question: "Quel est votre problème ?",
      children: [
        {
          id: "suivi_pas_suivi",
          label: "Je n'ai pas encore reçu de lien de suivi",
          outcome: "selfservice",
          fields: ["email", "orderNumber"],
          selfservice: orderTrackingSelfservice
        },
        {
          id: "suivi_retard",
          label: "Mon colis est en retard",
          outcome: "ticket",
          fields: ["email", "orderNumber", "trackingNumber", "messageOpt"],
          extraLink: orderTrackingLink
        },
        {
          id: "suivi_bloque",
          label: "Mon suivi n'avance plus / colis bloqué",
          outcome: "ticket",
          fields: ["email", "orderNumber", "trackingNumber", "message"],
          extraLink: orderTrackingLink
        },
        {
          id: "suivi_relais",
          label: "Problème avec le point relais",
          outcome: "ticket",
          fields: ["email", "orderNumber", "trackingNumber", "message"],
          extraLink: orderTrackingLink
        },
        {
          id: "suivi_livre_non_recu",
          label: "Mon colis est indiqué livré mais je ne l'ai pas reçu",
          outcome: "ticket",
          topText: "Téléchargez l'attestation sur l'honneur, signez-la, puis joignez le document à votre demande.",
          fields: ["email", "orderNumber", "trackingNumber", "message", "neighborCheck", "attestationUpload_req"],
          extraLink: orderTrackingLink
        }
      ]
    },
    {
      id: "retour",
      label: "Retour / échange",
      question: "Avez-vous déjà effectué une demande de retour / échange ?",
      children: [
        {
          id: "retour_deja_oui",
          label: "Oui",
          question: "Quel est votre problème ?",
          children: [
            { id: "retour_remboursement", label: "Problème de remboursement", outcome: "ticket", fields: ["email", "returnId", "message"] },
            { id: "retour_echange_probleme", label: "Problème avec mon échange", outcome: "ticket", fields: ["email", "returnId", "message"] },
            { id: "retour_suivre", label: "Suivre mon retour / échange", outcome: "ticket", fields: ["email", "returnId", "message"] },
            { id: "retour_refuse", label: "Mon retour a été refusé", outcome: "ticket", fields: ["email", "returnId", "message"] },
            { id: "retour_autre", label: "Autre problème", outcome: "ticket", fields: ["email", "returnId", "message"] }
          ]
        },
        {
          id: "retour_deja_non",
          label: "Non",
          question: "Que souhaitez-vous faire ?",
          children: [
            {
              id: "retour_faire",
              label: "Faire un retour",
              outcome: "selfservice",
              fields: ["email", "orderNumber"],
              selfservice: returnGoSelfservice
            },
            {
              id: "retour_echange",
              label: "Faire un échange",
              outcome: "selfservice",
              fields: ["email", "orderNumber"],
              selfservice: returnGoSelfservice
            }
          ]
        },
        {
          id: "retour_non_probleme",
          label: "Non, j'ai eu un problème",
          question: "Quel est le problème ?",
          children: [
            { id: "retour_portail_ko", label: "Le portail ne fonctionne pas", outcome: "ticket", fields: ["email", "orderNumber", "message"] },
            { id: "retour_commande_introuvable", label: "Je ne trouve pas ma commande", outcome: "ticket", fields: ["email", "orderNumber", "message"] },
            { id: "retour_refuse_sans_demande", label: "Mon retour a été refusé", outcome: "ticket", fields: ["email", "orderNumber", "message"] },
            { id: "retour_probleme_autre", label: "Autre problème", outcome: "ticket", fields: ["email", "orderNumber", "message"] }
          ]
        }
      ]
    },
    {
      id: "reception",
      label: "Problème avec un produit reçu",
      question: "Quel est le problème ?",
      children: [
        { id: "recep_endommage", label: "Produit endommagé", outcome: "selfservice", selfservice: returnGoSelfservice },
        { id: "recep_manquant", label: "Produit manquant", outcome: "selfservice", selfservice: returnGoSelfservice },
        { id: "recep_mauvais", label: "Mauvais produit reçu", outcome: "selfservice", selfservice: returnGoSelfservice },
        {
          id: "recep_incompatible",
          label: "Produit incompatible / mauvaise taille",
          outcome: "ticket",
          fields: ["email", "watchModel", "orderNumber", "message"]
        },
        { id: "defectueux", label: "Produit défectueux", outcome: "selfservice", selfservice: returnGoSelfservice }
      ]
    }
  ]
};
