import { IsEnum, IsOptional, IsString } from 'class-validator';
import { Plan } from '@prisma/client';

export class CreateSubscriptionDto {
  @IsEnum(Plan)
  plan: Plan;

  @IsOptional()
  @IsString()
  wompiPaymentId?: string;
}