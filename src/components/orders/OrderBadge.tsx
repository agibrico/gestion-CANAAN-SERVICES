/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Clock,
  Sparkles,
  FileCheck,
  CheckCircle2,
  Cpu,
  Printer,
  Scissors,
  CheckCheck,
  CalendarCheck,
  PackageCheck,
  XCircle,
  AlertTriangle,
  Flame,
  Zap,
} from 'lucide-react';
import {
  type OrderStatus,
  type OrderPriority,
  ORDER_STATUS_MAP,
  isOrderLate,
} from '../../lib/orderUtils';

interface OrderStatusBadgeProps {
  status: OrderStatus | string;
  size?: 'sm' | 'md';
}

export const OrderStatusBadge: React.FC<OrderStatusBadgeProps> = ({ status, size = 'sm' }) => {
  const meta = ORDER_STATUS_MAP[status as OrderStatus];
  const label = meta?.label || status;

  const getIcon = () => {
    switch (status) {
      case 'COMMANDE_RECUE':
        return <Clock className="w-3.5 h-3.5 text-slate-600 shrink-0" />;
      case 'EN_CONCEPTION':
        return <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />;
      case 'ATTENTE_VALIDATION':
        return <FileCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />;
      case 'VALIDEE':
        return <CheckCircle2 className="w-3.5 h-3.5 text-sky-600 shrink-0" />;
      case 'EN_PRODUCTION':
        return <Cpu className="w-3.5 h-3.5 text-blue-600 shrink-0" />;
      case 'EN_IMPRESSION':
        return <Printer className="w-3.5 h-3.5 text-purple-600 shrink-0" />;
      case 'EN_FINITION':
        return <Scissors className="w-3.5 h-3.5 text-teal-600 shrink-0" />;
      case 'PRETE':
        return <CheckCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />;
      case 'RENDEZ_VOUS_PROGRAMME':
        return <CalendarCheck className="w-3.5 h-3.5 text-cyan-700 shrink-0" />;
      case 'RETIREE':
        return <PackageCheck className="w-3.5 h-3.5 text-slate-600 shrink-0" />;
      case 'ANNULEE':
        return <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />;
      default:
        return null;
    }
  };

  const badgeStyle = meta?.badge || {
    bg: 'bg-slate-100',
    text: 'text-slate-800',
    border: 'border-slate-300',
  };

  const paddingClass = size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-bold rounded-full border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border} ${paddingClass} shadow-2xs`}
      title={meta?.description}
    >
      {getIcon()}
      <span>{label}</span>
    </span>
  );
};

interface OrderLateBadgeProps {
  datePrevue: string | Date | null | undefined;
  status: OrderStatus | string;
}

export const OrderLateBadge: React.FC<OrderLateBadgeProps> = ({ datePrevue, status }) => {
  const late = isOrderLate(datePrevue, status);
  if (!late) return null;

  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-600 text-white shadow-xs animate-pulse"
      title="Cette commande a dépassé sa date prévue de réalisation"
    >
      <AlertTriangle className="w-3 h-3 text-white shrink-0" />
      <span>EN RETARD</span>
    </span>
  );
};

interface OrderPriorityBadgeProps {
  priority: OrderPriority | string;
}

export const OrderPriorityBadge: React.FC<OrderPriorityBadgeProps> = ({ priority }) => {
  switch (priority) {
    case 'TRES_URGENTE':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-900 border border-rose-300">
          <Flame className="w-3 h-3 text-rose-600 fill-rose-500" />
          <span>TRÈS URGENT</span>
        </span>
      );
    case 'URGENTE':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
          <Zap className="w-3 h-3 text-amber-600 fill-amber-500" />
          <span>URGENT</span>
        </span>
      );
    case 'NORMALE':
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
          <span>Normale</span>
        </span>
      );
  }
};
