import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'bn' | 'en';

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  bn: {
    // Top Bar & Common
    app_name: 'ডালিম স্টোর',
    lang_toggle: 'English',
    admin_portal: 'অ্যাডমিন পোর্টাল',
    public_store: 'পাবলিক শপ',
    search_placeholder: 'পণ্য খুঁজুন (নাম, কোড)...',
    search_input_placeholder: 'পণ্য খুঁজুন...',
    cart_bag: 'ব্যাগ',
    logout: 'লগআউট',
    welcome: 'স্বাগতম',
    loading: 'লোড হচ্ছে...',
    cancel: 'বাতিল',
    save: 'সংরক্ষণ',
    confirm: 'নিশ্চিত করুন',
    reset: 'রিসেট',
    status_active: 'সক্রিয়',
    status_inactive: 'নিষ্ক্রিয়',

    // Storefront Hero
    hero_badge: 'SMART SHOPPING • DALIM STORE',
    hero_title_1: 'আপনার প্রয়োজনীয় পণ্য,',
    hero_title_2: 'সহজে এক জায়গায়।',
    hero_desc: 'তাজা গ্রোসারি, নিত্যপ্রয়োজনীয় পণ্য ও ঘরোয়া সামগ্রী কিনুন সবচেয়ে সেরা মূল্যে। দ্রুত ডেলিভারি এবং ক্যাশ অন ডেলিভারি সুবিধা।',
    stat_products: 'পণ্য সামগ্রী',
    stat_categories: 'ক্যাটাগরি',
    stat_orders: '২৪/৭ অর্ডার',
    marquee_text_1: '✨ প্রতিদিন নতুন পণ্য',
    marquee_text_2: '🛒 ক্যাশ অন ডেলিভারিতে সহজ অর্ডার',
    marquee_text_3: '💚 Dalim Store — গ্রাহক সন্তুষ্টি আমাদের লক্ষ্য',
    marquee_text_4: '📦 সব প্রয়োজনীয় পণ্য এক ছাদের নিচে',
    all_products: 'সব পণ্য',
    add_to_cart: 'কার্টে যোগ করুন',
    stock_label: 'মজুদ',
    sku_code: 'SKU কোড',
    stock_qty: 'বর্তমান স্টক (Stock Qty)',
    no_products_found: 'কোনো পণ্য পাওয়া যায়নি',

    // Trust Strip
    trust_fast_delivery: 'দ্রুত হোম ডেলিভারি',
    trust_fast_delivery_desc: 'অর্ডার নিশ্চিত করার পর স্বল্প সময়ের মধ্যে আপনার ঠিকানায় পৌঁছাবে।',
    trust_authentic: '১০০% খাঁটি পণ্য',
    trust_authentic_desc: 'প্রতিটি পণ্যের গুণগত মান ও ওজনের নিশ্চয়তা দিয়ে থাকি আমরা।',
    trust_cod: 'সহজ ক্যাশ অন ডেলিভারি',
    trust_cod_desc: 'পণ্য হাতে পেয়ে দেখে মূল্য পরিশোধের সম্পূর্ণ নিশ্চিন্ত ব্যবস্থা।',

    // Cart Drawer
    cart_title: 'আপনার শপিং ব্যাগ',
    cart_empty: 'আপনার ব্যাগ খালি',
    cart_view_products: 'পণ্য দেখুন',
    subtotal: 'মোট মূল্য',
    delivery_fee: 'ডেলিভারি চার্জ',
    free_delivery: 'ফ্রি / নির্ধারিত',
    order_info: 'অর্ডারের তথ্য (ডেলিভারির জন্য)',
    full_name_label: 'আপনার পূর্ণ নাম *',
    phone_label: '১১ ডিজিটের মোবাইল নম্বর *',
    address_label: 'ঠিকানা (বাসা / রোড / এলাকা)',
    cod_note: 'ক্যাশ অন ডেলিভারি (পণ্য হাতে পেয়ে টাকা পরিশোধ করুন)',
    place_order_btn: 'অর্ডার নিশ্চিত করুন',
    order_success: 'অর্ডার সফল হয়েছে!',
    shop_more: 'আরও কেনাকাটা করুন',
    footer_text: 'খাঁটি পণ্য ও দ্রুততম সেবায় বিশ্বস্ত রিটেইল শপ | ঢাকা, বাংলাদেশ',
    staff_login: 'কর্মকর্তা লগইন (Staff / Admin Login)',

    // Admin Sidebar & Nav
    nav_main: 'মূল মেনু (Main)',
    nav_accounts: 'হিসাব খাতা (Accounts)',
    nav_admin: 'প্রশাসন (Administration)',
    menu_dashboard: 'ড্যাশবোর্ড',
    menu_pos: 'POS / নতুন বিক্রয়',
    menu_products: 'পণ্য ও স্টক',
    menu_categories: 'ক্যাটাগরি',
    menu_sales: 'বিক্রয় ও চালান',
    menu_customers: 'কাস্টমার ও বাকি',
    menu_expenses: 'দৈনিক খরচ',
    menu_reports: 'ব্যবসা রিপোর্ট',
    menu_settings: 'সেটিংস ও QR',
    menu_users: 'ব্যবহারকারী (Users)',
    menu_shops: 'দোকানের শাখা (Shops)',

    // Dashboard
    dashboard_overview: 'ড্যাশবোর্ড ওভারভিউ',
    dashboard_sub: 'আজকের সার্বিক বিক্রয়, ইনভেন্টরি ও আর্থিক বিবরণী এক নজরে।',
    today_sales: "আজকের বিক্রয় (Today's Sales)",
    today_invoices: 'আজকের মোট ইনভয়েস',
    today_expense: "আজকের খরচ (Today's Expense)",
    today_expense_desc: 'দোকানের যাবতীয় দৈনিক খরচ',
    today_gross_profit: 'আজকের মোট লাভ (Gross Profit)',
    today_net_profit: 'আজকের নিট লাভ (Net Profit)',
    low_stock_kpi: 'স্বল্প স্টক পণ্য (Low Stock)',
    total_stock_kpi: 'মোট মজুদ (Total Stock)',
    stock_value_kpi: 'মজুদ পণ্যের ক্রয়মূল্য',
    stock_added_kpi: 'আজ নতুন স্টক যুক্ত',
    recent_invoices: 'সর্বশেষ বিক্রয়সমূহ (Recent Invoices)',

    // POS
    barcode_scan_placeholder: 'বারকোড স্ক্যান (Enter চাপুন)...',
    sku_search_placeholder: 'নাম বা SKU দিয়ে খুঁজুন...',
    cart_heading: 'কার্ট',
    clear_cart: 'কার্ট খালি করুন',
    select_customer: 'সাধারণ ক্রেতা (Walking Customer)',
    add_customer_btn: 'নতুন কাস্টমার যোগ করুন',
    discount: 'ছাড় (Discount)',
    full_paid: 'পুরো টাকা পরিশোধ (Full Paid)',
    paid_amount: 'পরিশোধ',
    payment_method: 'পেমেন্ট মাধ্যম',
    total_amount: 'সর্বমোট টাকা',
    due_amount: 'বাকি (Due)',
    complete_sale: 'বিক্রয় সম্পন্ন করুন (Complete Sale)',
    method_cash: 'নগদ (Cash)',
    method_bkash: 'বিকাশ (bKash)',
    method_nagad: 'নগদ (Nagad)',
    method_rocket: 'রকেট (Rocket)',
    method_card: 'কার্ড (Card)',
    method_bank: 'ব্যাংক (Bank)',
    method_bangla_qr: 'বাংলা কিউআর (Bangla QR)',

    // Invoice
    sale_completed: 'বিক্রয় সফল হয়েছে (Sale Completed)',
    thermal_print: '৮০মিমি স্লিপ',
    a4_print: 'A4 ইনভয়েস',
    print_btn: 'প্রিন্ট স্লিপ (Print)',
    new_sale_btn: 'নতুন বিক্রয় (New Sale)',
    invoice_date_time: 'তারিখ ও সময়',
    invoice_customer: 'ক্রেতা',
    invoice_mobile: 'মোবাইল',
    invoice_desc: 'বিবরণ',
    invoice_qty: 'পরিমাণ',
    invoice_rate: 'দর',
    invoice_line_total: 'মোট',
  },
  en: {
    // Top Bar & Common
    app_name: 'Dalim Store',
    lang_toggle: 'বাংলা',
    admin_portal: 'Admin Portal',
    public_store: 'Public Store',
    search_placeholder: 'Search products (name, code)...',
    search_input_placeholder: 'Search products...',
    cart_bag: 'Cart',
    logout: 'Logout',
    welcome: 'Welcome',
    loading: 'Loading...',
    cancel: 'Cancel',
    save: 'Save',
    confirm: 'Confirm',
    reset: 'Reset',
    status_active: 'Active',
    status_inactive: 'Inactive',

    // Storefront Hero
    hero_badge: 'SMART SHOPPING • DALIM STORE',
    hero_title_1: 'Your Essential Products,',
    hero_title_2: 'Easily in One Place.',
    hero_desc: 'Shop fresh groceries, daily essentials, and household items at the best prices. Fast delivery and Cash on Delivery available.',
    stat_products: 'Products',
    stat_categories: 'Categories',
    stat_orders: '24/7 Orders',
    marquee_text_1: '✨ Fresh New Products Everyday',
    marquee_text_2: '🛒 Easy Order with Cash on Delivery',
    marquee_text_3: '💚 Dalim Store — Quality & Customer Satisfaction',
    marquee_text_4: '📦 All Household Essentials Under One Roof',
    all_products: 'All Products',
    add_to_cart: 'Add to Cart',
    stock_label: 'Stock',
    sku_code: 'SKU Code',
    stock_qty: 'Stock Qty',
    no_products_found: 'No products found',

    // Trust Strip
    trust_fast_delivery: 'Fast Home Delivery',
    trust_fast_delivery_desc: 'Delivered swiftly to your doorstep once your order is confirmed.',
    trust_authentic: '100% Authentic Quality',
    trust_authentic_desc: 'We guarantee weight and pure quality for all goods sold.',
    trust_cod: 'Easy Cash on Delivery',
    trust_cod_desc: 'Pay safely upon inspecting your items at delivery.',

    // Cart Drawer
    cart_title: 'Your Shopping Bag',
    cart_empty: 'Your bag is empty',
    cart_view_products: 'Browse Products',
    subtotal: 'Subtotal',
    delivery_fee: 'Delivery Fee',
    free_delivery: 'Free / Standard',
    order_info: 'Delivery & Contact Details',
    full_name_label: 'Your Full Name *',
    phone_label: '11-digit Mobile Number *',
    address_label: 'Address (House / Road / Area)',
    cod_note: 'Cash on Delivery (Pay when you receive the package)',
    place_order_btn: 'Confirm Order',
    order_success: 'Order Placed Successfully!',
    shop_more: 'Continue Shopping',
    footer_text: 'Trusted retail & grocery store | Dhaka, Bangladesh',
    staff_login: 'Staff / Admin Portal Login',

    // Admin Sidebar & Nav
    nav_main: 'Main Menu',
    nav_accounts: 'Accounts & Ledger',
    nav_admin: 'Administration',
    menu_dashboard: 'Dashboard',
    menu_pos: 'POS / New Sale',
    menu_products: 'Products & Stock',
    menu_categories: 'Categories',
    menu_sales: 'Sales & Invoices',
    menu_customers: 'Customers & Due',
    menu_expenses: 'Daily Expenses',
    menu_reports: 'Business Reports',
    menu_settings: 'Settings & QR',
    menu_users: 'Users & RBAC',
    menu_shops: 'Shops & Branches',

    // Dashboard
    dashboard_overview: 'Dashboard Overview',
    dashboard_sub: "Real-time summary of today's sales, inventory health, and net finances.",
    today_sales: "Today's Sales",
    today_invoices: 'Total Invoices Today',
    today_expense: "Today's Expense",
    today_expense_desc: 'Daily store operating expenses',
    today_gross_profit: 'Gross Profit Today',
    today_net_profit: 'Net Profit Today',
    low_stock_kpi: 'Low Stock Products',
    total_stock_kpi: 'Total Stock Quantity',
    stock_value_kpi: 'Inventory Stock Value',
    stock_added_kpi: 'Stock Added Today',
    recent_invoices: 'Recent Invoices',

    // POS
    barcode_scan_placeholder: 'Scan barcode (Press Enter)...',
    sku_search_placeholder: 'Search by name or SKU...',
    cart_heading: 'Cart',
    clear_cart: 'Clear Cart',
    select_customer: 'Walking Customer',
    add_customer_btn: 'Add New Customer',
    discount: 'Discount',
    full_paid: 'Full Paid',
    paid_amount: 'Paid',
    payment_method: 'Payment Method',
    total_amount: 'Total Amount',
    due_amount: 'Due Amount',
    complete_sale: 'Complete Sale',
    method_cash: 'Cash',
    method_bkash: 'bKash',
    method_nagad: 'Nagad',
    method_rocket: 'Rocket',
    method_card: 'Card',
    method_bank: 'Bank Transfer',
    method_bangla_qr: 'Bangla QR',

    // Invoice
    sale_completed: 'Sale Completed',
    thermal_print: '80mm Receipt',
    a4_print: 'A4 Invoice',
    print_btn: 'Print Invoice',
    new_sale_btn: 'New Sale',
    invoice_date_time: 'Date & Time',
    invoice_customer: 'Customer',
    invoice_mobile: 'Mobile',
    invoice_desc: 'Description',
    invoice_qty: 'Qty',
    invoice_rate: 'Unit Price',
    invoice_line_total: 'Total',
  },
};

const LanguageContext = createContext<LanguageContextType>({
  lang: 'bn',
  setLang: () => {},
  toggleLang: () => {},
  t: (key: string) => key,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('dalim_lang');
      return (saved === 'en' || saved === 'bn') ? saved : 'bn';
    } catch {
      return 'bn';
    }
  });

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    try {
      localStorage.setItem('dalim_lang', newLang);
      document.documentElement.lang = newLang;
    } catch {}
  };

  const toggleLang = () => {
    setLang(lang === 'bn' ? 'en' : 'bn');
  };

  const t = (key: string): string => {
    const dict = translations[lang] || translations.bn;
    return dict[key] || translations.bn[key] || key;
  };

  useEffect(() => {
    try {
      document.documentElement.lang = lang;
    } catch {}
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
