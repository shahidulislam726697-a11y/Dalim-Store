import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { Shield, UserPlus, Edit2, Key, Check, X } from 'lucide-react';

interface UserItem {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  role: 'admin' | 'manager' | 'cashier';
  isActive: boolean;
}

export const UsersView: React.FC = () => {
  const { token, user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'manager' | 'cashier'>('cashier');
  const [isActive, setIsActive] = useState(true);
  const [modalError, setModalError] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) setUsers(json.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchUsers();
  }, [token]);

  const openAdd = () => {
    setEditingUser(null);
    setFullName('');
    setEmail('');
    setPhone('');
    setPassword('');
    setRole('cashier');
    setIsActive(true);
    setModalError(null);
    setIsModalOpen(true);
  };

  const openEdit = (u: UserItem) => {
    setEditingUser(u);
    setFullName(u.fullName);
    setEmail(u.email);
    setPhone(u.phone || '');
    setPassword(''); // Leave blank if not resetting
    setRole(u.role);
    setIsActive(u.isActive);
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!editingUser && password.length < 8) {
      setModalError('নতুন ইউজারের জন্য পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে');
      return;
    }
    if (editingUser && password && password.length < 8) {
      setModalError('রিসেট পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে');
      return;
    }

    try {
      const url = editingUser ? `/api/admin/users/${editingUser.id}` : '/api/admin/users';
      const method = editingUser ? 'PUT' : 'POST';

      const payload: any = { fullName, email, phone, role, isActive };
      if (password) payload.password = password;

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        setIsModalOpen(false);
        fetchUsers();
      } else {
        setModalError(json.message || 'ব্যর্থ হয়েছে');
      }
    } catch {
      setModalError('সার্ভার এরর');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#12352a] flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#0b6b45]" />
            ব্যবহারকারী ও ভূমিকা (Users & RBAC)
          </h2>
          <p className="text-xs text-[#688177]">
            অ্যাডমিন, ম্যানেজার ও ক্যাশিয়ার অ্যাকাউন্ট পরিচালনা করুন
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#0b6b45] hover:bg-[#21ad70] rounded-xl shadow-xs transition-all cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          নতুন ব্যবহারকারী
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-[#dcebe2] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f5faf7] text-[#688177] border-b border-[#dcebe2]">
              <tr>
                <th className="py-3 px-4 font-semibold">নাম</th>
                <th className="py-3 px-4 font-semibold">ইমেইল</th>
                <th className="py-3 px-4 font-semibold">ফোন নম্বর</th>
                <th className="py-3 px-4 font-semibold text-center">ভূমিকা (Role)</th>
                <th className="py-3 px-4 font-semibold text-center">স্ট্যাটাস</th>
                <th className="py-3 px-4 font-semibold text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f5faf7]">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#688177]">লোড হচ্ছে...</td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-[#f5faf7]/60">
                    <td className="py-3 px-4 font-bold text-[#12352a]">{u.fullName}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{u.email}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{u.phone || '—'}</td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`capitalize px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          u.role === 'admin'
                            ? 'bg-purple-100 text-purple-800'
                            : u.role === 'manager'
                            ? 'bg-sky-100 text-sky-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          u.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {u.isActive ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => openEdit(u)}
                        className="p-1.5 text-slate-600 hover:text-[#0b6b45] hover:bg-slate-100 rounded-lg"
                        title="এডিট বা পাসওয়ার্ড রিসেট"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#dcebe2] space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#dcebe2]">
              <h3 className="font-bold text-sm text-[#12352a]">
                {editingUser ? 'ব্যবহারকারী সম্পাদন / পাসওয়ার্ড পরিবর্তন' : 'নতুন ব্যবহারকারী তৈরি'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
                {modalError}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#12352a] mb-1">পূর্ণ নাম *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#f5faf7] border border-[#dcebe2] rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#12352a] mb-1">ইমেইল *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#f5faf7] border border-[#dcebe2] rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#12352a] mb-1">ফোন নম্বর</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#f5faf7] border border-[#dcebe2] rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#12352a] mb-1">ভূমিকা (Role)</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-[#f5faf7] border border-[#dcebe2] rounded-xl"
                >
                  <option value="cashier">ক্যাশিয়ার (Cashier - POS ও বিক্রয়)</option>
                  <option value="manager">ম্যানেজার (Manager - সম্পূর্ণ স্টোর)</option>
                  <option value="admin">অ্যাডমিন (Admin - সম্পূর্ণ অধিকার)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#12352a] mb-1">
                  {editingUser ? 'পাসওয়ার্ড রিসেট (পরিবর্তন না চাইলে ফাঁকা রাখুন)' : 'পাসওয়ার্ড (কমপক্ষে ৮ অক্ষর) *'}
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#f5faf7] border border-[#dcebe2] rounded-xl"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-xs font-semibold text-[#12352a] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded text-[#0b6b45]"
                  />
                  সক্রিয় রাখুন (Account Active)
                </label>
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
