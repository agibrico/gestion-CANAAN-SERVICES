/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { pgPool } from '../config/database.ts';
import { normalizePhoneNumber } from '../utils/phoneUtils.ts';
import { whatsAppService } from './whatsapp.service.ts';

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
  | 'Autre';

export interface ClientRecord {
  id: string;
  nom: string;
  prenom: string;
  entreprise: string | null;
  telephone: string;
  whatsapp: string;
  email: string | null;
  ville: string;
  quartier: string | null;
  adresse: string | null;
  categorie: ClientCategory;
  statut_client: ClientStatus;
  consentement_whatsapp: boolean;
  consentement_whatsapp_date: string | null;
  consentement_whatsapp_source: string | null;
  centres_interet: string[];
  notes: string | null;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientListParams {
  search?: string;
  status?: string;
  category?: string;
  consent?: string;
  page?: number;
  limit?: number;
}

export class ClientService {
  /**
   * Vérifie l'existence d'un doublon par téléphone, whatsapp ou email
   */
  public async checkDuplicate(params: {
    telephone: string;
    whatsapp?: string;
    email?: string;
    excludeId?: string;
  }): Promise<{ isDuplicate: boolean; existingClient: Partial<ClientRecord> | null }> {
    if (!pgPool) return { isDuplicate: false, existingClient: null };

    const normTel = normalizePhoneNumber(params.telephone);
    const normWa = params.whatsapp ? normalizePhoneNumber(params.whatsapp) : normTel;
    const email = params.email ? params.email.trim().toLowerCase() : null;

    let query = `
      SELECT id, nom, prenom, entreprise, telephone, whatsapp, email, statut_client
      FROM clients
      WHERE (
        whatsapp = $1 OR telephone = $1
        OR whatsapp = $2 OR telephone = $2
        ${email ? 'OR LOWER(email) = $3' : ''}
      )
    `;
    const queryParams: any[] = [normTel, normWa];
    if (email) {
      queryParams.push(email);
    }

    if (params.excludeId) {
      query += ` AND id != $${queryParams.length + 1}`;
      queryParams.push(params.excludeId);
    }

    query += ` LIMIT 1`;

    const res = await pgPool.query(query, queryParams);
    if (res.rows.length > 0) {
      return { isDuplicate: true, existingClient: res.rows[0] };
    }
    return { isDuplicate: false, existingClient: null };
  }

  /**
   * Liste paginée des clients avec filtres et recherche
   */
  public async listClients(params: ClientListParams) {
    if (!pgPool) throw new Error('[ClientService] PostgreSQL non disponible.');

    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(10, Number(params.limit) || 20));
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const values: any[] = [];
    let valIndex = 1;

    // Filtre recherche textuelle
    if (params.search && params.search.trim()) {
      const q = `%${params.search.trim().toLowerCase()}%`;
      const normDigits = params.search.replace(/\D/g, '');

      conditions.push(`(
        LOWER(nom) LIKE $${valIndex}
        OR LOWER(prenom) LIKE $${valIndex}
        OR LOWER(COALESCE(entreprise, '')) LIKE $${valIndex}
        OR LOWER(COALESCE(email, '')) LIKE $${valIndex}
        ${normDigits.length >= 4 ? `OR telephone LIKE $${valIndex + 1} OR whatsapp LIKE $${valIndex + 1}` : ''}
      )`);
      values.push(q);
      valIndex++;
      if (normDigits.length >= 4) {
        values.push(`%${normDigits}%`);
        valIndex++;
      }
    }

    // Filtre statut
    if (params.status && params.status !== 'ALL') {
      conditions.push(`statut_client = $${valIndex}`);
      values.push(params.status);
      valIndex++;
    }

    // Filtre catégorie
    if (params.category && params.category !== 'ALL') {
      conditions.push(`categorie = $${valIndex}`);
      values.push(params.category);
      valIndex++;
    }

    // Filtre consentement
    if (params.consent && params.consent !== 'ALL') {
      const isConsent = params.consent === 'true' || params.consent === '1';
      conditions.push(`consentement_whatsapp = $${valIndex}`);
      values.push(isConsent);
      valIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 1. Compte total filtré
    const countRes = await pgPool.query(
      `SELECT COUNT(*) FROM clients ${whereClause}`,
      values
    );
    const total = parseInt(countRes.rows[0].count, 10);

    // 2. Sélection des données avec pagination
    const dataQuery = `
      SELECT 
        c.*,
        COALESCE(
          (SELECT COUNT(*) FROM orders o WHERE o.client_id = c.id),
          0
        )::int AS total_commandes,
        COALESCE(
          (SELECT SUM(o.montant_total) FROM orders o WHERE o.client_id = c.id),
          0
        )::numeric AS total_facture,
        COALESCE(
          (SELECT SUM(o.solde_restant) FROM orders o WHERE o.client_id = c.id),
          0
        )::numeric AS solde_restant,
        (
          SELECT wm.date_envoi 
          FROM whatsapp_messages wm 
          WHERE wm.client_id = c.id OR wm.telephone = c.whatsapp OR wm.telephone = c.telephone
          ORDER BY wm.date_envoi DESC 
          LIMIT 1
        ) AS derniere_interaction_whatsapp
      FROM clients c
      ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT $${valIndex} OFFSET $${valIndex + 1}
    `;

    const dataRes = await pgPool.query(dataQuery, [...values, limit, offset]);

    // 3. Statistiques globales pour les cartes CRM
    const statsRes = await pgPool.query(`
      SELECT
        COUNT(*) AS total_clients,
        COUNT(*) FILTER (WHERE statut_client = 'ACTIF') AS clients_actifs,
        COUNT(*) FILTER (WHERE statut_client = 'NOUVEAU') AS nouveaux_clients,
        COUNT(*) FILTER (WHERE statut_client = 'VIP') AS clients_vip,
        COUNT(*) FILTER (WHERE consentement_whatsapp = true) AS consentement_actif
      FROM clients
      WHERE statut_client != 'ARCHIVE'
    `);

    const stats = statsRes.rows[0];

    return {
      clients: dataRes.rows.map((row) => ({
        ...row,
        centres_interet: Array.isArray(row.centres_interet)
          ? row.centres_interet
          : typeof row.centres_interet === 'string'
          ? JSON.parse(row.centres_interet)
          : [],
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
      stats: {
        totalClients: parseInt(stats.total_clients, 10) || 0,
        clientsActifs: parseInt(stats.clients_actifs, 10) || 0,
        nouveauxClients: parseInt(stats.nouveaux_clients, 10) || 0,
        clientsVIP: parseInt(stats.clients_vip, 10) || 0,
        consentementActif: parseInt(stats.consentement_actif, 10) || 0,
      },
    };
  }

  /**
   * Détails complets d'un client
   */
  public async getClientById(id: string) {
    if (!pgPool) throw new Error('[ClientService] PostgreSQL non disponible.');

    const res = await pgPool.query(`SELECT * FROM clients WHERE id = $1`, [id]);
    if (res.rows.length === 0) return null;

    const client = res.rows[0];

    // Synthèse financière & commandes
    const ordersRes = await pgPool.query(
      `SELECT 
        COUNT(*)::int AS count,
        COALESCE(SUM(montant_total), 0)::numeric AS total_facture,
        COALESCE(SUM(acompte), 0)::numeric AS total_paye,
        COALESCE(SUM(solde_restant), 0)::numeric AS solde_restant
       FROM orders WHERE client_id = $1`,
      [id]
    );

    // Prochain rendez-vous
    const aptRes = await pgPool.query(
      `SELECT id, date, heure, motif, lieu, statut
       FROM appointments
       WHERE client_id = $1 AND statut = 'PLANIFIE' AND date >= CURRENT_DATE
       ORDER BY date ASC, heure ASC
       LIMIT 1`,
      [id]
    );

    // Dernier message WhatsApp
    const waRes = await pgPool.query(
      `SELECT id, contenu_texte, statut, date_envoi
       FROM whatsapp_messages
       WHERE client_id = $1 OR telephone = $2 OR telephone = $3
       ORDER BY date_envoi DESC
       LIMIT 1`,
      [id, client.whatsapp, client.telephone]
    );

    return {
      ...client,
      centres_interet: Array.isArray(client.centres_interet)
        ? client.centres_interet
        : typeof client.centres_interet === 'string'
        ? JSON.parse(client.centres_interet)
        : [],
      metrics: {
        nombreCommandes: ordersRes.rows[0].count || 0,
        totalFacture: Number(ordersRes.rows[0].total_facture) || 0,
        totalPaye: Number(ordersRes.rows[0].total_paye) || 0,
        soldeRestant: Number(ordersRes.rows[0].solde_restant) || 0,
        prochainRdv: aptRes.rows[0] || null,
        derniereInteractionWhatsApp: waRes.rows[0] || null,
      },
    };
  }

  /**
   * Création d'un nouveau client avec détection de doublons et journalisation
   */
  public async createClient(data: {
    nom: string;
    prenom?: string;
    entreprise?: string;
    telephone: string;
    whatsapp?: string;
    email?: string;
    ville?: string;
    quartier?: string;
    adresse?: string;
    categorie?: ClientCategory;
    statut_client?: ClientStatus;
    consentement_whatsapp?: boolean;
    consentement_whatsapp_source?: string;
    centres_interet?: string[];
    notes?: string;
    forceDuplicate?: boolean;
    agentName?: string;
  }): Promise<{ success: boolean; client?: ClientRecord; error?: string; duplicate?: any }> {
    if (!pgPool) throw new Error('[ClientService] PostgreSQL non disponible.');

    // 1. Normalisation des numéros
    const normTel = normalizePhoneNumber(data.telephone);
    const normWa = data.whatsapp ? normalizePhoneNumber(data.whatsapp) : normTel;

    // 2. Détection de doublons (sauf si forcé)
    if (!data.forceDuplicate) {
      const dup = await this.checkDuplicate({
        telephone: normTel,
        whatsapp: normWa,
        email: data.email,
      });

      if (dup.isDuplicate) {
        return {
          success: false,
          error: 'Un client avec ce numéro ou cet email existe déjà.',
          duplicate: dup.existingClient,
        };
      }
    }

    const consent = Boolean(data.consentement_whatsapp);
    const consentDate = consent ? new Date().toISOString() : null;
    const consentSource = data.consentement_whatsapp_source || 'FORMULAIRE';

    // 3. Insertion
    const insertRes = await pgPool.query(
      `INSERT INTO clients (
        nom, prenom, entreprise, telephone, whatsapp, email,
        ville, quartier, adresse, categorie, statut_client,
        consentement_whatsapp, consentement_whatsapp_date, consentement_whatsapp_source,
        centres_interet, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        data.nom.trim(),
        (data.prenom || '').trim(),
        data.entreprise ? data.entreprise.trim() : null,
        normTel,
        normWa,
        data.email ? data.email.trim().toLowerCase() : null,
        data.ville || 'Abidjan',
        data.quartier || null,
        data.adresse || null,
        data.categorie || 'Particulier',
        data.statut_client || 'NOUVEAU',
        consent,
        consentDate,
        consentSource,
        JSON.stringify(data.centres_interet || []),
        data.notes || null,
      ]
    );

    const client: ClientRecord = insertRes.rows[0];

    // 4. Journalisation dans activity_logs
    const agent = data.agentName || 'Agent Canaan CRM';
    await pgPool.query(
      `INSERT INTO activity_logs (client_id, action, details, utilisateur, date_action)
       VALUES ($1, $2, $3, $4, NOW())`,
      [
        client.id,
        'CLIENT_CREE',
        `Création de la fiche client : ${client.nom} ${client.prenom}${client.entreprise ? ` (${client.entreprise})` : ''}`,
        agent,
      ]
    );

    if (consent) {
      await pgPool.query(
        `INSERT INTO activity_logs (client_id, action, details, utilisateur, date_action)
         VALUES ($1, $2, $3, $4, NOW())`,
        [
          client.id,
          'CONSENTEMENT_ACTIVE',
          `Consentement WhatsApp activé (source : ${consentSource})`,
          agent,
        ]
      );
    }

    return { success: true, client };
  }

  /**
   * Modification d'un client existant
   */
  public async updateClient(
    id: string,
    data: Partial<{
      nom: string;
      prenom: string;
      entreprise: string;
      telephone: string;
      whatsapp: string;
      email: string;
      ville: string;
      quartier: string;
      adresse: string;
      categorie: ClientCategory;
      statut_client: ClientStatus;
      consentement_whatsapp: boolean;
      consentement_whatsapp_source: string;
      centres_interet: string[];
      notes: string;
      agentName?: string;
    }>
  ) {
    if (!pgPool) throw new Error('[ClientService] PostgreSQL non disponible.');

    const currentRes = await pgPool.query(`SELECT * FROM clients WHERE id = $1`, [id]);
    if (currentRes.rows.length === 0) return null;
    const current: ClientRecord = currentRes.rows[0];

    const normTel = data.telephone ? normalizePhoneNumber(data.telephone) : current.telephone;
    const normWa = data.whatsapp ? normalizePhoneNumber(data.whatsapp) : current.whatsapp;

    const consentChanged =
      data.consentement_whatsapp !== undefined &&
      data.consentement_whatsapp !== current.consentement_whatsapp;

    const newConsent =
      data.consentement_whatsapp !== undefined
        ? Boolean(data.consentement_whatsapp)
        : current.consentement_whatsapp;

    const consentDate = consentChanged
      ? new Date().toISOString()
      : current.consentement_whatsapp_date;

    const consentSource = data.consentement_whatsapp_source || current.consentement_whatsapp_source;

    const updateRes = await pgPool.query(
      `UPDATE clients SET
        nom = COALESCE($1, nom),
        prenom = COALESCE($2, prenom),
        entreprise = $3,
        telephone = $4,
        whatsapp = $5,
        email = $6,
        ville = COALESCE($7, ville),
        quartier = $8,
        adresse = $9,
        categorie = COALESCE($10, categorie),
        statut_client = COALESCE($11, statut_client),
        consentement_whatsapp = $12,
        consentement_whatsapp_date = $13,
        consentement_whatsapp_source = $14,
        centres_interet = COALESCE($15, centres_interet),
        notes = $16,
        updated_at = NOW()
       WHERE id = $17
       RETURNING *`,
      [
        data.nom ? data.nom.trim() : null,
        data.prenom !== undefined ? data.prenom.trim() : null,
        data.entreprise !== undefined ? data.entreprise.trim() : current.entreprise,
        normTel,
        normWa,
        data.email !== undefined ? (data.email ? data.email.trim().toLowerCase() : null) : current.email,
        data.ville,
        data.quartier !== undefined ? data.quartier : current.quartier,
        data.adresse !== undefined ? data.adresse : current.adresse,
        data.categorie,
        data.statut_client,
        newConsent,
        consentDate,
        consentSource,
        data.centres_interet ? JSON.stringify(data.centres_interet) : null,
        data.notes !== undefined ? data.notes : current.notes,
        id,
      ]
    );

    const updated: ClientRecord = updateRes.rows[0];
    const agent = data.agentName || 'Agent Canaan CRM';

    // Journalisation des changements de consentement
    if (consentChanged) {
      const action = newConsent ? 'CONSENTEMENT_ACTIVE' : 'CONSENTEMENT_RETIRE';
      const details = newConsent
        ? `Consentement WhatsApp activé (source : ${consentSource || 'Agent'})`
        : `Consentement WhatsApp retiré par l'agent`;

      await pgPool.query(
        `INSERT INTO activity_logs (client_id, action, details, utilisateur, date_action)
         VALUES ($1, $2, $3, $4, NOW())`,
        [id, action, details, agent]
      );
    }

    // Journalisation du statut si modifié
    if (data.statut_client && data.statut_client !== current.statut_client) {
      await pgPool.query(
        `INSERT INTO activity_logs (client_id, action, details, utilisateur, date_action)
         VALUES ($1, $2, $3, $4, NOW())`,
        [
          id,
          'CLIENT_STATUT_CHANGE',
          `Statut modifié : ${current.statut_client} ➔ ${data.statut_client}`,
          agent,
        ]
      );
    }

    // Journalisation générale
    await pgPool.query(
      `INSERT INTO activity_logs (client_id, action, details, utilisateur, date_action)
       VALUES ($1, $2, $3, $4, NOW())`,
      [id, 'CLIENT_MODIFIE', `Mise à jour des informations du client`, agent]
    );

    return updated;
  }

  /**
   * Changement de statut ou archivage logique d'un client
   */
  public async updateStatus(id: string, statut: ClientStatus, agentName?: string) {
    if (!pgPool) throw new Error('[ClientService] PostgreSQL non disponible.');

    const res = await pgPool.query(
      `UPDATE clients SET statut_client = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [statut, id]
    );
    if (res.rows.length === 0) return null;

    const action = statut === 'ARCHIVE' ? 'CLIENT_ARCHIVE' : 'CLIENT_STATUT_CHANGE';
    await pgPool.query(
      `INSERT INTO activity_logs (client_id, action, details, utilisateur, date_action)
       VALUES ($1, $2, $3, $4, NOW())`,
      [id, action, `Statut mis à jour : ${statut}`, agentName || 'Agent Canaan CRM']
    );

    return res.rows[0];
  }

  /**
   * Récupère la chronologie d'activité (activity_logs) d'un client
   */
  public async getClientActivity(clientId: string) {
    if (!pgPool) throw new Error('[ClientService] PostgreSQL non disponible.');

    const res = await pgPool.query(
      `SELECT * FROM activity_logs 
       WHERE client_id = $1 
       ORDER BY date_action DESC 
       LIMIT 100`,
      [clientId]
    );
    return res.rows;
  }

  /**
   * Récupère l'historique des messages WhatsApp d'un client
   */
  public async getClientWhatsAppMessages(clientId: string) {
    if (!pgPool) throw new Error('[ClientService] PostgreSQL non disponible.');

    const clientRes = await pgPool.query(`SELECT telephone, whatsapp FROM clients WHERE id = $1`, [clientId]);
    if (clientRes.rows.length === 0) return [];
    const client = clientRes.rows[0];

    const res = await pgPool.query(
      `SELECT * FROM whatsapp_messages 
       WHERE client_id = $1 OR telephone = $2 OR telephone = $3
       ORDER BY date_envoi DESC
       LIMIT 100`,
      [clientId, client.whatsapp, client.telephone]
    );
    return res.rows;
  }

  /**
   * Récupère l'historique des règlements / paiements d'un client avec liaison commandes
   */
  public async getClientPayments(clientId: string) {
    if (!pgPool) throw new Error('[ClientService] PostgreSQL non disponible.');

    const res = await pgPool.query(
      `SELECT p.*, o.numero_commande, o.titre AS order_titre
       FROM payments p
       LEFT JOIN orders o ON o.id = p.order_id
       WHERE p.client_id = $1
       ORDER BY p.date_paiement DESC, p.created_at DESC`,
      [clientId]
    );

    return res.rows.map((r) => ({
      ...r,
      montant: Number(r.montant) || 0,
    }));
  }

  /**
   * Envoi sécurisé d'un message WhatsApp à un client
   */
  public async sendWhatsAppMessage(params: {
    clientId: string;
    type: 'text' | 'template';
    text?: string;
    templateName?: string;
    templateVariables?: Record<string, string>;
    agentName?: string;
  }) {
    if (!pgPool) throw new Error('[ClientService] PostgreSQL non disponible.');

    const clientRes = await pgPool.query(`SELECT * FROM clients WHERE id = $1`, [params.clientId]);
    if (clientRes.rows.length === 0) {
      return { success: false, error: 'Client introuvable.' };
    }
    const client: ClientRecord = clientRes.rows[0];

    // Vérification du consentement WhatsApp
    if (!client.consentement_whatsapp && params.type === 'template') {
      // Si modèle marketing, blocage strict
      return {
        success: false,
        error:
          "Envoi impossible : ce client n'a pas donné son consentement WhatsApp préalable (requis pour les communications proactives).",
      };
    }

    const recipientPhone = client.whatsapp || client.telephone;
    if (!recipientPhone) {
      return { success: false, error: 'Numéro WhatsApp du client non renseigné.' };
    }

    let metaRes;
    let messageText = '';

    if (params.type === 'text') {
      if (!params.text || !params.text.trim()) {
        return { success: false, error: 'Le texte du message est obligatoire.' };
      }
      messageText = params.text.trim();
      metaRes = await whatsAppService.sendTextMessage({
        to: recipientPhone,
        text: messageText,
      });
    } else {
      if (!params.templateName) {
        return { success: false, error: 'Nom du modèle WhatsApp requis.' };
      }

      // Vérifier le modèle dans la base
      const tplRes = await pgPool.query(
        `SELECT * FROM whatsapp_templates WHERE name = $1`,
        [params.templateName]
      );

      if (tplRes.rows.length === 0) {
        return { success: false, error: `Modèle « ${params.templateName} » introuvable.` };
      }

      const tpl = tplRes.rows[0];
      if (tpl.meta_status !== 'APPROVED') {
        return {
          success: false,
          error: `Le modèle « ${tpl.display_name} » a le statut ${tpl.meta_status}. Seuls les modèles approuvés (APPROVED) par Meta peuvent être expédiés.`,
        };
      }

      // Préparation du rendu textuel pour archive
      let rendered = tpl.body;
      const vars = params.templateVariables || {};
      Object.keys(vars).forEach((key) => {
        rendered = rendered.replaceAll(`{{${key}}}`, vars[key]);
      });
      messageText = rendered;

      const varValues = Object.values(vars);
      const components = varValues.length > 0
        ? [
            {
              type: 'body' as const,
              parameters: varValues.map((v) => ({ type: 'text' as const, text: String(v) })),
            },
          ]
        : undefined;

      // Envoi Meta Cloud API
      metaRes = await whatsAppService.sendTemplateMessage({
        to: recipientPhone,
        templateName: params.templateName,
        languageCode: tpl.language || 'fr',
        components,
      });
    }

    if (!metaRes.success) {
      return { success: false, error: metaRes.error || "Échec de l'envoi WhatsApp Meta." };
    }

    const metaMsgId = metaRes.messageId || `msg_sim_${Date.now()}`;
    const now = new Date().toISOString();

    // Enregistrement dans whatsapp_messages
    await pgPool.query(
      `INSERT INTO whatsapp_messages (
        client_id, telephone, contenu_texte, meta_message_id, statut, date_envoi
      ) VALUES ($1, $2, $3, $4, 'ENVOYE', $5)`,
      [client.id, recipientPhone, messageText, metaMsgId, now]
    );

    // Enregistrement dans activity_logs
    await pgPool.query(
      `INSERT INTO activity_logs (
        client_id, action, details, utilisateur, date_action
      ) VALUES ($1, 'MESSAGE_MANUEL_ENVOYE', $2, $3, $4)`,
      [
        client.id,
        params.type === 'template'
          ? `Modèle WhatsApp « ${params.templateName} » expédié`
          : `Message WhatsApp envoyé : "${messageText.slice(0, 100)}"`,
        params.agentName || 'Agent Canaan CRM',
        now,
      ]
    );

    return {
      success: true,
      messageId: metaMsgId,
      renderedText: messageText,
    };
  }
}

export const clientService = new ClientService();
