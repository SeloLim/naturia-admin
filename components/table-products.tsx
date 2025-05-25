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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  MoreVertical,
  Plus,
  Search,
  Loader2,
  ListTree,
  Droplets,
} from "lucide-react";
import { ProductDialog } from "./dialog-product";
import { toast } from "sonner";
import { DeleteProductDialog } from "./dialog-delete-products";

interface Category {
  id: number;
  name: string;
}

interface SkinType {
  id: number;
  name: string;
}

interface Images {
  id: number;
  image_url: string;
  is_primary: boolean;
}

interface Product {
  id: number;
  name: string;
  slug: string;
  description: string;
  benefits: string;
  key_ingredients: string;
  skin_types: SkinType;
  how_to_use: string;
  price: number;
  volume_ml: number;
  categories: Category;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  product_images: Images[];
  stock: number;
}

export default function TableProducts() {
  // State variables
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<number | null>(null);
  const [skinTypeFilter, setSkinTypeFilter] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<boolean | null>(null);
  const [productToDelete, setProductToDelete] = useState<{
    id: number;
    title?: string;
  } | null>(null);
  const [editProduct, setEditProduct] = useState<Product | undefined>(
    undefined
  );

  // API data state
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [skinTypes, setSkinTypes] = useState<SkinType[]>([]);

  const openCreateDialog = () => {
    setEditProduct(undefined);
    setDialogOpen(true);
  };

  const openEditDialog = (product: Product) => {
    console.log("Opening Edit Dialog for Skin Type:", product);
    setEditProduct(product);
    setDialogOpen(true);
  };

  const confirmDeleteProduct = (id: number, title?: string) => {
    setProductToDelete({ id, title });
    setDeleteDialogOpen(true);
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/products/${productToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.message ||
            `Failed to delete product (${response.status})`
        );
      }

      setProducts((prevProduct) =>
        prevProduct.filter((product) => product.id !== productToDelete.id)
      );

      toast("Product deleted", {
        description: `Product ${
          productToDelete.title || "untitled"
        } has been deleted successfully.`,
      });

      setDeleteDialogOpen(false);
    } catch (error) {
      console.error("Error deleting product:", error);
      toast("Error", {
        description:
          error instanceof Error ? error.message : "Failed to delete product",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Fetch data from APIs
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch categories
      const categoriesResponse = await fetch("/api/categories");
      const categoriesData = await categoriesResponse.json();
      setCategories(categoriesData);

      // Fetch skin types
      const skinTypesResponse = await fetch("/api/skin-types");
      const skinTypesData = await skinTypesResponse.json();
      setSkinTypes(skinTypesData);

      // Fetch products
      const productsResponse = await fetch("/api/products");
      const productsData = await productsResponse.json();
      console.log("Products fetched:", productsData);
      setProducts(productsData);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Filter products based on search query and filters
  const filteredProducts = products.filter((product) => {
    // Text search
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase());

    // Category filter
    const matchesCategory =
      categoryFilter === null || product.categories.id === categoryFilter;

    // Skin type filter
    const matchesSkinType =
      skinTypeFilter === null || product.skin_types.id === skinTypeFilter;

    // Status filter
    const matchesStatus =
      statusFilter === null || product.is_active === statusFilter;

    return matchesSearch && matchesCategory && matchesSkinType && matchesStatus;
  });

  // Calculate pagination
  const totalPages = Math.ceil(filteredProducts.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);

  // Handle row selection
  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(currentProducts.map((product) => product.id));
    }
    setSelectAll(!selectAll);
  };

  const toggleSelectProduct = (productId: number) => {
    if (selectedProducts.includes(productId)) {
      setSelectedProducts(selectedProducts.filter((id) => id !== productId));
    } else {
      setSelectedProducts([...selectedProducts, productId]);
    }
  };

  // Format price to currency
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price * 1);
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // Reset all filters
  const resetFilters = () => {
    setCategoryFilter(null);
    setSkinTypeFilter(null);
    setStatusFilter(null);
    setSearchQuery("");
  };

  // Handler untuk menyimpan kategori baru
  const handleSaveProduct = () => {
    setDialogOpen(false);
    fetchProducts()
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-button-primary" />
          <p className="text-textColor-primary font-medium">
            Loading products...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 text-textColor-primary mx-12">
      <h1 className="mt-12 mb-4 font-medium text-5xl font-serif text-textColor-primary">
        Products
      </h1>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div className="relative flex gap-4">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search products..."
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

        {/* Filters */}
        <div className="flex gap-4 items-center">
          <span className="text-gray-500">Filters:</span>

          {/* Category Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="border-textColor-primary">
                <ListTree className="mr-2 h-4 w-4" />
                {categoryFilter === null
                  ? "All Categories"
                  : categories.find((c) => c.id === categoryFilter)?.name}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setCategoryFilter(null)}>
                All Categories
              </DropdownMenuItem>
              {categories.map((category) => (
                <DropdownMenuItem
                  key={category.id}
                  onClick={() => setCategoryFilter(category.id)}
                >
                  {category.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Skin Type Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="border-textColor-primary">
                <Droplets className="mr-2 h-4 w-4" />
                {skinTypeFilter === null
                  ? "All Types"
                  : skinTypes.find((c) => c.id === skinTypeFilter)?.name}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setSkinTypeFilter(null)}>
                All Types
              </DropdownMenuItem>
              {skinTypes.map((skin) => (
                <DropdownMenuItem
                  key={skin.id}
                  onClick={() => setSkinTypeFilter(skin.id)}
                >
                  {skin.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Status Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="border-textColor-primary">
                {statusFilter === null
                  ? "All Status"
                  : statusFilter
                  ? "Active"
                  : "Inactive"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setStatusFilter(null)}>
                All Status
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter(true)}>
                Active
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter(false)}>
                Inactive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Reset Filters */}
          <Button
            variant="ghost"
            onClick={resetFilters}
            className="text-gray-500 hover:text-button-primary"
          >
            Reset
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-sm">
            Total {filteredProducts.length} products
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
              <TableHead className="font-medium text-white">PRODUCT</TableHead>
              <TableHead className="font-medium text-white">CATEGORY</TableHead>
              <TableHead className="font-medium text-white">PRICE</TableHead>
              <TableHead className="font-medium text-white">
                SKIN TYPE
              </TableHead>
              <TableHead className="font-medium text-white">STATUS</TableHead>
              <TableHead className="font-medium text-white text-center">
                STOCK
              </TableHead>
              <TableHead className="font-medium text-white">
                LAST UPDATED
              </TableHead>
              <TableHead className="font-medium text-white text-center">
                ACTIONS
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentProducts.map((product) => (
              <TableRow
                key={product.id}
                className="group hover:bg-button-secondary border-textColor-primary hover:text-white"
              >
                <TableCell>
                  <Checkbox
                    checked={selectedProducts.includes(product.id)}
                    onCheckedChange={() => toggleSelectProduct(product.id)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 rounded-md">
                      <AvatarImage
                        src={
                          product.product_images?.find(
                            (image) => image.is_primary
                          )?.image_url ?? "placeholder-image-url.jpg"
                        }
                        alt={product.name}
                      />
                      <AvatarFallback className="rounded-md bg-gray-100 text-gray-600">
                        {product.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium group-hover:text-white">
                        {product.name}
                      </p>
                      <p className="text-gray-400 text-sm group-hover:text-gray-100 truncate max-w-xs">
                        {product.description.substring(0, 50)}...
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className="bg-gray-200 text-gray-700 hover:bg-gray-300 group-hover:bg-gray-200">
                    {product.categories?.name || ""}
                  </Badge>
                </TableCell>
                <TableCell>
                  {formatPrice(product.price)}
                  <div className="text-gray-400 text-xs group-hover:text-gray-100">
                    {product.volume_ml} ml
                  </div>
                </TableCell>
                <TableCell>{product.skin_types?.name || ""}</TableCell>
                <TableCell>
                  <Badge
                    className={`${
                      product.is_active
                        ? "bg-green-500/20 text-green-500"
                        : "bg-pink-500/20 text-pink-500"
                    } border-none`}
                  >
                    {product.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">{product.stock}</TableCell>
                <TableCell>{formatDate(product.updated_at)}</TableCell>
                <TableCell>
                  <div className="flex justify-end">
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
                        <DropdownMenuItem onClick={() => openEditDialog(product)}>Edit</DropdownMenuItem>
                        <DropdownMenuItem disabled>View Details</DropdownMenuItem>
                        <DropdownMenuItem disabled>Duplicate</DropdownMenuItem>
                        <DropdownMenuItem
                        className="text-red-500"
                        onClick={() =>
                          confirmDeleteProduct(product.id, product.name)
                        }
                      >
                        Delete
                      </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-between items-center">
        <p className="text-gray-400 text-sm">
          {selectedProducts.length} of {products.length} selected
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

      <ProductDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        product={
          editProduct
            ? {
                ...editProduct,
                category_id: editProduct.categories?.id ?? null,
                skin_type_id: editProduct.skin_types?.id ?? null,
              }
            : undefined
        }
        onSave={handleSaveProduct}
      />

      <DeleteProductDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        productTitle={productToDelete?.title}
        onConfirmDelete={handleDeleteProduct}
        isDeleting={isDeleting}
      />
    </div>
  );
}
