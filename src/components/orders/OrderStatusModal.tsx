/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Send,
  ArrowRight,
  Info,
  Calendar,
  MessageSquare,
} from 'lucide-react';
import {
  type OrderStatus,
  ORDER_STATUS_MAP,
  ORDER_WORKFLOW_STEPS,
  isTransitionAllowed,
} from '../../lib/orderUtils';
import { OrderStatusBadge } from './OrderBadge';

interface OrderStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any | null;
  onStatusChanged: () => void;
}

export const OrderStatusModal: React.FC<OrderStatusModalProps> = ({
  isOpen,
  onClose,
  order,
  onStatusChanged,
}) => {
  const currentStatus = (order?.statut as OrderStatus) || 'COMMANDE_RECUE';
  const meta = ORDER_STATUS_MAP[currentStatus];

  const [selectedStatus, setSelectedStatus] = useState<OrderStatus>(
    meta?.allowedTransitions[0] || currentStatus
  );
  const [notifyWhatsApp, setNotifyWhatsApp] = useState(true);
  const [forceOverride, setForceOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  React.useEffect(() => {
    if (order) {
      const allowed = ORDER_STATUS_MAP[order.statut as OrderStatus]?.allowedTransitions || [];
      setSelectedStatus(allowed[0] || (order.statut as OrderStatus));
      setNotifyWhatsApp(Boolean(order.client_consentement || order.client?.consentement_whatsapp));
      setForceOverride(false);
      setOverrideReason('');
      setErrorMsg(null);
    }
  }, [order, isOpen]);

  if (!isOpen || !order) return null;

  const targetMeta = ORDER_STATUS_MAP[selectedStatus];
  const isAllowed = isTransitionAllowed(currentStatus, selectedStatus);
  const suggestedTemplate = targetMeta?.suggestedTemplate;
  const clientHasConsent = Boolean(order.client_consentement || order.client?.consentement_whatsapp);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (selectedStatus === currentStatus) {
      setErrorMsg('Veuillez sélectionner un statut différent du statut actuel.');
      return;
    }

    if (!isAllowed && !forceOverride) {
      setErrorMsg('Cette transition de statut n’est pas permise dans le cycle normal.');
      return;
    }

    if (forceOverride && !overrideReason.trim()) {
      setErrorMsg('Veuillez préciser le motif de la dérogation administrative.');
      return;
    }

    setLoading(true);
    try {
      // 1. Mettre à jour le statut
      const res = await fetch(`/api/orders/${order.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          statut: selectedStatus,
          force: forceOverride,
          raison: overrideReason.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Erreur lors de la mise à jour du statut.');
        return;
      }

      // 2. Si l'utilisateur a choisi d'informer le client sur WhatsApp et qu'un modèle suggéré existe
      if (notifyWhatsApp && suggestedTemplate && clientHasConsent) {
        try {
          await fetch(`/api/orders/${order.id}/whatsapp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              templateName: suggestedTemplate,
            }),
          });
        } catch (waErr) {
          console.warn('Erreur envoi notification WhatsApp :', waErr);
        }
      }

      onStatusChanged();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur réseau.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/10 text-indigo-700 flex items-center justify-center font-bold">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Faire progresser le travail</h3>
              <p className="text-xs text-slate-500">
                Commande {order.numero_commande} • {order.titre}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Statut actuel */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
            <span className="font-semibold text-slate-500">Statut actuel :</span>
            <OrderStatusBadge status={currentStatus} size="md" />
          </div>

          {/* Choix des statuts suivants */}
          <div>
            <label className="block font-bold text-slate-800 text-[11px] uppercase tracking-wider mb-2">
              Statuts suivants recommandés
            </label>
            <div className="space-y-1.5">
              {meta?.allowedTransitions.map((st) => {
                const isSelected = selectedStatus === st;
                const stMeta = ORDER_STATUS_MAP[st];
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => {
                      setSelectedStatus(st);
                      setForceOverride(false);
                    }}
                    className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
                      isSelected
                        ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-500/20 shadow-xs'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <p className="font-bold text-slate-900 text-xs">{stMeta.label}</p>
                      <p className="text-[11px] text-slate-500">{stMeta.description}</p>
                    </div>
                    <ArrowRight className={`w-4 h-4 ${isSelected ? 'text-emerald-700' : 'text-slate-300'}`} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dérogation administrative exceptionnelle */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={forceOverride}
                  onChange={(e) => setForceOverride(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-slate-700 font-semibold">Dérogation administrative</span>
              </label>
              {forceOverride && (
                <span className="text-[10px] uppercase font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                  Exception tracée
                </span>
              )}
            </div>

            {forceOverride && (
              <div className="mt-3 space-y-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Sélectionner n'importe quel statut
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value as OrderStatus)}
                    className="w-full text-xs p-2 rounded-xl border border-slate-300 bg-white"
                  >
                    {ORDER_WORKFLOW_STEPS.map((s) => (
                      <option key={s} value={s}>
                        {ORDER_STATUS_MAP[s].label}
                      </option>
                    ))}
                    <option value="ANNULEE">Commande annulée</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Motif obligatoire de la dérogation
                  </label>
                  <input
                    type="text"
                    required
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    placeholder="ex: Demande client, rectification BAT sans réimpression..."
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Proposition Notification WhatsApp */}
          {suggestedTemplate && (
            <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-emerald-700" />
                  <span className="font-bold text-emerald-950 text-xs">
                    Informer le client sur WhatsApp ?
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={notifyWhatsApp}
                  disabled={!clientHasConsent}
                  onChange={(e) => setNotifyWhatsApp(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
              </div>

              <p className="text-[11px] text-emerald-900/90 leading-relaxed">
                Modèle Meta approuvé proposé : <code className="font-mono font-bold">{suggestedTemplate}</code>.
                {!clientHasConsent && (
                  <span className="text-rose-600 font-bold block mt-0.5">
                    (Désactivé : ce client n'a pas accordé son consentement WhatsApp)
                  </span>
                )}
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || selectedStatus === currentStatus}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              {loading ? 'Validation en cours...' : 'Confirmer le changement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
