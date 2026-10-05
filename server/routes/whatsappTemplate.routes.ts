/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { type Request, type Response } from 'express';
import { z } from 'zod';
import {
  whatsappTemplateService,
  type MetaTemplateCategory,
  type MetaTemplateStatus,
} from '../services/whatsappTemplateService.ts';

export const whatsappTemplateRouter = express.Router();

// Schéma de validation Zod pour la création/mise à jour d'un modèle
const templateSchema = z.object({
  name: z
    .string()
    .min(3, 'Le nom technique doit comporter au moins 3 caractères')
    .max(512, 'Le nom technique ne peut dépasser 512 caractères')
    .regex(
      /^[a-z0-9_]+$/,
      'Le nom technique doit être en minuscules, sans accents, sans espaces, avec underscores uniquement'
    ),
  display_name: z
    .string()
    .min(2, 'Le nom affiché est obligatoire')
    .max(100, 'Le nom affiché ne peut dépasser 100 caractères'),
  language: z.string().default('fr'),
  category: z.enum(['UTILITY', 'MARKETING', 'AUTHENTICATION']),
  body: z
    .string()
    .min(10, 'Le corps du modèle doit comporter au moins 10 caractères')
    .max(1024, 'Le corps du modèle ne peut dépasser 1024 caractères'),
  variables_json: z
    .array(
      z.object({
        index: z.number().int().positive(),
        name: z.string(),
        example: z.string(),
      })
    )
    .default([]),
});

/**
 * GET /api/whatsapp/templates
 * Liste tous les modèles de messages enregistrés
 */
whatsappTemplateRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const templates = await whatsappTemplateService.listTemplates();
    res.json({
      success: true,
      total: templates.length,
      templates,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erreur interne';
    res.status(500).json({ success: false, error: msg });
  }
});

/**
 * GET /api/whatsapp/templates/:id
 * Récupère le détail d'un modèle
 */
whatsappTemplateRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const template = await whatsappTemplateService.getTemplateById(req.params.id);
    if (!template) {
      res.status(404).json({ success: false, error: 'Modèle introuvable.' });
      return;
    }
    res.json({ success: true, template });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erreur interne';
    res.status(500).json({ success: false, error: msg });
  }
});

/**
 * POST /api/whatsapp/templates
 * Crée un nouveau modèle de message en brouillon local
 */
whatsappTemplateRouter.post('/', async (req: Request, res: Response) => {
  try {
    const parsed = templateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: parsed.error.issues.map((e: any) => e.message).join(', '),
      });
      return;
    }

    const created = await whatsappTemplateService.createDraft(parsed.data);
    res.status(201).json({
      success: true,
      message: 'Modèle créé en brouillon local avec succès.',
      template: created,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erreur interne';
    res.status(500).json({ success: false, error: msg });
  }
});

/**
 * PUT /api/whatsapp/templates/:id
 * Modifie un modèle existant
 */
whatsappTemplateRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const partialSchema = templateSchema.partial().omit({ name: true });
    const parsed = partialSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: parsed.error.issues.map((e: any) => e.message).join(', '),
      });
      return;
    }

    const updated = await whatsappTemplateService.updateTemplate(req.params.id, {
      ...parsed.data,
      display_name: parsed.data.display_name,
      category: parsed.data.category as MetaTemplateCategory,
      body: parsed.data.body,
      variables_json: parsed.data.variables_json,
    });

    if (!updated) {
      res.status(404).json({ success: false, error: 'Modèle introuvable.' });
      return;
    }

    res.json({
      success: true,
      message: 'Modèle mis à jour avec succès.',
      template: updated,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erreur interne';
    res.status(500).json({ success: false, error: msg });
  }
});

/**
 * POST /api/whatsapp/templates/:id/submit
 * Soumission explicite d'un modèle à Meta pour approbation
 */
whatsappTemplateRouter.post('/:id/submit', async (req: Request, res: Response) => {
  try {
    const result = await whatsappTemplateService.submitTemplateToMeta(req.params.id);
    if (!result.success) {
      res.status(400).json({
        success: false,
        error: result.error,
        metaResponse: result.metaResponse,
      });
      return;
    }

    res.json({
      success: true,
      message: 'Modèle soumis à Meta avec succès. Statut en attente d’approbation (PENDING).',
      template: result.template,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erreur interne';
    res.status(500).json({ success: false, error: msg });
  }
});

/**
 * POST /api/whatsapp/templates/sync
 * Synchronise les statuts des modèles avec Meta Cloud API
 */
whatsappTemplateRouter.post('/sync', async (_req: Request, res: Response) => {
  try {
    const syncResult = await whatsappTemplateService.syncWithMeta();
    res.json(syncResult);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erreur interne';
    res.status(500).json({ success: false, error: msg });
  }
});

/**
 * PATCH /api/whatsapp/templates/:id/status
 * Met à jour le statut ou l'activation d'un modèle
 */
whatsappTemplateRouter.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const { active, meta_status } = req.body;

    let updated = null;
    if (typeof active === 'boolean') {
      updated = await whatsappTemplateService.toggleActive(req.params.id, active);
    }
    if (meta_status) {
      updated = await whatsappTemplateService.updateStatus(
        req.params.id,
        meta_status as MetaTemplateStatus
      );
    }

    if (!updated) {
      res.status(404).json({ success: false, error: 'Modèle introuvable.' });
      return;
    }

    res.json({
      success: true,
      message: 'Statut du modèle mis à jour.',
      template: updated,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erreur interne';
    res.status(500).json({ success: false, error: msg });
  }
});
