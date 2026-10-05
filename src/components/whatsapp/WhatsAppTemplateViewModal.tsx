/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Send, Edit, Copy } from 'lucide-react';
import type { WhatsAppMetaTemplate } from '../../types';
import { WhatsAppTemplatePreview } from './WhatsAppTemplatePreview';

interface WhatsAppTemplateViewModalProps {
  isOpen: boolean;
  template: WhatsAppMetaTemplate | null;
  onClose: () => void;
  onEdit: (template: WhatsAppMetaTemplate) => void;
  onSubmitToMeta: (template: WhatsAppMetaTemplate) => void;
}

export const WhatsAppTemplateViewModal: React.FC<WhatsAppTemplateViewModalProps> = ({
  isOpen,
  template,
  onClose,
  onEdit,
  onSubmitToMeta,
}) => {
  if (!isOpen || !template) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] my-auto">
        {/* Header Modal */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-slate-900">{template.displayName}</h3>
              <span className="font-mono text-xs text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded">
                {template.name}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Prévisualisation interactive smartphone et variables dynamiques
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenu */}
        <div className="p-6 overflow-y-auto">
          <WhatsAppTemplatePreview template={template} interactive={true} />
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Statut :</span>
            <span
              className={`font-bold px-2 py-0.5 rounded ${
                template.metaStatus === 'APPROVED'
                  ? 'bg-emerald-100 text-emerald-800'
                  : template.metaStatus === 'PENDING'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              {template.metaStatus}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onEdit(template);
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-100 transition-colors"
            >
              <Edit className="w-4 h-4" />
              Modifier
            </button>

            {template.metaStatus === 'DRAFT' && (
              <button
                onClick={() => {
                  onClose();
                  onSubmitToMeta(template);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm transition-all"
              >
                <Send className="w-4 h-4" />
                Soumettre à Meta
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
