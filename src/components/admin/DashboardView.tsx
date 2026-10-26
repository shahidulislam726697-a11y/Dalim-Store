import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { formatMoney } from '../../lib/money.ts';
import { formatDhakaDateTime } from '../../lib/dates.ts';
import {
  TrendingUp,
  Receipt,
  DollarSign,
  Package,
  AlertTriangle,
  ArrowUpRight,
  ShoppingCart,
  Calendar,
} from 'lucide-react';

interface DashboardData {
  todaySales: number;
  invoicesToday: number;
  grossProfitToday?: number;
  todayExpense: number;
  netProfitToday?: number;
  lowStockCount: number;
  totalStockQty: number;
  stockValue?: number;
  expectedProfit?: number;
  stockAddedToday: number;
  recentSales: Array<{
    id: number;
    invoiceNo: string;
    total: number;
    paid: number;
    due: number;
    customerName: string;
    paymentMethod: string;
    createdAt: string;
    status: string;
  }>;
}

export const DashboardView: React.FC<{ onNavigateToPos: () => void; onNavigateToProducts: (filter?: string) => void }> = ({
  onNavigateToPos,
  onNavigateToProducts,
}) => {
  const { token, user, shop } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const currency = shop?.currencySymbol || '৳';
  const canSeeProfits = user?.role === 'admin' || user?.role === 'manager';

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await fetch('/api/admin/dashboard', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (json.success) {
          setData(json.data);
        }
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setIsLoading(false);
      }
    };
    if (token) fetchDashboard();
  }, [token]);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-white rounded-2xl border border-[#dcebe2]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="p-6 bg-gradient-to-r from-[#0b6b45] to-[#21ad70] rounded-2xl text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-[#2de4a0] uppercase tracking-wider">ড্যাশবোর্ড ওভারভিউ</span>
          <h2 className="text-xl sm:text-2xl font-bold mt-1">
            স্বাগতম, {user?.fullName}!
          </h2>
          <p className="text-xs text-white/80 mt-0.5">
            আজকের সার্বিক বিক্রয়, ইনভেন্টরি ও আর্থিক বিবরণী এক নজরে।
          </p>
        </div>
        <button
          onClick={onNavigateToPos}
          className="flex items-center gap-2 px-5 py-2.5 bg-white text-[#0b6b45] hover:bg-[#2de4a0] hover:text-[#0b6b45] rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer self-start sm:self-auto"
        >
          <ShoppingCart className="w-4 h-4" />
          নতুন বিক্রয় (POS)
        </button>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Sales */}
        <div className="p-5 bg-white rounded-2xl border border-[#dcebe2] shadow-xs">
          <div className="flex items-center justify-between text-[#688177]">
            <span className="text-xs font-medium">আজকের বিক্রয় (Today's Sales)</span>
            <div className="p-2 bg-[#e8f7ee] text-[#0b6b45] rounded-xl">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#12352a] mt-2 font-inter tabular-nums">
            {formatMoney(data?.todaySales || 0, currency)}
          </div>
          <div className="text-[11px] text-[#688177] mt-1 flex items-center gap-1">
            <span>আজকের মোট ইনভয়েস:</span>
            <span className="font-bold text-[#0b6b45] font-inter tabular-nums">{data?.invoicesToday || 0}টি</span>
          </div>
        </div>

        {/* Today's Expense */}
        <div className="p-5 bg-white rounded-2xl border border-[#dcebe2] shadow-xs">
          <div className="flex items-center justify-between text-[#688177]">
            <span className="text-xs font-medium">আজকের খরচ (Today's Expense)</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-700 mt-2 font-inter tabular-nums">
            {formatMoney(data?.todayExpense || 0, currency)}
          </div>
          <div className="text-[11px] text-[#688177] mt-1">দোকানের যাবতীয় দৈনিক খরচ</div>
        </div>

        {/* Gross Profit (Cashier cannot see) */}
        {canSeeProfits && (
          <div className="p-5 bg-white rounded-2xl border border-[#dcebe2] shadow-xs">
            <div className="flex items-center justify-between text-[#688177]">
              <span className="text-xs font-medium">আজকের মোট লাভ (Gross Profit)</span>
              <div className="p-2 bg-[#e8f7ee] text-[#21ad70] rounded-xl">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-[#0b6b45] mt-2 font-inter tabular-nums">
              {formatMoney(data?.grossProfitToday || 0, currency)}
            </div>
            <div className="text-[11px] text-[#688177] mt-1">বিক্রিত পণ্যের গড় লাভ</div>
          </div>
        )}

        {/* Net Profit (Gross - Expense) */}
        {canSeeProfits && (
          <div className="p-5 bg-white rounded-2xl border border-[#dcebe2] shadow-xs">
            <div className="flex items-center justify-between text-[#688177]">
              <span className="text-xs font-medium">আজকের নিট লাভ (Net Profit)</span>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div
              className={`text-2xl font-bold mt-2 font-inter tabular-nums ${
                (data?.netProfitToday || 0) >= 0 ? 'text-[#0b6b45]' : 'text-rose-600'
              }`}
            >
              {formatMoney(data?.netProfitToday || 0, currency)}
            </div>
            <div className="text-[11px] text-[#688177] mt-1">মোট লাভ − আজকের খরচ</div>
          </div>
        )}
      </div>

      {/* Inventory & Stock Health KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Low Stock Alert */}
        <div
          onClick={() => onNavigateToProducts('low')}
          className="p-4 bg-white rounded-2xl border border-[#dcebe2] shadow-xs hover:border-amber-400 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#688177]">স্বল্প স্টক পণ্য (Low Stock)</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-bold text-amber-700 mt-1 font-inter tabular-nums">
            {data?.lowStockCount || 0} টি
          </div>
          <span className="text-[10px] text-amber-600 font-medium">ক্লিক করে পণ্যগুলো দেখুন →</span>
        </div>

        {/* Total Stock Quantity */}
        <div className="p-4 bg-white rounded-2xl border border-[#dcebe2] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#688177]">মোট মজুদ (Total Stock)</span>
            <Package className="w-4 h-4 text-[#0b6b45]" />
          </div>
          <div className="text-xl font-bold text-[#12352a] mt-1 font-inter tabular-nums">
            {data?.totalStockQty || 0} টি
          </div>
          <span className="text-[10px] text-[#688177]">সকল সক্রিয় পণ্যের মোট সংখ্যা</span>
        </div>

        {/* Stock Value */}
        {canSeeProfits && (
          <div className="p-4 bg-white rounded-2xl border border-[#dcebe2] shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#688177]">মজুদ পণ্যের ক্রয়মূল্য</span>
              <DollarSign className="w-4 h-4 text-[#21ad70]" />
            </div>
            <div className="text-xl font-bold text-[#12352a] mt-1 font-inter tabular-nums">
              {formatMoney(data?.stockValue || 0, currency)}
            </div>
            <span className="text-[10px] text-[#688177]">বর্তমান ইনভেন্টরি ভ্যালু</span>
          </div>
        )}

        {/* Stock Added Today */}
        <div className="p-4 bg-white rounded-2xl border border-[#dcebe2] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#688177]">আজ নতুন স্টক যুক্ত</span>
            <Receipt className="w-4 h-4 text-[#0b6b45]" />
          </div>
          <div className="text-xl font-bold text-[#0b6b45] mt-1 font-inter tabular-nums">
            +{data?.stockAddedToday || 0} টি
          </div>
          <span className="text-[10px] text-[#688177]">আজকের পারচেজ এন্ট্রি</span>
        </div>
      </div>

      {/* Recent Sales Table */}
      <div className="bg-white rounded-2xl border border-[#dcebe2] shadow-xs overflow-hidden">
        <div className="p-5 border-b border-[#dcebe2] flex items-center justify-between">
          <h3 className="font-bold text-sm sm:text-base text-[#12352a] flex items-center gap-2">
            <Receipt className="w-4 h-4 text-[#0b6b45]" />
            সর্বশেষ বিক্রয়সমূহ (Recent Invoices)
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f5faf7] text-[#688177] border-b border-[#dcebe2]">
              <tr>
                <th className="py-3 px-4 font-semibold">ইনভয়েস নং</th>
                <th className="py-3 px-4 font-semibold">ক্রেতা</th>
                <th className="py-3 px-4 font-semibold">তারিখ ও সময়</th>
                <th className="py-3 px-4 font-semibold text-right">মোট টাকা</th>
                <th className="py-3 px-4 font-semibold text-right">পরিশোধ</th>
                <th className="py-3 px-4 font-semibold text-right">বাকি</th>
                <th className="py-3 px-4 font-semibold text-center">মাধ্যম</th>
                <th className="py-3 px-4 font-semibold text-center">স্ট্যাটাস</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f5faf7]">
              {data?.recentSales && data.recentSales.length > 0 ? (
                data.recentSales.map((s) => (
                  <tr key={s.id} className="hover:bg-[#f5faf7]/50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#0b6b45]">{s.invoiceNo}</td>
                    <td className="py-3 px-4 font-medium text-[#12352a]">{s.customerName}</td>
                    <td className="py-3 px-4 text-[#688177] font-mono">{formatDhakaDateTime(s.createdAt)}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-[#12352a]">
                      {formatMoney(s.total, currency)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-[#0b6b45]">
                      {formatMoney(s.paid, currency)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-rose-600 font-semibold">
                      {s.due > 0 ? formatMoney(s.due, currency) : '—'}
                    </td>
                    <td className="py-3 px-4 text-center capitalize text-[#688177]">{s.paymentMethod}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#688177]">
                    এখনো কোনো বিক্রয় সম্পন্ন হয়নি
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
