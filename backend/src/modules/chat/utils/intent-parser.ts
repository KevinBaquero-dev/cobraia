import OpenAI from 'openai';

export type Intent =
  | 'create_invoice'
  | 'register_payment'
  | 'cancel_invoice'
  | 'get_client_debt'
  | 'get_total_debt'
  | 'list_pending_invoices'
  | 'business_summary'
  | 'confirm'
  | 'reject'
  | 'unknown';

export interface ParsedIntent {
  intent: Intent;
  client_name: string | null;
  amount: number | null;
  concept: string | null;
  invoice_id: string | null;
  raw_amount: string | null;
}

const INTENT_SYSTEM_PROMPT = `Eres un parser de intenciones para un sistema de facturación colombiano.
Tu única tarea es analizar el mensaje del usuario y devolver un JSON con la intención detectada.
No respondas con texto libre. Solo devuelve JSON válido.

Intenciones disponibles:
- create_invoice: el usuario quiere crear una factura
- register_payment: el usuario quiere registrar un pago recibido
- cancel_invoice: el usuario quiere cancelar una factura
- get_client_debt: el usuario pregunta cuánto le debe un cliente específico
- get_total_debt: el usuario pregunta por el total que le deben todos sus clientes
- list_pending_invoices: el usuario quiere ver facturas pendientes o sin pagar
- business_summary: el usuario quiere un resumen general del negocio
- confirm: el usuario está confirmando una acción pendiente (sí, dale, confirmo, ok, claro, correcto)
- reject: el usuario está rechazando una acción pendiente (no, cancela, olvídalo)
- unknown: no se puede determinar la intención

Formato de respuesta (siempre este JSON exacto):
{
  "intent": "",
  "client_name": null,
  "amount": null,
  "concept": null,
  "invoice_id": null,
  "raw_amount": null
}

Notas:
- client_name: nombre del cliente mencionado o null
- amount: monto como número entero en pesos (200000, no "200 mil")
- raw_amount: el monto tal como lo escribió el usuario ("200 mil", "300k", etc.)
- concept: descripción del servicio o producto
- invoice_id: número o ID de factura mencionado`;

export async function parseIntent(
  openai: OpenAI,
  message: string,
): Promise<ParsedIntent> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: INTENT_SYSTEM_PROMPT },
        { role: 'user', content: message },
      ],
      max_tokens: 200,
      temperature: 0,
    });

    const content = response.choices[0].message.content || '{}';
    const clean = content.replace(/```json|```/g, '').trim();
    return JSON.parse(clean) as ParsedIntent;
  } catch {
    return {
      intent: 'unknown',
      client_name: null,
      amount: null,
      concept: null,
      invoice_id: null,
      raw_amount: null,
    };
  }
}

export function parseMockIntent(message: string): ParsedIntent {
  const lower = message.toLowerCase().trim();

  const isConfirm = /^(sí|si|dale|ok|claro|confirmo|correcto|listo|adelante|sip|yes)$/i.test(lower);
  const isReject  = /^(no|cancela|cancelar|olvídalo|olvidalo|negativo)$/i.test(lower);

  if (isConfirm) return base('confirm');
  if (isReject)  return base('reject');

  if (lower.includes('factura') && (lower.includes('crea') || lower.includes('haz') || lower.includes('hacer') || lower.includes('nueva')))
    return base('create_invoice', extractClient(lower), extractAmount(lower), extractConcept(lower));

  if (lower.includes('pago') || lower.includes('pagó') || lower.includes('pagaron') || lower.includes('recibí'))
    return base('register_payment', extractClient(lower), extractAmount(lower));

  if (lower.includes('cancel'))
    return base('cancel_invoice', extractClient(lower));

  if ((lower.includes('debe') || lower.includes('deuda') || lower.includes('saldo')) && extractClient(lower))
    return base('get_client_debt', extractClient(lower));

  if (lower.includes('deben') || lower.includes('total') && lower.includes('debe'))
    return base('get_total_debt');

  if (lower.includes('pendiente') || lower.includes('sin pagar') || lower.includes('cobrar'))
    return base('list_pending_invoices');

  if (lower.includes('resumen') || lower.includes('negocio') || lower.includes('hoy') || lower.includes('cómo va') || lower.includes('como va'))
    return base('business_summary');

  return base('unknown');
}

function base(intent: Intent, client_name: string | null = null, amount: number | null = null, concept: string | null = null): ParsedIntent {
  return { intent, client_name, amount, concept, invoice_id: null, raw_amount: null };
}

function extractClient(text: string): string | null {
  const match = text.match(/(?:a|de|para|cliente)\s+([a-záéíóúñ][a-záéíóúñ\s]{2,30}?)(?:\s+por|\s+\d|\s+$|$)/i);
  return match ? match[1].trim() : null;
}

function extractAmount(text: string): number | null {
  const match = text.match(/(\d[\d.,]*)\s*(mil|k|m|millón)?/i);
  if (!match) return null;
  const num = parseFloat(match[1].replace(/\./g, '').replace(',', '.'));
  const unit = (match[2] || '').toLowerCase();
  if (unit === 'mil' || unit === 'k') return Math.round(num * 1000);
  if (unit === 'm' || unit === 'millón') return Math.round(num * 1_000_000);
  return Math.round(num);
}

function extractConcept(text: string): string | null {
  const match = text.match(/(?:por|concepto|servicio|producto)\s+(.{3,60}?)(?:\s+a\s+|\s+para\s+|$)/i);
  return match ? match[1].trim() : null;
}