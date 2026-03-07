import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { QueryClientDto } from './dto/query-client.dto';
import { CurrentTenant, Roles } from '../../common/decorators';

@Controller('clients')
export class ClientsController {
  constructor(private clientsService: ClientsService) {}

  @Post()
  @Roles('OWNER', 'ADMIN')
  create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateClientDto,
  ) {
    return this.clientsService.create(tenantId, dto);
  }

  @Get()
  findAll(
    @CurrentTenant() tenantId: string,
    @Query() query: QueryClientDto,
  ) {
    return this.clientsService.findAll(tenantId, query);
  }

  @Get(':id')
  findOne(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.clientsService.findOne(tenantId, id);
  }

  @Patch(':id')
  @Roles('OWNER', 'ADMIN')
  update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateClientDto,
  ) {
    return this.clientsService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @Roles('OWNER', 'ADMIN')
  remove(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.clientsService.remove(tenantId, id);
  }

  @Get(':id/invoices')
  getInvoiceHistory(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.clientsService.getInvoiceHistory(tenantId, id);
  }
}