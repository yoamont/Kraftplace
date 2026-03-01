# Analyse & stratégie de nettoyage - Passage 100 % Génération de Leads (Kraftplace)

**Contexte :** Abandon du modèle "Place de Marché" (encaissement des ventes, commissions, paniers, commandes, virements). Conservation du modèle **Génération de Leads** (vente de crédits de candidature + messagerie).

---

## 1. Analyse de l'existant - Code lié au flux financier "marketplace"

### 1.1 Routes API

| Fichier | Rôle | Verdict |
|---------|------|---------|
| `app/api/checkout/route.ts` | Création session Stripe Checkout pour **packs de crédits** (marque achète 3 ou 10 crédits) | **GARDER** - cœur du modèle leads |
| `app/api/webhooks/stripe/route.ts` | Webhook Stripe : sur `checkout.session.completed`, crédite `brands.credits` | **GARDER** - idem |
| `app/api/payments/create-platform-fee/route.ts` | Création PaymentIntent Stripe pour **commission plateforme 2 %** (demandes de paiement marque ↔ boutique : ventes, loyers) | **SUPPRIMER** - flux marketplace |
| `app/api/messaging/counterparts/route.ts` | Contreparties pour la messagerie (brands/showrooms) | **GARDER** - utilisé par la messagerie |

### 1.2 Pages Admin & fonctionnalités

| Fichier / zone | Rôle | Verdict |
|----------------|------|---------|
| `app/admin/payments/page.tsx` | Liste des demandes de paiement (type `sales` / `rent`), création demande (ventes par showroom, loyer par marque), acceptation/contestation, pièces jointes, frais plateforme 2 % | **SUPPRIMER** (ou remplacer par une page vide "Paiements désactivés" temporaire) |
| `app/admin/messaging/ChatView.tsx` | Modal "Demander un paiement", insertion `payment_requests`, envoi message `PAYMENT_REQUEST`, acceptation/refus/négociation demande de paiement | **SIMPLIFIER** - retirer tout le bloc "Demander un paiement" (bouton, modals, handlers `handleSubmitPaymentFromChat`, `handleAcceptPayment`, `handleDeclinePayment`, `handleSubmitNegotiatePayment`, etc.) |
| `app/admin/messaging/MessageEntry.tsx` | Affichage des messages de type `PAYMENT_REQUEST`, `DEAL_SENT`, `DEAL_ACCEPTED`, `CONTRAT`, etc. ; boutons Accepter/Refuser/Négocier pour paiements | **SIMPLIFIER** - retirer tout le rendu et les callbacks liés à `PAYMENT_REQUEST` (pas d’historique à conserver, produit en test) |
| `app/admin/products/page.tsx` + `add` + `[id]/edit` | Catalogue produits (marque) : liste, ajout, édition (prix, description, etc.) | **GARDER** - le catalogue avec prix est important pour que les boutiques se fassent une idée des produits ; pas de suppression ni de simplification |
| `app/admin/placements/*` | Placements = produits mis en dépôt chez les showrooms (lié ventes, stock) | **SUPPRIMER** (pages placements, conv, [id]) - modèle marketplace |
| `app/admin/curation/page.tsx` | Curation côté showroom : candidatures, partenariats ; peut référencer placements/paiements | **SIMPLIFIER** - garder uniquement la logique candidatures (acceptation/refus), retirer tout ce qui touche aux placements et paiements |
| `app/admin/browse-brands/page.tsx` | Parcourir les marques (côté boutique) ; peut lister produits | **SIMPLIFIER** - garder parcours marques ; retirer dépendances "produits en vente" si présentes |
| `app/admin/showroom-config/page.tsx` | "Commission sur ventes (%)" dans les options de rémunération | **SIMPLIFIER** - les options (loyer, commission) restent utiles pour la **candidature** (négociation) ; on peut garder la config pour affichage "option de partenariat", mais plus de lien avec encaissement réel |
| `app/page.tsx` (landing) | Texte "Vendez vos produits et recevez votre argent en toute sécurité via Stripe Connect dès que la boutique valide la vente" + "Jour de paie !" | **SIMPLIFIER** - remplacer par un message aligné sur le modèle leads (ex. "Candidater auprès des boutiques et ouvrir le dialogue") |

### 1.3 Données & schéma (Supabase)

| Élément | Rôle | Verdict |
|---------|------|---------|
| Table **`payment_requests`** | Demandes de paiement (sales/rent), montants, frais plateforme, statut, Stripe PaymentIntent | **SUPPRIMER** - pas d’historique à garder (produit en test) ; supprimer la table après arrêt des écritures |
| Table **`placements`** | Produit déposé chez un showroom (stock, statut) | **SUPPRIMER** - modèle marketplace |
| Table **`products`** | Catalogue marque (nom, prix, description, image, etc.) | **GARDER** - catalogue avec prix conservé pour que les boutiques se fassent une idée des produits |
| Bucket Storage **`payment-attachments`** | Pièces jointes des demandes de paiement | **SUPPRIMER** - pas d’historique à conserver |
| Colonnes **`placement_id`**, **`candidature_id`**, **`counterpart_*`** dans `payment_requests` | Lien demande de paiement ↔ placement ou candidature | Plus d’usage ; table supprimée |
| Messages de type **`PAYMENT_REQUEST`**, **`DEAL_SENT`**, **`DEAL_ACCEPTED`**, **`CONTRAT`** (liés ventes/contrats marchands) | Événements dans le fil de messagerie | **SUPPRIMER** le rendu dans l’UI ; optionnel : migration pour purger ces types de messages en BDD (pas d’historique requis en test) |

### 1.4 Fichiers SQL (migrations / schéma)

- **À ne plus utiliser pour de nouvelles features (marketplace) :**  
  `supabase-payments.sql`, `supabase-payments-request-both-sides.sql`, `supabase-payments-add-motif.sql`, `supabase-payments-rls-fix-messaging.sql`, `supabase-payments-insert-brand-counterpart.sql`, `supabase-payments-counterpart-direct.sql`, `supabase-storage-payment-attachments.sql`
- **À garder (leads + messagerie) :**  
  `supabase-brands-credits.sql`, `supabase-brands-reserved-credits.sql`, `supabase-candidatures*.sql`, `supabase-messaging-*.sql`, `supabase-conversations-*.sql`, `supabase-view-messages-security-invoker.sql`, etc.
- **Placements (marketplace) :**  
  `supabase-placements-*.sql` - à supprimer (modèle marketplace).  
- **Produits :**  
  `supabase-products*.sql`, `supabase-commission-column.sql`, `supabase-stock-max-column.sql` - **garder** (catalogue marque conservé avec prix pour les boutiques).

### 1.5 Types & lib

- **`lib/supabase.ts`** : Types `PaymentRequest`, `PaymentRequestType`, `Placement` | **SUPPRIMER** les types liés aux paiements et placements ; **garder** le type `Product` (catalogue marque). Garder `Candidature`, `Conversation`, `UnifiedMessage`, etc.
- **`lib/hooks/useConversations.ts`** : Libellé pour `PAYMENT_REQUEST` dans `lastMessageLabel` | **SUPPRIMER** ou remplacer par un libellé neutre (ex. "Message") ; pas d’historique paiements.

---

## 2. Propositions de cleaning (liste détaillée)

### 2.1 À supprimer

| Élément | Fichier(s) / zone |
|---------|-------------------|
| Route API commission plateforme | `app/api/payments/create-platform-fee/route.ts` (supprimer le fichier et le dossier `app/api/payments/` si vide) |
| Page "Mes paiements" | `app/admin/payments/page.tsx` |
| Pages placements | `app/admin/placements/page.tsx`, `app/admin/placements/[id]/page.tsx`, `app/admin/placements/conv/[showroomId]/page.tsx` |
| Lien nav "Mes paiements" | `app/admin/layout.tsx` (retirer l’entrée `{ href: '/admin/payments', ... }` pour brand et showroom) |
| Référence Stripe Connect / "Jour de paie" | `app/page.tsx` (remplacer le bloc par un message leads) |

### 2.2 À simplifier

| Élément | Action |
|---------|--------|
| **ChatView** | Retirer le bouton "Demander un paiement", les modals (demande, refus, négociation), et tous les handlers associés (`handleSubmitPaymentFromChat`, `handleAcceptPayment`, `handleDeclinePayment`, etc.). Garder uniquement candidature + chat. |
| **MessageEntry** | Retirer tout le rendu et les callbacks liés à `PAYMENT_REQUEST` (pas d’historique à conserver). |
| **Table `applications` / `candidatures`** | Si une table "applications" existe avec des champs type "prix du produit" ou "montant commande", les retirer ou les ignorer ; le modèle leads n’a pas de vente de produit. |
| **Dashboard / nav** | Voir section 3 (UX). |
| **Types `lib/supabase.ts`** | Supprimer les types `PaymentRequest`, `PaymentRequestType`, `Placement`, `PlacementStatus` ; garder `Product`, `Candidature`, `Conversation`, `UnifiedMessage`, etc. |
| **Curation** | Retirer toute logique qui charge ou affiche des placements / payment_requests ; garder uniquement candidatures. |
| **Produits** | **Garder** le catalogue tel quel (avec prix) - important pour que les boutiques se fassent une idée des produits. |

### 2.3 À fusionner / réorganiser

| Élément | Action |
|---------|--------|
| **Dashboards** | Unifier autour de : **Dashboard** (accueil), **Mon Catalogue** (gardé), **Mes partenariats** (voir § 3.1 ci-dessous), **Crédits**, **Messagerie**. Supprimer "Mes paiements" et les pages placements. |

---

## 3. Validation UX - Barre de navigation "essentiel"

### 3.1 Vision "Mes partenariats"

L’onglet **Mes partenariats** doit être repensé pour mettre en avant :

- **Les mises en relation acceptées** - liste claire des partenariats actifs (candidatures acceptées), avec accès rapide à la conversation ou à la fiche.
- **Un calendrier** avec les prochaines échéances :
  - dates d’ouverture / clôture des candidatures (showrooms),
  - dates d’expo ou d’événements liés aux partenariats,
  - éventuellement rappels (candidature à traiter, etc.).
- **Un résumé des demandes en cours** - candidatures en attente (côté marque : envoyées ; côté boutique : à accepter/refuser), nombre de conversations avec statut "en attente", etc.

À prévoir : refonte ou enrichissement de la page actuelle (ex. `placements` côté marque / `curation` côté showroom) pour en faire cette vue unifiée "Mes partenariats" avec blocs : partenariats acceptés, calendrier, demandes en cours.

### 3.2 Nav proposée

**Côté Marque**

- **Dashboard** (accueil)
- **Ma marque** (paramètres / profil)
- **Mon Catalogue** (liste, prix, description - conservé pour que les boutiques se fassent une idée des produits)
- **Vendre mes produits** - à renommer par ex. **"Trouver des boutiques"** ou **"Candidater"** (liste des showrooms + candidater)
- **Crédits** (achat de packs)
- **Mes partenariats** (voir § 3.1 : acceptés + calendrier échéances + résumé demandes en cours)
- **Messagerie**
- **Notifications**
- Supprimer : **Mes paiements**.

**Côté Boutique**

- **Dashboard**
- **Ma boutique** (paramètres / profil)
- **Mes partenariats** (voir § 3.1 : acceptés + calendrier + demandes en cours à traiter)
- **Parcourir les marques** (découvrir les marques et leurs produits/prix)
- **Messagerie**
- **Notifications**
- Supprimer : **Mes paiements**.

Résumé : **Dashboard · Ma marque / Ma boutique · Mon Catalogue (marque) · Candidater / Parcourir les marques · Crédits (marque) · Mes partenariats · Messagerie · Notifications**.

---

## 4. Variables d’environnement (.env)

- **À garder** (modèle leads + auth) :  
  `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRODUCT_PACK_3`, `STRIPE_PRODUCT_PACK_10`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, et si utilisé : `SUPABASE_SERVICE_ROLE_KEY`.
- **À supprimer ou ne plus documenter** :  
  Aucune variable dédiée à Stripe Connect, à des payouts ou à un "marketplace" n’a été trouvée dans `.env.local`. Le fichier actuel est déjà orienté crédits + Supabase. Si d’autres clés (ex. Connect, payouts) existent ailleurs, les retirer.

---

## 5. Stratégie de nettoyage étape par étape (sans casser la messagerie)

La messagerie repose sur : **`conversations`**, **`messages`** (types CHAT, CANDIDATURE_*, etc.), **`useChat`**, **`ConversationList`**, **`ChatView`**, **`MessageEntry`**. Il faut ne pas toucher à la structure des conversations ni aux types de messages utilisés pour le flux candidature + chat.

### Phase 1 - Couper l’UI "paiements" (sans toucher aux tables)

1. **Layout**  
   Retirer les liens "Mes paiements" dans la nav (marque et boutique).
2. **ChatView**  
   Supprimer le bouton "Demander un paiement", les modals de demande/acceptation/refus/négociation de paiement, et tous les handlers associés.
3. **MessageEntry**  
   Pour le type `PAYMENT_REQUEST`, retirer tout le rendu (ou afficher un libellé neutre type "Message" si on garde les lignes en BDD) ; pas d’historique à conserver (produit en test).
4. **Page payments**  
   Supprimer `app/admin/payments/page.tsx` ou la remplacer par une redirection vers le dashboard + message "Paiements désactivés".
5. **Landing**  
   Remplacer le bloc "Stripe Connect / Jour de paie" par un message aligné sur le modèle leads.

Résultat : plus aucune action possible sur les paiements ; la messagerie (conversations, envoi de messages, candidatures) continue de fonctionner.

### Phase 2 - Supprimer les routes et dépendances "marketplace"

6. Supprimer **`app/api/payments/create-platform-fee/route.ts`** (et le dossier `app/api/payments/` si vide).
7. Dans **`lib/supabase.ts`** : commenter ou supprimer les types `PaymentRequest`, `PaymentRequestType`, `Placement`, `Product` (ou les garder pour lecture seule si on conserve des pages en lecture seule). Adapter les imports dans les fichiers restants (curation, etc.) pour ne plus dépendre des paiements/placements.
8. **Curation / browse-brands** : retirer les appels ou affichages liés à `payment_requests` et `placements`.

### Phase 3 - Pages "placements" ; garder le catalogue produits

9. Supprimer les pages **placements** (`app/admin/placements/*`).
10. **Conserver** le catalogue produits (`app/admin/products`, add, edit) avec les prix - important pour les boutiques. Pas de modification nécessaire sur ce flux.
11. Planifier la **refonte "Mes partenariats"** (voir § 3.1) : partenariats acceptés + calendrier échéances + résumé demandes en cours.

### Phase 4 - Nettoyage BDD et storage (pas d’historique paiements)

12. Arrêter d’écrire dans `payment_requests` (déjà fait en phase 1–2).
13. Migration pour **supprimer** les tables `payment_requests` et `placements` (pas d’historique à garder, produit en test). **Ne pas supprimer** la table `products`.
14. Bucket `payment-attachments` : supprimer ou vider (pas d’historique requis).
15. Optionnel : migration pour purger ou ignorer les messages de type `PAYMENT_REQUEST`, `DEAL_*`, `CONTRAT` dans `messages` (ou les laisser en base et ne plus les afficher).

### Phase 5 - Nav et libellés

15. Appliquer la nav "essentiel" (§ 3.2) : Mon Catalogue, Mes partenariats, Crédits, Messagerie, sans "Mes paiements".
16. Renommer "Vendre mes produits" en "Trouver des boutiques" ou "Candidater" si souhaité.
17. À prévoir en amont ou en parallèle : **refonte de la page "Mes partenariats"** (§ 3.1) - partenariats acceptés, calendrier échéances, résumé demandes en cours.

---

## 6. Risques et points d’attention

- **Messages existants** : Pas d’historique paiements à conserver (produit en test). On peut purger les types `PAYMENT_REQUEST`, `DEAL_*`, `CONTRAT` en BDD ou simplement ne plus les afficher dans l’UI.
- **RLS et politiques** : À la suppression des tables `payment_requests` et `placements`, les politiques associées disparaissent ; prévoir une migration propre (drop table après backup si besoin).
- **Références restantes** : Après nettoyage, faire une recherche globale sur "payment_request", "placement", "create-platform-fee", "PAYMENT_REQUEST" pour repérer d’éventuelles références résiduelles (hooks, types, docs).
- **Catalogue produits** : Bien garder la table `products` et les champs prix/description - utilisés par les boutiques pour se faire une idée des produits.

---

## 7. Résumé des fichiers à modifier (checklist)

| Action | Fichier(s) |
|--------|------------|
| Supprimer | `app/api/payments/create-platform-fee/route.ts`, `app/admin/payments/page.tsx`, `app/admin/placements/page.tsx`, `app/admin/placements/[id]/page.tsx`, `app/admin/placements/conv/[showroomId]/page.tsx` |
| Modifier | `app/admin/layout.tsx` (nav), `app/admin/messaging/ChatView.tsx` (retirer paiements), `app/admin/messaging/MessageEntry.tsx` (retirer rendu PAYMENT_REQUEST), `app/page.tsx` (landing), `lib/supabase.ts` (types paiements/placements), `app/admin/curation/page.tsx` (retirer placements/paiements) |
| Garder tel quel | `app/admin/products/*` (catalogue avec prix pour les boutiques) |
| À refondre | Page "Mes partenariats" : partenariats acceptés + calendrier échéances + résumé demandes en cours (voir § 3.1) |

Ce document peut servir de référence pour exécuter le nettoyage par étapes sans impacter la messagerie ni le flux de candidatures et de crédits.
