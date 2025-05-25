"use client";

import { useState, useEffect, useRef } from "react"; // Import useRef
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AlertCircle, Upload, ExternalLink } from "lucide-react";
import Image from "next/image";

// Define the Banner type
interface Banner {
  id: number;
  title?: string;
  image_url: string;
  description?: string;
  redirect_url?: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

const bannerSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(150, "Title cannot exceed 150 characters"),
  image_url: z
    .string()
    .min(1, "Image URL is required")
    .url("Must be a valid URL")
    .refine((url) => /\.(jpg|jpeg|png|webp|gif)$/i.test(url), {
      message: "Must be an image URL (jpg, png, webp, gif)",
    }),
  description: z.string().min(1, "Description is required"),
  redirect_url: z
    .string()
    .url("Please enter a valid URL")
    .optional()
    .or(z.literal("")),
  is_active: z.boolean().default(true).optional(),
  display_order: z
    .number()
    .int()
    .min(0, "Order must be a non-negative number")
    .default(0)
    .optional(),
});

type BannerFormValues = z.infer<typeof bannerSchema>;

interface BannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  banner?: Banner; // For editing existing banner
  onSave: (banner: BannerFormValues) => void;
  maxOrder?: number; // The highest current order value, for suggesting next order
}

export function BannerDialog({
  open,
  onOpenChange,
  banner,
  onSave,
  maxOrder = 0,
}: BannerDialogProps) {
  const isEditMode = !!banner;

  // State for image preview
  const [imagePreview, setImagePreview] = useState<string>(
    banner?.image_url || ""
  );

  // State for upload loading indicator
  const [isUploading, setIsUploading] = useState(false);
  // State for upload loading indicator
  const [isSaving, setIsSaving] = useState(false);

  // Ref for the hidden file input
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize form
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset,
    setError, // Add setError for validation messages
    clearErrors, // Add clearErrors
  } = useForm<BannerFormValues>({
    resolver: zodResolver(bannerSchema),
    defaultValues: {
      title: banner?.title || "",
      image_url: banner?.image_url || "",
      description: banner?.description || "",
      redirect_url: banner?.redirect_url || "",
      is_active: banner?.is_active ?? true,
      display_order: banner?.display_order ?? maxOrder + 1,
    },
  });

  // Handle image URL change to update preview (manual input)
  const handleImageUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setValue("image_url", value); // tetap simpan input user

    // Clear image_url specific error if user starts typing manually after an upload error
    clearErrors("image_url");

    // Cek valid atau tidak untuk preview (misal buat <img src>)
    try {
      const url = new URL(value); // akan error kalau gak valid
      // Basic check if it looks like an image URL based on path extension
      const isImageUrl = /\.(jpg|jpeg|png|webp|gif)$/i.test(url.pathname);
      setImagePreview(isImageUrl ? url.toString() : ""); // tampilkan preview kalau valid URL dan looks like image
    } catch {
      setImagePreview(""); // kosongin preview kalau URL belum valid
    }
  };

  // Function to trigger the hidden file input click
  const handleFileUploadClick = () => {
    fileInputRef.current?.click();
  };

  // Function to handle file selection and upload to Cloudinary
  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // --- Cloudinary Upload Logic ---
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      alert(
        "Cloudinary configuration missing! Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET."
      );
      console.error("Cloudinary configuration missing");
      setError("image_url", {
        type: "manual",
        message: "Cloudinary configuration missing.",
      });
      // Clear the file input value so the same file can be selected again
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Basic file size check (optional but recommended, matches recommendation text)
    const maxSizeMB = 2;
    if (file.size > maxSizeMB * 1024 * 1024) {
      alert(`File size exceeds the limit of ${maxSizeMB}MB.`);
      setError("image_url", {
        type: "manual",
        message: `File size exceeds the limit of ${maxSizeMB}MB.`,
      });
      // Clear the file input value
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setIsUploading(true);
    clearErrors("image_url"); // Clear any previous image_url errors

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);
    // Optional: add folder, tags, etc. for better organization in Cloudinary
    formData.append("folder", "naturia-banners"); // Example: upload to a specific folder

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Cloudinary upload failed:", errorData);
        const errorMessage =
          errorData.error?.message ||
          response.statusText ||
          "Unknown upload error";
        alert(`Upload failed: ${errorMessage}`);
        setImagePreview(""); // Clear preview on error
        setValue("image_url", ""); // Clear the form field on error
        setError("image_url", {
          type: "manual",
          message: `Upload failed: ${errorMessage}`,
        });
        return;
      }

      const data = await response.json();
      const secureUrl = data.secure_url; // Use secure_url for HTTPS

      // Update form field and preview with the Cloudinary URL
      setValue("image_url", secureUrl, { shouldValidate: true }); // Validate after setting
      setImagePreview(secureUrl);

      // Optional: Show a success message
      // alert("Image uploaded successfully!"); // Maybe use a toast instead
    } catch (error) {
      console.error("Error during upload:", error);
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred.";
      alert(`An error occurred during upload: ${errorMessage}`);
      setImagePreview(""); // Clear preview on error
      setValue("image_url", ""); // Clear the form field on error
      setError("image_url", {
        type: "manual",
        message: `Error during upload: ${errorMessage}`,
      });
    } finally {
      setIsUploading(false);
      // Clear the value of the file input to allow selecting the same file again
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Handle form submission
  const onSubmit = async (data: BannerFormValues) => {
    // Check if there are any validation errors before saving
    if (Object.keys(errors).length > 0) {
      console.error("Form has validation errors, cannot save.", errors);
      // Optionally alert user or highlight errors more prominently
      return;
    }
    setIsSaving(true); // Set saving loading state
    // Tentukan endpoint API dan metode berdasarkan mode edit atau create
    // Ini tetap sama
    const apiEndpoint = isEditMode
      ? `/api/banners/${banner.id}`
      : "/api/banners";
    const method = isEditMode ? "PATCH" : "POST";

    try {
      // Kode fetch ini tetap sama
      const response = await fetch(apiEndpoint, {
        method: method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        // Tangani error dari respons API (logic ini juga sama)
        const errorData = await response.json();
        console.error("API Save/Update Error:", errorData);
        const errorMessage = errorData.message || "Unknown API error";
        alert(
          `${
            isEditMode ? "Gagal mengupdate" : "Gagal membuat"
          } banner: ${errorMessage}`
        );

        // Optional: Handle specific backend validation errors jika ada
        if (errorData.errors && typeof errorData.errors === "object") {
          Object.entries(errorData.errors).forEach(([fieldName, message]) => {
            if (fieldName in data) {
              setError(fieldName as keyof BannerFormValues, {
                type: "manual",
                message: message as string,
              });
            }
          });
        }

        return;
      }

      const json = await response.json();
      const resultBanner = bannerSchema.parse(json);
      onSave(resultBanner);
      onOpenChange(false);
    } catch (error: unknown) {
      // Tangani error jaringan (logic ini juga sama)
      console.error(
        "Network atau error tak terduga saat menyimpan/mengupdate:",
        error
      );
      let errorMessage = "Terjadi kesalahan server internal";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      alert(`Terjadi kesalahan tak terduga: ${errorMessage}`);
    } finally {
      setIsSaving(false); // Reset state loading saving
    }
  };

  // Reset form when dialog is closed
  useEffect(() => {
    if (!open) {
      console.log("Dialog closed. Resetting form.");
      // Reset form kembali ke kondisi "buat baru" atau kosong
      reset({
        title: "",
        image_url: "",
        description: "",
        // Gunakan "" untuk field teks yang mungkin null/undefined dari API
        redirect_url: "",
        is_active: true, // Default untuk banner baru
        display_order: maxOrder + 1, // Hitung default order untuk banner baru
      });
      setImagePreview(""); // Kosongkan preview gambar
      setIsUploading(false); // Reset status upload
      clearErrors();
    } else {
      console.log("Dialog opened. Banner prop:", banner);

      // Jika dalam mode EDIT (prop banner disediakan dan bukan undefined)
      if (banner) {
        console.log("Opening in EDIT mode with banner data:", banner);
        // Reset form dengan data dari objek banner yang akan diedit
        const valuesToReset = {
          // Gunakan banner.propertyName. || "" atau ?? "" untuk default jika null/undefined dari API
          title: banner.title || "",
          image_url: banner.image_url || "",
          description: banner.description || "",
          redirect_url: banner.redirect_url ?? "", // Gunakan ?? untuk nullish coalescing (handles null and undefined)
          is_active: banner.is_active, // is_active harusnya boolean, tidak null/undefined dari DB default/interface
          display_order: banner.display_order, // display_order harusnya number
        };

        console.log("Resetting form with values:", valuesToReset);
        reset(valuesToReset); // <--- Ini yang penting: panggil reset() dengan data banner

        // Perbarui preview gambar juga saat membuka dialog edit
        try {
          const url = new URL(valuesToReset.image_url); // Gunakan nilai yang dipakai untuk reset
          const isImageUrl = /\.(jpg|jpeg|png|webp|gif)$/i.test(url.pathname);
          setImagePreview(isImageUrl ? url.toString() : "");
        } catch {
          setImagePreview(""); // Kosongkan preview jika URL tidak valid
        }
      } else {
        console.log("Opening in CREATE mode.");
        // Reset form kembali ke kondisi "buat baru"
        const valuesToReset = {
          title: "",
          image_url: "",
          description: "",
          redirect_url: "",
          is_active: true,
          display_order: maxOrder + 1,
        };
        console.log(
          "Resetting form with default create values:",
          valuesToReset
        );
        reset(valuesToReset); // Reset form dengan nilai default create
        setImagePreview(""); // Pastikan preview kosong untuk mode create
      }
      clearErrors();
    }
  }, [open, reset, watch, clearErrors, maxOrder, banner]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle className="text-xl font-serif">
              {isEditMode ? "Edit Banner" : "Add New Banner"}
            </DialogTitle>
            <DialogDescription>
              {isEditMode
                ? "Update the details of this banner."
                : "Create a new banner for your carousel."}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="image" className="w-full mt-4">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="image">Banner Image</TabsTrigger>
              <TabsTrigger value="details">Banner Details</TabsTrigger>
            </TabsList>

            <TabsContent value="image" className="pt-4">
              <div className="grid gap-4">
                {/* Banner Image */}
                <div className="grid gap-3">
                  <Label className="font-medium">
                    Banner Image <span className="text-red-500">*</span>
                  </Label>

                  {/* Image Preview */}
                  <div className="w-full h-40 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center border border-gray-200">
                    {imagePreview ? (
                      <Image
                        width={1200}
                        height={400}
                        src={imagePreview}
                        alt="Banner preview"
                        className="w-full h-full object-cover"
                        onError={() => setImagePreview("")} // Fallback if image fails to load
                      />
                    ) : (
                      <div className="text-gray-400 flex flex-col items-center">
                        {isUploading ? (
                          // Optional: Add a simple spinner here if you like
                          <span className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-gray-400 mb-2"></span>
                        ) : (
                          <Upload className="h-10 w-10 mb-2" />
                        )}
                        <span>
                          {isUploading ? "Uploading..." : "No image selected"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Image URL Input (Keep this for manual URL input or to see the uploaded URL) */}
                  <div className="grid gap-2">
                    <Label htmlFor="image_url">Image URL</Label>
                    <Input
                      id="image_url"
                      type="text"
                      placeholder="https://example.com/image.jpg"
                      {...register("image_url")}
                      onChange={handleImageUrlChange} // Use the new handler
                      className="w-full border-textColor-primary"
                      disabled={isUploading} // Disable manual input during upload
                    />
                    {errors.image_url && (
                      <div className="flex items-center text-red-500 text-sm mt-1">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        <span>{errors.image_url.message}</span>
                      </div>
                    )}
                  </div>

                  {/* Hidden file input (triggered by the button) */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange} // Use the new file change handler
                    className="hidden" // Keep it hidden
                    accept="image/*" // Accept only image files
                  />

                  {/* Upload Button (modified to trigger hidden input) */}
                  <Button
                    type="button" // Important: type="button" to prevent form submission
                    variant="outline"
                    className="border-textColor-primary"
                    onClick={handleFileUploadClick} // Trigger the hidden input
                    disabled={isUploading} // Disable while uploading
                  >
                    {isUploading ? (
                      "Uploading..." // Change text while loading
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Image File
                      </>
                    )}
                  </Button>
                  <p className="text-gray-500 text-xs">
                    Recommended banner size: 1200×400 pixels, max 2MB.
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="details" className="pt-4">
              {/* Banner Title */}
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="title" className="font-medium">
                    Banner Title
                  </Label>
                  <Input
                    id="title"
                    type="text"
                    placeholder="e.g. Summer Sale Promotion"
                    {...register("title")}
                    className="w-full border-textColor-primary"
                  />
                  {errors.title && (
                    <div className="flex items-center text-red-500 text-sm mt-1">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      <span>{errors.title.message}</span>
                    </div>
                  )}
                </div>

                {/* Banner Description */}
                <div className="grid gap-2">
                  <Label htmlFor="description" className="font-medium">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Brief description of this banner..."
                    rows={2}
                    {...register("description")}
                    className="w-full border-textColor-primary"
                  />
                  {errors.description && (
                    <div className="flex items-center text-red-500 text-sm mt-1">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      <span>{errors.description.message}</span>
                    </div>
                  )}
                </div>

                {/* Redirect URL */}
                <div className="grid gap-2">
                  <Label htmlFor="redirect_url" className="font-medium">
                    Redirect Link
                  </Label>
                  <div className="relative">
                    <ExternalLink className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="redirect_url"
                      type="text"
                      placeholder="https://example.com/page"
                      {...register("redirect_url")}
                      className="pl-10 w-full border-textColor-primary"
                    />
                  </div>
                  {errors.redirect_url && (
                    <div className="flex items-center text-red-500 text-sm mt-1">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      <span>{errors.redirect_url.message}</span>
                    </div>
                  )}
                  <p className="text-gray-500 text-xs">
                    Where users will go when they click on this banner.
                  </p>
                </div>

                {/* Display Order */}
                <div className="grid gap-2">
                  <Label htmlFor="display_order" className="font-medium">
                    Display Order
                  </Label>
                  <Input
                    id="display_order"
                    type="number"
                    min="0"
                    step="1"
                    {...register("display_order", { valueAsNumber: true })}
                    className="w-full border-textColor-primary"
                  />
                  {errors.display_order && (
                    <div className="flex items-center text-red-500 text-sm mt-1">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      <span>{errors.display_order.message}</span>
                    </div>
                  )}
                  <p className="text-gray-500 text-xs">
                    Determines the order of banners in the carousel (lower
                    numbers appear first).
                  </p>
                </div>

                {/* Status */}
                <div className="flex items-center justify-between">
                  <Label htmlFor="is_active" className="font-medium">
                    Banner Status
                  </Label>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="is_active"
                      checked={watch("is_active")}
                      onCheckedChange={(checked) =>
                        setValue("is_active", checked)
                      }
                    />
                    <span
                      className={
                        watch("is_active") ? "text-green-500" : "text-gray-400"
                      }
                    >
                      {watch("is_active") ? "Active" : "Hidden"}
                    </span>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="gap-2 mt-4">
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
              disabled={
                isUploading || isSaving || Object.keys(errors).length > 0
              } // Disable jika sedang upload, saving, atau ada error
            >
              {isSaving
                ? "Saving..."
                : isEditMode
                ? "Update Banner"
                : "Create Banner"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
