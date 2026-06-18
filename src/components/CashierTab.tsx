/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Search, ShoppingCart, Percent, Trash2, CreditCard, 
  ChevronRight, Sparkles, Check, AlertTriangle, Coffee, 
  Utensils, CupSoda, Cookie, ShieldCheck, X, RefreshCcw,
  Maximize2, Minimize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, Category, Transaction, TransactionItem, User, StoreSettings } from '../types';

interface CashierTabProps {
  products: Product[];
  categories: Category[];
  currentUser: User;
  onCheckoutSuccess: (tx: Transaction) => void;
  storeSettings: StoreSettings;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export default function CashierTab({
  products,
  categories,
  currentUser,
  onCheckoutSuccess,
  storeSettings,
  isFullscreen = false,
  onToggleFullscreen
}: CashierTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Shopping Cart items state
  const [cartItems, setCartItems] = useState<{ product: Product; qty: number; discount: number }[]>([]);
  
  // Discounts & Tax configurations
  const [couponDiscountPercent, setCouponDiscountPercent] = useState<number>(0);
  const [couponDiscountNominal, setCouponDiscountNominal] = useState<number>(0);
  
  // Checkout Modal States
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qris'>('cash');
  
  // Cash Payment field calculations
  const [cashAmount, setCashAmount] = useState<string>('');
  
  // QRIS Simulation
  const [qrisState, setQrisState] = useState<'waiting' | 'paid'>('waiting');

  // Format IDR Helper
  const formatIDR = (num: number) => {
    return 'Rp ' + num.toLocaleString('id-ID');
  };

  // Helper matching category icons
  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'Utensils': return <Utensils size={14} />;
      case 'Coffee': return <Coffee size={14} />;
      case 'CupSoda': return <CupSoda size={14} />;
      case 'Cookie': return <Cookie size={14} />;
      default: return <Utensils size={14} />;
    }
  };

  // Filter local POS catalog
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.sku.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = selectedCategory === 'all' || p.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [products, searchTerm, selectedCategory]);

  // Calculations
  const calculations = useMemo(() => {
    let subTotal = 0;
    
    // Total price of elements
    cartItems.forEach(item => {
      subTotal += (item.product.price - item.discount) * item.qty;
    });

    // Subtotal discounts
    let discountTotal = couponDiscountNominal;
    if (couponDiscountPercent > 0) {
      discountTotal += (subTotal * (couponDiscountPercent / 100));
    }

    const netSubtotal = Math.max(0, subTotal - discountTotal);
    const taxRate = storeSettings.isTaxEnabled ? (storeSettings.taxPercentage / 100) : 0;
    const taxTotal = Math.round(netSubtotal * taxRate);
    const total = netSubtotal + taxTotal;

    return {
      subTotal,
      discountTotal,
      taxTotal,
      total
    };
  }, [cartItems, couponDiscountPercent, couponDiscountNominal, storeSettings]);

  // Change amount for cash payments
  const changeAmount = useMemo(() => {
    const pay = parseFloat(cashAmount) || 0;
    return Math.max(0, pay - calculations.total);
  }, [cashAmount, calculations.total]);

  // Fast cash presets helper
  const CASH_PRESETS = [10000, 20000, 50000, 100000, 200000];

  // Cart operations
  const addToCart = (product: Product) => {
    if (product.stock === 0) {
      alert(`Stok untuk "${product.name}" kosong!`);
      return;
    }

    setCartItems(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      
      if (existing) {
        if (existing.qty >= product.stock) {
          alert(`Tidak dapat membeli melebihi stok yang tersedia (${product.stock} pcs).`);
          return prev;
        }
        return prev.map(item => 
          item.product.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      } else {
        return [...prev, { product, qty: 1, discount: 0 }];
      }
    });
  };

  const updateCartQty = (productId: string, val: number) => {
    setCartItems(prev => {
      return prev.map(item => {
        if (item.product.id === productId) {
          const newQty = Math.max(1, item.qty + val);
          if (newQty > item.product.stock) {
            alert(`Jumlah melebihi stok gudang (${item.product.stock} pcs)`);
            return item;
          }
          return { ...item, qty: newQty };
        }
        return item;
      });
    });
  };

  const removeFromCart = (productId: string) => {
    setCartItems(prev => prev.filter(item => item.product.id !== productId));
  };

  const clearCart = () => {
    setCartItems([]);
    setCouponDiscountPercent(0);
    setCouponDiscountNominal(0);
  };

  // Submit complete transaction
  const handleFinalPayment = () => {
    if (cartItems.length === 0) return;
    
    // Cash amount safety validation
    if (paymentMethod === 'cash') {
      const parsedPaid = parseFloat(cashAmount) || 0;
      if (parsedPaid < calculations.total) {
        alert("Nominal uang tunai pembayaran tidak mencukupi nilai Grand Total!");
        return;
      }
    }

    const itemsSold: TransactionItem[] = cartItems.map(item => ({
      productId: item.product.id,
      sku: item.product.sku,
      name: item.product.name,
      price: item.product.price,
      costPrice: item.product.costPrice,
      qty: item.qty,
      discount: item.discount,
      total: (item.product.price - item.discount) * item.qty
    }));

    const invoiceNumber = `INV/${new Date().toISOString().slice(0,10).replace(/-/g, '')}/${Math.floor(100 + Math.random() * 900)}`;

    const newTx: Transaction = {
      id: `tx-${Math.random().toString(36).substr(2, 9)}`,
      invoiceNumber,
      date: new Date().toISOString(),
      items: itemsSold,
      subTotal: calculations.subTotal,
      discountTotal: calculations.discountTotal,
      taxTotal: calculations.taxTotal,
      total: calculations.total,
      paymentMethod,
      cashAmount: paymentMethod === 'cash' ? (parseFloat(cashAmount) || calculations.total) : undefined,
      changeAmount: paymentMethod === 'cash' ? changeAmount : undefined,
      cashierId: currentUser.id,
      cashierName: currentUser.name
    };

    onCheckoutSuccess(newTx);
    clearCart();
    setIsCheckoutOpen(false);
    setCashAmount('');
    setQrisState('waiting');
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-stretch max-w-7xl mx-auto p-2 h-full min-h-[calc(100vh-160px)] animate-fade-in">
      
      {/* Product Catalog Pane: 2/3 Width */}
      <div className="flex-1 flex flex-col space-y-4">
        
        {/* Filters and search blocks */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3.5">
          <div className="flex gap-2.5 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Cari SKU atau nama produk di katalog kasir..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-hidden focus:bg-white transition-colors"
              />
            </div>
            
            {onToggleFullscreen && (
              <button
                onClick={onToggleFullscreen}
                className={`p-2 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isFullscreen 
                    ? 'bg-amber-600 text-white hover:bg-amber-700 shadow-sm' 
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                }`}
                title={isFullscreen ? "Keluar Layar Penuh" : "Aktifkan Layar Penuh"}
              >
                {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                <span className="hidden sm:inline font-sans">{isFullscreen ? "Layar Normal" : "Layar Penuh (F11)"}</span>
              </button>
            )}
          </div>

          {/* Horizonal categories selector */}
          <div className="flex gap-2 overflow-x-auto pb-1 shrink-0 select-none">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`p-1.5 px-4 text-xs font-semibold rounded-xl cursor-pointer transition-all flex items-center gap-1.5 whitespace-nowrap ${selectedCategory === 'all' ? 'bg-[#78c953] text-white shadow-xs' : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100'}`}
            >
              ⭐ Semua
            </button>
            {categories.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.name)}
                className={`p-1.5 px-4 text-xs font-semibold rounded-xl cursor-pointer transition-all flex items-center gap-1.5 whitespace-nowrap ${selectedCategory === c.name ? 'bg-[#78c953] text-white shadow-xs' : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100'}`}
              >
                {getCategoryIcon(c.icon)}
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Master POS Catalog product cards grid */}
        <div className={`grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto pr-1 transition-all duration-300 ${isFullscreen ? 'max-h-[calc(100vh-220px)] lg:max-h-[calc(100vh-170px)]' : 'max-h-[500px]'}`}>
          {filteredProducts.map(p => {
            const isOutOfStock = p.stock === 0;
            const isLowStock = p.stock > 0 && p.stock <= p.minStock;

            return (
              <div
                key={p.id}
                onClick={() => !isOutOfStock && addToCart(p)}
                className={`group bg-white rounded-2xl border transition-all duration-200 flex flex-col justify-between cursor-pointer text-left relative overflow-hidden ${isOutOfStock ? 'opacity-65 cursor-not-allowed border-slate-100 bg-slate-50' : 'border-slate-200 hover:border-slate-400 hover:shadow-xs active:scale-98'}`}
              >
                {/* Product Card Image Container */}
                <div className="h-28 bg-slate-50 relative border-b border-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name} referrerPolicy="no-referrer" className="w-full h-full object-contain p-2 bg-white group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="text-slate-300 flex flex-col items-center gap-1.5">
                      <Coffee size={24} className="opacity-40" />
                      <span className="text-[9px] font-mono lowercase tracking-wide font-medium">no image</span>
                    </div>
                  )}

                  {/* Out Of Stock overlay info badge */}
                  {isOutOfStock && (
                    <span className="absolute top-2 right-2 px-2 py-0.5 bg-red-150 text-red-700 font-bold text-[8px] rounded-full uppercase tracking-wider z-10">
                      Sold Out
                    </span>
                  )}

                  {/* Low Stock badge */}
                  {isLowStock && (
                    <span className="absolute top-2 right-2 px-2 py-0.5 bg-amber-100 text-amber-700 font-bold text-[8px] rounded-full flex items-center gap-0.5 z-10">
                      <AlertTriangle size={8} /> Restock
                    </span>
                  )}
                </div>

                <div className="p-3.5 flex-1 flex flex-col justify-between">
                  <div>
                    <span className="text-[9px] text-slate-400 font-mono tracking-wider">{p.sku}</span>
                    <h4 className="font-bold text-slate-800 text-xs mt-0.5 font-sans leading-snug group-hover:text-blue-650 transition-colors line-clamp-2">
                      {p.name}
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">{p.category}</p>
                  </div>

                  <div className="mt-3 flex justify-between items-center">
                    <span className="font-extrabold text-slate-800 text-xs">
                      {formatIDR(p.price)}
                    </span>
                    
                    {/* Stock helper counter tag */}
                    <span className={`text-[9px] font-bold ${isOutOfStock ? 'text-red-600' : isLowStock ? 'text-amber-600' : 'text-slate-400'}`}>
                      Stok: {p.stock}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredProducts.length === 0 && (
            <div className="col-span-full border-2 border-dashed border-slate-100 rounded-2xl py-14 text-center text-slate-400 text-xs">
              Tidak ada produk kasir yang cocok dengan pencarian Anda.
            </div>
          )}
        </div>
      </div>

      {/* Shopping Cart Sidebar Panel: 1/3 Width */}
      <div className="w-full lg:w-[350px] bg-white p-5 rounded-2xl border border-slate-200 flex flex-col justify-between shadow-xs h-full min-h-[500px]">
        
        {/* Cart items list section */}
        <div className="space-y-4 flex-1">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <ShoppingCart size={18} className="text-slate-800" />
              <h3 className="font-bold text-slate-800 text-sm">Keranjang Belanja</h3>
            </div>
            
            {cartItems.length > 0 && (
              <button
                onClick={clearCart}
                className="text-[10px] text-red-500 hover:text-red-700 font-semibold cursor-pointer transition-colors"
              >
                Hapus Semua
              </button>
            )}
          </div>

          <div className="overflow-y-auto max-h-[250px] pr-1">
            <AnimatePresence initial={false}>
              {cartItems.length > 0 ? (
                cartItems.map((item) => (
                  <motion.div
                    key={item.product.id}
                    layout
                    initial={{ opacity: 0, height: 0, scale: 0.9, y: 15 }}
                    animate={{ opacity: 1, height: "auto", scale: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0, scale: 0.9, y: -15, transition: { duration: 0.15 } }}
                    transition={{ type: "spring", stiffness: 450, damping: 30 }}
                    className="py-2.5 flex items-center justify-between text-xs gap-3 border-b border-slate-100 overflow-hidden"
                  >
                    <div className="flex-1">
                      <p className="font-semibold text-slate-800 leading-snug">{item.product.name}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{formatIDR(item.product.price)} / pcs</p>
                    </div>
                    
                    {/* Quantity and manipulation buttons */}
                    <div className="flex items-center gap-2">
                       <button
                        onClick={() => updateCartQty(item.product.id, -1)}
                        className="w-5 h-5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg cursor-pointer flex items-center justify-center transition-colors text-xs"
                      >
                        -
                      </button>
                      <span className="font-bold text-slate-800 min-w-4 text-center">{item.qty}</span>
                      <button
                        onClick={() => updateCartQty(item.product.id, 1)}
                        className="w-5 h-5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg cursor-pointer flex items-center justify-center transition-colors text-xs"
                      >
                        +
                      </button>

                      {/* Delete Item from cart */}
                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="p-1 text-slate-400 hover:text-red-500 rounded-lg cursor-pointer transition-colors ml-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </motion.div>
                ))
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-14 text-slate-400 text-xs text-center"
                >
                  <ShoppingCart className="text-slate-300 mb-2" size={32} />
                  <p>Keranjang belanja kosong.</p>
                  <p className="text-[10px] text-slate-400 mt-1">Tap produk pada katalog untuk ditambahkan.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Calculations and coupon section */}
        <div className="border-t border-slate-100 pt-4 mt-4 space-y-4">
          
          {/* Coupon discount input toggle */}
          {cartItems.length > 0 && (
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
                <Percent size={12} className="text-blue-500" /> Diskon Potongan Nota
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1 p-1 px-2 border border-slate-200 rounded-lg bg-slate-50">
                  <span className="text-[10px] text-slate-400 font-bold">%</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="0"
                    value={couponDiscountPercent || ''}
                    onChange={(e) => setCouponDiscountPercent(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                    className="w-full bg-transparent font-semibold text-slate-800 focus:outline-hidden text-right"
                  />
                </div>
                <div className="flex items-center gap-1 p-1 px-2 border border-slate-200 rounded-lg bg-slate-50">
                  <span className="text-[10px] text-slate-400 font-bold">Rp</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={couponDiscountNominal || ''}
                    onChange={(e) => setCouponDiscountNominal(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-transparent font-semibold text-slate-800 focus:outline-hidden text-right"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Pricing calculations metrics list */}
          <div className="space-y-1.5 text-xs font-semibold text-slate-600">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="text-slate-800">{formatIDR(calculations.subTotal)}</span>
            </div>
            {calculations.discountTotal > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Total Diskon:</span>
                <span>-{formatIDR(calculations.discountTotal)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Pajak PPN (11%):</span>
              <span className="text-slate-800">{formatIDR(calculations.taxTotal)}</span>
            </div>
            <div className="flex justify-between text-sm font-black border-t border-slate-100 pt-2 grid-cols-2 text-slate-800">
              <span>GRAND TOTAL:</span>
              <span className="text-blue-600 text-lg">{formatIDR(calculations.total)}</span>
            </div>
          </div>

          <button
            onClick={() => cartItems.length > 0 && setIsCheckoutOpen(true)}
            disabled={cartItems.length === 0}
            className="w-full p-3 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-200 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed shadow-xs transition-colors"
          >
            <CreditCard size={16} />
            Metode Pembayaran & Bayar
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Global checkout drawer modal */}
        {isCheckoutOpen && (
          <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 select-none">
            <div 
              id="checkout-payment-modal"
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col md:flex-row border border-slate-100 animate-fade-in"
            >
              
              {/* Left Column: Choose Payment Options */}
              <div className="p-5 border-b md:border-b-0 md:border-r border-slate-100 bg-slate-50 w-full md:w-[190px]">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider text-slate-400 mb-4">Pilih Metode Bayar</h4>
                
                <div className="space-y-2">
                  <button
                    onClick={() => { setPaymentMethod('cash'); setCashAmount(''); }}
                    className={`w-full p-2.5 rounded-xl text-xs font-bold transition-all text-left flex items-center justify-between cursor-pointer ${paymentMethod === 'cash' ? 'bg-slate-800 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'}`}
                  >
                    <span>💵 Uang Tunai</span>
                    {paymentMethod === 'cash' && <Check size={12} />}
                  </button>

                  <button
                    onClick={() => { setPaymentMethod('qris'); setQrisState('waiting'); }}
                    className={`w-full p-2.5 rounded-xl text-xs font-bold transition-all text-left flex items-center justify-between cursor-pointer ${paymentMethod === 'qris' ? 'bg-slate-800 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'}`}
                  >
                    <span>📊 QRIS Dinamis</span>
                    {paymentMethod === 'qris' && <Check size={12} />}
                  </button>
                </div>
              </div>

              {/* Right Column: Checkout interactive dashboard */}
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
                    <span className="font-bold text-slate-800 text-xs">Total Pembayaran</span>
                    <span className="font-black text-slate-800 text-base text-blue-600">{formatIDR(calculations.total)}</span>
                  </div>

                  {/* Cash Payment Mode details */}
                  {paymentMethod === 'cash' && (
                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Nominal Uang Diterima</label>
                        <div className="flex items-center gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl">
                          <span className="text-xs font-bold text-slate-400">IDR</span>
                          <input
                            type="number"
                            required
                            placeholder="Ketik jumlah uang..."
                            value={cashAmount}
                            onChange={(e) => setCashAmount(e.target.value)}
                            className="bg-transparent w-full text-xs font-bold text-slate-800 focus:outline-hidden"
                          />
                        </div>
                      </div>

                      {/* Cash presets pills */}
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-400 font-semibold block">Uang Pas & Preset Cepat:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {/* Exact Cash button */}
                          <button
                            onClick={() => setCashAmount(calculations.total.toString())}
                            className="p-1 px-2.5 bg-[#78c953]/15 hover:bg-[#78c953]/25 text-emerald-800 text-[10px] rounded-lg font-bold border border-[#78c953]/20 transition-colors cursor-pointer"
                          >
                            Tepat Pas
                          </button>
                          {CASH_PRESETS.map((val) => {
                            if (val >= calculations.total) {
                              return (
                                <button
                                  key={val}
                                  onClick={() => setCashAmount(val.toString())}
                                  className="p-1 px-2.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 text-[10px] rounded-lg font-semibold transition-colors cursor-pointer"
                                >
                                  {val.toLocaleString('id-ID')}
                                </button>
                              );
                            }
                            return null;
                          })}
                        </div>
                      </div>

                      {/* Change calculation */}
                      <div className="p-3 bg-slate-50/50 border border-slate-100 rounded-xl space-y-1">
                        <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                          <span>Kembalian:</span>
                        </div>
                        <p className="text-base font-extrabold text-slate-800">
                          {formatIDR(changeAmount)}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* QRIS mode screen */}
                  {paymentMethod === 'qris' && (
                    <div className="flex flex-col items-center justify-center p-3 border border-slate-100 bg-slate-50 rounded-xl space-y-3.5">
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200 relative flex flex-col items-center justify-center shadow-inner">
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=qris://mitra-mandiri-kasir?amount=${calculations.total}`} 
                          alt="Dynamic QRIS Code" 
                          className="w-[110px] h-[110px] border border-slate-100"
                        />
                        <div className="text-[8px] tracking-wide text-slate-400 mt-2 font-mono uppercase font-bold text-center">
                          DYNAMIC QRIS SCANNER | EXPIRED IN 5:00
                        </div>
                      </div>

                      {/* Simulate Payment status buttons */}
                      {qrisState === 'waiting' ? (
                        <div className="text-center w-full space-y-2">
                          <p className="text-[10px] text-slate-500 italic block">Menunggu pelanggan memindai...</p>
                          <button
                            onClick={() => setQrisState('paid')}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white p-1 px-4 text-[10px] rounded-lg font-bold cursor-pointer transition-colors w-full"
                          >
                            Simulasikan Bayar Sukses !
                          </button>
                        </div>
                      ) : (
                        <div className="text-center text-emerald-700 font-medium text-xs flex items-center justify-center gap-1">
                          <ShieldCheck size={16} />
                          <span>Dana QRIS Diterima! Nota siap dicetak.</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 border-t border-slate-100 pt-4 mt-6">
                  {/* Close payment button */}
                  <button
                    onClick={() => { setIsCheckoutOpen(false); setQrisState('waiting'); }}
                    className="p-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                  >
                    Batal
                  </button>

                  {/* Confirm payoff checkout button */}
                  <button
                    onClick={handleFinalPayment}
                    disabled={paymentMethod === 'qris' && qrisState === 'waiting'}
                    className="flex-1 p-2.5 bg-[#78c953] hover:bg-[#68b544] disabled:bg-slate-300 text-white font-bold rounded-xl text-xs cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-emerald-100 transition-all"
                  >
                    <ShieldCheck size={14} />
                    Konfirmasi Bayar Selesai
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
