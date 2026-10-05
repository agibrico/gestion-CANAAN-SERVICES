/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { type Request, type Response } from 'express';
import { z } from 'zod';
import { appointmentService } from '../services/appointment.service.ts';
import type { AppointmentType, AppointmentStatus } from '../utils/appointmentUtils.ts';

export const appointmentRouter = express.Router();

const appointmentCreateSchema = z.object({
  client_id: z.string().uuid('ID client invalide'),
  order_id: z.string().uuid('ID commande invalide').optional().nullable(),
  type_rendez_vous: z.enum([
    'RETRAIT_TRAVAIL',
    'VALIDATION_MAQUETTE',
    'DEPOT_FICHIERS',
    'PAIEMENT',
    'CONSULTATION',
    'AUTRE',
  ]),
  date_rendez_vous: z.string().min(8, 'Date requise'),
  heure_rendez_vous: z.string().min(4, 'Heure requise'),
  lieu: z.string().optional().nullable(),
  motif: z.string().optional().nullable(),
  responsable: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  sendWhatsAppConfirmation: z.boolean().optional().default(false),
});

const appointmentUpdateSchema = z.object({
  client_id: z.string().uuid().optional(),
  order_id: z.string().uuid().optional().nullable(),
  type_rendez_vous: z.enum([
    'RETRAIT_TRAVAIL',
    'VALIDATION_MAQUETTE',
    'DEPOT_FICHIERS',
    'PAIEMENT',
    'CONSULTATION',
    'AUTRE',
  ]).optional(),
  date_rendez_vous: z.string().optional(),
  heure_rendez_vous: z.string().optional(),
  lieu: z.string().optional().nullable(),
  motif: z.string().optional().nullable(),
  responsable: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

/**
 * GET /api/appointments/stats
 * Résumé des indicateurs et alertes
 */
appointmentRouter.get('/stats', async (_req: Request, res: Response) => {
  try {
    const stats = await appointmentService.getAppointmentStats();
    res.json({ success: true, ...stats });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erreur interne';
    res.status(500).json({ success: false, error: msg });
  }
});

/**
 * GET /api/appointments/today
 * Liste des rendez-vous prévus aujourd'hui
 */
appointmentRouter.get('/today', async (_req: Request, res: Response) => {
  try {
    const result = await appointmentService.getTodayAppointments();
    res.json({ success: true, ...result });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erreur interne';
    res.status(500).json({ success: false, error: msg });
  }
});

/**
 * GET /api/appointments/tomorrow
 * Liste des rendez-vous prévus demain
 */
appointmentRouter.get('/tomorrow', async (_req: Request, res: Response) => {
  try {
    const result = await appointmentService.getTomorrowAppointments();
    res.json({ success: true, ...result });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erreur interne';
    res.status(500).json({ success: false, error: msg });
  }
});

/**
 * GET /api/appointments/late
 * Liste des rendez-vous en retard
 */
appointmentRouter.get('/late', async (_req: Request, res: Response) => {
  try {
    const result = await appointmentService.getLateAppointments();
    res.json({ success: true, ...result });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erreur interne';
    res.status(500).json({ success: false, error: msg });
  }
});

/**
 * GET /api/appointments/check-conflict
 * Détection de conflit horaire pour un responsable
 */
appointmentRouter.get('/check-conflict', async (req: Request, res: Response) => {
  try {
    const { date, heure, responsable, excludeId } = req.query;
    if (!date || !heure || !responsable) {
      res.json({ hasConflict: false });
      return;
    }
    const result = await appointmentService.checkConflict(
      date as string,
      heure as string,
      responsable as string,
      excludeId as string
    );
    res.json({ success: true, ...result });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erreur interne';
    res.status(500).json({ success: false, error: msg });
  }
});

/**
 * GET /api/appointments
 * Liste paginée avec filtres
 */
appointmentRouter.get('/', async (req: Request, res: Response) => {
  try {
    const result = await appointmentService.listAppointments({
      search: req.query.search as string,
      date: req.query.date as string,
      from: req.query.from as string,
      to: req.query.to as string,
      status: req.query.status as string,
      type: req.query.type as string,
      clientId: req.query.clientId as string,
      orderId: req.query.orderId as string,
      responsable: req.query.responsable as string,
      temporalStatus: req.query.temporalStatus as string,
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 20,
    });
    res.json({ success: true, ...result });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erreur interne';
    res.status(500).json({ success: false, error: msg });
  }
});

/**
 * GET /api/appointments/:id
 * Détails complets d'un rendez-vous
 */
appointmentRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const appointment = await appointmentService.getAppointmentById(req.params.id);
    if (!appointment) {
      res.status(404).json({ success: false, error: 'Rendez-vous introuvable.' });
      return;
    }
    res.json({ success: true, appointment });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erreur interne';
    res.status(500).json({ success: false, error: msg });
  }
});

/**
 * POST /api/appointments
 * Création d'un rendez-vous
 */
appointmentRouter.post('/', async (req: Request, res: Response) => {
  try {
    const parsed = appointmentCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', '),
      });
      return;
    }

    const agentName = (req.headers['x-user-name'] as string) || 'Administrateur';
    const result = await appointmentService.createAppointment({
      ...parsed.data,
      type_rendez_vous: parsed.data.type_rendez_vous as AppointmentType,
      agentName,
    });

    res.status(201).json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erreur interne';
    res.status(400).json({ success: false, error: msg });
  }
});

/**
 * PUT /api/appointments/:id
 * Modification d'un rendez-vous
 */
appointmentRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const parsed = appointmentUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', '),
      });
      return;
    }

    const agentName = (req.headers['x-user-name'] as string) || 'Administrateur';
    const updated = await appointmentService.updateAppointment(
      req.params.id,
      parsed.data,
      agentName
    );

    res.json({ success: true, appointment: updated });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erreur interne';
    res.status(400).json({ success: false, error: msg });
  }
});

/**
 * PATCH /api/appointments/:id/status
 * Changement de statut (CONFIRME, ABSENT, ANNULE, TERMINE)
 */
appointmentRouter.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const { statut, raison } = req.body;
    if (!statut) {
      res.status(400).json({ success: false, error: 'Nouveau statut requis.' });
      return;
    }

    const agentName = (req.headers['x-user-name'] as string) || 'Administrateur';
    const updated = await appointmentService.updateStatus(
      req.params.id,
      statut as AppointmentStatus,
      raison,
      agentName
    );

    res.json({ success: true, appointment: updated });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erreur interne';
    res.status(400).json({ success: false, error: msg });
  }
});

/**
 * POST /api/appointments/:id/confirm
 * Raccourci pour confirmer un rendez-vous
 */
appointmentRouter.post('/:id/confirm', async (req: Request, res: Response) => {
  try {
    const agentName = (req.headers['x-user-name'] as string) || 'Administrateur';
    const updated = await appointmentService.updateStatus(
      req.params.id,
      'CONFIRME',
      'Confirmé par l’agent',
      agentName
    );
    res.json({ success: true, appointment: updated });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erreur interne';
    res.status(400).json({ success: false, error: msg });
  }
});

/**
 * POST /api/appointments/:id/complete
 * Clôturer un rendez-vous simple (consultation, dépôt, validation maquette)
 */
appointmentRouter.post('/:id/complete', async (req: Request, res: Response) => {
  try {
    const agentName = (req.headers['x-user-name'] as string) || 'Administrateur';
    const updated = await appointmentService.updateStatus(
      req.params.id,
      'TERMINE',
      req.body.notes || 'Rendez-vous terminé avec succès',
      agentName
    );
    res.json({ success: true, appointment: updated });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erreur interne';
    res.status(400).json({ success: false, error: msg });
  }
});

/**
 * DELETE /api/appointments/:id
 * Annulation logique d'un rendez-vous
 */
appointmentRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { raison } = req.body || {};
    const agentName = (req.headers['x-user-name'] as string) || 'Administrateur';
    const updated = await appointmentService.updateStatus(
      req.params.id,
      'ANNULE',
      raison || 'Annulé par l’utilisateur',
      agentName
    );
    res.json({ success: true, message: 'Rendez-vous annulé avec succès.', appointment: updated });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erreur interne';
    res.status(400).json({ success: false, error: msg });
  }
});

/**
 * POST /api/appointments/:id/retrait
 * Enregistrement transactionnel du retrait du travail avec encaissement
 */
appointmentRouter.post('/:id/retrait', async (req: Request, res: Response) => {
  try {
    const {
      retire_par,
      notes,
      montant_regle,
      mode_paiement,
      reference_transaction,
      autoriser_solde_restant,
      motif_derogation,
    } = req.body;

    if (!retire_par || !retire_par.trim()) {
      res.status(400).json({
        success: false,
        error: 'Veuillez préciser le nom de la personne ayant remis le travail au client.',
      });
      return;
    }

    const agentName = (req.headers['x-user-name'] as string) || retire_par;
    const result = await appointmentService.recordRetraitTransaction(req.params.id, {
      retire_par: retire_par.trim(),
      notes,
      montant_regle: montant_regle ? Number(montant_regle) : 0,
      mode_paiement,
      reference_transaction,
      autoriser_solde_restant: Boolean(autoriser_solde_restant),
      motif_derogation,
      agentName,
    });

    res.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erreur interne';
    res.status(400).json({ success: false, error: msg });
  }
});

/**
 * POST /api/appointments/:id/whatsapp
 * Déclenchement d'un message WhatsApp de rappel ou confirmation
 */
appointmentRouter.post('/:id/whatsapp', async (req: Request, res: Response) => {
  try {
    const { templateName, customVariables } = req.body;
    if (!templateName) {
      res.status(400).json({ success: false, error: 'Nom du modèle WhatsApp requis.' });
      return;
    }

    const agentName = (req.headers['x-user-name'] as string) || 'Agent Canaan CRM';
    const result = await appointmentService.sendAppointmentWhatsApp(
      req.params.id,
      templateName,
      customVariables,
      agentName
    );

    res.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erreur interne';
    res.status(400).json({ success: false, error: msg });
  }
});

/**
 * POST /api/appointments/process-reminders
 * Déclenchement sécurisé du traitement automatique des rappels J-1 et Jour J
 */
appointmentRouter.post('/process-reminders', async (req: Request, res: Response) => {
  try {
    // Vérification de sécurité optionnelle par en-tête
    const cronSecret = req.headers['x-cron-secret'] || req.query.cronSecret;
    const expectedSecret = process.env.CRON_SECRET || process.env.JWT_SECRET;

    if (expectedSecret && cronSecret !== expectedSecret) {
      // Si une clé secrète est configurée dans l'environnement, on l'exige
      res.status(401).json({ success: false, error: 'Accès non autorisé au déclencheur de rappels.' });
      return;
    }

    const result = await appointmentService.processAppointmentReminders();
    res.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erreur interne';
    res.status(500).json({ success: false, error: msg });
  }
});
