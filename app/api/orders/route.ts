import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/service";
import { z } from "zod";

const placeOrderSchema = z.object({
  user_id: z.string().uuid(),
  address: z.object({
    recipient_name: z.string(),
    phone_number: z.string(),
    address_line1: z.string(),
    address_line2: z.string().optional(),
    city: z.string(),
    province: z.string(),
    postal_code: z.string(),
    country: z.string(),
  }),
  payment_method_id: z.number().int().positive(),
  items: z.array(
    z.object({
      id: z.number().int().positive(),
      name: z.string(),
      price: z.number(),
      quantity: z.number().int().positive(),
    })
  ),
  subtotal: z.number(),
  shipping: z.number(),
  tax: z.number(),
  total: z.number(),
});

const allowedOrigin =
  process.env.NODE_ENV === "development"
    ? "http://localhost:3001"
    : "YOUR_PRODUCTION_FRONTEND_URL";

function addCorsHeaders(response: NextResponse): NextResponse {
  response.headers.set("Access-Control-Allow-Origin", allowedOrigin);
  response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
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
    const validationResult = placeOrderSchema.safeParse(body);

    if (!validationResult.success) {
      return addCorsHeaders(
        NextResponse.json(
          { error: "Invalid data format", details: validationResult.error },
          { status: 400 }
        )
      );
    }

    const { user_id, address, payment_method_id, items, total } =
      validationResult.data;

    // 1. Ambil cart_id user
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", user_id)
      .single();

    if (profileError || !profile) {
      return addCorsHeaders(
        NextResponse.json(
          { error: "User profile not found", details: profileError?.message },
          { status: 404 }
        )
      );
    }

    // 2. Buat order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: profile.id, // <-- gunakan id dari profiles
        order_number: "ORD" + Date.now(),
        total_amount: total,
        shipping_recipient_name: address.recipient_name,
        shipping_phone_number: address.phone_number,
        shipping_address_line1: address.address_line1,
        shipping_address_line2: address.address_line2,
        shipping_city: address.city,
        shipping_province: address.province,
        shipping_postal_code: address.postal_code,
        shipping_country: address.country,
      })
      .select("id")
      .single();

    if (orderError || !order) {
      return addCorsHeaders(
        NextResponse.json(
          { error: "Failed to create order", details: orderError?.message },
          { status: 500 }
        )
      );
    }

    // 3. Buat order_items & update stock
    for (const item of items) {
      // Insert order_item
      const { error: orderItemError } = await supabase
        .from("order_items")
        .insert({
          order_id: order.id,
          product_id: item.id,
          quantity: item.quantity,
          price_per_item: item.price,
          product_name: item.name,
        });

      if (orderItemError) {
        return addCorsHeaders(
          NextResponse.json(
            {
              error: "Failed to create order item",
              details: orderItemError.message,
            },
            { status: 500 }
          )
        );
      }

      // Update stock
      const { error: stockError } = await supabase.rpc(
        "decrement_product_stock",
        {
          product_id_input: item.id,
          quantity_input: item.quantity,
        }
      );

      if (stockError) {
        return addCorsHeaders(
          NextResponse.json(
            {
              error: "Failed to update product stock",
              details: stockError.message,
            },
            { status: 500 }
          )
        );
      }
    }

    // 4. Buat payment
    const { error: paymentError } = await supabase.from("payments").insert({
      order_id: order.id,
      payment_method_id,
      amount: total,
      status: "pending",
    });

    if (paymentError) {
      return addCorsHeaders(
        NextResponse.json(
          { error: "Failed to create payment", details: paymentError.message },
          { status: 500 }
        )
      );
    }

    // 5. Hapus cart_items & cart
    // Fetch the user's cart first
    const { data: cart, error: cartError } = await supabase
      .from("carts")
      .select("id")
      .eq("user_id", user_id)
      .single();

    if (cartError || !cart) {
      return addCorsHeaders(
        NextResponse.json(
          {
            error: "Cart not found for user",
            details: cartError?.message,
          },
          { status: 404 }
        )
      );
    }

    const { error: deleteItemsError } = await supabase
      .from("cart_items")
      .delete()
      .eq("cart_id", cart.id);

    if (deleteItemsError) {
      return addCorsHeaders(
        NextResponse.json(
          {
            error: "Failed to delete cart items",
            details: deleteItemsError.message,
          },
          { status: 500 }
        )
      );
    }

    const { error: deleteCartError } = await supabase
      .from("carts")
      .delete()
      .eq("id", cart.id);

    if (deleteCartError) {
      return addCorsHeaders(
        NextResponse.json(
          { error: "Failed to delete cart", details: deleteCartError.message },
          { status: 500 }
        )
      );
    }

    return addCorsHeaders(
      NextResponse.json({ order_id: order.id }, { status: 200 })
    );
  } catch (err) {
    return addCorsHeaders(
      NextResponse.json(
        {
          error: "Something went wrong!",
          details: err instanceof Error ? err.message : String(err),
        },
        { status: 500 }
      )
    );
  }
}
