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
| `testerCorrectionsP4()` | aucun envoi ; modifie puis restaure `Config!DATE_LIMITE` | après chaque modification du code |
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

### 2.2 Backend — **182 contrôles, 182 passés**

123 contrôles de base, 39 régressions de la revue de Phase 2, 20 de la revue croisée de
Phase 4.

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
| **Régressions de la revue indépendante** (voir `SECURITE.md` §7) | **39** | ✅ |
| └ B1 · injection de formule par le champ `email` du `Journal` | 7 | ✅ |
| └ B3 · aucune clé persistante par adresse inconnue, invité servi malgré le sondage | 5 | ✅ |
| └ B4 · `Historique` au-delà de la taille initiale de la feuille | 3 | ✅ |
| └ A1 · appariement des noms malgré espaces insécables et doubles | 3 | ✅ |
| └ A2 · personne nommée `constructor` ou `__proto__` | 3 | ✅ |
| └ A3 · `presence` en liste blanche stricte | 7 | ✅ |
| └ A5 · ligne vidée à la main dans `Reponses` | 4 | ✅ |
| └ A7 · `EXPEDITEUR_ADRESSE` sans la portée `gmail.send` | 3 | ✅ |
| └ B2 / A4 · les sections critiques prennent bien le verrou, sans imbrication | 4 | ✅ |
| **Régressions de la revue croisée P4** (voir `SECURITE.md` §8) | **20** | ✅ |
| └ A-1 · plus aucun chemin non authentifié et sans plafond n'écrit dans `Journal` | 6 | ✅ |
| └ A-1 · `DATE_LIMITE` illisible : une alerte par jour, pas une par visiteur | 3 | ✅ |
| └ A-2 · l'apostrophe de neutralisation ne remonte pas vers l'invité | 4 | ✅ |
| └ A-7 · `Reponses` est écrit **avant** l'effacement du surplus | 3 | ✅ |
| └ DATA-4 · doublon de nom détecté avec la clé réellement utilisée (NFC/NFD) | 1 | ✅ |
| └ B-2 · l'adresse de contact vient du classeur, et plus du dépôt | 3 | ✅ |

### 2.3 Front (Phase 3) — **66 contrôles, 66 passés**

Deux contrôles ajoutés en P4, qui encodaient auparavant un défaut :

| Ce qui est désormais vérifié | Pourquoi |
|---|---|
| Après la date limite, le bouton **reste** accessible et dit « Consulter » | il était masqué, rendant les écrans de consultation inatteignables (B-4) |
| Les libellés des moments viennent du **serveur**, pas d'une liste en dur | ajouter un moment ne se voyait nulle part (A-3) |

Le vrai `app.js` est exécuté sur un DOM minimal, avec `fetch` branché sur le **vrai
backend** tournant sur le simulateur : ce que le front envoie est réellement traité par
le serveur, et ce que le serveur renvoie est réellement affiché. C'est un test du
**contrat front↔back**, pas seulement du front.

| Famille | Contrôles | Résultat |
|---|---|---|
| Démarrage, écrans masqués, date limite reprise de `ping` | 3 | ✅ |
| Parcours complet contre le backend (email → mail réel → code → formulaire) | 21 | ✅ |
| Validation avant tout appel réseau (présence, âge, accompagnant) | 7 | ✅ |
| Soumission : forme de la charge utile, acceptation serveur, récapitulatif, modification | 18 | ✅ |
| `places_max` atteint : pas de bloc accompagnant | 1 | ✅ |
| XSS : nom hostile venu du Sheet affiché comme du texte | 3 | ✅ |
| Session : `sessionStorage`, jamais `localStorage`, expiration | 5 | ✅ |
| Date limite dépassée | 2 | ✅ |
| Panne réseau : message humain, bouton réactivé, aucune trace technique | 3 | ✅ |

**Deux défauts trouvés par cette suite et corrigés :**
- `app.js` ne mettait pas à jour son état après un envoi réussi : « Modifier ma réponse »
  reconstruisait un formulaire **vide** et l'invité perdait sa saisie.
- La structure générée pour les boutons « présent / absent » ne correspondait pas au
  sélecteur CSS, et les boutons radio n'avaient **aucun nom accessible**.

> Ces tests s'exécutent sur un **simulateur**, pas sur Google. Ils prouvent la logique,
> pas le comportement de l'infrastructure. Tout ce qui dépend réellement de Google est
> repris ci-dessous en §3 et §4.

---

## 3. À exécuter dans Apps Script — Phase 2 🖐

Après le premier déploiement.

### 3.1 Déploiement — ✅ **fait le 2026-10-19**

- [x] `./outils/verifier-deploiement.sh "<URL>"` : **12 contrôles, 12 OK**, sur le
      déploiement réel. `version` = `0.2.0`, `dateLimite` = `2027-04-10` lue dans `Config`,
      `reponsesOuvertes` = `true`.
- [ ] **À refaire après le redéploiement des corrections P4** : `ping` doit désormais
      renvoyer aussi un champ `contact`, lu dans `Config!CONTACT_MARIES`.
- [x] L'URL répond en HTTP 200 **sans compte Google** : le réglage « Tout le monde » est bon.
- [x] Aucune trace technique ne fuit dans les réponses d'erreur.
- [ ] Après une modification de code **sans** nouvelle version, `ping` renvoie l'ancienne
      `version` : à constater une fois, pour avoir le réflexe du redéploiement (C12, R09).

> L'outil a d'abord été validé contre un faux Apps Script local reproduisant la
> redirection 302, pour s'assurer qu'il ne pouvait pas donner un faux « tout va bien ».

### 3.2 Fonctions de test — ✅ **fait le 2026-10-19**

- [x] `testerFonctionsPures()` : 0 échec.
- [x] `apercuMailCode()` : le texte est relu et validé.
- [x] `testerParcoursComplet()` : 0 échec, un mail reçu.
- [x] `testerIsolationFoyer()` : 0 échec.
- [x] `testerAntiAbus()` : 0 échec.

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

## 3bis. Session de test en local — 🖐

Le site complet, contre le vrai backend, avant toute mise en ligne.

```bash
cd ~/Documents/guestbook
python3 -m http.server 8000
```

puis <http://localhost:8000>. **Pas en `file://`** : les modules ES seraient bloqués par
le navigateur.

> Vérifié le 2026-10-19 : les dix ressources de la page répondent en 200 avec le bon type
> MIME, `app.js` compris — un mauvais type MIME ferait silencieusement échouer le module.

### Dans l'ordre, sur ordinateur d'abord

1. **Console ouverte** (`F12` → onglet Console) **avant** de charger la page.
   Attendu : **aucune ligne rouge**, et surtout aucun message contenant
   « Content Security Policy ». Une violation CSP ne casse pas forcément l'affichage,
   mais elle casserait les appels réseau.
2. La page s'affiche, la photo d'accueil se charge.
3. Au bout de 1 à 4 s, la ligne « Merci de nous répondre avant le… » apparaît sous
   le premier texte : c'est `ping` qui a répondu et qui a lu `Config`.
4. **Répondre à l'invitation** → saisir **votre adresse de test** → *Recevoir mon code*.
   Le bouton se verrouille et affiche « Envoi en cours… ».
5. Relever le code dans le mail, le **coller** dans le champ (le collage doit fonctionner).
6. Le formulaire s'affiche avec les personnes de votre foyer de test.
7. Cocher, remplir, envoyer. Le récapitulatif s'affiche.
8. **Recharger la page** (`F5`) : le bouton d'accueil doit dire « Reprendre ma réponse »,
   et y cliquer doit ramener au récapitulatif sans redemander de code.
9. **Modifier ma réponse** → le formulaire revient **pré-rempli**. Changer une valeur,
   renvoyer, vérifier dans le Sheet qu'il n'y a **pas de doublon** dans `Reponses` et
   **une version de plus** dans `Historique`.
10. **Se déconnecter** → recharger → le bouton redit « Répondre à l'invitation ».

### Erreurs à provoquer volontairement

- [ ] Adresse inconnue → message explicite, et **aucun mail reçu**.
- [ ] Code faux → « Code incorrect », on reste sur l'écran.
- [ ] Attendre 11 minutes puis valider le code → « Ce code a expiré ».
- [ ] Mode avion, puis envoyer → « Petit souci technique », bouton réactivé.

### Puis sur téléphone

Depuis le même réseau Wi-Fi, l'adresse est `http://<IP-de-votre-Mac>:8000`
(`ipconfig getifaddr en0` pour la connaître).

- [ ] Tout le parcours au pouce, **sans jamais zoomer**.
- [ ] Aucun défilement horizontal, à aucun écran.
- [ ] Le clavier numérique s'ouvre sur le champ du code.
- [ ] Le code reçu par SMS/mail est proposé en remplissage automatique au-dessus du clavier.
- [ ] iPhone Safari **et** Android Chrome si possible.

### Navigation clavier, sur ordinateur

- [ ] `Tab` seul, sans souris, du début à la fin du parcours.
- [ ] Le focus est **toujours visible** (contour marine).
- [ ] `Espace` coche les boutons « Présent·e / Absent·e ».
- [ ] Après chaque changement d'écran, le focus est sur le titre du nouvel écran.

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

**Photos**
- [ ] Le bandeau d'accueil reste lisible sur un écran large comme sur un téléphone (le recadrage `cover` change la zone visible).
- [ ] Les photos se chargent en moins de 2 s sur un réseau mobile moyen.
- [ ] Si une image manque, le bandeau reste lisible (fond marine de repli).

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
| 2026-10-18 | Revue sécurité indépendante | 4 bloquants, 7 à corriger — tous corrigés | relecteur |
| 2026-10-18 | Backend après corrections (simulateur) | 161 / 161 | agent |
| 2026-10-19 | Front (simulateur DOM) | 64 / 64 | agent |
| 2026-10-19 | Backend après la revue croisée P4 (simulateur) | 182 / 182 | agent |
| 2026-10-19 | Front après la revue croisée P4 (simulateur DOM) | 66 / 66 | agent |
| 2026-10-18 | Front, de bout en bout contre le backend (simulateur) | 64 / 64 | agent |
| | Phase 2 dans Apps Script | ⏳ | Harry |
