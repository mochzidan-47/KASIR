/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef } from 'react';
import { 
  Plus, Edit2, Trash2, Search, Filter, AlertTriangle, CloudRain, 
  Upload, Download, FileSpreadsheet, RefreshCw, RefreshCcw, 
  Settings, Check, HelpCircle, HardDriveDownload, Sparkles
} from 'lucide-react';
import { Product, Category, SyncConfig } from '../types';
import { uploadImageToGoogleDrive, initializeGoogleSheets } from '../utils/syncService';

interface InventoryManagerProps {
  products: Product[];
  categories: Category[];
  syncConfig: SyncConfig;
  onAddProduct: (p: Omit<Product, 'id'>) => void;
  onUpdateProduct: (p: Product) => void;
  onDeleteProduct: (id: string) => void;
  onUpdateSyncConfig: (cfg: SyncConfig) => void;
  onTriggerSync: () => Promise<void>;
  isSyncing: boolean;
  onOpenSyncGuide: () => void;
  onBackupLocal: () => void;
  onRestoreLocal: (file: File) => Promise<boolean>;
}

export default function InventoryManager({
  products,
  categories,
  syncConfig,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onUpdateSyncConfig,
  onTriggerSync,
  isSyncing,
  onOpenSyncGuide,
  onBackupLocal,
  onRestoreLocal
}: InventoryManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Modals/Forms State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  // Product state forms
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState(0);
  const [costPrice, setCostPrice] = useState(0);
  const [stock, setStock] = useState(0);
  const [minStock, setMinStock] = useState(5);
  const [imageUrl, setImageUrl] = useState('');
  const [isUploadingDrive, setIsUploadingDrive] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const productFileInputRef = useRef<HTMLInputElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const restoreInputRef = useRef<HTMLInputElement>(null);
  const [restoreStatus, setRestoreStatus] = useState<string | null>(null);

  // Auto-sheets initialization states
  const [isInitializingSheets, setIsInitializingSheets] = useState(false);
  const [initFeedback, setInitFeedback] = useState<{ success: boolean; message: string } | null>(null);

  const handleAutoInitSheets = async () => {
    if (!syncConfig.googleSheetsUrl) {
      alert("Silakan masukkan URL Google Apps Script Web App terlebih dahulu!");
      return;
    }
    
    setIsInitializingSheets(true);
    setInitFeedback(null);
    try {
      const res = await initializeGoogleSheets(syncConfig.googleSheetsUrl);
      setInitFeedback({ success: res.success, message: res.message });
      // Clear feedback after 6 seconds
      setTimeout(() => setInitFeedback(null), 6000);
    } catch (err: any) {
      setInitFeedback({ success: false, message: err.message || 'Gagal terhubung ke Google Sheets!' });
      setTimeout(() => setInitFeedback(null), 6000);
    } finally {
      setIsInitializingSheets(false);
    }
  };

  // Filter products list
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.sku.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCategory = selectedCategory === 'all' || p.category === selectedCategory;
      return matchSearch && matchCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  const handleOpenAddForm = () => {
    setEditingProduct(null);
    setSku(`PROD-${Math.floor(1000 + Math.random() * 9000)}`);
    setName('');
    setCategory(categories[0]?.name || '');
    setPrice(0);
    setCostPrice(0);
    setStock(0);
    setMinStock(5);
    setImageUrl('');
    setUploadStatus('');
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (p: Product) => {
    setEditingProduct(p);
    setSku(p.sku);
    setName(p.name);
    setCategory(p.category);
    setPrice(p.price);
    setCostPrice(p.costPrice);
    setStock(p.stock);
    setMinStock(p.minStock);
    setImageUrl(p.imageUrl || '');
    setUploadStatus('');
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingProduct) {
      onUpdateProduct({
        ...editingProduct,
        sku,
        name,
        category,
        price,
        costPrice,
        stock,
        minStock,
        imageUrl
      });
    } else {
      onAddProduct({
        sku,
        name,
        category,
        price,
        costPrice,
        stock,
        minStock,
        imageUrl
      });
    }
    setIsFormOpen(false);
  };

  const handleDelete = (p: Product) => {
    const confirmDelete = window.confirm(`Apakah Anda yakin ingin menghapus produk "${p.name}"? Stok tersisa: ${p.stock}`);
    if (confirmDelete) {
      onDeleteProduct(p.id);
    }
  };

  const handleQuickStock = (p: Product, change: number) => {
    const newStock = Math.max(0, p.stock + change);
    onUpdateProduct({
      ...p,
      stock: newStock
    });
  };

  // Google Sheets config change handlers
  const handleToggleSync = (checked: boolean) => {
    onUpdateSyncConfig({
      ...syncConfig,
      isEnabled: checked
    });
  };

  const handleUrlChange = (url: string) => {
    onUpdateSyncConfig({
      ...syncConfig,
      googleSheetsUrl: url
    });
  };

  // Import / Export products as CSV (Excel compatible) template
  const handleExportProductCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "SKU,Nama Produk,Kategori,Harga Jual,Harga Jual Pokok,Stok Saat Ini,Batas Minimum Stok\n";
    
    products.forEach(p => {
      const row = [
        p.sku,
        `"${p.name.replace(/"/g, '""')}"`,
        p.category,
        p.price,
        p.costPrice,
        p.stock,
        p.minStock
      ].join(",");
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Data_Produk_Inventaris_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRestoreFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRestoreStatus('Memulihkan backup data...');
    const result = await onRestoreLocal(file);
    if (result) {
      setRestoreStatus('Data berhasil dipulihkan!');
      setTimeout(() => setRestoreStatus(null), 3500);
    } else {
      setRestoreStatus('Gagal memproses file backup. Pastikan format file berkode JSON.');
      setTimeout(() => setRestoreStatus(null), 3500);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-2">
      {/* Settings Grid Header: Sheets Sync & Backup Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Sync panel */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg shrink-0">
                <FileSpreadsheet size={18} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Sinkronisasi Basis Data Google Sheets</h3>
                <p className="text-[10px] text-slate-400">Hubungkan data transaksi & stok ke Excel Online Anda</p>
              </div>
            </div>
            
            {/* Guide Help Trigger */}
            <button
              onClick={onOpenSyncGuide}
              className="p-1 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1"
            >
              <HelpCircle size={14} />
              Setup Guide
            </button>
          </div>

          <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200/50">
              <span className="text-xs font-bold text-slate-700">Status Sinkronisasi</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={syncConfig.isEnabled}
                  onChange={(e) => handleToggleSync(e.target.checked)}
                  className="sr-only peer" 
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#78c953]"></div>
              </label>
            </div>

            <div className="flex flex-col xl:flex-row gap-3 items-stretch xl:items-center">
              <input
                type="text"
                placeholder="Tempelkan URL Google Apps Script Web App (/exec)..."
                disabled={!syncConfig.isEnabled}
                value={syncConfig.googleSheetsUrl}
                onChange={(e) => handleUrlChange(e.target.value)}
                className="flex-1 min-w-0 p-2.5 bg-white disabled:bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-hidden focus:border-[#78c953] transition-colors"
              />
              
              <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                <button
                  onClick={onTriggerSync}
                  disabled={!syncConfig.isEnabled || isSyncing}
                  className="p-2.5 px-4 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 disabled:bg-slate-300 cursor-pointer flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
                >
                  {isSyncing ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      Menyinkronkan...
                    </>
                  ) : (
                    <>
                      <RefreshCw size={14} />
                      Sync Sekarang
                    </>
                  )}
                </button>

                <button
                  onClick={handleAutoInitSheets}
                  disabled={!syncConfig.isEnabled || isInitializingSheets}
                  className="p-2.5 px-4 bg-[#78c953] hover:bg-[#68b544] text-white rounded-lg text-xs font-semibold disabled:bg-slate-300 cursor-pointer flex items-center justify-center gap-1.5 transition-all text-center whitespace-nowrap"
                  title="Inisialisasi semua target sheet (Sheet_Produk, Sheet_Kategori, Sheet_Transaksi) secara otomatis di Google Spreadsheet Anda tanpa setup sendiri!"
                >
                  {isInitializingSheets ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      Mempelopori...
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      Buat Sheet Otomatis
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {initFeedback && (
            <div className={`p-3 rounded-xl text-xs font-medium border animate-bounce ${initFeedback.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
              {initFeedback.message}
            </div>
          )}

          {syncConfig.lastSyncedAt && (
            <p className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
              <Check size={12} />
              Tersinkronisasi terakhir kali: {new Date(syncConfig.lastSyncedAt).toLocaleString('id-ID')}
            </p>
          )}
        </div>

        {/* Offline Backup Tools Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Ekspor & Pulihkan Toko (Backup Cloud)</h3>
            <p className="text-[10px] text-slate-400 mt-1">Unduh semua salinan lokal atau muat cadangan jika berganti mesin kasir.</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* Backup Button */}
            <button
              onClick={onBackupLocal}
              className="p-2 py-3 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold flex flex-col items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download size={16} className="text-[#78c953]" />
              Simpan Cadangan (.json)
            </button>

            {/* Restore File Button */}
            <button
              onClick={() => restoreInputRef.current?.click()}
              className="p-2 py-3 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold flex flex-col items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Upload size={16} className="text-amber-600" />
              Pasang Cadangan
            </button>
            <input
              type="file"
              ref={restoreInputRef}
              onChange={handleRestoreFileChange}
              accept=".json"
              className="hidden"
            />
          </div>

          {restoreStatus && (
            <p className="text-[10px] text-center font-bold text-slate-600 bg-slate-100 p-1 rounded-md animate-pulse">
              {restoreStatus}
            </p>
          )}
        </div>
      </div>

      {/* Primary Products Inventory table */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-5">
        
        {/* Search, Filter groups, Add Product header */}
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
          <div className="flex-1 flex flex-col md:flex-row gap-2">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Cari SKU atau nama produk..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-hidden focus:bg-white transition-colors"
              />
            </div>

            {/* Category selection */}
            <div className="flex items-center gap-1.5">
              <Filter size={14} className="text-slate-400 shrink-0" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden"
              >
                <option value="all">Semua Kategori</option>
                {categories.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Action buttons list */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportProductCSV}
              className="p-2 px-3 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <FileSpreadsheet size={14} />
              Template Excel
            </button>
            
            <button
              onClick={handleOpenAddForm}
              className="p-2 px-4 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Plus size={14} />
              Tambah Produk
            </button>
          </div>
        </div>

        {/* Master Catalog inventory entries */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-600 border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider text-[10px] border-b border-slate-100">
                <th className="p-3">SKU / Kode</th>
                <th className="p-3">Nama Produk</th>
                <th className="p-3">Kategori</th>
                <th className="p-3 text-right">Harga Modal</th>
                <th className="p-3 text-right">Harga Jual</th>
                <th className="p-3 text-center">Stok Gudang</th>
                <th className="p-3 text-center">Batas Aman</th>
                <th className="p-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((p) => {
                  const isLowStock = p.stock <= p.minStock;
                  
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-mono font-medium text-slate-800">{p.sku}</td>
                      <td className="p-3 font-bold text-slate-800">
                        <div className="flex items-center gap-2.5">
                          {p.imageUrl ? (
                            <img
                              src={p.imageUrl}
                              alt={p.name}
                              referrerPolicy="no-referrer"
                              className="w-9 h-9 rounded-xl object-contain p-0.5 bg-white shrink-0 border border-slate-250 shadow-2xs"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-400 font-bold flex items-center justify-center shrink-0 text-[10px] uppercase font-mono tracking-wider">
                              No Pic
                            </div>
                          )}
                          <span className="truncate max-w-[200px]">{p.name}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md font-medium text-[10px]">
                          {p.category}
                        </span>
                      </td>
                      <td className="p-3 text-right font-medium">{p.costPrice.toLocaleString('id-ID')}</td>
                      <td className="p-3 text-right font-semibold text-slate-800">{p.price.toLocaleString('id-ID')}</td>
                      
                      {/* Interactive Stock Column */}
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleQuickStock(p, -1)}
                            className="w-5 h-5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-md text-xs flex items-center justify-center cursor-pointer transition-colors"
                          >
                            -
                          </button>
                          
                          <span className={`min-w-8 text-center font-bold px-2 py-0.5 rounded-md ${isLowStock ? 'bg-red-50 text-red-600 font-extrabold border border-red-100' : 'text-slate-800'}`}>
                            {p.stock}
                          </span>

                          <button
                            onClick={() => handleQuickStock(p, 5)}
                            className="bg-slate-100 hover:bg-slate-250 text-slate-800 font-bold max-h-5 p-0.5 px-1.5 rounded-md text-[10px] flex items-center justify-center cursor-pointer transition-colors whitespace-nowrap"
                          >
                            +5
                          </button>
                        </div>
                      </td>

                      <td className="p-3 text-center font-semibold text-slate-500">{p.minStock}</td>
                      
                      {/* Action edit/delete btns */}
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditForm(p)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors"
                            title="Edit"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(p)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                            title="Hapus"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="text-center p-8 text-slate-400">Tidak ada produk dalam daftar inventaris Anda.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Main product creation modal form */}
      {isFormOpen && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100 animate-fade-in">
            <div className="p-5 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-800 text-sm">
                {editingProduct ? 'Ubah Informasi Produk' : 'Tambah Produk Inventaris'}
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Konfigurasikan HPP, harga jual, dan stok pengaman produk.</p>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Kode SKU / Barcode</label>
                  <input
                    type="text"
                    required
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold uppercase text-slate-700 outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Kategori Utama</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-hidden"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Nama Produk Lengkap</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Kopi Caramel Macchiato"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-hidden focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Biaya Modal (HPP)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={costPrice}
                    onChange={(e) => setCostPrice(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Harga Jual (Retail)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={price}
                    onChange={(e) => setPrice(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Stok Awal</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={stock}
                    onChange={(e) => setStock(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Batas Minimum (Alert)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={minStock}
                    onChange={(e) => setMinStock(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-hidden"
                  />
                </div>
              </div>

              {/* Product Image Section */}
              <div className="border-t border-slate-100 pt-3">
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Foto / Gambar Produk</label>
                <div className="flex gap-3 items-center">
                  {/* Photo Preview Container */}
                  <div className="w-16 h-16 rounded-xl border border-slate-200 outline-dashed outline-1 outline-slate-350 bg-slate-50 flex items-center justify-center shrink-0 overflow-hidden relative group">
                    {imageUrl ? (
                      <>
                        <img src={imageUrl} alt="preview" className="w-full h-full object-contain p-1 bg-white" />
                        <button
                          type="button"
                          onClick={() => {
                            setImageUrl('');
                            setUploadStatus('');
                          }}
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[9px] font-bold"
                        >
                          Hapus
                        </button>
                      </>
                    ) : (
                      <Upload className="text-slate-400" size={16} />
                    )}
                  </div>

                  {/* Upload Actions */}
                  <div className="flex-1 space-y-1.5">
                    <input
                      type="file"
                      id="product-image-file"
                      accept="image/*"
                      ref={productFileInputRef}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;

                        // Local preview converter (base64 compress)
                        const reader = new FileReader();
                        reader.onload = async (event) => {
                          const base64 = event.target?.result as string;
                          setImageUrl(base64);
                        };
                        reader.readAsDataURL(file);
                      }}
                      className="hidden"
                    />
                    
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => productFileInputRef.current?.click()}
                        className="p-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[10px] cursor-pointer transition-colors"
                      >
                        Pilih File
                      </button>

                      {/* Google Drive upload active button if sheet sync is enabled & we have a file selected */}
                      {imageUrl && !imageUrl.startsWith('https://drive.google.com') && syncConfig.googleSheetsUrl && (
                        <button
                          type="button"
                          disabled={isUploadingDrive}
                          onClick={async () => {
                            const fileInput = productFileInputRef.current;
                            const file = fileInput?.files?.[0];
                            if (!file) {
                              alert("Silakan pilih file gambar terlebih dahulu.");
                              return;
                            }
                            setIsUploadingDrive(true);
                            setUploadStatus("Mengunggah di Google Drive...");
                            
                            try {
                              const reader = new FileReader();
                              reader.onload = async (event) => {
                                const fullBase64 = event.target?.result as string;
                                const commaIdx = fullBase64.indexOf(',');
                                const rawBase64 = commaIdx !== -1 ? fullBase64.substring(commaIdx + 1) : fullBase64;
                                
                                const res = await uploadImageToGoogleDrive(
                                  syncConfig.googleSheetsUrl,
                                  file.name,
                                  file.type,
                                  rawBase64
                                );
                                
                                if (res.success && res.url) {
                                  setImageUrl(res.url);
                                  setUploadStatus("Berhasil tersimpan di Drive! ✨");
                                } else {
                                  alert(res.message);
                                  setUploadStatus("Gagal diunggah.");
                                }
                                setIsUploadingDrive(false);
                              };
                              reader.readAsDataURL(file);
                            } catch (e: any) {
                              alert("Gagal: " + e.message);
                              setIsUploadingDrive(false);
                            }
                          }}
                          className="p-1.5 px-3 bg-[#78c953]/10 hover:bg-[#78c953]/20 text-emerald-800 border border-[#78c953]/15 font-bold rounded-lg text-[10px] cursor-pointer transition-colors flex items-center gap-1 shrink-0"
                        >
                          <Sparkles size={11} className="text-[#78c953] animate-pulse" />
                          {isUploadingDrive ? "Mengunggah..." : "Unggah ke Google Drive"}
                        </button>
                      )}
                    </div>
                    
                    <p className="text-[9px] text-slate-400 font-medium">
                      {isUploadingDrive ? (
                        <span className="text-[#78c953] font-bold">{uploadStatus}</span>
                      ) : uploadStatus ? (
                        <span className="text-emerald-600 font-bold">{uploadStatus}</span>
                      ) : imageUrl && imageUrl.startsWith('data:image/') ? (
                        <span>Disimpan offline. Tekan tombol ungu untuk upload Google Drive!</span>
                      ) : imageUrl && imageUrl.startsWith('https://drive.google.com') ? (
                        <span className="text-emerald-600 font-bold font-mono">Terintegrasi Google Drive Cloud! ✅</span>
                      ) : (
                        <span>Format JPG/PNG. Maks 2MB.</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-emerald-50 text-emerald-800 text-[10px] font-medium rounded-lg">
                * Keuntungan per pcs: <strong>Rp {Math.max(0, price - costPrice).toLocaleString('id-ID')}</strong>. Batas minimum pengaman stok berguna agar notifikasi peringatan berbunyi otomatis.
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="p-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs cursor-pointer transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="p-2 px-5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg text-xs cursor-pointer transition-colors"
                >
                  {editingProduct ? 'Simpan' : 'Tambahkan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
