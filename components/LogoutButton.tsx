'use client' // Perlu interaksi client untuk logout

import { createClient } from '@/lib/supabase/client' // Gunakan client-side client
import { useRouter } from 'next/navigation'

export default function LogoutButton() {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Error logging out:', error)
      // Tampilkan notifikasi error jika perlu
    } else {
      // Redirect ke halaman login setelah logout
      router.push('/login')
      router.refresh(); // Penting untuk refresh state server setelah auth berubah
    }
  }

  return (
    <button
      onClick={handleLogout}
      className="py-2 px-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-md shadow focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
    >
      Logout
    </button>
  )
}