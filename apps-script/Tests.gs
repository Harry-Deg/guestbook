/**
 * Tests.gs — fonctions exécutables depuis l'éditeur Apps Script.
 *
 * Deux familles, volontairement séparées :
 *
 *  - testerFonctionsPures()   aucun effet de bord : ni mail, ni écriture dans le classeur.
 *                             À lancer après chaque modification du code.
 *
 *  - testerParcoursComplet()  envoie un VRAI mail et écrit dans Reponses.
 *  - testerAntiAbus()         consomme le quota horaire d'une adresse.
 *                             À lancer sur un foyer de test uniquement.
 *
 * L'adresse de test n'est JAMAIS écrite dans le code (C1, D05) : elle est lue dans
 * la Script Property `EMAIL_TEST` (Paramètres du projet → Propriétés du script).
 */

/** Lit l'adresse de test, ou explique comment la définir. */
function emailDeTest_() {
  var email = PropertiesService.getScriptProperties().getProperty('EMAIL_TEST');
  if (!email) {
    throw new Error(
      'Script Property EMAIL_TEST absente.\n' +
      'Éditeur → Paramètres du projet (roue dentée) → Propriétés du script → Ajouter :\n' +
      '  EMAIL_TEST = votre adresse, qui doit aussi figurer dans l\'onglet Foyers.'
    );
  }
  return normaliserEmail_(email);
}

/** Petit cadre de test : accumule les résultats et produit un rapport lisible. */
function cadre_() {
  var resultats = [];
  return {
    verifier: function (intitule, condition, detail) {
      resultats.push({ ok: !!condition, intitule: intitule, detail: detail || '' });
    },
    egal: function (intitule, obtenu, attendu) {
      var ok = JSON.stringify(obtenu) === JSON.stringify(attendu);
      resultats.push({
        ok: ok,
        intitule: intitule,
        detail: ok ? '' : 'obtenu ' + JSON.stringify(obtenu) + ', attendu ' + JSON.stringify(attendu)
      });
    },
    leve: function (intitule, codeAttendu, fonction) {
      try {
        fonction();
        resultats.push({ ok: false, intitule: intitule, detail: 'aucune erreur levée' });
      } catch (e) {
        var code = e && e.codeApi ? e.codeApi : '(' + (e && e.message) + ')';
        resultats.push({
          ok: code === codeAttendu,
          intitule: intitule,
          detail: code === codeAttendu ? '' : 'obtenu ' + code + ', attendu ' + codeAttendu
        });
      }
    },
    rapport: function (titre) {
      var echecs = resultats.filter(function (r) { return !r.ok; });
      var lignes = [titre, ''];
      resultats.forEach(function (r) {
        lignes.push((r.ok ? '  OK   ' : '  ÉCHEC') + ' · ' + r.intitule +
                    (r.detail ? ' — ' + r.detail : ''));
      });
      lignes.push('', resultats.length + ' contrôle(s), ' + echecs.length + ' échec(s).');
      var texte = lignes.join('\n');
      Logger.log(texte);
      afficher_(titre, texte);
      return texte;
    }
  };
}


/* ══════════════════════════════════════════════════════════════════════════
   Tests sans effet de bord
   ══════════════════════════════════════════════════════════════════════════ */

function testerFonctionsPures() {
  var t = cadre_();

  /* ---- Neutralisation des formules (C11) ---- */
  t.verifier('formule = neutralisée',
    assainirTexte_('=IMPORTXML("http://x","//a")', 200).charAt(0) === "'");
  t.verifier('formule + neutralisée', assainirTexte_('+1+1', 200).charAt(0) === "'");
  t.verifier('formule - neutralisée', assainirTexte_('-1-1', 200).charAt(0) === "'");
  t.verifier('formule @ neutralisée', assainirTexte_('@SUM(A1)', 200).charAt(0) === "'");
  t.verifier('formule masquée par des espaces neutralisée',
    assainirTexte_('   =1+1', 200).charAt(0) === "'");
  t.egal('texte ordinaire intact', assainirTexte_('Marie Durand', 200), 'Marie Durand');
  t.egal('tiret en milieu de mot conservé',
    assainirTexte_('Jean-Pierre Durand', 200), 'Jean-Pierre Durand');
  t.egal('balise script stockée telle quelle (échappée à l\'affichage)',
    assainirTexte_('<script>alert(1)</script>', 200), '<script>alert(1)</script>');

  /* ---- Troncature ---- */
  var long = new Array(6000).join('a');
  t.egal('allergies tronquées à 200',
    assainirTexte_(long, LONGUEURS_MAX.allergies).length, LONGUEURS_MAX.allergies);
  t.egal('commentaire tronqué à 500',
    assainirTexte_(long, LONGUEURS_MAX.commentaire).length, LONGUEURS_MAX.commentaire);

  /* ---- Codes ---- */
  var codes = {};
  for (var i = 0; i < 200; i++) codes[genererCode_()] = true;
  t.verifier('codes à 6 chiffres', /^\d{6}$/.test(genererCode_()));
  t.verifier('200 tirages donnent au moins 190 valeurs distinctes',
    Object.keys(codes).length >= 190, Object.keys(codes).length + ' distinctes');

  /* ---- Empreintes ---- */
  t.verifier('même entrée, même empreinte', hacher_('123456') === hacher_('123456'));
  t.verifier('entrées différentes, empreintes différentes', hacher_('123456') !== hacher_('123457'));
  t.verifier('empreinte sur 64 hexas', /^[0-9a-f]{64}$/.test(hacher_('x')));
  t.verifier('comparaison constante : égalité', memeEmpreinte_(hacher_('a'), hacher_('a')));
  t.verifier('comparaison constante : différence', !memeEmpreinte_(hacher_('a'), hacher_('b')));

  /* ---- Emails ---- */
  t.egal('email normalisé', normaliserEmail_('  Marie.Durand@Example.COM '), 'marie.durand@example.com');
  t.egal('emails multiples découpés',
    emailsDuFoyer_('A@example.com; b@example.com '), ['a@example.com', 'b@example.com']);
  t.verifier('adresse plausible acceptée', emailPlausible_('a.b@example.com'));
  t.verifier('adresse sans @ refusée', !emailPlausible_('pas-une-adresse'));

  /* ---- Entiers ---- */
  t.egal('âge 7 accepté', entierOuNull_(7, 0, 17), 7);
  t.egal('âge 18 refusé', entierOuNull_(18, 0, 17), null);
  t.egal('âge décimal refusé', entierOuNull_(7.5, 0, 17), null);
  t.egal('âge vide refusé', entierOuNull_('', 0, 17), null);

  /* ---- Échappement HTML du mail ---- */
  t.egal('HTML échappé',
    echapperHtml_('<b>"x"</b>'), '&lt;b&gt;&quot;x&quot;&lt;/b&gt;');

  /* ---- Session : un token inconnu ne donne accès à rien ---- */
  t.leve('token vide refusé', 'SESSION_EXPIREE', function () { foyerDeSession_(''); });
  t.leve('token inventé refusé', 'SESSION_EXPIREE', function () {
    foyerDeSession_('00000000-0000-4000-8000-000000000000');
  });

  /* ---- Config ---- */
  var config = lireConfig_();
  t.verifier('Config lisible et non vide', Object.keys(config).length > 0);
  t.verifier('DATE_LIMITE présente', !!config.DATE_LIMITE, 'valeur : ' + config.DATE_LIMITE);

  return t.rapport('Tests sans effet de bord');
}

/**
 * Affiche le mail de code dans le journal, sans rien envoyer.
 * Sert à relire le texte et à vérifier le rendu avant de le soumettre à de vrais invités.
 */
function apercuMailCode() {
  var message = construireMailCode_('123456', lireConfig_());
  var texte = 'SUJET : ' + message.sujet + '\n\n--- VERSION TEXTE ---\n' + message.texte +
              '\n\n--- VERSION HTML ---\n' + message.html;
  Logger.log(texte);
  afficher_('Aperçu du mail (rien n\'a été envoyé)', texte.slice(0, 1200));
  return texte;
}


/* ══════════════════════════════════════════════════════════════════════════
   Tests avec effets de bord — foyer de test uniquement
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Parcours complet : demande de code, lecture du code côté serveur, vérification,
 * soumission, double soumission, relecture.
 *
 * ⚠️ Envoie un vrai mail à EMAIL_TEST et écrit dans Reponses pour ce foyer.
 */
function testerParcoursComplet() {
  var t = cadre_();
  var email = emailDeTest_();

  var foyerId = trouverFoyerParEmail_(email);
  t.verifier('EMAIL_TEST rattachée à un foyer', !!foyerId, 'foyer ' + foyerId);
  if (!foyerId) return t.rapport('Parcours complet');

  /* 1. Demande de code (un mail part réellement) */
  var avant = mailsEnvoyesAujourdhui_();
  actionRequestCode_({ email: email, website: '' });
  t.egal('un mail comptabilisé', mailsEnvoyesAujourdhui_(), avant + 1);

  /* 2. Le code est en cache, haché : on ne peut pas le relire. On en recrée un
        connu pour la suite du test, ce qui invalide le précédent. */
  var code = creerCode_(email, foyerId);
  t.verifier('code à 6 chiffres', /^\d{6}$/.test(code));

  /* 3. Mauvais code */
  t.leve('mauvais code refusé', 'CODE_INVALIDE', function () {
    actionVerifyCode_({ email: email, code: code === '000000' ? '111111' : '000000' });
  });

  /* 4. Bon code */
  var session = actionVerifyCode_({ email: email, code: code });
  t.verifier('token délivré', !!session.token);
  t.verifier('foyer renvoyé', !!session.foyer && !!session.foyer.nom);
  t.verifier('aucun email dans la réponse',
    JSON.stringify(session).toLowerCase().indexOf(email) < 0);
  t.verifier('aucun foyer_id dans la réponse',
    JSON.stringify(session).indexOf(foyerId) < 0);

  /* 5. Code à usage unique */
  t.leve('code rejoué refusé', 'CODE_EXPIRE', function () {
    actionVerifyCode_({ email: email, code: code });
  });

  /* 6. Soumission */
  var personnes = session.foyer.personnes.map(function (p, i) {
    return {
      personne: p.nom,
      presence: i === 0 ? 'oui' : 'non',
      regime: i === 0 ? 'aucun' : '',
      allergies: i === 0 ? 'Test allergie' : '',
      age: p.type === 'enfant' ? 7 : null
    };
  });
  var envoi = actionSubmitRsvp_({
    token: session.token,
    reponses: personnes,
    commentaire: '=TEST() commentaire de recette'
  });
  t.verifier('récapitulatif renvoyé', !!envoi.recap);
  t.egal('un seul présent', envoi.recap.presents, 1);
  t.verifier('commentaire neutralisé', envoi.recap.commentaire.charAt(0) === "'",
    envoi.recap.commentaire.slice(0, 20));

  /* 7. Idempotence : la même soumission ne doit pas créer de doublon */
  actionSubmitRsvp_({ token: session.token, reponses: personnes, commentaire: 'deuxième envoi' });
  var relu = lireReponsesFoyer_(foyerId);
  t.egal('aucun doublon après double soumission',
    relu.personnes.length, session.foyer.personnes.length);

  /* 8. Relecture par token */
  var etat = actionGetRsvp_({ token: session.token });
  t.egal('relecture cohérente', etat.reponses.length, relu.personnes.length);

  /* 9. Déconnexion */
  actionLogout_({ token: session.token });
  t.leve('token invalidé après logout', 'SESSION_EXPIREE', function () {
    actionGetRsvp_({ token: session.token });
  });

  return t.rapport('Parcours complet (foyer de test)');
}

/**
 * Isolation entre foyers : un token valide ne doit jamais permettre de toucher
 * un autre foyer, même si la requête contient un foyer_id.
 *
 * ⚠️ Écrit dans Reponses pour le foyer de test.
 */
function testerIsolationFoyer() {
  var t = cadre_();
  var email = emailDeTest_();
  var foyerId = trouverFoyerParEmail_(email);
  if (!foyerId) {
    t.verifier('EMAIL_TEST rattachée à un foyer', false);
    return t.rapport('Isolation entre foyers');
  }

  // Un autre foyer existant, pour tenter de l'atteindre.
  var autre = null;
  lireOnglet_('Foyers').objets.forEach(function (f) {
    var id = String(f.foyer_id || '').trim();
    if (id && id !== foyerId && !autre) autre = id;
  });
  t.verifier('un second foyer existe pour le test', !!autre, 'foyer ' + autre);
  if (!autre) return t.rapport('Isolation entre foyers');

  var avantAutre = JSON.stringify(lireReponsesFoyer_(autre));

  var token = ouvrirSession_(foyerId);
  var etat = actionGetRsvp_({ token: token, foyer_id: autre, foyerId: autre });
  var attendu = chargerFoyer_(foyerId);
  t.egal('getRsvp ignore le foyer_id injecté', etat.foyer.nom, attendu.nom);

  var personnes = attendu.personnes.map(function (p) {
    return { personne: p.nom, presence: 'non' };
  });
  actionSubmitRsvp_({
    token: token, foyer_id: autre, foyerId: autre,
    reponses: personnes, commentaire: 'test isolation'
  });
  t.egal('submitRsvp n\'a pas touché l\'autre foyer',
    JSON.stringify(lireReponsesFoyer_(autre)), avantAutre);

  // Tentative d'ajout d'une personne qui n'est pas du foyer.
  t.leve('personne hors foyer refusée au-delà des places', 'DONNEES_INVALIDES', function () {
    var trop = personnes.concat([
      { personne: 'Intrus Un', presence: 'non' },
      { personne: 'Intrus Deux', presence: 'non' },
      { personne: 'Intrus Trois', presence: 'non' },
      { personne: 'Intrus Quatre', presence: 'non' }
    ]);
    actionSubmitRsvp_({ token: token, reponses: trop, commentaire: '' });
  });

  fermerSession_(token);
  return t.rapport('Isolation entre foyers');
}

/**
 * Anti-abus : plafond horaire par adresse et honeypot.
 *
 * ⚠️ Consomme le quota horaire de EMAIL_TEST et envoie jusqu'à 5 mails.
 * Après ce test, EMAIL_TEST ne pourra plus demander de code avant une heure.
 */
function testerAntiAbus() {
  var t = cadre_();
  var email = emailDeTest_();

  /* Honeypot : rien ne doit partir */
  var avant = mailsEnvoyesAujourdhui_();
  actionRequestCode_({ email: email, website: 'http://spam.example' });
  t.egal('honeypot : aucun mail envoyé', mailsEnvoyesAujourdhui_(), avant);

  /* Adresse inconnue */
  t.leve('adresse inconnue refusée', 'EMAIL_INCONNU', function () {
    actionRequestCode_({ email: 'inconnu.' + Date.now() + '@example.com', website: '' });
  });

  /* Plafond horaire : on épuise les demandes restantes */
  var bloque = false;
  for (var i = 0; i < DEMANDES_MAX_PAR_HEURE + 1; i++) {
    try {
      actionRequestCode_({ email: email, website: '' });
    } catch (e) {
      if (e && e.codeApi === 'TROP_DE_TENTATIVES') { bloque = true; break; }
      if (e && e.codeApi === 'SERVICE_INDISPONIBLE') {
        t.verifier('plafond mail atteint avant le plafond horaire', false,
                   'abaissez PLAFOND_MAILS_JOUR ou réessayez demain');
        return t.rapport('Anti-abus');
      }
      throw e;
    }
  }
  t.verifier('plafond horaire par adresse appliqué', bloque,
             'après ' + DEMANDES_MAX_PAR_HEURE + ' demandes');

  /* Les compteurs survivent au vidage du cache (C7) */
  CacheService.getScriptCache().removeAll([cleCode_(email)]);
  t.leve('plafond toujours actif après vidage du cache', 'TROP_DE_TENTATIVES', function () {
    actionRequestCode_({ email: email, website: '' });
  });

  return t.rapport('Anti-abus');
}

/**
 * Non-régressions issues de la revue croisée de Phase 4.
 *
 * Aucun mail n'est envoyé. Le test touche à DATE_LIMITE dans Config et la remet
 * en place à la fin, même en cas d'échec.
 */
function testerCorrectionsP4() {
  var t = cadre_();
  var email = emailDeTest_();

  /* ── Journal : plus un seul chemin non authentifié et sans plafond ───── */
  var avant = compterLignesJournal_();
  for (var i = 0; i < 15; i++) actionLogout_({ token: 'jamais-ouvert-' + i });
  actionLogout_({});
  t.verifier('16 logout sans session n\'écrivent aucune ligne de Journal',
             compterLignesJournal_() === avant,
             (compterLignesJournal_() - avant) + ' ligne(s) écrite(s)');

  avant = compterLignesJournal_();
  for (var j = 0; j < 10; j++) {
    try { actionRequestCode_({ email: 'pas-une-adresse', website: 'robot' }); } catch (e) {}
  }
  t.verifier('10 adresses mal formées avec le piège rempli n\'écrivent rien',
             compterLignesJournal_() === avant,
             (compterLignesJournal_() - avant) + ' ligne(s) écrite(s)');

  /* ── DATE_LIMITE illisible : une alerte par jour, pas une par visiteur ─ */
  var feuille = classeur_().getSheetByName('Config');
  var ligne = trouverLigneConfig_(feuille, 'DATE_LIMITE');
  var valeurInitiale = ligne ? feuille.getRange(ligne, 2).getValue() : null;
  var cleAlerte = PREFIXE_ALERTE +
    hacher_('DATE_LIMITE illisible : « 30/04/2027 »').slice(0, 16);

  try {
    PropertiesService.getScriptProperties().deleteProperty(cleAlerte);
    if (ligne) {
      feuille.getRange(ligne, 2).setValue('30/04/2027');  // le réflexe français
      SpreadsheetApp.flush();
      avant = compterLignesJournal_();
      for (var k = 0; k < 12; k++) actionPing_();
      var ecrites = compterLignesJournal_() - avant;
      t.verifier('12 chargements de page n\'écrivent qu\'une seule alerte',
                 ecrites === 1, ecrites + ' ligne(s)');
      t.verifier('on échoue ouvert : les réponses restent possibles',
                 actionPing_().reponsesOuvertes === true);
    }
  } finally {
    if (ligne) {
      feuille.getRange(ligne, 2).setValue(valeurInitiale);
      SpreadsheetApp.flush();
    }
    PropertiesService.getScriptProperties().deleteProperty(cleAlerte);
  }

  /* ── L'adresse de contact est servie par l'API, plus écrite dans le dépôt ── */
  var pong = actionPing_();
  t.verifier('ping sert CONTACT_MARIES depuis l\'onglet Config',
             typeof pong.contact === 'string' && pong.contact.indexOf('@') > 0,
             'reçu « ' + pong.contact + ' » — renseignez CONTACT_MARIES dans Config');

  /* ── L'apostrophe de neutralisation ne remonte pas vers l'invité ─────── */
  t.verifier('sansApostrophe_ retire la protection du Sheet',
             sansApostrophe_("'-sans lactose") === '-sans lactose');
  t.verifier('sansApostrophe_ ne touche pas un texte normal',
             sansApostrophe_('sans lactose') === 'sans lactose');
  t.verifier('neutraliserFormule_ protège toujours le Sheet',
             neutraliserFormule_('=TEST()').charAt(0) === "'");

  /* ── Doublons de noms : même clé que celle utilisée à l'exécution ────── */
  var nfc = 'Jos\u00e9 Bernard';          // é précomposé (saisie clavier)
  var nfd = 'Jose\u0301 Bernard';         // e + accent combinant (copier-coller macOS)
  t.verifier('deux écritures Unicode du même nom donnent la même clé',
             cleNom_(nfc) === cleNom_(nfd),
             cleNom_(nfc) + ' vs ' + cleNom_(nfd));
  t.verifier('toLowerCase() ne les aurait PAS vues identiques',
             nfc.toLowerCase() !== nfd.toLowerCase());

  return t.rapport('Corrections de la revue P4');
}

/** Nombre de lignes de données du Journal (en-tête exclu). */
function compterLignesJournal_() {
  var feuille = classeur_().getSheetByName('Journal');
  return feuille ? Math.max(feuille.getLastRow() - 1, 0) : 0;
}

/** Numéro de ligne d'une clé dans Config, ou null. */
function trouverLigneConfig_(feuille, cle) {
  if (!feuille) return null;
  var derniere = feuille.getLastRow();
  if (derniere < 2) return null;
  var cles = feuille.getRange(2, 1, derniere - 1, 1).getValues();
  for (var i = 0; i < cles.length; i++) {
    if (String(cles[i][0]).trim() === cle) return i + 2;
  }
  return null;
}

/**
 * Remet à zéro le compteur horaire de EMAIL_TEST, pour pouvoir enchaîner les tests
 * sans attendre une heure.
 */
function reinitialiserCompteurDeTest() {
  var email = emailDeTest_();
  var cle = PREFIXE_DEMANDES + hacher_(email).slice(0, 32);
  PropertiesService.getScriptProperties().deleteProperty(cle);
  var message = 'Compteur horaire remis à zéro pour l\'adresse de test.';
  Logger.log(message);
  afficher_('Tests', message);
  return message;
}
