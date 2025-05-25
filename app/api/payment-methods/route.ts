import { supabase } from '@/lib/supabase/service';
import { NextResponse } from 'next/server';
import { z } from "zod";

// Schema for payment method validation
const paymentMethodSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(50).regex(/^[A-Z0-9_]+$/, {
    message: "Code must contain only uppercase letters, numbers, and underscores"
  }),
  description: z.string().nullable().optional(),
  is_active: z.boolean().default(true),
  display_order: z.number().int().nullable().optional(),
});

type PaymentMethodPayload = z.infer<typeof paymentMethodSchema>;

const allowedOrigin =
  process.env.NODE_ENV === "development"
    ? "http://localhost:3001"
    : "YOUR_PRODUCTION_FRONTEND_URL"; // Ganti di production

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
  const response = new NextResponse(null, { status: 200 });
  return addCorsHeaders(response);
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('payment_methods')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Supabase error during SELECT:', error);
      return addCorsHeaders(
        NextResponse.json(
          { message: 'Error fetching payment methods', error: error.message },
          { status: 500 }
        )
      );
    }

    return addCorsHeaders(NextResponse.json(data, { status: 200 }));
  } catch (error: unknown) {
    console.error('Error in API route /api/payment-methods (GET):', error);
    let errorMessage = 'Internal server error occurred';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return addCorsHeaders(
      NextResponse.json(
        { message: 'Internal server error occurred', error: errorMessage },
        { status: 500 }
      )
    );
  }
}

// POST - Create a new payment method
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate data using Zod
    const validationResult = paymentMethodSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({
        message: 'Invalid data format',
        errors: validationResult.error.flatten()
      }, { status: 400 });
    }

    const paymentMethodData: PaymentMethodPayload = validationResult.data;

    // Prepare data for Supabase (handle null values)
    const dataForSupabase = {
      ...paymentMethodData,
      description: paymentMethodData.description === '' ? null : paymentMethodData.description,
    };

    // Check if code already exists
    const { data: existingCode, error: codeCheckError } = await supabase
      .from('payment_methods')
      .select('code')
      .eq('code', dataForSupabase.code)
      .single();

    if (codeCheckError && codeCheckError.code !== 'PGRST116') { // PGRST116 is "not found" which is what we want
      console.error('Error checking for existing code:', codeCheckError);
      return NextResponse.json(
        { message: 'Error checking for existing payment method code', error: codeCheckError.message },
        { status: 500 }
      );
    }

    if (existingCode) {
      return NextResponse.json(
        { message: 'Payment method code already exists' },
        { status: 409 }
      );
    }

    // Insert new payment method
    const { data, error } = await supabase
      .from('payment_methods')
      .insert([dataForSupabase])
      .select();

    if (error) {
      console.error('Supabase error during INSERT:', error);
      return NextResponse.json(
        { message: 'Error saving payment method to database', error: error.message },
        { status: 500 }
      );
    }

    const newPaymentMethod = data ? data[0] : null;

    if (!newPaymentMethod) {
      console.error('Insert successful but Supabase returned no data');
      return NextResponse.json(
        { message: 'Failed to retrieve newly created payment method' },
        { status: 500 }
      );
    }

    // Return created payment method with 201 status
    return NextResponse.json(newPaymentMethod, { status: 201 });
  } catch (error: unknown) {
    console.error('Error in API route /api/payment-methods (POST):', error);
    let errorMessage = 'Internal server error occurred';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json(
      { message: 'Internal server error occurred', error: errorMessage },
      { status: 500 }
    );
  }
}