import { supabase } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const addressSchema = z.object({
  user_id: z.string(),
  label: z.string().min(1),
  recipient_name: z.string().min(1),
  phone_number: z.string().min(8),
  address_line1: z.string().min(5),
  address_line2: z.string().optional(),
  city: z.string().min(1),
  province: z.string().min(1),
  postal_code: z.string().min(5),
  country: z.string().default("Indonesia"),
  is_default: z.boolean().default(false),
}).partial();

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
  response.headers.set("Access-Control-Allow-Methods", "PATCH,DELETE,OPTIONS"); // pastikan lengkap
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );
  response.headers.set("Access-Control-Max-Age", "86400");
  return response;
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string; address_id: string } }
) {
  try {
    const awaitedParams = await params;
    const { id, address_id } = awaitedParams;

    if (!id || !address_id) {
      return addCorsHeaders(
        NextResponse.json({ error: "Missing parameters" }, { status: 500 })
      );
    }

    const body = await request.json();
    const validation = addressSchema.safeParse(body);

    if (!validation.success) {
      const errorResponse = NextResponse.json(
        { error: "Data format tidak valid", detail: validation.error.errors },
        { status: 400 }
      );
      return addCorsHeaders(errorResponse);
    }

    const { data, error } = await supabase
      .from("addresses")
      .update(body)
      .eq("user_id", id)
      .eq("id", address_id)
      .select()
      .single();

    if (error) {
      return addCorsHeaders(
        NextResponse.json({ error: error.message }, { status: 500 })
      );
    }

    return addCorsHeaders(NextResponse.json(data, { status: 200 }));
  } catch {
    const errorResponse = NextResponse.json(
      { error: "Something went wrong!" },
      { status: 401 }
    );
    return addCorsHeaders(errorResponse);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string; address_id: string } }
) {
  try{
    const awaitedParams = await params;
    const { id, address_id } = awaitedParams;

    if (!id || !address_id) {
      return addCorsHeaders(
        NextResponse.json({ error: "Missing parameters" }, { status: 500 })
      );
    }

    const { error } = await supabase
      .from("addresses")
      .delete()
      .eq("id", address_id);

    if (error) {
      return addCorsHeaders(
        NextResponse.json({ error: error.message }, { status: 500 })
      );
    }

    return addCorsHeaders(NextResponse.json({ success: true }, { status: 200 }));
  }catch{
    const errorResponse = NextResponse.json(
      { error: "Something went wrong!" },
      { status: 401 }
    );
    return addCorsHeaders(errorResponse);
  }
}
