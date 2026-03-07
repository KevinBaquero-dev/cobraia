import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { CurrentTenant, Roles, Public } from '../../common/decorators';
import { Plan } from '@prisma/client';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private subscriptionsService: SubscriptionsService) {}

  @Get('plans')
  @Public()
  getPlans() {
    return this.subscriptionsService.getPlans();
  }

  @Get('current')
  getCurrent(@CurrentTenant() tenantId: string) {
    return this.subscriptionsService.getCurrentPlan(tenantId);
  }

  @Post('checkout')
  @Roles('OWNER')
  createCheckout(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateSubscriptionDto,
  ) {
    return this.subscriptionsService.createPaymentLink(tenantId, dto.plan);
  }

  @Post('webhook/wompi')
  @Public()
  @HttpCode(HttpStatus.OK)
  handleWompiWebhook(@Body() payload: any) {
    return this.subscriptionsService.handleWompiWebhook(payload);
  }

  @Delete('cancel')
  @Roles('OWNER')
  @HttpCode(HttpStatus.OK)
  cancelSubscription(@CurrentTenant() tenantId: string) {
    return this.subscriptionsService.cancelSubscription(tenantId);
  }
}