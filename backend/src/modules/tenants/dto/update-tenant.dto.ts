import {
  IsString,
  IsOptional,
  IsHexColor,
  IsInt,
  Min,
  Max,
  IsUrl,
} from 'class-validator';

export class UpdateTenantDto {
  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  companySlogan?: string;

  @IsOptional()
  @IsString()
  taxId?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsHexColor()
  brandColor?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  templateId?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(365)
  invoicePaymentDays?: number;

  @IsOptional()
  @IsString()
  invoiceNotes?: string;

  @IsOptional()
  @IsString()
  invoiceCurrency?: string;
}