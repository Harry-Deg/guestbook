/**
 * invitation.config.js — TOUT le contenu de la page d'invitation.
 *
 * C'est le seul fichier à modifier pour changer un texte, une date, un lieu
 * ou un horaire. Ni `invitation.html` ni `invitation.js` ne contiennent de
 * contenu éditorial.
 *
 * Les valeurs marquées « À COMPLÉTER » sont des exemples : elles doivent être
 * remplacées avant d'envoyer le lien aux invités.
 *
 * Attention : ce dépôt est public. Ne mettez ici aucune adresse email réelle
 * ni aucune donnée d'invité. L'adresse de contact est servie par l'API depuis
 * l'onglet `Config` du classeur (voir `config.js`).
 */

export const CONFIG = {

  /* ── Les mariés ────────────────────────────────────────────────────── */
  marie: 'Alec',
  mariee: 'Gloria',
  initiales: 'A & G',

  /* ── Date et heure ─────────────────────────────────────────────────── */
  /* Format ISO avec le fuseau. Sert au compte à rebours et au fichier
     calendrier, et doit concorder avec `DATE_MARIAGE` dans le classeur. */
  dateISO: '2027-06-12T15:00:00+02:00',     // À COMPLÉTER
  dureeHeures: 12,

  /* ── Le lieu ───────────────────────────────────────────────────────── */
  lieuNom: 'À compléter — domaine',          // À COMPLÉTER
  lieuVille: 'À compléter — ville',          // À COMPLÉTER
  adresse1: 'À compléter — rue et numéro',   // À COMPLÉTER
  adresse2: 'À compléter — code postal, ville', // À COMPLÉTER

  /* Cadre de la carte : ouest, sud, est, nord (degrés décimaux), puis le
     point du marqueur. Relevez-les sur openstreetmap.org, « Partager →
     Intégrer une carte ». Laissez `null` pour masquer la carte. */
  carte: {
    cadre: '2.2241,48.8156,2.4699,48.9021',  // À COMPLÉTER — Paris par défaut
    marqueur: '48.8588,2.3470',              // À COMPLÉTER
  },

  /* ── RSVP ──────────────────────────────────────────────────────────── */
  /* Lien vers la page de connexion et de réponse, qui existe déjà. */
  rsvpUrl: 'index.html',
  dateLimite: { fr: '10 avril 2027', en: 'April 10, 2027' },  // À COMPLÉTER

  /* ── Musique ───────────────────────────────────────────────────────── */
  /* Fichier placé dans `assets/`. S'il est absent, le bouton se retire
     tout seul : la page reste complète et silencieuse. */
  musique: 'assets/music.mp3',
  musiqueVolume: 0.5,

  /* ── Programme ─────────────────────────────────────────────────────── */
  programme: [                                 // À COMPLÉTER
    {
      heure: '14:00',
      titre: { fr: 'Accueil des invités', en: 'Guest arrival' },
      texte: {
        fr: 'Les invités arrivent et profitent de rafraîchissements avant la cérémonie.',
        en: 'Guests arrive and enjoy light refreshments before the ceremony.',
      },
    },
    {
      heure: '14:30',
      titre: { fr: 'Cérémonie', en: 'Ceremony' },
      texte: {
        fr: 'Échange des vœux et des alliances.',
        en: 'Exchange of vows and rings.',
      },
    },
    {
      heure: '15:15',
      titre: { fr: 'Photos de groupe', en: 'Group photographs' },
      texte: {
        fr: 'Famille et amis se réunissent pour les photos.',
        en: 'Family and friends gather for photographs.',
      },
    },
    {
      heure: '16:00',
      titre: { fr: "Vin d'honneur", en: 'Cocktail hour' },
      texte: {
        fr: 'Cocktails, amuse-bouches et musique dans les jardins.',
        en: 'Drinks, canapés and music in the gardens.',
      },
    },
    {
      heure: '19:00',
      titre: { fr: 'Dîner', en: 'Dinner' },
      texte: {
        fr: 'Dîner assis, discours des proches, puis la fête.',
        en: 'Seated dinner, speeches, then the party.',
      },
    },
  ],

  /* ── Textes de l'interface, en français et en anglais ──────────────── */
  textes: {
    fr: {
      langue: 'fr-FR',
      ouvrir: 'Toucher le sceau pour ouvrir',
      ouvrirAria: "Ouvrir l'invitation",
      inviteL1: 'Nous avons la joie de vous inviter',
      inviteL2: 'à notre mariage',
      rebours: 'Compte à rebours',
      reboursSous: 'Avant le plus beau jour de notre vie',
      jours: 'Jours', heures: 'Heures', minutes: 'Min', secondes: 'Sec',
      reception: 'La réception',
      itineraire: 'Itinéraire',
      calendrier: 'Ajouter au calendrier',
      carteTitre: 'Plan d’accès au lieu de réception',
      jourJ: 'Le jour J',
      programme: 'Le programme',
      rsvp: 'Merci de confirmer votre présence<br>avant le {date}',
      rsvpBouton: 'Confirmer ma présence',
      signature: 'Avec tout notre amour',
      calTitre: 'Mariage d’Alec et Gloria',
      icsFait: 'Fichier calendrier téléchargé.',
      icsEchec: 'Le téléchargement a été bloqué. Ajoutez la date à la main.',
      musiqueJouer: 'Lancer la musique',
      musiquePause: 'Couper la musique',
      changerLangue: 'Switch to English',
    },
    en: {
      langue: 'en-GB',
      ouvrir: 'Tap the seal to open',
      ouvrirAria: 'Open the invitation',
      inviteL1: 'We joyfully invite you',
      inviteL2: 'to our wedding',
      rebours: 'Countdown',
      reboursSous: 'To the most beautiful day of our lives',
      jours: 'Days', heures: 'Hours', minutes: 'Min', secondes: 'Sec',
      reception: 'The reception',
      itineraire: 'Directions',
      calendrier: 'Add to calendar',
      carteTitre: 'Map of the reception venue',
      jourJ: 'The big day',
      programme: 'The programme',
      rsvp: 'Kindly confirm your attendance<br>by {date}',
      rsvpBouton: 'Confirm my attendance',
      signature: 'With all our love',
      calTitre: 'Alec and Gloria’s wedding',
      icsFait: 'Calendar file downloaded.',
      icsEchec: 'The download was blocked. Please add the date manually.',
      musiqueJouer: 'Play music',
      musiquePause: 'Mute music',
      changerLangue: 'Passer en français',
    },
  },
};
