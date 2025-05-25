import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/service";
import { z } from "zod";

const cartItemSchema = z.object({
  user_id: z.string().uuid(),
  product_id: z.number().int().positive(),
  quantity: z.number().int().positive(),
});

const getCartSchema = z.object({
  user_id: z.string().uuid(),
});

const updateCartItemSchema = z.object({
  user_id: z.string().uuid(),
  product_id: z.number().int().positive(),
  quantity: z.number().int().positive(),
});

const deleteCartItemSchema = z.object({
  user_id: z.string().uuid(),
  product_id: z.number().int().positive(),
});

const allowedOrigin =
  process.env.NODE_ENV === "development"
    ? "http://localhost:3001"
    : "YOUR_PRODUCTION_FRONTEND_URL";

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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validationResult = cartItemSchema.safeParse(body);

    if (!validationResult.success) {
      return addCorsHeaders(
        NextResponse.json(
          { error: "Invalid data format", details: validationResult.error },
          { status: 400 }
        )
      );
    }

    const { user_id, product_id, quantity } = validationResult.data;

    // First, check if user exists in profiles
    const { data: userProfile, error: userError } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", user_id)
      .single();

    if (userError || !userProfile) {
      return addCorsHeaders(
        NextResponse.json(
          { error: "User not found", details: userError?.message },
          { status: 404 }
        )
      );
    }

    // Check if product exists
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id")
      .eq("id", product_id)
      .single();

    if (productError || !product) {
      return addCorsHeaders(
        NextResponse.json(
          { error: "Product not found", details: productError?.message },
          { status: 404 }
        )
      );
    }

    // Get cart with detailed error handling
    const { data: existingCart, error: cartSelectError } = await supabase
      .from("carts")
      .select("id")
      .eq("user_id", user_id)
      .single();

    if (cartSelectError && cartSelectError.code !== "PGRST116") {
      return addCorsHeaders(
        NextResponse.json(
          { error: "Error checking cart", details: cartSelectError.message },
          { status: 500 }
        )
      );
    }

    const cart =
      existingCart ||
      (await (async () => {
        const { data: newCart, error: cartError } = await supabase
          .from("carts")
          .insert({ user_id })
          .select()
          .single();

        if (cartError) {
          throw new Error(cartError.message);
        }
        return newCart;
      })());

    if (!cart || !cart.id) {
      return addCorsHeaders(
        NextResponse.json(
          { error: "Cart not found or could not be created" },
          { status: 500 }
        )
      );
    }

    // Add/update cart item
    const { data: cartItem, error: cartItemError } = await supabase
      .from("cart_items")
      .upsert(
        {
          cart_id: cart.id,
          product_id,
          quantity,
        },
        {
          onConflict: "cart_id,product_id",
        }
      )
      .select()
      .single();

    if (cartItemError) {
      return addCorsHeaders(
        NextResponse.json(
          {
            error: "Failed to add item to cart",
            details: cartItemError.message,
          },
          { status: 500 }
        )
      );
    }

    return addCorsHeaders(NextResponse.json(cartItem, { status: 201 }));
  } catch (error) {
    console.error("Cart creation error:", error);
    return addCorsHeaders(
      NextResponse.json(
        {
          error: "Something went wrong!",
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 500 }
      )
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const user_id = searchParams.get("user_id");

    const validationResult = getCartSchema.safeParse({ user_id });

    if (!validationResult.success) {
      return addCorsHeaders(
        NextResponse.json({ error: "Invalid user ID format" }, { status: 400 })
      );
    }

    // Get cart for user with detailed error handling
    const { data: cart, error: cartError } = await supabase
      .from("carts")
      .select("id")
      .eq("user_id", user_id)
      .single();

    if (cartError) {
      return addCorsHeaders(
        NextResponse.json(
          { error: "Cart not found", details: cartError.message },
          { status: 404 }
        )
      );
    }

    // Get cart items with product details
    const { data: cartItems, error: cartItemsError } = await supabase
      .from("cart_items")
      .select(
        `
          id,
          quantity,
          added_at,
          product_id,
          products (
            id,
            name,
            price
          )
        `
      )
      .eq("cart_id", cart.id);

    if (cartItemsError) {
      return addCorsHeaders(
        NextResponse.json(
          {
            error: "Failed to fetch cart items",
            details: cartItemsError.message,
          },
          { status: 500 }
        )
      );
    }

    const productIds = cartItems.map((item) => item.product_id);

    const { data: productImages, error: imagesError } = await supabase
      .from("product_images")
      .select("product_id, image_url")
      .in("product_id", productIds)
      .eq("is_primary", true);

    if (imagesError) {
      return addCorsHeaders(
        NextResponse.json(
          {
            error: "Failed to fetch product images",
            details: imagesError.message,
          },
          { status: 500 }
        )
      );
    }

    const itemsWithImage = cartItems.map((item) => {
      const image = (productImages ?? []).find(
        (img) => img.product_id === item.product_id
      );
      return {
        ...item,
        products: {
          ...item.products,
          image_url: image?.image_url || null,
        },
      };
    });

    return addCorsHeaders(
      NextResponse.json(
        {
          cart_id: cart.id,
          items: itemsWithImage,
        },
        { status: 200 }
      )
    );
  } catch (error) {
    console.error("Cart fetch error:", error);
    return addCorsHeaders(
      NextResponse.json(
        {
          error: "Something went wrong!",
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 500 }
      )
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const validationResult = updateCartItemSchema.safeParse(body);

    if (!validationResult.success) {
      return addCorsHeaders(
        NextResponse.json(
          { error: "Invalid data format", details: validationResult.error },
          { status: 400 }
        )
      );
    }

    const { user_id, product_id, quantity } = validationResult.data;

    // Get cart
    const { data: cart, error: cartError } = await supabase
      .from("carts")
      .select("id")
      .eq("user_id", user_id)
      .single();

    if (cartError || !cart) {
      return addCorsHeaders(
        NextResponse.json(
          { error: "Cart not found", details: cartError?.message },
          { status: 404 }
        )
      );
    }

    // Update quantity
    const { data: updatedItem, error: updateError } = await supabase
      .from("cart_items")
      .update({ quantity })
      .eq("cart_id", cart.id)
      .eq("product_id", product_id)
      .select()
      .maybeSingle();

    if (updateError) {
      return addCorsHeaders(
        NextResponse.json(
          { error: "Failed to update cart item", details: updateError.message },
          { status: 500 }
        )
      );
    }

    return addCorsHeaders(NextResponse.json(updatedItem, { status: 200 }));
  } catch (error) {
    return addCorsHeaders(
      NextResponse.json(
        {
          error: "Something went wrong!",
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 500 }
      )
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const validationResult = deleteCartItemSchema.safeParse(body);

    if (!validationResult.success) {
      return addCorsHeaders(
        NextResponse.json(
          { error: "Invalid data format", details: validationResult.error },
          { status: 400 }
        )
      );
    }

    const { user_id, product_id } = validationResult.data;

    // Get cart
    const { data: cart, error: cartError } = await supabase
      .from("carts")
      .select("id")
      .eq("user_id", user_id)
      .single();

    if (cartError || !cart) {
      return addCorsHeaders(
        NextResponse.json(
          { error: "Cart not found", details: cartError?.message },
          { status: 404 }
        )
      );
    }

    // Delete item
    const { error: deleteError } = await supabase
      .from("cart_items")
      .delete()
      .eq("cart_id", cart.id)
      .eq("product_id", product_id);

    if (deleteError) {
      return addCorsHeaders(
        NextResponse.json(
          { error: "Failed to delete cart item", details: deleteError.message },
          { status: 500 }
        )
      );
    }

    return addCorsHeaders(NextResponse.json({ success: true }, { status: 200 }));
  } catch (error) {
    return addCorsHeaders(
      NextResponse.json(
        {
          error: "Something went wrong!",
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 500 }
      )
    );
  }
}