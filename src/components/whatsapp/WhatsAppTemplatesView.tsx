/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Eye,
  Edit2,
  Copy,
  Send,
  Power,
  Sparkles,
  Layers,
  Check,
  Filter,
} from 'lucide-react';
import type { WhatsAppMetaTemplate, MetaTemplateStatus, MetaTemplateCategory } from '../../types';
import { WhatsAppTemplateViewModal } from './WhatsAppTemplateViewModal';
import { WhatsAppTemplateFormModal } from './WhatsAppTemplateFormModal';
import { WhatsAppTemplateSubmitModal } from './WhatsAppTemplateSubmitModal';

export const WhatsAppTemplatesView: React.FC = () => {
  const [templates, setTemplates] = useState<WhatsAppMetaTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Modals state
  const [viewingTemplate, setViewingTemplate] = useState<WhatsAppMetaTemplate | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<WhatsAppMetaTemplate | null>(null);
  const [submittingTemplate, setSubmittingTemplate] = useState<WhatsAppMetaTemplate | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Chargement des modèles
  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/whatsapp/templates');
      const data = await res.json();
      if (data.success && Array.isArray(data.templates)) {
        // Normaliser les propriétés pour correspondre à WhatsAppMetaTemplate
        const normalized = data.templates.map((t: any) => ({
          id: t.id,
          name: t.name,
          displayName: t.display_name,
          language: t.language || 'fr',
          category: t.category,
          body: t.body,
          variables: t.variables_json || [],
          metaTemplateId: t.meta_template_id,
          metaStatus: t.meta_status,
          active: t.active,
          createdAt: t.created_at,
          updatedAt: t.updated_at,
        }));
        setTemplates(normalized);
      }
    } catch (err) {
      console.error('Erreur chargement modèles :', err);
      showToast('Impossible de charger les modèles WhatsApp', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  // Synchronisation avec Meta
  const handleSyncMeta = async () => {
    try {
      setSyncing(true);
      const res = await fetch('/api/whatsapp/templates/sync', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast(`Synchronisation réussie (${data.syncedCount} modèle(s) mis à jour)`);
        await fetchTemplates();
      } else {
        showToast(data.error || 'Erreur lors de la synchronisation avec Meta', 'error');
      }
    } catch (err) {
      showToast('Erreur réseau lors de la synchronisation', 'error');
    } finally {
      setSyncing(false);
    }
  };

  // Enregistrement d'un modèle (création ou modification)
  const handleSaveTemplate = async (templateData: any): Promise<boolean> => {
    try {
      const isEdit = Boolean(editingTemplate);
      const url = isEdit
        ? `/api/whatsapp/templates/${editingTemplate!.id}`
        : '/api/whatsapp/templates';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.error || 'Erreur lors de la sauvegarde du modèle', 'error');
        return false;
      }

      showToast(isEdit ? 'Modèle modifié avec succès' : 'Brouillon de modèle créé');
      await fetchTemplates();
      return true;
    } catch (err) {
      showToast('Erreur réseau lors de la sauvegarde', 'error');
      return false;
    }
  };

  // Soumission à Meta
  const handleConfirmSubmit = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/whatsapp/templates/${id}/submit`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.error || 'Échec de soumission à Meta', 'error');
        return false;
      }

      showToast('Modèle soumis à Meta avec succès ! Statut : EN ATTENTE (PENDING)');
      await fetchTemplates();
      return true;
    } catch (err) {
      showToast('Erreur réseau lors de la soumission Meta', 'error');
      return false;
    }
  };

  // Bascule actif / inactif
  const handleToggleActive = async (template: WhatsAppMetaTemplate) => {
    const newActive = !template.active;
    try {
      const res = await fetch(`/api/whatsapp/templates/${template.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: newActive }),
      });
      const data = await res.json();
      if (data.success) {
        setTemplates((prev) =>
          prev.map((t) => (t.id === template.id ? { ...t, active: newActive } : t))
        );
        showToast(newActive ? `Modèle « ${template.displayName} » activé` : `Modèle désactivé`);
      }
    } catch (err) {
      showToast('Erreur lors du changement de statut', 'error');
    }
  };

  // Duplication d'un modèle
  const handleDuplicate = async (template: WhatsAppMetaTemplate) => {
    const duplicateData = {
      name: `${template.name}_copie_${Date.now().toString().slice(-4)}`,
      display_name: `${template.displayName} (Copie)`,
      language: template.language,
      category: template.category,
      body: template.body,
      variables_json: template.variables,
    };
    await handleSaveTemplate(duplicateData);
  };

  // Filtrage
  const filteredTemplates = templates.filter((tpl) => {
    const matchesSearch =
      tpl.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tpl.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tpl.body.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === 'ALL' || tpl.category === selectedCategory;

    const matchesStatus =
      selectedStatus === 'ALL' || tpl.metaStatus === selectedStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Statistiques
  const stats = {
    total: templates.length,
    drafts: templates.filter((t) => t.metaStatus === 'DRAFT').length,
    pending: templates.filter((t) => t.metaStatus === 'PENDING').length,
    approved: templates.filter((t) => t.metaStatus === 'APPROVED').length,
    active: templates.filter((t) => t.active).length,
  };

  const getStatusBadge = (status: MetaTemplateStatus) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            APPROUVÉ
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin" />
            EN ATTENTE
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
            <XCircle className="w-3.5 h-3.5 text-red-600" />
            REJETÉ
          </span>
        );
      case 'PAUSED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 border border-yellow-200">
            <AlertTriangle className="w-3.5 h-3.5 text-yellow-600" />
            EN PAUSE
          </span>
        );
      case 'DISABLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-200 text-slate-700">
            DÉSACTIVÉ
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
            BROUILLON (DRAFT)
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-sm font-semibold transition-all animate-in fade-in slide-in-from-bottom-5 ${
            toastMessage.type === 'error'
              ? 'bg-red-600 text-white'
              : 'bg-emerald-600 text-white'
          }`}
        >
          {toastMessage.type === 'error' ? (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600/10 text-emerald-700 flex items-center justify-center font-bold">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Modèles WhatsApp Business Cloud API
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Bibliothèque officielle de messages pré-approuvés pour Canaan Services
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleSyncMeta}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
            title="Interroge l'API Graph Meta pour actualiser les statuts d'approbation"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Synchronisation...' : 'Synchroniser Meta'}</span>
          </button>

          <button
            onClick={() => {
              setEditingTemplate(null);
              setIsFormOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Nouveau Modèle</span>
          </button>
        </div>
      </div>

      {/* Cartes de synthèse */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Total Modèles
          </span>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">{stats.total}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Brouillons locaux
          </span>
          <p className="text-2xl font-extrabold text-slate-600 mt-1">{stats.drafts}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider">
            En attente Meta
          </span>
          <p className="text-2xl font-extrabold text-amber-600 mt-1">{stats.pending}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">
            Approuvés
          </span>
          <p className="text-2xl font-extrabold text-emerald-600 mt-1">{stats.approved}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs col-span-2 sm:col-span-1">
          <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">
            Actifs dans CRM
          </span>
          <p className="text-2xl font-extrabold text-blue-600 mt-1">{stats.active}</p>
        </div>
      </div>

      {/* Barre de filtres et recherche */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par nom, mot-clé ou texte..."
            className="w-full text-xs pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Filtre Catégorie */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="text-slate-400">Catégorie:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-hidden"
            >
              <option value="ALL">Toutes les catégories</option>
              <option value="UTILITY">UTILITY (Commandes, RDV, Suivi)</option>
              <option value="MARKETING">MARKETING (Promotions, Offres)</option>
            </select>
          </div>

          {/* Filtre Statut Meta */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="text-slate-400">Statut:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-hidden"
            >
              <option value="ALL">Tous les statuts</option>
              <option value="DRAFT">DRAFT (Brouillon)</option>
              <option value="PENDING">PENDING (En attente)</option>
              <option value="APPROVED">APPROVED (Approuvé)</option>
              <option value="REJECTED">REJECTED (Rejeté)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tableau des modèles */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400 text-sm">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
            Chargement des modèles WhatsApp...
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-sm">
            <Layers className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">Aucun modèle ne correspond à vos filtres</p>
            <p className="text-xs text-slate-400 mt-1">
              Modifiez votre recherche ou créez un nouveau modèle.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4">Nom technique Meta</th>
                  <th className="py-3.5 px-4">Nom affiché & variables</th>
                  <th className="py-3.5 px-4">Catégorie</th>
                  <th className="py-3.5 px-4">Langue</th>
                  <th className="py-3.5 px-4">Statut Meta</th>
                  <th className="py-3.5 px-4 text-center">Actif</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal">
                {filteredTemplates.map((tpl) => (
                  <tr key={tpl.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Nom technique */}
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      <span className="bg-emerald-50 text-emerald-800 px-2 py-1 rounded-md border border-emerald-200/60">
                        {tpl.name}
                      </span>
                    </td>

                    {/* Nom affiché & variables */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800 text-sm">{tpl.displayName}</div>
                      <div className="flex items-center gap-1 mt-1 text-[11px] text-slate-500">
                        <span>{tpl.variables?.length || 0} variable(s) :</span>
                        <div className="flex gap-1 flex-wrap">
                          {tpl.variables?.slice(0, 3).map((v) => (
                            <span
                              key={v.index}
                              className="font-mono bg-slate-100 text-slate-700 px-1 rounded text-[10px]"
                            >
                              {`{{${v.index}}}`}
                            </span>
                          ))}
                          {(tpl.variables?.length || 0) > 3 && (
                            <span className="text-[10px] text-slate-400">
                              +{(tpl.variables?.length || 0) - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Catégorie */}
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md font-bold text-[10px] ${
                          tpl.category === 'MARKETING'
                            ? 'bg-purple-100 text-purple-800 border border-purple-200'
                            : 'bg-blue-100 text-blue-800 border border-blue-200'
                        }`}
                      >
                        {tpl.category}
                      </span>
                    </td>

                    {/* Langue */}
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        <span>🇫🇷</span>
                        <span>{tpl.language || 'fr'}</span>
                      </span>
                    </td>

                    {/* Statut Meta */}
                    <td className="py-3 px-4">{getStatusBadge(tpl.metaStatus)}</td>

                    {/* Actif */}
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(tpl)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                          tpl.active ? 'bg-emerald-600' : 'bg-slate-300'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            tpl.active ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Prévisualiser */}
                        <button
                          onClick={() => setViewingTemplate(tpl)}
                          className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Prévisualiser sur smartphone"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Modifier */}
                        <button
                          onClick={() => {
                            setEditingTemplate(tpl);
                            setIsFormOpen(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Modifier le texte ou les variables"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {/* Dupliquer */}
                        <button
                          onClick={() => handleDuplicate(tpl)}
                          className="p-1.5 text-slate-500 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Dupliquer ce modèle"
                        >
                          <Copy className="w-4 h-4" />
                        </button>

                        {/* Soumettre à Meta (si brouillon) */}
                        {tpl.metaStatus === 'DRAFT' && (
                          <button
                            onClick={() => setSubmittingTemplate(tpl)}
                            className="flex items-center gap-1 px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-[11px] transition-all shadow-2xs ml-1"
                            title="Soumettre à Meta pour approbation"
                          >
                            <Send className="w-3 h-3" />
                            <span>Soumettre</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Voir / Prévisualiser */}
      <WhatsAppTemplateViewModal
        isOpen={Boolean(viewingTemplate)}
        template={viewingTemplate}
        onClose={() => setViewingTemplate(null)}
        onEdit={(tpl) => {
          setEditingTemplate(tpl);
          setIsFormOpen(true);
        }}
        onSubmitToMeta={(tpl) => setSubmittingTemplate(tpl)}
      />

      {/* Modal Formulaire (Nouveau / Modifier) */}
      <WhatsAppTemplateFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingTemplate(null);
        }}
        onSave={handleSaveTemplate}
        initialData={editingTemplate}
      />

      {/* Modal Confirmation de Soumission Meta */}
      <WhatsAppTemplateSubmitModal
        isOpen={Boolean(submittingTemplate)}
        template={submittingTemplate}
        onClose={() => setSubmittingTemplate(null)}
        onConfirmSubmit={handleConfirmSubmit}
      />
    </div>
  );
};
