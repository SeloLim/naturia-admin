// app/api/payment-methods/[id]/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { z } from "zod";

// Initialize Supabase client (Server-side)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("!!! Supabase environment variables not set. Cannot connect to DB. !!!");
}

const supabase = createClient(supabaseUrl!, supabaseServiceRoleKey!);

// Schema for payment method validation
const updatePaymentMethodSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(50).regex(/^[A-Z0-9_]+$/, {
    message: "Code must contain only uppercase letters, numbers, and underscores"
  }),
  description: z.string().nullable().optional(),
  is_active: z.boolean(),
  display_order: z.number().int().nullable().optional(),
}).partial();

// GET - Fetch a specific payment method
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { message: 'Invalid payment method ID' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // Record not found
        return NextResponse.json(
          { message: 'Payment method not found' },
          { status: 404 }
        );
      }
      
      console.error('Supabase error fetching payment method:', error);
      return NextResponse.json(
        { message: 'Error fetching payment method', error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error: unknown) {
    console.error(`Error in API route /api/payment-methods/[id] (GET):`, error);
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

// PATCH - Update a payment method
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { message: 'Invalid payment method ID' },
        { status: 400 }
      );
    }

    // Check if payment method exists
    const { error: checkError } = await supabase
      .from('payment_methods')
      .select('id')
      .eq('id', id)
      .single();

    if (checkError) {
      if (checkError.code === 'PGRST116') { // Record not found
        return NextResponse.json(
          { message: 'Payment method not found' },
          { status: 404 }
        );
      }
      
      console.error('Supabase error checking payment method:', checkError);
      return NextResponse.json(
        { message: 'Error checking payment method', error: checkError.message },
        { status: 500 }
      );
    }

    const body = await request.json();

    // Validate data using Zod
    const validationResult = updatePaymentMethodSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({
        message: 'Invalid data format',
        errors: validationResult.error.flatten()
      }, { status: 400 });
    }

    const paymentMethodData = validationResult.data;
    
    // Check if code already exists (but allow the same code for the same id)
    const { data: existingCode, error: codeCheckError } = await supabase
      .from('payment_methods')
      .select('id, code')
      .eq('code', paymentMethodData.code)
      .neq('id', id)
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

    // Prepare data for Supabase (handle null values)
    const dataForSupabase = {
      ...paymentMethodData,
      description: paymentMethodData.description === '' ? null : paymentMethodData.description,
    };

    // Update payment method
    const { data, error } = await supabase
      .from('payment_methods')
      .update(dataForSupabase)
      .eq('id', id)
      .select();

    if (error) {
      console.error('Supabase error during UPDATE:', error);
      return NextResponse.json(
        { message: 'Error updating payment method', error: error.message },
        { status: 500 }
      );
    }

    const updatedPaymentMethod = data ? data[0] : null;

    if (!updatedPaymentMethod) {
      console.error('Update successful but Supabase returned no data');
      return NextResponse.json(
        { message: 'Failed to retrieve updated payment method' },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedPaymentMethod, { status: 200 });
  } catch (error: unknown) {
    console.error(`Error in API route /api/payment-methods/[id] (PUT):`, error);
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

// DELETE - Remove a payment method
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { message: 'Invalid payment method ID' },
        { status: 400 }
      );
    }

    // Check if payment method exists
    const { error: checkError } = await supabase
      .from('payment_methods')
      .select('id')
      .eq('id', id)
      .single();

    if (checkError) {
      if (checkError.code === 'PGRST116') { // Record not found
        return NextResponse.json(
          { message: 'Payment method not found' },
          { status: 404 }
        );
      }
      
      console.error('Supabase error checking payment method:', checkError);
      return NextResponse.json(
        { message: 'Error checking payment method', error: checkError.message },
        { status: 500 }
      );
    }

    // Delete payment method
    const { error } = await supabase
      .from('payment_methods')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Supabase error during DELETE:', error);
      return NextResponse.json(
        { message: 'Error deleting payment method', error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Payment method deleted successfully' },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error(`Error in API route /api/payment-methods/[id] (DELETE):`, error);
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