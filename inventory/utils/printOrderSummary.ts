import type { OrderSummaryRow } from '../../lib/orderSummaryApi';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const PAYMENT_LABELS: Record<string, string> = {
  cashOrSwish: 'Cash / Swish',
  points: 'Points',
  payAtStore: 'Pay at Store',
};

interface RouteInfo {
  orderedStopIds: string[];
  totalTimeSeconds: number;
  totalDistanceMeters: number;
  failedStops: string[];
}

function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function formatDistance(meters: number): string {
  const km = meters / 1000;
  return km < 1 ? `${Math.round(meters)} m` : `${km.toFixed(1)} km`;
}

function generatePrintHtml(
  rows: OrderSummaryRow[],
  windowLabel: string,
  grandTotal: number,
  customerCount: number,
  routeInfo?: RouteInfo
): string {
  const hasRoute = !!routeInfo && routeInfo.orderedStopIds.length > 0;

  const routeSummaryHtml = hasRoute
    ? `<div class="route-summary">
        <strong>Optimized Delivery Route</strong> &mdash;
        ${formatDuration(routeInfo!.totalTimeSeconds)} drive &middot;
        ${formatDistance(routeInfo!.totalDistanceMeters)} total &middot;
        ${routeInfo!.orderedStopIds.length} stops
        ${routeInfo!.failedStops.length > 0 ? `<span class="route-warning">(${routeInfo!.failedStops.length} address${routeInfo!.failedStops.length !== 1 ? 'es' : ''} could not be located)</span>` : ''}
      </div>`
    : '';

  const stopCol = hasRoute ? '<th class="stop-col">Stop</th>' : '';
  const stopFooterSpan = hasRoute ? 3 : 2;

  const tableRows = rows
    .map((row, idx) => {
      const rowClass = idx % 2 === 0 ? 'even' : 'odd';
      const items = row.items
        .map(item => `<span>${escapeHtml(item.name)} <span class="qty">x${item.quantity}</span></span>`)
        .join('<br/>');

      const addressLines = [
        `<strong>${escapeHtml(row.address.fullName)}</strong>`,
        escapeHtml(row.address.streetAddress),
        `${escapeHtml(row.address.postalCode)} ${escapeHtml(row.address.city)}`,
      ].join('<br/>');

      const delivery = row.deliveryInstructions
        ? `<br/><em class="delivery-note">${escapeHtml(row.deliveryInstructions)}</em>`
        : '';

      const contact = [
        `<strong>${escapeHtml(row.contactPhone)}</strong>`,
        row.contactEmail ? `<span class="email">${escapeHtml(row.contactEmail)}</span>` : '',
      ].filter(Boolean).join('<br/>');

      const paymentLabel = PAYMENT_LABELS[row.paymentMethod] || row.paymentMethod || 'Pending';
      const totalDisplay = row.deliveryFee > 0
        ? `${row.subtotal.toFixed(2)} kr<br/><span class="delivery-note">+${row.deliveryFee.toFixed(0)} kr delivery</span>`
        : `${row.subtotal.toFixed(2)} kr`;

      let stopCell = '';
      if (hasRoute) {
        const stopNum = routeInfo!.orderedStopIds.indexOf(row.orderId) + 1;
        const isFailed = routeInfo!.failedStops.includes(row.orderId);
        stopCell = `<td class="stop-cell">${
          stopNum > 0
            ? `<span class="stop-badge">${stopNum}</span>`
            : isFailed
            ? '<span class="stop-badge stop-unknown">?</span>'
            : '--'
        }</td>`;
      }

      return `<tr class="${rowClass}">
        <td class="row-num">${idx + 1}</td>
        ${stopCell}
        <td><strong>${escapeHtml(row.nickname)}</strong></td>
        <td class="items">${items}</td>
        <td>${addressLines}${delivery}</td>
        <td>${contact}</td>
        <td>${escapeHtml(paymentLabel)}</td>
        <td class="total">${totalDisplay}</td>
      </tr>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Order Summary - ${escapeHtml(windowLabel)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 11px;
      color: #1e293b;
      padding: 16px;
    }
    .header {
      text-align: center;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 2px solid #334155;
    }
    .header h1 { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
    .header p { font-size: 12px; color: #475569; }
    .route-summary {
      text-align: center;
      margin-bottom: 12px;
      padding: 8px 12px;
      background: #f0fdfa;
      border: 1px solid #99f6e4;
      border-radius: 6px;
      font-size: 11px;
      color: #0f766e;
    }
    .route-warning { color: #d97706; margin-left: 4px; }
    table { width: 100%; border-collapse: collapse; }
    thead th {
      background: #f1f5f9;
      text-align: left;
      padding: 6px 8px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      color: #475569;
      border-bottom: 2px solid #cbd5e1;
    }
    thead th.total-col { text-align: right; }
    thead th.stop-col { text-align: center; width: 40px; }
    tbody td {
      padding: 6px 8px;
      vertical-align: top;
      border-bottom: 1px solid #e2e8f0;
    }
    tr.odd { background: #f8fafc; }
    td.row-num { color: #94a3b8; font-weight: 600; width: 28px; }
    td.stop-cell { text-align: center; width: 40px; }
    .stop-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: #0d9488;
      color: white;
      font-size: 10px;
      font-weight: 700;
    }
    .stop-badge.stop-unknown { background: #f59e0b; }
    td.items .qty { color: #94a3b8; margin-left: 2px; }
    td.total { text-align: right; font-weight: 600; white-space: nowrap; }
    .delivery-note { font-size: 10px; color: #d97706; font-style: italic; }
    .email { font-size: 10px; color: #64748b; }
    tfoot td {
      padding: 8px;
      font-weight: 700;
      border-top: 2px solid #334155;
      background: #f1f5f9;
    }
    tfoot .grand-total { text-align: right; font-size: 13px; }
    @media print {
      body { padding: 0; }
      tr { page-break-inside: avoid; }
      thead { display: table-header-group; }
      tfoot { display: table-footer-group; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Order Summary &mdash; ${escapeHtml(windowLabel)}</h1>
    <p>${customerCount} customer${customerCount !== 1 ? 's' : ''} &middot; Total: ${grandTotal.toFixed(2)} kr</p>
  </div>
  ${routeSummaryHtml}
  <table>
    <thead>
      <tr>
        <th>#</th>
        ${stopCol}
        <th>Customer</th>
        <th>Items</th>
        <th>Address</th>
        <th>Contact</th>
        <th>Payment</th>
        <th class="total-col">Total</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="${stopFooterSpan}">${customerCount} customer${customerCount !== 1 ? 's' : ''}</td>
        <td colspan="4" style="text-align:right;">Grand Total</td>
        <td class="grand-total">${grandTotal.toFixed(2)} kr</td>
      </tr>
    </tfoot>
  </table>
</body>
</html>`;
}

export function printOrderSummary(
  rows: OrderSummaryRow[],
  windowLabel: string,
  grandTotal: number,
  customerCount: number,
  routeInfo?: RouteInfo
): void {
  const html = generatePrintHtml(rows, windowLabel, grandTotal, customerCount, routeInfo);
  const printWindow = globalThis.open('', '_blank', 'width=900,height=700');
  if (!printWindow) return;

  printWindow.document.write(html);
  printWindow.document.close();

  printWindow.addEventListener('afterprint', () => printWindow.close());

  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };
}
