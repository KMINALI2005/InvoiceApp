import { auth, firestore, storage } from '../config/firebaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentDate, getCurrentTime } from '../utils/formatters';

/**
 * خدمة النسخ الاحتياطي السحابي
 */
class CloudBackupService {
  constructor() {
    this.userEmail = null;
    this.userId = null;
  }

  /**
   * تسجيل الدخول بالبريد الإلكتروني
   */
  async signInWithEmail(email, password) {
    try {
      const userCredential = await auth().signInWithEmailAndPassword(email, password);
      this.userId = userCredential.user.uid;
      this.userEmail = email;
      
      // حفظ معلومات المستخدم محلياً
      await AsyncStorage.setItem('cloudUserEmail', email);
      await AsyncStorage.setItem('cloudUserId', this.userId);
      
      return { success: true, user: userCredential.user };
    } catch (error) {
      console.error('Sign In Error:', error);
      return { success: false, error: this.getErrorMessage(error.code) };
    }
  }

  /**
   * إنشاء حساب جديد
   */
  async signUpWithEmail(email, password) {
    try {
      const userCredential = await auth().createUserWithEmailAndPassword(email, password);
      this.userId = userCredential.user.uid;
      this.userEmail = email;
      
      await AsyncStorage.setItem('cloudUserEmail', email);
      await AsyncStorage.setItem('cloudUserId', this.userId);
      
      return { success: true, user: userCredential.user };
    } catch (error) {
      console.error('Sign Up Error:', error);
      return { success: false, error: this.getErrorMessage(error.code) };
    }
  }

  /**
   * تسجيل الخروج
   */
  async signOut() {
    try {
      await auth().signOut();
      await AsyncStorage.removeItem('cloudUserEmail');
      await AsyncStorage.removeItem('cloudUserId');
      this.userId = null;
      this.userEmail = null;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * التحقق من حالة المستخدم
   */
  async checkUserStatus() {
    try {
      const email = await AsyncStorage.getItem('cloudUserEmail');
      const userId = await AsyncStorage.getItem('cloudUserId');
      
      if (email && userId && auth().currentUser) {
        this.userEmail = email;
        this.userId = userId;
        return { isSignedIn: true, email, userId };
      }
      
      return { isSignedIn: false };
    } catch (error) {
      return { isSignedIn: false };
    }
  }

  /**
   * رفع نسخة احتياطية للسحابة
   */
  async uploadBackup(data, type = 'all') {
    try {
      if (!this.userId) {
        const status = await this.checkUserStatus();
        if (!status.isSignedIn) {
          throw new Error('يرجى تسجيل الدخول أولاً');
        }
      }

      const timestamp = new Date().toISOString();
      const backupData = {
        ...data,
        backupDate: timestamp,
        backupType: type,
        deviceInfo: {
          platform: 'android',
          version: '1.0.0',
        }
      };

      // رفع إلى Firestore
      const docRef = await firestore()
        .collection('users')
        .doc(this.userId)
        .collection('backups')
        .add(backupData);

      // حفظ آخر نسخة احتياطية
      await firestore()
        .collection('users')
        .doc(this.userId)
        .set({
          lastBackup: timestamp,
          email: this.userEmail,
          lastBackupId: docRef.id,
        }, { merge: true });

      return {
        success: true,
        backupId: docRef.id,
        timestamp,
      };
    } catch (error) {
      console.error('Upload Backup Error:', error);
      return {
        success: false,
        error: error.message || 'فشل رفع النسخة الاحتياطية',
      };
    }
  }

  /**
   * استرجاع النسخة الاحتياطية من السحابة
   */
  async downloadBackup(backupId = null) {
    try {
      if (!this.userId) {
        const status = await this.checkUserStatus();
        if (!status.isSignedIn) {
          throw new Error('يرجى تسجيل الدخول أولاً');
        }
      }

      let backupDoc;

      if (backupId) {
        // استرجاع نسخة محددة
        backupDoc = await firestore()
          .collection('users')
          .doc(this.userId)
          .collection('backups')
          .doc(backupId)
          .get();
      } else {
        // استرجاع آخر نسخة
        const snapshot = await firestore()
          .collection('users')
          .doc(this.userId)
          .collection('backups')
          .orderBy('backupDate', 'desc')
          .limit(1)
          .get();

        if (snapshot.empty) {
          throw new Error('لا توجد نسخ احتياطية');
        }

        backupDoc = snapshot.docs[0];
      }

      if (!backupDoc.exists) {
        throw new Error('النسخة الاحتياطية غير موجودة');
      }

      const data = backupDoc.data();
      
      return {
        success: true,
        data: {
          invoices: data.invoices || [],
          products: data.products || [],
          payments: data.payments || [],
        },
        backupDate: data.backupDate,
        backupId: backupDoc.id,
      };
    } catch (error) {
      console.error('Download Backup Error:', error);
      return {
        success: false,
        error: error.message || 'فشل استرجاع النسخة الاحتياطية',
      };
    }
  }

  /**
   * الحصول على قائمة النسخ الاحتياطية
   */
  async getBackupsList() {
    try {
      if (!this.userId) {
        const status = await this.checkUserStatus();
        if (!status.isSignedIn) {
          throw new Error('يرجى تسجيل الدخول أولاً');
        }
      }

      const snapshot = await firestore()
        .collection('users')
        .doc(this.userId)
        .collection('backups')
        .orderBy('backupDate', 'desc')
        .limit(10)
        .get();

      const backups = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      return {
        success: true,
        backups,
      };
    } catch (error) {
      console.error('Get Backups List Error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * حذف نسخة احتياطية
   */
  async deleteBackup(backupId) {
    try {
      if (!this.userId) {
        throw new Error('يرجى تسجيل الدخول أولاً');
      }

      await firestore()
        .collection('users')
        .doc(this.userId)
        .collection('backups')
        .doc(backupId)
        .delete();

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * نسخ احتياطي تلقائي
   */
  async enableAutoBackup(enabled = true) {
    try {
      await AsyncStorage.setItem('autoBackupEnabled', enabled ? 'true' : 'false');
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * التحقق من تفعيل النسخ الاحتياطي التلقائي
   */
  async isAutoBackupEnabled() {
    try {
      const enabled = await AsyncStorage.getItem('autoBackupEnabled');
      return enabled === 'true';
    } catch (error) {
      return false;
    }
  }

  /**
   * رسائل الأخطاء بالعربية
   */
  getErrorMessage(errorCode) {
    const errors = {
      'auth/invalid-email': 'البريد الإلكتروني غير صحيح',
      'auth/user-disabled': 'تم تعطيل هذا الحساب',
      'auth/user-not-found': 'المستخدم غير موجود',
      'auth/wrong-password': 'كلمة المرور غير صحيحة',
      'auth/email-already-in-use': 'البريد الإلكتروني مستخدم بالفعل',
      'auth/weak-password': 'كلمة المرور ضعيفة جداً',
      'auth/network-request-failed': 'فشل الاتصال بالإنترنت',
    };
    
    return errors[errorCode] || 'حدث خطأ غير متوقع';
  }
}

export default new CloudBackupService();
