/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { type Request, type Response } from 'express';
import { z } from 'zod';
import { clientService, type ClientCategory, type ClientStatus } from '../services/client.service.ts';

export const clientRouter = express.Router();

const clientCreateSchema = z.object({
  nom: z.string().min(2, 'Le nom doit comporter au moins 2 caractères'),
  prenom: z.string().optional().default(''),
  entreprise: z.string().optional(),
  telephone: z.string().min(8, 'Le numéro de téléphone est obligatoire'),
  whatsapp: z.string().optional(),
  email: z.string().email('Format email invalide').optional().or(z.literal('')),
  ville: z.string().optional().default('Abidjan'),
  quartier: z.string().optional(),
  adresse: z.string().optional(),
  categorie: z.string().optional().default('Particulier'),
  statut_client: z.string().optional().default('NOUVEAU'),
  consentement_whatsapp: z.boolean().optional().default(false),
  consentement_whatsapp_source: z.string().optional().default('FORMULAIRE'),
  centres_interet: z.array(z.string()).optional().default([]),
  notes: z.string().optional(),
  forceDuplicate: z.boolean().optional().default(false),
});

/**
 * GET /api/clients
 * Liste paginée avec filtres et recherche
 */
clientRouter.get('/', async (req: Request, res: Response) => {
  try {
    const result = await clientService.listClients({
      search: req.query.search as string,
      status: req.query.status as string,
      category: req.query.category as string,
      consent: req.query.consent as string,
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
 * POST /api/clients/check-duplicate
 * Détection préalable de doublons
 */
clientRouter.post('/check-duplicate', async (req: Request, res: Response) => {
  try {
    const { telephone, whatsapp, email, excludeId } = req.body;
    if (!telephone) {
      res.status(400).json({ success: false, error: 'Numéro de téléphone requis.' });
      return;
    }
    const check = await clientService.checkDuplicate({ telephone, whatsapp, email, excludeId });
    res.json({ success: true, ...check });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erreur interne';
    res.status(500).json({ success: false, error: msg });
  }
});

/**
 * GET /api/clients/:id
 * Fiche détaillée d'un client
 */
clientRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const client = await clientService.getClientById(req.params.id);
    if (!client) {
      res.status(404).json({ success: false, error: 'Client introuvable.' });
      return;
    }
    res.json({ success: true, client });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erreur interne';
    res.status(500).json({ success: false, error: msg });
  }
});

/**
 * POST /api/clients
 * Création d'un client
 */
clientRouter.post('/', async (req: Request, res: Response) => {
  try {
    const parsed = clientCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: parsed.error.issues.map((i: any) => i.message).join(', '),
      });
      return;
    }

    const result = await clientService.createClient({
      ...parsed.data,
      categorie: parsed.data.categorie as ClientCategory,
      statut_client: parsed.data.statut_client as ClientStatus,
      agentName: (req.headers['x-user-name'] as string) || 'Administrateur',
    });

    if (!result.success) {
      res.status(409).json(result);
      return;
    }

    res.status(201).json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erreur interne';
    res.status(500).json({ success: false, error: msg });
  }
});

/**
 * PUT /api/clients/:id
 * Modification d'un client
 */
clientRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const updated = await clientService.updateClient(req.params.id, {
      ...req.body,
      agentName: (req.headers['x-user-name'] as string) || 'Administrateur',
    });

    if (!updated) {
      res.status(404).json({ success: false, error: 'Client introuvable.' });
      return;
    }

    res.json({ success: true, client: updated });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erreur interne';
    res.status(500).json({ success: false, error: msg });
  }
});

/**
 * PATCH /api/clients/:id/status
 * Modification du statut d'un client
 */
clientRouter.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const { statut } = req.body;
    if (!statut) {
      res.status(400).json({ success: false, error: 'Statut requis.' });
      return;
    }

    const updated = await clientService.updateStatus(
      req.params.id,
      statut as ClientStatus,
      (req.headers['x-user-name'] as string) || 'Administrateur'
    );

    if (!updated) {
      res.status(404).json({ success: false, error: 'Client introuvable.' });
      return;
    }

    res.json({ success: true, client: updated });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erreur interne';
    res.status(500).json({ success: false, error: msg });
  }
});

/**
 * DELETE /api/clients/:id
 * Archivage logique d'un client (pas de suppression physique)
 */
clientRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const archived = await clientService.updateStatus(
      req.params.id,
      'ARCHIVE',
      (req.headers['x-user-name'] as string) || 'Administrateur'
    );

    if (!archived) {
      res.status(404).json({ success: false, error: 'Client introuvable.' });
      return;
    }

    res.json({
      success: true,
      message: 'Client archivé avec succès (historique et données préservés).',
      client: archived,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erreur interne';
    res.status(500).json({ success: false, error: msg });
  }
});

/**
 * GET /api/clients/:id/activity
 * Journal d'activité d'un client
 */
clientRouter.get('/:id/activity', async (req: Request, res: Response) => {
  try {
    const activities = await clientService.getClientActivity(req.params.id);
    res.json({ success: true, activities });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erreur interne';
    res.status(500).json({ success: false, error: msg });
  }
});

/**
 * GET /api/clients/:id/whatsapp-messages
 * Messages WhatsApp liés au client
 */
clientRouter.get('/:id/whatsapp-messages', async (req: Request, res: Response) => {
  try {
    const messages = await clientService.getClientWhatsAppMessages(req.params.id);
    res.json({ success: true, messages });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erreur interne';
    res.status(500).json({ success: false, error: msg });
  }
});

/**
 * GET /api/clients/:id/payments
 * Historique des règlements / acomptes d'un client
 */
clientRouter.get('/:id/payments', async (req: Request, res: Response) => {
  try {
    const payments = await clientService.getClientPayments(req.params.id);
    res.json({ success: true, payments });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erreur interne';
    res.status(500).json({ success: false, error: msg });
  }
});

/**
 * POST /api/clients/:id/whatsapp-send
 * Envoi d'un message WhatsApp au client (texte ou modèle approuvé)
 */
clientRouter.post('/:id/whatsapp-send', async (req: Request, res: Response) => {
  try {
    const { type, text, templateName, templateVariables } = req.body;
    const result = await clientService.sendWhatsAppMessage({
      clientId: req.params.id,
      type: type || 'text',
      text,
      templateName,
      templateVariables,
      agentName: (req.headers['x-user-name'] as string) || 'Administrateur',
    });

    if (!result.success) {
      res.status(400).json(result);
      return;
    }

    res.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erreur interne';
    res.status(500).json({ success: false, error: msg });
  }
});
