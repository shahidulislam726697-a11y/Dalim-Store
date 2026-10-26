import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Tag,
  Receipt,
  Users,
  DollarSign,
  BarChart3,
  Settings,
  Shield,
  Store,
  LogOut,
  Menu,
  X,
  ExternalLink,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { LanguageToggle } from '../LanguageToggle.tsx';
import { DashboardView } from './DashboardView.tsx';
import { PosView } from './PosView.tsx';
import { ProductsView } from './ProductsView.tsx';
import { CategoriesView } from './CategoriesView.tsx';
import { SalesView } from './SalesView.tsx';
import { CustomersView } from './CustomersView.tsx';
import { ExpensesView } from './ExpensesView.tsx';
import { ReportsView } from './ReportsView.tsx';
import { SettingsView } from './SettingsView.tsx';
import { UsersView } from './UsersView.tsx';
import { ShopsView } from './ShopsView.tsx';

export type AdminTab =
  | 'dashboard'
  | 'pos'
  | 'products'
  | 'categories'
  | 'sales'
  | 'customers'
  | 'expenses'
  | 'reports'
  | 'settings'
  | 'users'
  | 'shops';

export const AdminLayout: React.FC<{
  currentTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  onGoToStorefront: () => void;
}> = ({ currentTab, onSelectTab, onGoToStorefront }) => {
  const { user, shop, logout } = useAuth();
  const { t, lang } = useLanguage();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [productFilter, setProductFilter] = useState<string | undefined>(undefined);

  const isAdmin = user?.role === 'admin';
  const isManagerOrAdmin = user?.role === 'admin' || user?.role === 'manager';

  const navSections = [
    {
      title: t('nav_main'),
      items: [
        { id: 'dashboard' as AdminTab, label: t('menu_dashboard'), icon: LayoutDashboard },
        { id: 'pos' as AdminTab, label: t('menu_pos'), icon: ShoppingCart },
        { id: 'products' as AdminTab, label: t('menu_products'), icon: Package },
        { id: 'categories' as AdminTab, label: t('menu_categories'), icon: Tag },
      ],
    },
    {
      title: t('nav_accounts'),
      items: [
        { id: 'sales' as AdminTab, label: t('menu_sales'), icon: Receipt },
        { id: 'customers' as AdminTab, label: t('menu_customers'), icon: Users },
        { id: 'expenses' as AdminTab, label: t('menu_expenses'), icon: DollarSign },
        { id: 'reports' as AdminTab, label: t('menu_reports'), icon: BarChart3 },
      ],
    },
    {
      title: t('nav_admin'),
      items: [
        { id: 'settings' as AdminTab, label: t('menu_settings'), icon: Settings, visible: isAdmin },
        { id: 'users' as AdminTab, label: t('menu_users'), icon: Shield, visible: isAdmin },
        { id: 'shops' as AdminTab, label: t('menu_shops'), icon: Store, visible: isAdmin },
      ].filter((i) => i.visible !== false),
    },
  ];

  const handleNavClick = (tab: AdminTab) => {
    setProductFilter(undefined);
    onSelectTab(tab);
    setIsMobileMenuOpen(false);
  };

  const getPageTitle = (tab: AdminTab) => {
    switch (tab) {
      case 'dashboard':
        return t('menu_dashboard');
      case 'pos':
        return t('menu_pos');
      case 'products':
        return t('menu_products');
      case 'categories':
        return t('menu_categories');
      case 'sales':
        return t('menu_sales');
      case 'customers':
        return t('menu_customers');
      case 'expenses':
        return t('menu_expenses');
      case 'reports':
        return t('menu_reports');
      case 'settings':
        return t('menu_settings');
      case 'users':
        return t('menu_users');
      case 'shops':
        return t('menu_shops');
    }
  };

  return (
    <div className="min-h-screen flex bg-[#f5faf7] text-[#12352a]">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-[#dcebe2] bg-white z-30 shrink-0">
        {/* Logo / Shop identity */}
        <div className="h-18 px-6 border-b border-[#dcebe2] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#0b6b45] text-[#2de4a0] flex items-center justify-center font-bold shadow-xs">
              ড
            </div>
            <div>
              <span className="font-pacifico text-lg text-[#0b6b45] block leading-none">
                {shop?.shopName?.split('(')[0] || 'Dalim Store'}
              </span>
              <span className="text-[10px] text-[#688177] font-semibold tracking-wide">POS & ERP v5</span>
            </div>
          </div>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
          {navSections.map((sec, idx) => (
            <div key={idx} className="space-y-1">
              <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#688177]">
                {sec.title}
              </div>
              <div className="space-y-0.5 pt-1">
                {sec.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#0b6b45] text-white shadow-sm'
                          : 'text-[#688177] hover:text-[#12352a] hover:bg-[#f5faf7]'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-[#2de4a0]' : 'text-[#688177]'}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom User status & Logout */}
        <div className="p-4 border-t border-[#dcebe2] bg-[#f5faf7] flex items-center justify-between">
          <div className="min-w-0 pr-2">
            <div className="text-xs font-bold text-[#12352a] truncate">{user?.fullName}</div>
            <div className="text-[10px] capitalize text-[#688177] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#21ad70]" />
              {user?.role}
            </div>
          </div>
          <button
            onClick={logout}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
            title="লগআউট"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Mobile Drawer Sidebar */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="relative w-64 max-w-[80vw] bg-white h-full flex flex-col z-10 shadow-2xl">
            <div className="h-16 px-5 border-b border-[#dcebe2] flex items-center justify-between">
              <span className="font-pacifico text-lg text-[#0b6b45]">
                {shop?.shopName?.split('(')[0] || 'Dalim Store'}
              </span>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
              {navSections.map((sec, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#688177]">
                    {sec.title}
                  </div>
                  <div className="space-y-0.5 pt-1">
                    {sec.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = currentTab === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleNavClick(item.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                            isActive
                              ? 'bg-[#0b6b45] text-white'
                              : 'text-[#688177] hover:text-[#12352a] hover:bg-[#f5faf7]'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-[#dcebe2] bg-[#f5faf7] flex items-center justify-between">
              <div className="text-xs font-bold text-[#12352a] truncate">{user?.fullName}</div>
              <button onClick={logout} className="p-1.5 text-rose-600">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main View Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-18 px-4 sm:px-8 border-b border-[#dcebe2] bg-white flex items-center justify-between gap-4 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 text-slate-600 hover:bg-[#f5faf7] rounded-xl"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-[#12352a] leading-tight">
                {getPageTitle(currentTab)}
              </h1>
              <span className="text-[11px] text-[#688177] hidden sm:inline">
                {shop?.shopName || 'Dalim Store'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Bangla / English Language Change Button */}
            <LanguageToggle />

            {currentTab !== 'pos' && (
              <button
                onClick={() => onSelectTab('pos')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0b6b45] hover:bg-[#21ad70] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t('menu_pos')}</span>
              </button>
            )}

            <button
              onClick={onGoToStorefront}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-[#dcebe2] hover:bg-[#f5faf7] text-xs font-semibold text-[#0b6b45] rounded-xl transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('public_store')}</span>
            </button>
          </div>
        </header>

        {/* View body */}
        <main className="flex-1 p-4 sm:p-8 overflow-y-auto">
          {currentTab === 'dashboard' && (
            <DashboardView
              onNavigateToPos={() => onSelectTab('pos')}
              onNavigateToProducts={(filter) => {
                setProductFilter(filter);
                onSelectTab('products');
              }}
            />
          )}
          {currentTab === 'pos' && <PosView />}
          {currentTab === 'products' && <ProductsView initialFilter={productFilter} />}
          {currentTab === 'categories' && <CategoriesView />}
          {currentTab === 'sales' && <SalesView />}
          {currentTab === 'customers' && <CustomersView />}
          {currentTab === 'expenses' && <ExpensesView />}
          {currentTab === 'reports' && <ReportsView />}
          {currentTab === 'settings' && <SettingsView />}
          {currentTab === 'users' && <UsersView />}
          {currentTab === 'shops' && <ShopsView />}
        </main>
      </div>
    </div>
  );
};
