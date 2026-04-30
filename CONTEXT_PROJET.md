# SAV Bot — Contexte Projet

> Document de référence pour le développement. À maintenir à jour à chaque évolution majeure.
> Dernière mise à jour : 2026-04-28

---

## 1. Vue d'ensemble

**Objectif :** Automatiser et faciliter le traitement des demandes SAV sur une dizaine de stores Shopify, via des agents Claude connectés à Zendesk.

**Principe :** Le SAV existant est fonctionnel et vivant (triggers, automatismes, déclencheurs Zendesk déjà configurés). Les agents IA sont **additifs** — ils s'intègrent au flux existant sans remplacer l'infrastructure en place.

**Volume :** ~80 tickets/jour après filtrage par les formulaires (100 bruts). Pilote sur 2 stores (~30 tickets/jour).

---

## 2. Canaux d'entrée

- **Uniquement les centres d'aide** — zéro email entrant.
- Chaque store a son propre centre d'aide avec une **URL unique**.
- Pour les stores multilingues : sous-URL par langue (ex. `store.fr/aide`, `store.fr/en/aide`).
- Le formulaire du centre d'aide est le seul point d'entrée client.

---

## 3. Architecture globale — 2 flows distincts

### Flow A — Annulation / Modification

Géré **au niveau du formulaire**, directement connecté à Shippingbo en temps réel pour le statut de traitement. Développement spécifique nécessaire.

**Principe clé :** Les annulations suivent une logique en 3 cas basée sur le statut d'expédition et l'âge de la commande. Le bot ne déclenche jamais d'annulation lui-même — c'est soit le client en self-service, soit un agent humain.

```
Client saisit n° commande sur formulaire
        ↓
Shippingbo — vérification statut commande en temps réel
        ↓
┌─────────────────┬──────────────────────────┬───────────────────────────────┐
│ Cmd expédiée    │ Cmd non expédiée < 24h   │ Cmd non expédiée > 24h        │
│                 │                          │                               │
│ ❌ Impossible   │ ✅ Self-service client    │ 🔒 API Shippingbo (auto)      │
│   statut → "en attente"       │
│   cmd sécurisée immédiat      │
│ → Ticket Zendesk créé         │
│ → Agent traite sans urgence   │
└─────────────────┴──────────────────────────┴───────────────────────────────┘
```

**ReturnGo :** Utilisé pour le self-service < 24h (annulations) et comme source des informations de retour. Lien affiché directement sur le centre d'aide après vérification Shippingbo — **aucun ticket Zendesk créé**, réduction directe du volume. C'est le client qui effectue la manipulation lui-même sur le portail ReturnGo.

**Shippingbo > 24h :** Blocage **automatique via API** au moment de la soumission du formulaire (changement de statut → "en attente"). La commande est immédiatement sécurisée — l'agent traite la demande sans pression de délai, la commande ne partira pas.

**⚠️ Test obligatoire en Phase 3 :** Simuler une demande d'annulation pendant que la commande est "en préparation" dans Shippingbo — vérifier le timing avec l'entrepôt physique.

---

### Flow B — Autres problèmes (L1, L2, L3)

```
Client remplit formulaire (centre d'aide)
        ↓
Agent 1 — Classificateur / Enrichisseur
  - Crée ticket Zendesk
  - Complète / enrichit les champs (base : champs remplis par le formulaire)
  - Récupère infos Shippingbo + Shopify (que le client ne connaît pas)
  - Classifie : L1 / L2 / L3
        ↓
┌──────────────┬────────────────────────────┬──────────────────────────┐
│     L1       │           L2               │           L3             │
│              │                            │                          │
│ Aucun bot    │ Agent 2 répond au client   │ Agent 3 prépare le       │
│ Agent humain │ (réponse auto contextuée)  │ dossier pour l'humain    │
│ traite       │                            │                          │
└──────────────┴────────────────────────────┴──────────────────────────┘
```

---

## 4. Les 3 agents — Spec détaillée

### Agent 1 — Classificateur / Enrichisseur

**Déclenchement :**
- À chaque nouveau ticket créé (formulaire)
- À chaque réponse client sur un ticket L2 (après qu'Agent 2 a terminé — séquentiel, pas en parallèle)

**Actions :**
1. Lit le contenu du formulaire (champs déjà pré-remplis par le client)
2. Interroge Shippingbo → statut commande, statut traitement, historique
3. Interroge Shopify (store concerné via Shopify Partner App) → infos commande, client
4. Complète et enrichit les champs Zendesk (catégorie, store_id, statut commande, infos manquantes)
5. Classifie le ticket : L1 / L2 / L3
6. Si reclassification L2→L3 : déclenche le trigger Zendesk correspondant

**Fallback commande introuvable :** Si le numéro de commande n'existe pas dans Shippingbo/Shopify → tag `commande_introuvable` + assignation automatique à queue agent humain. Agent 1 ne classifie pas sur la base du texte seul dans ce cas.

**Règle de reclassification L2→L3 :**
Agent 1 reçoit la réponse client + historique complet. Il reclassifie en L3 si :
- Le problème n'est pas résolu après 3 échanges
- Agent 2 a déclaré ne pas pouvoir résoudre (signal explicite dans son output)
- Ton du client : frustration croissante détectée

> Ces 3 signaux sont évalués par Agent 1. Si 2/3 sont présents → L3 automatique.

**Comportement "merci" :** Agent 1 analyse l'**intention** du message, pas le mot "merci". "Merci mais toujours pas reçu" → L3. "Ok merci" → résolu.

---

### Agent 2 — Réponse L2 automatique

**Déclenchement :** Ticket classifié L2 par Agent 1.

**Actions :**
1. Récupère le contexte complet (ticket + données Shippingbo + tracking transporteur + historique)
2. Consulte la base de connaissance du store concerné + fiches internes fournies
3. Rédige une réponse personnalisée dans **la langue du client**
4. Envoie la réponse publique via API Zendesk
5. Inclut dans son output un signal explicite : `résolu` ou `escalade_nécessaire`

**Signal d'escalade :** Si Agent 2 ne peut pas résoudre (infos manquantes, cas hors scope, situation ambiguë) → il déclare `escalade_nécessaire` → Agent 1 reclassifie en L3. Coût additionnel : ~20 tokens.

**Réponse implicite :** Si Agent 2 a fait une affirmation (ex. "votre colis arrive vendredi") et que le client répond que ce n'est pas le cas → Agent 1 analyse le contexte complet, pas de reclassification aveugle.

**Langue :** Toujours dans la langue du message client. Claude détecte nativement.

---

### Agent 3 — Facilitateur L3

**Déclenchement :**
- Ticket classifié L3 (nouveau ou reclassifié depuis L2)
- À chaque réponse client sur un ticket L3 **tant qu'aucun agent humain n'a envoyé de réponse publique**

**Définition "ticket pris par humain" :** Un agent humain a envoyé au moins une réponse publique au client. Tag Zendesk `agent_actif` posé automatiquement à ce moment. Dès que ce tag est présent : Agent 3 continue de se déclencher sur les réponses client mais en mode "assistant silencieux" (note interne uniquement, jamais de réponse publique).

**Output — Note interne Zendesk (3 blocs) :**

```
┌─────────────────────────────────────────────────┐
│ BLOC 1 — Résumé situation (toujours en FR)       │
│ - Qui est le client, quelle commande             │
│ - Historique des échanges condensé               │
│ - Ton détecté (neutre / frustré / très frustré)  │
│ - Nb d'échanges, date premier contact            │
└─────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────┐
│ BLOC 2 — Traduction du dernier message (en FR)   │
│ - Message original (langue client)               │
│ - Traduction française                           │
│ (bloc ignoré si message déjà en FR)              │
└─────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────┐
│ BLOC 3 — Draft réponse                           │
│ - Draft dans la langue du client                 │
│ - Résumé FR du draft (pour validation agent)     │
│ - Note interne : points à vérifier avant envoi   │
└─────────────────────────────────────────────────┘
```

**Règle "skip résumé" :** Si le dernier message client est une réponse courte à une question directe de l'agent (confirmation d'adresse, oui/non, numéro de commande) → Agent 3 skip le Bloc 1 et propose uniquement le Bloc 3.

**Optimisation coût tokens :** Agent 3 reçoit le **résumé cumulatif** du dernier appel + les nouveaux messages uniquement. Il ne reçoit jamais l'historique brut complet. Le résumé cumulatif est stocké dans la DB de l'orchestrateur, mis à jour à chaque appel.

---

## 5. Règles de routage et transitions

| Événement | Action |
|---|---|
| Nouveau ticket formulaire | → Agent 1 (classification + enrichissement) |
| Classifié L1 | → Queue agent humain. Zendesk envoie confirmation automatique au client |
| Classifié L2 | → Agent 2 répond |
| Réponse client sur ticket L2 | → Agent 1 reclassifie (après qu'Agent 2 a fini) |
| Agent 2 déclare `escalade_nécessaire` | → Agent 1 reclassifie en L3 |
| 2/3 signaux "tourner en rond" | → Agent 1 reclassifie en L3 |
| Reclassifié L3 | → Agent 3 prépare note + trigger notif équipe humaine |
| Réponse client sur ticket L3 | → Agent 3 (note interne seulement) |
| Agent humain envoie 1ère réponse publique | → Tag `agent_actif` posé. Agent 3 passe en mode assistant |
| Ticket L3 : humain actif | → Agent 3 continue les résumés/drafts, jamais de réponse publique |
| Commande introuvable | → Tag `commande_introuvable` + queue humaine |
| Pas de réponse client sous 3 jours | → Relance automatique Zendesk |
| Pas de réponse après relance | → Ticket auto-résolu (automatisme Zendesk existant) |

**Règle fondamentale :** Une fois un ticket L3 pris par un humain, il **reste humain**. L3 ne redescend jamais en L2. Les agents ne répondent plus jamais publiquement.

**Race condition :** Agent 1 se déclenche uniquement après qu'Agent 2 a terminé son traitement. File d'attente (queue) par ticket dans l'orchestrateur — pas de traitement parallèle sur un même ticket.

---

## 6. Intégrations techniques

### Shopify — Multi-store
- **Approche :** Une seule Shopify Custom App développée via le compte Partner existant (compte Partner déjà connecté aux ~10 stores via accès collaborateur)
- **Auth :** OAuth par store → 1 access_token par store, stockés chiffrés dans le vault de l'orchestrateur
- **Accès :** `store_id` → `access_token` → appel API Shopify du bon store
- **Scopes nécessaires :** `read_orders`, `read_fulfillments`, `write_orders` (à préciser)

### ~~ERP~~ — RETIRÉ
> L'ERP de la société logistique est 100% custom, non sécurisé pour une ouverture externe, et trop coûteux à sécuriser. Connexion abandonnée. Toutes les données sont récupérées via Shippingbo, les APIs transporteurs, et ReturnGo.

### Shippingbo
- **Rôle élargi :** Source principale du statut de traitement des commandes + blocage/libération
- Utilisé pour :
  - Statut de traitement des commandes (en préparation, expédié, en attente…)
  - Blocage automatique via API au moment de la soumission du formulaire (annulation > 24h)
  - Libération de commande après traitement agent
- **⚠️ À confirmer :** Documentation API complète — statuts disponibles, endpoints blocage/libération

### APIs Transporteurs (tracking direct)
Le tracking des colis est récupéré **directement auprès des APIs de chaque transporteur**.

| Transporteur | Groupe | API |
|---|---|---|
| Colissimo | La Poste | La Poste API |
| Chronopost | La Poste | La Poste API |
| Lettre suivie | La Poste | La Poste API |
| Delivengo | La Poste | La Poste API — suivi FR uniquement, pas de tracking fin à destination internationale (CA, AU, NZ). Accepté. |
| GLS | GLS | GLS API — suivi FR/EU, tracking limité hors zone |
| Mondial Relay | Mondial Relay | Mondial Relay API — suivi FR/EU, tracking limité hors zone |

> ✅ **Simplification :** Colissimo, Chronopost, Lettre suivie et Delivengo partagent l'API La Poste — **1 seule intégration** pour 4 transporteurs. Total : **3 intégrations** (La Poste, GLS, Mondial Relay). Pas d'agrégateur nécessaire.

> 🧠 **Logique de délai :** Le bot connaît le pays de destination (via Shopify/Shippingbo). Il compare le délai écoulé depuis l'expédition aux délais normaux par transporteur et par zone pour déterminer si "c'est juste long" (délai normal international) ou s'il y a un problème réel. Ces délais de référence sont définis dans la base de connaissance par store.

### ReturnGo
- **Rôle élargi :** Self-service annulations < 24h + **source des informations de retour**
- Portail self-service client pour les annulations < 24h (le bot redirige, n'appelle pas l'API)
- API ReturnGo consultée par les agents pour : statuts de retour, historique des demandes, conditions d'éligibilité

### Zendesk Enterprise
- Triggers, webhooks, automatismes déjà configurés — SAV vivant et fonctionnel
- Nouveau champ à créer : `type_traitement` (IA / Humain) avec mapping visuel pour les agents
- Tag `agent_actif` posé automatiquement à la première réponse humaine
- Tags de classification : `l1`, `l2`, `l3`, `commande_introuvable`
- Webhook sur création de ticket → orchestrateur
- API Zendesk utilisée pour : écriture note interne, réponse publique (Agent 2), mise à jour champs, tags

### Transporteurs
Colissimo, Chronopost, Lettre suivie, GLS, Mondial Relay, Delivengo (international — France, Europe, Canada, Australie, Nouvelle-Zélande). Le tracking est récupéré **directement via les APIs de chaque transporteur** (voir section détaillée ci-dessus).

---

## 7. Gestion des langues

| Contexte | Comportement |
|---|---|
| Agent 2 → réponse client | Toujours dans la langue du message client (détection automatique Claude) |
| Agent 3 → Bloc 1 (résumé) | Toujours en français |
| Agent 3 → Bloc 2 (traduction) | Traduction du message client vers le français. Bloc ignoré si message déjà en FR |
| Agent 3 → Bloc 3 (draft) | Dans la langue du client + résumé FR du draft pour validation agent |
| Agent 1 | Interne uniquement — langue de travail : français |

**Langues couvertes :** Français, anglais, néerlandais, allemand, italien, espagnol, suédois, norvégien, et toute autre langue des stores actifs. Claude gère nativement sans configuration supplémentaire.

---

## 8. Base de connaissance des agents

**Source :** Contenu du centre d'aide de chaque store + fiches internes (consignes, politiques, cas particuliers).

**Format :** À définir — suggestion : document structuré par store (Markdown ou JSON), versionné, injecté dans le contexte des agents au moment de l'appel.

**Maintenance :** L'équipe met à jour le centre d'aide + les fiches internes → mécanisme de sync à définir en dev.

**Contenu par store :** Politiques de retour, délais de livraison, fenêtres d'annulation, cas particuliers produits, ton de communication souhaité.

---

## 9. Architecture technique — Orchestrateur

### Stack recommandé
- **Langage :** Python ou Node.js
- **Hébergement :** EU obligatoire (conformité RGPD) — Railway ou Scaleway EU
- **LLM :** Claude API (Anthropic) — modèle `claude-sonnet-4-x`
- **Base de données :** PostgreSQL (résumés cumulatifs Agent 3, tokens par store, logs)
- **Secrets :** Vault chiffré pour API keys (Shopify tokens, Shippingbo key, ReturnGo key, clés APIs transporteurs, Zendesk token, Anthropic key)

### Sécurité & conformité
- Validation signature HMAC sur chaque webhook Zendesk entrant — rejet de toute requête sans signature valide
- **Hébergement EU obligatoire** — données en transit et stockées dans l'UE
- **Données client : priorité absolue** — chiffrement en transit (HTTPS) et au repos
- Pseudonymisation à envisager dans les prompts (remplacer données PII par IDs avant envoi à l'API Claude)
- Audit log de toutes les actions des agents
- Plan RGPD complet à établir avant les tests pilotes (voir section 12)

### Gestion des prompts
- Prompts stockés en configuration externe (fichier JSON ou DB) par store — **pas hardcodés**
- Modifiables sans redéploiement du code
- Versionnés : chaque changement de prompt est tracé avec horodatage

### Queue séquentielle
- Un ticket ne peut être traité que par un seul agent à la fois
- File d'attente par `ticket_id` dans l'orchestrateur
- Événements mis en attente si un agent tourne déjà sur ce ticket

### Temps de traitement estimés
| Étape | Durée estimée |
|---|---|
| Webhook reçu → Agent 1 déclenché | ~1-2 sec |
| Agent 1 (Shippingbo + Shopify + Claude) | ~5-8 sec |
| Agent 2 (Shippingbo + tracking transporteur + Claude + envoi) | ~5-8 sec |
| Agent 3 (DB + Claude + note) | ~4-6 sec |
| **Total ticket L2 (form → réponse client)** | **~10-16 sec** |
| **Total ticket L1 (form → ticket classifié)** | **~5-8 sec** |
| **Total ticket L3 (form → note interne)** | **~8-12 sec** |

> Ces estimations supposent des APIs Shippingbo/Shopify/transporteurs réactives (< 1-2 sec). Le goulot d'étranglement principal sera l'API Claude (~2-4 sec/appel).

### Logs & audit
- Chaque action tracée : `ticket_id`, `agent`, `action`, `horodatage`, `décision`
- Consultable pour debug et calibrage des prompts

---

## 10. Dashboard — Stats multi-store

**Type :** Application web custom — développement manuel, pas de solution no-code.

**Stack :** Next.js + TypeScript + PostgreSQL + Recharts

**Auth :** Interne équipe uniquement

**Source de données :** Zendesk API + base de données de l'orchestrateur (enrichie)

**Métriques par store :**
- Volume de tickets (jour / semaine / mois)
- Répartition L1 / L2 / L3
- Taux de résolution automatique (Agent 2)
- Taux d'escalade L2→L3
- Tickets aboutis vs. non aboutis
- Temps moyen de traitement
- CSAT (si activé dans Zendesk)

**Déploiement :** Track parallèle au SAV Bot — peut démarrer dès que l'Agent 1 est en prod et que les tags Zendesk existent.

---

## 11. Déploiement

### Stratégie pilote
- **2 stores pilotes**, ~30 tickets/jour
- Lancement direct en production (pas de shadow mode dans un premier temps)
- **Kill switch obligatoire :** toggle dans l'orchestrateur qui désactive tous les bots en < 30 secondes
- **Monitoring manuel les 2 premières semaines :** 15 min/matin, un membre de l'équipe relit les réponses Agent 2 dans Zendesk

### Ordre de développement recommandé
1. Agent 1 (classificateur) — colonne vertébrale
2. Agent 2 (L2 auto-réponse) — ROI le plus direct
3. Flow A (annulation/modification) — plus complexe, dépend des tests Shippingbo + ReturnGo
4. Agent 3 (L3 facilitateur)
5. Dashboard (track parallèle dès Phase 2)
6. Extension aux stores restants

### Extension multi-store — Onboarding (VITAL)
Un processus d'onboarding simple et reproductible est indispensable. Chaque nouveau store nécessite :
- Installation de la Shopify App (OAuth) — doit être < 10 min
- Configuration du webhook Zendesk — procédure documentée
- Rédaction de la base de connaissance store — template à fournir
- Tests de classification sur tickets réels — checklist de validation
- Activation dans l'orchestrateur — toggle par store

> **Exigence :** L'onboarding d'un nouveau store doit pouvoir être fait par un non-développeur une fois le système en place.

---

## 12. Sécurité & RGPD

**Statut :** À traiter de façon approfondie **avant le lancement des tests pilotes**.

**Points identifiés :**
- Données client (nom, email, adresse, n° commande) transitent dans les prompts envoyés à l'API Anthropic
- Anthropic API : politique de non-rétention des données (à vérifier et documenter officiellement)
- Hébergement EU obligatoire pour les données en transit et stockées
- Mention à ajouter dans les CGU des stores
- Pseudonymisation des données sensibles dans les prompts à envisager (remplacer nom par ID client)
- Audit log de toutes les actions des agents
- Chiffrement des données en base (PostgreSQL)

---

## 13. Décisions prises (log)

| Décision | Choix retenu |
|---|---|
| Canaux d'entrée | Formulaire uniquement, zéro email |
| Shadow mode au lancement | Non — lancement direct avec monitoring manuel |
| Détection "tourner en rond" | 3 signaux : déclaration Agent 2 + 3 échanges + frustration détectée |
| Définition "ticket humain" | Première réponse publique d'un agent humain → tag `agent_actif` |
| Tracking transporteurs | 3 intégrations : La Poste API (Colissimo + Chronopost + Lettre suivie + Delivengo), GLS API, Mondial Relay API. Pas d'agrégateur. |
| Shopify multi-store | Une seule Custom App Partner, OAuth par store |
| Langue réponse Agent 2 | Langue du message client (toujours) |
| Langue résumé Agent 3 | Toujours français pour les agents |
| Draft Agent 3 | Langue du client + résumé FR pour validation agent |
| Agent 3 skip résumé | Si réponse courte à question directe → skip Bloc 1 |
| Coût tokens Agent 3 | Résumé cumulatif stocké en DB — pas d'historique brut |
| Commande introuvable | Tag + queue humaine — pas de classification sur texte seul |
| Race condition | Queue séquentielle par ticket dans l'orchestrateur |
| Prompts | Config externe par store, non hardcodés, versionnés |
| L3 → jamais L2 | Un ticket L3 reste L3. Dès qu'un humain répond, il reste humain |
| Escalade Agent 2 | Signal explicite `escalade_nécessaire` dans son output (~20 tokens) |
| ReturnGo | Conservé pour self-service < 24h uniquement. Client fait la manip lui-même sur le portail |
| Annulations < 24h | Self-service client via portail ReturnGo (bot redirige, n'appelle pas l'API) |
| Annulations > 24h | Shippingbo bloque la cmd + agent humain annule dans le back-office |
| Annulation cmd expédiée | Impossible — réponse automatique au client |
| ERP | **RETIRÉ** — trop custom, non sécurisé pour ouverture externe. Remplacé par Shippingbo + APIs transporteurs + ReturnGo |

---

## 14. Points ouverts (à traiter)

### Avant Phase 0 (bloquants)
- [x] ~~ERP~~ — connexion abandonnée ✅
- [x] **Flow A > 24h : blocage Shippingbo** — automatisé via API au moment de la soumission du formulaire ✅
- [ ] Documentation API Shippingbo complète — statuts disponibles, endpoints blocage/libération/statut commande
- [ ] Accès API ReturnGo — endpoints statuts de retour et historique
- [ ] Champs Zendesk à créer — liste précise avec l'équipe (`type_traitement`, `store_id`, `statut_commande`, etc.)

### Avant tests pilotes
- [ ] Plan sécurité & RGPD complet
- [ ] Base de connaissance des 2 stores pilotes rédigée
- [ ] Politique de rétention Anthropic API vérifiée et documentée officiellement

### À définir pendant le dev
- [ ] Format exact de la base de connaissance (JSON, Markdown, autre)
- [ ] Mécanisme de sync centre d'aide → base de connaissance agents
- [ ] Seuils exacts de calibrage Agent 1 (nb d'échanges, score de frustration)
- [ ] Comportement Agent 1 si Shippingbo et Shopify renvoient des statuts contradictoires
- [ ] Template onboarding nouveau store (checklist, doc, procédure)

### À traiter en Phase 4 (optimisation)
- [ ] Shadow mode rétroactif pour analyser les décisions passées
- [ ] Gestion des "faux L3" (tickets escaladés à tort)
- [ ] Cas particuliers : litige en cours, ticket rouvert, multi-commandes, historique cross-stores

---

## 15. Lexique

| Terme | Définition |
|---|---|
| L1 | Ticket nécessitant une intervention humaine directe (pas de réponse automatique) |
| L2 | Ticket gérable automatiquement par Agent 2 (ex. suivi colis, questions simples) |
| L3 | Ticket complexe ou litigieux — Agent 3 prépare, humain décide et envoie |
| `agent_actif` | Tag Zendesk posé dès qu'un humain envoie une réponse publique sur un ticket |
| `commande_introuvable` | Tag posé quand Agent 1 ne trouve pas la commande dans Shippingbo/Shopify |
| Flow A | Process annulation/modification — géré au niveau du formulaire avec Shippingbo (statut) + ReturnGo (< 24h) |
| Flow B | Process autres problèmes — passe par les 3 agents |
| Orchestrateur | Serveur central qui reçoit les webhooks Zendesk et coordonne les appels agents |
| Résumé cumulatif | Résumé stocké en DB par Agent 3, mis à jour à chaque échange — évite de retraiter l'historique brut |
| Kill switch | Toggle dans l'orchestrateur désactivant tous les bots en < 30 secondes |
| Onboarding store | Process d'activation d'un nouveau store sur le système — doit être reproductible sans développeur |
