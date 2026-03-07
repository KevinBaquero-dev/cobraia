import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ChatMessageDto } from './dto/chat-message.dto';
import { invoiceFunctions } from './functions/invoice-functions';
import OpenAI from 'openai';
import { Plan } from '@prisma/client';

@Injectable()
export class ChatService {
  private openai: OpenAI;

  constructor(private prisma: PrismaService) {
  this.openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'mock',
  });
}

private isMockMode(): boolean {
  const key = process.env.OPENAI_API_KEY || '';
  return !key || key === 'mock' || key === '' || process.env.CHAT_MOCK_MODE === 'true';
}

private async getMockResponse(message: string, tenantId: string): Promise<string> {
  const lower = message.toLowerCase();

  if (lower.includes('factura') || lower.includes('invoice')) {
    const summary = await this.getInvoicesSummary(tenantId, {});
    return `Tienes **${summary.total} facturas** por un total de **$${summary.totalAmount.toLocaleString('es-CO')} COP**. ¿Quieres más detalles por estado o por cliente?`;
  }

  if (lower.includes('cliente') || lower.includes('client')) {
    const top = await this.getTopClients(tenantId, 3);
    if (top.length === 0) return 'Aún no tienes clientes registrados.';
    const lista = top.map((c: any) => `• ${c.name}: $${c.totalBilled.toLocaleString('es-CO')} COP`).join('\n');
    return `Tus clientes con mayor facturación son:\n${lista}`;
  }

  if (lower.includes('vencid') || lower.includes('overdue')) {
    const overdue = await this.getOverdueInvoices(tenantId);
    if (overdue.count === 0) return '¡Excelente! No tienes facturas vencidas.';
    return `Tienes **${overdue.count} facturas vencidas**. Te recomiendo contactar a tus clientes para gestionar el cobro.`;
  }

  if (lower.includes('ingreso') || lower.includes('revenue') || lower.includes('mes')) {
    const revenue = await this.getMonthlyRevenue(tenantId);
    return `Este mes has facturado **$${revenue.totalBilled.toLocaleString('es-CO')} COP** con ${revenue.invoiceCount} facturas. Pagado: **$${revenue.totalPaid.toLocaleString('es-CO')} COP**.`;
  }

  if (lower.includes('hola') || lower.includes('ayuda') || lower.includes('help')) {
    return `¡Hola! Soy **CobraIA**, tu asistente de facturación. Puedo ayudarte con:\n• Resumen de facturas\n• Saldo de clientes\n• Facturas vencidas\n• Ingresos del mes\n\n¿Qué necesitas saber?`;
  }

  return `Entendido. Puedo ayudarte con información sobre tus facturas, clientes e ingresos. ¿Sobre qué tema quieres consultar?`;
}

  private async checkChatAccess(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { plan: true },
    });
    if (!tenant) throw new NotFoundException('Tenant no encontrado');
    if (tenant.plan === Plan.BASIC) {
      throw new ForbiddenException(
        'El chatbot IA está disponible en planes Pro y Empresarial',
      );
    }
    return tenant;
  }

  async sendMessage(tenantId: string, userId: string, dto: ChatMessageDto) {
    await this.checkChatAccess(tenantId);

    // Obtener o crear conversación
    let conversation = dto.conversationId
      ? await this.prisma.chatConversation.findFirst({
          where: { id: dto.conversationId, tenantId },
        })
      : null;

    if (!conversation) {
      conversation = await this.prisma.chatConversation.create({
        data: {
          tenantId,
          userId,
          title: dto.message.substring(0, 50),
          messages: [],
          isActive: true,
        },
      });
    }

    const history = (conversation.messages as any[]) || [];

    // Contexto del tenant
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { companyName: true, plan: true, invoiceCurrency: true },
    });

    const systemPrompt = `Eres CobraIA, el asistente inteligente de facturación para ${tenant?.companyName}. 
Ayudas a los usuarios a gestionar sus facturas, clientes y finanzas de manera eficiente.
Responde siempre en español, de manera concisa y profesional.
La moneda del negocio es ${tenant?.invoiceCurrency || 'COP'} (pesos colombianos).
Cuando el usuario pregunte sobre datos financieros, usa las funciones disponibles para obtener información actualizada.
Fecha actual: ${new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`;

    const messages: any[] = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-10), // últimos 10 mensajes para contexto
      { role: 'user', content: dto.message },
    ];

    // Primera llamada a GPT-4o
    let assistantMessage: string;

    if (this.isMockMode()) {
      assistantMessage = await this.getMockResponse(dto.message, tenantId);
    } else {
      // Primera llamada a GPT-4o
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages,
        tools: invoiceFunctions.map((fn) => ({
          type: 'function' as const,
          function: fn,
        })),
        tool_choice: 'auto',
        max_tokens: 800,
      });

      let finalResponse = response.choices[0].message;

      if (finalResponse.tool_calls && finalResponse.tool_calls.length > 0) {
        const toolResults = await this.executeToolCalls(tenantId, finalResponse.tool_calls);
        const secondMessages = [...messages, finalResponse, ...toolResults];
        const secondResponse = await this.openai.chat.completions.create({
          model: 'gpt-4o',
          messages: secondMessages,
          max_tokens: 800,
        });
        finalResponse = secondResponse.choices[0].message;
      }

      assistantMessage = finalResponse.content || 'No pude procesar tu consulta.';
    }

    // Guardar mensajes en historial
    const updatedHistory = [
      ...history,
      { role: 'user', content: dto.message, timestamp: new Date().toISOString() },
      { role: 'assistant', content: assistantMessage, timestamp: new Date().toISOString() },
    ];

    await this.prisma.chatConversation.update({
      where: { id: conversation.id },
      data: { messages: updatedHistory },
    });

    return {
      conversationId: conversation.id,
      message: assistantMessage,
      timestamp: new Date().toISOString(),
    };
  }

  private async executeToolCalls(tenantId: string, toolCalls: any[]) {
    const results = [];

    for (const toolCall of toolCalls) {
      const args = JSON.parse(toolCall.function.arguments);
      let result: any;

      switch (toolCall.function.name) {
        case 'get_invoices_summary':
          result = await this.getInvoicesSummary(tenantId, args);
          break;
        case 'get_client_balance':
          result = await this.getClientBalance(tenantId, args.clientName);
          break;
        case 'get_top_clients':
          result = await this.getTopClients(tenantId, args.limit || 5);
          break;
        case 'get_monthly_revenue':
          result = await this.getMonthlyRevenue(tenantId, args.month, args.year);
          break;
        case 'get_overdue_invoices':
          result = await this.getOverdueInvoices(tenantId);
          break;
        default:
          result = { error: 'Función no encontrada' };
      }

      results.push({
        role: 'tool' as const,
        tool_call_id: toolCall.id,
        content: JSON.stringify(result),
      });
    }

    return results;
  }

  private async getInvoicesSummary(tenantId: string, args: any) {
    const where: any = { tenantId };
    if (args.status) where.status = args.status;
    if (args.dateFrom || args.dateTo) {
      where.issueDate = {};
      if (args.dateFrom) where.issueDate.gte = new Date(args.dateFrom);
      if (args.dateTo) where.issueDate.lte = new Date(args.dateTo);
    }

    const invoices = await this.prisma.invoice.findMany({
      where,
      select: { status: true, total: true, issueDate: true },
    });

    const summary = {
      total: invoices.length,
      totalAmount: invoices.reduce((s, i) => s + Number(i.total), 0),
      byStatus: {} as Record<string, { count: number; amount: number }>,
    };

    invoices.forEach((inv) => {
      if (!summary.byStatus[inv.status]) {
        summary.byStatus[inv.status] = { count: 0, amount: 0 };
      }
      summary.byStatus[inv.status].count++;
      summary.byStatus[inv.status].amount += Number(inv.total);
    });

    return summary;
  }

  private async getClientBalance(tenantId: string, clientName: string) {
    const client = await this.prisma.client.findFirst({
      where: { tenantId, name: { contains: clientName, mode: 'insensitive' } },
    });

    if (!client) return { error: `Cliente "${clientName}" no encontrado` };

    const invoices = await this.prisma.invoice.findMany({
      where: { tenantId, clientId: client.id, status: { not: 'CANCELLED' } },
      include: { payments: true },
    });

    const totalBilled = invoices.reduce((s, i) => s + Number(i.total), 0);
    const totalPaid = invoices.flatMap((i) => i.payments).reduce((s, p) => s + Number(p.amount), 0);

    return {
      client: client.name,
      totalBilled,
      totalPaid,
      balance: totalBilled - totalPaid,
      invoiceCount: invoices.length,
    };
  }

  private async getTopClients(tenantId: string, limit: number) {
    const clients = await this.prisma.client.findMany({
      where: { tenantId, isActive: true },
      include: {
        invoices: {
          where: { status: { not: 'CANCELLED' } },
          select: { total: true },
        },
      },
    });

    return clients
      .map((c) => ({
        name: c.name,
        totalBilled: c.invoices.reduce((s, i) => s + Number(i.total), 0),
        invoiceCount: c.invoices.length,
      }))
      .sort((a, b) => b.totalBilled - a.totalBilled)
      .slice(0, Math.min(limit, 10));
  }

  private async getMonthlyRevenue(tenantId: string, month?: number, year?: number) {
    const now = new Date();
    const targetMonth = month ? month - 1 : now.getMonth();
    const targetYear = year || now.getFullYear();

    const start = new Date(targetYear, targetMonth, 1);
    const end = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);

    const invoices = await this.prisma.invoice.findMany({
      where: {
        tenantId,
        issueDate: { gte: start, lte: end },
        status: { not: 'CANCELLED' },
      },
      select: { total: true, status: true },
    });

    return {
      month: start.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' }),
      totalBilled: invoices.reduce((s, i) => s + Number(i.total), 0),
      totalPaid: invoices
        .filter((i) => i.status === 'PAID')
        .reduce((s, i) => s + Number(i.total), 0),
      invoiceCount: invoices.length,
    };
  }

  private async getOverdueInvoices(tenantId: string) {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        tenantId,
        status: { in: ['SENT', 'OVERDUE'] },
        dueDate: { lt: new Date() },
      },
      include: { client: { select: { name: true } } },
      orderBy: { dueDate: 'asc' },
      take: 10,
    });

    return {
      count: invoices.length,
      invoices: invoices.map((i) => ({
        number: i.invoiceNumber,
        client: i.client.name,
        total: Number(i.total),
        dueDate: i.dueDate,
        daysOverdue: Math.floor((Date.now() - new Date(i.dueDate).getTime()) / (1000 * 60 * 60 * 24)),
      })),
    };
  }

  async getHistory(tenantId: string) {
    return this.prisma.chatConversation.findMany({
      where: { tenantId, isActive: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async getConversation(tenantId: string, conversationId: string) {
    const conversation = await this.prisma.chatConversation.findFirst({
      where: { id: conversationId, tenantId },
    });
    if (!conversation) throw new NotFoundException('Conversación no encontrada');
    return conversation;
  }

  async clearHistory(tenantId: string) {
    await this.prisma.chatConversation.updateMany({
      where: { tenantId },
      data: { isActive: false },
    });
    return { message: 'Historial limpiado exitosamente' };
  }
}