# MODELE_DONNEES — dictionnaire du Google Sheet

Le Google Sheet est la base de données du site. Il contient **8 onglets**.

Conventions générales :

- Les en-têtes sont en **ligne 1** et en `snake_case`. Le script retrouve **toujours** les colonnes
  par nom d'en-tête, jamais par position : les mariés peuvent déplacer une colonne, pas la renommer.
- Qui écrit quoi : `✍️ mariés` (saisie manuelle) · `🤖 script` (ne jamais modifier à la main) ·
  `ƒ formule` (ne rien saisir, la formule se recopie).
- Toute saisie libre d'un invité est **tronquée** à la longueur indiquée et **neutralisée** contre
  l'injection de formules : un `=`, `+`, `-` ou `@` en tête de chaîne est préfixé d'une apostrophe (C11).
- Les emails sont normalisés en `trim` + minuscules à la lecture comme à l'écriture.

| Onglet | Rôle | Écrit par |
|---|---|---|
| `Foyers` | Liste des foyers invités, adresses de connexion, droits aux événements | ✍️ mariés |
| `Invites` | Personnes nommées de chaque foyer | ✍️ mariés |
| `Reponses` | État **courant** des réponses, une ligne par personne | 🤖 script |
| `Historique` | Toutes les versions soumises, en ajout seul | 🤖 script |
| `Config` | Paramètres clé/valeur de l'application | ✍️ mariés |
| `Journal` | Trace technique des actions (sans donnée sensible) | 🤖 script |
| `Synthese` | Totaux et tableaux de bord | ƒ formule |
| `Traiteur` | Vue régimes et allergies uniquement, exportable seule | ƒ formule |

---

## 1. `Foyers` — ✍️ mariés

| Colonne | Type | Obligatoire | Valeurs / format | Commentaire |
|---|---|---|---|---|
| `foyer_id` | texte | oui | `F001`, `F002`… | **Unique.** Identifiant interne, jamais renvoyé au navigateur. |
| `emails` | texte | oui | une ou plusieurs adresses séparées par `;` | **Unique toutes adresses confondues** (D08). Ex. `a@example.com;b@example.com` |
| `nom_affichage` | texte | oui | ≤ 80 car. | Affiché à l'invité : « Famille Durand », « Alec et Gloria ». |
| `places_max` | entier | oui | ≥ nombre de personnes du foyer dans `Invites` | Plafond de présents déclarables. Supérieur au nombre de noms ⇒ un « +1 » est proposé (D09). |
| `invite_vin_honneur` | liste | oui | `oui` / `non` | |
| `invite_diner` | liste | oui | `oui` / `non` | |
| `invite_brunch` | liste | oui | `oui` / `non` | |
| `notes_maries` | texte | non | ≤ 500 car. | Usage interne. **Jamais renvoyé au navigateur.** |

> Un foyer dont les trois colonnes `invite_*` valent `non` est signalé comme anomalie.

## 2. `Invites` — ✍️ mariés

| Colonne | Type | Obligatoire | Valeurs / format | Commentaire |
|---|---|---|---|---|
| `foyer_id` | texte | oui | doit exister dans `Foyers` | Clé étrangère. |
| `personne` | texte | oui | ≤ 60 car. | Prénom et nom tels qu'ils seront affichés. **Unique dans un foyer.** |
| `type_personne` | liste | oui | `adulte` / `enfant` | Pilote le menu enfant et la demande d'âge (D10). |

## 3. `Reponses` — 🤖 script

État **courant** : une ligne par personne déclarée. Une nouvelle soumission du foyer **remplace** toutes
ses lignes, sous verrou (`LockService`), dans la même opération — jamais de doublon (C10).

| Colonne | Type | Obligatoire | Valeurs / format | Commentaire |
|---|---|---|---|---|
| `foyer_id` | texte | oui | | Toujours dérivé du **token**, jamais du client. |
| `personne` | texte | oui | ≤ 60 car. | Pour un accompagnant, le nom saisi par l'invité. |
| `type_personne` | liste | oui | `adulte` / `enfant` | Recopié de `Invites` ; `adulte` par défaut pour un accompagnant. |
| `est_accompagnant` | liste | oui | `oui` / `non` | `oui` = « +1 » non nommé sur le faire-part (D09). |
| `presence` | liste | oui | `oui` / `non` | Présence unique pour tout le mariage (D07). |
| `age` | entier | si `type_personne=enfant` et `presence=oui` | 0 à 17 | Vide pour un adulte. |
| `regime` | liste | oui si `presence=oui` | `aucun`, `vegetarien`, `vegan`, `sans_porc`, `sans_gluten`, `menu_enfant`, `autre` | Vide si absent. |
| `allergies` | texte libre | non | ≤ 200 car. | **Donnée de santé** (C14) : minimisation, purge en P6. Sert aussi à préciser un régime `autre`. |
| `commentaire` | texte libre | non | ≤ 500 car. | Commentaire **du foyer**, recopié sur chaque ligne du foyer (voir note ci-dessous). |
| `maj_le` | date-heure | oui | ISO 8601, fuseau du Sheet | Horodatage de la dernière soumission du foyer. |

> **Pourquoi `commentaire` est répété sur chaque ligne du foyer** : le commentaire est unique par foyer
> (contrat d'API §5), mais le poser sur une seule ligne le rendrait dépendant de l'ordre des lignes —
> un tri ou un filtre dans le Sheet le détacherait de son foyer. La redondance est assumée.

## 4. `Historique` — 🤖 script, ajout seul

Copie horodatée de **chaque** soumission, pour l'audit et la reprise après erreur. Aucune ligne n'est
jamais modifiée ni supprimée (sauf purge P6).

Mêmes colonnes que `Reponses`, précédées de :

| Colonne | Type | Commentaire |
|---|---|---|
| `horodatage` | date-heure | Instant de la soumission. |
| `soumission_id` | texte | UUID commun à toutes les lignes d'une même soumission : permet de reconstituer une version complète. |

## 5. `Config` — ✍️ mariés

Deux colonnes : `cle`, `valeur`. Lue à chaque requête, en une seule fois.

| Clé | Exemple | Rôle |
|---|---|---|
| `NOM_MARIES` | `Alec et Gloria` | Signature des mails. Le titre du site est écrit dans `index.html` : les deux doivent concorder à la main (D17, `INSTALLATION.md` §5.2). |
| `DATE_MARIAGE` | `2027-06-12` | Affichage et décompte. |
| `DATE_LIMITE` | `2027-04-30` | Au-delà : formulaire en lecture seule, erreur `DATE_LIMITE_DEPASSEE`. |
| `EXPEDITEUR_NOM` | `Alec et Gloria` | Nom affiché de l'expéditeur du mail. |
| `EXPEDITEUR_ADRESSE` | *(vide)* | Vide ⇒ `MailApp`. Renseignée ⇒ alias « Envoyer en tant que » via `GmailApp` (§8 du brief). |
| `REPLY_TO` | `maries@example.com` | Adresse de réponse. Jamais d'adresse réelle dans le dépôt. |
| `CONTACT_MARIES` | `maries@example.com` | Affichée dans les messages d'erreur et le pied de page du site. **Servie au navigateur par `ping`** : c'est la seule façon de ne pas l'écrire dans un dépôt public (§8 B-2 de `SECURITE.md`). La changer ici suffit, sans redéployer. |
| `URL_SITE` | `https://…github.io/…` | Rappelée dans le mail. |
| `PLAFOND_MAILS_JOUR` | `80` | Plafond applicatif, en deçà du quota Gmail (~100, C8). |

## 6. `Journal` — 🤖 script

| Colonne | Type | Commentaire |
|---|---|---|
| `horodatage` | date-heure | |
| `email` | texte | Adresse concernée, ou vide. |
| `action` | texte | `requestCode`, `verifyCode`, `submitRsvp`, `logout`, `quota`, `erreur`… |
| `resultat` | texte | `ok` ou le code d'erreur renvoyé. |
| `detail` | texte | Contexte court et non sensible (ex. `essai 3/5`, `quota restant 12`). |

> **Jamais** de code, de token, de régime ni d'allergie dans le `Journal`.

## 7. `Synthese` — ƒ formules

Totaux (foyers invités / ayant répondu / sans réponse, présents, absents, adultes, enfants,
accompagnants), ventilation par service déduite des colonnes `invite_*` du foyer, répartition des régimes.
Aucune saisie manuelle : tout est recalculé automatiquement.

## 8. `Traiteur` — ƒ formules

Vue exportable ne contenant **que** ce dont le traiteur a besoin : personne, type, âge, régime, allergies —
filtrée sur les présents. Ni email, ni commentaire, ni note des mariés.

---

## Règles transverses

### Idempotence
Une soumission remplace l'intégralité des lignes du foyer dans `Reponses` et ajoute une version dans
`Historique`, le tout sous `LockService`. Soumettre deux fois la même chose ne crée aucun doublon.

### Longueurs maximales (tronquage côté serveur)
`personne` 60 · `allergies` 200 · `commentaire` 500 · `nom_affichage` 80 · `notes_maries` 500.

### Ce qui n'est jamais renvoyé au navigateur
`emails`, `notes_maries`, `foyer_id`, le contenu de `Journal` et d'`Historique`, et **tout
`Config` sauf deux clés** : `DATE_LIMITE` et `CONTACT_MARIES`, les seules dont le site ait
besoin. `NOM_MARIES` et `DATE_MARIAGE` ne sont **pas** envoyés — ils sont écrits en dur
dans `index.html`. Un contrôle automatisé vérifie qu'aucune autre adresse email que
`CONTACT_MARIES` n'apparaît dans une réponse.

### Rétention (C14, R12)
`Reponses`, `Historique` et `Journal` sont vidés par `purgerDonneesPostEvenement()` après l'événement.
`Foyers`, `Invites` et `Config` restent, à la main des mariés.
