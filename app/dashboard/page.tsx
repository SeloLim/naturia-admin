// src/app/admin/page.tsx
import { createClient } from "@/lib/supabase/server"; // Gunakan server client di Server Component
import { redirect } from "next/navigation";
import LogoutButton from "@/components/LogoutButton"; // Kita akan buat ini

export default async function AdminPage() {
  const supabase = createClient(); // Buat instance server client

  // Cek sesi user di sisi server
  const { data: { user } } = await supabase.auth.getUser();

  // Jika tidak ada user, redirect ke login (meskipun middleware seharusnya sudah menangani ini)
  // Ini adalah lapisan keamanan tambahan di level halaman
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <LogoutButton />
      </div>
      <div className="bg-white p-6 rounded-lg shadow">
        <p className="text-lg mb-4">Welcome, <span className="font-semibold">{user.email}</span>!</p>
        <p>This is a protected admin area.</p>
        {/* Tambahkan konten admin lainnya di sini */}
      </div>
    </div>
  );
}