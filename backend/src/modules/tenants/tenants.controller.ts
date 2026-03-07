import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TenantsService } from './tenants.service';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { CurrentUser, CurrentTenant, Roles } from '../../common/decorators';

@Controller('tenants')
export class TenantsController {
  constructor(private tenantsService: TenantsService) {}

  @Get('me')
  getProfile(@CurrentTenant() tenantId: string) {
    return this.tenantsService.getProfile(tenantId);
  }

  @Patch('me')
  @Roles('OWNER', 'ADMIN')
  updateProfile(
    @CurrentTenant() tenantId: string,
    @Body() dto: UpdateTenantDto,
  ) {
    return this.tenantsService.updateProfile(tenantId, dto);
  }

  @Post('me/logo')
  @Roles('OWNER', 'ADMIN')
  @UseInterceptors(
    FileInterceptor('logo', {
      limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|webp|svg\+xml)$/)) {
          return cb(new BadRequestException('Solo se permiten imágenes'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadLogo(
    @CurrentTenant() tenantId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No se recibió ningún archivo');
    }
    // Por ahora retornamos un mock — en Módulo 11 conectamos R2
    const logoUrl = `https://r2.cobraia.co/logos/${tenantId}-${Date.now()}.${file.mimetype.split('/')[1]}`;
    return this.tenantsService.updateLogo(tenantId, logoUrl);
  }

  @Get('templates')
  getTemplates(@CurrentTenant() tenantId: string) {
    return this.tenantsService.getTemplates(tenantId);
  }

  @Post('me/complete-onboarding')
  @Roles('OWNER')
  completeOnboarding(@CurrentTenant() tenantId: string) {
    return this.tenantsService.completeOnboarding(tenantId);
  }
}