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
});

const allowedOrigin = process.env.NEXT_PUBLIC_ALLOWED_ORIGIN!;

type RouteParams = {
  params: Promise<{ id: string }>;
};

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
  response.headers.set("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS"); // pastikan lengkap
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );
  response.headers.set("Access-Control-Max-Age", "86400");
  return response;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const awaitedParams = await params;
  const { id } = awaitedParams;

  const userId = id;

  try {
    const { data, error } = await supabase
      .from("addresses")
      .select("*")
      .eq('user_id', userId)
      .order("id", { ascending: true });

    if (error) {
      const errorResponse = NextResponse.json(
        {
          message: "Error mengambil data dari database",
          error: error.message,
        },
        { status: 500 }
      );
      return addCorsHeaders(errorResponse);
    }

    if (!data || data.length === 0) {
      const emptyResponse = NextResponse.json([], { status: 200 });
      return addCorsHeaders(emptyResponse);
    }

    const successResponse = NextResponse.json(data, { status: 200 }); 
    return addCorsHeaders(successResponse);
  } catch {
    const errorResponse = NextResponse.json(
      { message: "Terjadi kesalahan server internal"},
      { status: 500 }
    );
    return addCorsHeaders(errorResponse);
  }
}

export async function POST(
  req: NextRequest,
  { params }: RouteParams
) {
  try {
    const awaitedParams = await params;
    const { id } = awaitedParams;
    const body = await req.json();
    const validation = addressSchema.safeParse({ ...body, user_id: id });

    if (!validation.success) {
      const errorResponse = NextResponse.json(
        { error: "Data format tidak valid", detail: validation.error.errors },
        { status: 400 }
      );
      return addCorsHeaders(errorResponse);
    }

    const addressData = validation.data;

    const { data, error } = await supabase
      .from("addresses")
      .insert([addressData])
      .select()
      .single();

    if (error) {
      const errorResponse = NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
      return addCorsHeaders(errorResponse);
    }

    const successResponse = NextResponse.json(data, { status: 201 });
    return addCorsHeaders(successResponse);
  } catch {
    const errorResponse = NextResponse.json(
      { error: "Terjadi kesalahan server internal" },
      { status: 500 }
    );
    return addCorsHeaders(errorResponse);
  }
}

