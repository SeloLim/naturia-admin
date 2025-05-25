import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/service";
import { z } from "zod";

const profileSchema = z.object({
  full_name: z.string().min(1).max(150),
  role: z.string().min(1).max(150),
  phone: z.string().min(1),
  birth_date: z.string(),
  skin_type: z.string().nullable(),
});

type UpdateProfilePayload = z.infer<typeof profileSchema>;

const allowedOrigin =
  process.env.NODE_ENV === "development"
    ? "http://localhost:3001"
    : "YOUR_PRODUCTION_FRONTEND_URL"; // <--- CHANGE THIS IN PRODUCTION!

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function OPTIONS(req: NextRequest) {
  const response = new NextResponse(null, { status: 200 });
  addCorsHeaders(response);
  return response;
}

function addCorsHeaders(response: NextResponse): NextResponse {
  response.headers.set("Access-Control-Allow-Origin", allowedOrigin);
  response.headers.set("Access-Control-Allow-Methods", "PATCH, GET, OPTIONS");
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );
  // response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set("Access-Control-Max-Age", "86400");
  return response;
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const awaitedParams = await params;
  const { id } = awaitedParams;

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (typeof id !== "string" || (!/^\d+$/.test(id) && !uuidRegex.test(id))) {
    const errorResponse = NextResponse.json(
      { message: "ID user tidak valid" },
      { status: 400 }
    );
    return addCorsHeaders(errorResponse);
  }

  const userId = id;
  try {
    const body = await request.json();
    const validationResult = profileSchema.safeParse(body);
    if (!validationResult.success) {
      const errorResponse = NextResponse.json(
        { error: "Data format tidak valid" },
        { status: 400 }
      );
      return addCorsHeaders(errorResponse);
    }

    const profileDataToUpdate: UpdateProfilePayload = validationResult.data;
    const dataForSupabase: Record<string, unknown> = { ...profileDataToUpdate };

    // Update profile data
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .update(dataForSupabase)
      .eq("user_id", userId)
      .single();

    if (profileError) {
      const errorResponse = NextResponse.json(
        { error: profileError.message },
        { status: 500 }
      );
      return addCorsHeaders(errorResponse);
    }

    const successResponse = NextResponse.json(profileData, { status: 200 });
    return addCorsHeaders(successResponse);
  } catch {
    const errorResponse = NextResponse.json(
      { error: "Something went wrong!" },
      { status: 401 }
    );
    return addCorsHeaders(errorResponse);
  }
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const awaitedParams = await params;
  const { id } = awaitedParams;

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (typeof id !== "string" || (!/^\d+$/.test(id) && !uuidRegex.test(id))) {
    const errorResponse = NextResponse.json(
      { message: "ID user tidak valid" },
      { status: 400 }
    );
    return addCorsHeaders(errorResponse);
  }

  try {
    const { data: profileData, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", id)
      .single();

    if (error) {
      const errorResponse = NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
      return addCorsHeaders(errorResponse);
    }

    const successResponse = NextResponse.json(profileData, { status: 200 });
    return addCorsHeaders(successResponse);
  } catch {
    const errorResponse = NextResponse.json(
      { error: "Something went wrong!" },
      { status: 500 }
    );
    return addCorsHeaders(errorResponse);
  }
}