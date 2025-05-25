import { createClient } from "@/lib/supabase/server"; // Gunakan server client di Server Component

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar"
import { DropdownMenuDemo } from "./sidebar-footer"
import { Logo } from "./icons";
import NextLink from "next/link";
import SideBarMenuGroup from "./sidebar-menu";

export async function AppSidebar() {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user?.id)
    .single();

  return (
    <Sidebar className="w-64 bg-white border-r shadow-sm min-h-screen">
      <SidebarContent className="flex flex-col justify-between h-full">
        <SidebarHeader className="mt-4">
          <NextLink
            className="flex justify-center items-center text-2xl font-bold text-logo-primary"
            href="/dashboard"
          >
            <Logo />
            <p>ATURIA</p>
          </NextLink>
        </SidebarHeader>
        <SideBarMenuGroup />
        <SidebarFooter className="border-t mt-auto px-4 py-4">
          <DropdownMenuDemo
            username={profile.full_name}
            email={user?.email ?? "You not logged in"}
          />
        </SidebarFooter>
      </SidebarContent>
    </Sidebar>

  )
}
