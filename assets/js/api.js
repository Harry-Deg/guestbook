/**
 * api.js — seul point d'appel réseau de tout le site, et gestion de la session.
 *
 * Contraintes qui ont façonné ce fichier :
 *  - C3 : Apps Script ne gère pas le preflight CORS. On envoie donc en
 *         `text/plain`, sans le moindre en-tête personnalisé. Ajouter un
 *         `Authorization` ou un `X-...` casserait tout, silencieusement.
 *  - C4 : Apps Script répond toujours en HTTP 200, après une redirection 302
 *         vers googleusercontent.com que `fetch` suit seul. Les erreurs sont
 *         donc dans le corps : { ok:false, error:"CODE" }.
 */

import { API_URL, DELAI_MAX_MS } from './config.js';

const CLE_SESSION = 'rsvp_token';

/**
 * Appelle l'API. Ne lève jamais : retourne toujours un objet de la forme
 * { ok:true, ... } ou { ok:false, error:"CODE" }, pour que l'appelant n'ait
 * qu'un seul chemin de traitement.
 */
export async function call(action, payload = {}) {
  const abandon = new AbortController();
  const minuteur = setTimeout(() => abandon.abort(), DELAI_MAX_MS);

  try {
    const reponse = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, ...payload }),
      signal: abandon.signal,
      redirect: 'follow',
    });

    if (!reponse.ok) return { ok: false, error: 'ERREUR_SERVEUR' };

    const donnees = await reponse.json();
    // Une réponse qui n'a pas la forme attendue vaut une erreur serveur :
    // mieux vaut un message générique qu'un plantage dans l'affichage.
    if (!donnees || typeof donnees !== 'object') {
      return { ok: false, error: 'ERREUR_SERVEUR' };
    }
    return donnees;
  } catch (e) {
    // Abandon sur délai, coupure réseau, JSON illisible : rien de tout cela
    // n'est actionnable par l'invité, un seul message suffit.
    return { ok: false, error: 'RESEAU' };
  } finally {
    clearTimeout(minuteur);
  }
}

/**
 * Session en `sessionStorage` et non `localStorage` : le token disparaît à la
 * fermeture de l'onglet. Sur un téléphone prêté ou un ordinateur partagé, c'est
 * ce qu'on veut. Il ne transite jamais par l'URL.
 */
export const session = {
  lire() {
    try {
      return sessionStorage.getItem(CLE_SESSION) || null;
    } catch (e) {
      return null; // navigation privée, stockage bloqué : on repart d'un code
    }
  },

  ecrire(token) {
    try {
      sessionStorage.setItem(CLE_SESSION, token);
    } catch (e) {
      /* sans stockage, la session dure le temps de la page : acceptable */
    }
  },

  effacer() {
    try {
      sessionStorage.removeItem(CLE_SESSION);
    } catch (e) { /* rien à faire */ }
  },
};
