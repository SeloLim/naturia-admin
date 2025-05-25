# Naturia Admin - Panel Admin E-commerce Skincare

Platform admin komprehensif untuk "Naturia," sebuah brand skincare fiktif. Berfungsi sebagai sistem manajemen dan portal API untuk aplikasi e-commerce pelanggan Naturia.

**Demo Langsung:** [https://naturia-admin.vercel.app/](https://naturia-admin.vercel.app/)

## Fitur Utama

* **Dashboard:** Ringkasan analitik dan metrik penting ( Belum Ada ).
* **Manajemen Produk:**
    * Kategori Produk
    * Jenis Kulit (untuk segmentasi produk)
    * Daftar Produk (detail, harga, stok)
    * Banner Promosi
* **Manajemen Pesanan:**
    * Daftar Pesanan Pelanggan
    * Status Pembayaran
    * Metode Pembayaran
* **Manajemen Pengguna:** Pengelolaan akun pengguna (pelanggan).

## Tampilan Aplikasi (Contoh Screenshot)

## Teknologi yang Digunakan

* **Frontend & Backend:** Next.js (v15.3.1)
* **Bahasa:** TypeScript (v5.8.3)
* **Styling:** Tailwind CSS (v4.1.4)
* **UI Components:** Shadcn/ui
* **Database & Backend Services:** Supabase (PostgreSQL)
* **Validasi Skema:** Zod
* **Runtime:** Bun (v1.2.9)
* **Linting:** ESLint

## Memulai Proyek (Getting Started)

Untuk menjalankan proyek ini secara lokal, ikuti langkah-langkah berikut:

1.  **Clone repositori:**
    ```bash
    git clone https://github.com/SeloLim/naturia-admin.git
    cd naturia-admin
    ```

2.  **Install dependencies menggunakan Bun:**
    ```bash
    bun install
    ```

3.  **Setup Environment Variables:**
    Buat file `.env.local` di root proyek dan tambahkan variabel environment yang dibutuhkan. Anda perlu mendapatkan kunci API dan URL dari akun Supabase Anda.
    ```env
    NEXT_PUBLIC_SUPABASE_URL=
    NEXT_PUBLIC_SUPABASE_ANON_KEY=
    SUPABASE_SERVICE_ROLE_KEY=
    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
    NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=
    ACCESS_TOKEN_SECRET=
    REFRESH_TOKEN_SECRET=
    EMAIL_CONFIRMATION_REDIRECT=
    NEXT_PUBLIC_ALLOWED_ORIGIN=
    ```

4.  **Jalankan server pengembangan Next.js:**
    ```bash
    bun dev
    ```
    Buka [http://localhost:3000](http://localhost:3000) di browser Anda.
---
