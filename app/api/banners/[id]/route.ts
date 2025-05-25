import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/service";
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

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function PATCH(
  request: Request,
  { params }: RouteParams
) {
  const awaitedParams = await params;
  const { id } = awaitedParams;

  if (typeof id !== "string" || !/^\d+$/.test(id)) {
    return NextResponse.json(
      { message: "ID banner tidak valid" },
      { status: 400 }
    );
  }

  const bannerId = parseInt(id, 10);

  try {
    const body = await request.json();
    const validationResult = updateBannerSchema.safeParse(body);

    if (!validationResult.success) {
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

export async function DELETE(
  request: Request,
  { params }: RouteParams
) {
  const awaitedParams = await params;
  const { id } = awaitedParams;

  if (typeof id !== "string" || !/^\d+$/.test(id)) {
    return NextResponse.json(
      { message: "ID banner tidak valid" },
      { status: 400 }
    );
  }

  const bannerId = parseInt(id, 10); 

  try {
    const { error } = await supabase
      .from("banners")
      .delete()
      .eq("id", bannerId)
      .maybeSingle();

    if (error) {
      console.error("Error Supabase saat DELETE:", error);
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { message: "Banner dengan ID tersebut tidak ditemukan" },
          { status: 404 }
        );
      }
      return NextResponse.json(
        {
          message: "Error menghapus data banner di database",
          error: error.message,
        },
        { status: 500 }
      );
    }
    return new Response(null, { status: 204 }); 
  } catch (error: unknown) {
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