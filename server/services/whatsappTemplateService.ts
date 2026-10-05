/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { pgPool, supabase } from '../config/database.ts';

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

export interface WhatsAppMetaTemplateRecord {
  id: string;
  name: string;
  display_name: string;
  language: string;
  category: MetaTemplateCategory;
  body: string;
  variables_json: TemplateVariable[];
  meta_template_id: string | null;
  meta_status: MetaTemplateStatus;
  active: boolean;
  created_at: string;
  updated_at: string;
}

// Les 10 modèles initiaux conformes au cahier des charges Canaan Services
export const INITIAL_WHATSAPP_TEMPLATES: Array<
  Omit<WhatsAppMetaTemplateRecord, 'id' | 'created_at' | 'updated_at'>
> = [
  {
    name: 'travail_pret',
    display_name: 'Travail prêt pour retrait',
    language: 'fr',
    category: 'UTILITY',
    body: `Bonjour {{1}},

Votre travail « {{2}} » est prêt chez Canaan Services.

Votre retrait est prévu le {{3}} à {{4}}.

Reste à payer : {{5}} F CFA.

Merci et à bientôt chez Canaan Services.`,
    variables_json: [
      { index: 1, name: 'prénom client', example: 'Jean' },
      { index: 2, name: 'travail ou commande', example: '100 cartes de visite pelliculées' },
      { index: 3, name: 'date', example: '02/10/2026' },
      { index: 4, name: 'heure', example: '15h30' },
      { index: 5, name: 'reste à payer', example: '10 000' },
    ],
    meta_template_id: null,
    meta_status: 'DRAFT',
    active: true,
  },
  {
    name: 'confirmation_rendez_vous',
    display_name: 'Confirmation de rendez-vous',
    language: 'fr',
    category: 'UTILITY',
    body: `Bonjour {{1}},

Votre rendez-vous avec Canaan Services est confirmé pour le {{2}} à {{3}}.

Objet : {{4}}

Lieu : {{5}}

Merci de nous prévenir en cas d’empêchement.`,
    variables_json: [
      { index: 1, name: 'prénom', example: 'Amina' },
      { index: 2, name: 'date', example: '03/10/2026' },
      { index: 3, name: 'heure', example: '10h00' },
      { index: 4, name: 'motif', example: 'Briefing création logo et enseigne' },
      { index: 5, name: 'lieu', example: 'Agence Canaan Services, Cocody' },
    ],
    meta_template_id: null,
    meta_status: 'DRAFT',
    active: true,
  },
  {
    name: 'rappel_rendez_vous_j1',
    display_name: 'Rappel de rendez-vous (J-1)',
    language: 'fr',
    category: 'UTILITY',
    body: `Bonjour {{1}},

Petit rappel : votre rendez-vous chez Canaan Services est prévu demain, le {{2}} à {{3}}.

Travail concerné : {{4}}

À bientôt.`,
    variables_json: [
      { index: 1, name: 'prénom', example: 'Marc' },
      { index: 2, name: 'date', example: '03/10/2026' },
      { index: 3, name: 'heure', example: '14h30' },
      { index: 4, name: 'travail', example: "Validation de l'épreuve bâche grand format" },
    ],
    meta_template_id: null,
    meta_status: 'DRAFT',
    active: true,
  },
  {
    name: 'rappel_rendez_vous_jour_j',
    display_name: 'Rappel de rendez-vous (Jour J)',
    language: 'fr',
    category: 'UTILITY',
    body: `Bonjour {{1}},

Nous vous rappelons votre rendez-vous prévu aujourd’hui à {{2}} chez Canaan Services.

Travail concerné : {{3}}

Merci.`,
    variables_json: [
      { index: 1, name: 'prénom', example: 'Marc' },
      { index: 2, name: 'heure', example: '14h30' },
      { index: 3, name: 'travail', example: "Validation de l'épreuve bâche grand format" },
    ],
    meta_template_id: null,
    meta_status: 'DRAFT',
    active: true,
  },
  {
    name: 'rendez_vous_manque',
    display_name: 'Rendez-vous manqué',
    language: 'fr',
    category: 'UTILITY',
    body: `Bonjour {{1}},

Nous avons constaté que votre rendez-vous prévu le {{2}} à {{3}} n’a pas pu avoir lieu.

Vous pouvez nous contacter pour fixer un nouveau rendez-vous.

Canaan Services.`,
    variables_json: [
      { index: 1, name: 'prénom', example: 'Sarah' },
      { index: 2, name: 'date', example: '01/10/2026' },
      { index: 3, name: 'heure', example: '11h00' },
    ],
    meta_template_id: null,
    meta_status: 'DRAFT',
    active: true,
  },
  {
    name: 'remerciement_retrait',
    display_name: 'Remerciement après retrait',
    language: 'fr',
    category: 'UTILITY',
    body: `Bonjour {{1}},

Merci d’avoir choisi Canaan Services.

Votre commande {{2}} a bien été retirée.

Nous restons disponibles pour vos prochains travaux d’impression et de personnalisation.

À bientôt.`,
    variables_json: [
      { index: 1, name: 'prénom', example: 'Kouamé' },
      { index: 2, name: 'numéro ou nom de commande', example: 'CMD-2026-0842 (Tee-shirts sérigraphiés)' },
    ],
    meta_template_id: null,
    meta_status: 'DRAFT',
    active: true,
  },
  {
    name: 'paiement_recu',
    display_name: 'Confirmation de paiement reçu',
    language: 'fr',
    category: 'UTILITY',
    body: `Bonjour {{1}},

Nous confirmons la réception de votre paiement de {{2}} F CFA pour la commande {{3}}.

Reste à payer : {{4}} F CFA.

Merci pour votre confiance.`,
    variables_json: [
      { index: 1, name: 'prénom', example: 'David' },
      { index: 2, name: 'montant payé', example: '35 000' },
      { index: 3, name: 'commande', example: 'CMD-2026-0915' },
      { index: 4, name: 'solde', example: '15 000' },
    ],
    meta_template_id: null,
    meta_status: 'DRAFT',
    active: true,
  },
  {
    name: 'commande_en_production',
    display_name: 'Commande en cours de production',
    language: 'fr',
    category: 'UTILITY',
    body: `Bonjour {{1}},

Votre commande {{2}} est actuellement en production.

Date prévue de disponibilité : {{3}}.

Nous vous informerons dès qu’elle sera prête.

Canaan Services.`,
    variables_json: [
      { index: 1, name: 'prénom', example: 'Esther' },
      { index: 2, name: 'commande', example: '500 Dépliants 3 volets vernis sélectif' },
      { index: 3, name: 'date prévue', example: '05/10/2026' },
    ],
    meta_template_id: null,
    meta_status: 'DRAFT',
    active: true,
  },
  {
    name: 'validation_maquette',
    display_name: 'Validation de maquette requise',
    language: 'fr',
    category: 'UTILITY',
    body: `Bonjour {{1}},

Votre maquette pour la commande {{2}} est prête pour validation.

Merci de nous confirmer votre accord avant le lancement en production.

Canaan Services.`,
    variables_json: [
      { index: 1, name: 'prénom', example: 'Gilles' },
      { index: 2, name: 'commande', example: 'CMD-2026-0930 (Roll-up et Kakémono)' },
    ],
    meta_template_id: null,
    meta_status: 'DRAFT',
    active: true,
  },
  {
    name: 'promotion_canaan',
    display_name: 'Offre promotionnelle Canaan',
    language: 'fr',
    category: 'MARKETING',
    body: `Bonjour {{1}},

Canaan Services vous présente son offre du moment :

{{2}}

Valable jusqu’au {{3}}.

Pour plus d’informations, répondez directement à ce message.`,
    variables_json: [
      { index: 1, name: 'prénom', example: 'Isabelle' },
      { index: 2, name: 'offre', example: "-20% sur l'impression de calendriers et agendas 2027 à partir de 50 exemplaires" },
      { index: 3, name: 'date de fin', example: '31/10/2026' },
    ],
    meta_template_id: null,
    meta_status: 'DRAFT',
    active: true,
  },
];

// Cache mémoire local
let inMemoryTemplates: WhatsAppMetaTemplateRecord[] = [];

export class WhatsAppTemplateService {
  private apiVersion: string;
  private wabaId: string;
  private accessToken: string;
  private initialized = false;

  constructor() {
    this.apiVersion = process.env.WHATSAPP_API_VERSION || 'v21.0';
    this.wabaId =
      process.env.WHATSAPP_WABA_ID ||
      process.env.WHATSAPP_BUSINESS_ACCOUNT_ID ||
      process.env.META_WABA_ID ||
      '';
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN || '';
  }

  /**
   * Assure l'initialisation et le peuplement des 10 modèles initiaux
   */
  public async ensureSeeded(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    // 1. Initialisation en mémoire
    if (inMemoryTemplates.length === 0) {
      inMemoryTemplates = INITIAL_WHATSAPP_TEMPLATES.map((tpl, i) => ({
        ...tpl,
        id: `tpl_local_${i + 1}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
    }

    // 2. Initialisation dans PostgreSQL / Supabase
    if (pgPool) {
      try {
        const countRes = await pgPool.query('SELECT COUNT(*) FROM whatsapp_templates');
        const count = parseInt(countRes.rows[0].count, 10);

        if (count === 0) {
          console.log('[TemplateService] Ensemencement des 10 modèles initiaux dans PostgreSQL...');
          for (const tpl of INITIAL_WHATSAPP_TEMPLATES) {
            await pgPool.query(
              `INSERT INTO whatsapp_templates (name, display_name, language, category, body, variables_json, meta_status, active)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
               ON CONFLICT (name) DO NOTHING`,
              [
                tpl.name,
                tpl.display_name,
                tpl.language,
                tpl.category,
                tpl.body,
                JSON.stringify(tpl.variables_json),
                tpl.meta_status,
                tpl.active,
              ]
            );
          }
          console.log('[TemplateService] 10 modèles initiaux insérés avec succès.');
        }
      } catch (err) {
        console.warn('[TemplateService] Erreur lors du peuplement PostgreSQL :', err);
      }
    }
  }

  /**
   * Liste tous les modèles enregistrés
   */
  public async listTemplates(): Promise<WhatsAppMetaTemplateRecord[]> {
    await this.ensureSeeded();

    if (pgPool) {
      try {
        const result = await pgPool.query(
          `SELECT id, name, display_name, language, category, body, variables_json, meta_template_id, meta_status, active, created_at, updated_at
           FROM whatsapp_templates
           ORDER BY created_at ASC`
        );
        return result.rows.map((row) => ({
          ...row,
          variables_json:
            typeof row.variables_json === 'string'
              ? JSON.parse(row.variables_json)
              : row.variables_json || [],
        }));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[TemplateService] Erreur critique lecture PostgreSQL :', msg);
        throw new Error(`[Database Error] Échec de lecture des modèles PostgreSQL : ${msg}`);
      }
    }

    return inMemoryTemplates;
  }

  /**
   * Récupère un modèle par son ID
   */
  public async getTemplateById(id: string): Promise<WhatsAppMetaTemplateRecord | null> {
    await this.ensureSeeded();

    if (pgPool) {
      try {
        const result = await pgPool.query(
          `SELECT id, name, display_name, language, category, body, variables_json, meta_template_id, meta_status, active, created_at, updated_at
           FROM whatsapp_templates
           WHERE id = $1`,
          [id]
        );
        if (result.rows.length === 0) return null;
        const row = result.rows[0];
        return {
          ...row,
          variables_json:
            typeof row.variables_json === 'string'
              ? JSON.parse(row.variables_json)
              : row.variables_json || [],
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[TemplateService] Erreur critique recherche PostgreSQL :', msg);
        throw new Error(`[Database Error] Échec de recherche du modèle : ${msg}`);
      }
    }

    return inMemoryTemplates.find((t) => t.id === id) || null;
  }

  /**
   * Récupère un modèle par son nom technique Meta
   */
  public async getTemplateByName(name: string): Promise<WhatsAppMetaTemplateRecord | null> {
    await this.ensureSeeded();

    if (pgPool) {
      try {
        const result = await pgPool.query(
          `SELECT id, name, display_name, language, category, body, variables_json, meta_template_id, meta_status, active, created_at, updated_at
           FROM whatsapp_templates
           WHERE name = $1`,
          [name]
        );
        if (result.rows.length === 0) return null;
        const row = result.rows[0];
        return {
          ...row,
          variables_json:
            typeof row.variables_json === 'string'
              ? JSON.parse(row.variables_json)
              : row.variables_json || [],
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[TemplateService] Erreur critique recherche par nom PostgreSQL :', msg);
        throw new Error(`[Database Error] Échec de recherche du modèle : ${msg}`);
      }
    }

    return inMemoryTemplates.find((t) => t.name === name) || null;
  }

  /**
   * Crée un nouveau modèle en brouillon local
   */
  public async createDraft(data: {
    name: string;
    display_name: string;
    language?: string;
    category: MetaTemplateCategory;
    body: string;
    variables_json: TemplateVariable[];
  }): Promise<WhatsAppMetaTemplateRecord> {
    await this.ensureSeeded();

    // Normalisation stricte du nom technique : minuscules, sans accents, sans espaces, underscores
    const normalizedName = data.name
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_');

    const language = data.language || 'fr';

    if (pgPool) {
      try {
        const result = await pgPool.query(
          `INSERT INTO whatsapp_templates (name, display_name, language, category, body, variables_json, meta_status, active)
           VALUES ($1, $2, $3, $4, $5, $6, 'DRAFT', true)
           RETURNING *`,
          [
            normalizedName,
            data.display_name,
            language,
            data.category,
            data.body,
            JSON.stringify(data.variables_json),
          ]
        );
        const row = result.rows[0];
        return {
          ...row,
          variables_json:
            typeof row.variables_json === 'string'
              ? JSON.parse(row.variables_json)
              : row.variables_json || [],
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[TemplateService] Erreur critique création PostgreSQL :', msg);
        throw new Error(`[Database Error] Échec d'insertion du modèle : ${msg}`);
      }
    }

    const newRecord: WhatsAppMetaTemplateRecord = {
      id: `tpl_local_${Date.now()}`,
      name: normalizedName,
      display_name: data.display_name,
      language,
      category: data.category,
      body: data.body,
      variables_json: data.variables_json,
      meta_template_id: null,
      meta_status: 'DRAFT',
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    inMemoryTemplates.push(newRecord);
    return newRecord;
  }

  /**
   * Modifie un modèle existant
   */
  public async updateTemplate(
    id: string,
    data: Partial<{
      display_name: string;
      category: MetaTemplateCategory;
      body: string;
      variables_json: TemplateVariable[];
      language: string;
      active: boolean;
      meta_status: MetaTemplateStatus;
    }>
  ): Promise<WhatsAppMetaTemplateRecord | null> {
    await this.ensureSeeded();

    const current = await this.getTemplateById(id);
    if (!current) return null;

    const updatedDisplayName = data.display_name ?? current.display_name;
    const updatedCategory = data.category ?? current.category;
    const updatedBody = data.body ?? current.body;
    const updatedVars = data.variables_json ?? current.variables_json;
    const updatedLang = data.language ?? current.language;
    const updatedActive = data.active ?? current.active;
    const updatedStatus = data.meta_status ?? current.meta_status;

    if (pgPool) {
      try {
        const result = await pgPool.query(
          `UPDATE whatsapp_templates
           SET display_name = $1, category = $2, body = $3, variables_json = $4, language = $5, active = $6, meta_status = $7, updated_at = NOW()
           WHERE id = $8
           RETURNING *`,
          [
            updatedDisplayName,
            updatedCategory,
            updatedBody,
            JSON.stringify(updatedVars),
            updatedLang,
            updatedActive,
            updatedStatus,
            id,
          ]
        );
        if (result.rows.length === 0) return null;
        const row = result.rows[0];
        return {
          ...row,
          variables_json:
            typeof row.variables_json === 'string'
              ? JSON.parse(row.variables_json)
              : row.variables_json || [],
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[TemplateService] Erreur critique mise à jour PostgreSQL :', msg);
        throw new Error(`[Database Error] Échec de mise à jour du modèle : ${msg}`);
      }
    }

    const updatedInMemory: WhatsAppMetaTemplateRecord = {
      ...current,
      display_name: updatedDisplayName,
      category: updatedCategory,
      body: updatedBody,
      variables_json: updatedVars,
      language: updatedLang,
      active: updatedActive,
      meta_status: updatedStatus,
      updated_at: new Date().toISOString(),
    };
    const memIdx = inMemoryTemplates.findIndex((t) => t.id === id);
    if (memIdx >= 0) inMemoryTemplates[memIdx] = updatedInMemory;
    return updatedInMemory;
  }

  /**
   * Soumission officielle d'un modèle à Meta pour approbation
   * Utilise POST /v21.0/{whatsapp-business-account-id}/message_templates
   */
  public async submitTemplateToMeta(id: string): Promise<{
    success: boolean;
    template?: WhatsAppMetaTemplateRecord;
    metaResponse?: unknown;
    error?: string;
  }> {
    const template = await this.getTemplateById(id);
    if (!template) {
      return { success: false, error: 'Modèle introuvable.' };
    }

    // Récupération de l'identifiant WABA
    const wabaId =
      process.env.WHATSAPP_WABA_ID ||
      process.env.WHATSAPP_BUSINESS_ACCOUNT_ID ||
      process.env.META_WABA_ID ||
      this.wabaId;

    if (!wabaId) {
      return {
        success: false,
        error:
          "Identifiant de compte WhatsApp Business (WABA ID) non configuré sur le serveur (WHATSAPP_WABA_ID ou WHATSAPP_BUSINESS_ACCOUNT_ID requis).",
      };
    }

    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN || this.accessToken;
    if (!accessToken) {
      return {
        success: false,
        error: "Token d'accès WhatsApp non configuré (WHATSAPP_ACCESS_TOKEN requis).",
      };
    }

    const apiVersion = process.env.WHATSAPP_API_VERSION || this.apiVersion || 'v21.0';

    // Préparation des exemples pour les variables Meta numérotées
    const exampleValues = template.variables_json.map(
      (v) => v.example || `Exemple ${v.index}`
    );

    // Structure officielle Meta Graph API
    const metaPayload: Record<string, unknown> = {
      name: template.name,
      category: template.category,
      language: template.language || 'fr',
      components: [
        {
          type: 'BODY',
          text: template.body,
          ...(exampleValues.length > 0
            ? {
                example: {
                  body_text: [exampleValues],
                },
              }
            : {}),
        },
      ],
    };

    try {
      console.log(`[TemplateService] Soumission du modèle « ${template.name} » à Meta...`, {
        wabaId,
        category: template.category,
      });

      const response = await fetch(
        `https://graph.facebook.com/${apiVersion}/${wabaId}/message_templates`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(metaPayload),
        }
      );

      const responseData = await response.json();

      if (!response.ok) {
        const errorMessage =
          responseData?.error?.message ||
          responseData?.error?.error_user_msg ||
          'Erreur de rejet lors de la soumission Meta.';
        console.error('[TemplateService] Erreur soumission Meta :', responseData?.error);
        return {
          success: false,
          error: `Erreur Meta : ${errorMessage}`,
          metaResponse: responseData,
        };
      }

      // Meta renvoie { id: "123456789", status: "PENDING" }
      const metaId = responseData?.id ? String(responseData.id) : null;
      const metaStatus: MetaTemplateStatus =
        responseData?.status === 'APPROVED' ? 'APPROVED' : 'PENDING';

      // Mise à jour locale du statut
      if (pgPool) {
        await pgPool.query(
          `UPDATE whatsapp_templates
           SET meta_template_id = $1, meta_status = $2, updated_at = NOW()
           WHERE id = $3`,
          [metaId, metaStatus, id]
        );
      }

      const updated = await this.getTemplateById(id);
      return {
        success: true,
        template: updated || template,
        metaResponse: responseData,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur réseau inconnue';
      console.error('[TemplateService] Exception soumission Meta :', msg);
      return { success: false, error: msg };
    }
  }

  /**
   * Synchronise les statuts des modèles avec Meta Cloud API
   */
  public async syncWithMeta(): Promise<{
    success: boolean;
    syncedCount: number;
    details: Array<{ name: string; status: string }>;
    error?: string;
  }> {
    const wabaId =
      process.env.WHATSAPP_WABA_ID ||
      process.env.WHATSAPP_BUSINESS_ACCOUNT_ID ||
      process.env.META_WABA_ID ||
      this.wabaId;

    if (!wabaId) {
      return {
        success: false,
        syncedCount: 0,
        details: [],
        error: "WABA ID non configuré pour la synchronisation Meta (WHATSAPP_WABA_ID requis).",
      };
    }

    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN || this.accessToken;
    if (!accessToken) {
      return {
        success: false,
        syncedCount: 0,
        details: [],
        error: "Token d'accès WhatsApp non configuré (WHATSAPP_ACCESS_TOKEN requis).",
      };
    }

    const apiVersion = process.env.WHATSAPP_API_VERSION || this.apiVersion || 'v21.0';

    try {
      const response = await fetch(
        `https://graph.facebook.com/${apiVersion}/${wabaId}/message_templates?limit=100`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const data = await response.json();
      if (!response.ok) {
        return {
          success: false,
          syncedCount: 0,
          details: [],
          error: data?.error?.message || 'Erreur lors de la synchronisation Meta',
        };
      }

      const metaTemplates: Array<{ id: string; name: string; status: string }> =
        data.data || [];
      const synced: Array<{ name: string; status: string }> = [];

      for (const metaTpl of metaTemplates) {
        let mappedStatus: MetaTemplateStatus = 'PENDING';
        if (metaTpl.status === 'APPROVED') mappedStatus = 'APPROVED';
        else if (metaTpl.status === 'REJECTED') mappedStatus = 'REJECTED';
        else if (metaTpl.status === 'PAUSED') mappedStatus = 'PAUSED';
        else if (metaTpl.status === 'DISABLED') mappedStatus = 'DISABLED';

        if (pgPool) {
          const res = await pgPool.query(
            `UPDATE whatsapp_templates
             SET meta_status = $1, meta_template_id = $2, updated_at = NOW()
             WHERE name = $3`,
            [mappedStatus, metaTpl.id, metaTpl.name]
          );
          if (res.rowCount && res.rowCount > 0) {
            synced.push({ name: metaTpl.name, status: mappedStatus });
          }
        }
      }

      return {
        success: true,
        syncedCount: synced.length,
        details: synced,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur de connexion';
      return { success: false, syncedCount: 0, details: [], error: msg };
    }
  }

  /**
   * Bascule l'état actif/inactif d'un modèle
   */
  public async toggleActive(id: string, active: boolean): Promise<WhatsAppMetaTemplateRecord | null> {
    return this.updateTemplate(id, { active });
  }

  /**
   * Met à jour le statut (ex: DRAFT, PENDING, APPROVED...)
   */
  public async updateStatus(id: string, status: MetaTemplateStatus): Promise<WhatsAppMetaTemplateRecord | null> {
    return this.updateTemplate(id, { meta_status: status });
  }
}

export const whatsappTemplateService = new WhatsAppTemplateService();
