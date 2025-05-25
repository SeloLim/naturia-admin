// app/api/banners/route.ts
import { supabase } from "@/lib/supabase/service";
import { NextResponse } from 'next/server';
import { z } from "zod";

const createBannerSchema = z.object({
    title: z.string().min(1).max(150),
    image_url: z.string().min(1).url(),
    description: z.string().min(1),
    redirect_url: z.string().url().optional().or(z.literal("")),
    is_active: z.boolean().default(true).optional(),
    display_order: z.number().int().min(0).default(0).optional(),
});

type CreateBannerPayload = z.infer<typeof createBannerSchema>;


const allowedOrigin = process.env.NEXT_PUBLIC_ALLOWED_ORIGIN!;

if (!allowedOrigin) {
  throw new Error("NEXT_PUBLIC_ALLOWED_ORIGIN is not defined");
}

function addCorsHeaders(response: NextResponse): NextResponse {
  response.headers.set("Access-Control-Allow-Origin", allowedOrigin);
  response.headers.set("Access-Control-Allow-Methods", "POST, GET, PATCH, DELETE, OPTIONS");
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );
  response.headers.set("Access-Control-Max-Age", "86400");
  return response;
}

export async function OPTIONS() {
  return addCorsHeaders(new NextResponse(null, { status: 200 }));
}

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
          return addCorsHeaders(NextResponse.json({ message: 'Error mengambil data banner dari database', error: error.message }, { status: 500 }));
      }

      return addCorsHeaders(NextResponse.json(data, { status: 200})); // Sertakan headers dalam respons

  } catch (error: unknown) {
      // Menangkap error lain yang mungkin terjadi
      console.error('Error di API route /api/banners (GET):', error);
      let errorMessage = 'Terjadi kesalahan server internal';
      if (error instanceof Error) {
          errorMessage = error.message;
      }
      return addCorsHeaders(NextResponse.json({ message: 'Terjadi kesalahan server internal', error: errorMessage }, { status: 500 }));
  }
}