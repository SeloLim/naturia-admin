// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/service";
import jwt from "jsonwebtoken";

interface LoginRequestBody {
  email: string;
  password: string;
}

interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    email: string;
    role: string;
  };
}

const allowedOrigin = process.env.NEXT_PUBLIC_ALLOWED_ORIGIN!;

if (!allowedOrigin) {
  throw new Error("NEXT_PUBLIC_ALLOWED_ORIGIN is not defined");
}

// Helper function to add CORS headers
function addCorsHeaders(response: NextResponse): NextResponse {
  response.headers.set("Access-Control-Allow-Origin", allowedOrigin);
  response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );
  // If your client sends cookies or needs credentials, uncomment the next line
  // response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set("Access-Control-Max-Age", "86400");
  return response;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function OPTIONS(req: NextRequest) {
  const response = new NextResponse(null, { status: 200 });
  addCorsHeaders(response);
  return response;
}

// JWT secret keys (should be in .env)
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET!;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET!;

// Export handler untuk metode POST
export async function POST(req: NextRequest) {
  try {
    const { email, password } = (await req.json()) as LoginRequestBody;

    // Validate input
    if (!email || !password) {
      const errorResponse = NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
      return addCorsHeaders(errorResponse);
    }

    // Login with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("Supabase login error:", error);
      const errorResponse = NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
      return addCorsHeaders(errorResponse);
    }

    if (!data.user) {
      const errorResponse = NextResponse.json(
        { error: "Authentication failed" },
        { status: 401 }
      );
      return addCorsHeaders(errorResponse);
    }

    // Get or create user profile
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", data.user.id)
      .single();

    if (profileError && profileError.code !== "PGRST116") {
      console.error("Profile fetch error:", profileError);
      const errorResponse = NextResponse.json(
        { error: profileError.message },
        { status: 500 }
      );
      return addCorsHeaders(errorResponse);
    }

    if (!profileData) {
      console.log("Creating profile for new user");
      const { error: createProfileError } = await supabase
        .from("profiles")
        .insert({
          user_id: data.user.id,
          full_name: email.split("@")[0],
          role: "customer",
        });

      if (createProfileError) {
        console.error("Create profile error:", createProfileError);
        const errorResponse = NextResponse.json(
          { error: createProfileError.message },
          { status: 500 }
        );
        return addCorsHeaders(errorResponse);
      }
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
    const response: LoginResponse = {
      // Gunakan tipe LoginResponse
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
    console.error("Login error:", error);
    const errorResponse = NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
    return addCorsHeaders(errorResponse);
  }
}
