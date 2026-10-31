import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { formatMoney } from '../../lib/money.ts';
import {
  Package,
  Plus,
  Search,
  Filter,
  Download,
  Edit2,
  Trash2,
  AlertTriangle,
  X,
  UploadCloud,
  CheckCircle,
} from 'lucide-react';

interface Product {
  id: number;
  categoryId: number | null;
  sku: string;
  barcode: string;
  name: string;
  image: string;
  description: string;
  buyPrice: number;
  sellPrice: number;
  stock: number;
  lowStockThreshold: number;
  status: 'active' | 'inactive';
}

interface Category {
  id: number;
  name: string;
}

export const ProductsView: React.FC<{ initialFilter?: string }> = ({ initialFilter }) => {
  const { token, user, shop } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | 'all'>('all');
  const [lowStockOnly, setLowStockOnly] = useState<boolean>(initialFilter === 'low');
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    categoryId: '' as string | number,
    sku: '',
    barcode: '',
    buyPrice: 0,
    sellPrice: 0,
    stock: 0,
    lowStockThreshold: 5,
    status: 'active' as 'active' | 'inactive',
    image: '',
    description: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const currency = shop?.currencySymbol || '৳';
  const canSeeProfits = user?.role === 'admin' || user?.role === 'manager';
  const canDelete = user?.role === 'admin' || user?.role === 'manager';

  const fetchData = async () => {
    try {
      const [prodRes, catRes] = await Promise.all([
        fetch('/api/admin/products', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/categories', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const [prodJson, catJson] = await Promise.all([prodRes.json(), catRes.json()]);

      if (prodJson.success) setProducts(prodJson.data);
      if (catJson.success) setCategories(catJson.data);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchData();
  }, [token]);

  const openAddModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      categoryId: categories[0]?.id || '',
      sku: '',
      barcode: '',
      buyPrice: 0,
      sellPrice: 0,
      stock: 10,
      lowStockThreshold: 5,
      status: 'active',
      image: '',
      description: '',
    });
    setModalError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setFormData({
      name: p.name,
      categoryId: p.categoryId || '',
      sku: p.sku,
      barcode: p.barcode,
      buyPrice: p.buyPrice,
      sellPrice: p.sellPrice,
      stock: p.stock,
      lowStockThreshold: p.lowStockThreshold,
      status: p.status,
      image: p.image || '',
      description: p.description || '',
    });
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setIsSaving(true);

    try {
      const url = editingProduct
        ? `/api/admin/products/${editingProduct.id}`
        : '/api/admin/products';
      const method = editingProduct ? 'PUT' : 'POST';

      const payload = {
        ...formData,
        categoryId: formData.categoryId ? Number(formData.categoryId) : null,
      };

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        setIsModalOpen(false);
        fetchData();
      } else {
        setModalError(json.message || 'পণ্য সংরক্ষণ করা সম্ভব হয়নি');
      }
    } catch {
      setModalError('সার্ভারে যোগাযোগ করতে সমস্যা হয়েছে');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`আপনি কি নিশ্চিতভাবে "${name}" মুছে ফেলতে বা ডিঅ্যাক্টিভ করতে চান?`)) return;

    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        if (json.message) alert(json.message);
        fetchData();
      } else {
        alert(json.message || 'মুছে ফেলা সম্ভব হয়নি');
      }
    } catch {
      alert('সার্ভার এরর');
    }
  };

  // CSV Export
  const handleExportCsv = () => {
    if (products.length === 0) return;
    const headers = ['ID', 'Name', 'SKU', 'Barcode', 'Category', 'Buy Price', 'Sell Price', 'Stock', 'Status'];
    const rows = products.map((p) => {
      const cat = categories.find((c) => c.id === p.categoryId)?.name || '';
      return [
        p.id,
        `"${p.name.replace(/"/g, '""')}"`,
        p.sku,
        p.barcode,
        `"${cat}"`,
        p.buyPrice,
        p.sellPrice,
        p.stock,
        p.status,
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `dalim_products_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Image upload handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setFormData((prev) => ({ ...prev, image: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (selectedCategory !== 'all' && p.categoryId !== selectedCategory) return false;
      if (lowStockOnly && (p.stock > p.lowStockThreshold || p.status !== 'active')) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.barcode.toLowerCase().includes(q)
        );
      }
      return true;
    }).sort((a, b) => b.id - a.id);
  }, [products, selectedCategory, lowStockOnly, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top action row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#12352a] flex items-center gap-2">
            <Package className="w-5 h-5 text-[#0b6b45]" />
            পণ্য ও ইনভেন্টরি তালিকা (Products & Stock)
          </h2>
          <p className="text-xs text-[#688177]">
            দোকানের সমস্ত পণ্যের মূল্য, বারকোড এবং স্টক ট্র্যাক করুন
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#12352a] bg-white border border-[#dcebe2] hover:bg-[#f5faf7] rounded-xl transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-[#688177]" />
            CSV ডাউনলোড
          </button>
          {canDelete && (
            <button
              onClick={openAddModal}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#0b6b45] hover:bg-[#21ad70] rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              নতুন পণ্য যুক্ত করুন
            </button>
          )}
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="p-4 bg-white rounded-2xl border border-[#dcebe2] shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#688177]" />
          <input
            type="text"
            placeholder="নাম, SKU বা বারকোড খুঁজুন..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-[#f5faf7] border border-[#dcebe2] rounded-xl focus:outline-none focus:border-[#21ad70]"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto">
          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="px-3 py-2 text-xs bg-[#f5faf7] border border-[#dcebe2] rounded-xl focus:outline-none"
          >
            <option value="all">সকল ক্যাটাগরি</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Low Stock Toggle */}
          <button
            onClick={() => setLowStockOnly(!lowStockOnly)}
            className={`px-3 py-2 text-xs font-semibold rounded-xl border flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              lowStockOnly
                ? 'bg-amber-100 text-amber-900 border-amber-300'
                : 'bg-[#f5faf7] text-[#688177] border-[#dcebe2] hover:text-[#12352a]'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            স্বল্প স্টক ফিল্টার
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-[#dcebe2] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f5faf7] text-[#688177] border-b border-[#dcebe2]">
              <tr>
                <th className="py-3 px-4 font-semibold">পণ্য</th>
                <th className="py-3 px-4 font-semibold">ক্যাটাগরি</th>
                <th className="py-3 px-4 font-semibold">SKU / বারকোড</th>
                {canSeeProfits && <th className="py-3 px-4 font-semibold text-right">ক্রয়মূল্য</th>}
                <th className="py-3 px-4 font-semibold text-right">বিক্রয়মূল্য</th>
                <th className="py-3 px-4 font-semibold text-center">মজুদ (Stock)</th>
                <th className="py-3 px-4 font-semibold text-center">স্ট্যাটাস</th>
                <th className="py-3 px-4 font-semibold text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f5faf7]">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#688177]">
                    লোড হচ্ছে...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#688177]">
                    কোনো পণ্য পাওয়া যায়নি
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const cat = categories.find((c) => c.id === p.categoryId);
                  const isLow = p.stock <= p.lowStockThreshold && p.status === 'active';
                  return (
                    <tr key={p.id} className="hover:bg-[#f5faf7]/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-50 rounded-lg border border-[#dcebe2] p-0.5 flex items-center justify-center shrink-0">
                            {p.image ? (
                              <img
                                src={p.image}
                                alt={p.name}
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <Package className="w-5 h-5 text-slate-300" />
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-[#12352a] text-xs sm:text-sm">{p.name}</div>
                            {p.description && (
                              <div className="text-[11px] text-[#688177] line-clamp-1">{p.description}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[#688177]">{cat?.name || '—'}</td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                        <div>{p.sku}</div>
                        <div className="text-[10px] text-slate-400">{p.barcode}</div>
                      </td>
                      {canSeeProfits && (
                        <td className="py-3 px-4 text-right font-mono font-semibold text-slate-700">
                          {formatMoney(p.buyPrice, currency)}
                        </td>
                      )}
                      <td className="py-3 px-4 text-right font-mono font-bold text-[#0b6b45]">
                        {formatMoney(p.sellPrice, currency)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-1 font-mono font-bold text-xs">
                          <span className={isLow ? 'text-amber-700' : 'text-[#12352a]'}>{p.stock}</span>
                          {isLow && (
                            <span className="p-0.5 bg-amber-100 text-amber-800 rounded text-[10px]" title="Low stock alert">
                              <AlertTriangle className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            p.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {p.status === 'active' ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(p)}
                            className="p-1.5 text-slate-600 hover:text-[#0b6b45] hover:bg-slate-100 rounded-lg transition-colors"
                            title="এডিট করুন"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {canDelete && (
                            <button
                              onClick={() => handleDelete(p.id, p.name)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="মুছুন"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-[#dcebe2] my-8 overflow-hidden">
            <div className="p-5 border-b border-[#dcebe2] flex items-center justify-between bg-[#f5faf7]">
              <h3 className="font-bold text-base text-[#12352a]">
                {editingProduct ? 'পণ্য সংশোধন করুন (Edit Product)' : 'নতুন পণ্য যুক্ত করুন (Add Product)'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {modalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
                  {modalError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#12352a] mb-1">পণ্যের নাম *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-[#f5faf7] border border-[#dcebe2] rounded-xl focus:outline-none focus:border-[#21ad70]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#12352a] mb-1">ক্যাটাগরি</label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-[#f5faf7] border border-[#dcebe2] rounded-xl focus:outline-none"
                  >
                    <option value="">ক্যাটাগরি নির্বাচন করুন</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#12352a] mb-1">স্ট্যাটাস</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3.5 py-2 text-xs bg-[#f5faf7] border border-[#dcebe2] rounded-xl focus:outline-none"
                  >
                    <option value="active">সক্রিয় (Active)</option>
                    <option value="inactive">নিষ্ক্রিয় (Inactive)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#12352a] mb-1">SKU কোড</label>
                  <input
                    type="text"
                    placeholder="খালি রাখলে স্বয়ংক্রিয় হবে"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-[#f5faf7] border border-[#dcebe2] rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#12352a] mb-1">বারকোড (Barcode)</label>
                  <input
                    type="text"
                    placeholder="খালি রাখলে স্বয়ংক্রিয় হবে"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-[#f5faf7] border border-[#dcebe2] rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#12352a] mb-1">ক্রয়মূল্য (Buy Price)</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={formData.buyPrice}
                    onChange={(e) => setFormData({ ...formData, buyPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2 text-xs bg-[#f5faf7] border border-[#dcebe2] rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#12352a] mb-1">বিক্রয়মূল্য (Sell Price) *</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    required
                    value={formData.sellPrice}
                    onChange={(e) => setFormData({ ...formData, sellPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2 text-xs bg-[#f5faf7] border border-[#dcebe2] rounded-xl font-mono font-bold text-[#0b6b45]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#12352a] mb-1">বর্তমান স্টক (Stock Qty)</label>
                  <input
                    type="number"
                    min={0}
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2 text-xs bg-[#f5faf7] border border-[#dcebe2] rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#12352a] mb-1">স্বল্প স্টক সতর্কতা লিমিট</label>
                  <input
                    type="number"
                    min={0}
                    value={formData.lowStockThreshold}
                    onChange={(e) => setFormData({ ...formData, lowStockThreshold: parseFloat(e.target.value) || 5 })}
                    className="w-full px-3.5 py-2 text-xs bg-[#f5faf7] border border-[#dcebe2] rounded-xl font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#12352a] mb-1">ছবির লিঙ্ক (URL) অথবা ফাইল আপলোড</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="https://..."
                      value={formData.image}
                      onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                      className="flex-1 px-3.5 py-2 text-xs bg-[#f5faf7] border border-[#dcebe2] rounded-xl"
                    />
                    <label className="flex items-center gap-1.5 px-3 py-2 bg-[#f5faf7] hover:bg-[#e8f7ee] border border-[#dcebe2] rounded-xl cursor-pointer text-xs font-semibold text-[#0b6b45]">
                      <UploadCloud className="w-4 h-4" />
                      <span>আপলোড</span>
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    </label>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#12352a] mb-1">বিবরণ (Description)</label>
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-[#f5faf7] border border-[#dcebe2] rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#dcebe2]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#688177] hover:bg-slate-100 rounded-xl"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 text-xs font-bold text-white bg-[#0b6b45] hover:bg-[#21ad70] rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
