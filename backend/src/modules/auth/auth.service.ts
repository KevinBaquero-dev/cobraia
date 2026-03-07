import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../database/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Plan, SubscriptionStatus, UserRole } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    // Verificar si el slug ya existe
    const existingTenant = await this.prisma.tenant.findUnique({
      where: { slug: dto.slug },
    });
    if (existingTenant) {
      throw new ConflictException('El nombre de empresa ya está en uso');
    }

    // Verificar si el email ya existe
    const existingEmail = await this.prisma.user.findFirst({
      where: { email: dto.email },
    });
    if (existingEmail) {
      throw new ConflictException('El email ya está registrado');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Crear tenant + usuario + secuencia en una transacción
    const result = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: dto.companyName,
          slug: dto.slug,
          email: dto.email,
          companyName: dto.companyName,
          brandColor: '#1E40AF',
          templateId: 1,
          plan: Plan.BASIC,
          subscriptionStatus: SubscriptionStatus.TRIAL,
          invoiceCurrency: 'COP',
          invoicePaymentDays: 30,
          settings: {},
        },
      });

      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: dto.email,
          passwordHash,
          name: dto.name,
          phone: dto.phone,
          role: UserRole.OWNER,
          isActive: true,
        },
      });

      await tx.tenantSequence.create({
        data: {
          tenantId: tenant.id,
          lastNumber: 0,
          prefix: '',
          padding: 6,
        },
      });

      return { tenant, user };
    });

    const tokens = await this.generateTokens(
      result.user.id,
      result.user.email,
      result.tenant.id,
      result.user.role,
    );

    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
      },
      tenant: {
        id: result.tenant.id,
        slug: result.tenant.slug,
        companyName: result.tenant.companyName,
        plan: result.tenant.plan,
      },
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email, isActive: true },
      include: {
        tenant: {
          select: {
            id: true,
            slug: true,
            companyName: true,
            plan: true,
            isActive: true,
            subscriptionStatus: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (!user.tenant.isActive) {
      throw new UnauthorizedException('Cuenta suspendida');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Actualizar último login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.tenantId,
      user.role,
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      tenant: {
        id: user.tenant.id,
        slug: user.tenant.slug,
        companyName: user.tenant.companyName,
        plan: user.tenant.plan,
      },
      ...tokens,
    };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || 'default_refresh_secret',
      });

      const user = await this.prisma.user.findFirst({
        where: { id: payload.sub, isActive: true },
        include: { tenant: true },
      });

      if (!user || !user.tenant.isActive) {
        throw new UnauthorizedException('Token inválido');
      }

      return this.generateTokens(user.id, user.email, user.tenantId, user.role);
    } catch {
      throw new UnauthorizedException('Token de refresco inválido o expirado');
    }
  }

  async logout(userId: string) {
    // En una implementación completa se agregaría el token a una blacklist en Redis
    return { message: 'Sesión cerrada exitosamente' };
  }

  private async generateTokens(
    userId: string,
    email: string,
    tenantId: string,
    role: string,
  ) {
    const payload = { sub: userId, email, tenantId, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_SECRET || 'default_secret',
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_REFRESH_SECRET || 'default_refresh_secret',
        expiresIn: '7d',
      }),
    ]);

    return { accessToken, refreshToken };
  }
}