/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { whatsappWebhookRouter } from './server/routes/whatsappWebhook.routes.ts';
import { whatsappTemplateRouter } from './server/routes/whatsappTemplate.routes.ts';
import { clientRouter } from './server/routes/client.routes.ts';
import { orderRouter } from './server/routes/order.routes.ts';
import { appointmentRouter } from './server/routes/appointment.routes.ts';

// Charger les variables d'environnement
dotenv.config({ override: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const isProduction = process.env.NODE_ENV === 'production';

  // Middlewares pour parser le JSON et urlencoded
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Routes Webhook officielles WhatsApp Cloud API
  app.use('/api/webhooks/whatsapp', whatsappWebhookRouter);

  // Routes Modèles WhatsApp Cloud API
  app.use('/api/whatsapp/templates', whatsappTemplateRouter);

  // Routes Clients & CRM
  app.use('/api/clients', clientRouter);

  // Routes Commandes & Travaux
  app.use('/api/orders', orderRouter);

  // Routes Rendez-vous & Retraits
  app.use('/api/appointments', appointmentRouter);

  // Healthcheck API
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'OK',
      app: 'Canaan Clients API',
      timestamp: new Date().toISOString(),
      webhookConfigured: Boolean(
        process.env.WHATSAPP_VERIFY_TOKEN || process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN
      ),
    });
  });

  // Intégration Vite en développement ou distribution statique en production
  if (!isProduction) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT,
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);
    console.log('[Canaan Server] Vite dev middleware monté.');
  } else {
    // Mode production : servir les fichiers compilés de dist
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Canaan Server] Serveur démarré sur http://0.0.0.0:${PORT}`);
    console.log(`[Canaan Server] Webhook WhatsApp disponible sur GET/POST /api/webhooks/whatsapp`);
  });
}

startServer().catch((err) => {
  console.error('[Canaan Server] Échec de démarrage du serveur :', err);
  process.exit(1);
});
