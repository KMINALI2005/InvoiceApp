// InvoiceApp/src/database/database.js

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useState, useEffect } from 'react';

const DatabaseContext = createContext();

export const useDatabase = () => {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
};

export const DatabaseProvider = ({ children }) => {
  const [invoices, setInvoices] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [invoicesData, productsData] = await Promise.all([
        AsyncStorage.getItem('invoices'),
        AsyncStorage.getItem('products'),
      ]);

      setInvoices(invoicesData ? JSON.parse(invoicesData) : []);
      setProducts(productsData ? JSON.parse(productsData) : []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveInvoice = async (invoice) => {
    try {
      const newInvoice = {
        ...invoice,
        id: Date.now(),
        createdAt: new Date().toISOString(),
      };
      
      const updatedInvoices = [...invoices, newInvoice];
      await AsyncStorage.setItem('invoices', JSON.stringify(updatedInvoices));
      setInvoices(updatedInvoices);
      
      return newInvoice;
    } catch (error) {
      console.error('Error saving invoice:', error);
      throw error;
    }
  };

  const updateInvoice = async (id, updates) => {
    try {
      const updatedInvoices = invoices.map(inv =>
        inv.id === id ? { ...inv, ...updates } : inv
      );
      
      await AsyncStorage.setItem('invoices', JSON.stringify(updatedInvoices));
      setInvoices(updatedInvoices);
    } catch (error) {
      console.error('Error updating invoice:', error);
      throw error;
    }
  };

  const deleteInvoice = async (id) => {
    try {
      const updatedInvoices = invoices.filter(inv => inv.id !== id);
      await AsyncStorage.setItem('invoices', JSON.stringify(updatedInvoices));
      setInvoices(updatedInvoices);
    } catch (error) {
      console.error('Error deleting invoice:', error);
      throw error;
    }
  };

  const saveProduct = async (product) => {
    try {
      if (product.id) {
        const updatedProducts = products.map(p =>
          p.id === product.id ? { ...p, ...product } : p
        );
        await AsyncStorage.setItem('products', JSON.stringify(updatedProducts));
        setProducts(updatedProducts);
        return product;
      }

      const existing = products.find(p => 
        p.name.toLowerCase() === product.name.toLowerCase()
      );

      if (existing) {
        const updated = products.map(p =>
          p.id === existing.id ? { ...p, price: product.price } : p
        );
        await AsyncStorage.setItem('products', JSON.stringify(updated));
        setProducts(updated);
        return existing;
      }

      const newProduct = {
        ...product,
        id: Date.now(),
        createdAt: new Date().toISOString(),
      };
      
      const updatedProducts = [...products, newProduct];
      await AsyncStorage.setItem('products', JSON.stringify(updatedProducts));
      setProducts(updatedProducts);
      
      return newProduct;
    } catch (error) {
      console.error('Error saving product:', error);
      throw error;
    }
  };

  const deleteProduct = async (id) => {
    try {
      const updatedProducts = products.filter(p => p.id !== id);
      await AsyncStorage.setItem('products', JSON.stringify(updatedProducts));
      setProducts(updatedProducts);
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  };

  const clearAllInvoices = async () => {
    try {
      await AsyncStorage.setItem('invoices', JSON.stringify([]));
      setInvoices([]);
    } catch (error) {
      console.error('Error clearing invoices:', error);
      throw error;
    }
  };

  const clearAllProducts = async () => {
    try {
      await AsyncStorage.setItem('products', JSON.stringify([]));
      setProducts([]);
    } catch (error) {
      console.error('Error clearing products:', error);
      throw error;
    }
  };

  const importInvoices = async (data) => {
    try {
      await AsyncStorage.setItem('invoices', JSON.stringify(data));
      setInvoices(data);
    } catch (error) {
      console.error('Error importing invoices:', error);
      throw error;
    }
  };

  const importProducts = async (data) => {
    try {
      await AsyncStorage.setItem('products', JSON.stringify(data));
      setProducts(data);
    } catch (error) {
      console.error('Error importing products:', error);
      throw error;
    }
  };

  const value = {
    invoices,
    products,
    loading,
    saveInvoice,
    updateInvoice,
    deleteInvoice,
    saveProduct,
    deleteProduct,
    clearAllInvoices,
    clearAllProducts,
    importInvoices,
    importProducts,
  };

  // --- ✨ هذا هو السطر الذي تم إصلاحه ✨ ---
  // يجب أن نعيد مكون Provider ونضع children بداخله
  return (
    <DatabaseContext.Provider value={value}>
      {children}
    </DatabaseContext.Provider>
  );
};
