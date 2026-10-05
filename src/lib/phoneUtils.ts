/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Normalisation centralisée des numéros de téléphone pour Canaan Services (Côte d'Ivoire & International).
 *
 * Format WhatsApp Meta API requis : E.164 sans le '+' (ex: 2250700000000).
 * Format national Côte d'Ivoire : 10 chiffres (ex: 0700000000).
 */

/**
 * Normalise un numéro en format WhatsApp canonique (2250700000000 pour la CI).
 * Accepte les formats : "07 00 00 00 00", "0700000000", "+225 07 00 00 00 00", "2250700000000", "00225 0700000000", etc.
 */
export function normalizePhoneNumber(raw: string | undefined | null): string {
  if (!raw) return '';
  // Supprimer tous les espaces, tirets, parenthèses et caractères non numériques
  const digits = String(raw).replace(/\D/g, '');

  if (!digits) return '';

  // Cas 00225... (format préfixé international)
  if (digits.startsWith('00225') && digits.length >= 15) {
    return digits.slice(2); // retire le '00' -> 2250700000000
  }

  // Cas 225... avec 13 chiffres (indicatif CI + 10 chiffres nationaux)
  if (digits.startsWith('225') && digits.length === 13) {
    return digits;
  }

  // Cas numéro ivoirien national à 10 chiffres (ex: 0701020304) -> ajouter 225
  if (digits.length === 10) {
    return `225${digits}`;
  }

  // Cas 8 chiffres (ancien format avant 2021) : si commence par 0, ajouter 07 par défaut ou conserver
  if (digits.length === 8) {
    return `22507${digits}`;
  }

  // Autres numéros internationaux (ex: France 336..., etc.)
  if (digits.startsWith('225')) {
    return digits;
  }

  return digits;
}

/**
 * Formate un numéro pour un affichage lisible élégant dans l'interface (+225 07 00 00 00 00).
 */
export function formatPhoneDisplay(raw: string | undefined | null): string {
  if (!raw) return '';
  const normalized = normalizePhoneNumber(raw);

  // Si c'est un numéro CI à 13 chiffres (225 + 10 chiffres)
  if (normalized.startsWith('225') && normalized.length === 13) {
    const nat = normalized.slice(3); // Les 10 chiffres (ex: 0701020304)
    const p1 = nat.slice(0, 2);
    const p2 = nat.slice(2, 4);
    const p3 = nat.slice(4, 6);
    const p4 = nat.slice(6, 8);
    const p5 = nat.slice(8, 10);
    return `+225 ${p1} ${p2} ${p3} ${p4} ${p5}`;
  }

  // Si c'est un numéro local à 10 chiffres sans 225
  if (normalized.length === 10) {
    const p1 = normalized.slice(0, 2);
    const p2 = normalized.slice(2, 4);
    const p3 = normalized.slice(4, 6);
    const p4 = normalized.slice(6, 8);
    const p5 = normalized.slice(8, 10);
    return `+225 ${p1} ${p2} ${p3} ${p4} ${p5}`;
  }

  // Retourne avec préfixe '+' si disponible
  return raw.startsWith('+') ? raw : `+${raw}`;
}

/**
 * Extrait les 10 derniers chiffres significatifs pour les recherches SQL partielles.
 */
export function extractSignificantDigits(raw: string | undefined | null): string {
  if (!raw) return '';
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return digits;
}

/**
 * Vérifie si le numéro est valide pour les communications WhatsApp.
 */
export function isValidPhoneNumber(raw: string | undefined | null): boolean {
  if (!raw) return false;
  const normalized = normalizePhoneNumber(raw);
  // Doit comporter au moins 10 chiffres et au plus 15 (norme E.164 internationale)
  return normalized.length >= 10 && normalized.length <= 15;
}
