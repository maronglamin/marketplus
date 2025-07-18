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
              <td>$${item.price.toFixed(2)}</td>
              <td>$${item.total.toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="totals">
        <div class="total-row">
          <span>Subtotal:</span>
          <span>$${order.subtotal.toFixed(2)}</span>
        </div>
        <div class="total-row">
          <span>Tax:</span>
          <span>$${order.tax.toFixed(2)}</span>
        </div>
        <div class="total-row">
          <span>Discount:</span>
          <span>-$${order.discount.toFixed(2)}</span>
        </div>
        <div class="total-row">
          <span>Shipping:</span>
          <span>$${order.shipping.toFixed(2)}</span>
        </div>
        <div class="total-row final">
          <span>Total:</span>
          <span>$${order.total.toFixed(2)}</span>
        </div>
      </div>
      <div class="footer">
        <p>Thank you for your business!</p>
        <p>SNAP Marketplace</p>
      </div>
    </body>
    </html>
  `;
};

const generateReportHTML = (exportData: ExportData): string => {
  const { type, data, dateRange, user } = exportData;
  const reportType = type === 'orders' ? 'Orders Report' : 'Interests Report';
  const userName = `${user.firstName} ${user.lastName}`.trim();
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${reportType}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: white; color: #333; }
        .header { text-align: center; margin-bottom: 30px; border-bottom:2px solid #007AFF; padding-bottom: 20px; }
        .logo { font-size: 32px; font-weight: bold; color: #007AFF; margin-bottom: 10px; letter-spacing: 2px; }
        .report-title { font-size: 24px; color: #666; margin-bottom: 10px; }
        .report-info { margin-bottom: 30px; }
        .report-info p { margin: 5px 0; font-size: 14px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background-color: #f8f9fa; font-weight: bold; color: #333; }
        .summary { margin-top: 30px; padding: 20px; background-color: #f8f9fa; border-radius: 8px; }
        .summary h3 { color: #007AFF; margin-bottom: 10px; }
        .footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; }
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
        <p><strong>Total Records:</strong> ${data.length}</p>
      </div>
      
      <table>
        <thead>
          <tr>
            ${type === 'orders' ? `
              <th>Order #</th>
              <th>Date</th>
              <th>Customer</th>
              <th>Status</th>
              <th>Total</th>
            ` : `
              <th>Product</th>
              <th>Date</th>
              <th>Customer</th>
              <th>Amount</th>
            `}
          </tr>
        </thead>
        <tbody>
          ${data.map(item => {
            const totalAmount = item.totalAmount || item.amount || 0;
            const formattedAmount = typeof totalAmount === 'number' ? totalAmount.toFixed(2) : '0.00';
            
            return `
              <tr>
                ${type === 'orders' ? `
                  <td>${item.orderNumber || item.id || 'N/A'}</td>
                  <td>${item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A'}</td>
                  <td>${item.customer?.name || 'N/A'}</td>
                  <td>${item.status || 'N/A'}</td>
                  <td>$${formattedAmount}</td>
                ` : `
                  <td>${item.product?.title || 'N/A'}</td>
                  <td>${item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A'}</td>
                  <td>${item.customer?.name || 'N/A'}</td>
                  <td>$${formattedAmount}</td>
                `}
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
      
      <div class="summary">
        <h3>Summary</h3>
        <p><strong>Total Records:</strong> ${data.length}</p>
        <p><strong>Date Range:</strong> ${new Date(dateRange.startDate).toLocaleDateString()} - ${new Date(dateRange.endDate).toLocaleDateString()}</p>
        <p><strong>Generated by:</strong> ${userName}</p>
      </div>
      
      <div class="footer">
        <p>Generated by SNAP Marketplace</p>
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