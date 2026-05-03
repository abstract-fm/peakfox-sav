Pourquoi nous contactez-vous ?
├── Annuler ma commande
│   ├── email
│   ├── order_id
│   ├── message (optionnel)
│   └── → ticket créé
├── Modifier ma commande
│   └── Que souhaitez-vous modifier ?
│       ├── Adresse
│       │   ├── email
│       │   ├── order_id
│       │   ├── nouvelle adresse
│       │   └── → ticket créé
│       ├── Produit
│       │   ├── email
│       │   ├── order_id
│       │   ├── message
│       │   └── → ticket créé
│       └── Information de commande
│           ├── email
│           ├── order_id
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
