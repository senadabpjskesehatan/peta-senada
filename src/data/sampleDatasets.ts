import { DatasetPreset, ChartConfig, ColumnDef, SheetRow } from '../types';

export const SALES_DATASET: DatasetPreset = {
  id: 'sales_ecommerce',
  title: 'Penjualan & E-Commerce',
  description: 'Laporan transaksi penjualan harian, performa produk, dan metrik pendapatan.',
  icon: 'TrendingUp',
  columns: [
    { key: 'Tanggal', label: 'Tanggal', type: 'date' },
    { key: 'ID_Pesanan', label: 'ID Pesanan', type: 'string' },
    { key: 'Produk', label: 'Nama Produk', type: 'string' },
    { key: 'Kategori', label: 'Kategori', type: 'string' },
    { key: 'Wilayah', label: 'Kota / Wilayah', type: 'string' },
    { key: 'Jumlah', label: 'Jumlah Unit', type: 'number', isNumeric: true },
    { key: 'Harga_Satuan', label: 'Harga Satuan (Rp)', type: 'number', isNumeric: true },
    { key: 'Total_Pendapatan', label: 'Total Pendapatan (Rp)', type: 'number', isNumeric: true },
    { key: 'Status', label: 'Status Pengiriman', type: 'string' },
    { key: 'Rating', label: 'Rating Kepuasan', type: 'number', isNumeric: true }
  ],
  rows: [
    { _id: 'row-1', Tanggal: '2025-01-05', ID_Pesanan: 'ORD-1001', Produk: 'MacBook Air M2', Kategori: 'Elektronik', Wilayah: 'Jakarta', Jumlah: 3, Harga_Satuan: 16500000, Total_Pendapatan: 49500000, Status: 'Selesai', Rating: 4.9 },
    { _id: 'row-2', Tanggal: '2025-01-08', ID_Pesanan: 'ORD-1002', Produk: 'Ergonomic Chair Pro', Kategori: 'Perabot Kantor', Wilayah: 'Surabaya', Jumlah: 5, Harga_Satuan: 2800000, Total_Pendapatan: 14000000, Status: 'Selesai', Rating: 4.8 },
    { _id: 'row-3', Tanggal: '2025-01-12', ID_Pesanan: 'ORD-1003', Produk: 'Wireless Mechanical Keyboard', Kategori: 'Aksesoris', Wilayah: 'Bandung', Jumlah: 12, Harga_Satuan: 950000, Total_Pendapatan: 11400000, Status: 'Selesai', Rating: 4.7 },
    { _id: 'row-4', Tanggal: '2025-01-15', ID_Pesanan: 'ORD-1004', Produk: 'UltraWide Monitor 34"', Kategori: 'Elektronik', Wilayah: 'Jakarta', Jumlah: 4, Harga_Satuan: 6800000, Total_Pendapatan: 27200000, Status: 'Dalam Proses', Rating: 4.6 },
    { _id: 'row-5', Tanggal: '2025-01-19', ID_Pesanan: 'ORD-1005', Produk: 'Standing Desk Dual Motor', Kategori: 'Perabot Kantor', Wilayah: 'Yogyakarta', Jumlah: 2, Harga_Satuan: 5400000, Total_Pendapatan: 10800000, Status: 'Selesai', Rating: 5.0 },
    { _id: 'row-6', Tanggal: '2025-01-22', ID_Pesanan: 'ORD-1006', Produk: 'Noise Cancelling Headphones', Kategori: 'Elektronik', Wilayah: 'Medan', Jumlah: 8, Harga_Satuan: 3200000, Total_Pendapatan: 25600000, Status: 'Selesai', Rating: 4.9 },
    { _id: 'row-7', Tanggal: '2025-01-26', ID_Pesanan: 'ORD-1007', Produk: 'USB-C Multiport Dock', Kategori: 'Aksesoris', Wilayah: 'Semarang', Jumlah: 20, Harga_Satuan: 450000, Total_Pendapatan: 9000000, Status: 'Pending', Rating: 4.5 },
    { _id: 'row-8', Tanggal: '2025-02-02', ID_Pesanan: 'ORD-1008', Produk: 'MacBook Air M2', Kategori: 'Elektronik', Wilayah: 'Surabaya', Jumlah: 2, Harga_Satuan: 16500000, Total_Pendapatan: 33000000, Status: 'Selesai', Rating: 5.0 },
    { _id: 'row-9', Tanggal: '2025-02-05', ID_Pesanan: 'ORD-1009', Produk: 'Webcam 4K Ultra HD', Kategori: 'Aksesoris', Wilayah: 'Jakarta', Jumlah: 15, Harga_Satuan: 1200000, Total_Pendapatan: 18000000, Status: 'Selesai', Rating: 4.8 },
    { _id: 'row-10', Tanggal: '2025-02-10', ID_Pesanan: 'ORD-1010', Produk: 'Ergonomic Chair Pro', Kategori: 'Perabot Kantor', Wilayah: 'Bali', Jumlah: 4, Harga_Satuan: 2800000, Total_Pendapatan: 11200000, Status: 'Dalam Proses', Rating: 4.7 },
    { _id: 'row-11', Tanggal: '2025-02-14', ID_Pesanan: 'ORD-1011', Produk: 'Smart Air Purifier HEPA', Kategori: 'Elektronik', Wilayah: 'Jakarta', Jumlah: 6, Harga_Satuan: 2400000, Total_Pendapatan: 14400000, Status: 'Selesai', Rating: 4.9 },
    { _id: 'row-12', Tanggal: '2025-02-18', ID_Pesanan: 'ORD-1012', Produk: 'Wireless Mechanical Keyboard', Kategori: 'Aksesoris', Wilayah: 'Bandung', Jumlah: 10, Harga_Satuan: 950000, Total_Pendapatan: 9500000, Status: 'Selesai', Rating: 4.6 },
    { _id: 'row-13', Tanggal: '2025-02-23', ID_Pesanan: 'ORD-1013', Produk: 'UltraWide Monitor 34"', Kategori: 'Elektronik', Wilayah: 'Surabaya', Jumlah: 3, Harga_Satuan: 6800000, Total_Pendapatan: 20400000, Status: 'Selesai', Rating: 4.8 },
    { _id: 'row-14', Tanggal: '2025-02-27', ID_Pesanan: 'ORD-1014', Produk: 'Standing Desk Dual Motor', Kategori: 'Perabot Kantor', Wilayah: 'Jakarta', Jumlah: 4, Harga_Satuan: 5400000, Total_Pendapatan: 21600000, Status: 'Selesai', Rating: 4.9 },
    { _id: 'row-15', Tanggal: '2025-03-01', ID_Pesanan: 'ORD-1015', Produk: 'Noise Cancelling Headphones', Kategori: 'Elektronik', Wilayah: 'Yogyakarta', Jumlah: 5, Harga_Satuan: 3200000, Total_Pendapatan: 16000000, Status: 'Dalam Proses', Rating: 4.7 }
  ],
  defaultCharts: [
    {
      id: 'chart-1',
      title: 'Total Pendapatan per Kategori',
      description: 'Distribusi nilai penjualan bruto berdasarkan kategori produk.',
      type: 'bar',
      xAxisKey: 'Kategori',
      yAxisKey: 'Total_Pendapatan',
      aggregation: 'SUM',
      colorTheme: 'indigo',
      gridSpan: 1,
      sortBy: 'value',
      sortDirection: 'desc',
      isCurrency: true,
      unit: 'Rp'
    },
    {
      id: 'chart-2',
      title: 'Tren Pendapatan Harian',
      description: 'Fluktuasi akumulasi omzet harian sepanjang periode transaksi.',
      type: 'area',
      xAxisKey: 'Tanggal',
      yAxisKey: 'Total_Pendapatan',
      aggregation: 'SUM',
      colorTheme: 'emerald',
      gridSpan: 1,
      sortBy: 'label',
      sortDirection: 'asc',
      isCurrency: true,
      unit: 'Rp'
    },
    {
      id: 'chart-3',
      title: 'Distribusi Wilayah Penjualan',
      description: 'Pangsa pasar pesanan berdasarkan kota tujuan.',
      type: 'donut',
      xAxisKey: 'Wilayah',
      yAxisKey: 'Total_Pendapatan',
      aggregation: 'SUM',
      colorTheme: 'cyan',
      gridSpan: 1,
      sortBy: 'value',
      sortDirection: 'desc',
      isCurrency: true,
      unit: 'Rp'
    },
    {
      id: 'chart-4',
      title: 'Volume Unit Terjual per Produk',
      description: 'Performa kuantitas unit produk yang paling diminati pembeli.',
      type: 'bar',
      xAxisKey: 'Produk',
      yAxisKey: 'Jumlah',
      aggregation: 'SUM',
      colorTheme: 'purple',
      gridSpan: 1,
      sortBy: 'value',
      sortDirection: 'desc',
      limit: 6,
      unit: 'Unit'
    },
    {
      id: 'chart-5',
      title: 'Performa Rata-rata Rating per Kategori',
      description: 'Skor kepuasan pelanggan terhadap kualitas produk per kategori.',
      type: 'radar',
      xAxisKey: 'Kategori',
      yAxisKey: 'Rating',
      aggregation: 'AVG',
      colorTheme: 'amber',
      gridSpan: 1,
      sortBy: 'label',
      unit: '★'
    },
    {
      id: 'chart-6',
      title: 'Kombinasi Unit & Pendapatan per Wilayah',
      description: 'Perbandingan komposit volume unit dan total omzet per kota.',
      type: 'composed',
      xAxisKey: 'Wilayah',
      yAxisKey: 'Total_Pendapatan',
      secondaryYAxisKey: 'Jumlah',
      aggregation: 'SUM',
      colorTheme: 'indigo',
      gridSpan: 1,
      sortBy: 'value',
      sortDirection: 'desc',
      isCurrency: true,
      unit: 'Rp'
    }
  ]
};

export const FINANCE_DATASET: DatasetPreset = {
  id: 'finance_cashflow',
  title: 'Keuangan & Arus Kas',
  description: 'Laporan pemasukan, pengeluaran operasional, dan alokasi anggaran.',
  icon: 'DollarSign',
  columns: [
    { key: 'Bulan', label: 'Bulan', type: 'string' },
    { key: 'Kategori_Biaya', label: 'Kategori Anggaran', type: 'string' },
    { key: 'Departemen', label: 'Departemen', type: 'string' },
    { key: 'Pemasukan', label: 'Pemasukan (Rp)', type: 'number', isNumeric: true },
    { key: 'Pengeluaran', label: 'Pengeluaran (Rp)', type: 'number', isNumeric: true },
    { key: 'Margin_Bersih', label: 'Laba Bersih (Rp)', type: 'number', isNumeric: true },
    { key: 'Status_Approval', label: 'Status Approval', type: 'string' }
  ],
  rows: [
    { _id: 'fin-1', Bulan: 'Januari', Kategori_Biaya: 'Operasional & Server', Departemen: 'IT & Eng', Pemasukan: 180000000, Pengeluaran: 45000000, Margin_Bersih: 135000000, Status_Approval: 'Disetujui' },
    { _id: 'fin-2', Bulan: 'Januari', Kategori_Biaya: 'Gaji & Benefit', Departemen: 'HR', Pemasukan: 0, Pengeluaran: 85000000, Margin_Bersih: -85000000, Status_Approval: 'Disetujui' },
    { _id: 'fin-3', Bulan: 'Januari', Kategori_Biaya: 'Pemasaran Digital', Departemen: 'Marketing', Pemasukan: 95000000, Pengeluaran: 32000000, Margin_Bersih: 63000000, Status_Approval: 'Disetujui' },
    { _id: 'fin-4', Bulan: 'Februari', Kategori_Biaya: 'Operasional & Server', Departemen: 'IT & Eng', Pemasukan: 210000000, Pengeluaran: 48000000, Margin_Bersih: 162000000, Status_Approval: 'Disetujui' },
    { _id: 'fin-5', Bulan: 'Februari', Kategori_Biaya: 'Gaji & Benefit', Departemen: 'HR', Pemasukan: 0, Pengeluaran: 88000000, Margin_Bersih: -88000000, Status_Approval: 'Disetujui' },
    { _id: 'fin-6', Bulan: 'Februari', Kategori_Biaya: 'Pemasaran Digital', Departemen: 'Marketing', Pemasukan: 120000000, Pengeluaran: 41000000, Margin_Bersih: 79000000, Status_Approval: 'Disetujui' },
    { _id: 'fin-7', Bulan: 'Maret', Kategori_Biaya: 'Operasional & Server', Departemen: 'IT & Eng', Pemasukan: 245000000, Pengeluaran: 52000000, Margin_Bersih: 193000000, Status_Approval: 'Pending' },
    { _id: 'fin-8', Bulan: 'Maret', Kategori_Biaya: 'Gaji & Benefit', Departemen: 'HR', Pemasukan: 0, Pengeluaran: 92000000, Margin_Bersih: -92000000, Status_Approval: 'Disetujui' },
    { _id: 'fin-9', Bulan: 'Maret', Kategori_Biaya: 'Pemasaran Digital', Departemen: 'Marketing', Pemasukan: 140000000, Pengeluaran: 49000000, Margin_Bersih: 91000000, Status_Approval: 'Pending' }
  ],
  defaultCharts: [
    {
      id: 'chart-fin-1',
      title: 'Pemasukan vs Pengeluaran per Departemen',
      description: 'Komparasi arus dana masuk dan keluar antar divisi perusahaan.',
      type: 'bar',
      xAxisKey: 'Departemen',
      yAxisKey: 'Pemasukan',
      secondaryYAxisKey: 'Pengeluaran',
      aggregation: 'SUM',
      colorTheme: 'emerald',
      gridSpan: 1,
      sortBy: 'value',
      sortDirection: 'desc',
      isCurrency: true,
      unit: 'Rp'
    },
    {
      id: 'chart-fin-2',
      title: 'Proporsi Pengeluaran per Kategori',
      description: 'Breakdown pos belanja operasional utama.',
      type: 'donut',
      xAxisKey: 'Kategori_Biaya',
      yAxisKey: 'Pengeluaran',
      aggregation: 'SUM',
      colorTheme: 'rose',
      gridSpan: 1,
      sortBy: 'value',
      sortDirection: 'desc',
      isCurrency: true,
      unit: 'Rp'
    }
  ]
};

export const INVENTORY_DATASET: DatasetPreset = {
  id: 'inventory_stock',
  title: 'Inventaris & Stok Gudang',
  description: 'Monitoring kuantitas stok, valuasi aset logistik, dan batas minimum stok.',
  icon: 'Boxes',
  columns: [
    { key: 'SKU', label: 'Kode SKU', type: 'string' },
    { key: 'Nama_Barang', label: 'Nama Barang', type: 'string' },
    { key: 'Kategori', label: 'Kategori', type: 'string' },
    { key: 'Gudang', label: 'Lokasi Gudang', type: 'string' },
    { key: 'Stok_Tersedia', label: 'Stok Tersedia', type: 'number', isNumeric: true },
    { key: 'Stok_Minimum', label: 'Batas Minimum', type: 'number', isNumeric: true },
    { key: 'Harga_Beli', label: 'Harga Beli (Rp)', type: 'number', isNumeric: true },
    { key: 'Nilai_Aset', label: 'Total Nilai Aset (Rp)', type: 'number', isNumeric: true },
    { key: 'Status_Stok', label: 'Status Stok', type: 'string' }
  ],
  rows: [
    { _id: 'inv-1', SKU: 'SKU-001', Nama_Barang: 'Processor Intel Core i7', Kategori: 'Komponen PC', Gudang: 'Gudang A - Jakarta', Stok_Tersedia: 45, Stok_Minimum: 20, Harga_Beli: 5200000, Nilai_Aset: 234000000, Status_Stok: 'Aman' },
    { _id: 'inv-2', SKU: 'SKU-002', Nama_Barang: 'VGA RTX 4070 Ti', Kategori: 'Komponen PC', Gudang: 'Gudang A - Jakarta', Stok_Tersedia: 12, Stok_Minimum: 15, Harga_Beli: 13500000, Nilai_Aset: 162000000, Status_Stok: 'Rendah' },
    { _id: 'inv-3', SKU: 'SKU-003', Nama_Barang: 'RAM DDR5 32GB Kit', Kategori: 'Memory', Gudang: 'Gudang B - Surabaya', Stok_Tersedia: 80, Stok_Minimum: 30, Harga_Beli: 1850000, Nilai_Aset: 148000000, Status_Stok: 'Aman' },
    { _id: 'inv-4', SKU: 'SKU-004', Nama_Barang: 'NVMe SSD 2TB Gen4', Kategori: 'Storage', Gudang: 'Gudang B - Surabaya', Stok_Tersedia: 110, Stok_Minimum: 25, Harga_Beli: 2100000, Nilai_Aset: 231000000, Status_Stok: 'Aman' },
    { _id: 'inv-5', SKU: 'SKU-005', Nama_Barang: 'Power Supply 850W Gold', Kategori: 'Power', Gudang: 'Gudang C - Bandung', Stok_Tersedia: 8, Stok_Minimum: 20, Harga_Beli: 1950000, Nilai_Aset: 15600000, Status_Stok: 'Kritis' },
    { _id: 'inv-6', SKU: 'SKU-006', Nama_Barang: 'Liquid Cooler 360mm RGB', Kategori: 'Cooling', Gudang: 'Gudang C - Bandung', Stok_Tersedia: 35, Stok_Minimum: 15, Harga_Beli: 1600000, Nilai_Aset: 56000000, Status_Stok: 'Aman' }
  ],
  defaultCharts: [
    {
      id: 'chart-inv-1',
      title: 'Valuasi Aset Inventaris per Kategori',
      description: 'Nilai rupiah stok yang tersimpan di gudang berdasarkan kategori barang.',
      type: 'bar',
      xAxisKey: 'Kategori',
      yAxisKey: 'Nilai_Aset',
      aggregation: 'SUM',
      colorTheme: 'cyan',
      gridSpan: 1,
      sortBy: 'value',
      sortDirection: 'desc',
      isCurrency: true,
      unit: 'Rp'
    },
    {
      id: 'chart-inv-2',
      title: 'Distribusi Status Ketersediaan Stok',
      description: 'Persentase barang dalam status Aman, Rendah, atau Kritis.',
      type: 'pie',
      xAxisKey: 'Status_Stok',
      yAxisKey: 'Stok_Tersedia',
      aggregation: 'SUM',
      colorTheme: 'amber',
      gridSpan: 1,
      sortBy: 'value',
      sortDirection: 'desc',
      unit: 'Unit'
    }
  ]
};

export const EMPTY_DATASET: DatasetPreset = {
  id: 'blank_dataset',
  title: 'Lembar Kerja Kosong',
  description: 'Mulai dari lembar kerja tanpa data bawaan. Tambahkan baris baru, impor file CSV, atau hubungkan Google Sheet.',
  icon: 'FileSpreadsheet',
  columns: [
    { key: 'Tanggal', label: 'Tanggal', type: 'date' },
    { key: 'Nama', label: 'Nama / Judul', type: 'string' },
    { key: 'Kategori', label: 'Kategori', type: 'string' },
    { key: 'Jumlah', label: 'Jumlah (Qty)', type: 'number', isNumeric: true },
    { key: 'Nilai', label: 'Nilai / Total (Rp)', type: 'number', isNumeric: true },
    { key: 'Status', label: 'Status', type: 'string' }
  ],
  rows: [],
  defaultCharts: []
};

export const PRESET_DATASETS: DatasetPreset[] = [
  EMPTY_DATASET,
  SALES_DATASET,
  FINANCE_DATASET,
  INVENTORY_DATASET
];
