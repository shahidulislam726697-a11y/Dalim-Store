import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { Tag, Plus, Edit2, Trash2, X, Check } from 'lucide-react';

interface Category {
  id: number;
  name: string;
  description: string;
  isActive: boolean;
}

export const CategoriesView: React.FC = () => {
  const { token, user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [modalError, setModalError] = useState<string | null>(null);

  const canManage = user?.role === 'admin' || user?.role === 'manager';

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/admin/categories', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) setCategories(json.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchCategories();
  }, [token]);

  const openAdd = () => {
    setEditingCat(null);
    setName('');
    setDescription('');
    setIsActive(true);
    setModalError(null);
    setIsModalOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditingCat(cat);
    setName(cat.name);
    setDescription(cat.description || '');
    setIsActive(cat.isActive);
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    try {
      const url = editingCat ? `/api/admin/categories/${editingCat.id}` : '/api/admin/categories';
      const method = editingCat ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, description, isActive }),
      });
      const json = await res.json();
      if (json.success) {
        setIsModalOpen(false);
        fetchCategories();
      } else {
        setModalError(json.message || 'ব্যর্থ হয়েছে');
      }
    } catch {
      setModalError('সার্ভার এরর');
    }
  };

  const handleDelete = async (id: number, catName: string) => {
    if (!confirm(`আপনি কি "${catName}" ক্যাটাগরিটি মুছে ফেলতে চান? (এর অধীনে থাকা পণ্যের ক্যাটাগরি ফাঁকা হবে)`)) return;

    try {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        fetchCategories();
      } else {
        alert(json.message || 'মুছে ফেলা যায়নি');
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
            <Tag className="w-5 h-5 text-[#0b6b45]" />
            ক্যাটাগরি ব্যবস্থাপনা (Categories)
          </h2>
          <p className="text-xs text-[#688177]">
            দোকানের পণ্যসমূহ সুনির্দিষ্ট ক্যাটাগরিতে ভাগ করুন
          </p>
        </div>
        {canManage && (
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#0b6b45] hover:bg-[#21ad70] rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            নতুন ক্যাটাগরি
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-[#dcebe2] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f5faf7] text-[#688177] border-b border-[#dcebe2]">
              <tr>
                <th className="py-3 px-4 font-semibold">ক্যাটাগরির নাম</th>
                <th className="py-3 px-4 font-semibold">বিবরণ</th>
                <th className="py-3 px-4 font-semibold text-center">স্ট্যাটাস</th>
                <th className="py-3 px-4 font-semibold text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f5faf7]">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-[#688177]">লোড হচ্ছে...</td>
                </tr>
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-[#688177]">কোনো ক্যাটাগরি তৈরি করা হয়নি</td>
                </tr>
              ) : (
                categories.map((c) => (
                  <tr key={c.id} className="hover:bg-[#f5faf7]/60">
                    <td className="py-3 px-4 font-bold text-[#12352a]">{c.name}</td>
                    <td className="py-3 px-4 text-[#688177]">{c.description || '—'}</td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          c.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {c.isActive ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {canManage && (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEdit(c)}
                            className="p-1.5 text-slate-600 hover:text-[#0b6b45] hover:bg-slate-100 rounded-lg"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(c.id, c.name)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
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
                {editingCat ? 'ক্যাটাগরি সম্পাদনা' : 'নতুন ক্যাটাগরি যোগ করুন'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
                {modalError}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#12352a] mb-1">ক্যাটাগরির নাম *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#f5faf7] border border-[#dcebe2] rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#12352a] mb-1">বিবরণ</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#f5faf7] border border-[#dcebe2] rounded-xl"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-xs font-semibold text-[#12352a] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded text-[#0b6b45]"
                  />
                  সক্রিয় রাখুন (Active)
                </label>
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
                  className="px-4 py-1.5 text-xs font-bold text-white bg-[#0b6b45] hover:bg-[#21ad70] rounded-lg"
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
