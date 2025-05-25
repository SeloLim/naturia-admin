import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

interface RefreshTokenRequestBody {
  refresh_token: string;
}

interface RefreshTokenResponse {
  access_token: string;
}

interface RefreshTokenPayload {
  userId: string;
  iat: number;
  exp: number;
}

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
    const { refresh_token } = (await req.json()) as RefreshTokenRequestBody;

    if (!refresh_token) {
      const errorResponse = NextResponse.json(
        { error: "Refresh token is required" },
        { status: 400 }
      );
      return addCorsHeaders(errorResponse);
    }

    try {
      const decoded = jwt.verify(
        refresh_token,
        REFRESH_TOKEN_SECRET
      ) as RefreshTokenPayload;

      // Generate new access token
      const accessToken = jwt.sign(
        { userId: decoded.userId },
        ACCESS_TOKEN_SECRET,
        { expiresIn: "1h" }
      );

      const response: RefreshTokenResponse = {
        access_token: accessToken,
      };

      const successResponse = NextResponse.json(response, { status: 200 });
      return addCorsHeaders(successResponse);
    } catch {
      const errorResponse = NextResponse.json(
        { error: "Invalid or expired refresh token" },
        { status: 401 }
      );
      return addCorsHeaders(errorResponse);
    }
  } catch (error) {
    console.error("Refresh token error:", error);
    const errorResponse = NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
    return addCorsHeaders(errorResponse);
  }
}
