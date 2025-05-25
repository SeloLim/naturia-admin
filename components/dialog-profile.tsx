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
import { Label } from "@/components/ui/label";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Define the Profile type (for potentially displaying existing profiles, might need email here)
// Note: Fetching logic needs to ensure email is included when getting profile data for edit mode
interface Profile {
  id: string; // profile table row ID
  user_id: string; // auth.users ID - This is what links profile to user
  full_name: string | null;
  role: "admin" | "editor" | "viewer" | "customer";
  created_at: string;
  updated_at: string;
  email?: string; // Added email field - ASSUMING your GET API or fetching logic provides this
}

// Skema validasi untuk form input
// Password dibuat optional di sini. Validasi wajib/min length akan dilakukan di onSubmit.
const profileFormSchema = z.object({
  email: z.string().email("Invalid email address").min(1, "Email is required"),
  // Password is now optional at the Zod schema level
  password: z.string().optional(), // Allow undefined or empty string
  full_name: z.string().min(1, "Full name is required"), // Make required as per UI input
  role: z.enum(["admin", "editor", "viewer", "customer"]),
});

// Tipe data berdasarkan skema form
type ProfileFormValues = z.infer<typeof profileFormSchema>;

// Tipe data untuk payload UPDATE (PATCH) - password dan email mungkin opsional di sini
// Kita definisikan terpisah karena form yang sama digunakan untuk CREATE dan UPDATE
type ProfileUpdatePayload = {
  full_name?: string;
  role?: "admin" | "editor" | "viewer" | "customer";
  email?: string;
  password?: string;
};

interface ProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile?: Profile; // For editing existing profile
  // onSave akan menerima data *setelah* berhasil disimpan di backend
  // Untuk mode create, ini adalah data profil yang baru dibuat dari respons API POST
  // Untuk mode edit (PATCH), ini adalah data profil/user yang diperbarui dari respons API PATCH
  onSave: (savedProfile: Profile) => void;
}

export function ProfileDialog({
  open,
  onOpenChange,
  profile,
  onSave,
}: ProfileDialogProps) {
  const isEditMode = !!profile;
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Gunakan skema yang sama untuk CREATE dan UPDATE di form.
  // Logika custom untuk validasi password (required saat create) dan payload
  // akan ditangani di onSubmit.
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      // user_id dihapus dari skema, jadi tidak di sini
      full_name: profile?.full_name || "",
      role: profile?.role || "admin", // Default role 'admin' for new users per form UI, matches select options
      email: profile?.email || "",
      password: "", // Password selalu kosong saat dialog dibuka
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
    setError,
    clearErrors,
    watch,
  } = form;

  // Handle role selection
  const handleRoleChange = (value: string) => {
    setValue("role", value as "admin" | "editor" | "viewer" | "customer");
  };

  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Handle form submission
  const onSubmit = async (data: ProfileFormValues) => {
    setIsSaving(true); // Set saving loading state
    clearErrors(); // Clear any previous API errors

    // --- CUSTOM VALIDATION FOR CREATE MODE ---
    // Password wajib diisi dan minimal 8 karakter saat mode CREATE
    if (!isEditMode) {
      if (!data.password || data.password.length < 8) {
        setError("password", {
          type: "manual",
          message: "Password is required for new users (min 8 characters)",
        });
        setIsSaving(false);
        return; // Stop submission
      }
    } else {
      // --- CUSTOM VALIDATION FOR EDIT MODE ---
      // If password is provided in edit mode, validate its length
      if (
        data.password &&
        data.password.length > 0 &&
        data.password.length < 8
      ) {
        setError("password", {
          type: "manual",
          message: "Password must be at least 8 characters if changing it",
        });
        setIsSaving(false);
        return; // Stop submission
      }
      // If password is empty in edit mode, it's valid (means keep current)
    }
    // --- END CUSTOM VALIDATION ---

    // Tentukan payload dan endpoint berdasarkan mode
    let apiEndpoint: string;
    let method: string;
    let payload: unknown; // Use 'any' temporarily or define specific types

    if (isEditMode) {
      // --- LOGIKA UNTUK UPDATE (PATCH) ---
      // Perhatikan: API PATCH backend BELUM DIBUAT
      // Payload hanya mencakup field yang diizinkan untuk diupdate
      // Serta hanya mengirim password/email jika diisi/berubah
      apiEndpoint = `/api/users/${profile!.user_id}`; // Endpoint PATCH menggunakan user_id
      method = "PATCH";

      const updatePayload: ProfileUpdatePayload = {
        // Hanya sertakan full_name dan role jika ada perubahan atau Anda ingin selalu mengirimnya
        full_name: data.full_name, // Mengirim full_name dari form
        role: data.role, // Mengirim role dari form
      };

      // Tambahkan email ke payload hanya jika diubah dari nilai awal
      if (data.email !== profile!.email) {
        // Validasi email jika diubah (Zod already did basic format check)
        // You might add more specific backend-aware checks here if needed
        updatePayload.email = data.email;
      }

      // Tambahkan password ke payload hanya jika diisi (tidak kosong)
      // Manual validation above already checked min length if provided
      if (data.password && data.password !== "") {
        updatePayload.password = data.password;
      }

      payload = updatePayload;
      console.log("Submitting for PATCH:", payload);
    } else {
      // --- LOGIKA UNTUK CREATE (POST) ---
      apiEndpoint = "/api/users"; // Endpoint POST
      method = "POST";
      // Payload mencakup semua data dari form (email, password, full_name, role)
      // Manual validation above already ensured password is required and min 8
      payload = data; // data already validated by Zod for email/full_name/role format

      console.log("Submitting for POST:", payload);
    }

    try {
      const response = await fetch(apiEndpoint, {
        method: method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("API Error:", errorData);
        const errorMessage = errorData.message || "Unknown API error";

        // Tampilkan error umum dari API
        // Using console.error instead of alert for better UX
        console.error(
          `${
            isEditMode ? "Failed to update" : "Failed to create"
          } user: ${errorMessage}`
        );

        // Handle specific backend validation errors if any (assuming backend sends errors object)
        if (errorData.errors && typeof errorData.errors === "object") {
          Object.entries(errorData.errors).forEach(([fieldName, message]) => {
            // Check if the field exists in our form schema before setting error
            // Note: Backend errors might use different field names
            if (fieldName in profileFormSchema.shape) {
              setError(fieldName as keyof ProfileFormValues, {
                type: "manual",
                message: message as string,
              });
            } else {
              // For errors not directly tied to a form field (e.g., "email already exists")
              // You might want a general error state or display it differently
              console.warn(
                `Backend returned error for unknown field: ${fieldName}. Message: ${message}`
              );
              // Example: Set a general form error
              setError("root.serverError", {
                type: "manual",
                message: `Server error: ${message}`,
              });
            }
          });
        } else {
          // Handle cases where backend sends a single error message not in 'errors' object
          setError("root.serverError", {
            type: "manual",
            message: `Server error: ${errorMessage}`,
          });
        }

        setIsSaving(false); // Reset saving state on error
        return;
      }

      const json = await response.json();
      console.log("API Success Response:", json);
      onSave(json); // Panggil onSave dengan data respons dari backend
      onOpenChange(false); // Tutup dialog
      setIsSaving(false); // Reset saving state on success
    } catch (error: unknown) {
      console.error(
        "Network or unexpected error while saving/updating:",
        error
      );
      let errorMessage = "An unexpected error occurred";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      // Using console.error instead of alert for better UX
      console.error(`An unexpected error occurred: ${errorMessage}`);
      setError("root.unexpected", {
        type: "manual",
        message: `An unexpected error occurred: ${errorMessage}`,
      });
      setIsSaving(false); // Reset saving state on error
    }
  };

  // Reset form when dialog is closed or opened, and populate data in edit mode
  useEffect(() => {
    // console.log("useEffect hook running. Open:", open, "Profile:", profile);
    if (!open) {
      // Dialog closed
      // console.log("Dialog is closed. Resetting form.");
      reset({
        // password selalu dikosongkan saat reset
        password: "",
        // Reset field lainnya ke nilai default atau nilai awal profile jika ada
        full_name: profile?.full_name || "",
        role: profile?.role || "admin", // Default role 'admin' for new, use profile's role for edit
        email: profile?.email || "", // Use profile's email for edit
      });
      clearErrors();
    } else {
      // Dialog opened
      // console.log("Dialog is opened.");
      if (profile) {
        // Mode EDIT: Set form values from profile prop
        // console.log("Setting form values for edit mode:", profile);
        reset({
          // user_id tidak di form input
          full_name: profile.full_name || "",
          role: profile.role,
          email: profile.email || "", // Pastikan email ada di profile prop!
          password: "", // Password field is always empty initially in edit mode
        });
      } else {
        // Mode CREATE: Set default initial values
        // console.log("Setting default values for create mode.");
        reset({
          full_name: "",
          role: "admin", // Default role for new user in form
          email: "",
          password: "",
        });
      }
      clearErrors(); // Clear errors when opening
    }
  }, [open, reset, clearErrors, profile]); // Dependensi useEffect

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle className="text-xl font-serif">
              {isEditMode ? "Edit User" : "Add New User"}
            </DialogTitle>
            <DialogDescription>
              {isEditMode
                ? "Update the details of this user profile."
                : "Create a new user profile."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            {/* Email */}
            <div className="grid gap-2">
              <Label htmlFor="email" className="font-medium">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="example@domain.com"
                {...register("email")}
                className="w-full border-textColor-primary"
                // Email mungkin tidak boleh diubah di UI atau memerlukan perlakuan khusus di backend
                // jika mode edit: disabled={isEditMode} // Pertimbangkan apakah email bisa diubah
              />
              {errors.email && (
                <div className="flex items-center text-red-500 text-sm mt-1">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  <span>{errors.email.message}</span>
                </div>
              )}
            </div>

            {/* Password */}
            {/* Password hanya wajib diisi saat mode CREATE. Opsional saat EDIT. */}
            <div className="grid gap-2">
              <Label htmlFor="password" className="font-medium">
                Password{" "}
                {isEditMode ? "" : <span className="text-red-500">*</span>}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={
                    isEditMode
                      ? "Leave blank to keep current"
                      : "Enter password"
                  }
                  {...register("password")}
                  className="w-full border-textColor-primary pr-10"
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-500" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-500" />
                  )}
                </button>
              </div>
              {/* Tampilkan error password dari react-hook-form (set manually in onSubmit) */}
              {errors.password && (
                <div className="flex items-center text-red-500 text-sm mt-1">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  <span>{errors.password.message}</span>
                </div>
              )}
              <p className="text-gray-500 text-xs">
                {/* Sesuaikan pesan ini dengan role yang tersedia di SelectContent */}
                {isEditMode
                  ? "Leave blank to keep current password."
                  : "Password must be at least 8 characters long."}
              </p>
            </div>

            {/* Full Name */}
            <div className="grid gap-2">
              <Label htmlFor="full_name" className="font-medium">
                Full Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="full_name"
                type="text"
                placeholder="e.g. John Doe"
                {...register("full_name")}
                className="w-full border-textColor-primary"
              />
              {errors.full_name && (
                <div className="flex items-center text-red-500 text-sm mt-1">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  <span>{errors.full_name.message}</span>
                </div>
              )}
            </div>

            {/* Role Selection */}
            <div className="grid gap-2">
              <Label htmlFor="role" className="font-medium">
                Role
              </Label>
              <Select
                onValueChange={handleRoleChange}
                value={watch("role")} // watch("role") memastikan Select terupdate saat setValue dipanggil
              >
                <SelectTrigger className="w-full border-textColor-primary">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="editor" disabled>
                    Editor (Disabled)
                  </SelectItem>{" "}
                  {/* Tetap disabled jika tidak diizinkan */}
                  <SelectItem value="viewer" disabled>
                    Viewer (Disabled)
                  </SelectItem>{" "}
                  {/* Tetap disabled jika tidak diizinkan */}
                  <SelectItem value="customer">Customer</SelectItem>
                </SelectContent>
              </Select>
              {errors.role && (
                <div className="flex items-center text-red-500 text-sm mt-1">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  <span>{errors.role.message}</span>
                </div>
              )}
              <p className="text-gray-500 text-xs">
                {/* Sesuaikan pesan ini dengan role yang tersedia di SelectContent */}
                Choose the user&apos;s role.
              </p>
            </div>

            {/* General Server Errors */}
            {errors.root?.serverError && (
              <div className="flex items-center text-red-500 text-sm mt-2">
                <AlertCircle className="h-4 w-4 mr-1" />
                <span>{errors.root.serverError.message}</span>
              </div>
            )}
            {errors.root?.unexpected && (
              <div className="flex items-center text-red-500 text-sm mt-2">
                <AlertCircle className="h-4 w-4 mr-1" />
                <span>{errors.root.unexpected.message}</span>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 mt-4">
            <Button
              type="button"
              variant="outline"
              className="border-textColor-primary"
              onClick={() => onOpenChange(false)}
              disabled={isSaving} // Disable cancel while saving
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-button-primary hover:bg-button-secondary text-white hover:text-textColor-primary"
              // Disable jika sedang menyimpan atau ada error validasi form (kecuali error password yang ditangani custom)
              // We now rely on the manual validation in onSubmit to prevent submission if password is required but missing
              disabled={isSaving || Object.keys(errors).length > 0}
            >
              {isSaving
                ? "Saving..."
                : isEditMode
                ? "Update User"
                : "Create User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
