/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { pgPool } from '../config/database.ts';
import {
  type OrderStatus,
  type OrderPriority,
  type PaymentMode,
  isTransitionAllowed,
  isOrderLate,
  ORDER_STATUS_MAP,
} from '../utils/orderUtils.ts';
import { whatsAppService } from './whatsapp.service.ts';

export interface OrderItemInput {
  id?: string;
  designation: string;
  categorie?: string;
  description?: string;
  quantite: number;
  prix_unitaire: number;
  specifications?: Record<string, any>;
}

export interface CreateOrderInput {
  client_id: string;
  titre: string;
  description?: string;
  items: OrderItemInput[];
  remise?: number;
  acompte?: number;
  mode_acompte?: PaymentMode;
  date_prevue?: string | null;
  date_retrait?: string | null;
  responsable?: string | null;
  priorite?: OrderPriority;
  notes?: string | null;
  fichiers?: Array<{ nom: string; url: string; type?: string; taille?: number }>;
  agentName?: string;
}

export interface OrderListParams {
  search?: string;
  status?: string;
  clientId?: string;
  from?: string;
  to?: string;
  responsable?: string;
  priority?: string;
  page?: number;
  limit?: number;
}

export class OrderService {
  /**
   * Génération atomique et concurrente d'un numéro de commande unique au format CMD-YYYY-000001
   */
  public async generateOrderNumber(client: any): Promise<string> {
    const year = new Date().getFullYear();

    const counterRes = await client.query(
      `INSERT INTO order_counters (year, current_val)
       VALUES ($1, 1)
       ON CONFLICT (year)
       DO UPDATE SET current_val = order_counters.current_val + 1
       RETURNING current_val`,
      [year]
    );

    const counter = counterRes.rows[0].current_val;
    const formattedNum = `CMD-${year}-${String(counter).padStart(6, '0')}`;

    // Vérifier l'unicité stricte au cas où une commande manuelle aurait existé
    const existsRes = await client.query(
      `SELECT id FROM orders WHERE numero_commande = $1 OR numero = $1`,
      [formattedNum]
    );

    if (existsRes.rows.length > 0) {
      // Si collision rare, incrémenter à nouveau
      const secondTry = await client.query(
        `UPDATE order_counters SET current_val = current_val + 1 WHERE year = $1 RETURNING current_val`,
        [year]
      );
      return `CMD-${year}-${String(secondTry.rows[0].current_val).padStart(6, '0')}`;
    }

    return formattedNum;
  }

  /**
   * Création d'une commande complète dans une transaction PostgreSQL
   */
  public async createOrder(data: CreateOrderInput) {
    if (!pgPool) throw new Error('[OrderService] Base de données PostgreSQL non disponible.');

    // 1. Validation minimale
    if (!data.client_id) {
      throw new Error('Identifiant du client requis.');
    }
    if (!data.titre || !data.titre.trim()) {
      throw new Error('Le titre ou intitulé du travail est obligatoire.');
    }
    if (!Array.isArray(data.items) || data.items.length === 0) {
      throw new Error('Une commande doit comporter au moins une prestation.');
    }

    // Calcul précis des montants côté serveur
    let sousTotal = 0;
    const computedItems = data.items.map((item, index) => {
      const qte = Math.max(1, Math.floor(Number(item.quantite) || 1));
      const pu = Math.max(0, Number(item.prix_unitaire) || 0);
      const pt = qte * pu;
      sousTotal += pt;

      return {
        designation: (item.designation || `Prestation #${index + 1}`).trim(),
        categorie: item.categorie || 'Autre',
        description: item.description ? item.description.trim() : null,
        quantite: qte,
        prix_unitaire: pu,
        prix_total: pt,
        specifications: item.specifications || {},
      };
    });

    const remise = Math.max(0, Number(data.remise) || 0);
    const montantTotal = Math.max(0, sousTotal - remise);
    const acompte = Math.max(0, Number(data.acompte) || 0);

    if (acompte > montantTotal && montantTotal > 0) {
      throw new Error(`Le montant de l'acompte (${acompte} F CFA) ne peut pas excéder le montant total (${montantTotal} F CFA).`);
    }

    const soldeRestant = Math.max(0, montantTotal - acompte);

    const poolClient = await pgPool.connect();
    try {
      await poolClient.query('BEGIN');

      // 2. Vérifier que le client existe
      const clientRes = await poolClient.query(
        `SELECT id, nom, prenom, entreprise, telephone, whatsapp, consentement_whatsapp FROM clients WHERE id = $1`,
        [data.client_id]
      );
      if (clientRes.rows.length === 0) {
        throw new Error('Client sélectionné introuvable en base.');
      }
      const client = clientRes.rows[0];

      // 3. Génération du numéro automatique
      const numeroCommande = await this.generateOrderNumber(poolClient);

      // 4. Insertion dans la table orders
      const orderInsertRes = await poolClient.query(
        `INSERT INTO orders (
          numero, numero_commande, client_id, titre, description,
          statut, montant_total, acompte, solde_restant, remise,
          date_commande, date_prevue, date_livraison_prevue, date_retrait,
          responsable, priorite, notes, fichiers, notification_pret_envoyee
        ) VALUES (
          $1, $1, $2, $3, $4,
          'COMMANDE_RECUE', $5, $6, $7, $8,
          NOW(), $9, $9, $10,
          $11, $12, $13, $14, false
        ) RETURNING *`,
        [
          numeroCommande,
          data.client_id,
          data.titre.trim(),
          data.description ? data.description.trim() : null,
          montantTotal,
          acompte,
          soldeRestant,
          remise,
          data.date_prevue || null,
          data.date_retrait || null,
          data.responsable || null,
          data.priorite || 'NORMALE',
          data.notes || null,
          JSON.stringify(data.fichiers || []),
        ]
      );

      const createdOrder = orderInsertRes.rows[0];

      // 5. Insertion des lignes de commande (order_items)
      const insertedItems: any[] = [];
      for (const it of computedItems) {
        const itemRes = await poolClient.query(
          `INSERT INTO order_items (
            order_id, designation, categorie, description,
            quantite, prix_unitaire, prix_total, specifications
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *`,
          [
            createdOrder.id,
            it.designation,
            it.categorie,
            it.description,
            it.quantite,
            it.prix_unitaire,
            it.prix_total,
            JSON.stringify(it.specifications),
          ]
        );
        insertedItems.push(itemRes.rows[0]);
      }

      // 6. Si acompte > 0, enregistrer une entrée réelle dans la table payments
      let paymentRecord = null;
      if (acompte > 0) {
        const numeroRecu = `REC-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
        const payRes = await poolClient.query(
          `INSERT INTO payments (
            order_id, client_id, numero_recu, montant,
            mode_paiement, caissier, notes, date_paiement
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
          RETURNING *`,
          [
            createdOrder.id,
            data.client_id,
            numeroRecu,
            acompte,
            data.mode_acompte || 'ESPECES',
            data.agentName || 'Caisse Canaan Services',
            `Acompte initial versé à la commande (${numeroCommande})`,
          ]
        );
        paymentRecord = payRes.rows[0];
      }

      // 7. Journalisation dans activity_logs
      const acteur = data.agentName || 'Agent Canaan CRM';
      await poolClient.query(
        `INSERT INTO activity_logs (
          client_id, order_id, action, details, utilisateur, metadata, date_action
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [
          data.client_id,
          createdOrder.id,
          'COMMANDE_CREEE',
          `Commande ${numeroCommande} créée : "${createdOrder.titre}" (${computedItems.length} prestation(s), Total : ${montantTotal} F CFA, Solde : ${soldeRestant} F CFA)`,
          acteur,
          JSON.stringify({
            numeroCommande,
            montantTotal,
            acompte,
            soldeRestant,
            itemsCount: computedItems.length,
          }),
        ]
      );

      if (acompte > 0) {
        await poolClient.query(
          `INSERT INTO activity_logs (
            client_id, order_id, action, details, utilisateur, metadata, date_action
          ) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
          [
            data.client_id,
            createdOrder.id,
            'PAIEMENT_AJOUTE',
            `Acompte initial de ${acompte} F CFA encaissé (${data.mode_acompte || 'ESPECES'}) - Reste à payer : ${soldeRestant} F CFA`,
            acteur,
            JSON.stringify({
              montant: acompte,
              modePaiement: data.mode_acompte || 'ESPECES',
              numeroRecu: paymentRecord?.numero_recu,
            }),
          ]
        );
      }

      await poolClient.query('COMMIT');

      return {
        success: true,
        order: {
          ...createdOrder,
          client,
          items: insertedItems,
          payment: paymentRecord,
        },
      };
    } catch (err: unknown) {
      await poolClient.query('ROLLBACK');
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[OrderService] Erreur transaction createOrder :', msg);
      throw new Error(`Échec de création de la commande : ${msg}`);
    } finally {
      poolClient.release();
    }
  }

  /**
   * Liste paginée des commandes avec recherche, filtres et calculs d'indicateurs
   */
  public async listOrders(params: OrderListParams) {
    if (!pgPool) throw new Error('[OrderService] PostgreSQL non disponible.');

    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(10, Number(params.limit) || 20));
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const values: any[] = [];
    let valIndex = 1;

    // Filtre recherche textuelle
    if (params.search && params.search.trim()) {
      const q = `%${params.search.trim().toLowerCase()}%`;
      const digits = params.search.replace(/\D/g, '');

      conditions.push(`(
        LOWER(o.numero_commande) LIKE $${valIndex}
        OR LOWER(COALESCE(o.numero, '')) LIKE $${valIndex}
        OR LOWER(o.titre) LIKE $${valIndex}
        OR LOWER(COALESCE(o.description, '')) LIKE $${valIndex}
        OR LOWER(c.nom) LIKE $${valIndex}
        OR LOWER(c.prenom) LIKE $${valIndex}
        OR LOWER(COALESCE(c.entreprise, '')) LIKE $${valIndex}
        ${digits.length >= 4 ? `OR c.telephone LIKE $${valIndex + 1} OR c.whatsapp LIKE $${valIndex + 1}` : ''}
      )`);
      values.push(q);
      valIndex++;
      if (digits.length >= 4) {
        values.push(`%${digits}%`);
        valIndex++;
      }
    }

    // Filtre statut
    if (params.status && params.status !== 'ALL') {
      if (params.status === 'LATE') {
        conditions.push(`o.date_prevue < NOW() AND o.statut NOT IN ('PRETE', 'RENDEZ_VOUS_PROGRAMME', 'RETIREE', 'ANNULEE')`);
      } else {
        conditions.push(`o.statut = $${valIndex}`);
        values.push(params.status);
        valIndex++;
      }
    }

    // Filtre client
    if (params.clientId) {
      conditions.push(`o.client_id = $${valIndex}`);
      values.push(params.clientId);
      valIndex++;
    }

    // Filtre priorité
    if (params.priority && params.priority !== 'ALL') {
      conditions.push(`o.priorite = $${valIndex}`);
      values.push(params.priority);
      valIndex++;
    }

    // Filtre responsable
    if (params.responsable && params.responsable !== 'ALL') {
      conditions.push(`o.responsable = $${valIndex}`);
      values.push(params.responsable);
      valIndex++;
    }

    // Filtres dates (from / to)
    if (params.from) {
      conditions.push(`o.date_commande >= $${valIndex}`);
      values.push(params.from);
      valIndex++;
    }
    if (params.to) {
      conditions.push(`o.date_commande <= $${valIndex}`);
      values.push(params.to);
      valIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 1. Compte total filtré
    const countRes = await pgPool.query(
      `SELECT COUNT(*) FROM orders o 
       JOIN clients c ON c.id = o.client_id 
       ${whereClause}`,
      values
    );
    const total = parseInt(countRes.rows[0].count, 10);

    // 2. Récupération des données avec jointures client et items
    const query = `
      SELECT 
        o.*,
        c.nom AS client_nom,
        c.prenom AS client_prenom,
        c.entreprise AS client_entreprise,
        c.telephone AS client_telephone,
        c.whatsapp AS client_whatsapp,
        c.consentement_whatsapp AS client_consentement,
        (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id)::int AS items_count,
        (SELECT json_agg(json_build_object('designation', oi.designation, 'quantite', oi.quantite, 'prix_total', oi.prix_total))
         FROM order_items oi WHERE oi.order_id = o.id) AS prestations_summary
      FROM orders o
      JOIN clients c ON c.id = o.client_id
      ${whereClause}
      ORDER BY 
        CASE 
          WHEN o.priorite = 'TRES_URGENTE' THEN 1
          WHEN o.priorite = 'URGENTE' THEN 2
          ELSE 3
        END,
        o.created_at DESC
      LIMIT $${valIndex} OFFSET $${valIndex + 1}
    `;

    const dataRes = await pgPool.query(query, [...values, limit, offset]);

    // 3. Calcul des statistiques globales pour les cartes CRM
    const statsRes = await pgPool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE date_commande::date = CURRENT_DATE) AS commandes_aujourdhui,
        COUNT(*) FILTER (WHERE statut IN ('COMMANDE_RECUE', 'EN_CONCEPTION', 'ATTENTE_VALIDATION', 'VALIDEE', 'EN_PRODUCTION', 'EN_IMPRESSION', 'EN_FINITION')) AS en_cours,
        COUNT(*) FILTER (WHERE date_prevue < NOW() AND statut NOT IN ('PRETE', 'RENDEZ_VOUS_PROGRAMME', 'RETIREE', 'ANNULEE')) AS en_retard,
        COUNT(*) FILTER (WHERE statut = 'PRETE') AS pretes,
        COUNT(*) FILTER (WHERE statut IN ('PRETE', 'RENDEZ_VOUS_PROGRAMME')) AS a_retirer,
        COUNT(*) FILTER (WHERE statut = 'RETIREE') AS terminees,
        COALESCE(SUM(montant_total) FILTER (WHERE statut != 'ANNULEE'), 0) AS total_facture,
        COALESCE(SUM(acompte) FILTER (WHERE statut != 'ANNULEE'), 0) AS total_encaisse,
        COALESCE(SUM(solde_restant) FILTER (WHERE statut != 'ANNULEE'), 0) AS total_solde_du
      FROM orders
    `);

    const statsRow = statsRes.rows[0];

    const mappedOrders = dataRes.rows.map((row) => ({
      ...row,
      montant_total: Number(row.montant_total) || 0,
      acompte: Number(row.acompte) || 0,
      solde_restant: Number(row.solde_restant) || 0,
      remise: Number(row.remise) || 0,
      is_late: isOrderLate(row.date_prevue, row.statut),
      fichiers: Array.isArray(row.fichiers)
        ? row.fichiers
        : typeof row.fichiers === 'string'
        ? JSON.parse(row.fichiers)
        : [],
    }));

    return {
      orders: mappedOrders,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
      stats: {
        commandesAujourdhui: parseInt(statsRow.commandes_aujourdhui, 10) || 0,
        enCours: parseInt(statsRow.en_cours, 10) || 0,
        enRetard: parseInt(statsRow.en_retard, 10) || 0,
        pretes: parseInt(statsRow.pretes, 10) || 0,
        aRetirer: parseInt(statsRow.a_retirer, 10) || 0,
        terminees: parseInt(statsRow.terminees, 10) || 0,
        totalFacture: Number(statsRow.total_facture) || 0,
        totalEncaisse: Number(statsRow.total_encaisse) || 0,
        totalSoldeDu: Number(statsRow.total_solde_du) || 0,
      },
    };
  }

  /**
   * Détails complets d'une commande (items, paiements, messages WhatsApp, activité)
   */
  public async getOrderById(id: string) {
    if (!pgPool) throw new Error('[OrderService] PostgreSQL non disponible.');

    const orderRes = await pgPool.query(
      `SELECT o.*, 
              c.id AS client_id, c.nom AS client_nom, c.prenom AS client_prenom,
              c.entreprise AS client_entreprise, c.telephone AS client_telephone,
              c.whatsapp AS client_whatsapp, c.email AS client_email,
              c.ville AS client_ville, c.quartier AS client_quartier,
              c.adresse AS client_adresse,
              c.statut_client AS client_statut,
              c.consentement_whatsapp AS client_consentement
       FROM orders o
       JOIN clients c ON c.id = o.client_id
       WHERE o.id = $1`,
      [id]
    );

    if (orderRes.rows.length === 0) return null;
    const order = orderRes.rows[0];

    // Récupérer les items
    const itemsRes = await pgPool.query(
      `SELECT * FROM order_items WHERE order_id = $1 ORDER BY created_at ASC`,
      [id]
    );

    // Récupérer les paiements réels
    const paymentsRes = await pgPool.query(
      `SELECT * FROM payments WHERE order_id = $1 ORDER BY date_paiement ASC`,
      [id]
    );

    // Calcul du total payé effectif à partir des paiements
    const totalPayeEffectif = paymentsRes.rows.reduce(
      (sum, p) => sum + (Number(p.montant) || 0),
      0
    );

    // Récupérer l'historique d'activité
    const activityRes = await pgPool.query(
      `SELECT * FROM activity_logs 
       WHERE order_id = $1 OR (client_id = $2 AND action LIKE '%COMMANDE%')
       ORDER BY date_action DESC 
       LIMIT 50`,
      [id, order.client_id]
    );

    // Récupérer les messages WhatsApp liés au client et à la commande
    const waRes = await pgPool.query(
      `SELECT * FROM whatsapp_messages 
       WHERE client_id = $1 OR telephone = $2 OR telephone = $3
       ORDER BY date_envoi DESC 
       LIMIT 20`,
      [order.client_id, order.client_whatsapp, order.client_telephone]
    );

    return {
      ...order,
      montant_total: Number(order.montant_total) || 0,
      acompte: totalPayeEffectif,
      solde_restant: Math.max(0, (Number(order.montant_total) || 0) - totalPayeEffectif),
      remise: Number(order.remise) || 0,
      is_late: isOrderLate(order.date_prevue, order.statut),
      fichiers: Array.isArray(order.fichiers)
        ? order.fichiers
        : typeof order.fichiers === 'string'
        ? JSON.parse(order.fichiers)
        : [],
      client: {
        id: order.client_id,
        nom: order.client_nom,
        prenom: order.client_prenom,
        entreprise: order.client_entreprise,
        telephone: order.client_telephone,
        whatsapp: order.client_whatsapp,
        email: order.client_email,
        ville: order.client_ville,
        quartier: order.client_quartier,
        adresse: order.client_adresse,
        statut_client: order.client_statut,
        consentement_whatsapp: Boolean(order.client_consentement),
      },
      items: itemsRes.rows.map((it) => ({
        ...it,
        quantite: Number(it.quantite),
        prix_unitaire: Number(it.prix_unitaire),
        prix_total: Number(it.prix_total),
        specifications:
          typeof it.specifications === 'string'
            ? JSON.parse(it.specifications)
            : it.specifications || {},
      })),
      payments: paymentsRes.rows.map((p) => ({
        ...p,
        montant: Number(p.montant),
      })),
      activity: activityRes.rows,
      whatsappMessages: waRes.rows,
    };
  }

  /**
   * Mise à jour du statut d'une commande avec contrôle de transition
   */
  public async updateOrderStatus(
    id: string,
    targetStatus: OrderStatus,
    options?: { force?: boolean; raison?: string; agentName?: string }
  ) {
    if (!pgPool) throw new Error('[OrderService] PostgreSQL non disponible.');

    const currentRes = await pgPool.query(
      `SELECT o.*, c.nom, c.prenom, c.whatsapp, c.telephone, c.consentement_whatsapp
       FROM orders o
       JOIN clients c ON c.id = o.client_id
       WHERE o.id = $1`,
      [id]
    );

    if (currentRes.rows.length === 0) {
      throw new Error('Commande introuvable.');
    }
    const current = currentRes.rows[0];
    const prevStatus = current.statut as OrderStatus;

    // Contrôle de transition
    const allowed = isTransitionAllowed(prevStatus, targetStatus);
    if (!allowed && !options?.force) {
      throw new Error(
        `Transition de statut non autorisée : impossible de passer de « ${ORDER_STATUS_MAP[prevStatus]?.label || prevStatus} » à « ${ORDER_STATUS_MAP[targetStatus]?.label || targetStatus} ». Utilisez l'option forcée pour déroger à la règle.`
      );
    }

    const poolClient = await pgPool.connect();
    try {
      await poolClient.query('BEGIN');

      const now = new Date().toISOString();
      let updateSql = `UPDATE orders SET statut = $1, updated_at = NOW()`;
      const updateParams: any[] = [targetStatus];
      let paramIdx = 2;

      // Si transition vers PRETE : marquer date_terminee
      if (targetStatus === 'PRETE') {
        updateSql += `, date_terminee = COALESCE(date_terminee, NOW())`;
      }

      // Si transition vers RETIREE : marquer date_retrait
      if (targetStatus === 'RETIREE') {
        updateSql += `, date_retrait = COALESCE(date_retrait, NOW())`;
      }

      updateSql += ` WHERE id = $${paramIdx} RETURNING *`;
      updateParams.push(id);

      const updateRes = await poolClient.query(updateSql, updateParams);
      const updatedOrder = updateRes.rows[0];

      // Journalisation dans activity_logs
      const acteur = options?.agentName || 'Agent Canaan CRM';
      let actionType = 'STATUT_COMMANDE_CHANGE';
      let details = `Statut de la commande ${current.numero_commande} changé : ${prevStatus} ➔ ${targetStatus}`;

      if (targetStatus === 'PRETE') {
        actionType = 'TRAVAIL_PRET';
        details = `Commande ${current.numero_commande} marquée comme PRÊTE au retrait pour ${current.nom} ${current.prenom || ''}.`;
      } else if (targetStatus === 'RETIREE') {
        actionType = 'COMMANDE_RETIREE';
        details = `Commande ${current.numero_commande} remise au client. Dossier clos.`;
      } else if (targetStatus === 'ANNULEE') {
        actionType = 'COMMANDE_ANNULEE';
        details = `Commande ${current.numero_commande} annulée${options?.raison ? ` (Motif : ${options.raison})` : ''}.`;
      }

      await poolClient.query(
        `INSERT INTO activity_logs (
          client_id, order_id, action, details, utilisateur, metadata, date_action
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [
          current.client_id,
          id,
          actionType,
          details,
          acteur,
          JSON.stringify({
            prevStatus,
            newStatus: targetStatus,
            forced: Boolean(options?.force),
            raison: options?.raison || null,
          }),
        ]
      );

      await poolClient.query('COMMIT');

      // Modèle WhatsApp suggéré selon le statut cible
      const suggestedTemplate = ORDER_STATUS_MAP[targetStatus]?.suggestedTemplate || null;

      return {
        success: true,
        order: updatedOrder,
        prevStatus,
        newStatus: targetStatus,
        suggestedTemplate,
        canNotifyClient: Boolean(current.consentement_whatsapp && (current.whatsapp || current.telephone)),
      };
    } catch (err) {
      await poolClient.query('ROLLBACK');
      throw err;
    } finally {
      poolClient.release();
    }
  }

  /**
   * Enregistrement d'un paiement / règlement supplémentaire sur une commande
   */
  public async addPaymentToOrder(
    orderId: string,
    data: {
      montant: number;
      mode_paiement: PaymentMode;
      reference_transaction?: string;
      notes?: string;
      agentName?: string;
    }
  ) {
    if (!pgPool) throw new Error('[OrderService] PostgreSQL non disponible.');

    const montant = Number(data.montant);
    if (!montant || montant <= 0) {
      throw new Error('Le montant du paiement doit être supérieur à zéro.');
    }

    const poolClient = await pgPool.connect();
    try {
      await poolClient.query('BEGIN');

      const orderRes = await poolClient.query(
        `SELECT o.*, c.nom, c.prenom, c.telephone, c.whatsapp 
         FROM orders o 
         JOIN clients c ON c.id = o.client_id 
         WHERE o.id = $1 FOR UPDATE`,
        [orderId]
      );

      if (orderRes.rows.length === 0) {
        throw new Error('Commande introuvable.');
      }
      const order = orderRes.rows[0];

      // Calcul des paiements cumulés existants
      const currentPaymentsRes = await poolClient.query(
        `SELECT COALESCE(SUM(montant), 0) AS total_deja_paye FROM payments WHERE order_id = $1`,
        [orderId]
      );
      const totalDejaPaye = Number(currentPaymentsRes.rows[0].total_deja_paye) || 0;
      const montantTotal = Number(order.montant_total) || 0;
      const soldeRestantActuel = Math.max(0, montantTotal - totalDejaPaye);

      if (montant > soldeRestantActuel) {
        throw new Error(
          `Le paiement de ${montant} F CFA dépasse le solde restant dû de ${soldeRestantActuel} F CFA.`
        );
      }

      // Création du reçu
      const year = new Date().getFullYear();
      const numeroRecu = `REC-${year}-${Date.now().toString().slice(-6)}`;

      const payRes = await poolClient.query(
        `INSERT INTO payments (
          order_id, client_id, numero_recu, montant,
          mode_paiement, reference_transaction, caissier, notes, date_paiement
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        RETURNING *`,
        [
          orderId,
          order.client_id,
          numeroRecu,
          montant,
          data.mode_paiement || 'ESPECES',
          data.reference_transaction || null,
          data.agentName || 'Caisse Canaan Services',
          data.notes || null,
        ]
      );
      const payment = payRes.rows[0];

      // Recalcul du total payé et du solde
      const nouveauTotalPaye = totalDejaPaye + montant;
      const nouveauSolde = Math.max(0, montantTotal - nouveauTotalPaye);

      await poolClient.query(
        `UPDATE orders 
         SET acompte = $1, solde_restant = $2, updated_at = NOW() 
         WHERE id = $3`,
        [nouveauTotalPaye, nouveauSolde, orderId]
      );

      // Journalisation dans activity_logs
      const acteur = data.agentName || 'Agent Canaan CRM';
      await poolClient.query(
        `INSERT INTO activity_logs (
          client_id, order_id, action, details, utilisateur, metadata, date_action
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [
          order.client_id,
          orderId,
          'PAIEMENT_AJOUTE',
          `Règlement de ${montant} F CFA reçu (${data.mode_paiement}${data.reference_transaction ? ` - Réf: ${data.reference_transaction}` : ''}) pour la commande ${order.numero_commande}. Reste à payer : ${nouveauSolde} F CFA.`,
          acteur,
          JSON.stringify({
            montant,
            modePaiement: data.mode_paiement,
            reference: data.reference_transaction,
            numeroRecu,
            soldeRestant: nouveauSolde,
          }),
        ]
      );

      await poolClient.query('COMMIT');

      return {
        success: true,
        payment,
        nouveauTotalPaye,
        nouveauSolde,
      };
    } catch (err) {
      await poolClient.query('ROLLBACK');
      throw err;
    } finally {
      poolClient.release();
    }
  }

  /**
   * Envoi d'une notification WhatsApp liée à une commande avec modèle approuvé
   */
  public async sendOrderWhatsAppNotification(
    orderId: string,
    params: {
      templateName: string;
      customVariables?: Record<string, string>;
      agentName?: string;
    }
  ) {
    if (!pgPool) throw new Error('[OrderService] PostgreSQL non disponible.');

    const orderRes = await pgPool.query(
      `SELECT o.*, c.id AS client_id, c.nom, c.prenom, c.telephone, c.whatsapp, c.consentement_whatsapp
       FROM orders o
       JOIN clients c ON c.id = o.client_id
       WHERE o.id = $1`,
      [orderId]
    );

    if (orderRes.rows.length === 0) {
      throw new Error('Commande introuvable.');
    }
    const order = orderRes.rows[0];

    const recipientPhone = order.whatsapp || order.telephone;
    if (!recipientPhone) {
      throw new Error('Numéro WhatsApp du client introuvable.');
    }

    // Vérifier le modèle dans la base
    const tplRes = await pgPool.query(
      `SELECT * FROM whatsapp_templates WHERE name = $1`,
      [params.templateName]
    );

    if (tplRes.rows.length === 0) {
      throw new Error(`Modèle WhatsApp « ${params.templateName} » introuvable.`);
    }

    const tpl = tplRes.rows[0];
    if (tpl.meta_status !== 'APPROVED') {
      throw new Error(
        `Le modèle « ${tpl.display_name} » a le statut ${tpl.meta_status}. Seuls les modèles approuvés (APPROVED) par Meta peuvent être expédiés.`
      );
    }

    // Variables pré-remplies selon le template
    const vars: Record<string, string> = { ...params.customVariables };

    if (params.templateName === 'travail_pret') {
      // {{1}} prénom, {{2}} travail, {{3}} date retrait, {{4}} heure, {{5}} reste à payer
      vars['1'] = vars['1'] || order.prenom || order.nom || 'Cher client';
      vars['2'] = vars['2'] || order.titre || order.numero_commande;
      vars['3'] = vars['3'] || (order.date_retrait ? new Date(order.date_retrait).toLocaleDateString('fr-FR') : 'dès aujourd’hui');
      vars['4'] = vars['4'] || (order.date_retrait ? new Date(order.date_retrait).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : 'aux heures d’ouverture');
      vars['5'] = vars['5'] || `${Number(order.solde_restant) || 0}`;
    } else if (params.templateName === 'validation_maquette') {
      // {{1}} prénom, {{2}} commande
      vars['1'] = vars['1'] || order.prenom || order.nom || 'Cher client';
      vars['2'] = vars['2'] || `${order.numero_commande} (${order.titre})`;
    } else if (params.templateName === 'commande_en_production') {
      // {{1}} prénom, {{2}} commande, {{3}} date prévue
      vars['1'] = vars['1'] || order.prenom || order.nom || 'Cher client';
      vars['2'] = vars['2'] || `${order.numero_commande} (${order.titre})`;
      vars['3'] = vars['3'] || (order.date_prevue ? new Date(order.date_prevue).toLocaleDateString('fr-FR') : 'prochainement');
    } else if (params.templateName === 'remerciement_retrait') {
      vars['1'] = vars['1'] || order.prenom || order.nom || 'Cher client';
      vars['2'] = vars['2'] || `${order.numero_commande} (${order.titre})`;
    }

    // Rendu textuel pour historique
    let renderedText = tpl.body;
    Object.keys(vars).forEach((k) => {
      renderedText = renderedText.replaceAll(`{{${k}}}`, vars[k]);
    });

    const components = Object.values(vars).length > 0
      ? [
          {
            type: 'body' as const,
            parameters: Object.values(vars).map((v) => ({ type: 'text' as const, text: String(v) })),
          },
        ]
      : undefined;

    // Envoi via Meta Cloud API
    const metaRes = await whatsAppService.sendTemplateMessage({
      to: recipientPhone,
      templateName: params.templateName,
      languageCode: tpl.language || 'fr',
      components,
    });

    if (!metaRes.success) {
      throw new Error(metaRes.error || "Échec de l'envoi WhatsApp Meta.");
    }

    const metaMsgId = metaRes.messageId || `msg_order_${Date.now()}`;
    const now = new Date().toISOString();

    // Enregistrement dans whatsapp_messages
    await pgPool.query(
      `INSERT INTO whatsapp_messages (
        client_id, telephone, contenu_texte, meta_message_id, statut, date_envoi
      ) VALUES ($1, $2, $3, $4, 'ENVOYE', $5)`,
      [order.client_id, recipientPhone, renderedText, metaMsgId, now]
    );

    // Enregistrement dans activity_logs
    await pgPool.query(
      `INSERT INTO activity_logs (
        client_id, order_id, action, details, utilisateur, metadata, date_action
      ) VALUES ($1, $2, 'WHATSAPP_ENVOYE', $3, $4, $5, NOW())`,
      [
        order.client_id,
        orderId,
        `Notification WhatsApp « ${tpl.display_name} » envoyée au client (${recipientPhone})`,
        params.agentName || 'Agent Canaan CRM',
        JSON.stringify({ templateName: params.templateName, metaMsgId }),
      ]
    );

    // Si travail_pret envoyé, marquer la notification comme envoyée
    if (params.templateName === 'travail_pret') {
      await pgPool.query(
        `UPDATE orders SET notification_pret_envoyee = true WHERE id = $1`,
        [orderId]
      );
    }

    return {
      success: true,
      messageId: metaMsgId,
      renderedText,
    };
  }

  /**
   * Modification d'une commande
   */
  public async updateOrder(
    id: string,
    data: Partial<{
      titre: string;
      description: string;
      date_prevue: string | null;
      date_retrait: string | null;
      responsable: string | null;
      priorite: OrderPriority;
      notes: string | null;
      items: OrderItemInput[];
      remise: number;
    }>,
    agentName?: string
  ) {
    if (!pgPool) throw new Error('[OrderService] PostgreSQL non disponible.');

    const poolClient = await pgPool.connect();
    try {
      await poolClient.query('BEGIN');

      const currentRes = await poolClient.query(
        `SELECT * FROM orders WHERE id = $1 FOR UPDATE`,
        [id]
      );
      if (currentRes.rows.length === 0) {
        throw new Error('Commande introuvable.');
      }
      const current = currentRes.rows[0];

      let nouveauMontantTotal = Number(current.montant_total) || 0;
      let nouvelleRemise = data.remise !== undefined ? Math.max(0, Number(data.remise) || 0) : Number(current.remise) || 0;

      // Si items mis à jour, recalculer
      if (Array.isArray(data.items) && data.items.length > 0) {
        let sousTotal = 0;
        await poolClient.query(`DELETE FROM order_items WHERE order_id = $1`, [id]);

        for (const item of data.items) {
          const qte = Math.max(1, Math.floor(Number(item.quantite) || 1));
          const pu = Math.max(0, Number(item.prix_unitaire) || 0);
          const pt = qte * pu;
          sousTotal += pt;

          await poolClient.query(
            `INSERT INTO order_items (
              order_id, designation, categorie, description,
              quantite, prix_unitaire, prix_total, specifications
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              id,
              item.designation.trim(),
              item.categorie || 'Autre',
              item.description ? item.description.trim() : null,
              qte,
              pu,
              pt,
              JSON.stringify(item.specifications || {}),
            ]
          );
        }

        nouveauMontantTotal = Math.max(0, sousTotal - nouvelleRemise);
      }

      // Paiements déjà encaissés
      const paymentsRes = await poolClient.query(
        `SELECT COALESCE(SUM(montant), 0) AS total_paye FROM payments WHERE order_id = $1`,
        [id]
      );
      const totalPaye = Number(paymentsRes.rows[0].total_paye) || 0;
      const nouveauSolde = Math.max(0, nouveauMontantTotal - totalPaye);

      const updateRes = await poolClient.query(
        `UPDATE orders SET
          titre = COALESCE($1, titre),
          description = COALESCE($2, description),
          date_prevue = $3,
          date_livraison_prevue = $3,
          date_retrait = $4,
          responsable = $5,
          priorite = COALESCE($6, priorite),
          notes = $7,
          montant_total = $8,
          remise = $9,
          acompte = $10,
          solde_restant = $11,
          updated_at = NOW()
         WHERE id = $12
         RETURNING *`,
        [
          data.titre ? data.titre.trim() : null,
          data.description !== undefined ? data.description : current.description,
          data.date_prevue !== undefined ? data.date_prevue : current.date_prevue,
          data.date_retrait !== undefined ? data.date_retrait : current.date_retrait,
          data.responsable !== undefined ? data.responsable : current.responsable,
          data.priorite || current.priorite,
          data.notes !== undefined ? data.notes : current.notes,
          nouveauMontantTotal,
          nouvelleRemise,
          totalPaye,
          nouveauSolde,
          id,
        ]
      );

      // Log
      await poolClient.query(
        `INSERT INTO activity_logs (
          client_id, order_id, action, details, utilisateur, date_action
        ) VALUES ($1, $2, 'COMMANDE_MODIFIEE', $3, $4, NOW())`,
        [
          current.client_id,
          id,
          `Mise à jour des informations de la commande ${current.numero_commande}`,
          agentName || 'Agent Canaan CRM',
        ]
      );

      await poolClient.query('COMMIT');
      return updateRes.rows[0];
    } catch (err) {
      await poolClient.query('ROLLBACK');
      throw err;
    } finally {
      poolClient.release();
    }
  }

  /**
   * Annulation logique d'une commande
   */
  public async cancelOrder(id: string, motif?: string, agentName?: string) {
    return this.updateOrderStatus(id, 'ANNULEE', { force: true, raison: motif, agentName });
  }
}

export const orderService = new OrderService();
