# CLAUDE.md — conventions du projet

> Brief complet et faisant autorité : **`LANCEMENT_PROJET.md`**. Lis-le avant toute modification
> non triviale. Ce fichier n'est qu'un rappel court des conventions.

## Nature du projet
Site RSVP de mariage. Front statique (GitHub Pages, dépôt **public**) + backend Google Apps Script
+ Google Sheet comme base de données. Aucun build, aucun framework, aucun serveur.

## Règles non négociables
1. **Aucun secret, aucune donnée réelle d'invité** dans le dépôt, ni dans l'historique git.
   Pas d'email réel, même en exemple : utiliser `prenom.nom@example.com`.
2. Le front n'appelle le réseau **que** via `assets/js/api.js` (`call(action, payload)`),
   en `Content-Type: text/plain;charset=utf-8`, jamais d'en-tête personnalisé (pas de preflight CORS).
3. Côté serveur, le **foyer est toujours dérivé du token**. Un `foyer_id` envoyé par le client est ignoré.
4. Toute écriture dans le Sheet passe par `LockService` et doit être **idempotente**.
5. Les colonnes du Sheet se retrouvent **par nom d'en-tête**, jamais par index.
6. Toute saisie libre est : tronquée (longueur max), neutralisée contre l'injection de formules
   (`= + - @` en tête de chaîne), et affichée côté front avec `textContent` — **jamais** `innerHTML`.
7. Les compteurs anti-abus vivent dans `PropertiesService` (pas `CacheService`, évincible).
8. Ne jamais journaliser un code, un token, une allergie ou un régime.
9. Apps Script répond **toujours** HTTP 200 : les erreurs sont dans le corps `{ ok:false, error:"CODE" }`.

## Conventions de code
- JavaScript vanilla, **modules ES** (`<script type="module">`). Pas de dépendance npm.
- Apps Script : ES5/ES6 supporté par V8, un fichier par domaine (`Code`, `Sheet`, `Securite`, `Mail`, `Tests`).
- Interface, messages et documentation **en français**. Commentaires en français, uniquement là où le
  code n'est pas évident.
- Nommage : `camelCase` en JS, `snake_case` pour les en-têtes de colonnes du Sheet.
- Les codes d'erreur de l'API sont en MAJUSCULES_SNAKE et listés au §5 du brief.

## Actions nécessitant l'accord explicite de Harry
Déploiement Apps Script, envoi de mail à une adresse autre que la sienne, activation de GitHub Pages,
purge ou suppression de données, `git push --force`.

## Documents vivants à tenir à jour
`docs/BACKLOG.md`, `docs/DECISIONS.md`, `docs/RISQUES.md`, `docs/SECURITE.md`,
`docs/MODELE_DONNEES.md`, `docs/RECETTE.md`, `docs/GUIDE_MARIES.md`.
