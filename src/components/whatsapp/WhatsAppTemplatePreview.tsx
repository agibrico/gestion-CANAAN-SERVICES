/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CheckCheck, Smartphone, Eye, Code, Sparkles } from 'lucide-react';
import type { WhatsAppMetaTemplate, TemplateVariable } from '../../types';

interface WhatsAppTemplatePreviewProps {
  template: Partial<WhatsAppMetaTemplate>;
  customValues?: Record<number, string>;
  onVariableChange?: (index: number, val: string) => void;
  interactive?: boolean;
}

export const WhatsAppTemplatePreview: React.FC<WhatsAppTemplatePreviewProps> = ({
  template,
  customValues,
  onVariableChange,
  interactive = true,
}) => {
  const [viewMode, setViewMode] = useState<'preview' | 'raw'>('preview');
  const [internalValues, setInternalValues] = useState<Record<number, string>>({});

  const variables: TemplateVariable[] = template.variables || [];

  // Obtenir la valeur d'une variable (priorité: customValues > internalValues > example > placeholder)
  const getVarValue = (index: number): string => {
    if (customValues && customValues[index] !== undefined) {
      return customValues[index];
    }
    if (internalValues[index] !== undefined) {
      return internalValues[index];
    }
    const found = variables.find((v) => v.index === index);
    return found?.example || `[Variable ${index}]`;
  };

  const handleInputChange = (index: number, val: string) => {
    setInternalValues((prev) => ({ ...prev, [index]: val }));
    if (onVariableChange) {
      onVariableChange(index, val);
    }
  };

  // Rendu du texte avec remplacement des variables
  const renderRenderedBody = () => {
    const body = template.body || '';
    if (viewMode === 'raw') {
      // Rendu brut avec badges colorés pour les {{1}}
      const parts = body.split(/(\{\{\d+\}\})/g);
      return (
        <span className="whitespace-pre-line text-[14.5px] leading-relaxed text-slate-800">
          {parts.map((part, idx) => {
            const match = part.match(/^\{\{(\d+)\}\}$/);
            if (match) {
              const num = parseInt(match[1], 10);
              const varDef = variables.find((v) => v.index === num);
              return (
                <span
                  key={idx}
                  className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded font-mono text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300"
                  title={varDef?.name ? `Variable {{${num}}} : ${varDef.name}` : `Variable {{${num}}}`}
                >
                  {part}
                </span>
              );
            }
            return part;
          })}
        </span>
      );
    }

    // Rendu final avec les valeurs réelles
    let formattedText = body;
    variables.forEach((v) => {
      const val = getVarValue(v.index);
      formattedText = formattedText.replaceAll(`{{${v.index}}}`, val);
    });

    return (
      <span className="whitespace-pre-line text-[14.5px] leading-relaxed text-slate-800">
        {formattedText}
      </span>
    );
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start w-full">
      {/* Simulation Smartphone */}
      <div className="mx-auto flex-shrink-0 w-full max-w-[340px] bg-slate-900 rounded-[40px] p-3 shadow-2xl border-4 border-slate-700 relative">
        {/* Encoche haut du smartphone */}
        <div className="w-32 h-5 bg-slate-900 rounded-b-xl absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center justify-center">
          <div className="w-12 h-1 bg-slate-700 rounded-full" />
        </div>

        {/* Écran WhatsApp */}
        <div className="w-full bg-[#E5DDD5] rounded-[32px] overflow-hidden flex flex-col h-[520px] relative font-sans text-slate-900">
          {/* Header WhatsApp officiel */}
          <div className="bg-[#075E54] text-white px-3 pt-6 pb-2.5 flex items-center gap-2.5 shadow-md z-10">
            <div className="w-9 h-9 rounded-full bg-emerald-800 flex items-center justify-center text-white font-bold text-sm border-2 border-emerald-400/40 shrink-0">
              CS
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span className="font-semibold text-sm truncate">Canaan Services</span>
                <span className="text-[10px] bg-emerald-500/30 text-emerald-200 px-1 rounded font-medium">
                  Officiel
                </span>
              </div>
              <p className="text-[11px] text-emerald-100/90 truncate flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                Compte Professionnel
              </p>
            </div>
          </div>

          {/* Zone de discussion avec motif WhatsApp */}
          <div
            className="flex-1 p-3 overflow-y-auto flex flex-col justify-end space-y-2"
            style={{
              backgroundImage: `radial-gradient(#cbd5e1 0.75px, transparent 0.75px)`,
              backgroundSize: '12px 12px',
            }}
          >
            {/* Pilule de date */}
            <div className="self-center bg-white/90 backdrop-blur-xs text-slate-600 text-[10px] font-medium px-2.5 py-0.5 rounded-md shadow-xs uppercase tracking-wider">
              Aujourd'hui
            </div>

            {/* Bulle de message sortant WhatsApp */}
            <div className="self-end max-w-[92%] bg-[#DCF8C6] text-slate-800 rounded-2xl rounded-tr-xs p-3 shadow-md relative group border border-emerald-100">
              {renderRenderedBody()}

              {/* Heure et coches bleues WhatsApp */}
              <div className="flex items-center justify-end gap-1 mt-1.5 text-[10px] text-slate-500 font-medium">
                <span>10:45</span>
                <CheckCheck className="w-3.5 h-3.5 text-[#34B7F1]" />
              </div>
            </div>

            {/* Avertissement discret Meta Template */}
            <div className="text-center text-[10px] text-slate-500 bg-white/70 backdrop-blur-xs py-1 px-2 rounded-lg border border-slate-200/60">
              Modèle Meta vérifié • {template.category || 'UTILITY'}
            </div>
          </div>

          {/* Barre inférieure de saisie (simulée) */}
          <div className="bg-[#F0F2F5] px-3 py-2 flex items-center gap-2 border-t border-slate-200">
            <div className="flex-1 bg-white rounded-full px-3 py-1.5 text-xs text-slate-400">
              Répondre à Canaan Services...
            </div>
            <div className="w-8 h-8 rounded-full bg-[#00A884] flex items-center justify-center text-white">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Panneau de contrôle et personnalisation des variables */}
      {interactive && (
        <div className="flex-1 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm w-full">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div>
              <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-600" />
                Simulateur de rendu WhatsApp
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Modifiez les valeurs des variables ci-dessous pour tester l'affichage en direct
              </p>
            </div>

            {/* Commutateur Aperçu / Code variables */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-medium">
              <button
                type="button"
                onClick={() => setViewMode('preview')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                  viewMode === 'preview'
                    ? 'bg-white text-emerald-700 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                Rendu client
              </button>
              <button
                type="button"
                onClick={() => setViewMode('raw')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                  viewMode === 'raw'
                    ? 'bg-white text-emerald-700 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Code className="w-3.5 h-3.5" />
                Variables Meta
              </button>
            </div>
          </div>

          {/* Édition dynamique des variables pour le test */}
          {variables.length > 0 ? (
            <div className="space-y-3">
              <h5 className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Variables du modèle ({variables.length})
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {variables.map((v) => (
                  <div key={v.index} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded">
                        {`{{${v.index}}}`}
                      </span>
                      <span className="text-[11px] font-medium text-slate-600 truncate max-w-[150px]">
                        {v.name}
                      </span>
                    </div>
                    <input
                      type="text"
                      value={getVarValue(v.index)}
                      onChange={(e) => handleInputChange(v.index, e.target.value)}
                      placeholder={`Exemple pour ${v.name}`}
                      className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              Ce modèle ne comporte aucune variable dynamique.
            </div>
          )}

          {/* Fiche technique Meta du modèle */}
          <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap gap-2 text-xs">
            <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-medium">
              Langue : {template.language === 'fr' ? 'Français (fr)' : template.language}
            </span>
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-md font-semibold ${
                template.category === 'MARKETING'
                  ? 'bg-purple-100 text-purple-800'
                  : 'bg-blue-100 text-blue-800'
              }`}
            >
              Catégorie Meta : {template.category || 'UTILITY'}
            </span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 font-medium">
              Format Meta : WhatsApp Cloud API Graph
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
