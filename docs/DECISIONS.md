# DECISIONS — journal des décisions

Format : date · décision · pourquoi · qui a validé.

---

## 2026-10-18 — D01 · Architecture GitHub Pages + Apps Script + Google Sheet
**Décision** : front statique public, backend Apps Script en application web exécutée « en tant que moi »,
Google Sheet comme base de données, MailApp pour les codes.
**Pourquoi** : coût nul, aucun serveur à administrer, les mariés travaillent dans un outil qu'ils connaissent.
**Validé par** : Harry (imposé dans `LANCEMENT_PROJET.md` §2.1).

## 2026-10-18 — D02 · Authentification par code à usage unique
**Décision** : code numérique à 6 chiffres envoyé par email, TTL 10 min, 5 essais maximum, usage unique ;
session par token UUID de 6 h en `sessionStorage`.
**Pourquoi** : pas de mot de passe à gérer ni à réinitialiser ; l'email est déjà le canal du faire-part.
**Validé par** : Harry (brief §3.2).

## 2026-10-18 — D03 · Compteurs anti-abus dans `PropertiesService`
**Décision** : les compteurs (demandes de code par email et par heure, plafond mail journalier) sont
persistés dans `PropertiesService`, pas dans `CacheService`.
**Pourquoi** : une entrée de `CacheService` peut être évincée à tout moment (C7) ; un attaquant pourrait
réinitialiser la protection. Les codes et sessions, eux, restent en cache (au pire, reconnexion).
**Validé par** : Harry (brief §3.2, contrainte C7).

## 2026-10-18 — D04 · Message explicite `EMAIL_INCONNU`
**Décision** : si l'adresse n'est pas dans `Foyers`, le front affiche un message explicite plutôt qu'une
réponse identique dans tous les cas.
**Pourquoi** : l'énumération ne révèle que « cette adresse est invitée », information de faible valeur pour
un attaquant, alors que le message flou ferait échouer les invités qui se trompent d'adresse.
**Risque accepté** : énumération de la liste d'invités par un attaquant disposant déjà des adresses.
**À confirmer par Harry** : oui — décision par défaut, réversible en une ligne de code.

## 2026-10-18 — D05 · Dépôt public, zéro donnée
**Décision** : aucun email réel, aucune donnée d'invité, aucun identifiant de Sheet sensible dans le dépôt.
Les adresses de test vivent dans les Script Properties (`EMAIL_TEST`) et dans le Sheet.
**Pourquoi** : GitHub Pages gratuit impose un dépôt public (C1) ; l'historique git est irrattrapable.
**Validé par** : Harry (brief §3.2).

## 2026-10-18 — D06 · Seul `config.js` porte un paramètre de déploiement
**Décision** : `assets/js/config.js` contient l'`API_URL` (`/exec`) et rien d'autre de variable.
**Pourquoi** : un redéploiement Apps Script (C12) ou une migration de compte (§8) ne doit toucher qu'un fichier.
**Validé par** : Harry (brief §4).

<!-- Décisions suivantes : D07… -->

## 2026-10-18 — D07 · Présence unique (pas par événement)
**Décision** : l'invité déclare **une seule présence** pour le mariage, pas une par événement.
Les colonnes `invite_vin_honneur` / `invite_diner` / `invite_brunch` de `Foyers` sont **conservées** :
elles servent à afficher à chaque foyer le programme qui le concerne, et à ventiler les effectifs par
service dans `Synthese` (présents du foyer × services auxquels le foyer est convié).
**Pourquoi** : formulaire le plus court possible, l'oncle le moins à l'aise doit réussir du premier coup.
**Conséquence / limite acceptée** : un invité convié au dîner **et** au brunch ne peut pas venir à l'un
sans l'autre. Si cela se produit, il l'écrira dans le commentaire et les mariés corrigeront à la main.
**Validé par** : Harry, 2026-10-18.

## 2026-10-18 — D08 · Plusieurs adresses email par foyer
**Décision** : colonne `emails` de `Foyers`, une ou plusieurs adresses séparées par `;`. N'importe
laquelle permet de se connecter et d'accéder à la **même** réponse de foyer.
**Pourquoi** : les couples ne partagent pas toujours une boîte mail ; éviter qu'un seul conjoint détienne
l'accès.
**Conséquences** : unicité à contrôler sur l'ensemble des adresses, toutes confondues (`verifierDonnees()`) ;
normalisation `trim` + minuscules à la lecture ; les compteurs anti-abus restent **par adresse** (une
adresse ne peut pas être inondée, mais un foyer à 3 adresses peut recevoir 3 × 5 codes par heure —
accepté, le plafond mail journalier global reste la vraie protection).
**Validé par** : Harry, 2026-10-18.

## 2026-10-18 — D09 · « +1 » nommé et optionnel
**Décision** : si `places_max` est supérieur au nombre de personnes nommées du foyer, le formulaire
propose d'ajouter un accompagnant. Son **nom est obligatoire** dès que la case est cochée, avec régime
et allergies comme pour les autres. Ligne marquée `est_accompagnant = oui` dans `Reponses`.
**Pourquoi** : le plan de table, les étiquettes et le traiteur ont besoin d'un nom ; les mariés gardent le
contrôle via `places_max`.
**Validé par** : Harry, 2026-10-18.

## 2026-10-18 — D10 · Enfants distingués, avec âge
**Décision** : `type_personne` (`adulte` / `enfant`) est renseigné par les mariés dans l'onglet `Invites` ;
l'**âge** est demandé à l'invité pour les personnes de type `enfant` (entier 0–17, obligatoire si présent).
**Pourquoi** : menus enfants facturés différemment, chaise haute et menu bébé conditionnés par l'âge.
**RGPD** : l'âge d'un mineur est une donnée personnelle de plus — justifiée par la finalité traiteur,
purgée après l'événement comme le reste (R12).
**Validé par** : Harry, 2026-10-18.

## 2026-10-18 — D11 · Onglet `Invites` séparé (écart assumé avec le §3.4 du brief)
**Décision** : les personnes nommées d'un foyer vivent dans un onglet `Invites` (une ligne par personne :
`foyer_id`, `personne`, `type_personne`), au lieu d'une colonne `personnes` de `Foyers` contenant des
noms séparés par `;`.
**Pourquoi** : D10 impose une deuxième information par personne (`type_personne`). Deux listes parallèles
séparées par `;` dans une même ligne se désalignent silencieusement à la première erreur de saisie, et
interdisent les listes déroulantes. Un tableau se saisit, se trie et se contrôle ; `verifierDonnees()`
peut valider chaque ligne.
**Coût** : les mariés remplissent deux onglets cohérents au lieu d'un. `verifierDonnees()` signale les
foyers sans invité et les invités orphelins.
**Réversible** : oui, mais avant la saisie réelle de la liste d'invités. **À confirmer par Harry.**

## 2026-10-18 — D12 · `docs/INSTALLATION.md` ajouté à la structure
**Décision** : un document d'installation pas à pas, distinct de `GUIDE_MARIES.md`, est ajouté à
`docs/`. Il s'adresse à Harry (consoles Google et GitHub) ; `GUIDE_MARIES.md` s'adressera aux mariés
(usage du Sheet, sans technique).
**Pourquoi** : les actions manuelles s'accumulent sur trois phases (Sheet, déploiement, Pages) et la
gate CP exige qu'elles soient listées étape par étape. Les mélanger au guide des mariés le rendrait
illisible.

## 2026-10-18 — D13 · Mode de revue des gates
**Décision** : les revues de rôle de P1 sont faites en annonçant le rôle, par l'agent lui-même. Les
revues **SEC de P2** et la **revue croisée de P4** seront confiées à des sous-agents indépendants qui
n'auront pas écrit le code relu.
**Pourquoi** : le §3 du brief autorise les deux modes. Un relecteur indépendant a le plus de valeur sur
le code de sécurité et sur la revue finale ; sur P1, les contrôles ont été validés par **exécution**
(banc d'essai hors ligne, jeu de données corrompu) plutôt que par lecture, ce qui est plus probant.
**À confirmer par Harry** : oui.
