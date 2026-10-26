import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { formatMoney } from '../../lib/money.ts';
import { formatDhakaDateTime, getDhakaToday } from '../../lib/dates.ts';
import { InvoiceModal } from '../InvoiceModal.tsx';
import { Receipt, Search, Eye, RotateCcw, Filter, Globe, CheckCircle } from 'lucide-react';

interface Sale {
  id: number;
  invoiceNo: string;
  subtotal: number;
  discount: number;
  total: number;
  paid: number;
  due: number;
  paymentMethod: string;
  status: 'completed' | 'cancelled' | 'returned';
  notes: string;
  customerName: string;
  customerPhone: string;
  createdAt: string;
}

export const SalesView: React.FC = () => {
  const { token, user, shop } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Selected Sale for Invoice Modal
  const [selectedSaleDetail, setSelectedSaleDetail] = useState<any | null>(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);

  const currency = shop?.currencySymbol || '৳';
  const canReturn = user?.role === 'admin' || user?.role === 'manager';

  const fetchSales = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('q', searchQuery);
      if (statusFilter) params.append('status', statusFilter);
      if (fromDate) params.append('from', fromDate);
      if (toDate) params.append('to', toDate);
      params.append('page', String(page));
      params.append('limit', '25');

      const res = await fetch(`/api/admin/sales?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setSales(json.data.sales);
        setTotalCount(json.data.totalCount);
        setTotalPages(json.data.totalPages);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchSales();
  }, [token, page, statusFilter, fromDate, toDate]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchSales();
  };

  const handleViewInvoice = async (saleId: number) => {
    try {
      const res = await fetch(`/api/admin/sales/${saleId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        const { sale, items, customer, shop: saleShop } = json.data;
        setSelectedSaleDetail({
          invoiceNo: sale.invoiceNo,
          createdAt: sale.createdAt,
          customerName: customer ? customer.name : 'সাধারণ ক্রেতা',
          customerPhone: customer ? customer.phone : '',
          items: items.map((i: any) => ({
            productName: i.productName,
            qty: i.qty,
            sellPrice: i.sellPrice,
            lineTotal: i.lineTotal,
          })),
          subtotal: sale.subtotal,
          discount: sale.discount,
          total: sale.total,
          paid: sale.paid,
          due: sale.due,
          paymentMethod: sale.paymentMethod,
          notes: sale.notes,
        });
        setIsInvoiceOpen(true);
      }
    } catch {
      alert('ইনভয়েস লোড করা যায়নি');
    }
  };

  const handleCancelOrReturn = async (saleId: number, invoiceNo: string, type: 'cancelled' | 'returned') => {
    const actionBn = type === 'returned' ? 'পণ্য ফেরত (Return)' : 'বিক্রয় বাতিল (Cancel)';
    if (!confirm(`আপনি কি ইনভয়েস "${invoiceNo}" এর জন্য ${actionBn} করতে চান? এর ফলে পণ্যের স্টক পুনরায় ফিরে আসবে।`)) return;

    try {
      const res = await fetch(`/api/admin/sales/${saleId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type }),
      });
      const json = await res.json();
      if (json.success) {
        alert(`${invoiceNo} সফলভাবে ${type} করা হয়েছে এবং স্টক সমন্বয় করা হয়েছে।`);
        fetchSales();
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
            <Receipt className="w-5 h-5 text-[#0b6b45]" />
            বিক্রয় ও ইনভয়েস তালিকা (Sales & Invoices)
          </h2>
          <p className="text-xs text-[#688177]">
            সমস্ত স্টোর ও অনলাইন অর্ডারের হিসাব, চালান এবং রিটার্ন
          </p>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="p-4 bg-white rounded-2xl border border-[#dcebe2] shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#688177]" />
          <input
            type="text"
            placeholder="ইনভয়েস বা বিবরণ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-[#f5faf7] border border-[#dcebe2] rounded-xl focus:outline-none focus:border-[#21ad70]"
          />
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto text-xs">
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="px-2.5 py-1.5 bg-[#f5faf7] border border-[#dcebe2] rounded-xl text-slate-700"
            title="শুরুর তারিখ"
          />
          <span>হতে</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="px-2.5 py-1.5 bg-[#f5faf7] border border-[#dcebe2] rounded-xl text-slate-700"
            title="শেষ তারিখ"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-[#f5faf7] border border-[#dcebe2] rounded-xl"
          >
            <option value="">সকল স্ট্যাটাস</option>
            <option value="completed">সম্পন্ন (Completed)</option>
            <option value="returned">ফেরত (Returned)</option>
            <option value="cancelled">বাতিল (Cancelled)</option>
          </select>
          {(fromDate || toDate || statusFilter || searchQuery) && (
            <button
              onClick={() => {
                setFromDate('');
                setToDate('');
                setStatusFilter('');
                setSearchQuery('');
              }}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl"
            >
              রিসেট
            </button>
          )}
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-2xl border border-[#dcebe2] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f5faf7] text-[#688177] border-b border-[#dcebe2]">
              <tr>
                <th className="py-3 px-4 font-semibold">ইনভয়েস নং</th>
                <th className="py-3 px-4 font-semibold">ক্রেতার তথ্য</th>
                <th className="py-3 px-4 font-semibold">তারিখ ও সময়</th>
                <th className="py-3 px-4 font-semibold text-right">মোট টাকা</th>
                <th className="py-3 px-4 font-semibold text-right">পরিশোধ</th>
                <th className="py-3 px-4 font-semibold text-right">বাকি</th>
                <th className="py-3 px-4 font-semibold text-center">মাধ্যম</th>
                <th className="py-3 px-4 font-semibold text-center">স্ট্যাটাস</th>
                <th className="py-3 px-4 font-semibold text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f5faf7]">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#688177]">লোড হচ্ছে...</td>
                </tr>
              ) : sales.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#688177]">কোনো বিক্রয় রেকর্ড পাওয়া যায়নি</td>
                </tr>
              ) : (
                sales.map((s) => {
                  const isWebOrder = s.invoiceNo.startsWith('WEB-');
                  return (
                    <tr key={s.id} className="hover:bg-[#f5faf7]/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-[#0b6b45]">
                        <div className="flex items-center gap-1.5">
                          {isWebOrder && (
                            <span className="p-1 bg-sky-100 text-sky-700 rounded text-[10px]" title="Online Storefront Order">
                              <Globe className="w-3 h-3" />
                            </span>
                          )}
                          <span>{s.invoiceNo}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#12352a]">{s.customerName}</div>
                        {s.customerPhone && <div className="text-[10px] text-[#688177] font-mono">{s.customerPhone}</div>}
                      </td>
                      <td className="py-3 px-4 font-mono text-[#688177]">{formatDhakaDateTime(s.createdAt)}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-[#12352a]">
                        {formatMoney(s.total, currency)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-[#0b6b45]">
                        {formatMoney(s.paid, currency)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-rose-600 font-bold">
                        {s.due > 0 ? formatMoney(s.due, currency) : '—'}
                      </td>
                      <td className="py-3 px-4 text-center capitalize text-slate-600">{s.paymentMethod}</td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            s.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : s.status === 'returned'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleViewInvoice(s.id)}
                            className="p-1.5 text-slate-600 hover:text-[#0b6b45] hover:bg-slate-100 rounded-lg"
                            title="রসিদ দেখুন / প্রিন্ট"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {canReturn && s.status === 'completed' && (
                            <button
                              onClick={() => handleCancelOrReturn(s.id, s.invoiceNo, 'returned')}
                              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg"
                              title="পণ্য ফেরত ও স্টক রিস্টোর (Return)"
                            >
                              <RotateCcw className="w-4 h-4" />
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

        {/* Pagination bar */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-[#dcebe2] flex items-center justify-between text-xs text-[#688177]">
            <span>মোট {totalCount} টি ইনভয়েস (পৃষ্ঠা {page} / {totalPages})</span>
            <div className="flex gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1 bg-white border border-[#dcebe2] rounded-lg disabled:opacity-40"
              >
                আগেরটি
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1 bg-white border border-[#dcebe2] rounded-lg disabled:opacity-40"
              >
                পরবর্তী
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Invoice Modal */}
      {selectedSaleDetail && (
        <InvoiceModal
          isOpen={isInvoiceOpen}
          onClose={() => setIsInvoiceOpen(false)}
          saleData={selectedSaleDetail}
          shopInfo={shop || { shopName: 'Dalim Store' }}
        />
      )}
    </div>
  );
};
