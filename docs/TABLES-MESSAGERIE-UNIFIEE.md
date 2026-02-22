# Tables : messagerie unifiée vs reste de l’app

## Pour la messagerie unifiée uniquement

- **`conversations`** – Lien unique (brand_id, showroom_id). Obligatoire.
- **`messages`** – Journal d’activité (CHAT, DEAL_*, CONTRAT, etc.) avec `conversation_id`, `type`, `metadata`, `sender_role`. Obligatoire.

Aucune autre table n’est nécessaire pour le fil de discussion (sidebar + chat).

---

## Tables encore utilisées par le reste de l’app (hors messagerie)

Ces tables ne servent **pas** au fil de messages unifié, mais sont encore utilisées par d’autres écrans :

| Table | Rôle | Utilisée par |
|-------|------|---------------|
| **candidatures** | Demandes marque→boutique (statut, option commission, négociation) | Discover, Placements, Curation, CandidatureDetailModal (détail + accepter/refuser) |
| **placements** | Produits exposés en boutique | Placements, Curation, Payments |
| **payment_requests** | Demandes de paiement (vente/location) | Payments |

Tu peux les garder tant que ces écrans existent. Si tu veux tout faire passer par `messages` (type + metadata), il faudra une refonte plus large (remplacer candidatures/placements/payment_requests par des événements dans `messages` et adapter tous les écrans).

---

## Tables à ne plus utiliser pour la messagerie

- **candidature_messages** – Déjà supprimée (tout est dans `messages`).
- **placement_messages** – Déjà supprimée (tout est dans `messages`).
- Plus de filtre par `candidature_id` ou `placement_id` dans `messages` : tout se fait par **`conversation_id`** et **`sender_role`** (brand/boutique).

---

## Identification Marque / Boutique

- **`messages.sender_role`** : `'brand'` ou `'boutique'` (ou NULL pour les messages système).
- À l’envoi d’un CHAT, on enregistre `sender_role` selon le contexte (marque ou boutique connectée).
- À l’affichage, on utilise `sender_role` pour le badge « Marque » / « Boutique » et le bon nom (marque ou boutique).

Si la table `messages` existe déjà sans `sender_role`, exécuter :  
`supabase-messages-add-sender-role.sql`
