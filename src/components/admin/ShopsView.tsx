import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { Store, Plus, Edit2, X, Check } from 'lucide-react';

interface ShopItem {
  id: number;
  shopName: string;
  phone: string;
  address: string;
  currencySymbol: string;
  invoicePrefix: string;
}

export const ShopsView: React.FC = () => {
  const { token } = useAuth();
  const [shops, setShops] = useState<ShopItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShop, setEditingShop] = useState<ShopItem | null>(null);
  const [shopName, setShopName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [currencySymbol, setCurrencySymbol] = useState('৳');
  const [invoicePrefix, setInvoicePrefix] = useState('INV');

  const fetchShops = async () => {
    try {
      const res = await fetch('/api/admin/shops', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) setShops(json.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchShops();
  }, [token]);

  const openAdd = () => {
    setEditingShop(null);
    setShopName('');
    setPhone('');
    setAddress('');
    setCurrencySymbol('৳');
    setInvoicePrefix('INV');
    setIsModalOpen(true);
  };

  const openEdit = (s: ShopItem) => {
    setEditingShop(s);
    setShopName(s.shopName);
    setPhone(s.phone || '');
    setAddress(s.address || '');
    setCurrencySymbol(s.currencySymbol || '৳');
    setInvoicePrefix(s.invoicePrefix || 'INV');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingShop ? `/api/admin/shops/${editingShop.id}` : '/api/admin/shops';
      const method = editingShop ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ shopName, phone, address, currencySymbol, invoicePrefix }),
      });
      const json = await res.json();
      if (json.success) {
        setIsModalOpen(false);
        fetchShops();
      } else {
        alert(json.message || 'সংরক্ষণ ব্যর্থ হয়েছে');
      }
    } catch {
      alert('সার্ভার এরর');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#12352a] flex items-center gap-2">
            <Store className="w-5 h-5 text-[#0b6b45]" />
            মাল্টি-শপ ব্যবস্থাপনা (Shops & Branches)
          </h2>
          <p className="text-xs text-[#688177]">
            দোকানের বিভিন্ন শাখা বা আউটলেট পরিচালনা করুন
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#0b6b45] hover:bg-[#21ad70] rounded-xl shadow-xs transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          নতুন শাখা যোগ করুন
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-[#dcebe2] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f5faf7] text-[#688177] border-b border-[#dcebe2]">
              <tr>
                <th className="py-3 px-4 font-semibold">দোকান / আউটলেটের নাম</th>
                <th className="py-3 px-4 font-semibold">ফোন নম্বর</th>
                <th className="py-3 px-4 font-semibold">ঠিকানা</th>
                <th className="py-3 px-4 font-semibold">কারেন্সি</th>
                <th className="py-3 px-4 font-semibold">ইনভয়েস প্রিফিক্স</th>
                <th className="py-3 px-4 font-semibold text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f5faf7]">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#688177]">লোড হচ্ছে...</td>
                </tr>
              ) : (
                shops.map((s) => (
                  <tr key={s.id} className="hover:bg-[#f5faf7]/60">
                    <td className="py-3 px-4 font-bold text-[#12352a]">{s.shopName}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{s.phone || '—'}</td>
                    <td className="py-3 px-4 text-[#688177]">{s.address || '—'}</td>
                    <td className="py-3 px-4 font-bold text-[#0b6b45]">{s.currencySymbol}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-700">{s.invoicePrefix}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => openEdit(s)}
                        className="p-1.5 text-slate-600 hover:text-[#0b6b45] hover:bg-slate-100 rounded-lg"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#dcebe2] space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#dcebe2]">
              <h3 className="font-bold text-sm text-[#12352a]">
                {editingShop ? 'শাখা তথ্য সম্পাদন' : 'নতুন দোকান / শাখা যোগ'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#12352a] mb-1">দোকানের নাম *</label>
                <input
                  type="text"
                  required
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#f5faf7] border border-[#dcebe2] rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#12352a] mb-1">ফোন নম্বর</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#f5faf7] border border-[#dcebe2] rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#12352a] mb-1">ঠিকানা</label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#f5faf7] border border-[#dcebe2] rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#12352a] mb-1">মুদ্রা (Currency)</label>
                  <input
                    type="text"
                    value={currencySymbol}
                    onChange={(e) => setCurrencySymbol(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#f5faf7] border border-[#dcebe2] rounded-xl font-bold text-[#0b6b45]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#12352a] mb-1">ইনভয়েস প্রিফিক্স</label>
                  <input
                    type="text"
                    value={invoicePrefix}
                    onChange={(e) => setInvoicePrefix(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#f5faf7] border border-[#dcebe2] rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#dcebe2]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-[#0b6b45] hover:bg-[#21ad70] rounded-lg shadow-xs"
                >
                  সংরক্ষণ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
