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
