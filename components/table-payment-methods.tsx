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
  Eye,
  EyeOff,
  Loader2
} from "lucide-react";
import PaymentMethodIcon from '@/components/payment-icons/PaymentMethodIcon';
import { PaymentMethodDialog } from "./dialog-payment-method";
import { DeletePaymentMethodDialog } from "./dialog-delete-payment-methods";

interface PaymentMethod {
  id: number;
  name: string;
  code: string;
  description: string | null;
  is_active: boolean;
  display_order: number | null;
}

export default function TablePaymentMethods() {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<number[]>([]); 
  const [selectAll, setSelectAll] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editPaymentMethod, setEditPaymentMethod] = useState<PaymentMethod | undefined>(undefined);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [paymentMethodToDelete, setPaymentMethodToDelete] = useState<{ id: number, name?: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const openCreateDialog = () => {
    setEditPaymentMethod(undefined);
    setDialogOpen(true);
  };
  
  const openEditDialog = (paymentMethod: PaymentMethod) => {
    console.log("Opening Edit Dialog for Payment Method:", paymentMethod);
    setEditPaymentMethod(paymentMethod);
    setDialogOpen(true);
  };

  // Function to start the delete process
  const confirmDeletePaymentMethod = (id: number, name?: string) => {
    setPaymentMethodToDelete({ id, name });
    setDeleteDialogOpen(true);
  };

  // Function to perform the actual deletion
  const handleDeletePaymentMethod = async () => {
    if (!paymentMethodToDelete) return;
    
    setIsDeleting(true);
    
    try {
      const response = await fetch(`/api/payment-methods/${paymentMethodToDelete.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || `Failed to delete payment method (${response.status})`);
      }
      
      // Update local state
      setPaymentMethods(prevMethods => prevMethods.filter(method => method.id !== paymentMethodToDelete.id));
      
      // Show success notification
      toast("Payment method deleted", {
        description: `Payment method ${paymentMethodToDelete.name || "untitled"} has been deleted successfully.`,
      });
      
      // Close dialog
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error("Error deleting payment method:", error);
      toast("Error", {
        description: error instanceof Error ? error.message : "Failed to delete payment method",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleActive = async (paymentMethodId: number, currentStatus: boolean) => {
    setTogglingId(paymentMethodId);

    const newStatus = !currentStatus;

    try {
        const response = await fetch(`/api/payment-methods/${paymentMethodId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ is_active: newStatus }),
        });

        if (!response.ok) {
            let errorMsg = `Failed to change payment method status ${paymentMethodId}: ${response.status} ${response.statusText}`;
            try {
                const errorData = await response.json();
                errorMsg = errorData.message || errorMsg;
            } catch {
                // If response is not JSON, use default message
            }
            throw new Error(errorMsg);
        }

        console.log(`Payment method ${paymentMethodId} status successfully changed to ${newStatus}.`);
        fetchPaymentMethods();

    } catch (error: unknown) {
        console.error("Error when changing payment method status", error);
        toast("Error", {
          description: error instanceof Error ? error.message : "Failed to edit payment method",
        });
    } finally {
        setTogglingId(null);
    }
  };

  const fetchPaymentMethods = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/payment-methods');

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch payment methods');
      }

      const data: PaymentMethod[] = await response.json();
      setPaymentMethods(data);
      setIsLoading(false);

    } catch (err: unknown) {
      console.error('Error fetching payment methods:', err);
      let errorMessage = "Failed to load payment methods";
      if (err instanceof Error){
        errorMessage = err.message
      }
      setError(errorMessage);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPaymentMethods();
  }, [fetchPaymentMethods]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-button-primary" />
          <p className="text-textColor-primary font-medium">Loading payment methods...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return <div>Error loading payment methods: {error}</div>;
  }

  // Filter payment methods based on search query
  const filteredPaymentMethods = paymentMethods.filter(
    (method) =>
      (method.name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      (method.description?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      (method.code?.toLowerCase() || "").includes(searchQuery.toLowerCase())
  );

  // Calculate pagination
  const totalPages = Math.ceil(filteredPaymentMethods.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentPaymentMethods = filteredPaymentMethods.slice(startIndex, endIndex);

  // Handle row selection
  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedPaymentMethods([]);
    } else {
      setSelectedPaymentMethods(currentPaymentMethods.map((method) => method.id));
    }
    setSelectAll(!selectAll);
  };

  const toggleSelectPaymentMethod = (methodId: number) => {
    if (selectedPaymentMethods.includes(methodId)) {
      setSelectedPaymentMethods(selectedPaymentMethods.filter((id) => id !== methodId));
    } else {
      setSelectedPaymentMethods([...selectedPaymentMethods, methodId]);
    }
  };

  // Handler for saving new/updated payment method
  const handleSave = () => {
    setDialogOpen(false);
    fetchPaymentMethods();
  };

  return (
    <div className="flex flex-col gap-4 text-textColor-primary mx-12">
      <h1 className="mt-12 mb-4 font-medium text-5xl font-serif text-textColor-primary">Payment Methods</h1>
      <div className="flex justify-between items-center">
        <div className="relative flex gap-4">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search payment methods..."
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
            Add Payment Method <Plus className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-sm">Total {paymentMethods.length} payment methods</p>
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
              <TableHead className="font-medium text-white">PAYMENT METHOD</TableHead>
              <TableHead className="font-medium text-white">DESCRIPTION</TableHead>
              <TableHead className="font-medium text-white">CODE</TableHead>
              <TableHead className="font-medium text-white text-center">ORDER</TableHead>
              <TableHead className="font-medium text-white text-center">STATUS</TableHead>
              <TableHead className="font-medium text-white text-center">ACTIONS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentPaymentMethods.map((method) => (
              <TableRow
                key={method.id}
                className="group hover:bg-button-secondary border-textColor-primary hover:text-white"
              >
                <TableCell>
                  <Checkbox 
                    checked={selectedPaymentMethods.includes(method.id)}
                    onCheckedChange={() => toggleSelectPaymentMethod(method.id)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-20 flex items-center justify-center">
                      <PaymentMethodIcon 
                        methodCode={method.code}
                        methodName={method.name}
                        size={44}
                      />
                    </div>
                    <p className="font-medium group-hover:text-white">
                      {method.name || "Untitled Method"}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <p className="text-gray-600 group-hover:text-gray-100 truncate max-w-xs">
                    {method.description || "No description"}
                  </p>
                </TableCell>
                <TableCell>
                  <p className="text-gray-600 group-hover:text-gray-100">
                    {method.code}
                  </p>
                </TableCell>
                <TableCell>
                  <p className="text-center">{method.display_order || 0}</p>
                </TableCell>
                <TableCell>
                  <div className="flex justify-center">
                    {method.is_active ? (
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
                      <DropdownMenuItem onClick={() => openEditDialog(method)}>Edit</DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleToggleActive(method.id, method.is_active)}
                        disabled={togglingId === method.id}
                      >
                        {togglingId === method.id ?
                            (method.is_active ? "Deactivating..." : "Activating...") :
                            (method.is_active ? "Deactivate" : "Activate")
                        }
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-500" onClick={() => confirmDeletePaymentMethod(method.id, method.name)}>Delete</DropdownMenuItem>
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
          {selectedPaymentMethods.length} of {paymentMethods.length} selected
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
      <PaymentMethodDialog 
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        paymentMethod={editPaymentMethod}
        onSave={handleSave}
        maxOrder={paymentMethods.reduce((max, method) => Math.max(max, method.display_order || 0), 0)}
      />
      <DeletePaymentMethodDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        paymentMethodName={paymentMethodToDelete?.name}
        onConfirmDelete={handleDeletePaymentMethod}
        isDeleting={isDeleting}
      />
    </div>
  );
}