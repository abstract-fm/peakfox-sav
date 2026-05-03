Pourquoi nous contactez-vous ?
├── Annuler ma commande
│   ├── email
│   ├── order_id
│   └── Vérification commande (Shippingbo)
│       ├── Commande < 24h
│       │   └── → self-service portail ReturnGo (pas de ticket)
│       ├── Commande > 24h
│       │   └── → ticket créé + blocage commande
│       ├── Commande déjà expédiée
│       │   └── → annulation impossible, pas de ticket
│       ├── Commande bloquée OMS (< 24h)
│       │   └── → self-service portail ReturnGo (pas de ticket)
│       ├── Commande bloquée OMS (> 24h)
│       │   └── → ticket créé
│       └── Commande introuvable
│           └── → ticket créé + avertissement client
├── Modifier ma commande
│   ├── email
│   ├── order_id
│   └── Vérification commande (Shippingbo)
│       ├── Commande non expédiée
│       │   └── Que souhaitez-vous modifier ?
│       │       ├── Adresse
│       │       │   ├── nouvelle adresse
│       │       │   └── → mise à jour adresse + ticket informatif
│       │       ├── Produit
│       │       │   ├── message
│       │       │   └── → blocage commande + ticket créé
│       │       └── Information de commande
│       │           ├── message
│       │           └── → ticket créé
│       ├── Commande expédiée
│       │   └── Que souhaitez-vous modifier ?
│       │       ├── Adresse
│       │       │   ├── message
│       │       │   └── → ticket créé (SAV / transporteur)
│       │       ├── Produit
│       │       │   └── → redirection : Retour / échange
│       │       └── Information
│       │           ├── message
│       │           └── → ticket créé
│       └── Commande introuvable
│           ├── message
│           └── → ticket créé
├── Problème de livraison / suivi
│   └── Quel est votre problème ?
│       ├── Je n'ai pas encore reçu de lien de suivi
│       │   ├── email
│       │   ├── order_id
│       │   └── → ticket créé
│       ├── Mon colis est en retard
│       │   ├── email
│       │   ├── order_id
│       │   ├── tracking_number (optionnel)
│       │   ├── message (optionnel)
│       │   └── → ticket créé
│       ├── Mon suivi n'avance plus / colis bloqué
│       │   ├── email
│       │   ├── order_id
│       │   ├── tracking_number (optionnel)
│       │   ├── message (optionnel)
│       │   └── → ticket créé
│       ├── Problème avec le point relais
│       │   ├── email
│       │   ├── order_id
│       │   ├── tracking_number (optionnel)
│       │   ├── message
│       │   └── → ticket créé
│       └── Mon colis est indiqué livré mais je ne l'ai pas reçu
│           ├── email
│           ├── order_id
│           ├── tracking_number (optionnel)
│           ├── message (obligatoire)
│           ├── checkbox : j'ai vérifié chez mes voisins (obligatoire)
│           ├── attestation sur l'honneur (document .doc généré, à signer et joindre)
│           └── → ticket créé
├── Retour / échange
│   └── Délai depuis réception ≤ 14 jours ?
│       ├── Non
│       │   ├── email
│       │   ├── message
│       │   └── → ticket créé (traitement manuel)
│       └── Oui
│           ├── Faire un retour
│           │   ├── email
│           │   ├── order_id
│           │   └── → self-service portail ReturnGo
│           ├── Faire un échange
│           │   ├── email
│           │   ├── order_id
│           │   └── → self-service portail ReturnGo
│           ├── Suivre mon retour / échange
│           │   ├── email
│           │   ├── returngo_id
│           │   └── → self-service portail ReturnGo
│           └── Le portail retour ne fonctionne pas
│               ├── email
│               ├── order_id
│               ├── message
│               └── → ticket créé
├── Remboursement
│   ├── Je n'ai pas reçu mon remboursement
│   │   ├── email
│   │   ├── returngo_id (optionnel)
│   │   ├── message
│   │   └── → ticket créé
│   └── Le montant remboursé est incorrect
│       ├── email
│       ├── returngo_id (optionnel)
│       ├── message
│       └── → ticket créé
├── Problème avec un produit reçu
│   └── Quel est le problème ?
│       ├── Produit endommagé
│       │   ├── email
│       │   ├── order_id
│       │   ├── photo (obligatoire)
│       │   ├── message
│       │   └── → ticket créé
│       ├── Produit manquant
│       │   ├── email
│       │   ├── order_id
│       │   ├── photo (optionnel)
│       │   ├── message
│       │   └── → ticket créé
│       ├── Mauvais produit reçu
│       │   ├── email
│       │   ├── order_id
│       │   ├── photo (obligatoire)
│       │   ├── message
│       │   └── → ticket créé
│       ├── Produit incompatible / mauvaise taille
│       │   ├── email
│       │   ├── order_id
│       │   ├── message
│       │   └── → ticket créé
│       └── Produit défectueux
│           ├── email
│           ├── order_id
│           ├── photo (optionnel)
│           ├── message
│           └── → ticket créé
└── Autre demande
├── email
├── order_id (optionnel)
├── message
└── → ticket créé