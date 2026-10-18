/**
 * Code.gs — point d'entrée de l'Application Web et implémentation des actions.
 *
 * Contrat : POST sur /exec, corps JSON en text/plain (C3), réponse toujours en
 * HTTP 200 (C4) de la forme { ok:true, ... } ou { ok:false, error:"CODE" }.
 *
 * Règle absolue : le foyer concerné par une action est TOUJOURS dérivé du token
 * côté serveur. Un `foyer_id` présent dans la requête est purement et simplement
 * ignoré — il n'est lu nulle part dans ce fichier.
 */

var VERSION = '0.2.0';

/** Longueur maximale acceptée pour un corps de requête (garde-fou grossier). */
var TAILLE_MAX_REQUETE = 20000;

/** Libellés des événements, pour l'affichage côté front. */
var EVENEMENTS = [
  { cle: 'vinHonneur', libelle: 'Vin d\'honneur' },
  { cle: 'diner', libelle: 'Dîner' },
  { cle: 'brunch', libelle: 'Brunch du lendemain' }
];

/** Fabrique une erreur dont le code fait partie du contrat d'API. */
function erreurApi_(code) {
  var e = new Error(code);
  e.codeApi = code;
  return e;
}


/* ══════════════════════════════════════════════════════════════════════════
   Entrées HTTP
   ══════════════════════════════════════════════════════════════════════════ */

var ROUTES = {
  ping: actionPing_,
  requestCode: actionRequestCode_,
  verifyCode: actionVerifyCode_,
  getRsvp: actionGetRsvp_,
  submitRsvp: actionSubmitRsvp_,
  logout: actionLogout_
};

function doPost(e) {
  var requete;
  try {
    var brut = e && e.postData ? e.postData.contents : '';
    if (!brut || brut.length > TAILLE_MAX_REQUETE) throw new Error('corps invalide');
    requete = JSON.parse(brut);
    if (!requete || typeof requete !== 'object') throw new Error('corps invalide');
  } catch (err) {
    return repondre_({ ok: false, error: 'DONNEES_INVALIDES' });
  }

  var action = String(requete.action || '');
  var traitement = Object.prototype.hasOwnProperty.call(ROUTES, action) ? ROUTES[action] : null;
  if (!traitement) return repondre_({ ok: false, error: 'DONNEES_INVALIDES' });

  try {
    var resultat = traitement(requete) || {};
    resultat.ok = true;
    return repondre_(resultat);
  } catch (err) {
    if (err && err.codeApi) {
      return repondre_({ ok: false, error: err.codeApi });
    }
    // Erreur inattendue : la trace reste dans le journal d'exécution, jamais dans la réponse.
    Logger.log('ERREUR ' + action + ' : ' + (err && err.stack ? err.stack : err));
    journaliser_('', action, 'ERREUR_SERVEUR', String(err && err.message || '').slice(0, 120));
    return repondre_({ ok: false, error: 'ERREUR_SERVEUR' });
  }
}

/**
 * GET sert uniquement à vérifier d'un coup d'œil, dans un navigateur, que le
 * déploiement répond et quelle version est en ligne (R09).
 */
function doGet() {
  return repondre_({ ok: true, service: 'rsvp', version: VERSION });
}

function repondre_(objet) {
  return ContentService
    .createTextOutput(JSON.stringify(objet))
    .setMimeType(ContentService.MimeType.JSON);
}


/* ══════════════════════════════════════════════════════════════════════════
   Date limite
   ══════════════════════════════════════════════════════════════════════════ */

/** true tant que la date limite n'est pas passée (comparaison en date locale du classeur). */
function reponsesOuvertes_(config) {
  var limite = String(config.DATE_LIMITE || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(limite)) {
    // On échoue ouvert plutôt que de bloquer tout le monde sur une faute de frappe,
    // mais l'incident est tracé : sans cela, il passerait totalement inaperçu.
    journaliser_('', 'config', 'alerte', 'DATE_LIMITE illisible : « ' + limite + ' »');
    return true;
  }
  return jourCourant_() <= limite;
}


/* ══════════════════════════════════════════════════════════════════════════
   Actions
   ══════════════════════════════════════════════════════════════════════════ */

/** ping — vérification de vie et état des réponses (D16). */
function actionPing_() {
  var config = lireConfig_();
  return {
    version: VERSION,
    dateLimite: String(config.DATE_LIMITE || ''),
    reponsesOuvertes: reponsesOuvertes_(config)
  };
}

/**
 * requestCode — envoie un code à 6 chiffres.
 *
 * Ordre des contrôles, choisi à dessein :
 *  1. honeypot, avant tout travail ;
 *  2. forme de l'adresse — rejet muet, sans écrire dans le classeur (A6) ;
 *  3. existence du foyer ;
 *  4. si l'adresse est inconnue : plafond GLOBAL de sondage, une seule clé par heure.
 *     Il remplace l'ancien plafond par adresse, qui créait une clé persistante par
 *     adresse inventée et permettait de saturer définitivement PropertiesService (B3).
 *     Placé sur cette seule branche, il ne peut jamais bloquer un invité légitime ;
 *  5. plafond par adresse, réservé aux adresses invitées ;
 *  6. réservation du créneau d'envoi sous verrou, puis envoi hors verrou.
 */
function actionRequestCode_(requete) {
  var email = normaliserEmail_(requete.email);

  // Champ caché : un humain ne le voit pas, un robot le remplit. On fait semblant
  // d'accepter pour ne rien lui apprendre, et on n'envoie rien.
  if (String(requete.website || '').trim() !== '') {
    journaliser_(email, 'requestCode', 'ok', 'honeypot - aucun envoi');
    return {};
  }

  // Rejet sur la forme : rien n'est journalisé, pas même une ligne. Chaque requête
  // malformée écrivait sinon une ligne dans le classeur, sans aucune limite (A6).
  if (!email || !emailPlausible_(email)) {
    throw erreurApi_('EMAIL_INCONNU');
  }

  // La recherche du foyer vient AVANT le plafond de sondage. L'inverse était tentant
  // (il économise une lecture du Sheet) mais il faisait passer tout le monde par un
  // compteur global : 50 sondages d'un robot auraient bloqué les vrais invités pendant
  // une heure. Le plafond ne doit jamais pouvoir atteindre un invité légitime.
  var foyerId = trouverFoyerParEmail_(email);

  if (!foyerId) {
    // Plafond GLOBAL, une seule clé par heure. Aucune clé n'est créée par adresse
    // inconnue : sinon 10 000 adresses inventées saturaient PropertiesService de façon
    // définitive, bloquant toute connexion (B3).
    if (!sondageInconnuAutorise_()) throw erreurApi_('TROP_DE_TENTATIVES');
    compterSondageInconnu_();
    journaliser_(email, 'requestCode', 'EMAIL_INCONNU', '');
    throw erreurApi_('EMAIL_INCONNU');
  }

  // Plafond par adresse, réservé aux adresses réellement invitées.
  if (!demandeAutorisee_(email)) {
    journaliser_(email, 'requestCode', 'TROP_DE_TENTATIVES',
                 'plus de ' + DEMANDES_MAX_PAR_HEURE + ' demandes en 1 h');
    throw erreurApi_('TROP_DE_TENTATIVES');
  }

  if (Math.random() < 0.05) balayerCompteurs_();

  var config = lireConfig_();
  var quota = reserverEnvoiMail_(config);   // réserve le créneau sous verrou
  var code = creerCode_(email, foyerId);

  try {
    envoyerCode_(email, code, config);      // envoi hors du verrou
  } catch (err) {
    libererEnvoiMail_();
    journaliser_(email, 'requestCode', 'SERVICE_INDISPONIBLE', 'envoi impossible');
    throw erreurApi_('SERVICE_INDISPONIBLE');
  }

  journaliser_(email, 'requestCode', 'ok',
               'envois du jour : ' + quota.envoyes + '/' + quota.plafond);
  return {};
}

/** verifyCode — échange un code valide contre un token de session. */
function actionVerifyCode_(requete) {
  var email = normaliserEmail_(requete.email);
  var saisi = String(requete.code == null ? '' : requete.code).replace(/\s/g, '');

  // Le format de l'ADRESSE est contrôlé ici aussi : sans cela, verifyCode restait un
  // moyen d'écrire une ligne de Journal par requête avec une chaîne arbitraire (A6).
  if (!email || !emailPlausible_(email) || !/^\d{6}$/.test(saisi)) {
    throw erreurApi_('CODE_INVALIDE'); // rejet sur la forme : rien à journaliser
  }

  var resultat;
  try {
    resultat = consommerCode_(email, saisi);
  } catch (err) {
    if (err && err.codeApi) {
      var essais = essaisCodeEnCours_(email);
      journaliser_(email, 'verifyCode', err.codeApi,
                   essais === null ? '' : 'essai ' + essais + '/' + ESSAIS_MAX_PAR_CODE);
    }
    throw err;
  }

  var token = ouvrirSession_(resultat.foyerId);
  journaliser_(email, 'verifyCode', 'ok', '');

  var donnees = etatFoyer_(resultat.foyerId);
  donnees.token = token;
  return donnees;
}

/** getRsvp — relit l'état du foyer à partir du seul token. */
function actionGetRsvp_(requete) {
  var foyerId = foyerDeSession_(requete.token);
  return etatFoyer_(foyerId);
}

/** logout — invalide le token côté serveur. */
function actionLogout_(requete) {
  fermerSession_(requete.token);
  journaliser_('', 'logout', 'ok', '');
  return {};
}

/**
 * Charge l'état complet renvoyé au client après connexion.
 * Ni email, ni notes des mariés, ni foyer_id : le client n'en a aucun usage légitime.
 */
function etatFoyer_(foyerId) {
  var config = lireConfig_();
  var foyer = chargerFoyer_(foyerId);
  var existant = lireReponsesFoyer_(foyerId);

  var evenements = EVENEMENTS
    .filter(function (ev) { return foyer.invitations[ev.cle]; })
    .map(function (ev) { return { cle: ev.cle, libelle: ev.libelle }; });

  return {
    foyer: {
      nom: foyer.nom,
      // `cle` est l'index d'appariement interne : inutile au client, donc retiré.
      personnes: foyer.personnes.map(function (p) {
        return { nom: p.nom, type: p.type };
      }),
      placesMax: foyer.placesMax,
      invitations: foyer.invitations
    },
    reponses: existant.personnes,
    commentaire: existant.commentaire,
    majLe: existant.majLe,
    dateLimite: String(config.DATE_LIMITE || ''),
    reponsesOuvertes: reponsesOuvertes_(config),
    evenements: evenements
  };
}


/* ══════════════════════════════════════════════════════════════════════════
   submitRsvp
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Lit le champ `presence` en liste blanche stricte.
 *
 * L'ancienne version traitait toute valeur non reconnue comme une absence : « oui »
 * avec une espace finale, « 1 » ou « yes » déclaraient silencieusement le foyer absent,
 * sur le seul champ dont dépendent le traiteur et le plan de table (A3).
 */
function lirePresence_(valeur) {
  if (valeur === true) return true;
  if (valeur === false) return false;
  var v = String(valeur == null ? '' : valeur).trim().toLowerCase();
  if (v === 'oui' || v === 'true') return true;
  if (v === 'non' || v === 'false') return false;
  throw erreurApi_('DONNEES_INVALIDES');
}

/**
 * submitRsvp — enregistre la réponse du foyer.
 *
 * Le client envoie une liste de personnes. Le serveur ne lui fait confiance sur rien :
 *  - le foyer vient du token ;
 *  - chaque personne nommée est rapprochée de l'onglet Invites, et son type vient de là ;
 *  - toute personne non reconnue est traitée comme un accompagnant, et n'est acceptée
 *    que si le foyer a des places libres ;
 *  - toute saisie libre est assainie et tronquée avant écriture.
 */
function actionSubmitRsvp_(requete) {
  var foyerId = foyerDeSession_(requete.token);
  var config = lireConfig_();

  if (!reponsesOuvertes_(config)) {
    journaliser_('', 'submitRsvp', 'DATE_LIMITE_DEPASSEE', foyerId);
    throw erreurApi_('DATE_LIMITE_DEPASSEE');
  }

  var foyer = chargerFoyer_(foyerId);
  var recues = requete.reponses;
  if (!recues || Object.prototype.toString.call(recues) !== '[object Array]' || !recues.length) {
    throw erreurApi_('DONNEES_INVALIDES');
  }
  if (recues.length > foyer.placesMax + foyer.personnes.length) {
    throw erreurApi_('DONNEES_INVALIDES'); // garde-fou avant toute boucle
  }

  // Object.create(null) et non {} : avec un objet littéral, parNom['constructor']
  // renvoie Object, et une personne nommée « constructor » échappait au plafond
  // d'accompagnants tout en écrivant une ligne vide dans Reponses (A2).
  var parNom = Object.create(null);
  foyer.personnes.forEach(function (p) { parNom[p.cle] = p; });

  var vus = Object.create(null);
  var retenues = [];

  recues.forEach(function (brut) {
    if (!brut || typeof brut !== 'object') throw erreurApi_('DONNEES_INVALIDES');

    var nomSaisi = assainirTexte_(brut.personne, LONGUEURS_MAX.personne);
    if (!nomSaisi) throw erreurApi_('DONNEES_INVALIDES');

    // Même fonction de clé que celle appliquée aux noms venant d'Invites (A1).
    var cle = cleNom_(brut.personne);
    if (vus[cle]) throw erreurApi_('DONNEES_INVALIDES'); // même personne deux fois
    vus[cle] = true;

    var connue = parNom[cle] || null;
    var presence = lirePresence_(brut.presence);

    var personne = {
      // Pour une personne nommée, on réécrit le nom tel qu'il figure dans Invites :
      // le client ne peut pas renommer un invité.
      personne: connue ? connue.nom : nomSaisi,
      type: connue ? connue.type : 'adulte',
      estAccompagnant: !connue,
      presence: presence,
      age: null,
      regime: '',
      allergies: ''
    };

    if (presence) {
      var regime = String(brut.regime || '').trim().toLowerCase();
      if (REGIMES.indexOf(regime) < 0) throw erreurApi_('DONNEES_INVALIDES');
      personne.regime = regime;
      personne.allergies = assainirTexte_(brut.allergies, LONGUEURS_MAX.allergies);

      if (personne.type === 'enfant') {
        var age = entierOuNull_(brut.age, 0, 17);
        if (age === null) throw erreurApi_('DONNEES_INVALIDES');
        personne.age = age;
      }
    }

    retenues.push(personne);
  });

  // Toutes les personnes nommées du foyer doivent avoir été renseignées.
  if (foyer.personnes.some(function (p) { return !vus[p.cle]; })) {
    throw erreurApi_('DONNEES_INVALIDES');
  }

  // Accompagnants : seulement dans la limite des places libres (D09).
  var nbAccompagnants = retenues.filter(function (p) { return p.estAccompagnant; }).length;
  if (nbAccompagnants > Math.max(foyer.placesMax - foyer.personnes.length, 0)) {
    throw erreurApi_('DONNEES_INVALIDES');
  }

  var presents = retenues.filter(function (p) { return p.presence; }).length;
  if (presents > foyer.placesMax) throw erreurApi_('DONNEES_INVALIDES');

  var commentaire = assainirTexte_(requete.commentaire, LONGUEURS_MAX.commentaire);
  var ecriture = ecrireReponsesFoyer_(foyerId, retenues, commentaire);

  journaliser_('', 'submitRsvp', 'ok',
               foyerId + ' : ' + ecriture.lignes + ' ligne(s), ' + presents + ' présent(s)');

  // L'apostrophe de neutralisation protège le Sheet, elle n'a rien à faire sous les
  // yeux de l'invité : il verrait « '=TEST() » au lieu de ce qu'il a écrit.
  var sansApostrophe = function (v) {
    return String(v || '').charAt(0) === "'" ? String(v).slice(1) : String(v || '');
  };

  return {
    recap: {
      nom: foyer.nom,
      presents: presents,
      absents: retenues.length - presents,
      personnes: retenues.map(function (p) {
        return {
          personne: sansApostrophe(p.personne),
          type: p.type,
          estAccompagnant: p.estAccompagnant,
          presence: p.presence,
          age: p.age,
          regime: p.regime,
          allergies: sansApostrophe(p.allergies)
        };
      }),
      commentaire: sansApostrophe(commentaire),
      majLe: ecriture.horodatage
    }
  };
}
