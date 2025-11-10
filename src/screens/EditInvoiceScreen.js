// src/screens/EditInvoiceScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useDatabase } from '../database/database';
import { formatCurrency, toEnglishNumbers, getCurrentDate } from '../utils/formatters';
import { COLORS } from '../utils/colors';
import Toast from 'react-native-toast-message';

const EditInvoiceScreen = ({ route, navigation }) => {
  const { invoice } = route.params;
  const { products, updateInvoice, saveProduct } = useDatabase();
  
  // البيانات الأساسية
  const [customerName, setCustomerName] = useState(invoice.customer || '');
  const [invoiceDate, setInvoiceDate] = useState(invoice.date || getCurrentDate());
  
  // بيانات المنتج الحالي
  const [productName, setProductName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [itemNotes, setItemNotes] = useState('');
  
  // قائمة المنتجات في الفاتورة
  const [invoiceItems, setInvoiceItems] = useState(invoice.items || []);
  
  // المبالغ المالية
  const [previousBalance, setPreviousBalance] = useState(String(invoice.previousBalance || 0));
  const [paymentAmount, setPaymentAmount] = useState(String(invoice.payment || 0));
  
  // حالة البحث والاقتراحات
  const [showProductSuggestions, setShowProductSuggestions] = useState(false);
  const [filteredProducts, setFilteredProducts] = useState([]);
  
  // حالة التعديل
  const [isEditingItem, setIsEditingItem] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState(null);

  const productNameInputRef = useRef(null);

  // إضافة تأكيد عند الخروج إذا كانت هناك تعديلات
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!hasChanges) {
        return;
      }

      e.preventDefault();

      Alert.alert(
        'تجاهل التغييرات؟',
        'لديك تعديلات لم يتم حفظها. هل تريد تجاهلها؟',
        [
          { text: 'البقاء', style: 'cancel', onPress: () => {} },
          {
            text: 'تجاهل',
            style: 'destructive',
            onPress: () => navigation.dispatch(e.data.action),
          },
        ]
      );
    });

    return unsubscribe;
  }, [navigation, hasChanges]);

  // مراقبة التغييرات
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const originalData = JSON.stringify({
      customer: invoice.customer,
      date: invoice.date,
      items: invoice.items,
      previousBalance: invoice.previousBalance,
      payment: invoice.payment,
    });

    const currentData = JSON.stringify({
      customer: customerName,
      date: invoiceDate,
      items: invoiceItems,
      previousBalance: parseFloat(previousBalance || 0),
      payment: parseFloat(paymentAmount || 0),
    });

    setHasChanges(originalData !== currentData);
  }, [customerName, invoiceDate, invoiceItems, previousBalance, paymentAmount]);

  // الحسابات
  const lineTotal = parseFloat(quantity || 0) * parseFloat(price || 0);
  const currentTotal = invoiceItems.reduce((sum, item) => sum + item.total, 0);
  const finalRemaining = 
    currentTotal + 
    parseFloat(previousBalance || 0) - 
    parseFloat(paymentAmount || 0);

  // البحث عن المنتجات
  useEffect(() => {
    if (productName.trim().length > 0) {
      const filtered = products.filter(p =>
        p.name.toLowerCase().includes(productName.toLowerCase())
      );
      setFilteredProducts(filtered);
      setShowProductSuggestions(filtered.length > 0);
    } else {
      setShowProductSuggestions(false);
    }
  }, [productName, products]);

  const selectProduct = (product) => {
    setProductName(product.name);
    setPrice(product.price.toString());
    setShowProductSuggestions(false);
  };

  const addItemToInvoice = async () => {
    if (!productName.trim() || !quantity || !price) {
      Toast.show({
        type: 'error',
        text1: 'خطأ',
        text2: 'يرجى إدخال اسم المنتج والكمية والسعر',
        position: 'top',
        visibilityTime: 2000,
      });
      return;
    }

    const qty = parseFloat(quantity);
    const prc = parseFloat(price);

    if (qty <= 0 || prc <= 0) {
      Toast.show({
        type: 'error',
        text1: 'خطأ',
        text2: 'الكمية والسعر يجب أن يكونا أكبر من صفر',
        position: 'top',
        visibilityTime: 2000,
      });
      return;
    }

    try {
      await saveProduct({
        name: productName.trim(),
        price: prc,
      });
    } catch (error) {
      console.error('Error saving product:', error);
    }

    const newItem = {
      product: productName.trim(),
      quantity: qty,
      price: prc,
      total: qty * prc,
      notes: itemNotes.trim(),
    };

    if (isEditingItem) {
      const updatedItems = [...invoiceItems];
      updatedItems[editingItemIndex] = newItem;
      setInvoiceItems(updatedItems);
      setIsEditingItem(false);
      setEditingItemIndex(null);
      
      Toast.show({
        type: 'success',
        text1: 'تم التحديث',
        text2: 'تم تحديث المنتج بنجاح',
        position: 'top',
        visibilityTime: 1500,
      });
    } else {
      setInvoiceItems([...invoiceItems, newItem]);
      
      Toast.show({
        type: 'success',
        text1: '✅ تمت الإضافة',
        text2: `${productName.trim()}`,
        position: 'top',
        visibilityTime: 1500,
      });
    }

    clearItemFields();
    
    setTimeout(() => {
      if (productNameInputRef.current) {
        productNameInputRef.current.focus();
      }
    }, 100);
  };

  const clearItemFields = () => {
    setProductName('');
    setQuantity('');
    setPrice('');
    setItemNotes('');
  };

  const editItem = (index) => {
    const item = invoiceItems[index];
    setProductName(item.product);
    setQuantity(item.quantity.toString());
    setPrice(item.price.toString());
    setItemNotes(item.notes || '');
    setIsEditingItem(true);
    setEditingItemIndex(index);
  };

  const removeItem = (index) => {
    Alert.alert(
      'تأكيد الحذف',
      'هل أنت متأكد من حذف هذا المنتج؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: () => {
            const updatedItems = invoiceItems.filter((_, i) => i !== index);
            setInvoiceItems(updatedItems);
            
            Toast.show({
              type: 'info',
              text1: 'تم الحذف',
              text2: 'تم حذف المنتج من الفاتورة',
              position: 'top',
            });
          },
        },
      ]
    );
  };

  const cancelEdit = () => {
    setIsEditingItem(false);
    setEditingItemIndex(null);
    clearItemFields();
  };

  const handleUpdateInvoice = async () => {
    if (!customerName.trim()) {
      Toast.show({
        type: 'error',
        text1: 'خطأ',
        text2: 'يرجى إدخال اسم الزبون',
        position: 'top',
      });
      return;
    }

    if (invoiceItems.length === 0) {
      Toast.show({
        type: 'error',
        text1: 'خطأ',
        text2: 'لا يمكن حفظ فاتورة فارغة',
        position: 'top',
      });
      return;
    }

    setIsSaving(true); // بدء التحميل

    try {
      const updatedInvoice = {
        customer: customerName.trim(),
        date: invoiceDate,
        items: invoiceItems,
        total: currentTotal,
        previousBalance: parseFloat(previousBalance || 0),
        payment: parseFloat(paymentAmount || 0),
      };

      await updateInvoice(invoice.id, updatedInvoice);

      Toast.show({
        type: 'success',
        text1: 'تم التحديث! 🎉',
        text2: 'تم تحديث الفاتورة بنجاح',
        position: 'top',
        visibilityTime: 2000,
      });

      setHasChanges(false); // إلغاء تتبع التغييرات

      setTimeout(() => {
        navigation.goBack();
      }, 500);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'فشل التحديث',
        text2: 'حدث خطأ أثناء تحديث الفاتورة',
        position: 'top',
      });
    } finally {
      setIsSaving(false); // إنهاء التحميل
    }
  };

  const renderInvoiceItem = ({ item, index }) => (
    <View style={styles.invoiceItem}>
      <View style={styles.itemHeader}>
        <View style={styles.itemNumberBadge}>
          <Text style={styles.itemNumberText}>{index + 1}</Text>
        </View>
        <Text style={styles.itemProductName}>{item.product}</Text>
      </View>

      <View style={styles.itemDetails}>
        <View style={styles.itemDetailRow}>
          <Text style={styles.itemLabel}>الكمية:</Text>
          <Text style={styles.itemValue}>{toEnglishNumbers(item.quantity)}</Text>
        </View>
        <View style={styles.itemDetailRow}>
          <Text style={styles.itemLabel}>السعر:</Text>
          <Text style={styles.itemValue}>{formatCurrency(item.price)}</Text>
        </View>
        <View style={styles.itemDetailRow}>
          <Text style={styles.itemLabel}>المجموع:</Text>
          <Text style={[styles.itemValue, styles.itemTotal]}>
            {formatCurrency(item.total)}
          </Text>
        </View>
      </View>

      {item.notes ? (
        <View style={styles.itemNotesContainer}>
          <Icon name="note-text" size={14} color={COLORS.textLight} />
          <Text style={styles.itemNotes}>{item.notes}</Text>
        </View>
      ) : null}

      <View style={styles.itemActions}>
        <TouchableOpacity
          style={[styles.itemActionButton, styles.editButton]}
          onPress={() => editItem(index)}
        >
          <Icon name="pencil" size={18} color="#fff" />
          <Text style={styles.itemActionText}>تعديل</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.itemActionButton, styles.deleteButton]}
          onPress={() => removeItem(index)}
        >
          <Icon name="delete" size={18} color="#fff" />
          <Text style={styles.itemActionText}>حذف</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* الهيدر */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-right" size={28} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>تعديل الفاتورة</Text>
          <Text style={styles.headerSubtitle}>
            رقم #{toEnglishNumbers(invoice.id)}
          </Text>
        </View>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* معلومات الفاتورة الأساسية */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>معلومات الزبون</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>اسم الزبون:</Text>
            <TextInput
              style={styles.input}
              value={customerName}
              onChangeText={setCustomerName}
              placeholder="أدخل اسم الزبون"
              placeholderTextColor={COLORS.textLight}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>تاريخ الفاتورة:</Text>
            <TextInput
              style={styles.input}
              value={invoiceDate}
              onChangeText={setInvoiceDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={COLORS.textLight}
            />
          </View>
        </View>

        {/* إضافة منتج */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {isEditingItem ? '✏️ تعديل المنتج' : '➕ إضافة منتج'}
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>اسم المنتج:</Text>
            <View style={styles.autocompleteContainer}>
              <TextInput
                ref={productNameInputRef}
                style={styles.input}
                value={productName}
                onChangeText={setProductName}
                placeholder="ابحث عن منتج أو أدخل اسم جديد"
                placeholderTextColor={COLORS.textLight}
                onFocus={() => productName && setShowProductSuggestions(true)}
                returnKeyType="next"
              />
              
              {showProductSuggestions && (
                <View style={styles.suggestionsContainer}>
                  {filteredProducts.map((product) => (
                    <TouchableOpacity
                      key={product.id}
                      style={styles.suggestionItem}
                      onPress={() => selectProduct(product)}
                    >
                      <Text style={styles.suggestionName}>{product.name}</Text>
                      <Text style={styles.suggestionPrice}>
                        {formatCurrency(product.price)} دينار
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.flex1]}>
              <Text style={styles.label}>الكمية:</Text>
              <TextInput
                style={styles.input}
                value={quantity}
                onChangeText={setQuantity}
                placeholder="0"
                keyboardType="numeric"
                placeholderTextColor={COLORS.textLight}
                returnKeyType="next"
              />
            </View>

            <View style={[styles.inputGroup, styles.flex1]}>
              <Text style={styles.label}>السعر:</Text>
              <TextInput
                style={styles.input}
                value={price}
                onChangeText={setPrice}
                placeholder="0"
                keyboardType="numeric"
                placeholderTextColor={COLORS.textLight}
                returnKeyType="done"
                onSubmitEditing={addItemToInvoice}
              />
            </View>
          </View>

          <View style={styles.lineTotalCard}>
            <Text style={styles.lineTotalLabel}>المجموع:</Text>
            <Text style={styles.lineTotalValue}>
              {formatCurrency(lineTotal)} دينار
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>ملاحظات (اختياري):</Text>
            <TextInput
              style={styles.input}
              value={itemNotes}
              onChangeText={setItemNotes}
              placeholder="أضف ملاحظة للمنتج"
              placeholderTextColor={COLORS.textLight}
              returnKeyType="done"
              onSubmitEditing={addItemToInvoice}
            />
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={addItemToInvoice}
            >
              <Icon 
                name={isEditingItem ? "check" : "plus"} 
                size={20} 
                color="#fff" 
              />
              <Text style={styles.buttonText}>
                {isEditingItem ? 'تحديث المنتج' : 'إضافة المنتج'}
              </Text>
            </TouchableOpacity>

            {isEditingItem && (
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={cancelEdit}
              >
                <Icon name="close" size={20} color={COLORS.primary} />
                <Text style={[styles.buttonText, styles.secondaryButtonText]}>
                  إلغاء
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* قائمة المنتجات */}
        {invoiceItems.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>المنتجات المضافة</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {invoiceItems.length}
                </Text>
              </View>
            </View>

            <FlatList
              data={invoiceItems}
              renderItem={renderInvoiceItem}
              keyExtractor={(item, index) => `item-${index}`}
              scrollEnabled={false}
            />
          </View>
        )}

        {/* ملخص الفاتورة */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ملخص الفاتورة</Text>

          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>إجمالي الفاتورة الحالية:</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(currentTotal)} دينار
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>عدد المنتجات:</Text>
              <Text style={styles.summaryValue}>
                {toEnglishNumbers(invoiceItems.length)}
              </Text>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>الحساب السابق:</Text>
            <TextInput
              style={styles.input}
              value={previousBalance}
              onChangeText={setPreviousBalance}
              placeholder="0"
              keyboardType="numeric"
              placeholderTextColor={COLORS.textLight}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>المبلغ الواصل:</Text>
            <TextInput
              style={styles.input}
              value={paymentAmount}
              onChangeText={setPaymentAmount}
              placeholder="0"
              keyboardType="numeric"
              placeholderTextColor={COLORS.textLight}
            />
          </View>

          <View style={[styles.summaryCard, styles.finalCard]}>
            <Text style={styles.finalLabel}>المبلغ المتبقي النهائي:</Text>
            <Text style={[
              styles.finalValue,
              finalRemaining > 0 ? styles.debtValue : styles.creditValue
            ]}>
              {formatCurrency(finalRemaining)} دينار
            </Text>
          </View>
        </View>

        {/* أزرار الإجراءات */}
        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={[styles.button, styles.updateButton]}
            onPress={handleUpdateInvoice}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Icon name="content-save" size={22} color="#fff" />
            )}
            <Text style={styles.buttonText}>
              {isSaving ? 'جاري الحفظ...' : 'حفظ التعديلات'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.cancelButtonStyle]}
            onPress={() => navigation.goBack()}
          >
            <Icon name="close" size={22} color="#fff" />
            <Text style={styles.buttonText}>إلغاء</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundSoft,
  },
  header: {
    backgroundColor: COLORS.primary,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  backButton: {
    padding: 4,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#f0fdfa',
    fontWeight: '600',
    marginTop: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 16,
  },
  badge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textDark,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.backgroundLight,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: COLORS.textDark,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  flex1: {
    flex: 1,
  },
  autocompleteContainer: {
    position: 'relative',
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 12,
    marginTop: 4,
    maxHeight: 200,
    zIndex: 1000,
    elevation: 5,
  },
  suggestionItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.backgroundLight,
  },
  suggestionName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  suggestionPrice: {
    fontSize: 13,
    color: COLORS.success,
    fontWeight: '700',
    marginTop: 4,
  },
  lineTotalCard: {
    backgroundColor: COLORS.backgroundLight,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  lineTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  lineTotalValue: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primary,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
    elevation: 3,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  secondaryButtonText: {
    color: COLORS.primary,
  },
  invoiceItem: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  itemNumberBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemNumberText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  itemProductName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  itemDetailRow: {
    flex: 1,
  },
  itemLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  itemValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  itemNotesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  itemNotes: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textMedium,
    fontStyle: 'italic',
  },
  itemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  itemActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 10,
    borderRadius: 8,
  },
  editButton: {
    backgroundColor: COLORS.success,
  },
  deleteButton: {
    backgroundColor: COLORS.danger,
  },
  itemActionText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  summaryCard: {
    backgroundColor: COLORS.backgroundLight,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  finalCard: {
    backgroundColor: '#fff',
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  finalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 8,
    textAlign: 'center',
  },
  finalValue: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  debtValue: {
    color: COLORS.danger,
  },
  creditValue: {
    color: COLORS.success,
  },
  actionsSection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  updateButton: {
    backgroundColor: COLORS.primary,
  },
  cancelButtonStyle: {
    backgroundColor: COLORS.danger,
  },
});

export default EditInvoiceScreen;
