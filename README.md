# Site RSVP de mariage

Site web permettant aux invités de consulter les informations pratiques et de confirmer leur présence,
sans mot de passe : un code à 6 chiffres reçu par email suffit.

- **Front** : HTML/CSS/JavaScript vanilla, hébergé sur GitHub Pages. Aucun build, aucune dépendance.
- **Backend** : Google Apps Script (application web) — codes de connexion, sessions, lecture et écriture.
- **Base de données** : Google Sheet, exportable en Excel par les mariés.

> **Dépôt public** : il ne contient ni secret, ni adresse email réelle, ni donnée d'invité.

## Les deux pages

| Page | Rôle |
|---|---|
| [`invitation.html`](invitation.html) | **Le lien qu'on envoie aux invités** par WhatsApp ou SMS. Enveloppe à ouvrir, faire-part, compte à rebours, plan, programme. Renvoie vers le RSVP. |
| [`index.html`](index.html) | Connexion par code et formulaire de réponse. |

Tout le contenu de l'invitation (noms, date, lieu, horaires, textes FR et EN) est dans
[`assets/js/invitation.config.js`](assets/js/invitation.config.js) — un seul fichier à
modifier, sans toucher au HTML.

## Documentation

| Fichier | Contenu |
|---|---|
| [`LANCEMENT_PROJET.md`](LANCEMENT_PROJET.md) | Brief complet : architecture, contraintes, rôles, phases |
| [`CLAUDE.md`](CLAUDE.md) | Conventions de code et règles non négociables |
| [`docs/INSTALLATION.md`](docs/INSTALLATION.md) | Procédure pas à pas, de la création du classeur à la mise en ligne |
| [`docs/GUIDE_MARIES.md`](docs/GUIDE_MARIES.md) | Mode d'emploi du classeur pour Alec et Gloria |
| [`docs/RECETTE.md`](docs/RECETTE.md) | Plan de recette et résultats consignés |
| [`docs/SECURITE.md`](docs/SECURITE.md) | Menaces, parades et revues indépendantes |
| [`docs/MODELE_DONNEES.md`](docs/MODELE_DONNEES.md) | Onglets, colonnes et contrat d'API |
| [`docs/BACKLOG.md`](docs/BACKLOG.md) | Périmètre MVP et v2 |
| [`docs/DECISIONS.md`](docs/DECISIONS.md) | Journal daté des décisions |
| [`docs/RISQUES.md`](docs/RISQUES.md) | Risques, impacts et parades |
| [`docs/MIGRATION_MAIL.md`](docs/MIGRATION_MAIL.md) | Passer l'envoi des mails au compte des mariés |

## Développement local

```bash
python3 -m http.server 8000
# puis http://localhost:8000  (ne pas ouvrir en file://, les modules ES seraient bloqués)
```

Le seul paramètre de déploiement est l'URL `/exec` du script, dans `assets/js/config.js`.
C'est la **seule** valeur de configuration présente dans ce dépôt : le nom des mariés, les
dates et l'adresse de contact vivent dans l'onglet `Config` du classeur, et le serveur les
renvoie au site. Les mariés peuvent donc les changer sans toucher au code.

## État du projet

| Phase | État |
|---|---|
| P0 — cadrage, décisions, risques | ✅ |
| P1 — modèle de données et classeur | ✅ |
| P2 — backend Apps Script, déployé et vérifié de l'extérieur | ✅ |
| P3 — front : maquette, intégration, câblage | ✅ |
| P4 — recette et revues croisées | 🔶 revues faites et corrigées ; recette manuelle à dérouler |
| P5 — mise en ligne | ⏳ procédure écrite, en attente de l'activation de Pages |

Deux revues indépendantes ont été menées (backend en P2, croisée des quatre rôles en P4) ;
leurs constats et les corrections apportées sont consignés dans
[`docs/SECURITE.md`](docs/SECURITE.md) §7 et §8.
