import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { z } from "zod";

const createSkinTypeSchema = z.object({
  name: z.string().min(1).max(150),
});

type CreateSkinTypePayload = z.infer<typeof createSkinTypeSchema>;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error("!!! Variabel lingkungan Supabase tidak disetel. Tidak dapat terhubung ke DB. !!!");
}

const supabase = createClient(supabaseUrl!, supabaseServiceRoleKey!);

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const validationResult = createSkinTypeSchema.safeParse(body);

    if (!validationResult.success) {
        return NextResponse.json({
            message: 'Data format tidak valid',
            errors: validationResult.error.flatten()
        }, { status: 400 });
    }

    const categoryDataToInsert: CreateSkinTypePayload = validationResult.data;

    const dataForSupabase = {
      ...categoryDataToInsert,
    };

    const { data, error } = await supabase
        .from('skin_types')
        .insert([dataForSupabase])
        .select();

    if (error) {
        console.error('Error Supabase saat INSERT:', error);
        return NextResponse.json({ message: 'Error menyimpan data kategori ke database', error: error.message }, { status: 500 });
    }

    const newCategory = data ? data[0] : null;

    if (!newCategory) {
        console.error('Insert berhasil tapi Supabase tidak mengembalikan data.');
        return NextResponse.json({ message: 'Gagal mendapatkan data kategori yang baru dibuat.' }, { status: 500 });
    }
    return NextResponse.json(newCategory, { status: 201 });

  } catch (error: unknown) {
      console.error('Error di API route /api/banners (POST):', error);
      let errorMessage = 'Terjadi kesalahan server internal';
      if (error instanceof Error) {
          errorMessage = error.message;
      }
      return NextResponse.json({ message: 'Terjadi kesalahan server internal', error: errorMessage  }, { status: 500 });
  }
}

export async function GET() {
  try {
      const { data, error } = await supabase
          .from('skin_types')
          .select('*') 
          .order('id', { ascending: true });

      if (error) {
          console.error('Error Supabase saat SELECT:', error);
          // Kirim respons error server jika pengambilan data gagal
          return NextResponse.json({ message: 'Error mengambil data skin types dari database', error: error.message }, { status: 500 });
      }

      return NextResponse.json(data, { status: 200 }); // Sertakan headers dalam respons

  } catch (error: unknown) {
      // Menangkap error lain yang mungkin terjadi
      console.error('Error di API route /api/skin-types (GET):', error);
      let errorMessage = 'Terjadi kesalahan server internal';
      if (error instanceof Error) {
          errorMessage = error.message;
      }
      return NextResponse.json({ message: 'Terjadi kesalahan server internal', error: errorMessage }, { status: 500 });
  }
}