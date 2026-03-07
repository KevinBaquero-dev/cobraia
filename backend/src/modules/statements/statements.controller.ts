import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { StatementsService } from './statements.service';
import { CurrentTenant } from '../../common/decorators';

@Controller('statements')
export class StatementsController {
  constructor(private statementsService: StatementsService) {}

  @Get('preview')
  getPreview(
    @CurrentTenant() tenantId: string,
    @Query('clientId') clientId: string,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ) {
    if (!clientId || !dateFrom || !dateTo) {
      throw new BadRequestException('clientId, dateFrom y dateTo son requeridos');
    }
    return this.statementsService.getStatementData(tenantId, clientId, dateFrom, dateTo);
  }

  @Post('generate')
  async generate(
    @CurrentTenant() tenantId: string,
    @Query('clientId') clientId: string,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
    @Res() res: Response,
  ) {
    if (!clientId || !dateFrom || !dateTo) {
      throw new BadRequestException('clientId, dateFrom y dateTo son requeridos');
    }

    const pdfBuffer = await this.statementsService.generateStatement(
      tenantId,
      clientId,
      dateFrom,
      dateTo,
    );

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="estado-cuenta-${clientId}-${dateFrom}-${dateTo}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.end(pdfBuffer);
  }
}