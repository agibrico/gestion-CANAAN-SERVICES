/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  Download,
  Upload,
  RefreshCw,
  Eye,
  Edit2,
  Send,
  Archive,
  Phone,
  Building,
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronRight,
  Filter,
  Layers,
  MessageSquare,
  Package,
} from 'lucide-react';
import { formatPhoneDisplay } from '../../lib/phoneUtils';
import { ClientStatusBadge, ClientCategoryBadge, ClientConsentBadge } from './ClientBadge';
import { ClientFormModal } from './ClientFormModal';
import { ClientDetailModal } from './ClientDetailModal';
import { ClientWhatsAppModal } from './ClientWhatsAppModal';
import { ClientImportExportModal } from './ClientImportExportModal';
import { OrderFormModal } from '../orders/OrderFormModal';

export interface ClientsListViewProps {
  initialSelectedClientId?: string | null;
  onClearInitialSelectedClientId?: () => void;
  onNavigateToOrders?: (clientId?: string) => void;
}

export const ClientsListView: React.FC<ClientsListViewProps> = ({
  initialSelectedClientId,
  onClearInitialSelectedClientId,
  onNavigateToOrders,
}) => {
  const [clients, setClients] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalClients: 0,
    clientsActifs: 0,
    nouveauxClients: 0,
    clientsVIP: 0,
    consentementActif: 0,
  });
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  });

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [consentFilter, setConsentFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<any | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(initialSelectedClientId || null);
  const [whatsAppTargetClient, setWhatsAppTargetClient] = useState<any | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Modal création commande rapide
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [orderClient, setOrderClient] = useState<any | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (initialSelectedClientId) {
      setSelectedClientId(initialSelectedClientId);
    }
  }, [initialSelectedClientId]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Chargement des clients
  const fetchClients = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page: String(pagination.page),
        limit: String(pagination.limit),
        search: search.trim(),
        status: statusFilter,
        category: categoryFilter,
        consent: consentFilter,
      });

      const res = await fetch(`/api/clients?${query.toString()}`);
      const data = await res.json();
      if (data.success) {
        setClients(data.clients || []);
        if (data.pagination) setPagination(data.pagination);
        if (data.stats) setStats(data.stats);
      }
    } catch (err) {
      console.error('Erreur chargement clients :', err);
      showToast('Erreur de chargement des clients.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [pagination.page, pagination.limit, statusFilter, categoryFilter, consentFilter]);

  // Recherche avec debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setPagination((p) => ({ ...p, page: 1 }));
      fetchClients();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Archivage logique d'un client
  const handleArchive = async (client: any) => {
    if (!window.confirm(`Confirmez-vous l'archivage du client « ${client.nom} ${client.prenom || ''} » ?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/clients/${client.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('Client archivé avec succès.');
        fetchClients();
      }
    } catch {
      showToast("Échec de l'archivage.");
    }
  };

  // Exportation CSV
  const handleExportCSV = () => {
    if (clients.length === 0) {
      showToast('Aucun client à exporter.');
      return;
    }

    const headers = [
      'Nom',
      'Prénom',
      'Entreprise',
      'Téléphone',
      'WhatsApp',
      'Email',
      'Ville',
      'Quartier',
      'Catégorie',
      'Statut',
      'Consentement WhatsApp',
      'Date Création',
    ];

    const rows = clients.map((c) => [
      `"${c.nom || ''}"`,
      `"${c.prenom || ''}"`,
      `"${c.entreprise || ''}"`,
      `"${c.telephone || ''}"`,
      `"${c.whatsapp || ''}"`,
      `"${c.email || ''}"`,
      `"${c.ville || ''}"`,
      `"${c.quartier || ''}"`,
      `"${c.categorie || ''}"`,
      `"${c.statut_client || ''}"`,
      c.consentement_whatsapp ? 'OUI' : 'NON',
      `"${c.created_at ? new Date(c.created_at).toLocaleDateString('fr-FR') : ''}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `canaan_clients_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Fichier CSV exporté avec succès.');
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl bg-emerald-700 text-white font-semibold text-xs shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* En-tête du module Clients */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600/10 text-emerald-700 flex items-center justify-center font-extrabold text-lg">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">CLIENTS</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Gestion de la relation client, consentements WhatsApp et suivi commercial
            </p>
          </div>
        </div>

        {/* Boutons d'action principaux */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors"
            title="Exporter les clients filtrés au format CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Exporter CSV</span>
          </button>

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors"
            title="Importer une liste de clients via fichier CSV"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            <span>Importer CSV</span>
          </button>

          <button
            onClick={() => {
              setClientToEdit(null);
              setIsFormModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nouveau client</span>
          </button>
        </div>
      </div>

      {/* Cartes statistiques CRM */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Total clients
          </span>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">{stats.totalClients}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">
            Clients actifs
          </span>
          <p className="text-2xl font-extrabold text-emerald-700 mt-1">{stats.clientsActifs}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-semibold text-teal-700 uppercase tracking-wider">
            Nouveaux clients
          </span>
          <p className="text-2xl font-extrabold text-teal-700 mt-1">{stats.nouveauxClients}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">
            VIP
          </span>
          <p className="text-2xl font-extrabold text-amber-700 mt-1">{stats.clientsVIP}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs col-span-2 sm:col-span-1">
          <span className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider">
            Consentement actif
          </span>
          <p className="text-2xl font-extrabold text-blue-700 mt-1">{stats.consentementActif}</p>
        </div>
      </div>

      {/* Barre de filtres et recherche */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom, prénom, entreprise, téléphone..."
            className="w-full text-xs pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
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
              <option value="PROSPECT">Prospect</option>
              <option value="NOUVEAU">Nouveau</option>
              <option value="ACTIF">Actif</option>
              <option value="REGULIER">Régulier</option>
              <option value="VIP">VIP</option>
              <option value="INACTIF">Inactif</option>
              <option value="ARCHIVE">Archivé</option>
            </select>
          </div>

          {/* Filtre Catégorie */}
          <div className="flex items-center gap-1 text-slate-600">
            <span className="text-slate-400">Catégorie :</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium"
            >
              <option value="ALL">Toutes catégories</option>
              <option value="Particulier">Particulier</option>
              <option value="Entreprise">Entreprise</option>
              <option value="École">École</option>
              <option value="Église">Église</option>
              <option value="Association">Association</option>
              <option value="ONG">ONG</option>
              <option value="Administration">Administration</option>
              <option value="Commerce">Commerce</option>
              <option value="Autre">Autre</option>
            </select>
          </div>

          {/* Filtre Consentement */}
          <div className="flex items-center gap-1 text-slate-600">
            <span className="text-slate-400">Consentement :</span>
            <select
              value={consentFilter}
              onChange={(e) => setConsentFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium"
            >
              <option value="ALL">Tous</option>
              <option value="true">WhatsApp accordé</option>
              <option value="false">Non accordé</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tableau / Cartes des Clients */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400 text-sm">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
            Chargement des clients PostgreSQL...
          </div>
        ) : clients.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-sm">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">Aucun client trouvé</p>
            <p className="text-xs text-slate-400 mt-1">
              Modifiez vos critères de recherche ou cliquez sur "+ Nouveau client" pour enregistrer un premier contact.
            </p>
          </div>
        ) : (
          <>
            {/* Version Desktop : Tableau complet */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3.5 px-4">Client</th>
                    <th className="py-3.5 px-4">Entreprise</th>
                    <th className="py-3.5 px-4">Téléphone</th>
                    <th className="py-3.5 px-4">WhatsApp</th>
                    <th className="py-3.5 px-4">Catégorie</th>
                    <th className="py-3.5 px-4">Statut</th>
                    <th className="py-3.5 px-4">Consentement</th>
                    <th className="py-3.5 px-4">Commandes</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-normal">
                  {clients.map((c) => (
                    <tr
                      key={c.id}
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                      onClick={() => setSelectedClientId(c.id)}
                    >
                      {/* Nom / Prénom */}
                      <td className="py-3 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[11px] shrink-0">
                            {c.nom.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="hover:underline">{c.nom} {c.prenom || ''}</span>
                            {c.email && (
                              <span className="block text-[10px] text-slate-400 font-normal truncate max-w-[150px]">
                                {c.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Entreprise */}
                      <td className="py-3 px-4 text-slate-700">
                        {c.entreprise ? (
                          <span className="font-medium">{c.entreprise}</span>
                        ) : (
                          <span className="text-slate-400 italic">Particulier</span>
                        )}
                      </td>

                      {/* Téléphone */}
                      <td className="py-3 px-4 font-mono text-slate-800">
                        {formatPhoneDisplay(c.telephone)}
                      </td>

                      {/* WhatsApp */}
                      <td className="py-3 px-4 font-mono text-emerald-800 font-medium">
                        {formatPhoneDisplay(c.whatsapp || c.telephone)}
                      </td>

                      {/* Catégorie */}
                      <td className="py-3 px-4">
                        <ClientCategoryBadge category={c.categorie || 'Particulier'} />
                      </td>

                      {/* Statut */}
                      <td className="py-3 px-4">
                        <ClientStatusBadge status={c.statut_client || 'NOUVEAU'} />
                      </td>

                      {/* Consentement */}
                      <td className="py-3 px-4">
                        <ClientConsentBadge
                          consent={Boolean(c.consentement_whatsapp)}
                          source={c.consentement_whatsapp_source}
                        />
                      </td>

                      {/* Commandes count */}
                      <td className="py-3 px-4 text-slate-600">
                        <button
                          type="button"
                          onClick={() => {
                            if (onNavigateToOrders) {
                              onNavigateToOrders(c.id);
                            } else {
                              setSelectedClientId(c.id);
                            }
                          }}
                          className="font-semibold text-slate-800 hover:text-emerald-700 hover:underline flex items-center gap-1"
                          title="Voir les commandes de ce client"
                        >
                          <span>{c.total_commandes || 0}</span>
                          <span className="text-[11px] text-slate-400">cmd</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setOrderClient(c);
                              setIsOrderModalOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Créer une commande pour ce client"
                          >
                            <Package className="w-4 h-4 text-emerald-600" />
                          </button>

                          <button
                            onClick={() => setSelectedClientId(c.id)}
                            className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Consulter la fiche client"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => {
                              setClientToEdit(c);
                              setIsFormModalOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Modifier les coordonnées"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setWhatsAppTargetClient(c)}
                            className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Envoyer un message WhatsApp"
                          >
                            <Send className="w-4 h-4 text-emerald-600" />
                          </button>

                          <button
                            onClick={() => handleArchive(c)}
                            className="p-1.5 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Archiver ce client"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Version Mobile / Tablette : Cartes adaptées */}
            <div className="block lg:hidden divide-y divide-slate-100">
              {clients.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setSelectedClientId(c.id)}
                  className="p-4 space-y-2 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-sm text-slate-900">
                      {c.nom} {c.prenom || ''}
                    </div>
                    <ClientStatusBadge status={c.statut_client} />
                  </div>

                  {c.entreprise && (
                    <p className="text-xs text-slate-600 font-medium flex items-center gap-1">
                      <Building className="w-3.5 h-3.5 text-slate-400" />
                      {c.entreprise}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
                    <span>{formatPhoneDisplay(c.telephone)}</span>
                    <ClientConsentBadge consent={Boolean(c.consentement_whatsapp)} />
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <span className="text-slate-400">
                      {c.total_commandes || 0} commande(s)
                    </span>

                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setWhatsAppTargetClient(c)}
                        className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-semibold rounded-lg flex items-center gap-1"
                      >
                        <Send className="w-3 h-3" /> WhatsApp
                      </button>
                      <button
                        onClick={() => setSelectedClientId(c.id)}
                        className="px-2.5 py-1 bg-slate-100 text-slate-700 font-semibold rounded-lg"
                      >
                        Fiche
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
                  Total : <strong>{pagination.total}</strong> client(s)
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

      {/* Modal Nouveau / Modifier Client */}
      <ClientFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setClientToEdit(null);
        }}
        onSaved={fetchClients}
        onViewExisting={(client) => setSelectedClientId(client.id)}
        clientToEdit={clientToEdit}
      />

      {/* Modal Fiche Client Détaillée */}
      <ClientDetailModal
        isOpen={Boolean(selectedClientId)}
        clientId={selectedClientId}
        onClose={() => {
          setSelectedClientId(null);
          if (onClearInitialSelectedClientId) onClearInitialSelectedClientId();
        }}
        onEditClient={(c) => {
          setClientToEdit(c);
          setIsFormModalOpen(true);
        }}
        onRefreshList={fetchClients}
      />

      {/* Modal Envoi WhatsApp Direct */}
      <ClientWhatsAppModal
        isOpen={Boolean(whatsAppTargetClient)}
        client={whatsAppTargetClient}
        onClose={() => setWhatsAppTargetClient(null)}
        onSent={fetchClients}
      />

      {/* Modal Import / Export CSV */}
      <ClientImportExportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportComplete={fetchClients}
        currentClients={clients}
      />

      {/* Modal Création Commande Rapide */}
      <OrderFormModal
        isOpen={isOrderModalOpen}
        onClose={() => {
          setIsOrderModalOpen(false);
          setOrderClient(null);
        }}
        defaultClientId={orderClient?.id}
        onSaved={() => {
          setIsOrderModalOpen(false);
          setOrderClient(null);
          fetchClients();
          showToast('Commande créée avec succès pour ce client !');
        }}
      />
    </div>
  );
};
