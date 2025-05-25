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

import { CategoryDialog } from "@/components/dialog-category";
import { toast } from "sonner";
import { DeleteCategoryDialog } from "./dialog-delete-category";

interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  productsCount: number;
}

export default function TableCategories() {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<Category | undefined>(
    undefined
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<{
    id: number;
    title?: string;
  } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const openCreateDialog = () => {
    setEditCategory(undefined);
    setDialogOpen(true);
  };

  const openEditDialog = (category: Category) => {
    console.log("Opening Edit Dialog for Category:", category);
    setEditCategory(category);
    setDialogOpen(true);
  };

  const confirmDeleteCategory = (id: number, title?: string) => {
    setCategoryToDelete({ id, title });
    setDeleteDialogOpen(true);
  };

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/categories/${categoryToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.message || `Failed to delete category (${response.status})`
        );
      }

      setCategories((prevCategories) =>
        prevCategories.filter((category) => category.id !== categoryToDelete.id)
      );

      toast("Category deleted", {
        description: `Category ${
          categoryToDelete.title || "untitled"
        } has been deleted successfully.`,
      });

      setDeleteDialogOpen(false);
    } catch (error) {
      console.error("Error deleting category:", error);
      toast("Error", {
        description:
          error instanceof Error ? error.message : "Failed to delete category",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const fetchCategories = useCallback(async () => {
    setIsLoading(true); // Set loading saat fetching
    setError(null); // Clear error sebelumnya

    try {
      const response = await fetch("/api/categories"); // Panggil API GET categories

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch categories");
      }

      const data: Category[] = await response.json();
      // Data dari API sudah diurutkan dan/atau difilter berdasarkan implementasi API GET kamu
      setCategories(data);
      setIsLoading(false);
    } catch (err: unknown) {
      console.error("Error fetching categories:", err);
      let errorMessage = "Failed to load categories";
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      setError(errorMessage);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-button-primary" />
          <p className="text-textColor-primary font-medium">Loading categories...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return <div>Error loading categories: {error}</div>;
  }

  // Filter categories based on search query
  const filteredCategories = categories.filter(
    (category) =>
      category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      category.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      category.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate pagination
  const totalPages = Math.ceil(filteredCategories.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentCategories = filteredCategories.slice(startIndex, endIndex);

  // Handle row selection
  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedCategories([]);
    } else {
      setSelectedCategories(currentCategories.map((category) => category.id));
    }
    setSelectAll(!selectAll);
  };

  const toggleSelectCategory = (categoryId: number) => {
    if (selectedCategories.includes(categoryId)) {
      setSelectedCategories(
        selectedCategories.filter((id) => id !== categoryId)
      );
    } else {
      setSelectedCategories([...selectedCategories, categoryId]);
    }
  };

  // Handler untuk menyimpan kategori baru
  const handleSaveCategory = () => {
    setDialogOpen(false);
    fetchCategories();
  };

  return (
    <div className="flex flex-col gap-4 text-textColor-primary mx-12">
      <h1 className="mt-12 mb-4 font-medium text-5xl font-serif text-textColor-primary">
        Product Categories
      </h1>
      <div className="flex justify-between items-center">
        <div className="relative flex gap-4">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search categories..."
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
            Total {categories.length} categories
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
              <TableHead className="font-medium text-white">SLUG</TableHead>
              <TableHead className="font-medium text-white">
                DESCRIPTION
              </TableHead>
              <TableHead className="font-medium text-white text-center">
                PRODUCTS
              </TableHead>
              <TableHead className="font-medium text-white text-center">
                ACTIONS
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentCategories.map((category) => (
              <TableRow
                key={category.id}
                className="group hover:bg-button-secondary border-textColor-primary hover:text-white"
              >
                <TableCell>
                  <Checkbox
                    checked={selectedCategories.includes(category.id)}
                    onCheckedChange={() => toggleSelectCategory(category.id)}
                  />
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium group-hover:text-white">
                      {category.name}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <p className="text-gray-600 group-hover:text-gray-100">
                    {category.slug}
                  </p>
                </TableCell>
                <TableCell>
                  <p className="text-gray-600 group-hover:text-gray-100 truncate max-w-xs">
                    {category.description}
                  </p>
                </TableCell>
                <TableCell>
                  <p className="text-center">{category.productsCount ?? "0"}</p>
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
                        onClick={() => openEditDialog(category)}
                      >
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-500"
                        onClick={() => confirmDeleteCategory(category.id)}
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
          {selectedCategories.length} of {categories.length} selected
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

      <CategoryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        category={editCategory}
        onSave={handleSaveCategory}
      />

      <DeleteCategoryDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        categoryTitle={categoryToDelete?.title}
        onConfirmDelete={handleDeleteCategory}
        isDeleting={isDeleting}
      />
    </div>
  );
}
