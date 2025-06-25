import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

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

export class PDFExportService {
  static async generateAndSharePDF(exportData: ExportData): Promise<void> {
    try {
      const html = this.generateHTML(exportData);
      const { uri } = await Print.printToFileAsync({ html });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Export ${exportData.type}`,
        });
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw new Error('Failed to generate PDF');
    }
  }

  private static generateHTML(exportData: ExportData): string {
    const { type, data, dateRange, user } = exportData;
    const isOrders = type === 'orders';
    const title = isOrders ? 'Orders Report' : 'Interests Report';
    const documentType = isOrders ? 'Invoice' : 'Proforma';

    const totalAmount = data.reduce((sum, item) => {
      return sum + (isOrders ? item.totalAmount : item.totalAmount);
    }, 0);

    const currencyCode = data.length > 0 ? (isOrders ? data[0].currencyCode : data[0].currencyCode) : 'USD';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${title}</title>
          <style>
            body {
              font-family: 'Helvetica Neue', Arial, sans-serif;
              margin: 0;
              padding: 20px;
              color: #333;
              background-color: #fff;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #2563EB;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .company-name {
              font-size: 24px;
              font-weight: bold;
              color: #2563EB;
              margin-bottom: 5px;
            }
            .document-title {
              font-size: 18px;
              color: #666;
              margin-bottom: 10px;
            }
            .document-info {
              display: flex;
              justify-content: space-between;
              margin-bottom: 30px;
            }
            .info-section {
              flex: 1;
            }
            .info-section h3 {
              margin: 0 0 10px 0;
              color: #2563EB;
              font-size: 14px;
            }
            .info-section p {
              margin: 5px 0;
              font-size: 12px;
            }
            .date-range {
              background-color: #f8f9fa;
              padding: 15px;
              border-radius: 8px;
              margin-bottom: 20px;
            }
            .date-range h3 {
              margin: 0 0 10px 0;
              color: #2563EB;
              font-size: 14px;
            }
            .date-range p {
              margin: 5px 0;
              font-size: 12px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            th {
              background-color: #2563EB;
              color: white;
              padding: 12px 8px;
              text-align: left;
              font-size: 12px;
              font-weight: 600;
            }
            td {
              padding: 10px 8px;
              border-bottom: 1px solid #e5e7eb;
              font-size: 11px;
            }
            tr:nth-child(even) {
              background-color: #f9fafb;
            }
            .total-section {
              text-align: right;
              margin-top: 20px;
              padding-top: 20px;
              border-top: 2px solid #e5e7eb;
            }
            .total-amount {
              font-size: 18px;
              font-weight: bold;
              color: #2563EB;
            }
            .footer {
              margin-top: 40px;
              text-align: center;
              font-size: 10px;
              color: #666;
              border-top: 1px solid #e5e7eb;
              padding-top: 20px;
            }
            .status-badge {
              padding: 4px 8px;
              border-radius: 12px;
              font-size: 10px;
              font-weight: 600;
              text-transform: uppercase;
            }
            .status-pending { background-color: #FEF3C7; color: #D97706; }
            .status-confirmed { background-color: #DBEAFE; color: #2563EB; }
            .status-processing { background-color: #E9D5FF; color: #7C3AED; }
            .status-shipped { background-color: #D1FAE5; color: #059669; }
            .status-delivered { background-color: #D1FAE5; color: #047857; }
            .status-cancelled { background-color: #FEE2E2; color: #DC2626; }
            .status-refunded { background-color: #F3F4F6; color: #6B7280; }
            .status-accepted { background-color: #D1FAE5; color: #059669; }
            .status-negotiating { background-color: #FEF3C7; color: #D97706; }
            .status-rejected { background-color: #FEE2E2; color: #DC2626; }
            .status-expired { background-color: #F3F4F6; color: #6B7280; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">Marketplace</div>
            <div class="document-title">${title}</div>
            <div style="font-size: 12px; color: #666;">
              Generated on ${new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          </div>

          <div class="document-info">
            <div class="info-section">
              <h3>Customer Information</h3>
              <p><strong>Name:</strong> ${user.firstName} ${user.lastName}</p>
              ${user.email ? `<p><strong>Email:</strong> ${user.email}</p>` : ''}
            </div>
            <div class="info-section">
              <h3>Document Details</h3>
              <p><strong>Type:</strong> ${documentType}</p>
              <p><strong>Total Items:</strong> ${data.length}</p>
            </div>
          </div>

          <div class="date-range">
            <h3>Date Range</h3>
            <p><strong>From:</strong> ${new Date(dateRange.startDate).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}</p>
            <p><strong>To:</strong> ${new Date(dateRange.endDate).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}</p>
          </div>

          <table>
            <thead>
              <tr>
                ${isOrders ? `
                  <th>Order #</th>
                  <th>Product</th>
                  <th>Seller</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Date</th>
                ` : `
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Original Price</th>
                  <th>Total Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                `}
              </tr>
            </thead>
            <tbody>
              ${data.map(item => `
                <tr>
                  ${isOrders ? `
                    <td>${item.orderNumber}</td>
                    <td>${item.items.map((orderItem: any) => orderItem.product.title).join(', ')}</td>
                    <td>${item.items.map((orderItem: any) => orderItem.product.seller.name).join(', ')}</td>
                    <td>${item.items.reduce((sum: number, orderItem: any) => sum + orderItem.quantity, 0)}</td>
                    <td>${this.formatCurrency(item.items[0]?.unitPrice || 0, item.currencyCode)}</td>
                    <td>${this.formatCurrency(item.totalAmount, item.currencyCode)}</td>
                    <td><span class="status-badge status-${item.status.toLowerCase()}">${item.status}</span></td>
                    <td>${new Date(item.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}</td>
                  ` : `
                    <td>${item.product.title}</td>
                    <td>${item.quantity}</td>
                    <td>${this.formatCurrency(item.originalPrice, item.currencyCode)}</td>
                    <td>${this.formatCurrency(item.totalAmount, item.currencyCode)}</td>
                    <td><span class="status-badge status-${item.status.toLowerCase()}">${item.status}</span></td>
                    <td>${new Date(item.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}</td>
                  `}
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="total-section">
            <div class="total-amount">
              Total: ${this.formatCurrency(totalAmount, currencyCode)}
            </div>
          </div>

          <div class="footer">
            <p>This document was generated automatically by the Marketplace application.</p>
            <p>For any questions, please contact our support team.</p>
          </div>
        </body>
      </html>
    `;
  }

  private static formatCurrency(amount: number, currencyCode: string): string {
    const currencySymbols: { [key: string]: string } = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      JPY: '¥',
      CAD: 'C$',
    };
    const symbol = currencySymbols[currencyCode] || currencyCode;
    
    return `${symbol}${amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }
} 