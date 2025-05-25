import { supabase } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const createCategorySchema = z.object({
  name: z.string().min(1).max(150),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().min(1),
});

type CreateCategoryPayload = z.infer<typeof createCategorySchema>;

const allowedOrigin = process.env.NEXT_PUBLIC_ALLOWED_ORIGIN!;

if (!allowedOrigin) {
  throw new Error("NEXT_PUBLIC_ALLOWED_ORIGIN is not defined");
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function OPTIONS(req: NextRequest) {
  const response = new NextResponse(null, { status: 200 });
  addCorsHeaders(response);
  return response;
}

function addCorsHeaders(response: NextResponse): NextResponse {
  response.headers.set("Access-Control-Allow-Origin", allowedOrigin);
  response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );
  // response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set("Access-Control-Max-Age", "86400");
  return response;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const validationResult = createCategorySchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          message: "Data format tidak valid",
          errors: validationResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const categoryDataToInsert: CreateCategoryPayload = validationResult.data;

    const dataForSupabase = {
      ...categoryDataToInsert,
      description:
        categoryDataToInsert.description === ""
          ? null
          : categoryDataToInsert.description,
    };

    const { data, error } = await supabase
      .from("categories")
      .insert([dataForSupabase])
      .select();

    if (error) {
      console.error("Error Supabase saat INSERT:", error);
      return NextResponse.json(
        {
          message: "Error menyimpan data kategori ke database",
          error: error.message,
        },
        { status: 500 }
      );
    }

    const newCategory = data ? data[0] : null;

    if (!newCategory) {
      console.error("Insert berhasil tapi Supabase tidak mengembalikan data.");
      return NextResponse.json(
        { message: "Gagal mendapatkan data kategori yang baru dibuat." },
        { status: 500 }
      );
    }
    return NextResponse.json(newCategory, { status: 201 });
  } catch (error: unknown) {
    console.error("Error di API route /api/banners (POST):", error);
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

export async function GET() {
  try {
    // Lakukan operasi SELECT ke tabel 'categories'
    // Anda bisa tambahkan filter, sorting, dll. sesuai kebutuhan
    const { data, error } = await supabase
      .from("categories")
      .select("*") // Ambil semua kolom
      .order("id", { ascending: true });

    if (error) {
      console.error("Error Supabase saat SELECT:", error);
      // Kirim respons error server jika pengambilan data gagal
      const errorResponse = NextResponse.json(
        {
          message: "Error mengambil data kategori dari database",
          error: error.message,
        },
        { status: 500 }
      );
      return addCorsHeaders(errorResponse);
    }

    const successResponse = NextResponse.json(data, { status: 200 }); // Sertakan headers dalam respons
    return addCorsHeaders(successResponse);
  } catch (error: unknown) {
    // Menangkap error lain yang mungkin terjadi
    console.error("Error di API route /api/categories (GET):", error);
    let errorMessage = "Terjadi kesalahan server internal";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    const errorResponse = NextResponse.json(
      { message: "Terjadi kesalahan server internal", error: errorMessage },
      { status: 500 }
    );
    return addCorsHeaders(errorResponse);
  }
}
