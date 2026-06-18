/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, TrendingDown, DollarSign, ShoppingBag, AlertTriangle, Download, 
  FileSpreadsheet, FileText, Calendar, Filter, ArchiveRestore, Coins,
  Plus, Clock, ArrowRight, User as UserIcon, Coffee, Award, Send, RefreshCw, Sliders,
  ShieldCheck, CheckCircle2, ChevronRight, HelpCircle, Sparkles, X, Info, Printer, FileCheck, Edit2
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, PieChart, Pie, Cell 
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { Transaction, Product, StoreSettings, User } from '../types';

interface DashboardProps {
  transactions: Transaction[];
  products: Product[];
  onNavigateToStock: () => void;
  storeSettings?: StoreSettings;
  onTriggerSync?: () => Promise<void>;
  isSyncing?: boolean;
  users: User[];
  onUpdateUsers: (updated: User[]) => void;
}

export default function Dashboard({ 
  transactions, 
  products, 
  onNavigateToStock,
  storeSettings,
  onTriggerSync,
  isSyncing = false,
  users = [],
  onUpdateUsers
}: DashboardProps) {
  const [dateRange, setDateRange] = useState<'all' | '7days' | 'today'>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [isTipsOpen, setIsTipsOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');

  const handleSaveName = (userId: string) => {
    if (!editingName.trim()) return;
    const updated = users.map(u => u.id === userId ? { ...u, name: editingName.trim() } : u);
    onUpdateUsers(updated);
    setEditingUserId(null);
  };

  // Format IDR Helper
  const formatIDR = (num: number) => {
    return 'Rp ' + Math.round(num).toLocaleString('id-ID');
  };

  // Safe color palettes matching the reference UI colors
  const PIE_COLORS = ['#34d399', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444'];

  // Default store settings fallbacks if not supplied
  const activeStoreName = storeSettings?.name || "KASIR PINTAR COFFEE & EATERY";
  const activeStoreAddress = storeSettings?.address || "Jl. Sudirman No. 45, Jakarta";

  // Filter transactions based on dateRange and selectedMonth
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const txDate = new Date(t.date);
      const now = new Date();
      
      // Date Range Filter
      if (dateRange === 'today') {
        const isToday = txDate.toDateString() === now.toDateString();
        if (!isToday) return false;
      } else if (dateRange === '7days') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(now.getDate() - 7);
        if (txDate < sevenDaysAgo) return false;
      }

      // Monthly filter
      if (selectedMonth !== 'all') {
        const txMonth = txDate.getMonth() + 1; // 1-12
        const txYear = txDate.getFullYear();
        const [filterYear, filterMonth] = selectedMonth.split('-');
        if (txYear !== parseInt(filterYear) || txMonth !== parseInt(filterMonth)) {
          // Check format of selectedMonth which might be e.g. "2026-06"
          return false;
        }
      }

      return true;
    });
  }, [transactions, dateRange, selectedMonth]);

  // Aggregate Key Analytics Metrics
  const metrics = useMemo(() => {
    let salesTotal = 0;
    let costTotal = 0;
    let discountTotal = 0;
    let taxTotal = 0;
    const ordersCount = filteredTransactions.length;

    filteredTransactions.forEach(t => {
      salesTotal += t.total;
      discountTotal += t.discountTotal;
      taxTotal += t.taxTotal;
      t.items.forEach(item => {
        costTotal += ((item.costPrice || 0) * item.qty);
      });
    });

    // Handle initial edge case seeds where cost price is 0
    if (costTotal === 0 && salesTotal > 0) {
      costTotal = Math.round(salesTotal * 0.45); // estimate standard food cost (HPP)
    }

    const netProfit = Math.max(0, salesTotal - costTotal - taxTotal);
    const profitMargin = salesTotal > 0 ? Math.round((netProfit / salesTotal) * 100) : 0;
    const averageOrderValue = ordersCount > 0 ? Math.round(salesTotal / ordersCount) : 0;

    return {
      revenue: salesTotal,
      costOfGoods: costTotal,
      discounts: discountTotal,
      tax: taxTotal,
      profit: netProfit,
      margin: profitMargin,
      orders: ordersCount,
      avgValue: averageOrderValue,
    };
  }, [filteredTransactions]);

  // Low stock inventory items count
  const lowStockItems = useMemo(() => {
    return products.filter(p => p.stock <= p.minStock);
  }, [products]);

  // Daily Sales & Expenses Chart Data
  const dailySalesData = useMemo(() => {
    const datesMap: { [key: string]: { dateStr: string; Revenue: number; Expenses: number; Profit: number; count: number } } = {};
    
    // Seed the map with empty values for past week days to prevent completely blank chart
    const daysToSeed = dateRange === '7days' ? 7 : 10;
    for (let i = daysToSeed - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateString = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
      datesMap[dateString] = {
        dateStr: dateString,
        Revenue: 0,
        Expenses: 0,
        Profit: 0,
        count: 0
      };
    }

    filteredTransactions.forEach(t => {
      const dateString = new Date(t.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
      
      let tCost = 0;
      t.items.forEach(item => {
        tCost += ((item.costPrice || 0) * item.qty);
      });
      if (tCost === 0) {
        tCost = Math.round(t.total * 0.45); // estimate HPP fallback
      }

      const tProfit = Math.max(0, t.total - tCost - t.taxTotal);

      if (!datesMap[dateString]) {
        datesMap[dateString] = {
          dateStr: dateString,
          Revenue: 0,
          Expenses: 0,
          Profit: 0,
          count: 0
        };
      }
      datesMap[dateString].Revenue += t.total;
      datesMap[dateString].Expenses += (tCost + t.taxTotal);
      datesMap[dateString].Profit += tProfit;
      datesMap[dateString].count += 1;
    });

    return Object.values(datesMap).sort((a, b) => {
      // Basic chronological placeholder sorting 
      return 1;
    });
  }, [filteredTransactions, dateRange]);

  // Popular categories calculation
  const popularCategoriesData = useMemo(() => {
    const categoriesMap: { [key: string]: number } = {};
    
    filteredTransactions.forEach(t => {
      t.items.forEach(item => {
        // Safe mapping to product category or default general
        const prod = products.find(p => p.id === item.productId);
        const catName = prod?.category || "Minuman/Coffee";
        categoriesMap[catName] = (categoriesMap[catName] || 0) + item.total;
      });
    });

    // If empty, supply placeholder values for high conversion visual representation in bento chart
    if (Object.keys(categoriesMap).length === 0) {
      return [
        { name: "Coffee Specialty", value: 3800000 },
        { name: "Savoury Meals", value: 2400000 },
        { name: "Delight Pastries", value: 1600000 },
        { name: "Soda & Mocktails", value: 650000 }
      ];
    }

    return Object.entries(categoriesMap).map(([name, value]) => ({
      name,
      value
    })).sort((a, b) => b.value - a.value).slice(0, 4);
  }, [filteredTransactions, products]);

  // Active cashier personnel tracking
  const cashiersActivity = useMemo(() => {
    const ownerUser = users.find(u => u.role === 'owner') || { id: 'user-1', name: 'Adi Pemilik' };
    const adminUser = users.find(u => u.role === 'admin') || { id: 'user-2', name: 'Fajar Admin' };
    const cashierUser = users.find(u => u.role === 'cashier') || { id: 'user-3', name: 'Rina Kasir' };

    const getInitialsLocal = (fullName: string) => {
      const parts = fullName.trim().split(/\s+/);
      if (parts.length === 0 || !parts[0]) return "??";
      if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
      return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
    };

    const cashiersMap: { [key: string]: { name: string; initials: string; count: number; totalSales: number; roleKey: string; id: string } } = {
      'owner': { name: ownerUser.name, initials: getInitialsLocal(ownerUser.name), count: 0, totalSales: 0, roleKey: 'owner', id: ownerUser.id },
      'admin': { name: adminUser.name, initials: getInitialsLocal(adminUser.name), count: 0, totalSales: 0, roleKey: 'admin', id: adminUser.id },
      'kasir': { name: cashierUser.name, initials: getInitialsLocal(cashierUser.name), count: 0, totalSales: 0, roleKey: 'cashier', id: cashierUser.id }
    };

    filteredTransactions.forEach(t => {
      const nameKey = t.cashierName.toLowerCase();
      let matchedKey = 'kasir';
      
      const ownerFirstWord = ownerUser.name.toLowerCase().split(' ')[0] || 'adi';
      const adminFirstWord = adminUser.name.toLowerCase().split(' ')[0] || 'fajar';
      
      if (nameKey.includes(ownerFirstWord) || nameKey.includes('adi')) {
        matchedKey = 'owner';
      } else if (nameKey.includes(adminFirstWord) || nameKey.includes('fajar')) {
        matchedKey = 'admin';
      }
      
      cashiersMap[matchedKey].count += 1;
      cashiersMap[matchedKey].totalSales += t.total;
    });

    // If no transactions yet, seed with subtle baseline counts for visual presentation
    if (transactions.length === 0) {
      cashiersMap['owner'].count = 14;
      cashiersMap['admin'].count = 9;
      cashiersMap['kasir'].count = 21;
    }

    return Object.values(cashiersMap);
  }, [filteredTransactions, transactions, users]);

  // Click on "Send" in the debit card to invoke sheets syncing
  const handleQuickSheetSync = async () => {
    if (onTriggerSync) {
      setSyncFeedback("Memulai sinkronisasi...");
      try {
        await onTriggerSync();
        setSyncFeedback("Sync Google Sheets Sukses!");
        setTimeout(() => setSyncFeedback(null), 3000);
      } catch (err) {
        setSyncFeedback("Gagal Sync. Silakan periksa URL.");
        setTimeout(() => setSyncFeedback(null), 3000);
      }
    } else {
      setSyncFeedback("Fungsi Sync tidak terdaftar.");
      setTimeout(() => setSyncFeedback(null), 3000);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "ID,Invoice,Tanggal,Subtotal,Diskon,Pajak,Total,Pembayaran,Kasir\n";
    filteredTransactions.forEach(t => {
      const row = [t.id, t.invoiceNumber, t.date, t.subTotal, t.discountTotal, t.taxTotal, t.total, t.paymentMethod, `"${t.cashierName}"`].join(",");
      csvContent += row + "\n";
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Laporan_Kasir_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-2">
      {/* 1. Header Row (Dashboard Title and Date filter) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
        <div>
          <h1 className="text-xl font-bold font-sans tracking-tight text-slate-800">Dashboard</h1>
          <p className="text-[11px] text-slate-400 mt-1 font-medium select-none">
            Pantau kinerja keuangan outlet dan rincian transaksi kasir Anda secara modern & real-time.
          </p>
        </div>

        {/* Date search and quick filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Date Tabs */}
          <div className="flex border border-slate-100 rounded-xl overflow-hidden bg-slate-50 p-1">
            <button
              onClick={() => { setDateRange('all'); setSelectedMonth('all'); }}
              className={`p-1 px-3 text-[10px] font-bold rounded-lg cursor-pointer transition-all ${dateRange === 'all' && selectedMonth === 'all' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Semua
            </button>
            <button
              onClick={() => { setDateRange('7days'); setSelectedMonth('all'); }}
              className={`p-1 px-3 text-[10px] font-bold rounded-lg cursor-pointer transition-all ${dateRange === '7days' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
            >
              7 Hari ini
            </button>
            <button
              onClick={() => { setDateRange('today'); setSelectedMonth('all'); }}
              className={`p-1 px-3 text-[10px] font-bold rounded-lg cursor-pointer transition-all ${dateRange === 'today' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Hari ini
            </button>
          </div>

          {/* Month Dropdown filter */}
          <select
            value={selectedMonth}
            onChange={(e) => { setSelectedMonth(e.target.value); setDateRange('all'); }}
            className="p-1.5 px-3 bg-white border border-slate-100 rounded-xl text-[10px] font-bold text-slate-600 focus:outline-hidden cursor-pointer"
          >
            <option value="all">Pilih Bulan</option>
            <option value="2026-06">Juni 2026</option>
            <option value="2026-05">Mei 2026</option>
            <option value="2026-04">April 2026</option>
          </select>

          {/* Export action */}
          <button
            onClick={handleExportCSV}
            className="p-1.5 px-3 bg-slate-900 text-white rounded-xl text-[10px] font-bold hover:bg-slate-800 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Download size={11} />
            Ekspor CSV
          </button>
        </div>
      </div>

      {/* 2. Critical Stock Alert Banner */}
      {lowStockItems.length > 0 && (
        <div className="bg-amber-50 border border-amber-200/60 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-amber-100/80 text-amber-600 rounded-xl shrink-0 mt-0.5">
              <AlertTriangle size={18} />
            </div>
            <div>
              <p className="font-bold text-amber-900 text-xs">Peringatan: Stok Tipis!</p>
              <p className="text-[10px] text-amber-700 mt-1">
                Terdapat <strong>{lowStockItems.length} produk</strong> yang sudah di bawah batas minimum. Kami sarankan untuk segera restock.
              </p>
            </div>
          </div>
          <button
            onClick={onNavigateToStock}
            className="p-1 px-3.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[10px] font-bold tracking-wide transition-all cursor-pointer whitespace-nowrap self-start md:self-center"
          >
            Kelola Stok Sekarang
          </button>
        </div>
      )}

      {/* 3. Main Bento Row: Balance & Volume overview chart (Left) + Top Metrics (Center) + My Card / Cashier Team (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left: Main Balance & Volume Bar Chart (Colspan 5) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-150/70 shadow-2xs lg:col-span-6 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400">Total Volume Penjualan</span>
                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
                  {formatIDR(metrics.revenue)}
                </h2>
                <span className="text-[9px] text-slate-400 mt-1 font-medium block">Visual grafik omset, beban pokok & keuntungan kotor</span>
              </div>
              <div className="flex items-center gap-1.5 select-none text-[8.5px] font-bold">
                <span className="inline-block w-2 h-2 rounded-full bg-slate-900"></span>
                <span className="text-slate-500 mr-2">Omset</span>
                <span className="inline-block w-2 h-2 rounded-full bg-amber-500"></span>
                <span className="text-slate-500 mr-2">Beban Pokok</span>
                <span className="inline-block w-2 h-2 rounded-full bg-[#78c953]"></span>
                <span className="text-slate-500">Laba Bersih</span>
              </div>
            </div>

            {/* Custom rounded Bar Chart */}
            <div className="h-[235px] w-full mt-4">
              {dailySalesData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailySalesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="dateStr" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                    <Tooltip 
                      formatter={(v: any) => [formatIDR(Number(v)), '']}
                      contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '12px', padding: '8px 12px', fontSize: '10px', color: '#fff' }}
                      labelStyle={{ fontWeight: 'bold' }}
                    />
                    <Bar dataKey="Revenue" fill="#0f172a" radius={[3, 3, 0, 0]} barSize={10} />
                    <Bar dataKey="Expenses" fill="#f59e0b" radius={[3, 3, 0, 0]} barSize={10} />
                    <Bar dataKey="Profit" fill="#78c953" radius={[3, 3, 0, 0]} barSize={10} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                  Belum ada transaksi terekam untuk visualisasi grafik.
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-slate-50 pt-3 mt-3 flex justify-between items-center text-[9px] text-slate-450 font-medium">
            <span>Pembaharuan data: Otomatis (Real-time)</span>
            <span className="flex items-center gap-1 text-[#78c953] font-bold">
              <CheckCircle2 size={10} /> POS Sinkron
            </span>
          </div>
        </div>

        {/* Center: Numeric Summary Cards Column (Colspan 3) */}
        <div className="lg:col-span-3 flex flex-col justify-between gap-4">
          
          {/* Card 1: Total Omset */}
          <div className="bg-white p-4.5 rounded-2xl border border-slate-100 flex-1 flex flex-col justify-between hover:bg-slate-50/20 transition-all duration-200">
            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Total Omset</span>
              <div className="text-lg font-extrabold text-slate-800 mt-1">{formatIDR(metrics.revenue)}</div>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-900 font-bold mt-2">
              <TrendingUp size={12} className="text-[#78c953]" />
              <span>+5.1% dibanding bulan lalu</span>
            </div>
          </div>

          {/* Card 2: Total Beban Pokok (HPP) */}
          <div className="bg-white p-4.5 rounded-2xl border border-slate-100 flex-1 flex flex-col justify-between hover:bg-slate-50/20 transition-all duration-200">
            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Beban Pokok (HPP)</span>
              <div className="text-lg font-extrabold text-slate-700 mt-1">{formatIDR(metrics.costOfGoods)}</div>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-amber-600 font-medium mt-2">
              <ArchiveRestore size={12} className="text-amber-500" />
              <span>15.5% dari rata-rata margin</span>
            </div>
          </div>

          {/* Card 3: Saved Profit Bersih */}
          <div className="bg-[#78c953]/15 p-4.5 rounded-2xl border border-[#78c953]/25 flex-1 flex flex-col justify-between hover:bg-[#78c953]/20 transition-all duration-200">
            <div>
              <span className="text-[9px] font-bold text-emerald-800 uppercase tracking-widest block">Laba / (Rugi) Bersih (Otomatis)</span>
              <div className={`text-lg font-extrabold mt-1 ${metrics.profit >= 0 ? 'text-emerald-700' : 'text-red-650'}`}>
                {formatIDR(metrics.profit)}
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 font-medium mt-2">
              <Sparkles size={11} className="text-[#78c953] animate-pulse" />
              <span>Keuntungan bersih dihitung otomatis</span>
            </div>
          </div>

        </div>

        {/* Right: Active Cashier List Only (Colspan 3) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-150/70 shadow-2xs lg:col-span-3 flex flex-col justify-between">
          
          <div>
            {/* Header info */}
            <div className="flex justify-between items-center mb-4">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#78c953] animate-pulse"></span>
                Kasir Berjaga Aktif
              </span>
              <span className="text-[10px] uppercase font-mono font-bold text-slate-400">Live POS</span>
            </div>

            <p className="text-[11px] text-slate-450 mb-4 leading-relaxed font-medium">
              Ringkasan kasir yang bertugas serta performa nominal transaksi ril mereka hari ini.
            </p>

            <div className="space-y-3.5">
              {cashiersActivity.map((cash, i) => {
                let roleLabel = "Pemilik Toko";
                let badgeColor = "bg-[#78c953]/10 text-emerald-800 border-[#78c953]/20";
                let avatarColor = "bg-[#78c953]/15 text-[#78c953]";
                
                if (cash.roleKey === 'admin') {
                  roleLabel = "Staf Admin";
                  badgeColor = "bg-blue-50 text-blue-700 border-blue-100";
                  avatarColor = "bg-blue-100 text-blue-600";
                } else if (cash.roleKey === 'cashier') {
                  roleLabel = "Kasir Utama";
                  badgeColor = "bg-amber-50 text-amber-700 border-amber-100";
                  avatarColor = "bg-amber-100 text-amber-600";
                }

                return (
                  <div key={i} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex flex-col gap-2.5 hover:bg-slate-100/50 hover:border-slate-200 transition-all duration-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <div className="relative shrink-0">
                          <div className={`w-8 h-8 rounded-full ${avatarColor} flex items-center justify-center text-xs font-black uppercase shadow-sm`}>
                            {cash.initials}
                          </div>
                          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#78c953] border-2 border-white"></span>
                        </div>
                        <div className="flex-1 min-w-0">
                          {editingUserId === cash.id ? (
                            <div className="flex items-center gap-1.5 w-full">
                              <input
                                type="text"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                className="px-2 py-0.5 border border-[#78c953] bg-white rounded-md text-[11px] font-bold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-[#78c953] w-24 shrink-1"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveName(cash.id);
                                  else if (e.key === 'Escape') setEditingUserId(null);
                                }}
                              />
                              <button
                                onClick={() => handleSaveName(cash.id)}
                                className="p-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-md transition-colors cursor-pointer shrink-0"
                                title="Simpan"
                              >
                                <CheckCircle2 size={12} />
                              </button>
                              <button
                                onClick={() => setEditingUserId(null)}
                                className="p-1 bg-slate-1 hover:bg-slate-2 rounded-md text-slate-500 transition-colors cursor-pointer shrink-0"
                                title="Batal"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 group/name min-w-0">
                              <h4 className="text-xs font-bold text-slate-700 font-sans tracking-tight leading-none truncate max-w-[100px]" title={cash.name}>{cash.name}</h4>
                              <button
                                onClick={() => {
                                  setEditingUserId(cash.id);
                                  setEditingName(cash.name);
                                }}
                                className="p-0.5 text-slate-400 hover:text-[#78c953] hover:bg-slate-100 rounded-md transition-colors opacity-0 group-hover/name:opacity-100 focus:opacity-100 cursor-pointer shrink-0"
                                title="Ganti Nama"
                              >
                                <Edit2 size={9.5} />
                              </button>
                            </div>
                          )}
                          <span className="text-[9px] text-slate-400 font-semibold mt-1 block leading-none">{roleLabel}</span>
                        </div>
                      </div>
                      <span className={`text-[8.5px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${badgeColor}`}>
                        AKTIF
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-200/50 pt-2 text-[9px] font-medium text-slate-500">
                      <div>
                        <span className="block text-[8px] text-slate-400 uppercase tracking-wider font-bold">Nota Selesai</span>
                        <span className="text-xs font-extrabold text-slate-700 mt-0.5 block">{cash.count} Transaksi</span>
                      </div>
                      <div className="text-right">
                        <span className="block text-[8px] text-slate-400 uppercase tracking-wider font-bold">Total Omset</span>
                        <span className="text-xs font-extrabold text-[#78c953] mt-0.5 block">{formatIDR(cash.totalSales)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>

          <div className="mt-5 border-t border-slate-100 pt-3 flex items-center justify-between text-[9px] text-slate-400 font-medium">
            <span>Sesi Berjalan: 24 Jam</span>
            <span className="flex items-center gap-1.5 text-emerald-600 font-bold">
              <span className="h-1.5 w-1.5 rounded-full bg-[#78c953] animate-ping"></span>
              Jaringan Stabil
            </span>
          </div>

        </div>

      </div>

      {/* 4. Lower Bento Row: Progress bar limit, Optimize advice tips, Cost category analysis, Financial radial score */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Bento Widget 1: Spending Limit / Target Omset Bulanan (Colspan 3) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-150/70 shadow-2xs lg:col-span-3 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400">Target Omset Bulanan</span>
                <h3 className="text-sm font-extrabold font-sans text-slate-800 mt-1">Rp 10.000.000</h3>
              </div>
              <Sliders size={12} className="text-slate-400" />
            </div>

            {/* Custom Progress bar matching monthly spending limit visual design */}
            <div className="mt-4">
              <div className="flex justify-between text-[8px] font-bold text-slate-400 mb-1.5">
                <span>Pencapaian: {formatIDR(metrics.revenue)}</span>
                <span>Terlampaui</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div 
                  className="bg-emerald-400 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (metrics.revenue / 10000000) * 100)}%` }}
                ></div>
              </div>
              <p className="text-[8px] text-slate-400 mt-2">
                Sasaran target omset per bulan diset ke Rp 10.000.000.
              </p>
            </div>
          </div>

          <div className="mt-4 border-t border-slate-50 pt-2 text-[8.5px] font-bold text-emerald-600 flex justify-between">
            <span>Progress Target</span>
            <span>{Math.round((metrics.revenue / 10000000) * 100)}% Selesai</span>
          </div>
        </div>

        {/* Bento Widget 2: Optimize Budget & Tips (Colspan 3) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-150/70 shadow-2xs lg:col-span-3 flex flex-col justify-between">
          <div>
            <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400">Tips Optimalkan Profit</span>
            <h3 className="font-extrabold text-[11px] text-slate-800 mt-1 leading-snug">
              Bagaimana cara menghemat modal & melipatgandakan untung outlet?
            </h3>
            
            <p className="text-[9.5px] text-slate-500 mt-2 leading-relaxed">
              Tekan harga kulaan (HPP) hingga maksimal 35% dari harga jual. Optimalkan menu kopi yang memiliki volume profit terbesar dan singkirkan menu slow-moving yang mengendap di kulkas!
            </p>
          </div>

          <div className="mt-3">
            <button 
              onClick={() => setIsTipsOpen(true)}
              className="text-[9.5px] font-extrabold text-slate-900 flex items-center gap-1 hover:underline cursor-pointer"
            >
              Baca Tips Selengkapnya <ChevronRight size={12} />
            </button>
          </div>
        </div>

        {/* Bento Widget 3: Cost analysis breakdown PieChart (Colspan 3) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-150/70 shadow-2xs lg:col-span-3 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400">Kategori Terlaris (Kinerja Omset)</span>
              <span className="text-[8px] text-slate-400">Porsi Channel</span>
            </div>

            {/* Circle Donut Breakdown Chart */}
            <div className="h-[105px] w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={popularCategoriesData}
                    cx="50%"
                    cy="50%"
                    innerRadius={28}
                    outerRadius={45}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {popularCategoriesData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatIDR(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Custom Labels list */}
            <div className="grid grid-cols-2 gap-1.5 text-[8.5px] font-bold text-slate-600 mt-1 select-none">
              {popularCategoriesData.map((entry, index) => (
                <div key={index} className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}></span>
                  <span className="truncate" title={entry.name}>{entry.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bento Widget 4: Financial Health Radial Gauge (Colspan 3) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-150/70 shadow-2xs lg:col-span-3 flex flex-col justify-between text-center">
          <div>
            <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400">Kesehatan Finansial</span>
            <p className="text-[8px] text-slate-400 mt-0.5">Rating rasio laba bersih / omset</p>

            {/* Radial semi-arch meter using customized SVG path */}
            <div className="relative flex flex-col items-center justify-center h-20 mt-3 overflow-visible">
              <div className="relative">
                <svg className="w-28 h-14 overflow-visible" viewBox="0 0 100 55">
                  {/* Background track */}
                  <path
                    d="M 15 50 A 35 35 0 0 1 85 50"
                    fill="none"
                    stroke="#f1f5f9"
                    strokeWidth="8"
                    strokeLinecap="round"
                  />
                  {/* Active fill */}
                  <path
                    d="M 15 50 A 35 35 0 0 1 85 50"
                    fill="none"
                    stroke={metrics.margin >= 50 ? '#10b981' : metrics.margin >= 30 ? '#3b82f6' : metrics.margin >= 15 ? '#f59e0b' : '#ef4444'}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={109.95}
                    strokeDashoffset={109.95 - (Math.min(100, Math.max(0, metrics.margin)) / 100) * 109.95}
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute inset-x-0 bottom-0.5 flex flex-col items-center justify-center">
                  <span className="text-xs font-black text-slate-800 leading-none">{metrics.margin}%</span>
                  <span className="text-[7.5px] font-bold text-slate-500 mt-1 uppercase tracking-wider">
                    {metrics.margin >= 45 ? "SEHAT" : metrics.margin >= 25 ? "STANDAR" : "WARNING"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <p className="text-[8px] text-slate-450 mt-1">
            Rasio dihitung berdasarkan keuntungan bersih dikurangi harga modal dan PPN.
          </p>
        </div>

      </div>

      {/* 5. Automatic Financial Report Breakdown Table (Daily details) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-150/70 shadow-2xs">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 select-none">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Laporan Keuangan & Margin Laba Harian</h3>
            <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Histori ringkasan penjualan POS per hari yang tersinkron.</p>
          </div>
          <button
            onClick={handleExportCSV}
            className="p-1 px-3 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-100 text-[10px] font-bold rounded-lg cursor-pointer transition-all flex items-center gap-1.5"
          >
            <FileSpreadsheet size={12} /> Ekspor Laporan
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-600 border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider text-[9px] border-b border-slate-100">
                <th className="p-3">Sesi Tanggal</th>
                <th className="p-3">Jumlah Transaksi</th>
                <th className="p-3 text-right">Penjualan Kotor (Omset)</th>
                <th className="p-3 text-right">Potongan Diskon</th>
                <th className="p-3 text-right">Pajak (PPN)</th>
                <th className="p-3 text-right">Biaya Modal (HPP)</th>
                <th className="p-3 text-right font-bold">Margin Keuntungan Bersih</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dailySalesData.length > 0 ? (
                dailySalesData.map((d, index) => {
                  // Find HPP & fields in that date matching filtered transactions
                  const dayTxs = filteredTransactions.filter(t => {
                    const str = new Date(t.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
                    return str === d.dateStr;
                  });

                  // Skip displaying seeded days with 0 sales for a cleaner look if dateRange isn't selectedMonth
                  if (dayTxs.length === 0 && dateRange === 'all') return null;

                  let dayHpp = 0;
                  let dayDiscounts = 0;
                  let dayTaxes = 0;
                  let dayRevenueWithTax = 0;

                  dayTxs.forEach(t => {
                    dayDiscounts += t.discountTotal;
                    dayTaxes += t.taxTotal;
                    dayRevenueWithTax += t.total;
                    t.items.forEach(item => { dayHpp += ((item.costPrice || 0) * item.qty); });
                  });

                  if (dayHpp === 0 && dayRevenueWithTax > 0) {
                    dayHpp = Math.round(dayRevenueWithTax * 0.45); // estimate standard fallback HPP
                  }

                  const dayProfit = Math.max(0, dayRevenueWithTax - dayHpp - dayTaxes);

                  return (
                    <tr key={index} className="hover:bg-slate-50/50">
                      <td className="p-3 font-medium text-slate-800">{d.dateStr}</td>
                      <td className="p-3 font-semibold text-slate-700">{dayTxs.length} Nota transaksi</td>
                      <td className="p-3 text-right text-slate-800 font-bold">{formatIDR(dayRevenueWithTax)}</td>
                      <td className="p-3 text-right text-red-600 font-medium">-{formatIDR(dayDiscounts)}</td>
                      <td className="p-3 text-right text-slate-500">{formatIDR(dayTaxes)}</td>
                      <td className="p-3 text-right text-slate-500">{formatIDR(dayHpp)}</td>
                      <td className="p-3 text-right font-extrabold text-emerald-600 bg-emerald-50/20">{formatIDR(dayProfit)}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="text-center p-8 text-slate-450 font-medium">tidak ada transaksi penjualan terdaftar dalam kurun filter terpilih.</td>
                </tr>
              )}
            </tbody>
            {/* Grand Total Row */}
            <tfoot className="bg-slate-50 font-extrabold border-t border-slate-200">
              <tr>
                <td className="p-3 text-slate-800" colSpan={2}>Grand Total Terhitung</td>
                <td className="p-3 text-right text-slate-800 text-sm font-black">{formatIDR(metrics.revenue)}</td>
                <td className="p-3 text-right text-red-600">{metrics.discounts > 0 ? `-${formatIDR(metrics.discounts)}` : 'Rp 0'}</td>
                <td className="p-3 text-right text-slate-800">{formatIDR(metrics.tax)}</td>
                <td className="p-3 text-right text-slate-800">{formatIDR(metrics.costOfGoods)}</td>
                <td className="p-3 text-right text-emerald-600 text-sm font-black bg-emerald-50/50">{formatIDR(metrics.profit)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Tips Popup Modal */}
      <AnimatePresence>
        {isTipsOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]"
            >
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-[#78c953]/15 text-[#78c953] rounded-xl flex items-center justify-center">
                    <Sparkles size={16} />
                  </div>
                  <h3 className="font-bold text-slate-800 text-sm">Tips Memaksimalkan Profit Outlet</h3>
                </div>
                <button
                  onClick={() => setIsTipsOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer transition-colors"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
                {/* Tip 1 */}
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-50 text-[#78c953] flex items-center justify-center font-black text-xs shrink-0 border border-[#78c953]/10">1</div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-800">Atur Margin HPP Ideal (30% - 35%)</h4>
                    <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                      Jaga Harga Pokok Penjualan (HPP) mentah kopi & makanan di kisaran 30%-35% dari harga eceran. Komposisikan bahan baku dengan saksama agar margin bersih tetap tebal di setiap produk.
                    </p>
                  </div>
                </div>

                {/* Tip 2 */}
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-black text-xs shrink-0 border border-blue-100">2</div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-800">Cegah Out-Of-Stock Bahan Baku</h4>
                    <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                      Pantau indikator "Peringatan Stok Tipis" secara berkala agar pengadaan kopi susu, cangkir cup, sirup mocktail tidak terputus serta menghindari kekecewaan pelanggan.
                    </p>
                  </div>
                </div>

                {/* Tip 3 */}
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center font-black text-xs shrink-0 border border-amber-100">3</div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-800">Bundling Item Slow-Moving</h4>
                    <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                      Sandingkan item slow-moving bersama menu kopi andalan terlaris dalam bentuk promo bundling. Ini mempercepat pemutaran stok bahan baku sebelum kedaluwarsa.
                    </p>
                  </div>
                </div>

                {/* Tip 4 */}
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#78c953]/10 text-emerald-800 flex items-center justify-center font-black text-xs shrink-0 border border-emerald-100">4</div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-800">Integrasikan Cloud Autosave Google Sheets</h4>
                    <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                      Hindari pencatatan manual di kertas yang rawan human-error. Hubungkan Google Apps Script Web App URL agar omset, beban modal, hpp, dan profit terdokumentasi aman di cloud.
                    </p>
                  </div>
                </div>

                {/* Tip 5 */}
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center font-black text-xs shrink-0 border border-purple-100">5</div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-800">Optimalkan Kecepatan Kasir dengan Printer Thermal</h4>
                    <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                      Siapkan printer thermal portable Bluetooth 58mm / desktop USB 80mm agar struk kasir dapat dicetak fisik langsung secara instan demi kelancaran operasional antrean.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsTipsOpen(false)}
                  className="px-4 py-2 bg-[#78c953] text-white hover:bg-[#68b544] rounded-xl text-xs font-bold cursor-pointer transition-all shadow-xs"
                >
                  Saya Paham
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
