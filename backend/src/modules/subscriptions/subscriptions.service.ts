import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Plan, SubscriptionStatus } from '@prisma/client';

const PLAN_PRICES: Record<Plan, number> = {
  BASIC: 44900,
  PRO: 99900,
  ENTERPRISE: 199900,
};

const PLAN_LIMITS = {
  BASIC:      { invoicesPerMonth: 50,  users: 1,  templates: 1,  chatbot: false, whatsapp: false },
  PRO:        { invoicesPerMonth: -1,  users: 3,  templates: 5,  chatbot: true,  whatsapp: false },
  ENTERPRISE: { invoicesPerMonth: -1,  users: 10, templates: 5,  chatbot: true,  whatsapp: true  },
};

@Injectable()
export class SubscriptionsService {
  constructor(private prisma: PrismaService) {}

  async getCurrentPlan(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        plan: true,
        subscriptionStatus: true,
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!tenant) throw new NotFoundException('Tenant no encontrado');

    const limits = PLAN_LIMITS[tenant.plan];
    const price = PLAN_PRICES[tenant.plan];

    // Conteo de facturas del mes actual
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const invoicesThisMonth = await this.prisma.invoice.count({
      where: { tenantId, createdAt: { gte: startOfMonth } },
    });

    const usersCount = await this.prisma.user.count({
      where: { tenantId, isActive: true },
    });

    return {
      plan: tenant.plan,
      status: tenant.subscriptionStatus,
      price,
      limits,
      usage: {
        invoicesThisMonth,
        invoicesLimit: limits.invoicesPerMonth,
        users: usersCount,
        usersLimit: limits.users,
      },
      lastSubscription: tenant.subscriptions[0] || null,
    };
  }

  async getPlans() {
    return Object.entries(PLAN_LIMITS).map(([plan, limits]) => ({
      plan,
      price: PLAN_PRICES[plan as Plan],
      priceFormatted: new Intl.NumberFormat('es-CO', {
        style: 'currency', currency: 'COP', minimumFractionDigits: 0,
      }).format(PLAN_PRICES[plan as Plan]),
      limits,
    }));
  }

  async createPaymentLink(tenantId: string, plan: Plan) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { email: true, companyName: true, plan: true },
    });

    if (!tenant) throw new NotFoundException('Tenant no encontrado');

    if (tenant.plan === plan) {
      throw new BadRequestException('Ya tienes este plan activo');
    }

    const price = PLAN_PRICES[plan];

    // En Módulo 11 se conecta con la API real de Wompi
    // Por ahora retornamos un link mock
    const mockPaymentLink = `https://checkout.wompi.co/p/?public-key=pub_test_mock&currency=COP&amount-in-cents=${price * 100}&reference=cobraia-${tenantId}-${plan}-${Date.now()}`;

    // Crear suscripción pendiente
    await this.prisma.subscription.create({
      data: {
        tenantId,
        plan,
        status: SubscriptionStatus.INACTIVE,
        priceAmount: price,
        currency: 'COP',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      paymentLink: mockPaymentLink,
      plan,
      price,
      message: 'Link de pago generado. En producción redirige a Wompi.',
    };
  }

  async handleWompiWebhook(payload: any) {
    // Verificar que el evento sea de transacción aprobada
    const { event, data } = payload;

    if (event !== 'transaction.updated') {
      return { received: true };
    }

    const transaction = data?.transaction;
    if (!transaction || transaction.status !== 'APPROVED') {
      return { received: true };
    }

    // Extraer tenantId y plan de la referencia
    // Formato: cobraia-{tenantId}-{plan}-{timestamp}
    const reference = transaction.reference as string;
    const parts = reference.split('-');

    if (parts.length < 3 || parts[0] !== 'cobraia') {
      return { received: true };
    }

    const tenantId = parts[1];
    const plan = parts[2] as Plan;

    if (!Object.values(Plan).includes(plan)) {
      return { received: true };
    }

    // Activar suscripción
    await this.prisma.$transaction(async (tx) => {
      // Actualizar tenant
      await tx.tenant.update({
        where: { id: tenantId },
        data: {
          plan,
          subscriptionStatus: SubscriptionStatus.ACTIVE,
        },
      });

      // Actualizar suscripción más reciente
      const subscription = await tx.subscription.findFirst({
        where: { tenantId, plan, status: SubscriptionStatus.INACTIVE },
        orderBy: { createdAt: 'desc' },
      });

      if (subscription) {
        await tx.subscription.update({
          where: { id: subscription.id },
          data: {
            status: SubscriptionStatus.ACTIVE,
            wompiTransactionId: transaction.id,
            startDate: new Date(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        });
      }
    });

    return { received: true, activated: true, plan, tenantId };
  }

  async cancelSubscription(tenantId: string) {
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { subscriptionStatus: SubscriptionStatus.CANCELLED },
    });

    return { message: 'Suscripción cancelada. Mantendrás acceso hasta el fin del período.' };
  }

  getLimits(plan: Plan) {
    return PLAN_LIMITS[plan];
  }
}