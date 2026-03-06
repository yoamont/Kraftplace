# Variables d'environnement

À définir dans `.env.local` à la racine du projet (créer le fichier s'il n'existe pas).

## Obligatoires pour les crédits / candidatures / webhooks

| Variable | Où la trouver | Exemple |
|----------|----------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon public | `eyJ...` |
| **`SUPABASE_SERVICE_ROLE_KEY`** | Supabase → Settings → API → **service_role** (clé secrète) | `eyJ...` |

Sans `SUPABASE_SERVICE_ROLE_KEY`, l’ajout de crédits après paiement Stripe renverra « Configuration serveur manquante ».

**À vérifier dans `.env.local` :**
- Le nom est exactement `SUPABASE_SERVICE_ROLE_KEY` (pas d’espace, pas de typo).
- Une seule ligne : `SUPABASE_SERVICE_ROLE_KEY=eyJ...` (sans guillemets autour de la valeur, pas d’espace avant/après `=`).
- Redémarrer le serveur après modification : `npm run dev`.

## Optionnelles

- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` : paiement et webhook Stripe
- `ADMIN_USER_IDS` : liste d’UUID (séparés par des virgules) pour l’accès au dashboard Signalements
