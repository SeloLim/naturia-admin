// app/api/products/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { z } from "zod";

// Schema for image validation
const productImageSchema = z.object({
  id: z.number().optional(),
  image_url: z.string().min(1).url(),
  is_primary: z.boolean().default(false),
});

// Schema for product validation
const productSchema = z.object({
  name: z.string().min(1).max(150),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().nullable().optional(),
  benefits: z.string().nullable().optional(),
  key_ingredients: z.string().nullable().optional(),
  price: z.number().min(0),
  volume_ml: z.number().int().nullable().optional(),
  category_id: z.number().nullable().optional(),
  is_active: z.boolean().default(true),
  stock: z.number().int().min(0).default(0),
  skin_type_id: z.number().nullable().optional(),
  how_to_use: z.string().nullable().optional(),
  product_images: z.array(productImageSchema).min(1, "At least 1 image is required"),
});

// Initialize Supabase client (Server-side)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("!!! Supabase environment variables not set. Cannot connect to DB. !!!");
}

const supabase = createClient(supabaseUrl!, supabaseServiceRoleKey!);

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

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate data using Zod
    const validationResult = productSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        message: 'Validation failed',
        errors: validationResult.error.format()
      }, { status: 400 });
    }

    const productData = validationResult.data;
    const { product_images, ...productToInsert } = productData;

    // Start a transaction
    const { data: newProduct, error: productError } = await supabase
      .from('products')
      .insert([productToInsert])
      .select()
      .single();

    if (productError) {
      return NextResponse.json({ 
        success: false,
        message: 'Database error',
        error: productError.message 
      }, { status: 500 });
    }

    if (!newProduct) {
      return NextResponse.json({ 
        success: false,
        message: 'Failed to create product'
      }, { status: 500 });
    }

    // Handle images
    if (product_images && product_images.length > 0) {
      const productImages = product_images.map(image => ({
        product_id: newProduct.id,
        image_url: image.image_url,
        is_primary: image.is_primary || false
      }));

      await supabase
        .from('product_images')
        .insert(productImages);
    }

    // Return final product with images
    const { data: completeProduct, error: fetchError } = await supabase
      .from('products')
      .select(`
        *,
        product_images (*)
      `)
      .eq('id', newProduct.id)
      .single();

    if (fetchError || !completeProduct) {
      return NextResponse.json({
        success: false,
        message: 'Product created but failed to fetch complete data'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: completeProduct
    }, { status: 201 });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ 
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const slug = url.searchParams.get('slug');
    
    let query = supabase
      .from('products')
      .select(`
        *,
        product_images (*),
        categories:category_id (id, name),
        skin_types:skin_type_id (id, name)
      `);
      
    if (id) {
      query = query.eq('id', id);
    }
    
    if (slug) {
      query = query.eq('slug', slug);
    }
    
    // Handle ordering
    const orderBy = url.searchParams.get('orderBy') || 'created_at';
    const order = url.searchParams.get('order') || 'desc';
    query = query.order(orderBy, { ascending: order === 'asc' });
    
    // Handle active filter
    const activeOnly = url.searchParams.get('activeOnly');
    if (activeOnly === 'true') {
      query = query.eq('is_active', true);
    }
    
    // Handle category filter
    const categoryId = url.searchParams.get('categoryId');
    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }
    
    // Handle skin type filter
    const skinTypeId = url.searchParams.get('skinTypeId');
    if (skinTypeId) {
      query = query.eq('skin_type_id', skinTypeId);
    }
    
    // Execute the query
    const { data, error } = await query;
      
    if (error) {
      console.error('Supabase error during SELECT:', error);
      const errorResponse = NextResponse.json({ 
        message: 'Error retrieving products from database', 
        error: error.message 
      }, { status: 500 });
      return addCorsHeaders(errorResponse);
    }
    
    // Set CORS headers
    const headers = {
      'Access-Control-Allow-Origin': 'http://localhost:3001',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
    
    if ((id || slug) && data && data.length === 1) {
      const successResponse = NextResponse.json(data[0], { status: 200, headers });
      return addCorsHeaders(successResponse);
    }
    
    const successResponse = NextResponse.json(data, { status: 200, headers });
    return addCorsHeaders(successResponse);
    
  } catch (error: unknown) {
    console.error('Error in API route /api/products (GET):', error);
    let errorMessage = 'Internal server error occurred';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    const errorResponse = NextResponse.json({ 
      message: 'Internal server error occurred', 
      error: errorMessage 
    }, { status: 500 });
    return addCorsHeaders(errorResponse);
  }
}