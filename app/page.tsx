// src/app/page.tsx
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server'; // Bisa cek status user juga di sini
import LogoutButton from '@/components/LogoutButton';

export default async function HomePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-8">Welcome to the App</h1>
      <div className="flex space-x-4">
        {user ? (
          <>
            <Link href="/dashboard" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              Go to Admin
            </Link>
             <LogoutButton />
          </>
        ) : (
          <Link href="/login" className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
            Admin Login
          </Link>
        )}
      </div>
       <p className="mt-6 text-gray-600">
          Current User: {user ? user.email : 'Not logged in'}
        </p>
    </main>
  );
}