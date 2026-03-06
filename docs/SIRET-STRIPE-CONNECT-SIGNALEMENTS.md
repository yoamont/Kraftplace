# SIRET, Stripe Connect, Signalements

## 1. Validation SIRET

- **Profil** : Le champ SIRET est obligatoire (14 chiffres) dans l’édition Marque et Boutique. La sauvegarde peut être refusée si le format est invalide.
- **Publication d’annonce** : Avant de passer une annonce en "En ligne", l’app appelle `POST /api/validate-siret` avec le SIRET de la boutique. La route vérifie le format et la clé de contrôle (algorithme SIRET français). Si la variable d’environnement `SIRET_API_URL` est définie, un appel à une API externe (ex. API Sirene / Pappers) est effectué pour confirmer l’existence du SIRET.
- **Edge Function** : Le dossier `supabase/functions/validate-siret` contient une Edge Function Supabase qui fait la même logique. Pour l’utiliser :
  - Définir les secrets : `SIRET_API_URL`, optionnellement `SIRET_API_KEY`.
  - Déployer : `supabase functions deploy validate-siret`.
  - Depuis le client ou une route Next.js, appeler `POST https://<project>.supabase.co/functions/v1/validate-siret` avec `{ "siret": "..." }`.

## 2. Stripe Connect & KYC

- **Objectif** : Les boutiques doivent avoir complété le KYC (Stripe Connect) avant de pouvoir recevoir des candidatures payantes (ou avant d’apparaître comme "éligibles" selon la règle métier choisie).
- **Schéma** : Exécuter `supabase-stripe-connect-showrooms.sql` pour ajouter sur `showrooms` :
  - `stripe_connect_account_id` (texte, nullable)
  - `stripe_connect_charges_enabled` (booléen, défaut false)
- **Flux à mettre en place** :
  1. **Onboarding** : Depuis la config boutique, un bouton "Compléter ma vérification" redirige vers Stripe Connect Onboarding (création du compte Connect ou lien vers le compte existant). Au retour, enregistrer `stripe_connect_account_id` (et éventuellement `charges_enabled` si fourni par Stripe).
  2. **Webhook** : Écouter `account.updated` pour mettre à jour `stripe_connect_charges_enabled` quand Stripe indique que les paiements sont autorisés.
  3. **Règles métier** : Avant d’accepter une candidature ou d’afficher la boutique comme recevant des candidatures payantes, vérifier `stripe_connect_charges_enabled === true`. Sinon, afficher un message invitant la boutique à compléter le KYC.

## 3. Signalements

- **Table** : Exécuter `supabase-reports-table.sql` pour créer la table `reports` (reporter_id, reported_entity_type, reported_entity_id, reason, message, status).
- **Bouton** : "Signaler ce profil" est présent sur les cartes Boutique (Discover, etc.) et Marque (Parcourir les marques). Il est masqué sur sa propre fiche (aperçu config).
- **API** : `POST /api/reports` avec `{ entityType, entityId, reason?, message? }` et le token utilisateur.
- **Dashboard admin** : Page `/admin/reports` listant les signalements. L’accès est restreint aux utilisateurs dont l’ID figure dans la variable d’environnement `ADMIN_USER_IDS` (liste d’UUID séparés par des virgules). Sans cette variable, la page affiche "Accès réservé aux administrateurs".

## 4. Protection des données dans le chat

- Les **emails** et **numéros de téléphone** contenus dans le contenu des messages sont masqués (`•••@•••.•••` et `••••••••••`) tant que la candidature n’est pas au statut **Accepted** (présence d’un message de type `CANDIDATURE_ACCEPTED` ou `DEAL_ACCEPTED` dans la conversation). Une fois la candidature acceptée, le contenu s’affiche en clair.
