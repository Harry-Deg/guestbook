# Site RSVP de mariage

Site web permettant aux invités de consulter les informations pratiques et de confirmer leur présence,
sans mot de passe : un code à 6 chiffres reçu par email suffit.

- **Front** : HTML/CSS/JavaScript vanilla, hébergé sur GitHub Pages. Aucun build, aucune dépendance.
- **Backend** : Google Apps Script (application web) — codes de connexion, sessions, lecture et écriture.
- **Base de données** : Google Sheet, exportable en Excel par les mariés.

> **Dépôt public** : il ne contient ni secret, ni adresse email réelle, ni donnée d'invité.

## Documentation

| Fichier | Contenu |
|---|---|
| [`LANCEMENT_PROJET.md`](LANCEMENT_PROJET.md) | Brief complet : architecture, contraintes, rôles, phases |
| [`CLAUDE.md`](CLAUDE.md) | Conventions de code et règles non négociables |
| [`docs/BACKLOG.md`](docs/BACKLOG.md) | Périmètre MVP et v2 |
| [`docs/DECISIONS.md`](docs/DECISIONS.md) | Journal daté des décisions |
| [`docs/RISQUES.md`](docs/RISQUES.md) | Risques, impacts et parades |

## Développement local

```bash
python3 -m http.server 8000
# puis http://localhost:8000  (ne pas ouvrir en file://, les modules ES seraient bloqués)
```

Le seul paramètre de déploiement est l'URL `/exec` du script, dans `assets/js/config.js`.

## État du projet

Phase 0 (cadrage) terminée. Phases suivantes : données, backend, front, recette, mise en ligne.
