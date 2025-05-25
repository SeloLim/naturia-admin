// app/api/banners/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server'; // Gunakan NextResponse untuk respons
import { z } from "zod";

// Schema untuk validasi data POST
const createBannerSchema = z.object({
    title: z.string().min(1).max(150),
    image_url: z.string().min(1).url(),
    description: z.string().min(1),
    redirect_url: z.string().url().optional().or(z.literal("")),
    is_active: z.boolean().default(true).optional(),
    display_order: z.number().int().min(0).default(0).optional(),
});

type CreateBannerPayload = z.infer<typeof createBannerSchema>;

// Inisialisasi klien Supabase (Server-side)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Cek saat startup (bukan di dalam handler Request untuk performa)
if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error("!!! Variabel lingkungan Supabase tidak disetel. Tidak dapat terhubung ke DB. !!!");
}

const supabase = createClient(supabaseUrl!, supabaseServiceRoleKey!);


// Handler untuk metode POST
export async function POST(request: Request) {
  try {
    // Mengambil body request sebagai JSON (async)
    const body = await request.json();

    // Validasi data menggunakan Zod
    const validationResult = createBannerSchema.safeParse(body);

    if (!validationResult.success) {
        // Jika validasi gagal, kirim respons 400 Bad Request
        return NextResponse.json({
            message: 'Data format tidak valid',
            errors: validationResult.error.flatten()
        }, { status: 400 });
    }

    const bannerDataToInsert: CreateBannerPayload = validationResult.data;

      // Supabase memerlukan null untuk field TEXT opsional yang kosong
      const dataForSupabase = {
        ...bannerDataToInsert,
        redirect_url: bannerDataToInsert.redirect_url === '' ? null : bannerDataToInsert.redirect_url,
      };


    // Lakukan operasi INSERT
    const { data, error } = await supabase
        .from('banners')
        .insert([dataForSupabase])
        .select(); // Ambil data yang baru dibuat

    if (error) {
        console.error('Error Supabase saat INSERT:', error);
        return NextResponse.json({ message: 'Error menyimpan data banner ke database', error: error.message }, { status: 500 });
    }

    const newBanner = data ? data[0] : null;

      if (!newBanner) {
          console.error('Insert berhasil tapi Supabase tidak mengembalikan data.');
          return NextResponse.json({ message: 'Gagal mendapatkan data banner yang baru dibuat.' }, { status: 500 });
      }


    // Jika berhasil, kirim respons 201 Created
    return NextResponse.json(newBanner, { status: 201 });

  } catch (error: unknown) {
      console.error('Error di API route /api/banners (POST):', error);
      let errorMessage = 'Terjadi kesalahan server internal';
      if (error instanceof Error) {
          errorMessage = error.message;
      }
      return NextResponse.json({ message: 'Terjadi kesalahan server internal', error: errorMessage  }, { status: 500 });
  }
}

export async function GET() {
  try {
      // Lakukan operasi SELECT ke tabel 'banners'
      // Anda bisa tambahkan filter, sorting, dll. sesuai kebutuhan
      const { data, error } = await supabase
          .from('banners')
          .select('*') // Ambil semua kolom
          // .eq('is_active', true) // Filter hanya banner yang aktif (opsional, tergantung kebutuhan frontend)
          .order('display_order', { ascending: true }); // Urutkan berdasarkan display_order

      if (error) {
          console.error('Error Supabase saat SELECT:', error);
          // Kirim respons error server jika pengambilan data gagal
          return NextResponse.json({ message: 'Error mengambil data banner dari database', error: error.message }, { status: 500 });
      }

      // ** Tambahkan header CORS di sini **
      const headers = {
        'Access-Control-Allow-Origin': 'http://localhost:3001', // * Mengizinkan dari origin manapun.
                                             // Untuk produksi, ganti '*' dengan origin spesifik web Customer,
                                             // contoh: 'http://localhost:3001' saat dev, 'https://customer.yourdomain.com' saat prod
        'Access-Control-Allow-Methods': 'GET, OPTIONS', // Metode yang diizinkan
        'Access-Control-Allow-Headers': 'Content-Type, Authorization', // Header yang diizinkan
      };

      return NextResponse.json(data, { status: 200, headers: headers }); // Sertakan headers dalam respons

  } catch (error: unknown) {
      // Menangkap error lain yang mungkin terjadi
      console.error('Error di API route /api/banners (GET):', error);
      let errorMessage = 'Terjadi kesalahan server internal';
      if (error instanceof Error) {
          errorMessage = error.message;
      }
      return NextResponse.json({ message: 'Terjadi kesalahan server internal', error: errorMessage }, { status: 500 });
  }
}

// Opsional: Tambahkan handler OPTIONS untuk CORS preflight requests
export async function OPTIONS() {
  const headers = {
      'Access-Control-Allow-Origin': 'http://localhost:3001', // Ganti dengan origin spesifik seperti di atas
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400', // Cache preflight response selama 24 jam
  };
  return new Response(null, { status: 204, headers: headers }); // 204 No Content
}

// Secara default, App Router akan mengembalikan 405 Method Not Allowed
// untuk metode yang tidak di-export. Jadi tidak perlu handler terpisah untuk 405.