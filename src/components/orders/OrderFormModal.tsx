/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Save,
  User,
  Search,
  CheckCircle2,
  AlertTriangle,
  Package,
  Calendar,
  DollarSign,
  FileText,
  UserPlus,
  ChevronRight,
  ChevronLeft,
  Sparkles,
} from 'lucide-react';
import {
  type OrderPriority,
  type PaymentMode,
  ORDER_PRIORITIES,
  PAYMENT_MODES,
  PREDEFINED_PRESTATIONS,
  formatCFA,
} from '../../lib/orderUtils';
import { formatPhoneDisplay } from '../../lib/phoneUtils';
import { ClientFormModal } from '../clients/ClientFormModal';

interface OrderItemState {
  id?: string;
  designation: string;
  categorie: string;
  description: string;
  quantite: number;
  prix_unitaire: number;
  format?: string;
  matiere?: string;
  couleur?: string;
  finition?: string;
  grammage?: string;
  recto_verso?: string;
}

interface OrderFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  orderToEdit?: any | null;
  defaultClientId?: string | null;
}

export const OrderFormModal: React.FC<OrderFormModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  orderToEdit,
  defaultClientId,
}) => {
  const isEdit = Boolean(orderToEdit);

  // Étapes (1: Client, 2: Prestations, 3: Tarifs & Acompte, 4: Planning, 5: Notes & Fichiers, 6: Confirmation)
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Étape 1 : Client
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isQuickClientOpen, setIsQuickClientOpen] = useState(false);

  // Étape 2 : Prestations
  const [items, setItems] = useState<OrderItemState[]>([
    {
      designation: 'Cartes de visite',
      categorie: 'Papeterie',
      description: '100 cartes de visite pelliculées',
      quantite: 100,
      prix_unitaire: 150,
      format: '8.5 x 5.5 cm',
      matiere: 'Papier Couché 350g',
      finition: 'Pelliculage mat recto-verso',
    },
  ]);

  // Étape 3 : Tarification
  const [remise, setRemise] = useState<number>(0);
  const [acompte, setAcompte] = useState<number>(0);
  const [modeAcompte, setModeAcompte] = useState<PaymentMode>('ESPECES');

  // Étape 4 : Planning & Titre
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [datePrevue, setDatePrevue] = useState('');
  const [dateRetrait, setDateRetrait] = useState('');
  const [priorite, setPriorite] = useState<OrderPriority>('NORMALE');
  const [responsable, setResponsable] = useState('');

  // Étape 5 : Notes & Fichiers
  const [notes, setNotes] = useState('');
  const [fichierUrl, setFichierUrl] = useState('');
  const [fichiers, setFichiers] = useState<Array<{ nom: string; url: string }>>([]);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Recherche client
  useEffect(() => {
    if (clientSearch.trim().length >= 2) {
      fetch(`/api/clients?search=${encodeURIComponent(clientSearch.trim())}&limit=5`)
        .then((r) => r.json())
        .then((data) => {
          if (data.success) {
            setSearchResults(data.clients || []);
          }
        })
        .catch(() => {});
    } else {
      setSearchResults([]);
    }
  }, [clientSearch]);

  // Initialisation à l'ouverture
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setErrorMsg(null);

      if (orderToEdit) {
        setSelectedClient(orderToEdit.client || null);
        setTitre(orderToEdit.titre || '');
        setDescription(orderToEdit.description || '');
        setRemise(orderToEdit.remise || 0);
        setAcompte(orderToEdit.acompte || 0);
        setDatePrevue(orderToEdit.date_prevue ? orderToEdit.date_prevue.slice(0, 10) : '');
        setDateRetrait(orderToEdit.date_retrait ? orderToEdit.date_retrait.slice(0, 10) : '');
        setPriorite(orderToEdit.priorite || 'NORMALE');
        setResponsable(orderToEdit.responsable || '');
        setNotes(orderToEdit.notes || '');
        setFichiers(orderToEdit.fichiers || []);

        if (orderToEdit.items && orderToEdit.items.length > 0) {
          setItems(
            orderToEdit.items.map((it: any) => ({
              designation: it.designation,
              categorie: it.categorie || 'Autre',
              description: it.description || '',
              quantite: it.quantite,
              prix_unitaire: it.prix_unitaire,
              format: it.specifications?.format || '',
              matiere: it.specifications?.matiere || '',
              couleur: it.specifications?.couleur || '',
              finition: it.specifications?.finition || '',
            }))
          );
        }
      } else {
        // Nouvelle commande
        setTitre('');
        setDescription('');
        setRemise(0);
        setAcompte(0);
        setDatePrevue('');
        setDateRetrait('');
        setPriorite('NORMALE');
        setResponsable('');
        setNotes('');
        setFichiers([]);

        // Si defaultClientId fourni
        if (defaultClientId) {
          fetch(`/api/clients/${defaultClientId}`)
            .then((r) => r.json())
            .then((data) => {
              if (data.success && data.client) {
                setSelectedClient(data.client);
              }
            });
        } else {
          setSelectedClient(null);
        }

        setItems([
          {
            designation: 'Cartes de visite',
            categorie: 'Papeterie',
            description: '',
            quantite: 100,
            prix_unitaire: 150,
          },
        ]);
      }
    }
  }, [isOpen, orderToEdit, defaultClientId]);

  if (!isOpen) return null;

  // Calculs financiers dynamiques
  const sousTotal = items.reduce(
    (sum, it) => sum + (Number(it.quantite) || 0) * (Number(it.prix_unitaire) || 0),
    0
  );
  const total = Math.max(0, sousTotal - (Number(remise) || 0));
  const solde = Math.max(0, total - (Number(acompte) || 0));

  // Gestion des items
  const handleAddItem = (preset?: any) => {
    if (preset) {
      setItems((prev) => [
        ...prev,
        {
          designation: preset.name,
          categorie: preset.categorie,
          description: '',
          quantite: preset.defaultQty,
          prix_unitaire: Math.round(preset.defaultPrice / preset.defaultQty) || 100,
        },
      ]);
    } else {
      setItems((prev) => [
        ...prev,
        {
          designation: 'Nouvelle prestation',
          categorie: 'Autre',
          description: '',
          quantite: 1,
          prix_unitaire: 5000,
        },
      ]);
    }
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateItem = (index: number, field: keyof OrderItemState, value: any) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // Ajout fichier
  const handleAddFichier = () => {
    if (!fichierUrl.trim()) return;
    setFichiers((prev) => [
      ...prev,
      { nom: `Fichier-${prev.length + 1}`, url: fichierUrl.trim() },
    ]);
    setFichierUrl('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedClient) {
      setErrorMsg('Veuillez sélectionner un client.');
      setCurrentStep(1);
      return;
    }

    if (items.length === 0) {
      setErrorMsg('Veuillez ajouter au moins une prestation.');
      setCurrentStep(2);
      return;
    }

    const autoTitre =
      titre.trim() ||
      `${items[0].designation}${items.length > 1 ? ` (+${items.length - 1} autre(s))` : ''}`;

    setLoading(true);
    try {
      const payload = {
        client_id: selectedClient.id,
        titre: autoTitre,
        description: description.trim() || undefined,
        remise: Number(remise) || 0,
        acompte: Number(acompte) || 0,
        mode_acompte: modeAcompte,
        date_prevue: datePrevue ? new Date(datePrevue).toISOString() : null,
        date_retrait: dateRetrait ? new Date(dateRetrait).toISOString() : null,
        responsable: responsable.trim() || null,
        priorite,
        notes: notes.trim() || null,
        fichiers,
        items: items.map((it) => ({
          designation: it.designation,
          categorie: it.categorie,
          description: it.description,
          quantite: Number(it.quantite),
          prix_unitaire: Number(it.prix_unitaire),
          specifications: {
            format: it.format,
            matiere: it.matiere,
            couleur: it.couleur,
            finition: it.finition,
            grammage: it.grammage,
            recto_verso: it.recto_verso,
          },
        })),
      };

      const url = isEdit ? `/api/orders/${orderToEdit.id}` : '/api/orders';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Erreur lors de l’enregistrement de la commande.');
        return;
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur réseau.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh] my-auto animate-in fade-in zoom-in-95">
        {/* Header Modal */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600/10 text-emerald-700 flex items-center justify-center font-bold">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                {isEdit ? `Modifier la commande ${orderToEdit.numero_commande}` : 'Nouvelle commande & travaux'}
              </h3>
              <p className="text-xs text-slate-500">
                Assistant de création : client, prestations, tarification, planning et acompte
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

        {/* Barre de progression des 6 étapes */}
        <div className="px-6 py-2.5 bg-white border-b border-slate-200/80 flex items-center justify-between gap-1 text-[11px] overflow-x-auto">
          {[
            { num: 1, label: '1. Client' },
            { num: 2, label: '2. Prestations' },
            { num: 3, label: '3. Tarification' },
            { num: 4, label: '4. Planning' },
            { num: 5, label: '5. Notes & Fichiers' },
            { num: 6, label: '6. Confirmation' },
          ].map((s) => (
            <button
              key={s.num}
              type="button"
              onClick={() => setCurrentStep(s.num)}
              className={`px-3 py-1 rounded-xl font-bold transition-all whitespace-nowrap ${
                currentStep === s.num
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : currentStep > s.num
                  ? 'bg-emerald-50 text-emerald-800'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Corps formulaire */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ÉTAPE 1 : SÉLECTION DU CLIENT */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                  Sélectionnez le client pour cette commande
                </h4>
                <button
                  type="button"
                  onClick={() => setIsQuickClientOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-bold"
                >
                  <UserPlus className="w-3.5 h-3.5" /> + Créer rapidement un client
                </button>
              </div>

              {selectedClient ? (
                <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-emerald-800">Client sélectionné</span>
                    <p className="font-bold text-slate-900 text-sm mt-0.5">
                      {selectedClient.nom} {selectedClient.prenom || ''}
                    </p>
                    <p className="text-xs text-slate-600">
                      {selectedClient.entreprise && <span>{selectedClient.entreprise} • </span>}
                      Téléphone : <strong className="font-mono">{formatPhoneDisplay(selectedClient.telephone)}</strong>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedClient(null)}
                    className="text-xs text-emerald-700 font-bold hover:underline"
                  >
                    Changer de client
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                      placeholder="Tapez le nom, prénom, entreprise ou téléphone du client..."
                      className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>

                  {searchResults.length > 0 ? (
                    <div className="border border-slate-200 rounded-2xl divide-y divide-slate-100 overflow-hidden shadow-xs">
                      {searchResults.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => setSelectedClient(c)}
                          className="p-3 hover:bg-slate-50 flex items-center justify-between cursor-pointer transition-colors"
                        >
                          <div>
                            <span className="font-bold text-slate-900 text-xs">
                              {c.nom} {c.prenom || ''}
                            </span>
                            {c.entreprise && (
                              <span className="text-slate-500 ml-2">({c.entreprise})</span>
                            )}
                            <p className="text-[11px] text-slate-400 font-mono">
                              {formatPhoneDisplay(c.telephone)} • WhatsApp : {formatPhoneDisplay(c.whatsapp || c.telephone)}
                            </p>
                          </div>
                          <button
                            type="button"
                            className="px-3 py-1 bg-emerald-600 text-white rounded-lg font-bold text-xs"
                          >
                            Choisir
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : clientSearch.length >= 2 ? (
                    <p className="text-slate-400 text-xs p-2">Aucun client trouvé avec ce nom ou numéro.</p>
                  ) : null}
                </div>
              )}
            </div>
          )}

          {/* ÉTAPE 2 : PRESTATIONS ET LIGNES DE TRAVAUX */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                  Prestations commandées ({items.length})
                </h4>
                <button
                  type="button"
                  onClick={() => handleAddItem()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs"
                >
                  <Plus className="w-3.5 h-3.5" /> Ajouter une prestation
                </button>
              </div>

              {/* Raccourcis prestations fréquentes */}
              <div>
                <span className="block text-[11px] text-slate-500 mb-1.5">
                  Raccourcis produits rapides Canaan :
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {PREDEFINED_PRESTATIONS.slice(0, 8).map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => handleAddItem(p)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-[11px] transition-colors"
                    >
                      + {p.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Liste des lignes de prestations */}
              <div className="space-y-3">
                {items.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        required
                        value={item.designation}
                        onChange={(e) => handleUpdateItem(idx, 'designation', e.target.value)}
                        placeholder="Désignation du travail (ex: 100 Cartes de visite...)"
                        className="flex-1 font-bold text-slate-900 text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white"
                      />
                      <select
                        value={item.categorie}
                        onChange={(e) => handleUpdateItem(idx, 'categorie', e.target.value)}
                        className="text-xs px-2.5 py-2 rounded-xl border border-slate-200 bg-white"
                      >
                        <option value="Papeterie">Papeterie</option>
                        <option value="Publicité">Publicité</option>
                        <option value="Signalétique">Signalétique</option>
                        <option value="Textile">Textile</option>
                        <option value="Goodies">Goodies</option>
                        <option value="Packaging">Packaging</option>
                        <option value="Événementiel">Événementiel</option>
                        <option value="Studio Créatif">Studio Créatif</option>
                        <option value="Autre">Autre</option>
                      </select>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Quantité & Prix unitaire */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                      <div>
                        <label className="block text-[11px] text-slate-500 mb-0.5">Quantité</label>
                        <input
                          type="number"
                          min={1}
                          required
                          value={item.quantite}
                          onChange={(e) =>
                            handleUpdateItem(idx, 'quantite', Number(e.target.value))
                          }
                          className="w-full text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-200 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-500 mb-0.5">
                          Prix unitaire (F CFA)
                        </label>
                        <input
                          type="number"
                          min={0}
                          required
                          value={item.prix_unitaire}
                          onChange={(e) =>
                            handleUpdateItem(idx, 'prix_unitaire', Number(e.target.value))
                          }
                          className="w-full text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-200 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-500 mb-0.5">
                          Total ligne (F CFA)
                        </label>
                        <div className="w-full text-xs font-extrabold text-emerald-800 px-3 py-2 bg-emerald-50 rounded-lg border border-emerald-200">
                          {formatCFA(item.quantite * item.prix_unitaire)}
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-500 mb-0.5">Format / Taille</label>
                        <input
                          type="text"
                          value={item.format || ''}
                          onChange={(e) => handleUpdateItem(idx, 'format', e.target.value)}
                          placeholder="ex: A5, 2x1m, XL..."
                          className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                        />
                      </div>
                    </div>

                    {/* Spécifications additionnelles */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                      <div>
                        <input
                          type="text"
                          value={item.matiere || ''}
                          onChange={(e) => handleUpdateItem(idx, 'matiere', e.target.value)}
                          placeholder="Matière : Papier 350g, Bâche 510g..."
                          className="w-full text-[11px] px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          value={item.finition || ''}
                          onChange={(e) => handleUpdateItem(idx, 'finition', e.target.value)}
                          placeholder="Finition : Pelliculage mat, œillets..."
                          className="w-full text-[11px] px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          value={item.description || ''}
                          onChange={(e) => handleUpdateItem(idx, 'description', e.target.value)}
                          placeholder="Consignes particulières atelier..."
                          className="w-full text-[11px] px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ÉTAPE 3 : TARIFICATION, REMISE & ACOMPTE */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-in fade-in">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                Tarification, remise et acompte
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-slate-500 text-[11px]">Sous-total brut</span>
                  <p className="text-lg font-bold text-slate-800 mt-0.5">{formatCFA(sousTotal)}</p>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Remise commerciale (F CFA)</label>
                  <input
                    type="number"
                    min={0}
                    value={remise}
                    onChange={(e) => setRemise(Number(e.target.value))}
                    className="w-full text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-300 bg-white"
                  />
                </div>
                <div>
                  <span className="text-emerald-800 font-bold text-[11px]">Montant Net Total</span>
                  <p className="text-xl font-extrabold text-emerald-800 mt-0.5">{formatCFA(total)}</p>
                </div>
              </div>

              {/* Acompte initial */}
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="font-bold text-slate-900 text-xs">Acompte versé à la commande</h5>
                    <p className="text-[11px] text-slate-500">
                      Génère automatiquement une quittance de paiement réelle dans PostgreSQL
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setAcompte(Math.round(total * 0.5))}
                      className="px-2.5 py-1 bg-white border border-emerald-300 text-emerald-800 rounded-lg text-xs font-bold"
                    >
                      50% ({formatCFA(Math.round(total * 0.5))})
                    </button>
                    <button
                      type="button"
                      onClick={() => setAcompte(total)}
                      className="px-2.5 py-1 bg-emerald-700 text-white rounded-lg text-xs font-bold"
                    >
                      Totalité
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-700 font-semibold mb-1">
                      Montant de l'acompte (F CFA)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={total}
                      value={acompte}
                      onChange={(e) => setAcompte(Number(e.target.value))}
                      className="w-full text-sm font-bold px-3 py-2 rounded-xl border border-slate-300 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-700 font-semibold mb-1">
                      Mode d'encaissement
                    </label>
                    <select
                      value={modeAcompte}
                      onChange={(e) => setModeAcompte(e.target.value as PaymentMode)}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 bg-white"
                    >
                      {PAYMENT_MODES.map((m) => (
                        <option key={m.key} value={m.key}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-emerald-200/60 text-xs">
                  <span className="font-semibold text-slate-600">Solde restant dû à la livraison :</span>
                  <span className="text-base font-extrabold text-rose-700">{formatCFA(solde)}</span>
                </div>
              </div>
            </div>
          )}

          {/* ÉTAPE 4 : PLANNING & RESPONSABLE */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-in fade-in">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                Planning, délais et responsable
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Intitulé / Titre de la commande *
                  </label>
                  <input
                    type="text"
                    required
                    value={titre}
                    onChange={(e) => setTitre(e.target.value)}
                    placeholder="ex: 100 Cartes de visite + 50 Flyers A5"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Niveau de priorité</label>
                  <select
                    value={priorite}
                    onChange={(e) => setPriorite(e.target.value as OrderPriority)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white"
                  >
                    {ORDER_PRIORITIES.map((p) => (
                      <option key={p.key} value={p.key}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Date prévue de disponibilité *
                  </label>
                  <input
                    type="date"
                    required
                    value={datePrevue}
                    onChange={(e) => setDatePrevue(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white"
                  />
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Sert d'indicateur pour la détection automatique de retard.
                  </p>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Date de retrait souhaitée par le client
                  </label>
                  <input
                    type="date"
                    value={dateRetrait}
                    onChange={(e) => setDateRetrait(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Opérateur ou Responsable du travail (Atelier)
                  </label>
                  <input
                    type="text"
                    value={responsable}
                    onChange={(e) => setResponsable(e.target.value)}
                    placeholder="ex: Moussa (Graphisme), Sékou (Atelier découpe)..."
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ÉTAPE 5 : NOTES & FICHIERS */}
          {currentStep === 5 && (
            <div className="space-y-4 animate-in fade-in">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                Notes d'atelier et fichiers de référence
              </h4>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Instructions détaillées & Notes d'impression
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Consignes couleur, rainage, emballage particulier, délais..."
                  className="w-full text-xs p-3 rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Liens vers fichiers maquettes / PDF / Cloud
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={fichierUrl}
                    onChange={(e) => setFichierUrl(e.target.value)}
                    placeholder="https://drive.google.com/... ou URL maquette"
                    className="flex-1 text-xs px-3 py-2 rounded-xl border border-slate-200"
                  />
                  <button
                    type="button"
                    onClick={handleAddFichier}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 rounded-xl"
                  >
                    Ajouter
                  </button>
                </div>
              </div>

              {fichiers.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-600">Fichiers rattachés :</span>
                  {fichiers.map((f, i) => (
                    <div
                      key={i}
                      className="p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                    >
                      <span className="truncate max-w-sm">{f.url}</span>
                      <button
                        type="button"
                        onClick={() => setFichiers((prev) => prev.filter((_, idx) => idx !== i))}
                        className="text-rose-600 font-bold"
                      >
                        Retirer
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ÉTAPE 6 : RÉSUMÉ & CONFIRMATION */}
          {currentStep === 6 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0" />
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Prêt pour enregistrement</h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Un numéro officiel sera généré automatiquement (CMD-2026-XXXXXX).
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400">Client :</span>
                  <p className="font-bold text-slate-900">
                    {selectedClient?.nom} {selectedClient?.prenom || ''}
                  </p>
                  <p className="text-slate-500 font-mono">{selectedClient?.telephone}</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400">Totalité & Acompte :</span>
                  <p className="font-bold text-emerald-800">Total : {formatCFA(total)}</p>
                  <p className="text-slate-700">Acompte : {formatCFA(acompte)}</p>
                  <p className="font-bold text-rose-700">Reste à payer : {formatCFA(solde)}</p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <span className="text-slate-400 block mb-1">Prestations incluses ({items.length}) :</span>
                <ul className="list-disc list-inside space-y-0.5 text-slate-700 font-medium">
                  {items.map((it, idx) => (
                    <li key={idx}>
                      {it.quantite}x {it.designation} — {formatCFA(it.quantite * it.prix_unitaire)}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Footer de navigation */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((s) => s - 1)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50"
              >
                <ChevronLeft className="w-4 h-4" /> Précédent
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50"
              >
                Annuler
              </button>
            )}

            {currentStep < 6 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((s) => s + 1)}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs transition-colors"
              >
                Suivant <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {loading ? 'Création en cours...' : isEdit ? 'Mettre à jour' : 'Valider la commande'}
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Modal Création Rapide Client */}
      <ClientFormModal
        isOpen={isQuickClientOpen}
        onClose={() => setIsQuickClientOpen(false)}
        onSaved={() => {
          setIsQuickClientOpen(false);
          // Actualiser la recherche
          if (clientSearch) {
            fetch(`/api/clients?search=${encodeURIComponent(clientSearch)}&limit=1`)
              .then((r) => r.json())
              .then((d) => {
                if (d.clients?.[0]) setSelectedClient(d.clients[0]);
              });
          }
        }}
      />
    </div>
  );
};
