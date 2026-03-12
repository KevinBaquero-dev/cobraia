import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { Intent, ParsedIntent } from '../utils/intent-parser';

export interface ConversationState {
  user_id: string;
  whatsapp_number?: string;
  current_intent: Intent;
  pending_data: Partial<{
    client_name: string;
    client_id: string;
    amount: number;
    concept: string;
    invoice_id: string;
    ambiguous_clients: { id: string; name: string }[];
  }>;
  awaiting: 'confirmation' | 'client_selection' | 'amount' | 'concept' | null;
  created_at: string;
  expires_at: string;
}

const TTL_SECONDS = 600; // 10 minutos
const KEY_PREFIX = 'chat_state:';

@Injectable()
export class ConversationStateService {
  constructor(@InjectRedis() private redis: Redis) {}

  private key(tenantId: string, userId: string): string {
    return `${KEY_PREFIX}${tenantId}:${userId}`;
  }

  async get(tenantId: string, userId: string): Promise<ConversationState | null> {
    const raw = await this.redis.get(this.key(tenantId, userId));
    if (!raw) return null;
    return JSON.parse(raw);
  }

  async set(tenantId: string, userId: string, state: Partial<ConversationState>): Promise<void> {
    const existing = await this.get(tenantId, userId);
    const now = new Date();
    const expires = new Date(now.getTime() + TTL_SECONDS * 1000);

    const newState: ConversationState = {
      user_id: userId,
      current_intent: 'unknown',
      pending_data: {},
      awaiting: null,
      created_at: existing?.created_at || now.toISOString(),
      expires_at: expires.toISOString(),
      ...existing,
      ...state,
    };

    await this.redis.setex(
      this.key(tenantId, userId),
      TTL_SECONDS,
      JSON.stringify(newState),
    );
  }

  async clear(tenantId: string, userId: string): Promise<void> {
    await this.redis.del(this.key(tenantId, userId));
  }

  async mergeData(
    tenantId: string,
    userId: string,
    data: Partial<ConversationState['pending_data']>,
  ): Promise<void> {
    const existing = await this.get(tenantId, userId);
    if (!existing) return;
    await this.set(tenantId, userId, {
      pending_data: { ...existing.pending_data, ...data },
    });
  }
}