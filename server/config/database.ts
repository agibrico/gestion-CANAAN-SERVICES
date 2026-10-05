/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import pg from 'pg';

const { Pool } = pg;

// Client Supabase (initialisé si SUPABASE_URL et SUPABASE_SERVICE_ROLE sont fournis)
export let supabase: SupabaseClient | null = null;

// Pool PostgreSQL direct (initialisé si DATABASE_URL est fourni)
export let pgPool: pg.Pool | null = null;

let rawSupabaseUrl = process.env.SUPABASE_URL || '';
if (rawSupabaseUrl.includes('=')) {
  rawSupabaseUrl = rawSupabaseUrl.substring(rawSupabaseUrl.indexOf('=') + 1).trim();
}
if (rawSupabaseUrl && !rawSupabaseUrl.startsWith('http://') && !rawSupabaseUrl.startsWith('https://')) {
  rawSupabaseUrl = `https://${rawSupabaseUrl}`;
}

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE ||
  process.env.SUPABASE_KEY;

if (rawSupabaseUrl && supabaseKey) {
  try {
    supabase = createClient(rawSupabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    console.log('[Database] Client Supabase configuré avec succès via Service Role.');
  } catch (err) {
    console.warn('[Database] Erreur initialisation Supabase :', err);
  }
}

if (process.env.DATABASE_URL) {
  try {
    pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
    });
    console.log('[Database] Pool PostgreSQL direct configuré avec succès.');

    pgPool.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nom TEXT NOT NULL,
        prenom TEXT NOT NULL,
        entreprise TEXT,
        telephone TEXT NOT NULL,
        whatsapp TEXT,
        email TEXT,
        ville TEXT DEFAULT 'Abidjan',
        quartier TEXT,
        adresse TEXT,
        categorie TEXT NOT NULL DEFAULT 'PARTICULIER',
        statut_client TEXT NOT NULL DEFAULT 'NOUVEAU',
        consentement_whatsapp BOOLEAN NOT NULL DEFAULT false,
        centres_interet JSONB DEFAULT '[]'::jsonb,
        notes TEXT,
        photo_url TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_clients_telephone ON clients (telephone);
      CREATE INDEX IF NOT EXISTS idx_clients_whatsapp ON clients (whatsapp);
      CREATE INDEX IF NOT EXISTS idx_clients_statut ON clients (statut_client);

      CREATE TABLE IF NOT EXISTS order_counters (
        year INT PRIMARY KEY,
        current_val INT NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        numero TEXT,
        numero_commande TEXT UNIQUE NOT NULL,
        client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
        titre TEXT NOT NULL,
        description TEXT,
        statut TEXT NOT NULL DEFAULT 'COMMANDE_RECUE',
        montant_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
        acompte NUMERIC(12, 2) NOT NULL DEFAULT 0,
        solde_restant NUMERIC(12, 2) NOT NULL DEFAULT 0,
        remise NUMERIC(12, 2) NOT NULL DEFAULT 0,
        date_commande TIMESTAMPTZ DEFAULT NOW(),
        date_prevue TIMESTAMPTZ,
        date_livraison_prevue TIMESTAMPTZ,
        date_terminee TIMESTAMPTZ,
        date_retrait TIMESTAMPTZ,
        date_retrait_effectif TIMESTAMPTZ,
        responsable TEXT,
        priorite TEXT DEFAULT 'NORMALE',
        notes TEXT,
        fichiers JSONB DEFAULT '[]'::jsonb,
        notification_pret_envoyee BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_orders_client_id ON orders (client_id);
      CREATE INDEX IF NOT EXISTS idx_orders_statut ON orders (statut);
      CREATE INDEX IF NOT EXISTS idx_orders_numero_commande ON orders (numero_commande);
      CREATE INDEX IF NOT EXISTS idx_orders_date_prevue ON orders (date_prevue);
      CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at);

      CREATE TABLE IF NOT EXISTS order_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        designation TEXT NOT NULL,
        categorie TEXT,
        description TEXT,
        quantite INTEGER NOT NULL DEFAULT 1,
        prix_unitaire NUMERIC(12, 2) NOT NULL DEFAULT 0,
        prix_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
        specifications JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items (order_id);

      CREATE TABLE IF NOT EXISTS appointments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
        order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
        type_rendez_vous TEXT NOT NULL DEFAULT 'RETRAIT_TRAVAIL',
        date_rendez_vous DATE,
        heure_rendez_vous TIME,
        date DATE,
        heure TIME,
        motif TEXT NOT NULL,
        lieu TEXT DEFAULT 'Atelier Canaan Services - Abidjan',
        responsable TEXT,
        statut TEXT NOT NULL DEFAULT 'A_CONFIRMER',
        notes TEXT,
        confirmation_envoyee BOOLEAN DEFAULT false,
        rappel_j1_envoye BOOLEAN DEFAULT false,
        rappel_jour_j_envoye BOOLEAN DEFAULT false,
        message_retard_envoye BOOLEAN DEFAULT false,
        date_confirmation TIMESTAMPTZ,
        date_terminee TIMESTAMPTZ,
        retire_le TIMESTAMPTZ,
        retire_par TEXT,
        solde_regle_au_retrait NUMERIC(12, 2) DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      ALTER TABLE appointments ADD COLUMN IF NOT EXISTS type_rendez_vous TEXT DEFAULT 'RETRAIT_TRAVAIL';
      ALTER TABLE appointments ADD COLUMN IF NOT EXISTS date_rendez_vous DATE;
      ALTER TABLE appointments ADD COLUMN IF NOT EXISTS heure_rendez_vous TIME;
      ALTER TABLE appointments ADD COLUMN IF NOT EXISTS responsable TEXT;
      ALTER TABLE appointments ADD COLUMN IF NOT EXISTS message_retard_envoye BOOLEAN DEFAULT false;
      ALTER TABLE appointments ADD COLUMN IF NOT EXISTS date_confirmation TIMESTAMPTZ;
      ALTER TABLE appointments ADD COLUMN IF NOT EXISTS date_terminee TIMESTAMPTZ;
      ALTER TABLE appointments ADD COLUMN IF NOT EXISTS retire_le TIMESTAMPTZ;
      ALTER TABLE appointments ADD COLUMN IF NOT EXISTS retire_par TEXT;
      ALTER TABLE appointments ADD COLUMN IF NOT EXISTS solde_regle_au_retrait NUMERIC(12, 2) DEFAULT 0;

      CREATE INDEX IF NOT EXISTS idx_appointments_client_id ON appointments (client_id);
      CREATE INDEX IF NOT EXISTS idx_appointments_order_id ON appointments (order_id);
      CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments (COALESCE(date_rendez_vous, date));
      CREATE INDEX IF NOT EXISTS idx_appointments_statut ON appointments (statut);
      CREATE INDEX IF NOT EXISTS idx_appointments_type ON appointments (COALESCE(type_rendez_vous, motif));
      CREATE INDEX IF NOT EXISTS idx_appointments_date_statut ON appointments (COALESCE(date_rendez_vous, date), statut);

      CREATE TABLE IF NOT EXISTS payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
        client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
        numero_recu TEXT UNIQUE NOT NULL,
        montant NUMERIC(12, 2) NOT NULL DEFAULT 0,
        mode_paiement TEXT NOT NULL DEFAULT 'ESPECES',
        reference_transaction TEXT,
        caissier TEXT DEFAULT 'Caisse Canaan',
        notes TEXT,
        date_paiement TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments (order_id);
      CREATE INDEX IF NOT EXISTS idx_payments_client_id ON payments (client_id);

      CREATE TABLE IF NOT EXISTS whatsapp_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT UNIQUE NOT NULL,
        display_name TEXT NOT NULL,
        language TEXT NOT NULL DEFAULT 'fr',
        category TEXT NOT NULL CHECK (category IN ('UTILITY', 'MARKETING', 'AUTHENTICATION')),
        body TEXT NOT NULL,
        variables_json JSONB NOT NULL DEFAULT '[]'::jsonb,
        meta_template_id TEXT,
        meta_status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (meta_status IN ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'PAUSED', 'DISABLED')),
        active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_name ON whatsapp_templates (name);
      CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_status ON whatsapp_templates (meta_status);
      CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_active ON whatsapp_templates (active);

      CREATE TABLE IF NOT EXISTS whatsapp_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
        telephone TEXT NOT NULL,
        contenu_texte TEXT,
        meta_message_id TEXT UNIQUE,
        statut TEXT NOT NULL DEFAULT 'ENVOYE',
        image_url TEXT,
        erreur TEXT,
        date_envoi TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_meta_id ON whatsapp_messages (meta_message_id);
      CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_client_id ON whatsapp_messages (client_id);
      CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_statut ON whatsapp_messages (statut);

      CREATE TABLE IF NOT EXISTS activity_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
        order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
        appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
        action TEXT NOT NULL,
        details TEXT,
        utilisateur TEXT,
        metadata JSONB DEFAULT '{}'::jsonb,
        date_action TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL;
      CREATE INDEX IF NOT EXISTS idx_activity_logs_client_id ON activity_logs (client_id);
      CREATE INDEX IF NOT EXISTS idx_activity_logs_order_id ON activity_logs (order_id);
      CREATE INDEX IF NOT EXISTS idx_activity_logs_appointment_id ON activity_logs (appointment_id);
      CREATE INDEX IF NOT EXISTS idx_activity_logs_date ON activity_logs (date_action);

      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type TEXT NOT NULL,
        titre TEXT NOT NULL,
        message TEXT NOT NULL,
        client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
        order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
        appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
        read BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications (read);
      CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications (created_at DESC);
    `).catch((migrationErr) => {
      console.warn('[Database] Initialisation tables schéma :', migrationErr);
    });
  } catch (err) {
    console.warn('[Database] Erreur initialisation PostgreSQL Pool :', err);
  }
}

if (!supabase && !pgPool) {
  console.log('[Database] Mode démonstration / mémoire actif (DATABASE_URL ou SUPABASE_URL non configuré).');
}

import { normalizePhoneNumber, extractSignificantDigits } from '../utils/phoneUtils.ts';

export interface MatchedClient {
  id: string;
  nom: string;
  prenom: string;
  telephone: string;
  whatsapp: string;
}

/**
 * Recherche un client dans la base de données via son numéro de téléphone
 */
export async function findClientByPhone(phone: string): Promise<MatchedClient | null> {
  const normalized = normalizePhoneNumber(phone);
  const digits = extractSignificantDigits(phone);
  if (!normalized && !digits) return null;

  // 1. Recherche via Supabase
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, nom, prenom, telephone, whatsapp')
        .or(`whatsapp.eq.${normalized},telephone.eq.${normalized},whatsapp.ilike.%${digits}%,telephone.ilike.%${digits}%`)
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        return data as MatchedClient;
      }
    } catch (e) {
      console.warn('[Database] Erreur recherche client Supabase :', e);
    }
  }

  // 2. Recherche via PostgreSQL direct
  if (pgPool) {
    try {
      const result = await pgPool.query(
        `SELECT id, nom, prenom, telephone, whatsapp FROM clients 
         WHERE whatsapp = $1 OR telephone = $1 OR whatsapp LIKE $2 OR telephone LIKE $2
         LIMIT 1`,
        [normalized, `%${digits}%`]
      );
      if (result.rows.length > 0) {
        return result.rows[0] as MatchedClient;
      }
    } catch (e) {
      console.warn('[Database] Erreur recherche client PostgreSQL :', e);
    }
  }

  return null;
}

/**
 * Enregistre un message entrant ou sortant dans PostgreSQL / Supabase
 */
export async function recordWhatsAppMessageToDb(params: {
  clientId?: string | null;
  telephone: string;
  contenuTexte: string;
  metaMessageId: string;
  statut: 'EN_ATTENTE' | 'ENVOYE' | 'LIVRE' | 'LU' | 'ECHEC';
  imageUrl?: string | null;
  dateEnvoi: string;
}) {
  const { clientId, telephone, contenuTexte, metaMessageId, statut, imageUrl, dateEnvoi } = params;

  if (pgPool) {
    try {
      await pgPool.query(
        `INSERT INTO whatsapp_messages (client_id, telephone, contenu_texte, meta_message_id, statut, image_url, date_envoi)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (meta_message_id)
         DO UPDATE SET statut = EXCLUDED.statut, contenu_texte = EXCLUDED.contenu_texte, date_envoi = EXCLUDED.date_envoi`,
        [clientId || null, telephone, contenuTexte, metaMessageId, statut, imageUrl || null, dateEnvoi]
      );

      if (clientId) {
        await pgPool.query(
          `INSERT INTO activity_logs (client_id, action, details, utilisateur, date_action)
           VALUES ($1, $2, $3, $4, $5)`,
          [clientId, 'MESSAGE_MANUEL_ENVOYE', `Message WhatsApp reçu : "${contenuTexte.slice(0, 120)}"`, 'WhatsApp Webhook (Automatique)', dateEnvoi]
        );
      }
    } catch (err) {
      console.warn('[Database] Erreur insertion message PostgreSQL :', err);
    }
  }

  if (supabase) {
    try {
      await supabase.from('whatsapp_messages').insert({
        client_id: clientId || null,
        telephone,
        contenu_texte: contenuTexte,
        meta_message_id: metaMessageId,
        statut,
        image_url: imageUrl || null,
        date_envoi: dateEnvoi,
      });

      if (clientId) {
        await supabase.from('activity_logs').insert({
          client_id: clientId,
          action: 'MESSAGE_MANUEL_ENVOYE',
          details: `Message WhatsApp reçu : "${contenuTexte.slice(0, 120)}"`,
          utilisateur: 'WhatsApp Webhook (Automatique)',
          date_action: dateEnvoi,
        });
      }
    } catch (err) {
      console.warn('[Database] Erreur insertion message Supabase :', err);
    }
  }
}

/**
 * Met à jour le statut d'un message dans la base (sent, delivered, read, failed)
 */
export async function updateWhatsAppMessageStatusInDb(params: {
  metaMessageId: string;
  statut: 'sent' | 'delivered' | 'read' | 'failed';
  erreur?: string | null;
}) {
  const { metaMessageId, statut, erreur } = params;

  const mappedStatus =
    statut === 'sent'
      ? 'ENVOYE'
      : statut === 'delivered'
      ? 'LIVRE'
      : statut === 'read'
      ? 'LU'
      : 'ECHEC';

  if (supabase) {
    try {
      const { data } = await supabase
        .from('whatsapp_messages')
        .update({
          statut: mappedStatus,
          erreur: erreur || null,
        })
        .eq('meta_message_id', metaMessageId)
        .select();

      if (!data || data.length === 0) {
        await supabase.from('whatsapp_messages').insert({
          telephone: 'Non spécifié',
          contenu_texte: `Message WhatsApp ${metaMessageId}`,
          meta_message_id: metaMessageId,
          statut: mappedStatus,
          erreur: erreur || null,
          date_envoi: new Date().toISOString(),
        });
      }
      return;
    } catch (err) {
      console.warn('[Database] Erreur mise à jour statut Supabase :', err);
    }
  }

  if (pgPool) {
    try {
      const result = await pgPool.query(
        `UPDATE whatsapp_messages 
         SET statut = $1, erreur = $2 
         WHERE meta_message_id = $3`,
        [mappedStatus, erreur || null, metaMessageId]
      );

      if (result.rowCount === 0) {
        await pgPool.query(
          `INSERT INTO whatsapp_messages (telephone, contenu_texte, meta_message_id, statut, erreur, date_envoi)
           VALUES ($1, $2, $3, $4, $5, NOW())
           ON CONFLICT (meta_message_id) 
           DO UPDATE SET statut = EXCLUDED.statut, erreur = EXCLUDED.erreur`,
          ['Non spécifié', `Message WhatsApp ${metaMessageId}`, metaMessageId, mappedStatus, erreur || null]
        );
      }
    } catch (err) {
      console.warn('[Database] Erreur mise à jour statut PostgreSQL :', err);
    }
  }
}
