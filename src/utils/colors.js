// src/utils/colors.js - نظام ألوان عصري 2025

export const COLORS = {
  // الألوان الأساسية - Gradient Modern
  primary: '#6366f1',        // Indigo حديث
  primaryDark: '#4f46e5',    // Indigo داكن
  primaryLight: '#818cf8',   // Indigo فاتح
  
  secondary: '#8b5cf6',      // Purple عصري
  secondaryDark: '#7c3aed',
  secondaryLight: '#a78bfa',
  
  accent: '#ec4899',         // Pink جذاب
  accentDark: '#db2777',
  accentLight: '#f472b6',
  
  // ألوان الحالة
  success: '#10b981',        // Green زاهي
  successDark: '#059669',
  successLight: '#34d399',
  
  warning: '#f59e0b',        // Amber دافئ
  warningDark: '#d97706',
  warningLight: '#fbbf24',
  
  danger: '#ef4444',         // Red قوي
  dangerDark: '#dc2626',
  dangerLight: '#f87171',
  
  info: '#06b6d4',           // Cyan منعش
  infoDark: '#0891b2',
  infoLight: '#22d3ee',
  
  // ألوان الخلفية
  background: '#f8fafc',     // رمادي فاتح جداً
  backgroundSoft: '#f1f5f9',
  backgroundLight: '#e2e8f0',
  
  // ألوان الكروت
  cardBg: '#ffffff',
  cardBorder: '#e2e8f0',
  cardShadow: 'rgba(100, 102, 241, 0.1)',
  
  // ألوان النصوص
  textDark: '#0f172a',       // أسود مزرق
  textMedium: '#475569',     // رمادي متوسط
  textLight: '#94a3b8',      // رمادي فاتح
  textWhite: '#ffffff',
  
  // ألوان الحدود
  border: '#e2e8f0',
  borderDark: '#cbd5e1',
  
  // ألوان الظلال
  shadow: 'rgba(15, 23, 42, 0.1)',
  shadowMedium: 'rgba(15, 23, 42, 0.15)',
  shadowDark: 'rgba(15, 23, 42, 0.25)',
};

// Gradients عصرية
export const GRADIENTS = {
  primary: ['#6366f1', '#8b5cf6'],           // Indigo to Purple
  secondary: ['#8b5cf6', '#ec4899'],         // Purple to Pink
  success: ['#10b981', '#06b6d4'],           // Green to Cyan
  danger: ['#ef4444', '#f97316'],            // Red to Orange
  warning: ['#f59e0b', '#eab308'],           // Amber to Yellow
  info: ['#06b6d4', '#3b82f6'],              // Cyan to Blue
  dark: ['#4f46e5', '#6366f1'],              // Dark Indigo
  sunset: ['#ec4899', '#f59e0b'],            // Pink to Amber
  ocean: ['#06b6d4', '#8b5cf6'],             // Cyan to Purple
  forest: ['#10b981', '#6366f1'],            // Green to Indigo
};

export default { COLORS, GRADIENTS };
