# Mise en production – Étapes à suivre

Guide pas à pas pour : exécuter les scripts SQL Supabase, configurer les variables d’environnement, et préparer Stripe Connect.

---

## 1. Exécuter les scripts SQL dans Supabase

### 1.1 Où exécuter

1. Ouvre ton **projet Supabase** : [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Clique sur ton projet (ex. `showroom-app`).
3. Dans le menu de gauche, va dans **SQL Editor** (icône « Requêtes »).

### 1.2 Ordre d’exécution

Exécute les scripts **un par un**, dans cet ordre, en copiant le contenu de chaque fichier dans l’éditeur puis en cliquant sur **Run** (ou Ctrl+Entrée).

| Étape | Fichier à exécuter | Rôle |
|-------|--------------------|------|
| 1 | `supabase-reports-table.sql` | Crée la table `reports` pour les signalements |
| 2 | `supabase-brands-protect-credits-trigger.sql` | Protège les champs crédits contre les modifications client |
| 3 | `supabase-stripe-connect-showrooms.sql` | Ajoute les colonnes Stripe Connect sur `showrooms` |

**Comment faire pour chaque script :**

1. Ouvre le fichier dans ton projet (ex. `supabase-reports-table.sql`).
2. Sélectionne tout le contenu (Ctrl+A), copie (Ctrl+C).
3. Dans Supabase → SQL Editor, colle le contenu dans la zone de texte.
4. Clique sur **Run** (ou Ctrl+Entrée).
5. Vérifie le message en bas : « Success » ou nombre de lignes affectées.
6. Passe au script suivant.

Si un script indique « already exists » ou « policy already exists », c’est normal si tu l’as déjà exécuté une fois.

---

## 2. Définir `ADMIN_USER_IDS` (accès page Signalements)

Seuls les utilisateurs listés dans `ADMIN_USER_IDS` peuvent voir la page **Signalements** (`/admin/reports`).

### 2.1 Récupérer ton (ou tes) UUID admin

1. Dans Supabase, va dans **Authentication** → **Users**.
2. Ouvre l’utilisateur qui doit être admin (ou crée-le puis connecte-toi une fois).
3. Copie son **UUID** (ex. `a1b2c3d4-e5f6-7890-abcd-ef1234567890`).

Pour plusieurs admins, tu auras plusieurs UUID.

### 2.2 Configurer la variable d’environnement

1. À la racine du projet, ouvre (ou crée) le fichier **`.env.local`**.
2. Ajoute une ligne (un seul admin) :

   ```env
   ADMIN_USER_IDS=a1b2c3d4-e5f6-7890-abcd-ef1234567890
   ```

   Pour **plusieurs admins**, sépare les UUID par des virgules (sans espace de préférence) :

   ```env
   ADMIN_USER_IDS=uuid-admin-1,uuid-admin-2,uuid-admin-3
   ```

3. Enregistre le fichier.
4. Redémarre le serveur Next.js (`npm run dev` ou redémarrage de ton hébergeur).

Dès que ton utilisateur est dans cette liste, en te connectant tu verras **Signalements** dans le menu admin et tu pourras ouvrir `/admin/reports`.

---

## 3. (Optionnel) API SIRET externe

La validation SIRET fonctionne déjà avec le **format 14 chiffres + clé de contrôle**. Si tu veux en plus vérifier le SIRET auprès d’un registre (ex. API Sirene, Pappers), configure une URL (et éventuellement une clé).

### 3.1 Sans API externe

Rien à faire : la route `/api/validate-siret` et l’Edge Function `validate-siret` utilisent uniquement format + clé. Aucune variable à ajouter.

### 3.2 Avec API externe (ex. Pappers / Sirene)

1. Souscrins à une API qui vérifie les SIRET (ex. [Pappers](https://www.pappers.fr/api), [API Sirene](https://api.insee.fr/catalogue/)).
2. Récupère l’URL de base (ex. `https://api.pappers.fr/v2/siret`) et, si besoin, une clé API.
3. Dans **`.env.local`** (côté Next.js) :

   ```env
   SIRET_API_URL=https://ton-api.com/v2/siret
   SIRET_API_KEY=ta_cle_api_si_requise
   ```

4. Si tu utilises l’**Edge Function** Supabase au lieu de la route Next :
   - Supabase Dashboard → **Project Settings** → **Edge Functions** → **Secrets**.
   - Ajoute `SIRET_API_URL` et, si besoin, `SIRET_API_KEY`.

La route Next.js appelle `SIRET_API_URL` avec le SIRET en suffixe (ex. `GET ${SIRET_API_URL}/12345678901234`). Si ton API attend un autre format (body, query), il faudra adapter le code dans `app/api/validate-siret/route.ts`.

---

## 4. Stripe Connect : onboarding et webhook

Le schéma (table `showrooms` avec `stripe_connect_account_id` et `stripe_connect_charges_enabled`) est déjà prévu. Il reste à brancher Stripe Connect côté backend.

### 4.1 Activer Stripe Connect

1. Va sur [Dashboard Stripe](https://dashboard.stripe.com) → **Connect** → **Paramètres**.
2. Active **Connect** si ce n’est pas déjà fait.
3. Choisis le type de compte (Express ou Standard selon ton besoin ; souvent **Express** pour les boutiques).
4. Note ton **Client ID** (ou l’URL de configuration Connect) pour l’onboarding.

### 4.2 Créer le lien d’onboarding (backend)

L’idée : depuis ta config boutique, un bouton « Compléter ma vérification » envoie l’utilisateur sur Stripe pour créer/lier un compte Connect.

1. **Créer une route API** (ex. `app/api/stripe-connect/onboard/route.ts`) qui :
   - Vérifie que l’utilisateur est connecté et qu’il est bien le propriétaire du showroom.
   - Utilise `STRIPE_SECRET_KEY` et l’API Stripe pour créer un **Account Link** :
     - [Stripe – Create Account Link](https://stripe.com/docs/api/account_links/create)
   - Enregistre l’`account.id` (Connect) dans `showrooms.stripe_connect_account_id` pour ce showroom.
   - Retourne l’URL `url` du Account Link au client pour redirection (window.location = url).

2. **Côté front** (page config boutique) :
   - Afficher un bouton « Compléter ma vérification KYC » si `stripe_connect_charges_enabled` est faux (ou `stripe_connect_account_id` est null).
   - Au clic : appeler `GET` ou `POST` sur ta route d’onboarding, récupérer l’URL et rediriger : `window.location.href = data.url`.

3. **Page de retour** : Lors de la création du Account Link, tu renseignes `return_url` et `refresh_url` (ex. `https://tondomaine.com/admin/showroom-config?stripe=return`). Sur cette page, tu peux recharger le showroom pour mettre à jour l’affichage (et plus tard, le statut KYC).

### 4.3 Webhook Stripe : mettre à jour `stripe_connect_charges_enabled`

Pour savoir quand une boutique peut recevoir des paiements, Stripe envoie l’événement **`account.updated`** (et éventuellement **`account.application.deauthorized`**).

1. Dans le Dashboard Stripe : **Developers** → **Webhooks** → **Add endpoint**.
2. URL : `https://tondomaine.com/api/webhooks/stripe-connect` (à créer).
3. Événements à écouter : **`account.updated`** (au minimum).
4. Récupère le **Signing secret** du webhook (whsec_...).

5. **Créer la route** `app/api/webhooks/stripe-connect/route.ts` qui :
   - Reçoit le body brut (pour vérifier la signature).
   - Vérifie la signature avec le signing secret (comme pour ton webhook Stripe principal).
   - Si `event.type === 'account.updated'` :
     - Récupère `account.id` et `account.charges_enabled`.
     - Met à jour en base : `showrooms.stripe_connect_account_id = account.id` et `showrooms.stripe_connect_charges_enabled = account.charges_enabled` (pour la ligne dont `stripe_connect_account_id` vaut `account.id`).
   - Répond `200` pour accuser réception.

6. Dans **`.env.local`** (ou sur ton hébergeur) :

   ```env
   STRIPE_CONNECT_WEBHOOK_SECRET=whsec_xxx
   ```

Tu peux réutiliser la même logique de signature que dans `app/api/webhooks/stripe/route.ts` (construction de l’événement avec `stripe.webhooks.constructEvent`).

### 4.4 Utiliser le statut KYC dans l’app

- **Côté boutique** : tant que `stripe_connect_charges_enabled` est faux, afficher un bandeau « Complétez votre vérification pour recevoir des candidatures » et le bouton d’onboarding.
- **Côté marque / découverte** : si tu veux que seules les boutiques KYC validées reçoivent des candidatures payantes ou apparaissent en premier, filtre ou trie sur `showrooms.stripe_connect_charges_enabled = true` dans tes requêtes (Discover, annonces, etc.).

---

## Récap des variables d’environnement

| Variable | Obligatoire | Où la définir | Rôle |
|----------|-------------|----------------|------|
| `ADMIN_USER_IDS` | Oui (pour Signalements) | `.env.local` / hébergeur | UUID des admins (séparés par des virgules) |
| `SIRET_API_URL` | Non | `.env.local` | URL de l’API SIRET externe |
| `SIRET_API_KEY` | Non | `.env.local` ou secrets Edge Functions | Clé API SIRET si requise |
| `STRIPE_CONNECT_WEBHOOK_SECRET` | Oui (si Connect) | `.env.local` / hébergeur | Secret du webhook Stripe Connect (whsec_...) |

Les autres variables (Supabase, Stripe principal, etc.) restent celles que tu utilises déjà pour l’app et le webhook Stripe existant.
