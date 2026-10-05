/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  User,
  Phone,
  MessageSquare,
  Package,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Send,
  Edit2,
  Trash2,
  UserX,
  PackageCheck,
  ExternalLink,
  ShieldCheck,
  FileText,
  RefreshCw,
} from 'lucide-react';
import {
  formatAppointmentDate,
  formatAppointmentTime,
  getAppointmentTemporalStatus,
  DEFAULT_APP_LOCATION,
} from '../../lib/appointmentUtils';
import { formatPhoneDisplay } from '../../lib/phoneUtils';
import { formatCFA } from '../../lib/orderUtils';
import {
  AppointmentStatusBadge,
  AppointmentTypeBadge,
  AppointmentTemporalBadge,
} from './AppointmentBadge';
import { AppointmentRetraitModal } from './AppointmentRetraitModal';
import { AppointmentWhatsAppModal } from './AppointmentWhatsAppModal';

interface AppointmentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentId: string | null;
  onEdit: (appointment: any) => void;
  onOpenClientDetail?: (clientId: string) => void;
  onOpenOrderDetail?: (orderId: string) => void;
  onRefreshList: () => void;
}

export const AppointmentDetailModal: React.FC<AppointmentDetailModalProps> = ({
  isOpen,
  onClose,
  appointmentId,
  onEdit,
  onOpenClientDetail,
  onOpenOrderDetail,
  onRefreshList,
}) => {
  const [appointment, setAppointment] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sub-modals
  const [isRetraitModalOpen, setIsRetraitModalOpen] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [whatsAppDefaultTemplate, setWhatsAppDefaultTemplate] = useState<string>('confirmation_rendez_vous');

  const fetchAppointmentDetails = async () => {
    if (!appointmentId) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/appointments/${appointmentId}`);
      const data = await res.json();
      if (data.success && data.appointment) {
        setAppointment(data.appointment);
      } else {
        setErrorMsg(data.error || 'Impossible de charger le rendez-vous.');
      }
    } catch (err) {
      console.error('Erreur chargement détails rendez-vous :', err);
      setErrorMsg('Erreur de connexion au serveur.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && appointmentId) {
      fetchAppointmentDetails();
    }
  }, [isOpen, appointmentId]);

  if (!isOpen || !appointmentId) return null;

  const temporalStatus = appointment
    ? getAppointmentTemporalStatus({
        date_rendez_vous: appointment.date_rendez_vous || appointment.date,
        heure_rendez_vous: appointment.heure_rendez_vous || appointment.heure,
        statut: appointment.statut,
      })
    : 'UPCOMING';

  const isRetrait = appointment?.type_rendez_vous === 'RETRAIT_TRAVAIL';
  const isTermine = appointment?.statut === 'TERMINE';
  const isAnnule = appointment?.statut === 'ANNULE';
  const isAbsent = appointment?.statut === 'ABSENT';

  // Confirmer rendez-vous
  const handleConfirm = async () => {
    if (!appointment) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/appointments/${appointment.id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-name': 'Agent Canaan CRM' },
      });
      const data = await res.json();
      if (data.success) {
        await fetchAppointmentDetails();
        onRefreshList();
      } else {
        alert(data.error || 'Erreur lors de la confirmation.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  // Clôturer rendez-vous simple (dépôt, consultation, validation)
  const handleCompleteSimple = async () => {
    if (!appointment) return;
    if (!window.confirm('Voulez-vous marquer ce rendez-vous comme terminé avec succès ?')) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/appointments/${appointment.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-name': 'Agent Canaan CRM' },
        body: JSON.stringify({ notes: 'Rendez-vous terminé avec succès' }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchAppointmentDetails();
        onRefreshList();
      } else {
        alert(data.error || 'Erreur lors de la clôture.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  // Signaler client absent
  const handleMarkAbsent = async () => {
    if (!appointment) return;
    if (!window.confirm('Confirmez-vous que le client ne s’est pas présenté au rendez-vous ?')) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/appointments/${appointment.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-user-name': 'Agent Canaan CRM' },
        body: JSON.stringify({ statut: 'ABSENT', raison: 'Client non présenté à l’heure convenue' }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchAppointmentDetails();
        onRefreshList();
      } else {
        alert(data.error || 'Erreur lors du signalement.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  // Annuler le rendez-vous
  const handleCancel = async () => {
    if (!appointment) return;
    const raison = window.prompt("Motif de l'annulation du rendez-vous :");
    if (raison === null) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/appointments/${appointment.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'x-user-name': 'Agent Canaan CRM' },
        body: JSON.stringify({ raison: raison || 'Annulation à la demande du client ou de l’atelier' }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchAppointmentDetails();
        onRefreshList();
      } else {
        alert(data.error || 'Erreur lors de l’annulation.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const openWhatsAppWithTemplate = (templateName: string) => {
    setWhatsAppDefaultTemplate(templateName);
    setIsWhatsAppModalOpen(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] my-auto animate-in fade-in zoom-in-95">
        {/* Header Fiche Rendez-vous */}
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-700 text-white flex items-center justify-center text-lg font-bold shadow-md shadow-emerald-700/20 shrink-0">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-extrabold text-slate-900">
                  Fiche Rendez-vous
                </h2>
                {appointment && (
                  <>
                    <AppointmentTypeBadge type={appointment.type_rendez_vous} />
                    <AppointmentStatusBadge status={appointment.statut} />
                    <AppointmentTemporalBadge temporalStatus={temporalStatus} />
                  </>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
                <span className="flex items-center gap-1 font-semibold text-slate-700">
                  <Clock className="w-3.5 h-3.5 text-emerald-600" />
                  {appointment ? formatAppointmentDate(appointment.date_rendez_vous || appointment.date) : ''} à{' '}
                  <strong className="text-emerald-950 font-bold">
                    {appointment ? formatAppointmentTime(appointment.heure_rendez_vous || appointment.heure) : ''}
                  </strong>
                </span>
                {appointment?.responsable && (
                  <span>• Responsable : <strong className="text-slate-800">{appointment.responsable}</strong></span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={() => {
                onEdit(appointment);
                onClose();
              }}
              disabled={isTermine || isAnnule}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-40"
              title="Modifier les informations"
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

        {/* Corps de la fiche */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
          {loading && !appointment ? (
            <div className="py-12 text-center text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
              Chargement des informations du rendez-vous...
            </div>
          ) : errorMsg ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              {errorMsg}
            </div>
          ) : appointment ? (
            <>
              {/* Bannière d'alerte / confirmation */}
              {temporalStatus === 'LATE' && !isTermine && !isAnnule && !isAbsent && (
                <div className="p-4 bg-rose-50 border border-rose-300 rounded-2xl flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-rose-900 flex-1">
                    <p className="font-extrabold text-rose-950">Ce rendez-vous est en retard !</p>
                    <p className="mt-0.5">
                      L'horaire prévu est dépassé. Vous pouvez relancer le client sur WhatsApp ou marquer le client comme absent pour reprogrammer.
                    </p>
                    <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => openWhatsAppWithTemplate('rendez_vous_manque')}
                        className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] shadow-xs inline-flex items-center gap-1.5"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Envoyer message de retard / reprogrammation
                      </button>
                      <button
                        onClick={handleMarkAbsent}
                        disabled={actionLoading}
                        className="px-3 py-1.5 rounded-lg bg-white border border-rose-300 hover:bg-rose-100 text-rose-800 font-bold text-[11px]"
                      >
                        Marquer client absent
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Bloc 1 : Client & Contact */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-4 h-4 text-emerald-600" />
                    Informations Client
                  </span>
                  {appointment.client_id && onOpenClientDetail && (
                    <button
                      type="button"
                      onClick={() => onOpenClientDetail(appointment.client_id)}
                      className="text-xs font-bold text-emerald-800 hover:underline inline-flex items-center gap-1"
                    >
                      Voir dossier client
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-1">
                  <div>
                    <span className="text-[11px] text-slate-500 block">Nom & Prénom</span>
                    <strong className="text-sm text-slate-900 font-bold">
                      {appointment.client_nom} {appointment.client_prenom || ''}
                    </strong>
                    {appointment.client_entreprise && (
                      <span className="text-xs text-slate-600 block">{appointment.client_entreprise}</span>
                    )}
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-500 block">Téléphone principal</span>
                    <strong className="text-xs text-slate-900 font-mono font-semibold">
                      {formatPhoneDisplay(appointment.client_telephone)}
                    </strong>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-500 block">WhatsApp Cloud & Consentement</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <strong className="text-xs text-slate-900 font-mono">
                        {formatPhoneDisplay(appointment.client_whatsapp || appointment.client_telephone)}
                      </strong>
                      {appointment.client_consentement ? (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-bold">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          Opt-in
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded text-[10px] font-bold">
                          Sans opt-in
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bloc 2 : Commande rattachée */}
              {appointment.order_id ? (
                <div className="bg-emerald-50/50 border border-emerald-200/80 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Package className="w-4 h-4 text-emerald-700" />
                      Commande Rattachée
                    </span>
                    {onOpenOrderDetail && (
                      <button
                        type="button"
                        onClick={() => onOpenOrderDetail(appointment.order_id)}
                        className="text-xs font-bold text-emerald-800 hover:underline inline-flex items-center gap-1"
                      >
                        Voir commande complète
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-1">
                    <div>
                      <span className="text-[11px] text-slate-500 block">N° Commande</span>
                      <strong className="text-sm font-mono text-slate-900 font-bold">
                        {appointment.order_numero || 'CMD-...'}
                      </strong>
                    </div>

                    <div className="sm:col-span-2">
                      <span className="text-[11px] text-slate-500 block">Titre / Prestation</span>
                      <strong className="text-xs text-slate-900 font-semibold block">
                        {appointment.order_titre || appointment.motif || '-'}
                      </strong>
                    </div>

                    <div>
                      <span className="text-[11px] text-slate-500 block">Solde à régler</span>
                      <strong
                        className={`text-sm font-mono font-extrabold ${
                          Number(appointment.order_solde_restant) > 0 ? 'text-amber-700' : 'text-emerald-700'
                        }`}
                      >
                        {formatCFA(Number(appointment.order_solde_restant) || 0)}
                      </strong>
                      {Number(appointment.order_solde_restant) === 0 && (
                        <span className="text-[10px] text-emerald-700 block font-semibold">Entièrement soldé</span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-xs text-slate-500 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-slate-400" />
                    <span>Aucune commande spécifique n'est rattachée à ce rendez-vous.</span>
                  </div>
                </div>
              )}

              {/* Bloc 3 : Détails logistiques du rendez-vous */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    Lieu & Modalités
                  </span>
                  <p className="text-sm font-medium text-slate-800">
                    {appointment.lieu || DEFAULT_APP_LOCATION}
                  </p>
                  {appointment.motif && (
                    <div className="pt-1">
                      <span className="text-[11px] text-slate-500 block">Motif / Contexte :</span>
                      <p className="text-xs text-slate-700 mt-0.5">{appointment.motif}</p>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Suivi des Notifications WhatsApp
                  </span>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between py-0.5 border-b border-slate-100">
                      <span className="text-slate-600">Confirmation immédiate :</span>
                      {appointment.confirmation_envoyee ? (
                        <span className="text-emerald-700 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Envoyée
                        </span>
                      ) : (
                        <span className="text-slate-400">Non envoyée</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between py-0.5 border-b border-slate-100">
                      <span className="text-slate-600">Rappel J-1 (la veille) :</span>
                      {appointment.rappel_j1_envoye ? (
                        <span className="text-emerald-700 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Envoyé
                        </span>
                      ) : (
                        <span className="text-slate-400">En attente</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between py-0.5">
                      <span className="text-slate-600">Rappel Jour J (le matin) :</span>
                      {appointment.rappel_jour_j_envoye ? (
                        <span className="text-emerald-700 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Envoyé
                        </span>
                      ) : (
                        <span className="text-slate-400">En attente</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bloc 4 : Retrait enregistré (si terminé avec retrait) */}
              {isTermine && appointment.retire_le && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-1.5 text-xs text-emerald-950">
                  <div className="flex items-center gap-2 font-bold text-emerald-900">
                    <PackageCheck className="w-4 h-4 text-emerald-700" />
                    Retrait effectué avec succès
                  </div>
                  <p>
                    Remis au client le{' '}
                    <strong>{new Date(appointment.retire_le).toLocaleDateString('fr-FR')}</strong> par{' '}
                    <strong>{appointment.retire_par || 'Agent Canaan Services'}</strong>.
                  </p>
                  {Number(appointment.solde_regle_au_retrait) > 0 && (
                    <p className="font-semibold text-emerald-800">
                      Règlement encaissé au retrait : {formatCFA(Number(appointment.solde_regle_au_retrait))}
                    </p>
                  )}
                </div>
              )}

              {/* Notes additionnelles */}
              {appointment.notes && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" /> Notes internes
                  </span>
                  <p className="text-xs text-slate-700 whitespace-pre-wrap">{appointment.notes}</p>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer avec boutons d'actions contextuels */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Action prioritaire : Enregistrer le retrait */}
            {isRetrait && !isTermine && !isAnnule && (
              <button
                type="button"
                onClick={() => setIsRetraitModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-700/20 transition-colors"
              >
                <PackageCheck className="w-4 h-4" />
                Enregistrer le retrait
              </button>
            )}

            {/* Clôturer un rendez-vous non-retrait */}
            {!isRetrait && !isTermine && !isAnnule && (
              <button
                type="button"
                onClick={handleCompleteSimple}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                Terminer le rendez-vous
              </button>
            )}

            {/* Confirmer si à confirmer */}
            {appointment?.statut === 'A_CONFIRMER' && (
              <button
                type="button"
                onClick={handleConfirm}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                Confirmer
              </button>
            )}

            {/* Envoyer WhatsApp */}
            <button
              type="button"
              onClick={() => openWhatsAppWithTemplate('confirmation_rendez_vous')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-50 text-xs font-bold transition-colors"
            >
              <Send className="w-3.5 h-3.5 text-emerald-600" />
              WhatsApp
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {!isTermine && !isAnnule && !isAbsent && (
              <button
                type="button"
                onClick={handleMarkAbsent}
                disabled={actionLoading}
                className="flex items-center gap-1 px-3 py-2 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold transition-colors"
                title="Client ne s'est pas présenté"
              >
                <UserX className="w-3.5 h-3.5" />
                Client absent
              </button>
            )}

            {!isTermine && !isAnnule && (
              <button
                type="button"
                onClick={handleCancel}
                disabled={actionLoading}
                className="flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-100 text-xs font-semibold transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Annuler
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>

      {/* Sous-modale Enregistrement du retrait */}
      {isRetraitModalOpen && (
        <AppointmentRetraitModal
          isOpen={isRetraitModalOpen}
          onClose={() => setIsRetraitModalOpen(false)}
          appointment={appointment}
          onRetraitCompleted={() => {
            setIsRetraitModalOpen(false);
            fetchAppointmentDetails();
            onRefreshList();
          }}
          onOpenWhatsAppRemerciement={() => {
            openWhatsAppWithTemplate('remerciement_retrait');
          }}
        />
      )}

      {/* Sous-modale Envoi WhatsApp */}
      {isWhatsAppModalOpen && (
        <AppointmentWhatsAppModal
          isOpen={isWhatsAppModalOpen}
          onClose={() => setIsWhatsAppModalOpen(false)}
          appointment={appointment}
          defaultTemplate={whatsAppDefaultTemplate}
          onSent={() => {
            fetchAppointmentDetails();
            onRefreshList();
          }}
        />
      )}
    </div>
  );
};
