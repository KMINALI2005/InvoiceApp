import React, { createContext, useContext, useState, useCallback } from 'react';

const InvoiceDraftContext = createContext();

export const useInvoiceDraft = () => {
  return useContext(InvoiceDraftContext);
};

export const InvoiceDraftProvider = ({ children }) => {
  const [draftInvoice, setDraftInvoice] = useState({
    customer: '',
    date: new Date().toISOString().split('T')[0],
    items: [],
    previousBalance: 0,
    payment: 0,
  });

  const updateDraftCustomer = useCallback((customer) => {
    setDraftInvoice(prevDraft => ({ ...prevDraft, customer }));
  }, []);

  const updateDraftDate = useCallback((date) => {
    setDraftInvoice(prevDraft => ({ ...prevDraft, date }));
  }, []);

  const addItemToDraft = useCallback((item) => {
    setDraftInvoice(prevDraft => ({
      ...prevDraft,
      items: [...prevDraft.items, item],
    }));
  }, []);

  const updateDraftItem = useCallback((index, updatedItem) => {
    setDraftInvoice(prevDraft => {
      const newItems = [...prevDraft.items];
      newItems[index] = updatedItem;
      return { ...prevDraft, items: newItems };
    });
  }, []);

  const removeItemFromDraft = useCallback((index) => {
    setDraftInvoice(prevDraft => ({
      ...prevDraft,
      items: prevDraft.items.filter((_, i) => i !== index),
    }));
  }, []);

  const updateDraftPreviousBalance = useCallback((balance) => {
    setDraftInvoice(prevDraft => ({ ...prevDraft, previousBalance: balance }));
  }, []);

  const updateDraftPayment = useCallback((payment) => {
    setDraftInvoice(prevDraft => ({ ...prevDraft, payment }));
  }, []);

  const clearDraft = useCallback(() => {
    setDraftInvoice({
      customer: '',
      date: new Date().toISOString().split('T')[0],
      items: [],
      previousBalance: 0,
      payment: 0,
    });
  }, []);

  const value = {
    draftInvoice,
    updateDraftCustomer,
    updateDraftDate,
    addItemToDraft,
    updateDraftItem,
    removeItemFromDraft,
    updateDraftPreviousBalance,
    updateDraftPayment,
    clearDraft,
  };

  return (
    <InvoiceDraftContext.Provider value={value}>
      {children}
    </InvoiceDraftContext.Provider>
  );
};