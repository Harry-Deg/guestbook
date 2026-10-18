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

Les fonctions de test ont besoin d'une vraie adresse pour envoyer un vrai mail. Elle n'est
**jamais écrite dans le code** : elle vit dans une « propriété du script », un petit
magasin clé/valeur propre au projet Apps Script, invisible depuis le dépôt (C1, D05).

**Où :** éditeur Apps Script → roue dentée ⚙️ **Paramètres du projet** → tout en bas,
section **Propriétés du script** → **Ajouter une propriété de script**.

| Propriété | Valeur |
|---|---|
| `EMAIL_TEST` | votre adresse email |

Puis **Enregistrer les propriétés**.

> **La même adresse doit figurer dans la colonne `emails` de l'onglet `Foyers`.**
> C'est tout l'intérêt : les tests se comportent exactement comme un invité réel. Si
> l'adresse n'y est pas, `testerParcoursComplet` s'arrête dès le premier contrôle avec
> « EMAIL_TEST rattachée à un foyer : ÉCHEC ».

Deux autres propriétés apparaîtront toutes seules, ne les touchez pas :

| Propriété | À quoi elle sert |
|---|---|
| `SEL_INSTALLATION` | sel de hachage des codes et des tokens. **La supprimer invaliderait toutes les sessions en cours.** |
| `dem:…`, `mails:…`, `inconnus:…` | compteurs anti-abus. Ils se nettoient seuls. |

### 2.3 Tester avant de déployer — 🖐

Rien n'est encore exposé sur Internet : ces tests s'exécutent depuis l'éditeur, sur votre
classeur. Lancez-les **dans cet ordre**, du plus inoffensif au plus intrusif.

Pour chacun : sélectionnez la fonction dans la liste déroulante en haut de l'éditeur,
cliquez **Exécuter**, et lisez le rapport dans le panneau **Journal d'exécution** qui
s'ouvre en bas. Une boîte de dialogue résume aussi le résultat dans le classeur.

Chaque rapport se termine par une ligne du type `30 contrôle(s), 0 échec(s).`
**Seul le nombre d'échecs compte : il doit être à zéro.**

---

**1. `testerFonctionsPures` — 30 contrôles, aucun effet de bord**

Ni mail, ni écriture. Vérifie la neutralisation des formules, la troncature des champs,
la génération et le hachage des codes, la normalisation des adresses, le refus des tokens
inventés, et que `Config` est lisible.

> Si celui-ci échoue, **arrêtez tout** : un fichier a été mal collé. Envoyez-moi le rapport.

**2. `apercuMailCode` — aucun envoi**

Affiche dans le journal le sujet, la version texte et la version HTML du mail que
recevront les invités, avec un code factice `123456`.

C'est le moment de relire la formulation. Les textes sont dans `Mail.gs`, fonction
`construireMailCode_`. Dites-moi si vous voulez les changer.

**3. `testerParcoursComplet` — 15 contrôles · envoie un vrai mail**

C'est ici que **Google redemande l'autorisation**, parce que le script va envoyer un mail
pour la première fois :

> `Examiner les autorisations` → choisissez votre compte → l'écran
> « Google n'a pas validé cette application » apparaît → **`Paramètres avancés`** →
> **`Accéder à <nom du projet> (non sécurisé)`** → **`Autoriser`**.

L'écran de consentement doit mentionner **deux** permissions : vos feuilles de calcul, et
l'envoi de mail en votre nom. S'il en demande davantage, le manifeste n'a pas été pris en
compte — revoyez l'étape 2.1.

> « Non sécurisé » est normal et sans gravité : Google l'affiche pour tout script non
> soumis à sa procédure de validation. Le script est le vôtre, vous venez de l'écrire.

Le test déroule ensuite le parcours entier : demande de code, mauvais code refusé, bon
code accepté, code rejoué refusé, soumission, double soumission sans doublon, relecture,
déconnexion.

**Attendu : `0 échec(s)`, et un mail reçu à l'adresse `EMAIL_TEST`.**

> Ce test **écrit dans l'onglet `Reponses`** pour votre foyer de test, et laisse une
> ligne par version dans `Historique`. C'est voulu. Vous pourrez vider ces lignes à la
> main avant l'envoi des faire-part.

**4. `testerIsolationFoyer` — 5 contrôles · écrit dans `Reponses`**

Le plus important pour la vie privée de vos invités. Il ouvre une session sur un foyer,
puis envoie des requêtes contenant le `foyer_id` **d'un autre foyer**, et vérifie que les
données de ce dernier ne sont ni lues ni modifiées.

**Nécessite au moins deux foyers** dans l'onglet `Foyers`, sinon il s'arrête en disant
« un second foyer existe pour le test : ÉCHEC ».

**5. `testerAntiAbus` — 5 contrôles · envoie jusqu'à 5 mails**

Vérifie le piège à robots, le refus des adresses inconnues, le plafond de 5 demandes par
heure et par adresse, et que ce plafond **survit au vidage du cache**.

> ⚠️ **Après ce test, votre adresse de test ne pourra plus demander de code pendant une
> heure.** C'est le comportement attendu. Pour enchaîner d'autres essais tout de suite,
> lancez **`reinitialiserCompteurDeTest`**.

Si ce test s'arrête sur « plafond mail atteint avant le plafond horaire », c'est que votre
quota Gmail du jour est déjà entamé : réessayez demain, ce n'est pas un défaut.

**6. `testerCorrectionsP4` — 10 contrôles · aucun mail**

Ajoutée après la revue croisée de Phase 4. Vérifie que les chemins corrigés le restent :
`logout` et le piège à robots n'écrivent plus de ligne de `Journal` sans plafond, une
`DATE_LIMITE` au format français ne produit qu'**une** alerte par jour au lieu d'une par
visiteur, l'apostrophe de protection du Sheet ne remonte pas sous les yeux de l'invité,
et deux écritures Unicode d'un même prénom accentué donnent bien la même clé.

> Ce test modifie temporairement `DATE_LIMITE` dans `Config` et la remet en place
> ensuite, y compris s'il échoue. Si vous l'interrompez en cours d'exécution, vérifiez
> la valeur de `DATE_LIMITE` avant de continuer.

---

**Si un test échoue, ne déployez pas.** Copiez-moi le rapport complet du journal
d'exécution : il nomme le contrôle en échec et ce qu'il attendait.

### 2.4 Premier déploiement — 🖐 **votre décision**

C'est l'étape qui rend le backend accessible depuis Internet. Elle n'est jamais faite à
votre place.

1. En haut à droite de l'éditeur : **`Déployer`** → **`Nouveau déploiement`**.
2. À gauche, roue dentée ⚙️ à côté de *Sélectionner le type* → cochez **`Application Web`**.
3. Remplissez :

   | Champ | Valeur | Pourquoi |
   |---|---|---|
   | Description | `v0.2.0 — backend` | n'importe quel texte, il aide à s'y retrouver dans l'historique |
   | Exécuter en tant que | **Moi** *(votre adresse)* | le script doit écrire dans **votre** classeur et envoyer depuis **votre** Gmail |
   | Qui a accès | **Tout le monde** | vos invités n'ont pas de compte Google |

   > **« Tout le monde » inquiète souvent, à tort.** Cela signifie que n'importe qui peut
   > *appeler* l'URL — pas qu'il peut lire quoi que ce soit. Le script ne répond rien
   > d'utile sans un code reçu par mail, puis un token valide. C'est précisément ce que
   > `testerIsolationFoyer` et les 182 contrôles automatisés vérifient.
   >
   > L'alternative, « Toute personne disposant d'un compte Google », obligerait chaque
   > invité à se connecter à Google : inutilisable ici.

4. **`Déployer`**. Google affiche alors **l'URL de l'application Web**, qui se termine
   par **`/exec`**. Copiez-la.

   > Il existe aussi une URL en `/dev`, visible ailleurs dans l'interface. Elle ne
   > fonctionne que pour vous, connecté à votre compte. **Ce n'est pas celle-là.**

5. Notez cette URL **en dehors du dépôt** pour l'instant. Elle ira dans
   [`assets/js/config.js`](../assets/js/config.js) juste après.

### 2.5 Vérifier depuis l'extérieur — 🖐

Les tests de l'étape 2.3 s'exécutaient **à l'intérieur** de Google, avec vos droits. Ici
on vérifie ce que voit un invité : une URL publique, appelée depuis votre terminal, sans
aucun compte Google.

Une seule commande, depuis la racine du dépôt :

```bash
./outils/verifier-deploiement.sh "https://script.google.com/macros/s/VOTRE_ID/exec"
```

Les guillemets sont nécessaires : l'URL contient des caractères que le terminal
interpréterait autrement.

Douze contrôles s'enchaînent :

| Ce qui est vérifié | Pourquoi ça compte |
|---|---|
| `ping` répond `ok` | le déploiement est vivant et accessible sans compte |
| la version est `0.2.0` | c'est bien la **dernière** version qui est en ligne, pas une ancienne (C12) |
| `dateLimite` est renvoyée | l'onglet `Config` est bien lu |
| action inconnue, corps illisible | les requêtes malformées sont refusées proprement |
| adresse inconnue, adresse mal formée | **aucun mail n'est envoyé** pour une adresse hors liste |
| token inventé | une session fabriquée ne donne accès à rien |
| aucune trace technique | une erreur ne révèle ni nom de fichier, ni pile d'appel |
| HTTP 200 sans compte Google | le réglage « Tout le monde » est bien pris |

**Aucun mail n'est envoyé** : toutes les adresses utilisées sont en `@example.com`, un
domaine réservé qui ne correspond à aucun de vos foyers.

Sortie attendue :

```
12 contrôles · 12 OK · 0 échec(s)
Le déploiement est prêt. Reportez l'URL dans assets/js/config.js.
```

En cas d'échec, le script affiche la piste correspondante. Les trois cas réels :

| Symptôme | Cause | Correction |
|---|---|---|
| Tout échoue, réponse en HTML | « Qui a accès » n'est pas sur **Tout le monde**, ou l'URL est en `/dev` | refaire l'étape 2.4 |
| Version différente de `0.2.0` | du code a été modifié sans nouvelle version déployée | `Déployer` → **Gérer les déploiements** → crayon ✏️ → Version : **Nouvelle version** |
| `ERREUR_SERVEUR` partout | un onglet manque ou un en-tête a été renommé | menu `Mariage` → **Vérifier les données**, puis **Initialiser / réparer le classeur** |

À la main, si vous préférez voir la réponse brute :

```bash
URL="https://script.google.com/macros/s/VOTRE_ID/exec"
curl -sL -H "Content-Type: text/plain" -d '{"action":"ping"}' "$URL"
```

```json
{"version":"0.2.0","dateLimite":"2027-04-30","reponsesOuvertes":true,"contact":"…","ok":true}
```

> Le `-L` est **indispensable** : Apps Script répond par une redirection 302 vers
> `googleusercontent.com` (C4). Sans `-L`, `curl` n'affiche **rien du tout** et l'on croit
> à tort que le déploiement est cassé. Le navigateur, lui, suit la redirection seul.

**Dernière étape** : collez l'URL `/exec` dans [`assets/js/config.js`](../assets/js/config.js),
comme valeur de `API_URL`. C'est la **seule** ligne du dépôt à modifier : tout le reste de
la configuration (nom des mariés, dates, adresse de contact) vit dans l'onglet `Config`.

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
- [ ] Les **six** fonctions de test passent avec `0 échec(s)` — dont `testerCorrectionsP4`,
      ajoutée après la revue croisée.
- [ ] Un mail de code a été reçu, lu sur mobile, et **n'est pas en spam**.
- [ ] `ping` répond correctement en `curl` depuis l'extérieur.
- [ ] `./outils/verifier-deploiement.sh "<URL>"` : 12 contrôles, 0 échec.
- [ ] L'URL `/exec` est notée **en dehors du dépôt**, et reportée dans
      [`assets/js/config.js`](../assets/js/config.js).

---

## Phase 5 — Mise en ligne

> Cette phase contient les **seules** actions irréversibles du projet : à partir de
> l'étape 5.3, le site est public. Les étapes 5.1 et 5.2 sont là pour qu'il n'y ait rien
> à regretter.

### 5.1 Vérifier que le dépôt ne contient rien de personnel

Le dépôt est public, et son **historique** l'est autant que son état actuel.

```bash
cd ~/Documents/guestbook
git log -p | grep -nEi '[a-z0-9._%+-]+@(gmail|outlook|hotmail|yahoo|icloud|free|orange|wanadoo)\.'
git log --all --name-only --pretty=format: | sort -u | grep -i '^photo/'
```

Les deux commandes doivent **ne rien afficher**. La première cherche une adresse
personnelle, la seconde une photo d'origine qui serait entrée par erreur.

Si la première trouve quelque chose, la ligne indiquée est déjà dans l'historique :
la corriger aujourd'hui ne l'en retire pas. Il faut alors réécrire l'historique
(`git filter-repo`) **avant** le premier `git push`, ou repartir d'un dépôt neuf.
Après publication, considérer l'adresse comme divulguée.

### 5.2 Remplir le contenu réel du site

`index.html` contient encore des valeurs d'attente. Tant qu'elles y sont, le site
n'est pas publiable : un invité lirait « À compléter ».

```bash
grep -n 'À compléter\|à compléter' index.html
```

À renseigner :

| Ligne | Quoi |
|---|---|
| `bandeau__date` | la vraie date du mariage |
| Programme × 4 | horaire, lieu et adresse de chaque moment |
| Venir et dormir | itinéraire, stationnement, gare, hébergements |

Les horaires actuels (15 h / 17 h / 20 h / 11 h) sont eux aussi inventés.

**Puis vérifier la cohérence entre le site et le classeur** — les deux se répètent, et
rien ne les synchronise automatiquement (D17) :

| `Config` | doit correspondre à |
|---|---|
| `NOM_MARIES` | le `<title>` et le bandeau d'`index.html` |
| `DATE_MARIAGE` | la date affichée dans le bandeau |
| `DATE_LIMITE` | postérieure à aujourd'hui, antérieure au mariage |
| `CONTACT_MARIES` | une adresse réellement relevée (elle sera **affichée publiquement**) |

L'adresse de contact n'est plus dans le code : elle est servie par l'API depuis
`Config`. La changer dans le classeur suffit, sans redéployer quoi que ce soit.

### 5.3 Activer GitHub Pages — 🖐 action de Harry

> **Accord explicite requis.** C'est l'étape qui rend le site visible de tous.

1. `git push` sur `main` — après avoir confirmé 5.1.
2. Sur GitHub : **Settings → Pages**.
3. *Source* : **Deploy from a branch**. *Branch* : `main`, dossier `/ (root)`. **Save**.
4. Attendre 1 à 2 minutes. L'URL s'affiche en haut de la page :
   `https://<compte>.github.io/<dépôt>/`.

Le fichier `.nojekyll` à la racine est nécessaire : sans lui, GitHub fait passer le
dépôt par Jekyll, qui transformerait `README.md` et `docs/*.md` en pages HTML publiques.

### 5.4 Reporter l'URL dans le classeur

Dans `Config`, renseigner **`URL_SITE`** avec l'URL obtenue, barre oblique finale comprise.

Ce n'est pas cosmétique : le mail de code contient une ligne « Le site : … » qui
**disparaît silencieusement** si `URL_SITE` est vide. Les invités recevraient alors un
code sans savoir où le saisir.

Puis : menu **Mariage → Vérifier les données**. Attendu : `0 erreur`.

### 5.5 Test de bout en bout sur l'URL publique

Sur le **vrai** site, pas en local, console ouverte (`F12`) :

- [ ] La page s'affiche, aucun message rouge, **aucune mention « Content Security Policy »**.
- [ ] Le pied de page affiche l'adresse de contact et elle est cliquable.
- [ ] Parcours complet avec `EMAIL_TEST` : code reçu, saisi, formulaire, envoi, récapitulatif.
- [ ] Rechargement de la page : la réponse est toujours là.
- [ ] Modification : aucun doublon dans `Reponses`, une version de plus dans `Historique`.
- [ ] Même parcours depuis un téléphone, en 4G (pas en Wi-Fi : on teste aussi la latence).
- [ ] Dérouler [`RECETTE.md`](RECETTE.md) §3bis et §4, et cocher les cases.

### 5.6 Avant d'envoyer les faire-part

- [ ] `GUIDE_MARIES.md` a été lu avec Alec et Gloria, et le classeur partagé
      **nominativement** avec eux (jamais par lien).
- [ ] Une sauvegarde du classeur a été faite : **Fichier → Télécharger → Microsoft Excel**.
- [ ] Les envois sont **étalés sur plusieurs jours** : le plafond est de 80 mails par jour
      (R02). À 150 foyers, un envoi groupé l'épuise dès le premier soir — et les invités
      concernés reçoivent une erreur, pas un code.

### 5.7 Les 48 premières heures

Surveiller l'onglet `Journal`, en filtrant la colonne `resultat` :

| Ce qu'on y voit | Ce que ça veut dire |
|---|---|
| `SERVICE_INDISPONIBLE` répété | plafond de mails atteint, ou classeur trop sollicité |
| `alerte` | une valeur de `Config` est illisible — relancer *Vérifier les données* |
| `EMAIL_INCONNU` fréquent | une adresse de `Foyers` est erronée, ou un invité se trompe |
| `TROP_DE_TENTATIVES` | normal et isolé ; répété sur la même adresse, appeler la personne |

### Checklist de clôture — Phase 5

- [ ] L'historique git ne contient aucune adresse personnelle ni photo d'origine.
- [ ] Plus aucun « À compléter » dans `index.html`.
- [ ] `Config` et `index.html` disent la même chose.
- [ ] GitHub Pages est actif et l'URL répond.
- [ ] `URL_SITE` est renseignée et le mail contient bien le lien.
- [ ] Le parcours complet fonctionne sur l'URL publique, depuis un téléphone.
- [ ] Les mariés ont le classeur et le guide.
- [ ] Une sauvegarde Excel existe.
