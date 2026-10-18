# BACKLOG

Statuts : `à faire` · `en cours` · `fait` · `reporté v2` · `abandonné`

## MVP (indispensable avant l'envoi des faire-part)

| # | Fonctionnalité | Phase | Statut |
|---|---|---|---|
| M1 | Structure du dépôt, conventions, documents de pilotage | P0 | fait |
| M2 | Modèle de données + CSV modèles + `initialiserSheet()` | P1 | fait (à exécuter par Harry) |
| M3 | `verifierDonnees()` (contrôles qualité du Sheet) | P1 | fait (testé hors ligne) |
| M4 | Routage Apps Script (`doPost`, action `ping`) | P2 | à faire |
| M5 | `requestCode` : code 6 chiffres, TTL 10 min, honeypot, anti-abus | P2 | à faire |
| M6 | Envoi du mail de code (gabarit sobre, quota vérifié) | P2 | à faire |
| M7 | `verifyCode` : 5 essais max, usage unique, création du token | P2 | à faire |
| M8 | `getRsvp` / `submitRsvp` / `logout` | P2 | à faire |
| M9 | Écriture idempotente sous verrou + `Historique` | P2 | à faire |
| M10 | Page d'informations pratiques (date, lieux, programme, accès) | P3 | à faire |
| M11 | Écrans : email → code → formulaire → merci | P3 | à faire |
| M12 | États chargement / erreur / succès / session expirée / clos | P3 | à faire |
| M13 | Accessibilité (clavier, contraste AA, `aria-live`, labels) | P3 | à faire |
| M14 | CSP par balise `<meta>` | P3 | à faire |
| M15 | Onglet `Synthese` (formules de totaux) + vue traiteur | P1/P4 | fait (totaux à valider sur le vrai Sheet) |
| M16 | Recette complète consignée dans `RECETTE.md` | P4 | à faire |
| M17 | Mise en ligne GitHub Pages + test de bout en bout | P5 | à faire |
| M18 | `GUIDE_MARIES.md` (mode d'emploi non technique) | P5 | à faire |
| M19 | `purgerDonneesPostEvenement()` documentée | P1/P6 | fait (exécution en P6) |

## v2 (seulement si le MVP est livré et validé)

| # | Fonctionnalité | Statut |
|---|---|---|
| V1 | Mail récapitulatif après la réponse | à décider (quota C8) |
| V2 | Relance automatique des foyers sans réponse (déclencheur hebdomadaire) | à décider (quota C8) |
| V3 | Cloudflare Turnstile sur le formulaire email | reporté v2 |
| V4 | Questions complémentaires (hébergement, navette, chanson, accessibilité) | à décider |
| V5 | Galerie photos / identité visuelle des mariés | à décider |
| V6 | Nom de domaine personnalisé | à décider |
| V7 | Migration vers l'adresse mail des mariés (`MIGRATION_MAIL.md`) | prévu, post-MVP |
| V8 | Internationalisation (anglais) | abandonné sauf demande |

## Hors périmètre explicite
- Paiement, cagnotte, liste de mariage.
- Comptes utilisateurs avec mot de passe.
- Back-office web : les mariés travaillent directement dans le Sheet.
