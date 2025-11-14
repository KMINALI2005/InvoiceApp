// InvoiceApp/src/database/database.js - محدث بنظام الدفعات

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
  const [payments, setPayments] = useState([]); // ✅ جدول الدفعات الجديد
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [invoicesData, productsData, paymentsData] = await Promise.all([
        AsyncStorage.getItem('invoices'),
        AsyncStorage.getItem('products'),
        AsyncStorage.getItem('payments'), // ✅ تحميل الدفعات
      ]);

      setInvoices(invoicesData ? JSON.parse(invoicesData) : []);
      setProducts(productsData ? JSON.parse(productsData) : []);
      setPayments(paymentsData ? JSON.parse(paymentsData) : []); // ✅
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveInvoice = async (invoice) => {
    try {
      const nextId = invoices.length > 0 ? Math.max(...invoices.map(inv => inv.id)) + 1 : 1;
      const newInvoice = {
        ...invoice,
        id: nextId,
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

  // ✅ دالة حساب الرصيد الحالي للزبون
  const getCustomerBalance = (customerName) => {
    const customerInvoices = invoices.filter(inv => inv.customer === customerName);
    if (customerInvoices.length === 0) return 0;

    // ترتيب الفواتير حسب الأقدم أولاً
    const sortedInvoices = customerInvoices.sort((a, b) => a.id - b.id);
    const latestInvoice = sortedInvoices[sortedInvoices.length - 1];
    
    // حساب الرصيد من آخر فاتورة
    let balance = (latestInvoice.total || 0) + 
                  (latestInvoice.previousBalance || 0) - 
                  (latestInvoice.payment || 0);

    // إضافة جميع الدفعات المستقلة بعد آخر فاتورة
    const paymentsAfterLastInvoice = payments.filter(
      p => p.customer === customerName && 
           new Date(p.createdAt) > new Date(latestInvoice.createdAt)
    );

    paymentsAfterLastInvoice.forEach(payment => {
      balance -= payment.amount;
    });

    return balance;
  };

  // ✅ إضافة دفعة مستقلة
  const addPayment = async (paymentData) => {
    try {
      const nextId = payments.length > 0 ? Math.max(...payments.map(p => p.id)) + 1 : 1;
      const newPayment = {
        id: nextId,
        customer: paymentData.customer,
        amount: parseFloat(paymentData.amount),
        date: paymentData.date || new Date().toISOString().split('T')[0],
        notes: paymentData.notes || '',
        createdAt: new Date().toISOString(),
      };

      const updatedPayments = [...payments, newPayment];
      await AsyncStorage.setItem('payments', JSON.stringify(updatedPayments));
      setPayments(updatedPayments);

      return newPayment;
    } catch (error) {
      console.error('Error adding payment:', error);
      throw error;
    }
  };

  // ✅ حذف دفعة
  const deletePayment = async (id) => {
    try {
      const updatedPayments = payments.filter(p => p.id !== id);
      await AsyncStorage.setItem('payments', JSON.stringify(updatedPayments));
      setPayments(updatedPayments);
    } catch (error) {
      console.error('Error deleting payment:', error);
      throw error;
    }
  };

  // ✅ الحصول على دفعات زبون معين
  const getCustomerPayments = (customerName) => {
    return payments.filter(p => p.customer === customerName);
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

      const nextId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
      const newProduct = {
        ...product,
        id: nextId,
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
    payments, // ✅
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
    // ✅ دوال الدفعات الجديدة
    addPayment,
    deletePayment,
    getCustomerPayments,
    getCustomerBalance,
  };

  return (
    <DatabaseContext.Provider value={value}>
      {children}
    </DatabaseContext.Provider>
  );
};
