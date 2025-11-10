// src/services/printService.js
import RNPrint from 'react-native-print';
import { formatCurrency, toEnglishNumbers, getCurrentDate, getCurrentTime } from '../utils/formatters';

export const printInvoice = async (invoice) => {
  try {
    const remaining = (invoice.total || 0) + (invoice.previousBalance || 0) - (invoice.payment || 0);
    const totalWithPrevious = (invoice.total || 0) + (invoice.previousBalance || 0);
    
    const currentTime = getCurrentTime();
    const invoiceDate = toEnglishNumbers(invoice.date);

    // بناء HTML للطباعة - تصميم أبيض وأسود احترافي
    const html = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>فاتورة - ${invoice.customer}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
          
          @page {
            size: A4;
            margin: 3mm 7mm;
          }
          
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Cairo', 'Tajawal', 'Arial', sans-serif;
            direction: rtl;
            font-size: 11.5pt;
            line-height: 1.35;
            color: #000;
            background: white;
          }
          
          .header {
            background: #fff;
            border: 2px solid #000;
            border-radius: 12px;
            padding: 10px 15px;
            margin-bottom: 10px;
            position: relative;
          }
          
          .header-top {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-bottom: 10px;
            border-bottom: 2px solid #ccc;
            margin-bottom: 10px;
          }
          
          .logo-section {
            display: flex;
            align-items: center;
            gap: 15px;
          }
          
          .logo-badge {
            width: 55px;
            height: 55px;
            background: #000;
            border: 3px solid #000;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 22pt;
            font-weight: 800;
            color: #fff;
            letter-spacing: 2px;
          }
          
          .store-info h1 {
            font-size: 22pt;
            font-weight: 800;
            color: #000;
            margin-bottom: 2px;
          }
          
          .store-subtitle {
            font-size: 9pt;
            color: #333;
            font-weight: 600;
          }
          
          .invoice-id-badge {
            background: #eee;
            border: 2px solid #000;
            border-radius: 8px;
            padding: 4px 8px;
            font-weight: 600;
            font-size: 10pt;
            text-align: center;
            color: #000;
          }
          
          .contact-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 5px;
            margin-bottom: 8px;
          }
          
          .contact-item {
            padding: 6px 10px;
            display: flex;
            align-items: center;
            gap: 8px;
            background: #fff;
            border-radius: 8px;
            border: 2px solid #000;
          }
          
          .contact-icon {
            background: #000;
            color: #fff;
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 11pt;
            flex-shrink: 0;
            border-radius: 8px;
          }
          
          .contact-name {
            font-weight: 700;
            font-size: 10pt;
            margin-bottom: 0;
            color: #000;
          }
          
          .contact-number {
            font-weight: 600;
            font-size: 10pt;
            direction: ltr;
            text-align: right;
            color: #000;
          }
          
          .address-section {
            padding: 8px 12px;
            text-align: center;
            background: #fff;
            border-radius: 8px;
            border: 2px solid #000;
          }
          
          .address-label {
            font-size: 9pt;
            font-weight: 700;
            margin-bottom: 2px;
            color: #000;
          }
          
          .address-text {
            font-size: 11pt;
            font-weight: 600;
            color: #000;
          }
          
          .invoice-info {
            display: grid;
            grid-template-columns: 2fr 1fr 1fr;
            gap: 8px;
            padding: 6px 8px;
            font-size: 11pt;
            border: 1.5px solid #000;
            border-radius: 8px;
            margin-bottom: 8px;
            align-items: center;
            background: #f8f9fa;
          }
          
          .info-item .label {
            font-weight: 700;
            color: #000;
          }
          
          .info-item .value {
            font-weight: 600;
            color: #000;
          }
          
          .items-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9.5pt;
            border-radius: 8px;
            overflow: hidden;
          }
          
          .items-table th,
          .items-table td {
            border: 1.5px solid #000;
            padding: 4px;
            text-align: center;
            font-weight: 600;
          }
          
          .items-table th {
            font-weight: 700;
            padding: 5px;
            color: #000;
            background: #fff;
            border: 2px solid #000;
            border-bottom-width: 2px;
          }
          
          .items-table .item-name {
            text-align: right;
            padding-right: 8px;
            font-weight: 600;
            font-size: 11pt;
            color: #000;
          }
          
          .items-table tbody tr:nth-child(even) {
            background: #f8f9fa;
          }
          
          .items-table tbody tr:hover {
            background: #f0f0f0;
          }
          
          .summary-section {
            padding-top: 8px;
            margin-top: 0;
            border-top: 3px solid #000;
          }
          
          .summary-table {
            width: 100%;
            max-width: 450px;
            margin-left: auto;
            font-size: 12pt;
            border-collapse: collapse;
          }
          
          .summary-table td {
            padding: 6px 10px;
          }
          
          .summary-table .label {
            font-weight: 700;
            text-align: right;
            width: 50%;
            color: #000;
          }
          
          .summary-table .value {
            text-align: right;
            font-weight: 700;
            color: #000;
          }
          
          .summary-table .total-due-row td {
            font-weight: 800;
            border-top: 2px solid #000;
            border-bottom: 2px solid #000;
            background: #eee;
            color: #000;
            padding: 7px 10px;
          }
          
          .summary-table .final-row {
            background: #fff;
            border: 2px solid #000;
          }
          
          .summary-table .final-row td {
            font-weight: 800;
            font-size: 14pt;
            padding: 8px 10px;
            color: #000;
            border: 2px solid #000;
          }
          
          @media print {
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
        </style>
      </head>
      <body>
        <header class="header">
          <div class="header-top">
            <div class="logo-section">
              <div class="logo-badge">JN</div>
              <div class="store-info">
                <h1>محلات ابو جعفر الرديني</h1>
                <div class="store-subtitle">للمواد الغذائية والحلويات</div>
              </div>
            </div>
            <div class="invoice-id-badge">
              رقم الفاتورة: ${toEnglishNumbers(invoice.id)}
            </div>
          </div>
          
          <div class="contact-grid">
            <div class="contact-item">
              <div class="contact-icon">ج</div>
              <div>
                <div class="contact-name">جعفر</div>
                <div class="contact-number">07731103122 | 07800379300</div>
              </div>
            </div>
            <div class="contact-item">
              <div class="contact-icon">ح</div>
              <div>
                <div class="contact-name">حسن</div>
                <div class="contact-number">07826342265</div>
              </div>
            </div>
          </div>
          
          <div class="address-section">
            <div class="address-label">📍 العنوان</div>
            <div class="address-text">بلدروز - مقابل مطعم - بغداد - داخل القيصرية</div>
          </div>
        </header>
        
        <section class="invoice-info">
          <div class="info-item">
            <span class="label">الزبون:</span>
            <span class="value">${invoice.customer}</span>
          </div>
          <div class="info-item">
            <span class="label">التاريخ:</span>
            <span class="value">${invoiceDate}</span>
          </div>
          <div class="info-item">
            <span class="label">الوقت:</span>
            <span class="value">${currentTime}</span>
          </div>
        </section>
        
        <main>
          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 5%;">#</th>
                <th style="width: 40%;">اسم المنتج</th>
                <th style="width: 10%;">الكمية</th>
                <th style="width: 15%;">السعر</th>
                <th style="width: 15%;">المبلغ</th>
                <th style="width: 15%;">الملاحظات</th>
              </tr>
            </thead>
            <tbody>
              ${invoice.items.map((item, idx) => `
                <tr>
                  <td>${toEnglishNumbers(idx + 1)}</td>
                  <td class="item-name">${item.product}</td>
                  <td>${toEnglishNumbers(item.quantity)}</td>
                  <td>${formatCurrency(item.price)}</td>
                  <td>${formatCurrency(item.total)}</td>
                  <td>${item.notes || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <section class="summary-section">
            <table class="summary-table">
              <tr>
                <td class="label">مجموع الفاتورة:</td>
                <td class="value">${formatCurrency(invoice.total || 0)} دينار</td>
              </tr>
              <tr>
                <td class="label">الحساب السابق:</td>
                <td class="value">${formatCurrency(invoice.previousBalance || 0)} دينار</td>
              </tr>
              <tr class="total-due-row">
                <td class="label">المجموع الكلي:</td>
                <td class="value">${formatCurrency(totalWithPrevious)} دينار</td>
              </tr>
              <tr>
                <td class="label">المبلغ الواصل:</td>
                <td class="value">${formatCurrency(invoice.payment || 0)} دينار</td>
              </tr>
              <tr class="final-row">
                <td class="label">المبلغ المتبقي:</td>
                <td class="value">${formatCurrency(remaining)} دينار</td>
              </tr>
            </table>
          </section>
        </main>
      </body>
      </html>
    `;

    // طباعة الفاتورة
    await RNPrint.print({
      html: html,
      printerName: undefined,
    });

    return { success: true };
  } catch (error) {
    console.error('Print Error:', error);
    return { success: false, error: error.message };
  }
};

// طباعة كشف حساب زبون
export const printCustomerStatement = async (customerName, invoices) => {
  try {
    if (!invoices || invoices.length === 0) {
      throw new Error('لا توجد فواتير لهذا الزبون');
    }

    // ترتيب الفواتير حسب التاريخ
    const sortedInvoices = [...invoices].sort((a, b) => a.id - b.id);
    
    const latestInvoice = sortedInvoices[sortedInvoices.length - 1];
    const finalRemaining = (latestInvoice.total || 0) + 
      (latestInvoice.previousBalance || 0) - 
      (latestInvoice.payment || 0);

    const currentTime = getCurrentTime();
    const currentDateStr = toEnglishNumbers(getCurrentDate());

    const html = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>كشف حساب - ${customerName}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
          
          @page {
            size: A4;
            margin: 10mm;
          }
          
          body {
            font-family: 'Cairo', sans-serif;
            direction: rtl;
          }
          
          h1, h2 {
            text-align: center;
            color: #0d9488;
          }
          
          h1 {
            font-size: 20pt;
          }
          
          h2 {
            font-size: 16pt;
            margin-bottom: 15px;
          }
          
          p {
            text-align: center;
            font-size: 12pt;
            margin-bottom: 20px;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11pt;
            margin-top: 15px;
          }
          
          th, td {
            border: 1px solid #ccc;
            padding: 8px;
            text-align: center;
          }
          
          th {
            background-color: #f0f4ff;
            color: #0d9488;
            font-weight: 700;
          }
          
          .final-summary {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 2px solid #0d9488;
            text-align: center;
            font-size: 1.5rem;
            font-weight: bold;
          }
          
          .final-summary .label {
            color: #2c3e50;
          }
          
          .final-summary .value {
            color: ${finalRemaining > 0 ? '#ef4444' : '#22c55e'};
          }
          
          @media print {
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
        </style>
      </head>
      <body>
        <h1>محلات ابو جعفر الرديني</h1>
        <h2>كشف حساب زبون</h2>
        <p>
          <strong>الزبون:</strong> ${customerName}<br>
          <strong>تاريخ الكشف:</strong> ${currentDateStr} | ${currentTime}
        </p>
        
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>التاريخ</th>
              <th>إجمالي الفاتورة</th>
              <th>الحساب السابق</th>
              <th>المبلغ الواصل</th>
              <th>المتبقي</th>
            </tr>
          </thead>
          <tbody>
            ${sortedInvoices.map(inv => {
              const remaining = (inv.total || 0) + (inv.previousBalance || 0) - (inv.payment || 0);
              return `
                <tr>
                  <td>${toEnglishNumbers(inv.id)}</td>
                  <td>${toEnglishNumbers(inv.date)}</td>
                  <td>${formatCurrency(inv.total || 0)}</td>
                  <td>${formatCurrency(inv.previousBalance || 0)}</td>
                  <td>${formatCurrency(inv.payment || 0)}</td>
                  <td style="font-weight: bold; color: ${remaining > 0 ? '#ef4444' : remaining == 0 ? '#6b7280' : '#22c55e'};">
                    ${formatCurrency(remaining)}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
        
        <div class="final-summary">
          <span class="label">الرصيد النهائي المتبقي: </span>
          <span class="value">${formatCurrency(finalRemaining)} دينار</span>
        </div>
      </body>
      </html>
    `;

    await RNPrint.print({
      html: html,
      printerName: undefined,
    });

    return { success: true };
  } catch (error) {
    console.error('Print Customer Statement Error:', error);
    return { success: false, error: error.message };
  }
};

export default {
  printInvoice,
  printCustomerStatement,
};
