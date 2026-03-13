"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { servicesApi } from "@/lib/api";
import { getInitials, getUploadUrl } from "@/lib/utils";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Upload, X } from "lucide-react";

interface Service {
  id: number;
  name: string;
  price: string;
  image_url: string | null;
}

interface ServiceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: Service | null;
}

export function ServiceFormDialog({
  open,
  onOpenChange,
  service,
}: ServiceFormDialogProps) {
  const queryClient = useQueryClient();
  const isEditing = !!service;

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (service) {
        setName(service.name);
        setPrice(service.price);
        setImagePreview(getUploadUrl(service.image_url));
      } else {
        setName("");
        setPrice("");
        setImagePreview(null);
      }
      setImageFile(null);
    }
  }, [open, service]);

  const mutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("price", price);
      if (imageFile) {
        formData.append("image", imageFile);
      }

      if (isEditing) {
        return servicesApi.update(service.id, formData);
      }

      return servicesApi.create(formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast.success(
        isEditing ? "Jasa berhasil diperbarui" : "Jasa berhasil ditambahkan"
      );
      onOpenChange(false);
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      toast.error(
        error.response?.data?.message ||
          (isEditing ? "Gagal memperbarui jasa" : "Gagal menambah jasa")
      );
    },
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Format file tidak didukung. Gunakan JPEG, PNG, atau GIF.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Ukuran file terlalu besar. Maksimal 2MB.");
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(isEditing ? getUploadUrl(service?.image_url) : null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const parsedPrice = Number(price);
    if (!name.trim() || price === "") {
      toast.error("Nama dan harga wajib diisi");
      return;
    }

    if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
      toast.error("Harga harus berupa angka 0 atau lebih");
      return;
    }

    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Jasa" : "Tambah Jasa Baru"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Perbarui informasi jasa layanan"
              : "Isi data jasa layanan baru di bawah ini"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="size-16 rounded">
                {imagePreview && <AvatarImage src={imagePreview} alt="Preview" />}
                <AvatarFallback className="bg-primary/10 text-primary text-lg rounded">
                  {name ? getInitials(name) : "?"}
                </AvatarFallback>
              </Avatar>
              {imagePreview && (
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-destructive text-white text-xs hover:bg-destructive/90"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>

            <div>
              <Label htmlFor="service-image" className="cursor-pointer">
                <span className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                  <Upload className="size-3.5" />
                  {imagePreview ? "Ganti Gambar" : "Unggah Gambar"}
                </span>
              </Label>
              <input
                id="service-image"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/gif"
                onChange={handleImageChange}
                className="hidden"
              />
              <p className="text-xs text-muted-foreground mt-0.5">
                JPEG, PNG, GIF. Maks 2MB
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="service-name">
              Nama Jasa <span className="text-destructive">*</span>
            </Label>
            <Input
              id="service-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Ganti Oli Mesin"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="service-price">
              Harga <span className="text-destructive">*</span>
            </Label>
            <Input
              id="service-price"
              type="number"
              min="0"
              step="100"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0"
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
              {isEditing ? "Simpan Perubahan" : "Tambah Jasa"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
