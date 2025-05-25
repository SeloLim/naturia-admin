import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/service";
import jwt from "jsonwebtoken";

// Define types
interface ProfileResponse {
  id: string;
  email: string;
  full_name: string;
  role: string;
  phone: string;
  skin_type: string;
  birth_date: Date;
}

interface JWTPayload {
  userId: string;
  email?: string;
  iat: number;
  exp: number;
}

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET!;

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
  response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );
  // response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set("Access-Control-Max-Age", "86400");
  return response;
}

export async function GET(req: NextRequest) {
  try {
    // Get authorization header
    const authHeader = req.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      const errorResponse = NextResponse.json(
        { error: "Authorization token required" },
        { status: 401 }
      );
      return addCorsHeaders(errorResponse);
    }

    const token = authHeader.split(" ")[1];

    try {
      // Verify token
      const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET) as JWTPayload;

      // Get user data
      const { data: userData, error: userError } =
        await supabase.auth.admin.getUserById(decoded.userId);

      if (userError || !userData.user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      // Get profile data
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", decoded.userId)
        .single();

      if (profileError) {
        const errorResponse = NextResponse.json(
          { error: profileError.message },
          { status: 500 }
        );
        return addCorsHeaders(errorResponse);
      }

      // Return user profile data
      const response: ProfileResponse = {
        id: userData.user.id,
        email: userData.user.email || "",
        full_name: profileData?.full_name || "",
        role: profileData?.role || "customer",
        phone: profileData?.phone || "",
        skin_type: profileData?.skin_type || "",
        birth_date: profileData?.birth_date || ""
      };

      const successResponse = NextResponse.json(response, { status: 200 });
      return addCorsHeaders(successResponse);
    } catch {
      const errorResponse = NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
      return addCorsHeaders(errorResponse);
    }
  } catch (error) {
    console.error("Profile error:", error);
    const errorResponse = NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
    return addCorsHeaders(errorResponse);
  }
}
