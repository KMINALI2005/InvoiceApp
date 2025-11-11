import React, { createContext, useContext, useState, useCallback } from 'react';

const InvoiceDraftContext = createContext();

export const useInvoiceDraft = () => {
  return useContext(InvoiceDraftContext);
};

export const InvoiceDraftProvider = ({ children }) => {
  const [draftInvoice, setDraftInvoice] = useState({
    customerName: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    productName: '',
    quantity: '',
    price: '',
    itemNotes: '',
    invoiceItems: [],
    previousBalance: '',
    paymentAmount: '',
  });

  const saveDraft = useCallback((draft) => {
    setDraftInvoice(draft);
  }, []);

  const clearDraft = useCallback(() => {
    setDraftInvoice({
      customerName: '',
      invoiceDate: new Date().toISOString().split('T')[0],
      productName: '',
      quantity: '',
      price: '',
      itemNotes: '',
      invoiceItems: [],
      previousBalance: '',
      paymentAmount: '',
    });
  }, []);

  const value = {
    draftInvoice,
    saveDraft,
    clearDraft,
  };

  return (
    <InvoiceDraftContext.Provider value={value}>
      {children}
    </InvoiceDraftContext.Provider>
  );
};