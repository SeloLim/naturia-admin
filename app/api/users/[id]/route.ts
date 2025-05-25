// app/api/users/[id]/route.ts
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { z } from "zod";

// Schema validasi untuk payload update (PATCH)
// Semua field opsional karena Anda mungkin hanya ingin mengupdate satu field
const updateProfileSchema = z.object({
  email: z.string().email("Invalid email format").optional(), // Email opsional untuk update
  // Password opsional, boleh string kosong jika tidak ingin diubah
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .optional()
    .or(z.literal("")),
  // full_name optional, string kosong akan dikonversi ke null di bawah
  full_name: z
    .string()
    .min(1, "Full name cannot be empty")
    .nullable()
    .optional(),
  // role optional, harus salah satu dari enum jika disediakan
  role: z.enum(["admin", "editor", "viewer", "customer"]).optional(),
});

// Tipe data berdasarkan skema update
type UpdateProfilePayload = z.infer<typeof updateProfileSchema>;

type RouteParams = {
  params: Promise<{ id: string }>;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error(
    "!!! Supabase environment variables not set. Cannot connect to DB. !!!"
  );
}

// Gunakan client service role
const supabase = createClient(supabaseUrl!, supabaseServiceRoleKey!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

// Handler untuk metode PATCH (UPDATE)
export async function PATCH(request: Request, { params }: RouteParams) {
  const awaitedParams = await params;
  const { id } = awaitedParams;

  if (!id) {
    return NextResponse.json(
      { message: "User ID is required" },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();

    // Validasi data input
    const validationResult = updateProfileSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          message: "Invalid data format for profile update",
          errors: validationResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const updateData: UpdateProfilePayload = validationResult.data;

    // Object untuk menampung update data ke tabel profiles
    const profileUpdates: { [key: string]: unknown } = {};
    // Object untuk menampung update data ke auth.users
    const authUpdates: { [key: string]: unknown } = {};

    // --- Siapkan Update untuk public.profiles ---
    // Tambahkan full_name hanya jika disediakan di payload
    if (updateData.full_name !== undefined) {
      // Konversi string kosong menjadi null untuk full_name
      profileUpdates.full_name =
        updateData.full_name === "" ? null : updateData.full_name;
    }

    // Tambahkan role hanya jika disediakan di payload
    if (updateData.role !== undefined) {
      profileUpdates.role = updateData.role;
    }

    let profileUpdateError = null;
    let updatedProfileData = null;

    // Lakukan UPDATE ke tabel profiles jika ada data untuk diupdate
    if (Object.keys(profileUpdates).length > 0) {
      console.log(`Updating profile for user ${id} with:`, profileUpdates);
      const { data, error } = await supabase
        .from("profiles")
        .update(profileUpdates)
        .eq("user_id", id) // Cari berdasarkan user_id
        .select(); // Ambil data profil yang sudah diupdate

      if (error) {
        console.error("Supabase UPDATE Error (profiles):", error);
        profileUpdateError = error;
      } else {
        updatedProfileData = data ? data[0] : null;
        if (!updatedProfileData) {
          // Ini bisa terjadi jika profile dengan user_id tersebut tidak ditemukan
          // (walaupun trigger seharusnya menjamin ada)
          console.warn(`Profile with user_id ${id} not found for update.`);
          profileUpdateError = {
            message: `Profile not found for user ID ${id}`,
          }; // Error custom
        }
      }
    } else {
      console.log(`No profile data to update for user ${id}.`);
      // Jika tidak ada data profil untuk diupdate, kita tetap perlu mengambil data profil saat ini
      // agar bisa mengembalikannya di akhir respons, atau mendapatkan email jika update auth berhasil
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", id)
        .single();
      if (error) {
        console.error(
          "Supabase SELECT Error (profiles, after no updates):",
          error
        );
        profileUpdateError = error; // Gunakan error select sebagai profile error
      } else {
        updatedProfileData = data;
      }
    }

    // --- Siapkan Update untuk auth.users (email dan password) ---
    let authUpdateError = null;
    let updatedAuthData = null;

    // Tambahkan email hanya jika disediakan
    if (updateData.email !== undefined && updateData.email !== "") {
      // Cek juga bukan string kosong
      authUpdates.email = updateData.email;
    }

    // Tambahkan password hanya jika disediakan dan tidak kosong
    if (updateData.password !== undefined && updateData.password !== "") {
      authUpdates.password = updateData.password;
    }

    // Lakukan UPDATE ke auth.users jika ada data untuk diupdate
    if (Object.keys(authUpdates).length > 0) {
      console.log(`Updating auth for user ${id} with:`, authUpdates);
      // Menggunakan updateById dari auth.admin
      const { data: authData, error: authError } =
        await supabase.auth.admin.updateUserById(id, authUpdates);

      if (authError) {
        console.error("Supabase UPDATE Error (auth.users):", authError);
        authUpdateError = authError;
      } else {
        updatedAuthData = authData?.user;
      }
    } else {
      console.log(`No auth data to update for user ${id}.`);
      // Jika tidak ada update auth, ambil data user saat ini untuk mendapatkan email terbaru
      const { data: authData, error: authError } =
        await supabase.auth.admin.getUserById(id);
      if (authError) {
        console.error(
          "Supabase GET Error (auth.users, after no auth updates):",
          authError
        );
        authUpdateError = authError; // Gunakan error get sebagai auth error
      } else {
        updatedAuthData = authData?.user;
      }
    }

    // --- Cek dan Respon Hasil Akhir ---
    // Jika ada error saat update profil ATAU update auth
    if (profileUpdateError || authUpdateError) {
      // Catat error apa yang terjadi
      let errorMessage = "Error updating user or profile.";
      if (profileUpdateError)
        errorMessage += ` Profile update error: ${profileUpdateError.message}`;
      if (authUpdateError)
        errorMessage += ` Auth update error: ${authUpdateError.message}`;
      console.error("Final Update Transaction Error:", errorMessage);

      // WARNING: Ini bisa meninggalkan data dalam keadaan tidak konsisten
      // (misalnya, profile berhasil diupdate tapi auth gagal atau sebaliknya)
      // Penanganan error yang lebih baik mungkin diperlukan untuk kasus produksi.

      // Kembalikan status 500 atau 400 tergantung jenis error
      // Untuk email duplikat atau password lemah, mungkin 400 atau 409
      if (
        (authUpdateError &&
          authUpdateError.message.includes("duplicate key value")) ||
        (authUpdateError &&
          authUpdateError.message.includes("Email already registered"))
      ) {
        return NextResponse.json(
          {
            message: "User with this email already exists",
            error: authUpdateError.message,
          },
          { status: 409 }
        ); // Conflict
      }
      if (
        authUpdateError &&
        authUpdateError.message.includes("Password should be at least")
      ) {
        return NextResponse.json(
          { message: authUpdateError.message, error: authUpdateError.message },
          { status: 400 }
        ); // Bad Request
      }

      return NextResponse.json(
        {
          message: "Failed to update user or profile.",
          profileError: profileUpdateError?.message,
          authError: authUpdateError?.message,
          // Optionally include partial data if one part succeeded
          updatedProfile: updatedProfileData,
          updatedAuth: updatedAuthData
            ? { id: updatedAuthData.id, email: updatedAuthData.email }
            : null,
        },
        { status: 500 }
      );
    }

    // Jika sukses, gabungkan data profil dan email untuk respons
    const finalProfileData = {
      ...updatedProfileData,
      email: updatedAuthData?.email || updatedProfileData?.email, // Ambil email dari auth data jika ada
      // Pastikan ID yang dikembalikan adalah ID baris profil, bukan user_id (sesuai interface Profile frontend)
      id: updatedProfileData?.id, // ID dari tabel public.profiles
      user_id: updatedAuthData?.id, // ID dari tabel auth.users
    };

    return NextResponse.json(finalProfileData, { status: 200 }); // OK
  } catch (error: unknown) {
    console.error("Error in API route /api/users/[id] (PATCH):", error);
    let errorMessage = "Internal server error";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json(
      { message: "Internal server error", error: errorMessage },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  // Mengubah nama parameter dari id menjadi profileId
  { params }: RouteParams // Tetap gunakan id di sini karena nama folder [id]
) {
  const awaitedParams = await params;
  const { id } = awaitedParams;

  if (!id) {
    return NextResponse.json(
      { message: "Profile ID is required" },
      { status: 400 }
    );
  }

  try {
    // 1. Cari user_id di tabel public.profiles berdasarkan profileId
    console.log(`Attempting to find user_id for profile ID: ${id}`);
    const { data: profileData, error: findProfileError } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("id", id) // Cari berdasarkan ID profil
      .single(); // Ambil satu baris

    if (findProfileError || !profileData) {
      console.error(
        "Supabase SELECT Error (profiles - find user_id):",
        findProfileError
      );
      let errorMessage = `Profile with ID ${id} not found.`;
      if (findProfileError) {
        errorMessage = findProfileError.message; // Gunakan pesan error Supabase jika ada
      }
      return NextResponse.json({ message: errorMessage }, { status: 404 }); // Not Found
    }

    const idToDelete = profileData.user_id;
    console.log(
      `Found user_id ${idToDelete} for profile ID ${id}. Proceeding to delete user.`
    );

    // 2. Menggunakan admin client untuk menghapus user dari auth.users berdasarkan user_id
    // Penghapusan user di auth.users biasanya akan memicu trigger
    // di Supabase untuk menghapus data terkait di tabel public.profiles
    // jika Anda sudah mengaturnya.
    const { data: deleteUserData, error: deleteUserError } =
      await supabase.auth.admin.deleteUser(idToDelete);

    if (deleteUserError) {
      console.error("Supabase DELETE Error (auth.users):", deleteUserError);
      let errorMessage = "Failed to delete user.";
      // Handle specific Supabase errors, e.g., user not found in auth.users (shouldn't happen if profile exists)
      if (deleteUserError.message.includes("User not found")) {
        errorMessage = `User with ID ${idToDelete} not found in authentication system.`;
        return NextResponse.json(
          { message: errorMessage, error: deleteUserError.message },
          { status: 404 }
        ); // Not Found
      }
      return NextResponse.json(
        { message: errorMessage, error: deleteUserError.message },
        { status: 500 }
      ); // Internal Server Error
    }

    console.log(
      `User successfully deleted with ID: ${idToDelete}`,
      deleteUserData
    );

    // Jika penghapusan dari auth.users berhasil, asumsikan trigger
    // untuk profiles juga berhasil atau akan berjalan.
    // Mengembalikan respons sukses.
    return NextResponse.json(
      {
        message: `User with ID ${idToDelete} (profile ID ${id}) deleted successfully.`,
      },
      { status: 200 }
    ); // OK
  } catch (error: unknown) {
    console.error("Error in API route /api/users/[id] (DELETE):", error);
    let errorMessage = "Internal server error";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json(
      { message: "Internal server error", error: errorMessage },
      { status: 500 }
    );
  }
}
