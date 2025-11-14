// src/utils/colors.js - نظام ألوان بنكهة النعناع الهادئ (2025)

export const COLORS = {
  // الألوان الأساسية - نعناع هادئ
  primary: '#4ADDAF',        // نعناعي منعش (Mint Green)
  primaryDark: '#3BBA9C',    // نعناعي داكن
  primaryLight: '#A0E8D5',   // نعناعي فاتح
  
  secondary: '#80DEEA',      // سماوي هادئ (Calm Cyan/Blue)
  secondaryDark: '#4FC3F7',
  secondaryLight: '#B2EBF2',
  
  accent: '#FFD54F',         // أصفر ليموني ناعم (Soft Yellow)
  accentDark: '#FFC107',
  accentLight: '#FFF176',
  
  // ألوان الحالة
  success: '#2ECC71',        // أخضر نجاح واضح
  successDark: '#27AE60',
  successLight: '#58D68D',
  
  warning: '#FFA726',        // برتقالي دافئ (Warm Orange)
  warningDark: '#FB8C00',
  warningLight: '#FFB74D',
  
  danger: '#EF5350',         // أحمر ناعم (Soft Red)
  dangerDark: '#E53935',
  dangerLight: '#E57373',
  
  info: '#80DEEA',           // سماوي (نفس اللون الثانوي)
  infoDark: '#4FC3F7',
  infoLight: '#B2EBF2',
  
  // ألوان الخلفية
  background: '#F9FAFB',     // رمادي فاتح جداً (Off-white)
  backgroundSoft: '#F4F6F8', // رمادي ناعم
  backgroundLight: '#E5E7EB', // رمادي فاتح
  
  // ألوان الكروت
  cardBg: '#FFFFFF',
  cardBorder: '#E5E7EB',
  cardShadow: 'rgba(74, 221, 175, 0.08)', // ظل بلون نعناعي خفيف
  
  // ألوان النصوص
  textDark: '#1F2937',       // رمادي داكن جداً (أسهل للعين من الأسود)
  textMedium: '#6B7280',     // رمادي متوسط
  textLight: '#9CA3AF',      // رمادي فاتح
  textWhite: '#ffffff',
  
  // ألوان الحدود
  border: '#E5E7EB',
  borderDark: '#D1D5DB',
  
  // ألوان الظلال
  shadow: 'rgba(31, 41, 55, 0.08)',
  shadowMedium: 'rgba(31, 41, 55, 0.12)',
  shadowDark: 'rgba(31, 41, 55, 0.20)',
};

// Gradients هادئة
export const GRADIENTS = {
  primary: ['#4ADDAF', '#80DEEA'],           // نعناعي إلى سماوي
  secondary: ['#80DEEA', '#A0E8D5'],         // سماوي إلى نعناعي فاتح
  success: ['#2ECC71', '#58D68D'],           // تدرج أخضر
  danger: ['#EF5350', '#E57373'],            // تدرج أحمر ناعم
  warning: ['#FFA726', '#FFB74D'],           // تدرج برتقالي
  info: ['#80DEEA', '#B2EBF2'],              // تدرج سماوي
  dark: ['#3BBA9C', '#4ADDAF'],              // تدرج نعناعي داكن
  sunset: ['#FFD54F', '#FFA726'],            // أصفر إلى برتقالي (غروب ناعم)
  ocean: ['#80DEEA', '#4ADDAF'],             // (مثل الأساسي)
  forest: ['#2ECC71', '#3BBA9C'],            // أخضر إلى نعناعي داكن
};

export default { COLORS, GRADIENTS };
