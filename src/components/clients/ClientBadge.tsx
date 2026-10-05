/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  UserCheck,
  UserPlus,
  Star,
  Clock,
  Archive,
  UserX,
  Sparkles,
  Building,
  GraduationCap,
  Church,
  Users,
  Briefcase,
  Store,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import type { ClientStatus, ClientCategory } from '../../types';

interface StatusBadgeProps {
  status: ClientStatus | string;
}

export const ClientStatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  switch (status) {
    case 'VIP':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
          <Star className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
          <span>VIP</span>
        </span>
      );
    case 'ACTIF':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
          <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>ACTIF</span>
        </span>
      );
    case 'REGULIER':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-900 border border-blue-300">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>RÉGULIER</span>
        </span>
      );
    case 'NOUVEAU':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-teal-100 text-teal-900 border border-teal-300">
          <UserPlus className="w-3.5 h-3.5 text-teal-600" />
          <span>NOUVEAU</span>
        </span>
      );
    case 'PROSPECT':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-900 border border-indigo-300">
          <Clock className="w-3.5 h-3.5 text-indigo-600" />
          <span>PROSPECT</span>
        </span>
      );
    case 'INACTIF':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-200 text-slate-800 border border-slate-300">
          <UserX className="w-3.5 h-3.5 text-slate-500" />
          <span>INACTIF</span>
        </span>
      );
    case 'ARCHIVE':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-900 border border-rose-300">
          <Archive className="w-3.5 h-3.5 text-rose-600" />
          <span>ARCHIVÉ</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
          <span>{status}</span>
        </span>
      );
  }
};

interface CategoryBadgeProps {
  category: ClientCategory | string;
}

export const ClientCategoryBadge: React.FC<CategoryBadgeProps> = ({ category }) => {
  const getIcon = () => {
    switch (category) {
      case 'Entreprise':
        return <Building className="w-3.5 h-3.5 text-slate-600" />;
      case 'École':
        return <GraduationCap className="w-3.5 h-3.5 text-blue-600" />;
      case 'Église':
        return <Church className="w-3.5 h-3.5 text-purple-600" />;
      case 'Association':
      case 'ONG':
        return <Users className="w-3.5 h-3.5 text-emerald-600" />;
      case 'Administration':
        return <Briefcase className="w-3.5 h-3.5 text-indigo-600" />;
      case 'Commerce':
        return <Store className="w-3.5 h-3.5 text-amber-600" />;
      default:
        return null;
    }
  };

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-slate-700 font-medium">
      {getIcon()}
      <span>{category}</span>
    </span>
  );
};

interface ConsentBadgeProps {
  consent: boolean;
  source?: string | null;
}

export const ClientConsentBadge: React.FC<ConsentBadgeProps> = ({ consent, source }) => {
  if (consent) {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200"
        title={source ? `Consentement actif (Source: ${source})` : 'Consentement WhatsApp actif'}
      >
        <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        <span>Autorisé</span>
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200"
      title="Consentement WhatsApp non accordé"
    >
      <XCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
      <span>Non autorisé</span>
    </span>
  );
};
