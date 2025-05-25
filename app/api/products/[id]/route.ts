import { supabase } from "@/lib/supabase/service";
import { NextResponse } from "next/server"; // Gunakan NextResponse untuk respons
import { z } from "zod";

const updateProductSchema = z
  .object({
    name: z.string().min(1).max(150),
    slug: z
      .string()
      .min(1)
      .max(100)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    description: z.string().min(1),
    benefits: z.string().nullable().optional(),
    key_ingredients: z.string().nullable().optional(),
    price: z.number().min(0),
    volume_ml: z.number().int().nullable().optional(),
    category_id: z.number().nullable().optional(),
    is_active: z.boolean().default(true),
    stock: z.number().int().min(0).default(0),
    skin_type_id: z.number().nullable().optional(),
    how_to_use: z.string().nullable().optional(),
    product_images: z
      .array(
        z.object({
          image_url: z.string(),
          is_primary: z.boolean(),
        })
      )
      .min(1, "At least 1 image is required")
      .optional(),
  })
  .partial();

type UpdateProductPayload = z.infer<typeof updateProductSchema>;

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
      { message: "ID product tidak valid" },
      { status: 400 }
    );
  }

  const productId = parseInt(id, 10);

  try {
    const body = await request.json();
    const validationResult = updateProductSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          message: "Data format tidak valid",
          errors: validationResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const productDataToUpdate: UpdateProductPayload = validationResult.data;
    const { product_images, ...dataForSupabase } = productDataToUpdate;

    // Update product
    const { error } = await supabase
      .from("products")
      .update(dataForSupabase)
      .eq("id", productId)
      .select();
    
    if (error) {
      console.error("Error Supabase saat UPDATE:", error);
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { message: "Product dengan ID tersebut tidak ditemukan" },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          message: "Error mengupdate data product di database",
          error: error.message,
        },
        { status: 500 }
      );
    }

    if (product_images && Array.isArray(product_images)) {
      // Hapus semua images lama, lalu insert baru
      await supabase
        .from("product_images")
        .delete()
        .eq("product_id", productId);
      const newImages = product_images.map((img) => ({
        product_id: productId,
        image_url: img.image_url,
        is_primary: img.is_primary,
      }));
      await supabase.from("product_images").insert(newImages);
    }

    // Ambil data lengkap (dengan images)
    const { data: updatedProduct, error: fetchError } = await supabase
      .from("products")
      .select(
        `
        *,
        product_images (*)
      `
      )
      .eq("id", productId)
      .single();

    if (fetchError || !updatedProduct) {
      return NextResponse.json(
        { message: "Product tidak ditemukan setelah mencoba update." },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedProduct, { status: 200 });
  } catch (error: unknown) {
    console.error("Error di API route /api/products/${id} (PATCH):", error);
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
      { message: "ID product tidak valid" },
      { status: 400 }
    );
  }

  const productId = parseInt(id, 10);

  try {
    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", productId)
      .maybeSingle();

    if (error) {
      console.error("Error Supabase saat DELETE:", error);
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { message: "Product dengan ID tersebut tidak ditemukan" },
          { status: 404 }
        );
      }
      return NextResponse.json(
        {
          message: "Error menghapus data product di database",
          error: error.message,
        },
        { status: 500 }
      );
    }

    return new Response(null, { status: 204 });
  } catch (error: unknown) {
    console.error(`Error di API route /api/products/${id} (DELETE):`, error);
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
