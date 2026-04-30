# Form Navigation Tree

Source of truth: `FLOW` in `script.js`.

```mermaid
flowchart TD
    A["Pourquoi nous contactez-vous ?"]

    A --> B["Annuler ma commande"]
    B --> B1["Avez-vous recu un suivi ?"]
    B1 --> B11["Non"]
    B1 --> B12["Oui"]
    B1 --> B13["Je ne sais pas"]

    A --> C["Modifier ma commande"]
    C --> C1["Avez-vous recu un suivi ?"]
    C1 --> C11["Non"]
    C11 --> C111["Adresse"]
    C11 --> C112["Produit"]
    C11 --> C113["Information"]
    C1 --> C12["Oui"]
    C1 --> C13["Je ne sais pas"]

    A --> D["Probleme de livraison / suivi"]
    D --> D1["Je n'ai pas encore de suivi"]
    D --> D2["Mon colis est en retard"]
    D --> D3["Mon colis est bloque"]
    D --> D4["Mon colis semble perdu"]
    D --> D5["Probleme point relais"]
    D --> D6["Livre mais non recu"]

    A --> E["Retour / remboursement"]
    E --> E1["Delai depuis reception <= 14 jours ?"]
    E1 --> E11["Non"]
    E1 --> E12["Oui"]
    E12 --> E121["Faire un retour"]
    E12 --> E122["Suivre mon retour"]
    E12 --> E123["Probleme avec mon remboursement"]
    E12 --> E124["Probleme avec mon echange"]
    E12 --> E125["Le portail retour ne fonctionne pas"]

    A --> F["Probleme avec un produit recu"]
    F --> F1["Produit endommage"]
    F --> F2["Produit manquant"]
    F --> F3["Mauvais produit recu"]
    F --> F4["Produit ne fonctionne pas / defectueux"]

    A --> G["Autre demande"]
```

```text
Pourquoi nous contactez-vous ?
├── Annuler ma commande
│   └── Avez-vous reçu un suivi ?
│       ├── Non
│       │   ├── email
│       │   ├── order_id
│       │   └── action: annulation possible
│       ├── Oui
│       │   └── redirection: Retour / remboursement
│       └── Je ne sais pas
│           ├── email
│           ├── order_id
│           └── action: vérification SAV
├── Modifier ma commande
│   └── Avez-vous reçu un suivi ?
│       ├── Non
│       │   └── Que souhaitez-vous modifier ?
│       │       ├── Adresse
│       │       │   ├── email
│       │       │   ├── order_id
│       │       │   └── message
│       │       ├── Produit
│       │       │   ├── email
│       │       │   ├── order_id
│       │       │   └── message
│       │       └── Information
│       │           ├── email
│       │           ├── order_id
│       │           └── message
│       ├── Oui
│       │   └── redirection: Retour / remboursement
│       └── Je ne sais pas
│           ├── email
│           ├── order_id
│           └── message
├── Problème de livraison / suivi
│   └── Quel est votre problème ?
│       ├── Je n’ai pas encore de suivi
│       │   ├── email
│       │   └── order_id
│       ├── Mon colis est en retard
│       │   ├── email
│       │   ├── order_id
│       │   ├── tracking_number optionnel
│       │   └── message optionnel
│       ├── Mon colis est bloqué
│       │   ├── email
│       │   ├── order_id
│       │   ├── tracking_number optionnel
│       │   └── message optionnel
│       ├── Mon colis semble perdu
│       │   ├── email
│       │   ├── order_id
│       │   ├── tracking_number optionnel
│       │   └── message optionnel
│       ├── Problème point relais
│       │   ├── email
│       │   ├── order_id
│       │   ├── tracking_number optionnel
│       │   └── message
│       └── Livré mais non reçu
│           ├── email
│           ├── order_id
│           ├── tracking_number optionnel
│           └── message obligatoire
├── Retour / remboursement
│   └── Délai depuis réception ≤ 14 jours ?
│       ├── Non
│       │   ├── email
│       │   ├── message
│       │   └── action: traitement manuel SAV
│       └── Oui
│           └── Que souhaitez-vous faire ?
│               ├── Faire un retour
│               │   ├── email
│               │   └── order_id
│               ├── Suivre mon retour
│               │   ├── email
│               │   └── returngo_id
│               ├── Problème avec mon remboursement
│               │   ├── email
│               │   ├── returngo_id
│               │   └── message
│               ├── Problème avec mon échange
│               │   ├── email
│               │   ├── order_id
│               │   └── message
│               └── Le portail retour ne fonctionne pas
│                   ├── email
│                   ├── order_id
│                   └── message
├── Problème avec un produit reçu
│   └── Quel est le problème ?
│       ├── Produit endommagé
│       │   ├── email
│       │   ├── order_id
│       │   ├── photo obligatoire
│       │   └── message
│       ├── Produit manquant
│       │   ├── email
│       │   ├── order_id
│       │   ├── photo optionnel
│       │   └── message
│       ├── Mauvais produit reçu
│       │   ├── email
│       │   ├── order_id
│       │   ├── photo obligatoire
│       │   └── message
│       └── Produit ne fonctionne pas / défectueux
│           ├── email
│           ├── order_id
│           ├── photo optionnel
│           └── message
└── Autre demande
    ├── email
    ├── order_id optionnel
    └── message
```

## Totals

- Top-level categories: 6
- Leaf outcomes: 24
- Ticket forms: 22
- Redirection branches: 2
