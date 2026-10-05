/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  Package,
  Calendar,
  Users,
  ShieldCheck,
  Smartphone,
  ExternalLink,
  ChevronRight,
  Layers,
  Sparkles,
  Bell,
  AlertTriangle,
} from 'lucide-react';
import { WhatsAppTemplatesView } from './components/whatsapp/WhatsAppTemplatesView';
import { WhatsAppWebhookLogView } from './components/whatsapp/WhatsAppWebhookLogView';
import { ClientsListView } from './components/clients/ClientsListView';
import { OrdersListView } from './components/orders/OrdersListView';
import { AppointmentsListView } from './components/appointments/AppointmentsListView';

export default function App() {
  const [activeMainTab, setActiveMainTab] = useState<'whatsapp' | 'commandes' | 'rendezvous' | 'clients'>('rendezvous');
  const [activeWhatsAppSubTab, setActiveWhatsAppSubTab] = useState<'templates' | 'webhook'>('templates');
  const [selectedClientIdForClientView, setSelectedClientIdForClientView] = useState<string | null>(null);

  // Indicateurs globaux pour le badge du menu Rendez-vous
  const [appointmentStats, setAppointmentStats] = useState({
    today: 0,
    tomorrow: 0,
    late: 0,
    totalActive: 0,
  });

  const fetchGlobalAppointmentStats = useCallback(async () => {
    try {
      const res = await fetch('/api/appointments/stats');
      const data = await res.json();
      if (data.success) {
        setAppointmentStats({
          today: data.today || 0,
          tomorrow: data.tomorrow || 0,
          late: data.late || 0,
          totalActive: (data.today || 0) + (data.late || 0),
        });
      }
    } catch {
      // silently fallback
    }
  }, []);

  useEffect(() => {
    fetchGlobalAppointmentStats();
    // Rafraîchir toutes les 60 secondes pour la mise à jour des alertes
    const interval = setInterval(fetchGlobalAppointmentStats, 60000);
    return () => clearInterval(interval);
  }, [fetchGlobalAppointmentStats]);

  const urgentBadgeCount = appointmentStats.today + appointmentStats.late;

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 font-sans flex flex-col">
      {/* Barre de navigation supérieure */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-40 backdrop-blur-md bg-white/90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Titre */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-700 flex items-center justify-center text-white font-extrabold text-lg shadow-md shadow-emerald-700/20">
                CS
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-slate-900 tracking-tight text-base">
                    CANAAN SERVICES
                  </span>
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    CRM Clients & WhatsApp
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium">
                  Imprimerie & Personnalisation Digitale • Abidjan, Côte d'Ivoire
                </p>
              </div>
            </div>

            {/* Navigation principale */}
            <nav className="hidden md:flex items-center gap-1 bg-slate-100/80 p-1 rounded-2xl border border-slate-200/70">
              <button
                onClick={() => setActiveMainTab('whatsapp')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeMainTab === 'whatsapp'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                WhatsApp Cloud API
              </button>

              <button
                onClick={() => setActiveMainTab('commandes')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeMainTab === 'commandes'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <Package className="w-4 h-4 text-slate-500" />
                Commandes & Travaux
              </button>

              <button
                onClick={() => setActiveMainTab('rendezvous')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all relative ${
                  activeMainTab === 'rendezvous'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <Calendar className="w-4 h-4 text-slate-500" />
                <span>Rendez-vous</span>
                {urgentBadgeCount > 0 ? (
                  <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white leading-none shadow-2xs animate-pulse">
                    <Bell className="w-2.5 h-2.5" />
                    {urgentBadgeCount}
                  </span>
                ) : null}
              </button>

              <button
                onClick={() => setActiveMainTab('clients')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeMainTab === 'clients'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <Users className="w-4 h-4 text-slate-500" />
                Clients & Consentement
              </button>
            </nav>

            {/* Badge de statut Meta API */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-semibold text-emerald-800">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Meta WhatsApp API • Connectée
              </div>
            </div>
          </div>
        </div>

        {/* Sous-onglets pour la section WhatsApp */}
        {activeMainTab === 'whatsapp' && (
          <div className="border-t border-slate-200/70 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-6">
              <button
                onClick={() => setActiveWhatsAppSubTab('templates')}
                className={`py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors ${
                  activeWhatsAppSubTab === 'templates'
                    ? 'border-emerald-600 text-emerald-800'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Layers className="w-4 h-4" />
                Modèles de messages (Templates Meta)
              </button>

              <button
                onClick={() => setActiveWhatsAppSubTab('webhook')}
                className={`py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors ${
                  activeWhatsAppSubTab === 'webhook'
                    ? 'border-emerald-600 text-emerald-800'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                Journal Webhook & Événements (sent / delivered / read)
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Barre de notification interne pour les rendez-vous prioritaires */}
      {(appointmentStats.today > 0 || appointmentStats.tomorrow > 0 || appointmentStats.late > 0) && (
        <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white text-xs px-4 py-2.5 shadow-xs">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span className="font-semibold">
                Planning Canaan :{' '}
                <strong>{appointmentStats.today} rendez-vous aujourd'hui</strong> •{' '}
                <strong>{appointmentStats.tomorrow} demain</strong>
                {appointmentStats.late > 0 && (
                  <span className="text-amber-300 font-extrabold ml-1">
                    • {appointmentStats.late} en retard
                  </span>
                )}
              </span>
            </div>

            {activeMainTab !== 'rendezvous' && (
              <button
                onClick={() => setActiveMainTab('rendezvous')}
                className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-white text-[11px] font-bold transition-colors inline-flex items-center gap-1"
              >
                Ouvrir le planning des retraits
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Contenu principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeMainTab === 'whatsapp' && (
          <>
            {activeWhatsAppSubTab === 'templates' && <WhatsAppTemplatesView />}
            {activeWhatsAppSubTab === 'webhook' && <WhatsAppWebhookLogView />}
          </>
        )}

        {/* Vue Commandes & Travaux */}
        {activeMainTab === 'commandes' && (
          <OrdersListView
            onOpenClientDetail={(clientId) => {
              setSelectedClientIdForClientView(clientId);
              setActiveMainTab('clients');
            }}
          />
        )}

        {/* Vue Rendez-vous & Retraits Client */}
        {activeMainTab === 'rendezvous' && (
          <AppointmentsListView
            onOpenClientDetail={(clientId) => {
              setSelectedClientIdForClientView(clientId);
              setActiveMainTab('clients');
            }}
            onOpenOrderDetail={() => {
              setActiveMainTab('commandes');
            }}
            onStatsUpdated={(st) => {
              setAppointmentStats((prev) => ({
                ...prev,
                today: st.today,
                late: st.late,
                totalActive: st.totalActive,
              }));
            }}
          />
        )}

        {/* Vue Clients CRM & Consentements */}
        {activeMainTab === 'clients' && (
          <ClientsListView
            initialSelectedClientId={selectedClientIdForClientView}
            onClearInitialSelectedClientId={() => setSelectedClientIdForClientView(null)}
            onNavigateToOrders={() => setActiveMainTab('commandes')}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500 mt-auto">
        <p>
          Canaan Clients CRM • Imprimerie & Personnalisation Digitale • WhatsApp Business Cloud API • Abidjan
        </p>
      </footer>
    </div>
  );
}
