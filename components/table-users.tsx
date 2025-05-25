"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  MoreVertical,
  Plus,
  Search,
  Loader2,
} from "lucide-react";

import { ProfileDialog } from "@/components/dialog-profile";
import { toast } from "sonner";
import { DeleteProfileDialog } from "./dialog-delete-profile";

interface Profile {
  id: string; // uuid
  user_id: string; // uuid
  full_name: string | null;
  role: "admin" | "editor" | "viewer" | "customer";
  created_at: string;
  updated_at: string;
}

export default function TableUsers() {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [selectedProfiles, setSelectedProfiles] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editProfile, setEditProfile] = useState<Profile | undefined>(
    undefined
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [profileToDelete, setProfileToDelete] = useState<{
    id: string;
    name?: string;
  } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const openCreateDialog = () => {
    setEditProfile(undefined);
    setDialogOpen(true);
  };

  const openEditDialog = (profile: Profile) => {
    console.log("Opening Edit Dialog for Profile:", profile);
    setEditProfile(profile);
    setDialogOpen(true);
  };

  const confirmDeleteProfile = (id: string, name?: string) => {
    setProfileToDelete({ id, name });
    setDeleteDialogOpen(true);
  };

  const handleDeleteProfile = async () => {
    if (!profileToDelete) return;

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/users/${profileToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.message || `Failed to delete profile (${response.status})`
        );
      }

      setProfiles((prevProfiles) =>
        prevProfiles.filter((profile) => profile.id !== profileToDelete.id)
      );

      toast("Profile deleted", {
        description: `Profile ${
          profileToDelete.name || "unnamed"
        } has been deleted successfully.`,
      });

      setDeleteDialogOpen(false);
    } catch (error) {
      console.error("Error deleting profile:", error);
      toast("Error", {
        description:
          error instanceof Error ? error.message : "Failed to delete profile",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const fetchProfiles = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/users");

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch profiles");
      }

      const data: Profile[] = await response.json();
      setProfiles(data);
      setIsLoading(false);
    } catch (err: unknown) {
      console.error("Error fetching profiles:", err);
      let errorMessage = "Failed to load profiles";
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      setError(errorMessage);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-button-primary" />
          <p className="text-textColor-primary font-medium">Loading profiles...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return <div>Error loading profiles: {error}</div>;
  }

  // Filter profiles based on search query
  const filteredProfiles = profiles.filter(
    (profile) =>
      (profile.full_name && profile.full_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      profile.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate pagination
  const totalPages = Math.ceil(filteredProfiles.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentProfiles = filteredProfiles.slice(startIndex, endIndex);

  // Handle row selection
  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedProfiles([]);
    } else {
      setSelectedProfiles(currentProfiles.map((profile) => profile.id));
    }
    setSelectAll(!selectAll);
  };

  const toggleSelectProfile = (profileId: string) => {
    if (selectedProfiles.includes(profileId)) {
      setSelectedProfiles(
        selectedProfiles.filter((id) => id !== profileId)
      );
    } else {
      setSelectedProfiles([...selectedProfiles, profileId]);
    }
  };

  // Handler for saving a new or edited profile
  const handleSaveProfile = () => {
    setDialogOpen(false);
    fetchProfiles();
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="flex flex-col gap-4 text-textColor-primary mx-12">
      <h1 className="mt-12 mb-4 font-medium text-5xl font-serif text-textColor-primary">
        Users
      </h1>
      <div className="flex justify-between items-center">
        <div className="relative flex gap-4">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 border-textColor-primary text-textColor-primary w-80
                       focus-visible:ring-button-secondary focus-visible:border-button-secondary"
          />
          <Button className="text-white bg-button-primary hover:bg-button-secondary hover:text-textColor-primary cursor-pointer">
            Search
          </Button>
        </div>

        <div className="flex gap-2">
          <Button
            className="text-white bg-button-primary hover:bg-button-secondary hover:text-textColor-primary cursor-pointer"
            onClick={openCreateDialog}
          >
            Add New <Plus className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-sm">
            Total {profiles.length} profiles
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-sm">Rows per page:</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="border-textColor-primary">
                {rowsPerPage} <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setRowsPerPage(5)}>
                5
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setRowsPerPage(10)}>
                10
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setRowsPerPage(20)}>
                20
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="border border-textColor-primary rounded-lg overflow-hidden">
        <Table>
          <TableHeader className="bg-button-primary">
            <TableRow className="hover:bg-button-secondary border-textColor-primary">
              <TableHead className="w-12">
                <Checkbox
                  checked={selectAll}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead className="font-medium text-white">NAME</TableHead>
              <TableHead className="font-medium text-white">USER ID</TableHead>
              <TableHead className="font-medium text-white">
                ROLE
              </TableHead>
              <TableHead className="font-medium text-white">
                CREATED AT
              </TableHead>
              <TableHead className="font-medium text-white">
                UPDATED AT
              </TableHead>
              <TableHead className="font-medium text-white text-center">
                ACTIONS
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentProfiles.map((profile) => (
              <TableRow
                key={profile.id}
                className="group hover:bg-button-secondary border-textColor-primary hover:text-white"
              >
                <TableCell>
                  <Checkbox
                    checked={selectedProfiles.includes(profile.id)}
                    onCheckedChange={() => toggleSelectProfile(profile.id)}
                  />
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium group-hover:text-white">
                      {profile.full_name || "Unnamed"}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <p className="text-gray-600 group-hover:text-gray-100">
                    {profile.user_id}
                  </p>
                </TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    profile.role === 'admin' ? 'bg-red-100 text-red-800 group-hover:bg-red-200' : 
                    profile.role === 'editor' ? 'bg-blue-100 text-blue-800 group-hover:bg-blue-200' : 
                    profile.role === 'customer' ? 'bg-purple-100 text-purple-800 group-hover:bg-purple-200' :
                    'bg-green-100 text-green-800 group-hover:bg-green-200'
                  }`}>
                    {profile.role}
                  </span>
                </TableCell>
                <TableCell>
                  <p className="text-gray-600 group-hover:text-gray-100">
                    {formatDate(profile.created_at)}
                  </p>
                </TableCell>
                <TableCell>
                  <p className="text-gray-600 group-hover:text-gray-100">
                    {formatDate(profile.updated_at)}
                  </p>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="h-8 w-8 p-0 justify-end hover:bg-transparent hover:text-inherit hover:border-none focus-visible:ring-0 focus-visible:ring-offset-0"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => openEditDialog(profile)}
                      >
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-500"
                        onClick={() => confirmDeleteProfile(profile.id, profile.full_name || undefined)}
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-between items-center">
        <p className="text-gray-400 text-sm">
          {selectedProfiles.length} of {profiles.length} selected
        </p>

        <div className="flex bg-button-primary rounded-lg">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="rounded-r-none bg-button-primary border-none hover:bg-button-secondary text-white"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <Button
              key={page}
              variant={page === currentPage ? "default" : "outline"}
              className={
                page === currentPage
                  ? "rounded-lg bg-button-secondary hover:bg-button-secondary border-none text-textColor-primary"
                  : "rounded-none bg-button-primary border-none text-white hover:bg-button-secondary"
              }
              onClick={() => setCurrentPage(page)}
            >
              {page}
            </Button>
          ))}

          <Button
            variant="outline"
            size="icon"
            onClick={() =>
              setCurrentPage(Math.min(totalPages, currentPage + 1))
            }
            disabled={currentPage === totalPages}
            className="rounded-l-none bg-button-primary border-none hover:bg-button-secondary text-white"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="bg-button-primary hover:bg-button-secondary border-none text-white"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            className="bg-button-primary hover:bg-button-secondary border-none text-white hover:text-textColor-primary"
            onClick={() =>
              setCurrentPage(Math.min(totalPages, currentPage + 1))
            }
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      </div>

      <ProfileDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        profile={editProfile}
        onSave={handleSaveProfile}
      />

      <DeleteProfileDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        profileName={profileToDelete?.name}
        onConfirmDelete={handleDeleteProfile}
        isDeleting={isDeleting}
      />
    </div>
  );
}