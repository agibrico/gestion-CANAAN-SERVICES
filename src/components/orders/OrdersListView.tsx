/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Clock,
  AlertTriangle,
  CheckCircle2,
  CheckCheck,
  Send,
  Eye,
  Edit2,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  type OrderStatus,
  ORDER_STATUS_MAP,
  ORDER_WORKFLOW_STEPS,
  formatCFA,
} from '../../lib/orderUtils';
import { formatPhoneDisplay } from '../../lib/phoneUtils';
import { OrderStatusBadge, OrderLateBadge, OrderPriorityBadge } from './OrderBadge';
import { OrderFormModal } from './OrderFormModal';
import { OrderDetailModal } from './OrderDetailModal';
import { OrderPaymentModal } from './OrderPaymentModal';
import { OrderStatusModal } from './OrderStatusModal';
import { ClientWhatsAppModal } from '../clients/ClientWhatsAppModal';
import { AppointmentFormModal } from '../appointments/AppointmentFormModal';

interface OrdersListViewProps {
  onOpenClientDetail?: (clientId: string) => void;
}

export const OrdersListView: React.FC<OrdersListViewProps> = ({ onOpenClientDetail }) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [stats, setStats] = useState({
    commandesAujourdhui: 0,
    enCours: 0,
    enRetard: 0,
    pretes: 0,
    aRetirer: 0,
    terminees: 0,
    totalFacture: 0,
    totalEncaisse: 0,
    totalSoldeDu: 0,
  });
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  });

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [responsableFilter, setResponsableFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [orderToEdit, setOrderToEdit] = useState<any | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Quick Action Sub-modals
  const [paymentTargetOrder, setPaymentTargetOrder] = useState<any | null>(null);
  const [statusTargetOrder, setStatusTargetOrder] = useState<any | null>(null);
  const [whatsAppTargetClient, setWhatsAppTargetClient] = useState<any | null>(null);
  const [appointmentTargetOrder, setAppointmentTargetOrder] = useState<any | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page: String(pagination.page),
        limit: String(pagination.limit),
        search: search.trim(),
        status: statusFilter,
        priority: priorityFilter,
        responsable: responsableFilter,
      });

      const res = await fetch(`/api/orders?${query.toString()}`);
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders || []);
        if (data.pagination) setPagination(data.pagination);
        if (data.stats) setStats(data.stats);
      }
    } catch (err) {
      console.error('Erreur chargement commandes :', err);
      showToast('Erreur de chargement des commandes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [pagination.page, pagination.limit, statusFilter, priorityFilter, responsableFilter]);

  // Recherche avec debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setPagination((p) => ({ ...p, page: 1 }));
      fetchOrders();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl bg-emerald-700 text-white font-semibold text-xs shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* En-tête Commandes */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600/10 text-emerald-700 flex items-center justify-center font-extrabold text-lg">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              COMMANDES & TRAVAUX D'IMPRESSION
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Suivi d'atelier, avancement des travaux, acomptes et notifications clients
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setOrderToEdit(null);
            setIsFormModalOpen(true);
          }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all self-start md:self-center"
        >
          <Plus className="w-4 h-4" />
          <span>+ Nouvelle commande</span>
        </button>
      </div>

      {/* Cartes statistiques Commandes & Délais */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Aujourd'hui
          </span>
          <p className="text-xl font-extrabold text-slate-900 mt-0.5">
            {stats.commandesAujourdhui}
          </p>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider">
            En cours
          </span>
          <p className="text-xl font-extrabold text-blue-700 mt-0.5">{stats.enCours}</p>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider">
            En retard
          </span>
          <p className="text-xl font-extrabold text-rose-700 mt-0.5">{stats.enRetard}</p>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">
            Prêtes
          </span>
          <p className="text-xl font-extrabold text-emerald-700 mt-0.5">{stats.pretes}</p>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-semibold text-cyan-700 uppercase tracking-wider">
            À retirer
          </span>
          <p className="text-xl font-extrabold text-cyan-700 mt-0.5">{stats.aRetirer}</p>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Terminées
          </span>
          <p className="text-xl font-extrabold text-slate-800 mt-0.5">{stats.terminees}</p>
        </div>
      </div>

      {/* Barre de recherche et filtres */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par n° commande, client, téléphone, prestation..."
            className="w-full text-xs pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs">
          {/* Filtre Statut */}
          <div className="flex items-center gap-1 text-slate-600">
            <span className="text-slate-400">Statut :</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium"
            >
              <option value="ALL">Tous les statuts</option>
              <option value="LATE">⚠️ Uniquement En Retard</option>
              {ORDER_WORKFLOW_STEPS.map((s) => (
                <option key={s} value={s}>
                  {ORDER_STATUS_MAP[s].label}
                </option>
              ))}
              <option value="ANNULEE">Commande annulée</option>
            </select>
          </div>

          {/* Filtre Priorité */}
          <div className="flex items-center gap-1 text-slate-600">
            <span className="text-slate-400">Priorité :</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium"
            >
              <option value="ALL">Toutes</option>
              <option value="NORMALE">Normale</option>
              <option value="URGENTE">Urgente</option>
              <option value="TRES_URGENTE">Très Urgente</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tableau / Cartes des Commandes */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400 text-sm">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
            Chargement des commandes en base...
          </div>
        ) : orders.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-sm">
            <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">Aucune commande trouvée</p>
            <p className="text-xs text-slate-400 mt-1">
              Cliquez sur "+ Nouvelle commande" pour enregistrer votre premier travail d'impression.
            </p>
          </div>
        ) : (
          <>
            {/* Version Desktop : Tableau complet */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3.5 px-4">N° Commande</th>
                    <th className="py-3.5 px-4">Client</th>
                    <th className="py-3.5 px-4">Intitulé du travail</th>
                    <th className="py-3.5 px-4">Montant Total</th>
                    <th className="py-3.5 px-4">Acompte</th>
                    <th className="py-3.5 px-4">Solde Dû</th>
                    <th className="py-3.5 px-4">Date Prévue</th>
                    <th className="py-3.5 px-4">Statut Atelier</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-normal">
                  {orders.map((o) => (
                    <tr
                      key={o.id}
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                      onClick={() => setSelectedOrderId(o.id)}
                    >
                      {/* Numéro */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="text-emerald-800">{o.numero_commande}</span>
                          <OrderLateBadge datePrevue={o.date_prevue} status={o.statut} />
                        </div>
                      </td>

                      {/* Client */}
                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => {
                            if (onOpenClientDetail) onOpenClientDetail(o.client_id);
                          }}
                          className="font-bold text-slate-900 hover:text-emerald-700 hover:underline block text-left"
                        >
                          {o.client_nom} {o.client_prenom || ''}
                        </button>
                        {o.client_entreprise && (
                          <span className="text-[11px] text-slate-500 block truncate max-w-[140px]">
                            {o.client_entreprise}
                          </span>
                        )}
                      </td>

                      {/* Intitulé & Prestations */}
                      <td className="py-3 px-4 max-w-[220px]">
                        <span className="font-semibold text-slate-800 block truncate">
                          {o.titre}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {o.items_count || 1} prestation(s)
                        </span>
                      </td>

                      {/* Montant Total */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {formatCFA(o.montant_total)}
                      </td>

                      {/* Acompte */}
                      <td className="py-3 px-4 font-mono font-semibold text-emerald-700 whitespace-nowrap">
                        {formatCFA(o.acompte)}
                      </td>

                      {/* Solde restant */}
                      <td className="py-3 px-4 font-mono font-extrabold whitespace-nowrap">
                        <span className={o.solde_restant > 0 ? 'text-rose-700' : 'text-slate-400'}>
                          {formatCFA(o.solde_restant)}
                        </span>
                      </td>

                      {/* Date prévue */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="text-slate-700 font-medium">
                          {o.date_prevue ? new Date(o.date_prevue).toLocaleDateString('fr-FR') : '-'}
                        </span>
                      </td>

                      {/* Statut */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <OrderStatusBadge status={o.statut} />
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {o.statut === 'PRETE' && (
                            <button
                              onClick={() => setAppointmentTargetOrder(o)}
                              className="p-1.5 text-cyan-700 hover:bg-cyan-50 rounded-lg transition-colors"
                              title="Programmer le rendez-vous de retrait client"
                            >
                              <Calendar className="w-4 h-4 text-cyan-600" />
                            </button>
                          )}

                          <button
                            onClick={() => setSelectedOrderId(o.id)}
                            className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Voir la fiche détaillée"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setStatusTargetOrder(o)}
                            className="p-1.5 text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Changer le statut du travail"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setPaymentTargetOrder(o)}
                            className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Encaisser un règlement"
                          >
                            <CreditCard className="w-4 h-4 text-emerald-600" />
                          </button>

                          <button
                            onClick={() => {
                              setWhatsAppTargetClient({
                                id: o.client_id,
                                nom: o.client_nom,
                                prenom: o.client_prenom,
                                telephone: o.client_telephone,
                                whatsapp: o.client_whatsapp,
                                consentement_whatsapp: o.client_consentement,
                              });
                            }}
                            className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Envoyer un message WhatsApp au client"
                          >
                            <Send className="w-4 h-4 text-emerald-600" />
                          </button>

                          <button
                            onClick={() => {
                              setOrderToEdit(o);
                              setIsFormModalOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Modifier"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Version Mobile : Cartes adaptées */}
            <div className="block lg:hidden divide-y divide-slate-100">
              {orders.map((o) => (
                <div
                  key={o.id}
                  onClick={() => setSelectedOrderId(o.id)}
                  className="p-4 space-y-2 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-slate-900 text-xs">
                        {o.numero_commande}
                      </span>
                      <OrderLateBadge datePrevue={o.date_prevue} status={o.statut} />
                    </div>
                    <OrderStatusBadge status={o.statut} />
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 text-xs">{o.titre}</h3>
                    <p className="text-[11px] text-slate-500">
                      Client : <strong>{o.client_nom} {o.client_prenom || ''}</strong>
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 font-mono">
                    <div>
                      <span className="text-slate-400 text-[10px] block">TOTAL</span>
                      <span className="font-bold text-slate-900">{formatCFA(o.montant_total)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">RESTE À PAYER</span>
                      <span className="font-extrabold text-rose-700">{formatCFA(o.solde_restant)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs" onClick={(e) => e.stopPropagation()}>
                    <span className="text-[11px] text-slate-400">
                      Prévu : {o.date_prevue ? new Date(o.date_prevue).toLocaleDateString('fr-FR') : '-'}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setStatusTargetOrder(o)}
                        className="px-2.5 py-1 bg-slate-100 text-slate-700 font-semibold rounded-lg"
                      >
                        Statut
                      </button>
                      <button
                        onClick={() => setPaymentTargetOrder(o)}
                        className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-semibold rounded-lg"
                      >
                        Payer
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <span>Afficher :</span>
                <select
                  value={pagination.limit}
                  onChange={(e) =>
                    setPagination((prev) => ({ ...prev, limit: Number(e.target.value), page: 1 }))
                  }
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs"
                >
                  <option value={20}>20 par page</option>
                  <option value={50}>50 par page</option>
                  <option value={100}>100 par page</option>
                </select>
                <span>
                  Total : <strong>{pagination.total}</strong> commande(s)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span>
                  Page <strong>{pagination.page}</strong> sur{' '}
                  <strong>{pagination.totalPages || 1}</strong>
                </span>
                <div className="flex items-center gap-1">
                  <button
                    disabled={pagination.page <= 1}
                    onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                    className="p-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-white disabled:opacity-30"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                    className="p-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-white disabled:opacity-30"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal Création / Modification Commande */}
      <OrderFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setOrderToEdit(null);
        }}
        onSaved={fetchOrders}
        orderToEdit={orderToEdit}
      />

      {/* Modal Fiche Détaillée Commande */}
      <OrderDetailModal
        isOpen={Boolean(selectedOrderId)}
        orderId={selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
        onEditOrder={(o) => {
          setOrderToEdit(o);
          setIsFormModalOpen(true);
        }}
        onOpenClientDetail={(cId) => {
          setSelectedOrderId(null);
          if (onOpenClientDetail) onOpenClientDetail(cId);
        }}
        onRefreshList={fetchOrders}
      />

      {/* Modal Règlement */}
      <OrderPaymentModal
        isOpen={Boolean(paymentTargetOrder)}
        order={paymentTargetOrder}
        onClose={() => setPaymentTargetOrder(null)}
        onPaymentAdded={fetchOrders}
      />

      {/* Modal Changement Statut */}
      <OrderStatusModal
        isOpen={Boolean(statusTargetOrder)}
        order={statusTargetOrder}
        onClose={() => setStatusTargetOrder(null)}
        onStatusChanged={fetchOrders}
      />

      {/* Modal Envoi WhatsApp Direct */}
      <ClientWhatsAppModal
        isOpen={Boolean(whatsAppTargetClient)}
        client={whatsAppTargetClient}
        onClose={() => setWhatsAppTargetClient(null)}
        onSent={fetchOrders}
      />

      {/* Modal Prise de RDV / Retrait */}
      {appointmentTargetOrder && (
        <AppointmentFormModal
          isOpen={Boolean(appointmentTargetOrder)}
          onClose={() => setAppointmentTargetOrder(null)}
          defaultClientId={appointmentTargetOrder?.client_id}
          defaultOrderId={appointmentTargetOrder?.id}
          defaultType="RETRAIT_TRAVAIL"
          onSaved={() => {
            setAppointmentTargetOrder(null);
            fetchOrders();
          }}
        />
      )}
    </div>
  );
};
