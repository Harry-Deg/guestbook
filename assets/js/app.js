/**
 * app.js — écrans et logique d'interface.
 *
 * Deux règles tenues partout dans ce fichier :
 *
 *  1. Aucune donnée venant du serveur ou de l'invité n'est jamais injectée en
 *     HTML. Tout passe par `textContent` ou par `creer()`. C'est la parade XSS
 *     contre un nom ou un commentaire hostile saisi dans le Sheet (M9).
 *  2. Pendant un appel réseau, le bouton est désactivé et le dit. Le démarrage
 *     à froid d'Apps Script dure 1 à 4 s (C5) : sans cela, l'invité clique
 *     trois fois.
 */

import { call, session } from './api.js';

/**
 * Adresse de contact, renseignée par `ping` au chargement.
 *
 * Elle vit dans l'onglet `Config` du classeur, PAS dans ce dépôt : le dépôt est
 * public, et une adresse en clair y serait moissonnée en quelques jours. Tant que
 * `ping` n'a pas répondu, elle est vide et les phrases qui la citent s'en passent.
 */
let contactMaries = '';

/** « , ou écrivez-nous à x@y » — chaîne vide tant que l'adresse est inconnue. */
function ecrireNous(prefixe = ', ou écrivez-nous à ') {
  return contactMaries ? `${prefixe}${contactMaries}` : '';
}

/**
 * Enregistre l'adresse reçue du serveur et la rend cliquable dans le pied de page.
 * Le pied disait « Écrivez-nous. » sans donner d'adresse : c'est pourtant le premier
 * endroit où un invité en difficulté va la chercher.
 */
function appliquerContact(adresse) {
  contactMaries = String(adresse || '').trim();
  const pied = document.getElementById('contact-pied');
  if (!pied || !contactMaries) return;
  vider(pied);
  pied.appendChild(document.createTextNode('Une question\u00a0? Écrivez-nous à '));
  pied.appendChild(creer('a', { texte: contactMaries, attrs: { href: `mailto:${contactMaries}` } }));
  pied.appendChild(document.createTextNode('.'));
}

/* ══════════════════════════════════════════════════════════════════════════
   Textes
   Tous les messages visibles sont ici. Passer au tutoiement, corriger une
   formulation ou traduire ne demande donc de toucher qu'à ce bloc.
   ══════════════════════════════════════════════════════════════════════════ */

const MESSAGES_ERREUR = {
  EMAIL_INCONNU: () => `Cette adresse n'est pas sur notre liste. Utilisez celle où vous avez reçu le faire-part${ecrireNous()}.`,
  CODE_INVALIDE: () => 'Code incorrect, vérifiez et réessayez.',
  CODE_EXPIRE: () => 'Ce code a expiré, demandez-en un nouveau.',
  // Deux situations partagent ce code côté serveur, et leurs remèdes sont opposés :
  // « 5 demandes de code en une heure » (il faut attendre) et « 5 essais épuisés sur
  // ce code » (il suffit d'en demander un nouveau). Le second se reconnaît à l'écran
  // sur lequel on se trouve : voir TROP_DE_TENTATIVES_CODE.
  TROP_DE_TENTATIVES: () => `Trop de tentatives. Réessayez dans une heure${ecrireNous(' ou écrivez-nous à ')}.`,
  TROP_DE_TENTATIVES_CODE: () => 'Trop d\'essais sur ce code. Demandez-en un nouveau ci-dessous.',
  SESSION_EXPIREE: () => 'Votre session a expiré, reconnectez-vous.',
  DATE_LIMITE_DEPASSEE: () => 'Les réponses sont closes. Contactez-nous directement.',
  DONNEES_INVALIDES: () => 'Certaines informations sont incomplètes ou incorrectes.',
  SERVICE_INDISPONIBLE: () => `Le service est très sollicité aujourd'hui, réessayez demain${ecrireNous()}.`,
  ERREUR_SERVEUR: () => 'Petit souci technique, réessayez dans un instant.',
  RESEAU: () => 'Petit souci technique, réessayez dans un instant.',
};

const REGIMES = [
  ['aucun', 'Aucun régime particulier'],
  ['vegetarien', 'Végétarien'],
  ['vegan', 'Végétalien'],
  ['sans_porc', 'Sans porc'],
  ['sans_gluten', 'Sans gluten'],
  ['menu_enfant', 'Menu enfant'],
  ['autre', 'Autre (précisez ci-dessous)'],
];

const LIBELLE_REGIME = Object.fromEntries(REGIMES);

/* ══════════════════════════════════════════════════════════════════════════
   Petits utilitaires de DOM
   ══════════════════════════════════════════════════════════════════════════ */

const $ = (sel) => document.querySelector(sel);

/** Crée un élément. `texte` passe toujours par textContent : jamais d'HTML. */
function creer(balise, { classe, texte, attrs } = {}, enfants = []) {
  const n = document.createElement(balise);
  if (classe) n.className = classe;
  if (texte !== undefined && texte !== null) n.textContent = String(texte);
  if (attrs) for (const [k, v] of Object.entries(attrs)) {
    if (v === true) n.setAttribute(k, '');
    else if (v !== false && v !== null && v !== undefined) n.setAttribute(k, String(v));
  }
  for (const e of enfants) if (e) n.appendChild(e);
  return n;
}

function vider(n) { while (n.firstChild) n.removeChild(n.firstChild); }

/* ══════════════════════════════════════════════════════════════════════════
   Écrans
   ══════════════════════════════════════════════════════════════════════════ */

const ECRANS = ['accueil', 'email', 'code', 'formulaire', 'merci'];
let ecranCourant = 'accueil';

function montrer(nom, { focus = true } = {}) {
  ecranCourant = nom;
  for (const e of ECRANS) {
    const section = document.getElementById(`ecran-${e}`);
    if (section) section.hidden = e !== nom;
  }
  // Le titre du nouvel écran reçoit le focus : les lecteurs d'écran annoncent
  // le changement, et la navigation clavier repart du bon endroit.
  // Au tout premier affichage on ne prend pas le focus : le placer sur le titre
  // ferait démarrer la tabulation APRÈS le lien « Aller au contenu », qui devient
  // alors inatteignable au clavier.
  const titre = focus ? document.querySelector(`#ecran-${nom} [data-titre]`) : null;
  if (titre) titre.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
}

function annoncer(texte) {
  const zone = $('#annonce');
  if (zone) zone.textContent = texte;
}

/* ── Messages ──────────────────────────────────────────────────────────── */

function afficherMessage(idZone, texte, type = 'erreur') {
  const zone = document.getElementById(idZone);
  if (!zone) return;
  vider(zone);
  zone.appendChild(
    creer('div', {
      classe: `message message--${type}`,
      attrs: { role: type === 'erreur' ? 'alert' : 'status' },
    }, [creer('p', { texte })])
  );
  if (type === 'erreur') annoncer(texte);
}

function effacerMessage(idZone) {
  const zone = document.getElementById(idZone);
  if (zone) vider(zone);
}

function messageErreur(code) {
  return (MESSAGES_ERREUR[code] || MESSAGES_ERREUR.ERREUR_SERVEUR)();
}

/** Marque un champ en erreur et relie le message au champ (aria-describedby). */
function marquerChamp(champ, idErreur, texte) {
  const zone = document.getElementById(idErreur);
  if (champ) champ.setAttribute('aria-invalid', texte ? 'true' : 'false');
  if (zone) zone.textContent = texte || '';
  if (texte && champ) champ.focus();
}

/* ── État d'attente d'un bouton ────────────────────────────────────────── */

const libellesInitiaux = new WeakMap();

function occuper(bouton, texte = 'Envoi en cours…') {
  if (!libellesInitiaux.has(bouton)) libellesInitiaux.set(bouton, bouton.textContent);
  bouton.disabled = true;
  vider(bouton);
  bouton.appendChild(creer('span', { classe: 'rouet', attrs: { 'aria-hidden': 'true' } }));
  bouton.appendChild(document.createTextNode(' ' + texte));
  annoncer(texte);
}

function liberer(bouton) {
  bouton.disabled = false;
  vider(bouton);
  bouton.textContent = libellesInitiaux.get(bouton) || bouton.textContent;
}

/* ══════════════════════════════════════════════════════════════════════════
   État de l'application
   ══════════════════════════════════════════════════════════════════════════ */

const etat = {
  email: '',
  foyer: null,
  reponsesExistantes: [],
  commentaire: '',
  dateLimite: '',
  reponsesOuvertes: true,
  majLe: '',
  evenements: [],
};

function formaterDate(iso) {
  if (!/^\d{4}-\d{2}-\d{2}/.test(iso)) return '';
  const [a, m, j] = iso.slice(0, 10).split('-').map(Number);
  const mois = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet',
                'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  return `${j} ${mois[m - 1]} ${a}`;
}

/* ══════════════════════════════════════════════════════════════════════════
   Écran 1 — accueil
   ══════════════════════════════════════════════════════════════════════════ */

function preparerAccueil() {
  const bouton = $('#btn-repondre');

  bouton.addEventListener('click', () => {
    if (session.lire()) chargerFoyer();
    else montrer('email');
  });

  if (session.lire()) bouton.textContent = 'Reprendre ma réponse';

  // On interroge l'API sans bloquer l'affichage : l'invité lit les informations
  // pendant le démarrage à froid. Le résultat ne sert qu'à fermer le formulaire
  // si la date limite est passée.
  call('ping').then((r) => {
    if (!r.ok) return;
    appliquerContact(r.contact);
    etat.dateLimite = r.dateLimite || '';
    etat.reponsesOuvertes = r.reponsesOuvertes !== false;

    const rappel = $('#rappel-date-limite');
    if (etat.dateLimite && rappel && etat.reponsesOuvertes) {
      rappel.textContent = `Merci de nous répondre avant le ${formaterDate(etat.dateLimite)}.`;
    }
    if (!etat.reponsesOuvertes) {
      // Le bouton était masqué ici — et c'est la seule porte d'entrée. L'invitée qui
      // voulait relire l'allergie déclarée pour sa fille n'avait plus aucun moyen d'y
      // accéder, alors que le formulaire en lecture seule existe et fonctionne.
      bouton.textContent = session.lire() ? 'Consulter ma réponse' : 'Consulter notre réponse';
      if (rappel) rappel.textContent = '';
      afficherMessage('msg-accueil',
        `Les réponses sont closes${etat.dateLimite ? ' depuis le ' + formaterDate(etat.dateLimite) : ''}. ` +
        `Pour toute modification${ecrireNous(', écrivez-nous à ')}.`, 'info');
    }
  });
}

/* ══════════════════════════════════════════════════════════════════════════
   Écran 2 — adresse email
   ══════════════════════════════════════════════════════════════════════════ */

function preparerEmail() {
  const form = $('#form-email');

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const champ = $('#champ-email');
    const bouton = $('#btn-envoyer-code');
    const email = champ.value.trim();

    effacerMessage('msg-email');
    marquerChamp(champ, 'err-email', '');

    if (!email || !email.includes('@')) {
      marquerChamp(champ, 'err-email', 'Indiquez une adresse email valide.');
      return;
    }

    occuper(bouton);
    const r = await call('requestCode', { email, website: $('#champ-piege').value });
    liberer(bouton);

    if (!r.ok) {
      afficherMessage('msg-email', messageErreur(r.error));
      if (r.error === 'EMAIL_INCONNU') marquerChamp(champ, 'err-email', 'Adresse non reconnue');
      return;
    }

    etat.email = email;
    $('#rappel-email').textContent = email;
    montrer('code');
    annoncer('Code envoyé. Saisissez le code reçu par email.');
  });

  $('#btn-retour-accueil').addEventListener('click', () => montrer('accueil'));
}

/* ══════════════════════════════════════════════════════════════════════════
   Écran 3 — code
   ══════════════════════════════════════════════════════════════════════════ */

function preparerCode() {
  const form = $('#form-code');

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const champ = $('#champ-code');
    const bouton = $('#btn-valider-code');
    const code = champ.value.replace(/\s/g, '');

    effacerMessage('msg-code');
    marquerChamp(champ, 'err-code', '');

    if (!/^\d{6}$/.test(code)) {
      marquerChamp(champ, 'err-code', 'Le code comporte 6 chiffres.');
      return;
    }

    occuper(bouton, 'Vérification…');
    const r = await call('verifyCode', { email: etat.email, code });
    liberer(bouton);

    if (!r.ok) {
      // Ici, « trop de tentatives » veut dire « les 5 essais sur CE code sont
      // épuisés » : il suffit d'en demander un nouveau. Le message générique
      // conseillait d'attendre une heure, et faisait abandonner.
      afficherMessage('msg-code', messageErreur(
        r.error === 'TROP_DE_TENTATIVES' ? 'TROP_DE_TENTATIVES_CODE' : r.error));
      if (r.error === 'CODE_INVALIDE') marquerChamp(champ, 'err-code', 'Ce code ne correspond pas');
      if (r.error === 'CODE_EXPIRE' || r.error === 'TROP_DE_TENTATIVES') champ.value = '';
      return;
    }

    session.ecrire(r.token);
    appliquerEtat(r);
    montrer('formulaire');
  });

  $('#btn-renvoyer-code').addEventListener('click', () => {
    montrer('email');
    $('#champ-email').value = etat.email;
  });

  $('#btn-changer-email').addEventListener('click', () => {
    etat.email = '';
    $('#champ-email').value = '';
    montrer('email');
  });
}

/* ══════════════════════════════════════════════════════════════════════════
   Écran 4 — formulaire
   ══════════════════════════════════════════════════════════════════════════ */

function appliquerEtat(donnees) {
  etat.foyer = donnees.foyer;
  etat.reponsesExistantes = Array.isArray(donnees.reponses) ? donnees.reponses : [];
  etat.commentaire = donnees.commentaire || '';
  etat.dateLimite = donnees.dateLimite || etat.dateLimite;
  etat.reponsesOuvertes = donnees.reponsesOuvertes !== false;
  etat.majLe = donnees.majLe || '';
  // Les libellés des moments viennent du serveur (EVENEMENTS) : ils étaient recopiés
  // en dur ici, si bien qu'ajouter un quatrième moment ne se voyait nulle part.
  etat.evenements = Array.isArray(donnees.evenements) ? donnees.evenements : [];
  if (donnees.contact) appliquerContact(donnees.contact);
  construireFormulaire();
}

/** Récupère l'état du foyer à partir du seul token (rechargement de page). */
async function chargerFoyer() {
  const bouton = $('#btn-repondre');
  occuper(bouton, 'Chargement…');
  const r = await call('getRsvp', { token: session.lire() });
  liberer(bouton);

  if (!r.ok) {
    if (r.error === 'SESSION_EXPIREE') {
      session.effacer();
      bouton.textContent = 'Répondre à l\'invitation';
      montrer('email');
      afficherMessage('msg-email', messageErreur('SESSION_EXPIREE'));
      return;
    }
    afficherMessage('msg-accueil', messageErreur(r.error));
    return;
  }

  appliquerEtat(r);
  montrer(etat.reponsesExistantes.length ? 'merci' : 'formulaire');
  if (etat.reponsesExistantes.length) remplirRecapitulatif(recapDepuisEtat());
}

/** Retrouve la réponse déjà enregistrée pour une personne. */
function reponseDe(nom) {
  return etat.reponsesExistantes.find((r) => r.personne === nom) || null;
}

function construireFormulaire() {
  const foyer = etat.foyer;
  $('#titre-foyer').textContent = foyer.nom;

  // Les libellés viennent du serveur sous leur forme de titre (« Vin d'honneur ») ;
  // la grammaire de la phrase reste ici, donc ajouter un moment côté serveur suffit.
  const moments = (etat.evenements || [])
    .map((e) => String(e.libelle || ''))
    .filter(Boolean)
    .map((l) => l.charAt(0).toLowerCase() + l.slice(1));

  $('#sous-titre-foyer').textContent = moments.length
    ? `Vous êtes conviés : ${moments.join(', ').replace(/,([^,]*)$/, ' et$1')}.`
    : '';

  const rappel = $('#rappel-limite-formulaire');
  rappel.textContent = etat.dateLimite
    ? `Vous pourrez modifier votre réponse jusqu'au ${formaterDate(etat.dateLimite)}.`
    : '';

  const liste = $('#liste-personnes');
  vider(liste);
  foyer.personnes.forEach((p, i) => liste.appendChild(blocPersonne(p, i)));

  // Accompagnant : proposé uniquement s'il reste une place (D09).
  const placesLibres = Math.max(foyer.placesMax - foyer.personnes.length, 0);
  const blocAcc = $('#bloc-accompagnant');
  blocAcc.hidden = placesLibres < 1;
  if (placesLibres >= 1) {
    const dejaLa = etat.reponsesExistantes.find((r) => r.estAccompagnant);
    // Le formulaire n'offre qu'UNE case accompagnant : annoncer « il vous reste 2
    // places » promettait ce que l'interface ne sait pas tenir.
    $('#texte-places-libres').textContent = '(une place reste disponible)';
    const caseAcc = $('#case-accompagnant');
    caseAcc.checked = Boolean(dejaLa);
    $('#acc-nom').value = dejaLa ? dejaLa.personne : '';
    $('#acc-regime').value = dejaLa ? dejaLa.regime || 'aucun' : 'aucun';
    $('#acc-allergies').value = dejaLa ? dejaLa.allergies || '' : '';
    basculerAccompagnant();
  }

  $('#champ-commentaire').value = etat.commentaire;

  // Date limite dépassée : lecture seule, pas de formulaire envoyable.
  const clos = !etat.reponsesOuvertes;
  $('#form-rsvp').querySelectorAll('input, select, textarea, button')
    .forEach((n) => { n.disabled = clos; });
  $('#msg-formulaire-clos').hidden = !clos;
}

function blocPersonne(personne, index) {
  const existante = reponseDe(personne.nom);
  const estEnfant = personne.type === 'enfant';
  const base = `p${index}`;

  const entete = creer('div', { classe: 'personne__nom' }, [
    creer('h3', { texte: personne.nom }),
    estEnfant ? creer('span', { classe: 'etiquette', texte: 'Enfant' }) : null,
  ]);

  const choix = creer('fieldset', { classe: 'choix-presence' }, [
    creer('legend', { classe: 'visuellement-masque',
                      texte: `${personne.nom} sera-t-il ou elle présent·e ?` }),
    creer('div', { classe: 'choix-presence__options' }, [
      optionPresence(base, 'oui', 'Présent·e', existante ? existante.presence === true : false),
      optionPresence(base, 'non', 'Absent·e', existante ? existante.presence === false : false),
    ]),
  ]);

  const details = creer('div', { classe: 'details-presence', attrs: { id: `${base}-details` } });

  if (estEnfant) {
    details.appendChild(creer('div', { classe: 'ligne-deux' }, [
      champTexte(`${base}-age`, 'Âge', existante && existante.age != null ? existante.age : '',
                 { type: 'number', min: '0', max: '17', inputmode: 'numeric' }),
      // `existante.regime` est vide quand l'enfant avait été déclaré absent : on
      // retombe alors sur menu_enfant, et non sur « aucun régime », sinon le traiteur
      // comptait un menu adulte pour un enfant de quatre ans.
      champRegime(`${base}-regime`, (existante && existante.regime) || 'menu_enfant'),
    ]));
  } else {
    details.appendChild(champRegime(`${base}-regime`, existante ? existante.regime : 'aucun'));
  }

  details.appendChild(champTexte(`${base}-allergies`, 'Allergies ou précisions',
    existante ? existante.allergies || '' : '',
    { maxlength: '200' }, 'Laissez vide si vous n\'en avez pas.'));

  // Message d'erreur propre à cette personne. Sans lui, « Indiquez si Tom sera
  // présent·e » s'affichait en bas de page pendant que le focus remontait vers Tom :
  // les deux n'étaient jamais à l'écran en même temps.
  const erreur = creer('p', { classe: 'erreur-champ', attrs: { id: `${base}-err`, role: 'status' } });
  choix.setAttribute('aria-describedby', `${base}-err`);

  const bloc = creer('div', { classe: 'personne', attrs: { 'data-personne': personne.nom } },
                     [entete, choix, erreur, details]);

  // Les détails n'apparaissent que si la personne vient. Fait en JavaScript et
  // non avec le sélecteur CSS :has(), pour fonctionner aussi sur les navigateurs
  // un peu anciens que l'on trouvera forcément dans une liste d'invités.
  const majDetails = () => {
    const vient = bloc.querySelector(`#${base}-oui`).checked;
    details.hidden = !vient;
  };
  bloc.querySelectorAll('input[type="radio"]').forEach((r) => r.addEventListener('change', majDetails));
  majDetails();

  return bloc;
}

/**
 * Une option = un <label> qui englobe le radio et son libellé.
 * L'ordre compte : le CSS cible `input:checked + span`, donc le <span> doit
 * suivre immédiatement l'<input>. Et c'est l'englobement par le <label> qui
 * donne au radio son nom accessible.
 */
function optionPresence(base, valeur, libelle, coche) {
  return creer('label', { classe: 'choix-presence__option' }, [
    creer('input', { attrs: {
      type: 'radio', name: base, id: `${base}-${valeur}`, value: valeur, checked: coche,
    }}),
    creer('span', { texte: libelle }),
  ]);
}

function champTexte(id, libelle, valeur, attrs = {}, aide) {
  const enfants = [creer('label', { texte: libelle, attrs: { for: id } })];
  if (aide) enfants.push(creer('span', { classe: 'aide', texte: aide }));
  enfants.push(creer('input', { attrs: { type: 'text', id, value: valeur, ...attrs } }));
  return creer('div', { classe: 'champ' }, enfants);
}

function champRegime(id, valeurChoisie) {
  const select = creer('select', { attrs: { id } });
  for (const [valeur, libelle] of REGIMES) {
    select.appendChild(creer('option', {
      texte: libelle,
      attrs: { value: valeur, selected: valeur === (valeurChoisie || 'aucun') },
    }));
  }
  return creer('div', { classe: 'champ' }, [
    creer('label', { texte: 'Régime alimentaire', attrs: { for: id } }),
    select,
  ]);
}

function basculerAccompagnant() {
  const actif = $('#case-accompagnant').checked;
  $('#details-accompagnant').hidden = !actif;
}

/** Construit la charge utile envoyée à submitRsvp, ou null si le formulaire est invalide. */
function lireFormulaire() {
  const personnes = [];
  let erreur = null;

  etat.foyer.personnes.forEach((p, i) => {
    const base = `p${i}`;
    const oui = $(`#${base}-oui`);
    const non = $(`#${base}-non`);

    if (!oui.checked && !non.checked) {
      if (!erreur) erreur = { champ: oui, texte: `Indiquez si ${p.nom} sera présent·e.`, zone: `${base}-err` };
      return;
    }

    const entree = { personne: p.nom, presence: oui.checked ? 'oui' : 'non' };

    if (oui.checked) {
      entree.regime = $(`#${base}-regime`).value;
      entree.allergies = $(`#${base}-allergies`).value;
      if (p.type === 'enfant') {
        const champAge = $(`#${base}-age`);
        const age = champAge.value.trim();
        if (!/^\d{1,2}$/.test(age) || Number(age) > 17) {
          if (!erreur) erreur = { champ: champAge, texte: `Indiquez l'âge de ${p.nom} (0 à 17 ans).`, zone: `${base}-err` };
          return;
        }
        entree.age = Number(age);
      }
    }
    personnes.push(entree);
  });

  if ($('#case-accompagnant').checked && !$('#bloc-accompagnant').hidden) {
    const champNom = $('#acc-nom');
    const nom = champNom.value.trim();
    if (!nom) {
      if (!erreur) erreur = { champ: champNom, texte: 'Indiquez le nom de votre accompagnant·e.' };
    } else {
      personnes.push({
        personne: nom,
        presence: 'oui',
        regime: $('#acc-regime').value,
        allergies: $('#acc-allergies').value,
      });
    }
  }

  if (erreur) {
    // On efface les marques de la tentative précédente avant de poser la nouvelle.
    for (const marque of document.querySelectorAll('#liste-personnes [aria-invalid="true"]')) {
      marque.setAttribute('aria-invalid', 'false');
    }
    for (const zone of document.querySelectorAll('#liste-personnes .erreur-champ')) {
      zone.textContent = '';
    }
    afficherMessage('msg-formulaire', erreur.texte);
    const proche = erreur.zone && document.getElementById(erreur.zone);
    if (proche) proche.textContent = erreur.texte;
    erreur.champ.setAttribute('aria-invalid', 'true');
    erreur.champ.focus({ preventScroll: true });
    (proche || erreur.champ).scrollIntoView({ block: 'center' });
    return null;
  }

  // Contrôle miroir de celui du serveur : mieux vaut le dire ici que de subir
  // un DONNEES_INVALIDES générique après quatre secondes d'attente.
  const presents = personnes.filter((p) => p.presence === 'oui').length;
  if (presents > etat.foyer.placesMax) {
    afficherMessage('msg-formulaire',
      `Votre invitation prévoit ${etat.foyer.placesMax} place${etat.foyer.placesMax > 1 ? 's' : ''}. ` +
      `Prévenez-nous${ecrireNous(' à ')} si vous souhaitez venir plus nombreux.`);
    return null;
  }

  return { reponses: personnes, commentaire: $('#champ-commentaire').value };
}

function preparerFormulaire() {
  $('#case-accompagnant').addEventListener('change', basculerAccompagnant);

  $('#form-rsvp').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    effacerMessage('msg-formulaire');
    $('#form-rsvp').querySelectorAll('[aria-invalid="true"]')
      .forEach((n) => n.setAttribute('aria-invalid', 'false'));

    const charge = lireFormulaire();
    if (!charge) return;

    const bouton = $('#btn-envoyer-reponse');
    occuper(bouton, 'Enregistrement…');
    const r = await call('submitRsvp', { token: session.lire(), ...charge });
    liberer(bouton);

    if (!r.ok) {
      if (r.error === 'SESSION_EXPIREE') return sessionPerdue();
      afficherMessage('msg-formulaire', messageErreur(r.error));
      return;
    }

    // L'état doit refléter ce qui vient d'être enregistré : sans cela, « Modifier
    // ma réponse » reconstruirait le formulaire à partir de l'état d'avant l'envoi,
    // c'est-à-dire vide la première fois — l'invité perdrait toute sa saisie.
    etat.reponsesExistantes = r.recap.personnes || [];
    etat.commentaire = r.recap.commentaire || '';
    etat.majLe = r.recap.majLe || '';

    remplirRecapitulatif(r.recap);
    montrer('merci');
    annoncer('Votre réponse est enregistrée.');
  });
}

function sessionPerdue() {
  session.effacer();
  montrer('email');
  afficherMessage('msg-email', messageErreur('SESSION_EXPIREE'));
}

/* ══════════════════════════════════════════════════════════════════════════
   Écran 5 — merci
   ══════════════════════════════════════════════════════════════════════════ */

/** Reconstruit un récapitulatif à partir de réponses déjà enregistrées. */
function recapDepuisEtat() {
  return {
    nom: etat.foyer.nom,
    personnes: etat.reponsesExistantes,
    commentaire: etat.commentaire,
    majLe: etat.majLe,
  };
}

function remplirRecapitulatif(recap) {
  $('#titre-merci').textContent = 'Votre réponse';
  $('#bandeau-merci').hidden = !etat.reponsesOuvertes;
  $('#msg-merci-clos').hidden = etat.reponsesOuvertes;

  const liste = $('#recap-personnes');
  vider(liste);

  for (const p of recap.personnes || []) {
    const details = [];
    if (p.presence) {
      if (p.age != null && p.age !== '') details.push(`${p.age} ans`);
      if (p.regime && p.regime !== 'aucun') details.push(LIBELLE_REGIME[p.regime] || p.regime);
      if (p.allergies) details.push(p.allergies);
    }

    const gauche = creer('span', {}, [
      document.createTextNode(p.personne),
      details.length ? creer('br') : null,
      details.length ? creer('span', { classe: 'recap__detail', texte: details.join(' · ') }) : null,
    ]);

    const etatTexte = p.presence ? 'Présent·e' : 'Absent·e';
    const droite = creer('span', {
      classe: `recap__etat recap__etat--${p.presence ? 'present' : 'absent'}`,
      texte: etatTexte,
    });

    liste.appendChild(creer('li', {}, [gauche, droite]));
  }

  const note = $('#note-merci');
  const quand = recap.majLe ? formaterDate(recap.majLe) : '';
  note.textContent = etat.reponsesOuvertes
    ? `${quand ? `Réponse enregistrée le ${quand}. ` : ''}` +
      `${etat.dateLimite ? `Vous pouvez la modifier jusqu'au ${formaterDate(etat.dateLimite)}.` : ''}`
    : `Pour toute modification${ecrireNous(', écrivez-nous à ')}.`;

  $('#btn-modifier').hidden = !etat.reponsesOuvertes;
}

function preparerMerci() {
  $('#btn-modifier').addEventListener('click', () => {
    construireFormulaire();
    montrer('formulaire');
  });

  $('#btn-deconnexion').addEventListener('click', async () => {
    const token = session.lire();
    session.effacer();
    $('#btn-repondre').textContent = 'Répondre à l\'invitation';
    montrer('accueil');
    annoncer('Vous êtes déconnecté·e.');
    if (token) call('logout', { token }); // sans attendre : l'écran a déjà changé
  });
}

/* ══════════════════════════════════════════════════════════════════════════
   Démarrage
   ══════════════════════════════════════════════════════════════════════════ */

preparerAccueil();
preparerEmail();
preparerCode();
preparerFormulaire();
preparerMerci();
montrer('accueil', { focus: false });
