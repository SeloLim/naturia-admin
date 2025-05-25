// src/app/login/page.tsx
'use client' // Komponen ini perlu interaktivitas, jadi 'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation' // Gunakan dari 'next/navigation' di App Router
import { createClient } from '@/lib/supabase/client' // Import client helper

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient() // Buat instance client

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        throw signInError
      }

      // Login berhasil, Supabase secara otomatis menangani sesi/cookie.
      // Middleware akan menangani redirect jika halaman login diakses saat sudah login.
      // Kita bisa redirect secara manual di sini atau biarkan middleware/user navigasi
      router.push('/dashboard') // Redirect ke halaman admin setelah login
      router.refresh(); // Penting untuk refresh state server setelah auth berubah

    } catch (err: unknown) {
      const error = err as Error
      console.error('Error logging in:', error)
      setError(error.message || 'Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white shadow-md rounded-lg w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Admin Login</h1>
        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="you@example.com"
            />
          </div>
          <div className="mb-6">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="••••••••"
            />
          </div>
          {error && (
            <p className="mb-4 text-sm text-red-600 text-center">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md shadow focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
         {/* Tambahkan link/tombol sign up jika diperlukan
         <p className="mt-4 text-center text-sm text-gray-600">
           Don't have an account?{' '}
           <button onClick={handleSignUp} className="font-medium text-indigo-600 hover:text-indigo-500">
             Sign up
           </button>
         </p>
         */}
      </div>
    </div>
  )
}