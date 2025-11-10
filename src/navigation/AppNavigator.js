// src/navigation/AppNavigator.js
import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// ✅ استيراد آمن مع معالجة الأخطاء
let CreateInvoiceScreen, InvoicesScreen, ProductsScreen, ReportsScreen, AuditingScreen, EditInvoiceScreen;

try {
  CreateInvoiceScreen = require('../screens/CreateInvoiceScreen').default;
  InvoicesScreen = require('../screens/InvoicesScreen').default;
  ProductsScreen = require('../screens/ProductsScreen').default;
  ReportsScreen = require('../screens/ReportsScreen').default;
  AuditingScreen = require('../screens/AuditingScreen').default;
  EditInvoiceScreen = require('../screens/EditInvoiceScreen').default;
} catch (error) {
  console.error('Error importing screens:', error);
  // Fallback screens
  const FallbackScreen = () => (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>خطأ في تحميل الشاشة</Text>
    </View>
  );
  CreateInvoiceScreen = CreateInvoiceScreen || FallbackScreen;
  InvoicesScreen = InvoicesScreen || FallbackScreen;
  ProductsScreen = ProductsScreen || FallbackScreen;
  ReportsScreen = ReportsScreen || FallbackScreen;
  AuditingScreen = AuditingScreen || FallbackScreen;
  EditInvoiceScreen = EditInvoiceScreen || FallbackScreen;
}

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  const [navigationRef, setNavigationRef] = useState(null);
  const [currentScreen, setCurrentScreen] = useState('CreateInvoice');

  const tabs = [
    { name: 'CreateInvoice', icon: 'plus-circle', label: 'إنشاء' },
    { name: 'Invoices', icon: 'receipt', label: 'الفواتير' },
    { name: 'Products', icon: 'package-variant', label: 'المنتجات' },
    { name: 'Reports', icon: 'chart-bar', label: 'التقارير' },
    { name: 'Auditing', icon: 'account-check', label: 'المراجعة' },
  ];

  const handleNavigation = (screenName) => {
    try {
      if (navigationRef && navigationRef.isReady()) {
        navigationRef.navigate(screenName);
      }
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <NavigationContainer
        ref={(ref) => setNavigationRef(ref)}
        onStateChange={(state) => {
          try {
            const route = state?.routes[state.index];
            if (route) setCurrentScreen(route.name);
          } catch (error) {
            console.error('State change error:', error);
          }
        }}
        onReady={() => console.log('Navigation ready')}
      >
        <Stack.Navigator
          screenOptions={({ route }) => ({
            headerShown: false,
            animation: route.name === 'EditInvoice' ? 'slide_from_right' : 'default',
            presentation: route.name === 'EditInvoice' ? 'card' : 'card',
          })}
          initialRouteName="CreateInvoice"
        >
          <Stack.Screen 
            name="CreateInvoice" 
            component={CreateInvoiceScreen}
            options={{ title: 'إنشاء فاتورة' }}
          />
          <Stack.Screen 
            name="Invoices" 
            component={InvoicesScreen}
            options={{ title: 'الفواتير' }}
          />
          <Stack.Screen 
            name="Products" 
            component={ProductsScreen}
            options={{ title: 'المنتجات' }}
          />
          <Stack.Screen 
            name="Reports" 
            component={ReportsScreen}
            options={{ title: 'التقارير' }}
          />
          <Stack.Screen 
            name="Auditing" 
            component={AuditingScreen}
            options={{ title: 'المراجعة' }}
          />
          <Stack.Screen 
            name="EditInvoice" 
            component={EditInvoiceScreen}
            options={{ title: 'تعديل الفاتورة' }}
          />
        </Stack.Navigator>
      </NavigationContainer>

      {/* شريط التنقل السفلي */}
      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.name}
            style={[
              styles.tab,
              currentScreen === tab.name && styles.activeTab
            ]}
            onPress={() => handleNavigation(tab.name)}
          >
            <Icon 
              name={tab.icon} 
              size={24} 
              color={currentScreen === tab.name ? '#fff' : '#0d9488'} 
            />
            <Text style={[
              styles.tabLabel,
              currentScreen === tab.name && styles.activeTabLabel
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 2,
    borderTopColor: '#99f6e4',
    paddingVertical: 8,
    paddingHorizontal: 4,
    elevation: 8,
    shadowColor: '#0d9488',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 12,
    marginHorizontal: 2,
  },
  activeTab: {
    backgroundColor: '#0d9488',
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 4,
    color: '#0d9488',
    fontWeight: '600',
  },
  activeTabLabel: {
    color: '#fff',
    fontWeight: '700',
  },
});

export default AppNavigator;
