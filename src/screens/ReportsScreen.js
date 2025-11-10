// src/screens/ReportsScreen.js
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useDatabase } from '../database/database';
import { formatCurrency, toEnglishNumbers, getCurrentDate } from '../utils/formatters';
import { COLORS } from '../utils/colors';
import Toast from 'react-native-toast-message';
import { shareReportText } from '../services/shareService';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

const ReportsScreen = ({ navigation }) => {
  const { invoices, loading } = useDatabase();
  
  // حالة الفترة الزمنية
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState(getCurrentDate());
  const [reportGenerated, setReportGenerated] = useState(false);

  // حساب التقرير
  const reportData = useMemo(() => {
    if (!reportGenerated || !startDate || !endDate) {
      return null;
    }

    try {
      // فلترة الفواتير حسب الفترة
      const filteredInvoices = invoices.filter(inv => 
        inv.date >= startDate && inv.date <= endDate
      );

      if (filteredInvoices.length === 0) {
        return null;
      }

      // الإحصائيات الأساسية
      const totalInvoices = filteredInvoices.length;
      const totalSales = filteredInvoices.reduce((sum, inv) => sum + (parseFloat(inv.total) || 0), 0);
      const totalPayments = filteredInvoices.reduce((sum, inv) => sum + (parseFloat(inv.payment) || 0), 0);
      const totalRemaining = filteredInvoices.reduce((sum, inv) => {
        const remaining = (parseFloat(inv.total) || 0) + 
          (parseFloat(inv.previousBalance) || 0) - 
          (parseFloat(inv.payment) || 0);
        return sum + remaining;
      }, 0);
      
      // حماية من القسمة على صفر
      const avgInvoice = totalInvoices > 0 ? totalSales / totalInvoices : 0;

    // إحصائيات المنتجات
    const productStats = {};
    filteredInvoices.forEach(inv => {
      if (inv.items && Array.isArray(inv.items)) {
        inv.items.forEach(item => {
          const productName = item.product || 'منتج غير محدد';
          if (!productStats[productName]) {
            productStats[productName] = {
              name: productName,
              quantity: 0,
              total: 0,
              invoiceCount: 0,
            };
          }
          productStats[productName].quantity += parseFloat(item.quantity) || 0;
          productStats[productName].total += parseFloat(item.total) || 0;
          productStats[productName].invoiceCount++;
        });
      }
    });

    const topProducts = Object.values(productStats)
      .filter(p => p.total > 0) // تصفية المنتجات بدون مبيعات
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    // إحصائيات الزبائن
    const customerStats = {};
    filteredInvoices.forEach(inv => {
      const customerName = inv.customer || 'غير محدد';
      if (!customerStats[customerName]) {
        customerStats[customerName] = {
          name: customerName,
          total: 0,
          invoiceCount: 0,
          totalPaid: 0,
          totalRemaining: 0,
        };
      }
      customerStats[customerName].total += parseFloat(inv.total) || 0;
      customerStats[customerName].invoiceCount++;
      customerStats[customerName].totalPaid += parseFloat(inv.payment) || 0;
      const remaining = (parseFloat(inv.total) || 0) + 
        (parseFloat(inv.previousBalance) || 0) - 
        (parseFloat(inv.payment) || 0);
      customerStats[customerName].totalRemaining += remaining;
    });

    const topCustomers = Object.values(customerStats)
      .filter(c => c.total > 0) // تصفية الزبائن بدون مشتريات
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    // تحليل الأداء (مقارنة بالفترة السابقة)
    const daysDiff = Math.max(1, Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)));
    const previousStartDate = new Date(startDate);
    previousStartDate.setDate(previousStartDate.getDate() - daysDiff);
    const previousEndDate = new Date(startDate);
    previousEndDate.setDate(previousEndDate.getDate() - 1);

    const previousInvoices = invoices.filter(inv => {
      const invDate = new Date(inv.date);
      return invDate >= previousStartDate && invDate <= previousEndDate;
    });

    const prevTotalSales = previousInvoices.reduce((sum, inv) => sum + (parseFloat(inv.total) || 0), 0);
    const prevTotalInvoices = previousInvoices.length;

    const salesChange = prevTotalSales > 0 
      ? ((totalSales - prevTotalSales) / prevTotalSales * 100) 
      : (totalSales > 0 ? 100 : 0);

    const invoicesChange = prevTotalInvoices > 0
      ? ((totalInvoices - prevTotalInvoices) / prevTotalInvoices * 100)
      : (totalInvoices > 0 ? 100 : 0);

    const prevAvgInvoice = prevTotalInvoices > 0 ? prevTotalSales / prevTotalInvoices : 0;
    const avgInvoiceChange = prevAvgInvoice > 0
      ? ((avgInvoice - prevAvgInvoice) / prevAvgInvoice * 100)
      : 0;

    // حماية من NaN و Infinity
    const salesChangeValue = isFinite(salesChange) ? salesChange : 0;
    const invoicesChangeValue = isFinite(invoicesChange) ? invoicesChange : 0;
    const avgInvoiceChangeValue = isFinite(avgInvoiceChange) ? avgInvoiceChange : 0;

    // فواتير مسددة وغير مسددة
    const paidInvoices = filteredInvoices.filter(inv => {
      const remaining = (inv.total || 0) + (inv.previousBalance || 0) - (inv.payment || 0);
      return remaining <= 0;
    }).length;

    const unpaidInvoices = totalInvoices - paidInvoices;

    return {
      startDate,
      endDate,
      totalInvoices,
      totalSales: isFinite(totalSales) ? totalSales : 0,
      totalPayments: isFinite(totalPayments) ? totalPayments : 0,
      totalRemaining: isFinite(totalRemaining) ? totalRemaining : 0,
      avgInvoice: isFinite(avgInvoice) ? avgInvoice : 0,
      paidInvoices,
      unpaidInvoices,
      topProducts,
      topCustomers,
      performance: {
        salesChange: salesChangeValue,
        invoicesChange: invoicesChangeValue,
        avgInvoiceChange: avgInvoiceChangeValue,
      },
    };
  } catch (error) {
    console.error('Error generating report:', error);
    Toast.show({
      type: 'error',
      text1: 'خطأ في إنشاء التقرير',
      text2: 'حدث خطأ أثناء معالجة البيانات',
      position: 'top',
    });
    return null;
  }
}, [invoices, startDate, endDate, reportGenerated]);

  // تعيين فترة زمنية محددة
  const setDateRange = (preset) => {
    const today = new Date();
    let start = new Date();

    switch (preset) {
      case 'today':
        start = new Date(today);
        break;
      case 'week':
        start.setDate(today.getDate() - 7);
        break;
      case 'month':
        start.setMonth(today.getMonth() - 1);
        break;
      case 'year':
        start.setFullYear(today.getFullYear() - 1);
        break;
      default:
        return;
    }

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
    
    Toast.show({
      type: 'info',
      text1: 'تم ضبط الفترة',
      text2: `من ${start.toISOString().split('T')[0]} إلى ${today.toISOString().split('T')[0]}`,
      position: 'top',
      visibilityTime: 2000,
    });
  };

  // توليد التقرير
  const handleGenerateReport = () => {
    if (!startDate || !endDate) {
      Toast.show({
        type: 'error',
        text1: 'خطأ',
        text2: 'يرجى تحديد تاريخ البداية والنهاية',
        position: 'top',
      });
      return;
    }

    if (startDate > endDate) {
      Toast.show({
        type: 'error',
        text1: 'خطأ',
        text2: 'تاريخ البداية يجب أن يكون قبل تاريخ النهاية',
        position: 'top',
      });
      return;
    }

    setReportGenerated(true);

    if (!reportData) {
      Toast.show({
        type: 'warning',
        text1: 'لا توجد بيانات',
        text2: 'لا توجد فواتير في الفترة المحددة',
        position: 'top',
      });
    } else {
      Toast.show({
        type: 'success',
        text1: 'تم إنشاء التقرير',
        text2: `تم تحليل ${toEnglishNumbers(reportData.totalInvoices)} فاتورة`,
        position: 'top',
      });
    }
  };

  // مشاركة التقرير
  const handleShareReport = async () => {
    if (!reportData) {
      Toast.show({
        type: 'error',
        text1: 'خطأ',
        text2: 'يرجى إنشاء التقرير أولاً',
        position: 'top',
      });
      return;
    }

    const result = await shareReportText({
      startDate: reportData.startDate,
      endDate: reportData.endDate,
      stats: {
        totalInvoices: reportData.totalInvoices,
        totalSales: reportData.totalSales,
        totalPayments: reportData.totalPayments,
        totalRemaining: reportData.totalRemaining,
      },
    });

    if (result.success) {
      Toast.show({
        type: 'success',
        text1: 'تمت المشاركة',
        text2: 'تم مشاركة التقرير بنجاح',
        position: 'top',
      });
    } else if (!result.cancelled) {
      Toast.show({
        type: 'error',
        text1: 'فشلت المشاركة',
        text2: result.error || 'حدث خطأ',
        position: 'top',
      });
    }
  };

  // عرض بطاقة إحصائية
  const StatCard = ({ icon, label, value, color, trend }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={[styles.statIconContainer, { backgroundColor: color }]}>
        <Icon name={icon} size={isTablet ? 28 : 24} color="#fff" />
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
        {trend !== undefined && (
          <View style={styles.trendContainer}>
            <Icon
              name={trend > 0 ? 'trending-up' : trend < 0 ? 'trending-down' : 'trending-neutral'}
              size={16}
              color={trend > 0 ? COLORS.success : trend < 0 ? COLORS.danger : COLORS.textLight}
            />
            <Text style={[
              styles.trendText,
              { color: trend > 0 ? COLORS.success : trend < 0 ? COLORS.danger : COLORS.textLight }
            ]}>
              {trend > 0 ? '+' : ''}{formatCurrency(Math.abs(trend))}%
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  // عرض منتج في القائمة
  const ProductRow = ({ product, index }) => (
    <View style={[styles.tableRow, index % 2 === 0 && styles.evenRow]}>
      <Text style={[styles.tableCell, styles.indexCell]}>
        {toEnglishNumbers(index + 1)}
      </Text>
      <Text style={[styles.tableCell, styles.nameCell]} numberOfLines={1}>
        {product.name}
      </Text>
      <Text style={[styles.tableCell, styles.numberCell]}>
        {toEnglishNumbers(product.quantity)}
      </Text>
      <Text style={[styles.tableCell, styles.numberCell]}>
        {formatCurrency(product.total)}
      </Text>
      <Text style={[styles.tableCell, styles.numberCell]}>
        {toEnglishNumbers(product.invoiceCount)}
      </Text>
    </View>
  );

  // عرض زبون في القائمة
  const CustomerRow = ({ customer, index }) => (
    <View style={[styles.tableRow, index % 2 === 0 && styles.evenRow]}>
      <Text style={[styles.tableCell, styles.indexCell]}>
        {toEnglishNumbers(index + 1)}
      </Text>
      <Text style={[styles.tableCell, styles.nameCell]} numberOfLines={1}>
        {customer.name}
      </Text>
      <Text style={[styles.tableCell, styles.numberCell]}>
        {formatCurrency(customer.total)}
      </Text>
      <Text style={[styles.tableCell, styles.numberCell]}>
        {toEnglishNumbers(customer.invoiceCount)}
      </Text>
      <Text style={[styles.tableCell, styles.numberCell]}>
        {formatCurrency(customer.total / customer.invoiceCount)}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>جاري التحميل...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* الهيدر */}
      <View style={styles.header}>
        <Icon name="chart-bar" size={28} color="#fff" />
        <Text style={styles.headerTitle}>التقارير والتحليلات</Text>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* قسم اختيار الفترة */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="calendar-range" size={24} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>فترة التحليل</Text>
          </View>

          {/* أزرار الفترات السريعة */}
          <View style={styles.presetButtons}>
            <TouchableOpacity
              style={styles.presetButton}
              onPress={() => setDateRange('today')}
            >
              <Icon name="calendar-today" size={18} color={COLORS.primary} />
              <Text style={styles.presetButtonText}>اليوم</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.presetButton}
              onPress={() => setDateRange('week')}
            >
              <Icon name="calendar-week" size={18} color={COLORS.primary} />
              <Text style={styles.presetButtonText}>أسبوع</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.presetButton}
              onPress={() => setDateRange('month')}
            >
              <Icon name="calendar-month" size={18} color={COLORS.primary} />
              <Text style={styles.presetButtonText}>شهر</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.presetButton}
              onPress={() => setDateRange('year')}
            >
              <Icon name="calendar" size={18} color={COLORS.primary} />
              <Text style={styles.presetButtonText}>سنة</Text>
            </TouchableOpacity>
          </View>

          {/* حقول التاريخ */}
          <View style={styles.dateInputs}>
            <View style={styles.dateInputGroup}>
              <Text style={styles.label}>من تاريخ:</Text>
              <TextInput
                style={styles.dateInput}
                value={startDate}
                onChangeText={setStartDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={COLORS.textLight}
              />
            </View>

            <View style={styles.dateInputGroup}>
              <Text style={styles.label}>إلى تاريخ:</Text>
              <TextInput
                style={styles.dateInput}
                value={endDate}
                onChangeText={setEndDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={COLORS.textLight}
              />
            </View>
          </View>

          <TouchableOpacity
            style={styles.generateButton}
            onPress={handleGenerateReport}
          >
            <Icon name="chart-line" size={22} color="#fff" />
            <Text style={styles.generateButtonText}>إنشاء التقرير</Text>
          </TouchableOpacity>
        </View>

        {/* نتائج التقرير */}
        {reportGenerated && !reportData && (
          <View style={styles.emptyContainer}>
            <Icon name="file-document-outline" size={64} color={COLORS.textLight} />
            <Text style={styles.emptyTitle}>لا توجد بيانات</Text>
            <Text style={styles.emptyText}>
              لا توجد فواتير في الفترة المحددة{'\n'}
              جرب اختيار فترة أخرى
            </Text>
          </View>
        )}

        {reportGenerated && reportData && (
          <>
            {/* أزرار الإجراءات */}
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.actionButton, styles.shareButton]}
                onPress={handleShareReport}
              >
                <Icon name="share-variant" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>مشاركة</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.printButton]}
                onPress={() => {
                  Toast.show({
                    type: 'info',
                    text1: 'قريباً',
                    text2: 'ميزة الطباعة قيد التطوير',
                    position: 'top',
                  });
                }}
              >
                <Icon name="printer" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>طباعة</Text>
              </TouchableOpacity>
            </View>

            {/* إحصائيات المبيعات */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Icon name="chart-box" size={24} color={COLORS.primary} />
                <Text style={styles.sectionTitle}>إحصائيات المبيعات</Text>
              </View>

              <View style={styles.statsGrid}>
                <StatCard
                  icon="receipt-text"
                  label="عدد الفواتير"
                  value={toEnglishNumbers(reportData.totalInvoices)}
                  color={COLORS.primary}
                  trend={reportData.performance.invoicesChange}
                />
                <StatCard
                  icon="currency-usd"
                  label="إجمالي المبيعات"
                  value={formatCurrency(reportData.totalSales)}
                  color={COLORS.success}
                  trend={reportData.performance.salesChange}
                />
                <StatCard
                  icon="check-circle"
                  label="المدفوعات"
                  value={formatCurrency(reportData.totalPayments)}
                  color={COLORS.info}
                />
                <StatCard
                  icon="alert-circle"
                  label="المتبقي"
                  value={formatCurrency(reportData.totalRemaining)}
                  color={COLORS.danger}
                />
                <StatCard
                  icon="calculator"
                  label="متوسط الفاتورة"
                  value={formatCurrency(reportData.avgInvoice)}
                  color={COLORS.warning}
                  trend={reportData.performance.avgInvoiceChange}
                />
                <StatCard
                  icon="check-all"
                  label="فواتير مسددة"
                  value={toEnglishNumbers(reportData.paidInvoices)}
                  color={COLORS.success}
                />
              </View>
            </View>

            {/* تحليل الأداء */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Icon name="trending-up" size={24} color={COLORS.primary} />
                <Text style={styles.sectionTitle}>تحليل الأداء</Text>
              </View>
              
              <Text style={styles.subtitle}>
                مقارنة بالفترة السابقة
              </Text>

              <View style={styles.performanceGrid}>
                <View style={styles.performanceCard}>
                  <Icon
                    name={reportData.performance.salesChange >= 0 ? 'trending-up' : 'trending-down'}
                    size={32}
                    color={reportData.performance.salesChange >= 0 ? COLORS.success : COLORS.danger}
                  />
                  <Text style={[
                    styles.performanceValue,
                    { color: reportData.performance.salesChange >= 0 ? COLORS.success : COLORS.danger }
                  ]}>
                    {reportData.performance.salesChange >= 0 ? '+' : ''}
                    {formatCurrency(Math.abs(reportData.performance.salesChange))}%
                  </Text>
                  <Text style={styles.performanceLabel}>تغير المبيعات</Text>
                </View>

                <View style={styles.performanceCard}>
                  <Icon
                    name={reportData.performance.invoicesChange >= 0 ? 'trending-up' : 'trending-down'}
                    size={32}
                    color={reportData.performance.invoicesChange >= 0 ? COLORS.success : COLORS.danger}
                  />
                  <Text style={[
                    styles.performanceValue,
                    { color: reportData.performance.invoicesChange >= 0 ? COLORS.success : COLORS.danger }
                  ]}>
                    {reportData.performance.invoicesChange >= 0 ? '+' : ''}
                    {formatCurrency(Math.abs(reportData.performance.invoicesChange))}%
                  </Text>
                  <Text style={styles.performanceLabel}>تغير عدد الفواتير</Text>
                </View>

                <View style={styles.performanceCard}>
                  <Icon
                    name={reportData.performance.avgInvoiceChange >= 0 ? 'trending-up' : 'trending-down'}
                    size={32}
                    color={reportData.performance.avgInvoiceChange >= 0 ? COLORS.success : COLORS.danger}
                  />
                  <Text style={[
                    styles.performanceValue,
                    { color: reportData.performance.avgInvoiceChange >= 0 ? COLORS.success : COLORS.danger }
                  ]}>
                    {reportData.performance.avgInvoiceChange >= 0 ? '+' : ''}
                    {formatCurrency(Math.abs(reportData.performance.avgInvoiceChange))}%
                  </Text>
                  <Text style={styles.performanceLabel}>تغير متوسط الفاتورة</Text>
                </View>
              </View>
            </View>

            {/* أعلى 10 منتجات */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Icon name="trophy" size={24} color={COLORS.warning} />
                <Text style={styles.sectionTitle}>أعلى 10 منتجات مبيعاً</Text>
              </View>

              <View style={styles.table}>
                <View style={[styles.tableRow, styles.tableHeader]}>
                  <Text style={[styles.tableHeaderCell, styles.indexCell]}>#</Text>
                  <Text style={[styles.tableHeaderCell, styles.nameCell]}>المنتج</Text>
                  <Text style={[styles.tableHeaderCell, styles.numberCell]}>الكمية</Text>
                  <Text style={[styles.tableHeaderCell, styles.numberCell]}>المبيعات</Text>
                  <Text style={[styles.tableHeaderCell, styles.numberCell]}>الفواتير</Text>
                </View>

                {reportData.topProducts.map((product, index) => (
                  <ProductRow key={index} product={product} index={index} />
                ))}
              </View>
            </View>

            {/* أعلى 10 زبائن */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Icon name="account-star" size={24} color={COLORS.info} />
                <Text style={styles.sectionTitle}>أعلى 10 زبائن</Text>
              </View>

              <View style={styles.table}>
                <View style={[styles.tableRow, styles.tableHeader]}>
                  <Text style={[styles.tableHeaderCell, styles.indexCell]}>#</Text>
                  <Text style={[styles.tableHeaderCell, styles.nameCell]}>الزبون</Text>
                  <Text style={[styles.tableHeaderCell, styles.numberCell]}>المشتريات</Text>
                  <Text style={[styles.tableHeaderCell, styles.numberCell]}>الفواتير</Text>
                  <Text style={[styles.tableHeaderCell, styles.numberCell]}>المتوسط</Text>
                </View>

                {reportData.topCustomers.map((customer, index) => (
                  <CustomerRow key={index} customer={customer} index={index} />
                ))}
              </View>
            </View>
          </>
        )}

        {/* مساحة إضافية */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundSoft,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSoft,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.textMedium,
    fontWeight: '600',
  },
  header: {
    backgroundColor: COLORS.primary,
    padding: isTablet ? 32 : 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  headerTitle: {
    fontSize: isTablet ? 28 : 24,
    fontWeight: '800',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: isTablet ? 24 : 16,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: isTablet ? 24 : 20,
    marginBottom: isTablet ? 20 : 16,
    borderWidth: 2,
    borderColor: COLORS.border,
    elevation: 2,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: isTablet ? 20 : 16,
  },
  sectionTitle: {
    fontSize: isTablet ? 20 : 18,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  subtitle: {
    fontSize: isTablet ? 15 : 14,
    color: COLORS.textLight,
    marginBottom: isTablet ? 16 : 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  presetButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: isTablet ? 12 : 10,
    marginBottom: isTablet ? 20 : 16,
  },
  presetButton: {
    flex: 1,
    minWidth: isTablet ? 120 : 70,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.backgroundLight,
    padding: isTablet ? 14 : 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  presetButtonText: {
    fontSize: isTablet ? 14 : 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  dateInputs: {
    flexDirection: isTablet ? 'row' : 'column',
    gap: 12,
    marginBottom: isTablet ? 20 : 16,
  },
  dateInputGroup: {
    flex: 1,
  },
  label: {
    fontSize: isTablet ? 15 : 14,
    fontWeight: '600',
    color: COLORS.textDark,
    marginBottom: 8,
  },
  dateInput: {
    backgroundColor: COLORS.backgroundLight,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: isTablet ? 16 : 14,
    fontSize: isTablet ? 16 : 15,
    color: COLORS.textDark,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: COLORS.primary,
    padding: isTablet ? 18 : 16,
    borderRadius: 12,
    elevation: 3,
  },
  generateButtonText: {
    fontSize: isTablet ? 18 : 16,
    fontWeight: '700',
    color: '#fff',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: isTablet ? 20 : 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: isTablet ? 14 : 12,
    borderRadius: 12,
    elevation: 3,
  },
  shareButton: {
    backgroundColor: COLORS.accent,
  },
  printButton: {
    backgroundColor: COLORS.success,
  },
  actionButtonText: {
    fontSize: isTablet ? 15 : 14,
    fontWeight: '700',
    color: '#fff',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: isTablet ? 16 : 12,
  },
  statCard: {
    flex: isTablet ? 0 : 1,
    minWidth: isTablet ? 220 : 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.backgroundLight,
    padding: isTablet ? 16 : 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderLeftWidth: 4,
  },
  statIconContainer: {
    width: isTablet ? 48 : 42,
    height: isTablet ? 48 : 42,
    borderRadius: isTablet ? 24 : 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statContent: {
    flex: 1,
  },
  statLabel: {
    fontSize: isTablet ? 13 : 12,
    color: COLORS.textLight,
    fontWeight: '600',
    marginBottom: 4,
  },
  statValue: {
    fontSize: isTablet ? 20 : 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendText: {
    fontSize: isTablet ? 13 : 12,
    fontWeight: '700',
  },
  performanceGrid: {
    flexDirection: isTablet ? 'row' : 'column',
    gap: isTablet ? 16 : 12,
  },
  performanceCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: COLORS.backgroundLight,
    padding: isTablet ? 24 : 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  performanceValue: {
    fontSize: isTablet ? 28 : 24,
    fontWeight: '800',
    marginVertical: isTablet ? 12 : 10,
  },
  performanceLabel: {
    fontSize: isTablet ? 14 : 13,
    color: COLORS.textMedium,
    fontWeight: '600',
    textAlign: 'center',
  },
  table: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  evenRow: {
    backgroundColor: COLORS.backgroundLight,
  },
  tableHeader: {
    backgroundColor: COLORS.primary,
  },
  tableHeaderCell: {
    padding: isTablet ? 14 : 12,
    fontSize: isTablet ? 14 : 13,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  tableCell: {
    padding: isTablet ? 14 : 12,
    fontSize: isTablet ? 14 : 13,
    fontWeight: '600',
    color: COLORS.textDark,
    textAlign: 'center',
  },
  indexCell: {
    width: isTablet ? 60 : 50,
  },
  nameCell: {
    flex: 1,
    textAlign: 'right',
    paddingRight: isTablet ? 16 : 12,
  },
  numberCell: {
    width: isTablet ? 100 : 80,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: isTablet ? 80 : 60,
    paddingHorizontal: isTablet ? 40 : 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  emptyTitle: {
    fontSize: isTablet ? 24 : 20,
    fontWeight: '700',
    color: COLORS.textDark,
    marginTop: isTablet ? 20 : 16,
    marginBottom: isTablet ? 12 : 8,
  },
  emptyText: {
    fontSize: isTablet ? 16 : 14,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: isTablet ? 24 : 22,
  },
});

export default ReportsScreen;
