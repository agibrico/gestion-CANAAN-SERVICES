/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Package,
  User,
  Phone,
  MessageSquare,
  Calendar,
  CreditCard,
  History,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Edit2,
  Send,
  Plus,
  RefreshCw,
  Printer,
  Sparkles,
  ExternalLink,
  Layers,
  CheckCheck,
} from 'lucide-react';
import {
  type OrderStatus,
  ORDER_STATUS_MAP,
  ORDER_WORKFLOW_STEPS,
  formatCFA,
} from '../../lib/orderUtils';
import { formatPhoneDisplay } from '../../lib/phoneUtils';
import { OrderStatusBadge, OrderLateBadge, OrderPriorityBadge } from './OrderBadge';
import { OrderPaymentModal } from './OrderPaymentModal';
import { OrderStatusModal } from './OrderStatusModal';
import { ClientWhatsAppModal } from '../clients/ClientWhatsAppModal';
import { AppointmentFormModal } from '../appointments/AppointmentFormModal';

interface OrderDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string | null;
  onEditOrder: (order: any) => void;
  onOpenClientDetail: (clientId: string) => void;
  onRefreshList: () => void;
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  isOpen,
  onClose,
  orderId,
  onEditOrder,
  onOpenClientDetail,
  onRefreshList,
}) => {
  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'resume' | 'prestations' | 'paiements' | 'whatsapp' | 'historique' | 'fichiers'
  >('resume');

  // Sub-modals
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);

  const fetchOrderDetails = async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`);
      const data = await res.json();
      if (data.success && data.order) {
        setOrder(data.order);
      }
    } catch (err) {
      console.error('Erreur chargement détails commande :', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && orderId) {
      setActiveTab('resume');
      fetchOrderDetails();
    }
  }, [isOpen, orderId]);

  if (!isOpen || !orderId) return null;

  const currentStatus = (order?.statut as OrderStatus) || 'COMMANDE_RECUE';
  const currentStepNum = ORDER_STATUS_MAP[currentStatus]?.step || 1;

  // Raccourci vers statut PRETE
  const handleMarkAsReady = async () => {
    if (order.statut === 'PRETE') return;
    setIsStatusModalOpen(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] my-auto animate-in fade-in zoom-in-95">
        {/* Header Fiche Commande */}
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/70 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-700 text-white flex items-center justify-center text-lg font-bold shadow-md shadow-emerald-700/20 shrink-0">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-extrabold text-slate-900 font-mono">
                  {order ? order.numero_commande : 'Chargement...'}
                </h2>
                {order && <OrderStatusBadge status={order.statut} size="md" />}
                {order && <OrderLateBadge datePrevue={order.date_prevue} status={order.statut} />}
                {order && <OrderPriorityBadge priority={order.priorite} />}
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
                <span>
                  Client :{' '}
                  <button
                    type="button"
                    onClick={() => onOpenClientDetail(order.client_id)}
                    className="font-bold text-emerald-800 hover:underline inline-flex items-center gap-0.5"
                  >
                    {order ? `${order.client?.nom} ${order.client?.prenom || ''}` : '-'}
                    <ExternalLink className="w-3 h-3 ml-0.5" />
                  </button>
                </span>
                <span>• Téléphone : <strong className="font-mono text-slate-800">{formatPhoneDisplay(order?.client?.telephone)}</strong></span>
                <span>• Prévu le : <strong className="text-slate-800">{order?.date_prevue ? new Date(order.date_prevue).toLocaleDateString('fr-FR') : 'Non planifié'}</strong></span>
              </div>
            </div>
          </div>

          {/* Actions rapides d'en-tête */}
          <div className="flex items-center gap-2 flex-wrap self-end md:self-center">
            {order?.statut === 'PRETE' && (
              <button
                onClick={() => setIsAppointmentModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold shadow-xs transition-colors"
                title="Programmer le rendez-vous de retrait client"
              >
                <Calendar className="w-3.5 h-3.5" />
                Programmer retrait
              </button>
            )}

            {order?.statut !== 'PRETE' && order?.statut !== 'RETIREE' && order?.statut !== 'ANNULEE' && (
              <button
                onClick={handleMarkAsReady}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
                title="Marquer prête pour retrait client"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Travail prêt
              </button>
            )}

            <button
              onClick={() => setIsStatusModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Statut
            </button>

            <button
              onClick={() => setIsPaymentModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-bold"
            >
              <CreditCard className="w-3.5 h-3.5" />
              Paiement
            </button>

            <button
              onClick={() => setIsWhatsAppModalOpen(true)}
              className="p-2 text-emerald-700 hover:bg-emerald-50 rounded-xl"
              title="Envoyer un message WhatsApp"
            >
              <Send className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                onEditOrder(order);
                onClose();
              }}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl"
              title="Modifier la commande"
            >
              <Edit2 className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Barre d'onglets de navigation */}
        <div className="px-6 border-b border-slate-200/80 bg-white flex items-center gap-6 overflow-x-auto text-xs font-semibold">
          <button
            onClick={() => setActiveTab('resume')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'resume'
                ? 'border-emerald-600 text-emerald-800 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            Résumé & Workflow
          </button>

          <button
            onClick={() => setActiveTab('prestations')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'prestations'
                ? 'border-emerald-600 text-emerald-800 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Prestations ({order?.items?.length || 0})
          </button>

          <button
            onClick={() => setActiveTab('paiements')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'paiements'
                ? 'border-emerald-600 text-emerald-800 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            Règlements ({order?.payments?.length || 0})
          </button>

          <button
            onClick={() => setActiveTab('whatsapp')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'whatsapp'
                ? 'border-emerald-600 text-emerald-800 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            WhatsApp ({order?.whatsappMessages?.length || 0})
          </button>

          <button
            onClick={() => setActiveTab('historique')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'historique'
                ? 'border-emerald-600 text-emerald-800 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Historique ({order?.activity?.length || 0})
          </button>

          <button
            onClick={() => setActiveTab('fichiers')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'fichiers'
                ? 'border-emerald-600 text-emerald-800 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Fichiers & Liens ({order?.fichiers?.length || 0})
          </button>
        </div>

        {/* Contenu */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* ONGLET 1 : RÉSUMÉ & WORKFLOW */}
          {activeTab === 'resume' && (
            <div className="space-y-6 text-xs">
              {/* Cartes financières synthétiques */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Total Commande
                  </span>
                  <p className="text-xl font-extrabold text-slate-900 mt-0.5">
                    {formatCFA(order?.montant_total)}
                  </p>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">
                    Acompte Encaissé
                  </span>
                  <p className="text-xl font-extrabold text-emerald-700 mt-0.5">
                    {formatCFA(order?.acompte)}
                  </p>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider">
                    Solde Dû
                  </span>
                  <p className="text-xl font-extrabold text-rose-700 mt-0.5">
                    {formatCFA(order?.solde_restant)}
                  </p>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Délai / Retrait
                  </span>
                  <p className="text-sm font-bold text-slate-900 mt-1">
                    {order?.date_prevue ? new Date(order.date_prevue).toLocaleDateString('fr-FR') : 'Non défini'}
                  </p>
                </div>
              </div>

              {/* Timeline visuelle du workflow de production */}
              <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200 space-y-3">
                <span className="block font-bold text-slate-800 text-xs uppercase tracking-wider">
                  Progression du travail dans l'atelier
                </span>

                <div className="flex items-center justify-between gap-1 overflow-x-auto py-2">
                  {ORDER_WORKFLOW_STEPS.map((stepKey, idx) => {
                    const stepMeta = ORDER_STATUS_MAP[stepKey];
                    const isPassed = currentStepNum > stepMeta.step;
                    const isCurrent = currentStatus === stepKey;

                    return (
                      <div key={stepKey} className="flex items-center gap-1 shrink-0">
                        <div
                          className={`flex flex-col items-center gap-1 px-2.5 py-1.5 rounded-xl border text-center transition-all ${
                            isCurrent
                              ? 'bg-emerald-600 text-white font-bold shadow-xs border-emerald-700'
                              : isPassed
                              ? 'bg-emerald-50 text-emerald-900 border-emerald-200 font-semibold'
                              : 'bg-white text-slate-400 border-slate-200'
                          }`}
                        >
                          <span className="text-[10px] font-mono">#{idx + 1}</span>
                          <span className="text-[11px] whitespace-nowrap">{stepMeta.label}</span>
                        </div>
                        {idx < ORDER_WORKFLOW_STEPS.length - 1 && (
                          <div
                            className={`w-4 h-0.5 ${
                              isPassed ? 'bg-emerald-500' : 'bg-slate-200'
                            }`}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Détails complémentaires */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-2">
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-100">
                    <User className="w-3.5 h-3.5 text-emerald-600" />
                    Informations Client & Contact
                  </h4>
                  <div className="space-y-1.5 text-slate-600">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Nom :</span>
                      <strong className="text-slate-900">{order?.client?.nom} {order?.client?.prenom || ''}</strong>
                    </div>
                    {order?.client?.entreprise && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Entreprise :</span>
                        <span className="font-medium text-slate-800">{order.client.entreprise}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-400">Téléphone :</span>
                      <span className="font-mono font-bold text-slate-800">{formatPhoneDisplay(order?.client?.telephone)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">WhatsApp :</span>
                      <span className="font-mono font-bold text-emerald-800">{formatPhoneDisplay(order?.client?.whatsapp)}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-2">
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-100">
                    <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                    Responsable & Dates Jalons
                  </h4>
                  <div className="space-y-1.5 text-slate-600">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Responsable :</span>
                      <span className="font-semibold text-slate-800">{order?.responsable || 'Non assigné'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Date commande :</span>
                      <span>{order?.date_commande ? new Date(order.date_commande).toLocaleDateString('fr-FR') : '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Date livraison prévue :</span>
                      <strong className="text-slate-900">{order?.date_prevue ? new Date(order.date_prevue).toLocaleDateString('fr-FR') : '-'}</strong>
                    </div>
                    {order?.date_terminee && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Date travail prêt :</span>
                        <strong className="text-emerald-700">{new Date(order.date_terminee).toLocaleString('fr-FR')}</strong>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Notes */}
              {order?.notes && (
                <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-1">
                  <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                    Consignes d'atelier & Notes
                  </span>
                  <p className="text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200/60 leading-relaxed whitespace-pre-line">
                    {order.notes}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ONGLET 2 : PRESTATIONS */}
          {activeTab === 'prestations' && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="font-bold text-slate-800 uppercase tracking-wider">
                  Détail des prestations et spécifications techniques
                </span>
                <span className="text-slate-500 font-medium">
                  {order?.items?.length || 0} prestation(s)
                </span>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[11px]">
                      <th className="p-3">Désignation</th>
                      <th className="p-3">Catégorie</th>
                      <th className="p-3">Quantité</th>
                      <th className="p-3">Prix unitaire</th>
                      <th className="p-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-normal">
                    {order?.items?.map((it: any) => (
                      <tr key={it.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-bold text-slate-900">
                          {it.designation}
                          {it.specifications && Object.keys(it.specifications).length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1 font-normal text-[10px] text-slate-500">
                              {Object.entries(it.specifications)
                                .filter(([_, v]) => Boolean(v))
                                .map(([k, v]) => (
                                  <span
                                    key={k}
                                    className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-700 font-medium"
                                  >
                                    {k}: {String(v)}
                                  </span>
                                ))}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-slate-600">{it.categorie || 'Autre'}</td>
                        <td className="p-3 font-bold text-slate-800">{it.quantite}</td>
                        <td className="p-3 font-mono">{formatCFA(it.prix_unitaire)}</td>
                        <td className="p-3 font-mono font-extrabold text-emerald-800 text-right">
                          {formatCFA(it.prix_total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 font-bold border-t border-slate-200 text-slate-900">
                      <td colSpan={4} className="p-3 text-right">Montant Total :</td>
                      <td className="p-3 text-right text-emerald-800 font-extrabold font-mono text-sm">
                        {formatCFA(order?.montant_total)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* ONGLET 3 : RÈGLEMENTS */}
          {activeTab === 'paiements' && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="font-bold text-slate-800 uppercase tracking-wider">
                  Règlements & Quittances caisse
                </span>
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold"
                >
                  <Plus className="w-3.5 h-3.5" /> Encaisser un règlement
                </button>
              </div>

              {order?.payments?.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <CreditCard className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="font-semibold text-slate-700">Aucun règlement enregistré</p>
                  <p className="text-[11px] mt-0.5">Cliquez sur le bouton pour consigner l'acompte ou le paiement du client.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {order?.payments?.map((p: any) => (
                    <div
                      key={p.id}
                      className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/60 flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{p.numero_recu}</span>
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">
                            {p.mode_paiement}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Encaissé le {new Date(p.date_paiement).toLocaleString('fr-FR')} • {p.caissier || 'Caisse'}
                          {p.reference_transaction && ` • Réf : ${p.reference_transaction}`}
                        </p>
                      </div>
                      <span className="text-base font-extrabold text-emerald-800 font-mono">
                        +{formatCFA(p.montant)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ONGLET 4 : WHATSAPP */}
          {activeTab === 'whatsapp' && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="font-bold text-slate-800 uppercase tracking-wider">
                  Timeline WhatsApp (Client & Commande)
                </span>
                <button
                  type="button"
                  onClick={() => setIsWhatsAppModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold"
                >
                  <Send className="w-3.5 h-3.5" /> Envoyer un message
                </button>
              </div>

              {order?.whatsappMessages?.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="font-semibold text-slate-700">Aucun message pour le moment</p>
                  <p className="text-[11px] mt-0.5">
                    Utilisez le bouton pour adresser une notification automatique ou répondre directement au client.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {order.whatsappMessages.map((msg: any) => (
                    <div
                      key={msg.id}
                      className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/60 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span className="font-semibold">{new Date(msg.date_envoi).toLocaleString('fr-FR')}</span>
                        <span className="font-bold text-emerald-800">{msg.statut}</span>
                      </div>
                      <p className="bg-white p-2.5 rounded-xl border border-slate-200/60 leading-relaxed text-slate-800 whitespace-pre-line">
                        {msg.contenu_texte}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ONGLET 5 : HISTORIQUE */}
          {activeTab === 'historique' && (
            <div className="space-y-3 text-xs">
              <span className="block font-bold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-100">
                Journal chronologique de la commande
              </span>

              {order?.activity?.length === 0 ? (
                <p className="text-slate-400 py-6 text-center">Aucun événement consigné.</p>
              ) : (
                <div className="relative pl-6 border-l-2 border-slate-200 space-y-4 my-2">
                  {order.activity.map((act: any) => (
                    <div key={act.id} className="relative">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-600 absolute -left-[31px] top-1 border-2 border-white ring-2 ring-emerald-200" />
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span className="font-bold text-slate-900">{act.action}</span>
                        <span>{new Date(act.date_action).toLocaleString('fr-FR')}</span>
                      </div>
                      <p className="text-slate-700 mt-0.5">{act.details}</p>
                      <span className="text-[10px] text-slate-400">Par : {act.utilisateur || 'Agent CRM'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ONGLET 6 : FICHIERS & LIENS */}
          {activeTab === 'fichiers' && (
            <div className="space-y-3 text-xs">
              <span className="block font-bold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-100">
                Fichiers de référence & Maquettes atelier
              </span>

              {order?.fichiers?.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p>Aucun fichier rattaché pour cette commande.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {order.fichiers.map((f: any, i: number) => (
                    <div
                      key={i}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between"
                    >
                      <span className="font-medium text-slate-800 truncate max-w-md">{f.url}</span>
                      <a
                        href={f.url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1 bg-white border border-slate-300 text-slate-700 rounded-lg font-bold text-xs hover:bg-slate-50 flex items-center gap-1"
                      >
                        Ouvrir <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sous-modals */}
      <OrderPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        order={order}
        onPaymentAdded={() => {
          fetchOrderDetails();
          onRefreshList();
        }}
      />

      <OrderStatusModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        order={order}
        onStatusChanged={() => {
          fetchOrderDetails();
          onRefreshList();
        }}
      />

      <ClientWhatsAppModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        client={order?.client}
        onSent={() => {
          fetchOrderDetails();
          onRefreshList();
        }}
      />

      {isAppointmentModalOpen && (
        <AppointmentFormModal
          isOpen={isAppointmentModalOpen}
          onClose={() => setIsAppointmentModalOpen(false)}
          defaultClientId={order?.client_id}
          defaultOrderId={order?.id}
          defaultType="RETRAIT_TRAVAIL"
          onSaved={() => {
            setIsAppointmentModalOpen(false);
            fetchOrderDetails();
            onRefreshList();
          }}
        />
      )}
    </div>
  );
};
