/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Send, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import type { WhatsAppMetaTemplate } from '../../types';

interface WhatsAppTemplateSubmitModalProps {
  isOpen: boolean;
  template: WhatsAppMetaTemplate | null;
  onClose: () => void;
  onConfirmSubmit: (id: string) => Promise<boolean>;
}

export const WhatsAppTemplateSubmitModal: React.FC<WhatsAppTemplateSubmitModalProps> = ({
  isOpen,
  template,
  onClose,
  onConfirmSubmit,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !template) return null;

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const success = await onConfirmSubmit(template.id);
      if (success) {
        onClose();
      }
    } catch (e: any) {
      setErrorMsg(e?.message || 'Erreur lors de la soumission Meta.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header Modal */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-amber-50/50">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Soumettre le modèle à Meta</h3>
              <p className="text-xs text-slate-500">Demande officielle d'approbation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps */}
        <div className="p-6 space-y-4">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-sm space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">Nom technique :</span>
              <span className="font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                {template.name}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">Libellé :</span>
              <span className="font-semibold text-slate-800">{template.displayName}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">Catégorie Meta :</span>
              <span
                className={`font-bold px-2 py-0.5 rounded ${
                  template.category === 'MARKETING'
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-blue-100 text-blue-800'
                }`}
              >
                {template.category}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">Langue :</span>
              <span className="font-medium text-slate-700">Français (fr)</span>
            </div>
          </div>

          <div className="bg-amber-50/80 border border-amber-200 p-3.5 rounded-xl text-xs text-amber-900 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-amber-950">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              Ce qui va se passer après votre validation :
            </div>
            <ul className="list-disc list-inside space-y-1 pl-1 text-amber-900/90 leading-relaxed">
              <li>Le modèle sera envoyé à l'API Meta Graph avec ses variables et exemples.</li>
              <li>Le statut passera à <strong>PENDING</strong> (En attente d'approbation).</li>
              <li>Le processus d'évaluation Meta prend généralement entre 1 minute et quelques heures.</li>
              <li>Vous pourrez synchroniser le statut final (APPROVED ou REJECTED) d'un clic.</li>
            </ul>
          </div>

          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-xl flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div>
                <strong>Échec de soumission :</strong> {errorMsg}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-100 transition-colors"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {isSubmitting ? 'Soumission à Meta...' : 'Confirmer et soumettre à Meta'}
          </button>
        </div>
      </div>
    </div>
  );
};
