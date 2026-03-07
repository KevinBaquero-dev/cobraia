import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { QueryInvoiceDto } from './dto/query-invoice.dto';
import { CurrentTenant, CurrentUser, Roles } from '../../common/decorators';
import { InvoiceStatus } from '@prisma/client';
import { Res } from '@nestjs/common';
import { Response } from 'express';
import { PdfService } from '../pdf/pdf.service';

@Controller('invoices')
export class InvoicesController {
  constructor(
    private invoicesService: InvoicesService,
    private pdfService: PdfService,
    ) {}

  @Post()
  @Roles('OWNER', 'ADMIN')
  create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateInvoiceDto,
  ) {
    return this.invoicesService.create(tenantId, user.id, dto);
  }

  @Get()
  findAll(
    @CurrentTenant() tenantId: string,
    @Query() query: QueryInvoiceDto,
  ) {
    return this.invoicesService.findAll(tenantId, query);
  }

  @Get(':id')
  findOne(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.invoicesService.findOne(tenantId, id);
  }

  @Patch(':id/status')
  @Roles('OWNER', 'ADMIN')
  updateStatus(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body('status') status: InvoiceStatus,
  ) {
    return this.invoicesService.updateStatus(tenantId, id, status);
  }

  @Post(':id/duplicate')
  @Roles('OWNER', 'ADMIN')
  duplicate(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.invoicesService.duplicate(tenantId, user.id, id);
  }

  @Patch(':id')
  @Roles('OWNER', 'ADMIN')
  update(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateInvoiceDto,
  ) {
    return this.invoicesService.update(tenantId, user.id, id, dto);
  }

  @Post(':id/pdf')
async generatePdf(
  @CurrentTenant() tenantId: string,
  @Param('id') id: string,
  @Res() res: Response,
    ) {
  const pdfBuffer = await this.pdfService.generateInvoicePdf(tenantId, id);
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="factura-${id}.pdf"`,
    'Content-Length': pdfBuffer.length,
  });
  res.end(pdfBuffer);
    }
}