// src/services/shareService.js
import Share from 'react-native-share';
import RNFS from 'react-native-fs';
import { formatCurrency, toEnglishNumbers, getCurrentDate, getCurrentTime } from '../utils/formatters';

// مشاركة فاتورة كنص
export const shareInvoiceText = async (invoice) => {
  try {
    const remaining = (invoice.total || 0) + (invoice.previousBalance || 0) - (invoice.payment || 0);
    
    let shareText = `📋 *فاتورة: ${invoice.customer}*\n`;
    shareText += `📅 التاريخ: ${toEnglishNumbers(invoice.date)}\n`;
    shareText += `🆔 رقم الفاتورة: ${toEnglishNumbers(invoice.id)}\n`;
    shareText += `────────────────────────────\n\n`;
    
    invoice.items.forEach((item, index) => {
      shareText += `${toEnglishNumbers(index + 1)}. ${item.product}\n`;
      shareText += `   الكمية: ${toEnglishNumbers(item.quantity)} × ${formatCurrency(item.price)}\n`;
      shareText += `   المجموع: ${formatCurrency(item.total)} دينار\n`;
      if (item.notes) {
        shareText += `   📝 ${item.notes}\n`;
      }
      shareText += `\n`;
    });
    
    shareText += `────────────────────────────\n`;
    shareText += `💰 مجموع الفاتورة: ${formatCurrency(invoice.total)} دينار\n`;
    shareText += `📊 الحساب السابق: ${formatCurrency(invoice.previousBalance)} دينار\n`;
    shareText += `💳 المبلغ الواصل: ${formatCurrency(invoice.payment)} دينار\n`;
    shareText += `⚠️ *المتبقي: ${formatCurrency(remaining)} دينار*\n\n`;
    shareText += `🏪 محلات ابو جعفر الرديني\nللمواد الغذائية والتموينية`;

    const shareOptions = {
      title: 'مشاركة الفاتورة',
      message: shareText,
      subject: `فاتورة ${invoice.customer} - ${toEnglishNumbers(invoice.id)}`,
    };

    await Share.open(shareOptions);
    return { success: true };
  } catch (error) {
    if (error.message !== 'User did not share') {
      console.error('Share Invoice Error:', error);
      return { success: false, error: error.message };
    }
    return { success: false, cancelled: true };
  }
};

// مشاركة كشف حساب زبون
export const shareCustomerStatement = async (customerName, invoices) => {
  try {
    if (!invoices || invoices.length === 0) {
      throw new Error('لا توجد فواتير لهذا الزبون');
    }

    const sortedInvoices = [...invoices].sort((a, b) => a.id - b.id);
    const latestInvoice = sortedInvoices[sortedInvoices.length - 1];
    const finalRemaining = (latestInvoice.total || 0) + 
      (latestInvoice.previousBalance || 0) - 
      (latestInvoice.payment || 0);

    const currentDateTime = {
      date: getCurrentDate(),
      time: getCurrentTime(),
    };

    let shareText = `📊 *كشف حساب زبون*\n`;
    shareText += `────────────────────────────\n`;
    shareText += `👤 الزبون: *${customerName}*\n`;
    shareText += `📋 عدد الفواتير: ${toEnglishNumbers(invoices.length)}\n`;
    shareText += `📅 آخر تحديث: ${toEnglishNumbers(currentDateTime.date)} ${currentDateTime.time}\n`;
    shareText += `────────────────────────────\n\n`;
    
    shareText += `📋 تفاصيل الفواتير:\n`;
    sortedInvoices.forEach((inv, idx) => {
      const remaining = (inv.total || 0) + (inv.previousBalance || 0) - (inv.payment || 0);
      shareText += `${toEnglishNumbers(idx + 1)}) فاتورة رقم ${toEnglishNumbers(inv.id)}\n`;
      shareText += `   📅 التاريخ: ${toEnglishNumbers(inv.date)}\n`;
      shareText += `   💰 المجموع: ${formatCurrency(inv.total || 0)}\n`;
      shareText += `   💵 الواصل: ${formatCurrency(inv.payment || 0)}\n`;
      shareText += `   ⚠️ المتبقي: ${formatCurrency(remaining)}\n\n`;
    });
    
    shareText += `────────────────────────────\n`;
    shareText += `📈 الملخص:\n`;
    const totalInvoicesAmount = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    shareText += `💰 إجمالي المبيعات: ${formatCurrency(totalInvoicesAmount)}\n`;
    shareText += `⚠️ *الرصيد النهائي: ${formatCurrency(finalRemaining)}*\n`;
    shareText += `────────────────────────────\n\n`;
    shareText += `🪙 محلات ابو جعفر الرديني\nللمواد الغذائية والتموينية`;

    const shareOptions = {
      title: 'مشاركة كشف الحساب',
      message: shareText,
      subject: `كشف حساب ${customerName}`,
    };

    await Share.open(shareOptions);
    return { success: true };
  } catch (error) {
    if (error.message !== 'User did not share') {
      console.error('Share Customer Statement Error:', error);
      return { success: false, error: error.message };
    }
    return { success: false, cancelled: true };
  }
};

// تصدير الفواتير كملف JSON
export const exportInvoicesJSON = async (invoices) => {
  try {
    const fileName = `invoices_backup_${getCurrentDate()}.json`;
    const filePath = `${RNFS.DownloadDirectoryPath}/${fileName}`;
    
    const data = {
      exportDate: new Date().toISOString(),
      invoicesCount: invoices.length,
      invoices: invoices,
    };

    await RNFS.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');

    const shareOptions = {
      title: 'تصدير الفواتير',
      message: `نسخة احتياطية للفواتير - ${toEnglishNumbers(invoices.length)} فاتورة`,
      url: `file://${filePath}`,
      type: 'application/json',
      subject: `نسخة احتياطية - ${fileName}`,
      filename: fileName,
    };

    await Share.open(shareOptions);
    return { success: true, filePath };
  } catch (error) {
    if (error.message !== 'User did not share') {
      console.error('Export Invoices JSON Error:', error);
      return { success: false, error: error.message };
    }
    return { success: false, cancelled: true };
  }
};

// تصدير المنتجات كملف JSON
export const exportProductsJSON = async (products) => {
  try {
    const fileName = `products_backup_${getCurrentDate()}.json`;
    const filePath = `${RNFS.DownloadDirectoryPath}/${fileName}`;
    
    const data = {
      exportDate: new Date().toISOString(),
      productsCount: products.length,
      products: products,
    };

    await RNFS.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');

    const shareOptions = {
      title: 'تصدير المنتجات',
      message: `نسخة احتياطية للمنتجات - ${toEnglishNumbers(products.length)} منتج`,
      url: `file://${filePath}`,
      type: 'application/json',
      subject: `نسخة احتياطية - ${fileName}`,
      filename: fileName,
    };

    await Share.open(shareOptions);
    return { success: true, filePath };
  } catch (error) {
    if (error.message !== 'User did not share') {
      console.error('Export Products JSON Error:', error);
      return { success: false, error: error.message };
    }
    return { success: false, cancelled: true };
  }
};

// استيراد بيانات من ملف JSON
export const importFromJSON = async (filePath) => {
  try {
    const fileContent = await RNFS.readFile(filePath, 'utf8');
    const data = JSON.parse(fileContent);
    
    // التحقق من صحة البيانات
    if (data.invoices && Array.isArray(data.invoices)) {
      return {
        success: true,
        type: 'invoices',
        data: data.invoices,
        count: data.invoices.length,
      };
    } else if (data.products && Array.isArray(data.products)) {
      return {
        success: true,
        type: 'products',
        data: data.products,
        count: data.products.length,
      };
    } else {
      throw new Error('صيغة الملف غير صحيحة');
    }
  } catch (error) {
    console.error('Import JSON Error:', error);
    return { success: false, error: error.message };
  }
};

// مشاركة تقرير نصي
export const shareReportText = async (reportData) => {
  try {
    const { startDate, endDate, stats } = reportData;
    
    let reportText = `📊 *تقرير المبيعات*\n`;
    reportText += `────────────────────────────\n`;
    reportText += `📅 الفترة: ${toEnglishNumbers(startDate)} - ${toEnglishNumbers(endDate)}\n`;
    reportText += `────────────────────────────\n\n`;
    
    reportText += `📋 عدد الفواتير: ${toEnglishNumbers(stats.totalInvoices)}\n`;
    reportText += `💰 إجمالي المبيعات: ${formatCurrency(stats.totalSales)} دينار\n`;
    reportText += `✅ إجمالي المدفوعات: ${formatCurrency(stats.totalPayments)} دينار\n`;
    reportText += `⚠️ إجمالي المتبقي: ${formatCurrency(stats.totalRemaining)} دينار\n\n`;
    
    reportText += `────────────────────────────\n`;
    reportText += `🏪 محلات ابو جعفر الرديني`;

    const shareOptions = {
      title: 'مشاركة التقرير',
      message: reportText,
      subject: `تقرير المبيعات ${toEnglishNumbers(startDate)} - ${toEnglishNumbers(endDate)}`,
    };

    await Share.open(shareOptions);
    return { success: true };
  } catch (error) {
    if (error.message !== 'User did not share') {
      console.error('Share Report Error:', error);
      return { success: false, error: error.message };
    }
    return { success: false, cancelled: true };
  }
};

export default {
  shareInvoiceText,
  shareCustomerStatement,
  exportInvoicesJSON,
  exportProductsJSON,
  importFromJSON,
  shareReportText,
};
