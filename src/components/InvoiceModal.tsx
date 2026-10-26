import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext.tsx';
import { formatMoney } from '../lib/money.ts';
import { formatDhakaDateTime } from '../lib/dates.ts';
import { Printer, X, CheckCircle, FileText, Smartphone } from 'lucide-react';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  saleData: {
    invoiceNo: string;
    createdAt?: string;
    customerName?: string;
    customerPhone?: string;
    items: Array<{
      productName: string;
      qty: number;
      sellPrice: number;
      lineTotal: number;
    }>;
    subtotal: number;
    discount: number;
    total: number;
    paid: number;
    due: number;
    paymentMethod: string;
    notes?: string;
  };
  shopInfo: {
    shopName: string;
    phone?: string;
    address?: string;
    currencySymbol?: string;
    invoiceFooter?: string;
    bkashNumber?: string;
    nagadNumber?: string;
    qrImage?: string;
  };
  onNewSale?: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  isOpen,
  onClose,
  saleData,
  shopInfo,
  onNewSale,
}) => {
  const { t } = useLanguage();
  const [printFormat, setPrintFormat] = useState<'thermal' | 'a4'>('thermal');

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const currency = shopInfo.currencySymbol || '৳';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-[#dcebe2] my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Top Action Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#dcebe2] bg-[#f5faf7]">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-[#21ad70]" />
            <h3 className="font-semibold text-[#12352a]">{t('sale_completed')}</h3>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-[#dcebe2] p-0.5 bg-white text-xs">
              <button
                onClick={() => setPrintFormat('thermal')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  printFormat === 'thermal' ? 'bg-[#0b6b45] text-white' : 'text-[#688177] hover:text-[#12352a]'
                }`}
              >
                {t('thermal_print')}
              </button>
              <button
                onClick={() => setPrintFormat('a4')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  printFormat === 'a4' ? 'bg-[#0b6b45] text-white' : 'text-[#688177] hover:text-[#12352a]'
                }`}
              >
                {t('a4_print')}
              </button>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Invoice Printable View */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          <div
            id="printable-receipt"
            className={`mx-auto bg-white p-5 border border-dashed border-slate-300 rounded-xl ${
              printFormat === 'thermal' ? 'max-w-[320px] text-xs' : 'max-w-full text-sm'
            }`}
          >
            {/* Header */}
            <div className="text-center pb-4 border-b border-dashed border-slate-300">
              <h2 className="text-lg font-bold text-slate-900 leading-tight">{shopInfo.shopName}</h2>
              {shopInfo.address && <p className="text-slate-600 mt-1">{shopInfo.address}</p>}
              {shopInfo.phone && <p className="text-slate-600 font-mono">মোবাইল: {shopInfo.phone}</p>}
              <div className="mt-2 inline-block px-3 py-1 bg-slate-100 rounded-full font-mono font-semibold text-slate-800">
                {saleData.invoiceNo}
              </div>
            </div>

            {/* Meta */}
            <div className="py-2.5 border-b border-dashed border-slate-300 text-slate-600 space-y-1">
              <div className="flex justify-between">
                <span>তারিখ ও সময়:</span>
                <span className="font-mono text-slate-800">{formatDhakaDateTime(saleData.createdAt || new Date())}</span>
              </div>
              <div className="flex justify-between">
                <span>ক্রেতা:</span>
                <span className="font-medium text-slate-800">{saleData.customerName || 'সাধারণ ক্রেতা'}</span>
              </div>
              {saleData.customerPhone && (
                <div className="flex justify-between">
                  <span>মোবাইল:</span>
                  <span className="font-mono text-slate-800">{saleData.customerPhone}</span>
                </div>
              )}
            </div>

            {/* Item Table */}
            <div className="py-2.5 border-b border-dashed border-slate-300">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-200">
                    <th className="pb-1 font-medium">বিবরণ</th>
                    <th className="pb-1 text-center font-medium">পরিমাণ</th>
                    <th className="pb-1 text-right font-medium">দর</th>
                    <th className="pb-1 text-right font-medium">মোট</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {saleData.items.map((it, idx) => (
                    <tr key={idx} className="text-slate-800">
                      <td className="py-1.5 pr-1 font-medium">{it.productName}</td>
                      <td className="py-1.5 text-center font-mono">{it.qty}</td>
                      <td className="py-1.5 text-right font-mono">{it.sellPrice}</td>
                      <td className="py-1.5 text-right font-mono font-semibold">{formatMoney(it.lineTotal, currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals Calculation */}
            <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>মোট মূল্য (Subtotal):</span>
                <span className="font-mono font-medium">{formatMoney(saleData.subtotal, currency)}</span>
              </div>
              {saleData.discount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>ছাড় (Discount):</span>
                  <span className="font-mono font-medium">-{formatMoney(saleData.discount, currency)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-900 font-bold text-sm pt-1 border-t border-slate-200">
                <span>সর্বমোট (Total):</span>
                <span className="font-mono">{formatMoney(saleData.total, currency)}</span>
              </div>
              <div className="flex justify-between text-slate-700 pt-0.5">
                <span>পরিশোধিত (Paid):</span>
                <span className="font-mono font-semibold">{formatMoney(saleData.paid, currency)}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>মাধ্যম (Method):</span>
                <span className="capitalize font-medium">{saleData.paymentMethod}</span>
              </div>
              {saleData.due > 0 && (
                <div className="flex justify-between text-rose-700 font-bold pt-1 border-t border-rose-100">
                  <span>বাকি (Due):</span>
                  <span className="font-mono">{formatMoney(saleData.due, currency)}</span>
                </div>
              )}
            </div>

            {/* Digital Payments & QR */}
            {(shopInfo.bkashNumber || shopInfo.nagadNumber || shopInfo.qrImage) && (
              <div className="py-3 border-b border-dashed border-slate-300 text-center space-y-2">
                <p className="text-[11px] font-medium text-slate-600">ডিজিটাল পেমেন্ট (bKash / Nagad / QR)</p>
                <div className="flex justify-center gap-4 text-[11px] text-slate-700 font-mono">
                  {shopInfo.bkashNumber && <span>bKash: {shopInfo.bkashNumber}</span>}
                  {shopInfo.nagadNumber && <span>Nagad: {shopInfo.nagadNumber}</span>}
                </div>
                {shopInfo.qrImage && (
                  <div className="flex justify-center pt-1">
                    <img
                      src={shopInfo.qrImage}
                      alt="Payment QR"
                      className="w-24 h-24 object-contain rounded border border-slate-200"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="text-center pt-3 text-slate-500 text-[11px]">
              <p>{shopInfo.invoiceFooter || 'ডালিম স্টোরে কেনাকাটার জন্য ধন্যবাদ!'}</p>
              <p className="font-mono mt-1 text-[10px] text-slate-400">Software: Dalim Store POS</p>
            </div>
          </div>
        </div>

        {/* Modal Buttons */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-[#f5faf7] border-t border-[#dcebe2]">
          {onNewSale && (
            <button
              onClick={() => {
                onClose();
                onNewSale();
              }}
              className="px-4 py-2 text-sm font-medium text-[#12352a] hover:bg-white rounded-xl border border-[#dcebe2] transition-colors"
            >
              {t('new_sale_btn')}
            </button>
          )}
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-[#0b6b45] hover:bg-[#21ad70] rounded-xl shadow-md transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            {t('print_btn')}
          </button>
        </div>
      </div>
    </div>
  );
};
