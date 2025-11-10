export const formatCurrency = (amount) => {
  // معالجة القيم الخاطئة
  if (amount === null || amount === undefined || isNaN(amount) || !isFinite(amount)) {
    return '0';
  }
  
  // تحويل إلى رقم
  const numAmount = Number(amount);
  
  // التحقق مرة أخرى بعد التحويل
  if (isNaN(numAmount) || !isFinite(numAmount)) {
    return '0';
  }
  
  return numAmount.toLocaleString('en-US', {
    maximumFractionDigits: 0,
  });
};

export const toEnglishNumbers = (str) => {
  if (!str) return '';
  const arabicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  const englishNumbers = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  
  let result = String(str);
  for (let i = 0; i < 10; i++) {
    result = result.replace(new RegExp(arabicNumbers[i], 'g'), englishNumbers[i]);
  }
  return result;
};

export const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getCurrentDate = () => {
  return formatDate(new Date());
};

export const getCurrentTime = () => {
  const now = new Date();
  return now.toLocaleTimeString('ar-EG', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};
