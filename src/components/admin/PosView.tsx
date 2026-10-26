import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { formatMoney, calculateSaleTotals } from '../../lib/money.ts';
import { InvoiceModal } from '../InvoiceModal.tsx';
import confetti from 'canvas-confetti';
import {
  Search,
  Barcode,
  Plus,
  Minus,
  Trash2,
  UserPlus,
  CreditCard,
  ShoppingBag,
  Check,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

interface Product {
  id: number;
  name: string;
  categoryId: number | null;
  sku: string;
  barcode: string;
  image: string;
  sellPrice: number;
  stock: number;
}

interface Category {
  id: number;
  name: string;
}

interface Customer {
  id: number;
  name: string;
  phone: string;
  address?: string;
}

interface CartItem {
  product: Product;
  qty: number;
}

export const PosView: React.FC = () => {
  const { token, shop } = useAuth();
  const { t } = useLanguage();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);

  // Checkout inputs
  const [discount, setDiscount] = useState<number>(0);
  const [isFullPaid, setIsFullPaid] = useState<boolean>(true);
  const [paidInput, setPaidInput] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [notes, setNotes] = useState<string>('');

  // Quick Customer Modal
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');

  // Sale completion & Invoice Modal
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completedSale, setCompletedSale] = useState<any | null>(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);

  const barcodeInputRef = useRef<HTMLInputElement | null>(null);
  const currency = shop?.currencySymbol || '৳';

  // Load initial POS data
  const fetchData = async () => {
    try {
      const [prodRes, catRes, custRes] = await Promise.all([
        fetch('/api/admin/products?status=active', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/categories', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/customers', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const [prodJson, catJson, custJson] = await Promise.all([
        prodRes.json(),
        catRes.json(),
        custRes.json(),
      ]);

      if (prodJson.success) setProducts(prodJson.data);
      if (catJson.success) setCategories(catJson.data);
      if (custJson.success) setCustomers(custJson.data);
    } catch (err) {
      console.error('Failed to load POS data:', err);
    }
  };

  useEffect(() => {
    if (token) fetchData();
  }, [token]);

  // Calculations
  const totals = useMemo(() => {
    const items = cart.map((i) => ({ qty: i.qty, sellPrice: i.product.sellPrice }));
    const preliminaryTotals = calculateSaleTotals(items, discount, isFullPaid ? 9999999 : paidInput);

    if (isFullPaid) {
      return {
        ...preliminaryTotals,
        paid: preliminaryTotals.total,
        due: 0,
      };
    }
    return preliminaryTotals;
  }, [cart, discount, isFullPaid, paidInput]);

  // Keep paid input in sync when full-paid is toggled
  useEffect(() => {
    if (isFullPaid) {
      setPaidInput(totals.total);
    }
  }, [isFullPaid, totals.total]);

  // Add product to cart
  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        if (existing.qty >= product.stock) {
          setErrorMessage(`স্টকে সর্বোচ্চ ${product.stock} টি রয়েছে`);
          return prev;
        }
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i
        );
      }
      if (product.stock <= 0) {
        setErrorMessage('পণ্যটির কোনো স্টক নেই!');
        return prev;
      }
      return [...prev, { product, qty: 1 }];
    });
    setErrorMessage(null);
  };

  // Barcode enter trigger
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const trimmed = barcodeInput.trim();
    const match = products.find(
      (p) => p.barcode === trimmed || p.sku.toLowerCase() === trimmed.toLowerCase()
    );

    if (match) {
      addToCart(match);
      setBarcodeInput('');
      setErrorMessage(null);
    } else {
      setErrorMessage(`বারকোড '${trimmed}' দিয়ে কোনো পণ্য পাওয়া যায়নি`);
    }
  };

  const updateCartQty = (productId: number, newQty: number) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    if (newQty <= 0) {
      setCart((prev) => prev.filter((i) => i.product.id !== productId));
      return;
    }

    if (newQty > prod.stock) {
      setErrorMessage(`সর্বোচ্চ স্টক ${prod.stock} টি`);
      newQty = prod.stock;
    }

    setCart((prev) =>
      prev.map((i) => (i.product.id === productId ? { ...i, qty: newQty } : i))
    );
  };

  const removeCartItem = (productId: number) => {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setDiscount(0);
    setIsFullPaid(true);
    setPaidInput(0);
    setSelectedCustomerId(null);
    setNotes('');
    setErrorMessage(null);
  };

  // Create Quick Customer
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim() || !newCustPhone.trim()) return;

    try {
      const res = await fetch('/api/admin/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newCustName.trim(),
          phone: newCustPhone.trim(),
          address: newCustAddress.trim(),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setCustomers((prev) => [...prev, json.data]);
        setSelectedCustomerId(json.data.id);
        setIsAddCustomerOpen(false);
        setNewCustName('');
        setNewCustPhone('');
        setNewCustAddress('');
      } else {
        alert(json.message || 'কাস্টমার যুক্ত করা সম্ভব হয়নি');
      }
    } catch {
      alert('সার্ভার এরর');
    }
  };

  // Complete Sale
  const handleCompleteSale = async () => {
    setErrorMessage(null);
    if (cart.length === 0) {
      setErrorMessage('কার্টে অন্তত একটি পণ্য যোগ করুন');
      return;
    }

    if (totals.due > 0 && !selectedCustomerId) {
      setErrorMessage('বাকি টাকা থাকলে কাস্টমার নির্বাচন করা আবশ্যক!');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: cart.map((i) => ({ productId: i.product.id, qty: i.qty })),
          discount,
          paid: isFullPaid ? totals.total : paidInput,
          paymentMethod,
          customerId: selectedCustomerId,
          notes,
        }),
      });

      const json = await res.json();
      if (json.success) {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#2de4a0', '#0b6b45', '#21ad70'],
        });

        const selectedCustObj = customers.find((c) => c.id === selectedCustomerId);
        const receiptData = {
          invoiceNo: json.data.invoice,
          createdAt: new Date().toISOString(),
          customerName: selectedCustObj ? selectedCustObj.name : 'সাধারণ ক্রেতা',
          customerPhone: selectedCustObj ? selectedCustObj.phone : '',
          items: cart.map((i) => ({
            productName: i.product.name,
            qty: i.qty,
            sellPrice: i.product.sellPrice,
            lineTotal: i.qty * i.product.sellPrice,
          })),
          subtotal: totals.subtotal,
          discount: totals.discount,
          total: totals.total,
          paid: totals.paid,
          due: totals.due,
          paymentMethod,
          notes,
        };

        setCompletedSale(receiptData);
        setIsInvoiceOpen(true);
        clearCart();
        fetchData(); // refresh stock numbers
      } else {
        setErrorMessage(json.message || 'বিক্রয় সম্পন্ন করা যায়নি');
      }
    } catch {
      setErrorMessage('সার্ভারের সাথে সংযোগ স্থাপন করা যায়নি');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (selectedCategory !== 'all' && p.categoryId !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.barcode.includes(q)
        );
      }
      return true;
    });
  }, [products, selectedCategory, searchQuery]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-140px)] min-h-[600px]">
      {/* LEFT COLUMN: Products Catalog & Search (7 cols) */}
      <div className="lg:col-span-7 flex flex-col bg-white rounded-2xl border border-[#dcebe2] shadow-xs overflow-hidden">
        {/* Top search & barcode toolbar */}
        <div className="p-4 border-b border-[#dcebe2] bg-[#f5faf7] space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Barcode scanner input */}
            <form onSubmit={handleBarcodeSubmit} className="relative">
              <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#0b6b45]" />
              <input
                ref={barcodeInputRef}
                type="text"
                placeholder={t('barcode_scan_placeholder')}
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#dcebe2] rounded-xl focus:outline-none focus:border-[#21ad70] focus:ring-2 focus:ring-[#2de4a0]/20 font-mono"
              />
            </form>

            {/* Name/SKU Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#688177]" />
              <input
                type="text"
                placeholder={t('sku_search_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#dcebe2] rounded-xl focus:outline-none focus:border-[#21ad70]"
              />
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-[#0b6b45] text-white'
                  : 'bg-white text-[#688177] hover:text-[#12352a] border border-[#dcebe2]'
              }`}
            >
              {t('all_products')} ({products.length})
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedCategory === c.id
                    ? 'bg-[#0b6b45] text-white'
                    : 'bg-white text-[#688177] hover:text-[#12352a] border border-[#dcebe2]'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid Area */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredProducts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-[#688177] p-8 text-center">
              <ShoppingBag className="w-10 h-10 opacity-30 mb-2" />
              <p className="text-sm font-semibold">কোনো সক্রিয় পণ্য পাওয়া যায়নি</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filteredProducts.map((p) => {
                const isOutOfStock = p.stock <= 0;
                return (
                  <button
                    key={p.id}
                    onClick={() => !isOutOfStock && addToCart(p)}
                    disabled={isOutOfStock}
                    className={`p-3 bg-white border rounded-xl flex flex-col text-left transition-all relative group cursor-pointer ${
                      isOutOfStock
                        ? 'opacity-50 border-slate-200 cursor-not-allowed'
                        : 'border-[#dcebe2] hover:border-[#21ad70] hover:shadow-xs active:scale-98'
                    }`}
                  >
                    <div className="h-20 w-full bg-slate-50 rounded-lg overflow-hidden mb-2 flex items-center justify-center p-1">
                      {p.image ? (
                        <img
                          src={p.image}
                          alt={p.name}
                          className="h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <ShoppingBag className="w-6 h-6 text-slate-300" />
                      )}
                    </div>
                    <div className="font-semibold text-xs text-[#12352a] line-clamp-2 leading-snug flex-1">
                      {p.name}
                    </div>
                    <div className="mt-2 flex items-center justify-between w-full pt-1 border-t border-[#f5faf7]">
                      <span className="font-bold text-xs text-[#0b6b45] font-inter tabular-nums">
                        {formatMoney(p.sellPrice, currency)}
                      </span>
                      <span
                        className={`text-[10px] font-medium font-inter tabular-nums ${
                          p.stock <= 5 ? 'text-amber-600' : 'text-[#688177]'
                        }`}
                      >
                        মজুদ: {p.stock}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: POS Cart & Checkout (5 cols) */}
      <div className="lg:col-span-5 flex flex-col bg-white rounded-2xl border border-[#dcebe2] shadow-xs overflow-hidden">
        {/* Cart Header */}
        <div className="p-4 border-b border-[#dcebe2] bg-[#f5faf7] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-[#0b6b45]" />
            <h3 className="font-bold text-sm text-[#12352a]">
              {t('cart_heading')} ({cart.reduce((a, b) => a + b.qty, 0)})
            </h3>
          </div>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs text-rose-600 hover:text-rose-800 font-semibold cursor-pointer"
            >
              {t('clear_cart')}
            </button>
          )}
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 divide-y divide-[#f5faf7] space-y-2">
          {errorMessage && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-[#688177] py-12 text-center">
              <ShoppingBag className="w-12 h-12 opacity-30 mb-2" />
              <p className="text-xs font-semibold">{t('cart_empty')}</p>
              <p className="text-[11px] mt-0.5">Select items from catalog or scan barcode</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.product.id} className="pt-2 first:pt-0 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-semibold text-[#12352a] truncate">{item.product.name}</h4>
                  <div className="text-[11px] text-[#688177] flex items-center gap-2 font-mono tabular-nums">
                    <span>{formatMoney(item.product.sellPrice, currency)}</span>
                    <span>×</span>
                    <span>{item.qty}</span>
                    <span>=</span>
                    <span className="font-bold text-[#0b6b45]">
                      {formatMoney(item.qty * item.product.sellPrice, currency)}
                    </span>
                  </div>
                </div>

                {/* Qty +/- / Input */}
                <div className="flex items-center gap-1 bg-[#f5faf7] border border-[#dcebe2] rounded-lg p-0.5">
                  <button
                    onClick={() => updateCartQty(item.product.id, item.qty - 1)}
                    className="p-1 hover:bg-white rounded text-slate-600"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={item.product.stock}
                    value={item.qty}
                    onChange={(e) => updateCartQty(item.product.id, parseInt(e.target.value) || 1)}
                    className="w-10 text-center text-xs font-bold font-mono focus:outline-none"
                  />
                  <button
                    onClick={() => updateCartQty(item.product.id, item.qty + 1)}
                    disabled={item.qty >= item.product.stock}
                    className="p-1 hover:bg-white rounded text-slate-600 disabled:opacity-30"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                <button
                  onClick={() => removeCartItem(item.product.id)}
                  className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Cart Calculation & Payment Details */}
        <div className="p-4 border-t border-[#dcebe2] bg-[#f5faf7] space-y-3">
          {/* Customer selection row */}
          <div className="flex items-center gap-2">
            <select
              value={selectedCustomerId || ''}
              onChange={(e) => setSelectedCustomerId(e.target.value ? Number(e.target.value) : null)}
              className="flex-1 px-3 py-1.5 text-xs bg-white border border-[#dcebe2] rounded-xl focus:outline-none focus:border-[#21ad70]"
            >
              <option value="">{t('select_customer')}</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.phone})
                </option>
              ))}
            </select>
            <button
              onClick={() => setIsAddCustomerOpen(true)}
              className="p-1.5 bg-white border border-[#dcebe2] rounded-xl text-[#0b6b45] hover:bg-[#e8f7ee] transition-colors"
              title={t('add_customer_btn')}
            >
              <UserPlus className="w-4 h-4" />
            </button>
          </div>

          {/* Subtotal & Discount */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[#688177]">{t('subtotal')}:</span>
              <div className="font-bold text-[#12352a] font-mono tabular-nums text-sm">
                {formatMoney(totals.subtotal, currency)}
              </div>
            </div>
            <div>
              <span className="text-[#688177]">{t('discount')}:</span>
              <div className="relative mt-0.5">
                <input
                  type="number"
                  min={0}
                  value={discount || ''}
                  placeholder="0"
                  onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full px-2.5 py-1 text-xs bg-white border border-[#dcebe2] rounded-lg focus:outline-none focus:border-[#21ad70] font-mono"
                />
              </div>
            </div>
          </div>

          {/* Full Paid checkbox & Paid input */}
          <div className="pt-2 border-t border-[#dcebe2] space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs font-semibold text-[#12352a] cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFullPaid}
                  onChange={(e) => setIsFullPaid(e.target.checked)}
                  className="rounded border-[#dcebe2] text-[#0b6b45] focus:ring-[#21ad70]"
                />
                {t('full_paid')}
              </label>

              {!isFullPaid && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#688177]">{t('paid_amount')}:</span>
                  <input
                    type="number"
                    min={0}
                    value={paidInput || ''}
                    placeholder="0"
                    onChange={(e) => setPaidInput(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-24 px-2 py-1 text-xs bg-white border border-[#dcebe2] rounded-lg font-mono"
                  />
                </div>
              )}
            </div>

            {/* Payment method select */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#688177] shrink-0">{t('payment_method')}:</span>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="flex-1 px-2.5 py-1 text-xs bg-white border border-[#dcebe2] rounded-lg focus:outline-none"
              >
                <option value="cash">{t('method_cash')}</option>
                <option value="bkash">{t('method_bkash')}</option>
                <option value="nagad">{t('method_nagad')}</option>
                <option value="rocket">{t('method_rocket')}</option>
                <option value="card">{t('method_card')}</option>
                <option value="bank">{t('method_bank')}</option>
                <option value="bangla_qr">{t('method_bangla_qr')}</option>
              </select>
            </div>
          </div>

          {/* Grand Total & Due Banner */}
          <div className="p-3 bg-white rounded-xl border border-[#dcebe2] flex items-center justify-between">
            <div>
              <span className="text-[11px] text-[#688177]">{t('total_amount')}</span>
              <div className="text-lg font-bold text-[#0b6b45] font-mono tabular-nums">
                {formatMoney(totals.total, currency)}
              </div>
            </div>
            {totals.due > 0 && (
              <div className="text-right">
                <span className="text-[11px] text-rose-600 font-semibold">{t('due_amount')}</span>
                <div className="text-base font-bold text-rose-700 font-mono tabular-nums">
                  {formatMoney(totals.due, currency)}
                </div>
              </div>
            )}
          </div>

          {/* Complete Sale Button */}
          <button
            onClick={handleCompleteSale}
            disabled={isSubmitting || cart.length === 0}
            className="w-full py-3 bg-[#0b6b45] hover:bg-[#21ad70] text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            {t('complete_sale')}
          </button>
        </div>
      </div>

      {/* Add Customer Quick Modal */}
      {isAddCustomerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-[#dcebe2] space-y-4">
            <h3 className="font-bold text-sm text-[#12352a]">নতুন কাস্টমার যোগ করুন</h3>
            <form onSubmit={handleCreateCustomer} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#12352a] mb-1">কাস্টমারের নাম *</label>
                <input
                  type="text"
                  required
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#f5faf7] border border-[#dcebe2] rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#12352a] mb-1">মোবাইল নম্বর *</label>
                <input
                  type="tel"
                  required
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#f5faf7] border border-[#dcebe2] rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#12352a] mb-1">ঠিকানা</label>
                <input
                  type="text"
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#f5faf7] border border-[#dcebe2] rounded-xl"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddCustomerOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-[#0b6b45] hover:bg-[#21ad70] rounded-lg"
                >
                  সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Receipt Modal */}
      {completedSale && (
        <InvoiceModal
          isOpen={isInvoiceOpen}
          onClose={() => setIsInvoiceOpen(false)}
          saleData={completedSale}
          shopInfo={shop || { shopName: 'Dalim Store' }}
          onNewSale={() => {
            setIsInvoiceOpen(false);
            barcodeInputRef.current?.focus();
          }}
        />
      )}
    </div>
  );
};
