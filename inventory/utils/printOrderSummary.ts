import type { OrderSummaryRow } from '../../lib/orderSummaryApi';

export interface UserGroup {
  userId: string;
  nickname: string;
  orders: OrderSummaryRow[];
  subtotal: number;
}

const PAYMENT_LABELS: Record<string, string> = {
  cashOrSwish: 'Cash / Swish',
  points: 'Points',
  payAtStore: 'Pay at Store',
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function generatePrintHtml(
  groups: UserGroup[],
  windowLabel: string,
  grandTotal: number,
  uniqueCustomers: number
): string {
  const tableRows = groups
    .map((group, groupIdx) => {
      const hasMultiple = group.orders.length > 1;
      const rowClass = groupIdx % 2 === 0 ? 'even' : 'odd';

      const orderRows = group.orders.map((row, orderIdx) => {
        const items = row.items
          .map(
            (item) =>
              `<span>${escapeHtml(item.name)} <span class="qty">x${item.quantity}</span></span>`
          )
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
        ]
          .filter(Boolean)
          .join('<br/>');

        const paymentLabel = PAYMENT_LABELS[row.paymentMethod] || row.paymentMethod;

        const numCell = orderIdx === 0
          ? `<td class="row-num" rowspan="${hasMultiple ? group.orders.length + 1 : 1}">${groupIdx + 1}</td>`
          : '';
        const nameCell = orderIdx === 0
          ? `<td rowspan="${hasMultiple ? group.orders.length + 1 : 1}"><strong>${escapeHtml(group.nickname)}</strong>${hasMultiple ? `<br/><span class="sub-count">${group.orders.length} orders</span>` : ''}</td>`
          : '';

        return `<tr class="${rowClass}${orderIdx > 0 ? ' sub-row' : ''}">
          ${numCell}
          ${nameCell}
          <td class="items">${items}</td>
          <td>${addressLines}${delivery}</td>
          <td>${contact}</td>
          <td>${escapeHtml(paymentLabel)}</td>
          <td class="total">${row.total.toFixed(2)} kr</td>
        </tr>`;
      });

      if (hasMultiple) {
        orderRows.push(`<tr class="${rowClass} subtotal-row">
          <td colspan="4" style="text-align:right;"><strong>Subtotal</strong></td>
          <td class="total"><strong>${group.subtotal.toFixed(2)} kr</strong></td>
        </tr>`);
      }

      return orderRows.join('\n');
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
    .header h1 {
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 4px;
    }
    .header p {
      font-size: 12px;
      color: #475569;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
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
    tbody td {
      padding: 6px 8px;
      vertical-align: top;
      border-bottom: 1px solid #e2e8f0;
    }
    tr.odd { background: #f8fafc; }
    td.row-num {
      color: #94a3b8;
      font-weight: 600;
      width: 28px;
    }
    td.items .qty { color: #94a3b8; margin-left: 2px; }
    td.total {
      text-align: right;
      font-weight: 600;
      white-space: nowrap;
    }
    .sub-count {
      font-size: 9px;
      color: #64748b;
    }
    .sub-row td {
      border-bottom: 1px dashed #e2e8f0;
    }
    .subtotal-row td {
      border-bottom: 2px solid #cbd5e1;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .delivery-note {
      font-size: 10px;
      color: #d97706;
      font-style: italic;
    }
    .email {
      font-size: 10px;
      color: #64748b;
    }
    tfoot td {
      padding: 8px;
      font-weight: 700;
      border-top: 2px solid #334155;
      background: #f1f5f9;
    }
    tfoot .grand-total {
      text-align: right;
      font-size: 13px;
    }
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
    <p>${uniqueCustomers} customer${uniqueCustomers !== 1 ? 's' : ''} &middot; Total: ${grandTotal.toFixed(2)} kr</p>
  </div>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Nickname</th>
        <th>Product List</th>
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
        <td colspan="2">${uniqueCustomers} customer${uniqueCustomers !== 1 ? 's' : ''}</td>
        <td colspan="4" style="text-align:right;">Grand Total</td>
        <td class="grand-total">${grandTotal.toFixed(2)} kr</td>
      </tr>
    </tfoot>
  </table>
</body>
</html>`;
}

export function printOrderSummary(
  groups: UserGroup[],
  windowLabel: string,
  grandTotal: number,
  uniqueCustomers: number
): void {
  const html = generatePrintHtml(groups, windowLabel, grandTotal, uniqueCustomers);
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
