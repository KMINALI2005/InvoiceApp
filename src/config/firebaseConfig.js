import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';

// إعدادات Firebase - ضع بياناتك هنا من Firebase Console
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAZ49R6kKugp_Ah2gcKiZoKqoVIbhIPGg8",
  authDomain: "foaterpro.firebaseapp.com",
  projectId: "foaterpro",
  storageBucket: "foaterpro.firebasestorage.app",
  messagingSenderId: "G-4BDV150BX3",
  appId: "1:1090347854296:web:ab8c4bc1e60b7720d0eaad"
};

export { auth, firestore, storage };
