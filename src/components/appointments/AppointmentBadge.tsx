/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  type AppointmentType,
  type AppointmentStatus,
  type TemporalStatus,
  APPOINTMENT_TYPES_MAP,
  APPOINTMENT_STATUS_MAP,
  TEMPORAL_STATUS_MAP,
} from '../../lib/appointmentUtils';
import { Clock, AlertTriangle, CheckCircle2, XCircle, Calendar, Sparkles } from 'lucide-react';

export interface AppointmentTypeBadgeProps {
  type: AppointmentType | string;
  className?: string;
}

export const AppointmentTypeBadge: React.FC<AppointmentTypeBadgeProps> = ({ type, className = '' }) => {
  const meta = APPOINTMENT_TYPES_MAP[type as AppointmentType] || {
    label: type || 'Autre',
    badge: {
      bg: 'bg-slate-100',
      text: 'text-slate-700',
      border: 'border-slate-300',
    },
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${meta.badge.bg} ${meta.badge.text} ${meta.badge.border} ${className}`}
    >
      {meta.label}
    </span>
  );
};

export interface AppointmentStatusBadgeProps {
  status: AppointmentStatus | string;
  className?: string;
}

export const AppointmentStatusBadge: React.FC<AppointmentStatusBadgeProps> = ({ status, className = '' }) => {
  const meta = APPOINTMENT_STATUS_MAP[status as AppointmentStatus] || {
    label: status || 'Inconnu',
    badge: {
      bg: 'bg-slate-100',
      text: 'text-slate-700',
      border: 'border-slate-300',
    },
  };

  let icon = null;
  if (status === 'CONFIRME') icon = <CheckCircle2 className="w-3 h-3 text-blue-600" />;
  else if (status === 'TERMINE') icon = <CheckCircle2 className="w-3 h-3 text-emerald-600" />;
  else if (status === 'ANNULE') icon = <XCircle className="w-3 h-3 text-slate-500" />;
  else if (status === 'ABSENT') icon = <AlertTriangle className="w-3 h-3 text-rose-600" />;
  else if (status === 'A_CONFIRMER') icon = <Clock className="w-3 h-3 text-amber-600" />;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${meta.badge.bg} ${meta.badge.text} ${meta.badge.border} ${className}`}
    >
      {icon}
      <span>{meta.label}</span>
    </span>
  );
};

export interface AppointmentTemporalBadgeProps {
  temporalStatus: TemporalStatus | string;
  isLate?: boolean;
  className?: string;
}

export const AppointmentTemporalBadge: React.FC<AppointmentTemporalBadgeProps> = ({
  temporalStatus,
  isLate,
  className = '',
}) => {
  if (isLate || temporalStatus === 'LATE') {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-50 text-rose-800 border border-rose-300 animate-pulse ${className}`}
      >
        <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
        <span>EN RETARD</span>
      </span>
    );
  }

  if (temporalStatus === 'TODAY') {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100/80 text-emerald-900 border border-emerald-300 ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping" />
        <span>AUJOURD'HUI</span>
      </span>
    );
  }

  if (temporalStatus === 'TOMORROW') {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-900 border border-blue-300 ${className}`}
      >
        <Calendar className="w-3 h-3 text-blue-600" />
        <span>DEMAIN</span>
      </span>
    );
  }

  if (temporalStatus === 'UPCOMING') {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 ${className}`}
      >
        <span>À venir</span>
      </span>
    );
  }

  return null;
};
