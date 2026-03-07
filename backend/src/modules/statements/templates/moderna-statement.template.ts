export function modernaStatementTemplate(data: any): string {
  const { tenant, client, invoices, payments, summary, dateFrom, dateTo } = data;

  const invoicesHtml = invoices.length
    ? invoices
        .map(
          (inv: any) => `
      <tr>
        <td>${formatDate(inv.issueDate)}</td>
        <td>${inv.invoiceNumber}</td>
        <td class="right">${formatCurrency(Number(inv.total), inv.currency)}</td>
        <td class="center"><span class="badge badge-${inv.status.toLowerCase()}">${getStatusLabel(inv.status)}</span></td>
      </tr>
    `,
        )
        .join('')
    : `<tr><td colspan="4" class="center" style="color:#9ca3af;">Sin facturas en el período</td></tr>`;

  const paymentsHtml = payments.length
    ? payments
        .map(
          (pay: any) => `
      <tr>
        <td>${formatDate(pay.paidAt)}</td>
        <td>${pay.reference || '—'}</td>
        <td>${pay.method || 'No especificado'}</td>
        <td class="right">${formatCurrency(Number(pay.amount), 'COP')}</td>
      </tr>
    `,
        )
        .join('')
    : `<tr><td colspan="4" class="center" style="color:#9ca3af;">Sin pagos en el período</td></tr>`;

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 13px; color: #1f2937; background: #fff; }
    .page { padding: 48px; max-width: 800px; margin: 0 auto; }

    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
    .logo-area .company-name { font-size: 22px; font-weight: 700; color: ${tenant.brandColor || '#1e40af'}; }
    .logo-area .slogan { font-size: 11px; color: #6b7280; margin-top: 2px; }
    .doc-title { text-align: right; }
    .doc-title h1 { font-size: 24px; font-weight: 800; color: ${tenant.brandColor || '#1e40af'}; }
    .doc-title .subtitle { font-size: 12px; color: #6b7280; margin-top: 4px; }

    .divider { height: 3px; background: linear-gradient(90deg, ${tenant.brandColor || '#1e40af'}, #93c5fd); border-radius: 2px; margin-bottom: 32px; }

    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px; }
    .info-box h3 { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af; margin-bottom: 8px; }
    .info-box .name { font-weight: 700; font-size: 15px; color: #111827; }
    .info-box p { font-size: 13px; color: #374151; line-height: 1.6; }

    .section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 2px solid ${tenant.brandColor || '#1e40af'}; }

    table { width: 100%; border-collapse: collapse; margin-bottom: 32px; }
    thead tr { background: ${tenant.brandColor || '#1e40af'}; }
    thead th { padding: 10px 14px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #fff; }
    thead th.right { text-align: right; }
    thead th.center { text-align: center; }
    tbody tr:nth-child(even) { background: #f9fafb; }
    tbody td { padding: 10px 14px; color: #374151; border-bottom: 1px solid #f3f4f6; font-size: 12px; }
    tbody td.right { text-align: right; }
    tbody td.center { text-align: center; }

    .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 600; text-transform: uppercase; }
    .badge-draft { background: #f3f4f6; color: #6b7280; }
    .badge-sent { background: #dbeafe; color: #1d4ed8; }
    .badge-paid { background: #dcfce7; color: #15803d; }
    .badge-cancelled { background: #fee2e2; color: #b91c1c; }
    .badge-overdue { background: #fef3c7; color: #b45309; }

    .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 32px; }
    .summary-card { padding: 20px; border-radius: 8px; text-align: center; }
    .summary-card.billed { background: #eff6ff; border: 1px solid #bfdbfe; }
    .summary-card.paid { background: #f0fdf4; border: 1px solid #bbf7d0; }
    .summary-card.balance { background: ${Number(summary.balance) > 0 ? '#fff7ed' : '#f0fdf4'}; border: 1px solid ${Number(summary.balance) > 0 ? '#fed7aa' : '#bbf7d0'}; }
    .summary-card label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; display: block; margin-bottom: 8px; }
    .summary-card .amount { font-size: 18px; font-weight: 800; color: #111827; }
    .summary-card.balance .amount { color: ${Number(summary.balance) > 0 ? '#b45309' : '#15803d'}; }

    .footer { text-align: center; padding-top: 24px; border-top: 1px solid #e5e7eb; }
    .footer p { font-size: 11px; color: #9ca3af; }
    .footer .powered { font-size: 10px; color: #d1d5db; margin-top: 4px; }
  </style>
</head>
<body>
<div class="page">

  <div class="header">
    <div class="logo-area">
      ${tenant.logoUrl ? `<img src="${tenant.logoUrl}" alt="${tenant.companyName}" style="max-height:60px;max-width:180px;">` : `<div class="company-name">${tenant.companyName}</div>`}
      ${tenant.companySlogan ? `<div class="slogan">${tenant.companySlogan}</div>` : ''}
      ${tenant.taxId ? `<div style="font-size:11px;color:#6b7280;margin-top:4px;">NIT: ${tenant.taxId}</div>` : ''}
    </div>
    <div class="doc-title">
      <h1>ESTADO DE CUENTA</h1>
      <div class="subtitle">Período: ${formatDate(dateFrom)} — ${formatDate(dateTo)}</div>
      <div class="subtitle" style="margin-top:4px;">Generado: ${formatDate(new Date())}</div>
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
    </div>
    <div class="info-box">
      <h3>Empresa emisora</h3>
      <p class="name">${tenant.companyName}</p>
      ${tenant.taxId ? `<p>NIT: ${tenant.taxId}</p>` : ''}
      ${tenant.email ? `<p>${tenant.email}</p>` : ''}
    </div>
  </div>

  <div class="section-title">Resumen del período</div>
  <div class="summary">
    <div class="summary-card billed">
      <label>Total Facturado</label>
      <div class="amount">${formatCurrency(summary.totalBilled, 'COP')}</div>
    </div>
    <div class="summary-card paid">
      <label>Total Pagado</label>
      <div class="amount">${formatCurrency(summary.totalPaid, 'COP')}</div>
    </div>
    <div class="summary-card balance">
      <label>Saldo Pendiente</label>
      <div class="amount">${formatCurrency(summary.balance, 'COP')}</div>
    </div>
  </div>

  <div class="section-title">Facturas</div>
  <table>
    <thead>
      <tr>
        <th>Fecha</th>
        <th>N° Factura</th>
        <th class="right">Valor</th>
        <th class="center">Estado</th>
      </tr>
    </thead>
    <tbody>${invoicesHtml}</tbody>
  </table>

  <div class="section-title">Pagos y abonos</div>
  <table>
    <thead>
      <tr>
        <th>Fecha</th>
        <th>Referencia</th>
        <th>Método</th>
        <th class="right">Valor</th>
      </tr>
    </thead>
    <tbody>${paymentsHtml}</tbody>
  </table>

  <div class="footer">
    <p>${tenant.companyName}${tenant.taxId ? ' · NIT: ' + tenant.taxId : ''}${tenant.email ? ' · ' + tenant.email : ''}</p>
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

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    DRAFT: 'Borrador', SENT: 'Enviada', PAID: 'Pagada',
    CANCELLED: 'Cancelada', OVERDUE: 'Vencida',
  };
  return labels[status] || status;
}