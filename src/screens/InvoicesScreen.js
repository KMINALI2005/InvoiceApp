// src/screens/InvoicesScreen.js
import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  FlatList,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useDatabase } from '../database/database';
import { formatCurrency, toEnglishNumbers } from '../utils/formatters';
import { COLORS } from '../utils/colors';
import Toast from 'react-native-toast-message';
import { printInvoice, printCustomerStatement } from '../services/printService';
import { shareInvoiceText, shareCustomerStatement, exportInvoicesJSON } from '../services/shareService';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

const InvoicesScreen = ({ navigation }) => {
  const { invoices, deleteInvoice, loading } = useDatabase();
  
  // حالة البحث والفلترة
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, paid, unpaid
  const [expandedCustomers, setExpandedCustomers] = useState(new Set());

  // إحصائيات الفواتير
  const stats = useMemo(() => {
    const totalSales = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const totalPaid = invoices.reduce((sum, inv) => sum + (inv.payment || 0), 0);
    const totalRemaining = invoices.reduce((sum, inv) => {
      const remaining = (inv.total || 0) + (inv.previousBalance || 0) - (inv.payment || 0);
      return sum + remaining;
    }, 0);
    
    const paidInvoices = invoices.filter(inv => {
      const remaining = (inv.total || 0) + (inv.previousBalance || 0) - (inv.payment || 0);
      return remaining <= 0;
    }).length;
    
    const unpaidInvoices = invoices.length - paidInvoices;

    return {
      total: invoices.length,
      totalSales,
      totalPaid,
      totalRemaining,
      paidInvoices,
      unpaidInvoices,
    };
  }, [invoices]);

  // تجميع الفواتير حسب الزبون
  const groupedInvoices = useMemo(() => {
    let filtered = [...invoices];

    // تطبيق الفلتر
    if (filterType === 'paid') {
      filtered = filtered.filter(inv => {
        const remaining = (inv.total || 0) + (inv.previousBalance || 0) - (inv.payment || 0);
        return remaining <= 0;
      });
    } else if (filterType === 'unpaid') {
      filtered = filtered.filter(inv => {
        const remaining = (inv.total || 0) + (inv.previousBalance || 0) - (inv.payment || 0);
        return remaining > 0;
      });
    }

    // تطبيق البحث
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(inv => 
        inv.customer.toLowerCase().includes(query) ||
        String(inv.id).includes(query)
      );
    }

    // التجميع حسب الزبون
    const grouped = {};
    filtered.forEach(inv => {
      if (!grouped[inv.customer]) {
        grouped[inv.customer] = [];
      }
      grouped[inv.customer].push(inv);
    });

    // ترتيب الفواتير داخل كل مجموعة
    Object.keys(grouped).forEach(customer => {
      grouped[customer].sort((a, b) => b.id - a.id);
    });

    return grouped;
  }, [invoices, searchQuery, filterType]);

  const customerNames = Object.keys(groupedInvoices).sort((a, b) => 
    a.localeCompare(b, 'ar')
  );

  // Toggle توسيع مجموعة الزبون
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

  // حذف فاتورة
  const handleDeleteInvoice = (invoiceId, customerName) => {
    Alert.alert(
      'تأكيد الحذف',
      'هل أنت متأكد من حذف هذه الفاتورة؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteInvoice(invoiceId);
              Toast.show({
                type: 'success',
                text1: 'تم الحذف',
                text2: 'تم حذف الفاتورة بنجاح',
                position: 'top',
              });
            } catch (error) {
              Toast.show({
                type: 'error',
                text1: 'فشل الحذف',
                text2: 'حدث خطأ أثناء حذف الفاتورة',
                position: 'top',
              });
            }
          },
        },
      ]
    );
  };

  // طباعة فاتورة
  const handlePrintInvoice = async (invoice) => {
    const result = await printInvoice(invoice);
    
    if (result.success) {
      Toast.show({
        type: 'success',
        text1: 'تمت الطباعة',
        text2: 'تم إرسال الفاتورة للطابعة',
        position: 'top',
      });
    } else {
      Toast.show({
        type: 'error',
        text1: 'فشلت الطباعة',
        text2: result.error || 'حدث خطأ أثناء الطباعة',
        position: 'top',
      });
    }
  };

  // مشاركة فاتورة
  const handleShareInvoice = async (invoice) => {
    const result = await shareInvoiceText(invoice);
    
    if (result.success) {
      Toast.show({
        type: 'success',
        text1: 'تمت المشاركة',
        text2: 'تم مشاركة الفاتورة بنجاح',
        position: 'top',
      });
    } else if (!result.cancelled) {
      Toast.show({
        type: 'error',
        text1: 'فشلت المشاركة',
        text2: result.error || 'حدث خطأ أثناء المشاركة',
        position: 'top',
      });
    }
  };
  
  // طباعة كشف حساب زبون
  const handlePrintCustomerStatement = async (customerName, invoices) => {
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
        text2: result.error || 'حدث خطأ أثناء الطباعة',
        position: 'top',
      });
    }
  };
  
  // مشاركة كشف حساب زبون
  const handleShareCustomerStatement = async (customerName, invoices) => {
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
        text2: result.error || 'حدث خطأ أثناء المشاركة',
        position: 'top',
      });
    }
  };
  
  // تصدير جميع الفواتير
  const handleExportAllInvoices = async () => {
    const result = await exportInvoicesJSON(invoices);
    
    if (result.success) {
      Toast.show({
        type: 'success',
        text1: 'تم التصدير',
        text2: 'تم تصدير الفواتير بنجاح',
        position: 'top',
      });
    } else if (!result.cancelled) {
      Toast.show({
        type: 'error',
        text1: 'فشل التصدير',
        text2: result.error || 'حدث خطأ أثناء التصدير',
        position: 'top',
      });
    }
  };

  // تعديل فاتورة
  const handleEditInvoice = (invoice) => {
    Toast.show({
      type: 'info',
      text1: 'قريباً',
      text2: 'ميزة التعديل قيد التطوير',
      position: 'top',
    });
  };

  // عرض بطاقة الإحصائيات
  const StatCard = ({ icon, label, value, color, bgColor }) => (
    <View style={[styles.statCard, { backgroundColor: bgColor }]}>
      <View style={[styles.statIconContainer, { backgroundColor: color }]}>
        <Icon name={icon} size={isTablet ? 28 : 24} color="#fff" />
      </View>
      <View style={styles.statContent}>
        <Text style={[styles.statValue, { color }]}>
          {value}
        </Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </View>
  );

  // عرض فاتورة واحدة
  const InvoiceCard = ({ invoice, customerName }) => {
    const remaining = (invoice.total || 0) + (invoice.previousBalance || 0) - (invoice.payment || 0);
    const isPaid = remaining <= 0;
    const statusColor = isPaid ? COLORS.success : COLORS.danger;

    return (
      <View style={[styles.invoiceCard, { borderLeftColor: statusColor }]}>
        {/* معلومات الفاتورة الأساسية */}
        <View style={styles.invoiceHeader}>
          <View style={styles.invoiceMainInfo}>
            <View style={styles.invoiceIdBadge}>
              <Text style={styles.invoiceIdText}>#{toEnglishNumbers(invoice.id)}</Text>
            </View>
            <View style={styles.invoiceDateContainer}>
              <Icon name="calendar" size={16} color={COLORS.textLight} />
              <Text style={styles.invoiceDate}>{toEnglishNumbers(invoice.date)}</Text>
            </View>
          </View>
          
          <View style={[styles.statusBadge, { backgroundColor: isPaid ? COLORS.success : COLORS.danger }]}>
            <Icon name={isPaid ? "check-circle" : "alert-circle"} size={14} color="#fff" />
            <Text style={styles.statusText}>
              {isPaid ? 'مسددة' : 'غير مسددة'}
            </Text>
          </View>
        </View>

        {/* تفاصيل المبالغ */}
        <View style={styles.invoiceDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>المجموع:</Text>
            <Text style={styles.detailValue}>{formatCurrency(invoice.total)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>الواصل:</Text>
            <Text style={[styles.detailValue, { color: COLORS.success }]}>
              {formatCurrency(invoice.payment)}
            </Text>
          </View>
          <View style={[styles.detailRow, styles.remainingRow]}>
            <Text style={[styles.detailLabel, styles.remainingLabel]}>المتبقي:</Text>
            <Text style={[styles.detailValue, styles.remainingValue, { color: statusColor }]}>
              {formatCurrency(remaining)}
            </Text>
          </View>
        </View>

        {/* عدد المنتجات */}
        <View style={styles.itemsCountContainer}>
          <Icon name="package-variant" size={16} color={COLORS.primary} />
          <Text style={styles.itemsCountText}>
            {toEnglishNumbers(invoice.items?.length || 0)} منتج
          </Text>
        </View>

        {/* أزرار الإجراءات */}
        <View style={styles.invoiceActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.printButton]}
            onPress={() => handlePrintInvoice(invoice)}
          >
            <Icon name="printer" size={18} color="#fff" />
            <Text style={styles.actionButtonText}>طباعة</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.shareButton]}
            onPress={() => handleShareInvoice(invoice)}
          >
            <Icon name="share-variant" size={18} color="#fff" />
            <Text style={styles.actionButtonText}>مشاركة</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={() => handleEditInvoice(invoice)}
          >
            <Icon name="pencil" size={18} color="#fff" />
            <Text style={styles.actionButtonText}>تعديل</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDeleteInvoice(invoice.id, customerName)}
          >
            <Icon name="delete" size={18} color="#fff" />
            <Text style={styles.actionButtonText}>حذف</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // عرض مجموعة الزبون
  const CustomerGroup = ({ customerName, invoices }) => {
    const isExpanded = expandedCustomers.has(customerName);
    const latestInvoice = invoices[0];
    const finalRemaining = (latestInvoice.total || 0) + 
      (latestInvoice.previousBalance || 0) - 
      (latestInvoice.payment || 0);
    
    const totalInvoicesAmount = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const statusColor = finalRemaining > 0 ? COLORS.danger : 
                       finalRemaining < 0 ? COLORS.success : 
                       COLORS.textLight;

    return (
      <View style={styles.customerGroup}>
        {/* هيدر المجموعة */}
        <TouchableOpacity
          style={[styles.customerHeader, { borderColor: statusColor }]}
          onPress={() => toggleCustomerExpansion(customerName)}
          activeOpacity={0.7}
        >
          <View style={styles.customerMainInfo}>
            <View style={styles.customerNameContainer}>
              <Icon name="account" size={24} color={COLORS.primary} />
              <Text style={styles.customerName}>{customerName}</Text>
            </View>
            
            <Icon 
              name={isExpanded ? "chevron-up" : "chevron-down"} 
              size={28} 
              color={COLORS.primary} 
            />
          </View>

          <View style={styles.customerStats}>
            <View style={styles.customerStat}>
              <Icon name="receipt" size={16} color={COLORS.textLight} />
              <Text style={styles.customerStatText}>
                {toEnglishNumbers(invoices.length)} فاتورة
              </Text>
            </View>

            <View style={styles.customerStat}>
              <Icon name="cash-multiple" size={16} color={COLORS.textLight} />
              <Text style={styles.customerStatText}>
                إجمالي: {formatCurrency(totalInvoicesAmount)}
              </Text>
            </View>

            <View style={[styles.customerStat, styles.remainingStat]}>
              <Icon name="alert-circle" size={16} color={statusColor} />
              <Text style={[styles.customerStatText, { color: statusColor, fontWeight: '700' }]}>
                متبقي: {formatCurrency(finalRemaining)}
              </Text>
            </View>
          </View>
          
          {/* أزرار إجراءات الزبون */}
          <View style={styles.customerActions}>
            <TouchableOpacity
              style={[styles.customerActionButton, { backgroundColor: COLORS.success }]}
              onPress={(e) => {
                e.stopPropagation();
                handlePrintCustomerStatement(customerName, invoices);
              }}
            >
              <Icon name="printer" size={16} color="#fff" />
              <Text style={styles.customerActionText}>طباعة كشف</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.customerActionButton, { backgroundColor: COLORS.accent }]}
              onPress={(e) => {
                e.stopPropagation();
                handleShareCustomerStatement(customerName, invoices);
              }}
            >
              <Icon name="share-variant" size={16} color="#fff" />
              <Text style={styles.customerActionText}>مشاركة كشف</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        {/* قائمة الفواتير */}
        {isExpanded && (
          <View style={styles.invoicesList}>
            {invoices.map((invoice) => (
              <InvoiceCard 
                key={invoice.id} 
                invoice={invoice} 
                customerName={customerName}
              />
            ))}
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
        <Text style={styles.headerTitle}>قائمة الفواتير</Text>
        <View style={styles.counterBadge}>
          <Text style={styles.counterText}>{toEnglishNumbers(stats.total)}</Text>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* الإحصائيات */}
        <View style={styles.statsContainer}>
          <View style={styles.statsGrid}>
            <StatCard
              icon="receipt-text"
              label="إجمالي الفواتير"
              value={toEnglishNumbers(stats.total)}
              color={COLORS.primary}
              bgColor="#f0fdfa"
            />
            <StatCard
              icon="cash-multiple"
              label="إجمالي المبيعات"
              value={formatCurrency(stats.totalSales)}
              color={COLORS.primary}
              bgColor="#f0fdfa"
            />
            <StatCard
              icon="check-circle"
              label="المدفوعات"
              value={formatCurrency(stats.totalPaid)}
              color={COLORS.success}
              bgColor="#f0fdf4"
            />
            <StatCard
              icon="alert-circle"
              label="المتبقي"
              value={formatCurrency(stats.totalRemaining)}
              color={COLORS.danger}
              bgColor="#fef2f2"
            />
            <StatCard
              icon="check-all"
              label="فواتير مسددة"
              value={toEnglishNumbers(stats.paidInvoices)}
              color={COLORS.success}
              bgColor="#f0fdf4"
            />
            <StatCard
              icon="clock-alert"
              label="غير مسددة"
              value={toEnglishNumbers(stats.unpaidInvoices)}
              color={COLORS.warning}
              bgColor="#fffbeb"
            />
          </View>
        </View>

        {/* أزرار الفلترة */}
        <View style={styles.filtersContainer}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              filterType === 'all' && styles.activeFilterButton
            ]}
            onPress={() => setFilterType('all')}
          >
            <Icon 
              name="view-list" 
              size={18} 
              color={filterType === 'all' ? '#fff' : COLORS.primary} 
            />
            <Text style={[
              styles.filterButtonText,
              filterType === 'all' && styles.activeFilterButtonText
            ]}>
              الكل
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              filterType === 'unpaid' && styles.activeFilterButton
            ]}
            onPress={() => setFilterType('unpaid')}
          >
            <Icon 
              name="alert-circle" 
              size={18} 
              color={filterType === 'unpaid' ? '#fff' : COLORS.danger} 
            />
            <Text style={[
              styles.filterButtonText,
              filterType === 'unpaid' && styles.activeFilterButtonText
            ]}>
              غير مسددة
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              filterType === 'paid' && styles.activeFilterButton
            ]}
            onPress={() => setFilterType('paid')}
          >
            <Icon 
              name="check-circle" 
              size={18} 
              color={filterType === 'paid' ? '#fff' : COLORS.success} 
            />
            <Text style={[
              styles.filterButtonText,
              filterType === 'paid' && styles.activeFilterButtonText
            ]}>
              مسددة
            </Text>
          </TouchableOpacity>
        </View>

        {/* شريط البحث */}
        <View style={styles.searchContainer}>
          <Icon name="magnify" size={22} color={COLORS.textLight} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="ابحث باسم الزبون أو رقم الفاتورة..."
            placeholderTextColor={COLORS.textLight}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="close-circle" size={22} color={COLORS.textLight} />
            </TouchableOpacity>
          )}
        </View>
        
        {/* أزرار الإجراءات العامة */}
        {invoices.length > 0 && (
          <View style={styles.generalActions}>
            <TouchableOpacity
              style={[styles.generalActionButton, { backgroundColor: COLORS.primary }]}
              onPress={handleExportAllInvoices}
            >
              <Icon name="download" size={20} color="#fff" />
              <Text style={styles.generalActionText}>
                تصدير الكل ({toEnglishNumbers(invoices.length)})
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* قائمة الفواتير المجمعة */}
        {customerNames.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="receipt-text-off" size={64} color={COLORS.textLight} />
            <Text style={styles.emptyTitle}>لا توجد فواتير</Text>
            <Text style={styles.emptyText}>
              {searchQuery || filterType !== 'all' 
                ? 'لا توجد نتائج تطابق البحث'
                : 'ابدأ بإنشاء فاتورة جديدة'}
            </Text>
          </View>
        ) : (
          <View style={styles.groupsContainer}>
            {customerNames.map((customerName) => (
              <CustomerGroup
                key={customerName}
                customerName={customerName}
                invoices={groupedInvoices[customerName]}
              />
            ))}
          </View>
        )}

        {/* مساحة إضافية للتمرير */}
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
    justifyContent: 'space-between',
    alignItems: 'center',
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
    paddingHorizontal: isTablet ? 16 : 12,
    paddingVertical: isTablet ? 10 : 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#fff',
  },
  counterText: {
    color: '#fff',
    fontSize: isTablet ? 20 : 16,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    padding: isTablet ? 24 : 16,
  },
  statsContainer: {
    marginBottom: isTablet ? 24 : 16,
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
    padding: isTablet ? 16 : 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    gap: 12,
  },
  statIconContainer: {
    width: isTablet ? 48 : 40,
    height: isTablet ? 48 : 40,
    borderRadius: isTablet ? 24 : 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: isTablet ? 22 : 18,
    fontWeight: '800',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: isTablet ? 13 : 11,
    color: COLORS.textLight,
    fontWeight: '600',
  },
  filtersContainer: {
    flexDirection: 'row',
    gap: isTablet ? 12 : 8,
    marginBottom: isTablet ? 20 : 16,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: isTablet ? 14 : 12,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  activeFilterButton: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterButtonText: {
    fontSize: isTablet ? 15 : 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  activeFilterButtonText: {
    color: '#fff',
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
    marginBottom: isTablet ? 24 : 16,
  },
  searchInput: {
    flex: 1,
    fontSize: isTablet ? 16 : 14,
    color: COLORS.textDark,
    padding: isTablet ? 12 : 10,
  },
  groupsContainer: {
    gap: isTablet ? 16 : 12,
  },
  customerGroup: {
    marginBottom: isTablet ? 16 : 12,
  },
  customerHeader: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: isTablet ? 20 : 16,
    borderWidth: 2,
    borderLeftWidth: 4,
    elevation: 3,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  customerMainInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: isTablet ? 16 : 12,
  },
  customerNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  customerName: {
    fontSize: isTablet ? 22 : 18,
    fontWeight: '700',
    color: COLORS.textDark,
    flex: 1,
  },
  customerStats: {
    flexDirection: isTablet ? 'row' : 'column',
    gap: isTablet ? 16 : 8,
  },
  customerStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.backgroundLight,
    paddingHorizontal: isTablet ? 12 : 10,
    paddingVertical: isTablet ? 8 : 6,
    borderRadius: 8,
    flex: isTablet ? 1 : 0,
  },
  remainingStat: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  customerStatText: {
    fontSize: isTablet ? 14 : 12,
    color: COLORS.textMedium,
    fontWeight: '600',
  },
  customerActions: {
    flexDirection: 'row',
    gap: isTablet ? 10 : 8,
    marginTop: isTablet ? 16 : 12,
  },
  customerActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: isTablet ? 10 : 8,
    paddingHorizontal: isTablet ? 12 : 10,
    borderRadius: 8,
  },
  customerActionText: {
    color: '#fff',
    fontSize: isTablet ? 13 : 11,
    fontWeight: '700',
  },
  invoicesList: {
    marginTop: isTablet ? 12 : 8,
    paddingLeft: isTablet ? 16 : 12,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
    gap: isTablet ? 12 : 8,
  },
  invoiceCard: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 12,
    padding: isTablet ? 16 : 14,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderLeftWidth: 4,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: isTablet ? 14 : 12,
  },
  invoiceMainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  invoiceIdBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: isTablet ? 12 : 10,
    paddingVertical: isTablet ? 6 : 4,
    borderRadius: 8,
  },
  invoiceIdText: {
    color: '#fff',
    fontSize: isTablet ? 14 : 12,
    fontWeight: '700',
  },
  invoiceDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  invoiceDate: {
    fontSize: isTablet ? 14 : 12,
    color: COLORS.textMedium,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: isTablet ? 12 : 10,
    paddingVertical: isTablet ? 6 : 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: isTablet ? 13 : 11,
    fontWeight: '700',
  },
  invoiceDetails: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: isTablet ? 14 : 12,
    marginBottom: isTablet ? 12 : 10,
    gap: isTablet ? 10 : 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: isTablet ? 15 : 13,
    color: COLORS.textMedium,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: isTablet ? 16 : 14,
    color: COLORS.textDark,
    fontWeight: '700',
  },
  remainingRow: {
    paddingTop: isTablet ? 10 : 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  remainingLabel: {
    fontSize: isTablet ? 16 : 14,
    fontWeight: '700',
  },
  remainingValue: {
    fontSize: isTablet ? 18 : 16,
    fontWeight: '800',
  },
  itemsCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    paddingHorizontal: isTablet ? 12 : 10,
    paddingVertical: isTablet ? 8 : 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: isTablet ? 12 : 10,
  },
  itemsCountText: {
    fontSize: isTablet ? 14 : 12,
    color: COLORS.primary,
    fontWeight: '700',
  },
  invoiceActions: {
    flexDirection: 'row',
    gap: isTablet ? 10 : 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: isTablet ? 10 : 8,
    borderRadius: 8,
  },
  printButton: {
    backgroundColor: COLORS.success,
  },
  shareButton: {
    backgroundColor: COLORS.accent,
  },
  editButton: {
    backgroundColor: COLORS.primary,
  },
  deleteButton: {
    backgroundColor: COLORS.danger,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: isTablet ? 13 : 11,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: isTablet ? 80 : 60,
    paddingHorizontal: isTablet ? 40 : 20,
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

export default InvoicesScreen;
