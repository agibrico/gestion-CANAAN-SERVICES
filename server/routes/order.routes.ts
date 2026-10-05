/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { type Request, type Response } from 'express';
import { z } from 'zod';
import { orderService } from '../services/order.service.ts';
import type { OrderStatus, OrderPriority, PaymentMode } from '../utils/orderUtils.ts';

export const orderRouter = express.Router();

const orderItemSchema = z.object({
  designation: z.string().min(2, 'La désignation doit comporter au moins 2 caractères'),
  categorie: z.string().optional().default('Autre'),
  description: z.string().optional(),
  quantite: z.number().int().min(1, 'La quantité minimale est 1'),
  prix_unitaire: z.number().min(0, 'Le prix unitaire doit être positif ou nul'),
  specifications: z.record(z.string(), z.any()).optional().default({}),
});

const orderCreateSchema = z.object({
  client_id: z.string().uuid('ID client invalide'),
  titre: z.string().min(2, 'Le titre du travail est requis'),
  description: z.string().optional(),
  items: z.array(orderItemSchema).min(1, 'Au moins une prestation est requise'),
  remise: z.number().min(0).optional().default(0),
  acompte: z.number().min(0).optional().default(0),
  mode_acompte: z.enum(['ESPECES', 'WAVE', 'ORANGE_MONEY', 'MTN_MONEY', 'MOOV_MONEY', 'VIREMENT', 'AUTRE']).optional().default('ESPECES'),
  date_prevue: z.string().optional().nullable(),
  date_retrait: z.string().optional().nullable(),
  responsable: z.string().optional().nullable(),
  priorite: z.enum(['NORMALE', 'URGENTE', 'TRES_URGENTE']).optional().default('NORMALE'),
  notes: z.string().optional().nullable(),
  fichiers: z.array(z.object({
    nom: z.string(),
    url: z.string(),
    type: z.string().optional(),
    taille: z.number().optional(),
  })).optional().default([]),
});

/**
 * GET /api/orders
 * Liste des commandes avec filtres, recherche et pagination
 */
orderRouter.get('/', async (req: Request, res: Response) => {
  try {
    const result = await orderService.listOrders({
      search: req.query.search as string,
      status: req.query.status as string,
      clientId: req.query.clientId as string,
      from: req.query.from as string,
      to: req.query.to as string,
      responsable: req.query.responsable as string,
      priority: req.query.priority as string,
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
 * GET /api/orders/:id
 * Détails complets d'une commande
 */
orderRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const order = await orderService.getOrderById(req.params.id);
    if (!order) {
      res.status(404).json({ success: false, error: 'Commande introuvable.' });
      return;
    }
    res.json({ success: true, order });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erreur interne';
    res.status(500).json({ success: false, error: msg });
  }
});

/**
 * POST /api/orders
 * Création d'une commande
 */
orderRouter.post('/', async (req: Request, res: Response) => {
  try {
    const parsed = orderCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: parsed.error.issues.map((i: any) => `${i.path.join('.')}: ${i.message}`).join(', '),
      });
      return;
    }

    const result = await orderService.createOrder({
      ...parsed.data,
      agentName: (req.headers['x-user-name'] as string) || 'Administrateur',
    });

    res.status(201).json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erreur interne';
    res.status(400).json({ success: false, error: msg });
  }
});

/**
 * PUT /api/orders/:id
 * Modification d'une commande
 */
orderRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const updated = await orderService.updateOrder(
      req.params.id,
      req.body,
      (req.headers['x-user-name'] as string) || 'Administrateur'
    );
    res.json({ success: true, order: updated });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erreur interne';
    res.status(400).json({ success: false, error: msg });
  }
});

/**
 * PATCH /api/orders/:id/status
 * Changement de statut avec contrôle des transitions
 */
orderRouter.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const { statut, force, raison } = req.body;
    if (!statut) {
      res.status(400).json({ success: false, error: 'Nouveau statut requis.' });
      return;
    }

    const result = await orderService.updateOrderStatus(
      req.params.id,
      statut as OrderStatus,
      {
        force: Boolean(force),
        raison,
        agentName: (req.headers['x-user-name'] as string) || 'Administrateur',
      }
    );

    res.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erreur interne';
    res.status(400).json({ success: false, error: msg });
  }
});

/**
 * DELETE /api/orders/:id
 * Annulation logique de la commande
 */
orderRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { motif } = req.body || {};
    const result = await orderService.cancelOrder(
      req.params.id,
      motif,
      (req.headers['x-user-name'] as string) || 'Administrateur'
    );
    res.json({ message: 'Commande annulée avec succès.', ...result });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erreur interne';
    res.status(400).json({ success: false, error: msg });
  }
});

/**
 * POST /api/orders/:id/payments
 * Ajout d'un règlement / paiement
 */
orderRouter.post('/:id/payments', async (req: Request, res: Response) => {
  try {
    const { montant, mode_paiement, reference_transaction, notes } = req.body;
    if (!montant || Number(montant) <= 0) {
      res.status(400).json({ success: false, error: 'Montant invalide.' });
      return;
    }

    const result = await orderService.addPaymentToOrder(req.params.id, {
      montant: Number(montant),
      mode_paiement: (mode_paiement as PaymentMode) || 'ESPECES',
      reference_transaction,
      notes,
      agentName: (req.headers['x-user-name'] as string) || 'Caisse Canaan Services',
    });

    res.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erreur interne';
    res.status(400).json({ success: false, error: msg });
  }
});

/**
 * POST /api/orders/:id/whatsapp
 * Déclenchement d'une notification WhatsApp liée à la commande
 */
orderRouter.post('/:id/whatsapp', async (req: Request, res: Response) => {
  try {
    const { templateName, customVariables } = req.body;
    if (!templateName) {
      res.status(400).json({ success: false, error: 'Nom du modèle WhatsApp requis.' });
      return;
    }

    const result = await orderService.sendOrderWhatsAppNotification(req.params.id, {
      templateName,
      customVariables,
      agentName: (req.headers['x-user-name'] as string) || 'Agent Canaan CRM',
    });

    res.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erreur interne';
    res.status(400).json({ success: false, error: msg });
  }
});
