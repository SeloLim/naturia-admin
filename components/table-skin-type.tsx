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

import { SkinTypeDialog } from "@/components/dialog-skin-type";
import { toast } from "sonner";
import { DeleteSkinTypeDialog } from "./dialog-delete-skin-type";

interface SkinType {
  id: number;
  name: string;
}

export default function TableSkinTypes() {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [selectedSkinTypes, setSelectedSkinTypes] = useState<number[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [skinTypes, setSkinTypes] = useState<SkinType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editSkinType, setEditSkinType] = useState<SkinType | undefined>(
    undefined
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [skinTypeToDelete, setSkinTypeToDelete] = useState<{
    id: number;
    title?: string;
  } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const openCreateDialog = () => {
    setEditSkinType(undefined);
    setDialogOpen(true);
  };

  const openEditDialog = (skinType: SkinType) => {
    console.log("Opening Edit Dialog for Skin Type:", skinType);
    setEditSkinType(skinType);
    setDialogOpen(true);
  };

  const confirmDeleteSkinType = (id: number, title?: string) => {
    setSkinTypeToDelete({ id, title });
    setDeleteDialogOpen(true);
  };

  const handleDeleteSkinType = async () => {
    if (!skinTypeToDelete) return;

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/skin-types/${skinTypeToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.message ||
            `Failed to delete skin type (${response.status})`
        );
      }

      setSkinTypes((prevSkinTypes) =>
        prevSkinTypes.filter((skinType) => skinType.id !== skinTypeToDelete.id)
      );

      toast("Skin type deleted", {
        description: `Skin type ${
          skinTypeToDelete.title || "untitled"
        } has been deleted successfully.`,
      });

      setDeleteDialogOpen(false);
    } catch (error) {
      console.error("Error deleting skin type:", error);
      toast("Error", {
        description:
          error instanceof Error ? error.message : "Failed to delete skin type",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const fetchSkinTypes = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/skin-types");

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch skin types");
      }

      const data: SkinType[] = await response.json();
      setSkinTypes(data);
      setIsLoading(false);
    } catch (err: unknown) {
      console.error("Error fetching skin types:", err);
      let errorMessage = "Failed to load skin types";
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      setError(errorMessage);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSkinTypes();
  }, [fetchSkinTypes]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-button-primary" />
          <p className="text-textColor-primary font-medium">Loading skin types...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return <div>Error loading skin types: {error}</div>;
  }

  // Filter skin types based on search query
  const filteredSkinTypes = skinTypes.filter((skinType) =>
    skinType.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate pagination
  const totalPages = Math.ceil(filteredSkinTypes.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentSkinTypes = filteredSkinTypes.slice(startIndex, endIndex);

  // Handle row selection
  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedSkinTypes([]);
    } else {
      setSelectedSkinTypes(currentSkinTypes.map((skinType) => skinType.id));
    }
    setSelectAll(!selectAll);
  };

  const toggleSelectSkinType = (skinTypeId: number) => {
    if (selectedSkinTypes.includes(skinTypeId)) {
      setSelectedSkinTypes(selectedSkinTypes.filter((id) => id !== skinTypeId));
    } else {
      setSelectedSkinTypes([...selectedSkinTypes, skinTypeId]);
    }
  };

  // Handler for saving new skin type
  const handleSaveSkinType = () => {
    setDialogOpen(false);
    fetchSkinTypes();
  };

  return (
    <div className="flex flex-col gap-4 text-textColor-primary mx-12">
      <h1 className="mt-12 mb-4 font-medium text-5xl font-serif text-textColor-primary">
        Skin Types
      </h1>
      <div className="flex justify-between items-center">
        <div className="relative flex gap-4">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search skin types..."
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
            Total {skinTypes.length} skin types
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
              <TableHead className="font-medium text-white text-right px-6">
                ACTIONS
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentSkinTypes.map((skinType) => (
              <TableRow
                key={skinType.id}
                className="group hover:bg-button-secondary border-textColor-primary hover:text-white"
              >
                <TableCell>
                  <Checkbox
                    checked={selectedSkinTypes.includes(skinType.id)}
                    onCheckedChange={() => toggleSelectSkinType(skinType.id)}
                  />
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium group-hover:text-white">
                      {skinType.name}
                    </p>
                  </div>
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
                        onClick={() => openEditDialog(skinType)}
                      >
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-500"
                        onClick={() =>
                          confirmDeleteSkinType(skinType.id, skinType.name)
                        }
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
          {selectedSkinTypes.length} of {skinTypes.length} selected
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

      <SkinTypeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        skinType={editSkinType}
        onSave={handleSaveSkinType}
      />

      <DeleteSkinTypeDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        skinTypeTitle={skinTypeToDelete?.title}
        onConfirmDelete={handleDeleteSkinType}
        isDeleting={isDeleting}
      />
    </div>
  );
}
