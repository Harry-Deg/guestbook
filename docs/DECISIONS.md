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

## 2026-10-18 — D07 · Présence unique (pas par événement)
**Décision** : l'invité déclare **une seule présence** pour le mariage, pas une par événement.
Les colonnes `invite_vin_honneur` / `invite_diner` / `invite_brunch` de `Foyers` sont **conservées** :
elles servent à afficher à chaque foyer le programme qui le concerne, et à ventiler les effectifs par
service dans `Synthese` (présents du foyer × services auxquels le foyer est convié).
**Pourquoi** : formulaire le plus court possible, l'oncle le moins à l'aise doit réussir du premier coup.
**Conséquence / limite acceptée** : un invité convié au dîner **et** au brunch ne peut pas venir à l'un
sans l'autre. Si cela se produit, il l'écrira dans le commentaire et les mariés corrigeront à la main.
**Validé par** : Harry, 2026-10-18.

## 2026-10-18 — D08 · Plusieurs adresses email par foyer
**Décision** : colonne `emails` de `Foyers`, une ou plusieurs adresses séparées par `;`. N'importe
laquelle permet de se connecter et d'accéder à la **même** réponse de foyer.
**Pourquoi** : les couples ne partagent pas toujours une boîte mail ; éviter qu'un seul conjoint détienne
l'accès.
**Conséquences** : unicité à contrôler sur l'ensemble des adresses, toutes confondues (`verifierDonnees()`) ;
normalisation `trim` + minuscules à la lecture ; les compteurs anti-abus restent **par adresse** (une
adresse ne peut pas être inondée, mais un foyer à 3 adresses peut recevoir 3 × 5 codes par heure —
accepté, le plafond mail journalier global reste la vraie protection).
**Validé par** : Harry, 2026-10-18.

## 2026-10-18 — D09 · « +1 » nommé et optionnel
**Décision** : si `places_max` est supérieur au nombre de personnes nommées du foyer, le formulaire
propose d'ajouter un accompagnant. Son **nom est obligatoire** dès que la case est cochée, avec régime
et allergies comme pour les autres. Ligne marquée `est_accompagnant = oui` dans `Reponses`.
**Pourquoi** : le plan de table, les étiquettes et le traiteur ont besoin d'un nom ; les mariés gardent le
contrôle via `places_max`.
**Validé par** : Harry, 2026-10-18.

## 2026-10-18 — D10 · Enfants distingués, avec âge
**Décision** : `type_personne` (`adulte` / `enfant`) est renseigné par les mariés dans l'onglet `Invites` ;
l'**âge** est demandé à l'invité pour les personnes de type `enfant` (entier 0–17, obligatoire si présent).
**Pourquoi** : menus enfants facturés différemment, chaise haute et menu bébé conditionnés par l'âge.
**RGPD** : l'âge d'un mineur est une donnée personnelle de plus — justifiée par la finalité traiteur,
purgée après l'événement comme le reste (R12).
**Validé par** : Harry, 2026-10-18.

## 2026-10-18 — D11 · Onglet `Invites` séparé (écart assumé avec le §3.4 du brief)
**Décision** : les personnes nommées d'un foyer vivent dans un onglet `Invites` (une ligne par personne :
`foyer_id`, `personne`, `type_personne`), au lieu d'une colonne `personnes` de `Foyers` contenant des
noms séparés par `;`.
**Pourquoi** : D10 impose une deuxième information par personne (`type_personne`). Deux listes parallèles
séparées par `;` dans une même ligne se désalignent silencieusement à la première erreur de saisie, et
interdisent les listes déroulantes. Un tableau se saisit, se trie et se contrôle ; `verifierDonnees()`
peut valider chaque ligne.
**Coût** : les mariés remplissent deux onglets cohérents au lieu d'un. `verifierDonnees()` signale les
foyers sans invité et les invités orphelins.
**Réversible** : oui, mais avant la saisie réelle de la liste d'invités. **À confirmer par Harry.**

## 2026-10-18 — D12 · `docs/INSTALLATION.md` ajouté à la structure
**Décision** : un document d'installation pas à pas, distinct de `GUIDE_MARIES.md`, est ajouté à
`docs/`. Il s'adresse à Harry (consoles Google et GitHub) ; `GUIDE_MARIES.md` s'adressera aux mariés
(usage du Sheet, sans technique).
**Pourquoi** : les actions manuelles s'accumulent sur trois phases (Sheet, déploiement, Pages) et la
gate CP exige qu'elles soient listées étape par étape. Les mélanger au guide des mariés le rendrait
illisible.

## 2026-10-18 — D13 · Mode de revue des gates
**Décision** : les revues de rôle de P1 sont faites en annonçant le rôle, par l'agent lui-même. Les
revues **SEC de P2** et la **revue croisée de P4** seront confiées à des sous-agents indépendants qui
n'auront pas écrit le code relu.
**Pourquoi** : le §3 du brief autorise les deux modes. Un relecteur indépendant a le plus de valeur sur
le code de sécurité et sur la revue finale ; sur P1, les contrôles ont été validés par **exécution**
(banc d'essai hors ligne, jeu de données corrompu) plutôt que par lecture, ce qui est plus probant.
**À confirmer par Harry** : oui.

## 2026-10-18 — D14 · Adresse auteur git laissée telle quelle
**Décision** : les commits restent signés avec l'adresse Gmail personnelle de Harry ; pas de réécriture
d'historique, pas d'override `user.email` local.
**Pourquoi** : Harry a arbitré après exposition du risque. L'adresse deviendra publique avec le dépôt.
**Risque accepté** : collecte automatisée de l'adresse sur GitHub (spam, hameçonnage). Aucun lien avec
les données des invités, et aucun effet sur le quota d'envoi `MailApp` (recevoir ne consomme rien).
**Validé par** : Harry, 2026-10-18.

## 2026-10-18 — D15 · Portée OAuth `spreadsheets` plutôt que `spreadsheets.currentonly`
**Décision** : `appsscript.json` déclare `https://www.googleapis.com/auth/spreadsheets`.
**Pourquoi** : la portée minimale `spreadsheets.currentonly` est la plus propre, mais son comportement
dans une Application Web accédée **anonymement** depuis un script lié est connu pour être instable.
Mettre ce piège sur le chemin critique de Harry coûterait plus cher que la portée élargie, sur un script
qui lui appartient et qui ne lit qu'un seul classeur.
**Réversible** : oui, en changeant une ligne puis en réautorisant.

## 2026-10-18 — D16 · `ping` renvoie aussi la date limite
**Décision** : extension du contrat §5 — `ping` renvoie `{ version, dateLimite, reponsesOuvertes }`
au lieu de `{ version }` seul.
**Pourquoi** : le front doit pouvoir afficher « les réponses sont closes » **avant** toute connexion.
L'alternative serait de recopier `DATE_LIMITE` en dur dans `index.html`, qui dériverait de `Config`.
L'information est publique et ne révèle rien.

## 2026-10-18 — D17 · Infos publiques des mariés portées par la page, pas par l'API
**Décision** : nom des mariés, date du mariage, lieux, programme et adresse de contact sont écrits dans
`index.html`. L'API ne les renvoie pas (hors `dateLimite`).
**Pourquoi** : ce sont des informations publiques et statiques ; les faire transiter par l'API ajouterait
un aller-retour de 1 à 4 s (C5) avant le premier affichage, pour une donnée qui ne change jamais.
`Config` reste la source pour ce que le **script** utilise (mails, date limite).
**Conséquence** : à la mise en ligne, vérifier que `index.html` et `Config` disent la même chose.
Le tableau de correspondance est en `INSTALLATION.md` §5.2.
**Amendé le 2026-10-19 (D29)** : cette décision citait `CONTACT_MARIES` parmi les valeurs
écrites dans `index.html`. C'était inexact — elle était dans `config.js` — et c'est désormais
la seule valeur de `Config` à faire le chemin inverse : le serveur la renvoie au navigateur.

## 2026-10-18 — D18 · Codes et tokens stockés hachés
**Décision** : `CacheService` ne contient jamais un code ni un token en clair, mais leur empreinte
SHA-256 salée (sel propre à l'installation, généré une fois dans `PropertiesService`).
**Pourquoi** : coût nul, et une inspection du cache ne permet plus de rejouer une session ni de
lire un code en vol. Complète l'interdiction de journaliser ces valeurs.

## 2026-10-18 — D19 · Code à 6 chiffres dérivé de `Utilities.getUuid()`
**Décision** : le code n'est pas tiré de `Math.random()` mais des 8 premiers octets hexadécimaux d'un
UUID v4, ramenés modulo 10^6.
**Pourquoi** : `Math.random()` (xorshift128+) est prédictible si l'on observe assez de tirages.
`getUuid()` s'appuie sur un générateur adapté. Le surcoût est nul.

## 2026-10-18 — D20 · Revue sécurité indépendante avant tout déploiement
**Décision** : le backend n'est pas déployable tant qu'une revue menée par un relecteur
n'ayant pas écrit le code n'a pas été passée. La première a trouvé **4 bloquants et 7 points
à corriger**, tous réels, tous corrigés.
**Pourquoi** : les 122 tests existants validaient le comportement prévu et n'ont détecté
aucun des 11 défauts. Ils couvraient les chemins pensés, pas les chemins oubliés — en
particulier `journaliser_`, qui écrivait dans le classeur une donnée client non assainie.
**Conséquence** : 39 tests de régression ajoutés ; la même revue sera refaite
sur le front en P3 et sur l'ensemble en P4.
**Détail** : `docs/SECURITE.md` §7.

## 2026-10-18 — D21 · Le plafond anti-sondage ne doit jamais pouvoir atteindre un invité
**Décision** : le plafond global de 50 adresses inconnues par heure est placé **après** la
recherche du foyer, sur la seule branche « adresse inconnue ».
**Pourquoi** : la première version du correctif le plaçait avant, pour économiser une lecture
du Sheet. Le test de régression a montré que 50 requêtes d'un robot bloquaient alors tous les
invités pendant une heure. Une lecture de feuille supplémentaire par requête hostile est un
prix dérisoire comparé à un déni de service sur les vrais invités.
**Règle générale retenue** : aucune protection anti-abus ne doit avoir un chemin par lequel
un attaquant peut dégrader le service d'un utilisateur légitime.

## 2026-10-18 — D22 · `EXPEDITEUR_ADRESSE` neutralisée par un drapeau explicite
**Décision** : `Mail.gs` porte `PORTEE_GMAIL_DECLAREE = false`. Tant que ce drapeau est faux,
une `EXPEDITEUR_ADRESSE` renseignée dans `Config` est **ignorée** (repli sur `MailApp`) avec
une alerte au `Journal`, et `verifierDonnees()` la signale en erreur.
**Pourquoi** : la branche alias appelle `GmailApp`, qui exige une portée OAuth non déclarée.
Sans cette garde, le jour où les mariés rempliraient cette case — que le modèle de données
présente comme prévue — **chaque connexion** échouerait en `ERREUR_SERVEUR`, sans message
compréhensible. Un piège latent dans une case que l'on invite à remplir n'est pas acceptable.
**Pour activer l'alias** : ajouter la portée dans `appsscript.json`, réautoriser, passer le
drapeau à `true`. À documenter dans `MIGRATION_MAIL.md` (§8 du brief).

## 2026-10-18 — D23bis · Palette tirée des photos par échantillonnage
**Décision** : la palette neutre de D24 est remplacée par celle des photos du couple, mesurée
et non estimée à l'œil : **marine #1e2d44** (le costume, famille la plus présente — 9 % des
pixels), **ivoire #f7f3ec** (boiseries parisiennes, façade ocre du château), **or #806530**
(les dorures), blanc des cartes.
**Pourquoi** : Harry a demandé une inspiration « mariage chic » tirée des photos. Échantillonner
plutôt que juger à l'œil évite de confondre l'impression dominante et la couleur dominante.
**Correction imposée par l'accessibilité** : l'or réel des photos (#9c7b3f) ne donne que 3,6:1
sur ivoire. Il est assombri à **#806530** (5,0:1) dès qu'il porte du texte ; sa version claire
#c9a961 est réservée aux filets décoratifs posés sur le marine (6,2:1), jamais à du texte.

## 2026-10-18 — D23ter · Photos en fond, texte jamais posé sur une zone claire
**Décision** : trois usages, et trois seulement — bandeau d'accueil pleine largeur sous
dégradé marine, texture de page voilée d'ivoire à 93-96 %, bandeaux photographiques en tête
de carte **sans texte par-dessus**. Tout le texte courant reste sur un fond plein.
**Pourquoi** : une photo derrière du texte est le moyen le plus simple de perdre la lisibilité,
et le contraste varie avec le recadrage, donc avec la taille de l'écran.
**Vérification** : le texte blanc du bandeau a été mesuré **sur les pixels réels** de la photo,
sous le dégradé, par tranches de hauteur. Pire cas **4,64:1** — AA tenu même pour du texte
courant, et non seulement pour les grands titres. À refaire si la photo d'accueil change.

## 2026-10-18 — D23quater · Les originaux photo restent hors du dépôt
**Décision** : `photo/` est dans `.gitignore`. Le dépôt ne contient que les versions web
d'`assets/img/` : recadrées, redimensionnées, converties en JPEG, métadonnées EXIF supprimées
au ré-encodage. 13 Mo d'originaux deviennent 620 Ko.
**Pourquoi** : le dépôt est public et l'historique git est définitif. Publier des originaux en
pleine définition, avec leurs données EXIF (appareil, parfois coordonnées GPS), n'apporte rien
et ne se rattrape pas.

## 2026-10-18 — D23 · Aucune police externe par défaut
**Décision** : les titres utilisent une pile serif système (`Iowan Old Style, Palatino,
Georgia, Times New Roman, serif`), le texte une pile sans-serif système. Aucun appel à
Google Fonts.
**Pourquoi** : le brief autorise une police Google (§3.3) mais ne l'impose pas. S'en passer
évite une requête bloquante au premier affichage — qui s'ajouterait au démarrage à froid de
1 à 4 s (C5) —, deux entrées de plus dans la CSP, et une fuite d'adresse IP vers Google avant
tout consentement. Les piles système donnent un rendu correct et différent sur chaque
plateforme, ce qui convient à une identité volontairement neutre.
**Réversible** : la marche à suivre, CSP comprise, est écrite en commentaire en tête de
`style.css`. À rouvrir quand les mariés choisiront leur identité visuelle (§9).

## 2026-10-18 — D24 · Palette claire assumée, pas de thème sombre
*(La palette a été remplacée par celle des photos — voir D23bis. La décision de n'avoir
qu'un seul thème, clair, reste valable.)*
**Décision** : une seule palette, claire, appliquée explicitement sur `body`.
**Pourquoi** : la page est un faire-part, pas une application ; le rendu doit être le même
pour tout le monde, y compris à l'impression. Un thème sombre doublerait la surface à
vérifier en contraste pour un bénéfice faible sur une page consultée une ou deux fois.
**Conséquence** : le fond est peint explicitement, un téléphone en mode sombre n'altère rien.

## 2026-10-18 — D25 · Contrastes vérifiés par calcul, pas à l'œil
**Décision** : chaque couple couleur/fond est passé au calcul de ratio WCAG avant d'être
retenu. Résultat : 13 couples conformes du premier coup, **un échec** — la bordure des champs
de saisie était à 2,1:1 pour un minimum de 3:1 (WCAG 1.4.11, contraste des composants
d'interface, souvent oublié car il ne concerne pas du texte). Corrigée de `#b9b2a5` à
`#8d8878` (3,54:1 — la valeur finale retenue dans `style.css`).
**Règle retenue** : ne jamais éclaircir `--couleur-bordure-forte` sans refaire le calcul.
C'est noté en commentaire dans `style.css`.

## 2026-10-18 — D26 · Vouvoiement
**Décision** : le site vouvoie, et tous les textes visibles sont regroupés en tête de
`app.js` (constante `MESSAGES_ERREUR`) et dans `index.html`.
**Pourquoi** : une liste d'invités de mariage va des grands-parents aux collègues. Le site n'a
qu'une voix pour tout le monde : le tutoiement sonnerait juste pour les amis proches et
déplacé pour une grand-tante, alors que le vouvoiement chaleureux ne heurte personne — c'est
le registre d'un faire-part.
**Réversible** : oui, en un seul endroit, si les mariés préfèrent tutoyer.

## 2026-10-18 — D27 · CSP restrictive, donc aucun inline nulle part
**Décision** : `default-src 'none'`, puis uniquement ce qui est nécessaire. Ni `'unsafe-inline'`
ni `'unsafe-eval'`. Aucun attribut `style=`, aucune balise `<style>`, aucun `<script>` en ligne,
aucun gestionnaire `onclick=` dans `index.html`.
**Pourquoi** : sans en-tête HTTP possible sur GitHub Pages (C2), la balise `<meta>` est la seule
CSP disponible — autant qu'elle serve à quelque chose. `'unsafe-inline'` annulerait l'essentiel
de la protection XSS.
**Point à ne pas oublier** : `connect-src` doit lister **les deux** domaines d'Apps Script.
`script.google.com` reçoit la requête, `script.googleusercontent.com` sert la réponse après la
redirection 302 (C4). Oublier le second casse tous les appels, sans message clair.

## 2026-10-18 — D28 · Validation en double, côté front et côté serveur
**Décision** : le front refait les contrôles que le serveur fait déjà (présence choisie, âge de
l'enfant, nom de l'accompagnant, `places_max`).
**Pourquoi** : non pour la sécurité — le serveur reste seul juge —, mais pour l'expérience.
Sans cela, une case oubliée coûte un aller-retour de 1 à 4 s (C5) pour recevoir un
`DONNEES_INVALIDES` générique qui ne dit pas quoi corriger. Le front, lui, nomme la personne
concernée et place le focus sur le bon champ.

## 2026-10-19 — D29 · L'adresse de contact quitte le dépôt et passe par l'API
**Décision** : `CONTACT_MARIES` n'est plus écrite dans `assets/js/config.js`. Le serveur la
renvoie dans la réponse à `ping` (et à `getRsvp`), lue depuis l'onglet `Config`. Le front
l'affiche dans les messages d'erreur et dans le pied de page ; tant que `ping` n'a pas
répondu, les phrases qui la citent s'en passent au lieu d'afficher un trou.
**Pourquoi** : le dépôt est public (C1). Une adresse en clair y est moissonnée en quelques
jours, et elle y reste — dans l'historique git — même après correction. La revue croisée de
Phase 4 l'a classée bloquante, et elle avait raison : trois documents affirmaient
simultanément qu'aucune adresse réelle ne figurait dans le dépôt.
**Effet de bord bienvenu** : les mariés peuvent changer l'adresse de contact depuis le
classeur, sans toucher au code ni redéployer quoi que ce soit.
**Ce que cela ne règle pas** : l'adresse est toujours dans **deux commits de l'historique**.
Seule une réécriture de l'historique avant le premier `git push` l'en retire (R23,
`INSTALLATION.md` §5.1). C'est une action de Harry.

## 2026-10-19 — D30 · Après la date limite, on consulte au lieu d'être renvoyé
**Décision** : passé `DATE_LIMITE`, le bouton d'entrée reste affiché et devient « Consulter
ma réponse ». Le parcours de connexion fonctionne normalement ; le formulaire s'ouvre en
lecture seule et le serveur refuse toute écriture, comme avant.
**Pourquoi** : le bouton était masqué, et c'est l'unique porte d'entrée du site. Les deux
écrans prévus pour ce cas — formulaire en lecture seule, récapitulatif en mode clos —
étaient donc **inatteignables**, alors qu'ils étaient écrits et fonctionnels. Concrètement,
une invitée ne pouvait plus relire l'allergie qu'elle avait déclarée pour son enfant.
**Précédent à retenir** : le test front vérifiait que le bouton disparaissait. Un test peut
figer un défaut aussi sûrement qu'il protège une fonctionnalité ; c'est la revue par un
tiers qui l'a vu, pas la suite de tests.

## 2026-10-19 — D31 · Les libellés métier ont une seule source de vérité
**Décision** : le front affiche les moments de la fête à partir du champ `evenements`
renvoyé par le serveur, et non d'une liste écrite en dur. La grammaire de la phrase reste
côté front ; les **noms** viennent du serveur.
**Pourquoi** : le serveur calculait et renvoyait déjà ce champ, conformément au §5 du brief,
et le front ne le lisait pas. Ajouter un quatrième moment (une messe, un lendemain à la
plage) aurait demandé deux modifications dans deux fichiers — et l'oubli de la seconde
n'aurait produit **aucune erreur**, juste une invitation incomplète envoyée à 150 personnes.
**Règle générale** : un champ renvoyé par l'API et jamais lu par le front est un défaut en
attente, pas une réserve pour plus tard.
