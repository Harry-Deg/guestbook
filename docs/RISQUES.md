# RISQUES

Probabilité et impact : `faible` · `moyen` · `élevé`.
Statut : `ouvert` · `paré` (parade implémentée et testée) · `accepté` · `clos`.

| # | Risque | Prob. | Impact | Parade | Phase | Statut |
|---|---|---|---|---|---|---|
| R01 | Les mails de code partent en spam : les invités ne peuvent pas répondre | élevée | élevé | Sujet sobre, corps texte court, pas de lien raccourci, `REPLY_TO` réel ; test Gmail / Outlook / iCloud ; consigne « vérifiez vos spams » affichée à l'écran et sur le faire-part | P2/P4 | ouvert — **risque le plus élevé du projet**, ne peut être levé que par un envoi réel |
| R02 | Quota MailApp (~100 destinataires/jour) épuisé le jour de l'envoi des faire-part | élevée | élevé | Plafond applicatif `PLAFOND_MAILS_JOUR` (80), contrôle `getRemainingDailyQuota()`, erreur `SERVICE_INDISPONIBLE` + alerte `Journal` ; conseiller à Harry d'étaler les envois de faire-part sur plusieurs jours | P2 | paré côté code ; l'étalement des envois est une consigne, `INSTALLATION.md` §5.6 |
| R03 | Donnée réelle d'invité poussée dans le dépôt public | moyenne | élevé | `.gitignore` strict, aucune adresse réelle en exemple, revue `git log -p` avant P5, `EMAIL_TEST` en Script Property | P0→P5 | paré (à revérifier en P5) |
| R04 | Fuite de données entre foyers (accès aux réponses d'un autre foyer) | faible | élevé | Le `foyer_id` est dérivé du token côté serveur ; test dédié en P4 (injection d'un `foyer_id` tiers) | P2/P4 | paré (182 contrôles ; isolation confirmée ligne à ligne par la revue croisée P4) |
| R05 | Mail bombing d'une adresse d'invité | moyenne | moyen | 5 demandes max par email et par heure, compteurs persistants, honeypot | P2 | paré |
| R06 | Corruption du Sheet par écritures concurrentes (deux onglets, deux membres du foyer) | moyenne | élevé | `LockService` sur toute écriture, réécriture idempotente du foyer, `Historique` en ajout seul | P2/P4 | paré (concurrence réelle à vérifier en §3.4 de `RECETTE.md`) |
| R07 | Injection de formule depuis une saisie libre (`=IMPORTXML(...)`) exfiltrant le Sheet | moyenne | élevé | Neutralisation des caractères `= + - @` en tête, longueurs maximales | P2 | paré |
| R08 | XSS via un nom saisi par les mariés ou un commentaire d'invité | faible | élevé | `textContent` exclusivement côté front, échappement dans le mail HTML, CSP par balise `<meta>` | P3 | paré (analyse statique ; à confirmer en navigateur réel, §4 de `RECETTE.md`) |
| R09 | Oubli de redéploiement après modification de `Code.gs` : le site appelle l'ancienne version | élevée | moyen | Action `ping` renvoyant une `version` ; procédure de déploiement écrite ; vérifier la version après chaque livraison | P2 | paré |
| R10 | Démarrage à froid de 1 à 4 s perçu comme un plantage, l'invité clique plusieurs fois | élevée | moyen | Bouton désactivé pendant l'appel, texte « Envoi en cours… », requêtes idempotentes | P3 | paré |
| R11 | Le Sheet est partagé par lien et devient public | faible | élevé | Jamais de partage par lien, accès nominatif aux mariés uniquement, rappel dans `GUIDE_MARIES.md` | P5 | paré (`GUIDE_MARIES.md` écrit) |
| R12 | Données de santé (allergies) conservées après l'événement — RGPD | élevée | moyen | Minimisation des champs, allergies confinées à `Reponses`/`Historique`/`Traiteur`, `purgerDonneesPostEvenement()` écrite et à double confirmation, mention d'information sur le formulaire (P3) | P1/P6 | paré (purge à exécuter en P6) |
| R13 | Le compte Google de Harry devient indisponible (vacances, perte d'accès) juste avant l'événement | faible | élevé | Procédure de reprise dans `MIGRATION_MAIL.md` §4, export hebdomadaire du Sheet (`GUIDE_MARIES.md`) | P5 | paré (`MIGRATION_MAIL.md` écrit) |
| R14 | Un invité ne reçoit jamais son code (adresse erronée dans `Foyers`) | élevée | moyen | `verifierDonnees()` signale les emails invalides ou en double ; canal de contact direct affiché sur chaque écran d'erreur | P1/P3 | paré |
| R15 | Dérive de périmètre : ajout de fonctionnalités v2 avant la livraison du MVP | moyenne | moyen | `BACKLOG.md` figé par phase, gate CP à chaque fin de phase | toutes | paré |
| R16 | Les mariés modifient le Sheet et cassent les en-têtes ou les formules | moyenne | élevé | Recherche des colonnes par nom d'en-tête, `verifierEntetes_()` qui échoue explicitement, protection « avertissement » sur les onglets écrits par le script, menu `Mariage` → Vérifier les données, `initialiserSheet()` relançable pour réparer | P1/P5 | paré (`GUIDE_MARIES.md` écrit) |

## Risques ajoutés après la revue sécurité du 2026-10-18

| # | Risque | Prob. | Impact | Parade | Phase | Statut |
|---|---|---|---|---|---|---|
| R17 | Exfiltration du Sheet par injection de formule dans un champ non assaini | moyenne | élevé | Les trois points d'écriture de données client passent par `assainirTexte_` ; colonnes sensibles en format texte ; test de régression dédié | P2 | paré |
| R18 | Plafonds anti-abus franchis par requêtes concurrentes | moyenne | élevé | `LockService` sur tous les compteurs ; créneau d'envoi réservé avant l'envoi | P2 | paré (concurrence réelle à vérifier en §3.4 de `RECETTE.md`) |
| R19 | Saturation définitive de `PropertiesService` bloquant toute connexion | faible | élevé | Aucune clé par adresse inconnue, compteur global unique, balayage en une écriture, échec propre si saturation | P2 | paré |
| R20 | `Historique` atteint la taille maximale de la feuille en pleine campagne de réponses | élevée | élevé | `assurerLignes_()` avant chaque écriture, alerte de `verifierDonnees()` à 80 % | P2 | paré |
| R21 | Un nom mal saisi dans `Invites` (espace insécable, trop long) rend un foyer incapable de répondre | moyenne | moyen | Clé d'appariement unique des deux côtés, signalée en **erreur** par `verifierDonnees()` | P2 | paré |
| R22 | Une protection anti-abus dégrade le service des invités légitimes | moyenne | élevé | Règle D21 : tout plafond global est placé sur une branche d'échec, jamais sur le chemin nominal. À revérifier à chaque ajout de protection | toutes | paré |


## Risques ajoutés après la revue croisée du 2026-10-19 (P4)

| # | Risque | Prob. | Impact | Parade | Phase | Statut |
|---|---|---|---|---|---|---|
| R23 | Une adresse personnelle reste dans l'**historique git** après la mise en ligne | moyenne | moyen | L'adresse a quitté le code (servie par l'API depuis `Config`), mais deux commits la portent encore. Purge de l'historique **avant** le premier `git push` : `INSTALLATION.md` §5.1 | P5 | ouvert — 🖐 action de Harry |
| R24 | Une valeur de `Config` saisie au format français (`30/04/2027`) désactive silencieusement la date limite | moyenne | moyen | `verifierDonnees()` la signale ; échec ouvert plutôt que blocage ; alerte au `Journal` une fois par jour, plus une par visiteur (§8 A-1) | P2/P5 | paré |
| R25 | Le site publié et l'onglet `Config` se contredisent (date, lieu, nom) : rien ne les synchronise | moyenne | moyen | Tableau de correspondance à vérifier avant publication, `INSTALLATION.md` §5.2 | P5 | ouvert — dépend du contenu réel |
| R26 | Un invité tombe sur `maquette.html` et croit répondre | faible | moyen | `noindex`, bandeau d'avertissement en tête de page. La supprimer avant la mise en ligne reste l'option la plus sûre | P5 | accepté |
