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

## Phase 2 — Déployer le backend

Durée : environ 20 minutes. **Rien dans cette phase n'est lancé sans votre accord** :
c'est vous qui cliquez sur Déployer.

### 2.0 ⚠️ Recoller `Sheet.gs` et relancer l'initialisation — 🖐

**À faire avant tout le reste si vous avez exécuté la Phase 1 avant le 18 octobre 2026.**

`Sheet.gs` a beaucoup changé depuis : accès métier ajoutés, et surtout les corrections
de la revue de sécurité. Deux d'entre elles ne prennent effet qu'en **relançant
l'initialisation**, parce qu'elles modifient le **format des colonnes du classeur** :

- les colonnes `email`, `action` et `resultat` de l'onglet `Journal` doivent être en
  **format texte**. C'est la seconde barrière contre l'injection de formule par le champ
  email : sans elle, une seule barrière subsiste au lieu de deux ;
- le sel de hachage est désormais créé à l'initialisation plutôt qu'à la première requête,
  pour éviter que deux requêtes simultanées n'en créent deux et n'invalident des codes déjà
  envoyés.

Marche à suivre :

1. Ouvrir `Sheet.gs` dans l'éditeur Apps Script, **tout sélectionner, tout remplacer** par
   le contenu actuel de [`apps-script/Sheet.gs`](../apps-script/Sheet.gs). Enregistrer.
2. Menu **`Mariage`** → **`Initialiser / réparer le classeur`** (ou exécuter
   `initialiserSheet` depuis l'éditeur).
3. Menu **`Mariage`** → **`Vérifier les données`** : toujours **0 erreur**.

Aucune donnée n'est perdue : `initialiserSheet()` ne supprime jamais de ligne.

### 2.1 Copier les fichiers de script — 🖐

Dans l'éditeur Apps Script, créer un fichier par source et y coller le contenu du dépôt.
Le nom doit être **exactement** celui-ci (Apps Script ajoute `.gs` tout seul) :

| Fichier de l'éditeur | Source dans le dépôt |
|---|---|
| `Code` | [`apps-script/Code.gs`](../apps-script/Code.gs) — **remplace** le `Code.gs` d'origine et son `myFunction()` |
| `Sheet` | [`apps-script/Sheet.gs`](../apps-script/Sheet.gs) — déjà en place depuis la Phase 1, à remettre à jour |
| `Securite` | [`apps-script/Securite.gs`](../apps-script/Securite.gs) |
| `Mail` | [`apps-script/Mail.gs`](../apps-script/Mail.gs) |
| `Tests` | [`apps-script/Tests.gs`](../apps-script/Tests.gs) |

Puis le manifeste :

1. Roue dentée **Paramètres du projet** → cocher
   **« Afficher le fichier manifeste appsscript.json dans l'éditeur »**.
2. Revenir à l'éditeur : `appsscript.json` apparaît dans la liste.
3. Remplacer son contenu par celui de [`apps-script/appsscript.json`](../apps-script/appsscript.json).

> Ce manifeste déclare le fuseau horaire, le mode d'exécution de l'application web et les
> deux autorisations demandées : lecture/écriture de classeurs, et envoi de mail.

### 2.2 Déclarer l'adresse de test — 🖐

**Paramètres du projet** → **Propriétés du script** → **Ajouter une propriété** :

| Propriété | Valeur |
|---|---|
| `EMAIL_TEST` | votre adresse, **qui doit aussi figurer dans l'onglet `Foyers`** |

C'est le seul endroit où une vraie adresse est écrite. Elle n'entre jamais dans le dépôt (C1, D05).

### 2.3 Tester avant de déployer — 🖐

Avant d'exposer quoi que ce soit sur Internet, lancer depuis l'éditeur :

1. **`testerFonctionsPures`** → `Exécuter`. Attendu : `0 échec(s)`.
   Aucun mail n'est envoyé, rien n'est écrit.
2. **`apercuMailCode`** → relire le texte du mail dans le journal. C'est le moment de
   demander une correction de formulation.
3. **`testerParcoursComplet`** → Google demande une **nouvelle autorisation**, cette fois
   pour l'envoi de mail : `Examiner les autorisations` → `Paramètres avancés` →
   `Accéder à … (non sécurisé)` → `Autoriser`.
   Attendu : `0 échec(s)`, **et un mail reçu** à l'adresse `EMAIL_TEST`.

   > Ce test écrit dans `Reponses` pour votre foyer de test. C'est voulu.

4. **`testerIsolationFoyer`** → attendu : `0 échec(s)`. Vérifie qu'un foyer ne peut pas
   toucher les données d'un autre. Nécessite au moins **deux** foyers dans le Sheet.
5. **`testerAntiAbus`** → attendu : `0 échec(s)`.
   ⚠️ Ce test envoie jusqu'à 5 mails et **bloque votre adresse de test pendant une heure**.
   Pour enchaîner d'autres tests ensuite, lancer `reinitialiserCompteurDeTest`.

Si un test échoue, **ne pas déployer** : envoyez-moi le rapport.

### 2.4 Premier déploiement — 🖐 **votre décision**

1. En haut à droite : **`Déployer`** → **`Nouveau déploiement`**.
2. Roue dentée à côté de *Sélectionner le type* → **`Application Web`**.
3. Remplir :

   | Champ | Valeur |
   |---|---|
   | Description | `v0.2.0 — backend` |
   | Exécuter en tant que | **Moi** (votre adresse) |
   | Qui a accès | **Tout le monde** |

   > « Tout le monde » est **obligatoire** : les invités n'ont pas de compte Google.
   > Le script s'exécute avec vos droits, mais il ne fait que ce que son code autorise —
   > c'est pour cela que tout passe par un code de connexion.

4. **`Déployer`**, puis **copier l'URL de l'application Web** : elle se termine par `/exec`.
   Conservez-la, elle ira dans `assets/js/config.js` en Phase 3.

### 2.5 Vérifier depuis l'extérieur — 🖐

Une seule commande, depuis la racine du dépôt :

```bash
./outils/verifier-deploiement.sh "https://script.google.com/macros/s/.../exec"
```

Elle enchaîne onze contrôles : le service répond, la bonne version est en ligne, la date
limite est bien lue dans `Config`, les erreurs sont propres, aucune trace technique ne
fuit, et l'URL répond sans compte Google. **Aucun mail n'est envoyé** : toutes les adresses
utilisées sont en `@example.com` et ne correspondent à aucun foyer.

En cas d'échec, le script affiche la piste correspondante.

À la main, si vous préférez :

```bash
URL="https://script.google.com/macros/s/.../exec"
curl -sL -H "Content-Type: text/plain" -d '{"action":"ping"}' "$URL"
```

Attendu, sur une seule ligne :

```json
{"version":"0.2.0","dateLimite":"2027-04-30","reponsesOuvertes":true,"ok":true}
```

> Le `-L` est **indispensable** : Apps Script répond par une redirection 302 vers
> `googleusercontent.com` (C4). Sans `-L`, `curl` n'affiche rien. Le navigateur, lui,
> suit la redirection tout seul.

### 2.6 À retenir pour la suite

> **Après chaque modification du code**, il faut refaire
> `Déployer` → **`Gérer les déploiements`** → crayon ✏️ → *Version* : **`Nouvelle version`** → `Déployer`.
>
> « **Gérer les déploiements** » conserve l'URL. « **Nouveau déploiement** » en créerait une
> autre, et le site continuerait d'appeler l'ancienne (C12, R09).
>
> Pour vérifier qu'une mise à jour est bien en ligne : rappeler `ping` et regarder `version`.

### 2.7 Vérifications attendues avant la Phase 3

- [ ] Les 5 fichiers et le manifeste sont dans l'éditeur, sans erreur de syntaxe.
- [ ] `EMAIL_TEST` est défini et l'adresse figure dans `Foyers`.
- [ ] Les cinq fonctions de test passent avec `0 échec(s)`.
- [ ] Un mail de code a été reçu, lu sur mobile, et **n'est pas en spam**.
- [ ] `ping` répond correctement en `curl` depuis l'extérieur.
- [ ] `./outils/verifier-deploiement.sh "<URL>"` : 11 contrôles, 0 échec.
- [ ] L'URL `/exec` est notée **en dehors du dépôt**, et reportée dans
      [`assets/js/config.js`](../assets/js/config.js).

---

## Phase 5 — Mise en ligne

*(À venir. Activation de GitHub Pages, `Config!URL_SITE`, test de bout en bout.)*
