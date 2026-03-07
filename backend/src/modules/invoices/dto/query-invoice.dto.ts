import { IsOptional, IsString, IsInt, Min, Max, IsEnum } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { InvoiceStatus } from '@prisma/client';

export class QueryInvoiceDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}