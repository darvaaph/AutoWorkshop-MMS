"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { customersApi } from "@/lib/api";
import { toast } from "sonner";
import { AxiosError } from "axios";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials, getUploadUrl } from "@/lib/utils";
import { Loader2, Upload, X } from "lucide-react";

interface Customer {
  id: number;
  name: string;
  phone: string;
  address: string | null;
  photo_url: string | null;
}

interface CustomerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null; // null = create mode
}

export function CustomerFormDialog({
  open,
  onOpenChange,
  customer,
}: CustomerFormDialogProps) {
  const queryClient = useQueryClient();
  const isEditing = !!customer;

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Populate form when editing
  useEffect(() => {
    if (open) {
      if (customer) {
        setName(customer.name);
        setPhone(customer.phone);
        setAddress(customer.address || "");
        setPhotoPreview(getUploadUrl(customer.photo_url));
      } else {
        setName("");
        setPhone("");
        setAddress("");
        setPhotoPreview(null);
      }
      setPhotoFile(null);
    }
  }, [open, customer]);

  const mutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("phone", phone);
      if (address) formData.append("address", address);
      if (photoFile) formData.append("photo", photoFile);

      if (isEditing) {
        return customersApi.update(customer.id, formData);
      }
      return customersApi.create(formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success(
        isEditing
          ? "Pelanggan berhasil diperbarui"
          : "Pelanggan berhasil ditambahkan"
      );
      onOpenChange(false);
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      toast.error(
        error.response?.data?.message ||
          (isEditing ? "Gagal memperbarui pelanggan" : "Gagal menambah pelanggan")
      );
    },
  });

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Format file tidak didukung. Gunakan JPEG, PNG, atau GIF.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Ukuran file terlalu besar. Maksimal 2MB.");
      return;
    }

    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      toast.error("Nama dan telepon wajib diisi");
      return;
    }
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Pelanggan" : "Tambah Pelanggan Baru"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Perbarui informasi pelanggan"
              : "Isi data pelanggan baru di bawah ini"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Photo */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="size-16">
                {photoPreview && (
                  <AvatarImage src={photoPreview} alt="Preview" />
                )}
                <AvatarFallback className="bg-primary/10 text-primary text-lg">
                  {name ? getInitials(name) : "?"}
                </AvatarFallback>
              </Avatar>
              {photoPreview && (
                <button
                  type="button"
                  onClick={removePhoto}
                  className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-destructive text-white text-xs hover:bg-destructive/90"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>
            <div>
              <Label htmlFor="photo" className="cursor-pointer">
                <span className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                  <Upload className="size-3.5" />
                  {photoPreview ? "Ganti Foto" : "Unggah Foto"}
                </span>
              </Label>
              <input
                id="photo"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/gif"
                onChange={handlePhotoChange}
                className="hidden"
              />
              <p className="text-xs text-muted-foreground mt-0.5">
                JPEG, PNG, GIF. Maks 2MB
              </p>
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Nama <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama lengkap pelanggan"
              required
            />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone">
              Telepon <span className="text-destructive">*</span>
            </Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="08xxxxxxxxxx"
              required
            />
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address">Alamat</Label>
            <Textarea
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Alamat lengkap (opsional)"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Batal
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Menyimpan...
                </>
              ) : isEditing ? (
                "Simpan Perubahan"
              ) : (
                "Tambah Pelanggan"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
