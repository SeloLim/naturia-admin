import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ChevronsUpDown } from "lucide-react"
import LogoutMenuItem from "./LogoutMenuItem";

interface DropdownMenuDemoProps {
  username: string;
  email: string;
}

export function DropdownMenuDemo({ username, email }: DropdownMenuDemoProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
      <Button variant="outline" className="py-8 justify-between w-full">
        <div className="flex items-center">
          <Avatar className="rounded-lg overflow-hidden">
            <AvatarImage src="https://github.com/shadcn.png" className="rounded-lg" />
            <AvatarFallback className="rounded-lg">CN</AvatarFallback>
          </Avatar>

          <div className="flex flex-col justify-start items-start ml-3 text-left">
            <p className="font-semibold leading-none">{username}</p>
            <p className="text-xs text-muted-foreground">{email}</p>
          </div>
        </div>
        <ChevronsUpDown className="ml-4 w-4 h-4 text-muted-foreground" />
      </Button>

      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" side="right" align="end">
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem disabled>
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem disabled>
            Settings
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <LogoutMenuItem />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
