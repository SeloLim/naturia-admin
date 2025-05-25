"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";

interface PaymentMethod {
  id?: number;
  name: string;
  code: string;
  description: string | null;
  is_active: boolean;
  display_order: number | null;
}

interface PaymentMethodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentMethod?: PaymentMethod;
  onSave: () => void;
  maxOrder: number;
}

export function PaymentMethodDialog({
  open,
  onOpenChange,
  paymentMethod,
  onSave,
  maxOrder,
}: PaymentMethodDialogProps) {
  const isEditing = !!paymentMethod?.id;
  
  // Form state
  const [formData, setFormData] = useState<PaymentMethod>({
    name: "",
    code: "",
    description: null,
    is_active: true,
    display_order: null,
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when dialog opens/closes or payment method changes
  useEffect(() => {
    if (open && paymentMethod) {
      setFormData({
        id: paymentMethod.id,
        name: paymentMethod.name || "",
        code: paymentMethod.code || "",
        description: paymentMethod.description || null,
        is_active: paymentMethod.is_active,
        display_order: paymentMethod.display_order || null,
      });
    } else if (open) {
      // For new payment method, set defaults
      setFormData({
        name: "",
        code: "",
        description: null,
        is_active: true,
        display_order: maxOrder + 10, // Default to max + 10 for new items
      });
    }
    
    // Clear errors when dialog opens/closes
    setErrors({});
  }, [open, paymentMethod, maxOrder]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }
    
    if (!formData.code.trim()) {
      newErrors.code = "Code is required";
    } else if (!/^[A-Z0-9_]+$/.test(formData.code)) {
      newErrors.code = "Code must contain only uppercase letters, numbers, and underscores";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      const url = isEditing 
        ? `/api/payment-methods/${formData.id}` 
        : '/api/payment-methods';
      
      const method = isEditing ? 'PATCH' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || `Failed to ${isEditing ? 'update' : 'create'} payment method (${response.status})`);
      }
      
      toast(isEditing ? "Payment method updated" : "Payment method created", {
        description: `${formData.name} has been ${isEditing ? 'updated' : 'created'} successfully.`,
      });
      
      onSave();
    } catch (error) {
      console.error("Error saving payment method:", error);
      toast("Error", {
        description: error instanceof Error ? error.message : "Failed to save payment method",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: keyof PaymentMethod, value: unknown) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    
    // Clear field-specific error when user updates the field
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Payment Method' : 'Add Payment Method'}</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              className="col-span-3"
              placeholder="e.g. Bank Transfer BCA"
            />
            {errors.name && (
              <p className="col-start-2 col-span-3 text-red-500 text-sm">{errors.name}</p>
            )}
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="code" className="text-right">
              Code <span className="text-red-500">*</span>
            </Label>
            <Input
              id="code"
              value={formData.code}
              onChange={(e) => handleChange("code", e.target.value.toUpperCase())}
              className="col-span-3"
              placeholder="e.g. BCA_VA"
            />
            {errors.code && (
              <p className="col-start-2 col-span-3 text-red-500 text-sm">{errors.code}</p>
            )}
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">
              Description
            </Label>
            <Textarea
              id="description"
              value={formData.description || ""}
              onChange={(e) => handleChange("description", e.target.value || null)}
              className="col-span-3"
              placeholder="Payment method description (optional)"
              rows={3}
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="display_order" className="text-right">
              Display Order
            </Label>
            <Input
              id="display_order"
              type="number"
              value={formData.display_order === null ? "" : formData.display_order}
              onChange={(e) => handleChange("display_order", e.target.value ? parseInt(e.target.value, 10) : null)}
              className="col-span-3"
              placeholder="e.g. 10"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="is_active" className="text-right">
              Active
            </Label>
            <div className="flex items-center gap-2 col-span-3">
              <Checkbox
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => handleChange("is_active", !!checked)}
              />
              <Label htmlFor="is_active" className="font-normal">
                Show this payment method to customers
              </Label>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEditing ? "Updating..." : "Creating..."}
              </>
            ) : (
              isEditing ? "Update Payment Method" : "Create Payment Method"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}