import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { formatMoney } from '../../lib/money.ts';
import { getDhakaToday, formatDhakaDateTime } from '../../lib/dates.ts';
import { BarChart3, Printer, Download, Calendar, TrendingUp, AlertTriangle, Package } from 'lucide-react';

interface ReportData {
  dailyBreakdown: Array<{
    date: string;
    sales: number;
    grossProfit: number;
    expenses: number;
    netProfit: number;
    stockAdded: number;
    invoices: number;
  }>;
  totals: {
    sales: number;
    grossProfit: number;
    expenses: number;
    netProfit: number;
    stockAdded: number;
    invoices: number;
  };
  topSelling: Array<{ name: string; qty: number; revenue: number }>;
  lowStock: Array<{ id: number; name: string; sku: string; stock: number; threshold: number }>;
}

export const ReportsView: React.FC = () => {
  const { token, user, shop } = useAuth();
  const today = getDhakaToday();
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [data, setData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const currency = shop?.currencySymbol || '৳';
  const canSeeProfits = user?.role === 'admin' || user?.role === 'manager';

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/reports?from=${fromDate}&to=${toDate}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchReports();
  }, [token, fromDate, toDate]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = () => {
    if (!data?.dailyBreakdown) return;
    const headers = ['Date', 'Sales', 'Gross Profit', 'Expenses', 'Net Profit', 'Stock Added', 'Invoices'];
    const rows = data.dailyBreakdown.map((d) => [
      d.date,
      d.sales,
      d.grossProfit,
      d.expenses,
      d.netProfit,
      d.stockAdded,
      d.invoices,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `dalim_report_${fromDate}_to_${toDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top action row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#12352a] flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#0b6b45]" />
            দৈনিক ব্যবসায়িক রিপোর্ট (Reports & Analytics)
          </h2>
          <p className="text-xs text-[#688177]">
            বিক্রয়, লাভ, খরচ ও ইনভেন্টরির বিস্তারিত সময়ভিত্তিক প্রতিবেদন
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#12352a] bg-white border border-[#dcebe2] hover:bg-[#f5faf7] rounded-xl transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-[#688177]" />
            CSV এক্সপোর্ট
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#0b6b45] hover:bg-[#21ad70] rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            রিপোর্ট প্রিন্ট / PDF
          </button>
        </div>
      </div>

      {/* Date filter toolbar */}
      <div className="p-4 bg-white rounded-2xl border border-[#dcebe2] shadow-xs flex flex-wrap items-center gap-3 text-xs">
        <span className="font-semibold text-[#12352a] flex items-center gap-1">
          <Calendar className="w-4 h-4 text-[#0b6b45]" />
          সময়সীমা:
        </span>
        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="px-3 py-1.5 bg-[#f5faf7] border border-[#dcebe2] rounded-xl"
        />
        <span>হতে</span>
        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className="px-3 py-1.5 bg-[#f5faf7] border border-[#dcebe2] rounded-xl"
        />
        <div className="flex gap-1.5 ml-auto">
          <button
            onClick={() => {
              setFromDate(today);
              setToDate(today);
            }}
            className="px-2.5 py-1 bg-[#f5faf7] hover:bg-[#e8f7ee] text-[#0b6b45] rounded-lg font-medium border border-[#dcebe2]"
          >
            আজকের দিন
          </button>
          <button
            onClick={() => {
              const d = new Date();
              d.setDate(d.getDate() - 7);
              setFromDate(d.toISOString().slice(0, 10));
              setToDate(today);
            }}
            className="px-2.5 py-1 bg-[#f5faf7] hover:bg-[#e8f7ee] text-[#0b6b45] rounded-lg font-medium border border-[#dcebe2]"
          >
            গত ৭ দিন
          </button>
          <button
            onClick={() => {
              const d = new Date();
              d.setDate(d.getDate() - 30);
              setFromDate(d.toISOString().slice(0, 10));
              setToDate(today);
            }}
            className="px-2.5 py-1 bg-[#f5faf7] hover:bg-[#e8f7ee] text-[#0b6b45] rounded-lg font-medium border border-[#dcebe2]"
          >
            গত ৩০ দিন
          </button>
        </div>
      </div>

      {/* Printable Report Wrapper */}
      <div id="printable-receipt" className="space-y-6">
        {/* Print Header (Visible in print) */}
        <div className="hidden print:block text-center pb-4 border-b border-slate-300">
          <h1 className="text-2xl font-bold text-slate-900">{shop?.shopName || 'Dalim Store'}</h1>
          <p className="text-sm text-slate-600">{shop?.address}</p>
          <h2 className="text-lg font-bold text-slate-800 mt-2">দৈনিক ব্যবসায়িক রিপোর্ট</h2>
          <p className="text-xs text-slate-500 font-mono">
            রিপোর্ট সময়কাল: {fromDate} হতে {toDate} | প্রস্তুতের তারিখ: {formatDhakaDateTime(new Date())}
          </p>
        </div>

        {/* Summary KPI Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3.5 bg-white rounded-xl border border-[#dcebe2]">
            <div className="text-[11px] text-[#688177]">মোট বিক্রয়</div>
            <div className="text-lg font-bold text-[#0b6b45] font-inter tabular-nums mt-0.5">
              {formatMoney(data?.totals.sales || 0, currency)}
            </div>
          </div>
          {canSeeProfits && (
            <div className="p-3.5 bg-white rounded-xl border border-[#dcebe2]">
              <div className="text-[11px] text-[#688177]">মোট লাভ (Gross)</div>
              <div className="text-lg font-bold text-[#21ad70] font-inter tabular-nums mt-0.5">
                {formatMoney(data?.totals.grossProfit || 0, currency)}
              </div>
            </div>
          )}
          <div className="p-3.5 bg-white rounded-xl border border-[#dcebe2]">
            <div className="text-[11px] text-[#688177]">মোট খরচ</div>
            <div className="text-lg font-bold text-rose-600 font-inter tabular-nums mt-0.5">
              {formatMoney(data?.totals.expenses || 0, currency)}
            </div>
          </div>
          {canSeeProfits && (
            <div className="p-3.5 bg-white rounded-xl border border-[#dcebe2]">
              <div className="text-[11px] text-[#688177]">নিট লাভ (Net)</div>
              <div className="text-lg font-bold text-[#0b6b45] font-inter tabular-nums mt-0.5">
                {formatMoney(data?.totals.netProfit || 0, currency)}
              </div>
            </div>
          )}
          <div className="p-3.5 bg-white rounded-xl border border-[#dcebe2]">
            <div className="text-[11px] text-[#688177]">স্টক যুক্ত হয়েছে</div>
            <div className="text-lg font-bold text-[#12352a] font-inter tabular-nums mt-0.5">
              {data?.totals.stockAdded || 0} টি
            </div>
          </div>
          <div className="p-3.5 bg-white rounded-xl border border-[#dcebe2]">
            <div className="text-[11px] text-[#688177]">মোট চালান (Invoices)</div>
            <div className="text-lg font-bold text-[#12352a] font-inter tabular-nums mt-0.5">
              {data?.totals.invoices || 0} টি
            </div>
          </div>
        </div>

        {/* Day-by-Day Report Table */}
        <div className="bg-white rounded-2xl border border-[#dcebe2] shadow-xs overflow-hidden">
          <div className="p-4 border-b border-[#dcebe2] font-bold text-xs text-[#12352a] uppercase tracking-wider">
            তারিখ ভিত্তিক দৈনিক বিবরণী (Daily Performance Breakdown)
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f5faf7] text-[#688177] border-b border-[#dcebe2]">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">তারিখ</th>
                  <th className="py-2.5 px-4 font-semibold text-right">বিক্রয় (Sales)</th>
                  {canSeeProfits && <th className="py-2.5 px-4 font-semibold text-right">মোট লাভ (Gross)</th>}
                  <th className="py-2.5 px-4 font-semibold text-right">খরচ (Expense)</th>
                  {canSeeProfits && <th className="py-2.5 px-4 font-semibold text-right">নিট লাভ (Net)</th>}
                  <th className="py-2.5 px-4 font-semibold text-center">স্টক যোগ</th>
                  <th className="py-2.5 px-4 font-semibold text-center">চালান সংখ্যা</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f5faf7] font-mono">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[#688177]">রিপোর্ট লোড হচ্ছে...</td>
                  </tr>
                ) : data?.dailyBreakdown.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[#688177]">নির্বাচিত তারিখে কোনো তথ্য নেই</td>
                  </tr>
                ) : (
                  data?.dailyBreakdown.map((row) => (
                    <tr key={row.date} className="hover:bg-[#f5faf7]/50">
                      <td className="py-2.5 px-4 font-bold text-[#12352a]">{row.date}</td>
                      <td className="py-2.5 px-4 text-right font-bold text-[#0b6b45]">{formatMoney(row.sales, currency)}</td>
                      {canSeeProfits && (
                        <td className="py-2.5 px-4 text-right text-[#21ad70]">{formatMoney(row.grossProfit, currency)}</td>
                      )}
                      <td className="py-2.5 px-4 text-right text-rose-600">{formatMoney(row.expenses, currency)}</td>
                      {canSeeProfits && (
                        <td className="py-2.5 px-4 text-right font-bold text-[#0b6b45]">{formatMoney(row.netProfit, currency)}</td>
                      )}
                      <td className="py-2.5 px-4 text-center text-slate-700">{row.stockAdded}</td>
                      <td className="py-2.5 px-4 text-center text-slate-700">{row.invoices}</td>
                    </tr>
                  ))
                )}
              </tbody>
              {/* Totals Row */}
              {data && (
                <tfoot className="bg-[#f5faf7] border-t-2 border-[#dcebe2] font-mono font-bold text-xs">
                  <tr>
                    <td className="py-3 px-4 text-[#12352a]">সর্বমোট (Total):</td>
                    <td className="py-3 px-4 text-right text-[#0b6b45]">{formatMoney(data.totals.sales, currency)}</td>
                    {canSeeProfits && (
                      <td className="py-3 px-4 text-right text-[#21ad70]">{formatMoney(data.totals.grossProfit, currency)}</td>
                    )}
                    <td className="py-3 px-4 text-right text-rose-600">{formatMoney(data.totals.expenses, currency)}</td>
                    {canSeeProfits && (
                      <td className="py-3 px-4 text-right text-[#0b6b45]">{formatMoney(data.totals.netProfit, currency)}</td>
                    )}
                    <td className="py-3 px-4 text-center">{data.totals.stockAdded}</td>
                    <td className="py-3 px-4 text-center">{data.totals.invoices}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Secondary widgets: Top selling products & Low stock list */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Top Selling Products */}
          <div className="bg-white rounded-2xl border border-[#dcebe2] shadow-xs p-5">
            <h4 className="font-bold text-xs text-[#0b6b45] uppercase tracking-wider mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              সর্বাধিক বিক্রিত পণ্য (Top Selling)
            </h4>
            <div className="space-y-2">
              {data?.topSelling.map((p, idx) => (
                <div key={idx} className="flex items-center justify-between py-1.5 border-b border-[#f5faf7] text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#e8f7ee] text-[#0b6b45] flex items-center justify-center font-bold text-[10px]">
                      {idx + 1}
                    </span>
                    <span className="font-medium text-[#12352a]">{p.name}</span>
                  </div>
                  <div className="text-right font-mono tabular-nums">
                    <span className="font-bold text-[#0b6b45]">{p.qty} টি</span>
                    <span className="text-[10px] text-[#688177] ml-2">({formatMoney(p.revenue, currency)})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Low Stock List */}
          <div className="bg-white rounded-2xl border border-[#dcebe2] shadow-xs p-5">
            <h4 className="font-bold text-xs text-amber-700 uppercase tracking-wider mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              স্বল্প স্টক সতর্কতা (Low Stock Alert)
            </h4>
            <div className="space-y-2">
              {data?.lowStock.length === 0 ? (
                <p className="text-xs text-[#688177] py-2">কোনো পণ্যের স্টক লিমিটের নিচে নেই</p>
              ) : (
                data?.lowStock.map((p) => (
                  <div key={p.id} className="flex items-center justify-between py-1.5 border-b border-[#f5faf7] text-xs">
                    <div>
                      <div className="font-medium text-[#12352a]">{p.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{p.sku}</div>
                    </div>
                    <div className="text-right font-mono">
                      <span className="font-bold text-rose-600">{p.stock} টি অবশিষ্ট</span>
                      <span className="text-[10px] text-slate-400 block">সতর্কতা: {p.threshold}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Signature Strip for A4 Print */}
        <div className="hidden print:flex justify-between pt-20 text-xs text-slate-800">
          <div className="text-center w-48 border-t border-slate-400 pt-2">
            প্রস্তুতকারক (Prepared By)
          </div>
          <div className="text-center w-48 border-t border-slate-400 pt-2">
            অনুমোদনকারী (Authorized Signature)
          </div>
        </div>
      </div>
    </div>
  );
};
