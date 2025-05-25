import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { z } from "zod";

// Define a new Zod schema for creating BOTH user and profile
const createUserAndProfileSchema = z.object({
    email: z.string().email("Invalid email format"), // Email for auth.users
    password: z.string().min(8, "Password must be at least 8 characters long"), // Password for auth.users (updated min length to 8 as per frontend form)
    full_name: z.string().min(1, "Full name is required"), // Make required as per frontend form
    role: z.enum(["admin", "editor", "viewer", "customer"]).optional(), // Optional role for profiles, validated against enum
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Use the service role key as this API needs to interact with auth.admin
// BE CAREFUL: The service role key bypasses RLS and gives full database access.
// Ensure this API route is protected if necessary in your application architecture.
if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error(
        "!!! Supabase environment variables not set. Cannot connect to DB. !!!"
    );
}

// Use the service role key client
const supabase = createClient(supabaseUrl!, supabaseServiceRoleKey!, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
    },
});

// Handler untuk metode POST (CREATE user dan UPDATE profil awal)
export async function POST(request: Request) {
    try {
        const body = await request.json();

        // 1. Validate the incoming data against the combined schema
        const validationResult = createUserAndProfileSchema.safeParse(body);

        if (!validationResult.success) {
            console.error("Validation Error:", validationResult.error.flatten());
            return NextResponse.json(
                {
                    message: "Invalid data format for user and profile creation",
                    errors: validationResult.error.flatten(),
                },
                { status: 400 }
            );
        }

        const { email, password, full_name, role } = validationResult.data;

        // 2. Buat pengguna baru di auth.users
        // Set email_confirm: true untuk otomatis memverifikasi email
        console.log(`Attempting to create user with email: ${email}`);
        const { data: userData, error: userError } =
            await supabase.auth.admin.createUser({
                email: email,
                password: password,
                email_confirm: true, // Otomatis verifikasi email
                // Anda bisa tambahkan user_metadata jika perlu
                // user_metadata: { full_name: full_name, role: role },
            });

        if (userError) {
            console.error("Supabase CREATE USER Error:", userError);
            // Check for specific auth errors, e.g., user already exists
            if (userError.message.includes("Email already registered")) {
                return NextResponse.json(
                    { message: "User with this email already exists" },
                    { status: 409 }
                ); // Conflict
            }
            return NextResponse.json(
                { message: "Error creating user", error: userError.message },
                { status: 500 }
            );
        }

        const userId = userData?.user?.id;

        if (!userId) {
            console.error("User created but no user ID returned.");
            // This case is highly unlikely but added for robustness
            return NextResponse.json(
                { message: "User created successfully but failed to get user ID." },
                { status: 500 }
            );
        }

        // 3. Update profil yang otomatis dibuat oleh trigger
        // Tunggu sebentar? Terkadang trigger perlu sedikit waktu.
        // Atau, coba update langsung dan tangani jika row tidak ditemukan.
        // Update data profil
        const profileUpdates: { full_name: string | null; role?: string } = {
            // full_name dari form input (string kosong akan dikonversi ke null di bawah)
            full_name: full_name === '' ? null : full_name,
        };
        // Tambahkan role jika disediakan di input (override default trigger)
        if (role !== undefined) {
            profileUpdates.role = role;
        } else {
            // Jika role tidak disediakan, pastikan tidak menimpa default 'viewer' dari trigger
            // Sebaiknya hanya kirim role jika memang ingin diubah
        }


        // Lakukan UPDATE ke tabel profiles berdasarkan user_id
        console.log(
            `Attempting to update profile for new user ${userId} with:`,
            profileUpdates
        );
        // Menambahkan retry logic sederhana jika update profil gagal,
        // karena trigger mungkin butuh sedikit waktu untuk membuat row awal.
        let profileUpdateAttempts = 0;
        const maxProfileUpdateAttempts = 5;
        let profileUpdateSuccess = false;
        let profileData = null;
        let profileError = null;

        while(profileUpdateAttempts < maxProfileUpdateAttempts && !profileUpdateSuccess) {
             profileUpdateAttempts++;
             console.log(`Profile update attempt ${profileUpdateAttempts} for user ${userId}`);
             const { data, error } = await supabase
                .from("profiles")
                .update(profileUpdates)
                .eq("user_id", userId) // Cari profil berdasarkan user_id dari user yang baru dibuat
                .select(); // Ambil data profil yang sudah diupdate

            if (error) {
                console.error(`Supabase UPDATE Error (profile, attempt ${profileUpdateAttempts}):`, error);
                profileError = error;
                // Tunggu sebentar sebelum retry
                await new Promise(resolve => setTimeout(resolve, 500 * profileUpdateAttempts)); // Wait longer on each retry
            } else if (!data || data.length === 0) {
                 console.warn(`Profile data not returned on update attempt ${profileUpdateAttempts}. Retrying...`);
                 profileError = { message: 'No profile data returned from update.' };
                 await new Promise(resolve => setTimeout(resolve, 500 * profileUpdateAttempts));
            }
            else {
                profileData = data;
                profileUpdateSuccess = true;
                console.log(`Profile update successful on attempt ${profileUpdateAttempts}.`);
            }
        }


        if (!profileUpdateSuccess || !profileData || profileData.length === 0) {
            console.error(
                "Supabase UPDATE Error (profile after user creation, all attempts failed):",
                profileError
            );
            // WARNING: Pengguna sudah berhasil dibuat di auth.users, tetapi update profil GAGAL.
            // Anda mungkin perlu menghapus pengguna ini atau memiliki proses pembersihan.
            // Untuk saat ini, kita kembalikan error tetapi beri info bahwa user dibuat.
            // Anda bisa menambahkan logika untuk menghapus user yang baru dibuat di sini jika update profile gagal
            // await supabase.auth.admin.deleteUser(userId);
            // console.log(`Cleaned up user ${userId} due to profile update failure.`);

            return NextResponse.json(
                {
                    message:
                        "User created successfully, but failed to update initial profile data.",
                    userId: userId, // Kembalikan user ID yang berhasil dibuat
                    error:
                        profileError?.message || "No profile data returned from update.",
                },
                { status: 500 }
            );
        }

        const newProfile = profileData[0];

        // Gabungkan dengan email dari user data untuk respons frontend jika dibutuhkan
        const finalResponseData = {
            ...newProfile,
            email: userData?.user?.email,
            // Pastikan ID yang dikembalikan adalah ID baris profil, bukan user_id (sesuai interface Profile frontend)
            id: newProfile.id, // ID dari tabel public.profiles
            user_id: userId, // ID dari tabel auth.users
        };


        return NextResponse.json(finalResponseData, { status: 201 }); // Created
    } catch (error: unknown) {
        console.error("Error in API route /api/users (POST):", error);
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

export async function GET() {
  try {
      console.log("Attempting to fetch profiles with emails...");

      // 1. Ambil semua data dari tabel public.profiles
      const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });

      if (profilesError) {
          console.error('Supabase SELECT Error (profiles):', profilesError);
          return NextResponse.json(
              { message: 'Error retrieving profiles', error: profilesError.message },
              { status: 500 }
          );
      }

      // 2. Ambil semua user dari auth.users menggunakan Admin API
      const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();
      if (usersError) {
          console.error('Supabase Admin LIST USERS Error:', usersError);
          return NextResponse.json(
              { message: 'Error retrieving users', error: usersError.message },
              { status: 500 }
          );
      }

      const users = usersData.users;

      // 3. Gabungkan setiap profil dengan email dari auth.users
      const mergedData = profiles.map((profile) => {
          const user = users.find((u) => u.id === profile.user_id);
          return {
              ...profile,
              email: user?.email || null, // Tambahkan email ke objek profil
          };
      });

      console.log(`Successfully merged ${mergedData.length} profiles with user emails.`);
      return NextResponse.json(mergedData, { status: 200 });

  } catch (error: unknown) {
      console.error('Error in API route /api/users (GET):', error);
      let errorMessage = 'Internal server error';
      if (error instanceof Error) {
          errorMessage = error.message;
      }
      return NextResponse.json(
          { message: 'Internal server error', error: errorMessage },
          { status: 500 }
      );
  }
}
