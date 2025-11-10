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

// ** تعديل رقم 2: استبدال دالة normalizeInvoice بالكامل **
const normalizeInvoice = (invoice) => {
  // دالة لإصلاح النصوص العربية
  const fixText = (text) => {
    if (!text || typeof text !== 'string') return text;
    try {
      // فك ترميز UTF-8 المكسور
      return decodeURIComponent(escape(text));
    } catch (e) {
      return text;
    }
  };

  return {
    id: invoice.id || invoice.invoiceId || Date.now(),
    customer: fixText(invoice.customer || invoice.customerName || 'غير محدد'),
    date: invoice.date || invoice.invoiceDate || getCurrentDate(),
    items: Array.isArray(invoice.items) ? invoice.items.map(item => ({
      product: fixText(item.product || item.productName || item.name || 'منتج'),
      quantity: parseFloat(item.quantity || item.qty || 0),
      price: parseFloat(item.price || item.unitPrice || 0),
      total: parseFloat(item.total || item.amount || 0),
      notes: fixText(item.notes || item.note || ''),
    })) : [],
    total: parseFloat(invoice.total || invoice.totalAmount || invoice.invoiceTotal || 0),
    previousBalance: parseFloat(invoice.previousBalance || invoice.prevBalance || invoice.oldBalance || 0),
    payment: parseFloat(invoice.payment || invoice.paidAmount || invoice.paid || 0),
    createdAt: invoice.createdAt || new Date().toISOString(),
  };
};

// ** تعديل رقم 3: استبدال دالة normalizeProduct بالكامل **
const normalizeProduct = (product) => {
  const fixText = (text) => {
    if (!text || typeof text !== 'string') return text;
    try {
      return decodeURIComponent(escape(text));
    } catch (e) {
      return text;
    }
  };

  return {
    id: product.id || product.productId || Date.now(),
    name: fixText(product.name || product.productName || 'منتج'),
    price: parseFloat(product.price || product.unitPrice || product.cost || 0),
    createdAt: product.createdAt || new Date().toISOString(),
  };
};

// استيراد بيانات من ملف JSON مع دعم الصيغ القديمة
export const importFromJSON = async (filePath) => {
  try {
    const fileContent = await RNFS.readFile(filePath, 'utf8');

    // ** تعديل رقم 1: إضافة دالة لإصلاح الترميز **
    // دالة لإصلاح الترميز العربي الخاطئ
    const fixArabicEncoding = (text) => {
      try {
        // محاولة إصلاح UTF-8 المكسور
        const bytes = new Uint8Array(text.split('').map(c => c.charCodeAt(0)));
        const decoder = new TextDecoder('utf-8');
        return decoder.decode(bytes);
      } catch (e) {
        return text;
      }
    };

    let data;

    try {
      // محاولة قراءة JSON العادي أولاً
      data = JSON.parse(fileContent);
    } catch (parseError) {
      // إذا فشل، جرب إصلاح الترميز
      try {
        const fixedContent = fixArabicEncoding(fileContent);
        data = JSON.parse(fixedContent);
      } catch (e) {
        throw new Error('الملف ليس بصيغة JSON صحيحة');
      }
    }
    // ** نهاية تعديل رقم 1 **

    // دعم الصيغة الجديدة (React Native)
    if (data.invoices && Array.isArray(data.invoices)) {
      const normalizedInvoices = data.invoices.map(normalizeInvoice);
      return {
        success: true,
        type: 'invoices',
        data: normalizedInvoices,
        count: normalizedInvoices.length,
      };
    } 
    
    if (data.products && Array.isArray(data.products)) {
      const normalizedProducts = data.products.map(normalizeProduct);
      return {
        success: true,
        type: 'products',
        data: normalizedProducts,
        count: normalizedProducts.length,
      };
    }

    // دعم الصيغة القديمة من تطبيق الويب/كوردوفا
    // الحالة 1: مصفوفة مباشرة من الفواتير
    if (Array.isArray(data)) {
      // التحقق من نوع البيانات
      if (data.length > 0) {
        const firstItem = data[0];
        
        // إذا كان العنصر يحتوي على customer أو items فهو فاتورة
        if (firstItem.customer || firstItem.customerName || firstItem.items) {
          const normalizedInvoices = data.map(normalizeInvoice);
          return {
            success: true,
            type: 'invoices',
            data: normalizedInvoices,
            count: normalizedInvoices.length,
          };
        }
        
        // إذا كان العنصر يحتوي على name و price فقط فهو منتج
        if ((firstItem.name || firstItem.productName) && (firstItem.price || firstItem.unitPrice)) {
          const normalizedProducts = data.map(normalizeProduct);
          return {
            success: true,
            type: 'products',
            data: normalizedProducts,
            count: normalizedProducts.length,
          };
        }
      }
    }

    // الحالة 2: كائن يحتوي على data أو invoicesList أو productsList
    if (data.data && Array.isArray(data.data)) {
      if (data.data.length > 0) {
        const firstItem = data.data[0];
        
        if (firstItem.customer || firstItem.customerName || firstItem.items) {
          const normalizedInvoices = data.data.map(normalizeInvoice);
          return {
            success: true,
            type: 'invoices',
            data: normalizedInvoices,
            count: normalizedInvoices.length,
          };
        }
        
        if ((firstItem.name || firstItem.productName) && (firstItem.price || firstItem.unitPrice)) {
          const normalizedProducts = data.data.map(normalizeProduct);
          return {
            success: true,
            type: 'products',
            data: normalizedProducts,
            count: normalizedProducts.length,
          };
        }
      }
    }

    // الحالة 3: كائن يحتوي على invoicesList أو productsList
    if (data.invoicesList && Array.isArray(data.invoicesList)) {
      const normalizedInvoices = data.invoicesList.map(normalizeInvoice);
      return {
        success: true,
        type: 'invoices',
        data: normalizedInvoices,
        count: normalizedInvoices.length,
      };
    }

    if (data.productsList && Array.isArray(data.productsList)) {
      const normalizedProducts = data.productsList.map(normalizeProduct);
      return {
        success: true,
        type: 'products',
        data: normalizedProducts,
        count: normalizedProducts.length,
      };
    }

    // الحالة 4: كائن localStorage من التطبيقات القديمة
    if (data.localStorage) {
      // محاولة قراءة الفواتير من localStorage
      if (data.localStorage.invoices) {
        try {
          const invoicesData = typeof data.localStorage.invoices === 'string' 
            ? JSON.parse(data.localStorage.invoices) 
            : data.localStorage.invoices;
          
          if (Array.isArray(invoicesData)) {
            const normalizedInvoices = invoicesData.map(normalizeInvoice);
            return {
              success: true,
              type: 'invoices',
              data: normalizedInvoices,
              count: normalizedInvoices.length,
            };
          }
        } catch (e) {
          console.error('Error parsing localStorage invoices:', e);
        }
      }

      // محاولة قراءة المنتجات من localStorage
      if (data.localStorage.products) {
        try {
          const productsData = typeof data.localStorage.products === 'string' 
            ? JSON.parse(data.localStorage.products) 
            : data.localStorage.products;
          
          if (Array.isArray(productsData)) {
            const normalizedProducts = productsData.map(normalizeProduct);
            return {
              success: true,
              type: 'products',
              data: normalizedProducts,
              count: normalizedProducts.length,
            };
          }
        } catch (e) {
          console.error('Error parsing localStorage products:', e);
        }
      }
    }

    throw new Error('صيغة الملف غير مدعومة أو لا يحتوي على بيانات صحيحة');
    
  } catch (error) {
    console.error('Import JSON Error:', error);
    return { 
      success: false, 
      error: error.message || 'فشل استيراد الملف' 
    };
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
