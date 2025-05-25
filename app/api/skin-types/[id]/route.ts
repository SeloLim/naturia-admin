import { supabase } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import { z } from "zod";

const updateSkinTypeSchema = z
  .object({
    name: z.string().min(1).max(150),
  })
  .partial();

type UpdateSkinTypePayload = z.infer<typeof updateSkinTypeSchema>;

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: RouteParams) {
  const awaitedParams = await params;
  const { id } = awaitedParams;

  if (typeof id !== "string" || !/^\d+$/.test(id)) {
    return NextResponse.json(
      { message: "ID category tidak valid" },
      { status: 400 }
    );
  }

  const categoryId = parseInt(id, 10);

  try {
    const body = await request.json();
    const validationResult = updateSkinTypeSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          message: "Data format tidak valid",
          errors: validationResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const skinTypeDataToUpdate: UpdateSkinTypePayload = validationResult.data;
    const dataForSupabase: Record<string, unknown> = {
      ...skinTypeDataToUpdate,
    };

    const { data, error } = await supabase
      .from("skin_types")
      .update(dataForSupabase)
      .eq("id", categoryId)
      .select();

    if (error) {
      console.error("Error Supabase saat UPDATE:", error);
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { message: "Skin type dengan ID tersebut tidak ditemukan" },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          message: "Error mengupdate data skin type di database",
          error: error.message,
        },
        { status: 500 }
      );
    }

    const updatedSkinType = data ? data[0] : null;

    if (!updatedSkinType) {
      console.warn(
        `Update berhasil tanpa error, tapi tidak ada data dikembalikan untuk ID ${categoryId}. Mungkin ID tidak ditemukan.`
      );
      return NextResponse.json(
        { message: "Skin type tidak ditemukan setelah mencoba update." },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedSkinType, { status: 200 });
  } catch (error: unknown) {
    console.error("Error di API route /api/skin-types/${id} (PATCH):", error);
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

export async function DELETE(request: Request, { params }: RouteParams) {
  const awaitedParams = await params;
  const { id } = awaitedParams;

  if (typeof id !== "string" || !/^\d+$/.test(id)) {
    return NextResponse.json(
      { message: "ID skin type tidak valid" },
      { status: 400 }
    );
  }

  const skinTypeId = parseInt(id, 10);

  try {
    const { error } = await supabase
      .from("skin_types")
      .delete()
      .eq("id", skinTypeId)
      .maybeSingle();

    if (error) {
      console.error("Error Supabase saat DELETE:", error);
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { message: "Skin type dengan ID tersebut tidak ditemukan" },
          { status: 404 }
        );
      }
      return NextResponse.json(
        {
          message: "Error menghapus data skin type di database",
          error: error.message,
        },
        { status: 500 }
      );
    }

    return new Response(null, { status: 204 });
  } catch (error: unknown) {
    console.error(`Error di API route /api/skin-types/${id} (DELETE):`, error);
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
