# RISQUES

Probabilité et impact : `faible` · `moyen` · `élevé`.
Statut : `ouvert` · `paré` (parade implémentée et testée) · `accepté` · `clos`.

| # | Risque | Prob. | Impact | Parade | Phase | Statut |
|---|---|---|---|---|---|---|
| R01 | Les mails de code partent en spam : les invités ne peuvent pas répondre | élevée | élevé | Sujet sobre, corps texte court, pas de lien raccourci, `REPLY_TO` réel ; test Gmail / Outlook / iCloud ; consigne « vérifiez vos spams » affichée à l'écran et sur le faire-part | P2/P4 | ouvert |
| R02 | Quota MailApp (~100 destinataires/jour) épuisé le jour de l'envoi des faire-part | élevée | élevé | Plafond applicatif `PLAFOND_MAILS_JOUR` (80), contrôle `getRemainingDailyQuota()`, erreur `SERVICE_INDISPONIBLE` + alerte `Journal` ; conseiller à Harry d'étaler les envois de faire-part sur plusieurs jours | P2 | ouvert |
| R03 | Donnée réelle d'invité poussée dans le dépôt public | moyenne | élevé | `.gitignore` strict, aucune adresse réelle en exemple, revue `git log -p` avant P5, `EMAIL_TEST` en Script Property | P0→P5 | paré (à revérifier en P5) |
| R04 | Fuite de données entre foyers (accès aux réponses d'un autre foyer) | faible | élevé | Le `foyer_id` est dérivé du token côté serveur ; test dédié en P4 (injection d'un `foyer_id` tiers) | P2/P4 | ouvert |
| R05 | Mail bombing d'une adresse d'invité | moyenne | moyen | 5 demandes max par email et par heure, compteurs persistants, honeypot | P2 | ouvert |
| R06 | Corruption du Sheet par écritures concurrentes (deux onglets, deux membres du foyer) | moyenne | élevé | `LockService` sur toute écriture, réécriture idempotente du foyer, `Historique` en ajout seul | P2/P4 | ouvert |
| R07 | Injection de formule depuis une saisie libre (`=IMPORTXML(...)`) exfiltrant le Sheet | moyenne | élevé | Neutralisation des caractères `= + - @` en tête, longueurs maximales | P2 | ouvert |
| R08 | XSS via un nom saisi par les mariés ou un commentaire d'invité | faible | élevé | `textContent` exclusivement côté front, échappement dans le mail HTML, CSP par balise `<meta>` | P3 | ouvert |
| R09 | Oubli de redéploiement après modification de `Code.gs` : le site appelle l'ancienne version | élevée | moyen | Action `ping` renvoyant une `version` ; procédure de déploiement écrite ; vérifier la version après chaque livraison | P2 | ouvert |
| R10 | Démarrage à froid de 1 à 4 s perçu comme un plantage, l'invité clique plusieurs fois | élevée | moyen | Bouton désactivé pendant l'appel, texte « Envoi en cours… », requêtes idempotentes | P3 | ouvert |
| R11 | Le Sheet est partagé par lien et devient public | faible | élevé | Jamais de partage par lien, accès nominatif aux mariés uniquement, rappel dans `GUIDE_MARIES.md` | P5 | ouvert |
| R12 | Données de santé (allergies) conservées après l'événement — RGPD | élevée | moyen | Minimisation des champs, allergies confinées à `Reponses`/`Historique`/`Traiteur`, `purgerDonneesPostEvenement()` écrite et à double confirmation, mention d'information sur le formulaire (P3) | P1/P6 | paré (purge à exécuter en P6) |
| R13 | Le compte Google de Harry devient indisponible (vacances, perte d'accès) juste avant l'événement | faible | élevé | Documenter la procédure de reprise (§8 du brief) dans `MIGRATION_MAIL.md`, export hebdomadaire du Sheet | P5 | ouvert |
| R14 | Un invité ne reçoit jamais son code (adresse erronée dans `Foyers`) | élevée | moyen | `verifierDonnees()` signale les emails invalides ou en double ; canal de contact direct affiché sur chaque écran d'erreur | P1/P3 | ouvert |
| R15 | Dérive de périmètre : ajout de fonctionnalités v2 avant la livraison du MVP | moyenne | moyen | `BACKLOG.md` figé par phase, gate CP à chaque fin de phase | toutes | paré |
| R16 | Les mariés modifient le Sheet et cassent les en-têtes ou les formules | moyenne | élevé | Recherche des colonnes par nom d'en-tête, `verifierEntetes_()` qui échoue explicitement, protection « avertissement » sur les onglets écrits par le script, menu `Mariage` → Vérifier les données, `initialiserSheet()` relançable pour réparer | P1/P5 | paré (consignes `GUIDE_MARIES.md` en P5) |
