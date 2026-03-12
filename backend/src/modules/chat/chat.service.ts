import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ChatMessageDto } from './dto/chat-message.dto';
import { parseIntent, parseMockIntent } from './utils/intent-parser';
import { ConversationStateService } from './services/conversation-state.service';
import { ActionRouterService } from './services/action-router.service';
import OpenAI from 'openai';
import { Plan } from '@prisma/client';

@Injectable()
export class ChatService {
  private openai: OpenAI;

  constructor(
    private prisma: PrismaService,
    private stateService: ConversationStateService,
    private actionRouter: ActionRouterService,
  ) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || 'mock',
    });
  }

  private isMockMode(): boolean {
    const key = process.env.OPENAI_API_KEY || '';
    return !key || key === 'mock' || key === '' || process.env.CHAT_MOCK_MODE === 'true';
  }

  private async checkChatAccess(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { plan: true },
    });
    if (!tenant) throw new NotFoundException('Tenant no encontrado');
    if (tenant.plan === Plan.BASIC) {
      throw new ForbiddenException(
        'El chatbot IA está disponible en planes Pro y Empresarial',
      );
    }
    return tenant;
  }

  async sendMessage(tenantId: string, userId: string, dto: ChatMessageDto) {
    await this.checkChatAccess(tenantId);

    // Obtener o crear conversación
    let conversation = dto.conversationId
      ? await this.prisma.chatConversation.findFirst({
          where: { id: dto.conversationId, tenantId },
        })
      : null;

    if (!conversation) {
      conversation = await this.prisma.chatConversation.create({
        data: {
          tenantId,
          userId,
          title: dto.message.substring(0, 50),
          messages: [],
          isActive: true,
        },
      });
    }

    // Parsear intención
    const parsed = this.isMockMode()
      ? parseMockIntent(dto.message)
      : await parseIntent(this.openai, dto.message);

    // Obtener estado actual de la conversación
    const state = await this.stateService.get(tenantId, userId);

    // Rutear acción
    const assistantMessage = await this.actionRouter.route(
      tenantId,
      userId,
      parsed,
      state,
    );

    // Guardar mensajes en historial
    const history = (conversation.messages as any[]) || [];
    const updatedHistory = [
      ...history,
      { role: 'user', content: dto.message, timestamp: new Date().toISOString() },
      { role: 'assistant', content: assistantMessage, timestamp: new Date().toISOString() },
    ];

    await this.prisma.chatConversation.update({
      where: { id: conversation.id },
      data: { messages: updatedHistory },
    });

    return {
      conversationId: conversation.id,
      message: assistantMessage,
      timestamp: new Date().toISOString(),
    };
  }

  async getBusinessSummary(tenantId: string) {
    return this.actionRouter.getBusinessSummary(tenantId);
  }

  async getHistory(tenantId: string) {
    return this.prisma.chatConversation.findMany({
      where: { tenantId, isActive: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async getConversation(tenantId: string, conversationId: string) {
    const conversation = await this.prisma.chatConversation.findFirst({
      where: { id: conversationId, tenantId },
    });
    if (!conversation) throw new NotFoundException('Conversación no encontrada');
    return conversation;
  }

  async clearHistory(tenantId: string) {
    await this.prisma.chatConversation.updateMany({
      where: { tenantId },
      data: { isActive: false },
    });
    return { message: 'Historial limpiado exitosamente' };
  }
}