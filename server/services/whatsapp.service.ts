/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Service officiel pour interagir avec WhatsApp Business Cloud API de Meta
 * Conçu exclusivement côté serveur Node.js / Express
 */

export interface SendWhatsAppTextMessageParams {
  to: string; // Numéro international (ex: 2250701020304)
  text: string;
}

export interface SendWhatsAppTemplateMessageParams {
  to: string;
  templateName: string;
  languageCode?: string;
  components?: Array<{
    type: 'header' | 'body' | 'button';
    parameters: Array<{
      type: 'text' | 'image' | 'date_time' | 'currency';
      text?: string;
      image?: { link: string };
    }>;
  }>;
}

export interface SendWhatsAppMediaMessageParams {
  to: string;
  mediaType: 'image' | 'document';
  mediaUrl: string;
  caption?: string;
}

export class WhatsAppCloudApiService {
  private apiVersion: string;
  private phoneNumberId: string;
  private accessToken: string;
  private baseUrl: string;

  constructor() {
    this.apiVersion = process.env.WHATSAPP_API_VERSION || 'v21.0';
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN || '';
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}`;
  }

  /**
   * Vérifie si le service WhatsApp est correctement configuré
   */
  public isConfigured(): boolean {
    return Boolean(this.phoneNumberId && this.accessToken);
  }

  /**
   * Envoi d'un message texte simple via Meta Graph API
   */
  public async sendTextMessage(params: SendWhatsAppTextMessageParams) {
    if (!this.isConfigured()) {
      console.warn('[WhatsApp Service] Configuration manquante (PHONE_NUMBER_ID ou ACCESS_TOKEN non défini).');
      return { success: false, error: 'WhatsApp Cloud API non configuré sur le serveur' };
    }

    const cleanNumber = params.to.replace(/\D/g, '');
    const url = `${this.baseUrl}/${this.phoneNumberId}/messages`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanNumber,
          type: 'text',
          text: {
            preview_url: false,
            body: params.text,
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        console.error('[WhatsApp Service Error]', {
          status: response.status,
          error: data.error?.message || 'Erreur inconnue Meta',
        });
        return { success: false, error: data.error?.message || 'Erreur Meta' };
      }

      const messageId = data.messages?.[0]?.id;
      return { success: true, messageId, data };
    } catch (error) {
      console.error('[WhatsApp Service Network Error]', error);
      return { success: false, error: 'Erreur réseau vers Meta Graph API' };
    }
  }

  /**
   * Envoi d'un modèle prédéfini Meta (Template)
   */
  public async sendTemplateMessage(params: SendWhatsAppTemplateMessageParams) {
    if (!this.isConfigured()) {
      return { success: false, error: 'WhatsApp Cloud API non configuré' };
    }

    const cleanNumber = params.to.replace(/\D/g, '');
    const url = `${this.baseUrl}/${this.phoneNumberId}/messages`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: cleanNumber,
          type: 'template',
          template: {
            name: params.templateName,
            language: { code: params.languageCode || 'fr' },
            components: params.components || [],
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        console.error('[WhatsApp Template Error]', data.error);
        return { success: false, error: data.error?.message || 'Erreur template Meta' };
      }

      return { success: true, messageId: data.messages?.[0]?.id, data };
    } catch (error) {
      return { success: false, error: 'Erreur communication Meta' };
    }
  }

  /**
   * Envoi d'une image publicitaire avec légende
   */
  public async sendImageMessage(params: SendWhatsAppMediaMessageParams) {
    if (!this.isConfigured()) {
      return { success: false, error: 'WhatsApp Cloud API non configuré' };
    }

    const cleanNumber = params.to.replace(/\D/g, '');
    const url = `${this.baseUrl}/${this.phoneNumberId}/messages`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: cleanNumber,
          type: 'image',
          image: {
            link: params.mediaUrl,
            caption: params.caption,
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: data.error?.message || 'Erreur envoi image Meta' };
      }

      return { success: true, messageId: data.messages?.[0]?.id, data };
    } catch (error) {
      return { success: false, error: 'Erreur réseau Meta Graph API' };
    }
  }
}

export const whatsAppService = new WhatsAppCloudApiService();
