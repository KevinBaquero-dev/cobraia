import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { QueryClientDto } from './dto/query-client.dto';

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateClientDto) {
    // Verificar email duplicado dentro del tenant
    if (dto.email) {
      const existing = await this.prisma.client.findFirst({
        where: { tenantId, email: dto.email },
      });
      if (existing) {
        throw new ConflictException('Ya existe un cliente con ese email');
      }
    }

    return this.prisma.client.create({
      data: {
        tenantId,
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        taxId: dto.taxId,
        address: dto.address || {},
        notes: dto.notes,
      },
    });
  }

  async findAll(tenantId: string, query: QueryClientDto) {
    const { search, page = 1, limit = 20, isActive } = query;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    if (isActive !== undefined) {
      where.isActive = isActive;
    } else {
      where.isActive = true;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { taxId: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.client.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: { invoices: true },
          },
        },
      }),
      this.prisma.client.count({ where }),
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
    const client = await this.prisma.client.findFirst({
      where: { id, tenantId },
      include: {
        _count: {
          select: { invoices: true },
        },
      },
    });

    if (!client) {
      throw new NotFoundException('Cliente no encontrado');
    }

    return client;
  }

  async update(tenantId: string, id: string, dto: UpdateClientDto) {
    await this.findOne(tenantId, id);

    if (dto.email) {
      const existing = await this.prisma.client.findFirst({
        where: { tenantId, email: dto.email, NOT: { id } },
      });
      if (existing) {
        throw new ConflictException('Ya existe un cliente con ese email');
      }
    }

    return this.prisma.client.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.taxId !== undefined && { taxId: dto.taxId }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);

    // Soft delete
    return this.prisma.client.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async getInvoiceHistory(tenantId: string, clientId: string) {
    await this.findOne(tenantId, clientId);

    const invoices = await this.prisma.invoice.findMany({
      where: { tenantId, clientId },
      orderBy: { issueDate: 'desc' },
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        issueDate: true,
        dueDate: true,
        total: true,
        currency: true,
        pdfUrl: true,
      },
    });

    const summary = {
      totalInvoices: invoices.length,
      totalBilled: invoices.reduce((sum, inv) => sum + Number(inv.total), 0),
      totalPaid: invoices
        .filter((inv) => inv.status === 'PAID')
        .reduce((sum, inv) => sum + Number(inv.total), 0),
    };

    return { invoices, summary };
  }
}