/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Constantes et helpers centralisés pour le module Commandes & Travaux de Canaan Services
 */

export type OrderStatus =
  | 'COMMANDE_RECUE'
  | 'EN_CONCEPTION'
  | 'ATTENTE_VALIDATION'
  | 'VALIDEE'
  | 'EN_PRODUCTION'
  | 'EN_IMPRESSION'
  | 'EN_FINITION'
  | 'PRETE'
  | 'RENDEZ_VOUS_PROGRAMME'
  | 'RETIREE'
  | 'ANNULEE';

export type OrderPriority = 'NORMALE' | 'URGENTE' | 'TRES_URGENTE';

export type PaymentMode =
  | 'ESPECES'
  | 'WAVE'
  | 'ORANGE_MONEY'
  | 'MTN_MONEY'
  | 'MOOV_MONEY'
  | 'VIREMENT'
  | 'AUTRE';

export interface OrderStatusMeta {
  key: OrderStatus;
  label: string;
  step: number;
  description: string;
  allowedTransitions: OrderStatus[];
  suggestedTemplate?: string;
  badge: {
    bg: string;
    text: string;
    border: string;
  };
}

export const ORDER_STATUS_MAP: Record<OrderStatus, OrderStatusMeta> = {
  COMMANDE_RECUE: {
    key: 'COMMANDE_RECUE',
    label: 'Commande reçue',
    step: 1,
    description: 'Commande enregistrée, dossier ouvert',
    allowedTransitions: ['EN_CONCEPTION', 'VALIDEE', 'EN_PRODUCTION', 'ANNULEE'],
    badge: {
      bg: 'bg-slate-100',
      text: 'text-slate-800',
      border: 'border-slate-300',
    },
  },
  EN_CONCEPTION: {
    key: 'EN_CONCEPTION',
    label: 'En conception graphique',
    step: 2,
    description: 'Création du visuel, mise en page ou adaptation maquette',
    allowedTransitions: ['ATTENTE_VALIDATION', 'VALIDEE', 'ANNULEE'],
    suggestedTemplate: 'validation_maquette',
    badge: {
      bg: 'bg-indigo-50',
      text: 'text-indigo-800',
      border: 'border-indigo-300',
    },
  },
  ATTENTE_VALIDATION: {
    key: 'ATTENTE_VALIDATION',
    label: 'Attente validation maquette',
    step: 3,
    description: 'BAT / Maquette transmise au client, en attente de confirmation',
    allowedTransitions: ['VALIDEE', 'EN_CONCEPTION', 'ANNULEE'],
    suggestedTemplate: 'validation_maquette',
    badge: {
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-300',
    },
  },
  VALIDEE: {
    key: 'VALIDEE',
    label: 'Maquette validée',
    step: 4,
    description: 'Bon à tirer approuvé par le client, prêt pour production',
    allowedTransitions: ['EN_PRODUCTION', 'EN_IMPRESSION', 'ANNULEE'],
    suggestedTemplate: 'commande_en_production',
    badge: {
      bg: 'bg-sky-50',
      text: 'text-sky-800',
      border: 'border-sky-300',
    },
  },
  EN_PRODUCTION: {
    key: 'EN_PRODUCTION',
    label: 'En production',
    step: 5,
    description: 'Travaux préparatoires et assemblage en cours dans l atelier',
    allowedTransitions: ['EN_IMPRESSION', 'EN_FINITION', 'PRETE', 'ANNULEE'],
    suggestedTemplate: 'commande_en_production',
    badge: {
      bg: 'bg-blue-50',
      text: 'text-blue-800',
      border: 'border-blue-300',
    },
  },
  EN_IMPRESSION: {
    key: 'EN_IMPRESSION',
    label: 'En impression',
    step: 6,
    description: 'Tirage machine en cours (numérique, offset, traceur bâche, sérigraphie)',
    allowedTransitions: ['EN_FINITION', 'PRETE', 'ANNULEE'],
    badge: {
      bg: 'bg-purple-50',
      text: 'text-purple-800',
      border: 'border-purple-300',
    },
  },
  EN_FINITION: {
    key: 'EN_FINITION',
    label: 'En finition & façonnage',
    step: 7,
    description: 'Découpe, massicotage, pelliculage, œillets ou conditionnement',
    allowedTransitions: ['PRETE', 'ANNULEE'],
    badge: {
      bg: 'bg-teal-50',
      text: 'text-teal-800',
      border: 'border-teal-300',
    },
  },
  PRETE: {
    key: 'PRETE',
    label: 'Prête pour retrait',
    step: 8,
    description: 'Travail terminé, contrôlé et disponible au comptoir de retrait',
    allowedTransitions: ['RENDEZ_VOUS_PROGRAMME', 'RETIREE', 'ANNULEE'],
    suggestedTemplate: 'travail_pret',
    badge: {
      bg: 'bg-emerald-100',
      text: 'text-emerald-900',
      border: 'border-emerald-300',
    },
  },
  RENDEZ_VOUS_PROGRAMME: {
    key: 'RENDEZ_VOUS_PROGRAMME',
    label: 'Retrait planifié',
    step: 9,
    description: 'Rendez-vous convenu avec le client pour le retrait en agence',
    allowedTransitions: ['RETIREE', 'PRETE', 'ANNULEE'],
    suggestedTemplate: 'confirmation_rendez_vous',
    badge: {
      bg: 'bg-cyan-100',
      text: 'text-cyan-900',
      border: 'border-cyan-300',
    },
  },
  RETIREE: {
    key: 'RETIREE',
    label: 'Commande retirée',
    step: 10,
    description: 'Commande remise au client, dossier clos',
    allowedTransitions: [],
    suggestedTemplate: 'remerciement_retrait',
    badge: {
      bg: 'bg-slate-200',
      text: 'text-slate-800',
      border: 'border-slate-300',
    },
  },
  ANNULEE: {
    key: 'ANNULEE',
    label: 'Commande annulée',
    step: -1,
    description: 'Commande interrompue ou annulée',
    allowedTransitions: ['COMMANDE_RECUE'], // réouverture exceptionnelle
    badge: {
      bg: 'bg-rose-100',
      text: 'text-rose-900',
      border: 'border-rose-300',
    },
  },
};

/**
 * Ordre chronologique standard des étapes d'une commande
 */
export const ORDER_WORKFLOW_STEPS: OrderStatus[] = [
  'COMMANDE_RECUE',
  'EN_CONCEPTION',
  'ATTENTE_VALIDATION',
  'VALIDEE',
  'EN_PRODUCTION',
  'EN_IMPRESSION',
  'EN_FINITION',
  'PRETE',
  'RENDEZ_VOUS_PROGRAMME',
  'RETIREE',
];

/**
 * Vérifie si une transition de statut est autorisée
 */
export function isTransitionAllowed(current: OrderStatus, target: OrderStatus): boolean {
  if (current === target) return true;
  const meta = ORDER_STATUS_MAP[current];
  if (!meta) return true;
  return meta.allowedTransitions.includes(target);
}

/**
 * Helper centralisé : Indique si une commande est en retard
 * Règle : date_prevue < maintenant ET statut n'est pas dans PRETE, RENDEZ_VOUS_PROGRAMME, RETIREE, ANNULEE
 */
export function isOrderLate(datePrevue: string | Date | null | undefined, statut: OrderStatus | string): boolean {
  if (!datePrevue) return false;
  const terminalStatuses = ['PRETE', 'RENDEZ_VOUS_PROGRAMME', 'RETIREE', 'ANNULEE'];
  if (terminalStatuses.includes(statut)) return false;

  const targetDate = new Date(datePrevue);
  if (isNaN(targetDate.getTime())) return false;

  return targetDate.getTime() < Date.now();
}

/**
 * Formatage d'un montant en Francs CFA pour l'affichage (ex: "25 000 F CFA")
 */
export function formatCFA(amount: number | string | null | undefined): string {
  const num = Number(amount) || 0;
  return `${num.toLocaleString('fr-FR')} F CFA`;
}

/**
 * Prestations courantes de Canaan Services
 */
export const PREDEFINED_PRESTATIONS = [
  { name: 'Cartes de visite', categorie: 'Papeterie', defaultPrice: 15000, defaultQty: 100 },
  { name: 'Flyers A5', categorie: 'Publicité', defaultPrice: 20000, defaultQty: 250 },
  { name: 'Bâches PVC grand format', categorie: 'Signalétique', defaultPrice: 12000, defaultQty: 1 },
  { name: 'Affiches A3 / A2', categorie: 'Publicité', defaultPrice: 8000, defaultQty: 10 },
  { name: 'Prospectus & Dépliants', categorie: 'Publicité', defaultPrice: 35000, defaultQty: 500 },
  { name: 'Tee-shirts personnalisés', categorie: 'Textile', defaultPrice: 4500, defaultQty: 10 },
  { name: 'Polos brodés', categorie: 'Textile', defaultPrice: 7500, defaultQty: 5 },
  { name: 'Casquettes personnalisées', categorie: 'Goodies', defaultPrice: 3500, defaultQty: 10 },
  { name: 'Tasses / Mugs personnalisés', categorie: 'Goodies', defaultPrice: 3000, defaultQty: 5 },
  { name: 'Porte-clés publicitaires', categorie: 'Goodies', defaultPrice: 1000, defaultQty: 50 },
  { name: 'Médailles & Trophées', categorie: 'Événementiel', defaultPrice: 15000, defaultQty: 1 },
  { name: 'Stickers & Étiquettes adhésives', categorie: 'Packaging', defaultPrice: 15000, defaultQty: 100 },
  { name: 'Invitations & Faire-part', categorie: 'Papeterie', defaultPrice: 25000, defaultQty: 50 },
  { name: 'Carnets & Blocs-notes autocopiants', categorie: 'Papeterie', defaultPrice: 30000, defaultQty: 10 },
  { name: 'Personnalisation textile', categorie: 'Textile', defaultPrice: 5000, defaultQty: 1 },
  { name: 'Conception graphique & Logo', categorie: 'Studio Créatif', defaultPrice: 25000, defaultQty: 1 },
  { name: 'Autre prestation', categorie: 'Autre', defaultPrice: 0, defaultQty: 1 },
];

/**
 * Options de priorités
 */
export const ORDER_PRIORITIES: Array<{ key: OrderPriority; label: string; badgeClass: string }> = [
  { key: 'NORMALE', label: 'Priorité Normale', badgeClass: 'bg-slate-100 text-slate-700 border-slate-300' },
  { key: 'URGENTE', label: 'Priorité Urgente', badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 font-bold' },
  { key: 'TRES_URGENTE', label: 'Très Urgente (Express)', badgeClass: 'bg-rose-100 text-rose-900 border-rose-400 font-bold animate-pulse' },
];

/**
 * Options de modes de paiement
 */
export const PAYMENT_MODES: Array<{ key: PaymentMode; label: string }> = [
  { key: 'ESPECES', label: 'Espèces (Caisse)' },
  { key: 'WAVE', label: 'Wave Mobile Money' },
  { key: 'ORANGE_MONEY', label: 'Orange Money Côte d’Ivoire' },
  { key: 'MTN_MONEY', label: 'MTN Mobile Money' },
  { key: 'MOOV_MONEY', label: 'Moov Money' },
  { key: 'VIREMENT', label: 'Virement bancaire' },
  { key: 'AUTRE', label: 'Autre mode de règlement' },
];
