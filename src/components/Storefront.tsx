import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingBag, Search, X, Plus, Minus, Check, ArrowRight, ShieldCheck, Truck, Clock, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { formatMoney } from '../lib/money.ts';
import { useLanguage } from '../context/LanguageContext.tsx';
import { LanguageToggle } from './LanguageToggle.tsx';

interface Product {
  id: number;
  name: string;
  categoryId: number | null;
  sku: string;
  barcode: string;
  image: string;
  description: string;
  sellPrice: number;
  stock: number;
}

interface Category {
  id: number;
  name: string;
}

interface Shop {
  shopName: string;
  phone: string;
  address: string;
  currencySymbol: string;
}

interface CartItem {
  product: Product;
  qty: number;
}

export const Storefront: React.FC<{ onNavigateToAdmin: () => void }> = ({ onNavigateToAdmin }) => {
  const { t, lang } = useLanguage();
  const [shop, setShop] = useState<Shop | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Cart state persisted in localStorage
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('dalim_store_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Checkout form
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [orderSuccessMessage, setOrderSuccessMessage] = useState<string | null>(null);
  const [orderErrorMessage, setOrderErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('dalim_store_cart', JSON.stringify(cart));
    } catch {}
  }, [cart]);

  // Load public store data
  useEffect(() => {
    const loadStore = async () => {
      try {
        const res = await fetch('/api/store');
        const json = await res.json();
        if (json.success && json.data) {
          setShop(json.data.shop);
          setCategories(json.data.categories || []);
          setProducts(json.data.products || []);
        }
      } catch (err) {
        console.error('Failed to load store data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadStore();
  }, []);

  const totalCartCount = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.qty, 0);
  }, [cart]);

  const totalCartPrice = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.qty * item.product.sellPrice, 0);
  }, [cart]);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.qty >= product.stock) return prev;
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      } else {
        return [...prev, { product, qty: 1 }];
      }
    });
    setIsCartOpen(true);
  };

  const updateCartQty = (productId: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.qty + delta;
            if (newQty <= 0) return null;
            if (newQty > item.product.stock) return item;
            return { ...item, qty: newQty };
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeCartItem = (productId: number) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrderErrorMessage(null);

    if (!customerName.trim() || !customerPhone.trim()) {
      setOrderErrorMessage('নাম ও সচল মোবাইল নম্বর পূরণ করুন');
      return;
    }

    if (!/^01[3-9]\d{8}$/.test(customerPhone.trim())) {
      setOrderErrorMessage('সঠিক ১১ ডিজিটের বাংলাদেশী মোবাইল নম্বর দিন (যেমন: 01712345678)');
      return;
    }

    if (cart.length === 0) {
      setOrderErrorMessage('আপনার কার্ট খালি!');
      return;
    }

    setIsSubmittingOrder(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: customerName.trim(),
          phone: customerPhone.trim(),
          address: customerAddress.trim() || 'Online Order',
          items: cart.map((it) => ({ id: it.product.id, qty: it.qty })),
        }),
      });
      const data = await res.json();
      if (data.success) {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#2de4a0', '#0b6b45', '#21ad70'],
        });
        setOrderSuccessMessage(data.data.message);
        setCart([]);
        setCustomerName('');
        setCustomerPhone('');
        setCustomerAddress('');
        // Refresh product stock
        const storeRes = await fetch('/api/store');
        const storeJson = await storeRes.json();
        if (storeJson.data?.products) {
          setProducts(storeJson.data.products);
        }
      } else {
        setOrderErrorMessage(data.message || 'অর্ডার প্রক্রিয়াধীন করতে সমস্যা হয়েছে');
      }
    } catch {
      setOrderErrorMessage('সার্ভারের সাথে সংযোগ স্থাপন করা যায়নি');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (selectedCategory !== 'all' && p.categoryId !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.barcode.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [products, selectedCategory, searchQuery]);

  const currency = shop?.currencySymbol || '৳';

  return (
    <div className="min-h-screen flex flex-col bg-[#f5faf7] text-[#12352a]">
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-[#dcebe2] transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <span className="font-pacifico text-2xl sm:text-3xl text-[#0b6b45] drop-shadow-sm select-none">
              {shop?.shopName?.split('(')[0] || 'Dalim Store'}
            </span>
          </div>

          {/* Search bar */}
          <div className="flex-1 max-w-md hidden sm:block">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#688177]" />
              <input
                type="text"
                placeholder={t('search_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-[#f5faf7] rounded-xl border border-[#dcebe2] focus:outline-none focus:border-[#21ad70] focus:ring-2 focus:ring-[#2de4a0]/20 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            {/* Bangla / English Language Change Button */}
            <LanguageToggle />

            <button
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center gap-2 px-3.5 py-2 bg-[#0b6b45] hover:bg-[#21ad70] text-white rounded-xl shadow-md transition-all cursor-pointer font-medium text-sm"
              aria-label="View Cart"
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="hidden sm:inline">{t('cart_bag')}</span>
              {totalCartCount > 0 && (
                <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold bg-[#2de4a0] text-[#0b6b45] rounded-full tabular-nums">
                  {totalCartCount}
                </span>
              )}
            </button>

            <button
              onClick={onNavigateToAdmin}
              className="px-3 py-2 text-xs font-semibold text-[#0b6b45] hover:bg-[#e4f3eb] rounded-xl border border-[#dcebe2] transition-colors"
            >
              {t('admin_portal')}
            </button>
          </div>
        </div>

        {/* Mobile Search Input */}
        <div className="px-4 pb-3 sm:hidden">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#688177]" />
            <input
              type="text"
              placeholder={t('search_input_placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-[#f5faf7] rounded-xl border border-[#dcebe2] focus:outline-none focus:border-[#21ad70]"
            />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-12 sm:py-16 bg-gradient-to-b from-[#e8f7ee]/70 via-[#f5faf7] to-[#f5faf7] border-b border-[#dcebe2]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white rounded-full border border-[#dcebe2] text-xs font-semibold text-[#0b6b45] shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-[#21ad70]" />
                {t('hero_badge')}
              </div>
              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight text-[#12352a]">
                {t('hero_title_1')} <br />
                <span className="bg-gradient-to-r from-[#0b6b45] via-[#21ad70] to-[#2de4a0] bg-clip-text text-transparent">
                  {t('hero_title_2')}
                </span>
              </h1>
              <p className="text-sm sm:text-base text-[#688177] max-w-xl leading-relaxed">
                {t('hero_desc')}
              </p>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 pt-4 max-w-md">
                <div className="p-3 bg-white rounded-xl border border-[#dcebe2] shadow-xs">
                  <div className="text-xl sm:text-2xl font-bold text-[#0b6b45] tabular-nums">{products.length}+</div>
                  <div className="text-xs text-[#688177] mt-0.5">{t('stat_products')}</div>
                </div>
                <div className="p-3 bg-white rounded-xl border border-[#dcebe2] shadow-xs">
                  <div className="text-xl sm:text-2xl font-bold text-[#0b6b45] tabular-nums">{categories.length}</div>
                  <div className="text-xs text-[#688177] mt-0.5">{t('stat_categories')}</div>
                </div>
                <div className="p-3 bg-white rounded-xl border border-[#dcebe2] shadow-xs">
                  <div className="text-xl sm:text-2xl font-bold text-[#21ad70]">{t('stat_orders')}</div>
                  <div className="text-xs text-[#688177] mt-0.5">24/7 Delivery</div>
                </div>
              </div>
            </div>

            {/* Hero Visual Right */}
            <div className="lg:col-span-5 flex justify-center lg:justify-end">
              <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
                {/* Glowing rings */}
                <div className="absolute inset-0 rounded-full border-2 border-[#2de4a0]/30 animate-pulse" />
                <div className="absolute inset-6 rounded-full border border-[#21ad70]/30" />
                <div className="w-48 h-48 rounded-full bg-gradient-to-tr from-[#0b6b45] to-[#21ad70] shadow-xl flex flex-col items-center justify-center text-white text-center p-6">
                  <ShoppingBag className="w-16 h-16 mb-2 text-[#2de4a0]" />
                  <span className="font-pacifico text-xl text-white">
                    {lang === 'bn' ? 'ডালিম স্টোর' : 'Dalim Store'}
                  </span>
                  <span className="text-[11px] text-white/80 mt-1">
                    {lang === 'bn' ? 'খাঁটি ও নির্ভরযোগ্য' : 'Trusted & Pure'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Marquee Strip */}
      <div className="bg-[#0b6b45] text-white py-2.5 overflow-hidden border-y border-[#21ad70]/40">
        <div className="flex whitespace-nowrap animate-marquee text-xs font-medium tracking-wide">
          <span className="mx-6">{t('marquee_text_1')}</span>
          <span className="mx-6">·</span>
          <span className="mx-6">{t('marquee_text_2')}</span>
          <span className="mx-6">·</span>
          <span className="mx-6">{t('marquee_text_3')}</span>
          <span className="mx-6">·</span>
          <span className="mx-6">{t('marquee_text_4')}</span>
          <span className="mx-6">·</span>
          <span className="mx-6">{t('marquee_text_1')}</span>
          <span className="mx-6">·</span>
          <span className="mx-6">{t('marquee_text_2')}</span>
        </div>
      </div>

      {/* Main Catalog */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10 flex-1 w-full">
        {/* Category Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 no-scrollbar">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === 'all'
                ? 'bg-[#0b6b45] text-white shadow-sm'
                : 'bg-white text-[#688177] hover:text-[#12352a] border border-[#dcebe2]'
            }`}
          >
            {t('all_products')} ({products.length})
          </button>
          {categories.map((cat) => {
            const count = products.filter((p) => p.categoryId === cat.id).length;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-[#0b6b45] text-white shadow-sm'
                    : 'bg-white text-[#688177] hover:text-[#12352a] border border-[#dcebe2]'
                }`}
              >
                {cat.name} ({count})
              </button>
            );
          })}
        </div>

        {/* Product Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 mt-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-4 border border-[#dcebe2] animate-pulse space-y-3">
                <div className="h-44 bg-slate-100 rounded-xl" />
                <div className="h-4 bg-slate-100 rounded w-3/4" />
                <div className="h-4 bg-slate-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-[#dcebe2] mt-6 p-8">
            <ShoppingBag className="w-12 h-12 text-[#688177] mx-auto mb-3 opacity-40" />
            <h3 className="text-lg font-bold text-[#12352a]">{t('no_products_found')}</h3>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-6">
            {filteredProducts.map((p) => {
              const category = categories.find((c) => c.id === p.categoryId);
              return (
                <div
                  key={p.id}
                  className="bg-white rounded-2xl border border-[#dcebe2] overflow-hidden flex flex-col card-hover-lift shadow-xs group"
                >
                  {/* Image Container with Fallback */}
                  <div className="relative h-48 bg-slate-50 overflow-hidden flex items-center justify-center p-3">
                    {p.image ? (
                      <img
                        src={p.image}
                        alt={p.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full rounded-xl bg-gradient-to-br from-emerald-50 to-[#dcebe2] flex flex-col items-center justify-center text-[#0b6b45]">
                        <ShoppingBag className="w-10 h-10 opacity-60 mb-1" />
                        <span className="text-[11px] font-medium text-slate-500">
                          {lang === 'bn' ? 'ডালিম স্টোর' : 'Dalim Store'}
                        </span>
                      </div>
                    )}
                    {/* Stock status badge */}
                    <div className="absolute top-3 right-3">
                      <span className="px-2 py-0.5 text-[11px] font-semibold bg-white/90 backdrop-blur-xs text-[#0b6b45] rounded-md shadow-xs border border-[#dcebe2]">
                        {t('stock_label')}: {p.stock}
                      </span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      {category && (
                        <div className="text-[11px] font-medium text-[#688177] mb-1">
                          {category.name}
                        </div>
                      )}
                      <h3 className="font-semibold text-sm sm:text-base text-[#12352a] line-clamp-2 leading-snug">
                        {p.name}
                      </h3>
                      {p.description && (
                        <p className="text-xs text-[#688177] line-clamp-1 mt-1">{p.description}</p>
                      )}
                    </div>

                    <div className="pt-4 mt-2 border-t border-[#f5faf7] flex items-center justify-between gap-2">
                      <div className="text-base sm:text-lg font-bold text-[#0b6b45] font-inter tabular-nums">
                        {formatMoney(p.sellPrice, currency)}
                      </div>
                      <button
                        onClick={() => addToCart(p)}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#0b6b45] hover:bg-[#21ad70] rounded-xl shadow-xs transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {t('add_to_cart')}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Value Proposition Strip */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 pt-10 border-t border-[#dcebe2]">
          <div className="p-5 bg-white rounded-2xl border border-[#dcebe2] flex items-start gap-4">
            <div className="p-3 bg-[#e8f7ee] text-[#0b6b45] rounded-xl">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-[#12352a] text-sm">{t('trust_fast_delivery')}</h4>
              <p className="text-xs text-[#688177] mt-1">{t('trust_fast_delivery_desc')}</p>
            </div>
          </div>
          <div className="p-5 bg-white rounded-2xl border border-[#dcebe2] flex items-start gap-4">
            <div className="p-3 bg-[#e8f7ee] text-[#0b6b45] rounded-xl">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-[#12352a] text-sm">{t('trust_authentic')}</h4>
              <p className="text-xs text-[#688177] mt-1">{t('trust_authentic_desc')}</p>
            </div>
          </div>
          <div className="p-5 bg-white rounded-2xl border border-[#dcebe2] flex items-start gap-4">
            <div className="p-3 bg-[#e8f7ee] text-[#0b6b45] rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-[#12352a] text-sm">{t('trust_cod')}</h4>
              <p className="text-xs text-[#688177] mt-1">{t('trust_cod_desc')}</p>
            </div>
          </div>
        </section>
      </main>

      {/* Cart Slide-in Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setIsCartOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
              {/* Drawer Header */}
              <div className="px-6 py-4 border-b border-[#dcebe2] flex items-center justify-between bg-[#f5faf7]">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-[#0b6b45]" />
                  <h3 className="font-bold text-base text-[#12352a]">
                    {t('cart_title')} ({totalCartCount})
                  </h3>
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {orderSuccessMessage ? (
                  <div className="p-6 bg-[#e8f7ee] border border-[#21ad70]/30 rounded-2xl text-center space-y-3">
                    <div className="w-12 h-12 bg-[#21ad70] text-white rounded-full flex items-center justify-center mx-auto">
                      <Check className="w-6 h-6" />
                    </div>
                    <h4 className="font-bold text-lg text-[#0b6b45]">{t('order_success')}</h4>
                    <p className="text-xs text-[#12352a] leading-relaxed">{orderSuccessMessage}</p>
                    <button
                      onClick={() => {
                        setOrderSuccessMessage(null);
                        setIsCartOpen(false);
                      }}
                      className="mt-3 px-4 py-2 bg-[#0b6b45] text-white text-xs font-semibold rounded-xl"
                    >
                      {t('shop_more')}
                    </button>
                  </div>
                ) : cart.length === 0 ? (
                  <div className="text-center py-16 text-[#688177]">
                    <ShoppingBag className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-medium">{t('cart_empty')}</p>
                    <button
                      onClick={() => setIsCartOpen(false)}
                      className="mt-4 px-4 py-2 bg-[#0b6b45] text-white text-xs font-semibold rounded-xl"
                    >
                      {t('cart_view_products')}
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Item list */}
                    <div className="divide-y divide-[#f5faf7] space-y-3">
                      {cart.map((it) => (
                        <div key={it.product.id} className="pt-3 first:pt-0 flex items-center gap-3">
                          <div className="w-14 h-14 bg-slate-50 rounded-xl border border-[#dcebe2] p-1 flex items-center justify-center shrink-0">
                            {it.product.image ? (
                              <img
                                src={it.product.image}
                                alt={it.product.name}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <ShoppingBag className="w-6 h-6 text-[#688177] opacity-40" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs sm:text-sm font-semibold text-[#12352a] truncate">
                              {it.product.name}
                            </h4>
                            <div className="text-xs text-[#0b6b45] font-semibold mt-0.5 tabular-nums">
                              {formatMoney(it.product.sellPrice, currency)}
                            </div>
                          </div>
                          {/* Qty +/- */}
                          <div className="flex items-center gap-1.5 border border-[#dcebe2] rounded-lg p-1 bg-[#f5faf7]">
                            <button
                              onClick={() => updateCartQty(it.product.id, -1)}
                              className="p-1 hover:bg-white rounded text-slate-600"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-xs font-bold px-1 tabular-nums">{it.qty}</span>
                            <button
                              onClick={() => updateCartQty(it.product.id, 1)}
                              disabled={it.qty >= it.product.stock}
                              className="p-1 hover:bg-white rounded text-slate-600 disabled:opacity-40"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          <button
                            onClick={() => removeCartItem(it.product.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Order summary */}
                    <div className="pt-4 border-t border-[#dcebe2] space-y-2">
                      <div className="flex justify-between text-sm text-[#688177]">
                        <span>{t('subtotal')}:</span>
                        <span className="font-bold text-[#12352a] tabular-nums">
                          {formatMoney(totalCartPrice, currency)}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs text-[#688177]">
                        <span>{t('delivery_fee')}:</span>
                        <span className="text-[#21ad70] font-semibold">{t('free_delivery')}</span>
                      </div>
                    </div>

                    {/* Checkout Form */}
                    <form onSubmit={handleCheckout} className="pt-4 border-t border-[#dcebe2] space-y-3">
                      <h4 className="font-bold text-xs uppercase tracking-wider text-[#0b6b45]">
                        {t('order_info')}
                      </h4>

                      {orderErrorMessage && (
                        <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
                          {orderErrorMessage}
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-medium text-[#12352a] mb-1">
                          {t('full_name_label')}
                        </label>
                        <input
                          type="text"
                          required
                          placeholder={lang === 'bn' ? 'উদাঃ মো. রফিক' : 'e.g. John Doe'}
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-[#f5faf7] border border-[#dcebe2] rounded-xl focus:outline-none focus:border-[#21ad70]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-[#12352a] mb-1">
                          {t('phone_label')}
                        </label>
                        <input
                          type="tel"
                          required
                          placeholder="017XXXXXXXX"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-[#f5faf7] border border-[#dcebe2] rounded-xl focus:outline-none focus:border-[#21ad70]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-[#12352a] mb-1">
                          {t('address_label')}
                        </label>
                        <textarea
                          rows={2}
                          placeholder={lang === 'bn' ? 'উদাঃ বাসা #১২, ধানমন্ডি, ঢাকা' : 'e.g. House #12, Dhanmondi, Dhaka'}
                          value={customerAddress}
                          onChange={(e) => setCustomerAddress(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-[#f5faf7] border border-[#dcebe2] rounded-xl focus:outline-none focus:border-[#21ad70]"
                        />
                      </div>

                      <div className="p-2.5 bg-[#e8f7ee] rounded-xl text-[11px] text-[#0b6b45] flex items-center gap-2">
                        <Check className="w-4 h-4 shrink-0 text-[#21ad70]" />
                        <span>{t('cod_note')}</span>
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmittingOrder}
                        className="w-full py-3 bg-[#0b6b45] hover:bg-[#21ad70] text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {isSubmittingOrder ? (
                          t('loading')
                        ) : (
                          <>
                            {t('place_order_btn')} ({formatMoney(totalCartPrice, currency)})
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </form>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-[#dcebe2] py-8 text-center text-xs text-[#688177]">
        <div className="max-w-7xl mx-auto px-4 space-y-3">
          <div className="flex justify-center pb-1">
            <LanguageToggle />
          </div>
          <p className="font-medium text-[#12352a]">
            © {new Date().getFullYear()} {shop?.shopName || 'Dalim Store'} · Developed by Tousif
          </p>
          <p className="text-[11px]">
            {t('footer_text')}
          </p>
          <div className="pt-1">
            <button
              onClick={onNavigateToAdmin}
              className="text-[#0b6b45] hover:underline font-semibold"
            >
              {t('staff_login')}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
