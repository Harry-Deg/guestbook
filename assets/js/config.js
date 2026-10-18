/**
 * config.js — le SEUL fichier à modifier lors d'un déploiement.
 *
 * Après chaque « Gérer les déploiements → Nouvelle version » dans Apps Script,
 * l'URL ne change pas : il n'y a donc rien à toucher ici. Elle ne change que si
 * un « Nouveau déploiement » est créé, ou si le script migre vers le compte des
 * mariés (§8 du brief).
 */

/** URL /exec de l'Application Web Apps Script. */
export const API_URL = 'https://script.google.com/macros/s/AKfycbyEfYfN-_qX0SOaPMgq8FTBWF9n2INMzWaTuGEQ8d67HpUc7uOox2m5vGoHwgeDPNnAUQ/exec';

/** Adresse affichée dans les messages d'erreur (« écrivez-nous »). */
export const CONTACT_MARIES = 'harryoscard@gmail.com';

/**
 * Délai au-delà duquel on considère que l'appel a échoué.
 * Généreux à dessein : un démarrage à froid d'Apps Script prend 1 à 4 s (C5),
 * et une mauvaise connexion mobile peut doubler cela.
 */
export const DELAI_MAX_MS = 20000;
