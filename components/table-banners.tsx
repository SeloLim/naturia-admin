"use client";

import { useCallback, useEffect, useState } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown, 
  MoreVertical, 
  Plus, 
  Search,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2
} from "lucide-react";
import Image from "next/image";
import { BannerDialog } from "./dialog-banner";
import { DeleteBannerDialog } from "./dialog-delete-banner";

interface Banner {
  id: number;
  title: string;
  image_url: string;
  description: string;
  redirect_url: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

export default function TableBanners() {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [selectedBanners, setSelectedBanners] = useState<number[]>([]); 
  const [selectAll, setSelectAll] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editBanner, setEditBanner] = useState<Banner | undefined>(undefined);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bannerToDelete, setBannerToDelete] = useState<{ id: number, title?: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const [banners, setBanners] = useState<Banner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const openCreateDialog = () => {
    setEditBanner(undefined);
    setDialogOpen(true);
  };
  
  const openEditDialog = (banner: Banner) => {
    console.log("Opening Edit Dialog for Banner:", banner);
    setEditBanner(banner);
    setDialogOpen(true);
  };

  // Function to start the delete process
  const confirmDeleteBanner = (id: number, title?: string) => {
    setBannerToDelete({ id, title });
    setDeleteDialogOpen(true);
  };

  // Function to perform the actual deletion
  const handleDeleteBanner = async () => {
    if (!bannerToDelete) return;
    
    setIsDeleting(true);
    
    try {
      const response = await fetch(`/api/banners/${bannerToDelete.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || `Failed to delete banner (${response.status})`);
      }
      
      // Jika berhasil, update state lokal
      setBanners(prevBanners => prevBanners.filter(banner => banner.id !== bannerToDelete.id));
      
      // Tampilkan notifikasi sukses
      toast("Banner deleted", {
        description: `Banner ${bannerToDelete.title || "untitled"} has been deleted successfully.`,
      });
      
      // Tutup dialog
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error("Error deleting banner:", error);
      toast("Error", {
        description: error instanceof Error ? error.message : "Failed to delete banner",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleActive = async (bannerId: number, currentStatus: boolean) => {
    // Optional: Tampilkan loading state untuk item ini
    setTogglingId(bannerId); 

    const newStatus = !currentStatus; // Status baru adalah kebalikan dari status saat ini (active -> inactive, inactive -> active)

    try {
        // Lakukan fetch request metode PATCH ke API route dynamic [id]
        const response = await fetch(`/api/banners/${bannerId}`, {
            method: 'PATCH', // Gunakan metode PATCH
            headers: {
                'Content-Type': 'application/json', // Beri tahu server bahwa body adalah JSON
            },
            // Kirimkan body hanya berisi field is_active dengan status baru
            body: JSON.stringify({ is_active: newStatus }), 
        });

        if (!response.ok) {
            // Tangani error jika API mengembalikan status non-OK
             let errorMsg = `Gagal mengubah status banner ${bannerId}: ${response.status} ${response.statusText}`;
             try {
                 const errorData = await response.json();
                 errorMsg = errorData.message || errorMsg;
             } catch {
                 // Jika respons bukan JSON, gunakan pesan default
             }
            throw new Error(errorMsg);
        }

        // Jika panggilan API berhasil, panggil fetchBanners() untuk memuat ulang data terbaru
        console.log(`Status banner ${bannerId} berhasil diubah menjadi ${newStatus}.`);
        fetchBanners(); // Panggil kembali fungsi fetch untuk me-refresh tabel


    } catch (error: unknown) {
        console.error("Error saat mengubah status banner", error);
        toast("Error", {
          description: error instanceof Error ? error.message : "Failed to edit banner",
        });
    } finally {
        // Optional: Reset loading state setelah selesai (berhasil atau gagal)
        setTogglingId(null); 
    }
  };

  // Gunakan useCallback untuk memoize fungsi ini jika ini client component
  const fetchBanners = useCallback(async () => {
    setIsLoading(true); // Set loading saat fetching
    setError(null);     // Clear error sebelumnya

    try {
      const response = await fetch('/api/banners'); // Panggil API GET banners

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch banners');
      }

      const data: Banner[] = await response.json();
      // Data dari API sudah diurutkan dan/atau difilter berdasarkan implementasi API GET kamu
      setBanners(data);
      setIsLoading(false);

    } catch (err: unknown) {
      console.error('Error fetching banners:', err);
      let errorMessage = "Failed to load banners";
      if (err instanceof Error){
        errorMessage = err.message
      }
      setError(errorMessage);
      setIsLoading(false);
    }
  }, []); // Dependency array kosong karena fungsi ini tidak bergantung pada state/props lain yang berubah

  // --- Effect untuk memuat data saat komponen pertama kali di-mount ---
  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]); // Panggil fetchBanners saat pertama kali di-mount (karena fetchBanners di-memoize oleh useCallback)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-button-primary" />
          <p className="text-textColor-primary font-medium">Loading banners...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return <div>Error loading banners: {error}</div>;
  }

  // Filter banners based on search query
  const filteredBanners = banners.filter(
    (banner) =>
      (banner.title?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      (banner.description?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      (banner.redirect_url?.toLowerCase() || "").includes(searchQuery.toLowerCase())
  );

  // Calculate pagination
  const totalPages = Math.ceil(filteredBanners.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentBanners = filteredBanners.slice(startIndex, endIndex);

  // Handle row selection
  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedBanners([]);
    } else {
      setSelectedBanners(currentBanners.map((banner) => banner.id));
    }
    setSelectAll(!selectAll);
  };

  const toggleSelectBanner = (bannerId: number) => {
    if (selectedBanners.includes(bannerId)) {
      setSelectedBanners(selectedBanners.filter((id) => id !== bannerId));
    } else {
      setSelectedBanners([...selectedBanners, bannerId]);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Handler untuk menyimpan kategori baru
  const handleSave = () => {
    setDialogOpen(false);
    fetchBanners();
  };

  return (
    <div className="flex flex-col gap-4 text-textColor-primary mx-12">
      <h1 className="mt-12 mb-4 font-medium text-5xl font-serif text-textColor-primary">Banners</h1>
      <div className="flex justify-between items-center">
        <div className="relative flex gap-4">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search banners..."
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
          <Button className="text-white bg-button-primary hover:bg-button-secondary hover:text-textColor-primary cursor-pointer" onClick={openCreateDialog}>
            Add Banner <Plus className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-sm">Total {banners.length} banners</p>
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
              <DropdownMenuItem onClick={() => setRowsPerPage(5)}>5</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setRowsPerPage(10)}>10</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setRowsPerPage(20)}>20</DropdownMenuItem>
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
              <TableHead className="font-medium text-white">BANNER</TableHead>
              <TableHead className="font-medium text-white">DESCRIPTION</TableHead>
              <TableHead className="font-medium text-white">LINK</TableHead>
              <TableHead className="font-medium text-white text-center">ORDER</TableHead>
              <TableHead className="font-medium text-white text-center">STATUS</TableHead>
              <TableHead className="font-medium text-white text-center">CREATED</TableHead>
              <TableHead className="font-medium text-white text-center">ACTIONS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentBanners.map((banner) => (
              <TableRow
                key={banner.id}
                className="group hover:bg-button-secondary border-textColor-primary hover:text-white"
              >
                <TableCell>
                  <Checkbox 
                    checked={selectedBanners.includes(banner.id)}
                    onCheckedChange={() => toggleSelectBanner(banner.id)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-20 bg-gray-100 rounded overflow-hidden flex items-center justify-center">
                      <Image 
                        width={1200}  // Sesuaikan dengan container
                        height={400} // Sesuaikan dengan container
                        src={banner.image_url} // Tambahkan parameter size
                        alt={banner.title || "Banner image"} 
                        className="object-cover h-full w-full"
                      />
                    </div>
                    <p className="font-medium group-hover:text-white">
                      {banner.title || "Untitled Banner"}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <p className="text-gray-600 group-hover:text-gray-100 truncate max-w-xs">
                    {banner.description || "No description"}
                  </p>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-gray-600 group-hover:text-gray-100">
                    <ExternalLink className="h-3 w-3" />
                    <span className="truncate max-w-xs">{banner.redirect_url}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <p className="text-center">{banner.display_order}</p>
                </TableCell>
                <TableCell>
                  <div className="flex justify-center">
                    {banner.is_active ? (
                      <div className="flex items-center gap-1 text-green-500">
                        <Eye className="h-4 w-4" />
                        <span>Active</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-gray-400">
                        <EyeOff className="h-4 w-4" />
                        <span>Hidden</span>
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <p>{formatDate(banner.created_at)}</p>
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
                      <DropdownMenuItem onClick={() => openEditDialog(banner)}>Edit</DropdownMenuItem>
                      <DropdownMenuItem disabled>View Banner</DropdownMenuItem>
                      <DropdownMenuItem
                        // Panggil handler handleToggleActive dan teruskan ID banner serta statusnya saat ini
                        onClick={() => handleToggleActive(banner.id, banner.is_active)}
                        // Disable item jika sedang dalam proses toggle (opsional)
                        disabled={togglingId === banner.id}
                      >
                        {/* Tampilkan teks sesuai status banner saat ini */}
                        {togglingId === banner.id ?
                            (banner.is_active ? "Deactivating..." : "Activating...") : // Teks saat loading
                            (banner.is_active ? "Deactivate" : "Activate") // Teks normal
                        }
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-500" onClick={() => confirmDeleteBanner(banner.id)}>Delete</DropdownMenuItem>
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
          {selectedBanners.length} of {banners.length} selected
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
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="rounded-l-none bg-button-primary border-none hover:bg-button-secondary text-white"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" className="bg-button-primary hover:bg-button-secondary border-none text-white" onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}>
            Previous
          </Button>
          <Button variant="outline" className="bg-button-primary hover:bg-button-secondary border-none text-white hover:text-textColor-primary" onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}>
            Next
          </Button>
        </div>
      </div>
      <BannerDialog 
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        banner={editBanner}
        onSave={handleSave}
        maxOrder={banners.reduce((max, b) => Math.max(max, b.display_order), 0)}
      />
      <DeleteBannerDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        bannerTitle={bannerToDelete?.title}
        onConfirmDelete={handleDeleteBanner}
        isDeleting={isDeleting}
      />
    </div>
  );
}