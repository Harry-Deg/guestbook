# INSTALLATION — procédure pas à pas (pour Harry)

Ce document grandit à chaque phase. Les étapes marquées **🖐 action manuelle** sont à faire
dans les consoles Google ou GitHub : l'agent ne peut pas les exécuter.

---

## Phase 1 — Créer le Google Sheet et l'initialiser

Durée : environ 10 minutes. Rien d'irréversible.

### 1.1 Créer le classeur — 🖐

1. Ouvrir <https://sheets.new> (avec le compte Google qui portera le projet).
2. Renommer le classeur, par exemple **`Mariage — RSVP`**.
3. `Fichier` → `Paramètres` → vérifier le **fuseau horaire** : *(GMT+01:00) Paris*.
   Le script horodate les réponses dans ce fuseau.

> **Ne partagez ce classeur avec personne par lien** (R11). Plus tard, accès nominatif
> aux mariés uniquement, en lecture ou en modification selon ce que vous décidez.

### 1.2 Attacher le script — 🖐

1. Dans le classeur : `Extensions` → `Apps Script`. Un projet lié au classeur s'ouvre.
2. Renommer le projet, par exemple **`Mariage RSVP`** (en haut à gauche).
3. Dans le panneau de gauche, le fichier `Code.gs` existe déjà et contient `myFunction()`.
   Laissez-le pour l'instant, il sera remplacé en Phase 2.
4. Cliquer sur **`+`** à côté de *Fichiers* → `Script` → nommer le fichier **`Sheet`**
   (Apps Script ajoute l'extension `.gs` tout seul).
5. Ouvrir [`apps-script/Sheet.gs`](../apps-script/Sheet.gs) de ce dépôt, **tout copier**,
   et **tout coller** dans le fichier `Sheet.gs` de l'éditeur, en remplaçant son contenu.
6. `Ctrl+S` / `Cmd+S` pour enregistrer.

### 1.3 Lancer l'initialisation — 🖐

1. Dans la barre du haut de l'éditeur, sélectionner la fonction **`initialiserSheet`**.
2. Cliquer sur **`Exécuter`**.
3. Google demande une autorisation à la première exécution :
   `Examiner les autorisations` → choisir votre compte → l'écran
   « Google n'a pas validé cette application » apparaît → `Paramètres avancés` →
   `Accéder à Mariage RSVP (non sécurisé)` → `Autoriser`.

   > Cet avertissement est normal : le script est le vôtre et n'a pas été soumis à
   > validation Google. Les autorisations demandées à ce stade portent **uniquement**
   > sur le classeur. L'envoi de mails sera demandé en Phase 2.

4. L'exécution dure quelques secondes. Le journal doit afficher
   `Initialisation terminée.` et la liste des onglets créés.
5. Revenir sur le classeur : **8 onglets** sont présents —
   `Foyers`, `Invites`, `Reponses`, `Historique`, `Config`, `Journal`, `Synthese`, `Traiteur`.
6. Recharger la page du classeur (`F5`) : un menu **`Mariage`** apparaît à côté de `Aide`.
   Il donne accès à l'initialisation, au contrôle des données et à la purge, sans passer
   par l'éditeur — c'est ce menu que les mariés utiliseront.

`initialiserSheet()` est **relançable sans risque** : elle ne supprime aucune donnée, elle
recrée ce qui manque et remet d'aplomb en-têtes, listes déroulantes et formules.

### 1.4 Remplir Config — 🖐

Dans l'onglet `Config`, renseigner au minimum :

| Clé | À mettre |
|---|---|
| `NOM_MARIES` | le nom des mariés tel qu'il apparaîtra sur le site et les mails |
| `DATE_MARIAGE` | format `AAAA-MM-JJ` |
| `DATE_LIMITE` | format `AAAA-MM-JJ`, antérieure au mariage |
| `EXPEDITEUR_NOM` | nom affiché de l'expéditeur des mails |
| `REPLY_TO` | adresse où doivent arriver les réponses des invités |
| `CONTACT_MARIES` | adresse affichée dans les messages d'erreur du site |
| `PLAFOND_MAILS_JOUR` | `80` (laisser tel quel) |

`EXPEDITEUR_ADRESSE` reste **vide** : les mails partiront de votre Gmail via `MailApp` (C13).
`URL_SITE` sera renseignée en Phase 5, quand GitHub Pages sera en ligne.

### 1.5 Saisir un jeu de test — 🖐

Avant la vraie liste d'invités, créer **2 ou 3 foyers de test** avec **vos propres adresses**
(ou celles d'un proche qui a dit oui).

Dans `Foyers` :

| foyer_id | emails | nom_affichage | places_max | invite_vin_honneur | invite_diner | invite_brunch |
|---|---|---|---|---|---|---|
| `F001` | *votre adresse* | Famille Test | 3 | oui | oui | oui |
| `F002` | *votre deuxième adresse* | Test Vin d'honneur | 1 | oui | non | non |

Dans `Invites` :

| foyer_id | personne | type_personne |
|---|---|---|
| `F001` | Adulte Test | adulte |
| `F001` | Enfant Test | enfant |
| `F002` | Solo Test | adulte |

> **Ces adresses ne doivent jamais entrer dans le dépôt git** (C1, D05). Elles vivent dans
> le classeur, et dans les Script Properties pour les tests automatisés (Phase 2).

Les fichiers de [`sheet-templates/`](../sheet-templates/) donnent le format attendu, avec des
adresses `@example.com` fictives. **Ne les importez pas** dans le classeur de production.

### 1.6 Contrôler — 🖐

Menu **`Mariage`** → **`Vérifier les données`** (ou, dans l'éditeur, exécuter `verifierDonnees`).

Une boîte de dialogue résume : nombre de foyers, de personnes, d'erreurs et d'avertissements.
Le rapport complet est dans l'éditeur, onglet `Exécutions` → `Journaux`.

- **ERREUR** : le site ne fonctionnera pas correctement pour ce foyer. À corriger.
- **AVERTISSEMENT** : incohérence probable, à regarder sans urgence.

Relancer après chaque correction, et **systématiquement après avoir saisi la vraie liste
d'invités**.

### 1.7 Vérifications attendues avant de passer en Phase 2

- [ ] Les 8 onglets existent, le menu `Mariage` apparaît après rechargement.
- [ ] `Config` est rempli, `verifierDonnees()` ne signale **aucune erreur**.
- [ ] `Synthese` affiche des totaux (ils seront à 0 tant qu'aucune réponse n'existe —
      c'est normal) et aucune cellule en `#ERREUR!` / `#REF!`.
- [ ] `Traiteur` affiche *« aucune présence confirmée pour l'instant »*.
- [ ] L'**identifiant du classeur** (le long code dans l'URL entre `/d/` et `/edit`) est
      noté quelque part **en dehors du dépôt** — il servira en Phase 2.

---

## Phase 2 — Déploiement du backend

*(À venir. Autorisation d'envoi de mails, Script Properties `EMAIL_TEST`, premier déploiement
en Application Web, test `curl`. Aucun déploiement ne sera fait sans votre accord explicite.)*

---

## Phase 5 — Mise en ligne

*(À venir. Activation de GitHub Pages, `Config!URL_SITE`, test de bout en bout.)*
