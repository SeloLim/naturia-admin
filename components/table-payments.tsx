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
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Search,
  Loader2,
  Filter,
} from "lucide-react";

interface Payment {
  id: number;
  order_id: number;
  payment_method_id: number;
  payment_method_name: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  transaction_time: string;
  paid_at: string | null;
}

export default function TablePayments() {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const fetchPayments = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/payments");

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch payments");
      }

      const data: Payment[] = await response.json();
      setPayments(data);
      setIsLoading(false);
    } catch (err: unknown) {
      console.error("Error fetching payments:", err);
      let errorMessage = "Failed to load payments";
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      setError(errorMessage);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-button-primary" />
          <p className="text-textColor-primary font-medium">Loading payments...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return <div>Error loading payments: {error}</div>;
  }

  // Filter payments based on search query and status filter
  const filteredPayments = payments.filter((payment) => {
    const matchesSearch = 
      payment.order_id.toString().includes(searchQuery) || 
      payment.payment_method_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.amount.toString().includes(searchQuery) ||
      payment.status.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter ? payment.status === statusFilter : true;
    
    return matchesSearch && matchesStatus;
  });

  // Calculate pagination
  const totalPages = Math.ceil(filteredPayments.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentPayments = filteredPayments.slice(startIndex, endIndex);

  // Format amount as currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleString();
  };

  // Get status badge class
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'completed':
        return "bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs";
      case 'pending':
        return "bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs";
      case 'failed':
        return "bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs";
      case 'refunded':
        return "bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs";
      default:
        return "bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs";
    }
  };

  return (
    <div className="flex flex-col gap-4 text-textColor-primary mx-12">
      <h1 className="mt-12 mb-4 font-medium text-5xl font-serif text-textColor-primary">
        Order Payments
      </h1>
      <div className="flex justify-between items-center">
        <div className="relative flex gap-4">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by order ID, payment method, amount or status..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 border-textColor-primary text-textColor-primary w-96
                       focus-visible:ring-button-secondary focus-visible:border-button-secondary"
          />
          <Button className="text-white bg-button-primary hover:bg-button-secondary hover:text-textColor-primary cursor-pointer">
            Search
          </Button>
        </div>

        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="text-white bg-button-primary hover:bg-button-secondary hover:text-textColor-primary cursor-pointer">
                <Filter className="mr-2 h-4 w-4" /> Filter Status
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setStatusFilter(null)}>
                All Statuses
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("pending")}>
                Pending
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("completed")}>
                Completed
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("failed")}>
                Failed
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("refunded")}>
                Refunded
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-sm">
            Total {payments.length} payments {statusFilter ? `(filtered: ${statusFilter})` : ''}
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
              <DropdownMenuItem onClick={() => setRowsPerPage(50)}>
                50
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="border border-textColor-primary rounded-lg overflow-hidden">
        <Table>
          <TableHeader className="bg-button-primary">
            <TableRow className="hover:bg-button-secondary border-textColor-primary">
              <TableHead className="font-medium text-white">ID</TableHead>
              <TableHead className="font-medium text-white">ORDER ID</TableHead>
              <TableHead className="font-medium text-white">PAYMENT METHOD</TableHead>
              <TableHead className="font-medium text-white">AMOUNT</TableHead>
              <TableHead className="font-medium text-white">STATUS</TableHead>
              <TableHead className="font-medium text-white">TRANSACTION TIME</TableHead>
              <TableHead className="font-medium text-white">PAID AT</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentPayments.map((payment) => (
              <TableRow
                key={payment.id}
                className="group hover:bg-button-secondary border-textColor-primary hover:text-white"
              >
                <TableCell>{payment.id}</TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium group-hover:text-white">
                      #{payment.order_id}
                    </p>
                  </div>
                </TableCell>
                <TableCell>{payment.payment_method_name}</TableCell>
                <TableCell>{formatCurrency(payment.amount)}</TableCell>
                <TableCell>
                  <span className={getStatusBadgeClass(payment.status)}>
                    {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                  </span>
                </TableCell>
                <TableCell>{formatDate(payment.transaction_time)}</TableCell>
                <TableCell>{formatDate(payment.paid_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-end items-center space-x-4">
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

          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            // Show at most 5 page buttons
            let pageToShow;
            if (totalPages <= 5) {
              pageToShow = i + 1;
            } else {
              const middlePage = Math.min(Math.max(currentPage, 3), totalPages - 2);
              pageToShow = i - 2 + middlePage;
            }
            
            return (
              <Button
                key={pageToShow}
                variant={pageToShow === currentPage ? "default" : "outline"}
                className={
                  pageToShow === currentPage
                    ? "rounded-lg bg-button-secondary hover:bg-button-secondary border-none text-textColor-primary"
                    : "rounded-none bg-button-primary border-none text-white hover:bg-button-secondary"
                }
                onClick={() => setCurrentPage(pageToShow)}
              >
                {pageToShow}
              </Button>
            );
          })}

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
    </div>
  );
}