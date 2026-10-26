import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { FxCanvas } from './components/FxCanvas.tsx';
import { Storefront } from './components/Storefront.tsx';
import { LoginPage } from './components/LoginPage.tsx';
import { SetupPage } from './components/SetupPage.tsx';
import { AdminLayout, AdminTab } from './components/admin/AdminLayout.tsx';

function MainRouter() {
  const { user, isLoading } = useAuth();
  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname || '/');

  // Sync with browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5faf7] text-[#0b6b45]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-[#2de4a0] border-t-transparent rounded-full animate-spin" />
          <span className="font-semibold text-xs tracking-wider">ডালিম স্টোর লোড হচ্ছে...</span>
        </div>
      </div>
    );
  }

  // Setup route: /setup
  if (currentPath === '/setup') {
    return (
      <>
        <FxCanvas />
        <SetupPage
          onSetupComplete={() => navigateTo('/admin/dashboard')}
          onGoToLogin={() => navigateTo('/admin/login')}
        />
      </>
    );
  }

  // Admin Login route: /admin/login
  if (currentPath === '/admin/login') {
    if (user) {
      navigateTo('/admin/dashboard');
      return null;
    }
    return (
      <>
        <FxCanvas />
        <LoginPage
          onLoginSuccess={() => navigateTo('/admin/dashboard')}
          onGoToStorefront={() => navigateTo('/')}
          onGoToSetup={() => navigateTo('/setup')}
        />
      </>
    );
  }

  // Admin Panel routes: /admin or /admin/*
  if (currentPath.startsWith('/admin')) {
    if (!user) {
      navigateTo('/admin/login');
      return null;
    }

    // Determine current tab from subpath: e.g. /admin/pos -> 'pos'
    const subpath = currentPath.replace(/^\/admin\/?/, '');
    const validTabs: AdminTab[] = [
      'dashboard',
      'pos',
      'products',
      'categories',
      'sales',
      'customers',
      'expenses',
      'reports',
      'settings',
      'users',
      'shops',
    ];
    const activeTab = validTabs.includes(subpath as AdminTab) ? (subpath as AdminTab) : 'dashboard';

    return (
      <AdminLayout
        currentTab={activeTab}
        onSelectTab={(tab) => navigateTo(`/admin/${tab}`)}
        onGoToStorefront={() => navigateTo('/')}
      />
    );
  }

  // Default: Public Storefront (/)
  return (
    <>
      <FxCanvas />
      <Storefront onNavigateToAdmin={() => navigateTo(user ? '/admin/dashboard' : '/admin/login')} />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainRouter />
    </AuthProvider>
  );
}
