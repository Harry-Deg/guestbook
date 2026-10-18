# RECETTE — plan de test et résultats

Statuts : ✅ passé · ❌ échoué · ⏳ pas encore exécutable · 🖐 demande une action manuelle de Harry.

---

## 1. Environnement de test

| Élément | Où |
|---|---|
| Foyers de test | Dans le Sheet uniquement, avec les adresses de Harry. **Jamais dans le dépôt** (C1). |
| Adresse de test du script | Script Property `EMAIL_TEST` (Paramètres du projet → Propriétés du script). |
| Front en local | `python3 -m http.server 8000` puis `http://localhost:8000` — pas `file://`, les modules ES seraient bloqués. |
| API en ligne de commande | `curl -sL -H "Content-Type: text/plain" -d '{"action":"ping"}' "$URL"` — le `-L` est indispensable (C4). |

### Tests exécutables depuis l'éditeur Apps Script

| Fonction | Effet de bord | Quand |
|---|---|---|
| `testerFonctionsPures()` | aucun | après chaque modification du code |
| `apercuMailCode()` | aucun — affiche le mail sans l'envoyer | pour relire le texte du mail |
| `verifierDonnees()` | aucun | après chaque saisie dans le Sheet |
| `testerParcoursComplet()` | **envoie un mail**, écrit dans `Reponses` | sur un foyer de test |
| `testerIsolationFoyer()` | écrit dans `Reponses` | sur un foyer de test |
| `testerAntiAbus()` | **envoie jusqu'à 5 mails**, bloque l'adresse 1 h | sur un foyer de test |
| `reinitialiserCompteurDeTest()` | débloque l'adresse de test | pour enchaîner les tests |

---

## 2. Tests automatisés déjà exécutés

### 2.1 Contrôles qualité des données (Phase 1)

Exécutés hors Google sur un simulateur, avec deux jeux de données.

| Jeu | Attendu | Résultat |
|---|---|---|
| Jeu volontairement corrompu (foyer_id en double, email mal formé, type hors liste, réponse orpheline, `places_max` insuffisant, âge hors bornes, régime inconnu, clé `Config` manquante, date au mauvais format…) | toutes les anomalies détectées | ✅ **26 erreurs et 7 avertissements**, tous attendus |
| Jeu sain | aucune anomalie | ✅ 0 / 0 |
| CSV modèles du dépôt | aucune anomalie | ✅ 0 / 0 |

### 2.2 Backend (Phase 2) — **122 contrôles, 122 passés**

Exécutés hors Google sur un simulateur reproduisant `SpreadsheetApp`, `CacheService`,
`PropertiesService`, `MailApp`, `LockService`, `ContentService` et `Utilities`, avec une
horloge contrôlable pour tester les expirations.

| Famille | Contrôles | Résultat |
|---|---|---|
| Routage et contrat d'API (`ping`, action inconnue, corps non JSON, corps vide, corps géant, action héritée du prototype, `doGet`) | 11 | ✅ |
| Parcours nominal (demande → mail → code → formulaire → envoi → relecture → logout) | 22 | ✅ |
| Modification d'une réponse et idempotence (triple soumission, modification, écriture d'un autre foyer) | 6 | ✅ |
| Codes : 5 essais, blocage, expiration à 10 min, usage unique, invalidation du code précédent | 13 | ✅ |
| Sessions : token vide, absent, inventé, tronqué, expiration à 6 h | 7 | ✅ |
| Isolation entre foyers (`foyer_id` injecté dans la requête) | 3 | ✅ |
| Validation des soumissions (liste vide, personne manquante, doublon, régime inconnu, âge, accompagnants, `places_max`) | 13 | ✅ |
| Le client ne peut pas réécrire ce qui vient du Sheet (nom, type, statut d'accompagnant) | 3 | ✅ |
| Injection de formules et textes hostiles (`=IMPORTXML`, `@SUM`, `-5+5`, `<script>`, 6 000 caractères) | 7 | ✅ |
| Anti-abus (honeypot, adresse inconnue, plafond horaire, **survie au vidage du cache**, déblocage après 1 h) | 10 | ✅ |
| Plafond d'envoi journalier et quota Google épuisé | 5 | ✅ |
| Date limite dépassée | 4 | ✅ |
| Journal sans donnée sensible (code, token, allergies, régime, commentaire) | 7 | ✅ |
| Robustesse face à un classeur cassé (onglet supprimé) | 7 | ✅ |

> Ces tests s'exécutent sur un **simulateur**, pas sur Google. Ils prouvent la logique,
> pas le comportement de l'infrastructure. Tout ce qui dépend réellement de Google est
> repris ci-dessous en §3 et §4.

---

## 3. À exécuter dans Apps Script — Phase 2 🖐

Après le premier déploiement.

### 3.1 Déploiement

- [ ] `curl -sL -d '{"action":"ping"}' "$URL"` renvoie `{"ok":true,"version":"0.2.0",...}`.
- [ ] L'URL ouverte dans un navigateur affiche le JSON de `doGet` (vérifie que le déploiement est bien à jour, R09).
- [ ] Après une modification de code **sans** nouvelle version, `ping` renvoie l'ancienne `version` : confirme qu'un redéploiement est nécessaire (C12).

### 3.2 Fonctions de test

- [ ] `testerFonctionsPures()` : 0 échec.
- [ ] `apercuMailCode()` : le texte est relu et validé.
- [ ] `testerParcoursComplet()` : 0 échec, un mail reçu.
- [ ] `testerIsolationFoyer()` : 0 échec.
- [ ] `testerAntiAbus()` : 0 échec.

### 3.3 Mail réel (C15, R01)

- [ ] Reçu sur **Gmail** — pas en spam.
- [ ] Reçu sur **Outlook / Hotmail** — pas en spam.
- [ ] Reçu sur **iCloud** — pas en spam.
- [ ] Code lisible sur mobile sans zoom, sujet correct dans la notification.
- [ ] Répondre au mail arrive bien sur `REPLY_TO`.

### 3.4 Concurrence réelle (C10, R06)

- [ ] Deux onglets du même foyer soumettent à quelques secondes d'intervalle : aucune ligne en double, aucune perte.
- [ ] Deux foyers différents soumettent simultanément : les deux réponses sont présentes et complètes.

### 3.5 Quotas

- [ ] Abaisser temporairement `PLAFOND_MAILS_JOUR` à `1`, demander deux codes : le second renvoie `SERVICE_INDISPONIBLE` et `Journal` contient l'alerte. **Remettre la valeur à 80 ensuite.**
- [ ] Après une centaine de demandes de test cumulées, vérifier que `PropertiesService` ne dépasse pas sa limite (Paramètres du projet → Propriétés du script).

---

## 4. À exécuter en Phase 3 et 4 — front ⏳

**Fonctionnels**
- [ ] Parcours complet au pouce sur mobile, sans zoom.
- [ ] Rechargement de page : la session est conservée ; perdue après le logout.
- [ ] Seuls les événements auxquels le foyer est convié sont affichés.
- [ ] `places_max` : impossible de déclarer plus de présents.
- [ ] Date limite dépassée : formulaire en lecture seule et message dédié.
- [ ] Chaque état a été vu à l'écran : chargement, erreur, succès, session expirée, réponses closes.

**Sécurité**
- [ ] Un nom contenant `<script>alert(1)</script>` saisi dans le Sheet s'affiche comme du texte.
- [ ] Console navigateur : aucune violation CSP en usage normal.
- [ ] Le token n'est pas dans l'URL, ni dans `localStorage`.

**Accessibilité et compatibilité**
- [ ] iPhone Safari, Android Chrome, Firefox et Edge sur ordinateur.
- [ ] Navigation clavier complète sur le formulaire.
- [ ] Lecteur d'écran : les changements d'écran sont annoncés.
- [ ] Page sous 1 Mo hors photos ; chaque photo sous 300 Ko.

**Données**
- [ ] `verifierDonnees()` sur la vraie liste d'invités : 0 erreur.
- [ ] Totaux de `Synthese` justes sur le jeu de test, recomptés à la main.
- [ ] Onglet `Traiteur` cohérent avec `Reponses`.

---

## 5. Journal des campagnes

| Date | Portée | Résultat | Par |
|---|---|---|---|
| 2026-10-18 | Contrôles qualité des données (simulateur) | 3 jeux, conformes | agent |
| 2026-10-18 | Backend complet (simulateur) | 122 / 122 | agent |
| | Phase 2 dans Apps Script | ⏳ | Harry |
