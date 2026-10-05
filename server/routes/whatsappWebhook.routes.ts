/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { type Request, type Response } from 'express';
import {
  findClientByPhone,
  recordWhatsAppMessageToDb,
  updateWhatsAppMessageStatusInDb,
} from '../config/database.ts';

export const whatsappWebhookRouter = express.Router();

export interface WebhookEventLog {
  id: string;
  type: 'MESSAGE' | 'STATUS';
  status?: 'sent' | 'delivered' | 'read' | 'failed';
  fromOrRecipient: string;
  messageId: string;
  timestamp: string;
  contentSummary: string;
  clientId?: string | null;
  clientNom?: string | null;
  details?: Record<string, unknown>;
}

// Journal en mémoire pour inspection immédiate et suivi temps réel
export const recentWebhookEvents: WebhookEventLog[] = [];

/**
 * GET /api/webhooks/whatsapp
 * Vérification du webhook par Meta WhatsApp Cloud API
 */
whatsappWebhookRouter.get('/', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN;

  // Si mode === "subscribe" ET token === process.env.WHATSAPP_VERIFY_TOKEN
  if (mode === 'subscribe' && expectedToken && token === expectedToken) {
    // Retourne UNIQUEMENT la valeur de hub.challenge avec HTTP 200 et Content-Type: text/plain
    res.status(200).type('text/plain').send(String(challenge));
    return;
  }

  // Sinon retourner HTTP 403
  res.status(403).send('Forbidden: Token de vérification incorrect ou mode non supporté');
});

/**
 * POST /api/webhooks/whatsapp
 * Réception des événements en temps réel depuis Meta WhatsApp Cloud API
 */
whatsappWebhookRouter.post('/', async (req: Request, res: Response) => {
  const body = req.body;

  // Acquittement immédiat HTTP 200 à Meta pour éviter les re-tentatives
  res.status(200).json({ status: 'EVENT_RECEIVED' });

  try {
    if (!body || body.object !== 'whatsapp_business_account') {
      return;
    }

    const entries = body.entry || [];
    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        if (change.field !== 'messages') continue;

        const value = change.value;
        if (!value) continue;

        // 1. GESTION DES MESSAGES ENTRANTS
        if (Array.isArray(value.messages)) {
          for (const msg of value.messages) {
            const sender = msg.from; // Numéro de l'expéditeur (ex: 2250701020304)
            const msgId = msg.id;
            const msgType = msg.type;
            const timestamp = msg.timestamp
              ? new Date(Number(msg.timestamp) * 1000).toISOString()
              : new Date().toISOString();

            let summary = `Type: ${msgType}`;
            let mediaUrl: string | undefined = undefined;

            if (msgType === 'text' && msg.text?.body) {
              summary = msg.text.body;
            } else if (msgType === 'image') {
              summary = `[Image] ${msg.image?.caption || 'Photo sans légende'}`;
              mediaUrl = msg.image?.id;
            } else if (msgType === 'button' || msgType === 'interactive') {
              summary = `[Bouton] ${msg.button?.text || msg.interactive?.button_reply?.title || ''}`;
            }

            // Tentative de rattachement au client via son numéro de téléphone
            let matchedClient = null;
            if (sender) {
              try {
                matchedClient = await findClientByPhone(sender);
              } catch (clientFindErr) {
                console.warn('[Webhook] Erreur recherche client :', clientFindErr);
              }
            }

            // Journalisation propre sans secrets
            console.log('[WhatsApp Inbound Message Received]', {
              messageId: msgId,
              sender: sender ? `***${sender.slice(-4)}` : 'Inconnu',
              clientRattache: matchedClient ? `${matchedClient.nom} ${matchedClient.prenom}` : 'Non répertorié',
              summary: summary.slice(0, 80),
              timestamp,
            });

            // Enregistrement dans PostgreSQL / Supabase
            try {
              await recordWhatsAppMessageToDb({
                clientId: matchedClient?.id || null,
                telephone: sender || 'Inconnu',
                contenuTexte: summary,
                metaMessageId: msgId,
                statut: 'LIVRE',
                imageUrl: mediaUrl || null,
                dateEnvoi: timestamp,
              });
            } catch (dbErr) {
              console.warn('[Webhook] Erreur persistance DB message entrant :', dbErr);
            }

            // Enregistrement dans le journal en mémoire
            recentWebhookEvents.unshift({
              id: `in_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              type: 'MESSAGE',
              fromOrRecipient: sender || 'Inconnu',
              messageId: msgId,
              timestamp,
              contentSummary: summary,
              clientId: matchedClient?.id || null,
              clientNom: matchedClient ? `${matchedClient.nom} ${matchedClient.prenom}` : null,
              details: {
                type: msgType,
                hasMedia: Boolean(mediaUrl),
              },
            });
          }
        }

        // 2. GESTION DES STATUTS : sent, delivered, read, failed
        if (Array.isArray(value.statuses)) {
          for (const statusObj of value.statuses) {
            const messageId = statusObj.id;
            const status = statusObj.status as 'sent' | 'delivered' | 'read' | 'failed';
            const recipientId = statusObj.recipient_id;
            const timestamp = statusObj.timestamp
              ? new Date(Number(statusObj.timestamp) * 1000).toISOString()
              : new Date().toISOString();

            const isFailed = status === 'failed';
            const errorDetails = isFailed && statusObj.errors ? JSON.stringify(statusObj.errors) : undefined;

            console.log(`[WhatsApp Status Event: ${status.toUpperCase()}]`, {
              messageId,
              recipient: recipientId ? `***${recipientId.slice(-4)}` : 'Inconnu',
              status,
              timestamp,
              ...(isFailed ? { error: statusObj.errors } : {}),
            });

            // Mise à jour dans PostgreSQL / Supabase
            try {
              await updateWhatsAppMessageStatusInDb({
                metaMessageId: messageId,
                statut: status,
                erreur: errorDetails,
              });
            } catch (dbStatusErr) {
              console.warn('[Webhook] Erreur mise à jour statut DB :', dbStatusErr);
            }

            recentWebhookEvents.unshift({
              id: `st_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              type: 'STATUS',
              status,
              fromOrRecipient: recipientId || 'Inconnu',
              messageId,
              timestamp,
              contentSummary: isFailed
                ? `Échec de livraison : ${errorDetails || 'Erreur Meta'}`
                : `Statut : ${status}`,
              details: isFailed ? { errors: statusObj.errors } : undefined,
            });
          }
        }
      }
    }

    // Garder les 100 derniers événements
    if (recentWebhookEvents.length > 100) {
      recentWebhookEvents.splice(100);
    }
  } catch (error) {
    console.error('[WhatsApp Webhook Processing Global Error]', error);
  }
});

/**
 * GET /api/webhooks/whatsapp/events
 * Inspection des événements récents reçus
 */
whatsappWebhookRouter.get('/events', (_req: Request, res: Response) => {
  res.json({
    total: recentWebhookEvents.length,
    events: recentWebhookEvents.slice(0, 50),
  });
});
