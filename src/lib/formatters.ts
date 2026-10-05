/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Formatage des montants monétaires en Francs CFA (XOF / F CFA)
 * Respecte les standards d'affichage ivoiriens (espaces insécables entre milliers).
 */
export function formatFCFA(montant: number | undefined | null): string {
  if (montant === undefined || montant === null || isNaN(montant)) {
    return '0 F CFA';
  }
  return new Intl.NumberFormat('fr-FR', {
    style: 'decimal',
    maximumFractionDigits: 0,
  }).format(Math.round(montant)) + ' F CFA';
}

/**
 * Nettoyage et normalisation des numéros de téléphone ivoiriens (10 chiffres).
 * Préfixes opérateurs CI : 01 (Moov), 05 (MTN), 07 (Orange), fixes 21/25/27.
 * Retourne le format d'affichage standard "+225 07 00 00 00 00"
 */
export function formatTelephoneCI(raw: string): string {
  if (!raw) return '';
  // Supprime tous les caractères non numériques
  const digits = raw.replace(/\D/g, '');

  let nationalNumber = digits;
  // Si commence par l'indicatif 225
  if (digits.startsWith('225') && digits.length >= 13) {
    nationalNumber = digits.slice(3);
  } else if (digits.startsWith('00225') && digits.length >= 15) {
    nationalNumber = digits.slice(5);
  }

  // Format 10 chiffres CI (ex: 0701020304) -> +225 07 01 02 03 04
  if (nationalNumber.length === 10) {
    const p1 = nationalNumber.slice(0, 2);
    const p2 = nationalNumber.slice(2, 4);
    const p3 = nationalNumber.slice(4, 6);
    const p4 = nationalNumber.slice(6, 8);
    const p5 = nationalNumber.slice(8, 10);
    return `+225 ${p1} ${p2} ${p3} ${p4} ${p5}`;
  }

  // Si format déjà avec indicatif ou autre
  return raw;
}

/**
 * Normalise un numéro pour l'API WhatsApp Meta (E.164 sans le '+' : ex 2250700000000)
 */
export function normalizeWhatsAppNumber(raw: string): string {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('225')) {
    return digits;
  }
  if (digits.length === 10) {
    return `225${digits}`;
  }
  return digits;
}

/**
 * Formate une date ISO (YYYY-MM-DD) au format ivoirien usuel (ex: "30 Sept 2026")
 */
export function formatDateFR(dateString: string): string {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'Africa/Abidjan', // UTC+0 Côte d'Ivoire
    }).format(date);
  } catch {
    return dateString;
  }
}

/**
 * Formate date + heure complète pour les journaux d'audit et reçus
 */
export function formatDateTimeFR(isoString: string): string {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Africa/Abidjan',
    }).format(date);
  } catch {
    return isoString;
  }
}
