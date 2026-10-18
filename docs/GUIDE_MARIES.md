# Guide des mariés — le classeur du mariage

Pour **Alec et Gloria**. Ce document explique comment vivre avec le classeur pendant la
campagne de réponses, sans rien casser.

> Vous n'avez aucun code à écrire, et aucun risque de « tout perdre » : Google conserve
> l'historique complet des versions du classeur (**Fichier → Historique des versions**).
> Tout ce qui est décrit ici est réversible.

---

## 1. Les trois règles qui comptent vraiment

**1. Ne partagez jamais le classeur « par lien ».** Partagez-le **nominativement**, à des
personnes précises. Un lien de partage se retransfère sans que vous le sachiez, et le
classeur contient les adresses de tous vos invités ainsi que leurs allergies.

**2. Ne renommez jamais un en-tête de colonne, et n'en supprimez aucune.** Le site
retrouve les colonnes **par leur nom** : `personne`, `presence`, `allergies`… Les
déplacer de gauche à droite ne pose aucun problème. Les renommer casse tout.

**3. N'écrivez jamais à la main dans `Reponses`, `Historique` ou `Journal`.** Ces trois
onglets appartiennent au site. Si vous essayez, Google affiche un avertissement : c'est
normal, arrêtez-vous là. Vos corrections y seraient écrasées à la réponse suivante de
l'invité — et dans `Reponses`, une ligne vidée à la main peut créer un doublon.

---

## 2. Le réflexe après chaque modification

Dès que vous touchez à **`Foyers`**, **`Invites`** ou **`Config`** :

> menu **Mariage → Vérifier les données**

Un rapport s'affiche. Deux niveaux :

| | Ce que ça veut dire | Ce qu'il faut faire |
|---|---|---|
| **ERREUR** | Un invité ne pourra pas répondre | Corriger **avant** de continuer |
| **AVERTISSEMENT** | C'est inhabituel, mais le site fonctionne | Jeter un œil, décider |

Si le rapport dit `0 erreur`, tout va bien.

> Cette vérification attrape des choses invisibles à l'œil : un espace insécable collé
> depuis Word dans un prénom, deux fois la même personne dans un foyer, une adresse
> email en double, un `places_max` inférieur au nombre de personnes, une date au mauvais
> format. Chacune de ces erreurs empêche **silencieusement** un foyer de répondre.

---

## 3. Les onglets, en une phrase chacun

| Onglet | À quoi il sert | Vous y écrivez ? |
|---|---|---|
| **`Foyers`** | Un foyer par ligne : adresses email, nom affiché, nombre de places, à quels moments il est convié | ✅ oui |
| **`Invites`** | Une personne par ligne, rattachée à son foyer, adulte ou enfant | ✅ oui |
| **`Config`** | Vos réglages : noms, dates, adresse de contact, lien du site | ✅ oui |
| **`Reponses`** | Ce que les invités ont répondu, état actuel | ❌ lecture seule |
| **`Historique`** | Chaque version successive des réponses | ❌ lecture seule |
| **`Journal`** | Trace technique des connexions | ❌ lecture seule |
| **`Synthese`** | Les totaux, calculés automatiquement | ❌ formules |
| **`Traiteur`** | La liste à envoyer au traiteur | ❌ formules |

---

## 4. Ajouter un foyer de dernière minute

Il faut écrire dans **deux** onglets, dans cet ordre.

**Dans `Foyers`**, une ligne :

| Colonne | Quoi mettre |
|---|---|
| `foyer_id` | un identifiant unique, par exemple `F151`. Jamais deux fois le même |
| `emails` | l'adresse du foyer. Plusieurs adresses ? séparez-les par un point-virgule : `a@x.fr;b@y.fr` — chacune donnera accès au **même** foyer |
| `nom_affichage` | ce que les invités liront en haut du formulaire : `Famille Durand` |
| `places_max` | le nombre **total** de personnes acceptées, accompagnant compris |
| `invite_vin_honneur` / `invite_diner` / `invite_brunch` | `oui` ou `non` |
| `notes_maries` | vos notes privées. **Jamais affichées aux invités** |

**Dans `Invites`**, une ligne par personne nommée : `foyer_id`, `personne`,
`type_personne` (`adulte` ou `enfant`).

> ⚠️ **`places_max` doit être au moins égal au nombre de personnes nommées.** Sinon le
> foyer ne pourra pas répondre pour tout le monde. Mettez `places_max` à 3 pour un couple
> que vous autorisez à venir avec un +1.

Puis : **Mariage → Vérifier les données**.

---

## 5. Suivre les réponses

**`Synthese`** se met à jour toute seule : nombre de foyers ayant répondu, présents et
absents, effectifs par moment, régimes alimentaires.

**`Traiteur`** est la vue à transmettre : qui vient, à quel service, avec quel régime et
quelles allergies — **sans** adresse email ni commentaire personnel.
Pour l'envoyer : clic droit sur l'onglet → **Copier vers → Nouvelle feuille de calcul**,
puis partagez cette copie. Ne partagez pas le classeur original.

**Les commentaires des invités** sont dans la colonne `commentaire` de `Reponses` : c'est
là qu'arrivent les demandes de navette, les contraintes d'accès et les petits mots.
Prenez l'habitude de la relire chaque semaine.

---

## 6. Sauvegarder, chaque semaine

> **Fichier → Télécharger → Microsoft Excel (.xlsx)**

Faites-le **une fois par semaine** pendant toute la campagne, et gardez les fichiers.
C'est votre filet de sécurité : un classeur Google peut être modifié par erreur, et
l'historique des versions de Google ne remonte pas indéfiniment.

---

## 7. Les allergies : une donnée sensible

Les allergies et régimes alimentaires sont des **données de santé**. Elles sont
volontairement confinées à trois endroits : `Reponses`, `Historique` et `Traiteur`.

- Ne les recopiez pas dans un autre document, un mail groupé ou un groupe de discussion.
- Ne les mettez pas dans `notes_maries`.
- Transmettez-les au traiteur, et à personne d'autre.

Elles n'apparaissent **jamais** dans le `Journal`, et le site ne les envoie à personne
d'autre qu'à l'invité qui les a saisies.

---

## 8. Après le mariage : effacer les données

Quand l'événement est passé et que le traiteur a été payé :

> menu **Mariage → Purger les données (après l'événement)**

Cela vide `Reponses`, `Historique` et `Journal`. `Foyers`, `Invites` et `Config` restent
— vous gardez votre liste d'invités.

C'est **irréversible** et protégé par une double confirmation. Faites d'abord une
sauvegarde Excel (§6). Si vous préférez, demandez à Harry de s'en charger.

---

## 9. Quand quelque chose ne va pas

| Ce qui se passe | Ce qu'il faut regarder |
|---|---|
| Un invité dit ne pas recevoir son code | Son adresse dans `Foyers` est-elle exactement la bonne ? Qu'il regarde ses **spams**. Puis `Journal` : son adresse y apparaît-elle ? |
| Un invité dit « adresse inconnue » | L'adresse qu'il saisit n'est pas celle de `Foyers`. Ajoutez la sienne après un `;` |
| Un invité est bloqué « trop de tentatives » | Normal après 5 essais. Cela se débloque tout seul en une heure |
| Le site affiche une erreur technique | **Mariage → Vérifier les données**. Si le rapport est propre, appelez Harry |
| Le `Journal` se remplit d'`alerte` | Une valeur de `Config` est mal écrite — souvent une date au format `30/04/2027` au lieu de `2027-04-30` |

**En cas de doute, ne corrigez rien dans `Reponses` : appelez Harry.** Rien n'est perdu,
l'historique des versions de Google permet de tout retrouver.
