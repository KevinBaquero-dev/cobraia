import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@Injectable()
export class TenantsService {
  constructor(private prisma: PrismaService) {}

  async getProfile(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        systemTemplate: {
          select: {
            id: true,
            name: true,
            type: true,
            pairedWith: true,
          },
        },
        _count: {
          select: {
            users: true,
            clients: true,
            invoices: true,
          },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant no encontrado');
    }

    return tenant;
  }

  async updateProfile(tenantId: string, dto: UpdateTenantDto) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant no encontrado');
    }

    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        ...(dto.companyName && { companyName: dto.companyName, name: dto.companyName }),
        ...(dto.companySlogan !== undefined && { companySlogan: dto.companySlogan }),
        ...(dto.taxId !== undefined && { taxId: dto.taxId }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.brandColor && { brandColor: dto.brandColor }),
        ...(dto.templateId && { templateId: dto.templateId }),
        ...(dto.invoicePaymentDays !== undefined && { invoicePaymentDays: dto.invoicePaymentDays }),
        ...(dto.invoiceNotes !== undefined && { invoiceNotes: dto.invoiceNotes }),
        ...(dto.invoiceCurrency && { invoiceCurrency: dto.invoiceCurrency }),
      },
    });
  }

  async updateLogo(tenantId: string, logoUrl: string) {
    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: { logoUrl },
    });
  }

  async getTemplates(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { plan: true },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant no encontrado');
    }

    // Plan básico solo tiene acceso a plantilla 1
    const allowedTemplates = tenant.plan === 'BASIC' ? [1] : [1, 2, 3, 4, 5];

    const templates = await this.prisma.systemTemplate.findMany({
      where: {
        type: 'invoice',
        isActive: true,
        id: { in: allowedTemplates },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return templates;
  }

  async completeOnboarding(tenantId: string) {
    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        settings: {
          onboardingCompleted: true,
          onboardingCompletedAt: new Date().toISOString(),
        },
      },
    });
  }
}