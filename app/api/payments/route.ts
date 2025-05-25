import { supabase } from '@/lib/supabase/service';
import { NextResponse } from 'next/server';


export async function GET() {
  try {
    // Fetch payments with payment method names using a join
    const { data, error } = await supabase
      .from('payments')
      .select(`
        id, 
        order_id, 
        payment_method_id,
        amount,
        status,
        transaction_time,
        paid_at,
        payment_methods(name)
      `)
      .order('transaction_time', { ascending: false });

    if (error) {
      console.error('Supabase error during SELECT:', error);
      return NextResponse.json(
        { message: 'Error fetching payment data from database', error: error.message }, 
        { status: 500 }
      );
    }

    // Transform the data to include payment_method_name
    const transformedData = data.map(payment => ({
      id: payment.id,
      order_id: payment.order_id,
      payment_method_id: payment.payment_method_id,
      payment_method_name: payment.payment_methods?.[0]?.name || 'Unknown',
      amount: payment.amount,
      status: payment.status,
      transaction_time: payment.transaction_time,
      paid_at: payment.paid_at
    }));

    return NextResponse.json(transformedData, { status: 200 });

  } catch (error: unknown) {
    console.error('Error in API route /api/payments (GET):', error);
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