import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../utils/colors';
import Toast from 'react-native-toast-message';
import { launchImageLibrary } from 'react-native-image-picker';

const InvoiceTemplateScreen = ({ navigation }) => {
  const [shopName, setShopName] = useState('محل استاذ خالد كوزمتك');
  const [shopSubtitle, setShopSubtitle] = useState('لبيع العطور بادراة عبدالله علي');
  const [phone1, setPhone1] = useState('07707750781');
  const [phone1Label, setPhone1Label] = useState('عبدالله');
  const [phone2, setPhone2] = useState('07905077130');
  const [phone2Label, setPhone2Label] = useState('استاذ خالد');
  const [address, setAddress] = useState('بلدروز - مقابل مطعم - بغداد - داخل القيصرية');
  const [logoUri, setLogoUri] = useState('');

  useEffect(() => {
    loadTemplate();
  }, []);

  const loadTemplate = async () => {
    try {
      const template = await AsyncStorage.getItem('invoiceTemplate');
      if (template) {
        const data = JSON.parse(template);
        setShopName(data.shopName || shopName);
        setShopSubtitle(data.shopSubtitle || shopSubtitle);
        setPhone1(data.phone1 || phone1);
        setPhone1Label(data.phone1Label || phone1Label);
        setPhone2(data.phone2 || phone2);
        setPhone2Label(data.phone2Label || phone2Label);
        setAddress(data.address || address);
        setLogoUri(data.logoUri || '');
      }
    } catch (error) {
      console.error('Error loading template:', error);
    }
  };

  const saveTemplate = async () => {
    try {
      const template = {
        shopName,
        shopSubtitle,
        phone1,
        phone1Label,
        phone2,
        phone2Label,
        address,
        logoUri,
      };
      
      await AsyncStorage.setItem('invoiceTemplate', JSON.stringify(template));
      
      Toast.show({
        type: 'success',
        text1: 'تم الحفظ! ✅',
        text2: 'تم حفظ تخصيص الفاتورة',
        position: 'top',
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'فشل الحفظ',
        text2: error.message,
        position: 'top',
      });
    }
  };

  const selectLogo = () => {
    launchImageLibrary(
      {
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 500,
        maxHeight: 500,
      },
      (response) => {
        if (response.didCancel) {
          return;
        }
        
        if (response.errorCode) {
          Toast.show({
            type: 'error',
            text1: 'خطأ',
            text2: 'فشل اختيار الصورة',
            position: 'top',
          });
          return;
        }

        if (response.assets && response.assets[0]) {
          setLogoUri(response.assets[0].uri);
        }
      }
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-right" size={28} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Icon name="palette" size={28} color="#fff" />
          <Text style={styles.headerTitle}>تخصيص الفاتورة</Text>
        </View>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>شعار المحل</Text>
          
          <TouchableOpacity style={styles.logoContainer} onPress={selectLogo}>
            {logoUri ? (
              <Image source={{ uri: logoUri }} style={styles.logoImage} />
            ) : (
              <View style={styles.logoPlaceholder}>
                <Icon name="image-plus" size={48} color={COLORS.textLight} />
                <Text style={styles.logoText}>اضغط لاختيار شعار</Text>
              </View>
            )}
          </TouchableOpacity>

          {logoUri && (
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => setLogoUri('')}
            >
              <Icon name="delete" size={18} color={COLORS.danger} />
              <Text style={styles.removeButtonText}>إزالة الشعار</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>معلومات المحل</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>اسم المحل:</Text>
            <TextInput
              style={styles.input}
              value={shopName}
              onChangeText={setShopName}
              placeholder="اسم المحل"
              placeholderTextColor={COLORS.textLight}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>الوصف:</Text>
            <TextInput
              style={styles.input}
              value={shopSubtitle}
              onChangeText={setShopSubtitle}
              placeholder="وصف المحل"
              placeholderTextColor={COLORS.textLight}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>العنوان:</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={address}
              onChangeText={setAddress}
              placeholder="عنوان المحل"
              placeholderTextColor={COLORS.textLight}
              multiline
              numberOfLines={2}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>أرقام الهواتف</Text>

          <View style={styles.phoneRow}>
            <View style={[styles.inputGroup, styles.phoneLabel]}>
              <Text style={styles.label}>الاسم:</Text>
              <TextInput
                style={styles.input}
                value={phone1Label}
                onChangeText={setPhone1Label}
                placeholder="الاسم"
                placeholderTextColor={COLORS.textLight}
              />
            </View>

            <View style={[styles.inputGroup, styles.phoneNumber]}>
              <Text style={styles.label}>الرقم:</Text>
              <TextInput
                style={styles.input}
                value={phone1}
                onChangeText={setPhone1}
                placeholder="07XXXXXXXXX"
                keyboardType="phone-pad"
                placeholderTextColor={COLORS.textLight}
              />
            </View>
          </View>

          <View style={styles.phoneRow}>
            <View style={[styles.inputGroup, styles.phoneLabel]}>
              <Text style={styles.label}>الاسم:</Text>
              <TextInput
                style={styles.input}
                value={phone2Label}
                onChangeText={setPhone2Label}
                placeholder="الاسم"
                placeholderTextColor={COLORS.textLight}
              />
            </View>

            <View style={[styles.inputGroup, styles.phoneNumber]}>
              <Text style={styles.label}>الرقم:</Text>
              <TextInput
                style={styles.input}
                value={phone2}
                onChangeText={setPhone2}
                placeholder="07XXXXXXXXX"
                keyboardType="phone-pad"
                placeholderTextColor={COLORS.textLight}
              />
            </View>
          </View>
        </View>

        <View style={styles.previewSection}>
          <Text style={styles.sectionTitle}>معاينة</Text>
          <View style={styles.previewCard}>
            <Text style={styles.previewShopName}>{shopName}</Text>
            <Text style={styles.previewSubtitle}>{shopSubtitle}</Text>
            <View style={styles.previewDivider} />
            <Text style={styles.previewPhone}>
              📞 {phone1Label}: {phone1}
            </Text>
            <Text style={styles.previewPhone}>
              📱 {phone2Label}: {phone2}
            </Text>
            <Text style={styles.previewAddress}>📍 {address}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={saveTemplate}>
          <Icon name="content-save" size={22} color="#fff" />
          <Text style={styles.saveButtonText}>حفظ التخصيص</Text>
        </TouchableOpacity>

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
  header: {
    backgroundColor: COLORS.primary,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 8,
  },
  backButton: {
    padding: 4,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
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
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 16,
  },
  logoContainer: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    overflow: 'hidden',
    marginBottom: 12,
  },
  logoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  logoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundLight,
  },
  logoText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textLight,
    fontWeight: '600',
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.danger,
  },
  removeButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.danger,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.backgroundLight,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: COLORS.textDark,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  phoneRow: {
    flexDirection: 'row',
    gap: 12,
  },
  phoneLabel: {
    flex: 1,
  },
  phoneNumber: {
    flex: 2,
  },
  previewSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  previewCard: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  previewShopName: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textDark,
    textAlign: 'center',
    marginBottom: 8,
  },
  previewSubtitle: {
    fontSize: 14,
    color: COLORS.textMedium,
    textAlign: 'center',
    marginBottom: 16,
  },
  previewDivider: {
    height: 2,
    backgroundColor: COLORS.border,
    marginBottom: 16,
  },
  previewPhone: {
    fontSize: 14,
    color: COLORS.textDark,
    marginBottom: 8,
    fontWeight: '600',
  },
  previewAddress: {
    fontSize: 13,
    color: COLORS.textMedium,
    marginTop: 8,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: COLORS.success,
    padding: 16,
    borderRadius: 12,
    elevation: 4,
    marginBottom: 16,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});

export default InvoiceTemplateScreen;
