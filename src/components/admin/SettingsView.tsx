import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { Settings as SettingsIcon, Save, UploadCloud, Smartphone, Check, Store } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { token, refreshMe, shop } = useAuth();
  const [shopName, setShopName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [invoicePrefix, setInvoicePrefix] = useState('INV');
  const [invoiceFooter, setInvoiceFooter] = useState('');
  const [bkashNumber, setBkashNumber] = useState('');
  const [nagadNumber, setNagadNumber] = useState('');
  const [qrImage, setQrImage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/admin/settings', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (json.success && json.data) {
          const s = json.data;
          setShopName(s.shopName || '');
          setPhone(s.phone || '');
          setAddress(s.address || '');
          setInvoicePrefix(s.invoicePrefix || 'INV');
          setInvoiceFooter(s.invoiceFooter || '');
          setBkashNumber(s.bkashNumber || '');
          setNagadNumber(s.nagadNumber || '');
          setQrImage(s.qrImage || '');
        }
      } catch (err) {
        console.error(err);
      }
    };
    if (token) fetchSettings();
  }, [token]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSaveSuccess(false);
    setIsSaving(true);

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          shopName,
          phone,
          address,
          invoicePrefix,
          invoiceFooter,
          bkashNumber,
          nagadNumber,
          qrImage,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setSaveSuccess(true);
        refreshMe();
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setErrorMessage(json.message || 'সংরক্ষণ ব্যর্থ হয়েছে');
      }
    } catch {
      setErrorMessage('সার্ভার এরর');
    } finally {
      setIsSaving(false);
    }
  };

  const handleQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setQrImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#12352a] flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-[#0b6b45]" />
          দোকানের সেটিংস ও পেমেন্ট কিউআর (Store Settings)
        </h2>
        <p className="text-xs text-[#688177]">
          দোকানের নাম, ঠিকানা, চালান কোড এবং বিকাশ/নগদ পেমেন্ট কিউআর কোড কনফিগার করুন
        </p>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-[#dcebe2] shadow-xs p-6 space-y-6">
        {saveSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
            <Check className="w-4 h-4 text-[#21ad70]" />
            <span>দোকানের সেটিংস সফলভাবে আপডেট করা হয়েছে!</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
            {errorMessage}
          </div>
        )}

        <div className="space-y-4">
          <h3 className="font-bold text-xs uppercase tracking-wider text-[#0b6b45] pb-2 border-b border-[#f5faf7]">
            ১. সাধারণ তথ্য (General Info)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#12352a] mb-1">দোকানের নাম *</label>
              <input
                type="text"
                required
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-[#f5faf7] border border-[#dcebe2] rounded-xl focus:outline-none focus:border-[#21ad70]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#12352a] mb-1">অফিসিয়াল ফোন নম্বর</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-[#f5faf7] border border-[#dcebe2] rounded-xl font-mono"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#12352a] mb-1">দোকানের ঠিকানা</label>
              <textarea
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-[#f5faf7] border border-[#dcebe2] rounded-xl focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-bold text-xs uppercase tracking-wider text-[#0b6b45] pb-2 border-b border-[#f5faf7]">
            ২. ইনভয়েস সেটিংস (Invoice Setup)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#12352a] mb-1">ইনভয়েস প্রিফিক্স (Prefix) *</label>
              <input
                type="text"
                required
                value={invoicePrefix}
                onChange={(e) => setInvoicePrefix(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-[#f5faf7] border border-[#dcebe2] rounded-xl font-mono"
              />
              <span className="text-[10px] text-[#688177] mt-0.5 block">উদাহরণ: {invoicePrefix}-20261025-0001</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#12352a] mb-1">চালানের নিচের বার্তা (Footer Text)</label>
              <input
                type="text"
                value={invoiceFooter}
                onChange={(e) => setInvoiceFooter(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-[#f5faf7] border border-[#dcebe2] rounded-xl"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-bold text-xs uppercase tracking-wider text-[#0b6b45] pb-2 border-b border-[#f5faf7]">
            ৩. ডিজিটাল পেমেন্ট ও কিউআর কোড (Digital Payments & QR)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#12352a] mb-1">বিকাশ মার্চেন্ট / পার্সোনাল নম্বর</label>
              <input
                type="text"
                placeholder="017XXXXXXXX"
                value={bkashNumber}
                onChange={(e) => setBkashNumber(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-[#f5faf7] border border-[#dcebe2] rounded-xl font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#12352a] mb-1">নগদ মার্চেন্ট / পার্সোনাল নম্বর</label>
              <input
                type="text"
                placeholder="019XXXXXXXX"
                value={nagadNumber}
                onChange={(e) => setNagadNumber(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-[#f5faf7] border border-[#dcebe2] rounded-xl font-mono"
              />
            </div>

            <div className="sm:col-span-2 space-y-2">
              <label className="block text-xs font-semibold text-[#12352a]">পেমেন্ট কিউআর কোড ছবি (Payment QR Image)</label>
              <div className="flex items-center gap-4">
                {qrImage ? (
                  <div className="w-24 h-24 bg-white border border-[#dcebe2] rounded-xl p-1 flex items-center justify-center">
                    <img src={qrImage} alt="QR" className="w-full h-full object-contain" />
                  </div>
                ) : (
                  <div className="w-24 h-24 bg-slate-50 border border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center text-slate-400 text-[10px]">
                    <Smartphone className="w-6 h-6 mb-1" />
                    কোনো QR নেই
                  </div>
                )}
                <div className="space-y-2 flex-1">
                  <input
                    type="text"
                    placeholder="ছবির লিংক (URL)..."
                    value={qrImage}
                    onChange={(e) => setQrImage(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#f5faf7] border border-[#dcebe2] rounded-xl"
                  />
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#f5faf7] hover:bg-[#e8f7ee] border border-[#dcebe2] rounded-xl cursor-pointer text-xs font-semibold text-[#0b6b45]">
                    <UploadCloud className="w-3.5 h-3.5" />
                    ফাইল আপলোড করুন
                    <input type="file" accept="image/*" onChange={handleQrUpload} className="hidden" />
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-[#dcebe2] flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-[#0b6b45] hover:bg-[#21ad70] rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'সংরক্ষণ হচ্ছে...' : 'সেটিংস সংরক্ষণ করুন'}
          </button>
        </div>
      </form>
    </div>
  );
};
