/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Activity, RefreshCw, CheckCheck, Clock, AlertCircle, ArrowDownLeft, ShieldCheck } from 'lucide-react';

interface WebhookEvent {
  id: string;
  type: 'MESSAGE' | 'STATUS';
  status?: 'sent' | 'delivered' | 'read' | 'failed';
  fromOrRecipient: string;
  messageId: string;
  timestamp: string;
  contentSummary: string;
  clientNom?: string | null;
  details?: Record<string, unknown>;
}

export const WhatsAppWebhookLogView: React.FC = () => {
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/webhooks/whatsapp/events');
      const data = await res.json();
      if (Array.isArray(data.events)) {
        setEvents(data.events);
      }
    } catch (err) {
      console.error('Erreur chargement événements webhook :', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 6000);
    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'read':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#34B7F1] bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
            <CheckCheck className="w-3.5 h-3.5 text-[#34B7F1]" />
            LU (read)
          </span>
        );
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
            <CheckCheck className="w-3.5 h-3.5 text-slate-500" />
            LIVRÉ (delivered)
          </span>
        );
      case 'sent':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
            <Clock className="w-3.5 h-3.5 text-emerald-600" />
            ENVOYÉ (sent)
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-800 bg-red-50 px-2 py-0.5 rounded-md border border-red-200">
            <AlertCircle className="w-3.5 h-3.5 text-red-600" />
            ÉCHEC (failed)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
            <ArrowDownLeft className="w-3.5 h-3.5 text-indigo-600" />
            MESSAGE REÇU
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-600" />
            Journal des événements Webhook Meta (Temps réel)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Écoute active sur <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-emerald-800">/api/webhooks/whatsapp</code> (statuts sent, delivered, read et messages entrants)
          </p>
        </div>
        <button
          onClick={fetchEvents}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {events.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            <ShieldCheck className="w-10 h-10 mx-auto mb-2 text-emerald-600/40" />
            <p className="font-semibold text-slate-700">Webhook opérationnel & en attente d'événements</p>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Dès qu'un message est expédié, délivré ou ouvert par un client, l'événement Meta s'affichera instantanément ici et s'inscrira dans Supabase.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Date / Heure</th>
                  <th className="py-3 px-4">Type & Statut</th>
                  <th className="py-3 px-4">Destinataire / Expéditeur</th>
                  <th className="py-3 px-4">Détails</th>
                  <th className="py-3 px-4 font-mono">Meta Message ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {events.map((evt) => (
                  <tr key={evt.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      {new Date(evt.timestamp).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(evt.status)}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {evt.clientNom || evt.fromOrRecipient}
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                      {evt.contentSummary}
                    </td>
                    <td className="py-3 px-4 font-mono text-[10px] text-slate-400 truncate max-w-[140px]">
                      {evt.messageId}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
