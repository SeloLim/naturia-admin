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
  DialogTitle 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertCircle } from "lucide-react";

// Define the Category type
interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
}

// Create a schema for form validation
const categorySchema = z.object({
  name: z.string().min(1, "Category name is required").max(100, "Name cannot exceed 100 characters"),
  slug: z.string().min(1, "Slug is required").max(100, "Slug cannot exceed 100 characters")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
  description: z.string().optional(),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

interface CategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category; // For editing existing category
  onSave: (category: CategoryFormValues) => void;
}

export function CategoryDialog({ 
  open, 
  onOpenChange, 
  category, 
  onSave 
}: CategoryDialogProps) {
  const isEditMode = !!category;
  const [isSaving, setIsSaving] = useState(false);
  
  // Initialize form
  const { 
    register, 
    handleSubmit, 
    formState: { errors },
    setValue,
    reset,
    setError,
    clearErrors

  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: category?.name || "",
      slug: category?.slug || "",
      description: category?.description || "",
    }
  });

  // Auto-generate slug from name
  const [autoGenerateSlug, setAutoGenerateSlug] = useState(!isEditMode);
  
  // Function to generate slug from name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  };

  // Update slug when name changes if auto-generate is enabled
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setValue("name", newName, { shouldValidate: true, shouldDirty: true });
    
    if (autoGenerateSlug) {
      setValue("slug", generateSlug(newName), { shouldValidate: true, shouldDirty: true });
    }
  };

  const onSubmit = async (data: CategoryFormValues) => {
    if (Object.keys(errors).length > 0) {
      console.error("Form has validation errors, cannot save.", errors);
      return;
    }

    setIsSaving(true);

    const apiEndpoint = isEditMode ? `/api/categories/${category.id}` : '/api/categories';
    const method = isEditMode ? 'PATCH' : 'POST';
    try {
      const response = await fetch(apiEndpoint, {
          method: method,
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
      });

      if (!response.ok) {
          const errorData = await response.json();
          console.error('API Save/Update Error:', errorData);
          const errorMessage = errorData.message || 'Unknown API error';
           alert(`${isEditMode ? 'Gagal mengupdate' : 'Gagal membuat'} kategori: ${errorMessage}`);

           // Optional: Handle specific backend validation errors jika ada
           if (errorData.errors && typeof errorData.errors === 'object') {
               Object.entries(errorData.errors).forEach(([fieldName, message]) => {
                   if (fieldName in data) {
                       setError(fieldName as keyof CategoryFormValues, { type: 'manual', message: message as string });
                   }
               });
           }

          return;
      }

      const json = await response.json();
      const resultCategory = categorySchema.parse(json);
      onSave(resultCategory);
      onOpenChange(false);

    } catch (error: unknown) {
        // Tangani error jaringan (logic ini juga sama)
        console.error('Network atau error tak terduga saat menyimpan/mengupdate:', error);
        let errorMessage = 'Terjadi kesalahan server internal';
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        alert(`Terjadi kesalahan tak terduga: ${errorMessage}`);
    } finally {
        setIsSaving(false); // Reset state loading saving
    }
  };

  useEffect(() => {
    if (!open) {
      console.log("Dialog closed. Resetting form.");
      reset({
          name: "",
          slug: "",
          description: "",
      });
      clearErrors();
    } else { 
      console.log("Dialog opened. Category prop:", category);
      if (category) {
        console.log("Opening in EDIT mode with category data:", category);
        const valuesToReset = {
          name: category.name || "", 
          slug: category.slug || "",
          description: category.description || "",
        };
        
        console.log("Resetting form with values:", valuesToReset);
        reset(valuesToReset);
      } else {
        console.log("Opening in CREATE mode.");
        const valuesToReset = {
          name: "",
          slug: "",
          description: "",
        };
        console.log("Resetting form with default create values:", valuesToReset);
        reset(valuesToReset); // Reset form dengan nilai default create
      }
      clearErrors();
    }
  }, [open, reset, clearErrors, category]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle className="text-xl font-serif">
              {isEditMode ? "Edit Category" : "Add New Category"}
            </DialogTitle>
            <DialogDescription>
              {isEditMode 
                ? "Update the details of this product category." 
                : "Create a new product category for your store."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {/* Category Name */}
            <div className="grid gap-2">
              <Label htmlFor="name" className="font-medium">
                Category Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="e.g. Moisturizers"
                {...register("name")}
                onChange={handleNameChange}
                className="w-full border-textColor-primary"
              />
              {errors.name && (
                <div className="flex items-center text-red-500 text-sm mt-1">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  <span>{errors.name.message}</span>
                </div>
              )}
            </div>
            
            {/* Category Slug */}
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="slug" className="font-medium">
                  Slug <span className="text-red-500">*</span>
                </Label>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="auto-generate"
                    checked={autoGenerateSlug}
                    onChange={() => setAutoGenerateSlug(!autoGenerateSlug)}
                    className="mr-2"
                  />
                  <Label htmlFor="auto-generate" className="text-sm font-normal">
                    Auto-generate from name
                  </Label>
                </div>
              </div>
              <Input
                id="slug"
                type="text"
                placeholder="e.g. moisturizers"
                {...register("slug")}
                disabled={autoGenerateSlug}
                className="w-full border-textColor-primary"
              />
              {errors.slug && (
                <div className="flex items-center text-red-500 text-sm mt-1">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  <span>{errors.slug.message}</span>
                </div>
              )}
              <p className="text-gray-500 text-xs">
                The slug is used in the URL of your category page. It should contain only lowercase letters, numbers, and hyphens.
              </p>
            </div>
            
            {/* Category Description */}
            <div className="grid gap-2">
              <Label htmlFor="description" className="font-medium">
                Description
              </Label>
              <Textarea
                id="description"
                placeholder="Add a brief description of this category..."
                rows={3}
                {...register("description")}
                className="w-full border-textColor-primary"
              />
              <p className="text-gray-500 text-xs">
                Optional. Provide a short description explaining what products belong in this category.
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
              {isSaving ? "Saving..." : isEditMode ? "Update Category" : "Create Category"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}