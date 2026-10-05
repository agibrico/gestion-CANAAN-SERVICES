/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  DollarSign,
} from 'lucide-react';
import {
  type PaymentMode,
  PAYMENT_MODES,
  formatCFA,
} from '../../lib/orderUtils';

interface OrderPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any | null;
  onPaymentAdded: () => void;
}

export const OrderPaymentModal: React.FC<OrderPaymentModalProps> = ({
  isOpen,
  onClose,
  order,
  onPaymentAdded,
}) => {
  const [montant, setMontant] = useState<number>(order?.solde_restant || 0);
  const [modePaiement, setModePaiement] = useState<PaymentMode>('ESPECES');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  React.useEffect(() => {
    if (order) {
      setMontant(order.solde_restant || 0);
      setModePaiement('ESPECES');
      setReference('');
      setNotes('');
      setErrorMsg(null);
    }
  }, [order, isOpen]);

  if (!isOpen || !order) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const amountNum = Number(montant);
    if (!amountNum || amountNum <= 0) {
      setErrorMsg('Veuillez saisir un montant valide supérieur à 0.');
      return;
    }

    if (amountNum > order.solde_restant) {
      setErrorMsg(`Le montant ne peut pas dépasser le solde dû (${formatCFA(order.solde_restant)}).`);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          montant: amountNum,
          mode_paiement: modePaiement,
          reference_transaction: reference.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Erreur lors de l’encaissement.');
        return;
      }

      onPaymentAdded();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur réseau.');
    } finally {
      setLoading(false);
    }
  };

  const newBalance = Math.max(0, (order.solde_restant || 0) - (Number(montant) || 0));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-800 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-700 flex items-center justify-center font-bold">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base">Enregistrer un règlement</h3>
              <p className="text-xs text-emerald-100">
                Commande {order.numero_commande} • Client : {order.client_nom || order.client?.nom}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-emerald-200 hover:text-white hover:bg-emerald-700 rounded-full transition-colors"
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

          {/* Synthèse montants */}
          <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Total Commande
              </span>
              <p className="text-sm font-bold text-slate-900 mt-0.5">
                {formatCFA(order.montant_total)}
              </p>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider">
                Solde Dû Actuel
              </span>
              <p className="text-sm font-extrabold text-rose-700 mt-0.5">
                {formatCFA(order.solde_restant)}
              </p>
            </div>
          </div>

          {/* Montant à encaisser */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-700">Montant du règlement (F CFA) *</label>
              <button
                type="button"
                onClick={() => setMontant(order.solde_restant || 0)}
                className="text-[11px] font-bold text-emerald-700 hover:underline"
              >
                Régler la totalité
              </button>
            </div>
            <input
              type="number"
              min={1}
              max={order.solde_restant}
              required
              value={montant || ''}
              onChange={(e) => setMontant(Number(e.target.value))}
              placeholder="ex: 15000"
              className="w-full text-base font-bold text-slate-900 px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Nouveau solde après règlement : <strong className="text-emerald-700">{formatCFA(newBalance)}</strong>
            </p>
          </div>

          {/* Mode de règlement */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Mode de règlement *</label>
            <select
              value={modePaiement}
              onChange={(e) => setModePaiement(e.target.value as PaymentMode)}
              className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 bg-white"
            >
              {PAYMENT_MODES.map((mode) => (
                <option key={mode.key} value={mode.key}>
                  {mode.label}
                </option>
              ))}
            </select>
          </div>

          {/* Référence transaction */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Référence transaction (ID Wave, Réf Orange Money, Chèque...)
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="ex: CI260105.1234.A00123"
              className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200"
            />
          </div>

          {/* Note */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Commentaire ou observation</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observations caisse..."
              className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200"
            />
          </div>

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
              disabled={loading || montant <= 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              {loading ? 'Encaissement...' : 'Valider l’encaissement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
