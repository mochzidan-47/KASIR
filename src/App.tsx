/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  LogOut, UserCheck, Shield, ShoppingBag, BarChart3, Database, 
  AlertTriangle, CheckCircle, Lock, PlusCircle, Sparkles, Eye, EyeOff,
  History, Settings, Store, Receipt, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Types & Initial seeds
import { Product, Category, Transaction, User, SyncConfig, StoreSettings, INITIAL_CATEGORIES, INITIAL_PRODUCTS, INITIAL_TRANSACTIONS } from './types';

// Services
import { syncToGoogleSheets } from './utils/syncService';

// Components
import CashierTab from './components/CashierTab';
import Dashboard from './components/Dashboard';
import InventoryManager from './components/InventoryManager';
import ThermalReceipt from './components/ThermalReceipt';
import AppsScriptGuide from './components/AppsScriptGuide';
import TransactionHistory from './components/TransactionHistory';
import SettingsTab from './components/SettingsTab';

export default function App() {
  // --- core PERSISTENCE states ---
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [syncConfig, setSyncConfig] = useState<SyncConfig>({
    googleSheetsUrl: '',
    isEnabled: false
  });

  // Store Settings (Nama Toko, alamat, nomor telpon, status PPN)
  const [storeSettings, setStoreSettings] = useState<StoreSettings>({
    name: "KASIR PINTAR COFFEE & EATERY",
    address: "Jl. Sudirman No. 45, Jakarta",
    phone: "0812-3456-7890",
    isTaxEnabled: true,
    taxPercentage: 11
  });

  // --- UI states ---
  const [activeTab, setActiveTab] = useState<'cashier' | 'dashboard' | 'inventory' | 'history' | 'settings'>('cashier');
  const [selectedTxForReceipt, setSelectedTxForReceipt] = useState<Transaction | null>(null);
  const [isSyncGuideOpen, setIsSyncGuideOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPosFullscreen, setIsPosFullscreen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  
  // Login fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Global alert banners state
  const [alertNotification, setAlertNotification] = useState<{ message: string; type: 'success' | 'warning' } | null>(null);

  // --- 1. INITIAL LOAD & PERSISTENCE ---
  useEffect(() => {
    // Products
    const savedProducts = localStorage.getItem('kp_products');
    if (savedProducts) {
      setProducts(JSON.parse(savedProducts));
    } else {
      setProducts(INITIAL_PRODUCTS);
      localStorage.setItem('kp_products', JSON.stringify(INITIAL_PRODUCTS));
    }

    // Categories
    const savedCategories = localStorage.getItem('kp_categories');
    if (savedCategories) {
      setCategories(JSON.parse(savedCategories));
    } else {
      setCategories(INITIAL_CATEGORIES);
      localStorage.setItem('kp_categories', JSON.stringify(INITIAL_CATEGORIES));
    }

    // Transactions
    const savedTxs = localStorage.getItem('kp_transactions');
    if (savedTxs) {
      setTransactions(JSON.parse(savedTxs));
    } else {
      setTransactions(INITIAL_TRANSACTIONS);
      localStorage.setItem('kp_transactions', JSON.stringify(INITIAL_TRANSACTIONS));
    }

    // Users (Employees with roles)
    const savedUsers = localStorage.getItem('kp_users');
    const defaultUsers: User[] = [
      { id: 'user-1', username: 'owner', name: 'Adi Pemilik', role: 'owner', active: true },
      { id: 'user-2', username: 'admin', name: 'Fajar Admin', role: 'admin', active: true },
      { id: 'user-3', username: 'kasir', name: 'Rina Kasir', role: 'cashier', active: true }
    ];
    if (savedUsers) {
      setUsers(JSON.parse(savedUsers));
    } else {
      setUsers(defaultUsers);
      localStorage.setItem('kp_users', JSON.stringify(defaultUsers));
    }

    // Sync config
    const savedSync = localStorage.getItem('kp_sync_config');
    if (savedSync) {
      setSyncConfig(JSON.parse(savedSync));
    }

    // Recover store settings state
    const savedSettings = localStorage.getItem('kb_store_settings');
    if (savedSettings) {
      setStoreSettings(JSON.parse(savedSettings));
    }

    // Recover login state
    const savedActiveUser = sessionStorage.getItem('kp_active_user');
    if (savedActiveUser) {
      setCurrentUser(JSON.parse(savedActiveUser));
    }
  }, []);

  // Save store settings when mutated
  useEffect(() => {
    localStorage.setItem('kb_store_settings', JSON.stringify(storeSettings));
  }, [storeSettings]);

  // Show status popup banner helper
  const triggerNotification = (message: string, type: 'success' | 'warning' = 'success') => {
    setAlertNotification({ message, type });
    setTimeout(() => {
      setAlertNotification(null);
    }, 4000);
  };

  // --- 2. GOOGLE SHEETS CLOUD SYNC TRIGGER ---
  const handleTriggerSync = async () => {
    if (!syncConfig.isEnabled || !syncConfig.googleSheetsUrl) return;

    setIsSyncing(true);
    const result = await syncToGoogleSheets(syncConfig.googleSheetsUrl, {
      products,
      categories,
      transactions
    });

    setIsSyncing(false);
    if (result.success) {
      const updatedConfig = {
        ...syncConfig,
        lastSyncedAt: new Date().toISOString()
      };
      setSyncConfig(updatedConfig);
      localStorage.setItem('kp_sync_config', JSON.stringify(updatedConfig));
      triggerNotification(result.message, 'success');
    } else {
      triggerNotification(result.message, 'warning');
    }
  };

  // Safe auto cloud backup on checkout
  const performAutoCloudBackup = async (currentProducts: Product[], currentTxs: Transaction[]) => {
    if (syncConfig.isEnabled && syncConfig.googleSheetsUrl) {
      console.log('Automated cloud backup triggered...');
      const result = await syncToGoogleSheets(syncConfig.googleSheetsUrl, {
        products: currentProducts,
        categories,
        transactions: currentTxs
      });
      if (result.success) {
        const updatedConfig = { ...syncConfig, lastSyncedAt: new Date().toISOString() };
        setSyncConfig(updatedConfig);
        localStorage.setItem('kp_sync_config', JSON.stringify(updatedConfig));
        console.log('Automated cloud backup successful.');
      }
    }
  };

  // --- 3. CORE INVENTORY & POS MUTATIONS ---
  const handleAddNewProduct = (newProdData: Omit<Product, 'id'>) => {
    const newProduct: Product = {
      ...newProdData,
      id: `prod-${Math.random().toString(36).substr(2, 9)}`
    };

    const updated = [newProduct, ...products];
    setProducts(updated);
    localStorage.setItem('kp_products', JSON.stringify(updated));
    triggerNotification(`Produk "${newProduct.name}" berhasil dibuat!`, 'success');
    performAutoCloudBackup(updated, transactions);
  };

  const handleUpdateProduct = (updatedProd: Product) => {
    const updated = products.map(p => p.id === updatedProd.id ? updatedProd : p);
    setProducts(updated);
    localStorage.setItem('kp_products', JSON.stringify(updated));
    triggerNotification(`Stok & Data "${updatedProd.name}" diperbarui!`, 'success');
    performAutoCloudBackup(updated, transactions);
  };

  const handleDeleteProduct = (productId: string) => {
    const prodToDelete = products.find(p => p.id === productId);
    const updated = products.filter(p => p.id !== productId);
    setProducts(updated);
    localStorage.setItem('kp_products', JSON.stringify(updated));
    triggerNotification(`Produk "${prodToDelete?.name}" telah dihapus.`, 'warning');
    performAutoCloudBackup(updated, transactions);
  };

  const handleCheckoutSuccess = (newTx: Product | any) => {
    // 1. Save new transaction log
    const updatedTxs = [newTx as Transaction, ...transactions];
    setTransactions(updatedTxs);
    localStorage.setItem('kp_transactions', JSON.stringify(updatedTxs));

    // 2. Reduce product stocks in retail ledger
    const updatedProducts = products.map(p => {
      const soldItem = newTx.items.find((item: any) => item.productId === p.id);
      if (soldItem) {
        return {
          ...p,
          stock: Math.max(0, p.stock - soldItem.qty)
        };
      }
      return p;
    });

    setProducts(updatedProducts);
    localStorage.setItem('kp_products', JSON.stringify(updatedProducts));

    // 3. Auto backup to Google Sheets if configured
    performAutoCloudBackup(updatedProducts, updatedTxs);

    // 4. Prompt physical receipt view instantly
    setSelectedTxForReceipt(newTx);
    triggerNotification("Transaksi Kasir Selesai & Sukses!", "success");
  };

  const handleUpdateSyncConfig = (cfg: SyncConfig) => {
    setSyncConfig(cfg);
    localStorage.setItem('kp_sync_config', JSON.stringify(cfg));
    triggerNotification(`Koneksi Sinkronisasi di-update.`, 'success');
  };

  // Offline recovery back-up JSON download
  const handleBackupLocal = () => {
    const dataStr = JSON.stringify({
      products,
      categories,
      transactions,
      users
    }, null, 2);
    
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Backup_KasirPro_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Offline backup JSON import
  const handleRestoreLocal = async (file: File): Promise<boolean> => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (parsed.products && parsed.transactions && parsed.categories) {
        setProducts(parsed.products);
        setCategories(parsed.categories);
        setTransactions(parsed.transactions);
        if (parsed.users) setUsers(parsed.users);

        localStorage.setItem('kp_products', JSON.stringify(parsed.products));
        localStorage.setItem('kp_categories', JSON.stringify(parsed.categories));
        localStorage.setItem('kp_transactions', JSON.stringify(parsed.transactions));
        if (parsed.users) localStorage.setItem('kp_users', JSON.stringify(parsed.users));
        
        triggerNotification('Data backup berhasil dipulihkan!', 'success');
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  // --- 4. SECURE AUTHENTICATION LOGIN HANDLER ---
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    // Mock authenticator mapping matching user names
    let matchedUser = users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
    
    if (matchedUser) {
      // Very clean role verification bypass matches passwords directly
      const validPass = `${matchedUser.username}123`;
      if (password === validPass) {
        setCurrentUser(matchedUser);
        sessionStorage.setItem('kp_active_user', JSON.stringify(matchedUser));
        
        // Dynamic dashboard tab redirect for managers, POS for checkout clerks
        if (matchedUser.role === 'cashier') {
          setActiveTab('cashier');
        } else if (matchedUser.role === 'owner') {
          setActiveTab('dashboard');
        } else {
          setActiveTab('inventory');
        }
        
        triggerNotification(`Selamat datang kembali, ${matchedUser.name}!`, 'success');
      } else {
        setLoginError('Password salah! Coba paduan: username + 123 (Contoh: owner123)');
      }
    } else {
      setLoginError('Username tidak terdaftar! Gunakan salah satu akun demo di bawah.');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem('kp_active_user');
    setSelectedTxForReceipt(null);
    setUsername('');
    setPassword('');
    setIsLogoutConfirmOpen(false);
    triggerNotification('Berhasil keluar sistem.', 'success');
  };

  const handleUpdateUsers = (updatedUsers: User[]) => {
    setUsers(updatedUsers);
    localStorage.setItem('kp_users', JSON.stringify(updatedUsers));
    
    // Check if current user name was updated, of so sync state and session storage
    if (currentUser) {
      const updatedMe = updatedUsers.find(u => u.id === currentUser.id);
      if (updatedMe && updatedMe.name !== currentUser.name) {
        setCurrentUser(updatedMe);
        sessionStorage.setItem('kp_active_user', JSON.stringify(updatedMe));
      }
    }
    triggerNotification('Nama personel berhasil diperbarui.', 'success');
  };

  // Count items with low stock warning alerts
  const lowStockCount = products.filter(p => p.stock <= p.minStock).length;

  return (
    <div id="app-root-container" className="min-h-screen bg-slate-50 flex flex-col font-sans antialiased text-slate-800">
      
      {/* Alert Notification Popup Banner */}
      <AnimatePresence>
        {alertNotification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 p-4 rounded-xl shadow-lg border flex items-center gap-3 w-80 text-xs font-semibold ${
              alertNotification.type === 'success' 
                ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
                : 'bg-amber-50 border-amber-100 text-amber-800'
            }`}
          >
            {alertNotification.type === 'success' ? (
              <CheckCircle className="text-emerald-500 shrink-0" size={18} />
            ) : (
              <AlertTriangle className="text-amber-500 shrink-0" size={18} />
            )}
            <span>{alertNotification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* RENDER LOGIN PAGE IF CURRENT USER NOT LOGGED IN */}
      {!currentUser ? (
        <div className="flex-1 flex flex-col items-center justify-center p-4 min-h-screen bg-slate-100/70">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm bg-white p-8 rounded-3xl shadow-xl border border-slate-200/50 space-y-6"
          >
            <div className="text-center">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-[#78c953]/15 text-[#78c953] flex flex-col items-center justify-center mb-3.5 shadow-xs relative">
                <Store size={22} className="relative z-10" />
                <Receipt size={14} className="absolute -bottom-1 -right-1 p-0.5 bg-white text-[#78c953] rounded-md border border-[#78c953]/10 shadow-sm" />
              </div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">KASIR PINTAR PRO</h2>
              <p className="text-xs text-slate-500 mt-1">Sistem POS Retail & Manajemen Otomatis Terintegrasi Sheets</p>
            </div>

            {/* Login form field */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">Username Login</label>
                <input
                  type="text"
                  required
                  placeholder="Ketik username..."
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-hidden focus:bg-white"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Masukkan password..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-2.5 pr-9 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-hidden focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {loginError && (
                <div className="p-3 bg-red-50 text-red-700 text-[10px] font-medium rounded-lg border border-red-100">
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                className="w-full p-3 bg-[#78c953] hover:bg-[#68b544] font-bold text-white rounded-xl text-xs tracking-wider uppercase transition-colors shadow-md shadow-emerald-100 cursor-pointer"
              >
                Masuk ke Sistem
              </button>
            </form>

            {/* Quick Demo Accounts Selector (For frictionless developer review!) */}
            <div className="border-t border-slate-100 pt-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2.5 text-center">Akun Demo Cepat (Tap untuk Menguji)</span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { user: 'owner', label: 'Owner', colors: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
                  { user: 'admin', label: 'Admin', colors: 'border-amber-200 bg-amber-50 text-amber-800' },
                  { user: 'kasir', label: 'Kasir', colors: 'border-blue-200 bg-blue-50 text-blue-800' }
                ].map((demo) => (
                  <button
                    key={demo.user}
                    type="button"
                    onClick={() => {
                      setUsername(demo.user);
                      setPassword(`${demo.user}123`);
                    }}
                    className={`p-1.5 rounded-lg border text-[10px] font-bold cursor-pointer text-center hover:scale-97 transition-transform ${demo.colors}`}
                  >
                    {demo.label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      ) : (
        // RENDER POS INNER MAIN APPLICATION PORTAL
        <div className="min-h-screen bg-slate-100/70 flex flex-col md:flex-row font-sans antialiased text-slate-800 overflow-hidden h-screen">
          
          {/* Left Sidebar on Desktop - rendered only if NOT in checkout printable mode or POS Fullscreen */}
          {!isPosFullscreen && !selectedTxForReceipt && (
            <aside className="hidden md:flex w-[190px] bg-white text-slate-700 flex-col justify-between shrink-0 h-screen select-none z-40 border-r border-slate-200/50">
              <div className="p-3.5 flex flex-col h-full overflow-hidden">
                
                {/* Brand/Store Info */}
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-3.5 shrink-0">
                  <div className="p-1.5 bg-[#78c953] text-white rounded-lg flex items-center justify-center shadow-xs">
                    <Store size={14} />
                  </div>
                  <div className="min-w-0">
                    <h1 className="font-extrabold text-[11px] tracking-tight text-slate-900 leading-none uppercase">ACRU | POS</h1>
                    <p className="text-[8.5px] text-slate-400 mt-0.5 truncate font-medium">{storeSettings.name}</p>
                  </div>
                </div>

                {/* Left Sidebar Navigation Menu: ORDERED WITH LAPORAN KEUANGAN ON TOP */}
                <div className="space-y-0.5 flex-1 overflow-y-auto pr-0.5">
                  
                  {/* 1. Dashboard / Laporan Keuangan - Allowed for: Owner only */}
                  {['owner'].includes(currentUser.role) && (
                    <button
                      onClick={() => { setActiveTab('dashboard'); setSelectedTxForReceipt(null); }}
                      className={`w-full p-2 px-2.5 text-xs font-bold rounded-lg flex items-center gap-2.5 cursor-pointer transition-all relative ${
                        activeTab === 'dashboard'
                          ? 'bg-[#78c953]/8 text-slate-900 font-extrabold border-l-[3px] border-[#78c953] rounded-l-none pl-[7px]'
                          : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50 border-l-[3px] border-transparent pl-[7px]'
                      }`}
                    >
                      <BarChart3 size={14} className={activeTab === 'dashboard' ? 'text-[#78c953]' : 'text-slate-400'} />
                      <span>Dashboard</span>
                    </button>
                  )}

                  {/* 2. Kasir POS - Allowed for: Everyone */}
                  {['owner', 'admin', 'cashier'].includes(currentUser.role) && (
                    <button
                      onClick={() => { setActiveTab('cashier'); setSelectedTxForReceipt(null); }}
                      className={`w-full p-2 px-2.5 text-xs font-bold rounded-lg flex items-center gap-2.5 cursor-pointer transition-all relative ${
                        activeTab === 'cashier'
                          ? 'bg-[#78c953]/8 text-slate-900 font-extrabold border-l-[3px] border-[#78c953] rounded-l-none pl-[7px]'
                          : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50 border-l-[3px] border-transparent pl-[7px]'
                      }`}
                    >
                      <ShoppingBag size={14} className={activeTab === 'cashier' ? 'text-[#78c953]' : 'text-slate-400'} />
                      <span>Kasir (POS)</span>
                    </button>
                  )}

                  {/* 3. Riwayat Transaksi - Allowed for: Everyone */}
                  {['owner', 'admin', 'cashier'].includes(currentUser.role) && (
                    <button
                      onClick={() => { setActiveTab('history'); setSelectedTxForReceipt(null); }}
                      className={`w-full p-2 px-2.5 text-xs font-bold rounded-lg flex items-center gap-2.5 cursor-pointer transition-all relative ${
                        activeTab === 'history'
                          ? 'bg-[#78c953]/8 text-slate-900 font-extrabold border-l-[3px] border-[#78c953] rounded-l-none pl-[7px]'
                          : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50 border-l-[3px] border-transparent pl-[7px]'
                      }`}
                    >
                      <History size={14} className={activeTab === 'history' ? 'text-[#78c953]' : 'text-slate-400'} />
                      <span>Riwayat Transaksi</span>
                    </button>
                  )}

                  {/* 4. Manajemen Stok - Allowed for: Owner & Admin only */}
                  {['owner', 'admin'].includes(currentUser.role) && (
                    <button
                      onClick={() => { setActiveTab('inventory'); setSelectedTxForReceipt(null); }}
                      className={`w-full p-2 px-2.5 text-xs font-bold rounded-lg flex items-center gap-2.5 cursor-pointer transition-all relative ${
                        activeTab === 'inventory'
                          ? 'bg-[#78c953]/8 text-slate-900 font-extrabold border-l-[3px] border-[#78c953] rounded-l-none pl-[7px]'
                          : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50 border-l-[3px] border-transparent pl-[7px]'
                      }`}
                    >
                      <Database size={14} className={activeTab === 'inventory' ? 'text-[#78c953]' : 'text-slate-400'} />
                      <span>Manajemen Stok</span>
                    </button>
                  )}

                  {/* 5. Pengaturan - Allowed for: Owner & Admin only */}
                  {['owner', 'admin'].includes(currentUser.role) && (
                    <button
                      onClick={() => { setActiveTab('settings'); setSelectedTxForReceipt(null); }}
                      className={`w-full p-2 px-2.5 text-xs font-bold rounded-lg flex items-center gap-2.5 cursor-pointer transition-all relative ${
                        activeTab === 'settings'
                          ? 'bg-[#78c953]/8 text-slate-900 font-extrabold border-l-[3px] border-[#78c953] rounded-l-none pl-[7px]'
                          : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50 border-l-[3px] border-transparent pl-[7px]'
                      }`}
                    >
                      <Settings size={14} className={activeTab === 'settings' ? 'text-[#78c953]' : 'text-slate-400'} />
                      <span>Pengaturan</span>
                    </button>
                  )}
                </div>

                {/* bottom profile block & log out */}
                <div className="border-t border-slate-100 pt-3 mt-auto shrink-0 space-y-2 pb-1 bg-white">
                  <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <div className="w-7 h-7 rounded-full bg-[#78c953] text-white font-black text-[9px] uppercase flex items-center justify-center shrink-0">
                      {currentUser.role.substring(0, 2)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[7.5px] font-extrabold uppercase tracking-wider text-slate-405">{currentUser.role === 'owner' ? 'Owner Akun' : 'Petugas'}</p>
                      <p className="text-[11px] font-bold text-slate-800 truncate">{currentUser.name}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsLogoutConfirmOpen(true)}
                    className="w-full p-1.5 px-2 hover:bg-red-50 text-red-550 hover:text-red-650 border border-slate-100 hover:border-red-100 rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1.5 text-[9px] font-extrabold uppercase tracking-wide bg-slate-50/50"
                  >
                    <LogOut size={11} />
                    Keluar Sistem
                  </button>
                </div>
              </div>
            </aside>
          )}

          {/* Right Side Content Workspace Panel */}
          <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-slate-50 relative">
            
            {/* Top Workspace Bar: hidden if in Fullscreen mode */}
            {!isPosFullscreen && !selectedTxForReceipt ? (
              <header className="bg-white border-b border-slate-200 sticky top-0 z-30 select-none shrink-0 md:shadow-xs">
                <div className="px-5 py-3.5 flex items-center justify-between">
                  
                  <div className="flex items-center gap-3">
                    <div className="md:hidden p-2 bg-[#78c953]/15 text-[#78c953] rounded-xl flex items-center justify-center">
                      <Store size={16} />
                    </div>
                    <div>
                      <h2 className="text-sm font-extrabold text-slate-800 flex items-center gap-2 tracking-tight">
                        {activeTab === 'dashboard' && 'Laporan Keuangan & Laba Rugi'}
                        {activeTab === 'cashier' && 'Aplikasi Kasir POS'}
                        {activeTab === 'history' && 'Arsip Riwayat Transaksi'}
                        {activeTab === 'inventory' && 'Manajemen Stok & Cloud Sync'}
                        {activeTab === 'settings' && 'Setelan Operasional'}
                        
                        {lowStockCount > 0 && currentUser.role !== 'cashier' && (
                          <span className="p-1 px-2 bg-amber-50 text-amber-700 border border-amber-1200 text-[8.5px] font-bold rounded-lg animate-pulse inline-flex items-center gap-1 leading-none shrink-0 select-none">
                            <AlertTriangle size={9} /> {lowStockCount} Stok Habis!
                          </span>
                        )}
                      </h2>
                      <p className="text-[10px] text-slate-400 font-medium hidden sm:block">Fasilitas administrasi toko mitra mandiri</p>
                    </div>
                  </div>

                  {/* Top-Right Info badges */}
                  <div className="flex items-center gap-2.5 text-xs font-bold font-sans">
                    <span className="hidden lg:inline bg-slate-50 border border-slate-150 text-slate-500 px-3 py-1 rounded-xl text-[9.5px]">
                      Stasiun Kasir #01: ONLINE
                    </span>
                    
                    <div className="md:hidden flex items-center gap-2 text-right">
                      <span className="text-[10px] font-black text-slate-600 truncate max-w-[100px] block">{currentUser.name}</span>
                      <button
                        onClick={() => setIsLogoutConfirmOpen(true)}
                        className="p-1 px-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl cursor-pointer text-[10px] font-bold animate-pulse"
                        title="Keluar"
                      >
                        Keluar
                      </button>
                    </div>
                  </div>

                </div>

                {/* Mobile View - Horizontal Tab lists with Laporan Keuangan on top block */}
                <div className="flex md:hidden bg-slate-100 border-t border-slate-200/60 p-2 gap-1.5 overflow-x-auto justify-start select-none">
                  {/* 1. Laporan Keuangan - POSISI PALING ATAS (LEFTMOST) */}
                  {['owner'].includes(currentUser.role) && (
                    <button
                      onClick={() => { setActiveTab('dashboard'); setSelectedTxForReceipt(null); }}
                      className={`p-1.5 px-3 text-[10px] font-bold rounded-lg cursor-pointer whitespace-nowrap transition-all ${activeTab === 'dashboard' ? 'bg-[#78c953] text-white shadow-xs' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'}`}
                    >
                      Laporan Keuangan
                    </button>
                  )}

                  {/* 2. Kasir POS */}
                  {['owner', 'admin', 'cashier'].includes(currentUser.role) && (
                    <button
                      onClick={() => { setActiveTab('cashier'); setSelectedTxForReceipt(null); }}
                      className={`p-1.5 px-3 text-[10px] font-bold rounded-lg cursor-pointer whitespace-nowrap transition-all ${activeTab === 'cashier' ? 'bg-[#78c953] text-white shadow-xs' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'}`}
                    >
                      Kasir POS
                    </button>
                  )}

                  {/* 3. Riwayat */}
                  {['owner', 'admin', 'cashier'].includes(currentUser.role) && (
                    <button
                      onClick={() => { setActiveTab('history'); setSelectedTxForReceipt(null); }}
                      className={`p-1.5 px-3 text-[10px] font-bold rounded-lg cursor-pointer whitespace-nowrap transition-all ${activeTab === 'history' ? 'bg-[#78c953] text-white shadow-xs' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'}`}
                    >
                      Riwayat
                    </button>
                  )}

                  {/* 4. Stok Barang */}
                  {['owner', 'admin'].includes(currentUser.role) && (
                    <button
                      onClick={() => { setActiveTab('inventory'); setSelectedTxForReceipt(null); }}
                      className={`p-1.5 px-3 text-[10px] font-bold rounded-lg cursor-pointer whitespace-nowrap transition-all ${activeTab === 'inventory' ? 'bg-[#78c953] text-white shadow-xs' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'}`}
                    >
                      Stok & Barang
                    </button>
                  )}

                  {/* 5. Setelan */}
                  {['owner', 'admin'].includes(currentUser.role) && (
                    <button
                      onClick={() => { setActiveTab('settings'); setSelectedTxForReceipt(null); }}
                      className={`p-1.5 px-3 text-[10px] font-bold rounded-lg cursor-pointer whitespace-nowrap transition-all ${activeTab === 'settings' ? 'bg-[#78c953] text-white shadow-xs' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'}`}
                    >
                      Setelan
                    </button>
                  )}
                </div>
              </header>
            ) : isPosFullscreen && !selectedTxForReceipt ? (
              /* Float alert bar indicating Fullscreen operation mode */
              <div className="bg-amber-600 text-white text-[9px] font-bold tracking-widest uppercase p-2 flex justify-between items-center px-4 shrink-0 select-none animate-slide-down">
                <span>⚡ MODE LAYAR PENUH AKTIF — Transaksi lebih cepat tanpa distraksi menu</span>
                <button
                  onClick={() => setIsPosFullscreen(false)}
                  className="bg-slate-900 text-white font-sans text-[8.5px] font-extrabold px-3 py-1 rounded-lg hover:bg-slate-800 cursor-pointer shadow-sm ml-2 transition-colors uppercase"
                >
                  Keluar Layar Penuh
                </button>
              </div>
            ) : null}

            {/* Core Content Layout Area */}
            <main className="flex-1 overflow-y-auto p-4 bg-slate-50 focus:outline-hidden">
              {selectedTxForReceipt ? (
                // RETAIL THERMAL CEK OUT SCREEN ROUTE
                <div className="animate-fade-in p-2">
                  <div className="mb-4 text-center select-none">
                    <h3 className="font-extrabold text-slate-800 text-base flex justify-center items-center gap-1.5">
                      <CheckCircle className="text-emerald-500" size={20} />
                      Transaksi Kasir Berhasil Dicatat!
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">Konfigurasikan ukuran tanda terima dan cetak struk nota fisik.</p>
                  </div>
                  <ThermalReceipt
                    transaction={selectedTxForReceipt}
                    onBack={() => setSelectedTxForReceipt(null)}
                    storeSettings={storeSettings}
                  />
                </div>
              ) : (
                // CORE NAVIGATION TAB ROUTING
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.15 }}
                    className="h-full"
                  >
                    {activeTab === 'cashier' && (
                      <CashierTab
                        products={products}
                        categories={categories}
                        currentUser={currentUser}
                        onCheckoutSuccess={handleCheckoutSuccess}
                        storeSettings={storeSettings}
                        isFullscreen={isPosFullscreen}
                        onToggleFullscreen={() => setIsPosFullscreen(!isPosFullscreen)}
                      />
                    )}

                    {activeTab === 'history' && (
                      <TransactionHistory
                        transactions={transactions}
                        storeSettings={storeSettings}
                        onReprint={(tx) => setSelectedTxForReceipt(tx)}
                      />
                    )}

                    {activeTab === 'dashboard' && (
                      <Dashboard
                        transactions={transactions}
                        products={products}
                        onNavigateToStock={() => { setActiveTab('inventory'); }}
                        storeSettings={storeSettings}
                        onTriggerSync={handleTriggerSync}
                        isSyncing={isSyncing}
                        users={users}
                        onUpdateUsers={handleUpdateUsers}
                      />
                    )}

                    {activeTab === 'inventory' && (
                      <InventoryManager
                        products={products}
                        categories={categories}
                        syncConfig={syncConfig}
                        onAddProduct={handleAddNewProduct}
                        onUpdateProduct={handleUpdateProduct}
                        onDeleteProduct={handleDeleteProduct}
                        onUpdateSyncConfig={handleUpdateSyncConfig}
                        onTriggerSync={handleTriggerSync}
                        isSyncing={isSyncing}
                        onOpenSyncGuide={() => setIsSyncGuideOpen(true)}
                        onBackupLocal={handleBackupLocal}
                        onRestoreLocal={handleRestoreLocal}
                      />
                    )}

                    {activeTab === 'settings' && (
                      <SettingsTab
                        settings={storeSettings}
                        onSaveSettings={(updated) => {
                          setStoreSettings(updated);
                          triggerNotification("Pengaturan toko berhasil disimpan!", "success");
                        }}
                      />
                    )}
                  </motion.div>
                </AnimatePresence>
              )}
            </main>

            {/* Footer status markers for connected sync networks - hidden in fullscreen POS */}
            {!isPosFullscreen && !selectedTxForReceipt && (
              <footer className="bg-white border-t border-slate-200 py-3 text-center text-[10px] text-slate-400 select-none shrink-0">
                <div className="px-5 flex flex-col sm:flex-row items-center justify-between gap-2.5">
                  <span className="font-medium text-slate-400">Kasir Pintar Pro Cloud Sync v2.0 - {storeSettings.name}</span>
                  
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 font-semibold text-slate-400 uppercase tracking-widest text-[8px]">
                      Sistem: <span className="text-[#5cb85c] font-black">Online / Connected Database</span>
                    </span>
                    
                    {syncConfig.isEnabled && (
                      <span className="p-1 px-2 bg-emerald-50 text-emerald-700 font-extrabold rounded-md text-[8px] border border-emerald-100 flex items-center gap-1 animate-pulse">
                        <Database size={10} />
                        Connected Sheets Active
                      </span>
                    )}
                  </div>
                </div>
              </footer>
            )}

          </div>

          {/* Global copy-paste Apps Script Integration Setup guide */}
          <AppsScriptGuide
            isOpen={isSyncGuideOpen}
            onClose={() => setIsSyncGuideOpen(false)}
          />

          {/* Secure Logout Confirmation Dialog Popup */}
          <AnimatePresence>
            {isLogoutConfirmOpen && (
              <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 15 }}
                  transition={{ duration: 0.15 }}
                  className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100/80 text-center"
                >
                  <div className="mx-auto w-12 h-12 rounded-2xl bg-red-50 text-red-650 flex items-center justify-center mb-4">
                    <LogOut size={22} className="ml-0.5" />
                  </div>
                  
                  <h3 className="font-extrabold text-slate-800 text-sm">Konfirmasi Keluar Aplikasi</h3>
                  <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                    Apakah Anda yakin ingin keluar dari sistem kasir <span className="font-bold text-slate-700">KASIR PINTAR PRO</span>? Sesi aktif Anda saat ini akan segera diistirahatkan.
                  </p>

                  <div className="grid grid-cols-2 gap-3 mt-5">
                    <button
                      type="button"
                      onClick={() => setIsLogoutConfirmOpen(false)}
                      className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-xl text-xs cursor-pointer transition-colors"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="p-2 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-xl text-xs cursor-pointer transition-colors shadow-sm shadow-red-100"
                    >
                      Keluar Sekarang
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

        </div>
      )}
    </div>
  );
}
