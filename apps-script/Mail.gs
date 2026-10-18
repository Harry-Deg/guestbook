/**
 * Mail.gs — gabarit et envoi du mail contenant le code de connexion.
 *
 * Contraintes qui ont façonné ce fichier :
 *  - C8  : quota d'environ 100 destinataires par jour sur un Gmail gratuit ;
 *  - C13 : l'expéditeur est le Gmail de Harry pour l'instant, rien n'est codé en dur ;
 *  - C15 : un mail transactionnel part facilement en spam — sujet sobre, texte court,
 *          aucune image, aucun lien raccourci, une version texte toujours présente.
 */

/** Échappe les caractères qui ont un sens en HTML. À appliquer à TOUTE valeur insérée. */
function echapperHtml_(valeur) {
  return String(valeur == null ? '' : valeur)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Vérifie qu'un envoi est possible, et lève SERVICE_INDISPONIBLE sinon.
 *
 * Deux garde-fous :
 *  1. le plafond applicatif PLAFOND_MAILS_JOUR, que nous maîtrisons ;
 *  2. le quota Google réel, qui peut déjà avoir été entamé par un autre usage du compte.
 */
function verifierQuotaMail_(config) {
  var plafond = Number(config.PLAFOND_MAILS_JOUR || 80);
  var envoyes = mailsEnvoyesAujourdhui_();

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

  // Avertissement anticipé : laisse le temps de réagir avant la coupure.
  if (restantGoogle <= 10 || plafond - envoyes <= 10) {
    journaliser_('', 'quota', 'alerte',
                 'reste ' + (plafond - envoyes) + ' envois applicatifs, ' +
                 restantGoogle + ' côté Google');
  }

  return { envoyes: envoyes, plafond: plafond, restantGoogle: restantGoogle };
}

/**
 * Construit le mail. Séparé de l'envoi pour pouvoir être relu et testé sans rien expédier
 * (voir apercuMailCode() dans Tests.gs).
 */
function construireMailCode_(code, config) {
  var nomMaries = String(config.NOM_MARIES || 'Les mariés');
  var urlSite = String(config.URL_SITE || '');

  var sujet = 'Votre code de connexion : ' + code;

  var lignesTexte = [
    'Bonjour,',
    '',
    'Voici votre code pour confirmer votre présence au mariage de ' + nomMaries + ' :',
    '',
    '    ' + code,
    '',
    'Ce code est valable 10 minutes et ne peut servir qu\'une fois.',
    'Si vous ne l\'avez pas demandé, ignorez ce message : personne ne peut accéder à',
    'vos informations sans ce code.',
    ''
  ];
  if (urlSite) {
    lignesTexte.push('Le site : ' + urlSite, '');
  }
  lignesTexte.push('À très bientôt,', nomMaries);
  var texte = lignesTexte.join('\n');

  // Mise en forme volontairement minimale : tableaux et styles en ligne, aucune image,
  // aucune police externe — c'est ce qui passe partout, Outlook compris.
  var html =
    '<div style="font-family:Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;' +
    'color:#2c2a26;max-width:480px;margin:0 auto;padding:24px 16px;">' +
      '<p style="margin:0 0 16px;">Bonjour,</p>' +
      '<p style="margin:0 0 24px;">Voici votre code pour confirmer votre présence au mariage de ' +
        echapperHtml_(nomMaries) + '&nbsp;:</p>' +
      '<p style="margin:0 0 24px;text-align:center;">' +
        '<span style="display:inline-block;font-family:Menlo,Consolas,monospace;' +
        'font-size:34px;letter-spacing:7px;font-weight:bold;color:#2c2a26;' +
        'background:#f0efeb;border-radius:8px;padding:14px 20px;">' +
        echapperHtml_(code) + '</span></p>' +
      '<p style="margin:0 0 16px;">Ce code est valable <strong>10 minutes</strong> ' +
        'et ne peut servir qu\'une fois.</p>' +
      '<p style="margin:0 0 24px;color:#6b665e;font-size:14px;">' +
        'Si vous ne l\'avez pas demandé, ignorez ce message&nbsp;: personne ne peut ' +
        'accéder à vos informations sans ce code.</p>' +
      (urlSite
        ? '<p style="margin:0 0 24px;font-size:14px;">Le site&nbsp;: <a href="' +
          echapperHtml_(urlSite) + '" style="color:#7a6a52;">' +
          echapperHtml_(urlSite) + '</a></p>'
        : '') +
      '<p style="margin:0;">À très bientôt,<br>' + echapperHtml_(nomMaries) + '</p>' +
    '</div>';

  return { sujet: sujet, texte: texte, html: html };
}

/**
 * Envoie le code. Le quota doit avoir été vérifié juste avant par verifierQuotaMail_().
 *
 * L'adresse d'expédition n'est jamais codée en dur (C13) :
 *  - EXPEDITEUR_ADRESSE vide  → MailApp, le mail part du compte qui exécute le script ;
 *  - EXPEDITEUR_ADRESSE remplie → GmailApp avec un alias « Envoyer en tant que ».
 *
 * La seconde branche demande d'ajouter la portée https://www.googleapis.com/auth/gmail.send
 * dans appsscript.json puis de réautoriser le script : tant que ce n'est pas fait, laisser
 * EXPEDITEUR_ADRESSE vide (voir §8 du brief et docs/MIGRATION_MAIL.md le moment venu).
 */
function envoyerCode_(email, code, config) {
  var message = construireMailCode_(code, config);
  var expediteurNom = String(config.EXPEDITEUR_NOM || config.NOM_MARIES || 'Les mariés');
  var replyTo = normaliserEmail_(config.REPLY_TO || '');
  var alias = normaliserEmail_(config.EXPEDITEUR_ADRESSE || '');

  var options = {
    name: expediteurNom,
    htmlBody: message.html,
    noReply: false
  };
  if (replyTo) options.replyTo = replyTo;

  if (alias) {
    options.from = alias;
    GmailApp.sendEmail(email, message.sujet, message.texte, options);
  } else {
    MailApp.sendEmail(email, message.sujet, message.texte, options);
  }

  incrementerMailsEnvoyes_();
}
