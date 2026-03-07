export const invoiceFunctions = [
  {
    name: 'get_invoices_summary',
    description: 'Obtiene un resumen de las facturas del tenant. Útil para responder preguntas sobre totales, estados, y estadísticas generales.',
    parameters: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['DRAFT', 'SENT', 'PAID', 'CANCELLED', 'OVERDUE'],
          description: 'Filtrar por estado de la factura',
        },
        dateFrom: {
          type: 'string',
          description: 'Fecha de inicio en formato YYYY-MM-DD',
        },
        dateTo: {
          type: 'string',
          description: 'Fecha de fin en formato YYYY-MM-DD',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_client_balance',
    description: 'Obtiene el saldo pendiente de un cliente específico.',
    parameters: {
      type: 'object',
      properties: {
        clientName: {
          type: 'string',
          description: 'Nombre del cliente a buscar',
        },
      },
      required: ['clientName'],
    },
  },
  {
    name: 'get_top_clients',
    description: 'Obtiene los clientes con mayor facturación.',
    parameters: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Número de clientes a retornar (máximo 10)',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_monthly_revenue',
    description: 'Obtiene los ingresos del mes actual o de un mes específico.',
    parameters: {
      type: 'object',
      properties: {
        month: {
          type: 'number',
          description: 'Mes (1-12). Si no se especifica, usa el mes actual.',
        },
        year: {
          type: 'number',
          description: 'Año. Si no se especifica, usa el año actual.',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_overdue_invoices',
    description: 'Obtiene las facturas vencidas que no han sido pagadas.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
];