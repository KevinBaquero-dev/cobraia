import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ConversationStateService } from './services/conversation-state.service';
import { ActionRouterService } from './services/action-router.service';

@Module({
  controllers: [ChatController],
  providers: [ChatService, ConversationStateService, ActionRouterService],
  exports: [ChatService],
})
export class ChatModule {}