-- תיקיות ברירת מחדל חדשות: מיפוי התיקיות הישנות מערכת הסריקות לתיקיות החדשות
-- המזהים הישנים ("Bank" וכו') הוחלפו בשמות בעברית
update documents set folder = 'אישור ניהול חשבון בנק' where folder = 'Bank';
update documents set folder = 'ביטוחים' where folder = 'National Insurance';
update documents set folder = 'חוזים מול נותני שירות/ספקים' where folder in ('Suppliers', 'Employees', 'Accountant');
update documents set folder = 'אישור מס במקור' where folder in ('VAT', 'Income Tax');
update documents set folder = null where folder = 'Other';
