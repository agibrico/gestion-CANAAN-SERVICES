/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Appointment, AppointmentAlertState, AppointmentWithAlert } from '../types';

/**
 * Retourne la date courante formatée en YYYY-MM-DD dans le fuseau d'Abidjan (UTC+0)
 */
export function getTodayStringCI(referenceDate: Date = new Date()): string {
  // Côte d'Ivoire utilise l'heure GMT/UTC
  const year = referenceDate.getUTCFullYear();
  const month = String(referenceDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(referenceDate.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Retourne la date de demain formatée en YYYY-MM-DD
 */
export function getTomorrowStringCI(referenceDate: Date = new Date()): string {
  const tomorrow = new Date(referenceDate.getTime() + 24 * 60 * 60 * 1000);
  return getTodayStringCI(tomorrow);
}

/**
 * Parse date string YYYY-MM-DD and time HH:mm into timestamp in ms
 */
export function getAppointmentTimestamp(dateStr: string, timeStr: string): number {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = (timeStr || '00:00').split(':').map(Number);
  // Construction en UTC
  return Date.UTC(year, month - 1, day, hours || 0, minutes || 0);
}

/**
 * Calcule l'état d'alerte précis pour un rendez-vous donné :
 * - EN_RETARD : rendez-vous actif dont la date et l'heure sont dépassées
 * - AUJOURDHUI : rendez-vous prévu aujourd'hui
 * - DEMAIN : rendez-vous prévu demain (J+1)
 * - A_VENIR : rendez-vous prévu au-delà de demain
 * - PASSE : rendez-vous déjà terminé ou annulé
 */
export function computeAppointmentAlert(
  apt: Appointment,
  now: Date = new Date()
): { alertState: AppointmentAlertState; minutesDiff: number } {
  // Si le rendez-vous est déjà terminé ou annulé, pas d'alerte active
  if (apt.statut === 'TERMINE' || apt.statut === 'ANNULE') {
    return { alertState: 'PASSE', minutesDiff: 0 };
  }

  const todayStr = getTodayStringCI(now);
  const tomorrowStr = getTomorrowStringCI(now);

  const aptTimestamp = getAppointmentTimestamp(apt.date, apt.heure);
  const currentTimestamp = now.getTime();
  const minutesDiff = Math.round((aptTimestamp - currentTimestamp) / (60 * 1000));

  // Si l'heure limite du rendez-vous est dépassée (marge de 10 min de tolérance)
  if (minutesDiff < -10) {
    return { alertState: 'EN_RETARD', minutesDiff };
  }

  if (apt.date === todayStr) {
    return { alertState: 'AUJOURDHUI', minutesDiff };
  }

  if (apt.date === tomorrowStr) {
    return { alertState: 'DEMAIN', minutesDiff };
  }

  if (apt.date > tomorrowStr) {
    return { alertState: 'A_VENIR', minutesDiff };
  }

  // Si la date est antérieure à aujourd'hui et non clôturé -> EN_RETARD
  return { alertState: 'EN_RETARD', minutesDiff };
}

/**
 * Analyse une liste complète de rendez-vous et produit les statistiques d'alertes
 * pour le badge de notification 🔔 et les sections dédiées.
 */
export function processAppointmentsList(
  appointments: Appointment[],
  now: Date = new Date()
): {
  itemsWithAlerts: AppointmentWithAlert[];
  todayList: AppointmentWithAlert[];
  tomorrowList: AppointmentWithAlert[];
  overdueList: AppointmentWithAlert[];
  totalActiveAlertsCount: number; // Somme des alertes critiques (Retard + Aujourd'hui)
} {
  const itemsWithAlerts: AppointmentWithAlert[] = appointments.map((apt) => {
    const { alertState, minutesDiff } = computeAppointmentAlert(apt, now);
    return {
      ...apt,
      alertState,
      minutesDiff,
    };
  });

  const overdueList = itemsWithAlerts
    .filter((a) => a.alertState === 'EN_RETARD')
    .sort((a, b) => a.minutesDiff - b.minutesDiff); // Les plus anciens en retard d'abord

  const todayList = itemsWithAlerts
    .filter((a) => a.alertState === 'AUJOURDHUI')
    .sort((a, b) => a.heure.localeCompare(b.heure)); // Du plus tôt au plus tard

  const tomorrowList = itemsWithAlerts
    .filter((a) => a.alertState === 'DEMAIN')
    .sort((a, b) => a.heure.localeCompare(b.heure));

  const totalActiveAlertsCount = overdueList.length + todayList.length;

  return {
    itemsWithAlerts,
    todayList,
    tomorrowList,
    overdueList,
    totalActiveAlertsCount,
  };
}
