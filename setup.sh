#!/bin/bash

# سكريبت إعداد تطبيق الفواتير - React Native
# يقوم بإصلاح جميع المشاكل تلقائياً

echo "======================================"
echo "🚀 بدء إعداد تطبيق الفواتير"
echo "======================================"

# الألوان
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# التحقق من وجود Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js غير مثبت!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js: $(node -v)${NC}"
echo -e "${GREEN}✅ npm: $(npm -v)${NC}"

# الانتقال إلى مجلد المشروع
cd ~/Desktop/InvoiceApp || exit

echo ""
echo "======================================"
echo "📦 تثبيت المكتبات..."
echo "======================================"

# تثبيت المكتبات
npm install --legacy-peer-deps

echo ""
echo "======================================"
echo "🧹 تنظيف المشروع..."
echo "======================================"

# تنظيف cache
rm -rf node_modules/.cache
rm -rf android/app/build
rm -rf android/.gradle

# إعادة بناء Android
cd android
./gradlew clean
cd ..

echo ""
echo "======================================"
echo "📝 إصلاح ملف gradle.properties..."
echo "======================================"

# إصلاح gradle.properties
if [ -f "android/gradle.properties" ]; then
    # حذف السطر الذي يحتوي على newArchEnabled=false
    sed -i '/newArchEnabled=false/d' android/gradle.properties
    echo -e "${GREEN}✅ تم إصلاح gradle.properties${NC}"
fi

echo ""
echo "======================================"
echo "🔧 إعداد الأيقونات..."
echo "======================================"

# إضافة سطر الأيقونات في build.gradle إذا لم يكن موجوداً
if ! grep -q "react-native-vector-icons" android/app/build.gradle; then
    echo "apply from: \"../../node_modules/react-native-vector-icons/fonts.gradle\"" >> android/app/build.gradle
    echo -e "${GREEN}✅ تم إضافة إعدادات الأيقونات${NC}"
fi

echo ""
echo "======================================"
echo "✅ الإعداد مكتمل!"
echo "======================================"
echo ""
echo -e "${YELLOW}الخطوات التالية:${NC}"
echo "1. تأكد من أن جميع ملفات الكود منسوخة بشكل صحيح"
echo "2. قم بتشغيل: npx react-native run-android"
echo "3. أو لبناء APK: cd android && ./gradlew assembleRelease"
echo ""
