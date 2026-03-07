import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { PdfService } from '../pdf/pdf.service';
import { modernaStatementTemplate } from './templates/moderna-statement.template';

@Injectable()
export class StatementsService {
  constructor(
    private prisma: PrismaService,
    private pdfService: PdfService,
  ) {}

  async generateStatement(
    tenantId: string,
    clientId: string,
    dateFrom: string,
    dateTo: string,
  ): Promise<Buffer> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) throw new NotFoundException('Tenant no encontrado');

    const client = await this.prisma.client.findFirst({
      where: { id: clientId, tenantId },
    });
    if (!client) throw new NotFoundException('Cliente no encontrado');

    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    to.setHours(23, 59, 59, 999);

    // Facturas del período
    const invoices = await this.prisma.invoice.findMany({
      where: {
        tenantId,
        clientId,
        issueDate: { gte: from, lte: to },
        status: { not: 'CANCELLED' },
      },
      orderBy: { issueDate: 'asc' },
    });

    // Pagos del período
    const payments = await this.prisma.payment.findMany({
      where: {
        invoice: { tenantId, clientId },
        paidAt: { gte: from, lte: to },
      },
      orderBy: { paidAt: 'asc' },
    });

    // Calcular totales
    const totalBilled = invoices.reduce((sum, inv) => sum + Number(inv.total), 0);
    const totalPaid = payments.reduce((sum, pay) => sum + Number(pay.amount), 0);
    const balance = totalBilled - totalPaid;

    const summary = { totalBilled, totalPaid, balance };

    // Usar plantilla pareada con la del tenant
    const html = modernaStatementTemplate({
      tenant,
      client,
      invoices,
      payments,
      summary,
      dateFrom: from,
      dateTo: to,
    });

    return this.pdfService['htmlToPdf'](html);
  }

  async getStatementData(
    tenantId: string,
    clientId: string,
    dateFrom: string,
    dateTo: string,
  ) {
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, tenantId },
    });
    if (!client) throw new NotFoundException('Cliente no encontrado');

    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    to.setHours(23, 59, 59, 999);

    const invoices = await this.prisma.invoice.findMany({
      where: {
        tenantId,
        clientId,
        issueDate: { gte: from, lte: to },
        status: { not: 'CANCELLED' },
      },
      orderBy: { issueDate: 'asc' },
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        issueDate: true,
        dueDate: true,
        total: true,
        currency: true,
      },
    });

    const payments = await this.prisma.payment.findMany({
      where: {
        invoice: { tenantId, clientId },
        paidAt: { gte: from, lte: to },
      },
      orderBy: { paidAt: 'asc' },
    });

    const totalBilled = invoices.reduce((sum, inv) => sum + Number(inv.total), 0);
    const totalPaid = payments.reduce((sum, pay) => sum + Number(pay.amount), 0);

    return {
      client,
      invoices,
      payments,
      summary: {
        totalBilled,
        totalPaid,
        balance: totalBilled - totalPaid,
        invoiceCount: invoices.length,
        paymentCount: payments.length,
      },
      period: { from: dateFrom, to: dateTo },
    };
  }
}