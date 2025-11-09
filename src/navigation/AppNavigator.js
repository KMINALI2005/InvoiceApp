// src/navigation/AppNavigator.js
import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import CreateInvoiceScreen from '../screens/CreateInvoiceScreen';
import InvoicesScreen from '../screens/InvoicesScreen';
import ProductsScreen from '../screens/ProductsScreen';
import ReportsScreen from '../screens/ReportsScreen';
import AuditingScreen from '../screens/AuditingScreen';

const Stack = createNativeStackNavigator();

const TabBar = ({ navigation, currentScreen }) => {
  const tabs = [
    { name: 'CreateInvoice', icon: 'plus-circle', label: 'إنشاء' },
    { name: 'Invoices', icon: 'receipt', label: 'الفواتير' },
    { name: 'Products', icon: 'package-variant', label: 'المنتجات' },
    { name: 'Reports', icon: 'chart-bar', label: 'التقارير' },
    { name: 'Auditing', icon: 'account-check', label: 'المراجعة' },
  ];

  return (
    <View style={styles.tabBar}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.name}
          style={[
            styles.tab,
            currentScreen === tab.name && styles.activeTab
          ]}
          onPress={() => navigation.navigate(tab.name)}
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
  );
};

const AppNavigator = () => {
  const [currentScreen, setCurrentScreen] = useState('CreateInvoice');

  return (
    <>
      <NavigationContainer
        onStateChange={(state) => {
          const route = state?.routes[state.index];
          if (route) setCurrentScreen(route.name);
        }}
      >
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="CreateInvoice" component={CreateInvoiceScreen} />
          <Stack.Screen name="Invoices" component={InvoicesScreen} />
          <Stack.Screen name="Products" component={ProductsScreen} />
          <Stack.Screen name="Reports" component={ReportsScreen} />
          <Stack.Screen name="Auditing" component={AuditingScreen} />
        </Stack.Navigator>
      </NavigationContainer>
      <TabBar 
        navigation={null} 
        currentScreen={currentScreen}
      />
    </>
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
