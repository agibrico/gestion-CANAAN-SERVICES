/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Download,
  Users,
  Check,
} from 'lucide-react';
import { normalizePhoneNumber } from '../../lib/phoneUtils';

interface ClientImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
  currentClients: any[];
}

export const ClientImportExportModal: React.FC<ClientImportExportModalProps> = ({
  isOpen,
  onClose,
  onImportComplete,
  currentClients,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<{
    nom: string;
    prenom: string;
    entreprise: string;
    telephone: string;
    whatsapp: string;
    email: string;
    categorie: string;
    statut_client: string;
  }>({
    nom: '',
    prenom: '',
    entreprise: '',
    telephone: '',
    whatsapp: '',
    email: '',
    categorie: '',
    statut_client: '',
  });

  const [importReport, setImportReport] = useState<{
    total: number;
    success: number;
    duplicates: number;
    errors: number;
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  // Traitement du fichier CSV téléchargé
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
      if (lines.length < 2) return;

      // Détecter délimiteur (, ou ;)
      const firstLine = lines[0];
      const delimiter = firstLine.includes(';') ? ';' : ',';

      const fileHeaders = lines[0].split(delimiter).map((h) => h.trim().replace(/^"|"$/g, ''));
      setHeaders(fileHeaders);

      const rows: any[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(delimiter).map((v) => v.trim().replace(/^"|"$/g, ''));
        if (values.length >= fileHeaders.length) {
          const rowObj: any = {};
          fileHeaders.forEach((h, idx) => {
            rowObj[h] = values[idx] || '';
          });
          rows.push(rowObj);
        }
      }

      setParsedRows(rows);

      // Auto-mapping des colonnes courantes
      const autoMap: any = { ...mapping };
      fileHeaders.forEach((h) => {
        const lower = h.toLowerCase();
        if (lower.includes('nom') && !lower.includes('prenom')) autoMap.nom = h;
        if (lower.includes('prenom')) autoMap.prenom = h;
        if (lower.includes('entreprise') || lower.includes('societe')) autoMap.entreprise = h;
        if (lower.includes('tel') || lower.includes('phone') || lower.includes('contact'))
          autoMap.telephone = h;
        if (lower.includes('whatsapp')) autoMap.whatsapp = h;
        if (lower.includes('mail')) autoMap.email = h;
        if (lower.includes('cat')) autoMap.categorie = h;
        if (lower.includes('statut')) autoMap.statut_client = h;
      });
      setMapping(autoMap);
      setStep(2);
    };
    reader.readAsText(selectedFile);
  };

  // Exécution de l'import avec détection des doublons
  const handleExecuteImport = async () => {
    setIsProcessing(true);
    let successCount = 0;
    let duplicateCount = 0;
    let errorCount = 0;

    for (const row of parsedRows) {
      const rawNom = row[mapping.nom] || '';
      const rawTel = row[mapping.telephone] || '';
      if (!rawNom || !rawTel) {
        errorCount++;
        continue;
      }

      const clientData = {
        nom: rawNom,
        prenom: mapping.prenom ? row[mapping.prenom] : '',
        entreprise: mapping.entreprise ? row[mapping.entreprise] : undefined,
        telephone: rawTel,
        whatsapp: mapping.whatsapp ? row[mapping.whatsapp] : rawTel,
        email: mapping.email ? row[mapping.email] : undefined,
        categorie: mapping.categorie ? row[mapping.categorie] : 'Particulier',
        statut_client: mapping.statut_client ? row[mapping.statut_client] : 'NOUVEAU',
        consentement_whatsapp: true,
        consentement_whatsapp_source: 'IMPORT_CSV',
      };

      try {
        const res = await fetch('/api/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(clientData),
        });

        if (res.status === 409) {
          duplicateCount++;
        } else if (res.ok) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch {
        errorCount++;
      }
    }

    setIsProcessing(false);
    setImportReport({
      total: parsedRows.length,
      success: successCount,
      duplicates: duplicateCount,
      errors: errorCount,
    });
    setStep(3);
    onImportComplete();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] my-auto">
        {/* Header Modal */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600/10 text-emerald-700 flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Assistant d'Importation CSV</h3>
              <p className="text-xs text-slate-500">
                Importez votre base de contacts avec détection automatique de doublons
              </p>
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
        <div className="p-6 overflow-y-auto flex-1 text-xs space-y-4">
          {/* ÉTAPE 1 : SELECTION DU FICHIER */}
          {step === 1 && (
            <div className="py-8 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center space-y-3 bg-slate-50/50">
              <UploadCloud className="w-12 h-12 text-emerald-600" />
              <div>
                <p className="font-bold text-sm text-slate-800">
                  Déposez votre fichier CSV ou cliquez pour parcourir
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Formats acceptés : CSV avec séparateurs virgule (,) ou point-virgule (;)
                </p>
              </div>
              <label className="cursor-pointer px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors">
                Sélectionner un fichier CSV
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {/* ÉTAPE 2 : MAPPING & PRÉVISUALISATION */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-950 flex items-center justify-between">
                <span>
                  Fichier chargé : <strong>{file?.name}</strong> ({parsedRows.length} lignes détectées)
                </span>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-emerald-800 font-bold hover:underline"
                >
                  Changer de fichier
                </button>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2">
                  Associez les colonnes de votre fichier aux champs Canaan CRM
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Nom de famille / Raison sociale *
                    </label>
                    <select
                      value={mapping.nom}
                      onChange={(e) => setMapping({ ...mapping, nom: e.target.value })}
                      className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                    >
                      <option value="">-- Choisir une colonne --</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Prénom</label>
                    <select
                      value={mapping.prenom}
                      onChange={(e) => setMapping({ ...mapping, prenom: e.target.value })}
                      className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                    >
                      <option value="">-- Choisir une colonne (optionnel) --</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Téléphone principal *
                    </label>
                    <select
                      value={mapping.telephone}
                      onChange={(e) => setMapping({ ...mapping, telephone: e.target.value })}
                      className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                    >
                      <option value="">-- Choisir une colonne --</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Numéro WhatsApp</label>
                    <select
                      value={mapping.whatsapp}
                      onChange={(e) => setMapping({ ...mapping, whatsapp: e.target.value })}
                      className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                    >
                      <option value="">-- Même que téléphone ou choisir --</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Entreprise</label>
                    <select
                      value={mapping.entreprise}
                      onChange={(e) => setMapping({ ...mapping, entreprise: e.target.value })}
                      className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                    >
                      <option value="">-- Choisir une colonne (optionnel) --</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Email</label>
                    <select
                      value={mapping.email}
                      onChange={(e) => setMapping({ ...mapping, email: e.target.value })}
                      className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                    >
                      <option value="">-- Choisir une colonne (optionnel) --</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Aperçu des 3 premières lignes */}
              <div>
                <span className="block font-bold text-slate-800 text-[11px] uppercase tracking-wider mb-1.5">
                  Aperçu des 3 premières lignes après mappage
                </span>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 overflow-x-auto">
                  <table className="w-full text-left text-[11px]">
                    <thead>
                      <tr className="text-slate-500 font-semibold border-b border-slate-200 pb-1">
                        <th className="p-1">Nom</th>
                        <th className="p-1">Prénom</th>
                        <th className="p-1">Téléphone</th>
                        <th className="p-1">Entreprise</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/60">
                      {parsedRows.slice(0, 3).map((r, i) => (
                        <tr key={i}>
                          <td className="p-1 font-bold">{r[mapping.nom] || '-'}</td>
                          <td className="p-1">{r[mapping.prenom] || '-'}</td>
                          <td className="p-1 font-mono">{r[mapping.telephone] || '-'}</td>
                          <td className="p-1">{r[mapping.entreprise] || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ÉTAPE 3 : RAPPORT D'IMPORTATION */}
          {step === 3 && importReport && (
            <div className="py-6 space-y-4 text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">Importation terminée</h4>
                <p className="text-slate-500 mt-0.5">
                  Rapport de synchronisation des clients avec PostgreSQL
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 max-w-md mx-auto pt-2">
                <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-200">
                  <span className="text-[10px] uppercase font-bold text-emerald-800">Ajoutés</span>
                  <p className="text-2xl font-extrabold text-emerald-900 mt-0.5">
                    {importReport.success}
                  </p>
                </div>
                <div className="bg-amber-50 p-3 rounded-2xl border border-amber-200">
                  <span className="text-[10px] uppercase font-bold text-amber-800">Doublons évités</span>
                  <p className="text-2xl font-extrabold text-amber-900 mt-0.5">
                    {importReport.duplicates}
                  </p>
                </div>
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-600">Rejetés / Invalides</span>
                  <p className="text-2xl font-extrabold text-slate-700 mt-0.5">
                    {importReport.errors}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-end gap-3">
          {step === 2 && (
            <button
              type="button"
              disabled={isProcessing || !mapping.nom || !mapping.telephone}
              onClick={handleExecuteImport}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
            >
              {isProcessing ? 'Importation en cours...' : 'Lancer l’importation sécurisée'}
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {step === 3 && (
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold"
            >
              Fermer et voir les clients
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
