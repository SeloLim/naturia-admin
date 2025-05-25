// app/api/auth/register/route.ts
import jwt from "jsonwebtoken";
import { supabase } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";

// Define types
interface RegisterRequestBody {
  email: string;
  password: string;
  full_name?: string;
}

interface RegisterResponse {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    email: string;
    role: string;
  };
}

// JWT secret keys (should be in .env)
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET!;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET!;

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

export async function POST(req: NextRequest) {
  try {
    const { email, password, full_name } =
      (await req.json()) as RegisterRequestBody;

    // Validate input
    if (!email || !password) {
      const errorResponse = NextResponse.json({ error: "Email and password are required" });
      return addCorsHeaders(errorResponse);
    }

    // Register with Supabase
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: process.env.EMAIL_CONFIRMATION_REDIRECT as string,
      },
    });

    if (error) {
      console.error("Supabase register error:", error);
      const errorResponse = NextResponse.json({ error: error.message }, { status: 401 });
      return addCorsHeaders(errorResponse);
    }

    if (!data.user) {
      const errorResponse = NextResponse.json(
        { error: "Authentication failed" },
        { status: 401 }
      );
      return addCorsHeaders(errorResponse);
    }

    // Create user profile
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .update({
        full_name: full_name || email.split("@")[0],
        role: "customer",
      })
      .eq("user_id", data.user.id)
      .select()
      .single();

    if (profileError) {
      console.error("Profile update error:", profileError);
      const errorResponse = NextResponse.json(
        { error: `Failed to update profile: ${profileError.message}` },
        { status: 500 }
      );
      return addCorsHeaders(errorResponse);
    }

    // Generate JWT tokens
    const accessToken = jwt.sign(
      { userId: data.user.id, email: data.user.email },
      ACCESS_TOKEN_SECRET,
      { expiresIn: "1h" }
    );

    const refreshToken = jwt.sign(
      { userId: data.user.id },
      REFRESH_TOKEN_SECRET,
      { expiresIn: "7d" }
    );

    // Return tokens and user data
    const response: RegisterResponse = {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: data.user.id,
        email: data.user.email || "",
        role: profileData?.role || "customer",
      },
    };

    const successResponse = NextResponse.json(response, { status: 200 });
    return addCorsHeaders(successResponse);
  } catch (error) {
    console.error("Registration error:", error);
    const errorResponse = NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
    return addCorsHeaders(errorResponse);
  }
}
