import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { formatMoney } from '../../lib/money.ts';
import { getDhakaToday } from '../../lib/dates.ts';
import { DollarSign, Plus, Edit2, Trash2, X, Filter } from 'lucide-react';

interface Expense {
  id: number;
  title: string;
  category: string;
  amount: number;
  expenseDate: string;
  notes: string;
}

export const ExpensesView: React.FC = () => {
  const { token, user, shop } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExp, setEditingExp] = useState<Expense | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('other');
  const [amount, setAmount] = useState<number>(0);
  const [expenseDate, setExpenseDate] = useState(getDhakaToday());
  const [notes, setNotes] = useState('');

  const currency = shop?.currencySymbol || '৳';
  const canManage = user?.role === 'admin' || user?.role === 'manager';

  const fetchExpenses = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      if (fromDate) params.append('from', fromDate);
      if (toDate) params.append('to', toDate);

      const res = await fetch(`/api/admin/expenses?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setExpenses(json.data.expenses);
        setTotalAmount(json.data.totalAmount);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchExpenses();
  }, [token, categoryFilter, fromDate, toDate]);

  const openAdd = () => {
    setEditingExp(null);
    setTitle('');
    setCategory('other');
    setAmount(0);
    setExpenseDate(getDhakaToday());
    setNotes('');
    setIsModalOpen(true);
  };

  const openEdit = (exp: Expense) => {
    setEditingExp(exp);
    setTitle(exp.title);
    setCategory(exp.category);
    setAmount(exp.amount);
    setExpenseDate(exp.expenseDate);
    setNotes(exp.notes || '');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingExp ? `/api/admin/expenses/${editingExp.id}` : '/api/admin/expenses';
      const method = editingExp ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title, category, amount, expenseDate, notes }),
      });
      const json = await res.json();
      if (json.success) {
        setIsModalOpen(false);
        fetchExpenses();
      } else {
        alert(json.message || 'ব্যর্থ হয়েছে');
      }
    } catch {
      alert('সার্ভার এরর');
    }
  };

  const handleDelete = async (id: number, expTitle: string) => {
    if (!confirm(`আপনি কি "${expTitle}" খরচের হিসাবটি মুছে ফেলতে চান?`)) return;

    try {
      const res = await fetch(`/api/admin/expenses/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        fetchExpenses();
      } else {
        alert(json.message || 'ব্যর্থ হয়েছে');
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
            <DollarSign className="w-5 h-5 text-[#0b6b45]" />
            দোকানের খরচের হিসাব (Expenses)
          </h2>
          <p className="text-xs text-[#688177]">
            ভাড়া, বিদ্যুৎ, বেতন ও দৈনন্দিন খরচের বিবরণ
          </p>
        </div>
        {canManage && (
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#0b6b45] hover:bg-[#21ad70] rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            নতুন খরচ এন্ট্রি
          </button>
        )}
      </div>

      {/* Filter and summary bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 p-4 bg-white rounded-2xl border border-[#dcebe2] shadow-xs flex flex-wrap gap-2 items-center text-xs">
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="px-2.5 py-1.5 bg-[#f5faf7] border border-[#dcebe2] rounded-xl"
            title="শুরুর তারিখ"
          />
          <span>হতে</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="px-2.5 py-1.5 bg-[#f5faf7] border border-[#dcebe2] rounded-xl"
            title="শেষ তারিখ"
          />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 bg-[#f5faf7] border border-[#dcebe2] rounded-xl capitalize"
          >
            <option value="all">সকল ক্যাটাগরি</option>
            <option value="rent">দোকান ভাড়া (Rent)</option>
            <option value="salary">কর্মচারী বেতন (Salary)</option>
            <option value="utility">বিদ্যুৎ/পানি বিল (Utility)</option>
            <option value="transport">পরিবহন খরচ (Transport)</option>
            <option value="purchase">পণ্য কেনা (Purchase)</option>
            <option value="other">অন্যান্য (Other)</option>
          </select>
          {(fromDate || toDate || categoryFilter !== 'all') && (
            <button
              onClick={() => {
                setFromDate('');
                setToDate('');
                setCategoryFilter('all');
              }}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl"
            >
              রিসেট
            </button>
          )}
        </div>

        {/* Total Expense Tile */}
        <div className="p-4 bg-white rounded-2xl border border-[#dcebe2] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-[#688177]">মোট ব্যয় (নির্বাচিত সময়ের)</span>
            <div className="text-xl font-bold text-rose-700 font-inter tabular-nums mt-0.5">
              {formatMoney(totalAmount, currency)}
            </div>
          </div>
          <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-2xl border border-[#dcebe2] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f5faf7] text-[#688177] border-b border-[#dcebe2]">
              <tr>
                <th className="py-3 px-4 font-semibold">তারিখ</th>
                <th className="py-3 px-4 font-semibold">খরচের বিবরণ</th>
                <th className="py-3 px-4 font-semibold">ক্যাটাগরি</th>
                <th className="py-3 px-4 font-semibold">নোট</th>
                <th className="py-3 px-4 font-semibold text-right">টাকা</th>
                <th className="py-3 px-4 font-semibold text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f5faf7]">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#688177]">লোড হচ্ছে...</td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#688177]">কোনো খরচ পাওয়া যায়নি</td>
                </tr>
              ) : (
                expenses.map((e) => (
                  <tr key={e.id} className="hover:bg-[#f5faf7]/60">
                    <td className="py-3 px-4 font-mono text-slate-600">{e.expenseDate}</td>
                    <td className="py-3 px-4 font-bold text-[#12352a]">{e.title}</td>
                    <td className="py-3 px-4">
                      <span className="capitalize px-2 py-0.5 bg-slate-100 rounded text-[11px] text-slate-700">
                        {e.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#688177]">{e.notes || '—'}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-rose-600">
                      {formatMoney(e.amount, currency)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {canManage && (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEdit(e)}
                            className="p-1.5 text-slate-600 hover:text-[#0b6b45] hover:bg-slate-100 rounded-lg"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(e.id, e.title)}
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

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#dcebe2] space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#dcebe2]">
              <h3 className="font-bold text-sm text-[#12352a]">
                {editingExp ? 'খরচ সংশোধন' : 'নতুন খরচ এন্ট্রি'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#12352a] mb-1">খরচের নাম / বিবরণ *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#f5faf7] border border-[#dcebe2] rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#12352a] mb-1">ক্যাটাগরি</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#f5faf7] border border-[#dcebe2] rounded-xl capitalize"
                  >
                    <option value="rent">দোকান ভাড়া (Rent)</option>
                    <option value="salary">বেতন (Salary)</option>
                    <option value="utility">ইউটিলিটি (Utility)</option>
                    <option value="transport">পরিবহন (Transport)</option>
                    <option value="purchase">পারচেজ (Purchase)</option>
                    <option value="other">অন্যান্য (Other)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#12352a] mb-1">তারিখ *</label>
                  <input
                    type="date"
                    required
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#f5faf7] border border-[#dcebe2] rounded-xl"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#12352a] mb-1">টাকার পরিমাণ *</label>
                <input
                  type="number"
                  min={1}
                  step="0.01"
                  required
                  value={amount || ''}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-sm font-bold font-mono text-rose-600 bg-[#f5faf7] border border-[#dcebe2] rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#12352a] mb-1">নোট / মন্তব্য</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#f5faf7] border border-[#dcebe2] rounded-xl"
                />
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
