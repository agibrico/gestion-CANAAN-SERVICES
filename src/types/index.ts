/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// ==========================================
// RÔLES ET AUTHENTIFICATION
// ==========================================

export type UserRole = 'ADMINISTRATEUR' | 'AGENT' | 'CAISSIER';

export interface User {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  actif: boolean;
  derniereConnexion?: string;
  createdAt: string;
}

// ==========================================
// CLIENTS ET PROSPECTS
// ==========================================

export type ClientStatus =
  | 'PROSPECT'
  | 'NOUVEAU'
  | 'ACTIF'
  | 'REGULIER'
  | 'VIP'
  | 'INACTIF'
  | 'ARCHIVE';

export type ClientCategory =
  | 'Particulier'
  | 'Entreprise'
  | 'École'
  | 'Église'
  | 'Association'
  | 'ONG'
  | 'Administration'
  | 'Commerce'
  | 'Autre'
  | string;

export interface ClientRecord {
  id: string;
  nom: string;
  prenom: string;
  entreprise?: string | null;
  telephone: string;
  whatsapp: string;
  email?: string | null;
  ville: string;
  quartier?: string | null;
  adresse?: string | null;
  categorie: ClientCategory;
  statut_client: ClientStatus;
  consentement_whatsapp: boolean;
  consentement_whatsapp_date?: string | null;
  consentement_whatsapp_source?: string | null;
  centres_interet: string[];
  notes?: string | null;
  photo_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  nom: string;
  prenom: string;
  entreprise?: string;
  telephone: string;       // Format Côte d'Ivoire: +225 07 00 00 00 00
  whatsapp: string;        // Numéro international Meta: 2250700000000
  email?: string;
  ville: string;           // ex: Abidjan
  quartier?: string;       // ex: Cocody Angré, Yopougon, Plateau...
  adresse?: string;
  categorie: ClientCategory;
  dateAjout: string;
  notes?: string;
  consentementWhatsApp: boolean;
  statutClient: ClientStatus;
  centresInteret: string[]; // ex: ['Flyers', 'Tee-shirts', 'Bâches', 'Cartes de visite']
  photoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClientSummary extends Client {
  totalCommandes: number;
  totalFacture: number;
  totalPaye: number;
  soldeRestant: number;
  derniereCommandeDate?: string;
  prochainRendezVous?: Appointment;
  nombreRetraits: number;
}

// ==========================================
// SERVICES ET PRODUITS (CATALOGUE)
// ==========================================

export interface ProductService {
  id: string;
  nom: string;
  categorie: string;       // ex: Impression papier, Textile, Signalétique, Objets publicitaires
  description: string;
  image?: string;
  prixIndicatif?: number;  // En F CFA
  actif: boolean;
}

// ==========================================
// COMMANDES
// ==========================================

export type OrderStatus =
  | 'RECUE'                 // Commande reçue
  | 'CONCEPTION'            // En conception
  | 'ATTENTE_VALIDATION'    // En attente de validation maquette
  | 'VALIDEE'               // Maquette validée
  | 'PRODUCTION'            // En production
  | 'IMPRESSION'            // En impression
  | 'FINITION'              // En finition
  | 'PRETE'                 // Prête pour retrait
  | 'RDV_PROGRAMME'         // Rendez-vous programmé
  | 'RETIREE'               // Retirée par le client
  | 'ANNULEE';              // Annulée

export interface OrderItem {
  id: string;
  designation: string;
  quantite: number;
  prixUnitaire: number;
  montantTotal: number;
  specifications?: string; // ex: format A5, 350g mat, pelliculage brillant
}

export interface Order {
  id: string;
  numero: string;          // Ex: CMD-2026-0001
  clientId: string;
  clientNom: string;
  clientTelephone: string;
  service: string;         // Ex: T-shirts personnalisés, Flyers A5
  description: string;
  quantite: number;
  prixUnitaire: number;
  montantTotal: number;    // F CFA
  acompte: number;         // F CFA
  resteAPayer: number;     // F CFA (montantTotal - somme des paiements)
  dateCommande: string;    // ISO string YYYY-MM-DD
  datePrevue: string;      // Date livraison promise
  responsable: string;     // Agent ou graphiste en charge
  notes?: string;
  fichiers?: string[];     // URLs maquettes / bons à tirer
  statut: OrderStatus;
  items?: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// RENDEZ-VOUS & ALERTES
// ==========================================

export type AppointmentType =
  | 'RETRAIT'
  | 'VALIDATION_MAQUETTE'
  | 'DEPOT_FICHIERS'
  | 'PAIEMENT'
  | 'CONSULTATION'
  | 'AUTRE';

export type AppointmentStatus =
  | 'A_CONFIRMER'
  | 'CONFIRME'
  | 'TERMINE'
  | 'ANNULE';

export type AppointmentAlertState =
  | 'AUJOURDHUI'
  | 'DEMAIN'
  | 'A_VENIR'
  | 'EN_RETARD'
  | 'PASSE';

export interface Appointment {
  id: string;
  clientId: string;
  clientNom: string;
  clientTelephone: string;
  clientWhatsApp: string;
  commandeId?: string;
  commandeNumero?: string;
  date: string;            // YYYY-MM-DD
  heure: string;           // HH:mm (24h)
  lieu: string;            // ex: Atelier Canaan Services Plateau / Siège
  motif: AppointmentType;
  responsable: string;
  travailConcerne: string; // Description succincte
  montantRestant: number;  // F CFA
  statut: AppointmentStatus;
  notes?: string;

  // Traçabilité des rappels WhatsApp
  confirmationEnvoyee: boolean;
  rappelJ1Envoye: boolean;
  rappelJourJEnvoye: boolean;
  messageRetardEnvoye: boolean;

  // Retrait effectif
  retireLe?: string;
  retirePar?: string;      // Nom du membre de Canaan Services ayant remis le travail
  soldeRegleAuRetrait?: number;

  createdAt: string;
  updatedAt: string;
}

export interface AppointmentWithAlert extends Appointment {
  alertState: AppointmentAlertState;
  minutesDiff: number;     // Différence par rapport à maintenant
}

// ==========================================
// PAIEMENTS ET CAISSE
// ==========================================

export type PaymentMethod =
  | 'ESPECES'
  | 'WAVE'
  | 'ORANGE_MONEY'
  | 'MTN_MONEY'
  | 'MOOV_MONEY'
  | 'VIREMENT'
  | 'AUTRE';

export interface Payment {
  id: string;
  commandeId: string;
  commandeNumero: string;
  clientId: string;
  clientNom: string;
  montant: number;         // En F CFA
  date: string;            // YYYY-MM-DD HH:mm
  modePaiement: PaymentMethod;
  referenceTransaction?: string; // ex: Wave TXN ID, N° reçu Orange Money
  caissier: string;
  recuNumero: string;      // Ex: REC-2026-0042
  notes?: string;
  createdAt: string;
}

// ==========================================
// PUBLICITÉS ET MÉDIAS
// ==========================================

export interface AdMedia {
  id: string;
  titre: string;
  imageUrl: string;
  description: string;
  categorie: string;       // ex: Promo fin d'année, Spécial Pâques, Pack Entreprise
  dateAjout: string;
  actif: boolean;
}

// ==========================================
// WHATSAPP CLOUD API & CAMPAGNES
// ==========================================

export type WhatsAppMessageStatus =
  | 'EN_ATTENTE'
  | 'ENVOYE'
  | 'LIVRE'
  | 'LU'
  | 'ECHEC';

export type MetaTemplateCategory = 'UTILITY' | 'MARKETING' | 'AUTHENTICATION';

export type MetaTemplateStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'PAUSED'
  | 'DISABLED';

export interface TemplateVariable {
  index: number;
  name: string;
  example: string;
}

export interface WhatsAppMetaTemplate {
  id: string;
  name: string;
  displayName: string;
  language: string;
  category: MetaTemplateCategory;
  body: string;
  variables: TemplateVariable[];
  metaTemplateId?: string | null;
  metaStatus: MetaTemplateStatus;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WhatsAppTemplate {
  id: string;
  code: string;            // ex: 'canaan_travail_pret', 'canaan_rappel_rdv_j1'
  nom: string;
  categorie: 'UTILITAIRE' | 'MARKETING' | 'AUTHENTIFICATION';
  contenu: string;
  variables: string[];     // ex: ['prenom', 'commande', 'date', 'heure', 'reste']
  description: string;
}

export interface WhatsAppCampaign {
  id: string;
  titre: string;
  mediaId?: string;
  mediaUrl?: string;
  messageTexte: string;
  filtreCible: {
    statutClient?: ClientStatus[];
    categories?: ClientCategory[];
    centresInteret?: string[];
    uniquementConsentants: boolean;
  };
  totalDestinataires: number;
  totalEnvoyes: number;
  totalEchecs: number;
  statut: 'BROUILLON' | 'EN_COURS' | 'TERMINEE' | 'ANNULEE';
  dateCreation: string;
  dateEnvoi?: string;
  auteur: string;
}

export interface WhatsAppMessageLog {
  id: string;
  clientId: string;
  clientNom: string;
  telephone: string;
  templateCode?: string;
  campagneId?: string;
  contenuTexte: string;
  imageUrl?: string;
  statut: WhatsAppMessageStatus;
  metaMessageId?: string;
  erreur?: string;
  dateEnvoi: string;
}

// ==========================================
// TIMELINE & HISTORIQUE D'ACTIVITÉ
// ==========================================

export type ActivityAction =
  | 'CLIENT_CREE'
  | 'CLIENT_MODIFIE'
  | 'COMMANDE_CREEE'
  | 'COMMANDE_STATUT_CHANGE'
  | 'ACOMPTE_ENCAISSE'
  | 'PAIEMENT_SOLDE'
  | 'MAQUETTE_ENVOYEE'
  | 'MAQUETTE_VALIDEE'
  | 'TRAVAIL_PRET'
  | 'RDV_PROGRAMME'
  | 'RDV_CONFIRME'
  | 'RAPPEL_WHATSAPP_ENVOYE'
  | 'TRAVAIL_RETIRE'
  | 'MESSAGE_MANUEL_ENVOYE';

export interface ActivityLog {
  id: string;
  clientId: string;
  commandeId?: string;
  rendezVousId?: string;
  date: string;            // YYYY-MM-DD
  heure: string;           // HH:mm:ss
  utilisateur: string;     // Nom de l'agent / caissier / admin
  action: ActivityAction;
  details: string;
  badgeType?: 'info' | 'success' | 'warning' | 'primary' | 'danger';
}

// ==========================================
// STATISTIQUES DASHBOARD
// ==========================================

export interface DashboardMetrics {
  totalClients: number;
  nouveauxClientsMois: number;
  totalProspects: number;
  commandesEnCours: number;
  travauxPrets: number;
  rdvAujourdhui: number;
  rdvDemain: number;
  rdvEnRetard: number;
  travauxRetiresMois: number;
  montantEncaisseMois: number; // F CFA
  resteAEncaisserTotal: number; // F CFA
  campagnesActives: number;
  messagesEnvoyesMois: number;
}
