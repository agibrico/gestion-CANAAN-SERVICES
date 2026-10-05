/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Sparkles, Check, Info } from 'lucide-react';
import { z } from 'zod';
import type { WhatsAppMetaTemplate, MetaTemplateCategory, TemplateVariable } from '../../types';
import { WhatsAppTemplatePreview } from './WhatsAppTemplatePreview';

interface WhatsAppTemplateFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (templateData: any) => Promise<boolean>;
  initialData?: WhatsAppMetaTemplate | null;
}

// Schéma Zod pour le formulaire client
const formSchema = z.object({
  name: z
    .string()
    .min(3, 'Le nom technique doit faire au moins 3 caractères')
    .max(512, 'Le nom technique ne peut dépasser 512 caractères')
    .regex(
      /^[a-z0-9_]+$/,
      'Le nom technique doit être en minuscules, sans accents, sans espaces, avec underscores uniquement'
    ),
  displayName: z
    .string()
    .min(2, 'Le nom affiché est obligatoire')
    .max(100, 'Le nom affiché ne peut dépasser 100 caractères'),
  language: z.string().default('fr'),
  category: z.enum(['UTILITY', 'MARKETING', 'AUTHENTICATION']),
  body: z
    .string()
    .min(10, 'Le texte du modèle doit contenir au moins 10 caractères')
    .max(1024, 'Le corps du modèle ne peut dépasser 1024 caractères'),
});

export const WhatsAppTemplateFormModal: React.FC<WhatsAppTemplateFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const isEditing = Boolean(initialData);

  const [name, setName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [category, setCategory] = useState<MetaTemplateCategory>('UTILITY');
  const [language, setLanguage] = useState('fr');
  const [body, setBody] = useState('');
  const [variables, setVariables] = useState<TemplateVariable[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'form' | 'preview'>('form');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setDisplayName(initialData.displayName);
      setCategory(initialData.category);
      setLanguage(initialData.language || 'fr');
      setBody(initialData.body);
      setVariables(initialData.variables || []);
    } else {
      setName('');
      setDisplayName('');
      setCategory('UTILITY');
      setLanguage('fr');
      setBody(
        `Bonjour {{1}},\n\nVotre commande {{2}} chez Canaan Services est prête.\n\nMerci de votre confiance.`
      );
      setVariables([
        { index: 1, name: 'prénom client', example: 'Jean' },
        { index: 2, name: 'numéro de commande', example: 'CMD-2026-0100' },
      ]);
    }
    setErrors({});
  }, [initialData, isOpen]);

  // Détection automatique des variables {{1}}, {{2}} dans le corps du message
  useEffect(() => {
    const matches = body.match(/\{\{(\d+)\}\}/g) || [];
    const detectedIndices = Array.from(
      new Set(matches.map((m) => parseInt(m.replace(/\D/g, ''), 10)))
    ).sort((a, b) => a - b);

    setVariables((prev) => {
      return detectedIndices.map((idx) => {
        const existing = prev.find((v) => v.index === idx);
        return (
          existing || {
            index: idx,
            name: `variable_${idx}`,
            example: `Valeur ${idx}`,
          }
        );
      });
    });
  }, [body]);

  if (!isOpen) return null;

  // Normalisation du nom technique au fur et à mesure de la frappe
  const handleNameChange = (val: string) => {
    const normalized = val
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_');
    setName(normalized);
  };

  const handleVariableChange = (
    index: number,
    field: 'name' | 'example',
    value: string
  ) => {
    setVariables((prev) =>
      prev.map((v) => (v.index === index ? { ...v, [field]: value } : v))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = formSchema.safeParse({
      name,
      displayName,
      language,
      category,
      body,
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((err: any) => {
        if (err.path[0]) {
          fieldErrors[err.path[0].toString()] = err.message;
        }
      });
      setErrors(fieldErrors);
      setActiveTab('form');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name,
        display_name: displayName,
        language,
        category,
        body,
        variables_json: variables,
      };

      const success = await onSave(payload);
      if (success) {
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] my-auto">
        {/* Header Modal */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-600" />
              {isEditing ? `Modifier le modèle : ${displayName}` : 'Nouveau modèle WhatsApp Cloud API'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Conforme aux spécifications Meta WhatsApp Business Platform (variables numérotées)
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation onglets pour petits écrans */}
        <div className="px-6 pt-3 border-b border-slate-100 flex gap-4 md:hidden">
          <button
            type="button"
            onClick={() => setActiveTab('form')}
            className={`pb-2 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'form'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500'
            }`}
          >
            Formulaire
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`pb-2 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'preview'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500'
            }`}
          >
            Prévisualisation
          </button>
        </div>

        {/* Corps du formulaire */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Colonne Formulaire */}
            <div className={`space-y-4 ${activeTab === 'preview' ? 'hidden md:block' : 'block'}`}>
              {/* Nom technique & Nom affiché */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Nom technique Meta (minuscules, sans accents, underscores)
                </label>
                <input
                  type="text"
                  disabled={isEditing}
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="ex: travail_pret_retrait"
                  className={`w-full font-mono text-sm px-3 py-2 rounded-xl border bg-slate-50/70 focus:bg-white focus:outline-hidden focus:ring-2 transition-all ${
                    errors.name
                      ? 'border-red-400 focus:ring-red-200'
                      : 'border-slate-300 focus:ring-emerald-500/20 focus:border-emerald-600'
                  } ${isEditing ? 'opacity-60 cursor-not-allowed' : ''}`}
                />
                {errors.name ? (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.name}
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-400 mt-1">
                    Identifiant unique enregistré auprès de Meta.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Nom affiché (Libellé convivial dans le CRM)
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="ex: Travail prêt pour retrait"
                  className={`w-full text-sm px-3 py-2 rounded-xl border focus:outline-hidden focus:ring-2 transition-all ${
                    errors.displayName
                      ? 'border-red-400 focus:ring-red-200'
                      : 'border-slate-300 focus:ring-emerald-500/20 focus:border-emerald-600'
                  }`}
                />
                {errors.displayName && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.displayName}
                  </p>
                )}
              </div>

              {/* Catégorie Meta */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Catégorie Meta Cloud API
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCategory('UTILITY')}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                      category === 'UTILITY'
                        ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-blue-900">UTILITY</span>
                      {category === 'UTILITY' && <Check className="w-4 h-4 text-blue-600" />}
                    </div>
                    <span className="text-[11px] text-slate-500 mt-1 leading-snug">
                      Commandes, rendez-vous, paiements, retraits & suivi client
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCategory('MARKETING')}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                      category === 'MARKETING'
                        ? 'border-purple-600 bg-purple-50/60 ring-2 ring-purple-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-purple-900">MARKETING</span>
                      {category === 'MARKETING' && <Check className="w-4 h-4 text-purple-600" />}
                    </div>
                    <span className="text-[11px] text-slate-500 mt-1 leading-snug">
                      Promotions, offres spéciales, relances et annonces commerciales
                    </span>
                  </button>
                </div>
                <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-200/60">
                  <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>
                    Règle stricte Meta : Ne jamais classer un message promotionnel en UTILITY pour éviter un rejet d'approbation.
                  </span>
                </div>
              </div>

              {/* Corps du message */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Corps du message en français
                  </label>
                  <span className="text-[11px] text-slate-400">{body.length} / 1024 car.</span>
                </div>
                <textarea
                  rows={6}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Bonjour {{1}}, votre commande {{2}}..."
                  className={`w-full text-sm font-sans p-3 rounded-xl border focus:outline-hidden focus:ring-2 leading-relaxed transition-all ${
                    errors.body
                      ? 'border-red-400 focus:ring-red-200'
                      : 'border-slate-300 focus:ring-emerald-500/20 focus:border-emerald-600'
                  }`}
                />
                {errors.body && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.body}
                  </p>
                )}
                <p className="text-[11px] text-slate-400 mt-1">
                  Utilisez <code className="bg-slate-100 text-emerald-700 px-1 py-0.5 rounded font-mono font-bold">{'{{1}}'}</code>, <code className="bg-slate-100 text-emerald-700 px-1 py-0.5 rounded font-mono font-bold">{'{{2}}'}</code> pour insérer les variables Meta.
                </p>
              </div>

              {/* Configuration des variables */}
              {variables.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Définition des variables ({variables.length})
                  </label>
                  <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                    {variables.map((v) => (
                      <div
                        key={v.index}
                        className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200 text-xs"
                      >
                        <span className="font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-1 rounded">
                          {`{{${v.index}}}`}
                        </span>
                        <input
                          type="text"
                          value={v.name}
                          onChange={(e) =>
                            handleVariableChange(v.index, 'name', e.target.value)
                          }
                          placeholder="Libellé variable (ex: prénom)"
                          className="flex-1 bg-white border border-slate-200 px-2 py-1 rounded-lg"
                        />
                        <input
                          type="text"
                          value={v.example}
                          onChange={(e) =>
                            handleVariableChange(v.index, 'example', e.target.value)
                          }
                          placeholder="Exemple Meta (ex: Jean)"
                          className="flex-1 bg-white border border-slate-200 px-2 py-1 rounded-lg"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Colonne Prévisualisation */}
            <div className={`${activeTab === 'form' ? 'hidden md:block' : 'block'}`}>
              <div className="sticky top-2">
                <WhatsAppTemplatePreview
                  template={{
                    name,
                    displayName,
                    language,
                    category,
                    body,
                    variables,
                  }}
                  interactive={true}
                />
              </div>
            </div>
          </div>

          {/* Footer boutons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-100 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? 'Enregistrement...' : isEditing ? 'Mettre à jour' : 'Enregistrer le brouillon'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
