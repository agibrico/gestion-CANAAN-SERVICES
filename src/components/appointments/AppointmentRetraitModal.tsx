/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  PackageCheck,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  UserCheck,
  Send,
  Calendar,
  Clock,
  FileText,
} from 'lucide-react';
import { formatCFA, PAYMENT_MODES } from '../../lib/orderUtils';
import { formatPhoneDisplay } from '../../lib/phoneUtils';

interface AppointmentRetraitModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: any | null;
  onRetraitCompleted: () => void;
  onOpenWhatsAppRemerciement?: (apt: any) => void;
}

export const AppointmentRetraitModal: React.FC<AppointmentRetraitModalProps> = ({
  isOpen,
  onClose,
  appointment,
  onRetraitCompleted,
  onOpenWhatsAppRemerciement,
}) => {
  const [retirePar, setRetirePar] = useState('');
  const [dateRetrait, setDateRetrait] = useState('');
  const [heureRetrait, setHeureRetrait] = useState('');
  const [notes, setNotes] = useState('');

  // Encaissement au retrait
  const [effectuerPaiement, setEffectuerPaiement] = useState(true);
  const [montantRegle, setMontantRegle] = useState<number>(0);
  const [modePaiement, setModePaiement] = useState<string>('ESPECES');
  const [referenceTransaction, setReferenceTransaction] = useState('');

  // Dérogation si solde impayé
  const [autoriserSoldeRestant, setAutoriserSoldeRestant] = useState(false);
  const [motifDerogation, setMotifDerogation] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (appointment && isOpen) {
      const now = new Date();
      setDateRetrait(now.toISOString().slice(0, 10));
      setHeureRetrait(now.toTimeString().slice(0, 5));
      setRetirePar(appointment.responsable || 'Agent Canaan Services');
      setNotes('');

      const solde = Number(appointment.order_solde_restant) || 0;
      setMontantRegle(solde);
      setEffectuerPaiement(solde > 0);
      setModePaiement('ESPECES');
      setReferenceTransaction('');
      setAutoriserSoldeRestant(false);
      setMotifDerogation('');
      setErrorMsg(null);
    }
  }, [appointment, isOpen]);

  if (!isOpen || !appointment) return null;

  const orderMontantTotal = Number(appointment.order_montant_total) || 0;
  const orderAcompte = Number(appointment.order_acompte) || 0;
  const soldeActuel = Number(appointment.order_solde_restant) || 0;

  // Calcul du solde final après le versement saisi
  const versementSaisi = effectuerPaiement ? Math.max(0, Number(montantRegle) || 0) : 0;
  const soldeFinalPrevu = Math.max(0, soldeActuel - versementSaisi);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!retirePar.trim()) {
      setErrorMsg('Veuillez renseigner le nom de la personne remettant le travail.');
      return;
    }

    if (versementSaisi > soldeActuel) {
      setErrorMsg(`Le montant versé (${formatCFA(versementSaisi)}) ne peut pas excéder le solde dû (${formatCFA(soldeActuel)}).`);
      return;
    }

    if (soldeFinalPrevu > 0 && !autoriserSoldeRestant) {
      setErrorMsg(
        `Il reste un solde impayé de ${formatCFA(soldeFinalPrevu)}. Vous devez cocher l’autorisation de dérogation pour valider le retrait.`
      );
      return;
    }

    if (soldeFinalPrevu > 0 && autoriserSoldeRestant && !motifDerogation.trim()) {
      setErrorMsg('Veuillez préciser le motif de la dérogation administrative pour le solde impayé.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/appointments/${appointment.id}/retrait`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-name': retirePar.trim(),
        },
        body: JSON.stringify({
          date_retrait: dateRetrait,
          heure_retrait: heureRetrait,
          retire_par: retirePar.trim(),
          notes: notes.trim() || undefined,
          montant_regle: versementSaisi,
          mode_paiement: versementSaisi > 0 ? modePaiement : undefined,
          reference_transaction: referenceTransaction.trim() || undefined,
          autoriser_solde_restant: soldeFinalPrevu > 0 ? autoriserSoldeRestant : false,
          motif_derogation: soldeFinalPrevu > 0 ? motifDerogation.trim() : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Erreur lors de la validation du retrait.');
        return;
      }

      onRetraitCompleted();
      onClose();

      // Proposer l'envoi du message de remerciement
      if (onOpenWhatsAppRemerciement) {
        onOpenWhatsAppRemerciement(appointment);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur de communication avec le serveur.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-700 text-white flex items-center justify-center shadow-md shadow-emerald-700/20">
              <PackageCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Enregistrer le Retrait Client</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Clôture du rendez-vous, remise du travail et encaissement du solde
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Bloc Récapitulatif Commande */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-500 pb-2 border-b border-slate-200">
              <span>Client : <strong className="text-slate-900 font-sans text-xs">{appointment.client_nom} {appointment.client_prenom || ''}</strong></span>
              <span className="font-mono font-bold text-emerald-800">{appointment.order_numero || 'COMMANDE'}</span>
            </div>

            <div className="text-slate-800 font-semibold">{appointment.order_titre || appointment.motif}</div>

            <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-center">
              <div className="p-2 rounded-xl bg-white border border-slate-200/60">
                <span className="text-[10px] text-slate-400 block font-sans">Total Commande</span>
                <span className="font-bold text-slate-900">{formatCFA(orderMontantTotal)}</span>
              </div>
              <div className="p-2 rounded-xl bg-white border border-slate-200/60">
                <span className="text-[10px] text-emerald-700 block font-sans">Déjà Réglé</span>
                <span className="font-bold text-emerald-700">{formatCFA(orderAcompte)}</span>
              </div>
              <div className="p-2 rounded-xl bg-white border border-slate-200/60">
                <span className="text-[10px] text-rose-700 block font-sans">Solde Restant</span>
                <span className={`font-extrabold ${soldeActuel > 0 ? 'text-rose-700' : 'text-slate-500'}`}>
                  {formatCFA(soldeActuel)}
                </span>
              </div>
            </div>
          </div>

          {/* Informations Remise */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Date du retrait *</label>
              <input
                type="date"
                value={dateRetrait}
                onChange={(e) => setDateRetrait(e.target.value)}
                required
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Heure effective *</label>
              <input
                type="time"
                value={heureRetrait}
                onChange={(e) => setHeureRetrait(e.target.value)}
                required
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Remis par (Agent) *</label>
              <input
                type="text"
                value={retirePar}
                onChange={(e) => setRetirePar(e.target.value)}
                placeholder="Nom du responsable"
                required
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          {/* Section Encaissement */}
          {soldeActuel > 0 && (
            <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  Règlement au comptoir
                </span>

                <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700 text-[11px]">
                  <input
                    type="checkbox"
                    checked={effectuerPaiement}
                    onChange={(e) => setEffectuerPaiement(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  Encaisser maintenant
                </label>
              </div>

              {effectuerPaiement && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Montant perçu (F CFA) *</label>
                    <input
                      type="number"
                      value={montantRegle}
                      onChange={(e) => setMontantRegle(Number(e.target.value))}
                      min="0"
                      max={soldeActuel}
                      required
                      className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono font-bold text-emerald-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Mode de règlement *</label>
                    <select
                      value={modePaiement}
                      onChange={(e) => setModePaiement(e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl"
                    >
                      {PAYMENT_MODES.map((m) => (
                        <option key={m.key} value={m.key}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Réf. transaction / Reçu</label>
                    <input
                      type="text"
                      value={referenceTransaction}
                      onChange={(e) => setReferenceTransaction(e.target.value)}
                      placeholder="Ex: Wave ID, OM Tx"
                      className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-[11px]"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Alerte dérogation solde restant */}
          {soldeFinalPrevu > 0 && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 space-y-2 text-amber-950">
              <div className="flex items-center gap-2 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Solde restant impayé : {formatCFA(soldeFinalPrevu)}</span>
              </div>
              <p className="text-[11px] text-amber-900/90 leading-relaxed">
                Le montant perçu ne couvre pas l'intégralité du solde de la commande. Le retrait ne peut être validé qu'avec une dérogation administrative formelle.
              </p>

              <label className="flex items-center gap-2 pt-1 font-bold text-xs cursor-pointer text-amber-950">
                <input
                  type="checkbox"
                  checked={autoriserSoldeRestant}
                  onChange={(e) => setAutoriserSoldeRestant(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                Autoriser le retrait avec créance / dérogation accordée
              </label>

              {autoriserSoldeRestant && (
                <div className="pt-2">
                  <input
                    type="text"
                    value={motifDerogation}
                    onChange={(e) => setMotifDerogation(e.target.value)}
                    placeholder="Préciser le motif : ex: Accord Direction, Paiement à 30 jours, Bon de commande..."
                    required
                    className="w-full text-xs px-3 py-2 bg-white border border-amber-300 rounded-xl"
                  />
                </div>
              )}
            </div>
          )}

          {/* Notes internes */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Commentaires de remise / Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Travail vérifié et emballé avec le client, cartons remis complets..."
              rows={2}
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl resize-none"
            />
          </div>

          {/* Message d'erreur */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-100 transition-colors"
            >
              Annuler
            </button>

            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 disabled:opacity-50 transition-all"
            >
              <PackageCheck className="w-4 h-4" />
              <span>{loading ? 'Validation en cours...' : 'Valider le retrait du travail'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
