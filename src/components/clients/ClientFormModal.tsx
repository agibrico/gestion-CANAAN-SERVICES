/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  AlertTriangle,
  User,
  Building,
  Phone,
  MessageSquare,
  Mail,
  MapPin,
  Tag,
  CheckCircle2,
  Copy,
  Plus,
} from 'lucide-react';
import { z } from 'zod';
import { normalizePhoneNumber, formatPhoneDisplay } from '../../lib/phoneUtils';
import type { ClientRecord, ClientCategory, ClientStatus } from '../../types';

interface ClientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  onViewExisting?: (client: any) => void;
  clientToEdit?: any | null;
}

const CATEGORIES: ClientCategory[] = [
  'Particulier',
  'Entreprise',
  'École',
  'Église',
  'Association',
  'ONG',
  'Administration',
  'Commerce',
  'Autre',
];

const STATUTS: ClientStatus[] = [
  'PROSPECT',
  'NOUVEAU',
  'ACTIF',
  'REGULIER',
  'VIP',
  'INACTIF',
];

const PREDEFINED_INTERESTS = [
  'Cartes de visite',
  'Flyers',
  'Bâches',
  'Tee-shirts',
  'Polos',
  'Casquettes',
  'Tasses',
  'Porte-clés',
  'Médailles',
  'Trophées',
  'Affiches',
  'Stickers',
  'Invitations',
  'Personnalisation textile',
  'Calendriers / Agendas',
];

const clientSchema = z.object({
  nom: z.string().min(2, 'Le nom est obligatoire (au moins 2 caractères)'),
  prenom: z.string().optional().default(''),
  entreprise: z.string().optional(),
  telephone: z.string().min(8, 'Le numéro de téléphone est obligatoire'),
  whatsapp: z.string().optional(),
  email: z.string().email('Format email invalide').optional().or(z.literal('')),
  ville: z.string().default('Abidjan'),
  quartier: z.string().optional(),
  adresse: z.string().optional(),
  categorie: z.string().default('Particulier'),
  statut_client: z.string().default('NOUVEAU'),
  consentement_whatsapp: z.boolean().default(false),
  consentement_whatsapp_source: z.string().default('FORMULAIRE'),
  notes: z.string().optional(),
});

export const ClientFormModal: React.FC<ClientFormModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  onViewExisting,
  clientToEdit,
}) => {
  const isEdit = Boolean(clientToEdit);

  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [entreprise, setEntreprise] = useState('');
  const [telephone, setTelephone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [ville, setVille] = useState('Abidjan');
  const [quartier, setQuartier] = useState('');
  const [adresse, setAdresse] = useState('');
  const [categorie, setCategorie] = useState<ClientCategory>('Particulier');
  const [statutClient, setStatutClient] = useState<ClientStatus>('NOUVEAU');
  const [consentementWhatsapp, setConsentementWhatsapp] = useState(true);
  const [consentementSource, setConsentementSource] = useState('FORMULAIRE');
  const [centresInteret, setCentresInteret] = useState<string[]>([]);
  const [newInterestInput, setNewInterestInput] = useState('');
  const [notes, setNotes] = useState('');

  const [duplicateWarning, setDuplicateWarning] = useState<any | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (clientToEdit) {
      setNom(clientToEdit.nom || '');
      setPrenom(clientToEdit.prenom || '');
      setEntreprise(clientToEdit.entreprise || '');
      setTelephone(clientToEdit.telephone || '');
      setWhatsapp(clientToEdit.whatsapp || '');
      setEmail(clientToEdit.email || '');
      setVille(clientToEdit.ville || 'Abidjan');
      setQuartier(clientToEdit.quartier || '');
      setAdresse(clientToEdit.adresse || '');
      setCategorie(clientToEdit.categorie || 'Particulier');
      setStatutClient(clientToEdit.statut_client || 'ACTIF');
      setConsentementWhatsapp(Boolean(clientToEdit.consentement_whatsapp));
      setConsentementSource(clientToEdit.consentement_whatsapp_source || 'FORMULAIRE');
      setCentresInteret(
        Array.isArray(clientToEdit.centres_interet) ? clientToEdit.centres_interet : []
      );
      setNotes(clientToEdit.notes || '');
    } else {
      setNom('');
      setPrenom('');
      setEntreprise('');
      setTelephone('');
      setWhatsapp('');
      setEmail('');
      setVille('Abidjan');
      setQuartier('');
      setAdresse('');
      setCategorie('Particulier');
      setStatutClient('NOUVEAU');
      setConsentementWhatsapp(true);
      setConsentementSource('FORMULAIRE');
      setCentresInteret([]);
      setNotes('');
    }
    setDuplicateWarning(null);
    setErrors({});
  }, [clientToEdit, isOpen]);

  // Vérification de doublon lorsque l'utilisateur quitte le champ téléphone
  const handleTelephoneBlur = async () => {
    if (isEdit || !telephone || telephone.trim().length < 8) return;

    try {
      const res = await fetch('/api/clients/check-duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telephone }),
      });
      const data = await res.json();
      if (data.isDuplicate && data.existingClient) {
        setDuplicateWarning(data.existingClient);
      } else {
        setDuplicateWarning(null);
      }
    } catch (e) {
      console.error('Erreur vérification doublon :', e);
    }
  };

  const copyPhoneToWhatsapp = () => {
    setWhatsapp(telephone);
  };

  const toggleInterest = (interest: string) => {
    setCentresInteret((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  };

  const addCustomInterest = () => {
    if (!newInterestInput.trim()) return;
    const trimmed = newInterestInput.trim();
    if (!centresInteret.includes(trimmed)) {
      setCentresInteret((prev) => [...prev, trimmed]);
    }
    setNewInterestInput('');
  };

  const handleSubmit = async (e: React.FormEvent, forceDuplicate = false) => {
    if (e) e.preventDefault();
    setErrors({});

    const parsed = clientSchema.safeParse({
      nom,
      prenom,
      entreprise,
      telephone,
      whatsapp: whatsapp || telephone,
      email,
      ville,
      quartier,
      adresse,
      categorie,
      statut_client: statutClient,
      consentement_whatsapp: consentementWhatsapp,
      consentement_whatsapp_source: consentementSource,
      notes,
    });

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.issues.forEach((err: any) => {
        if (err.path[0]) {
          fieldErrors[err.path[0].toString()] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    try {
      const url = isEdit ? `/api/clients/${clientToEdit.id}` : '/api/clients';
      const method = isEdit ? 'PUT' : 'POST';

      const payload = {
        ...parsed.data,
        centres_interet: centresInteret,
        forceDuplicate,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();

      if (!res.ok) {
        if (res.status === 409 && resData.duplicate) {
          setDuplicateWarning(resData.duplicate);
          return;
        }
        setErrors({ general: resData.error || 'Erreur lors de la sauvegarde.' });
        return;
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setErrors({ general: err.message || 'Erreur réseau.' });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] my-auto">
        {/* Header Modal */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600/10 text-emerald-700 flex items-center justify-center font-bold">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                {isEdit ? `Modifier le client : ${clientToEdit.nom} ${clientToEdit.prenom || ''}` : 'Nouveau client'}
              </h3>
              <p className="text-xs text-slate-500">
                Fiche contact, entreprise, normalisation WhatsApp Côte d'Ivoire (+225)
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

        {/* Alerte Doublon Détecté */}
        {duplicateWarning && (
          <div className="mx-6 mt-4 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-900 text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              Un client avec ce numéro ou cet email existe déjà !
            </div>
            <p className="leading-relaxed text-amber-900/90">
              Client existant : <strong>{duplicateWarning.nom} {duplicateWarning.prenom}</strong>{' '}
              {duplicateWarning.entreprise && `(${duplicateWarning.entreprise})`} • Téléphone :{' '}
              <span className="font-mono">{formatPhoneDisplay(duplicateWarning.telephone)}</span>
            </p>
            <div className="flex items-center gap-2 pt-1">
              {onViewExisting && (
                <button
                  type="button"
                  onClick={() => {
                    onViewExisting(duplicateWarning);
                    onClose();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-xs"
                >
                  Voir la fiche existante
                </button>
              )}
              <button
                type="button"
                onClick={() => setDuplicateWarning(null)}
                className="px-3 py-1.5 rounded-lg border border-amber-300 text-amber-900 font-semibold hover:bg-amber-100"
              >
                Corriger le numéro
              </button>
              <button
                type="button"
                onClick={(e) => handleSubmit(e, true)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-white ml-auto"
              >
                Continuer quand même
              </button>
            </div>
          </div>
        )}

        {/* Corps du formulaire */}
        <form onSubmit={(e) => handleSubmit(e, false)} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          {errors.general && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl">
              {errors.general}
            </div>
          )}

          {/* Section 1 : Identité & Entreprise */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5 pb-1 border-b border-slate-100">
              <User className="w-3.5 h-3.5 text-emerald-600" />
              Identité & Structure
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nom du client *</label>
                <input
                  type="text"
                  required
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  placeholder="ex: Kouassi"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
                {errors.nom && <p className="text-red-500 mt-0.5">{errors.nom}</p>}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Prénom(s)</label>
                <input
                  type="text"
                  value={prenom}
                  onChange={(e) => setPrenom(e.target.value)}
                  placeholder="ex: Jean-Luc"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Entreprise / Société / Établissement
                </label>
                <input
                  type="text"
                  value={entreprise}
                  onChange={(e) => setEntreprise(e.target.value)}
                  placeholder="ex: SIFCA, Collège Moderne, Paroisse..."
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Catégorie</label>
                <select
                  value={categorie}
                  onChange={(e) => setCategorie(e.target.value as ClientCategory)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 2 : Coordonnées & Téléphones */}
          <div className="space-y-3 pt-2">
            <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5 pb-1 border-b border-slate-100">
              <Phone className="w-3.5 h-3.5 text-emerald-600" />
              Téléphones & WhatsApp (Format Côte d'Ivoire)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Téléphone principal *</label>
                <input
                  type="text"
                  required
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  onBlur={handleTelephoneBlur}
                  placeholder="07 00 00 00 00 ou +225..."
                  className="w-full text-xs font-mono px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Normalisé auto : <code className="text-emerald-700 font-bold">{normalizePhoneNumber(telephone) || '225...'}</code>
                </p>
                {errors.telephone && <p className="text-red-500 mt-0.5">{errors.telephone}</p>}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700">Numéro WhatsApp</label>
                  {telephone && (
                    <button
                      type="button"
                      onClick={copyPhoneToWhatsapp}
                      className="text-[11px] font-bold text-emerald-700 hover:underline flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" /> Même numéro
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="Si différent du téléphone"
                  className="w-full text-xs font-mono px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Utilisé pour les messages Meta Cloud API
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Adresse Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="client@domaine.ci"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
                {errors.email && <p className="text-red-500 mt-0.5">{errors.email}</p>}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Statut Client</label>
                <select
                  value={statutClient}
                  onChange={(e) => setStatutClient(e.target.value as ClientStatus)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-hidden"
                >
                  {STATUTS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 3 : Localisation */}
          <div className="space-y-3 pt-2">
            <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5 pb-1 border-b border-slate-100">
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              Localisation & Adresse
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Ville</label>
                <input
                  type="text"
                  value={ville}
                  onChange={(e) => setVille(e.target.value)}
                  placeholder="Abidjan"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Commune / Quartier</label>
                <input
                  type="text"
                  value={quartier}
                  onChange={(e) => setQuartier(e.target.value)}
                  placeholder="ex: Cocody Angré, Plateau..."
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Repère géographique</label>
                <input
                  type="text"
                  value={adresse}
                  onChange={(e) => setAdresse(e.target.value)}
                  placeholder="ex: En face de la pharmacie..."
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>
            </div>
          </div>

          {/* Section 4 : Consentement WhatsApp */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-700" />
                <span className="font-bold text-slate-900 text-xs">
                  Consentement de messagerie WhatsApp
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentementWhatsapp}
                  onChange={(e) => setConsentementWhatsapp(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {consentementWhatsapp && (
              <div className="flex items-center gap-2 text-xs pt-1 border-t border-emerald-200/60">
                <span className="text-slate-600 font-medium">Source du consentement :</span>
                <select
                  value={consentementSource}
                  onChange={(e) => setConsentementSource(e.target.value)}
                  className="bg-white border border-emerald-300 text-slate-800 rounded-lg px-2 py-1 text-xs"
                >
                  <option value="FORMULAIRE">Formulaire agence / Devis signé</option>
                  <option value="VERBAL">Accord verbal client</option>
                  <option value="WHATSAPP">Message WhatsApp entrant</option>
                  <option value="CLIENT">Demande directe du client</option>
                  <option value="AUTRE">Autre preuve de consentement</option>
                </select>
              </div>
            )}
            <p className="text-[11px] text-emerald-950/80">
              Conformité Meta : Le client accepte de recevoir des notifications de suivi de ses commandes et travaux d'impression.
            </p>
          </div>

          {/* Section 5 : Centres d'intérêt */}
          <div className="space-y-2 pt-1">
            <label className="block font-bold text-slate-800 uppercase tracking-wider text-[11px]">
              Centres d'intérêt & Produits Canaan
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PREDEFINED_INTERESTS.map((item) => {
                const active = centresInteret.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleInterest(item)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                      active
                        ? 'bg-emerald-700 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>

            {/* Ajout d'un centre d'intérêt personnalisé */}
            <div className="flex gap-2 pt-1">
              <input
                type="text"
                value={newInterestInput}
                onChange={(e) => setNewInterestInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCustomInterest();
                  }
                }}
                placeholder="Ajouter un autre produit..."
                className="flex-1 px-3 py-1 rounded-lg border border-slate-200 text-xs"
              />
              <button
                type="button"
                onClick={addCustomInterest}
                className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 font-semibold text-slate-700 text-xs flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Ajouter
              </button>
            </div>
          </div>

          {/* Section 6 : Notes */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Notes internes CRM</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Habitudes, consignes particulières, historique rapide..."
              className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden"
            />
          </div>

          {/* Footer boutons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Enregistrement...' : isEdit ? 'Mettre à jour' : 'Enregistrer le client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
