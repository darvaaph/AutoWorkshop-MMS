"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { vehiclesApi } from "@/lib/api";
import { toast } from "sonner";
import { AxiosError } from "axios";
import { getUploadUrl } from "@/lib/utils";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Upload, X, Car } from "lucide-react";

interface Vehicle {
  id: number;
  customer_id: number;
  license_plate: string;
  brand: string;
  model: string;
  current_km: number | null;
  next_service_date: string | null;
  next_service_km: number | null;
  image_url: string | null;
}

interface CustomerOption {
  id: number;
  name: string;
  phone: string;
}

interface VehicleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: Vehicle | null;
  customers: CustomerOption[];
}

export function VehicleFormDialog({
  open,
  onOpenChange,
  vehicle,
  customers,
}: VehicleFormDialogProps) {
  const queryClient = useQueryClient();
  const isEditing = !!vehicle;

  const [customerId, setCustomerId] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [currentKm, setCurrentKm] = useState("");
  const [nextServiceDate, setNextServiceDate] = useState("");
  const [nextServiceKm, setNextServiceKm] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (vehicle) {
        setCustomerId(String(vehicle.customer_id));
        setLicensePlate(vehicle.license_plate);
        setBrand(vehicle.brand);
        setModel(vehicle.model);
        setCurrentKm(vehicle.current_km ? String(vehicle.current_km) : "");
        setNextServiceDate(vehicle.next_service_date || "");
        setNextServiceKm(
          vehicle.next_service_km ? String(vehicle.next_service_km) : ""
        );
        setImagePreview(getUploadUrl(vehicle.image_url));
      } else {
        setCustomerId("");
        setLicensePlate("");
        setBrand("");
        setModel("");
        setCurrentKm("");
        setNextServiceDate("");
        setNextServiceKm("");
        setImagePreview(null);
      }
      setImageFile(null);
    }
  }, [open, vehicle]);

  const mutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append("customer_id", customerId);
      formData.append("license_plate", licensePlate.toUpperCase());
      formData.append("brand", brand);
      formData.append("model", model);
      if (currentKm) formData.append("current_km", currentKm);
      if (nextServiceDate) formData.append("next_service_date", nextServiceDate);
      if (nextServiceKm) formData.append("next_service_km", nextServiceKm);
      if (imageFile) formData.append("image", imageFile);

      if (isEditing) {
        return vehiclesApi.update(vehicle.id, formData);
      }
      return vehiclesApi.create(formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      toast.success(
        isEditing
          ? "Kendaraan berhasil diperbarui"
          : "Kendaraan berhasil ditambahkan"
      );
      onOpenChange(false);
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      toast.error(
        error.response?.data?.message ||
          (isEditing
            ? "Gagal memperbarui kendaraan"
            : "Gagal menambah kendaraan")
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

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || !licensePlate.trim() || !brand.trim() || !model.trim()) {
      toast.error("Pemilik, plat nomor, merk, dan model wajib diisi");
      return;
    }
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Kendaraan" : "Tambah Kendaraan Baru"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Perbarui informasi kendaraan"
              : "Isi data kendaraan baru di bawah ini"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Image */}
          <div className="flex items-center gap-4">
            <div className="relative">
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="size-16 rounded-lg object-cover border"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-destructive text-white text-xs hover:bg-destructive/90"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ) : (
                <div className="size-16 rounded-lg border bg-muted flex items-center justify-center">
                  <Car className="size-6 text-muted-foreground" />
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="vehicle-image" className="cursor-pointer">
                <span className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                  <Upload className="size-3.5" />
                  {imagePreview ? "Ganti Foto" : "Unggah Foto"}
                </span>
              </Label>
              <input
                id="vehicle-image"
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

          {/* Customer */}
          <div className="space-y-2">
            <Label>
              Pemilik <span className="text-destructive">*</span>
            </Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih pelanggan" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name} — {c.phone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* License Plate */}
          <div className="space-y-2">
            <Label htmlFor="license_plate">
              Plat Nomor <span className="text-destructive">*</span>
            </Label>
            <Input
              id="license_plate"
              value={licensePlate}
              onChange={(e) => setLicensePlate(e.target.value)}
              placeholder="B 1234 XYZ"
              className="uppercase"
              required
            />
          </div>

          {/* Brand & Model */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="brand">
                Merk <span className="text-destructive">*</span>
              </Label>
              <Input
                id="brand"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Toyota"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="model">
                Model <span className="text-destructive">*</span>
              </Label>
              <Input
                id="model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="Avanza"
                required
              />
            </div>
          </div>

          {/* Current KM */}
          <div className="space-y-2">
            <Label htmlFor="current_km">KM Saat Ini</Label>
            <Input
              id="current_km"
              type="number"
              value={currentKm}
              onChange={(e) => setCurrentKm(e.target.value)}
              placeholder="50000"
              min="0"
            />
          </div>

          {/* Service Reminder (only shown when editing) */}
          {isEditing && (
            <div className="space-y-3 rounded-lg border p-4">
              <h4 className="text-sm font-medium">Pengingat Servis</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="next_service_date">Tanggal Servis</Label>
                  <Input
                    id="next_service_date"
                    type="date"
                    value={nextServiceDate}
                    onChange={(e) => setNextServiceDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="next_service_km">KM Servis</Label>
                  <Input
                    id="next_service_km"
                    type="number"
                    value={nextServiceKm}
                    onChange={(e) => setNextServiceKm(e.target.value)}
                    placeholder="55000"
                    min="0"
                  />
                </div>
              </div>
            </div>
          )}

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
                "Tambah Kendaraan"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
