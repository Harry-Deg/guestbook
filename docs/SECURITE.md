# SECURITE — modèle de menaces et parades

État au 2026-10-18, fin de Phase 2 (backend).
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
| M1 | **Force brute sur le code** à 6 chiffres | Code aléatoire issu d'un UUID v4 (D19), TTL 10 min, **5 essais maximum par code**, code effacé dès qu'il est accepté ou épuisé | `Securite.gs` · `consommerCode_` | ✅ |
| M2 | **Mail bombing** d'une adresse d'invité | 5 demandes maximum par adresse et par heure, compteur **persistant** dans `PropertiesService` (C7), fenêtre glissante par horodatages | `Securite.gs` · `demandeAutorisee_` | ✅ |
| M3 | **Épuisement du quota mail global** | Plafond applicatif `PLAFOND_MAILS_JOUR` (80) **et** contrôle de `MailApp.getRemainingDailyQuota()` avant chaque envoi ; au-delà, `SERVICE_INDISPONIBLE` et alerte dans `Journal` ; avertissement anticipé à 10 envois restants | `Mail.gs` · `verifierQuotaMail_` | ✅ |
| M4 | **Robots sur le formulaire email** | Champ caché « honeypot » : s'il est rempli, la réponse est indiscernable d'un succès et **aucun mail ne part** | `Code.gs` · `actionRequestCode_` | ✅ |
| M5 | **Énumération des invités** | Message explicite `EMAIL_INCONNU` assumé (D04). Le plafond horaire est consommé **avant** la recherche du foyer, donc un robot ne peut pas sonder plus de 5 adresses par heure et par adresse testée | `Code.gs` · `actionRequestCode_` | ✅ |
| M6 | **Vol ou rejeu de session** | Token = UUID v4, TTL 6 h, stocké **haché** côté serveur (D18), en `sessionStorage` côté client, invalidé au logout. Donne accès au seul foyer associé | `Securite.gs` · `ouvrirSession_` | ✅ |
| M7 | **Accès aux données d'un autre foyer** | `foyerDeSession_(token)` est la **seule** source d'un `foyer_id`. Aucune action ne lit un identifiant venu du client — vérifié par test en injectant `foyer_id`, `foyerId` et `foyer` dans la requête | `Code.gs`, `Securite.gs` | ✅ |
| M8 | **Le client réécrit des données du Sheet** (renomme un invité, se déclare enfant, se déclare accompagnant) | Les noms sont rapprochés de l'onglet `Invites` et **réécrits depuis le Sheet** ; `type_personne` et `est_accompagnant` sont imposés par le serveur | `Code.gs` · `actionSubmitRsvp_` | ✅ |
| M9 | **XSS** (noms venant du Sheet, saisies d'invités) | Front : `textContent` uniquement, jamais `innerHTML` avec des données. Mail HTML : `echapperHtml_` sur toute valeur insérée. CSP par balise `<meta>` | `Mail.gs` · `echapperHtml_` ; front | ✅ mail · ⏳ front (P3) |
| M10 | **Injection de formules dans le Sheet** | `assainirTexte_` sur toute saisie libre : retrait des caractères de contrôle, troncature, puis apostrophe devant `=` `+` `-` `@`, y compris masqués par des espaces | `Securite.gs` · `neutraliserFormule_` | ✅ |
| M11 | **Écritures concurrentes / doublons** | `LockService` sur toute écriture, réécriture complète et idempotente des lignes du foyer, `Historique` en ajout seul | `Sheet.gs` · `ecrireReponsesFoyer_` | ✅ |
| M12 | **Fuite de données par le dépôt public** | `.gitignore` strict, aucune adresse réelle (tout est en `@example.com`), adresse de test dans la Script Property `EMAIL_TEST`, historique git vérifié | dépôt | ✅ |
| M13 | **Partage accidentel du Sheet** | Jamais de partage par lien ; accès nominatif aux mariés. Rappelé dans `INSTALLATION.md` et à venir dans `GUIDE_MARIES.md` | procédure | 🔶 |
| M14 | **Journal trop bavard** | Aucun code, token, régime, allergie ni commentaire dans `Journal` — vérifié par test | `Sheet.gs` · `journaliser_` | ✅ |
| M15 | **Fuite technique dans une réponse d'erreur** | Toute exception inattendue devient `ERREUR_SERVEUR` ; la trace reste dans le journal d'exécution Google. Vérifié en cassant volontairement le classeur | `Code.gs` · `doPost` | ✅ |
| M16 | **Requête malformée ou volumineuse** | Corps plafonné à 20 000 caractères, JSON validé, action cherchée avec `hasOwnProperty` (une action nommée `constructor` ou `__proto__` n'est pas routable) | `Code.gs` · `doPost` | ✅ |
| M17 | **Dépassement de `places_max`** | Nombre de présents et nombre d'accompagnants contrôlés côté serveur, pas seulement dans l'interface | `Code.gs` · `actionSubmitRsvp_` | ✅ |
| M18 | **Réponses après la date limite** | `DATE_LIMITE` lue dans `Config` à chaque soumission ; la consultation reste possible, l'écriture non | `Code.gs` · `reponsesOuvertes_` | ✅ |

## 4. Décisions de sécurité et risques acceptés

| # | Décision | Risque accepté |
|---|---|---|
| D04 | Message `EMAIL_INCONNU` explicite plutôt qu'une réponse uniforme | Un attaquant qui possède déjà une adresse peut confirmer qu'elle est invitée. Jugé faible devant le coût en expérience utilisateur. |
| D08 | Plusieurs adresses par foyer | Le plafond horaire est **par adresse** : un foyer à 3 adresses peut recevoir 3 × 5 codes par heure. Le plafond journalier global reste la vraie protection. |
| D14 | Adresse git personnelle publique | Collecte automatisée de l'adresse de Harry sur GitHub. Sans effet sur les données des invités. |
| D15 | Portée OAuth `spreadsheets` au lieu de `spreadsheets.currentonly` | Le script peut techniquement accéder aux autres classeurs du compte. Il n'en ouvre qu'un seul, et il appartient à Harry. |
| — | Codes à 6 chiffres | 1 chance sur 200 000 de deviner en 5 essais, sur une fenêtre de 10 minutes. Suffisant pour l'enjeu. |

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
