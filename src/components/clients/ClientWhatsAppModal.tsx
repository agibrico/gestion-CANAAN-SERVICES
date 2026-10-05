/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Send,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Sparkles,
  Info,
} from 'lucide-react';
import { formatPhoneDisplay } from '../../lib/phoneUtils';
import type { WhatsAppMetaTemplate } from '../../types';

interface ClientWhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: any | null;
  onSent: () => void;
}

export const ClientWhatsAppModal: React.FC<ClientWhatsAppModalProps> = ({
  isOpen,
  onClose,
  client,
  onSent,
}) => {
  const [mode, setMode] = useState<'template' | 'text'>('template');
  const [approvedTemplates, setApprovedTemplates] = useState<WhatsAppMetaTemplate[]>([]);
  const [selectedTemplateName, setSelectedTemplateName] = useState('');
  const [templateVariables, setTemplateVariables] = useState<Record<string, string>>({});
  const [customText, setCustomText] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Charger les modèles approuvés
  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setSuccessMsg(null);
      fetch('/api/whatsapp/templates')
        .then((r) => r.json())
        .then((data) => {
          if (data.success && Array.isArray(data.templates)) {
            // Filtrer uniquement les modèles approuvés par Meta
            const approved = data.templates
              .filter((t: any) => t.meta_status === 'APPROVED' && t.active)
              .map((t: any) => ({
                id: t.id,
                name: t.name,
                displayName: t.display_name,
                category: t.category,
                body: t.body,
                variables: t.variables_json || [],
                metaStatus: t.meta_status,
                active: t.active,
              }));

            setApprovedTemplates(approved);
            if (approved.length > 0) {
              setSelectedTemplateName(approved[0].name);
            }
          }
        })
        .catch((err) => console.error('Erreur chargement modèles :', err));
    }
  }, [isOpen]);

  // Initialiser les variables par défaut du modèle sélectionné
  const selectedTemplate = approvedTemplates.find((t) => t.name === selectedTemplateName);

  useEffect(() => {
    if (selectedTemplate && client) {
      const initialVars: Record<string, string> = {};
      selectedTemplate.variables?.forEach((v) => {
        // Pré-remplissage intelligent
        if (v.index === 1) {
          initialVars['1'] = client.prenom || client.nom || 'Cher client';
        } else if (v.name.toLowerCase().includes('date')) {
          initialVars[String(v.index)] = new Date().toLocaleDateString('fr-FR');
        } else {
          initialVars[String(v.index)] = v.example || '';
        }
      });
      setTemplateVariables(initialVars);
    }
  }, [selectedTemplateName, client]);

  if (!isOpen || !client) return null;

  // Rendu de la prévisualisation du message
  const renderPreviewText = () => {
    if (mode === 'text') {
      return customText || 'Tapez votre message pour voir la prévisualisation...';
    }
    if (!selectedTemplate) return '';
    let body = selectedTemplate.body;
    Object.keys(templateVariables).forEach((key) => {
      const val = templateVariables[key] || `{{${key}}}`;
      body = body.replaceAll(`{{${key}}}`, val);
    });
    return body;
  };

  const handleSend = async () => {
    setErrorMsg(null);
    setLoading(true);

    try {
      const payload: any = {
        type: mode,
      };

      if (mode === 'text') {
        payload.text = customText;
      } else {
        payload.templateName = selectedTemplateName;
        payload.templateVariables = templateVariables;
      }

      const res = await fetch(`/api/clients/${client.id}/whatsapp-send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || "Échec de l'envoi WhatsApp.");
        return;
      }

      setSuccessMsg('Message WhatsApp envoyé avec succès !');
      onSent();
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur réseau.');
    } finally {
      setLoading(false);
    }
  };

  const hasConsent = Boolean(client.consentement_whatsapp);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] my-auto">
        {/* Header Modal */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-800 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-700 flex items-center justify-center font-bold">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base">Envoyer un message WhatsApp</h3>
              <p className="text-xs text-emerald-100">
                Destinataire : {client.nom} {client.prenom || ''} •{' '}
                <span className="font-mono">{formatPhoneDisplay(client.whatsapp || client.telephone)}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-emerald-200 hover:text-white hover:bg-emerald-700 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Vérification du consentement WhatsApp */}
          {!hasConsent && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-rose-900">
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Attention : Ce client n'a pas activé son consentement WhatsApp</p>
                <p className="text-[11px] text-rose-800/90 mt-0.5">
                  Conformément aux règles Meta, les messages proactifs de marketing sont strictement bloqués sans accord préalable. Seuls les échanges directs de support client peuvent être autorisés.
                </p>
              </div>
            </div>
          )}

          {/* Commutateur de mode : Modèle approuvé vs Message de service */}
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => setMode('template')}
              className={`flex-1 py-2 rounded-xl font-bold transition-all ${
                mode === 'template'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Modèle Meta vérifié (Recommandé)
            </button>
            <button
              type="button"
              onClick={() => setMode('text')}
              className={`flex-1 py-2 rounded-xl font-bold transition-all ${
                mode === 'text'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Message libre (Service client)
            </button>
          </div>

          {mode === 'template' ? (
            <div className="space-y-4">
              {approvedTemplates.length === 0 ? (
                <div className="p-6 text-center bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 space-y-2">
                  <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto" />
                  <p className="font-bold text-sm">Aucun modèle approuvé disponible</p>
                  <p className="text-xs text-amber-800 leading-relaxed max-w-md mx-auto">
                    Tous vos modèles sont actuellement en statut <strong>DRAFT (Brouillon)</strong> ou <strong>PENDING</strong>.
                    Rendez-vous dans l'onglet <strong>WhatsApp Cloud API &gt; Modèles</strong> pour soumettre vos modèles à Meta pour approbation.
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Sélectionnez le modèle officiel approuvé
                    </label>
                    <select
                      value={selectedTemplateName}
                      onChange={(e) => setSelectedTemplateName(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white"
                    >
                      {approvedTemplates.map((tpl) => (
                        <option key={tpl.name} value={tpl.name}>
                          {tpl.displayName} ({tpl.name} - {tpl.category})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Variables dynamiques */}
                  {selectedTemplate && selectedTemplate.variables?.length > 0 && (
                    <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                      <label className="block font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                        Variables du modèle
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {selectedTemplate.variables.map((v) => (
                          <div key={v.index}>
                            <label className="block text-[11px] text-slate-500 mb-0.5 truncate">
                              <span className="font-mono font-bold text-emerald-700">
                                {`{{${v.index}}}`}
                              </span>{' '}
                              : {v.name}
                            </label>
                            <input
                              type="text"
                              value={templateVariables[String(v.index)] || ''}
                              onChange={(e) =>
                                setTemplateVariables((prev) => ({
                                  ...prev,
                                  [String(v.index)]: e.target.value,
                                }))
                              }
                              placeholder={v.example}
                              className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Texte du message
              </label>
              <textarea
                rows={4}
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="Tapez votre message d'assistance client..."
                className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-hidden"
              />
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-slate-400" />
                Les messages libres doivent être utilisés dans le cadre de la fenêtre de 24h suite à une interaction client.
              </p>
            </div>
          )}

          {/* Prévisualisation bulle WhatsApp */}
          <div className="space-y-1.5 pt-2">
            <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
              Aperçu WhatsApp reçu par le client
            </span>
            <div className="p-4 rounded-2xl bg-[#E5DDD5] border border-slate-300/80 shadow-inner">
              <div className="max-w-md bg-[#DCF8C6] text-slate-800 p-3 rounded-2xl rounded-tr-xs shadow-xs text-xs whitespace-pre-line leading-relaxed">
                {renderPreviewText()}
              </div>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100"
          >
            Fermer
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={loading || (mode === 'template' && approvedTemplates.length === 0)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {loading ? 'Expédition en cours...' : 'Envoyer via Meta API'}
          </button>
        </div>
      </div>
    </div>
  );
};
