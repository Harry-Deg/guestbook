# LANCEMENT_PROJET.md — Brief de développement du site RSVP du mariage

> **À l'agent Claude qui lit ce fichier** : tu pilotes la mise en place complète de l'application, de l'initialisation du dépôt à la mise en ligne.
> Tu travailles avec **quatre rôles d'experts**, décrits au §3, qui cadrent, conçoivent et valident chaque étape.
> Lis ce document en entier avant d'écrire une seule ligne de code, puis commence par la **Phase 0** (§6).

---

## 1. Mission

Construire un site web simple permettant aux invités d'un mariage de :

1. consulter les informations pratiques (date, lieux, programme, accès, hébergement) ;
2. se connecter **sans mot de passe**, avec un **code à 6 chiffres reçu par email** ;
3. confirmer la **présence** de chaque personne de leur foyer, indiquer **régime alimentaire et allergies**, et laisser un commentaire ;
4. modifier leur réponse jusqu'à une **date limite**.

De leur côté, les mariés consultent et exportent toutes les réponses depuis un **Google Sheet**, exportable en Excel.

**Interlocuteur** : Harry, data engineer et développeur du projet (pas l'un des mariés). C'est lui qui valide les décisions, crée les comptes et fait les manipulations dans les consoles Google et GitHub.

---

## 2. Architecture imposée et contraintes

### 2.1 Architecture

```
Invité (navigateur, souvent mobile)
   │ 1. charge le site statique
   ▼
GitHub Pages  ── dépôt PUBLIC, HTML/CSS/JS vanilla, aucun build
   │ 2. fetch POST (Content-Type: text/plain) → URL /exec
   ▼
Google Apps Script (Application Web, exécutée « en tant que moi »)
   ├──► Google Sheet  (base de données : Foyers, Reponses, Config, Journal…)
   └──► MailApp       (envoi du code de connexion)
```

Aucun serveur à gérer, aucun coût. Le backend s'exécute chez Google à chaque requête.

### 2.2 Contraintes techniques à connaître et à respecter

Chaque rôle doit les avoir en tête. Si une contrainte bloque une fonctionnalité, **le signaler au lieu de la contourner en silence**.

| # | Contrainte | Conséquence |
|---|---|---|
| C1 | Dépôt GitHub **public** (Pages gratuit) | Aucun secret, aucune donnée réelle d'invité dans le dépôt, même dans l'historique git. |
| C2 | GitHub Pages ne permet pas de définir d'en-têtes HTTP | Pas de CSP par en-tête : utiliser une balise `<meta http-equiv="Content-Security-Policy">`. |
| C3 | Apps Script ne gère pas le preflight CORS | Toujours envoyer en `Content-Type: text/plain`, sans en-tête personnalisé. Le JSON est lu via `e.postData.contents`. |
| C4 | Apps Script répond toujours **HTTP 200** (via une redirection 302 vers googleusercontent.com) | Les erreurs passent dans le corps : `{ ok:false, error:"CODE" }`. `fetch` suit la redirection tout seul ; `curl` a besoin de `-L`. |
| C5 | **Démarrage à froid** de 1 à 4 s par appel | Le front affiche un état de chargement explicite et désactive les boutons pendant l'appel. |
| C6 | Apps Script **ne voit pas l'adresse IP** du client | Impossible de limiter les abus par IP : on limite par email, par code et par quota global. |
| C7 | `CacheService` : durée maximale de 6 h, et **une entrée peut être évincée à tout moment** | Acceptable pour les codes et les sessions (au pire, l'invité se reconnecte). **Pas acceptable pour les compteurs anti-abus** : les mettre dans `PropertiesService` ou un onglet caché. |
| C8 | Quota `MailApp` d'environ **100 destinataires par jour** (Gmail gratuit) | Vérifier `MailApp.getRemainingDailyQuota()` avant chaque envoi, prévoir un plafond applicatif et un message clair si le quota est épuisé. |
| C9 | Exécution limitée à 6 min, environ 30 exécutions simultanées par utilisateur | Garder des actions courtes. Lire le Sheet une seule fois par requête. |
| C10 | Le Sheet sert de base : pas de transactions, risque d'écritures concurrentes | Toute écriture passe par `LockService`. Les réécritures d'un foyer doivent être idempotentes. |
| C11 | Une cellule commençant par `= + - @` est interprétée comme une **formule** | Neutraliser ces caractères en début de chaque saisie libre (injection de formules). |
| C12 | Chaque modification de `Code.gs` nécessite un **redéploiement** (Gérer les déploiements → nouvelle version) | Sinon le site appelle l'ancienne version. « Nouveau déploiement » créerait une nouvelle URL. |
| C13 | Phase de test : les mails partent du **Gmail personnel de Harry** | Plus tard, migration vers une adresse dédiée gérée par les mariés (§8). L'architecture ne doit pas coder d'adresse en dur. |
| C14 | Allergies et régimes liés à la santé = **données de santé** (RGPD) | Minimisation, accès restreint, purge après l'événement (§3.4 et §7). |
| C15 | Les mails de code peuvent tomber en **spam** | Sujet sobre, texte simple et court, pas de lien raccourci. Tester Gmail, Outlook et iCloud. |

---

## 3. L'équipe projet

Tu incarnes successivement ces quatre rôles. Chaque rôle a son périmètre, ses livrables et une **checklist de validation** (gate) que tu dois passer explicitement avant de clore une phase.

**Mode de revue.** Si tu disposes d'un outil de sous-agents, lance chaque revue de rôle dans un **sous-agent indépendant** qui n'a pas écrit le code relu. Donne-lui ce fichier et les fichiers concernés, et demande-lui un rapport « bloquant / à corriger / suggestion ». Sinon, fais la revue toi-même en annonçant le rôle (« Revue Sécurité : … »), et sois aussi exigeant qu'un relecteur externe.

### 3.1 Chef de projet (CP)

**Mission** : livrer un site fiable avant l'envoi des faire-part, sans dérive de périmètre.

Responsabilités :

- tenir `docs/BACKLOG.md` (fonctionnalités MVP, puis v2) et `docs/DECISIONS.md` (journal daté des décisions : quoi, pourquoi, qui a validé) ;
- poser à Harry les **questions ouvertes** (§9) au bon moment, regroupées et à choix multiples si possible, **sans bloquer** ce qui peut avancer ;
- tenir `docs/RISQUES.md` (risque, probabilité, impact, parade) ;
- vérifier la **Definition of Done** de chaque phase ;
- résumer l'avancement à Harry en fin de phase : fait, reste à faire, décisions attendues de sa part.

Gate CP :
- [ ] Les livrables de la phase existent et sont à jour.
- [ ] Les décisions prises sont tracées dans `DECISIONS.md`.
- [ ] Aucune fonctionnalité hors MVP n'a été ajoutée sans validation.
- [ ] Les actions manuelles attendues de Harry sont listées étape par étape.

### 3.2 Ingénieur sécurité (SEC)

**Mission** : un attaquant ne peut ni lire les données d'un autre foyer, ni épuiser le service, ni injecter du contenu.

Modèle de menaces à couvrir (documenter dans `docs/SECURITE.md`) :

| Menace | Parade attendue |
|---|---|
| Force brute sur le code | Code à 6 chiffres aléatoire, TTL 10 min, **5 essais max par code**, code à usage unique. |
| Envoi massif de mails vers une adresse (mail bombing) | Au plus 5 demandes de code par email et par heure, avec des compteurs **persistants** (C7). |
| Épuisement du quota mail global | Plafond journalier applicatif (ex. 80) et contrôle `getRemainingDailyQuota()`. Au-delà, erreur `SERVICE_INDISPONIBLE` et alerte dans `Journal`. |
| Robots sur le formulaire email | Champ caché « honeypot » : s'il est rempli, on fait semblant d'accepter sans rien envoyer. Turnstile éventuel en v2 seulement. |
| Énumération des invités | Choix à faire valider : message explicite `EMAIL_INCONNU` (meilleure expérience) ou réponse identique dans tous les cas (plus sûr). Recommandation : explicite, risque jugé faible. Tracer la décision. |
| Vol ou rejeu de session | Token = UUID aléatoire, TTL 6 h, stocké en `sessionStorage`, invalidé au logout. Le token ne donne accès **qu'au foyer** associé. |
| Accès aux données d'un autre foyer | L'identité du foyer est **toujours** dérivée du token côté serveur, jamais d'un `foyer_id` envoyé par le client. |
| XSS (noms venant du Sheet, saisies) | Front : `textContent` uniquement, jamais `innerHTML` avec des données. Mail HTML : échapper toutes les valeurs. Balise CSP `<meta>` avec `default-src 'self'`, `connect-src` limité à `https://script.google.com` et `https://script.googleusercontent.com`. |
| Injection de formules dans le Sheet | Neutralisation C11 et longueurs maximales sur tous les champs libres. |
| Fuite de données via le dépôt public | `.gitignore` (`*.xlsx`, `*.csv` hors `sheet-templates/`, `data/`). Vérifier l'historique git avant la mise en ligne. |
| Partage accidentel du Sheet | Le Sheet n'est jamais partagé par lien. Accès nominatif pour les mariés uniquement. |
| Journal trop bavard | Ne jamais journaliser un code, un token ou une allergie. |

Gate SEC :
- [ ] Chaque menace du tableau a une parade implémentée **et testée** (§7).
- [ ] Aucune donnée personnelle ni adresse réelle dans le dépôt (`git log -p` vérifié).
- [ ] Aucune action ne fait confiance à un identifiant fourni par le client.
- [ ] La CSP est en place et ne casse pas le site.
- [ ] Les erreurs renvoyées au client ne contiennent ni trace technique ni contenu interne.

### 3.3 Ingénieur design (DES)

**Mission** : un parcours que l'oncle le moins à l'aise avec un téléphone réussit du premier coup.

Responsabilités :

- **Parcours** : `Accueil (infos)` → `Saisie email` → `Saisie code` → `Formulaire` → `Merci` (récapitulatif et bouton « Modifier ma réponse »). Tout tient dans une page unique, avec des écrans successifs.
- **Mobile d'abord** : cibles tactiles de 44 px minimum, champs larges, aucun défilement horizontal, testé à 360 px de large.
- **Champ code** : `inputmode="numeric"`, `autocomplete="one-time-code"`, `pattern="[0-9]{6}"`, un seul champ (pas six cases séparées). Coller le code doit fonctionner.
- **États** : chargement (C5 : « Envoi en cours… », bouton désactivé), erreur (message humain et action possible), succès, session expirée, réponses closes.
- **Accessibilité** : labels explicites, contraste AA, focus visible, navigation clavier complète, messages d'erreur reliés aux champs (`aria-describedby`), annonce des changements d'écran (`aria-live`).
- **Identité visuelle** : variables CSS (`--couleur-principale`, `--police-titres`…) avec des valeurs neutres par défaut. Les mariés choisiront couleurs, typographies et photos plus tard (§9). Pas de dépendance lourde : au plus une police Google Fonts.
- **Micro-textes** : ton chaleureux, vouvoiement par défaut (à confirmer), en français. Les messages d'erreur sont dans le §5.
- **Mail du code** : sobre et lisible sur mobile, code en gros, validité indiquée, signé des mariés.
- Livrer une **maquette** (capture ou page statique) des écrans clés avant de câbler l'API.

Gate DES :
- [ ] Le parcours complet se fait au pouce sur mobile, sans zoom.
- [ ] Chaque état (chargement, erreur, succès, expiré, clos) a été vu à l'écran.
- [ ] Navigation clavier et lecteur d'écran sur le formulaire vérifiés.
- [ ] Les textes ont été relus pour le ton et l'orthographe.
- [ ] Poids de la page inférieur à 1 Mo hors photos, photos compressées (moins de 300 Ko chacune).

### 3.4 Ingénieur data (DATA)

**Mission** : un Sheet propre, cohérent et exploitable par les mariés et le traiteur, sans retraitement.

Responsabilités :

- **Modèle de données** et dictionnaire (`docs/MODELE_DONNEES.md`) : nom, type, valeurs autorisées, obligatoire ou non, qui écrit la colonne (mariés ou script).
- **Proposition de schéma** (à affiner en Phase 1) :

  `Foyers` (saisi par les mariés) : `foyer_id` (F001…), `email`, `nom_affichage`, `personnes` (noms séparés par `;`), `places_max`, `invite_vin_honneur`, `invite_diner`, `invite_brunch` (oui/non), `notes_maries`

  `Reponses` (écrit par le script, une ligne par personne et par événement si la présence est par événement) : `foyer_id`, `personne`, `evenement`, `presence`, `regime`, `allergies`, `commentaire`, `maj_le`

  `Historique` (écrit par le script, en ajout seul) : copie horodatée de chaque soumission, pour l'audit et la reprise en cas d'erreur.

  `Config` (clé/valeur) : `NOM_MARIES`, `DATE_MARIAGE`, `DATE_LIMITE`, `EXPEDITEUR_NOM`, `REPLY_TO`, `URL_SITE`, `PLAFOND_MAILS_JOUR`

  `Journal` : `horodatage`, `email`, `action`, `resultat` (sans données sensibles)

  `Synthese` : formules uniquement (confirmés, absents, foyers sans réponse, régimes, liste des allergies pour le traiteur)

- Le script retrouve les colonnes **par nom d'en-tête**, jamais par position.
- **Normalisation** : email en `trim` et minuscules, valeurs contrôlées via listes déroulantes (validation de données) côté mariés, et revalidées côté script.
- **Idempotence** : une soumission remplace les lignes du foyer dans `Reponses` sous verrou. L'historique garde toutes les versions.
- **Contrôles qualité** : fonction `verifierDonnees()` exécutable depuis l'éditeur, qui signale les emails en double, les `foyer_id` en double ou vides, un `places_max` inférieur au nombre de personnes, des valeurs hors liste et des réponses orphelines.
- **Exports** : instructions pour l'export Excel des mariés et une vue « traiteur » (régimes et allergies uniquement).
- **Sauvegarde et rétention** : rappeler l'historique des versions de Google Sheets et prévoir un export hebdomadaire manuel. Fournir une fonction `purgerDonneesPostEvenement()` qui vide `Reponses`, `Historique` et `Journal`, avec confirmation.
- Fournir `sheet-templates/*.csv` avec les en-têtes et des lignes **fictives**, plus une fonction `initialiserSheet()` qui crée les onglets, en-têtes, validations et formules de `Synthese`.

Gate DATA :
- [ ] `initialiserSheet()` construit un Sheet complet à partir de rien.
- [ ] `verifierDonnees()` détecte chaque anomalie listée (testé avec des données volontairement fausses).
- [ ] Une double soumission ne crée aucun doublon dans `Reponses`.
- [ ] Les formules de `Synthese` donnent des totaux justes sur le jeu de test.
- [ ] Aucune donnée de santé hors de `Reponses` et `Historique`.

---

## 4. Structure du dépôt attendue

```
/
├── CLAUDE.md                  ← conventions courtes pour les futures sessions (créé en Phase 0)
├── LANCEMENT_PROJET.md        ← ce brief
├── README.md                  ← présentation et lien du site
├── index.html
├── assets/
│   ├── css/style.css
│   ├── img/
│   └── js/
│       ├── config.js          ← API_URL (/exec) : seul paramètre de déploiement
│       ├── api.js             ← fonction unique call(action, payload) et gestion de session
│       └── app.js             ← écrans et logique UI
├── apps-script/
│   ├── Code.gs                ← routage et actions
│   ├── Sheet.gs               ← accès données, initialiserSheet, verifierDonnees, purge
│   ├── Securite.gs            ← codes, tokens, compteurs, neutralisation des saisies
│   ├── Mail.gs                ← gabarit et envoi
│   ├── Tests.gs               ← fonctions de test exécutables depuis l'éditeur
│   └── appsscript.json
├── sheet-templates/           ← CSV fictifs
├── docs/
│   ├── BACKLOG.md
│   ├── DECISIONS.md
│   ├── RISQUES.md
│   ├── SECURITE.md
│   ├── MODELE_DONNEES.md
│   ├── RECETTE.md             ← plan de test et résultats
│   └── GUIDE_MARIES.md        ← mode d'emploi du Sheet pour les mariés (non technique)
└── .gitignore
```

Conventions : JavaScript vanilla en modules ES, aucun framework ni build. Interface en français. Code commenté en français, aux endroits non évidents uniquement.

---

## 5. Contrat d'API

Toutes les requêtes sont des POST vers `/exec`, avec le corps `{ "action": "...", ... }` en `text/plain`. Toutes les réponses ont la forme `{ ok: true, ... }` ou `{ ok: false, error: "CODE" }`.

| action | entrée | sortie ok |
|---|---|---|
| `ping` | — | `{ version }` |
| `requestCode` | `email`, `website` (honeypot, doit rester vide) | `{}` |
| `verifyCode` | `email`, `code` | `{ token, foyer, reponses, dateLimite, evenements }` |
| `getRsvp` | `token` | `{ foyer, reponses, dateLimite, evenements }` |
| `submitRsvp` | `token`, `reponses[]`, `commentaire` | `{ recap }` |
| `logout` | `token` | `{}` |

`foyer` renvoyé au client : `{ nom, personnes[], placesMax, invitations{} }`. Ne **jamais** renvoyer l'email, les notes des mariés ou le `foyer_id` interne s'il n'est pas utile.

Codes d'erreur et messages à afficher :

| error | message |
|---|---|
| `EMAIL_INCONNU` | Cette adresse n'est pas sur notre liste. Utilisez celle où vous avez reçu le faire-part, ou écrivez-nous. |
| `CODE_INVALIDE` | Code incorrect, vérifiez et réessayez. |
| `CODE_EXPIRE` | Ce code a expiré, demandez-en un nouveau. |
| `TROP_DE_TENTATIVES` | Trop de tentatives. Réessayez dans une heure ou écrivez-nous. |
| `SESSION_EXPIREE` | Votre session a expiré, reconnectez-vous. |
| `DATE_LIMITE_DEPASSEE` | Les réponses sont closes. Contactez-nous directement. |
| `DONNEES_INVALIDES` | Certaines informations sont incomplètes ou incorrectes. |
| `SERVICE_INDISPONIBLE` | Le service est très sollicité aujourd'hui, réessayez demain ou écrivez-nous. |
| `ERREUR_SERVEUR` / `RESEAU` | Petit souci technique, réessayez dans un instant. |

Le seul point d'appel réseau du front est `api.js` :

```javascript
export async function call(action, payload = {}) {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, ...payload }),
    });
    return res.ok ? await res.json() : { ok: false, error: 'ERREUR_SERVEUR' };
  } catch { return { ok: false, error: 'RESEAU' }; }
}
```

---

## 6. Phases et gates

Chaque phase se termine par : les gates des rôles concernés cochées, un résumé à Harry et un commit. **Ne passe pas à la phase suivante si une gate a un point bloquant.**

| Phase | Objet | Pilote | Gates requises |
|---|---|---|---|
| **P0 — Cadrage** | Créer la structure du dépôt, `CLAUDE.md` (conventions courtes renvoyant à ce brief), `BACKLOG`, `DECISIONS`, `RISQUES`, `.gitignore`. Poser à Harry les questions bloquantes du §9 (celles marquées ★). | CP | CP |
| **P1 — Données** | `MODELE_DONNEES.md`, CSV fictifs, `initialiserSheet()`, `verifierDonnees()`. Guider Harry pour créer le Sheet et exécuter l'initialisation. | DATA | DATA, SEC (données sensibles), CP |
| **P2 — Backend** | `Code.gs`, `Securite.gs`, `Mail.gs`, `Tests.gs`. Guider Harry pour autoriser le script et faire le premier déploiement. Valider avec `curl`. | SEC | SEC, DATA, CP |
| **P3 — Front** | Maquette validée par Harry, puis `index.html`, CSS et JS câblés sur l'API. | DES | DES, SEC (XSS, CSP), CP |
| **P4 — Recette** | Dérouler `RECETTE.md` (§7) et consigner les résultats. Faire une revue croisée des quatre rôles sur l'ensemble. | CP | Toutes |
| **P5 — Mise en ligne** | Activer GitHub Pages, mettre à jour `Config!URL_SITE`, vérifier l'historique git, faire un test de bout en bout sur l'URL publique, rédiger `GUIDE_MARIES.md`. | CP | Toutes |
| **P6 — Après l'événement** | Lancer la purge, désactiver le déploiement, archiver le dépôt. Documenté maintenant, exécuté plus tard. | DATA | DATA, SEC |

Actions **toujours** soumises à l'accord explicite de Harry : tout déploiement Apps Script, tout envoi de mail à une autre adresse que la sienne, l'activation de GitHub Pages, toute purge ou suppression de données, tout `git push --force`.

---

## 7. Plan de test (à formaliser dans `docs/RECETTE.md`)

### 7.1 Environnement de test

- Une ligne de test dans `Foyers` avec **l'adresse de Harry** (dans le Sheet uniquement, jamais dans le dépôt). Ajouter une ou deux autres adresses de Harry ou d'un proche consentant pour tester plusieurs foyers.
- `Tests.gs` lit l'adresse de test depuis les **Script Properties** (`EMAIL_TEST`), pas depuis le code.
- Front en local : `python3 -m http.server 8000`, puis `http://localhost:8000` (pas `file://`).
- API en ligne de commande : `curl -sL -H "Content-Type: text/plain" -d '{"action":"ping"}' "$URL"`.

### 7.2 Scénarios

**Fonctionnels**
- [ ] Parcours complet : email → code reçu → formulaire pré-rempli → envoi → récapitulatif.
- [ ] Modification d'une réponse : les lignes sont remplacées dans `Reponses`, une version est ajoutée à `Historique`.
- [ ] Rechargement de page : la session est conservée, puis perdue après le logout.
- [ ] Événements : seuls ceux où le foyer est invité sont proposés.
- [ ] `places_max` : impossible de déclarer plus de présents.
- [ ] Date limite dépassée : formulaire en lecture seule et message dédié.

**Sécurité**
- [ ] Email inconnu, email en majuscules ou avec espaces.
- [ ] 5 mauvais codes → blocage. Code réutilisé → refusé. Code de plus de 10 min → expiré.
- [ ] 6 demandes de code en 1 h → `TROP_DE_TENTATIVES`, y compris après vidage du cache (compteurs persistants).
- [ ] Honeypot rempli → aucun mail envoyé.
- [ ] Plafond mail atteint (abaisser temporairement `PLAFOND_MAILS_JOUR` à 1) → `SERVICE_INDISPONIBLE`.
- [ ] Token d'un foyer A avec un `foyer_id` B injecté dans la requête → les données de B ne sont ni lues ni écrites.
- [ ] Saisie `=IMPORTXML(...)`, `<script>alert(1)</script>` et texte de 5 000 caractères : stockés neutralisés et tronqués, affichés comme du texte.
- [ ] Console navigateur : aucune violation CSP en usage normal.

**Données**
- [ ] `verifierDonnees()` sur un jeu volontairement corrompu.
- [ ] Deux soumissions quasi simultanées (deux onglets) : aucune corruption, aucun doublon.
- [ ] Totaux de `Synthese` justes.

**Design et compatibilité**
- [ ] iPhone Safari, Android Chrome, Firefox et Edge sur ordinateur.
- [ ] Mail reçu et lisible sur Gmail, Outlook et iCloud, sans arriver en spam.
- [ ] Navigation clavier et lecteur d'écran sur le formulaire.

---

## 8. Passage à l'adresse mail des mariés (prévu, pas à faire maintenant)

L'architecture doit le permettre **sans toucher au front** :

1. **Minimal** : changer `EXPEDITEUR_NOM` et `REPLY_TO` dans `Config`. Le mail part du Gmail de Harry, les réponses arrivent chez les mariés.
2. **Alias** : l'adresse des mariés est ajoutée en alias « Envoyer en tant que » dans Gmail, puis on passe à `GmailApp.sendEmail(..., { from })`. Le prévoir derrière une clé `Config` `EXPEDITEUR_ADRESSE` (vide = MailApp).
3. **Cible** : compte Google dédié aux mariés. On leur transfère la propriété du Sheet, ils réautorisent et refont un nouveau déploiement depuis leur compte, et la nouvelle URL `/exec` va dans `config.js`. Documenter la procédure pas à pas dans `docs/MIGRATION_MAIL.md`.

---

## 9. Questions ouvertes (le CP les pose à Harry, ★ = bloquant pour P1)

- ★ Présence **par événement** (vin d'honneur, dîner, brunch) ou présence unique ?
- ★ Une adresse email par foyer, ou par personne ?
- ★ Gestion des « +1 » : faut-il demander le nom de l'accompagnant ?
- ★ Enfants : à compter à part (menu enfant, âge) ?
- Autres questions dans le formulaire : hébergement, navette, contrainte d'accessibilité, chanson pour la soirée ?
- Vouvoiement ou tutoiement ?
- Mail récapitulatif après la réponse : oui ou non ? Attention au quota C8.
- Relance automatique des foyers sans réponse, par déclencheur hebdomadaire ? Attention au quota.
- Identité visuelle : couleurs, typographies, photos, monogramme ?
- Nom de domaine personnalisé ?
- Date limite de réponse et date de mise en ligne visée ?

---

## 10. Pour démarrer

1. Lis entièrement ce fichier.
2. Annonce à Harry ta compréhension en 5 lignes maximum et le plan des phases.
3. Lance la **Phase 0**. Pose les questions ★ du §9 en un seul message, avec des options et une recommandation pour chacune, et avance sur ce qui n'en dépend pas.
