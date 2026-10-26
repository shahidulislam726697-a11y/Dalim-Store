import React, { createContext, useContext, useState, useEffect } from 'react';

export interface UserSession {
  id: number;
  email: string;
  fullName: string;
  role: 'admin' | 'manager' | 'cashier';
  shopId: number;
  phone?: string;
}

export interface ShopInfo {
  id: number;
  shopName: string;
  phone: string;
  address: string;
  currencySymbol: string;
  invoicePrefix: string;
  invoiceFooter: string;
  bkashNumber: string;
  nagadNumber: string;
  qrImage: string;
}

interface AuthContextType {
  user: UserSession | null;
  shop: ShopInfo | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: UserSession, shop?: ShopInfo) => void;
  logout: () => void;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  shop: null,
  token: null,
  isLoading: true,
  login: () => {},
  logout: () => {},
  refreshMe: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [shop, setShop] = useState<ShopInfo | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('dalim_token'));
  const [isLoading, setIsLoading] = useState(true);

  const fetchMe = async (jwtToken: string) => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${jwtToken}` },
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.data.user);
        setShop(data.data.shop);
      } else {
        localStorage.removeItem('dalim_token');
        setToken(null);
        setUser(null);
      }
    } catch {
      localStorage.removeItem('dalim_token');
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchMe(token);
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const login = (newToken: string, newUser: UserSession, newShop?: ShopInfo) => {
    localStorage.setItem('dalim_token', newToken);
    setToken(newToken);
    setUser(newUser);
    if (newShop) setShop(newShop);
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    localStorage.removeItem('dalim_token');
    setToken(null);
    setUser(null);
    setShop(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        shop,
        token,
        isLoading,
        login,
        logout,
        refreshMe: async () => {
          if (token) await fetchMe(token);
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
