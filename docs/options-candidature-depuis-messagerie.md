# Options : revoir l’expérience candidature depuis la messagerie

## Problème

Une marque peut envoyer une candidature en passant par **Messagerie** → « Envoyer une candidature », sans :
- Vérification des crédits (disponibles ≥ 1)
- Confirmation « Cette action réservera 1 crédit »
- Et aujourd’hui, la réservation du crédit (`reserved_credits`) n’était pas incrémentée depuis ce flux (bug).

---

## Option A – Aligner la messagerie sur « Parcourir les marques » (recommandé)

**Idée :** Même règles partout. Le bouton « Envoyer une candidature » dans la messagerie applique les mêmes garde-fous que sur la page Parcourir les marques.

**Comportement :**
1. Au clic sur « Envoyer une candidature » depuis la messagerie :
   - Si **crédits disponibles < 1** → ouvrir la **modal de recharge Stripe** (comme sur Parcourir les marques).
   - Sinon → afficher la **confirmation** : « Cette action réservera 1 crédit. Il vous en reste X. Continuer ? »
2. Si l’utilisateur confirme → ouvrir la modal de candidature (options, dates, message).
3. À l’envoi effectif → bien **réserver 1 crédit** (`reserved_credits + 1`) comme depuis Discover.

**Avantages :** Un seul parcours cohérent, pas de contournement, crédits toujours cohérents.  
**Inconvénients :** Un clic de plus (confirmation) avant d’ouvrir la modal.

---

## Option B – Candidatures uniquement depuis « Parcourir les marques »

**Idée :** La messagerie ne sert qu’à discuter. Toute candidature se fait depuis Parcourir les marques.

**Comportement :**
- **Masquer** le bouton « Envoyer une candidature » dans la messagerie.
- Les marques candidatent uniquement depuis **Parcourir les marques** (avec vérification des crédits et confirmation).
- La messagerie sert à échanger une fois la candidature envoyée (ou pour d’autres échanges si vous autorisez des conversations sans candidature).

**Avantages :** Un seul point d’entrée, plus simple à expliquer.  
**Inconvénients :** Pour candidater, il faut quitter la conversation et aller sur Parcourir les marques (éventuellement avec un lien « Candidater depuis la fiche boutique »).

---

## Option C – Candidature depuis la messagerie avec rappel de la règle

**Idée :** Garder le bouton dans la messagerie, mais **avant** d’ouvrir la modal :
- Vérifier les crédits ; si insuffisant → modal de recharge.
- Afficher une **phrase explicative** du type : « Envoyer une candidature réserve 1 crédit. Il vous en reste X. Continuer ? » puis ouvrir la modal uniquement après confirmation.

**Comportement :** Comme l’option A (même logique crédits + confirmation + réservation à l’envoi).

**Avantages :** Même cohérence que l’option A, avec un libellé qui rappelle la règle.  
**Inconvénients :** Aucun par rapport à A si le libellé est le même que sur Discover.

---

## Option D – Redirection vers Parcourir les marques

**Idée :** Depuis la messagerie, le bouton « Envoyer une candidature » ne ouvre plus la modal ; il **redirige** vers la page **Parcourir les marques** (avec la boutique pré-sélectionnée si techniquement possible).

**Comportement :** Un seul tunnel de candidature (Discover), la messagerie ne fait que rediriger.

**Avantages :** Un seul flux à maintenir.  
**Inconvénients :** Changement de page, moins fluide ; il faut gérer la pré-sélection de la boutique (query param, etc.).

---

## Correction technique commune (quelle que soit l’option)

- **Envoi depuis la messagerie :** à l’envoi effectif d’une candidature depuis le chat, **toujours** incrémenter `reserved_credits` pour la marque (comme sur Discover), pour que le solde « crédits utilisés en attente » reste correct.

---

## Recommandation

- **Option A (ou C)** : garder la possibilité de candidater depuis la messagerie, avec les **mêmes règles** que sur Parcourir les marques (vérification des crédits, modal de recharge si besoin, confirmation « 1 crédit réservé », puis réservation réelle à l’envoi).  
- Appliquer en plus la **correction technique** (incrément de `reserved_credits` dans le handler d’envoi depuis le chat).

Si vous préférez un seul point d’entrée (Discover), choisir **Option B** ou **Option D** et adapter l’UX en conséquence.
