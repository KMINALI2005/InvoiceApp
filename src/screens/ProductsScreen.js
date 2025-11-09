// src/screens/ProductsScreen.js
import React, { useState, useMemo, useRef } from 'react';
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
  Modal,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { pick, isCancel, types } from '@react-native-documents/picker';
import { useDatabase } from '../database/database';
import { formatCurrency, toEnglishNumbers } from '../utils/formatters';
import { COLORS } from '../utils/colors';
import Toast from 'react-native-toast-message';
import { exportProductsJSON, importFromJSON } from '../services/shareService';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

const ProductsScreen = ({ navigation }) => {
  const { products, saveProduct, deleteProduct, clearAllProducts, importProducts, loading } = useDatabase();
  
  // حالة الإضافة/التعديل
  const [productName, setProductName] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // حالة البحث والفلترة
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name'); // name, price, recent
  const [sortOrder, setSortOrder] = useState('asc'); // asc, desc
  
  // حالة المودال
  const [showSortModal, setShowSortModal] = useState(false);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  
  // أنيميشن
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  // تصفية وترتيب المنتجات
  const filteredAndSortedProducts = useMemo(() => {
    let filtered = [...products];

    // البحث
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(query) ||
        String(p.price).includes(query)
      );
    }

    // الترتيب
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name, 'ar');
          break;
        case 'price':
          comparison = (a.price || 0) - (b.price || 0);
          break;
        case 'recent':
          comparison = (b.id || 0) - (a.id || 0);
          break;
        default:
          comparison = 0;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [products, searchQuery, sortBy, sortOrder]);

  // إحصائيات
  const stats = useMemo(() => {
    const totalProducts = products.length;
    const totalValue = products.reduce((sum, p) => sum + (p.price || 0), 0);
    const avgPrice = totalProducts > 0 ? totalValue / totalProducts : 0;
    const maxPrice = totalProducts > 0 ? Math.max(...products.map(p => p.price || 0)) : 0;
    const minPrice = totalProducts > 0 ? Math.min(...products.map(p => p.price || 0)) : 0;

    return {
      totalProducts,
      totalValue,
      avgPrice,
      maxPrice,
      minPrice,
    };
  }, [products]);

  // إضافة/تحديث منتج
  const handleSaveProduct = async () => {
    const name = productName.trim();
    const price = parseFloat(productPrice);

    if (!name) {
      Toast.show({
        type: 'error',
        text1: 'خطأ',
        text2: 'يرجى إدخال اسم المنتج',
        position: 'top',
      });
      return;
    }

    if (!price || price <= 0) {
      Toast.show({
        type: 'error',
        text1: 'خطأ',
        text2: 'يرجى إدخال سعر صحيح',
        position: 'top',
      });
      return;
    }

    try {
      if (isEditMode && editingProduct) {
        // تحديث منتج موجود
        await saveProduct({
          id: editingProduct.id,
          name: name,
          price: price,
        });
        
        Toast.show({
          type: 'success',
          text1: 'تم التحديث! ✅',
          text2: `تم تحديث "${name}" بنجاح`,
          position: 'top',
        });
        
        setIsEditMode(false);
        setEditingProduct(null);
      } else {
        // إضافة منتج جديد
        await saveProduct({
          name: name,
          price: price,
        });
        
        Toast.show({
          type: 'success',
          text1: 'تمت الإضافة! 🎉',
          text2: `تم إضافة "${name}" بنجاح`,
          position: 'top',
        });
      }

      // تنظيف الحقول
      setProductName('');
      setProductPrice('');
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'فشلت العملية',
        text2: error.message || 'حدث خطأ غير متوقع',
        position: 'top',
      });
    }
  };

  // تعديل منتج
  const handleEditProduct = (product) => {
    setProductName(product.name);
    setProductPrice(String(product.price));
    setEditingProduct(product);
    setIsEditMode(true);
    
    Toast.show({
      type: 'info',
      text1: 'وضع التعديل',
      text2: `جاري تعديل "${product.name}"`,
      position: 'top',
      visibilityTime: 2000,
    });
  };

  // إلغاء التعديل
  const handleCancelEdit = () => {
    setProductName('');
    setProductPrice('');
    setEditingProduct(null);
    setIsEditMode(false);
  };

  // حذف منتج
  const handleDeleteProduct = (product) => {
    Alert.alert(
      'تأكيد الحذف',
      `هل أنت متأكد من حذف "${product.name}"؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteProduct(product.id);
              Toast.show({
                type: 'success',
                text1: 'تم الحذف',
                text2: `تم حذف "${product.name}" بنجاح`,
                position: 'top',
              });
            } catch (error) {
              Toast.show({
                type: 'error',
                text1: 'فشل الحذف',
                text2: 'حدث خطأ أثناء حذف المنتج',
                position: 'top',
              });
            }
          },
        },
      ]
    );
  };

  // حذف جميع المنتجات
  const handleDeleteAllProducts = async () => {
    try {
      await clearAllProducts();
      setShowDeleteAllModal(false);
      Toast.show({
        type: 'success',
        text1: 'تم المسح',
        text2: `تم حذف ${toEnglishNumbers(stats.totalProducts)} منتج بنجاح`,
        position: 'top',
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'فشل المسح',
        text2: 'حدث خطأ أثناء مسح المنتجات',
        position: 'top',
      });
    }
  };

  // تصدير المنتجات
  const handleExportProducts = async () => {
    if (products.length === 0) {
      Toast.show({
        type: 'warning',
        text1: 'تنبيه',
        text2: 'لا توجد منتجات للتصدير',
        position: 'top',
      });
      return;
    }

    const result = await exportProductsJSON(products);
    
    if (result.success) {
      Toast.show({
        type: 'success',
        text1: 'تم التصدير! 📤',
        text2: `تم تصدير ${toEnglishNumbers(products.length)} منتج`,
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

  // استيراد المنتجات
  const handleImportProducts = async () => {
    try {
      const result = await pick({
        type: [types.allFiles],
      });

      const file = result[0];
      
      if (!file.uri.endsWith('.json')) {
        Toast.show({
          type: 'error',
          text1: 'خطأ',
          text2: 'يرجى اختيار ملف JSON فقط',
          position: 'top',
        });
        return;
      }

      const importResult = await importFromJSON(file.uri);
      
      if (importResult.success && importResult.type === 'products') {
        Alert.alert(
          'تأكيد الاستيراد',
          `سيتم استيراد ${toEnglishNumbers(importResult.count)} منتج ومسح جميع المنتجات الحالية. هل أنت متأكد؟`,
          [
            { text: 'إلغاء', style: 'cancel' },
            {
              text: 'استيراد',
              onPress: async () => {
                await importProducts(importResult.data);
                Toast.show({
                  type: 'success',
                  text1: 'تم الاستيراد! 📥',
                  text2: `تم استيراد ${toEnglishNumbers(importResult.count)} منتج`,
                  position: 'top',
                });
              },
            },
          ]
        );
      } else {
        Toast.show({
          type: 'error',
          text1: 'فشل الاستيراد',
          text2: importResult.error || 'صيغة الملف غير صحيحة',
          position: 'top',
        });
      }
    } catch (err) {
      if (isCancel(err)) {
        // المستخدم ألغى العملية
      } else {
        Toast.show({
          type: 'error',
          text1: 'خطأ',
          text2: 'فشل اختيار الملف',
          position: 'top',
        });
      }
    }
  };

  // تغيير الترتيب
  const handleSortChange = (newSortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('asc');
    }
    setShowSortModal(false);
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

  // عرض بطاقة منتج
  const ProductCard = ({ product, index }) => (
    <Animated.View style={[styles.productCard, { opacity: fadeAnim }]}>
      <View style={styles.productHeader}>
        <View style={styles.productNumberBadge}>
          <Text style={styles.productNumberText}>{toEnglishNumbers(index + 1)}</Text>
        </View>
        <Text style={styles.productName}>{product.name}</Text>
      </View>

      <View style={styles.productPriceContainer}>
        <Icon name="currency-usd" size={20} color={COLORS.success} />
        <Text style={styles.productPrice}>
          {formatCurrency(product.price)} دينار
        </Text>
      </View>

      <View style={styles.productActions}>
        <TouchableOpacity
          style={[styles.productActionButton, styles.editButton]}
          onPress={() => handleEditProduct(product)}
        >
          <Icon name="pencil" size={18} color="#fff" />
          <Text style={styles.productActionText}>تعديل</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.productActionButton, styles.deleteButton]}
          onPress={() => handleDeleteProduct(product)}
        >
          <Icon name="delete" size={18} color="#fff" />
          <Text style={styles.productActionText}>حذف</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  // أنيميشن عند التحميل
  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, [filteredAndSortedProducts]);

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
        <Text style={styles.headerTitle}>قائمة المنتجات</Text>
        <View style={styles.counterBadge}>
          <Text style={styles.counterText}>{toEnglishNumbers(stats.totalProducts)}</Text>
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
              icon="package-variant"
              label="إجمالي المنتجات"
              value={toEnglishNumbers(stats.totalProducts)}
              color={COLORS.primary}
              bgColor="#f0fdfa"
            />
            <StatCard
              icon="currency-usd"
              label="متوسط السعر"
              value={formatCurrency(stats.avgPrice)}
              color={COLORS.success}
              bgColor="#f0fdf4"
            />
            <StatCard
              icon="arrow-up-bold"
              label="أعلى سعر"
              value={formatCurrency(stats.maxPrice)}
              color={COLORS.danger}
              bgColor="#fef2f2"
            />
            <StatCard
              icon="arrow-down-bold"
              label="أقل سعر"
              value={formatCurrency(stats.minPrice)}
              color={COLORS.info}
              bgColor="#eff6ff"
            />
          </View>
        </View>

        {/* قسم الإضافة/التعديل */}
        <View style={styles.addSection}>
          <View style={styles.sectionHeader}>
            <Icon 
              name={isEditMode ? "pencil-circle" : "plus-circle"} 
              size={24} 
              color={isEditMode ? COLORS.warning : COLORS.primary} 
            />
            <Text style={styles.sectionTitle}>
              {isEditMode ? '✏️ تعديل المنتج' : '➕ إضافة منتج جديد'}
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>اسم المنتج:</Text>
            <TextInput
              style={styles.input}
              value={productName}
              onChangeText={setProductName}
              placeholder="أدخل اسم المنتج"
              placeholderTextColor={COLORS.textLight}
              onSubmitEditing={() => productPrice && handleSaveProduct()}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>سعر المنتج:</Text>
            <TextInput
              style={styles.input}
              value={productPrice}
              onChangeText={setProductPrice}
              placeholder="0"
              keyboardType="numeric"
              placeholderTextColor={COLORS.textLight}
              onSubmitEditing={handleSaveProduct}
            />
          </View>

          <Text style={styles.hint}>
            💡 اضغط "Enter" بعد إدخال السعر للإضافة السريعة
          </Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[
                styles.button, 
                isEditMode ? styles.warningButton : styles.primaryButton
              ]}
              onPress={handleSaveProduct}
            >
              <Icon 
                name={isEditMode ? "check" : "plus"} 
                size={20} 
                color="#fff" 
              />
              <Text style={styles.buttonText}>
                {isEditMode ? 'تحديث المنتج' : 'إضافة المنتج'}
              </Text>
            </TouchableOpacity>

            {isEditMode && (
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={handleCancelEdit}
              >
                <Icon name="close" size={20} color={COLORS.primary} />
                <Text style={[styles.buttonText, styles.secondaryButtonText]}>
                  إلغاء
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* أدوات البحث والفلترة */}
        <View style={styles.toolsSection}>
          <View style={styles.searchContainer}>
            <Icon name="magnify" size={22} color={COLORS.textLight} />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="ابحث عن منتج بالاسم أو السعر..."
              placeholderTextColor={COLORS.textLight}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Icon name="close-circle" size={22} color={COLORS.textLight} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.toolsRow}>
            <TouchableOpacity
              style={styles.toolButton}
              onPress={() => setShowSortModal(true)}
            >
              <Icon name="sort" size={20} color={COLORS.primary} />
              <Text style={styles.toolButtonText}>
                الترتيب ({sortBy === 'name' ? 'الاسم' : sortBy === 'price' ? 'السعر' : 'الأحدث'})
              </Text>
              <Icon 
                name={sortOrder === 'asc' ? "arrow-up" : "arrow-down"} 
                size={16} 
                color={COLORS.primary} 
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* أزرار الإجراءات */}
        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={[styles.actionButton, styles.exportButton]}
            onPress={handleExportProducts}
          >
            <Icon name="download" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>تصدير</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.importButton]}
            onPress={handleImportProducts}
          >
            <Icon name="upload" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>استيراد</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.deleteAllButton]}
            onPress={() => setShowDeleteAllModal(true)}
            disabled={products.length === 0}
          >
            <Icon name="delete-sweep" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>مسح الكل</Text>
          </TouchableOpacity>
        </View>

        {/* قائمة المنتجات */}
        {filteredAndSortedProducts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="package-variant-closed" size={64} color={COLORS.textLight} />
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'لا توجد نتائج' : 'لا توجد منتجات'}
            </Text>
            <Text style={styles.emptyText}>
              {searchQuery 
                ? 'جرب البحث بكلمات أخرى'
                : 'ابدأ بإضافة منتج جديد من الأعلى'}
            </Text>
          </View>
        ) : (
          <View style={styles.productsGrid}>
            {filteredAndSortedProducts.map((product, index) => (
              <ProductCard 
                key={product.id} 
                product={product} 
                index={index}
              />
            ))}
          </View>
        )}

        {/* مساحة إضافية */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* مودال الترتيب */}
      <Modal
        visible={showSortModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSortModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSortModal(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>ترتيب المنتجات</Text>
              <TouchableOpacity onPress={() => setShowSortModal(false)}>
                <Icon name="close" size={24} color={COLORS.textDark} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.sortOption, sortBy === 'name' && styles.activeSortOption]}
              onPress={() => handleSortChange('name')}
            >
              <Icon name="alphabetical" size={24} color={sortBy === 'name' ? COLORS.primary : COLORS.textMedium} />
              <Text style={[styles.sortOptionText, sortBy === 'name' && styles.activeSortOptionText]}>
                حسب الاسم
              </Text>
              {sortBy === 'name' && (
                <Icon 
                  name={sortOrder === 'asc' ? "arrow-up" : "arrow-down"} 
                  size={20} 
                  color={COLORS.primary} 
                />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sortOption, sortBy === 'price' && styles.activeSortOption]}
              onPress={() => handleSortChange('price')}
            >
              <Icon name="currency-usd" size={24} color={sortBy === 'price' ? COLORS.primary : COLORS.textMedium} />
              <Text style={[styles.sortOptionText, sortBy === 'price' && styles.activeSortOptionText]}>
                حسب السعر
              </Text>
              {sortBy === 'price' && (
                <Icon 
                  name={sortOrder === 'asc' ? "arrow-up" : "arrow-down"} 
                  size={20} 
                  color={COLORS.primary} 
                />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sortOption, sortBy === 'recent' && styles.activeSortOption]}
              onPress={() => handleSortChange('recent')}
            >
              <Icon name="clock-outline" size={24} color={sortBy === 'recent' ? COLORS.primary : COLORS.textMedium} />
              <Text style={[styles.sortOptionText, sortBy === 'recent' && styles.activeSortOptionText]}>
                الأحدث أولاً
              </Text>
              {sortBy === 'recent' && (
                <Icon 
                  name={sortOrder === 'asc' ? "arrow-up" : "arrow-down"} 
                  size={20} 
                  color={COLORS.primary} 
                />
              )}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* مودال تأكيد الحذف الشامل */}
      <Modal
        visible={showDeleteAllModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteAllModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDeleteAllModal(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.warningIconContainer}>
              <Icon name="alert" size={48} color={COLORS.danger} />
            </View>

            <Text style={styles.modalTitle}>تحذير!</Text>
            <Text style={styles.modalMessage}>
              هل أنت متأكد من حذف جميع المنتجات؟{'\n'}
              سيتم حذف {toEnglishNumbers(stats.totalProducts)} منتج نهائياً.
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowDeleteAllModal(false)}
              >
                <Text style={styles.cancelButtonText}>إلغاء</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.confirmDeleteButton]}
                onPress={handleDeleteAllProducts}
              >
                <Text style={styles.confirmDeleteButtonText}>حذف الكل</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
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
  addSection: {
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
  inputGroup: {
    marginBottom: isTablet ? 16 : 14,
  },
  label: {
    fontSize: isTablet ? 15 : 14,
    fontWeight: '600',
    color: COLORS.textDark,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.backgroundLight,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: isTablet ? 16 : 14,
    fontSize: isTablet ? 16 : 15,
    color: COLORS.textDark,
  },
  hint: {
    fontSize: isTablet ? 13 : 12,
    color: COLORS.textLight,
    textAlign: 'center',
    marginBottom: isTablet ? 16 : 14,
    fontStyle: 'italic',
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
    padding: isTablet ? 16 : 14,
    borderRadius: 12,
    elevation: 3,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
  },
  warningButton: {
    backgroundColor: COLORS.warning,
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  buttonText: {
    fontSize: isTablet ? 16 : 15,
    fontWeight: '700',
    color: '#fff',
  },
  secondaryButtonText: {
    color: COLORS.primary,
  },
  toolsSection: {
    marginBottom: isTablet ? 20 : 16,
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
    marginBottom: isTablet ? 12 : 10,
  },
  searchInput: {
    flex: 1,
    fontSize: isTablet ? 16 : 14,
    color: COLORS.textDark,
    padding: isTablet ? 12 : 10,
  },
  toolsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  toolButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: isTablet ? 14 : 12,
  },
  toolButtonText: {
    fontSize: isTablet ? 14 : 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  actionsSection: {
    flexDirection: 'row',
    gap: isTablet ? 12 : 10,
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
  exportButton: {
    backgroundColor: COLORS.success,
  },
  importButton: {
    backgroundColor: COLORS.info,
  },
  deleteAllButton: {
    backgroundColor: COLORS.danger,
  },
  actionButtonText: {
    fontSize: isTablet ? 14 : 13,
    fontWeight: '700',
    color: '#fff',
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: isTablet ? 16 : 12,
  },
  productCard: {
    flex: isTablet ? 0 : 1,
    minWidth: isTablet ? 280 : 0,
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 12,
    padding: isTablet ? 18 : 16,
    borderWidth: 2,
    borderColor: COLORS.border,
    elevation: 2,
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: isTablet ? 16 : 14,
  },
  productNumberBadge: {
    width: isTablet ? 36 : 32,
    height: isTablet ? 36 : 32,
    borderRadius: isTablet ? 18 : 16,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productNumberText: {
    color: '#fff',
    fontSize: isTablet ? 15 : 14,
    fontWeight: '700',
  },
  productName: {
    flex: 1,
    fontSize: isTablet ? 18 : 16,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  productPriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    padding: isTablet ? 14 : 12,
    borderRadius: 10,
    marginBottom: isTablet ? 14 : 12,
  },
  productPrice: {
    fontSize: isTablet ? 20 : 18,
    fontWeight: '800',
    color: COLORS.success,
  },
  productActions: {
    flexDirection: 'row',
    gap: 10,
  },
  productActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: isTablet ? 10 : 9,
    borderRadius: 8,
  },
  editButton: {
    backgroundColor: COLORS.primary,
  },
  deleteButton: {
    backgroundColor: COLORS.danger,
  },
  productActionText: {
    color: '#fff',
    fontSize: isTablet ? 13 : 12,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: isTablet ? 28 : 24,
    width: '100%',
    maxWidth: isTablet ? 500 : 400,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: isTablet ? 24 : 20,
  },
  modalTitle: {
    fontSize: isTablet ? 22 : 20,
    fontWeight: '800',
    color: COLORS.textDark,
    textAlign: 'center',
    flex: 1,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: isTablet ? 16 : 14,
    borderRadius: 12,
    marginBottom: 10,
    backgroundColor: COLORS.backgroundLight,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  activeSortOption: {
    backgroundColor: '#f0fdfa',
    borderColor: COLORS.primary,
  },
  sortOptionText: {
    flex: 1,
    fontSize: isTablet ? 16 : 15,
    fontWeight: '600',
    color: COLORS.textMedium,
  },
  activeSortOptionText: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  warningIconContainer: {
    alignItems: 'center',
    marginBottom: isTablet ? 20 : 16,
  },
  modalMessage: {
    fontSize: isTablet ? 16 : 15,
    color: COLORS.textMedium,
    textAlign: 'center',
    lineHeight: isTablet ? 26 : 24,
    marginBottom: isTablet ? 28 : 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: isTablet ? 16 : 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
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
  confirmDeleteButton: {
    backgroundColor: COLORS.danger,
  },
  confirmDeleteButtonText: {
    fontSize: isTablet ? 16 : 15,
    fontWeight: '700',
    color: '#fff',
  },
});

export default ProductsScreen;
