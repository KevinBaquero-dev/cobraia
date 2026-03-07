import {
  IsString,
  IsOptional,
  IsDateString,
  IsArray,
  ValidateNested,
  IsNumber,
  IsPositive,
  Min,
  Max,
  IsBoolean,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class InvoiceItemDto {
  @IsString()
  @MinLength(1)
  description: string;

  @IsNumber()
  @IsPositive()
  quantity: number;

  @IsNumber()
  @IsPositive()
  unitPrice: number;
}

export class CreateInvoiceDto {
  @IsString()
  clientId: string;

  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @IsOptional()
  @IsBoolean()
  isNumberManual?: boolean;

  @IsDateString()
  issueDate: string;

  @IsDateString()
  dueDate: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items: InvoiceItemDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  taxRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  retentionRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  currency?: string;
}