/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Store, MapPin, Phone, Percent, ShieldAlert, CheckCircle, Save, Smartphone, Monitor, Download } from 'lucide-react';
import { StoreSettings } from '../types';

interface SettingsTabProps {
  settings: StoreSettings;
  onSaveSettings: (newSettings: StoreSettings) => void;
}

export default function SettingsTab({ settings, onSaveSettings }: SettingsTabProps) {
  const [name, setName] = useState(settings.name);
  const [address, setAddress] = useState(settings.address);
  const [phone, setPhone] = useState(settings.phone);
  const [isTaxEnabled, setIsTaxEnabled] = useState(settings.isTaxEnabled);
  const [taxPercentage, setTaxPercentage] = useState(settings.taxPercentage);
  const [isSaved, setIsSaved] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if prompt is already stored globally
    if ((window as any).deferredPrompt) {
      setInstallPrompt((window as any).deferredPrompt);
    }

    const handlePrompt = () => {
      setInstallPrompt((window as any).deferredPrompt);
    };

    const handleInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener('pwa-prompt-available', handlePrompt);
    window.addEventListener('pwa-installed', handleInstalled);

    // Also check standard window.matchMedia if running standalone
    if (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('pwa-prompt-available', handlePrompt);
      window.removeEventListener('pwa-installed', handleInstalled);
    };
  }, []);

  const handleInstallApp = async () => {
    const promptEvent = installPrompt || (window as any).deferredPrompt;
    if (!promptEvent) return;
    
    // Show the install prompt
    promptEvent.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await promptEvent.userChoice;
    console.log(`User response to install prompt: ${outcome}`);
    
    // Clear deferredPrompt since it can only be used once
    (window as any).deferredPrompt = null;
    setInstallPrompt(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings({
      name,
      address,
      phone,
      isTaxEnabled,
      taxPercentage
    });
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
    }, 3000);
  };

  return (
    <div className="max-w-xl mx-auto bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6 animate-fade-in">
      <div>
        <h2 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
          <Store className="text-[#78c953]" size={20} />
          Pengaturan Toko & POS
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Ubah nama toko, alamat operasional, nomor telepon, dan status pajak PPN. Perubahan akan langsung berdampak pada tampilan struk belanja thermal.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Store Profile Section */}
        <div className="space-y-4">
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Nama Toko (Header Struk)</label>
            <div className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus-within:bg-white focus-within:border-[#78c953] transition-all">
              <Store className="text-slate-400" size={16} />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: TOKO MITRA MANDIRI"
                className="w-full bg-transparent text-xs font-bold text-slate-700 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Alamat Operasional</label>
            <div className="flex items-start gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus-within:bg-white focus-within:border-[#78c953] transition-all">
              <MapPin className="text-slate-400 mt-0.5" size={16} />
              <textarea
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Contoh: Jl. Sudirman No. 45, Jakarta"
                rows={2}
                className="w-full bg-transparent text-xs font-medium text-slate-700 focus:outline-none resize-none"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Nomor Telepon Kontak</label>
            <div className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus-within:bg-white focus-within:border-[#78c953] transition-all">
              <Phone className="text-slate-400" size={16} />
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Contoh: 0812-3456-7890"
                className="w-full bg-transparent text-xs font-semibold text-slate-700 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* PPN Tax Settings Section */}
        <div className="border-t border-slate-100 pt-5 space-y-4">
          <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex gap-2 items-center">
              <div className="p-2 bg-[#78c953]/10 text-[#78c953] rounded-lg shrink-0">
                <Percent size={16} />
              </div>
              <div>
                <span className="font-bold text-slate-700 text-xs block">Aktifkan Pajak PPN</span>
                <span className="text-[10px] text-slate-400">Pajak PPN 11% akan ditambahkan otomatis di akhir checkout</span>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isTaxEnabled}
                onChange={(e) => setIsTaxEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#78c953]"></div>
            </label>
          </div>

          {isTaxEnabled ? (
            <div className="space-y-4">
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-2.5">
                <ShieldAlert className="text-[#78c953] mt-0.5 shrink-0" size={15} />
                <p className="text-[10px] text-emerald-800 leading-normal">
                  Sistem saat ini menerapkan Pajak PPN sebesar <strong>{taxPercentage}%</strong> pada setiap penjualan. Nilai PPN dihitung dari Net Subtotal (total belanja dikurangi diskon potongan modal). Anda dapat mengubah persentase ini secara dinamis di bawah.
                </p>
              </div>
              
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Persentase Pajak PPN (%)</label>
                <div className="flex items-center gap-1.5 p-2 px-3 bg-white border border-slate-200 focus-within:border-[#78c953] focus-within:ring-1 focus-within:ring-[#78c953] rounded-lg max-w-[140px] transition-all">
                  <Percent size={14} className="text-slate-400" />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={taxPercentage}
                    onChange={(e) => setTaxPercentage(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                    className="w-full bg-transparent font-bold text-xs text-slate-800 focus:outline-none text-right"
                  />
                  <span className="text-[10px] font-bold text-slate-400">%</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-amber-50 border border-amber-150 rounded-xl flex items-start gap-2.5">
              <ShieldAlert className="text-amber-600 mt-0.5 shrink-0" size={15} />
              <p className="text-[10px] text-amber-850 leading-normal">
                Pajak PPN <strong>dinonaktifkan (dihapus)</strong>. Jumlah PPN di kasir dan struk thermal akan selalu bernilai Rp 0.
              </p>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="flex gap-2 pt-4 border-t border-slate-100 justify-end">
          {isSaved && (
            <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-bold mr-2">
              <CheckCircle size={16} />
              Pengaturan disimpan !
            </div>
          )}

          <button
            type="submit"
            className="p-2.5 px-6 bg-[#78c953] hover:bg-[#68b544] text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-emerald-100"
          >
            <Save size={14} />
            Simpan Pengaturan
          </button>
        </div>
      </form>

      {/* PWA Settings & Installation Guide */}
      <div className="border-t border-slate-100 pt-6 mt-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="text-[#78c953]" size={18} />
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Aplikasi Seluler POS (PWA)</h3>
          </div>
          <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase border ${
            isInstalled 
              ? "bg-emerald-50 text-[#78c953] border-emerald-100" 
              : "bg-amber-50 text-amber-700 border-amber-100"
          }`}>
            {isInstalled ? "Aktif (Standalone)" : "Dapat Diinstal"}
          </span>
        </div>

        <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl flex flex-col sm:flex-row gap-4 items-center">
          <div className="w-16 h-16 rounded-2xl bg-[#78c953] shadow-md p-1 shrink-0 relative overflow-hidden flex items-center justify-center">
            <img 
              src="/icon.jpg" 
              alt="PWA Icon" 
              className="w-full h-full object-cover rounded-[12px]"
              referrerPolicy="no-referrer"
              onError={(e) => {
                // fallback icon if icon.jpg fails in testing environments
                (e.target as HTMLImageElement).src = "https://picsum.photos/seed/kopi/120/120";
              }}
            />
          </div>
          
          <div className="flex-1 text-center sm:text-left">
            <h4 className="text-xs font-bold text-slate-800">Kasir Pintar Pro - PWA Edition</h4>
            <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
              Nikmati kenyamanan sistem kasir langsung dari layar utama smartphone atau laptop Anda demi efisiensi operasional yang maksimal, responsif penuh, serta hemat ruang penyimpanan internal.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[10px]">
          {/* Android / Desktop Install Block */}
          <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 font-bold text-slate-700">
                <Monitor size={12} className="text-[#78c953]" />
                <span>Untuk Android & Komputer</span>
              </div>
              <p className="text-slate-400 text-[9px] mt-0.5">
                Silahkan tekan tombol di bawah ini atau cari simbol panah instalasi di ujung kanan bilah pencarian Google Chrome Anda.
              </p>
            </div>
            
            <div className="pt-2">
              {installPrompt ? (
                <button
                  type="button"
                  onClick={handleInstallApp}
                  className="w-full p-2 bg-[#78c953] hover:bg-[#68b544] text-white font-extrabold rounded-lg text-[10px] flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                >
                  <Download size={11} />
                  Pasang Aplikasi Sekarang
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  className="w-full p-2 bg-slate-100 text-slate-400 font-bold rounded-lg text-[10px] flex items-center justify-center gap-1.5 cursor-not-allowed border border-slate-200"
                >
                  <CheckCircle size={10} />
                  Sudah Terpasang / Siap
                </button>
              )}
            </div>
          </div>

          {/* iOS / Safari Manual Block */}
          <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 font-bold text-slate-700">
                <Smartphone size={12} className="text-blue-500" />
                <span>Instalasi iPhone / Safari</span>
              </div>
              <p className="text-slate-400 text-[9px] mt-0.5 leading-normal">
                Buka web ini via browser Safari iPad/iPhone, tekan tombol <strong className="text-slate-700 font-bold">Share (Bagikan)</strong> di bawah layar, lalu ketuk pilihan <strong className="text-slate-700 font-bold">Add to Home Screen (Tambahkan Utama)</strong>.
              </p>
            </div>
            <div className="text-[8.5px] font-bold text-slate-500 bg-slate-50 p-1.5 rounded-md text-center border border-slate-150">
              Ikon Hijau Akan Eksklusif Tampil di Layar HP
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
