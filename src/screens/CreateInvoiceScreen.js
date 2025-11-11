// src/screens/CreateInvoiceScreen.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useDatabase } from '../database/database';
import { useInvoiceDraft } from '../context/InvoiceDraftContext';
import { formatCurrency, toEnglishNumbers, getCurrentDate } from '../utils/formatters';
import { COLORS, GRADIENTS } from '../utils/colors';
import Toast from 'react-native-toast-message';

const CreateInvoiceScreen = ({ navigation }) => {
  const { draftInvoice, saveDraft, clearDraft, hasDraft, isLoading } = useInvoiceDraft();
  
  // البيانات الأساسية
  const { products, invoices, saveInvoice, saveProduct } = useDatabase();
  const productNameInputRef = useRef(null);
  const quantityInputRef = useRef(null);
  const priceInputRef = useRef(null);
  const customerNameInputRef = useRef(null);
  const [customerName, setCustomerName] = useState(draftInvoice.customerName || '');
  const [invoiceDate, setInvoiceDate] = useState(draftInvoice.invoiceDate || getCurrentDate());
  
  // بيانات المنتج الحالي
  const [productName, setProductName] = useState(draftInvoice.productName || '');
  const [quantity, setQuantity] = useState(draftInvoice.quantity || '');
  const [price, setPrice] = useState(draftInvoice.price || '');
  const [itemNotes, setItemNotes] = useState(draftInvoice.itemNotes || '');
  
  // قائمة المنتجات في الفاتورة
  const [invoiceItems, setInvoiceItems] = useState(draftInvoice.invoiceItems || []);
  
  // المبالغ المالية
  const [previousBalance, setPreviousBalance] = useState(draftInvoice.previousBalance || '');
  const [paymentAmount, setPaymentAmount] = useState(draftInvoice.paymentAmount || '');
  
  // حالة البحث والاقتراحات
  const [showProductSuggestions, setShowProductSuggestions] = useState(false);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  
  // حالة التعديل
  const [isEditingItem, setIsEditingItem] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState(null);

  // الحسابات
  const lineTotal = parseFloat(quantity || 0) * parseFloat(price || 0);
  const currentTotal = invoiceItems.reduce((sum, item) => sum + item.total, 0);
  const finalRemaining = 
    currentTotal + 
    parseFloat(previousBalance || 0) - 
    parseFloat(paymentAmount || 0);

  // حفظ المسودة تلقائياً عند أي تغيير
  useEffect(() => {
    if (isLoading) return; // لا تحفظ أثناء التحميل
    
    const draft = {
      customerName,
      invoiceDate,
      productName,
      quantity,
      price,
      itemNotes,
      invoiceItems,
      previousBalance,
      paymentAmount,
    };
    
    // حفظ بعد 1 ثانية من آخر تغيير (debounce)
    const timer = setTimeout(() => {
      saveDraft(draft);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [
    customerName,
    invoiceDate,
    productName,
    quantity,
    price,
    itemNotes,
    invoiceItems,
    previousBalance,
    paymentAmount,
    isLoading,
    saveDraft,
  ]);

  // تحديث الحالة عند تحميل المسودة
  useEffect(() => {
    if (!isLoading && draftInvoice) {
      setCustomerName(draftInvoice.customerName || '');
      setInvoiceDate(draftInvoice.invoiceDate || getCurrentDate());
      setProductName(draftInvoice.productName || '');
      setQuantity(draftInvoice.quantity || '');
      setPrice(draftInvoice.price || '');
      setItemNotes(draftInvoice.itemNotes || '');
      setInvoiceItems(draftInvoice.invoiceItems || []);
      setPreviousBalance(draftInvoice.previousBalance || '');
      setPaymentAmount(draftInvoice.paymentAmount || '');
    }
  }, [isLoading, draftInvoice]);

  // البحث عن المنتجات
  useEffect(() => {
    if (productName.trim().length > 0) {
      const filtered = products.filter(p =>
        p.name.toLowerCase().includes(productName.toLowerCase())
      );
      setFilteredProducts(filtered);
      setShowProductSuggestions(filtered.length > 0);
      
      // إذا كان هناك تطابق تام واحد فقط، اختره تلقائياً
      if (filtered.length === 1 && filtered[0].name.toLowerCase() === productName.toLowerCase()) {
        selectProduct(filtered[0]);
      }
    } else {
      setShowProductSuggestions(false);
    }
  }, [productName, products]);

  // البحث عن الزبائن
  useEffect(() => {
    if (customerName.trim().length > 0) {
      // استخراج أسماء الزبائن الفريدة من الفواتير
      const uniqueCustomers = [...new Set(invoices.map(inv => inv.customer))];
      const filtered = uniqueCustomers.filter(name =>
        name.toLowerCase().includes(customerName.toLowerCase())
      );
      setFilteredCustomers(filtered);
      setShowCustomerSuggestions(filtered.length > 0);
      
      // إذا كان هناك تطابق تام واحد فقط، اختره تلقائياً
      if (filtered.length === 1 && filtered[0].toLowerCase() === customerName.toLowerCase()) {
        selectCustomer(filtered[0]);
      }
    } else {
      setShowCustomerSuggestions(false);
    }
  }, [customerName, invoices, selectCustomer]);

  // اختيار منتج من الاقتراحات
  const selectProduct = (product) => {
    setProductName(product.name);
    setPrice(product.price.toString());
    setShowProductSuggestions(false);
    
    // التركيز تلقائياً على حقل الكمية
    setTimeout(() => {
      if (quantityInputRef.current) {
        quantityInputRef.current.focus();
      }
    }, 100);
  };

  // اختيار زبون من الاقتراحات
  const selectCustomer = useCallback((customer) => {
    setCustomerName(customer);
    setShowCustomerSuggestions(false);
    
    // جلب آخر فاتورة لهذا الزبون لحساب الرصيد السابق
    const customerInvoices = invoices.filter(inv => inv.customer === customer);
    if (customerInvoices.length > 0) {
      const sortedInvoices = customerInvoices.sort((a, b) => b.id - a.id);
      const latestInvoice = sortedInvoices[0];
      const remaining = (latestInvoice.total || 0) + 
        (latestInvoice.previousBalance || 0) - 
        (latestInvoice.payment || 0);
      
      if (remaining !== 0) {
        setPreviousBalance(String(remaining));
        Toast.show({
          type: 'info',
          text1: 'تم جلب الرصيد السابق',
          text2: `الرصيد: ${formatCurrency(remaining)} دينار`,
          position: 'top',
        });
      }
    }
    
    // الانتقال لحقل المنتج
    setTimeout(() => {
      if (productNameInputRef.current) {
        productNameInputRef.current.focus();
      }
    }, 150);
  }, [invoices, setPreviousBalance, productNameInputRef]);

  // إضافة منتج للفاتورة
  const addItemToInvoice = async () => {
    if (!productName.trim() || !quantity || !price) {
      Toast.show({
        type: 'error',
        text1: 'خطأ',
        text2: 'يرجى إدخال اسم المنتج والكمية والسعر',
        position: 'top',
        visibilityTime: 2000,
      });
      
      // التركيز على أول حقل فارغ
      if (!productName.trim() && productNameInputRef.current) {
        productNameInputRef.current.focus();
      } else if (!quantity && quantityInputRef.current) {
        quantityInputRef.current.focus();
      } else if (!price && priceInputRef.current) {
        priceInputRef.current.focus();
      }
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

    // حفظ المنتج في قاعدة البيانات
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
      // تحديث منتج موجود
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
      // إضافة منتج جديد
      setInvoiceItems([...invoiceItems, newItem]);
      
      Toast.show({
        type: 'success',
        text1: '✅ تمت الإضافة',
        text2: `${productName.trim()}`,
        position: 'top',
        visibilityTime: 1500,
      });
    }

    // تنظيف الحقول
    clearItemFields();
    
    // التركيز مباشرة على حقل اسم المنتج للإدخال السريع
    setTimeout(() => {
      if (productNameInputRef.current) {
        productNameInputRef.current.focus();
      }
    }, 100);
  };

  // تنظيف حقول المنتج
  const clearItemFields = () => {
    setProductName('');
    setQuantity('');
    setPrice('');
    setItemNotes('');
  };

  // تعديل منتج
  const editItem = (index) => {
    const item = invoiceItems[index];
    setProductName(item.product);
    setQuantity(item.quantity.toString());
    setPrice(item.price.toString());
    setItemNotes(item.notes || '');
    setIsEditingItem(true);
    setEditingItemIndex(index);
    
    // التركيز على حقل اسم المنتج
    setTimeout(() => {
      if (productNameInputRef.current) {
        productNameInputRef.current.focus();
      }
    }, 100);
  };

  // حذف منتج
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

  // إلغاء التعديل
  const cancelEdit = () => {
    setIsEditingItem(false);
    setEditingItemIndex(null);
    clearItemFields();
  };

  // حفظ الفاتورة
  const handleSaveInvoice = async () => {
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

    try {
      const invoice = {
        customer: customerName.trim(),
        date: invoiceDate,
        items: invoiceItems,
        total: currentTotal,
        previousBalance: parseFloat(previousBalance || 0),
        payment: parseFloat(paymentAmount || 0),
      };

      await saveInvoice(invoice);

      Toast.show({
        type: 'success',
        text1: 'نجح الحفظ! 🎉',
        text2: 'تم حفظ الفاتورة بنجاح',
        position: 'top',
        visibilityTime: 2000,
      });

      // تنظيف النموذج
      clearInvoiceForm();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'فشل الحفظ',
        text2: 'حدث خطأ أثناء حفظ الفاتورة',
        position: 'top',
      });
    }
  };

  // مسح الفاتورة
  const clearInvoiceForm = async () => {
    setCustomerName('');
    setInvoiceDate(getCurrentDate());
    setInvoiceItems([]);
    setPreviousBalance('');
    setPaymentAmount('');
    clearItemFields();
    setIsEditingItem(false);
    setEditingItemIndex(null);
    
    // مسح المسودة من الذاكرة
    await clearDraft();
  };

  // تأكيد مسح الفاتورة
  const confirmClearInvoice = () => {
    Alert.alert(
      'تأكيد المسح',
      'هل أنت متأكد من مسح هذه الفاتورة؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'مسح',
          style: 'destructive',
          onPress: clearInvoiceForm,
        },
      ]
    );
  };

  // عرض منتج في القائمة
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
        <Text style={styles.headerTitle}>محلات ابو جعفر الرديني</Text>
        <Text style={styles.headerSubtitle}>للمواد الغذائية والحلويات</Text>
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
            <View style={styles.autocompleteContainer}>
              <TextInput
                ref={customerNameInputRef}
                style={styles.input}
                value={customerName}
                onChangeText={setCustomerName}
                placeholder="أدخل اسم الزبون"
                placeholderTextColor={COLORS.textLight}
                onFocus={() => customerName && setShowCustomerSuggestions(true)}
                returnKeyType="next"
                onSubmitEditing={() => {
                  if (productNameInputRef.current) {
                    productNameInputRef.current.focus();
                  }
                }}
              />
              
              {showCustomerSuggestions && (
                <View style={styles.suggestionsContainer}>
                  {filteredCustomers.map((customer, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.suggestionItem}
                      onPress={() => selectCustomer(customer)}
                    >
                      <Icon name="account" size={20} color={COLORS.primary} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.suggestionName}>{customer}</Text>
                        <Text style={styles.suggestionHint}>
                          اضغط للاختيار
                        </Text>
                      </View>
                      <Icon name="chevron-left" size={20} color={COLORS.textLight} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>تاريخ الفاتورة:</Text>
            <TextInput
              style={styles.input}
              value={invoiceDate}
              onChangeText={setInvoiceDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={COLORS.textLight}
              returnKeyType="next"
              onSubmitEditing={() => {
                if (productNameInputRef.current) {
                  productNameInputRef.current.focus();
                }
              }}
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
                onSubmitEditing={() => {
                  // إذا كان هناك اقتراح واحد فقط، اختره تلقائياً
                  if (filteredProducts.length === 1) {
                    selectProduct(filteredProducts[0]);
                  } else {
                    // انتقل للكمية
                    if (quantityInputRef.current) {
                      quantityInputRef.current.focus();
                    }
                  }
                }}
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
                ref={quantityInputRef}
                style={styles.input}
                value={quantity}
                onChangeText={setQuantity}
                placeholder="0"
                keyboardType="numeric"
                placeholderTextColor={COLORS.textLight}
                returnKeyType="next"
                onSubmitEditing={() => {
                  if (priceInputRef.current) {
                    priceInputRef.current.focus();
                  }
                }}
              />
            </View>

            <View style={[styles.inputGroup, styles.flex1]}>
              <Text style={styles.label}>السعر:</Text>
              <TextInput
                ref={priceInputRef}
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
              returnKeyType="next"
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
              returnKeyType="done"
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
            style={[styles.button, styles.saveButton]}
            onPress={handleSaveInvoice}
          >
            <Icon name="content-save" size={22} color="#fff" />
            <Text style={styles.buttonText}>حفظ الفاتورة</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.clearButton]}
            onPress={confirmClearInvoice}
          >
            <Icon name="delete-sweep" size={22} color="#fff" />
            <Text style={styles.buttonText}>مسح</Text>
          </TouchableOpacity>
        </View>

        {/* مساحة إضافية للتمرير */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    padding: 24,
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textWhite,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    elevation: 3,
    shadowColor: COLORS.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
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
    paddingVertical: 6,
    borderRadius: 16,
    elevation: 2,
  },
  badgeText: {
    color: COLORS.textWhite,
    fontSize: 14,
    fontWeight: '700',
  },
  input: {
    backgroundColor: COLORS.backgroundLight,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 14,
    fontSize: 16,
    color: COLORS.textDark,
  },
  // عند التركيز على Input
  inputFocused: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.cardBg,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: COLORS.cardBg,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: 14,
    marginTop: 4,
    maxHeight: 200,
    zIndex: 1000,
    elevation: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  suggestionItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.backgroundLight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  lineTotalCard: {
    background: `linear-gradient(135deg, ${COLORS.primaryLight}, ${COLORS.secondaryLight})`,
    backgroundColor: COLORS.primaryLight,
    padding: 16,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: COLORS.primary,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    elevation: 3,
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
  // الأزرار المحدثة
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 14,
    elevation: 4,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
  },
  secondaryButton: {
    backgroundColor: COLORS.cardBg,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  saveButton: {
    backgroundColor: COLORS.success,
    shadowColor: COLORS.success,
  },
  clearButton: {
    backgroundColor: COLORS.danger,
    shadowColor: COLORS.danger,
  },
  editButton: {
    backgroundColor: COLORS.info,
    shadowColor: COLORS.info,
  },
  deleteButton: {
    backgroundColor: COLORS.danger,
    shadowColor: COLORS.danger,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textWhite,
  },
  secondaryButtonText: {
    color: COLORS.primary,
  },
  // المنتجات المضافة
  invoiceItem: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 2,
  },
  itemNumberBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  // ملخص الفاتورة
  summaryCard: {
    backgroundColor: COLORS.backgroundLight,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  finalCard: {
    backgroundColor: COLORS.cardBg,
    borderColor: COLORS.primary,
    borderWidth: 2,
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.15,
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
});

export default CreateInvoiceScreen
