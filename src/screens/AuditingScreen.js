// src/screens/AuditingScreen.js
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
import { formatCurrency, toEnglishNumbers, getCurrentDate, getCurrentTime } from '../utils/formatters';
import { COLORS } from '../utils/colors';
import Toast from 'react-native-toast-message';
import { printCustomerStatement } from '../services/printService';
import { shareCustomerStatement } from '../services/shareService';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

const AuditingScreen = ({ navigation }) => {
  const { invoices, loading } = useDatabase();
  
  // حالة البحث
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCustomers, setExpandedCustomers] = useState(new Set());

  // تجميع الفواتير حسب الزبون
  const groupedInvoices = useMemo(() => {
    const grouped = {};
    
    invoices.forEach(inv => {
      if (!grouped[inv.customer]) {
        grouped[inv.customer] = [];
      }
      grouped[inv.customer].push(inv);
    });

    // ترتيب الفواتير داخل كل مجموعة
    Object.keys(grouped).forEach(customer => {
      grouped[customer].sort((a, b) => a.id - b.id);
    });

    return grouped;
  }, [invoices]);

  // تصفية الزبائن حسب البحث
  const filteredCustomerNames = useMemo(() => {
    let customers = Object.keys(groupedInvoices);
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      customers = customers.filter(name => 
        name.toLowerCase().includes(query)
      );
    }

    return customers.sort((a, b) => a.localeCompare(b, 'ar'));
  }, [groupedInvoices, searchQuery]);

  // حساب الإحصائيات الإجمالية
  const totalStats = useMemo(() => {
    let totalCustomers = Object.keys(groupedInvoices).length;
    let totalInvoices = invoices.length;
    let totalRemaining = 0;
    let customersWithDebt = 0;
    let customersWithCredit = 0;

    Object.entries(groupedInvoices).forEach(([customer, invs]) => {
      const latestInvoice = invs[invs.length - 1];
      if (latestInvoice) {
        const remaining = (latestInvoice.total || 0) + 
          (latestInvoice.previousBalance || 0) - 
          (latestInvoice.payment || 0);
        
        totalRemaining += remaining;
        
        if (remaining > 0) {
          customersWithDebt++;
        } else if (remaining < 0) {
          customersWithCredit++;
        }
      }
    });

    return {
      totalCustomers,
      totalInvoices,
      totalRemaining,
      customersWithDebt,
      customersWithCredit,
    };
  }, [groupedInvoices, invoices]);

  // Toggle توسيع تفاصيل الزبون
  const toggleCustomerExpansion = (customerName) => {
    setExpandedCustomers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(customerName)) {
        newSet.delete(customerName);
      } else {
        newSet.add(customerName);
      }
      return newSet;
    });
  };

  // طباعة كشف حساب
  const handlePrintStatement = async (customerName, invoices) => {
    const result = await printCustomerStatement(customerName, invoices);
    
    if (result.success) {
      Toast.show({
        type: 'success',
        text1: 'تمت الطباعة',
        text2: 'تم إرسال كشف الحساب للطابعة',
        position: 'top',
      });
    } else {
      Toast.show({
        type: 'error',
        text1: 'فشلت الطباعة',
        text2: result.error || 'حدث خطأ',
        position: 'top',
      });
    }
  };

  // مشاركة كشف حساب
  const handleShareStatement = async (customerName, invoices) => {
    const result = await shareCustomerStatement(customerName, invoices);
    
    if (result.success) {
      Toast.show({
        type: 'success',
        text1: 'تمت المشاركة',
        text2: 'تم مشاركة كشف الحساب بنجاح',
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
  const StatCard = ({ icon, label, value, color }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={[styles.statIconContainer, { backgroundColor: color }]}>
        <Icon name={icon} size={isTablet ? 26 : 22} color="#fff" />
      </View>
      <View style={styles.statContent}>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </View>
  );

  // عرض بطاقة زبون
  const CustomerCard = ({ customerName, invoices }) => {
    const isExpanded = expandedCustomers.has(customerName);
    const sortedInvoices = [...invoices].sort((a, b) => a.id - b.id);
    const latestInvoice = sortedInvoices[sortedInvoices.length - 1];
    
    const finalRemaining = latestInvoice 
      ? ((latestInvoice.total || 0) + (latestInvoice.previousBalance || 0) - (latestInvoice.payment || 0))
      : 0;
    
    const totalInvoicesAmount = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const totalPaid = invoices.reduce((sum, inv) => sum + (inv.payment || 0), 0);
    
    const statusColor = finalRemaining > 0 ? COLORS.danger : 
                       finalRemaining < 0 ? COLORS.success : 
                       COLORS.textLight;

    return (
      <View style={styles.customerCard}>
        {/* هيدر الزبون */}
        <TouchableOpacity
          style={[styles.customerHeader, { borderLeftColor: statusColor }]}
          onPress={() => toggleCustomerExpansion(customerName)}
          activeOpacity={0.7}
        >
          <View style={styles.customerMainInfo}>
            <View style={styles.customerNameRow}>
              <Icon name="account-circle" size={28} color={COLORS.primary} />
              <Text style={styles.customerName}>{customerName}</Text>
              <Icon 
                name={isExpanded ? "chevron-up" : "chevron-down"} 
                size={24} 
                color={COLORS.primary} 
              />
            </View>

            <View style={styles.customerStatsRow}>
              <View style={styles.statBadge}>
                <Icon name="receipt" size={16} color={COLORS.textLight} />
                <Text style={styles.statBadgeText}>
                  {toEnglishNumbers(invoices.length)} فاتورة
                </Text>
              </View>

              <View style={styles.statBadge}>
                <Icon name="cash-multiple" size={16} color={COLORS.success} />
                <Text style={styles.statBadgeText}>
                  {formatCurrency(totalInvoicesAmount)}
                </Text>
              </View>

              <View style={[styles.statBadge, styles.remainingBadge, { borderColor: statusColor }]}>
                <Icon 
                  name={finalRemaining > 0 ? "alert-circle" : finalRemaining < 0 ? "check-circle" : "minus-circle"} 
                  size={16} 
                  color={statusColor} 
                />
                <Text style={[styles.statBadgeText, { color: statusColor, fontWeight: '700' }]}>
                  {formatCurrency(finalRemaining)}
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>

        {/* تفاصيل الفواتير */}
        {isExpanded && (
          <View style={styles.customerDetails}>
            {/* الإجراءات */}
            <View style={styles.customerActions}>
              <TouchableOpacity
                style={[styles.customerActionButton, { backgroundColor: COLORS.success }]}
                onPress={() => handlePrintStatement(customerName, invoices)}
              >
                <Icon name="printer" size={18} color="#fff" />
                <Text style={styles.customerActionText}>طباعة</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.customerActionButton, { backgroundColor: COLORS.accent }]}
                onPress={() => handleShareStatement(customerName, invoices)}
              >
                <Icon name="share-variant" size={18} color="#fff" />
                <Text style={styles.customerActionText}>مشاركة</Text>
              </TouchableOpacity>
            </View>

            {/* جدول الفواتير */}
            <View style={styles.invoicesTable}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, styles.invoiceIdCell]}>#</Text>
                <Text style={[styles.tableHeaderCell, styles.dateCell]}>التاريخ</Text>
                <Text style={[styles.tableHeaderCell, styles.amountCell]}>المجموع</Text>
                <Text style={[styles.tableHeaderCell, styles.amountCell]}>الواصل</Text>
                <Text style={[styles.tableHeaderCell, styles.amountCell]}>المتبقي</Text>
              </View>

              {sortedInvoices.map((invoice, index) => {
                const remaining = (invoice.total || 0) + (invoice.previousBalance || 0) - (invoice.payment || 0);
                const rowColor = remaining > 0 ? COLORS.danger : 
                                remaining < 0 ? COLORS.success : 
                                COLORS.textMedium;

                return (
                  <View 
                    key={invoice.id} 
                    style={[styles.tableRow, index % 2 === 0 && styles.evenRow]}
                  >
                    <Text style={[styles.tableCell, styles.invoiceIdCell]}>
                      {toEnglishNumbers(invoice.id)}
                    </Text>
                    <Text style={[styles.tableCell, styles.dateCell]}>
                      {toEnglishNumbers(invoice.date)}
                    </Text>
                    <Text style={[styles.tableCell, styles.amountCell]}>
                      {formatCurrency(invoice.total || 0)}
                    </Text>
                    <Text style={[styles.tableCell, styles.amountCell, { color: COLORS.success }]}>
                      {formatCurrency(invoice.payment || 0)}
                    </Text>
                    <Text style={[styles.tableCell, styles.amountCell, { color: rowColor, fontWeight: '700' }]}>
                      {formatCurrency(remaining)}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* ملخص الحساب */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>إجمالي المشتريات:</Text>
                <Text style={styles.summaryValue}>{formatCurrency(totalInvoicesAmount)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>إجمالي المدفوع:</Text>
                <Text style={[styles.summaryValue, { color: COLORS.success }]}>
                  {formatCurrency(totalPaid)}
                </Text>
              </View>
              <View style={[styles.summaryRow, styles.finalRow]}>
                <Text style={styles.finalLabel}>الرصيد النهائي:</Text>
                <Text style={[styles.finalValue, { color: statusColor }]}>
                  {formatCurrency(finalRemaining)}
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>
    );
  };

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
        <Icon name="account-check" size={28} color="#fff" />
        <Text style={styles.headerTitle}>مراجعة الحسابات</Text>
        <View style={styles.counterBadge}>
          <Text style={styles.counterText}>
            {toEnglishNumbers(totalStats.totalCustomers)}
          </Text>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* معلومات المراجعة */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Icon name="calendar-clock" size={20} color={COLORS.primary} />
            <Text style={styles.infoText}>
              تاريخ المراجعة: {toEnglishNumbers(getCurrentDate())} | {getCurrentTime()}
            </Text>
          </View>
        </View>

        {/* الإحصائيات الإجمالية */}
        <View style={styles.statsSection}>
          <View style={styles.sectionHeader}>
            <Icon name="chart-box" size={24} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>الإحصائيات الإجمالية</Text>
          </View>

          <View style={styles.statsGrid}>
            <StatCard
              icon="account-group"
              label="إجمالي الزبائن"
              value={toEnglishNumbers(totalStats.totalCustomers)}
              color={COLORS.primary}
            />
            <StatCard
              icon="receipt-text"
              label="إجمالي الفواتير"
              value={toEnglishNumbers(totalStats.totalInvoices)}
              color={COLORS.info}
            />
            <StatCard
              icon="alert-circle"
              label="زبائن لهم ديون"
              value={toEnglishNumbers(totalStats.customersWithDebt)}
              color={COLORS.danger}
            />
            <StatCard
              icon="currency-usd"
              label="إجمالي المتبقي"
              value={formatCurrency(totalStats.totalRemaining)}
              color={totalStats.totalRemaining > 0 ? COLORS.danger : COLORS.success}
            />
          </View>
        </View>

        {/* شريط البحث */}
        <View style={styles.searchContainer}>
          <Icon name="magnify" size={22} color={COLORS.textLight} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="ابحث عن زبون..."
            placeholderTextColor={COLORS.textLight}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="close-circle" size={22} color={COLORS.textLight} />
            </TouchableOpacity>
          )}
        </View>

        {/* قائمة الزبائن */}
        {filteredCustomerNames.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="account-off" size={64} color={COLORS.textLight} />
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'لا توجد نتائج' : 'لا يوجد زبائن'}
            </Text>
            <Text style={styles.emptyText}>
              {searchQuery 
                ? 'جرب البحث باسم آخر'
                : 'ابدأ بإنشاء فواتير لتظهر هنا'}
            </Text>
          </View>
        ) : (
          <View style={styles.customersContainer}>
            {filteredCustomerNames.map((customerName) => (
              <CustomerCard
                key={customerName}
                customerName={customerName}
                invoices={groupedInvoices[customerName]}
              />
            ))}
          </View>
        )}

        {/* ملخص نهائي */}
        {filteredCustomerNames.length > 0 && (
          <View style={styles.finalSummaryCard}>
            <View style={styles.finalSummaryHeader}>
              <Icon name="clipboard-check" size={24} color={COLORS.primary} />
              <Text style={styles.finalSummaryTitle}>الملخص النهائي</Text>
            </View>
            
            <View style={styles.finalSummaryContent}>
              <View style={styles.finalSummaryRow}>
                <Text style={styles.finalSummaryLabel}>عدد الزبائن المعروضين:</Text>
                <Text style={styles.finalSummaryValue}>
                  {toEnglishNumbers(filteredCustomerNames.length)}
                </Text>
              </View>
              
              <View style={styles.finalSummaryRow}>
                <Text style={styles.finalSummaryLabel}>إجمالي الرصيد:</Text>
                <Text style={[
                  styles.finalSummaryValue, 
                  styles.finalSummaryAmount,
                  { color: totalStats.totalRemaining > 0 ? COLORS.danger : COLORS.success }
                ]}>
                  {formatCurrency(totalStats.totalRemaining)} دينار
                </Text>
              </View>
            </View>
          </View>
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
  counterBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: isTablet ? 14 : 12,
    paddingVertical: isTablet ? 8 : 6,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#fff',
  },
  counterText: {
    color: '#fff',
    fontSize: isTablet ? 18 : 16,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    padding: isTablet ? 24 : 16,
  },
  infoCard: {
    backgroundColor: '#e0f2fe',
    borderRadius: 12,
    padding: isTablet ? 16 : 14,
    marginBottom: isTablet ? 20 : 16,
    borderWidth: 2,
    borderColor: COLORS.info,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoText: {
    fontSize: isTablet ? 14 : 13,
    color: COLORS.textDark,
    fontWeight: '600',
  },
  statsSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: isTablet ? 24 : 20,
    marginBottom: isTablet ? 20 : 16,
    borderWidth: 2,
    borderColor: COLORS.border,
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: isTablet ? 16 : 12,
  },
  statCard: {
    flex: isTablet ? 0 : 1,
    minWidth: isTablet ? 180 : 0,
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
    width: isTablet ? 44 : 38,
    height: isTablet ? 44 : 38,
    borderRadius: isTablet ? 22 : 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: isTablet ? 20 : 18,
    fontWeight: '800',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: isTablet ? 12 : 11,
    color: COLORS.textLight,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    paddingHorizontal: isTablet ? 16 : 12,
    paddingVertical: isTablet ? 4 : 2,
    gap: 12,
    marginBottom: isTablet ? 20 : 16,
  },
  searchInput: {
    flex: 1,
    fontSize: isTablet ? 16 : 14,
    color: COLORS.textDark,
    padding: isTablet ? 12 : 10,
  },
  customersContainer: {
    gap: isTablet ? 16 : 12,
  },
  customerCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: isTablet ? 16 : 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  customerHeader: {
    padding: isTablet ? 20 : 16,
    borderLeftWidth: 4,
  },
  customerMainInfo: {
    gap: isTablet ? 14 : 12,
  },
  customerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  customerName: {
    flex: 1,
    fontSize: isTablet ? 20 : 18,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  customerStatsRow: {
    flexDirection: isTablet ? 'row' : 'column',
    gap: isTablet ? 12 : 8,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.backgroundLight,
    paddingHorizontal: isTablet ? 12 : 10,
    paddingVertical: isTablet ? 8 : 6,
    borderRadius: 8,
    flex: isTablet ? 1 : 0,
  },
  remainingBadge: {
    backgroundColor: '#fff',
    borderWidth: 2,
  },
  statBadgeText: {
    fontSize: isTablet ? 13 : 12,
    fontWeight: '600',
    color: COLORS.textMedium,
  },
  customerDetails: {
    padding: isTablet ? 20 : 16,
    paddingTop: isTablet ? 16 : 12,
    borderTopWidth: 2,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.backgroundLight,
  },
  customerActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: isTablet ? 16 : 14,
  },
  customerActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: isTablet ? 12 : 10,
    borderRadius: 10,
  },
  customerActionText: {
    color: '#fff',
    fontSize: isTablet ? 14 : 13,
    fontWeight: '700',
  },
  invoicesTable: {
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: isTablet ? 16 : 14,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    paddingVertical: isTablet ? 12 : 10,
  },
  tableHeaderCell: {
    fontSize: isTablet ? 13 : 12,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: isTablet ? 12 : 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  evenRow: {
    backgroundColor: '#f8f9fa',
  },
  tableCell: {
    fontSize: isTablet ? 12 : 11,
    fontWeight: '600',
    color: COLORS.textDark,
    textAlign: 'center',
  },
  invoiceIdCell: {
    width: isTablet ? 70 : 60,
  },
  dateCell: {
    flex: 1,
  },
  amountCell: {
    width: isTablet ? 90 : 75,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: isTablet ? 16 : 14,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: isTablet ? 10 : 8,
  },
  summaryLabel: {
    fontSize: isTablet ? 14 : 13,
    fontWeight: '600',
    color: COLORS.textMedium,
  },
  summaryValue: {
    fontSize: isTablet ? 15 : 14,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  finalRow: {
    borderTopWidth: 2,
    borderTopColor: COLORS.border,
    marginTop: isTablet ? 8 : 6,
    paddingTop: isTablet ? 12 : 10,
  },
  finalLabel: {
    fontSize: isTablet ? 16 : 15,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  finalValue: {
    fontSize: isTablet ? 18 : 16,
    fontWeight: '800',
  },
  finalSummaryCard: {
    backgroundColor: '#f0fdfa',
    borderRadius: 16,
    padding: isTablet ? 24 : 20,
    marginTop: isTablet ? 20 : 16,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  finalSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: isTablet ? 20 : 16,
    paddingBottom: isTablet ? 16 : 14,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  finalSummaryTitle: {
    fontSize: isTablet ? 20 : 18,
    fontWeight: '800',
    color: COLORS.primary,
  },
  finalSummaryContent: {
    gap: isTablet ? 14 : 12,
  },
  finalSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: isTablet ? 10 : 8,
  },
  finalSummaryLabel: {
    fontSize: isTablet ? 16 : 15,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  finalSummaryValue: {
    fontSize: isTablet ? 16 : 15,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  finalSummaryAmount: {
    fontSize: isTablet ? 20 : 18,
    fontWeight: '800',
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

export default AuditingScreen;
