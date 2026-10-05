/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  User,
  Package,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Send,
  Plus,
  Search,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react';
import {
  type AppointmentType,
  APPOINTMENT_TYPES_MAP,
  APPOINTMENT_TYPE_KEYS,
  DEFAULT_APP_LOCATION,
  getTodayStringCI,
  getTomorrowStringCI,
} from '../../lib/appointmentUtils';
import { formatPhoneDisplay } from '../../lib/phoneUtils';
import { formatCFA } from '../../lib/orderUtils';
import { ClientFormModal } from '../clients/ClientFormModal';

interface AppointmentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  appointmentToEdit?: any | null;
  defaultClientId?: string | null;
  defaultOrderId?: string | null;
  defaultType?: AppointmentType;
}

export const AppointmentFormModal: React.FC<AppointmentFormModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  appointmentToEdit,
  defaultClientId,
  defaultOrderId,
  defaultType,
}) => {
  const isEdit = Boolean(appointmentToEdit);

  // Client
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isQuickClientOpen, setIsQuickClientOpen] = useState(false);

  // Commandes du client
  const [clientOrders, setClientOrders] = useState<any[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');

  // Détails RDV
  const [typeRendezVous, setTypeRendezVous] = useState<AppointmentType>(
    defaultType || 'RETRAIT_TRAVAIL'
  );
  const [dateRendezVous, setDateRendezVous] = useState('');
  const [heureRendezVous, setHeureRendezVous] = useState('10:00');
  const [lieu, setLieu] = useState(DEFAULT_APP_LOCATION);
  const [motif, setMotif] = useState('');
  const [responsable, setResponsable] = useState('');
  const [notes, setNotes] = useState('');
  const [sendWhatsApp, setSendWhatsApp] = useState(true);

  // Détection de conflit
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialisation à l'ouverture
  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg(null);
    setConflictWarning(null);

    if (appointmentToEdit) {
      setSelectedClient({
        id: appointmentToEdit.client_id,
        nom: appointmentToEdit.client_nom,
        prenom: appointmentToEdit.client_prenom,
        entreprise: appointmentToEdit.client_entreprise,
        telephone: appointmentToEdit.client_telephone,
        whatsapp: appointmentToEdit.client_whatsapp,
        consentement_whatsapp: appointmentToEdit.client_consentement,
      });
      setSelectedOrderId(appointmentToEdit.order_id || '');
      setTypeRendezVous(appointmentToEdit.type_rendez_vous || 'RETRAIT_TRAVAIL');

      const cleanDate = appointmentToEdit.date_rendez_vous || appointmentToEdit.date || '';
      setDateRendezVous(cleanDate.includes('T') ? cleanDate.slice(0, 10) : cleanDate);
      setHeureRendezVous((appointmentToEdit.heure_rendez_vous || appointmentToEdit.heure || '10:00').slice(0, 5));
      setLieu(appointmentToEdit.lieu || DEFAULT_APP_LOCATION);
      setMotif(appointmentToEdit.motif || '');
      setResponsable(appointmentToEdit.responsable || '');
      setNotes(appointmentToEdit.notes || '');
      setSendWhatsApp(false);
    } else {
      // Nouveau rendez-vous
      const today = getTodayStringCI();
      setDateRendezVous(today);
      setHeureRendezVous('10:00');
      setTypeRendezVous(defaultType || 'RETRAIT_TRAVAIL');
      setLieu(DEFAULT_APP_LOCATION);
      setMotif('');
      setResponsable('Atelier Canaan Services');
      setNotes('');
      setSendWhatsApp(true);

      // Si client par défaut
      if (defaultClientId) {
        fetch(`/api/clients/${defaultClientId}`)
          .then((r) => r.json())
          .then((data) => {
            if (data.success && data.client) {
              setSelectedClient(data.client);
            }
          })
          .catch(() => {});
      } else {
        setSelectedClient(null);
      }

      if (defaultOrderId) {
        setSelectedOrderId(defaultOrderId);
      } else {
        setSelectedOrderId('');
      }
    }
  }, [isOpen, appointmentToEdit, defaultClientId, defaultOrderId, defaultType]);

  // Recherche client
  useEffect(() => {
    if (clientSearch.trim().length >= 2) {
      fetch(`/api/clients?search=${encodeURIComponent(clientSearch.trim())}&limit=5`)
        .then((r) => r.json())
        .then((data) => {
          if (data.success) {
            setSearchResults(data.clients || []);
          }
        })
        .catch(() => {});
    } else {
      setSearchResults([]);
    }
  }, [clientSearch]);

  // Charger les commandes dès qu'un client est sélectionné
  useEffect(() => {
    if (selectedClient?.id) {
      fetch(`/api/orders?clientId=${selectedClient.id}&limit=50`)
        .then((r) => r.json())
        .then((data) => {
          if (data.success && data.orders) {
            setClientOrders(data.orders);

            // Si une commande correspond à defaultOrderId ou était sélectionnée
            if (defaultOrderId && data.orders.some((o: any) => o.id === defaultOrderId)) {
              setSelectedOrderId(defaultOrderId);
              const found = data.orders.find((o: any) => o.id === defaultOrderId);
              if (found?.statut === 'PRETE') {
                setTypeRendezVous('RETRAIT_TRAVAIL');
                if (!motif) setMotif(`Retrait commande ${found.numero_commande}`);
              }
            }
          }
        })
        .catch(() => {});
    } else {
      setClientOrders([]);
      setSelectedOrderId('');
    }
  }, [selectedClient, defaultOrderId]);

  // Ajuster le motif par défaut lors du changement de type ou de commande
  useEffect(() => {
    if (!motif || motif.startsWith('Retrait') || motif.startsWith('Validation')) {
      const typeLabel = APPOINTMENT_TYPES_MAP[typeRendezVous]?.label || typeRendezVous;
      const order = clientOrders.find((o) => o.id === selectedOrderId);
      if (order) {
        setMotif(`${typeLabel} : ${order.titre} (${order.numero_commande})`);
      } else {
        setMotif(typeLabel);
      }
    }
  }, [typeRendezVous, selectedOrderId]);

  // Détection de conflit horaire
  useEffect(() => {
    if (dateRendezVous && heureRendezVous && responsable.trim().length >= 2) {
      const query = new URLSearchParams({
        date: dateRendezVous,
        heure: heureRendezVous,
        responsable: responsable.trim(),
      });
      if (appointmentToEdit?.id) query.append('excludeId', appointmentToEdit.id);

      fetch(`/api/appointments/check-conflict?${query.toString()}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.success && data.hasConflict) {
            setConflictWarning(data.message || 'Un autre rendez-vous est déjà prévu pour ce responsable.');
          } else {
            setConflictWarning(null);
          }
        })
        .catch(() => setConflictWarning(null));
    } else {
      setConflictWarning(null);
    }
  }, [dateRendezVous, heureRendezVous, responsable, appointmentToEdit]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedClient) {
      setErrorMsg('Veuillez sélectionner un client.');
      return;
    }

    if (!dateRendezVous || !heureRendezVous) {
      setErrorMsg('La date et l’heure du rendez-vous sont requises.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        client_id: selectedClient.id,
        order_id: selectedOrderId || null,
        type_rendez_vous: typeRendezVous,
        date_rendez_vous: dateRendezVous,
        heure_rendez_vous: heureRendezVous,
        lieu: lieu.trim() || DEFAULT_APP_LOCATION,
        motif: motif.trim() || APPOINTMENT_TYPES_MAP[typeRendezVous]?.label,
        responsable: responsable.trim() || undefined,
        notes: notes.trim() || undefined,
        sendWhatsAppConfirmation: sendWhatsApp && Boolean(selectedClient.whatsapp),
      };

      const url = isEdit ? `/api/appointments/${appointmentToEdit.id}` : '/api/appointments';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-user-name': 'Administrateur',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Erreur lors de l’enregistrement du rendez-vous.');
        return;
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur réseau.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-700 text-white flex items-center justify-center shadow-md shadow-emerald-700/20">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {isEdit ? 'Modifier le Rendez-vous' : 'Programmer un Nouveau Rendez-vous'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Planning d'atelier, retrait de travaux et synchronisation des rappels WhatsApp
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
          {/* SECTION 1 : CLIENT */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-600" />
                Client bénéficiaire *
              </label>

              {!selectedClient && (
                <button
                  type="button"
                  onClick={() => setIsQuickClientOpen(true)}
                  className="font-bold text-emerald-700 hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Nouveau client
                </button>
              )}
            </div>

            {selectedClient ? (
              <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 text-sm">
                    {selectedClient.nom} {selectedClient.prenom || ''}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-3">
                    {selectedClient.entreprise && <span>{selectedClient.entreprise}</span>}
                    <span>Tél : <strong className="font-mono text-slate-700">{formatPhoneDisplay(selectedClient.telephone)}</strong></span>
                    {selectedClient.whatsapp && (
                      <span className="text-emerald-700 font-medium">WhatsApp : {formatPhoneDisplay(selectedClient.whatsapp)}</span>
                    )}
                  </div>
                </div>

                {!isEdit && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedClient(null);
                      setSelectedOrderId('');
                    }}
                    className="text-xs font-semibold text-rose-600 hover:underline px-2 py-1"
                  >
                    Changer
                  </button>
                )}
              </div>
            ) : (
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  placeholder="Rechercher un client existant par nom, entreprise, téléphone..."
                  className="w-full text-xs pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />

                {searchResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-2xl border border-slate-200 shadow-xl z-20 max-h-48 overflow-y-auto divide-y divide-slate-100">
                    {searchResults.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => {
                          setSelectedClient(c);
                          setClientSearch('');
                          setSearchResults([]);
                        }}
                        className="p-3 hover:bg-emerald-50 cursor-pointer flex items-center justify-between"
                      >
                        <div>
                          <span className="font-bold text-slate-900">{c.nom} {c.prenom || ''}</span>
                          {c.entreprise && <span className="text-slate-400 text-[11px] block">{c.entreprise}</span>}
                        </div>
                        <span className="font-mono text-slate-600 text-[11px]">{formatPhoneDisplay(c.telephone)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SECTION 2 : COMMANDE RATTACHÉE (OPTIONNELLE) */}
          {selectedClient && (
            <div className="space-y-1.5">
              <label className="font-bold text-slate-800 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-emerald-600" />
                Commande associée (optionnelle)
              </label>

              {clientOrders.length === 0 ? (
                <p className="text-[11px] text-slate-400 italic">Aucune commande enregistrée pour ce client.</p>
              ) : (
                <select
                  value={selectedOrderId}
                  onChange={(e) => setSelectedOrderId(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                >
                  <option value="">-- Aucune commande spécifique --</option>
                  {clientOrders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.numero_commande} • {o.titre} ({o.statut}) — Solde dû : {formatCFA(o.solde_restant)}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* SECTION 3 : TYPE DE RENDEZ-VOUS */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-800">Objet / Type de rendez-vous *</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {APPOINTMENT_TYPE_KEYS.map((key) => {
                const meta = APPOINTMENT_TYPES_MAP[key];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTypeRendezVous(key)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      typeRendezVous === key
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold shadow-2xs'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 font-medium'
                    }`}
                  >
                    <span>{meta.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SECTION 4 : DATE & HEURE */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-800">Date du rendez-vous *</label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setDateRendezVous(getTodayStringCI())}
                    className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md hover:bg-emerald-200"
                  >
                    Aujourd'hui
                  </button>
                  <button
                    type="button"
                    onClick={() => setDateRendezVous(getTomorrowStringCI())}
                    className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md hover:bg-blue-200"
                  >
                    Demain
                  </button>
                </div>
              </div>
              <input
                type="date"
                value={dateRendezVous}
                onChange={(e) => setDateRendezVous(e.target.value)}
                required
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-800">Heure *</label>
              <input
                type="time"
                value={heureRendezVous}
                onChange={(e) => setHeureRendezVous(e.target.value)}
                required
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
              />
            </div>
          </div>

          {/* SECTION 5 : RESPONSABLE & LIEU */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Responsable du créneau (Agent / Graphiste)
              </label>
              <input
                type="text"
                value={responsable}
                onChange={(e) => setResponsable(e.target.value)}
                placeholder="Ex: Responsable Atelier, Gilles Brice, Caisse..."
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Lieu du rendez-vous</label>
              <input
                type="text"
                value={lieu}
                onChange={(e) => setLieu(e.target.value)}
                placeholder="Lieu de rendez-vous"
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          {/* Alerte conflit d'horaire responsable */}
          {conflictWarning && (
            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start gap-2 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Attention : Chevauchement de créneau</p>
                <p className="text-[11px] text-amber-800 mt-0.5">{conflictWarning}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Vous pouvez quand même enregistrer le rendez-vous si cette double planification est intentionnelle.
                </p>
              </div>
            </div>
          )}

          {/* SECTION 6 : MOTIF & NOTES */}
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Motif précis / Titre du rendez-vous</label>
              <input
                type="text"
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
                placeholder="Ex: Retrait des 500 cartes de visite, Validation maquette bâche..."
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Notes internes & Instructions</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Instructions pour l'atelier ou remarques particulières..."
                rows={2}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl resize-none"
              />
            </div>
          </div>

          {/* Option WhatsApp immédiat */}
          {!isEdit && selectedClient?.whatsapp && (
            <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-700" />
                <div>
                  <span className="font-bold text-emerald-950 block text-xs">
                    Notification de confirmation WhatsApp
                  </span>
                  <span className="text-[11px] text-emerald-800/80">
                    Envoie le modèle officiel « confirmation_rendez_vous » au {formatPhoneDisplay(selectedClient.whatsapp)}
                  </span>
                </div>
              </div>

              <input
                type="checkbox"
                checked={sendWhatsApp}
                onChange={(e) => setSendWhatsApp(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
              />
            </div>
          )}

          {/* Erreur */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-100 transition-colors"
            >
              Annuler
            </button>

            <button
              type="submit"
              disabled={loading || !selectedClient}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 disabled:opacity-50 transition-all"
            >
              <Calendar className="w-4 h-4" />
              <span>{loading ? 'Enregistrement...' : isEdit ? 'Mettre à jour' : 'Programmer le rendez-vous'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Modal Création Client Rapide */}
      <ClientFormModal
        isOpen={isQuickClientOpen}
        onClose={() => setIsQuickClientOpen(false)}
        onSaved={() => {
          setIsQuickClientOpen(false);
          // Le nouveau client créé sera sélectionné
          fetch('/api/clients?limit=1')
            .then((r) => r.json())
            .then((data) => {
              if (data.success && data.clients?.[0]) {
                setSelectedClient(data.clients[0]);
              }
            });
        }}
      />
    </div>
  );
};
