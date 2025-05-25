import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/service";
import { z } from "zod";

const orderSchema = z.object({
  orderNumber: z.string(),
});

const allowedOrigin = process.env.NEXT_PUBLIC_ALLOWED_ORIGIN!;

if (!allowedOrigin) {
  throw new Error("NEXT_PUBLIC_ALLOWED_ORIGIN is not defined");
}

type RouteParams = {
  params: Promise<{ orderNumber: string }>;
};

function addCorsHeaders(response: NextResponse): NextResponse {
  response.headers.set("Access-Control-Allow-Origin", allowedOrigin);
  response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
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

export async function GET(
  req: NextRequest,
  { params }: RouteParams
) {
  try {
    const { orderNumber } = await params;
    const validationResult = orderSchema.safeParse({ orderNumber });

    if (!validationResult.success) {
      return addCorsHeaders(
        NextResponse.json(
          { error: "Invalid order number format" },
          { status: 400 }
        )
      );
    }

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(
        `
        id,
        order_number,
        order_date,
        total_amount,
        shipping_recipient_name,
        shipping_address_line1,
        shipping_address_line2,
        shipping_city,
        shipping_postal_code,
        shipping_province,
        shipping_country
      `
      )
      .eq("order_number", orderNumber)
      .single();

    if (orderError || !order) {
      return addCorsHeaders(
        NextResponse.json(
          { error: "Order not found", details: orderError?.message },
          { status: 404 }
        )
      );
    }

    // Get payment information including payment method
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .select(`
        id,
        payment_method_id,
        payment_methods:payment_method_id(id, name, code)
      `)
      .eq("order_id", order.id)
      .single();

    if (paymentError) {
      console.error("Payment fetch error:", paymentError);
      // We'll continue even if payment info isn't found
    }
    
    // Get payment method name separately if needed
    let paymentMethodName = "Unknown";
    if (payment?.payment_method_id) {
      const { data: paymentMethod } = await supabase
        .from("payment_methods")
        .select("name")
        .eq("id", payment.payment_method_id)
        .single();
      
      if (paymentMethod) {
        paymentMethodName = paymentMethod.name;
      }
    }

    // Get order items
    const { data: items, error: itemsError } = await supabase
      .from("order_items")
      .select(
        `
        product_name,
        quantity,
        price_per_item,
        product_id
      `
      )
      .eq("order_id", order.id);

    if (itemsError) {
      return addCorsHeaders(
        NextResponse.json(
          { error: "Failed to fetch order items", details: itemsError.message },
          { status: 500 }
        )
      );
    }

    // Get product images
    const productIds =
      items?.map((item) => item.product_id).filter(Boolean) || [];
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

    const formattedItems = items?.map((item) => {
      const image = productImages?.find(
        (img) => img.product_id === item.product_id
      );
      return {
        name: item.product_name,
        quantity: item.quantity,
        price: item.price_per_item,
        image: image?.image_url || "",
      };
    });

    const response = {
      orderNumber: order.order_number,
      date: order.order_date,
      totalAmount: Number(order.total_amount),
      paymentMethod: paymentMethodName,
      items: formattedItems,
      shippingAddress: {
        name: order.shipping_recipient_name,
        address: [order.shipping_address_line1, order.shipping_address_line2]
          .filter(Boolean)
          .join(", "),
        city: order.shipping_city,
        postalCode: order.shipping_postal_code,
        province: order.shipping_province,
        country: order.shipping_country,
      },
      estimatedDelivery: "3-5 business days", // You might want to calculate this based on your business logic
    };

    return addCorsHeaders(NextResponse.json(response, { status: 200 }));
  } catch (error) {
    console.error("Order fetch error:", error);
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