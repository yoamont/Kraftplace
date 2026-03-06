# Audit de sécurité – Kraftplace

## 1. RLS (Supabase)

- **Script d’audit** : `supabase-security-audit-rls.sql`  
  À exécuter dans Supabase → SQL Editor pour lister les tables et politiques RLS. Vérifier qu’aucune table sensible n’a de politique « accès à tous » pour INSERT/UPDATE/DELETE.

- **Messages** : La politique `messages_select_own` restreint la lecture aux conversations dont l’utilisateur est propriétaire (marque ou boutique). Aucun `SELECT USING (true)` sur les mutations.

- **Protection des crédits** : Exécuter `supabase-brands-protect-credits-trigger.sql` pour bloquer toute modification de `credits` et `reserved_credits` depuis le client (rôle `authenticated`). Les mises à jour légitimes passent par les API Next.js avec `SUPABASE_SERVICE_ROLE_KEY`.

## 2. Variables d’environnement

- Aucune clé API (Stripe, Supabase, Google) ne doit être en dur dans le code. Tout passe par `process.env`.
- **À configurer** (ex. `.env.local`, jamais commité) :
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (obligatoire pour les API candidatures accept/reject/cancel et le webhook Stripe)
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - Optionnel : `STRIPE_PRODUCT_PACK_3`, `STRIPE_PRODUCT_PACK_10`
- `.env*` est dans `.gitignore` ; ne pas committer de fichier contenant des secrets.

## 3. Formulaires et crédits

- **Crédits** : Toute modification de `brands.credits` / `brands.reserved_credits` est effectuée côté serveur via :
  - `POST /api/candidatures/accept` (showroom)
  - `POST /api/candidatures/reject` (showroom)
  - `POST /api/candidatures/cancel` (marque)
  - `POST /api/candidatures/send` (incrément `reserved_credits` avec service role)
  - Webhook Stripe (incrément `credits` avec service role)
- **Annonces (listings)** : Validation serveur dans `POST /api/listings` et `PATCH /api/listings/[id]` (titres, dates, propriété du showroom). Les clients peuvent utiliser ces routes pour toute création/édition.

## 4. Headers de sécurité

- Configurés dans `next.config.ts` :
  - **Content-Security-Policy** : scripts/styles limités à `self` + inline nécessaires ; connexions vers Supabase et Stripe autorisées.
  - **X-Frame-Options** : SAMEORIGIN  
  - **X-Content-Type-Options** : nosniff  
  - **Referrer-Policy** : strict-origin-when-cross-origin  

## 5. Checklist pré-déploiement

- [ ] Exécuter `supabase-security-audit-rls.sql` et corriger toute politique trop permissive.
- [ ] Exécuter `supabase-brands-protect-credits-trigger.sql` sur la base de production.
- [ ] Vérifier que `SUPABASE_SERVICE_ROLE_KEY` est définie en production (API candidatures + webhook Stripe).
- [ ] Supprimer tout `console.log` exposant des infos sensibles (déjà retiré sur login et webhook Stripe).
- [ ] Tester accept/reject/cancel candidatures et achat de crédits après déploiement.
