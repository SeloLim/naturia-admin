// app/api/banners/[id]/route.ts
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server"; // Gunakan NextResponse untuk respons
import { z } from "zod";

// Schema untuk validasi data PATCH (semua field optional)
const updateBannerSchema = z
  .object({
    title: z.string().max(150).optional(),
    image_url: z.string().min(1).url().optional(),
    description: z.string().optional(),
    redirect_url: z.string().url().optional().or(z.literal("")).optional(),
    is_active: z.boolean().optional(),
    display_order: z.number().int().min(0).optional(),
  })
  .partial();

type UpdateBannerPayload = z.infer<typeof updateBannerSchema>;

// Inisialisasi klien Supabase (Server-side) - sama seperti sebelumnya
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error(
    "!!! Variabel lingkungan Supabase tidak disetel. Tidak dapat terhubung ke DB. !!!"
  );
}

const configErrorResponse = NextResponse.json(
  { message: "Server configuration error: Supabase keys not set." },
  { status: 500 }
);
const supabase = createClient(supabaseUrl!, supabaseServiceRoleKey!);

// Handler untuk metode PATCH (mengambil parameter ID dari path)
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const awaitedParams = await params;
  const { id } = awaitedParams;

  // Validasi ID: pastikan ada dan berupa angka string
  if (typeof id !== "string" || !/^\d+$/.test(id)) {
    return NextResponse.json(
      { message: "ID banner tidak valid" },
      { status: 400 }
    );
  }

  const bannerId = parseInt(id, 10); // Ubah ID menjadi angka

  try {
    // Mengambil body request sebagai JSON (async)
    const body = await request.json();

    // Validasi data update menggunakan Zod
    const validationResult = updateBannerSchema.safeParse(body);

    if (!validationResult.success) {
      // Jika validasi gagal
      return NextResponse.json(
        {
          message: "Data format tidak valid",
          errors: validationResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const bannerDataToUpdate: UpdateBannerPayload = validationResult.data;
    const dataForSupabase: Record<string, unknown> = { ...bannerDataToUpdate };
    if (
      "redirect_url" in dataForSupabase &&
      dataForSupabase.redirect_url === ""
    ) {
      dataForSupabase.redirect_url = null;
    }

    // Lakukan operasi UPDATE
    const { data, error } = await supabase
      .from("banners")
      .update(dataForSupabase)
      .eq("id", bannerId) // Kondisi WHERE id = bannerId
      .select(); // Ambil data yang sudah terupdate

    if (error) {
      console.error("Error Supabase saat UPDATE:", error);
      // Cek error spesifik "Not Found"
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { message: "Banner dengan ID tersebut tidak ditemukan" },
          { status: 404 }
        );
      }
      // Error update lainnya
      return NextResponse.json(
        {
          message: "Error mengupdate data banner di database",
          error: error.message,
        },
        { status: 500 }
      );
    }

    const updatedBanner = data ? data[0] : null;

    if (!updatedBanner) {
      console.warn(
        `Update berhasil tanpa error, tapi tidak ada data dikembalikan untuk ID ${bannerId}. Mungkin ID tidak ditemukan.`
      );
      return NextResponse.json(
        { message: "Banner tidak ditemukan setelah mencoba update." },
        { status: 404 }
      );
    }

    // Jika berhasil, kirim respons 200 OK
    return NextResponse.json(updatedBanner, { status: 200 });
  } catch (error: unknown) {
    console.error("Error di API route /api/banners/${id} (PATCH):", error);
    let errorMessage = "Terjadi kesalahan server internal";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json(
      { message: "Terjadi kesalahan server internal", error: errorMessage },
      { status: 500 }
    );
  }
}

// ** Export handler DELETE (BARU) **
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  // Lakukan cek config di sini
  if (!supabase) {
    console.error("!!! Supabase environment variables not set for DELETE. !!!");
    return configErrorResponse;
  }

  const awaitedParams = await params;
  const { id } = awaitedParams;

  // Validasi ID: pastikan ada dan berupa angka string
  if (typeof id !== "string" || !/^\d+$/.test(id)) {
    return NextResponse.json(
      { message: "ID banner tidak valid" },
      { status: 400 }
    );
  }

  const bannerId = parseInt(id, 10); // Ubah ID menjadi angka

  try {
    // Lakukan operasi DELETE ke tabel 'banners' berdasarkan ID
    // Supabase delete tidak mengembalikan data secara default, hanya status
    const { error } = await supabase
      .from("banners")
      .delete()
      .eq("id", bannerId)
      .maybeSingle(); // Gunakan maybeSingle() jika yakin hanya menghapus 0 atau 1 row

    if (error) {
      console.error("Error Supabase saat DELETE:", error);
      // Cek error spesifik jika row dengan ID tersebut tidak ditemukan saat delete
      // Meskipun delete biasanya tidak memberikan error 404, bergantung pada RLS dan versi PostgREST
      // Tapi penanganan error umum Supabase tetap diperlukan
      if (error.code === "PGRST116") {
        // Kode error Supabase untuk "Not Found"
        return NextResponse.json(
          { message: "Banner dengan ID tersebut tidak ditemukan" },
          { status: 404 }
        );
      }
      // Error lain saat delete
      return NextResponse.json(
        {
          message: "Error menghapus data banner di database",
          error: error.message,
        },
        { status: 500 }
      );
    }

    // Jika berhasil, Supabase delete tidak mengembalikan data, hanya null untuk 'data' dan 'count' jika berhasil menghapus.
    // Kita bisa cek 'count' jika diaktifkan di PostgREST atau asumsikan berhasil jika tidak ada error.
    // Mengembalikan status 200 OK atau 204 No Content (sesuai preferensi API)
    return new Response(null, { status: 204 }); // 204 No Content - Respons sukses tanpa body
  } catch (error: unknown) {
    // Menangkap error lain yang mungkin terjadi
    console.error(`Error di API route /api/banners/${id} (DELETE):`, error);
    let errorMessage = "Terjadi kesalahan server internal";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json(
      { message: "Terjadi kesalahan server internal", error: errorMessage },
      { status: 500 }
    );
  }
}

// Kamu juga bisa tambahkan handler GET (untuk mengambil 1 banner)
// export async function GET(request: Request, { params }: { params: { id: string } }) { ... }

// Dan handler DELETE (untuk menghapus 1 banner)
// export async function DELETE(request: Request, { params }: { params: { id: string } }) { ... }
