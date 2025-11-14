// src/screens/AuditingScreen.js - محدث بنظام الدفعات
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
  Modal,
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
  const { 
    invoices, 
    loading,
    addPayment,
    deletePayment,
    getCustomerPayments,
    getCustomerBalance, // ✅ استخدام الدالة الجديدة
  } = useDatabase();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCustomers, setExpandedCustomers] = useState(new Set());
  
  // ✅ حالة مودال الدفع
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(getCurrentDate());
  const [paymentNotes, setPaymentNotes] = useState('');

  // تجميع الفواتير حسب الزبون
  const groupedInvoices = useMemo(() => {
    const grouped = {};
    
    invoices.forEach(inv => {
      if (!grouped[inv.customer]) {
        grouped[inv.customer] = [];
      }
      grouped[inv.customer].push(inv);
    });

    Object.keys(grouped).forEach(customer => {
      grouped[customer].sort((a, b) => a.id - b.id);
    });

    return grouped;
  }, [invoices]);

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

  // ✅ حساب الإحصائيات باستخدام الدالة الجديدة
  const totalStats = useMemo(() => {
    let totalCustomers = Object.keys(groupedInvoices).length;
    let totalInvoices = invoices.length;
    let totalRemaining = 0;
    let customersWithDebt = 0;
    let customersWithCredit = 0;

    Object.keys(groupedInvoices).forEach(customer => {
      const remaining = getCustomerBalance(customer);
      totalRemaining += remaining;
      
      if (remaining > 0) {
        customersWithDebt++;
      } else if (remaining < 0) {
        customersWithCredit++;
      }
    });

    return {
      totalCustomers,
      totalInvoices,
      totalRemaining,
      customersWithDebt,
      customersWithCredit,
    };
  }, [groupedInvoices, invoices, getCustomerBalance]);

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

  // ✅ فتح مودال الدفع
  const openPaymentModal = (customerName) => {
    setSelectedCustomer(customerName);
    setPaymentAmount('');
    setPaymentDate(getCurrentDate());
    setPaymentNotes('');
    setShowPaymentModal(true);
  };

  // ✅ إضافة دفعة جديدة
  const handleAddPayment = async () => {
    const amount = parseFloat(paymentAmount);

    if (!amount || amount <= 0) {
      Toast.show({
        type: 'error',
        text1: 'خطأ',
        text2: 'يرجى إدخال مبلغ صحيح',
        position: 'top',
      });
      return;
    }

    const currentBalance = getCustomerBalance(selectedCustomer);
    if (amount > currentBalance) {
      Toast.show({
        type: 'warning',
        text1: 'تحذير',
        text2: `المبلغ أكبر من المتبقي (${formatCurrency(currentBalance)} دينار)`,
        position: 'top',
      });
      // يمكن السماح بالمتابعة أو الإلغاء حسب رغبتك
    }

    try {
      await addPayment({
        customer: selectedCustomer,
        amount: amount,
        date: paymentDate,
        notes: paymentNotes,
      });

      Toast.show({
        type: 'success',
        text1: 'تم التسديد! ✅',
        text2: `تم تسجيل دفعة ${formatCurrency(amount)} دينار`,
        position: 'top',
      });

      setShowPaymentModal(false);
      setSelectedCustomer(null);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'فشلت العملية',
        text2: 'حدث خطأ أثناء تسجيل الدفعة',
        position: 'top',
      });
    }
  };

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

  const CustomerCard = ({ customerName, invoices }) => {
    const isExpanded = expandedCustomers.has(customerName);
    const sortedInvoices = [...invoices].sort((a, b) => a.id - b.id);
    
    // ✅ استخدام الدالة الجديدة
    const finalRemaining = getCustomerBalance(customerName);
    const customerPayments = getCustomerPayments(customerName);
    
    const totalInvoicesAmount = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const totalPaid = invoices.reduce((sum, inv) => sum + (inv.payment || 0), 0);
    const totalStandalonePayments = customerPayments.reduce((sum, p) => sum + p.amount, 0);
    
    const statusColor = finalRemaining > 0 ? COLORS.danger : 
                       finalRemaining < 0 ? COLORS.success : 
                       COLORS.textLight;

    return (
      <View style={styles.customerCard}>
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

        {isExpanded && (
          <View style={styles.customerDetails}>
            <View style={styles.customerActions}>
              {/* ✅ زر الدفع الجديد */}
              <TouchableOpacity
                style={[styles.customerActionButton, { backgroundColor: COLORS.warning }]}
                onPress={() => openPaymentModal(customerName)}
              >
                <Icon name="cash-plus" size={18} color="#fff" />
                <Text style={styles.customerActionText}>تسديد</Text>
              </TouchableOpacity>

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

            {/* ✅ عرض الدفعات المستقلة */}
            {customerPayments.length > 0 && (
              <View style={styles.paymentsSection}>
                <Text style={styles.paymentsSectionTitle}>
                  💳 الدفعات المستقلة ({toEnglishNumbers(customerPayments.length)})
                </Text>
                {customerPayments.map(payment => (
                  <View key={payment.id} style={styles.paymentItem}>
                    <View style={styles.paymentInfo}>
                      <Text style={styles.paymentAmount}>
                        {formatCurrency(payment.amount)} دينار
                      </Text>
                      <Text style={styles.paymentDate}>
                        📅 {toEnglishNumbers(payment.date)}
                      </Text>
                      {payment.notes && (
                        <Text style={styles.paymentNotes}>
                          📝 {payment.notes}
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}

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

            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>إجمالي المشتريات:</Text>
                <Text style={styles.summaryValue}>{formatCurrency(totalInvoicesAmount)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>إجمالي المدفوع (فواتير):</Text>
                <Text style={[styles.summaryValue, { color: COLORS.success }]}>
                  {formatCurrency(totalPaid)}
                </Text>
              </View>
              {totalStandalonePayments > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>الدفعات المستقلة:</Text>
                  <Text style={[styles.summaryValue, { color: COLORS.info }]}>
                    {formatCurrency(totalStandalonePayments)}
                  </Text>
                </View>
              )}
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
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Icon name="calendar-clock" size={20} color={COLORS.primary} />
            <Text style={styles.infoText}>
              تاريخ المراجعة: {toEnglishNumbers(getCurrentDate())} | {getCurrentTime()}
            </Text>
          </View>
        </View>

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

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ✅ مودال إضافة دفعة */}
      <Modal
        visible={showPaymentModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPaymentModal(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Icon name="cash-plus" size={32} color={COLORS.warning} />
              <Text style={styles.modalTitle}>تسديد دفعة</Text>
            </View>

            <Text style={styles.modalSubtitle}>
              الزبون: {selectedCustomer}
            </Text>

            <Text style={styles.modalBalanceInfo}>
              الرصيد الحالي: {formatCurrency(getCustomerBalance(selectedCustomer || ''))} دينار
            </Text>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalLabel}>المبلغ المدفوع:</Text>
              <TextInput
                style={styles.modalInput}
                value={paymentAmount}
                onChangeText={setPaymentAmount}
                placeholder="0"
                keyboardType="numeric"
                placeholderTextColor={COLORS.textLight}
              />
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalLabel}>تاريخ الدفع:</Text>
              <TextInput
                style={styles.modalInput}
                value={paymentDate}
                onChangeText={setPaymentDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={COLORS.textLight}
              />
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalLabel}>ملاحظات (اختياري):</Text>
              <TextInput
                style={[styles.modalInput, styles.modalTextArea]}
                value={paymentNotes}
                onChangeText={setPaymentNotes}
                placeholder="أضف ملاحظة..."
                placeholderTextColor={COLORS.textLight}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowPaymentModal(false)}
              >
                <Text style={styles.cancelButtonText}>إلغاء</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleAddPayment}
              >
                <Icon name="check" size={20} color="#fff" />
                <Text style={styles.confirmButtonText}>تسديد</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  // ... (استخدم الـ styles الموجودة وأضف هذه الإضافات)
  
  // ✅ Styles جديدة للمودال
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: isTablet ? 32 : 24,
    width: '100%',
    maxWidth: isTablet ? 500 : 400,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: isTablet ? 24 : 20,
  },
  modalTitle: {
    fontSize: isTablet ? 24 : 20,
    fontWeight: '800',
    color: COLORS.textDark,
    marginTop: 12,
  },
  modalSubtitle: {
    fontSize: isTablet ? 18 : 16,
    fontWeight: '700',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 16,
  },
  modalBalanceInfo: {
    fontSize: isTablet ? 16 : 14,
    fontWeight: '600',
    color: COLORS.textMedium,
    textAlign: 'center',
    marginBottom: 24,
    padding: 12,
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 8,
  },
  modalInputGroup: {
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: isTablet ? 15 : 14,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: COLORS.backgroundLight,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: isTablet ? 16 : 14,
    fontSize: isTablet ? 16 : 15,
    color: COLORS.textDark,
  },
  modalTextArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: isTablet ? 16 : 14,
    borderRadius: 12,
    elevation: 3,
  },
  cancelButton: {
    backgroundColor: COLORS.backgroundLight,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  cancelButtonText: {
    fontSize: isTablet ? 16 : 15,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  confirmButton: {
    backgroundColor: COLORS.warning,
  },
  confirmButtonText: {
    fontSize: isTablet ? 16 : 15,
    fontWeight: '700',
    color: '#fff',
  },
  
  // ✅ Styles للدفعات المستقلة
  paymentsSection: {
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    padding: isTablet ? 16 : 14,
    marginBottom: isTablet ? 16 : 14,
    borderWidth: 2,
    borderColor: COLORS.warning,
  },
  paymentsSectionTitle: {
    fontSize: isTablet ? 16 : 14,
    fontWeight: '700',
    color: COLORS.warning,
    marginBottom: 12,
  },
  paymentItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: isTablet ? 12 : 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  paymentInfo: {
    gap: 4,
  },
  paymentAmount: {
    fontSize: isTablet ? 16 : 14,
    fontWeight: '800',
    color: COLORS.warning,
  },
  paymentDate: {
    fontSize: isTablet ? 13 : 12,
    fontWeight: '600',
    color: COLORS.textMedium,
  },
  paymentNotes: {
    fontSize: isTablet ? 12 : 11,
    color: COLORS.textLight,
    fontStyle: 'italic',
  },
  
  // باقي الـ styles من الكود الأصلي
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
  flex: 1,
  minWidth: isTablet ? 180 : 150,
  maxWidth: isTablet ? undefined : '48%',
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
