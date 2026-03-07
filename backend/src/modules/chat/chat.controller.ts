import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatMessageDto } from './dto/chat-message.dto';
import { CurrentTenant, CurrentUser } from '../../common/decorators';

@Controller('chat')
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Post('message')
  sendMessage(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @Body() dto: ChatMessageDto,
  ) {
    return this.chatService.sendMessage(tenantId, user.id, dto);
  }

  @Get('history')
  getHistory(@CurrentTenant() tenantId: string) {
    return this.chatService.getHistory(tenantId);
  }

  @Get('history/:conversationId')
  getConversation(
    @CurrentTenant() tenantId: string,
    @Param('conversationId') conversationId: string,
  ) {
    return this.chatService.getConversation(tenantId, conversationId);
  }

  @Delete('history')
  @HttpCode(HttpStatus.OK)
  clearHistory(@CurrentTenant() tenantId: string) {
    return this.chatService.clearHistory(tenantId);
  }
}