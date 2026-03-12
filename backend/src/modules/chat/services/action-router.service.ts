import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { ParsedIntent } from '../utils/intent-parser';
import { ConversationState, ConversationStateService } from './conversation-state.service';

@Injectable()
export class ActionRouterService {
  constructor(
    private prisma: PrismaService,
    private stateService: ConversationStateService,
  ) {}

  async route(
    tenantId: string,
    userId: string,
    parsed: ParsedIntent,
    state: ConversationState | null,
  ): Promise<string> {

    if (parsed.intent === 'confirm' && state?.awaiting === 'confirmation') {
      return this.executeConfirmed(tenantId, userId, state);
    }

    if (parsed.intent === 'reject' && state) {
      await this.stateService.clear(tenantId, userId);
      return 'Entendido, cancelé la operación. ¿En qué más te puedo ayudar?';
    }

    if (state?.awaiting === 'client_selection') {
      return this.handleClientSelection(tenantId, userId, parsed, state);
    }

    if (state?.awaiting === 'amount' && parsed.amount) {
      await this.stateService.mergeData(tenantId, userId, { amount: parsed.amount });
      const updated = await this.stateService.get(tenantId, userId);
      return this.continueFlow(tenantId, userId, updated!);
    }

    if (state?.awaiting === 'concept' && parsed.concept) {
      await this.stateService.mergeData(tenantId, userId, { concept: parsed.concept });
      const updated = await this.stateService.get(tenantId, userId);
      return this.continueFlow(tenantId, userId, updated!);
    }

    switch (parsed.intent) {
      case 'create_invoice':
        return this.startCreateInvoice(tenantId, userId, parsed);
      case 'register_payment':
        return this.startRegisterPayment(tenantId, userId, parsed);
      case 'cancel_invoice':
        return this.startCancelInvoice(tenantId, userId, parsed);
      case 'get_client_debt':
        return this.getClientDebt(tenantId, parsed.client_name);
      case 'get_total_debt':
        return this.getTotalDebt(tenantId);
      case 'list_pending_invoices':
        return this.listPendingInvoices(tenantId);
      case 'business_summary':
        return this.getBusinessSummary(tenantId);
      default:
        return '¿En qué te puedo ayudar? Puedo crear facturas, registrar pagos, consultar deudas o darte un resumen del negocio.';
    }
  }

  // ── CREATE INVOICE ────────────────────────────────────────────────────────
  private async startCreateInvoice(tenantId: string, userId: string, parsed: ParsedIntent): Promise<string> {
    await this.stateService.set(tenantId, userId, {
      current_intent: 'create_invoice',
      pending_data: {
        client_name: parsed.client_name || undefined,
        amount: parsed.amount || undefined,
        concept: parsed.concept || undefined,
      },
      awaiting: null,
    });
    const state = await this.stateService.get(tenantId, userId);
    return this.continueFlow(tenantId, userId, state!);
  }

  private async continueFlow(tenantId: string, userId: string, state: ConversationState): Promise<string> {
    const data = state.pending_data;

    if (!data.client_id) {
      if (!data.client_name) {
        await this.stateService.set(tenantId, userId, { awaiting: 'concept' });
        return '¿A qué cliente le voy a hacer la factura?';
      }

      const clients = await this.prisma.client.findMany({
        where: { tenantId, name: { contains: data.client_name, mode: 'insensitive' }, isActive: true },
        select: { id: true, name: true },
        take: 5,
      });

      if (clients.length === 0) {
        await this.stateService.clear(tenantId, userId);
        return `No encontré ningún cliente con el nombre "${data.client_name}". ¿Lo tienes registrado?`;
      }

      if (clients.length > 1) {
        await this.stateService.mergeData(tenantId, userId, { ambiguous_clients: clients });
        await this.stateService.set(tenantId, userId, { awaiting: 'client_selection' });
        const lista = clients.map((c, i) => `${i + 1}. ${c.name}`).join('\n');
        return `Encontré varios clientes:\n\n${lista}\n\n¿Cuál deseas usar? Responde con el número.`;
      }

      await this.stateService.mergeData(tenantId, userId, { client_id: clients[0].id, client_name: clients[0].name });
    }

    const updated = await this.stateService.get(tenantId, userId);
    const d = updated!.pending_data;

    if (!d.amount) {
      await this.stateService.set(tenantId, userId, { awaiting: 'amount' });
      return `¿Por qué valor es la factura para ${d.client_name}?`;
    }

    if (!d.concept) {
      await this.stateService.set(tenantId, userId, { awaiting: 'concept' });
      return '¿Cuál es el concepto o descripción del servicio?';
    }

    await this.stateService.set(tenantId, userId, { awaiting: 'confirmation' });
    const formatted = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(d.amount!);
    return `Voy a crear esta factura:\n\n📋 Cliente: ${d.client_name}\n💰 Valor: ${formatted}\n📝 Concepto: ${d.concept}\n\n¿Confirmas? (sí / no)`;
  }

  // ── REGISTER PAYMENT ─────────────────────────────────────────────────────
  private async startRegisterPayment(tenantId: string, userId: string, parsed: ParsedIntent): Promise<string> {
    await this.stateService.set(tenantId, userId, {
      current_intent: 'register_payment',
      pending_data: {
        client_name: parsed.client_name || undefined,
        amount: parsed.amount || undefined,
      },
      awaiting: null,
    });

    const state = await this.stateService.get(tenantId, userId);
    const d = state!.pending_data;

    if (!d.client_name) {
      await this.stateService.set(tenantId, userId, { awaiting: 'concept' });
      return '¿De qué cliente recibiste el pago?';
    }

    if (!d.amount) {
      await this.stateService.set(tenantId, userId, { awaiting: 'amount' });
      return `¿Por qué valor fue el pago de ${d.client_name}?`;
    }

    await this.stateService.set(tenantId, userId, { awaiting: 'confirmation' });
    const formatted = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(d.amount!);
    return `Voy a registrar este pago:\n\n👤 Cliente: ${d.client_name}\n💰 Valor: ${formatted}\n\n¿Confirmas? (sí / no)`;
  }

  // ── CANCEL INVOICE ───────────────────────────────────────────────────────
  private async startCancelInvoice(tenantId: string, userId: string, parsed: ParsedIntent): Promise<string> {
    if (!parsed.invoice_id && !parsed.client_name) {
      return '¿Cuál factura deseas cancelar? Dime el número de factura o el nombre del cliente.';
    }

    await this.stateService.set(tenantId, userId, {
      current_intent: 'cancel_invoice',
      pending_data: {
        client_name: parsed.client_name || undefined,
        invoice_id: parsed.invoice_id || undefined,
      },
      awaiting: 'confirmation',
    });

    return `¿Confirmas que deseas cancelar la factura${parsed.invoice_id ? ` #${parsed.invoice_id}` : ` de ${parsed.client_name}`}? Esta acción no se puede deshacer. (sí / no)`;
  }

  // ── EXECUTE CONFIRMED ────────────────────────────────────────────────────
  private async executeConfirmed(tenantId: string, userId: string, state: ConversationState): Promise<string> {
    const { current_intent, pending_data: d } = state;

    try {
      if (current_intent === 'create_invoice') {
        const today = new Date();
        const due = new Date(today);
        due.setDate(due.getDate() + 30);

        const sequence = await this.prisma.tenantSequence.upsert({
          where: { tenantId },
          update: { lastNumber: { increment: 1 } },
          create: { tenantId, lastNumber: 1 },
        });

        const invoiceNumber = String(sequence.lastNumber).padStart(6, '0');

        await this.prisma.invoice.create({
        data: {
            tenant: { connect: { id: tenantId } },
            client: { connect: { id: d.client_id! } },
            createdBy: { connect: { id: userId } },
            invoiceNumber,
            status: 'DRAFT',
            issueDate: today,
            dueDate: due,
            subtotal: d.amount!,
            taxRate: 0,
            taxAmount: 0,
            retentionRate: 0,
            retentionAmount: 0,
            discount: 0,
            total: d.amount!,
            currency: 'COP',
            items: {
              create: [{
                description: d.concept!,
                quantity: 1,
                unitPrice: d.amount!,
                amount: d.amount!,
              }],
            },
          },
        });

        await this.prisma.auditLog.create({
          data: {
            tenantId,
            userId,
            action: 'CREATE',
            entity: 'Invoice',
            entityId: invoiceNumber,
            metadata: { source: 'chatbot', client: d.client_name, amount: d.amount },
          },
        });

        await this.stateService.clear(tenantId, userId);
        const formatted = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(d.amount!);
        return `✅ Factura #${invoiceNumber} creada para ${d.client_name} por ${formatted}. La encontrarás en el listado de facturas.`;
      }

      if (current_intent === 'register_payment') {
        const client = await this.prisma.client.findFirst({
          where: { tenantId, name: { contains: d.client_name!, mode: 'insensitive' } },
        });

        if (!client) {
          await this.stateService.clear(tenantId, userId);
          return `No encontré al cliente "${d.client_name}". Verifica el nombre e intenta de nuevo.`;
        }

        const invoice = await this.prisma.invoice.findFirst({
          where: { tenantId, clientId: client.id, status: { in: ['SENT', 'OVERDUE'] } },
          orderBy: { dueDate: 'asc' },
        });

        if (!invoice) {
          await this.stateService.clear(tenantId, userId);
          return `${d.client_name} no tiene facturas pendientes de pago.`;
        }

        await this.prisma.payment.create({
          data: {
            invoiceId: invoice.id,
            amount: d.amount!,
            method: 'CASH',
            reference: `Pago chatbot ${new Date().toLocaleDateString('es-CO')}`,
            paidAt: new Date(),
          },
        });

        await this.prisma.auditLog.create({
          data: {
            tenantId,
            userId,
            action: 'CREATE',
            entity: 'Payment',
            entityId: invoice.id,
            metadata: { source: 'chatbot', client: d.client_name, amount: d.amount },
          },
        });

        await this.stateService.clear(tenantId, userId);
        const formatted = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(d.amount!);
        return `✅ Registré el pago de ${formatted} de ${d.client_name} contra la factura #${invoice.invoiceNumber}.`;
      }

      if (current_intent === 'cancel_invoice') {
        const where: any = { tenantId };
        if (d.invoice_id) where.invoiceNumber = d.invoice_id;
        else if (d.client_id) where.clientId = d.client_id;

        const invoice = await this.prisma.invoice.findFirst({ where });
        if (!invoice) {
          await this.stateService.clear(tenantId, userId);
          return 'No encontré la factura. Verifica el número e intenta de nuevo.';
        }

        await this.prisma.invoice.update({
          where: { id: invoice.id },
          data: { status: 'CANCELLED' },
        });

        await this.stateService.clear(tenantId, userId);
        return `✅ Factura #${invoice.invoiceNumber} cancelada.`;
      }

      await this.stateService.clear(tenantId, userId);
      return 'Operación completada.';

    } catch {
      await this.stateService.clear(tenantId, userId);
      return 'Ocurrió un error al procesar la operación. Intenta de nuevo.';
    }
  }

  // ── CLIENT SELECTION ─────────────────────────────────────────────────────
  private async handleClientSelection(tenantId: string, userId: string, parsed: ParsedIntent, state: ConversationState): Promise<string> {
    const clients = state.pending_data.ambiguous_clients || [];
    const text = parsed.client_name || '';
    const num = parseInt(text);

    const selected = isNaN(num)
      ? clients.find(c => c.name.toLowerCase().includes(text.toLowerCase()))
      : clients[num - 1];

    if (!selected) {
      const lista = clients.map((c, i) => `${i + 1}. ${c.name}`).join('\n');
      return `No entendí la selección. Por favor responde con el número:\n\n${lista}`;
    }

    await this.stateService.mergeData(tenantId, userId, { client_id: selected.id, client_name: selected.name });
    await this.stateService.set(tenantId, userId, { awaiting: null });
    const updated = await this.stateService.get(tenantId, userId);
    return this.continueFlow(tenantId, userId, updated!);
  }

  // ── QUERIES ──────────────────────────────────────────────────────────────
  private async getClientDebt(tenantId: string, clientName: string | null): Promise<string> {
    if (!clientName) return '¿De qué cliente quieres saber el saldo?';

    const clients = await this.prisma.client.findMany({
      where: { tenantId, name: { contains: clientName, mode: 'insensitive' }, isActive: true },
      include: {
        invoices: {
          where: { status: { notIn: ['CANCELLED', 'PAID'] } },
          include: { payments: true },
        },
      },
    });

    if (clients.length === 0) return `No encontré el cliente "${clientName}".`;

    const client = clients[0];
    const total = client.invoices.reduce((s, i) => s + Number(i.total), 0);
    const paid  = client.invoices.flatMap(i => i.payments).reduce((s, p) => s + Number(p.amount), 0);
    const debt  = total - paid;

    if (debt <= 0) return `${client.name} está al día. No tiene saldo pendiente.`;

    const formatted = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(debt);
    return `${client.name} debe ${formatted} en ${client.invoices.length} factura${client.invoices.length !== 1 ? 's' : ''} pendiente${client.invoices.length !== 1 ? 's' : ''}.`;
  }

  private async getTotalDebt(tenantId: string): Promise<string> {
    const invoices = await this.prisma.invoice.findMany({
      where: { tenantId, status: { in: ['SENT', 'OVERDUE'] } },
      include: { payments: true },
    });

    if (invoices.length === 0) return '¡Todo al día! No tienes facturas pendientes de cobro.';

    const total = invoices.reduce((s, i) => s + Number(i.total), 0);
    const paid  = invoices.flatMap(i => i.payments).reduce((s, p) => s + Number(p.amount), 0);
    const debt  = total - paid;

    const formatted = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(debt);
    return `Te deben ${formatted} en ${invoices.length} factura${invoices.length !== 1 ? 's' : ''} pendiente${invoices.length !== 1 ? 's' : ''}.`;
  }

  private async listPendingInvoices(tenantId: string): Promise<string> {
    const invoices = await this.prisma.invoice.findMany({
      where: { tenantId, status: { in: ['SENT', 'OVERDUE', 'DRAFT'] } },
      include: { client: { select: { name: true } } },
      orderBy: { dueDate: 'asc' },
      take: 8,
    });

    if (invoices.length === 0) return 'No tienes facturas pendientes. ¡Todo cobrado!';

    const lista = invoices.map(i => {
      const formatted = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(Number(i.total));
      const vencida = i.status === 'OVERDUE' ? ' ⚠️' : '';
      return `• #${i.invoiceNumber} — ${i.client.name} — ${formatted}${vencida}`;
    }).join('\n');

    return `Facturas pendientes:\n\n${lista}`;
  }

  async getBusinessSummary(tenantId: string): Promise<string> {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const [invoicesToday, pendingInvoices] = await Promise.all([
      this.prisma.invoice.count({ where: { tenantId, createdAt: { gte: startOfDay } } }),
      this.prisma.invoice.findMany({
        where: { tenantId, status: { in: ['SENT', 'OVERDUE'] } },
        include: { payments: true },
      }),
    ]);

    const paymentsToday = await this.prisma.payment.aggregate({
      where: { invoice: { tenantId }, paidAt: { gte: startOfDay } },
      _sum: { amount: true },
    });

    const totalDebt = pendingInvoices.reduce((s, i) => {
      const paid = i.payments.reduce((sp, p) => sp + Number(p.amount), 0);
      return s + Number(i.total) - paid;
    }, 0);

    const fmt = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);

    return `📊 Resumen de hoy:\n\n` +
      `🧾 Facturas creadas hoy: ${invoicesToday}\n` +
      `💵 Pagos recibidos hoy: ${fmt(Number(paymentsToday._sum.amount || 0))}\n` +
      `📋 Facturas pendientes: ${pendingInvoices.length}\n` +
      `💰 Total por cobrar: ${fmt(totalDebt)}`;
  }
}