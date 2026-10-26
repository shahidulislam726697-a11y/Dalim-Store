import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useLanguage } from '../../context/LanguageContext.tsx';
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
  const { t } = useLanguage();
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
          <span className="text-xs font-semibold text-[#2de4a0] uppercase tracking-wider">{t('dashboard_overview')}</span>
          <h2 className="text-xl sm:text-2xl font-bold mt-1">
            {t('welcome')}, {user?.fullName}!
          </h2>
          <p className="text-xs text-white/80 mt-0.5">
            {t('dashboard_sub')}
          </p>
        </div>
        <button
          onClick={onNavigateToPos}
          className="flex items-center gap-2 px-5 py-2.5 bg-white text-[#0b6b45] hover:bg-[#2de4a0] hover:text-[#0b6b45] rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer self-start sm:self-auto"
        >
          <ShoppingCart className="w-4 h-4" />
          {t('menu_pos')}
        </button>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Sales */}
        <div className="p-5 bg-white rounded-2xl border border-[#dcebe2] shadow-xs">
          <div className="flex items-center justify-between text-[#688177]">
            <span className="text-xs font-medium">{t('today_sales')}</span>
            <div className="p-2 bg-[#e8f7ee] text-[#0b6b45] rounded-xl">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#12352a] mt-2 font-inter tabular-nums">
            {formatMoney(data?.todaySales || 0, currency)}
          </div>
          <div className="text-[11px] text-[#688177] mt-1 flex items-center gap-1">
            <span>{t('today_invoices')}:</span>
            <span className="font-bold text-[#0b6b45] font-inter tabular-nums">{data?.invoicesToday || 0}</span>
          </div>
        </div>

        {/* Today's Expense */}
        <div className="p-5 bg-white rounded-2xl border border-[#dcebe2] shadow-xs">
          <div className="flex items-center justify-between text-[#688177]">
            <span className="text-xs font-medium">{t('today_expense')}</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-700 mt-2 font-inter tabular-nums">
            {formatMoney(data?.todayExpense || 0, currency)}
          </div>
          <div className="text-[11px] text-[#688177] mt-1">{t('today_expense_desc')}</div>
        </div>

        {/* Gross Profit (Cashier cannot see) */}
        {canSeeProfits && (
          <div className="p-5 bg-white rounded-2xl border border-[#dcebe2] shadow-xs">
            <div className="flex items-center justify-between text-[#688177]">
              <span className="text-xs font-medium">{t('today_gross_profit')}</span>
              <div className="p-2 bg-[#e8f7ee] text-[#21ad70] rounded-xl">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-[#0b6b45] mt-2 font-inter tabular-nums">
              {formatMoney(data?.grossProfitToday || 0, currency)}
            </div>
            <div className="text-[11px] text-[#688177] mt-1">Gross Profit Margin</div>
          </div>
        )}

        {/* Net Profit (Gross - Expense) */}
        {canSeeProfits && (
          <div className="p-5 bg-white rounded-2xl border border-[#dcebe2] shadow-xs">
            <div className="flex items-center justify-between text-[#688177]">
              <span className="text-xs font-medium">{t('today_net_profit')}</span>
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
            <div className="text-[11px] text-[#688177] mt-1">Net profit after expenses</div>
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
            <span className="text-xs font-medium text-[#688177]">{t('low_stock_kpi')}</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-bold text-amber-700 mt-1 font-inter tabular-nums">
            {data?.lowStockCount || 0}
          </div>
          <span className="text-[10px] text-amber-600 font-medium">View items →</span>
        </div>

        {/* Total Stock Quantity */}
        <div className="p-4 bg-white rounded-2xl border border-[#dcebe2] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#688177]">{t('total_stock_kpi')}</span>
            <Package className="w-4 h-4 text-[#0b6b45]" />
          </div>
          <div className="text-xl font-bold text-[#12352a] mt-1 font-inter tabular-nums">
            {data?.totalStockQty || 0}
          </div>
          <span className="text-[10px] text-[#688177]">Active inventory count</span>
        </div>

        {/* Stock Value */}
        {canSeeProfits && (
          <div className="p-4 bg-white rounded-2xl border border-[#dcebe2] shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#688177]">{t('stock_value_kpi')}</span>
              <DollarSign className="w-4 h-4 text-[#21ad70]" />
            </div>
            <div className="text-xl font-bold text-[#12352a] mt-1 font-inter tabular-nums">
              {formatMoney(data?.stockValue || 0, currency)}
            </div>
            <span className="text-[10px] text-[#688177]">Total inventory buy value</span>
          </div>
        )}

        {/* Stock Added Today */}
        <div className="p-4 bg-white rounded-2xl border border-[#dcebe2] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#688177]">{t('stock_added_kpi')}</span>
            <Receipt className="w-4 h-4 text-[#0b6b45]" />
          </div>
          <div className="text-xl font-bold text-[#0b6b45] mt-1 font-inter tabular-nums">
            +{data?.stockAddedToday || 0}
          </div>
          <span className="text-[10px] text-[#688177]">Received batches today</span>
        </div>
      </div>

      {/* Recent Sales Table */}
      <div className="bg-white rounded-2xl border border-[#dcebe2] shadow-xs overflow-hidden">
        <div className="p-5 border-b border-[#dcebe2] flex items-center justify-between">
          <h3 className="font-bold text-sm sm:text-base text-[#12352a] flex items-center gap-2">
            <Receipt className="w-4 h-4 text-[#0b6b45]" />
            {t('recent_invoices')}
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
