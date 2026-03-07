export function modernaTemplate(data: any): string {
  const { invoice, tenant, client } = data;

  const itemsHtml = invoice.items
    .map(
      (item: any) => `
      <tr>
        <td>${item.description}</td>
        <td class="center">${Number(item.quantity)}</td>
        <td class="right">${formatCurrency(Number(item.unitPrice), invoice.currency)}</td>
        <td class="right">${formatCurrency(Number(item.amount), invoice.currency)}</td>
      </tr>
    `,
    )
    .join('');

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 13px; color: #1f2937; background: #fff; }
    .page { padding: 48px; max-width: 800px; margin: 0 auto; }

    /* HEADER */
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
    .logo-area img { max-height: 60px; max-width: 180px; }
    .logo-area .company-name { font-size: 22px; font-weight: 700; color: ${tenant.brandColor || '#1e40af'}; }
    .logo-area .slogan { font-size: 11px; color: #6b7280; margin-top: 2px; }
    .invoice-title { text-align: right; }
    .invoice-title h1 { font-size: 28px; font-weight: 800; color: ${tenant.brandColor || '#1e40af'}; letter-spacing: -0.5px; }
    .invoice-title .number { font-size: 16px; color: #374151; margin-top: 4px; }
    .invoice-title .status { display: inline-block; margin-top: 8px; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; text-transform: uppercase; background: ${getStatusColor(invoice.status).bg}; color: ${getStatusColor(invoice.status).text}; }

    /* DIVIDER */
    .divider { height: 3px; background: linear-gradient(90deg, ${tenant.brandColor || '#1e40af'}, #93c5fd); border-radius: 2px; margin-bottom: 32px; }

    /* INFO GRID */
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px; }
    .info-box h3 { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af; margin-bottom: 8px; }
    .info-box p { font-size: 13px; color: #374151; line-height: 1.6; }
    .info-box .name { font-weight: 700; font-size: 15px; color: #111827; }
    .dates-box { display: flex; gap: 24px; }
    .date-item label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af; display: block; margin-bottom: 4px; }
    .date-item span { font-size: 13px; color: #374151; font-weight: 600; }

    /* TABLE */
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    thead tr { background: ${tenant.brandColor || '#1e40af'}; }
    thead th { padding: 12px 16px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #fff; }
    thead th.right { text-align: right; }
    thead th.center { text-align: center; }
    tbody tr:nth-child(even) { background: #f9fafb; }
    tbody td { padding: 12px 16px; color: #374151; border-bottom: 1px solid #f3f4f6; }
    tbody td.right { text-align: right; }
    tbody td.center { text-align: center; }

    /* TOTALS */
    .totals { display: flex; justify-content: flex-end; margin-bottom: 32px; }
    .totals-box { width: 280px; }
    .totals-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f3f4f6; font-size: 13px; }
    .totals-row.total { padding: 12px 0; border-bottom: none; border-top: 2px solid ${tenant.brandColor || '#1e40af'}; margin-top: 4px; }
    .totals-row.total .label { font-weight: 700; font-size: 15px; color: #111827; }
    .totals-row.total .value { font-weight: 800; font-size: 18px; color: ${tenant.brandColor || '#1e40af'}; }

    /* NOTES */
    .notes { background: #f9fafb; border-left: 4px solid ${tenant.brandColor || '#1e40af'}; padding: 16px; border-radius: 0 8px 8px 0; margin-bottom: 32px; }
    .notes h4 { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; margin-bottom: 6px; }
    .notes p { color: #374151; font-size: 12px; line-height: 1.6; }

    /* FOOTER */
    .footer { text-align: center; padding-top: 24px; border-top: 1px solid #e5e7eb; }
    .footer p { font-size: 11px; color: #9ca3af; }
    .footer .powered { font-size: 10px; color: #d1d5db; margin-top: 4px; }
  </style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="logo-area">
      ${tenant.logoUrl ? `<img src="${tenant.logoUrl}" alt="${tenant.companyName}">` : `<div class="company-name">${tenant.companyName}</div>`}
      ${tenant.companySlogan ? `<div class="slogan">${tenant.companySlogan}</div>` : ''}
      ${tenant.taxId ? `<div style="font-size:11px;color:#6b7280;margin-top:4px;">NIT: ${tenant.taxId}</div>` : ''}
    </div>
    <div class="invoice-title">
      <h1>FACTURA</h1>
      <div class="number">N° ${invoice.invoiceNumber}</div>
      <div class="status">${getStatusLabel(invoice.status)}</div>
    </div>
  </div>

  <div class="divider"></div>

  <div class="info-grid">
    <div class="info-box">
      <h3>Cliente</h3>
      <p class="name">${client.name}</p>
      ${client.taxId ? `<p>NIT: ${client.taxId}</p>` : ''}
      ${client.email ? `<p>${client.email}</p>` : ''}
      ${client.phone ? `<p>${client.phone}</p>` : ''}
      ${client.address?.street ? `<p>${client.address.street}${client.address.city ? ', ' + client.address.city : ''}</p>` : ''}
    </div>
    <div class="info-box">
      <h3>Fechas</h3>
      <div class="dates-box">
        <div class="date-item">
          <label>Emisión</label>
          <span>${formatDate(invoice.issueDate)}</span>
        </div>
        <div class="date-item">
          <label>Vencimiento</label>
          <span>${formatDate(invoice.dueDate)}</span>
        </div>
      </div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Descripción</th>
        <th class="center">Cant.</th>
        <th class="right">Precio Unit.</th>
        <th class="right">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-box">
      <div class="totals-row">
        <span class="label">Subtotal</span>
        <span class="value">${formatCurrency(Number(invoice.subtotal), invoice.currency)}</span>
      </div>
      ${Number(invoice.discount) > 0 ? `<div class="totals-row"><span class="label">Descuento</span><span class="value">-${formatCurrency(Number(invoice.discount), invoice.currency)}</span></div>` : ''}
      ${Number(invoice.taxRate) > 0 ? `<div class="totals-row"><span class="label">IVA (${invoice.taxRate}%)</span><span class="value">${formatCurrency(Number(invoice.taxAmount), invoice.currency)}</span></div>` : ''}
      ${Number(invoice.retentionRate) > 0 ? `<div class="totals-row"><span class="label">Retención (${invoice.retentionRate}%)</span><span class="value">-${formatCurrency(Number(invoice.retentionAmount), invoice.currency)}</span></div>` : ''}
      <div class="totals-row total">
        <span class="label">TOTAL</span>
        <span class="value">${formatCurrency(Number(invoice.total), invoice.currency)}</span>
      </div>
    </div>
  </div>

  ${invoice.notes ? `<div class="notes"><h4>Notas</h4><p>${invoice.notes}</p></div>` : ''}

  <div class="footer">
    <p>${tenant.companyName}${tenant.taxId ? ' · NIT: ' + tenant.taxId : ''}${tenant.phone ? ' · ' + tenant.phone : ''}</p>
    <div class="powered">Generado con CobraIA · cobraia.co</div>
  </div>
</div>
</body>
</html>
  `;
}

function formatCurrency(amount: number, currency = 'COP'): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function getStatusColor(status: string): { bg: string; text: string } {
  const colors: Record<string, { bg: string; text: string }> = {
    DRAFT:     { bg: '#f3f4f6', text: '#6b7280' },
    SENT:      { bg: '#dbeafe', text: '#1d4ed8' },
    PAID:      { bg: '#dcfce7', text: '#15803d' },
    CANCELLED: { bg: '#fee2e2', text: '#b91c1c' },
    OVERDUE:   { bg: '#fef3c7', text: '#b45309' },
  };
  return colors[status] || colors.DRAFT;
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    DRAFT:     'Borrador',
    SENT:      'Enviada',
    PAID:      'Pagada',
    CANCELLED: 'Cancelada',
    OVERDUE:   'Vencida',
  };
  return labels[status] || status;
}