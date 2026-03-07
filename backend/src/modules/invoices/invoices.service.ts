import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { QueryInvoiceDto } from './dto/query-invoice.dto';
import { InvoiceStatus, Plan } from '@prisma/client';

@Injectable()
export class InvoicesService {
  constructor(private prisma: PrismaService) {}

  private async getNextInvoiceNumber(tenantId: string): Promise<string> {
    const sequence = await this.prisma.tenantSequence.update({
      where: { tenantId },
      data: { lastNumber: { increment: 1 } },
    });
    return String(sequence.lastNumber).padStart(sequence.padding, '0');
  }

  private async checkInvoiceLimit(tenantId: string, plan: string) {
    if (plan === Plan.BASIC) {
      const currentMonth = new Date();
      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const count = await this.prisma.invoice.count({
        where: {
          tenantId,
          createdAt: { gte: startOfMonth },
        },
      });
      if (count >= 50) {
        throw new ForbiddenException(
          'Has alcanzado el límite de 50 facturas mensuales del plan Básico',
        );
      }
    }
  }

  private calculateTotals(
    items: { quantity: number; unitPrice: number }[],
    taxRate = 0,
    retentionRate = 0,
    discount = 0,
  ) {
    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const discountedSubtotal = subtotal - discount;
    const taxAmount = (discountedSubtotal * taxRate) / 100;
    const retentionAmount = (discountedSubtotal * retentionRate) / 100;
    const total = discountedSubtotal + taxAmount - retentionAmount;

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      taxAmount: Math.round(taxAmount * 100) / 100,
      retentionAmount: Math.round(retentionAmount * 100) / 100,
      total: Math.round(total * 100) / 100,
    };
  }

  async create(tenantId: string, userId: string, dto: CreateInvoiceDto) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { plan: true, invoiceCurrency: true },
    });

    if (!tenant) throw new NotFoundException('Tenant no encontrado');

    await this.checkInvoiceLimit(tenantId, tenant.plan);

    // Verificar cliente
    const client = await this.prisma.client.findFirst({
      where: { id: dto.clientId, tenantId, isActive: true },
    });
    if (!client) throw new NotFoundException('Cliente no encontrado');

    // Número de factura
    let invoiceNumber = dto.invoiceNumber;
    let isNumberManual = dto.isNumberManual || false;

    if (!invoiceNumber) {
      invoiceNumber = await this.getNextInvoiceNumber(tenantId);
      isNumberManual = false;
    } else {
      // Verificar que no exista
      const existing = await this.prisma.invoice.findFirst({
        where: { tenantId, invoiceNumber },
      });
      if (existing) throw new BadRequestException('El número de factura ya existe');
      isNumberManual = true;
    }

    const totals = this.calculateTotals(
      dto.items,
      dto.taxRate,
      dto.retentionRate,
      dto.discount,
    );

    return this.prisma.invoice.create({
      data: {
        tenantId,
        clientId: dto.clientId,
        createdById: userId,
        invoiceNumber,
        isNumberManual,
        issueDate: new Date(dto.issueDate),
        dueDate: new Date(dto.dueDate),
        subtotal: totals.subtotal,
        taxRate: dto.taxRate || 0,
        taxAmount: totals.taxAmount,
        retentionRate: dto.retentionRate || 0,
        retentionAmount: totals.retentionAmount,
        discount: dto.discount || 0,
        total: totals.total,
        currency: dto.currency || tenant.invoiceCurrency,
        notes: dto.notes,
        status: InvoiceStatus.DRAFT,
        items: {
          create: dto.items.map((item, index) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            amount: item.quantity * item.unitPrice,
            sortOrder: index,
          })),
        },
      },
      include: {
        items: true,
        client: { select: { id: true, name: true, email: true, taxId: true } },
      },
    });
  }

  async findAll(tenantId: string, query: QueryInvoiceDto) {
    const { search, status, clientId, dateFrom, dateTo, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    if (status) where.status = status;
    if (clientId) where.clientId = clientId;
    if (dateFrom || dateTo) {
      where.issueDate = {};
      if (dateFrom) where.issueDate.gte = new Date(dateFrom);
      if (dateTo) where.issueDate.lte = new Date(dateTo);
    }
    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { client: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { id: true, name: true, taxId: true } },
          _count: { select: { items: true } },
        },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(tenantId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, tenantId },
      include: {
        items: { orderBy: { sortOrder: 'asc' } },
        client: true,
        createdBy: { select: { id: true, name: true, email: true } },
        payments: { orderBy: { paidAt: 'desc' } },
        revisions: {
          orderBy: { changedAt: 'desc' },
          include: {
            changedBy: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!invoice) throw new NotFoundException('Factura no encontrada');
    return invoice;
  }

  async updateStatus(tenantId: string, id: string, status: InvoiceStatus) {
    const invoice = await this.findOne(tenantId, id);

    const validTransitions: Record<InvoiceStatus, InvoiceStatus[]> = {
      DRAFT: [InvoiceStatus.SENT, InvoiceStatus.CANCELLED],
      SENT: [InvoiceStatus.PAID, InvoiceStatus.CANCELLED],
      PAID: [],
      CANCELLED: [],
      OVERDUE: [InvoiceStatus.PAID, InvoiceStatus.CANCELLED],
    };

    if (!validTransitions[invoice.status].includes(status)) {
      throw new BadRequestException(
        `No se puede cambiar de ${invoice.status} a ${status}`,
      );
    }

    return this.prisma.invoice.update({
      where: { id },
      data: {
        status,
        ...(status === InvoiceStatus.PAID && { paidAt: new Date() }),
      },
    });
  }

  async duplicate(tenantId: string, userId: string, id: string) {
    const invoice = await this.findOne(tenantId, id);

    const invoiceNumber = await this.getNextInvoiceNumber(tenantId);

    return this.prisma.invoice.create({
      data: {
        tenantId,
        clientId: invoice.clientId,
        createdById: userId,
        invoiceNumber,
        isNumberManual: false,
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        subtotal: invoice.subtotal,
        taxRate: invoice.taxRate,
        taxAmount: invoice.taxAmount,
        retentionRate: invoice.retentionRate,
        retentionAmount: invoice.retentionAmount,
        discount: invoice.discount,
        total: invoice.total,
        currency: invoice.currency,
        notes: invoice.notes,
        status: InvoiceStatus.DRAFT,
        items: {
          create: invoice.items.map((item, index) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            amount: item.amount,
            sortOrder: index,
          })),
        },
      },
      include: {
        items: true,
        client: { select: { id: true, name: true } },
      },
    });
  }

  async update(tenantId: string, userId: string, id: string, dto: UpdateInvoiceDto) {
    const invoice = await this.findOne(tenantId, id);

    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException('Solo se pueden editar facturas en estado DRAFT');
    }

    const totals = this.calculateTotals(
      dto.items || invoice.items.map(i => ({ quantity: Number(i.quantity), unitPrice: Number(i.unitPrice) })),
      dto.taxRate ?? Number(invoice.taxRate),
      dto.retentionRate ?? Number(invoice.retentionRate),
      dto.discount ?? Number(invoice.discount),
    );

    return this.prisma.$transaction(async (tx) => {
      if (dto.items) {
        await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });
      }

      const updated = await tx.invoice.update({
        where: { id },
        data: {
          ...(dto.issueDate && { issueDate: new Date(dto.issueDate) }),
          ...(dto.dueDate && { dueDate: new Date(dto.dueDate) }),
          ...(dto.notes !== undefined && { notes: dto.notes }),
          subtotal: totals.subtotal,
          taxRate: dto.taxRate ?? Number(invoice.taxRate),
          taxAmount: totals.taxAmount,
          retentionRate: dto.retentionRate ?? Number(invoice.retentionRate),
          retentionAmount: totals.retentionAmount,
          discount: dto.discount ?? Number(invoice.discount),
          total: totals.total,
          editedAt: new Date(),
          version: { increment: 1 },
          ...(dto.items && {
            items: {
              create: dto.items.map((item, index) => ({
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                amount: item.quantity * item.unitPrice,
                sortOrder: index,
              })),
            },
          }),
        },
        include: { items: true },
      });

      // Registrar revisión
      await tx.invoiceRevision.create({
        data: {
          invoiceId: id,
          changedById: userId,
          fieldName: 'invoice',
          oldValue: JSON.stringify({ total: invoice.total, status: invoice.status }),
          newValue: JSON.stringify({ total: updated.total }),
          reason: dto.reason,
        },
      });

      return updated;
    });
  }
}