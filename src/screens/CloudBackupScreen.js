import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useDatabase } from '../database/database';
import CloudBackupService from '../services/cloudBackupService';
import { COLORS } from '../utils/colors';
import { toEnglishNumbers, formatCurrency } from '../utils/formatters';
import Toast from 'react-native-toast-message';

const CloudBackupScreen = ({ navigation }) => {
  const { invoices, products, payments, importInvoices, importProducts } = useDatabase();
  
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(true);
  
  // حالة تسجيل الدخول
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  
  // حالة النسخ الاحتياطية
  const [backups, setBackups] = useState([]);
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    checkLoginStatus();
    checkAutoBackup();
  }, []);

  useEffect(() => {
    if (isSignedIn) {
      loadBackupsList();
    }
  }, [isSignedIn]);

  const checkLoginStatus = async () => {
    setLoading(true);
    const status = await CloudBackupService.checkUserStatus();
    setIsSignedIn(status.isSignedIn);
    if (status.isSignedIn) {
      setUserEmail(status.email);
    }
    setLoading(false);
  };

  const checkAutoBackup = async () => {
    const enabled = await CloudBackupService.isAutoBackupEnabled();
    setAutoBackupEnabled(enabled);
  };

  const handleSignIn = async () => {
    if (!email || !password) {
      Toast.show({
        type: 'error',
        text1: 'خطأ',
        text2: 'يرجى إدخال البريد الإلكتروني وكلمة المرور',
        position: 'top',
      });
      return;
    }

    setLoading(true);
    const result = isSignUp 
      ? await CloudBackupService.signUpWithEmail(email, password)
      : await CloudBackupService.signInWithEmail(email, password);
    
    setLoading(false);

    if (result.success) {
      setIsSignedIn(true);
      setUserEmail(email);
      Toast.show({
        type: 'success',
        text1: isSignUp ? 'تم إنشاء الحساب' : 'تم تسجيل الدخول',
        text2: `مرحباً ${email}`,
        position: 'top',
      });
      setEmail('');
      setPassword('');
    } else {
      Toast.show({
        type: 'error',
        text1: 'فشلت العملية',
        text2: result.error,
        position: 'top',
      });
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'تسجيل الخروج',
      'هل أنت متأكد؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'تسجيل الخروج',
          onPress: async () => {
            const result = await CloudBackupService.signOut();
            if (result.success) {
              setIsSignedIn(false);
              setUserEmail('');
              setBackups([]);
              Toast.show({
                type: 'success',
                text1: 'تم تسجيل الخروج',
                position: 'top',
              });
            }
          },
        },
      ]
    );
  };

  const loadBackupsList = async () => {
    const result = await CloudBackupService.getBackupsList();
    if (result.success) {
      setBackups(result.backups);
    }
  };

  const handleUploadBackup = async () => {
    Alert.alert(
      'رفع نسخة احتياطية',
      'سيتم رفع جميع البيانات (الفواتير، المنتجات، الدفعات) إلى السحابة',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'رفع',
          onPress: async () => {
            setUploading(true);
            const data = {
              invoices,
              products,
              payments,
            };
            
            const result = await CloudBackupService.uploadBackup(data, 'all');
            setUploading(false);

            if (result.success) {
              Toast.show({
                type: 'success',
                text1: 'تم الرفع بنجاح! ☁️',
                text2: 'تم حفظ النسخة الاحتياطية في السحابة',
                position: 'top',
              });
              loadBackupsList();
            } else {
              Toast.show({
                type: 'error',
                text1: 'فشل الرفع',
                text2: result.error,
                position: 'top',
              });
            }
          },
        },
      ]
    );
  };

  const handleDownloadBackup = async (backupId = null) => {
    Alert.alert(
      'استرجاع نسخة احتياطية',
      'سيتم استبدال جميع البيانات الحالية. هل أنت متأكد؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'استرجاع',
          style: 'destructive',
          onPress: async () => {
            setDownloading(true);
            const result = await CloudBackupService.downloadBackup(backupId);
            setDownloading(false);

            if (result.success) {
              // استيراد البيانات
              if (result.data.invoices && result.data.invoices.length > 0) {
                await importInvoices(result.data.invoices);
              }
              if (result.data.products && result.data.products.length > 0) {
                await importProducts(result.data.products);
              }

              Toast.show({
                type: 'success',
                text1: 'تم الاسترجاع! 📥',
                text2: `${toEnglishNumbers(result.data.invoices.length)} فاتورة، ${toEnglishNumbers(result.data.products.length)} منتج`,
                position: 'top',
              });
            } else {
              Toast.show({
                type: 'error',
                text1: 'فشل الاسترجاع',
                text2: result.error,
                position: 'top',
              });
            }
          },
        },
      ]
    );
  };

  const handleDeleteBackup = async (backupId) => {
    Alert.alert(
      'حذف نسخة احتياطية',
      'هل أنت متأكد من حذف هذه النسخة؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            const result = await CloudBackupService.deleteBackup(backupId);
            if (result.success) {
              Toast.show({
                type: 'success',
                text1: 'تم الحذف',
                position: 'top',
              });
              loadBackupsList();
            }
          },
        },
      ]
    );
  };

  const toggleAutoBackup = async (value) => {
    await CloudBackupService.enableAutoBackup(value);
    setAutoBackupEnabled(value);
    Toast.show({
      type: 'info',
      text1: value ? 'تم تفعيل النسخ التلقائي' : 'تم إيقاف النسخ التلقائي',
      position: 'top',
    });
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
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-right" size={28} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Icon name="cloud-upload" size={28} color="#fff" />
          <Text style={styles.headerTitle}>النسخ الاحتياطي السحابي</Text>
        </View>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {!isSignedIn ? (
          // شاشة تسجيل الدخول
          <View style={styles.loginSection}>
            <View style={styles.loginCard}>
              <Icon name="cloud-lock" size={64} color={COLORS.primary} />
              <Text style={styles.loginTitle}>
                {isSignUp ? 'إنشاء حساب جديد' : 'تسجيل الدخول'}
              </Text>
              <Text style={styles.loginSubtitle}>
                للوصول إلى النسخ الاحتياطية السحابية
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>البريد الإلكتروني:</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="example@gmail.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor={COLORS.textLight}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>كلمة المرور:</Text>
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  secureTextEntry
                  placeholderTextColor={COLORS.textLight}
                />
              </View>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleSignIn}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Icon name={isSignUp ? "account-plus" : "login"} size={20} color="#fff" />
                    <Text style={styles.buttonText}>
                      {isSignUp ? 'إنشاء حساب' : 'تسجيل الدخول'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.linkButton}
                onPress={() => setIsSignUp(!isSignUp)}
              >
                <Text style={styles.linkText}>
                  {isSignUp ? 'لديك حساب؟ تسجيل الدخول' : 'ليس لديك حساب؟ إنشاء حساب'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          // شاشة إدارة النسخ الاحتياطية
          <>
            <View style={styles.userCard}>
              <View style={styles.userInfo}>
                <Icon name="account-circle" size={48} color={COLORS.primary} />
                <View style={styles.userDetails}>
                  <Text style={styles.userName}>مرحباً</Text>
                  <Text style={styles.userEmail}>{userEmail}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.signOutButton}
                onPress={handleSignOut}
              >
                <Icon name="logout" size={20} color={COLORS.danger} />
                <Text style={styles.signOutText}>تسجيل الخروج</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>الإعدادات</Text>
              
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Icon name="cloud-sync" size={24} color={COLORS.primary} />
                  <View style={styles.settingText}>
                    <Text style={styles.settingTitle}>النسخ الاحتياطي التلقائي</Text>
                    <Text style={styles.settingSubtitle}>
                      رفع تلقائي عند إغلاق التطبيق
                    </Text>
                  </View>
                </View>
                <Switch
                  value={autoBackupEnabled}
                  onValueChange={toggleAutoBackup}
                  trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
                  thumbColor={autoBackupEnabled ? COLORS.primary : COLORS.textLight}
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>العمليات</Text>
              
              <TouchableOpacity
                style={[styles.actionButton, styles.uploadButton]}
                onPress={handleUploadBackup}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Icon name="cloud-upload" size={22} color="#fff" />
                    <Text style={styles.actionButtonText}>
                      رفع نسخة احتياطية جديدة
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.downloadButton]}
                onPress={() => handleDownloadBackup()}
                disabled={downloading || backups.length === 0}
              >
                {downloading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Icon name="cloud-download" size={22} color="#fff" />
                    <Text style={styles.actionButtonText}>
                      استرجاع آخر نسخة
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                النسخ الاحتياطية ({toEnglishNumbers(backups.length)})
              </Text>

              {backups.length === 0 ? (
                <View style={styles.emptyState}>
                  <Icon name="cloud-off-outline" size={64} color={COLORS.textLight} />
                  <Text style={styles.emptyText}>لا توجد نسخ احتياطية</Text>
                </View>
              ) : (
                backups.map((backup) => (
                  <View key={backup.id} style={styles.backupCard}>
                    <View style={styles.backupInfo}>
                      <Icon name="cloud-check" size={32} color={COLORS.success} />
                      <View style={styles.backupDetails}>
                        <Text style={styles.backupDate}>
                          {new Date(backup.backupDate).toLocaleDateString('ar-EG', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                        <Text style={styles.backupStats}>
                          {toEnglishNumbers(backup.invoices?.length || 0)} فاتورة • 
                          {toEnglishNumbers(backup.products?.length || 0)} منتج
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.backupActions}>
                      <TouchableOpacity
                        style={[styles.backupActionBtn, styles.restoreBtn]}
                        onPress={() => handleDownloadBackup(backup.id)}
                      >
                        <Icon name="restore" size={18} color="#fff" />
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={[styles.backupActionBtn, styles.deleteBtn]}
                        onPress={() => handleDeleteBackup(backup.id)}
                      >
                        <Icon name="delete" size={18} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>
          </>
        )}

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
  loginSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loginCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
    elevation: 4,
  },
  loginTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textDark,
    marginTop: 20,
    marginBottom: 8,
  },
  loginSubtitle: {
    fontSize: 14,
    color: COLORS.textMedium,
    marginBottom: 32,
    textAlign: 'center',
  },
  inputGroup: {
    width: '100%',
    marginBottom: 20,
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
  primaryButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    elevation: 3,
    marginTop: 10,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  linkButton: {
    marginTop: 16,
  },
  linkText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  userCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: COLORS.textMedium,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.danger,
  },
  signOutText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.danger,
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
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 4,
  },
  settingSubtitle: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 16,
    borderRadius: 12,
    elevation: 3,
    marginBottom: 12,
  },
  uploadButton: {
    backgroundColor: COLORS.primary,
  },
  downloadButton: {
    backgroundColor: COLORS.success,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textLight,
    marginTop: 16,
  },
  backupCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  backupInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backupDetails: {
    flex: 1,
  },
  backupDate: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 4,
  },
  backupStats: {
    fontSize: 12,
    color: COLORS.textMedium,
  },
  backupActions: {
    flexDirection: 'row',
    gap: 8,
  },
  backupActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  restoreBtn: {
    backgroundColor: COLORS.info,
  },
  deleteBtn: {
    backgroundColor: COLORS.danger,
  },
});

export default CloudBackupScreen;
