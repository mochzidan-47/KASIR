/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Product, Transaction, Category } from '../types';

/**
 * Service to sync data with Google Sheets via a Google Apps Script web app
 */
export const syncToGoogleSheets = async (
  webAppUrl: string,
  data: {
    products: Product[];
    categories: Category[];
    transactions: Transaction[];
  }
): Promise<{ success: boolean; message: string }> => {
  if (!webAppUrl || !webAppUrl.startsWith('https://script.google.com')) {
    return {
      success: false,
      message: 'URL Google Apps Script tidak valid. Silakan periksa kembali di Pengaturan.',
    };
  }

  try {
    // Send full data payload as POST to the Apps Script Web App URL
    const response = await fetch(webAppUrl, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8', // Apps Script handles text/plain best to circumvent CORS preflight
      },
      body: JSON.stringify({
        action: 'sync_all',
        payload: data,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const result = await response.json();
    if (result.success) {
      return {
        success: true,
        message: result.message || 'Data berhasil disinkronisasi ke Google Sheets!',
      };
    } else {
      return {
        success: false,
        message: result.error || 'Sinkronisasi gagal diproses oleh Apps Script.',
      };
    }
  } catch (error: any) {
    console.error('Apps Script Sync Error:', error);
    // Standard fetch can fail CORS on redirect even if write succeeds
    // We add a friendly message of success with redirection hint since GET/POST usually fires under the hood anyway
    return {
      success: false,
      message: `Gagal terhubung ke Google Sheets: ${error.message || error}. Pastikan Web App diset ke "Anyone" (Siapa saja) saat deploy.`,
    };
  }
};

/**
 * Service to upload an image to Google Drive via the Apps Script Web App
 */
export const uploadImageToGoogleDrive = async (
  webAppUrl: string,
  fileName: string,
  mimeType: string,
  base64Data: string
): Promise<{ success: boolean; url?: string; message: string }> => {
  if (!webAppUrl || !webAppUrl.startsWith('https://script.google.com')) {
    return {
      success: false,
      message: 'Koneksi Google Sheets & Drive belum didukung. Masukkan URL Apps Script di pengaturan.',
    };
  }

  try {
    const response = await fetch(webAppUrl, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        action: 'upload_image',
        payload: {
          fileName,
          mimeType,
          base64Data,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const result = await response.json();
    if (result.success) {
      return {
        success: true,
        url: result.url,
        message: result.message || 'Gambar sukses disimpan ke Google Drive!',
      };
    } else {
      return {
        success: false,
        message: result.error || 'Gagal menyimpan gambar di Google Drive.',
      };
    }
  } catch (error: any) {
    console.error('Apps Script Upload Error:', error);
    return {
      success: false,
      message: `Gagal upload gambar ke Google Drive: ${error.message || error}`,
    };
  }
};

/**
 * Service to automatically create and format all required sheets in Google Sheets Spreadsheet
 */
export const initializeGoogleSheets = async (webAppUrl: string): Promise<{ success: boolean; message: string }> => {
  if (!webAppUrl || !webAppUrl.startsWith('https://script.google.com')) {
    return {
      success: false,
      message: 'Koneksi Google Sheets belum didukung. Masukkan URL Apps Script di pengaturan.',
    };
  }

  try {
    const response = await fetch(webAppUrl, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        action: 'init_sheets',
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const result = await response.json();
    if (result.success) {
      return {
        success: true,
        message: result.message || 'Semua sheets otomatis berhasil dibuat dangan format header yang benar!',
      };
    } else {
      return {
        success: false,
        message: result.error || 'Gagal menginisialisasi spreadsheet.',
      };
    }
  } catch (error: any) {
    console.error('Initialize Sheets Error:', error);
    return {
      success: false,
      message: `Gagal membuat sheets otomatis secara langsung: ${error.message || error}. Pastikan Web App diset ke "Anyone" (Siapa saja) saat deploy.`,
    };
  }
};

/**
 * Apps Script Code content that the user can copy
 */
export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * GOOGLE APPS SCRIPT - KASIR PINTAR PRO SYNC ENGINE
 * 
 * Petunjuk Instalasi:
 * 1. Buka Google Sheets (Buat Spreadsheet baru).
 * 2. Klik menu "Ekstensi" -> "Apps Script".
 * 3. Hapus kode bawaan, lalu paste kode di bawah ini.
 * 4. Klik ikon Save (Disket/Simpan).
 * 5. Klik tombol "Terapkan" (Deploy) -> "Penerapan Baru" (New Deployment).
 * 6. Pilih Jenis: "Aplikasi Web" (Web App).
 * 7. Konfigurasi:
 *    - Deskripsi: Kasir Sync
 *    - Jalankan sebagai: Saya (Email Anda)
 *    - Siapa yang memiliki akses: Siapa saja (Anyone) -> SANGAT PENTING!
 * 8. Klik "Terapkan" (Deploy). Berikan izin akses Google jika diminta.
 * 9. Salin URL Aplikasi Web yang diberikan, tempel di menu Pengaturan Kasir Pintar Pro Anda!
 */

function doPost(e) {
  try {
    var jsonString = e.postData.contents;
    var data = JSON.parse(jsonString);
    var action = data.action;
    var payload = data.payload;
    
    if (action === 'sync_all') {
      return ContentService.createTextOutput(JSON.stringify(syncAllData(payload)))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === 'upload_image') {
      return ContentService.createTextOutput(JSON.stringify(uploadImage(payload)))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'init_sheets') {
      return ContentService.createTextOutput(JSON.stringify(initAllSheets()))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Aksi tidak dikenal' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService.createTextOutput("Koneksi Kasir Pintar Pro - Google Sheets & Drive Aktif! Gunakan POST untuk kirim data.")
    .setMimeType(ContentService.MimeType.TEXT);
}

function initAllSheets() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 1. CREATE SHEET_PRODUK
    var sheetProducts = ss.getSheetByName("Sheet_Produk");
    if (!sheetProducts) {
      sheetProducts = ss.insertSheet("Sheet_Produk");
    }
    sheetProducts.clear();
    sheetProducts.appendRow(["ID Produk", "SKU", "Nama Produk", "Kategori", "Harga Jual", "Harga Modal", "Stok", "Stok Minimum"]);
    sheetProducts.getRange("A1:H1").setBackground("#d9ead3").setFontWeight("bold");
    
    // 2. CREATE SHEET_KATEGORI
    var sheetCategories = ss.getSheetByName("Sheet_Kategori");
    if (!sheetCategories) {
      sheetCategories = ss.insertSheet("Sheet_Kategori");
    }
    sheetCategories.clear();
    sheetCategories.appendRow(["ID Kategori", "Nama Kategori", "Ikon"]);
    sheetCategories.getRange("A1:C1").setBackground("#fce5cd").setFontWeight("bold");
    
    // 3. CREATE SHEET_TRANSAKSI
    var sheetSales = ss.getSheetByName("Sheet_Transaksi");
    if (!sheetSales) {
      sheetSales = ss.insertSheet("Sheet_Transaksi");
    }
    sheetSales.clear();
    sheetSales.appendRow(["ID Transaksi", "No Invoice", "Tanggal", "Item Terjual", "Subtotal", "Diskon", "Pajak", "Total Selesai", "Metode Pembayaran", "Nama Kasir", "Total Profit Bersih"]);
    sheetSales.getRange("A1:K1").setBackground("#cfe2f3").setFontWeight("bold");
    
    // Autoresize and format
    try {
      sheetProducts.autoResizeColumns(1, 8);
      sheetCategories.autoResizeColumns(1, 3);
      sheetSales.autoResizeColumns(1, 11);
    } catch(e) {}
    
    // Clean up default starter sheets
    var defaultSheet = ss.getSheetByName("Sheet1") || ss.getSheetByName("Sheet 1");
    if (defaultSheet && ss.getSheets().length > 3) {
      ss.deleteSheet(defaultSheet);
    }
    
    return {
      success: true,
      message: "Sukses! Seluruh lembar 'Sheet_Produk', 'Sheet_Kategori', dan 'Sheet_Transaksi' berhasil dibuat otomatis di Spreadsheet Anda dengan header baris yang rapi!"
    };
  } catch (err) {
    return {
      success: false,
      error: "Gagal memproses inisialisasi sheets: " + err.toString()
    };
  }
}

function uploadImage(payload) {
  try {
    var folderName = "Kasir_Pintar_Pro_Images";
    var folders = DriveApp.getFoldersByName(folderName);
    var folder;
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder(folderName);
    }
    
    var decodedData = Utilities.base64Decode(payload.base64Data);
    var blob = Utilities.newBlob(decodedData, payload.mimeType, payload.fileName);
    var file = folder.createFile(blob);
    
    file.setSharing(DriveApp.Access.ANYONE, DriveApp.Permission.VIEW);
    var fileId = file.getId();
    var fileUrl = "https://drive.google.com/uc?export=view&id=" + fileId;
    
    return {
      success: true,
      url: fileUrl,
      message: "Gambar berhasil diunggah ke Google Drive!"
    };
  } catch (err) {
    return {
      success: false,
      error: "Gagal menyimpan file ke Google Drive: " + err.toString()
    };
  }
}

function syncAllData(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. SINKRONISASI PRODUK
  var sheetProducts = ss.getSheetByName("Sheet_Produk") || ss.insertSheet("Sheet_Produk");
  sheetProducts.clear();
  sheetProducts.appendRow(["ID Produk", "SKU", "Nama Produk", "Kategori", "Harga Jual", "Harga Modal", "Stok", "Stok Minimum"]);
  if (payload.products && payload.products.length > 0) {
    var prodRows = payload.products.map(function(p) {
      return [p.id, p.sku, p.name, p.category, p.price, p.costPrice, p.stock, p.minStock];
    });
    sheetProducts.getRange(2, 1, prodRows.length, 8).setValues(prodRows);
  }
  
  // 2. SINKRONISASI KATEGORI
  var sheetCategories = ss.getSheetByName("Sheet_Kategori") || ss.insertSheet("Sheet_Kategori");
  sheetCategories.clear();
  sheetCategories.appendRow(["ID Kategori", "Nama Kategori", "Ikon"]);
  if (payload.categories && payload.categories.length > 0) {
    var catRows = payload.categories.map(function(c) {
      return [c.id, c.name, c.icon];
    });
    sheetCategories.getRange(2, 1, catRows.length, 3).setValues(catRows);
  }
  
  // 3. SINKRONISASI TRANSAKSI / LAPORAN PENJUALAN
  var sheetSales = ss.getSheetByName("Sheet_Transaksi") || ss.insertSheet("Sheet_Transaksi");
  sheetSales.clear();
  sheetSales.appendRow(["ID Transaksi", "No Invoice", "Tanggal", "Item Terjual", "Subtotal", "Diskon", "Pajak (11%)", "Total Selesai", "Metode Pembayaran", "Nama Kasir", "Total Profit Bersih"]);
  
  if (payload.transactions && payload.transactions.length > 0) {
    var salesRows = payload.transactions.map(function(t) {
      // Create detailed string for items sold
      var itemListStr = t.items.map(function(item) {
        return item.name + " (" + item.qty + "x @ Rp " + item.price + " - Disk: Rp" + item.discount + ")";
      }).join("\\n");
      
      // Calculate net profit for transaction
      var netProfit = t.items.reduce(function(acc, item) {
        var baseProfit = (item.price - item.costPrice) * item.qty;
        var finalProfit = baseProfit - (item.discount * item.qty);
        return acc + finalProfit;
      }, 0);
      
      return [
        t.id,
        t.invoiceNumber,
        t.date,
        itemListStr,
        t.subTotal,
        t.discountTotal,
        t.taxTotal,
        t.total,
        t.paymentMethod.toUpperCase(),
        t.cashierName,
        netProfit
      ];
    });
    sheetSales.getRange(2, 1, salesRows.length, 11).setValues(salesRows);
  }
  
  // Auto-fit columns
  try {
    sheetProducts.autoResizeColumns(1, 8);
    sheetCategories.autoResizeColumns(1, 3);
    sheetSales.autoResizeColumns(1, 11);
  } catch(e) {}
  
  return {
    success: true,
    message: "Sheets berhasil diperbarui! " + payload.products.length + " produk, " + payload.transactions.length + " transaksi telah disinkronkan."
  };
}
`;
