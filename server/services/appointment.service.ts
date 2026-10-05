/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { pgPool } from '../config/database.ts';
import {
  type AppointmentType,
  type AppointmentStatus,
  type TemporalStatus,
  APP_TIMEZONE,
  DEFAULT_APP_LOCATION,
  getTodayStringCI,
  getTomorrowStringCI,
  getAppointmentTemporalStatus,
  isAppointmentLate,
  formatAppointmentDate,
  formatAppointmentTime,
} from '../utils/appointmentUtils.ts';
import { whatsAppService } from './whatsapp.service.ts';
import { whatsappTemplateService } from './whatsappTemplateService.ts';

export interface CreateAppointmentInput {
  client_id: string;
  order_id?: string | null;
  type_rendez_vous: AppointmentType;
  date_rendez_vous: string; // YYYY-MM-DD
  heure_rendez_vous: string; // HH:mm
  lieu?: string | null;
  motif?: string | null;
  responsable?: string | null;
  notes?: string | null;
  sendWhatsAppConfirmation?: boolean;
  agentName?: string;
}

export interface UpdateAppointmentInput {
  client_id?: string | null;
  order_id?: string | null;
  type_rendez_vous?: AppointmentType;
  date_rendez_vous?: string | null;
  heure_rendez_vous?: string | null;
  lieu?: string | null;
  motif?: string | null;
  responsable?: string | null;
  notes?: string | null;
  agentName?: string;
}

export interface AppointmentListParams {
  search?: string;
  date?: string;
  from?: string;
  to?: string;
  status?: string;
  type?: string;
  clientId?: string;
  orderId?: string;
  responsable?: string;
  temporalStatus?: string;
  page?: number;
  limit?: number;
}

export interface RecordRetraitInput {
  date_retrait?: string;
  heure_retrait?: string;
  retire_par: string;
  notes?: string;
  montant_regle?: number;
  mode_paiement?: string;
  reference_transaction?: string;
  autoriser_solde_restant?: boolean;
  motif_derogation?: string;
  agentName?: string;
}

export class AppointmentService {
  /**
   * Vérifie si le responsable a déjà un rendez-vous prévu au même créneau
   */
  public async checkConflict(
    date: string,
    heure: string,
    responsable?: string | null,
    excludeId?: string | null
  ) {
    if (!pgPool || !responsable || !responsable.trim()) {
      return { hasConflict: false };
    }

    const cleanDate = date.includes('T') ? date.slice(0, 10) : date;
    const cleanTime = heure.slice(0, 5);

    const conditions = [
      `COALESCE(date_rendez_vous, date) = $1`,
      `SUBSTRING(COALESCE(heure_rendez_vous, heure)::text, 1, 5) = $2`,
      `LOWER(TRIM(responsable)) = LOWER(TRIM($3))`,
      `statut NOT IN ('ANNULE', 'TERMINE')`,
    ];
    const values: any[] = [cleanDate, cleanTime, responsable.trim()];

    if (excludeId) {
      conditions.push(`id != $4`);
      values.push(excludeId);
    }

    const res = await pgPool.query(
      `SELECT a.id, a.motif, a.type_rendez_vous, c.nom AS client_nom, c.prenom AS client_prenom
       FROM appointments a
       LEFT JOIN clients c ON c.id = a.client_id
       WHERE ${conditions.join(' AND ')}
       LIMIT 1`,
      values
    );

    if (res.rows.length > 0) {
      const conflict = res.rows[0];
      return {
        hasConflict: true,
        conflictingAppointment: conflict,
        message: `Le responsable « ${responsable} » a déjà le rendez-vous « ${conflict.motif || conflict.type_rendez_vous} » avec ${conflict.client_nom} ${conflict.client_prenom || ''} à cet horaire.`,
      };
    }

    return { hasConflict: false };
  }

  /**
   * Liste paginée des rendez-vous avec filtres avancés et calcul temporel
   */
  public async listAppointments(params: AppointmentListParams) {
    if (!pgPool) throw new Error('[AppointmentService] PostgreSQL non disponible.');

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
        LOWER(c.nom) LIKE $${valIndex}
        OR LOWER(c.prenom) LIKE $${valIndex}
        OR LOWER(COALESCE(c.entreprise, '')) LIKE $${valIndex}
        OR LOWER(COALESCE(o.numero_commande, '')) LIKE $${valIndex}
        OR LOWER(COALESCE(o.titre, '')) LIKE $${valIndex}
        OR LOWER(COALESCE(a.motif, '')) LIKE $${valIndex}
        OR LOWER(COALESCE(a.lieu, '')) LIKE $${valIndex}
        OR LOWER(COALESCE(a.responsable, '')) LIKE $${valIndex}
        OR LOWER(COALESCE(a.notes, '')) LIKE $${valIndex}
        ${digits.length >= 4 ? `OR c.telephone LIKE $${valIndex + 1} OR c.whatsapp LIKE $${valIndex + 1}` : ''}
      )`);
      values.push(q);
      valIndex++;
      if (digits.length >= 4) {
        values.push(`%${digits}%`);
        valIndex++;
      }
    }

    // Filtre date spécifique
    if (params.date) {
      conditions.push(`COALESCE(a.date_rendez_vous, a.date) = $${valIndex}`);
      values.push(params.date);
      valIndex++;
    }

    // Filtre période (from / to)
    if (params.from) {
      conditions.push(`COALESCE(a.date_rendez_vous, a.date) >= $${valIndex}`);
      values.push(params.from);
      valIndex++;
    }
    if (params.to) {
      conditions.push(`COALESCE(a.date_rendez_vous, a.date) <= $${valIndex}`);
      values.push(params.to);
      valIndex++;
    }

    // Filtre statut
    if (params.status && params.status !== 'ALL') {
      conditions.push(`a.statut = $${valIndex}`);
      values.push(params.status);
      valIndex++;
    }

    // Filtre type de rendez-vous
    if (params.type && params.type !== 'ALL') {
      conditions.push(`COALESCE(a.type_rendez_vous, a.motif) = $${valIndex}`);
      values.push(params.type);
      valIndex++;
    }

    // Filtre client
    if (params.clientId) {
      conditions.push(`a.client_id = $${valIndex}`);
      values.push(params.clientId);
      valIndex++;
    }

    // Filtre commande
    if (params.orderId) {
      conditions.push(`a.order_id = $${valIndex}`);
      values.push(params.orderId);
      valIndex++;
    }

    // Filtre responsable
    if (params.responsable && params.responsable !== 'ALL') {
      conditions.push(`LOWER(a.responsable) = LOWER($${valIndex})`);
      values.push(params.responsable);
      valIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 1. Comptage total
    const countRes = await pgPool.query(
      `SELECT COUNT(*) FROM appointments a
       LEFT JOIN clients c ON c.id = a.client_id
       LEFT JOIN orders o ON o.id = a.order_id
       ${whereClause}`,
      values
    );
    const total = parseInt(countRes.rows[0].count, 10);

    // 2. Requête données
    const dataQuery = `
      SELECT 
        a.*,
        COALESCE(a.date_rendez_vous, a.date) AS date_rendez_vous,
        COALESCE(a.heure_rendez_vous, a.heure) AS heure_rendez_vous,
        COALESCE(a.type_rendez_vous, a.motif) AS type_rendez_vous,
        c.nom AS client_nom,
        c.prenom AS client_prenom,
        c.entreprise AS client_entreprise,
        c.telephone AS client_telephone,
        c.whatsapp AS client_whatsapp,
        c.statut_client AS client_statut,
        c.consentement_whatsapp AS client_consentement,
        o.numero_commande AS order_numero,
        o.titre AS order_titre,
        o.statut AS order_statut,
        o.montant_total AS order_montant_total,
        o.acompte AS order_acompte,
        o.solde_restant AS order_solde_restant,
        o.date_prevue AS order_date_prevue
      FROM appointments a
      LEFT JOIN clients c ON c.id = a.client_id
      LEFT JOIN orders o ON o.id = a.order_id
      ${whereClause}
      ORDER BY 
        COALESCE(a.date_rendez_vous, a.date) ASC,
        COALESCE(a.heure_rendez_vous, a.heure) ASC
      LIMIT $${valIndex} OFFSET $${valIndex + 1}
    `;

    const dataRes = await pgPool.query(dataQuery, [...values, limit, offset]);

    // 3. Statistiques d'alertes globales (Today, Tomorrow, Late, Upcoming, etc.)
    const stats = await this.getAppointmentStats();

    const now = new Date();
    const mapped = dataRes.rows.map((row) => {
      const temporalStatus = getAppointmentTemporalStatus(
        {
          date_rendez_vous: row.date_rendez_vous,
          heure_rendez_vous: row.heure_rendez_vous,
          statut: row.statut,
        },
        now
      );
      return {
        ...row,
        temporal_status: temporalStatus,
        is_late: isAppointmentLate(row, now),
        order_montant_total: Number(row.order_montant_total) || 0,
        order_acompte: Number(row.order_acompte) || 0,
        order_solde_restant: Number(row.order_solde_restant) || 0,
      };
    });

    // Si filtre temporalStatus demandé (ex: TODAY, TOMORROW, LATE)
    let filteredAppointments = mapped;
    if (params.temporalStatus && params.temporalStatus !== 'ALL') {
      filteredAppointments = mapped.filter((a) => a.temporal_status === params.temporalStatus);
    }

    return {
      appointments: filteredAppointments,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
      stats,
    };
  }

  /**
   * Statistiques globales des rendez-vous et alertes
   */
  public async getAppointmentStats() {
    if (!pgPool) throw new Error('[AppointmentService] PostgreSQL non disponible.');

    const now = new Date();
    const todayStr = getTodayStringCI(now);
    const tomorrowStr = getTomorrowStringCI(now);

    const statsRes = await pgPool.query(
      `SELECT
        COUNT(*) FILTER (
          WHERE COALESCE(date_rendez_vous, date) = $1
            AND statut NOT IN ('ANNULE', 'TERMINE')
        ) AS today_count,
        COUNT(*) FILTER (
          WHERE COALESCE(date_rendez_vous, date) = $2
            AND statut NOT IN ('ANNULE', 'TERMINE')
        ) AS tomorrow_count,
        COUNT(*) FILTER (
          WHERE (
            COALESCE(date_rendez_vous, date) < $1
            OR (COALESCE(date_rendez_vous, date) = $1 AND COALESCE(heure_rendez_vous, heure) < CURRENT_TIME)
          )
          AND statut NOT IN ('ANNULE', 'TERMINE')
        ) AS late_count,
        COUNT(*) FILTER (
          WHERE COALESCE(date_rendez_vous, date) > $2
            AND statut NOT IN ('ANNULE', 'TERMINE')
        ) AS upcoming_count,
        COUNT(*) FILTER (
          WHERE statut = 'TERMINE'
            AND COALESCE(date_terminee, updated_at) >= date_trunc('month', CURRENT_DATE)
        ) AS completed_this_month
      FROM appointments`,
      [todayStr, tomorrowStr]
    );

    const r = statsRes.rows[0];
    const todayCount = parseInt(r.today_count, 10) || 0;
    const tomorrowCount = parseInt(r.tomorrow_count, 10) || 0;
    const lateCount = parseInt(r.late_count, 10) || 0;
    const upcomingCount = parseInt(r.upcoming_count, 10) || 0;
    const completedThisMonth = parseInt(r.completed_this_month, 10) || 0;
    const totalActiveAlerts = todayCount + lateCount;

    return {
      todayCount,
      tomorrowCount,
      lateCount,
      upcomingCount,
      completedThisMonth,
      totalActiveAlerts,
      alertMessage:
        totalActiveAlerts > 0
          ? `${todayCount} rendez-vous aujourd'hui • ${tomorrowCount} demain${lateCount > 0 ? ` • ${lateCount} en retard` : ''}`
          : `${tomorrowCount} rendez-vous demain`,
    };
  }

  /**
   * Rendez-vous du jour
   */
  public async getTodayAppointments() {
    const todayStr = getTodayStringCI();
    return this.listAppointments({ date: todayStr, limit: 100 });
  }

  /**
   * Rendez-vous de demain
   */
  public async getTomorrowAppointments() {
    const tomorrowStr = getTomorrowStringCI();
    return this.listAppointments({ date: tomorrowStr, limit: 100 });
  }

  /**
   * Rendez-vous en retard
   */
  public async getLateAppointments() {
    return this.listAppointments({ temporalStatus: 'LATE', limit: 100 });
  }

  /**
   * Détails complets d'un rendez-vous
   */
  public async getAppointmentById(id: string) {
    if (!pgPool) throw new Error('[AppointmentService] PostgreSQL non disponible.');

    const res = await pgPool.query(
      `SELECT 
        a.*,
        COALESCE(a.date_rendez_vous, a.date) AS date_rendez_vous,
        COALESCE(a.heure_rendez_vous, a.heure) AS heure_rendez_vous,
        COALESCE(a.type_rendez_vous, a.motif) AS type_rendez_vous,
        c.id AS client_id,
        c.nom AS client_nom,
        c.prenom AS client_prenom,
        c.entreprise AS client_entreprise,
        c.telephone AS client_telephone,
        c.whatsapp AS client_whatsapp,
        c.statut_client AS client_statut,
        c.consentement_whatsapp AS client_consentement,
        o.id AS order_id,
        o.numero_commande AS order_numero,
        o.titre AS order_titre,
        o.statut AS order_statut,
        o.montant_total AS order_montant_total,
        o.acompte AS order_acompte,
        o.solde_restant AS order_solde_restant,
        o.date_prevue AS order_date_prevue
       FROM appointments a
       LEFT JOIN clients c ON c.id = a.client_id
       LEFT JOIN orders o ON o.id = a.order_id
       WHERE a.id = $1`,
      [id]
    );

    if (res.rows.length === 0) return null;
    const row = res.rows[0];

    // Historique d'activité lié à ce rendez-vous
    const actRes = await pgPool.query(
      `SELECT * FROM activity_logs 
       WHERE appointment_id = $1 OR (order_id = $2 AND action LIKE '%RENDEZ_VOUS%')
       ORDER BY date_action DESC 
       LIMIT 30`,
      [id, row.order_id]
    );

    const now = new Date();
    return {
      ...row,
      temporal_status: getAppointmentTemporalStatus(row, now),
      is_late: isAppointmentLate(row, now),
      order_montant_total: Number(row.order_montant_total) || 0,
      order_acompte: Number(row.order_acompte) || 0,
      order_solde_restant: Number(row.order_solde_restant) || 0,
      activities: actRes.rows,
    };
  }

  /**
   * Création d'un rendez-vous
   */
  public async createAppointment(data: CreateAppointmentInput) {
    if (!pgPool) throw new Error('[AppointmentService] PostgreSQL non disponible.');

    const cleanDate = data.date_rendez_vous.includes('T')
      ? data.date_rendez_vous.slice(0, 10)
      : data.date_rendez_vous;
    const cleanTime = data.heure_rendez_vous.slice(0, 5);

    // Vérifier l'existence du client
    const clientRes = await pgPool.query(`SELECT * FROM clients WHERE id = $1`, [data.client_id]);
    if (clientRes.rows.length === 0) {
      throw new Error('Client introuvable.');
    }
    const client = clientRes.rows[0];

    // Vérifier la commande si spécifiée
    let order: any = null;
    if (data.order_id) {
      const orderRes = await pgPool.query(
        `SELECT * FROM orders WHERE id = $1 AND client_id = $2`,
        [data.order_id, data.client_id]
      );
      if (orderRes.rows.length === 0) {
        throw new Error('La commande spécifiée n’existe pas ou n’appartient pas à ce client.');
      }
      order = orderRes.rows[0];
    }

    const lieu = data.lieu?.trim() || DEFAULT_APP_LOCATION;
    const motif = data.motif?.trim() || data.type_rendez_vous;
    const responsable = data.responsable?.trim() || 'Accueil Canaan Services';
    const agentName = data.agentName || 'Administrateur';

    const insertRes = await pgPool.query(
      `INSERT INTO appointments (
        client_id,
        order_id,
        type_rendez_vous,
        date_rendez_vous,
        heure_rendez_vous,
        date,
        heure,
        lieu,
        motif,
        responsable,
        notes,
        statut,
        confirmation_envoyee,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $4, $5, $6, $7, $8, $9, 'A_CONFIRMER', false, NOW(), NOW())
      RETURNING *`,
      [
        data.client_id,
        data.order_id || null,
        data.type_rendez_vous,
        cleanDate,
        cleanTime,
        lieu,
        motif,
        responsable,
        data.notes?.trim() || null,
      ]
    );

    const createdApt = insertRes.rows[0];

    // Traçabilité dans activity_logs
    await pgPool.query(
      `INSERT INTO activity_logs (
        client_id,
        order_id,
        appointment_id,
        action,
        details,
        utilisateur,
        metadata,
        date_action
      ) VALUES ($1, $2, $3, 'RENDEZ_VOUS_CREE', $4, $5, $6, NOW())`,
      [
        data.client_id,
        data.order_id || null,
        createdApt.id,
        `Rendez-vous programmé le ${formatAppointmentDate(cleanDate)} à ${formatAppointmentTime(cleanTime)} (${motif})`,
        agentName,
        JSON.stringify({
          type: data.type_rendez_vous,
          date: cleanDate,
          heure: cleanTime,
          lieu,
          responsable,
        }),
      ]
    );

    // Si rattaché à une commande PRETE, faire évoluer le statut vers RENDEZ_VOUS_PROGRAMME
    if (order && order.statut === 'PRETE' && data.type_rendez_vous === 'RETRAIT_TRAVAIL') {
      await pgPool.query(
        `UPDATE orders SET statut = 'RENDEZ_VOUS_PROGRAMME', updated_at = NOW() WHERE id = $1`,
        [order.id]
      );

      await pgPool.query(
        `INSERT INTO activity_logs (
          client_id, order_id, appointment_id, action, details, utilisateur, date_action
        ) VALUES ($1, $2, $3, 'STATUT_COMMANDE_CHANGE', $4, $5, NOW())`,
        [
          data.client_id,
          order.id,
          createdApt.id,
          `Statut commande ${order.numero_commande} mis à jour : PRETE ➔ RENDEZ_VOUS_PROGRAMME suite à prise de RDV`,
          agentName,
        ]
      );
    }

    // Création notification interne
    await pgPool.query(
      `INSERT INTO notifications (type, titre, message, client_id, order_id, appointment_id)
       VALUES ('RENDEZ_VOUS', $1, $2, $3, $4, $5)`,
      [
        `Nouveau RDV : ${client.nom} ${client.prenom || ''}`,
        `Rendez-vous fixé au ${cleanDate} à ${cleanTime} pour ${motif}.`,
        data.client_id,
        data.order_id || null,
        createdApt.id,
      ]
    );

    // Envoi confirmation WhatsApp si demandé
    let whatsAppResult: any = null;
    if (data.sendWhatsAppConfirmation && client.whatsapp) {
      try {
        whatsAppResult = await this.sendAppointmentWhatsApp(
          createdApt.id,
          'confirmation_rendez_vous',
          {
            '1': client.prenom || client.nom,
            '2': cleanDate,
            '3': cleanTime,
            '4': order?.titre || motif,
            '5': lieu,
          },
          agentName
        );
      } catch (waErr) {
        console.warn('[AppointmentService] Erreur envoi confirmation WhatsApp :', waErr);
      }
    }

    return {
      success: true,
      appointment: createdApt,
      whatsAppResult,
    };
  }

  /**
   * Modification d'un rendez-vous
   */
  public async updateAppointment(id: string, data: UpdateAppointmentInput, agentName: string = 'Administrateur') {
    if (!pgPool) throw new Error('[AppointmentService] PostgreSQL non disponible.');

    const aptRes = await pgPool.query(`SELECT * FROM appointments WHERE id = $1`, [id]);
    if (aptRes.rows.length === 0) throw new Error('Rendez-vous introuvable.');
    const old = aptRes.rows[0];

    const cleanDate = data.date_rendez_vous
      ? data.date_rendez_vous.includes('T')
        ? data.date_rendez_vous.slice(0, 10)
        : data.date_rendez_vous
      : old.date_rendez_vous || old.date;

    const cleanTime = data.heure_rendez_vous
      ? data.heure_rendez_vous.slice(0, 5)
      : old.heure_rendez_vous || old.heure;

    const res = await pgPool.query(
      `UPDATE appointments SET
        type_rendez_vous = COALESCE($1, type_rendez_vous),
        date_rendez_vous = $2,
        heure_rendez_vous = $3,
        date = $2,
        heure = $3,
        lieu = COALESCE($4, lieu),
        motif = COALESCE($5, motif),
        responsable = COALESCE($6, responsable),
        notes = COALESCE($7, notes),
        updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [
        data.type_rendez_vous,
        cleanDate,
        cleanTime,
        data.lieu,
        data.motif,
        data.responsable,
        data.notes,
        id,
      ]
    );

    const updated = res.rows[0];

    await pgPool.query(
      `INSERT INTO activity_logs (
        client_id, order_id, appointment_id, action, details, utilisateur, date_action
      ) VALUES ($1, $2, $3, 'RENDEZ_VOUS_MODIFIE', $4, $5, NOW())`,
      [
        updated.client_id,
        updated.order_id,
        id,
        `Rendez-vous modifié : date fixée au ${formatAppointmentDate(cleanDate)} à ${formatAppointmentTime(cleanTime)}`,
        agentName,
      ]
    );

    return updated;
  }

  /**
   * Changement de statut (CONFIRME, ABSENT, ANNULE, TERMINE)
   */
  public async updateStatus(
    id: string,
    statut: AppointmentStatus,
    raison?: string,
    agentName: string = 'Administrateur'
  ) {
    if (!pgPool) throw new Error('[AppointmentService] PostgreSQL non disponible.');

    const aptRes = await pgPool.query(`SELECT * FROM appointments WHERE id = $1`, [id]);
    if (aptRes.rows.length === 0) throw new Error('Rendez-vous introuvable.');
    const apt = aptRes.rows[0];

    let dateConfirmation = apt.date_confirmation;
    let dateTerminee = apt.date_terminee;

    if (statut === 'CONFIRME' && !dateConfirmation) {
      dateConfirmation = new Date().toISOString();
    }
    if (statut === 'TERMINE' && !dateTerminee) {
      dateTerminee = new Date().toISOString();
    }

    const res = await pgPool.query(
      `UPDATE appointments SET
        statut = $1,
        date_confirmation = $2,
        date_terminee = $3,
        updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [statut, dateConfirmation, dateTerminee, id]
    );

    const updated = res.rows[0];

    let actionLabel = 'RENDEZ_VOUS_MODIFIE';
    let detailMsg = `Statut du rendez-vous passé à ${statut}`;
    if (statut === 'CONFIRME') {
      actionLabel = 'RENDEZ_VOUS_CONFIRME';
      detailMsg = 'Rendez-vous confirmé avec le client';
    } else if (statut === 'ABSENT') {
      actionLabel = 'RENDEZ_VOUS_ABSENT';
      detailMsg = 'Client marqué absent au rendez-vous';
    } else if (statut === 'ANNULE') {
      actionLabel = 'RENDEZ_VOUS_ANNULE';
      detailMsg = `Rendez-vous annulé${raison ? ` (Motif : ${raison})` : ''}`;
    } else if (statut === 'TERMINE') {
      actionLabel = 'RENDEZ_VOUS_TERMINE';
      detailMsg = 'Rendez-vous clôturé avec succès';
    }

    await pgPool.query(
      `INSERT INTO activity_logs (
        client_id, order_id, appointment_id, action, details, utilisateur, metadata, date_action
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [
        apt.client_id,
        apt.order_id,
        id,
        actionLabel,
        detailMsg,
        agentName,
        JSON.stringify({ ancienStatut: apt.statut, nouveauStatut: statut, raison }),
      ]
    );

    return updated;
  }

  /**
   * Enregistrement transactionnel du retrait du travail avec paiement éventuel
   */
  public async recordRetraitTransaction(id: string, data: RecordRetraitInput) {
    if (!pgPool) throw new Error('[AppointmentService] PostgreSQL non disponible.');

    const poolClient = await pgPool.connect();
    try {
      await poolClient.query('BEGIN');

      // 1. Vérifier le rendez-vous
      const aptRes = await poolClient.query(`SELECT * FROM appointments WHERE id = $1 FOR UPDATE`, [id]);
      if (aptRes.rows.length === 0) throw new Error('Rendez-vous introuvable.');
      const apt = aptRes.rows[0];

      if (!apt.order_id) {
        throw new Error('Ce rendez-vous n’est pas associé à une commande de travail.');
      }

      // 2. Vérifier la commande
      const orderRes = await poolClient.query(`SELECT * FROM orders WHERE id = $1 FOR UPDATE`, [apt.order_id]);
      if (orderRes.rows.length === 0) throw new Error('Commande associée introuvable.');
      const order = orderRes.rows[0];

      const agentName = data.agentName || 'Responsable Retrait';
      const montantTotal = Number(order.montant_total) || 0;
      let totalPaye = Number(order.acompte) || 0;
      let soldeRestant = Number(order.solde_restant) || 0;

      // 3. Gestion du paiement au retrait si versé
      const montantVerse = Number(data.montant_regle) || 0;
      let paymentRecord: any = null;

      if (montantVerse > 0) {
        const year = new Date().getFullYear();
        const randRecu = Math.floor(100000 + Math.random() * 900000);
        const numeroRecu = `REC-${year}-${randRecu}`;

        const payRes = await poolClient.query(
          `INSERT INTO payments (
            order_id,
            client_id,
            numero_recu,
            montant,
            mode_paiement,
            reference_transaction,
            caissier,
            notes,
            date_paiement,
            created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
          RETURNING *`,
          [
            order.id,
            order.client_id,
            numeroRecu,
            montantVerse,
            data.mode_paiement || 'ESPECES',
            data.reference_transaction?.trim() || null,
            agentName,
            data.notes?.trim() || `Règlement au retrait de la commande ${order.numero_commande}`,
          ]
        );
        paymentRecord = payRes.rows[0];

        // Recalculer le total payé et solde
        totalPaye += montantVerse;
        soldeRestant = Math.max(0, montantTotal - totalPaye);

        await poolClient.query(
          `INSERT INTO activity_logs (
            client_id, order_id, appointment_id, action, details, utilisateur, metadata, date_action
          ) VALUES ($1, $2, $3, 'PAIEMENT_RETRAIT', $4, $5, $6, NOW())`,
          [
            order.client_id,
            order.id,
            id,
            `Encaissement de ${montantVerse} F CFA au retrait (${data.mode_paiement || 'ESPECES'}). Reçu n° ${numeroRecu}. Solde restant : ${soldeRestant} F CFA`,
            agentName,
            JSON.stringify({ montant: montantVerse, modePaiement: data.mode_paiement, soldeRestant }),
          ]
        );
      }

      // Si solde restant non nul et dérogation accordée
      if (soldeRestant > 0 && data.autoriser_solde_restant) {
        await poolClient.query(
          `INSERT INTO activity_logs (
            client_id, order_id, appointment_id, action, details, utilisateur, metadata, date_action
          ) VALUES ($1, $2, $3, 'DEROGATION_SOLDE_RETRAIT', $4, $5, $6, NOW())`,
          [
            order.client_id,
            order.id,
            id,
            `Dérogation administrative : retrait autorisé avec solde impayé de ${soldeRestant} F CFA. Motif : ${data.motif_derogation || 'Accord direction'}`,
            agentName,
            JSON.stringify({ soldeImpaye: soldeRestant, motif: data.motif_derogation }),
          ]
        );
      }

      // 4. Mettre à jour la commande -> RETIREE
      const updatedOrderRes = await poolClient.query(
        `UPDATE orders SET
          statut = 'RETIREE',
          acompte = $1,
          solde_restant = $2,
          date_retrait = NOW(),
          date_retrait_effectif = NOW(),
          date_terminee = COALESCE(date_terminee, NOW()),
          updated_at = NOW()
         WHERE id = $3
         RETURNING *`,
        [totalPaye, soldeRestant, order.id]
      );
      const updatedOrder = updatedOrderRes.rows[0];

      // 5. Mettre à jour le rendez-vous -> TERMINE
      const updatedAptRes = await poolClient.query(
        `UPDATE appointments SET
          statut = 'TERMINE',
          date_terminee = NOW(),
          retire_le = NOW(),
          retire_par = $1,
          solde_regle_au_retrait = $2,
          updated_at = NOW()
         WHERE id = $3
         RETURNING *`,
        [data.retire_par || agentName, montantVerse, id]
      );
      const updatedApt = updatedAptRes.rows[0];

      // 6. Enregistrer dans activity_logs
      await poolClient.query(
        `INSERT INTO activity_logs (
          client_id, order_id, appointment_id, action, details, utilisateur, metadata, date_action
        ) VALUES ($1, $2, $3, 'RETRAIT_EFFECTUE', $4, $5, $6, NOW())`,
        [
          order.client_id,
          order.id,
          id,
          `Travail remis au client. Remis par : ${data.retire_par || agentName}. Commande clôturée RETIREE.`,
          agentName,
          JSON.stringify({
            commandeNumero: order.numero_commande,
            remisPar: data.retire_par || agentName,
            soldeRestant,
          }),
        ]
      );

      // Notification interne
      await poolClient.query(
        `INSERT INTO notifications (type, titre, message, client_id, order_id, appointment_id)
         VALUES ('RETRAIT', $1, $2, $3, $4, $5)`,
        [
          `Retrait effectué : ${order.numero_commande}`,
          `Commande ${order.numero_commande} remise au client par ${data.retire_par || agentName}.`,
          order.client_id,
          order.id,
          id,
        ]
      );

      await poolClient.query('COMMIT');

      return {
        success: true,
        appointment: updatedApt,
        order: updatedOrder,
        payment: paymentRecord,
        soldeRestant,
      };
    } catch (err) {
      await poolClient.query('ROLLBACK');
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[AppointmentService] Erreur transaction recordRetrait :', msg);
      throw new Error(`Échec de l'enregistrement du retrait : ${msg}`);
    } finally {
      poolClient.release();
    }
  }

  /**
   * Envoi de notification WhatsApp liée au rendez-vous
   */
  public async sendAppointmentWhatsApp(
    id: string,
    templateName: string,
    customVariables?: Record<string, string>,
    agentName: string = 'Agent Canaan CRM'
  ) {
    if (!pgPool) throw new Error('[AppointmentService] PostgreSQL non disponible.');

    const apt = await this.getAppointmentById(id);
    if (!apt) throw new Error('Rendez-vous introuvable.');

    if (!apt.client_whatsapp && !apt.client_telephone) {
      throw new Error('Le client ne possède aucun numéro de téléphone ou WhatsApp.');
    }

    const phoneToUse = apt.client_whatsapp || apt.client_telephone;

    // 1. Vérification que le template existe et est APPROVED dans Meta
    const metaCheck = await whatsappTemplateService.getTemplateByName(templateName);
    if (!metaCheck) {
      throw new Error(`Le modèle WhatsApp « ${templateName} » n’est pas configuré dans le système.`);
    }

    if (metaCheck.meta_status !== 'APPROVED') {
      throw new Error(
        `Le modèle Meta « ${templateName} » est actuellement au statut « ${metaCheck.meta_status} ». Seuls les modèles approuvés par Meta peuvent être diffusés.`
      );
    }

    // 2. Préparation des variables selon le template officiel
    const cleanDate = apt.date_rendez_vous || apt.date;
    const cleanTime = apt.heure_rendez_vous || apt.heure;
    const variables: Record<string, string> = {
      '1': apt.client_prenom || apt.client_nom,
      '2': formatAppointmentDate(cleanDate),
      '3': formatAppointmentTime(cleanTime),
      '4': apt.order_titre || apt.motif || 'Votre commande',
      '5': apt.lieu || DEFAULT_APP_LOCATION,
      ...customVariables,
    };

    // 3. Envoi via le WhatsApp Service
    const parameters = Object.keys(variables)
      .sort((a, b) => Number(a) - Number(b))
      .map((key) => ({
        type: 'text' as const,
        text: String(variables[key] || ''),
      }));

    const sendResult = await whatsAppService.sendTemplateMessage({
      to: phoneToUse,
      templateName,
      components: [
        {
          type: 'body',
          parameters,
        },
      ],
      languageCode: metaCheck.language || 'fr',
    });

    if (!sendResult.success) {
      throw new Error(sendResult.error || 'Erreur lors de l’envoi WhatsApp.');
    }

    // 4. Mettre à jour les drapeaux d'anti-doublon
    let updateField = '';
    if (templateName.includes('confirmation')) updateField = 'confirmation_envoyee = true';
    else if (templateName.includes('j1')) updateField = 'rappel_j1_envoye = true';
    else if (templateName.includes('jour_j')) updateField = 'rappel_jour_j_envoye = true';
    else if (templateName.includes('manque')) updateField = 'message_retard_envoye = true';

    if (updateField) {
      await pgPool.query(`UPDATE appointments SET ${updateField}, updated_at = NOW() WHERE id = $1`, [id]);
    }

    // 5. Enregistrer le message WhatsApp et le log d'activité
    await pgPool.query(
      `INSERT INTO whatsapp_messages (
        client_id, telephone, contenu_texte, meta_message_id, statut, date_envoi, created_at
      ) VALUES ($1, $2, $3, $4, 'ENVOYE', NOW(), NOW())`,
      [
        apt.client_id,
        phoneToUse,
        `[Modèle Meta : ${templateName}] Variables : ${JSON.stringify(variables)}`,
        sendResult.messageId || null,
      ]
    );

    let actionName = 'WHATSAPP_ENVOYE';
    if (templateName.includes('j1')) actionName = 'RAPPEL_J1_ENVOYE';
    else if (templateName.includes('jour_j')) actionName = 'RAPPEL_JOUR_J_ENVOYE';
    else if (templateName.includes('confirmation')) actionName = 'RENDEZ_VOUS_CONFIRME';
    else if (templateName.includes('remerciement')) actionName = 'WHATSAPP_REMERCIEMENT';

    await pgPool.query(
      `INSERT INTO activity_logs (
        client_id, order_id, appointment_id, action, details, utilisateur, metadata, date_action
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [
        apt.client_id,
        apt.order_id || null,
        id,
        actionName,
        `Notification WhatsApp envoyée via le modèle « ${templateName} » à destination du ${phoneToUse}`,
        agentName,
        JSON.stringify({ templateName, variables, messageId: sendResult.messageId }),
      ]
    );

    return {
      success: true,
      messageId: sendResult.messageId,
      template: templateName,
    };
  }

  /**
   * Moteur idempotent d'envoi automatique des rappels J-1 et Jour J
   */
  public async processAppointmentReminders() {
    if (!pgPool) throw new Error('[AppointmentService] PostgreSQL non disponible.');

    const now = new Date();
    const todayStr = getTodayStringCI(now);
    const tomorrowStr = getTomorrowStringCI(now);

    let j1Sent = 0;
    let jourJSent = 0;
    const errors: string[] = [];

    // 1. Rappels J-1 (Rendez-vous prévus DEMAIN, rappel_j1_envoye = false)
    const j1Apts = await pgPool.query(
      `SELECT a.id, a.client_id, a.order_id, c.prenom, c.nom, c.whatsapp, c.telephone, c.consentement_whatsapp,
              COALESCE(a.date_rendez_vous, a.date) AS rdv_date,
              COALESCE(a.heure_rendez_vous, a.heure) AS rdv_heure,
              o.titre AS order_titre, a.motif
       FROM appointments a
       JOIN clients c ON c.id = a.client_id
       LEFT JOIN orders o ON o.id = a.order_id
       WHERE COALESCE(a.date_rendez_vous, a.date) = $1
         AND a.statut NOT IN ('ANNULE', 'TERMINE', 'ABSENT')
         AND a.rappel_j1_envoye = false
         AND (c.consentement_whatsapp = true OR c.whatsapp IS NOT NULL)`,
      [tomorrowStr]
    );

    for (const apt of j1Apts.rows) {
      try {
        await this.sendAppointmentWhatsApp(
          apt.id,
          'rappel_rendez_vous_j1',
          {
            '1': apt.prenom || apt.nom,
            '2': formatAppointmentDate(apt.rdv_date),
            '3': formatAppointmentTime(apt.rdv_heure),
            '4': apt.order_titre || apt.motif || 'Votre commande',
          },
          'Automate Rappels J-1'
        );
        j1Sent++;
      } catch (err: any) {
        errors.push(`Apt ${apt.id} (J-1): ${err.message}`);
      }
    }

    // 2. Rappels Jour J (Rendez-vous prévus AUJOURD'HUI, rappel_jour_j_envoye = false)
    const jourJApts = await pgPool.query(
      `SELECT a.id, a.client_id, a.order_id, c.prenom, c.nom, c.whatsapp, c.telephone, c.consentement_whatsapp,
              COALESCE(a.date_rendez_vous, a.date) AS rdv_date,
              COALESCE(a.heure_rendez_vous, a.heure) AS rdv_heure,
              o.titre AS order_titre, a.motif
       FROM appointments a
       JOIN clients c ON c.id = a.client_id
       LEFT JOIN orders o ON o.id = a.order_id
       WHERE COALESCE(a.date_rendez_vous, a.date) = $1
         AND a.statut NOT IN ('ANNULE', 'TERMINE', 'ABSENT')
         AND a.rappel_jour_j_envoye = false
         AND (c.consentement_whatsapp = true OR c.whatsapp IS NOT NULL)`,
      [todayStr]
    );

    for (const apt of jourJApts.rows) {
      try {
        await this.sendAppointmentWhatsApp(
          apt.id,
          'rappel_rendez_vous_jour_j',
          {
            '1': apt.prenom || apt.nom,
            '2': formatAppointmentTime(apt.rdv_heure),
            '3': apt.order_titre || apt.motif || 'Votre commande',
          },
          'Automate Rappels Jour J'
        );
        jourJSent++;
      } catch (err: any) {
        errors.push(`Apt ${apt.id} (Jour J): ${err.message}`);
      }
    }

    return {
      success: true,
      todayDate: todayStr,
      tomorrowDate: tomorrowStr,
      j1Sent,
      jourJSent,
      totalSent: j1Sent + jourJSent,
      errors,
    };
  }
}

export const appointmentService = new AppointmentService();
