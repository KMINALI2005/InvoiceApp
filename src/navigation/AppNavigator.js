import InvoiceTemplateScreen from '../screens/InvoiceTemplateScreen';
import BarcodeScannerScreen from '../screens/BarcodeScannerScreen';
import CloudBackupScreen from '../screens/CloudBackupScreen';
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import CreateInvoiceScreen from '../screens/CreateInvoiceScreen';
import InvoicesScreen from '../screens/InvoicesScreen';
import ProductsScreen from '../screens/ProductsScreen';
import ReportsScreen from '../screens/ReportsScreen';
import AuditingScreen from '../screens/AuditingScreen';
import EditInvoiceScreen from '../screens/EditInvoiceScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size, focused }) => {
  let iconName;
  if (route.name === 'CreateInvoice') {
    iconName = focused ? 'plus-circle' : 'plus-circle-outline';
  } else if (route.name === 'Invoices') {
    iconName = focused ? 'receipt-text' : 'receipt-text-outline';
  } else if (route.name === 'Products') {
    iconName = focused ? 'package-variant-closed' : 'package-variant';
  } else if (route.name === 'Reports') {
    iconName = focused ? 'chart-bar' : 'chart-bar-stacked';
  } else if (route.name === 'Auditing') {
    iconName = focused ? 'account-check' : 'account-check-outline';
  }
  return <Icon name={iconName} size={size} color={color} />;
},
        tabBarActiveTintColor: '#0d9488',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen name="CreateInvoice" component={CreateInvoiceScreen} options={{ title: 'إنشاء' }} />
      <Tab.Screen name="Invoices" component={InvoicesScreen} options={{ title: 'الفواتير' }} />
      <Tab.Screen name="Products" component={ProductsScreen} options={{ title: 'المنتجات' }} />
      <Tab.Screen name="Reports" component={ReportsScreen} options={{ title: 'التقارير' }} />
      <Tab.Screen name="Auditing" component={AuditingScreen} options={{ title: 'المراجعة' }} />
    </Tab.Navigator>
  );
}

const AppNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Main" component={MainTabs} />
      <Stack.Screen name="EditInvoice" component={EditInvoiceScreen} />
      <Stack.Screen 
  name="InvoiceTemplate" 
  component={InvoiceTemplateScreen}
  options={{ headerShown: false }}
/>
      <Stack.Screen 
  name="BarcodeScanner" 
  component={BarcodeScannerScreen}
  options={{ headerShown: false }}
/>
      <Stack.Screen 
  name="CloudBackup" 
  component={CloudBackupScreen}
  options={{ headerShown: false }}
/>
    </Stack.Navigator>
  );
};


export default AppNavigator;
