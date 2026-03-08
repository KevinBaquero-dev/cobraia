import { IsString, IsOptional } from 'class-validator';

export class WhatsappWebhookDto {
  @IsString()
  From: string = '';

  @IsString()
  To: string = '';

  @IsString()
  Body: string = '';

  @IsOptional()
  @IsString()
  ProfileName?: string;

  @IsOptional()
  @IsString()
  WaId?: string;
}