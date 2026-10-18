# MIGRATION_MAIL — passer l'envoi au compte des mariés

Aujourd'hui, les codes de connexion partent du **Gmail personnel de Harry** (C13). C'est
volontaire pendant la phase de test, et ce n'est pas tenable dans la durée : le quota, la
réputation d'expéditeur et la responsabilité des données reposent sur un compte personnel.

Le brief (§8) prévoit **trois paliers**, du moins coûteux au plus propre. Ce document les
décrit, plus une **procédure de reprise** si Harry devient indisponible (R13).

> Aucun de ces paliers n'est nécessaire pour que le site fonctionne. On peut très bien
> tenir toute la campagne au palier 1.

---

## Palier 1 — Minimal : les réponses arrivent chez les mariés

**Coût : deux cellules à modifier. Aucun redéploiement.**

Dans l'onglet `Config` :

| Clé | Valeur |
|---|---|
| `EXPEDITEUR_NOM` | `Alec et Gloria` |
| `REPLY_TO` | l'adresse des mariés |

Le mail part toujours du compte de Harry, mais il est **signé** des mariés, et toute
réponse d'un invité arrive **chez eux**.

C'est le palier recommandé par défaut : il règle le problème pratique (les invités
répondent aux bonnes personnes) sans aucun risque technique.

> L'en-tête technique `From:` reste celui de Harry. Un invité curieux qui ouvre les
> détails du message le verra. C'est la seule limite de ce palier.

---

## Palier 2 — Alias : le mail part de l'adresse des mariés

**Coût : une configuration Gmail, une portée OAuth, une réautorisation, un redéploiement.**

> ⚠️ **Le piège.** Remplir `EXPEDITEUR_ADRESSE` dans `Config` **ne suffit pas**. Le code
> détecte que la portée `gmail.send` n'est pas déclarée et **revient à `MailApp`** en
> traçant une alerte dans le `Journal` (décision D22). C'est une protection : sans elle,
> remplir cette cellule ferait échouer **chaque connexion** en `ERREUR_SERVEUR`.
> Les quatre étapes ci-dessous sont indissociables.

### 2.1 Déclarer l'alias dans Gmail

Dans le Gmail **de Harry** (le compte qui exécute le script) :

1. **Paramètres → Comptes et importation → Envoyer des e-mails en tant que → Ajouter une
   autre adresse e-mail**.
2. Saisir l'adresse des mariés. Google y envoie un code de confirmation.
3. Les mariés transmettent le code, Harry le saisit. L'alias est actif.

> Sans cette étape, les trois suivantes échoueront : Gmail refuse d'envoyer depuis une
> adresse non vérifiée.

### 2.2 Ajouter la portée OAuth

Dans l'éditeur Apps Script, afficher `appsscript.json` (**⚙️ Paramètres du projet →
Afficher le fichier manifeste `appsscript.json`**) et ajouter la troisième ligne :

```json
"oauthScopes": [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/script.send_mail",
  "https://www.googleapis.com/auth/gmail.send"
]
```

### 2.3 Lever la garde dans le code

Dans `Mail.gs`, ligne 15 :

```javascript
var PORTEE_GMAIL_DECLAREE = true;   // était false
```

Puis renseigner **`EXPEDITEUR_ADRESSE`** dans `Config` avec l'adresse des mariés.

### 2.4 Réautoriser et redéployer

1. Lancer `apercuMailCode` depuis l'éditeur : Google redemande l'autorisation, avec une
   **nouvelle** ligne sur l'envoi de mail. Accepter.
2. Lancer `testerParcoursComplet` et vérifier que le mail reçu a bien pour expéditeur
   l'adresse des mariés.
3. **Déployer → Gérer les déploiements → crayon → Version : Nouvelle version.**

> « Nouvelle version » conserve l'URL. « Nouveau déploiement » en créerait une autre, et
> il faudrait modifier `config.js` (C12).

### 2.5 Vérifier

```bash
./outils/verifier-deploiement.sh "<URL /exec>"
```

Puis dans le `Journal` : plus aucune ligne
`EXPEDITEUR_ADRESSE ignorée : portée gmail.send non déclarée`. Si elle réapparaît, c'est
que l'étape 2.2 ou 2.3 manque.

---

## Palier 3 — Cible : tout passe chez les mariés

**Coût : transfert de propriété, réautorisation, nouveau déploiement, modification du
dépôt. À faire hors période de réponses.**

C'est le palier qui libère complètement Harry : le classeur, le script et le quota mail
appartiennent aux mariés.

1. **Transférer la propriété du classeur.** Partage → le compte des mariés → **Transférer
   la propriété**. Le script lié suit le classeur.
2. **Depuis le compte des mariés**, ouvrir **Extensions → Apps Script**, lancer
   `apercuMailCode` et accepter les autorisations. C'est leur quota qui s'applique
   désormais (~100 destinataires/jour, comme avant).
3. **Créer un déploiement depuis leur compte** : *Déployer → Nouveau déploiement →
   Application Web*, « Exécuter en tant que : **moi** », « Qui a accès : **Tout le
   monde** ». ⚠️ Cela produit une **nouvelle URL `/exec`**.
4. **Reporter la nouvelle URL** dans `assets/js/config.js` (`API_URL`), puis `git push` —
   GitHub Pages se met à jour tout seul en une ou deux minutes.
5. **Vérifier** : `./outils/verifier-deploiement.sh "<nouvelle URL>"`, 12 contrôles.
6. **Désactiver l'ancien déploiement** côté Harry, pour qu'aucune réponse ne continue à
   arriver dans l'ancien classeur.

### Ce qui se passe pour les données

| | Sort |
|---|---|
| Les réponses déjà enregistrées | suivent le classeur, rien n'est perdu |
| Les sessions ouvertes | **invalidées** : les invités connectés devront redemander un code |
| `SEL_INSTALLATION` | **ne pas le recopier**. Il est régénéré, ce qui invalide les sessions en cours — sans aucune autre conséquence |
| Les compteurs anti-abus | repartent de zéro |

> Pour cette raison, faire le palier 3 **à un moment creux** : pas le soir de l'envoi des
> faire-part, pas dans la semaine précédant la date limite.

---

## 4. Procédure de reprise si Harry est indisponible (R13)

Tant que le palier 3 n'est pas fait, le site dépend du compte Google de Harry. Si celui-ci
devient inaccessible (perte d'accès, absence prolongée), voici ce qui reste possible.

**Ce qui continue de fonctionner sans intervention** : tout. Le site, les envois de code,
les réponses. Un déploiement Apps Script tourne sans que son auteur se connecte.

**Ce qui devient impossible** : modifier le code, redéployer, changer les réglages,
consulter le classeur — sauf si quelqu'un d'autre y a accès.

**Les deux mesures à prendre dès maintenant, pendant que tout va bien :**

1. **Les mariés ont un accès éditeur au classeur**, nominatif. Ils peuvent alors modifier
   `Config`, ajouter des foyers, lancer *Vérifier les données*, et exporter les réponses.
2. **Une sauvegarde Excel hebdomadaire** est faite et conservée ailleurs que dans le Drive
   de Harry (`GUIDE_MARIES.md` §6). C'est elle qui permet de tout reconstruire.

**Si la reprise devient nécessaire** : avec ces deux mesures, un nouveau classeur peut
être monté à partir de la sauvegarde en suivant `INSTALLATION.md` depuis la Phase 1, puis
déployé depuis le compte des mariés (palier 3, étapes 2 à 5). Compter une à deux heures.
Les invités déjà connectés devront redemander un code ; leurs réponses sont conservées.
