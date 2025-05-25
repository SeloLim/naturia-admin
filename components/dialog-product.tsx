"use client";

import { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, ImagePlus, Trash2 } from "lucide-react";
import Image from "next/image";

interface Category {
  id: number;
  name: string;
}

interface SkinType {
  id: number;
  name: string;
}

interface Images{
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
  how_to_use: string;
  price: number;
  volume_ml: number;
  category_id: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  stock: number;
  skin_type_id: number;
  product_images: Images[];
}

// Create a schema for form validation
const productSchema = z.object({
  name: z
    .string()
    .min(1, "Product name is required")
    .max(150, "Name cannot exceed 150 characters"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(150, "Slug cannot exceed 150 characters")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must contain only lowercase letters, numbers, and hyphens"
    ),
  description: z
    .string()
    .min(1, "Description is required")
    .max(5000, "Description cannot exceed 5000 characters"),
  benefits: z
    .string()
    .min(1, "Benefits are required")
    .max(5000, "Benefits cannot exceed 5000 characters"),
  key_ingredients: z
    .string()
    .min(1, "Key ingredients are required")
    .max(5000, "Key ingredients cannot exceed 5000 characters"),
  how_to_use: z
    .string()
    .max(5000, "How to use cannot exceed 5000 characters"),
  price: z
    .number({
      required_error: "Price is required",
      invalid_type_error: "Price must be a number",
    })
    .positive("Price must be positive"),
  volume_ml: z
    .number({
      required_error: "Volume is required",
      invalid_type_error: "Volume must be a number",
    })
    .positive("Volume must be positive")
    .int(),
  category_id: z
    .number({
      required_error: "Please select a category",
      invalid_type_error: "Please select a category",
    })
    .int()
    .positive(),
  is_active: z.boolean().default(true).optional(),
  stock: z
    .number({
      required_error: "Stock is required",
      invalid_type_error: "Stock must be a number",
    })
    .positive("Stock must be positive")
    .int(),
  skin_type_id: z
    .number({
      required_error: "Please select a skin type",
      invalid_type_error: "Please select a  skin type",
    })
    .int()
    .positive(),
  product_images: z
    .array(
      z.object({
        image_url: z.string(),
        is_primary: z.boolean(),
      })
    )
    .min(1, "At least 1 image is required"),
});

type ProductFormValues = z.infer<typeof productSchema>;

interface ProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product;
  onSave: (product: ProductFormValues) => void;
}

export function ProductDialog({
  open,
  onOpenChange,
  product,
  onSave,
}: ProductDialogProps) {
  const isEditMode = !!product;
  const [categories, setCategories] = useState<Category[]>([]);
  const [skinTypes, setSkinTypes] = useState<SkinType[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch categories and skin types
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [categoriesRes, skinTypesRes] = await Promise.all([
          fetch("/api/categories"),
          fetch("/api/skin-types"),
        ]);

        const categoriesData = await categoriesRes.json();
        const skinTypesData = await skinTypesRes.json();

        setCategories(categoriesData);
        setSkinTypes(skinTypesData);
      } catch (error) {
        alert("Error fetching data: " + error);
      }
    };

    fetchData();
  }, []);

  // Initialize form
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset,
    setError,
    clearErrors,
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name || "",
      slug: product?.slug || "",
      description: product?.description || "",
      benefits: product?.benefits || "",
      key_ingredients: product?.key_ingredients || "",
      how_to_use: product?.how_to_use || "",
      price: product?.price || 0,
      volume_ml: product?.volume_ml || 0,
      category_id: product?.category_id || undefined,
      is_active: product?.is_active ?? true,
      product_images: Array.isArray(product?.product_images) ? product.product_images : product?.product_images ? [product.product_images] : [],
      skin_type_id: product?.skin_type_id || undefined,
      stock: product?.stock || 0,
    },
  });

  // Handle image upload to Cloudinary
  const uploadImages = async () => {
    setUploading(true);
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
    if (!cloudName || !uploadPreset) {
      console.error("Cloudinary credentials are not set.");
      return;
    }

    try {
      const uploadedImages = await Promise.all(
        selectedFiles.map(async (file) => {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("upload_preset", uploadPreset);
          formData.append("folder", "naturia-products");

          const response = await fetch(
            `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
            { method: "POST", body: formData }
          );
          return await response.json();
        })
      );

      const currentImages = watch("product_images") || [];
      const hasExistingPrimary = currentImages.some((img) => img.is_primary);

      // Membuat array image objects
      const newImages = uploadedImages.map((data, index) => ({
        image_url: data.secure_url,
        is_primary: !hasExistingPrimary && index === 0, // Set pertama sebagai primary jika belum ada
      }));

      setValue("product_images", [...currentImages, ...newImages], {
        shouldValidate: true,
        shouldDirty: true,
      });
      setSelectedFiles([]);
      setPreviewUrls([]);
    } catch (error) {
      alert("Upload error:" + error);
    } finally {
      setUploading(false);
    }
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(files);
    setPreviewUrls(files.map((file) => URL.createObjectURL(file)));
  };

  // Set primary image
  const setPrimaryImage = (index: number) => {
    const updatedImages = (watch("product_images") || []).map((img, i) => ({
      ...img,
      is_primary: i === index,
    }));
    setValue("product_images", updatedImages, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  // Remove image
  const removeImage = (index: number) => {
    const updatedImages = (watch("product_images") || []).filter((_, i) => i !== index);
    setValue("product_images", updatedImages, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

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
      setValue("slug", generateSlug(newName), {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
  };

  // Handle form submission
  const onSubmit = async (data: ProductFormValues) => {
    try {
      if (!Array.isArray(data.product_images)) {
        data.product_images = [];
      }

      if (data.product_images.length === 0) {
        setError("product_images", {
          type: "manual",
          message: "At least one image is required",
        });
        return;
      }

      setIsSaving(true);

      const apiEndpoint = isEditMode
        ? `/api/products/${product.id}`
        : "/api/products";
      const method = isEditMode ? "PATCH" : "POST";

      const response = await fetch(apiEndpoint, {
        method: method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.message || "An error occurred");
      }
      let responseData: unknown;

      if(isEditMode){
        responseData = json;
      }else{
        responseData = json.data;
      }
      
      const resultProduct = productSchema.parse(responseData);
      onSave(resultProduct);
      onOpenChange(false);
    } catch (error: unknown) {
      let errorMessage = "An unexpected error occurred";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      alert(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle numeric inputs
  const handleNumericInput = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: keyof ProductFormValues
  ) => {
    const value = e.target.value;
    if (value === "") {
      setValue(field, undefined, { shouldValidate: true, shouldDirty: true });
    } else {
      const numValue = field === "price" ? parseFloat(value) : parseInt(value);
      if (!isNaN(numValue)) {
        setValue(field, numValue as string | number, {
          shouldValidate: true,
          shouldDirty: true,
        });
      }
    }
  };

  useEffect(() => {
    if (!open) {
      reset({
        name: "",
        description: "",
        benefits: "",
        key_ingredients: "",
        stock: 0,
        how_to_use: "",
        price: 0,
        volume_ml: 0,
        category_id: undefined,
        is_active: true,
        product_images: [],
        skin_type_id: undefined,
      });
      setUploading(false);
      clearErrors();
    } else {
      if (product) {
        const valuesToReset = {
          ...product,
          product_images: product.product_images ?? [],
        };
        reset(valuesToReset);
      } else {
        const valuesToReset = {
          name: "",
          description: "",
          benefits: "",
          key_ingredients: "",
          stock: 0,
          how_to_use: "",
          price: 0,
          volume_ml: 0,
          category_id: undefined,
          is_active: true,
          product_images: [],
          skin_type_id: undefined,
        };
        reset(valuesToReset);
      }
      clearErrors();
    }
  }, [open, reset, watch, clearErrors, product]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle className="text-xl font-serif">
              {isEditMode ? "Edit Product" : "Add New Product"}
            </DialogTitle>
            <DialogDescription>
              {isEditMode
                ? "Update the details of this product."
                : "Create a new product for your store."}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="basic" className="w-full mt-4">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="details">Product Details</TabsTrigger>
              <TabsTrigger value="images">Images</TabsTrigger>
            </TabsList>

            {/* Basic Info Tab */}
            <TabsContent value="basic" className="pt-4">
              <div className="grid gap-4">
                {/* Product Name */}
                <div className="grid gap-2">
                  <Label htmlFor="name" className="font-medium">
                    Product Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="e.g. Hydrating Face Wash"
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

                {/* Product Slug */}
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
                      <Label
                        htmlFor="auto-generate"
                        className="text-sm font-normal"
                      >
                        Auto-generate from name
                      </Label>
                    </div>
                  </div>
                  <Input
                    id="slug"
                    type="text"
                    placeholder="e.g. hydrating-face-wash"
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
                    The slug is used in the URL of your product page. It should
                    contain only lowercase letters, numbers, and hyphens.
                  </p>
                </div>

                {/* Price and Volume */}
                <div className="grid grid-cols-3 gap-4">
                  {/* Price */}
                  <div className="grid gap-2">
                    <Label htmlFor="price" className="font-medium">
                      Price <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-2">Rp</span>
                      <Input
                        id="price"
                        type="number"
                        step="1"
                        min="0"
                        placeholder="0.00"
                        className="pl-10 border-textColor-primary"
                        value={watch("price") || ""}
                        onChange={(e) => handleNumericInput(e, "price")}
                      />
                    </div>
                    {errors.price && (
                      <div className="flex items-center text-red-500 text-sm mt-1">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        <span>{errors.price.message}</span>
                      </div>
                    )}
                  </div>

                  {/* Volume */}
                  <div className="grid gap-2">
                    <Label htmlFor="volume_ml" className="font-medium">
                      Volume (ml)
                    </Label>
                    <div className="relative">
                      <Input
                        id="volume_ml"
                        type="number"
                        min="0"
                        step="1"
                        placeholder="e.g. 100"
                        className="border-textColor-primary"
                        value={watch("volume_ml") || ""}
                        onChange={(e) => handleNumericInput(e, "volume_ml")}
                      />
                      <span className="absolute right-3 top-2 text-gray-500">
                        ml
                      </span>
                    </div>
                    {errors.volume_ml && (
                      <div className="flex items-center text-red-500 text-sm mt-1">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        <span>{errors.volume_ml.message}</span>
                      </div>
                    )}
                  </div>

                  {/* Stock */}
                  <div className="grid gap-2">
                    <Label htmlFor="stock" className="font-medium">
                      Stock
                    </Label>
                    <div className="relative">
                      <Input
                        id="stock"
                        type="number"
                        min="0"
                        step="1"
                        placeholder="e.g. 100"
                        className="border-textColor-primary"
                        value={watch("stock") || ""}
                        onChange={(e) => handleNumericInput(e, "stock")}
                      />
                      <span className="absolute right-3 top-2 text-gray-500">
                        pcs
                      </span>
                    </div>
                    {errors.stock && (
                      <div className="flex items-center text-red-500 text-sm mt-1">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        <span>{errors.stock.message}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Category and Skin Types */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Category */}
                  <div className="grid gap-2">
                    <Label htmlFor="category_id" className="font-medium">
                      Category
                    </Label>
                    <Select
                      value={watch("category_id")?.toString() || ""}
                      onValueChange={(value) =>
                        setValue("category_id", parseInt(value), {
                          shouldValidate: true,
                          shouldDirty: true,
                        })
                      }
                    >
                      <SelectTrigger className="border-textColor-primary w-full">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem
                            key={category.id}
                            value={category.id.toString()}
                          >
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.category_id && (
                      <div className="flex items-center text-red-500 text-sm mt-1">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        <span>{errors.category_id.message}</span>
                      </div>
                    )}
                  </div>

                  {/* Skin Type */}
                  <div className="grid gap-2">
                    <Label htmlFor="skin_type_id" className="font-medium">
                      Skin Type
                    </Label>
                    <Select
                      value={watch("skin_type_id")?.toString() || ""}
                      onValueChange={(value) =>
                        setValue("skin_type_id", Number(value), {
                          shouldValidate: true,
                          shouldDirty: true,
                        })
                      }
                    >
                      <SelectTrigger className="border-textColor-primary w-full">
                        <SelectValue placeholder="Select skin type" />
                      </SelectTrigger>
                      <SelectContent>
                        {skinTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id.toString()}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.skin_type_id && (
                      <div className="flex items-center text-red-500 text-sm mt-1">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        <span>{errors.skin_type_id.message}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status */}
                <div className="flex items-center justify-between">
                  <Label htmlFor="is_active" className="font-medium">
                    Product Status
                  </Label>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="is_active"
                      checked={watch("is_active")}
                      onCheckedChange={(checked) =>
                        setValue("is_active", checked, {
                          shouldValidate: true,
                          shouldDirty: true,
                        })
                      }
                    />
                    <span
                      className={
                        watch("is_active") ? "text-green-500" : "text-gray-400"
                      }
                    >
                      {watch("is_active") ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Product Details Tab */}
            <TabsContent value="details" className="pt-4">
              <div className="grid gap-4">
                {/* Description */}
                <div className="grid gap-2">
                  <Label htmlFor="description" className="font-medium">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Product description..."
                    rows={4}
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

                {/* Benefits */}
                <div className="grid gap-2">
                  <Label htmlFor="benefits" className="font-medium">
                    Benefits
                  </Label>
                  <Textarea
                    id="benefits"
                    placeholder="Product benefits..."
                    rows={3}
                    {...register("benefits")}
                    className="w-full border-textColor-primary"
                  />
                  <p className="text-gray-500 text-xs">
                    List the key benefits of using this product. Consider using
                    bullet points for clarity.
                  </p>
                  {errors.benefits && (
                    <div className="flex items-center text-red-500 text-sm mt-1">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      <span>{errors.benefits.message}</span>
                    </div>
                  )}
                </div>

                {/* Key Ingredients */}
                <div className="grid gap-2">
                  <Label htmlFor="key_ingredients" className="font-medium">
                    Key Ingredients
                  </Label>
                  <Textarea
                    id="key_ingredients"
                    placeholder="Key ingredients..."
                    rows={3}
                    {...register("key_ingredients")}
                    className="w-full border-textColor-primary"
                  />
                  <p className="text-gray-500 text-xs">
                    List the main active ingredients in this product.
                  </p>
                  {errors.key_ingredients && (
                    <div className="flex items-center text-red-500 text-sm mt-1">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      <span>{errors.key_ingredients.message}</span>
                    </div>
                  )}
                </div>

                {/* How to Use */}
                <div className="grid gap-2">
                  <Label htmlFor="how_to_use" className="font-medium">
                    How to Use
                  </Label>
                  <Textarea
                    id="how_to_use"
                    placeholder="Usage instructions..."
                    rows={3}
                    {...register("how_to_use")}
                    className="w-full border-textColor-primary"
                  />
                  <p className="text-gray-500 text-xs">
                    Provide clear instructions on how to use this product.
                  </p>
                  {errors.how_to_use && (
                    <div className="flex items-center text-red-500 text-sm mt-1">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      <span>{errors.how_to_use.message}</span>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Images Tab */}
            <TabsContent value="images" className="pt-4">
              <div className="grid gap-4">
                <div className="border-2 border-dashed rounded-lg p-4 text-center">
                  <Input
                    type="file"
                    id="image-upload"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    accept="image/*"
                  />
                  <Label htmlFor="image-upload" className="cursor-pointer">
                    <div className="flex flex-col items-center gap-2 w-full">
                      <ImagePlus className="h-8 w-8 text-gray-400" />
                      <p className="text-sm text-gray-500">
                        Drag and drop images or click to upload
                      </p>
                      {previewUrls.length > 0 && (
                        <Button
                          type="button"
                          onClick={uploadImages}
                          disabled={uploading}
                          className="mt-4"
                        >
                          {uploading ? "Uploading..." : "Upload Images"}
                        </Button>
                      )}
                    </div>
                  </Label>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {(watch("product_images") || []).map((image, index) => (
                    <div
                      className="relative group aspect-square rounded-lg overflow-hidden"
                      key={index}
                    >
                      <Image
                        fill
                        src={image.image_url}
                        alt="Banner preview"
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                      <div className="absolute inset-0 bg-black/0 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 group-hover:bg-black/50">
                        <Button
                          type="button"
                          size="sm"
                          variant={image.is_primary ? "default" : "outline"}
                          className="transform scale-90 group-hover:scale-100 transition-transform"
                          onClick={() => setPrimaryImage(index)}
                        >
                          {image.is_primary ? "Primary" : "Set Primary"}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          className="transform scale-90 group-hover:scale-100 transition-transform"
                          onClick={() => removeImage(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                {errors.product_images && (
                  <div className="flex items-center text-red-500 text-sm mt-1">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    <span>{errors.product_images.message as string}</span>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="gap-2 mt-6">
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
                ? "Update Product"
                : "Create Product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
