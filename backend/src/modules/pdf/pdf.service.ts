import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { modernaTemplate } from './templates/moderna.template';
import * as puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

@Injectable()
export class PdfService {
  constructor(private prisma: PrismaService) {}

  private getTemplate(templateId: number, data: any): string {
    // Por ahora todas usan la plantilla Moderna
    // En fases siguientes se agregan las otras 4
    return modernaTemplate(data);
  }

  async generateInvoicePdf(tenantId: string, invoiceId: string): Promise<Buffer> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
      include: {
        items: { orderBy: { sortOrder: 'asc' } },
        client: true,
        tenant: true,
      },
    });

    if (!invoice) throw new NotFoundException('Factura no encontrada');

    const html = this.getTemplate(invoice.tenant.templateId || 1, {
      invoice,
      tenant: invoice.tenant,
      client: invoice.client,
    });

    const pdfBuffer = await this.htmlToPdf(html);

    // Guardar URL mock (en Módulo 11 se sube a R2)
    const pdfUrl = `https://r2.cobraia.co/pdfs/${tenantId}/${invoiceId}.pdf`;
    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { pdfUrl },
    });

    return pdfBuffer;
  }

  private async htmlToPdf(html: string): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '0px',
          bottom: '0px',
          left: '0px',
          right: '0px',
        },
      });

      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }
}