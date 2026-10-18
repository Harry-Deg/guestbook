/**
 * Securite.gs — codes de connexion, sessions, compteurs anti-abus, assainissement des saisies.
 *
 * Principes :
 *  - rien de secret n'est stocké en clair : codes et tokens vivent hachés dans le cache (D18) ;
 *  - les compteurs qui protègent d'un abus sont PERSISTANTS (PropertiesService), jamais dans
 *    CacheService dont une entrée peut disparaître à tout moment (C7) ;
 *  - aucune de ces fonctions ne journalise un code, un token ou une donnée de santé.
 */

var DUREE_CODE_S = 10 * 60;        // validité d'un code : 10 minutes
var DUREE_SESSION_S = 6 * 60 * 60; // validité d'un token : 6 heures (maximum de CacheService)
var ESSAIS_MAX_PAR_CODE = 5;
var DEMANDES_MAX_PAR_HEURE = 5;
var FENETRE_DEMANDES_MS = 60 * 60 * 1000;
/** Plafond GLOBAL de demandes portant sur une adresse inconnue, par heure (B3). */
var SONDAGES_INCONNUS_MAX_PAR_HEURE = 50;

var PREFIXE_CODE = 'code:';
var PREFIXE_SESSION = 'sess:';
var PREFIXE_DEMANDES = 'dem:';
var PREFIXE_MAILS = 'mails:';
var PREFIXE_INCONNUS = 'inconnus:';
var PREFIXE_ALERTE = 'alerte:';
var CLE_SEL = 'SEL_INSTALLATION';

/** Au-delà de ce nombre d'entrées, un balayage des compteurs périmés est déclenché. */
var SEUIL_BALAYAGE = 300;


/* ══════════════════════════════════════════════════════════════════════════
   Empreintes
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Sel propre à cette installation, créé à la première utilisation.
 * Il rend les empreintes inexploitables ailleurs et interdit les tables pré-calculées
 * sur un espace aussi petit que 10^6 codes possibles.
 */
function selInstallation_() {
  var props = PropertiesService.getScriptProperties();
  var sel = props.getProperty(CLE_SEL);
  if (!sel) {
    sel = Utilities.getUuid() + Utilities.getUuid();
    props.setProperty(CLE_SEL, sel);
  }
  return sel;
}

/** SHA-256 salée, rendue en hexadécimal. */
function hacher_(texte) {
  var octets = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    selInstallation_() + '|' + String(texte),
    Utilities.Charset.UTF_8
  );
  return octets.map(function (o) {
    return ((o & 0xff) + 0x100).toString(16).slice(1);
  }).join('');
}

/**
 * Comparaison à temps constant.
 * Les deux valeurs sont des empreintes de même longueur : la fuite temporelle serait
 * difficilement exploitable ici, mais l'écrire correctement ne coûte rien.
 */
function memeEmpreinte_(a, b) {
  a = String(a || '');
  b = String(b || '');
  if (a.length !== b.length) return false;
  var diff = 0;
  for (var i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}


/* ══════════════════════════════════════════════════════════════════════════
   Assainissement des saisies
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Neutralise une injection de formule (C11).
 * Google Sheets interprète une cellule qui commence par = + - @ ; des espaces ou des
 * caractères de contrôle en tête peuvent servir à masquer ces préfixes, ils sont
 * retirés d'abord.
 */
function neutraliserFormule_(valeur) {
  var s = String(valeur == null ? '' : valeur).replace(/^[\s\u0000-\u001F]+/, '');
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

/**
 * Pipeline appliqué à TOUTE saisie libre avant écriture : retrait des caractères de
 * contrôle, normalisation des espaces, troncature, neutralisation des formules.
 */
function assainirTexte_(valeur, longueurMax) {
  var s = String(valeur == null ? '' : valeur)
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (longueurMax && s.length > longueurMax) s = s.slice(0, longueurMax).trim();
  return neutraliserFormule_(s);
}

/** Entier strict dans un intervalle, ou null si la valeur ne convient pas. */
function entierOuNull_(valeur, min, max) {
  if (valeur === '' || valeur === null || valeur === undefined) return null;
  var n = Number(valeur);
  if (isNaN(n) || n % 1 !== 0 || n < min || n > max) return null;
  return n;
}


/**
 * Clé d'appariement d'un nom de personne.
 *
 * DOIT être utilisée des deux côtés : sur le nom lu dans l'onglet Invites comme sur
 * celui renvoyé par le client. Sans cela, un double espace ou une espace insécable
 * dans le Sheet empêcherait l'appariement et le foyer ne pourrait plus répondre (A1).
 */
function cleNom_(nom) {
  var s = assainirTexte_(nom, LONGUEURS_MAX.personne).toLowerCase();
  return s.normalize ? s.normalize('NFC') : s;
}


/* ══════════════════════════════════════════════════════════════════════════
   Verrou
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Exécute une séquence lire-modifier-écrire sous verrou global.
 *
 * Apps Script autorise une trentaine d'exécutions simultanées : sans verrou, trente
 * requêtes parallèles liraient le même compteur et écriraient toutes « 1 ». Tous les
 * plafonds anti-abus seraient alors franchissables par simple concurrence (B2, A4).
 *
 * Les sections protégées doivent rester courtes : aucun envoi de mail à l'intérieur.
 */
function avecVerrou_(fonction, attenteMs) {
  var verrou = LockService.getScriptLock();
  if (!verrou.tryLock(attenteMs || 10000)) throw erreurApi_('SERVICE_INDISPONIBLE');
  try {
    return fonction();
  } finally {
    verrou.releaseLock();
  }
}

/**
 * Journalise une alerte au plus une fois par jour, quel que soit le nombre d'appels.
 *
 * Réservé aux anomalies détectées sur un chemin très fréquenté. `reponsesOuvertes_`
 * est appelée par `ping`, donc à CHAQUE chargement de page par CHAQUE visiteur : une
 * DATE_LIMITE saisie « 30/04/2027 » y écrivait une ligne de Journal par visite.
 */
function alerterUneFoisParJour_(detail) {
  var cle = PREFIXE_ALERTE + hacher_(detail).slice(0, 16);
  var jour = jourCourant_();
  try {
    var props = PropertiesService.getScriptProperties();
    if (props.getProperty(cle) === jour) return false;
    props.setProperty(cle, jour);
  } catch (e) {
    return false; // magasin saturé : on se tait plutôt que de faire échouer un ping
  }
  journaliser_('', 'config', 'alerte', detail);
  return true;
}

/**
 * Retire l'apostrophe de neutralisation avant de renvoyer un texte au client.
 *
 * `neutraliserFormule_` la pose pour protéger le Sheet ; elle n'a rien à faire sous
 * les yeux de l'invité, qui verrait « '=TEST() » ou « '-sans lactose » au lieu de ce
 * qu'il a écrit. Les deux chemins de lecture (récapitulatif immédiat et relecture du
 * lendemain) partagent désormais cette fonction : ils se contredisaient.
 */
function sansApostrophe_(valeur) {
  var s = String(valeur == null ? '' : valeur);
  return s.charAt(0) === "'" ? s.slice(1) : s;
}

/** Écriture de propriété tolérante : un magasin saturé devient une erreur propre. */
function ecrireProprieteOuEchouer_(cle, valeur) {
  try {
    PropertiesService.getScriptProperties().setProperty(cle, valeur);
  } catch (e) {
    journaliser_('', 'stockage', 'SERVICE_INDISPONIBLE', 'PropertiesService saturé');
    throw erreurApi_('SERVICE_INDISPONIBLE');
  }
}


/* ══════════════════════════════════════════════════════════════════════════
   Compteurs persistants (C7)
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Enregistre une demande de code et dit si le plafond horaire est atteint.
 * Les horodatages sont en clair dans la valeur, mais la clé est une empreinte :
 * le magasin de propriétés ne contient aucune adresse email lisible.
 *
 * Volontairement appelée AVANT de savoir si l'adresse est connue, pour qu'un attaquant
 * ne puisse pas sonder la liste d'invités sans consommer son quota.
 */
function demandeAutorisee_(email) {
  var cle = PREFIXE_DEMANDES + hacher_(normaliserEmail_(email)).slice(0, 32);

  return avecVerrou_(function () {
    var props = PropertiesService.getScriptProperties();
    var maintenant = Date.now();

    var horodatages = [];
    try {
      horodatages = JSON.parse(props.getProperty(cle) || '[]');
    } catch (e) {
      horodatages = [];
    }

    horodatages = horodatages.filter(function (t) {
      return typeof t === 'number' && maintenant - t < FENETRE_DEMANDES_MS;
    });

    if (horodatages.length >= DEMANDES_MAX_PAR_HEURE) {
      ecrireProprieteOuEchouer_(cle, JSON.stringify(horodatages));
      return false;
    }

    horodatages.push(maintenant);
    ecrireProprieteOuEchouer_(cle, JSON.stringify(horodatages));
    return true;
  });
}

/**
 * Compteur GLOBAL des demandes portant sur une adresse inconnue, une seule clé par heure.
 *
 * Il existe pour deux raisons :
 *  - borner le stockage : sans lui, chaque adresse inventée créerait une clé persistante,
 *    et 10 000 requêtes suffiraient à saturer PropertiesService (500 Ko) de façon
 *    définitive, bloquant toute connexion (B3) ;
 *  - borner les lectures du Sheet provoquées par un robot qui sonde des adresses.
 *
 * Il ne compte QUE les adresses inconnues : un invité légitime ne peut donc jamais être
 * bloqué par le bruit d'un attaquant.
 */
function sondageInconnuAutorise_() {
  var cle = PREFIXE_INCONNUS + heureCourante_();
  return avecVerrou_(function () {
    var props = PropertiesService.getScriptProperties();
    return Number(props.getProperty(cle) || 0) < SONDAGES_INCONNUS_MAX_PAR_HEURE;
  });
}

function compterSondageInconnu_() {
  var cle = PREFIXE_INCONNUS + heureCourante_();
  return avecVerrou_(function () {
    var props = PropertiesService.getScriptProperties();
    var n = Number(props.getProperty(cle) || 0) + 1;
    ecrireProprieteOuEchouer_(cle, String(n));
    if (n === SONDAGES_INCONNUS_MAX_PAR_HEURE) {
      journaliser_('', 'sondage', 'TROP_DE_TENTATIVES',
                   SONDAGES_INCONNUS_MAX_PAR_HEURE + ' adresses inconnues en 1 h');
    }
    return n;
  });
}

function heureCourante_() {
  return Utilities.formatDate(new Date(), classeur_().getSpreadsheetTimeZone(), 'yyyy-MM-dd-HH');
}

/**
 * Supprime les compteurs dont la fenêtre est passée, pour que le magasin de propriétés
 * ne se remplisse pas au fil des mois. Appelé au hasard, une fois sur vingt.
 */
function balayerCompteurs_() {
  // Balayage opportuniste, mais SOUS VERROU : hors verrou, il relisait un instantané
  // puis le réécrivait en bloc, effaçant au passage l'incrément d'une requête
  // concurrente (C9 autorise ~30 exécutions simultanées). S'il ne peut pas prendre le
  // verrou tout de suite, il ne force rien : il repassera à la prochaine occasion.
  var verrou = LockService.getScriptLock();
  if (!verrou.tryLock(2000)) return 0;
  try {
    return balayerCompteursSousVerrou_();
  } finally {
    verrou.releaseLock();
  }
}

function balayerCompteursSousVerrou_() {
  var props = PropertiesService.getScriptProperties();
  var toutes = props.getProperties();
  var cles = Object.keys(toutes);
  if (cles.length < SEUIL_BALAYAGE) return 0;

  var maintenant = Date.now();
  var aujourdhui = jourCourant_();
  var cetteHeure = heureCourante_();
  var conserver = {};
  var supprimees = 0;

  cles.forEach(function (cle) {
    var garder = true;
    if (cle.indexOf(PREFIXE_DEMANDES) === 0) {
      var reste = [];
      try {
        reste = JSON.parse(toutes[cle] || '[]').filter(function (t) {
          return maintenant - t < FENETRE_DEMANDES_MS;
        });
      } catch (e) {
        reste = []; // valeur illisible : autant la supprimer
      }
      garder = reste.length > 0;
    } else if (cle.indexOf(PREFIXE_MAILS) === 0) {
      garder = cle === PREFIXE_MAILS + aujourdhui;
    } else if (cle.indexOf(PREFIXE_INCONNUS) === 0) {
      garder = cle === PREFIXE_INCONNUS + cetteHeure;
    } else if (cle.indexOf(PREFIXE_ALERTE) === 0) {
      garder = toutes[cle] === aujourdhui;
    }
    if (garder) conserver[cle] = toutes[cle];
    else supprimees++;
  });

  // Une seule écriture : la suppression clé par clé coûtait des milliers d'allers-retours
  // à l'intérieur de la requête d'un invité, et pouvait franchir la limite de 6 min (C9).
  if (supprimees) {
    try {
      props.setProperties(conserver, true);
    } catch (e) {
      return 0;
    }
  }
  return supprimees;
}

function jourCourant_() {
  return Utilities.formatDate(new Date(), classeur_().getSpreadsheetTimeZone(), 'yyyy-MM-dd');
}

/** Nombre de mails déjà envoyés aujourd'hui par l'application. */
function mailsEnvoyesAujourdhui_() {
  var v = PropertiesService.getScriptProperties().getProperty(PREFIXE_MAILS + jourCourant_());
  return Number(v || 0);
}

/**
 * Réserve un envoi AVANT de l'effectuer, sous verrou.
 *
 * Incrémenter après l'envoi laissait une course : trente requêtes simultanées lisaient
 * le même compteur et dépassaient le plafond d'autant (B2). On réserve donc le créneau,
 * puis on envoie hors du verrou — un envoi dure environ une seconde et sérialiser les
 * envois sous verrou créerait une file d'attente.
 */
function reserverEnvoiMail_(config) {
  var plafond = Number(config.PLAFOND_MAILS_JOUR || 80);
  var cle = PREFIXE_MAILS + jourCourant_();

  return avecVerrou_(function () {
    var props = PropertiesService.getScriptProperties();
    var envoyes = Number(props.getProperty(cle) || 0);

    if (envoyes >= plafond) {
      journaliser_('', 'quota', 'SERVICE_INDISPONIBLE',
                   'plafond applicatif atteint : ' + envoyes + '/' + plafond);
      throw erreurApi_('SERVICE_INDISPONIBLE');
    }

    var restantGoogle = MailApp.getRemainingDailyQuota();
    if (restantGoogle <= 0) {
      journaliser_('', 'quota', 'SERVICE_INDISPONIBLE', 'quota Google épuisé');
      throw erreurApi_('SERVICE_INDISPONIBLE');
    }

    ecrireProprieteOuEchouer_(cle, String(envoyes + 1));

    if (restantGoogle <= 10 || plafond - envoyes <= 10) {
      journaliser_('', 'quota', 'alerte',
                   'reste ' + (plafond - envoyes - 1) + ' envois applicatifs, ' +
                   restantGoogle + ' cote Google');
    }
    return { envoyes: envoyes + 1, plafond: plafond, restantGoogle: restantGoogle };
  });
}

/** Rend le créneau réservé lorsque l'envoi a échoué. */
function libererEnvoiMail_() {
  var cle = PREFIXE_MAILS + jourCourant_();
  try {
    avecVerrou_(function () {
      var props = PropertiesService.getScriptProperties();
      var n = Number(props.getProperty(cle) || 0);
      if (n > 0) props.setProperty(cle, String(n - 1));
    }, 5000);
  } catch (e) {
    // Un créneau perdu est sans gravité : il sera récupéré le lendemain.
  }
}


/* ══════════════════════════════════════════════════════════════════════════
   Codes de connexion
   ══════════════════════════════════════════════════════════════════════════ */

/** Code à 6 chiffres issu d'un UUID v4 plutôt que de Math.random() (D19). */
function genererCode_() {
  var hexa = Utilities.getUuid().replace(/-/g, '').slice(0, 8);
  var n = parseInt(hexa, 16) % 1000000;
  return ('000000' + n).slice(-6);
}

/** Clé de cache d'un code, dérivée de l'adresse (jamais l'adresse elle-même). */
function cleCode_(email) {
  return PREFIXE_CODE + hacher_(normaliserEmail_(email)).slice(0, 48);
}

/**
 * Crée un code pour une adresse et le mémorise (haché) pour 10 minutes.
 * Remplace tout code précédent : demander un nouveau code invalide l'ancien.
 */
function creerCode_(email, foyerId) {
  var code = genererCode_();
  var entree = {
    empreinte: hacher_(code),
    foyerId: foyerId,
    essais: 0,
    expire: Date.now() + DUREE_CODE_S * 1000
  };
  CacheService.getScriptCache().put(cleCode_(email), JSON.stringify(entree), DUREE_CODE_S);
  return code;
}

/**
 * Vérifie un code et retourne { foyerId }, ou lève une erreur d'API.
 * Le code est à usage unique : il est effacé dès qu'il est accepté, et dès que le
 * nombre d'essais est épuisé.
 */
function consommerCode_(email, codeSaisi) {
  // Sous verrou : sans cela, des requêtes simultanées lisent le même compteur
  // d'essais et le plafond de 5 tentatives devient franchissable (A4).
  return avecVerrou_(function () { return consommerCodeSousVerrou_(email, codeSaisi); });
}

function consommerCodeSousVerrou_(email, codeSaisi) {
  var cache = CacheService.getScriptCache();
  var cle = cleCode_(email);
  var brut = cache.get(cle);

  // Absent = jamais demandé, déjà utilisé, ou expiré. On ne distingue pas : même message.
  if (!brut) throw erreurApi_('CODE_EXPIRE');

  var entree;
  try {
    entree = JSON.parse(brut);
  } catch (e) {
    cache.remove(cle);
    throw erreurApi_('CODE_EXPIRE');
  }

  if (Date.now() > entree.expire) {
    cache.remove(cle);
    throw erreurApi_('CODE_EXPIRE');
  }

  if (entree.essais >= ESSAIS_MAX_PAR_CODE) {
    cache.remove(cle);
    throw erreurApi_('TROP_DE_TENTATIVES');
  }

  var saisi = String(codeSaisi == null ? '' : codeSaisi).replace(/\s/g, '');
  if (!memeEmpreinte_(hacher_(saisi), entree.empreinte)) {
    entree.essais++;
    if (entree.essais >= ESSAIS_MAX_PAR_CODE) {
      cache.remove(cle);
      throw erreurApi_('TROP_DE_TENTATIVES');
    }
    var restant = Math.max(Math.ceil((entree.expire - Date.now()) / 1000), 1);
    cache.put(cle, JSON.stringify(entree), restant);
    throw erreurApi_('CODE_INVALIDE');
  }

  cache.remove(cle); // usage unique
  return { foyerId: entree.foyerId, essais: entree.essais };
}

/** Nombre d'essais déjà consommés sur le code en cours, pour le Journal (sans le code). */
function essaisCodeEnCours_(email) {
  var brut = CacheService.getScriptCache().get(cleCode_(email));
  if (!brut) return null;
  try { return JSON.parse(brut).essais; } catch (e) { return null; }
}


/* ══════════════════════════════════════════════════════════════════════════
   Sessions
   ══════════════════════════════════════════════════════════════════════════ */

/** Ouvre une session pour un foyer et retourne le token à remettre au client. */
function ouvrirSession_(foyerId) {
  var token = Utilities.getUuid();
  CacheService.getScriptCache().put(
    PREFIXE_SESSION + hacher_(token),
    JSON.stringify({ foyerId: foyerId, ouverte: Date.now() }),
    DUREE_SESSION_S
  );
  return token;
}

/**
 * Seule façon d'obtenir un foyer_id à partir d'une requête client.
 * Un foyer_id envoyé par le client n'est JAMAIS lu nulle part : c'est ce qui garantit
 * qu'un foyer ne peut pas accéder aux données d'un autre.
 */
function foyerDeSession_(token) {
  var t = String(token == null ? '' : token).trim();
  if (!t) throw erreurApi_('SESSION_EXPIREE');

  var brut = CacheService.getScriptCache().get(PREFIXE_SESSION + hacher_(t));
  if (!brut) throw erreurApi_('SESSION_EXPIREE');

  var session;
  try {
    session = JSON.parse(brut);
  } catch (e) {
    throw erreurApi_('SESSION_EXPIREE');
  }
  if (!session || !session.foyerId) throw erreurApi_('SESSION_EXPIREE');
  return session.foyerId;
}

function fermerSession_(token) {
  var t = String(token == null ? '' : token).trim();
  if (!t) return false;
  var cle = PREFIXE_SESSION + hacher_(t);
  var cache = CacheService.getScriptCache();
  if (!cache.get(cle)) return false;   // rien à fermer : l'appelant ne journalise pas
  cache.remove(cle);
  return true;
}
