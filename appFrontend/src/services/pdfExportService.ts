import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
}

export interface OrderData {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  discount: number;
  shipping: number;
  total: number;
  date: string;
  status: string;
}

export interface ExportData {
  type: 'orders' | 'interests';
  data: any[];
  dateRange: {
    startDate: string;
    endDate: string;
  };
  user: {
    firstName: string;
    lastName: string;
    email?: string;
  };
}

// Shared number formatter
const formatNumber = new Intl.NumberFormat('en-US', {
  style: 'decimal',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const generateInvoiceHTML = (order: OrderData, isProforma: boolean = false): string => {
  const documentType = isProforma ? 'PROFORMA INVOICE' : 'INVOICE';
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${documentType}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: white; color: #333; }
        .header { text-align: center; margin-bottom: 30px; border-bottom:2px solid #007AFF; padding-bottom: 20px; }
        .logo { font-size: 32px; font-weight: bold; color: #007AFF; margin-bottom: 10px; letter-spacing: 2px; }
        .document-type { font-size: 24px; color: #666; margin-bottom: 10px; }
        .invoice-info { display: flex; justify-content: space-between; margin-bottom: 30px; }
        .customer-info, .invoice-details { flex: 1; }
        .customer-info h3, .invoice-details h3 { color: #007AFF; margin-bottom: 10px; }
        .customer-info p, .invoice-details p { margin: 5px 0; font-size: 14px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background-color: #f8f9fa; font-weight: bold; color: #333; }
        .totals { margin-left: auto; width: 300px; }
        .total-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
        .total-row.final { font-weight: bold; font-size: 18px; border-bottom:2px solid #007AFF; color: #007AFF; }
        .footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">SNAP</div>
        <div class="document-type">${documentType}</div>
      </div>
      <div class="invoice-info">
        <div class="customer-info">
          <h3>Bill To:</h3>
          <p><strong>${order.customerName}</strong></p>
          <p>${order.customerEmail}</p>
          <p>${order.customerPhone}</p>
        </div>
        <div class="invoice-details">
          <h3>Invoice Details:</h3>
          <p><strong>Invoice #:</strong> ${order.id}</p>
          <p><strong>Date:</strong> ${order.date}</p>
          <p><strong>Status:</strong> ${order.status}</p>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>Quantity</th>
            <th>Price</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${order.items.map(item => `
            <tr>
              <td>${item.name}</td>
              <td>${item.quantity}</td>
              <td>$${formatNumber.format(item.price)}</td>
              <td>$${formatNumber.format(item.total)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="totals">
        <div class="total-row">
          <span>Subtotal:</span>
          <span>$${formatNumber.format(order.subtotal)}</span>
        </div>
        <div class="total-row">
          <span>Tax:</span>
          <span>$${formatNumber.format(order.tax)}</span>
        </div>
        <div class="total-row">
          <span>Discount:</span>
          <span>-$${formatNumber.format(order.discount)}</span>
        </div>
        <div class="total-row">
          <span>Shipping:</span>
          <span>$${formatNumber.format(order.shipping)}</span>
        </div>
        <div class="total-row final">
          <span>Total:</span>
          <span>$${formatNumber.format(order.total)}</span>
        </div>
      </div>
      <div class="footer">
        <p>Thank you for your business!</p>
        <p>SNAP E-commerce</p>
      </div>
    </body>
    </html>
  `;
};

// Helpers for currency formatting and precise arithmetic
const currencySymbolMap: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', JPY: '¥', CAD: 'C$', AUD: 'A$', CHF: 'CHF',
  CNY: '¥', INR: '₹', BRL: 'R$', MXN: '$', KRW: '₩', SGD: 'S$', HKD: 'HK$', NZD: 'NZ$',
  GMD: 'D'
};

const getCurrencySymbol = (code?: string): string => currencySymbolMap[code || ''] || (code || '$');

const toCents = (value: any): number => {
  const n = typeof value === 'number' ? value : parseFloat(String(value || 0));
  return Math.round(n * 100);
};

const fromCents = (cents: number): number => cents / 100;

const formatMoney = (amount: number, code?: string): string => {
  const symbol = getCurrencySymbol(code);
  return `${symbol}${formatNumber.format(amount)}`;
};

// Proportionally allocate an amount (in cents) across rows (in cents)
const allocateProportionally = (rows: number[], totalToAllocate: number): number[] => {
  const sum = rows.reduce((a, b) => a + b, 0);
  if (sum === 0 || totalToAllocate === 0) return rows.map(() => 0);
  const rawShares = rows.map(v => (v / sum) * totalToAllocate);
  // Round and fix rounding error to ensure exact sum
  const rounded = rawShares.map(v => Math.floor(v));
  let remainder = totalToAllocate - rounded.reduce((a, b) => a + b, 0);
  // Distribute remaining cents to the largest fractional parts
  const fractions = rawShares.map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);
  for (let k = 0; k < remainder; k++) {
    rounded[fractions[k % fractions.length].i] += 1;
  }
  return rounded;
};

const generateReportHTML = (exportData: ExportData): string => {
  const { type, data, dateRange, user } = exportData;
  const reportType = type === 'orders' ? 'Orders Invoice Report' : 'Interests Report';
  const userName = `${user.firstName} ${user.lastName}`.trim();
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${reportType}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: white; color: #333; }
        .header { text-align: center; margin-bottom: 24px; border-bottom:2px solid #007AFF; padding-bottom: 16px; }
        .logo { font-size: 28px; font-weight: bold; color: #007AFF; margin-bottom: 6px; letter-spacing: 1.5px; }
        .report-title { font-size: 20px; color: #666; margin-bottom: 6px; }
        .report-info { margin-bottom: 16px; font-size: 12px; }
        .report-info p { margin: 3px 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; margin-bottom: 8px; }
        th, td { border: 1px solid #e5e7eb; padding: 8px 10px; text-align: left; font-size: 12px; }
        th { background-color: #f8f9fa; font-weight: 600; color: #111827; }
        .order-block { margin-bottom: 24px; page-break-inside: avoid; break-inside: avoid; }
        .order-block:not(:first-child) { margin-top: 40px; }
        .order-header { display: flex; justify-content: space-between; align-items: baseline; }
        .order-title { font-size: 16px; font-weight: 600; color: #111827; }
        .order-meta { color: #6b7280; font-size: 12px; }
        .totals { margin-left: auto; width: 300px; }
        .total-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #eee; font-size: 12px; }
        .total-row.final { font-weight: 700; font-size: 14px; border-bottom:2px solid #007AFF; color: #007AFF; }
        .footer { margin-top: 24px; text-align: center; color: #666; font-size: 11px; }
        thead { display: table-header-group; }
        tfoot { display: table-footer-group; }
        tr { page-break-inside: avoid; break-inside: avoid; }
        @media print {
          .order-block { page-break-inside: avoid; break-inside: avoid; }
          .order-block:not(:first-child) { margin-top: 40px; }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">SNAP</div>
        <div class="report-title">${reportType}</div>
      </div>
      
      <div class="report-info">
        <p><strong>Generated by:</strong> ${userName}</p>
        <p><strong>Date Range:</strong> ${new Date(dateRange.startDate).toLocaleDateString()} - ${new Date(dateRange.endDate).toLocaleDateString()}</p>
        <p><strong>Generated on:</strong> ${new Date().toLocaleDateString()}</p>
        <p><strong>Total Orders:</strong> ${data.length}</p>
      </div>
      ${type !== 'orders' ? `
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Date</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${data.map((item: any) => {
              const totalAmount = item.amount || item.totalAmount || item.price || 0;
              const formattedAmount = typeof totalAmount === 'number' ? formatMoney(totalAmount, item.currencyCode || 'USD') : formatMoney(0, 'USD');
              return `
                <tr>
                  <td>${item.product?.title || item.title || 'N/A'}</td>
                  <td>${item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A'}</td>
                  <td>${formattedAmount}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      ` : `
        ${data.map((order: any) => {
          const currency = order.currencyCode || 'USD';
          const items = Array.isArray(order.items) ? order.items : [];
          const unitSubtotalsCents = items.map((it: any) => toCents((typeof it.unitPrice === 'number' ? it.unitPrice : parseFloat(String(it.unitPrice || 0))) * (it.quantity || 0)));
          const subtotalCents = unitSubtotalsCents.reduce((a: number, b: number) => a + b, 0);
          let discountCents = toCents(order.discountAmount ?? 0);
          const shippingCents = toCents(order.shippingAmount || 0);
          // Fallback: infer discount if backend did not send it
          if (discountCents === 0 && (order.totalAmount != null)) {
            const backendTotalCents = toCents(order.totalAmount);
            const computedNoDiscountCents = subtotalCents + shippingCents;
            const inferred = Math.max(0, computedNoDiscountCents - backendTotalCents);
            if (inferred > 0) discountCents = inferred;
          }
          const allocatedDiscounts = allocateProportionally(unitSubtotalsCents, discountCents);
          const lineTotalsCents = unitSubtotalsCents.map((c, i) => Math.max(0, c - allocatedDiscounts[i]));
          const computedTotalCents = lineTotalsCents.reduce((a, b) => a + b, 0) + shippingCents;
          const displayedTotalCents = toCents(order.totalAmount || fromCents(computedTotalCents));

          return `
            <div class="order-block">
              <div class="order-header">
                <div class="order-title">Invoice #${order.orderNumber || order.id || ''}</div>
                <div class="order-meta">
                  ${order.createdAt ? new Date(order.createdAt).toLocaleDateString() : ''}
                  • ${order.status || ''}
                </div>
              </div>
              <div class="order-meta">
                ${order.customer?.name ? `Bill To: <strong>${order.customer.name}</strong>` : ''}
              </div>
              <table>
                <thead>
                  <tr>
                    <th style="width:12%">Qty</th>
                    <th>Product</th>
                    <th style="width:18%">Unit Price</th>
                    <th style="width:18%">Discount</th>
                    <th style="width:18%">Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${items.map((it: any, idx: number) => {
                    const qty = it.quantity || 0;
                    const unit = typeof it.unitPrice === 'number' ? it.unitPrice : parseFloat(String(it.unitPrice || 0));
                    const lineDiscount = fromCents(allocatedDiscounts[idx] || 0);
                    const lineTotal = fromCents(lineTotalsCents[idx] || 0);
                    return `
                      <tr>
                        <td>${qty}</td>
                        <td>${it.product?.title || it.product?.name || 'Item'}</td>
                        <td>${formatMoney(unit, currency)}</td>
                        <td>${lineDiscount > 0 ? '-' + formatMoney(lineDiscount, currency) : formatMoney(0, currency)}</td>
                        <td>${formatMoney(lineTotal, currency)}</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
              <div class="totals">
                <div class="total-row">
                  <span>Subtotal:</span>
                  <span>${formatMoney(fromCents(subtotalCents), currency)}</span>
                </div>
                <div class="total-row">
                  <span>Discount:</span>
                  <span>-${formatMoney(fromCents(discountCents), currency)}</span>
                </div>
                <div class="total-row">
                  <span>Shipping:</span>
                  <span>${formatMoney(fromCents(shippingCents), currency)}</span>
                </div>
                <div class="total-row final">
                  <span>Total:</span>
                  <span>${formatMoney(fromCents(displayedTotalCents), currency)}</span>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      `}
      
      <div class="footer">
        <p>Generated by SNAP E-commerce</p>
        <p>${new Date().toLocaleString()}</p>
      </div>
    </body>
    </html>
  `;
};

export const generateInvoicePDF = async (order: OrderData): Promise<string> => {
  const html = generateInvoiceHTML(order, false);
  const { uri } = await Print.printToFileAsync({ html });
  return uri;
};

export const generateProformaPDF = async (order: OrderData): Promise<string> => {
  const html = generateInvoiceHTML(order, true);
  const { uri } = await Print.printToFileAsync({ html });
  return uri;
};

export const generateAndSharePDF = async (exportData: ExportData): Promise<void> => {
  try {
    const html = generateReportHTML(exportData);
    const { uri } = await Print.printToFileAsync({ html });
    
    const filename = `${exportData.type}_report_${new Date().toISOString().split('T')[0]}.pdf`;
    
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Share ${filename}`,
        UTI: 'com.adobe.pdf',
      });
    } else {
      throw new Error('Sharing is not available on this device');
    }
  } catch (error) {
    console.error('Error generating and sharing PDF:', error);
    throw error;
  }
};

export const sharePDF = async (pdfUri: string, filename: string): Promise<void> => {
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(pdfUri, {
      mimeType: 'application/pdf',
      dialogTitle: `Share ${filename}`,
      UTI: 'com.adobe.pdf',
    });
  } else {
    throw new Error('Sharing is not available on this device');
  }
};

export const savePDFToDevice = async (pdfUri: string, filename: string): Promise<string> => {
  const documentsDir = FileSystem.documentDirectory;
  if (!documentsDir) throw new Error('Documents directory not available');
  const destinationUri = `${documentsDir}${filename}`;
  await FileSystem.copyAsync({ from: pdfUri, to: destinationUri });
  return destinationUri;
}; 