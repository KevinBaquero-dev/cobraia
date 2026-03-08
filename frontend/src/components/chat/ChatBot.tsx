'use client';

import { useState, useRef, useEffect } from 'react';
import { chatApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import {
  MessageSquare, X, Send, Loader2, Bot, User, Trash2,
} from 'lucide-react';
import { clsx } from 'clsx';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export default function ChatBot() {
  const { tenant } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const canUseChat = tenant?.plan === 'PRO' || tenant?.plan === 'ENTERPRISE';

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: '¡Hola! Soy **CobraIA**, tu asistente de facturación. ¿En qué puedo ayudarte hoy?',
        timestamp: new Date().toISOString(),
      }]);
    }
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMessage = input.trim();
    setInput('');

    setMessages((prev) => [...prev, {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
    }]);

    setLoading(true);
    try {
      const res: any = await chatApi.sendMessage(userMessage, conversationId);
      const { message, conversationId: convId } = res.data;
      if (convId) setConversationId(convId);
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: message,
        timestamp: new Date().toISOString(),
      }]);
    } catch {
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: 'Lo siento, ocurrió un error. Intenta de nuevo.',
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    await chatApi.clearHistory();
    setMessages([{
      role: 'assistant',
      content: '¡Hola! Conversación reiniciada. ¿En qué puedo ayudarte?',
      timestamp: new Date().toISOString(),
    }]);
    setConversationId(undefined);
  };

  const formatMessage = (content: string) => {
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n•/g, '<br/>•')
      .replace(/\n/g, '<br/>');
  };

  if (!canUseChat) return null;

  return (
    <>
      {/* Chat window */}
      {open && (
        <div className="fixed bottom-20 right-6 w-80 h-[480px] z-50 flex flex-col glass rounded-2xl border border-border shadow-2xl animate-slide-up overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface/80 backdrop-blur-sm">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand to-accent-blue flex items-center justify-center">
                  <Bot size={15} className="text-white" />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-surface" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">CobraIA</p>
                <p className="text-xs text-emerald-400">En línea</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleClear}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-secondary transition-colors"
                title="Limpiar conversación"
              >
                <Trash2 size={13} />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-secondary transition-colors"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={clsx(
                  'flex gap-2.5 items-start',
                  msg.role === 'user' ? 'flex-row-reverse' : ''
                )}
              >
                <div className={clsx(
                  'w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
                  msg.role === 'user'
                    ? 'bg-brand/20'
                    : 'bg-gradient-to-br from-brand to-accent-blue'
                )}>
                  {msg.role === 'user'
                    ? <User size={12} className="text-brand-light" />
                    : <Bot size={12} className="text-white" />
                  }
                </div>
                <div className={clsx(
                  'max-w-[85%] px-3 py-2 rounded-xl text-sm',
                  msg.role === 'user'
                    ? 'bg-brand/15 text-white rounded-tr-sm'
                    : 'bg-surface-2 text-text-secondary rounded-tl-sm border border-border'
                )}>
                  <span
                    dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
                  />
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2.5 items-start">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-brand to-accent-blue flex items-center justify-center shrink-0">
                  <Bot size={12} className="text-white" />
                </div>
                <div className="bg-surface-2 border border-border px-3 py-2 rounded-xl rounded-tl-sm">
                  <div className="flex gap-1 items-center h-4">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-border bg-surface/50">
            <div className="relative flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Escribe tu pregunta..."
                className="flex-1 px-4 py-2.5 pr-10 rounded-xl bg-surface-2 border border-border text-white placeholder-text-muted text-sm focus:outline-none focus:border-brand/50 transition-colors"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="absolute right-2 p-1.5 rounded-lg bg-brand hover:bg-brand-light disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
              >
                {loading ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FAB button */}
      <button
        onClick={() => setOpen(!open)}
        className={clsx(
          'fixed bottom-6 right-6 z-50 w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-300',
          open
            ? 'bg-surface-2 border border-border text-text-secondary rotate-0'
            : 'bg-gradient-to-br from-brand to-accent-blue text-white hover:scale-110'
        )}
        style={{
          boxShadow: open ? undefined : '0 0 20px rgba(13, 148, 136, 0.4), 0 4px 12px rgba(0,0,0,0.3)',
        }}
      >
        {open ? <X size={18} /> : <MessageSquare size={18} />}
      </button>
    </>
  );
}