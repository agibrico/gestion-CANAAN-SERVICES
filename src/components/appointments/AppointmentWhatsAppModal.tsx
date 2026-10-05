/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Send,
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Calendar,
} from 'lucide-react';
import { formatPhoneDisplay } from '../../lib/phoneUtils';
import {
  formatAppointmentDate,
  formatAppointmentTime,
  DEFAULT_APP_LOCATION,
} from '../../lib/appointmentUtils';

interface AppointmentWhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: any | null;
  defaultTemplate?: string;
  onSent?: () => void;
}

export const AppointmentWhatsAppModal: React.FC<AppointmentWhatsAppModalProps> = ({
  isOpen,
  onClose,
  appointment,
  defaultTemplate = 'confirmation_rendez_vous',
  onSent,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<string>(defaultTemplate);
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Charger les templates disponibles
  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setSuccessMsg(null);
      setSelectedTemplate(defaultTemplate);

      fetch('/api/whatsapp/templates')
        .then((r) => r.json())
        .then((data) => {
          if (data.success && data.templates) {
            setTemplates(data.templates);
          }
        })
        .catch(() => {});
    }
  }, [isOpen, defaultTemplate]);

  if (!isOpen || !appointment) return null;

  const clientPhone = appointment.client_whatsapp || appointment.client_telephone || '';
  const clientConsent = Boolean(appointment.client_consentement);
  const cleanDate = appointment.date_rendez_vous || appointment.date;
  const cleanTime = appointment.heure_rendez_vous || appointment.heure;

  // Calcul prévisualisé des variables
  const computedVariables: Record<string, string> = {
    '1': appointment.client_prenom || appointment.client_nom || 'Client',
    '2': formatAppointmentDate(cleanDate),
    '3': formatAppointmentTime(cleanTime),
    '4': appointment.order_titre || appointment.motif || 'Travaux d’impression',
    '5': appointment.lieu || DEFAULT_APP_LOCATION,
  };

  const handleSend = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/appointments/${appointment.id}/whatsapp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-name': 'Agent Canaan CRM',
        },
        body: JSON.stringify({
          templateName: selectedTemplate,
          customVariables: computedVariables,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Erreur lors de l’envoi de la notification WhatsApp.');
        return;
      }

      setSuccessMsg(`Message WhatsApp envoyé avec succès via le modèle « ${selectedTemplate} » !`);
      setTimeout(() => {
        if (onSent) onSent();
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur réseau lors de l’envoi.');
    } finally {
      setLoading(false);
    }
  };

  const availableRdvTemplates = [
    {
      key: 'confirmation_rendez_vous',
      label: 'Confirmation immédiate de rendez-vous',
      desc: 'Date, heure, objet et lieu de rencontre.',
    },
    {
      key: 'rappel_rendez_vous_j1',
      label: 'Rappel cordial la veille (J-1)',
      desc: 'Rappel la veille du rendez-vous.',
    },
    {
      key: 'rappel_rendez_vous_jour_j',
      label: 'Rappel le matin même (Jour J)',
      desc: 'Rappel le matin pour l’heure prévue dans la journée.',
    },
    {
      key: 'rendez_vous_manque',
      label: 'Rendez-vous manqué / Reprogrammation',
      desc: 'Notification polie si le client a été marqué absent.',
    },
    {
      key: 'remerciement_retrait',
      label: 'Remerciement après retrait',
      desc: 'Remerciement chaleureux dès la remise du travail.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600/10 text-emerald-700 flex items-center justify-center font-bold">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Notification WhatsApp Rendez-vous</h3>
              <p className="text-[11px] text-slate-500">
                Destinataire : <strong className="font-mono text-emerald-800">{formatPhoneDisplay(clientPhone)}</strong>
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

        {/* Corps */}
        <div className="p-6 space-y-4 text-xs">
          {/* Avertissement consentement */}
          {!clientConsent && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Consentement WhatsApp non formellement activé</p>
                <p className="text-[11px] text-amber-800/90 mt-0.5">
                  L'envoi d'un modèle d'utilité lié à une commande ou prise de RDV directe est autorisé par Meta, mais assurez-vous de l'accord verbal préalable du client.
                </p>
              </div>
            </div>
          )}

          {/* Sélection du modèle */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700">Choisir le modèle de notification :</label>
            <div className="space-y-2">
              {availableRdvTemplates.map((tmpl) => (
                <label
                  key={tmpl.key}
                  className={`p-3 rounded-2xl border flex items-start gap-3 cursor-pointer transition-all ${
                    selectedTemplate === tmpl.key
                      ? 'border-emerald-600 bg-emerald-50/50 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="template"
                    value={tmpl.key}
                    checked={selectedTemplate === tmpl.key}
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                    className="mt-1 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs">{tmpl.label}</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">{tmpl.desc}</p>
                    <span className="font-mono text-[10px] text-slate-400 block mt-1">
                      Nom Meta : {tmpl.key}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Variables transmises */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5 font-mono text-[11px]">
            <span className="font-bold text-slate-700 block font-sans text-xs">
              Variables injectées automatiquement :
            </span>
            <div className="text-slate-600 space-y-0.5">
              <div>• {'{{1}}'} Prénom : <strong>{computedVariables['1']}</strong></div>
              <div>• {'{{2}}'} Date : <strong>{computedVariables['2']}</strong></div>
              <div>• {'{{3}}'} Heure : <strong>{computedVariables['3']}</strong></div>
              <div>• {'{{4}}'} Objet/Travail : <strong>{computedVariables['4']}</strong></div>
              <div>• {'{{5}}'} Lieu : <strong>{computedVariables['5']}</strong></div>
            </div>
          </div>

          {/* Messages de retour */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-100 transition-colors"
          >
            Fermer
          </button>

          <button
            type="button"
            onClick={handleSend}
            disabled={loading || !clientPhone}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 disabled:opacity-50 transition-all"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{loading ? 'Envoi en cours...' : 'Envoyer la notification'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
