import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { formatMoney } from '../../lib/money.ts';
import { formatDhakaDateTime } from '../../lib/dates.ts';
import { Users, UserPlus, Search, DollarSign, BookOpen, Edit2, X, Check } from 'lucide-react';

interface Customer {
  id: number;
  name: string;
  phone: string;
  address: string;
  totalPurchases: number;
  totalPaid: number;
  due: number;
}

export const CustomersView: React.FC = () => {
  const { token, shop } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Add/Edit Customer Modal
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  // Collect Payment Modal
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payCustomer, setPayCustomer] = useState<Customer | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<string>('cash');
  const [payRef, setPayRef] = useState<string>('');
  const [payNotes, setPayNotes] = useState<string>('');

  // Customer Ledger Modal
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);
  const [ledgerData, setLedgerData] = useState<any | null>(null);

  const currency = shop?.currencySymbol || '৳';

  const fetchCustomers = async () => {
    try {
      const q = searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : '';
      const res = await fetch(`/api/admin/customers${q}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) setCustomers(json.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchCustomers();
  }, [token, searchQuery]);

  const openAdd = () => {
    setEditingCustomer(null);
    setName('');
    setPhone('');
    setAddress('');
    setIsCustomerModalOpen(true);
  };

  const openEdit = (c: Customer) => {
    setEditingCustomer(c);
    setName(c.name);
    setPhone(c.phone);
    setAddress(c.address || '');
    setIsCustomerModalOpen(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingCustomer ? `/api/admin/customers/${editingCustomer.id}` : '/api/admin/customers';
      const method = editingCustomer ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, phone, address }),
      });
      const json = await res.json();
      if (json.success) {
        setIsCustomerModalOpen(false);
        fetchCustomers();
      } else {
        alert(json.message || 'সংরক্ষণ করা যায়নি');
      }
    } catch {
      alert('সার্ভার এরর');
    }
  };

  const openPayModal = (c: Customer) => {
    setPayCustomer(c);
    setPayAmount(c.due);
    setPayMethod('cash');
    setPayRef('');
    setPayNotes('');
    setIsPayModalOpen(true);
  };

  const handleCollectPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payCustomer || payAmount <= 0) return;

    try {
      const res = await fetch(`/api/admin/customers/${payCustomer.id}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: payAmount,
          method: payMethod,
          referenceNo: payRef,
          notes: payNotes,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setIsPayModalOpen(false);
        fetchCustomers();
        alert('বাকি টাকা সফলভাবে আদায় করা হয়েছে!');
      } else {
        alert(json.message || 'পেমেন্ট গ্রহণ করা যায়নি');
      }
    } catch {
      alert('সার্ভার এরর');
    }
  };

  const openLedger = async (c: Customer) => {
    try {
      const res = await fetch(`/api/admin/customers/${c.id}/ledger`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setLedgerData(json.data);
        setIsLedgerOpen(true);
      }
    } catch {
      alert('লেজার লোড করা যায়নি');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#12352a] flex items-center gap-2">
            <Users className="w-5 h-5 text-[#0b6b45]" />
            কাস্টমার ও বাকি খাতা (Customers & Due Ledger)
          </h2>
          <p className="text-xs text-[#688177]">
            গ্রাহকদের বাকির হিসাব, মোট ক্রয় এবং নগদ আদায়
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#0b6b45] hover:bg-[#21ad70] rounded-xl shadow-xs transition-all cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          নতুন কাস্টমার
        </button>
      </div>

      <div className="p-4 bg-white rounded-2xl border border-[#dcebe2] shadow-xs flex items-center justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#688177]" />
          <input
            type="text"
            placeholder="কাস্টমারের নাম বা ফোন নম্বর..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-[#f5faf7] border border-[#dcebe2] rounded-xl focus:outline-none focus:border-[#21ad70]"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#dcebe2] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f5faf7] text-[#688177] border-b border-[#dcebe2]">
              <tr>
                <th className="py-3 px-4 font-semibold">কাস্টমারের নাম</th>
                <th className="py-3 px-4 font-semibold">মোবাইল নম্বর</th>
                <th className="py-3 px-4 font-semibold">ঠিকানা</th>
                <th className="py-3 px-4 font-semibold text-right">মোট ক্রয়</th>
                <th className="py-3 px-4 font-semibold text-right">মোট পরিশোধ</th>
                <th className="py-3 px-4 font-semibold text-right">বর্তমান বাকি (Due)</th>
                <th className="py-3 px-4 font-semibold text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f5faf7]">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#688177]">লোড হচ্ছে...</td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#688177]">কোনো কাস্টমার পাওয়া যায়নি</td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id} className="hover:bg-[#f5faf7]/60">
                    <td className="py-3 px-4 font-bold text-[#12352a]">{c.name}</td>
                    <td className="py-3 px-4 font-mono text-[#0b6b45]">{c.phone}</td>
                    <td className="py-3 px-4 text-[#688177]">{c.address || '—'}</td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-700">
                      {formatMoney(c.totalPurchases, currency)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-[#0b6b45]">
                      {formatMoney(c.totalPaid, currency)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-rose-600">
                      {c.due > 0 ? formatMoney(c.due, currency) : '০.০০'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {c.due > 0 && (
                          <button
                            onClick={() => openPayModal(c)}
                            className="px-2.5 py-1 text-[11px] font-bold text-white bg-emerald-700 hover:bg-emerald-600 rounded-lg flex items-center gap-1 shadow-xs"
                            title="বাকি টাকা আদায় করুন"
                          >
                            <DollarSign className="w-3 h-3" />
                            আদায়
                          </button>
                        )}
                        <button
                          onClick={() => openLedger(c)}
                          className="p-1.5 text-slate-600 hover:text-[#0b6b45] hover:bg-slate-100 rounded-lg"
                          title="খতিয়ান / লেজার"
                        >
                          <BookOpen className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEdit(c)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
                          title="এডিট"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Customer Modal */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#dcebe2] space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#dcebe2]">
              <h3 className="font-bold text-sm text-[#12352a]">
                {editingCustomer ? 'কাস্টমার তথ্য সংশোধন' : 'নতুন কাস্টমার তৈরি করুন'}
              </h3>
              <button onClick={() => setIsCustomerModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveCustomer} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#12352a] mb-1">পূর্ণ নাম *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#f5faf7] border border-[#dcebe2] rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#12352a] mb-1">মোবাইল নম্বর *</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#f5faf7] border border-[#dcebe2] rounded-xl"
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
              <div className="flex justify-end gap-2 pt-2 border-t border-[#dcebe2]">
                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(false)}
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

      {/* Collect Payment Modal */}
      {isPayModalOpen && payCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#dcebe2] space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#dcebe2]">
              <div>
                <h3 className="font-bold text-sm text-[#12352a]">বাকি টাকা আদায় (Collect Payment)</h3>
                <p className="text-xs text-[#688177]">গ্রাহক: {payCustomer.name} (বাকি: {formatMoney(payCustomer.due, currency)})</p>
              </div>
              <button onClick={() => setIsPayModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCollectPayment} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#12352a] mb-1">আদায়ের পরিমাণ *</label>
                <input
                  type="number"
                  min={1}
                  max={payCustomer.due}
                  step="0.01"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-sm font-bold font-mono text-[#0b6b45] bg-[#f5faf7] border border-[#dcebe2] rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#12352a] mb-1">পেমেন্ট মাধ্যম</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#f5faf7] border border-[#dcebe2] rounded-xl"
                >
                  <option value="cash">নগদ (Cash)</option>
                  <option value="bkash">বিকাশ (bKash)</option>
                  <option value="nagad">নগদ (Nagad)</option>
                  <option value="bank">ব্যাংক (Bank)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#12352a] mb-1">ট্রানজেকশন / রেফারেন্স নং</label>
                <input
                  type="text"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#f5faf7] border border-[#dcebe2] rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#12352a] mb-1">নোট</label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#f5faf7] border border-[#dcebe2] rounded-xl"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-[#dcebe2]">
                <button
                  type="button"
                  onClick={() => setIsPayModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-[#0b6b45] hover:bg-[#21ad70] rounded-lg shadow-xs"
                >
                  পেমেন্ট নিশ্চিত করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Ledger Modal */}
      {isLedgerOpen && ledgerData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-[#dcebe2] space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#dcebe2]">
              <div>
                <h3 className="font-bold text-base text-[#12352a]">গ্রাহক খতিয়ান (Ledger)</h3>
                <p className="text-xs text-[#688177]">
                  {ledgerData.customer.name} · মোবাইল: {ledgerData.customer.phone}
                </p>
              </div>
              <button onClick={() => setIsLedgerOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#0b6b45] mb-2">ইনভয়েস সমূহ</h4>
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#f5faf7] text-slate-600 border-b border-[#dcebe2]">
                    <tr>
                      <th className="p-2">ইনভয়েস</th>
                      <th className="p-2">তারিখ</th>
                      <th className="p-2 text-right">মোট</th>
                      <th className="p-2 text-right">পরিশোধ</th>
                      <th className="p-2 text-right">বাকি</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {ledgerData.sales.map((s: any) => (
                      <tr key={s.id}>
                        <td className="p-2 font-bold text-[#0b6b45]">{s.invoiceNo}</td>
                        <td className="p-2 text-slate-600">{formatDhakaDateTime(s.createdAt)}</td>
                        <td className="p-2 text-right">{formatMoney(s.total, currency)}</td>
                        <td className="p-2 text-right text-emerald-700">{formatMoney(s.paid, currency)}</td>
                        <td className="p-2 text-right text-rose-600 font-semibold">{formatMoney(s.due, currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#0b6b45] mb-2">পরিশোধের ইতিহাস</h4>
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#f5faf7] text-slate-600 border-b border-[#dcebe2]">
                    <tr>
                      <th className="p-2">তারিখ</th>
                      <th className="p-2">মাধ্যম</th>
                      <th className="p-2">রেফারেন্স</th>
                      <th className="p-2 text-right">টাকা</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {ledgerData.payments.map((p: any) => (
                      <tr key={p.id}>
                        <td className="p-2 text-slate-600">{formatDhakaDateTime(p.createdAt)}</td>
                        <td className="p-2 capitalize">{p.method}</td>
                        <td className="p-2">{p.referenceNo || '—'}</td>
                        <td className="p-2 text-right font-bold text-emerald-700">{formatMoney(p.amount, currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
