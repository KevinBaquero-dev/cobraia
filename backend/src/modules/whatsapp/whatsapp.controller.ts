import {
  Controller,
  Post,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  Header,
} from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { CurrentTenant, Public } from '../../common/decorators';

@Controller('whatsapp')
export class WhatsappController {
  constructor(private whatsappService: WhatsappService) {}

  @Post('webhook')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Header('Content-Type', 'text/xml')
  handleWebhook(@Body() payload: any) {
    return this.whatsappService.handleWebhook(payload);
  }

  @Post('send-invoice/:invoiceId')
  sendInvoice(
    @CurrentTenant() tenantId: string,
    @Param('invoiceId') invoiceId: string,
  ) {
    return this.whatsappService.sendInvoiceWhatsapp(tenantId, invoiceId);
  }
}