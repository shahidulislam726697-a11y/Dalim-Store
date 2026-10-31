import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Store, Lock, Mail, ArrowRight, AlertCircle } from 'lucide-react';

export const LoginPage: React.FC<{
  onLoginSuccess: () => void;
  onGoToStorefront: () => void;
  onGoToSetup: () => void;
}> = ({ onLoginSuccess, onGoToStorefront, onGoToSetup }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSetupAvailable, setIsSetupAvailable] = useState(false);

  useEffect(() => {
    const checkSetup = async () => {
      try {
        const res = await fetch('/api/auth/setup-status');
        const data = await res.json();
        if (data.success && data.data.isSetupAllowed) {
          setIsSetupAvailable(true);
        }
      } catch {}
    };
    checkSetup();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.success) {
        login(data.data.token, data.data.user);
        onLoginSuccess();
      } else {
        setError(data.message || 'ভুল ইমেইল বা পাসওয়ার্ড');
      }
    } catch {
      setError('সার্ভারের সাথে সংযোগ স্থাপন করা যায়নি');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#e8f7ee] via-[#f5faf7] to-[#e8f7ee]">
      <div className="max-w-md w-full bg-white rounded-2xl p-8 border border-[#dcebe2] shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-[#0b6b45] text-[#2de4a0] rounded-2xl flex items-center justify-center mx-auto shadow-md">
            <Store className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-[#12352a]">ডালিম স্টোর কন্ট্রোল প্যানেল</h2>
          <p className="text-xs text-[#688177]">POS, ইনভেন্টরি ও সেলস ম্যানেজমেন্টে প্রবেশ করুন</p>
        </div>

        {isSetupAvailable && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-center justify-between">
            <span>কোনো অ্যাডমিন নেই? এখনই সেটআপ করুন</span>
            <button
              onClick={onGoToSetup}
              className="px-2.5 py-1 bg-amber-600 text-white rounded-lg font-semibold hover:bg-amber-700 transition-colors"
            >
              সেটআপ পেজ
            </button>
          </div>
        )}

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Permanent Admin Quick Fill Info */}
          <div className="p-3 bg-[#f5faf7] border border-[#dcebe2] rounded-xl flex items-center justify-between">
            <div className="text-[11px] text-[#12352a]">
              <span className="font-semibold block text-[#0b6b45]">অ্যাডমিন অ্যাকাউন্ট:</span>
              <span className="text-[#688177] font-mono text-[10px]">shahidulislam726697@gmail.com</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setEmail('shahidulislam726697@gmail.com');
                setPassword('12345678');
              }}
              className="px-2.5 py-1 text-[11px] font-semibold text-[#0b6b45] bg-white border border-[#21ad70] hover:bg-[#e8f7ee] rounded-lg transition-colors cursor-pointer"
            >
              অটো-ফিল (Auto-fill)
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#12352a] mb-1">ইমেইল অ্যাড্রেস</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                required
                placeholder="shahidulislam726697@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-xs bg-[#f5faf7] border border-[#dcebe2] rounded-xl focus:outline-none focus:border-[#21ad70]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#12352a] mb-1">পাসওয়ার্ড</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-xs bg-[#f5faf7] border border-[#dcebe2] rounded-xl focus:outline-none focus:border-[#21ad70]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-[#0b6b45] hover:bg-[#21ad70] text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? 'লগইন হচ্ছে...' : 'লগইন করুন'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-2 flex items-center justify-between text-xs border-t border-[#dcebe2]">
          <button
            onClick={onGoToStorefront}
            className="text-[#688177] hover:text-[#12352a] font-medium"
          >
            ← পাবলিক স্টোর দেখুন
          </button>
          {isSetupAvailable && (
            <button
              onClick={onGoToSetup}
              className="text-[#0b6b45] hover:underline font-semibold"
            >
              ইনিশিয়াল সেটআপ
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
