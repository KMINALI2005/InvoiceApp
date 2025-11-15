import AsyncStorage from '@react-native-async-storage/async-storage';
import RNPrint from 'react-native-print';
import Share from 'react-native-share';
import { Alert, Platform } from 'react-native'; // Added Platform for potential future use
import { formatCurrency, toEnglishNumbers, getCurrentDate, getCurrentTime } from '../utils/formatters';

/**
 * دالة مساعدة لتوليد كود HTML للفاتورة.
 */
const _generateInvoiceHtml = async (invoice) => {
  // تحميل القالب المخصص
  let template = {
    shopName: 'محل استاذ خالد كوزمتك',
    shopSubtitle: 'لبيع العطور بادراة عبدالله علي',
    phone1: '07707750781',
    phone1Label: 'عبدالله',
    phone2: '07905077130',
    phone2Label: 'استاذ خالد',
    address: 'بلدروز - مقابل مطعم - بغداد - داخل القيصرية',
    logoUri: '',
  };

  try {
    const savedTemplate = await AsyncStorage.getItem('invoiceTemplate');
    if (savedTemplate) {
      template = { ...template, ...JSON.parse(savedTemplate) };
    }
  } catch (error) {
    console.log('Error loading template:', error);
  }

  const remaining = (invoice.total || 0) + (invoice.previousBalance || 0) - (invoice.payment || 0);
  const totalWithPrevious = (invoice.total || 0) + (invoice.previousBalance || 0);
  
  const currentTime = getCurrentTime();
  const invoiceDate = toEnglishNumbers(invoice.date);

  // إنشاء HTML للشعار إذا كان موجوداً
  const logoHtml = template.logoUri 
    ? `<img src="${template.logoUri}" alt="Logo" style="width: 50px; height: 50px; object-fit: contain;" />`
    : `<div class="logo-modern">JR</div>`;

  return `
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
          font-size: 12pt;
          line-height: 1.3;
          color: #000;
          background: white;
        }
        
        .header {
          border: 2.5px solid #000;
          border-radius: 10px;
          padding: 8px 12px;
          margin-bottom: 10px;
          background: #fff;
        }
        
        .header-main {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 8px;
          border-bottom: 2px solid #000;
          margin-bottom: 8px;
        }
        
        .brand-section {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .logo-modern {
          width: 50px;
          height: 50px;
          background: #fff;
          color: #000;
          border: 2.5px solid #000;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20pt;
          font-weight: 800;
          letter-spacing: 1px;
          flex-shrink: 0;
        }
        
        .company-name {
          flex: 1;
        }
        
        .company-name h1 {
          font-size: 20pt;
          font-weight: 800;
          color: #000;
          margin-bottom: 2px;
          line-height: 1.1;
        }
        
        .company-subtitle {
          font-size: 9pt;
          color: #333;
          font-weight: 600;
        }
        
        .invoice-badge {
          background: #fff;
          color: #000;
          border: 2px solid #000;
          padding: 6px 12px;
          font-weight: 700;
          font-size: 11pt;
          text-align: center;
          white-space: nowrap;
        }
        
        .contacts-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          margin-bottom: 6px;
        }
        
        .contact-card {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 5px 10px;
          background: #f8f8f8;
          border: 1.5px solid #000;
          border-radius: 8px;
        }
        
        .contact-icon {
          width: 26px;
          height: 26px;
          background: #fff;
          color: #000;
          border: 1.5px solid #000;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 10pt;
          flex-shrink: 0;
        }
        
        .contact-info {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        
        .contact-label {
          font-weight: 700;
          font-size: 10pt;
          color: #000;
        }
        
        .contact-number {
          font-weight: 600;
          font-size: 9.5pt;
          direction: ltr;
          color: #000;
        }
        
        .address-bar {
          padding: 5px 10px;
          text-align: center;
          background: #f8f8f8;
          border: 1.5px solid #000;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        
        .address-icon {
          font-weight: 700;
          font-size: 11pt;
        }
        
        .address-text {
          font-size: 10pt;
          font-weight: 600;
          color: #000;
        }
        
        .invoice-info {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr;
          gap: 6px;
          padding: 5px 8px;
          font-size: 10.5pt;
          border: 1.5px solid #000;
          border-radius: 8px;
          margin-bottom: 8px;
          align-items: center;
          background: #f8f8f8;
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
          font-size: 10pt;
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
          padding: 4px;
          color: #000;
          background: #f0f0f0;
          border: 2px solid #000;
        }
        
        .items-table .item-name {
          text-align: right;
          padding-right: 8px;
          font-weight: 600;
          font-size: 10.5pt;
          color: #000;
        }
        
        .items-table tbody tr:nth-child(even) {
          background: #f8f8f8;
        }
        
        .summary-section {
          padding-top: 8px;
          margin-top: 8px;
          border-top: 2.5px solid #000;
          page-break-inside: avoid;
        }
        
        .summary-grid {
          display: flex;
          justify-content: space-between;
          align-items: stretch;
          gap: 5px;
          flex-wrap: wrap;
        }
        
        .summary-item {
          flex: 1 1 140px;
          border: 1.5px solid #000;
          border-radius: 6px;
          padding: 4px 8px;
          background: #fff;
          display: flex;
          flex-direction: row;
          justify-content: flex-start;
          align-items: center;
          min-height: 32px;
        }
        
        .summary-item .label {
          font-weight: 700;
          font-size: 10.5pt;
          color: #000;
          margin-left: 6px;
          white-space: nowrap;
        }
        
        .summary-item .value {
          font-weight: 700;
          font-size: 12pt;
          color: #000;
          white-space: nowrap;
        }
        
        .summary-item.total-due-item {
          background: #f0f0f0;
          border-width: 2px;
        }
        
        .total-due-item .value {
          font-weight: 800;
          font-size: 12pt;
        }
        
        .summary-item.final-item {
          background: #fff;
          border-width: 2.5px;
        }
        
        .final-item .label {
          font-weight: 800;
          font-size: 10.5pt;
          color: #000;
        }
        
        .final-item .value {
          font-weight: 800;
          font-size: 13pt;
          color: #000;
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
        <div class="header-main">
          <div class="brand-section">
            ${logoHtml}
            <div class="company-name">
              <h1>${template.shopName}</h1>
              <div class="company-subtitle">${template.shopSubtitle}</div>
            </div>
          </div>
          <div class="invoice-badge">
            فاتورة رقم ${toEnglishNumbers(invoice.id)}
          </div>
        </div>
        
        <div class="contacts-row">
          <div class="contact-card">
            <div class="contact-icon">📞</div>
            <div class="contact-info">
              <span class="contact-label">${template.phone1Label}:</span>
              <span class="contact-number">${template.phone1}</span>
            </div>
          </div>
          <div class="contact-card">
            <div class="contact-icon">📱</div>
            <div class="contact-info">
              <span class="contact-label">${template.phone2Label}:</span>
              <span class="contact-number">${template.phone2}</span>
            </div>
          </div>
        </div>
        
        <div class="address-bar">
          <span class="address-icon">📍</span>
          <span class="address-text">${template.address}</span>
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
          <div class="summary-grid">
            <div class="summary-item">
              <span class="label">مجموع الفاتورة:</span>
              <span class="value">${formatCurrency(invoice.total || 0)} د</span>
            </div>
            <div class="summary-item">
              <span class="label">الحساب السابق:</span>
              <span class="value">${formatCurrency(invoice.previousBalance || 0)} د</span>
            </div>
            <div class="summary-item total-due-item">
              <span class="label">المجموع الكلي:</span>
              <span class="value">${formatCurrency(totalWithPrevious)} د</span>
            </div>
            <div class="summary-item">
              <span class="label">المبلغ الواصل:</span>
              <span class="value">${formatCurrency(invoice.payment || 0)} د</span>
            </div>
            <div class="summary-item final-item">
              <span class="label">المبلغ المتبقي:</span>
              <span class="value">${formatCurrency(remaining)} د</span>
            </div>
          </div>
        </section>
      </main>
    </body>
    </html>
  `;
};

/**
 * دالة طباعة الفاتورة الأصلية (تم تعديلها لاستخدام _generateInvoiceHtml)
 */
export const printInvoice = async (invoice) => {
  const html = _generateInvoiceHtml(invoice);
  try {
    if (Platform.OS === 'android') {
      // للأندرويد - استخدام PrintManager المدمج
      const result = await RNPrint.print({
        html: html,
        printerName: undefined, // سيفتح نافذة اختيار الطابعة
      });
      return { success: !!result };
    } else {
      // للـ iOS
      await RNPrint.print({ html: html });
      return { success: true };
    }
  } catch (error) {
    console.error('Print Error:', error);
    Alert.alert('خطأ', 'فشلت عملية الطباعة');
    return { success: false, error: error.message };
  }
};

/**
 * طباعة محسّنة - تجربة أفضل للمستخدم
 */
export const printInvoiceEnhanced = async (invoice) => {
  try {
    const html = await _generateInvoiceHtml(invoice);

    // طباعة مباشرة بدون رسالة تأكيد
    await RNPrint.print({
      html: html,
    });

    return { success: true };
  } catch (error) {
    console.error('Print Error:', error);
    Alert.alert('خطأ', 'فشلت عملية الطباعة');
    return { success: false, error: error.message };
  }
};

/**
 * مشاركة الملف
 */
const shareFile = async (filePath) => {
  try {
    await Share.open({
      url: `file://${filePath}`,
      type: 'application/pdf',
      title: 'مشاركة الفاتورة',
    });
  } catch (error) {
    console.error('Share Error:', error);
  }
};

export const printCustomerStatement = async (customerName, invoices) => {
  try {
    if (!invoices || invoices.length === 0) {
      throw new Error('لا توجد فواتير لهذا الزبون');
    }

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
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
          
          @page {
            size: A4;
            margin: 10mm;
          }
          
          body {
            font-family: 'Cairo', sans-serif;
            direction: rtl;
            color: #000;
          }
          
          .header {
            text-align: center;
            border-bottom: 3px solid #000;
            padding-bottom: 15px;
            margin-bottom: 20px;
          }
          
          h1 {
            font-size: 22pt;
            font-weight: 800;
            margin-bottom: 5px;
            color: #000;
          }
          
          h2 {
            font-size: 16pt;
            font-weight: 700;
            margin-bottom: 15px;
            color: #000;
          }
          
          .info-box {
            background: #f8f8f8;
            border: 2px solid #000;
            border-radius: 8px;
            padding: 12px;
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
            border: 1.5px solid #000;
            padding: 8px;
            text-align: center;
          }
          
          th {
            background-color: #f0f0f0;
            color: #000;
            ffont-weight: 700;
            border: 2px solid #000;
          }
          
          tbody tr:nth-child(even) {
            background: #f8f8f8;
          }
          
          .final-summary {
            margin-top: 30px;
            padding: 15px;
            border: 3px solid #000;
            border-radius: 8px;
            text-align: center;
            font-size: 18pt;
            font-weight: 800;
            background: #f0f0f0;
          }
          
          .final-summary .label {
            color: #000;
          }
          
          .final-summary .value {
            color: ${finalRemaining > 0 ? '#000' : '#000'};
            text-decoration: ${finalRemaining > 0 ? 'underline' : 'none'};
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
        <div class="header">
          <h1>محل استاذ خالد كوزمتك</h1>
          <h2>كشف حساب زبون</h2>
        </div>
        
        <div class="info-box">
          <strong>الزبون:</strong> ${customerName} | 
          <strong>تاريخ الكشف:</strong> ${currentDateStr} | ${currentTime}
        </div>
        
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
                  <td style="font-weight: bold;">
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

    if (Platform.OS === 'android') {
      const result = await RNPrint.print({
        html: html,
        printerName: undefined,
      });
      return { success: !!result };
    } else {
      await RNPrint.print({ html: html });
      return { success: true };
    }
} catch (error) {
  console.error('Print Customer Statement Error:', error);
  return { success: false, error: error.message || 'فشلت عملية الطباعة' };
}
};
