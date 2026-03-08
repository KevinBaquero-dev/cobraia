import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ChatService } from '../chat/chat.service';
import { Plan } from '@prisma/client';
import twilio from 'twilio';

@Injectable()
export class WhatsappService {
  private client: twilio.Twilio | null = null;

  constructor(
    private prisma: PrismaService,
    private chatService: ChatService,
  ) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (accountSid && authToken && accountSid !== 'mock') {
      this.client = twilio(accountSid, authToken);
    }
  }

  private isMockMode(): boolean {
    return (
      !process.env.TWILIO_ACCOUNT_SID ||
      process.env.TWILIO_ACCOUNT_SID === 'mock' ||
      process.env.WHATSAPP_MOCK_MODE === 'true'
    );
  }

  async handleWebhook(payload: any) {
    const from: string = payload.From || '';
    const body: string = payload.Body || '';
    const profileName: string = payload.ProfileName || 'Cliente';

    // Extraer número de teléfono (formato: whatsapp:+57XXXXXXXXXX)
    const phone = from.replace('whatsapp:', '');

    // Buscar tenant por número de WhatsApp configurado
    const tenant = await this.prisma.tenant.findFirst({
      where: { whatsappNumber: payload.To?.replace('whatsapp:', '') },
      select: { id: true, plan: true },
    });

    if (!tenant) {
      return this.buildTwimlResponse('Lo sentimos, este número no está configurado.');
    }

    if (tenant.plan !== Plan.ENTERPRISE) {
      return this.buildTwimlResponse('El chatbot por WhatsApp está disponible en el plan Empresarial.');
    }

    // Buscar o crear cliente por teléfono
    let client = await this.prisma.client.findFirst({
      where: { tenantId: tenant.id, phone },
    });

    if (!client) {
      client = await this.prisma.client.create({
        data: {
          tenantId: tenant.id,
          name: profileName,
          phone,
          email: `${phone.replace('+', '')}@whatsapp.temp`,
        },
      });
    }

    // Buscar conversación activa de WhatsApp
    let conversation = await this.prisma.chatConversation.findFirst({
      where: {
        tenantId: tenant.id,
        userId: client.id,
        channel: 'whatsapp',
        isActive: true,
      },
    });

    // Usar el ChatService para generar respuesta (mock o real)
    const userId = await this.getOrCreateUserId(tenant.id);
    const chatResponse = await this.chatService.sendMessage(
      tenant.id,
      userId,
      {
        message: body,
        conversationId: conversation?.id,
      },
    );

    const responseText = chatResponse.message;

    // Enviar respuesta por WhatsApp
    if (!this.isMockMode() && this.client) {
      await this.client.messages.create({
        from: payload.To,
        to: from,
        body: responseText,
      });
    }

    return this.buildTwimlResponse(responseText);
  }

  async sendInvoiceWhatsapp(tenantId: string, invoiceId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { plan: true, companyName: true, whatsappNumber: true },
    });

    if (!tenant) throw new NotFoundException('Tenant no encontrado');
    if (tenant.plan !== Plan.ENTERPRISE) {
      throw new ForbiddenException('Envío por WhatsApp disponible en plan Empresarial');
    }

    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
      include: { client: true },
    });

    if (!invoice) throw new NotFoundException('Factura no encontrada');
    if (!invoice.client.phone) {
      throw new ForbiddenException('El cliente no tiene número de teléfono registrado');
    }

    const message = `Hola ${invoice.client.name}, te enviamos la factura *${invoice.invoiceNumber}* por valor de *$${Number(invoice.total).toLocaleString('es-CO')} COP* de parte de *${tenant.companyName}*.\n\n${invoice.pdfUrl ? `📄 Descarga tu factura: ${invoice.pdfUrl}` : 'Tu factura está siendo procesada.'}`;

    if (this.isMockMode()) {
      return {
        mock: true,
        to: `whatsapp:${invoice.client.phone}`,
        message,
        invoiceNumber: invoice.invoiceNumber,
      };
    }

    if (!this.client) throw new ForbiddenException('Twilio no configurado');

    const twilioMessage = await this.client.messages.create({
      from: `whatsapp:${tenant.whatsappNumber}`,
      to: `whatsapp:${invoice.client.phone}`,
      body: message,
    });

    return {
      sid: twilioMessage.sid,
      status: twilioMessage.status,
      to: twilioMessage.to,
      invoiceNumber: invoice.invoiceNumber,
    };
  }

  private buildTwimlResponse(message: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${message}</Message></Response>`;
  }

  private async getOrCreateUserId(tenantId: string): Promise<string> {
    const user = await this.prisma.user.findFirst({
      where: { tenantId, role: 'OWNER' },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('Usuario owner no encontrado');
    return user.id;
  }
}