// App.js
import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import { DatabaseProvider } from './src/database/database';
import { InvoiceDraftProvider } from './src/context/InvoiceDraftContext';
import { NavigationContainer } from '@react-navigation/native';
import Toast from 'react-native-toast-message';

const App = () => {
  useEffect(() => {
    StatusBar.setBackgroundColor('#0d9488');
    StatusBar.setBarStyle('light-content');
  }, []);

  return (
    <DatabaseProvider>
      <StatusBar backgroundColor="#0d9488" barStyle="light-content" />
      <InvoiceDraftProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </InvoiceDraftProvider>
      <Toast />
    </DatabaseProvider>
  );
};

export default App;
