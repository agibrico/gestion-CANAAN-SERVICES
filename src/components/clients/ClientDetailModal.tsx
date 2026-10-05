/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Building,
  Phone,
  MessageSquare,
  Mail,
  MapPin,
  Calendar,
  Package,
  CreditCard,
  Clock,
  Edit,
  Send,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  CheckCheck,
  History,
  FileText,
  ShieldCheck,
  Tag,
} from 'lucide-react';
import { formatPhoneDisplay } from '../../lib/phoneUtils';
import { ClientStatusBadge, ClientCategoryBadge, ClientConsentBadge } from './ClientBadge';
import { ClientWhatsAppModal } from './ClientWhatsAppModal';
import { OrderStatusBadge, OrderLateBadge } from '../orders/OrderBadge';
import { OrderFormModal } from '../orders/OrderFormModal';
import { OrderDetailModal } from '../orders/OrderDetailModal';
import { OrderPaymentModal } from '../orders/OrderPaymentModal';
import { OrderStatusModal } from '../orders/OrderStatusModal';
import { formatCFA } from '../../lib/orderUtils';
import {
  AppointmentStatusBadge,
  AppointmentTypeBadge,
  AppointmentTemporalBadge,
} from '../appointments/AppointmentBadge';
import { AppointmentFormModal } from '../appointments/AppointmentFormModal';
import { AppointmentDetailModal } from '../appointments/AppointmentDetailModal';
import { AppointmentRetraitModal } from '../appointments/AppointmentRetraitModal';
import { AppointmentWhatsAppModal } from '../appointments/AppointmentWhatsAppModal';
import {
  formatAppointmentDate,
  formatAppointmentTime,
  getAppointmentTemporalStatus,
} from '../../lib/appointmentUtils';

interface ClientDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string | null;
  onEditClient: (client: any) => void;
  onRefreshList: () => void;
}

export const ClientDetailModal: React.FC<ClientDetailModalProps> = ({
  isOpen,
  onClose,
  clientId,
  onEditClient,
  onRefreshList,
}) => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'whatsapp' | 'history' | 'orders' | 'appointments' | 'payments'
  >('overview');
  const [client, setClient] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [activities, setActivities] = useState<any[]>([]);
  const [whatsappMessages, setWhatsappMessages] = useState<any[]>([]);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);

  // Commandes & Paiements du client
  const [orders, setOrders] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [paymentsLoading, setPaymentsLoading] = useState(false);

  // Modales Commandes
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isOrderFormOpen, setIsOrderFormOpen] = useState(false);
  const [orderToEdit, setOrderToEdit] = useState<any | null>(null);
  const [paymentTargetOrder, setPaymentTargetOrder] = useState<any | null>(null);
  const [statusTargetOrder, setStatusTargetOrder] = useState<any | null>(null);

  // Rendez-vous du client
  const [clientAppointments, setClientAppointments] = useState<any[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [isAppointmentFormOpen, setIsAppointmentFormOpen] = useState(false);
  const [appointmentDetailId, setAppointmentDetailId] = useState<string | null>(null);
  const [retraitAppointment, setRetraitAppointment] = useState<any | null>(null);
  const [whatsAppAppointment, setWhatsAppAppointment] = useState<any | null>(null);

  const fetchClientDetails = async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/clients/${clientId}`);
      const data = await res.json();
      if (data.success && data.client) {
        setClient(data.client);
      }

      // Charger l'historique
      const actRes = await fetch(`/api/clients/${clientId}/activity`);
      const actData = await actRes.json();
      if (actData.success) {
        setActivities(actData.activities || []);
      }

      // Charger les messages WhatsApp
      const waRes = await fetch(`/api/clients/${clientId}/whatsapp-messages`);
      const waData = await waRes.json();
      if (waData.success) {
        setWhatsappMessages(waData.messages || []);
      }

      // Charger les commandes
      fetchClientOrders();

      // Charger les paiements
      fetchClientPayments();

      // Charger les rendez-vous
      fetchClientAppointments();
    } catch (err) {
      console.error('Erreur chargement fiche client :', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchClientAppointments = async () => {
    if (!clientId) return;
    setAppointmentsLoading(true);
    try {
      const res = await fetch(`/api/appointments?clientId=${clientId}&limit=50`);
      const data = await res.json();
      if (data.success) {
        setClientAppointments(data.appointments || []);
      }
    } catch (err) {
      console.error('Erreur chargement rendez-vous client :', err);
    } finally {
      setAppointmentsLoading(false);
    }
  };

  const fetchClientOrders = async () => {
    if (!clientId) return;
    setOrdersLoading(true);
    try {
      const res = await fetch(`/api/orders?clientId=${clientId}`);
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders || []);
      }
    } catch (err) {
      console.error('Erreur chargement commandes client :', err);
    } finally {
      setOrdersLoading(false);
    }
  };

  const fetchClientPayments = async () => {
    if (!clientId) return;
    setPaymentsLoading(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/payments`);
      const data = await res.json();
      if (data.success) {
        setPayments(data.payments || []);
      }
    } catch (err) {
      console.error('Erreur chargement paiements client :', err);
    } finally {
      setPaymentsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && clientId) {
      setActiveTab('overview');
      fetchClientDetails();
    }
  }, [isOpen, clientId]);

  if (!isOpen || !clientId) return null;

  const totalFacture = orders.length > 0 
    ? orders.reduce((sum, o) => sum + (Number(o.montant_total) || 0), 0)
    : (Number(client?.metrics?.totalFacture) || 0);
  const totalPaye = orders.length > 0
    ? orders.reduce((sum, o) => sum + (Number(o.acompte) || 0), 0)
    : (Number(client?.metrics?.totalPaye) || 0);
  const soldeRestant = orders.length > 0
    ? orders.reduce((sum, o) => sum + (Number(o.solde_restant) || 0), 0)
    : (Number(client?.metrics?.soldeRestant) || 0);
  const orderCount = orders.length > 0 ? orders.length : (client?.metrics?.nombreCommandes || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] my-auto">
        {/* Header Fiche Client */}
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-700 text-white flex items-center justify-center text-lg font-bold shadow-md shadow-emerald-700/20 shrink-0">
              {client?.nom ? client.nom.slice(0, 2).toUpperCase() : 'CL'}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-slate-900">
                  {client ? `${client.nom} ${client.prenom || ''}` : 'Chargement...'}
                </h2>
                {client?.statut_client && <ClientStatusBadge status={client.statut_client} />}
                {client?.categorie && <ClientCategoryBadge category={client.categorie} />}
              </div>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                {client?.entreprise && (
                  <span className="font-semibold text-slate-700 flex items-center gap-1">
                    <Building className="w-3.5 h-3.5 text-slate-400" />
                    {client.entreprise}
                  </span>
                )}
                <span>• Téléphone : <strong className="font-mono text-slate-800">{formatPhoneDisplay(client?.telephone)}</strong></span>
                <span>• WhatsApp : <strong className="font-mono text-emerald-800">{formatPhoneDisplay(client?.whatsapp)}</strong></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={() => setIsWhatsAppModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              WhatsApp
            </button>

            <button
              onClick={() => {
                onEditClient(client);
                onClose();
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors"
            >
              <Edit className="w-3.5 h-3.5" />
              Modifier
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Barre d'onglets de navigation */}
        <div className="px-6 border-b border-slate-200/80 bg-white flex items-center gap-6 overflow-x-auto text-xs font-semibold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-emerald-600 text-emerald-800 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            Vue d'ensemble
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
            WhatsApp ({whatsappMessages.length})
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'history'
                ? 'border-emerald-600 text-emerald-800 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Historique ({activities.length})
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'orders'
                ? 'border-emerald-600 text-emerald-800 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            Commandes ({orderCount})
          </button>

          <button
            onClick={() => setActiveTab('appointments')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'appointments'
                ? 'border-emerald-600 text-emerald-800 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Rendez-vous ({clientAppointments.length})
          </button>

          <button
            onClick={() => setActiveTab('payments')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'payments'
                ? 'border-emerald-600 text-emerald-800 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            Paiements ({payments.length})
          </button>
        </div>

        {/* Contenu des onglets */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* ONGLET 1 : VUE D'ENSEMBLE */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Cartes métriques */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Commandes
                  </span>
                  <p className="text-xl font-extrabold text-slate-900 mt-0.5">
                    {orderCount}
                  </p>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Total Facturé
                  </span>
                  <p className="text-xl font-extrabold text-slate-900 mt-0.5">
                    {formatCFA(totalFacture)}
                  </p>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">
                    Total Payé
                  </span>
                  <p className="text-xl font-extrabold text-emerald-700 mt-0.5">
                    {formatCFA(totalPaye)}
                  </p>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider">
                    Solde Dû
                  </span>
                  <p className="text-xl font-extrabold text-rose-700 mt-0.5">
                    {formatCFA(soldeRestant)}
                  </p>
                </div>
              </div>

              {/* Fiche d'informations détaillées */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Bloc Coordonnées & Localisation */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3 text-xs">
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-100">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                    Coordonnées & Emplacement
                  </h4>

                  <div className="space-y-2 text-slate-600">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Téléphone :</span>
                      <span className="font-mono font-bold text-slate-800">
                        {formatPhoneDisplay(client?.telephone)}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-400">WhatsApp :</span>
                      <span className="font-mono font-bold text-emerald-800">
                        {formatPhoneDisplay(client?.whatsapp)}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-400">Email :</span>
                      <span className="font-medium text-slate-800">
                        {client?.email || 'Non renseigné'}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-400">Ville :</span>
                      <span className="font-medium text-slate-800">{client?.ville || 'Abidjan'}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-400">Quartier :</span>
                      <span className="font-medium text-slate-800">
                        {client?.quartier || 'Non précisé'}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-400">Repère adresse :</span>
                      <span className="font-medium text-slate-800">
                        {client?.adresse || 'Non précisé'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bloc Statut & Consentement WhatsApp */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3 text-xs">
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-100">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Consentement & Statut CRM
                  </h4>

                  <div className="space-y-2 text-slate-600">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Consentement WhatsApp :</span>
                      <ClientConsentBadge
                        consent={Boolean(client?.consentement_whatsapp)}
                        source={client?.consentement_whatsapp_source}
                      />
                    </div>

                    {client?.consentement_whatsapp_date && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Date d'accord :</span>
                        <span className="font-medium text-slate-800">
                          {new Date(client.consentement_whatsapp_date).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between">
                      <span className="text-slate-400">Source consentement :</span>
                      <span className="font-medium text-slate-800">
                        {client?.consentement_whatsapp_source || 'FORMULAIRE'}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-400">Créé le :</span>
                      <span className="font-medium text-slate-800">
                        {client?.created_at
                          ? new Date(client.created_at).toLocaleDateString('fr-FR')
                          : 'Date inconnue'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Centres d'intérêt */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2 text-xs">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-emerald-600" />
                  Centres d'intérêt & Produits commandés
                </h4>
                {client?.centres_interet && client.centres_interet.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {client.centres_interet.map((ci: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200"
                      >
                        {ci}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 text-xs py-1">Aucun centre d'intérêt renseigné.</p>
                )}
              </div>

              {/* Notes */}
              {client?.notes && (
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1 text-xs">
                  <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                    Notes internes
                  </span>
                  <p className="text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                    {client.notes}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ONGLET 2 : WHATSAPP */}
          {activeTab === 'whatsapp' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Timeline des échanges WhatsApp
                </span>
                <button
                  onClick={() => setIsWhatsAppModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                >
                  <Send className="w-3.5 h-3.5" /> Envoyer un message
                </button>
              </div>

              {whatsappMessages.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="font-semibold text-slate-700">Aucun message échangé pour le moment</p>
                  <p className="mt-0.5">
                    Utilisez le bouton "Envoyer un message" pour adresser un modèle officiel Meta ou une réponse directe.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {whatsappMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/60 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-slate-700 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {new Date(msg.date_envoi).toLocaleString('fr-FR')}
                        </span>
                        <span className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded">
                          <CheckCheck className="w-3 h-3" />
                          {msg.statut}
                        </span>
                      </div>
                      <p className="text-slate-800 leading-relaxed whitespace-pre-line bg-white p-2.5 rounded-xl border border-slate-200/60">
                        {msg.contenu_texte}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ONGLET 3 : HISTORIQUE CRM */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider pb-2 border-b border-slate-100">
                Journal chronologique des événements
              </span>

              {activities.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  <History className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p>Aucune activité enregistrée sur cette fiche.</p>
                </div>
              ) : (
                <div className="relative pl-6 border-l-2 border-slate-200 space-y-4 my-2">
                  {activities.map((act) => (
                    <div key={act.id} className="relative group">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-600 absolute -left-[31px] top-1 border-2 border-white ring-2 ring-emerald-200" />
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span className="font-bold text-slate-900">{act.action}</span>
                        <span>{new Date(act.date_action).toLocaleString('fr-FR')}</span>
                      </div>
                      <p className="text-xs text-slate-700 mt-0.5">{act.details}</p>
                      <span className="text-[10px] text-slate-400">
                        Par : {act.utilisateur || 'Agent CRM'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ONGLET 4 : COMMANDES */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
                <div>
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                    Travaux & Commandes du client ({orders.length})
                  </span>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                    <span>Total facturé : <strong className="text-slate-800 font-mono">{formatCFA(totalFacture)}</strong></span>
                    <span>• Réglé : <strong className="text-emerald-700 font-mono">{formatCFA(totalPaye)}</strong></span>
                    <span>• Reste dû : <strong className={soldeRestant > 0 ? 'text-rose-700 font-mono' : 'text-slate-700 font-mono'}>{formatCFA(soldeRestant)}</strong></span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setOrderToEdit(null);
                    setIsOrderFormOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors self-start sm:self-center"
                >
                  <Plus className="w-3.5 h-3.5" /> Nouvelle commande
                </button>
              </div>

              {ordersLoading ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  Chargement des commandes...
                </div>
              ) : orders.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs space-y-3">
                  <Package className="w-8 h-8 mx-auto text-slate-300" />
                  <div>
                    <p className="font-semibold text-slate-700">Aucune commande enregistrée pour ce client</p>
                    <p className="max-w-sm mx-auto text-slate-400 mt-0.5">
                      Créez un travail d'impression, papeterie, enseigne ou personnalisation pour démarrer le suivi atelier.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setOrderToEdit(null);
                      setIsOrderFormOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                  >
                    <Plus className="w-3.5 h-3.5" /> Créer la première commande
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.map((o) => (
                    <div
                      key={o.id}
                      className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-emerald-300 transition-colors shadow-2xs space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-slate-900 text-xs bg-slate-100 px-2.5 py-1 rounded-lg">
                            {o.numero_commande}
                          </span>
                          <OrderStatusBadge status={o.statut} />
                          <OrderLateBadge datePrevue={o.date_prevue} status={o.statut} />
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setSelectedOrderId(o.id)}
                            className="px-2.5 py-1.5 text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors border border-slate-200"
                            title="Voir le dossier complet"
                          >
                            Détails
                          </button>

                          <button
                            onClick={() => setPaymentTargetOrder(o)}
                            className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                            title="Encaisser un paiement"
                          >
                            <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                          </button>

                          <button
                            onClick={() => setStatusTargetOrder(o)}
                            className="px-2 py-1 text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors border border-slate-200"
                            title="Faire avancer le statut"
                          >
                            Statut
                          </button>

                          <button
                            onClick={() => {
                              setOrderToEdit(o);
                              setIsOrderFormOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                            title="Modifier"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                        <div>
                          <h4 className="font-bold text-slate-900">{o.titre}</h4>
                          {o.description && <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{o.description}</p>}
                          <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                            <span>Commandé le : {new Date(o.date_commande).toLocaleDateString('fr-FR')}</span>
                            {o.date_prevue && <span>Prévu le : <strong className="text-slate-700">{new Date(o.date_prevue).toLocaleDateString('fr-FR')}</strong></span>}
                          </div>
                        </div>

                        <div className="text-right sm:self-center font-mono">
                          <span className="text-[11px] text-slate-400 block">Total : {formatCFA(o.montant_total)}</span>
                          <span className="text-[11px] text-emerald-700 block">Acompte : {formatCFA(o.acompte)}</span>
                          <span className={`text-xs font-extrabold block ${o.solde_restant > 0 ? 'text-rose-700' : 'text-slate-500'}`}>
                            Solde : {formatCFA(o.solde_restant)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ONGLET 5 : RENDEZ-VOUS */}
          {activeTab === 'appointments' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Rendez-vous Client ({clientAppointments.length})
                </span>
                <button
                  onClick={() => setIsAppointmentFormOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Nouveau rendez-vous
                </button>
              </div>

              {appointmentsLoading ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  Chargement des rendez-vous...
                </div>
              ) : clientAppointments.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs space-y-3">
                  <Calendar className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="font-semibold text-slate-700">Aucun rendez-vous planifié pour ce client</p>
                  <p className="max-w-sm mx-auto text-slate-400 text-[11px]">
                    Planifiez une remise d'épreuves, un retrait de commande prête ou un point de conception avec rappels automatiques WhatsApp.
                  </p>
                  <button
                    onClick={() => setIsAppointmentFormOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Programmer un rendez-vous
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {clientAppointments.map((apt) => {
                    const temporal = getAppointmentTemporalStatus({
                      date_rendez_vous: apt.date_rendez_vous || apt.date,
                      heure_rendez_vous: apt.heure_rendez_vous || apt.heure,
                      statut: apt.statut,
                    });
                    const isRetrait = apt.type_rendez_vous === 'RETRAIT_TRAVAIL';

                    return (
                      <div
                        key={apt.id}
                        className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-3 hover:border-slate-300 transition-all text-xs"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 font-mono">
                              {formatAppointmentTime(apt.heure_rendez_vous || apt.heure)}
                            </span>
                            <span className="text-slate-600">
                              {formatAppointmentDate(apt.date_rendez_vous || apt.date)}
                            </span>
                            <AppointmentTypeBadge type={apt.type_rendez_vous} />
                            <AppointmentStatusBadge status={apt.statut} />
                            <AppointmentTemporalBadge temporalStatus={temporal} />
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setAppointmentDetailId(apt.id)}
                              className="px-2.5 py-1 text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors border border-slate-200"
                            >
                              Détails
                            </button>

                            <button
                              onClick={() => setWhatsAppAppointment(apt)}
                              className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg text-xs font-semibold transition-colors"
                              title="Envoyer rappel WhatsApp"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>

                            {isRetrait && apt.statut !== 'TERMINE' && apt.statut !== 'ANNULE' && (
                              <button
                                onClick={() => setRetraitAppointment(apt)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs"
                              >
                                Retirer
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                          <div>
                            <span className="text-slate-500 text-[11px] block">Motif / Contexte :</span>
                            <strong className="text-slate-800">{apt.motif || apt.order_titre || '-'}</strong>
                            {apt.lieu && (
                              <span className="text-[11px] text-slate-500 block mt-0.5">
                                Lieu : {apt.lieu}
                              </span>
                            )}
                          </div>

                          {apt.order_id && (
                            <div className="text-right sm:self-center font-mono">
                              <span className="text-[11px] text-slate-500 block">
                                Commande : {apt.order_numero || 'CMD-...'}
                              </span>
                              <span className="text-xs font-bold text-amber-700 block">
                                Solde : {formatCFA(Number(apt.order_solde_restant) || 0)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ONGLET 6 : PAIEMENTS */}
          {activeTab === 'payments' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Historique des Règlements & Reçus ({payments.length})
                </span>
                <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200">
                  Total encaissé : {formatCFA(totalPaye)}
                </span>
              </div>

              {paymentsLoading ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  Chargement des règlements...
                </div>
              ) : payments.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs space-y-2">
                  <CreditCard className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="font-semibold text-slate-700">Aucun règlement enregistré pour le moment</p>
                  <p className="max-w-sm mx-auto text-slate-400">
                    Les acomptes et soldes perçus en Espèces, Wave, Orange Money, MTN ou Moov s'afficheront ici avec leurs reçus numériques.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {payments.map((p) => (
                    <div
                      key={p.id}
                      className="p-3.5 rounded-2xl border border-slate-200 bg-white shadow-2xs text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                            {p.numero_recu || 'REÇU'}
                          </span>
                          {p.numero_commande && (
                            <span className="font-mono text-emerald-800 font-semibold text-[11px]">
                              {p.numero_commande}
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold text-[10px] border border-emerald-200">
                            {p.mode_paiement}
                          </span>
                        </div>
                        <p className="text-slate-600 text-[11px]">
                          {p.notes || (p.order_titre ? `Paiement pour : ${p.order_titre}` : 'Règlement client')}
                        </p>
                        <div className="text-[10px] text-slate-400 flex items-center gap-2">
                          <span>Date : {new Date(p.date_paiement || p.created_at).toLocaleString('fr-FR')}</span>
                          {p.caissier && <span>• Caissier : {p.caissier}</span>}
                          {p.reference_transaction && <span>• Réf : {p.reference_transaction}</span>}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-mono font-extrabold text-sm text-emerald-700 block">
                          +{formatCFA(p.montant)}
                        </span>
                        <span className="text-[10px] text-emerald-600 font-semibold flex items-center justify-end gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Encaissé
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal Détail Commande */}
      <OrderDetailModal
        isOpen={Boolean(selectedOrderId)}
        orderId={selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
        onEditOrder={(ord) => {
          setSelectedOrderId(null);
          setOrderToEdit(ord);
          setIsOrderFormOpen(true);
        }}
        onOpenClientDetail={() => {}}
        onRefreshList={() => {
          fetchClientOrders();
          fetchClientPayments();
          fetchClientDetails();
          onRefreshList();
        }}
      />

      {/* Modal Formulaire Commande (Création / Edition) */}
      <OrderFormModal
        isOpen={isOrderFormOpen}
        onClose={() => {
          setIsOrderFormOpen(false);
          setOrderToEdit(null);
        }}
        orderToEdit={orderToEdit}
        defaultClientId={clientId}
        onSaved={() => {
          setIsOrderFormOpen(false);
          setOrderToEdit(null);
          fetchClientOrders();
          fetchClientPayments();
          fetchClientDetails();
          onRefreshList();
        }}
      />

      {/* Modal Paiement Commande */}
      <OrderPaymentModal
        isOpen={Boolean(paymentTargetOrder)}
        order={paymentTargetOrder}
        onClose={() => setPaymentTargetOrder(null)}
        onPaymentAdded={() => {
          setPaymentTargetOrder(null);
          fetchClientOrders();
          fetchClientPayments();
          fetchClientDetails();
          onRefreshList();
        }}
      />

      {/* Modal Statut Commande */}
      <OrderStatusModal
        isOpen={Boolean(statusTargetOrder)}
        order={statusTargetOrder}
        onClose={() => setStatusTargetOrder(null)}
        onStatusChanged={() => {
          setStatusTargetOrder(null);
          fetchClientOrders();
          fetchClientDetails();
          onRefreshList();
        }}
      />

      {/* Modal d'envoi WhatsApp dédié */}
      <ClientWhatsAppModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        client={client}
        onSent={() => {
          fetchClientDetails();
          onRefreshList();
        }}
      />

      {/* Modale Nouveau RDV Client */}
      {isAppointmentFormOpen && (
        <AppointmentFormModal
          isOpen={isAppointmentFormOpen}
          onClose={() => setIsAppointmentFormOpen(false)}
          defaultClientId={clientId}
          onSaved={() => {
            setIsAppointmentFormOpen(false);
            fetchClientAppointments();
            fetchClientDetails();
            onRefreshList();
          }}
        />
      )}

      {/* Modale Détails RDV Client */}
      {appointmentDetailId && (
        <AppointmentDetailModal
          isOpen={Boolean(appointmentDetailId)}
          onClose={() => setAppointmentDetailId(null)}
          appointmentId={appointmentDetailId}
          onEdit={() => {
            setAppointmentDetailId(null);
            setIsAppointmentFormOpen(true);
          }}
          onRefreshList={() => {
            fetchClientAppointments();
            fetchClientDetails();
            onRefreshList();
          }}
        />
      )}

      {/* Modale Retrait */}
      {retraitAppointment && (
        <AppointmentRetraitModal
          isOpen={Boolean(retraitAppointment)}
          onClose={() => setRetraitAppointment(null)}
          appointment={retraitAppointment}
          onRetraitCompleted={() => {
            setRetraitAppointment(null);
            fetchClientAppointments();
            fetchClientOrders();
            fetchClientPayments();
            fetchClientDetails();
            onRefreshList();
          }}
        />
      )}

      {/* Modale WhatsApp RDV */}
      {whatsAppAppointment && (
        <AppointmentWhatsAppModal
          isOpen={Boolean(whatsAppAppointment)}
          onClose={() => setWhatsAppAppointment(null)}
          appointment={whatsAppAppointment}
          onSent={() => {
            setWhatsAppAppointment(null);
            fetchClientAppointments();
            fetchClientDetails();
            onRefreshList();
          }}
        />
      )}
    </div>
  );
};
