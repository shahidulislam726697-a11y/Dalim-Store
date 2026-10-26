import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { ShieldCheck, ArrowRight, Store, AlertCircle } from 'lucide-react';

export const SetupPage: React.FC<{ onSetupComplete: () => void; onGoToLogin: () => void }> = ({
  onSetupComplete,
  onGoToLogin,
}) => {
  const { login } = useAuth();
  const [shopName, setShopName] = useState('Dalim Store');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAllowed, setIsAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch('/api/auth/setup-status');
        const data = await res.json();
        if (data.success) {
          setIsAllowed(data.data.isSetupAllowed);
        } else {
          setIsAllowed(false);
        }
      } catch {
        setIsAllowed(false);
      }
    };
    checkStatus();
  }, []);

  if (isAllowed === false) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#f5faf7]">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 border border-[#dcebe2] text-center shadow-lg space-y-4">
          <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-[#12352a]">সেটআপ সম্পন্ন হয়েছে (404)</h2>
          <p className="text-xs text-[#688177]">
            দোকানের প্রাথমিক অ্যাডমিন অ্যাকাউন্ট ইতোমধ্যে বিদ্যমান। সরাসরি লগইন পৃষ্ঠায় যান।
          </p>
          <button
            onClick={onGoToLogin}
            className="w-full py-2.5 bg-[#0b6b45] text-white rounded-xl text-sm font-semibold hover:bg-[#21ad70] transition-colors"
          >
            লগইন পেজে যান
          </button>
        </div>
      </div>
    );
  }

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('পাসওয়ার্ড ন্যূনতম ৮ অক্ষরের হতে হবে (Min 8 chars)');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopName, fullName, email, phone, password }),
      });
      const data = await res.json();
      if (data.success) {
        login(data.data.token, data.data.user);
        onSetupComplete();
      } else {
        setError(data.message || 'সেটআপ ব্যর্থ হয়েছে');
      }
    } catch {
      setError('সার্ভারে যোগাযোগ করতে সমস্যা হয়েছে');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#e8f7ee] via-[#f5faf7] to-[#e8f7ee]">
      <div className="max-w-md w-full bg-white rounded-2xl p-8 border border-[#dcebe2] shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-[#e8f7ee] text-[#0b6b45] rounded-2xl flex items-center justify-center mx-auto border border-[#dcebe2]">
            <Store className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-[#12352a]">ডালিম স্টোর ইনিশিয়াল সেটআপ</h2>
          <p className="text-xs text-[#688177]">প্রথম অ্যাডমিন অ্যাকাউন্ট ও দোকানের তথ্য প্রস্তুত করুন</p>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSetup} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#12352a] mb-1">দোকানের নাম (Shop Name) *</label>
            <input
              type="text"
              required
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-[#f5faf7] border border-[#dcebe2] rounded-xl focus:outline-none focus:border-[#21ad70]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#12352a] mb-1">অ্যাডমিনের পূর্ণ নাম *</label>
            <input
              type="text"
              required
              placeholder="উদাঃ তোসিফ আহমেদ"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-[#f5faf7] border border-[#dcebe2] rounded-xl focus:outline-none focus:border-[#21ad70]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#12352a] mb-1">ইমেইল অ্যাড্রেস *</label>
            <input
              type="email"
              required
              placeholder="admin@dalimstore.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-[#f5faf7] border border-[#dcebe2] rounded-xl focus:outline-none focus:border-[#21ad70]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#12352a] mb-1">মোবাইল নম্বর</label>
            <input
              type="tel"
              placeholder="017XXXXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-[#f5faf7] border border-[#dcebe2] rounded-xl focus:outline-none focus:border-[#21ad70]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#12352a] mb-1">পাসওয়ার্ড (কমপক্ষে ৮ অক্ষর) *</label>
            <input
              type="password"
              required
              minLength={8}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-[#f5faf7] border border-[#dcebe2] rounded-xl focus:outline-none focus:border-[#21ad70]"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-[#0b6b45] hover:bg-[#21ad70] text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? 'তৈরি করা হচ্ছে...' : 'অ্যাডমিন তৈরি করে সিস্টেমে প্রবেশ করুন'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center pt-2">
          <button
            onClick={onGoToLogin}
            className="text-xs text-[#0b6b45] hover:underline font-semibold"
          >
            ইতিমধ্যে অ্যাকাউন্ট আছে? লগইন করুন
          </button>
        </div>
      </div>
    </div>
  );
};
