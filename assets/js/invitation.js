/**
 * invitation.js — comportement de la page d'invitation.
 *
 * Trois principes tenus partout dans ce fichier :
 *
 *  1. Aucun contenu éditorial ici. Tout vient de `invitation.config.js`.
 *  2. Rien n'est jamais injecté en HTML à partir de la config, sauf les deux
 *     textes qui portent volontairement un `<br>` (le sur-titre et la phrase
 *     RSVP) : ils sont alors reconstruits nœud par nœud, pas via innerHTML.
 *     La CSP interdirait de toute façon un script injecté, mais on ne s'en
 *     remet pas à elle seule.
 *  3. Tout l'habillage est facultatif. Musique absente, IntersectionObserver
 *     manquant, date illisible, carte non configurée : chaque morceau se
 *     retire tout seul et la page reste lisible et complète.
 */

import { CONFIG } from './invitation.config.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

const reposMouvement = window.matchMedia
  ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
  : false;

let langue = 'fr';
try {
  const memorisee = localStorage.getItem('invitation-langue');
  if (memorisee === 'fr' || memorisee === 'en') langue = memorisee;
} catch (e) { /* navigation privée : on reste en français */ }

const T = () => CONFIG.textes[langue];
const jourJ = new Date(CONFIG.dateISO);
const dateValide = !Number.isNaN(jourJ.getTime());

document.documentElement.classList.add('js');


/* ══════════════════════════════════════════════════════════════════════
   Petits utilitaires
   ══════════════════════════════════════════════════════════════════════ */

function vider(n) { while (n.firstChild) n.removeChild(n.firstChild); }

/**
 * Écrit un texte dont les `<br>` sont voulus, sans passer par innerHTML :
 * on découpe sur le marqueur et on intercale de vrais éléments.
 */
function texteAvecRetours(noeud, texte) {
  vider(noeud);
  texte.split(/<br\s*\/?>/i).forEach((morceau, i) => {
    if (i) noeud.appendChild(document.createElement('br'));
    noeud.appendChild(document.createTextNode(morceau));
  });
}

/** Découpe un prénom en lettres animables, chacune portant son rang. */
function enLettres(noeud, mot, decalage) {
  vider(noeud);
  [...mot].forEach((lettre, i) => {
    const s = document.createElement('span');
    s.className = 'car';
    s.style.setProperty('--i', String(i + decalage));
    s.textContent = lettre;
    noeud.appendChild(s);
  });
}

function dateLongue() {
  if (!dateValide) return '';
  return jourJ.toLocaleDateString(T().langue, {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris',
  });
}


/* ══════════════════════════════════════════════════════════════════════
   Rendu des textes
   ══════════════════════════════════════════════════════════════════════ */

function rendre() {
  const t = T();
  document.documentElement.lang = langue;

  // Libellés simples.
  for (const el of $$('[data-t]')) {
    const v = t[el.dataset.t];
    if (v != null) el.textContent = v;
  }

  // Les deux textes à retour à la ligne volontaire.
  texteAvecRetours($('#sur-titre'), `${t.inviteL1}<br>${t.inviteL2}`);
  texteAvecRetours($('#phrase-rsvp'), t.rsvp.replace('{date}', CONFIG.dateLimite[langue]));

  // Valeurs de la config.
  const valeurs = {
    dateLongue: dateLongue(),
    lieuNom: CONFIG.lieuNom,
    lieuVille: CONFIG.lieuVille,
    adresse1: CONFIG.adresse1,
    adresse2: CONFIG.adresse2,
  };
  for (const el of $$('[data-c]')) el.textContent = valeurs[el.dataset.c] ?? '';

  // Prénoms, lettre par lettre.
  enLettres($('#prenoms .n1'), CONFIG.marie, 0);
  enLettres($('#prenoms .n2'), CONFIG.mariee, CONFIG.marie.length + 1);
  $('#prenoms').setAttribute('aria-label', `${CONFIG.marie} et ${CONFIG.mariee}`);

  // Programme.
  const liste = $('#etapes');
  vider(liste);
  for (const etape of CONFIG.programme) {
    const li = document.createElement('li');
    li.className = 'etape rv';
    const h = document.createElement('p');
    h.className = 'etape__heure';
    h.textContent = etape.heure;
    const ti = document.createElement('p');
    ti.className = 'etape__titre';
    ti.textContent = etape.titre[langue];
    const tx = document.createElement('p');
    tx.className = 'etape__texte';
    tx.textContent = etape.texte[langue];
    li.append(h, ti, tx);
    liste.appendChild(li);
  }

  // Liens et boutons.
  $('#lien-rsvp').href = CONFIG.rsvpUrl;
  $('#lien-itineraire').href =
    'https://www.google.com/maps/search/?api=1&query=' +
    encodeURIComponent([CONFIG.lieuNom, CONFIG.adresse1, CONFIG.adresse2].join(', '));

  // L'enveloppe est retirée de l'arbre une fois ouverte : ces nœuds peuvent
  // donc avoir disparu quand on change de langue en cours de lecture.
  const sceau = $('#sceau');
  if (sceau) sceau.setAttribute('aria-label', t.ouvrirAria);
  const appel = $('#texte-ouvrir');
  if (appel) appel.textContent = t.ouvrir;

  const plan = $('#plan');
  if (plan) plan.setAttribute('title', t.carteTitre);
  $('#langue').setAttribute('aria-label', t.changerLangue);
  $('#code-langue').textContent = langue.toUpperCase();
  majBoutonMusique();
}


/* ══════════════════════════════════════════════════════════════════════
   Carte
   ══════════════════════════════════════════════════════════════════════ */

function preparerCarte() {
  const bloc = $('#bloc-carte');
  const cadre = CONFIG.carte && CONFIG.carte.cadre;
  // Pas de cadrage renseigné : on retire le bloc plutôt que d'afficher
  // une carte du monde entier, qui n'apprendrait rien à personne.
  if (!cadre) { bloc.remove(); return; }

  const url = new URL('https://www.openstreetmap.org/export/embed.html');
  url.searchParams.set('bbox', cadre);
  url.searchParams.set('layer', 'mapnik');
  if (CONFIG.carte.marqueur) url.searchParams.set('marker', CONFIG.carte.marqueur);
  $('#plan').src = url.toString();
}


/* ══════════════════════════════════════════════════════════════════════
   Compte à rebours
   ══════════════════════════════════════════════════════════════════════ */

function preparerRebours() {
  const cases = ['j', 'h', 'm', 's'].map((n) => document.getElementById(`cd-${n}`));
  if (!dateValide || cases.some((c) => !c)) return;

  const deux = (n) => String(n).padStart(2, '0');
  const battre = () => {
    let reste = Math.max(0, jourJ.getTime() - Date.now()) / 1000;
    const j = Math.floor(reste / 86400); reste -= j * 86400;
    const h = Math.floor(reste / 3600);  reste -= h * 3600;
    const m = Math.floor(reste / 60);
    cases[0].textContent = String(j);
    cases[1].textContent = deux(h);
    cases[2].textContent = deux(m);
    cases[3].textContent = deux(Math.floor(reste - m * 60));
  };
  battre();
  setInterval(battre, 1000);
}


/* ══════════════════════════════════════════════════════════════════════
   Apparitions au défilement
   ══════════════════════════════════════════════════════════════════════ */

let observateur = null;

function observer() {
  if (!('IntersectionObserver' in window)) {
    for (const el of $$('.rv')) el.classList.add('vu');
    return;
  }
  observateur = observateur || new IntersectionObserver((entrees) => {
    for (const e of entrees) {
      if (!e.isIntersecting) continue;
      e.target.classList.add('vu');
      observateur.unobserve(e.target);
    }
  }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });

  for (const el of $$('.rv:not(.vu)')) observateur.observe(el);
}


/* ══════════════════════════════════════════════════════════════════════
   Botaniques : les tiges se dessinent

   La longueur d'un tracé ne se connaît qu'à l'exécution : on la mesure et
   on la pose en variable CSS, que la feuille de style utilise pour le
   `stroke-dasharray`. Les ramures et les fleurs partent en léger décalage
   pour que la branche semble pousser plutôt qu'apparaître d'un bloc.
   ══════════════════════════════════════════════════════════════════════ */

function preparerBotaniques() {
  for (const bloc of $$('.botanique')) {
    const traces = bloc.querySelectorAll('path');
    traces.forEach((p, i) => {
      let longueur = 0;
      try { longueur = p.getTotalLength(); } catch (e) { return; }
      p.style.setProperty('--len', longueur.toFixed(1));
      p.style.setProperty('--dl', `${(i * 0.07).toFixed(2)}s`);
    });
    bloc.querySelectorAll('.fleur').forEach((f, i) => {
      f.style.setProperty('--dl', `${(1.1 + i * 0.045).toFixed(2)}s`);
    });
  }
}


/* ══════════════════════════════════════════════════════════════════════
   Musique

   Le navigateur n'autorise la lecture qu'après un geste de l'utilisateur :
   le toucher du sceau en est un, et c'est à ce moment que la musique part.
   Si le fichier est absent, le bouton ne s'affiche jamais.
   ══════════════════════════════════════════════════════════════════════ */

let audio = null;
let musiqueActive = false;

function preparerMusique() {
  if (!CONFIG.musique) return;
  audio = new Audio(CONFIG.musique);
  audio.loop = true;
  audio.volume = 0;
  audio.preload = 'auto';

  // Le bouton n'apparaît que si le fichier existe réellement.
  audio.addEventListener('canplaythrough', () => { $('#musique').hidden = false; }, { once: true });
  audio.addEventListener('error', () => { $('#musique').hidden = true; audio = null; });

  $('#musique').addEventListener('click', () => {
    if (!audio) return;
    if (musiqueActive) { arreterMusique(); } else { lancerMusique(); }
  });
}

/** Monte le volume en deux secondes, pour ne pas sursauter. */
function fondreVolume(vers) {
  if (!audio) return;
  const depart = audio.volume;
  const debut = performance.now();
  const duree = reposMouvement ? 1 : 2000;
  const pas = (t) => {
    const k = Math.min(1, (t - debut) / duree);
    audio.volume = depart + (vers - depart) * k;
    if (k < 1) requestAnimationFrame(pas);
  };
  requestAnimationFrame(pas);
}

function lancerMusique() {
  if (!audio) return;
  const promesse = audio.play();
  if (promesse && promesse.catch) {
    // Lecture refusée (onglet en sourdine, politique du navigateur) :
    // on n'insiste pas et on laisse le bouton dans l'état « coupé ».
    promesse.catch(() => { musiqueActive = false; majBoutonMusique(); });
  }
  musiqueActive = true;
  fondreVolume(CONFIG.musiqueVolume ?? 0.5);
  majBoutonMusique();
}

function arreterMusique() {
  if (!audio) return;
  audio.pause();
  musiqueActive = false;
  majBoutonMusique();
}

function majBoutonMusique() {
  const bouton = $('#musique');
  if (!bouton) return;
  bouton.setAttribute('aria-pressed', String(musiqueActive));
  bouton.setAttribute('aria-label', musiqueActive ? T().musiquePause : T().musiqueJouer);
  const ondes = document.getElementById('ondes');
  const coupe = document.getElementById('coupe');
  if (ondes) ondes.hidden = !musiqueActive;
  if (coupe) coupe.hidden = musiqueActive;
}


/* ══════════════════════════════════════════════════════════════════════
   Fichier calendrier (.ics)
   ══════════════════════════════════════════════════════════════════════ */

function horodatageIcs(d) {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function preparerIcs() {
  const bouton = $('#btn-ics');
  if (!dateValide) { bouton.remove(); return; }

  bouton.addEventListener('click', () => {
    const fin = new Date(jourJ.getTime() + (CONFIG.dureeHeures || 6) * 3600 * 1000);
    const lignes = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Alec et Gloria//Invitation//FR',
      'BEGIN:VEVENT',
      `UID:mariage-${horodatageIcs(jourJ)}@invitation`,
      `DTSTAMP:${horodatageIcs(new Date())}`,
      `DTSTART:${horodatageIcs(jourJ)}`,
      `DTEND:${horodatageIcs(fin)}`,
      `SUMMARY:${T().calTitre}`,
      `LOCATION:${[CONFIG.lieuNom, CONFIG.adresse1, CONFIG.adresse2].join(', ')}`,
      'END:VEVENT', 'END:VCALENDAR',
    ];
    // CRLF : exigé par la RFC 5545, et Outlook refuse le fichier sans.
    const blob = new Blob([lignes.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mariage-alec-gloria.ics';
    document.body.appendChild(a);
    try {
      a.click();
      $('#annonce-ics').textContent = T().icsFait;
    } catch (e) {
      $('#annonce-ics').textContent = T().icsEchec;
    }
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
}


/* ══════════════════════════════════════════════════════════════════════
   Enveloppe
   ══════════════════════════════════════════════════════════════════════ */

function ouvrirEnveloppe() {
  const enveloppe = $('#enveloppe');
  if (!enveloppe || enveloppe.classList.contains('ouverte')) return;

  enveloppe.classList.add('ouverte');
  document.body.classList.remove('verrouille');
  document.body.classList.add('ouvert');

  // Le toucher du sceau est le geste utilisateur qu'attend le navigateur.
  lancerMusique();

  // L'enveloppe reste dans l'arbre le temps de l'animation, puis s'efface
  // complètement : laissée en place, elle garderait le focus piégeable.
  const retirer = () => enveloppe.remove();
  if (reposMouvement) retirer(); else setTimeout(retirer, 2100);

  // Le titre reçoit le focus : au clavier comme au lecteur d'écran, on
  // repart du début de l'invitation et non du bouton disparu.
  const prenoms = $('#prenoms');
  if (prenoms) {
    prenoms.setAttribute('tabindex', '-1');
    prenoms.focus({ preventScroll: true });
  }
}

function preparerEnveloppe() {
  const sceau = $('#sceau');
  // Pas d'enveloppe dans la page : on n'a rien à verrouiller, et l'invitation
  // doit s'afficher déployée plutôt que de rester figée et invisible.
  if (!sceau || !$('#enveloppe')) {
    document.body.classList.add('ouvert');
    return;
  }
  document.body.classList.add('verrouille');
  sceau.addEventListener('click', ouvrirEnveloppe);
}


/* ══════════════════════════════════════════════════════════════════════
   Langue
   ══════════════════════════════════════════════════════════════════════ */

function preparerLangue() {
  $('#langue').addEventListener('click', () => {
    langue = langue === 'fr' ? 'en' : 'fr';
    try { localStorage.setItem('invitation-langue', langue); } catch (e) { /* ignoré */ }
    rendre();
    dessinerDrapeau();
    // Les étapes du programme viennent d'être recréées : on les révèle
    // immédiatement, sans quoi elles resteraient invisibles.
    for (const el of $$('.rv')) el.classList.add('vu');
    observer();
  });
  dessinerDrapeau();
}

/* Les deux drapeaux vivent dans le balisage : on ne fait que les montrer
   ou les cacher. Pas d'innerHTML, même pour du SVG écrit par nous. */
function dessinerDrapeau() {
  const fr = document.getElementById('drapeau-fr');
  const en = document.getElementById('drapeau-en');
  if (fr) fr.hidden = langue !== 'fr';
  if (en) en.hidden = langue !== 'en';
}


/* ══════════════════════════════════════════════════════════════════════
   Démarrage
   ══════════════════════════════════════════════════════════════════════ */

rendre();
preparerCarte();
preparerRebours();
preparerBotaniques();
preparerMusique();
preparerIcs();
preparerLangue();
preparerEnveloppe();
observer();
