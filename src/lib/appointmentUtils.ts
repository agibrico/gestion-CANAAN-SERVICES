/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Fuseau horaire officiel pour Canaan Services (Abidjan, Côte d'Ivoire : GMT / UTC+0)
 */
export const APP_TIMEZONE = 'Africa/Abidjan';

/**
 * Lieu de rendez-vous par défaut (configurable ultérieurement via les paramètres de l'entreprise)
 */
export const DEFAULT_APP_LOCATION = 'Atelier Canaan Services - Abidjan';

/**
 * Types officiels de rendez-vous
 */
export type AppointmentType =
  | 'RETRAIT_TRAVAIL'
  | 'VALIDATION_MAQUETTE'
  | 'DEPOT_FICHIERS'
  | 'PAIEMENT'
  | 'CONSULTATION'
  | 'AUTRE';

/**
 * Métadonnées et labels français des types de rendez-vous
 */
export interface AppointmentTypeMeta {
  key: AppointmentType;
  label: string;
  badge: {
    bg: string;
    text: string;
    border: string;
  };
}

export const APPOINTMENT_TYPES_MAP: Record<AppointmentType, AppointmentTypeMeta> = {
  RETRAIT_TRAVAIL: {
    key: 'RETRAIT_TRAVAIL',
    label: 'Retrait de travail',
    badge: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-800',
      border: 'border-emerald-300',
    },
  },
  VALIDATION_MAQUETTE: {
    key: 'VALIDATION_MAQUETTE',
    label: 'Validation de maquette',
    badge: {
      bg: 'bg-indigo-50',
      text: 'text-indigo-800',
      border: 'border-indigo-300',
    },
  },
  DEPOT_FICHIERS: {
    key: 'DEPOT_FICHIERS',
    label: 'Dépôt de fichiers',
    badge: {
      bg: 'bg-blue-50',
      text: 'text-blue-800',
      border: 'border-blue-300',
    },
  },
  PAIEMENT: {
    key: 'PAIEMENT',
    label: 'Paiement',
    badge: {
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-300',
    },
  },
  CONSULTATION: {
    key: 'CONSULTATION',
    label: 'Consultation',
    badge: {
      bg: 'bg-purple-50',
      text: 'text-purple-800',
      border: 'border-purple-300',
    },
  },
  AUTRE: {
    key: 'AUTRE',
    label: 'Autre',
    badge: {
      bg: 'bg-slate-100',
      text: 'text-slate-800',
      border: 'border-slate-300',
    },
  },
};

export const APPOINTMENT_TYPE_KEYS: AppointmentType[] = [
  'RETRAIT_TRAVAIL',
  'VALIDATION_MAQUETTE',
  'DEPOT_FICHIERS',
  'PAIEMENT',
  'CONSULTATION',
  'AUTRE',
];

/**
 * Statuts métier officiels des rendez-vous
 */
export type AppointmentStatus =
  | 'A_CONFIRMER'
  | 'CONFIRME'
  | 'TERMINE'
  | 'ANNULE'
  | 'ABSENT';

export interface AppointmentStatusMeta {
  key: AppointmentStatus;
  label: string;
  badge: {
    bg: string;
    text: string;
    border: string;
  };
}

export const APPOINTMENT_STATUS_MAP: Record<AppointmentStatus, AppointmentStatusMeta> = {
  A_CONFIRMER: {
    key: 'A_CONFIRMER',
    label: 'À confirmer',
    badge: {
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-300',
    },
  },
  CONFIRME: {
    key: 'CONFIRME',
    label: 'Confirmé',
    badge: {
      bg: 'bg-blue-50',
      text: 'text-blue-800',
      border: 'border-blue-300',
    },
  },
  TERMINE: {
    key: 'TERMINE',
    label: 'Terminé / Retiré',
    badge: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-800',
      border: 'border-emerald-300',
    },
  },
  ANNULE: {
    key: 'ANNULE',
    label: 'Annulé',
    badge: {
      bg: 'bg-slate-100',
      text: 'text-slate-600',
      border: 'border-slate-300',
    },
  },
  ABSENT: {
    key: 'ABSENT',
    label: 'Client absent',
    badge: {
      bg: 'bg-rose-50',
      text: 'text-rose-800',
      border: 'border-rose-300',
    },
  },
};

/**
 * États temporels calculés dynamiquement (ne pas stocker en dur comme statut métier)
 */
export type TemporalStatus =
  | 'TODAY'
  | 'TOMORROW'
  | 'UPCOMING'
  | 'LATE'
  | 'COMPLETED'
  | 'CANCELLED';

export interface TemporalStatusMeta {
  key: TemporalStatus;
  label: string;
  badge: {
    bg: string;
    text: string;
    border: string;
  };
}

export const TEMPORAL_STATUS_MAP: Record<TemporalStatus, TemporalStatusMeta> = {
  TODAY: {
    key: 'TODAY',
    label: "Aujourd'hui",
    badge: {
      bg: 'bg-emerald-100',
      text: 'text-emerald-900',
      border: 'border-emerald-300',
    },
  },
  TOMORROW: {
    key: 'TOMORROW',
    label: 'Demain',
    badge: {
      bg: 'bg-blue-100',
      text: 'text-blue-900',
      border: 'border-blue-300',
    },
  },
  UPCOMING: {
    key: 'UPCOMING',
    label: 'À venir',
    badge: {
      bg: 'bg-slate-100',
      text: 'text-slate-700',
      border: 'border-slate-300',
    },
  },
  LATE: {
    key: 'LATE',
    label: 'En retard',
    badge: {
      bg: 'bg-rose-100',
      text: 'text-rose-900',
      border: 'border-rose-300',
    },
  },
  COMPLETED: {
    key: 'COMPLETED',
    label: 'Terminé',
    badge: {
      bg: 'bg-slate-100',
      text: 'text-slate-600',
      border: 'border-slate-200',
    },
  },
  CANCELLED: {
    key: 'CANCELLED',
    label: 'Annulé',
    badge: {
      bg: 'bg-slate-100',
      text: 'text-slate-400',
      border: 'border-slate-200',
    },
  },
};

/**
 * Obtient la date du jour au format YYYY-MM-DD dans le fuseau horaire de Côte d'Ivoire (Africa/Abidjan)
 */
export function getTodayStringCI(referenceDate: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(referenceDate);
}

/**
 * Obtient la date de demain au format YYYY-MM-DD dans le fuseau horaire de Côte d'Ivoire (Africa/Abidjan)
 */
export function getTomorrowStringCI(referenceDate: Date = new Date()): string {
  const tomorrow = new Date(referenceDate.getTime() + 24 * 60 * 60 * 1000);
  return getTodayStringCI(tomorrow);
}

/**
 * Convertit date YYYY-MM-DD et heure HH:mm en timestamp millisecondes UTC
 */
export function getAppointmentDateTimeMs(dateStr: string, timeStr: string): number {
  if (!dateStr) return 0;
  const cleanDate = dateStr.includes('T') ? dateStr.slice(0, 10) : dateStr;
  const [year, month, day] = cleanDate.split('-').map(Number);
  const [hours, minutes] = (timeStr || '00:00').slice(0, 5).split(':').map(Number);
  return Date.UTC(year, (month || 1) - 1, day || 1, hours || 0, minutes || 0);
}

/**
 * Détermine le statut temporel d'un rendez-vous :
 * - COMPLETED : statut = TERMINE
 * - CANCELLED : statut = ANNULE
 * - LATE : date + heure dépassées et statut non terminé/annulé
 * - TODAY : prévu aujourd'hui
 * - TOMORROW : prévu demain
 * - UPCOMING : prévu après demain
 */
export function getAppointmentTemporalStatus(
  apt: {
    date_rendez_vous?: string | null;
    date?: string | null;
    heure_rendez_vous?: string | null;
    heure?: string | null;
    statut?: string | null;
  },
  now: Date = new Date()
): TemporalStatus {
  const statut = (apt.statut || 'A_CONFIRMER').toUpperCase();
  if (statut === 'TERMINE') return 'COMPLETED';
  if (statut === 'ANNULE') return 'CANCELLED';

  const dateStr = apt.date_rendez_vous || apt.date || '';
  const timeStr = apt.heure_rendez_vous || apt.heure || '00:00';
  if (!dateStr) return 'UPCOMING';

  const cleanDate = dateStr.includes('T') ? dateStr.slice(0, 10) : dateStr;
  const todayStr = getTodayStringCI(now);
  const tomorrowStr = getTomorrowStringCI(now);

  const aptMs = getAppointmentDateTimeMs(cleanDate, timeStr);
  const nowMs = now.getTime();

  // Tolérance de 5 minutes avant d'afficher EN_RETARD
  if (aptMs < nowMs - 5 * 60 * 1000) {
    return 'LATE';
  }

  if (cleanDate === todayStr) {
    return 'TODAY';
  }

  if (cleanDate === tomorrowStr) {
    return 'TOMORROW';
  }

  if (cleanDate > tomorrowStr) {
    return 'UPCOMING';
  }

  return 'LATE';
}

/**
 * Vérifie si un rendez-vous est actuellement en retard
 */
export function isAppointmentLate(
  apt: {
    date_rendez_vous?: string | null;
    date?: string | null;
    heure_rendez_vous?: string | null;
    heure?: string | null;
    statut?: string | null;
  },
  now: Date = new Date()
): boolean {
  return getAppointmentTemporalStatus(apt, now) === 'LATE';
}

/**
 * Formate une date en français (ex: "Mercredi 7 Octobre 2026")
 */
export function formatAppointmentDate(dateStr?: string | null): string {
  if (!dateStr) return '-';
  const cleanDate = dateStr.includes('T') ? dateStr.slice(0, 10) : dateStr;
  const [year, month, day] = cleanDate.split('-').map(Number);
  if (!year || !month || !day) return dateStr;
  const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: APP_TIMEZONE,
  }).format(d);
}

/**
 * Formate une heure (ex: "14h30")
 */
export function formatAppointmentTime(timeStr?: string | null): string {
  if (!timeStr) return '-';
  const clean = timeStr.slice(0, 5);
  const [h, m] = clean.split(':');
  return `${h || '00'}h${m || '00'}`;
}
