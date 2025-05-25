"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AlertCircle } from "lucide-react";

// Define the SkinType interface
interface SkinType {
  id: number;
  name: string;
}

// Create a schema for form validation
const skinTypeSchema = z.object({
  name: z
    .string()
    .min(1, "Skin type name is required")
    .max(100, "Name cannot exceed 100 characters"),
});

type SkinTypeFormValues = z.infer<typeof skinTypeSchema>;

interface SkinTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  skinType?: SkinType; // For editing existing skin type
  onSave: (skinType: SkinTypeFormValues) => void;
}

export function SkinTypeDialog({
  open,
  onOpenChange,
  skinType,
  onSave,
}: SkinTypeDialogProps) {
  const isEditMode = !!skinType;
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setError,
    clearErrors,
  } = useForm<SkinTypeFormValues>({
    resolver: zodResolver(skinTypeSchema),
    defaultValues: {
      name: skinType?.name || "",
    },
  });

  const onSubmit = async (data: SkinTypeFormValues) => {
    if (Object.keys(errors).length > 0) {
      console.error("Form has validation errors, cannot save.", errors);
      return;
    }

    setIsSaving(true);

    const apiEndpoint = isEditMode
      ? `/api/skin-types/${skinType.id}`
      : "/api/skin-types";
    const method = isEditMode ? "PATCH" : "POST";
    try {
      const response = await fetch(apiEndpoint, {
        method: method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("API Save/Update Error:", errorData);
        const errorMessage = errorData.message || "Unknown API error";
        alert(
          `${
            isEditMode ? "Failed to update" : "Failed to create"
          } skin type: ${errorMessage}`
        );

        // Handle specific backend validation errors if any
        if (errorData.errors && typeof errorData.errors === "object") {
          Object.entries(errorData.errors).forEach(([fieldName, message]) => {
            if (fieldName in data) {
              setError(fieldName as keyof SkinTypeFormValues, {
                type: "manual",
                message: message as string,
              });
            }
          });
        }
        return;
      }

      const json = await response.json();
      const resultSkinType = skinTypeSchema.parse(json);
      onSave(resultSkinType);
      onOpenChange(false);
    } catch (error: unknown) {
      console.error("Network or unexpected error when saving/updating:", error);
      let errorMessage = "Internal server error occurred";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      alert(`An unexpected error occurred: ${errorMessage}`);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (!open) {
      console.log("Dialog closed. Resetting form.");
      reset({
        name: "",
      });
      clearErrors();
    } else {
      console.log("Dialog opened. SkinType prop:", skinType);
      if (skinType) {
        console.log("Opening in EDIT mode with skin type data:", skinType);
        reset({
          name: skinType.name || "",
        });
      } else {
        console.log("Opening in CREATE mode.");
        reset({
          name: "",
        });
      }
      clearErrors();
    }
  }, [open, reset, clearErrors, skinType]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle className="text-xl font-serif">
              {isEditMode ? "Edit Skin Type" : "Add New Skin Type"}
            </DialogTitle>
            <DialogDescription>
              {isEditMode
                ? "Update the details of this skin type."
                : "Create a new skin type for your products."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Skin Type Name */}
            <div className="grid gap-2">
              <Label htmlFor="name" className="font-medium">
                Skin Type Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="e.g. Oily, Dry, Combination"
                {...register("name")}
                className="w-full border-textColor-primary"
              />
              {errors.name && (
                <div className="flex items-center text-red-500 text-sm mt-1">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  <span>{errors.name.message}</span>
                </div>
              )}
              <p className="text-gray-500 text-xs">
                Enter a descriptive name for the skin type. This will be
                displayed to users when selecting skin types.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              className="border-textColor-primary"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-button-primary hover:bg-button-secondary text-white hover:text-textColor-primary"
              disabled={isSaving || Object.keys(errors).length > 0}
            >
              {isSaving
                ? "Saving..."
                : isEditMode
                ? "Update Skin Type"
                : "Create Skin Type"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
