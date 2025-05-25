'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"

export default function LogoutMenuItem() {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Error logging out:', error)
    } else {
      router.push('/login')
      router.refresh()
    }
  }

  return (
    <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:bg-red-50">
      Logout
    </DropdownMenuItem>
  )
}
