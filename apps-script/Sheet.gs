/**
 * Sheet.gs — accès aux données, initialisation du classeur, contrôles qualité, purge.
 *
 * Règles (voir CLAUDE.md et LANCEMENT_PROJET.md) :
 *  - les colonnes sont TOUJOURS retrouvées par nom d'en-tête, jamais par position ;
 *  - toute écriture passe par LockService et doit être idempotente ;
 *  - aucune donnée sensible (code, token, allergie) dans le Journal.
 */

/** Listes de valeurs autorisées, partagées entre validations et contrôles. */
var OUI_NON = ['oui', 'non'];
var TYPES_PERSONNE = ['adulte', 'enfant'];
var REGIMES = ['aucun', 'vegetarien', 'vegan', 'sans_porc', 'sans_gluten', 'menu_enfant', 'autre'];

/** Longueurs maximales des saisies libres (doivent rester alignées sur MODELE_DONNEES.md). */
var LONGUEURS_MAX = {
  personne: 60,
  allergies: 200,
  commentaire: 500,
  nom_affichage: 80,
  notes_maries: 500
};

/** Clés attendues dans l'onglet Config. */
var CLES_CONFIG = [
  'NOM_MARIES', 'DATE_MARIAGE', 'DATE_LIMITE', 'EXPEDITEUR_NOM', 'EXPEDITEUR_ADRESSE',
  'REPLY_TO', 'CONTACT_MARIES', 'URL_SITE', 'PLAFOND_MAILS_JOUR'
];
/** Celles qui ne peuvent pas rester vides (EXPEDITEUR_ADRESSE vide = MailApp, c'est normal). */
var CLES_CONFIG_OBLIGATOIRES = [
  'NOM_MARIES', 'DATE_MARIAGE', 'DATE_LIMITE', 'EXPEDITEUR_NOM',
  'REPLY_TO', 'CONTACT_MARIES', 'PLAFOND_MAILS_JOUR'
];

/**
 * Schéma du classeur. L'ordre des colonnes fait foi pour la création et pour les
 * formules de Synthese (qui dérivent leurs lettres de colonne de ce schéma).
 */
var SCHEMA = {
  Foyers: {
    colonnes: ['foyer_id', 'emails', 'nom_affichage', 'places_max',
               'invite_vin_honneur', 'invite_diner', 'invite_brunch', 'notes_maries'],
    largeurs: [80, 260, 200, 90, 150, 110, 110, 300],
    listes: { invite_vin_honneur: OUI_NON, invite_diner: OUI_NON, invite_brunch: OUI_NON },
    protege: false
  },
  Invites: {
    colonnes: ['foyer_id', 'personne', 'type_personne'],
    largeurs: [80, 220, 130],
    listes: { type_personne: TYPES_PERSONNE },
    protege: false
  },
  Reponses: {
    colonnes: ['foyer_id', 'personne', 'type_personne', 'est_accompagnant', 'presence',
               'age', 'regime', 'allergies', 'commentaire', 'maj_le'],
    largeurs: [80, 200, 120, 140, 90, 60, 130, 280, 320, 170],
    listes: { type_personne: TYPES_PERSONNE, est_accompagnant: OUI_NON,
              presence: OUI_NON, regime: REGIMES },
    protege: true
  },
  Historique: {
    colonnes: ['horodatage', 'soumission_id', 'foyer_id', 'personne', 'type_personne',
               'est_accompagnant', 'presence', 'age', 'regime', 'allergies',
               'commentaire', 'maj_le'],
    largeurs: [170, 280, 80, 200, 120, 140, 90, 60, 130, 280, 320, 170],
    listes: {},
    protege: true
  },
  Config: {
    colonnes: ['cle', 'valeur'],
    largeurs: [220, 420],
    listes: {},
    protege: false
  },
  Journal: {
    colonnes: ['horodatage', 'email', 'action', 'resultat', 'detail'],
    largeurs: [170, 260, 140, 180, 320],
    listes: {},
    protege: true
  },
  Synthese: { colonnes: [], largeurs: [320, 140, 40, 320, 140], listes: {}, protege: true },
  Traiteur: { colonnes: [], largeurs: [200, 120, 60, 140, 320], listes: {}, protege: true }
};

/** Ordre de création des onglets. */
var ORDRE_ONGLETS = ['Foyers', 'Invites', 'Reponses', 'Historique',
                     'Config', 'Journal', 'Synthese', 'Traiteur'];

/** Onglets vidés par la purge post-événement. */
var ONGLETS_PURGEABLES = ['Reponses', 'Historique', 'Journal'];


/* ══════════════════════════════════════════════════════════════════════════
   Utilitaires d'accès
   ══════════════════════════════════════════════════════════════════════════ */

function classeur_() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

/** Lettre de colonne (A, B, … AA) d'un champ, d'après SCHEMA. Utilisé par les formules. */
function lettre_(onglet, champ) {
  var i = SCHEMA[onglet].colonnes.indexOf(champ);
  if (i < 0) throw new Error('Champ inconnu : ' + onglet + '.' + champ);
  var n = i + 1, s = '';
  while (n > 0) {
    var r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

/**
 * Lit un onglet en une seule fois (C9 : une lecture par requête).
 * Retourne { entetes, index, lignes, objets } — `objets` indexe chaque ligne par nom d'en-tête.
 * Les lignes entièrement vides sont ignorées.
 */
function lireOnglet_(nom) {
  var feuille = classeur_().getSheetByName(nom);
  if (!feuille) throw new Error("Onglet introuvable : " + nom + ". Exécutez initialiserSheet().");

  var valeurs = feuille.getDataRange().getValues();
  var entetes = (valeurs.shift() || []).map(function (e) { return String(e).trim(); });

  var index = {};
  entetes.forEach(function (e, i) { if (e) index[e] = i; });

  var lignes = valeurs.filter(function (l) {
    return l.some(function (c) { return String(c).trim() !== ''; });
  });

  var objets = lignes.map(function (ligne, i) {
    var o = { _ligne: i + 2 }; // numéro de ligne réel dans le Sheet
    entetes.forEach(function (e, j) { if (e) o[e] = ligne[j]; });
    return o;
  });

  return { feuille: feuille, entetes: entetes, index: index, lignes: lignes, objets: objets };
}

/** Vérifie que l'onglet possède bien toutes les colonnes du schéma. */
function verifierEntetes_(nom, index) {
  var manquantes = SCHEMA[nom].colonnes.filter(function (c) { return !(c in index); });
  if (manquantes.length) {
    throw new Error("Onglet " + nom + " : colonne(s) manquante(s) — " + manquantes.join(', ') +
                    ". Les en-têtes ne doivent pas être renommés.");
  }
}

/** Config sous forme d'objet { CLE: 'valeur' }. */
function lireConfig_() {
  var t = lireOnglet_('Config');
  var conf = {};
  t.objets.forEach(function (o) {
    var cle = String(o.cle || '').trim();
    if (cle) conf[cle] = typeof o.valeur === 'string' ? o.valeur.trim() : o.valeur;
  });
  return conf;
}

/** Normalisation d'une adresse : trim + minuscules. */
function normaliserEmail_(email) {
  return String(email == null ? '' : email).trim().toLowerCase();
}

/** Découpe la colonne `emails` d'un foyer (adresses séparées par `;`). */
function emailsDuFoyer_(valeur) {
  return String(valeur == null ? '' : valeur)
    .split(';')
    .map(normaliserEmail_)
    .filter(function (e) { return e !== ''; });
}

/** Contrôle de forme volontairement permissif : on refuse l'absurde, pas l'exotique. */
function emailPlausible_(email) {
  return /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]{2,}$/.test(email);
}

/** Horodatage ISO 8601 dans le fuseau du classeur. */
function maintenantIso_() {
  return Utilities.formatDate(new Date(), classeur_().getSpreadsheetTimeZone(),
                              "yyyy-MM-dd'T'HH:mm:ssXXX");
}

/**
 * Écrit une ligne dans Journal. Ne doit JAMAIS recevoir de code, de token,
 * de régime ni d'allergie. N'interrompt jamais la requête en cours.
 */
function journaliser_(email, action, resultat, detail) {
  try {
    var feuille = classeur_().getSheetByName('Journal');
    if (!feuille) return;
    feuille.appendRow([
      maintenantIso_(),
      normaliserEmail_(email),
      String(action || ''),
      String(resultat || ''),
      String(detail == null ? '' : detail).slice(0, 200)
    ]);
  } catch (e) {
    // Un échec de journalisation ne doit pas faire échouer l'action de l'invité.
  }
}


/* ══════════════════════════════════════════════════════════════════════════
   initialiserSheet() — construit un classeur complet à partir de rien
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Crée les onglets manquants, (re)pose les en-têtes, les listes déroulantes,
 * les formats, les formules et les protections.
 *
 * Idempotente : relançable sans risque, elle ne supprime AUCUNE donnée existante.
 */
function initialiserSheet() {
  var ss = classeur_();
  var creees = [], existantes = [];

  ORDRE_ONGLETS.forEach(function (nom, position) {
    var feuille = ss.getSheetByName(nom);
    if (!feuille) {
      feuille = ss.insertSheet(nom, position);
      creees.push(nom);
    } else {
      existantes.push(nom);
    }
    configurerOnglet_(feuille, nom);
  });

  construireSynthese_(ss.getSheetByName('Synthese'));
  construireTraiteur_(ss.getSheetByName('Traiteur'));

  if (creees.indexOf('Config') >= 0) amorcerConfig_(ss.getSheetByName('Config'));

  supprimerFeuilleParDefaut_(ss);
  ORDRE_ONGLETS.forEach(function (nom, i) { ss.setActiveSheet(ss.getSheetByName(nom)); ss.moveActiveSheet(i + 1); });
  ss.setActiveSheet(ss.getSheetByName('Foyers'));

  var message = 'Initialisation terminée.\n\n' +
    'Onglets créés : ' + (creees.length ? creees.join(', ') : 'aucun') + '\n' +
    'Onglets déjà présents (en-têtes et formules remis à jour) : ' +
    (existantes.length ? existantes.join(', ') : 'aucun') + '\n\n' +
    'Étape suivante : remplir Foyers, Invites et Config, puis exécuter verifierDonnees().';

  Logger.log(message);
  afficher_('initialiserSheet', message);
  return message;
}

/** En-têtes, gel, largeurs, listes déroulantes, formats, protection d'un onglet. */
function configurerOnglet_(feuille, nom) {
  var def = SCHEMA[nom];

  if (def.colonnes.length) {
    var entetes = feuille.getRange(1, 1, 1, def.colonnes.length);
    entetes.setValues([def.colonnes]);
    entetes.setFontWeight('bold')
           .setBackground('#f0efeb')
           .setVerticalAlignment('middle');
    feuille.setFrozenRows(1);
    if (feuille.getMaxColumns() > def.colonnes.length) {
      feuille.deleteColumns(def.colonnes.length + 1,
                            feuille.getMaxColumns() - def.colonnes.length);
    }
  }

  (def.largeurs || []).forEach(function (l, i) { feuille.setColumnWidth(i + 1, l); });

  // Listes déroulantes sur toute la colonne, à partir de la ligne 2.
  Object.keys(def.listes || {}).forEach(function (champ) {
    var colonne = def.colonnes.indexOf(champ) + 1;
    var regle = SpreadsheetApp.newDataValidation()
      .requireValueInList(def.listes[champ], true)
      .setAllowInvalid(true)   // on avertit sans bloquer : le script revalide de toute façon
      .setHelpText('Valeurs attendues : ' + def.listes[champ].join(', '))
      .build();
    feuille.getRange(2, colonne, Math.max(feuille.getMaxRows() - 1, 1), 1)
           .setDataValidation(regle);
  });

  // Les champs libres et les identifiants sont forcés en texte brut : évite qu'un
  // nom ou un identifiant soit réinterprété (dates, nombres, notation scientifique).
  ['foyer_id', 'emails', 'personne', 'allergies', 'commentaire', 'notes_maries',
   'nom_affichage', 'cle', 'valeur', 'soumission_id', 'detail'].forEach(function (champ) {
    var i = def.colonnes.indexOf(champ);
    if (i >= 0) {
      feuille.getRange(2, i + 1, Math.max(feuille.getMaxRows() - 1, 1), 1)
             .setNumberFormat('@');
    }
  });

  if (def.protege) protegerEnAvertissement_(feuille);
}

/**
 * Protection « avertissement seul » : les onglets écrits par le script restent
 * modifiables (une correction à la main peut être nécessaire) mais Google demande
 * confirmation, ce qui évite les écrasements accidentels (R16).
 */
function protegerEnAvertissement_(feuille) {
  feuille.getProtections(SpreadsheetApp.ProtectionType.SHEET).forEach(function (p) {
    if (p.canEdit()) p.remove();
  });
  feuille.protect()
         .setDescription('Écrit par le script — modifier à la main uniquement en connaissance de cause')
         .setWarningOnly(true);
}

/** Pré-remplit Config avec les clés attendues et des valeurs d'exemple neutres. */
function amorcerConfig_(feuille) {
  var defauts = {
    NOM_MARIES: 'Les mariés',
    DATE_MARIAGE: '',
    DATE_LIMITE: '',
    EXPEDITEUR_NOM: 'Les mariés',
    EXPEDITEUR_ADRESSE: '',
    REPLY_TO: '',
    CONTACT_MARIES: '',
    URL_SITE: '',
    PLAFOND_MAILS_JOUR: '80'
  };
  var lignes = CLES_CONFIG.map(function (c) { return [c, defauts[c]]; });
  feuille.getRange(2, 1, lignes.length, 2).setValues(lignes);
  feuille.getRange(2, 1, lignes.length, 1).setFontWeight('bold');
}

/** Supprime « Feuille 1 » / « Sheet1 » si elle est restée vide. */
function supprimerFeuilleParDefaut_(ss) {
  ['Feuille 1', 'Feuille1', 'Sheet1'].forEach(function (nom) {
    var f = ss.getSheetByName(nom);
    if (f && ss.getSheets().length > 1 && f.getLastRow() === 0 && f.getLastColumn() === 0) {
      ss.deleteSheet(f);
    }
  });
}


/* ══════════════════════════════════════════════════════════════════════════
   Onglets calculés
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Formules de Synthese. Elles sont écrites en anglais (l'API Apps Script n'accepte
 * que ce format) et s'afficheront traduites dans l'interface française.
 * Les lettres de colonne sont dérivées de SCHEMA : modifier l'ordre d'un onglet
 * met automatiquement les formules à jour au prochain initialiserSheet().
 */
function construireSynthese_(feuille) {
  var rFoyer = lettre_('Reponses', 'foyer_id'),
      rPers  = lettre_('Reponses', 'personne'),
      rType  = lettre_('Reponses', 'type_personne'),
      rAcc   = lettre_('Reponses', 'est_accompagnant'),
      rPres  = lettre_('Reponses', 'presence'),
      rReg   = lettre_('Reponses', 'regime'),
      fId    = lettre_('Foyers', 'foyer_id'),
      fNom   = lettre_('Foyers', 'nom_affichage'),
      fDer   = lettre_('Foyers', 'notes_maries');

  // Index (1-based) des colonnes invite_* dans la plage Foyers!A:H, pour les VLOOKUP.
  var iVin    = SCHEMA.Foyers.colonnes.indexOf('invite_vin_honneur') + 1,
      iDiner  = SCHEMA.Foyers.colonnes.indexOf('invite_diner') + 1,
      iBrunch = SCHEMA.Foyers.colonnes.indexOf('invite_brunch') + 1;

  // Présents dont le foyer est convié à un service donné (présence unique, D07).
  function parService(colonneFoyer) {
    return '=SUMPRODUCT(--(Reponses!$' + rPres + '$2:$' + rPres + '$2000="oui"),' +
           '--(IFERROR(VLOOKUP(Reponses!$' + rFoyer + '$2:$' + rFoyer + '$2000,' +
           'Foyers!$' + fId + '$2:$' + fDer + '$2000,' + colonneFoyer + ',FALSE),"non")="oui"))';
  }

  var bloc = [
    ['SYNTHÈSE', ''],
    ['Mise à jour automatique — ne rien saisir dans cet onglet.', ''],
    ['', ''],
    ['FOYERS', ''],
    ['Foyers invités', '=COUNTA(Foyers!$' + fId + '$2:$' + fId + ')'],
    ['Foyers ayant répondu', '=COUNTUNIQUE(Reponses!$' + rFoyer + '$2:$' + rFoyer + ')'],
    ['Foyers sans réponse', '=B5-B6'],
    ['Taux de réponse', '=IF(B5=0,0,B6/B5)'],
    ['', ''],
    ['PERSONNES', ''],
    ['Personnes nommées (hors +1)', '=COUNTA(Invites!$' + lettre_('Invites', 'personne') + '$2:$' + lettre_('Invites', 'personne') + ')'],
    ['Réponses enregistrées', '=COUNTA(Reponses!$' + rPers + '$2:$' + rPers + ')'],
    ['Présents confirmés', '=COUNTIF(Reponses!$' + rPres + '$2:$' + rPres + ',"oui")'],
    ['Absents', '=COUNTIF(Reponses!$' + rPres + '$2:$' + rPres + ',"non")'],
    ['dont adultes présents', '=COUNTIFS(Reponses!$' + rPres + '$2:$' + rPres + ',"oui",Reponses!$' + rType + '$2:$' + rType + ',"adulte")'],
    ['dont enfants présents', '=COUNTIFS(Reponses!$' + rPres + '$2:$' + rPres + ',"oui",Reponses!$' + rType + '$2:$' + rType + ',"enfant")'],
    ['dont accompagnants (+1)', '=COUNTIFS(Reponses!$' + rPres + '$2:$' + rPres + ',"oui",Reponses!$' + rAcc + '$2:$' + rAcc + ',"oui")'],
    ['', ''],
    ['EFFECTIFS PAR SERVICE', ''],
    ['Vin d’honneur', parService(iVin)],
    ['Dîner', parService(iDiner)],
    ['Brunch', parService(iBrunch)],
    ['', ''],
    ['RÉGIMES (présents uniquement)', '']
  ];

  feuille.getRange(1, 1, bloc.length, 2).setValues(bloc);
  feuille.getRange('B8').setNumberFormat('0.0%');
  [1, 4, 10, 19, 24].forEach(function (l) {
    feuille.getRange(l, 1, 1, 2).setFontWeight('bold').setBackground('#f0efeb');
  });

  // Répartition des régimes, sous le dernier titre.
  feuille.getRange('A25').setFormula(
    '=IFERROR(QUERY(Reponses!$' + rFoyer + '$2:$' + lettre_('Reponses', 'maj_le') + ',' +
    '"select ' + rReg + ', count(' + rReg + ') where ' + rPres + " = 'oui' " +
    'group by ' + rReg + ' order by count(' + rReg + ') desc ' +
    'label ' + rReg + " 'Régime', count(" + rReg + ") 'Personnes'\"),\"\")");

  // Colonne de droite : foyers qui n'ont pas encore répondu (pour les relances).
  feuille.getRange('D4').setValue('FOYERS SANS RÉPONSE')
         .setFontWeight('bold').setBackground('#f0efeb');
  feuille.getRange('E4').setBackground('#f0efeb');
  feuille.getRange('D5').setFormula(
    '=IFERROR(FILTER(Foyers!$' + fNom + '$2:$' + fNom + ',' +
    'Foyers!$' + fId + '$2:$' + fId + '<>"",' +
    'ISNA(MATCH(Foyers!$' + fId + '$2:$' + fId + ',Reponses!$' + rFoyer + '$2:$' + rFoyer + ',0))),' +
    '"— tous les foyers ont répondu —")');
}

/**
 * Vue traiteur : uniquement ce qui sert en cuisine. Ni email, ni commentaire,
 * ni note des mariés — l'onglet peut donc être exporté et transmis tel quel.
 */
function construireTraiteur_(feuille) {
  var c = function (champ) { return lettre_('Reponses', champ); };

  feuille.getRange(1, 1, 1, 5)
         .setValues([['personne', 'type_personne', 'age', 'regime', 'allergies']])
         .setFontWeight('bold').setBackground('#f0efeb');
  feuille.setFrozenRows(1);

  feuille.getRange('A2').setFormula(
    '=IFERROR(FILTER({Reponses!$' + c('personne') + '$2:$' + c('personne') + ',' +
    'Reponses!$' + c('type_personne') + '$2:$' + c('type_personne') + ',' +
    'Reponses!$' + c('age') + '$2:$' + c('age') + ',' +
    'Reponses!$' + c('regime') + '$2:$' + c('regime') + ',' +
    'Reponses!$' + c('allergies') + '$2:$' + c('allergies') + '},' +
    'Reponses!$' + c('presence') + '$2:$' + c('presence') + '="oui"),' +
    '"— aucune présence confirmée pour l\'instant —")');

  feuille.getRange('G1').setValue('À SERVIR').setFontWeight('bold').setBackground('#f0efeb');
  feuille.getRange('H1').setBackground('#f0efeb');
  feuille.getRange('G2:H5').setValues([
    ['Couverts adultes', '=COUNTIFS(Reponses!$' + c('presence') + '$2:$' + c('presence') + ',"oui",Reponses!$' + c('type_personne') + '$2:$' + c('type_personne') + ',"adulte")'],
    ['Couverts enfants', '=COUNTIFS(Reponses!$' + c('presence') + '$2:$' + c('presence') + ',"oui",Reponses!$' + c('type_personne') + '$2:$' + c('type_personne') + ',"enfant")'],
    ['Personnes avec allergie déclarée', '=COUNTIFS(Reponses!$' + c('presence') + '$2:$' + c('presence') + ',"oui",Reponses!$' + c('allergies') + '$2:$' + c('allergies') + ',"<>")'],
    ['Total couverts', '=H2+H3']
  ]);
  feuille.getRange('G1:G5').setFontWeight('bold');
}


/* ══════════════════════════════════════════════════════════════════════════
   verifierDonnees() — contrôles qualité, à lancer depuis l'éditeur
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Passe le classeur en revue et signale tout ce qui empêcherait le site de
 * fonctionner correctement. N'écrit rien, ne corrige rien.
 *
 * Deux niveaux : ERREUR (le site ne marchera pas pour ce foyer) et
 * AVERTISSEMENT (incohérence probable, à regarder).
 */
function verifierDonnees() {
  var anomalies = [];
  var erreur = function (onglet, ligne, texte) {
    anomalies.push({ gravite: 'ERREUR', onglet: onglet, ligne: ligne, texte: texte });
  };
  var avertir = function (onglet, ligne, texte) {
    anomalies.push({ gravite: 'AVERTISSEMENT', onglet: onglet, ligne: ligne, texte: texte });
  };

  var foyers, invites, reponses, config;
  try {
    foyers = lireOnglet_('Foyers');     verifierEntetes_('Foyers', foyers.index);
    invites = lireOnglet_('Invites');   verifierEntetes_('Invites', invites.index);
    reponses = lireOnglet_('Reponses'); verifierEntetes_('Reponses', reponses.index);
    config = lireOnglet_('Config');     verifierEntetes_('Config', config.index);
  } catch (e) {
    var fatal = 'Contrôle impossible : ' + e.message;
    Logger.log(fatal);
    afficher_('verifierDonnees', fatal);
    return fatal;
  }

  /* ---- Foyers ---- */
  var idsVus = {}, emailsVus = {}, placesParFoyer = {}, nomParFoyer = {};

  foyers.objets.forEach(function (f) {
    var l = f._ligne;
    var id = String(f.foyer_id || '').trim();

    if (!id) {
      erreur('Foyers', l, 'foyer_id vide');
    } else if (idsVus[id]) {
      erreur('Foyers', l, 'foyer_id « ' + id + ' » déjà utilisé ligne ' + idsVus[id]);
    } else {
      idsVus[id] = l;
    }

    var adresses = emailsDuFoyer_(f.emails);
    if (!adresses.length) {
      erreur('Foyers', l, 'aucune adresse email — ce foyer ne pourra pas se connecter');
    }
    adresses.forEach(function (e) {
      if (!emailPlausible_(e)) {
        erreur('Foyers', l, 'adresse email mal formée : « ' + e + ' »');
      }
      if (emailsVus[e]) {
        erreur('Foyers', l, 'adresse « ' + e + ' » déjà utilisée ligne ' + emailsVus[e] +
               ' — une adresse ne peut appartenir qu\'à un seul foyer');
      } else {
        emailsVus[e] = l;
      }
    });

    var nom = String(f.nom_affichage || '').trim();
    if (!nom) {
      erreur('Foyers', l, 'nom_affichage vide — l\'invité ne saurait pas qui est concerné');
    } else if (nom.length > LONGUEURS_MAX.nom_affichage) {
      avertir('Foyers', l, 'nom_affichage de ' + nom.length + ' caractères (maximum conseillé ' +
              LONGUEURS_MAX.nom_affichage + ')');
    }
    if (id) nomParFoyer[id] = nom;

    var places = f.places_max;
    if (places === '' || places === null || isNaN(Number(places)) || Number(places) % 1 !== 0) {
      erreur('Foyers', l, 'places_max doit être un nombre entier (valeur : « ' + places + ' »)');
    } else if (Number(places) < 1) {
      erreur('Foyers', l, 'places_max vaut ' + places + ' — attendu au moins 1');
    } else if (id) {
      placesParFoyer[id] = Number(places);
    }

    var services = ['invite_vin_honneur', 'invite_diner', 'invite_brunch'];
    var auMoinsUn = false;
    services.forEach(function (s) {
      var v = String(f[s] || '').trim().toLowerCase();
      if (OUI_NON.indexOf(v) < 0) {
        erreur('Foyers', l, s + ' vaut « ' + f[s] +' » — attendu oui ou non');
      } else if (v === 'oui') {
        auMoinsUn = true;
      }
    });
    if (!auMoinsUn) {
      avertir('Foyers', l, 'ce foyer n\'est invité à aucun événement — vérifier');
    }

    if (String(f.notes_maries || '').length > LONGUEURS_MAX.notes_maries) {
      avertir('Foyers', l, 'notes_maries dépasse ' + LONGUEURS_MAX.notes_maries + ' caractères');
    }
  });

  /* ---- Invites ---- */
  var personnesParFoyer = {};

  invites.objets.forEach(function (p) {
    var l = p._ligne;
    var id = String(p.foyer_id || '').trim();
    var nom = String(p.personne || '').trim();

    if (!id) {
      erreur('Invites', l, 'foyer_id vide');
    } else if (!idsVus[id]) {
      erreur('Invites', l, 'foyer_id « ' + id + ' » inconnu dans Foyers');
    }

    if (!nom) {
      erreur('Invites', l, 'personne vide');
    } else if (nom.length > LONGUEURS_MAX.personne) {
      avertir('Invites', l, 'nom de ' + nom.length + ' caractères (maximum ' +
              LONGUEURS_MAX.personne + ')');
    }

    var type = String(p.type_personne || '').trim().toLowerCase();
    if (TYPES_PERSONNE.indexOf(type) < 0) {
      erreur('Invites', l, 'type_personne vaut « ' + p.type_personne +
             ' » — attendu ' + TYPES_PERSONNE.join(' ou '));
    }

    if (id && nom) {
      if (!personnesParFoyer[id]) personnesParFoyer[id] = {};
      var cle = nom.toLowerCase();
      if (personnesParFoyer[id][cle]) {
        erreur('Invites', l, '« ' + nom + ' » apparaît deux fois dans le foyer ' + id +
               ' (déjà ligne ' + personnesParFoyer[id][cle] + ')');
      } else {
        personnesParFoyer[id][cle] = l;
      }
    }
  });

  // Cohérence foyer ↔ invités
  Object.keys(idsVus).forEach(function (id) {
    var nb = personnesParFoyer[id] ? Object.keys(personnesParFoyer[id]).length : 0;
    if (nb === 0) {
      erreur('Foyers', idsVus[id], 'foyer ' + id + ' (' + (nomParFoyer[id] || '?') +
             ') : aucune personne dans Invites');
    } else if (placesParFoyer[id] !== undefined && placesParFoyer[id] < nb) {
      erreur('Foyers', idsVus[id], 'foyer ' + id + ' : places_max = ' + placesParFoyer[id] +
             ' alors que ' + nb + ' personnes sont nommées dans Invites');
    }
  });

  /* ---- Reponses ---- */
  var vuesReponses = {}, presentsParFoyer = {};

  reponses.objets.forEach(function (r) {
    var l = r._ligne;
    var id = String(r.foyer_id || '').trim();
    var nom = String(r.personne || '').trim();
    var presence = String(r.presence || '').trim().toLowerCase();
    var type = String(r.type_personne || '').trim().toLowerCase();
    var accompagnant = String(r.est_accompagnant || '').trim().toLowerCase();

    if (!id) {
      erreur('Reponses', l, 'foyer_id vide');
    } else if (!idsVus[id]) {
      erreur('Reponses', l, 'réponse orpheline : foyer_id « ' + id + ' » absent de Foyers');
    }
    if (!nom) erreur('Reponses', l, 'personne vide');

    var cle = id + '||' + nom.toLowerCase();
    if (vuesReponses[cle]) {
      erreur('Reponses', l, 'doublon : « ' + nom + ' » du foyer ' + id +
             ' a déjà une réponse ligne ' + vuesReponses[cle]);
    } else {
      vuesReponses[cle] = l;
    }

    if (OUI_NON.indexOf(presence) < 0) {
      erreur('Reponses', l, 'presence vaut « ' + r.presence + ' » — attendu oui ou non');
    }
    if (TYPES_PERSONNE.indexOf(type) < 0) {
      erreur('Reponses', l, 'type_personne vaut « ' + r.type_personne + ' »');
    }
    if (OUI_NON.indexOf(accompagnant) < 0) {
      erreur('Reponses', l, 'est_accompagnant vaut « ' + r.est_accompagnant + ' »');
    }

    // Une personne non accompagnante doit être nommée dans Invites.
    if (id && nom && accompagnant === 'non' && idsVus[id] &&
        !(personnesParFoyer[id] && personnesParFoyer[id][nom.toLowerCase()])) {
      avertir('Reponses', l, '« ' + nom + ' » n\'est pas dans Invites pour le foyer ' + id +
              ' (nom modifié dans Invites après la réponse ?)');
    }

    var age = r.age;
    var ageRenseigne = !(age === '' || age === null || age === undefined);
    if (presence === 'oui' && type === 'enfant') {
      if (!ageRenseigne) {
        avertir('Reponses', l, 'enfant présent sans âge renseigné');
      } else if (isNaN(Number(age)) || Number(age) < 0 || Number(age) > 17 || Number(age) % 1 !== 0) {
        erreur('Reponses', l, 'age vaut « ' + age + ' » — attendu un entier de 0 à 17');
      }
    } else if (ageRenseigne && type === 'adulte') {
      avertir('Reponses', l, 'age renseigné pour un adulte');
    }

    var regime = String(r.regime || '').trim().toLowerCase();
    if (presence === 'oui' && REGIMES.indexOf(regime) < 0) {
      erreur('Reponses', l, 'regime vaut « ' + r.regime + ' » — attendu : ' + REGIMES.join(', '));
    }

    if (String(r.allergies || '').length > LONGUEURS_MAX.allergies) {
      avertir('Reponses', l, 'allergies dépasse ' + LONGUEURS_MAX.allergies + ' caractères');
    }
    if (String(r.commentaire || '').length > LONGUEURS_MAX.commentaire) {
      avertir('Reponses', l, 'commentaire dépasse ' + LONGUEURS_MAX.commentaire + ' caractères');
    }

    if (presence === 'oui' && id) {
      presentsParFoyer[id] = (presentsParFoyer[id] || 0) + 1;
    }
  });

  Object.keys(presentsParFoyer).forEach(function (id) {
    if (placesParFoyer[id] !== undefined && presentsParFoyer[id] > placesParFoyer[id]) {
      erreur('Reponses', '—', 'foyer ' + id + ' : ' + presentsParFoyer[id] +
             ' présents déclarés pour places_max = ' + placesParFoyer[id]);
    }
  });

  /* ---- Config ---- */
  var conf = {};
  config.objets.forEach(function (c) {
    var cle = String(c.cle || '').trim();
    if (cle) conf[cle] = String(c.valeur == null ? '' : c.valeur).trim();
  });

  CLES_CONFIG.forEach(function (cle) {
    if (!(cle in conf)) {
      erreur('Config', '—', 'clé manquante : ' + cle);
    } else if (CLES_CONFIG_OBLIGATOIRES.indexOf(cle) >= 0 && conf[cle] === '') {
      erreur('Config', '—', 'clé ' + cle + ' vide');
    }
  });
  Object.keys(conf).forEach(function (cle) {
    if (CLES_CONFIG.indexOf(cle) < 0) avertir('Config', '—', 'clé inconnue ignorée : ' + cle);
  });

  ['DATE_MARIAGE', 'DATE_LIMITE'].forEach(function (cle) {
    var v = conf[cle];
    if (v && !/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      erreur('Config', '—', cle + ' vaut « ' + v + ' » — format attendu AAAA-MM-JJ');
    }
  });
  if (/^\d{4}-\d{2}-\d{2}$/.test(conf.DATE_LIMITE || '') &&
      /^\d{4}-\d{2}-\d{2}$/.test(conf.DATE_MARIAGE || '') &&
      conf.DATE_LIMITE > conf.DATE_MARIAGE) {
    erreur('Config', '—', 'DATE_LIMITE (' + conf.DATE_LIMITE +
           ') est postérieure à DATE_MARIAGE (' + conf.DATE_MARIAGE + ')');
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(conf.DATE_LIMITE || '')) {
    var aujourdhui = Utilities.formatDate(new Date(), classeur_().getSpreadsheetTimeZone(), 'yyyy-MM-dd');
    if (conf.DATE_LIMITE < aujourdhui) {
      avertir('Config', '—', 'DATE_LIMITE est dépassée : le formulaire est en lecture seule');
    }
  }

  var plafond = Number(conf.PLAFOND_MAILS_JOUR);
  if (conf.PLAFOND_MAILS_JOUR && (isNaN(plafond) || plafond < 1 || plafond % 1 !== 0)) {
    erreur('Config', '—', 'PLAFOND_MAILS_JOUR doit être un entier positif');
  } else if (plafond > 90) {
    avertir('Config', '—', 'PLAFOND_MAILS_JOUR = ' + plafond +
            ' : trop proche du quota Gmail (~100/jour), risque de coupure en pleine journée');
  }

  ['REPLY_TO', 'CONTACT_MARIES', 'EXPEDITEUR_ADRESSE'].forEach(function (cle) {
    if (conf[cle] && !emailPlausible_(normaliserEmail_(conf[cle]))) {
      erreur('Config', '—', cle + ' n\'est pas une adresse valide : « ' + conf[cle] + ' »');
    }
  });

  return produireRapport_(anomalies, foyers.objets.length, invites.objets.length,
                          reponses.objets.length);
}

/** Met en forme le résultat de verifierDonnees() pour le journal d'exécution et l'interface. */
function produireRapport_(anomalies, nbFoyers, nbInvites, nbReponses) {
  var erreurs = anomalies.filter(function (a) { return a.gravite === 'ERREUR'; });
  var avertissements = anomalies.filter(function (a) { return a.gravite === 'AVERTISSEMENT'; });

  var lignes = [
    'CONTRÔLE DES DONNÉES — ' + maintenantIso_(),
    '',
    nbFoyers + ' foyers · ' + nbInvites + ' personnes nommées · ' + nbReponses + ' réponses',
    erreurs.length + ' erreur(s) · ' + avertissements.length + ' avertissement(s)',
    ''
  ];

  if (!anomalies.length) {
    lignes.push('Aucune anomalie détectée.');
  } else {
    erreurs.concat(avertissements).forEach(function (a) {
      var ou = a.ligne === '—' ? a.onglet : a.onglet + ' ligne ' + a.ligne;
      lignes.push('[' + a.gravite + '] ' + ou + ' — ' + a.texte);
    });
  }

  var rapport = lignes.join('\n');
  Logger.log(rapport);
  afficher_('verifierDonnees', rapport.length > 1200
    ? rapport.slice(0, 1200) + '\n\n[…] Rapport complet dans Exécutions → Journaux.'
    : rapport);
  return rapport;
}


/* ══════════════════════════════════════════════════════════════════════════
   purgerDonneesPostEvenement() — RGPD, phase P6
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Vide Reponses, Historique et Journal après l'événement (C14, R12).
 * Foyers, Invites et Config ne sont pas touchés.
 *
 * Double sécurité, parce que l'opération est irréversible :
 *  1. depuis l'éditeur avec une interface : une confirmation est demandée ;
 *  2. sans interface : la Script Property PURGE_CONFIRMEE doit valoir exactement
 *     la date du jour au format AAAA-MM-JJ.
 *
 * Avant de lancer : faire Fichier → Télécharger → Microsoft Excel, et archiver le fichier
 * hors du dépôt git.
 */
function purgerDonneesPostEvenement() {
  var ss = classeur_();
  var compte = ONGLETS_PURGEABLES.map(function (nom) {
    var f = ss.getSheetByName(nom);
    return nom + ' : ' + (f ? Math.max(f.getLastRow() - 1, 0) : 0) + ' ligne(s)';
  }).join('\n');

  var question = 'PURGE DÉFINITIVE des données de réponse.\n\n' + compte +
    '\n\nFoyers, Invites et Config seront conservés.\n' +
    'Avez-vous exporté le classeur en Excel au préalable ?\n\nCette action est irréversible.';

  if (!confirmer_(question)) {
    var annule = 'Purge annulée — aucune donnée supprimée.';
    Logger.log(annule);
    return annule;
  }

  var verrou = LockService.getScriptLock();
  if (!verrou.tryLock(30000)) throw new Error('Classeur occupé, purge abandonnée. Réessayez.');

  try {
    ONGLETS_PURGEABLES.forEach(function (nom) {
      var f = ss.getSheetByName(nom);
      if (f && f.getLastRow() > 1) {
        f.getRange(2, 1, f.getLastRow() - 1, f.getMaxColumns()).clearContent();
      }
    });
    PropertiesService.getScriptProperties().deleteProperty('PURGE_CONFIRMEE');
  } finally {
    verrou.releaseLock();
  }

  var message = 'Purge effectuée le ' + maintenantIso_() + '.\n\n' + compte +
                '\n\nOnglets vidés : ' + ONGLETS_PURGEABLES.join(', ') + '.';
  Logger.log(message);
  afficher_('Purge', message);
  return message;
}


/* ══════════════════════════════════════════════════════════════════════════
   Dialogue avec l'éditeur
   ══════════════════════════════════════════════════════════════════════════ */

/** Affiche un message si une interface est disponible ; sinon ne fait rien (le log suffit). */
function afficher_(titre, message) {
  try {
    SpreadsheetApp.getUi().alert(titre, message, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) {
    // Exécution sans interface (déclencheur, API) : le journal d'exécution fait foi.
  }
}

/** Confirmation explicite, par boîte de dialogue ou par Script Property datée du jour. */
function confirmer_(question) {
  try {
    var ui = SpreadsheetApp.getUi();
    return ui.alert('Confirmation requise', question, ui.ButtonSet.YES_NO) === ui.Button.YES;
  } catch (e) {
    var attendu = Utilities.formatDate(new Date(), classeur_().getSpreadsheetTimeZone(), 'yyyy-MM-dd');
    return PropertiesService.getScriptProperties().getProperty('PURGE_CONFIRMEE') === attendu;
  }
}

/** Menu « Mariage » dans le classeur, pour ne pas avoir à passer par l'éditeur. */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Mariage')
    .addItem('Initialiser / réparer le classeur', 'initialiserSheet')
    .addItem('Vérifier les données', 'verifierDonnees')
    .addSeparator()
    .addItem('Purger les données (après l\'événement)', 'purgerDonneesPostEvenement')
    .addToUi();
}


/* ══════════════════════════════════════════════════════════════════════════
   Accès métier : foyers et réponses
   (utilisé par Code.gs — ajouté en Phase 2)
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Retrouve le foyer auquel appartient une adresse.
 * La colonne `emails` peut contenir plusieurs adresses séparées par `;` (D08).
 * Retourne le foyer_id, ou null si l'adresse est inconnue.
 */
function trouverFoyerParEmail_(email) {
  var cherche = normaliserEmail_(email);
  if (!cherche) return null;

  var t = lireOnglet_('Foyers');
  verifierEntetes_('Foyers', t.index);

  for (var i = 0; i < t.objets.length; i++) {
    if (emailsDuFoyer_(t.objets[i].emails).indexOf(cherche) >= 0) {
      return String(t.objets[i].foyer_id || '').trim() || null;
    }
  }
  return null;
}

/**
 * Charge tout ce qu'il faut pour afficher le formulaire d'un foyer.
 * Ne retourne JAMAIS les adresses email ni les notes des mariés.
 */
function chargerFoyer_(foyerId) {
  var tf = lireOnglet_('Foyers');
  verifierEntetes_('Foyers', tf.index);

  var ligne = null;
  tf.objets.forEach(function (f) {
    if (String(f.foyer_id || '').trim() === foyerId) ligne = f;
  });
  if (!ligne) throw erreurApi_('SESSION_EXPIREE'); // foyer supprimé pendant la session

  var ti = lireOnglet_('Invites');
  verifierEntetes_('Invites', ti.index);

  var personnes = ti.objets
    .filter(function (p) { return String(p.foyer_id || '').trim() === foyerId; })
    .map(function (p) {
      return {
        nom: String(p.personne || '').trim(),
        type: String(p.type_personne || 'adulte').trim().toLowerCase()
      };
    })
    .filter(function (p) { return p.nom !== ''; });

  var estOui = function (v) { return String(v || '').trim().toLowerCase() === 'oui'; };

  return {
    foyerId: foyerId,
    nom: String(ligne.nom_affichage || '').trim(),
    placesMax: Number(ligne.places_max) || personnes.length,
    personnes: personnes,
    invitations: {
      vinHonneur: estOui(ligne.invite_vin_honneur),
      diner: estOui(ligne.invite_diner),
      brunch: estOui(ligne.invite_brunch)
    }
  };
}

/** Réponses déjà enregistrées pour un foyer, pour pré-remplir le formulaire. */
function lireReponsesFoyer_(foyerId) {
  var t = lireOnglet_('Reponses');
  verifierEntetes_('Reponses', t.index);

  var lignes = t.objets.filter(function (r) {
    return String(r.foyer_id || '').trim() === foyerId;
  });

  return {
    commentaire: lignes.length ? String(lignes[0].commentaire || '') : '',
    majLe: lignes.length ? String(lignes[0].maj_le || '') : '',
    personnes: lignes.map(function (r) {
      return {
        personne: String(r.personne || '').trim(),
        type: String(r.type_personne || 'adulte').trim().toLowerCase(),
        estAccompagnant: String(r.est_accompagnant || 'non').trim().toLowerCase() === 'oui',
        presence: String(r.presence || '').trim().toLowerCase() === 'oui',
        age: r.age === '' || r.age === null || r.age === undefined ? null : Number(r.age),
        regime: String(r.regime || '').trim().toLowerCase(),
        allergies: String(r.allergies || '')
      };
    })
  };
}

/**
 * Remplace toutes les lignes d'un foyer dans Reponses et archive la version dans Historique.
 *
 * Idempotente et protégée par LockService (C10) : deux soumissions simultanées du même
 * foyer, ou la même soumission envoyée deux fois, ne produisent jamais de doublon.
 *
 * `personnes` est une liste déjà validée et assainie par Code.gs.
 */
function ecrireReponsesFoyer_(foyerId, personnes, commentaire) {
  var verrou = LockService.getScriptLock();
  if (!verrou.tryLock(20000)) {
    journaliser_('', 'submitRsvp', 'SERVICE_INDISPONIBLE', 'verrou indisponible');
    throw erreurApi_('SERVICE_INDISPONIBLE');
  }

  try {
    var t = lireOnglet_('Reponses');
    verifierEntetes_('Reponses', t.index);

    var horodatage = maintenantIso_();
    var soumissionId = Utilities.getUuid();

    // Les lignes sont construites d'après les en-têtes RÉELS de la feuille :
    // si les mariés ont déplacé une colonne, l'écriture reste correcte.
    var valeurParChamp = function (p) {
      return {
        foyer_id: foyerId,
        personne: p.personne,
        type_personne: p.type,
        est_accompagnant: p.estAccompagnant ? 'oui' : 'non',
        presence: p.presence ? 'oui' : 'non',
        age: p.age === null || p.age === undefined ? '' : p.age,
        regime: p.regime || '',
        allergies: p.allergies || '',
        commentaire: commentaire || '',
        maj_le: horodatage
      };
    };

    var nouvelles = personnes.map(function (p) {
      var champs = valeurParChamp(p);
      return t.entetes.map(function (e) { return e in champs ? champs[e] : ''; });
    });

    var conservees = t.lignes.filter(function (l) {
      return String(l[t.index.foyer_id] || '').trim() !== foyerId;
    });

    var toutes = conservees.concat(nouvelles);
    var nbColonnes = t.entetes.length;
    var ancienNb = t.lignes.length;

    if (ancienNb > 0) {
      t.feuille.getRange(2, 1, ancienNb, nbColonnes).clearContent();
    }
    if (toutes.length > 0) {
      t.feuille.getRange(2, 1, toutes.length, nbColonnes).setValues(toutes);
    }

    archiverDansHistorique_(soumissionId, horodatage, foyerId, personnes, commentaire);

    return { horodatage: horodatage, soumissionId: soumissionId, lignes: nouvelles.length };
  } finally {
    verrou.releaseLock();
  }
}

/** Ajoute une version complète dans Historique, en une seule écriture. */
function archiverDansHistorique_(soumissionId, horodatage, foyerId, personnes, commentaire) {
  var t = lireOnglet_('Historique');
  verifierEntetes_('Historique', t.index);

  var lignes = personnes.map(function (p) {
    var champs = {
      horodatage: horodatage,
      soumission_id: soumissionId,
      foyer_id: foyerId,
      personne: p.personne,
      type_personne: p.type,
      est_accompagnant: p.estAccompagnant ? 'oui' : 'non',
      presence: p.presence ? 'oui' : 'non',
      age: p.age === null || p.age === undefined ? '' : p.age,
      regime: p.regime || '',
      allergies: p.allergies || '',
      commentaire: commentaire || '',
      maj_le: horodatage
    };
    return t.entetes.map(function (e) { return e in champs ? champs[e] : ''; });
  });

  if (!lignes.length) return;
  t.feuille.getRange(t.feuille.getLastRow() + 1, 1, lignes.length, t.entetes.length)
           .setValues(lignes);
}
