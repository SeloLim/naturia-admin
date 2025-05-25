
import { supabase } from "@/lib/supabase/service";
import { NextResponse } from "next/server"; // Gunakan NextResponse untuk respons
import { z } from "zod";

const updateCategorySchema = z
  .object({
    name: z.string().min(1).max(150),
    slug: z
      .string()
      .min(1)
      .max(100)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    description: z.string().min(1),
  })
  .partial();

type UpdateCategoryPayload = z.infer<typeof updateCategorySchema>;

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
      { message: "ID category tidak valid" },
      { status: 400 }
    );
  }

  const categoryId = parseInt(id, 10);

  try {
    const body = await request.json();
    const validationResult = updateCategorySchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          message: "Data format tidak valid",
          errors: validationResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const categoryDataToUpdate: UpdateCategoryPayload = validationResult.data;
    const dataForSupabase: Record<string, unknown> = {
      ...categoryDataToUpdate,
    };
    if (
      "redirect_url" in dataForSupabase &&
      dataForSupabase.redirect_url === ""
    ) {
      dataForSupabase.redirect_url = null;
    }

    const { data, error } = await supabase
      .from("categories")
      .update(dataForSupabase)
      .eq("id", categoryId)
      .select();

    if (error) {
      console.error("Error Supabase saat UPDATE:", error);
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { message: "Category dengan ID tersebut tidak ditemukan" },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          message: "Error mengupdate data category di database",
          error: error.message,
        },
        { status: 500 }
      );
    }

    const updatedCategory = data ? data[0] : null;

    if (!updatedCategory) {
      console.warn(
        `Update berhasil tanpa error, tapi tidak ada data dikembalikan untuk ID ${categoryId}. Mungkin ID tidak ditemukan.`
      );
      return NextResponse.json(
        { message: "Category tidak ditemukan setelah mencoba update." },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedCategory, { status: 200 });
  } catch (error: unknown) {
    console.error("Error di API route /api/categories/${id} (PATCH):", error);
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
      { message: "ID category tidak valid" },
      { status: 400 }
    );
  }

  const categoryId = parseInt(id, 10);

  try {
    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", categoryId)
      .maybeSingle();

    if (error) {
      console.error("Error Supabase saat DELETE:", error);
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { message: "Category dengan ID tersebut tidak ditemukan" },
          { status: 404 }
        );
      }
      return NextResponse.json(
        {
          message: "Error menghapus data category di database",
          error: error.message,
        },
        { status: 500 }
      );
    }

    return new Response(null, { status: 204 });
  } catch (error: unknown) {
    console.error(`Error di API route /api/categories/${id} (DELETE):`, error);
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
