"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { packagesApi, productsApi, servicesApi } from "@/lib/api";
import { toast } from "sonner";
import { AxiosError } from "axios";
import { formatCurrency, getInitials, getUploadUrl } from "@/lib/utils";

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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Loader2,
  Upload,
  X,
  Plus,
  Minus,
  Package,
  Wrench,
  Trash2,
} from "lucide-react";

/* ─── Types ──────────────────────────────────────────────── */

interface PackageItem {
  id?: number;
  product_id: number | null;
  service_id: number | null;
  qty: number;
  // For display
  name?: string;
  price?: number;
  type?: "product" | "service";
}

interface PackageData {
  id: number;
  name: string;
  price: string;
  description: string | null;
  is_active: boolean;
  image_url: string | null;
  items: Array<{
    id: number;
    package_id: number;
    product_id: number | null;
    service_id: number | null;
    qty: number;
    product?: { id: number; sku: string; name: string; price_sell: string; price_buy: string; stock: number };
    service?: { id: number; name: string; price: string };
  }>;
}

interface ProductOption {
  id: number;
  sku: string;
  name: string;
  price_sell: string;
  stock: number;
}

interface ServiceOption {
  id: number;
  name: string;
  price: string;
}

interface PackageFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  packageData: PackageData | null;
}

export function PackageFormDialog({
  open,
  onOpenChange,
  packageData,
}: PackageFormDialogProps) {
  const queryClient = useQueryClient();
  const isEditing = !!packageData;

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [items, setItems] = useState<PackageItem[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Fetch available products & services for the selector
  const { data: productsData } = useQuery({
    queryKey: ["products-select"],
    queryFn: async () => {
      const res = await productsApi.getAll({ limit: 500 });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return ((res.data as any).data?.products || []) as ProductOption[];
    },
    enabled: open,
  });

  const { data: servicesData } = useQuery({
    queryKey: ["services-select"],
    queryFn: async () => {
      const res = await servicesApi.getAll({ limit: 500 });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return ((res.data as any).data?.services || []) as ServiceOption[];
    },
    enabled: open,
  });

  const products = productsData || [];
  const services = servicesData || [];

  useEffect(() => {
    if (open) {
      if (packageData) {
        setName(packageData.name);
        setPrice(packageData.price);
        setDescription(packageData.description || "");
        setIsActive(packageData.is_active);
        setImagePreview(getUploadUrl(packageData.image_url));
        // Map existing items
        setItems(
          packageData.items.map((item) => ({
            product_id: item.product_id,
            service_id: item.service_id,
            qty: item.qty,
            name: item.product?.name || item.service?.name || "",
            price: Number(item.product?.price_sell || item.service?.price || 0),
            type: item.product_id ? "product" : "service",
          }))
        );
      } else {
        setName("");
        setPrice("");
        setDescription("");
        setIsActive(true);
        setItems([]);
        setImagePreview(null);
      }
      setImageFile(null);
    }
  }, [open, packageData]);

  const mutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("price", price);
      if (description) formData.append("description", description);
      formData.append("is_active", String(isActive));
      if (imageFile) formData.append("image", imageFile);

      // Serialize items as JSON
      const itemsPayload = items.map((item) => ({
        product_id: item.product_id || undefined,
        service_id: item.service_id || undefined,
        qty: item.qty,
      }));
      formData.append("items", JSON.stringify(itemsPayload));

      if (isEditing) {
        return packagesApi.update(packageData.id, formData);
      }
      return packagesApi.create(formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["packages"] });
      toast.success(
        isEditing ? "Paket berhasil diperbarui" : "Paket berhasil ditambahkan"
      );
      onOpenChange(false);
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      toast.error(
        error.response?.data?.message ||
          (isEditing ? "Gagal memperbarui paket" : "Gagal menambah paket")
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

  const addProductItem = (productId: string) => {
    const product = products.find((p) => p.id === Number(productId));
    if (!product) return;

    // Check if already added
    const existing = items.find((i) => i.product_id === product.id);
    if (existing) {
      setItems(
        items.map((i) =>
          i.product_id === product.id ? { ...i, qty: i.qty + 1 } : i
        )
      );
      return;
    }

    setItems([
      ...items,
      {
        product_id: product.id,
        service_id: null,
        qty: 1,
        name: product.name,
        price: Number(product.price_sell),
        type: "product",
      },
    ]);
  };

  const addServiceItem = (serviceId: string) => {
    const service = services.find((s) => s.id === Number(serviceId));
    if (!service) return;

    const existing = items.find((i) => i.service_id === service.id);
    if (existing) {
      setItems(
        items.map((i) =>
          i.service_id === service.id ? { ...i, qty: i.qty + 1 } : i
        )
      );
      return;
    }

    setItems([
      ...items,
      {
        product_id: null,
        service_id: service.id,
        qty: 1,
        name: service.name,
        price: Number(service.price),
        type: "service",
      },
    ]);
  };

  const updateItemQty = (index: number, delta: number) => {
    setItems(
      items.map((item, i) => {
        if (i !== index) return item;
        const newQty = Math.max(1, item.qty + delta);
        return { ...item, qty: newQty };
      })
    );
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Calculate totals
  const totalRetail = items.reduce(
    (sum, item) => sum + (item.price || 0) * item.qty,
    0
  );
  const packagePrice = Number(price) || 0;
  const customerSavings = totalRetail - packagePrice;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !price) {
      toast.error("Nama dan harga paket wajib diisi");
      return;
    }
    if (items.length === 0) {
      toast.error("Paket harus memiliki minimal 1 item");
      return;
    }
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Paket" : "Tambah Paket Baru"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Perbarui informasi paket layanan"
              : "Buat paket bundling produk & jasa"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Image */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="size-16 rounded">
                {imagePreview && (
                  <AvatarImage src={imagePreview} alt="Preview" />
                )}
                <AvatarFallback className="bg-primary/10 text-primary text-lg rounded">
                  {name ? getInitials(name) : "?"}
                </AvatarFallback>
              </Avatar>
              {imagePreview && (
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-destructive text-white text-xs hover:bg-destructive/90"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>
            <div>
              <Label htmlFor="package-image" className="cursor-pointer">
                <span className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                  <Upload className="size-3.5" />
                  {imagePreview ? "Ganti Gambar" : "Unggah Gambar"}
                </span>
              </Label>
              <input
                id="package-image"
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

          {/* Name & Price */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="package-name">
                Nama Paket <span className="text-destructive">*</span>
              </Label>
              <Input
                id="package-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Paket Ganti Oli"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="package-price">
                Harga Paket <span className="text-destructive">*</span>
              </Label>
              <Input
                id="package-price"
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0"
                min="0"
                step="1000"
                required
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="package-desc">Deskripsi</Label>
            <Textarea
              id="package-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Deskripsi paket (opsional)"
              rows={2}
            />
          </div>

          {/* Active toggle */}
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={isActive ? "true" : "false"}
              onValueChange={(val) => setIsActive(val === "true")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Aktif</SelectItem>
                <SelectItem value="false">Nonaktif</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Items */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">
              Isi Paket <span className="text-destructive">*</span>
            </Label>

            {/* Add product */}
            <div className="flex gap-2">
              <div className="flex-1">
                <Select onValueChange={addProductItem}>
                  <SelectTrigger>
                    <SelectValue placeholder="+ Tambah Produk" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={`p-${p.id}`} value={String(p.id)}>
                        <span className="flex items-center gap-2">
                          <Package className="size-3.5 text-muted-foreground" />
                          {p.name}
                          <span className="text-muted-foreground text-xs">
                            ({formatCurrency(Number(p.price_sell))})
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Select onValueChange={addServiceItem}>
                  <SelectTrigger>
                    <SelectValue placeholder="+ Tambah Jasa" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((s) => (
                      <SelectItem key={`s-${s.id}`} value={String(s.id)}>
                        <span className="flex items-center gap-2">
                          <Wrench className="size-3.5 text-muted-foreground" />
                          {s.name}
                          <span className="text-muted-foreground text-xs">
                            ({formatCurrency(Number(s.price))})
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Items list */}
            {items.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                Belum ada item. Tambahkan produk atau jasa di atas.
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 rounded-lg border p-3"
                  >
                    <Badge
                      variant="outline"
                      className={
                        item.type === "product"
                          ? "bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                          : "bg-purple-50 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
                      }
                    >
                      {item.type === "product" ? (
                        <Package className="size-3 mr-1" />
                      ) : (
                        <Wrench className="size-3 mr-1" />
                      )}
                      {item.type === "product" ? "Produk" : "Jasa"}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(item.price || 0)} x {item.qty} ={" "}
                        {formatCurrency((item.price || 0) * item.qty)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-7"
                        onClick={() => updateItemQty(index, -1)}
                        disabled={item.qty <= 1}
                      >
                        <Minus className="size-3" />
                      </Button>
                      <span className="w-8 text-center text-sm font-medium">
                        {item.qty}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-7"
                        onClick={() => updateItemQty(index, 1)}
                      >
                        <Plus className="size-3" />
                      </Button>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7 text-destructive hover:text-destructive"
                      onClick={() => removeItem(index)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Summary */}
            {items.length > 0 && price && (
              <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total harga satuan:</span>
                  <span>{formatCurrency(totalRetail)}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>Harga paket:</span>
                  <span>{formatCurrency(packagePrice)}</span>
                </div>
                <Separator className="my-1" />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Hemat pelanggan:</span>
                  <span
                    className={
                      customerSavings > 0
                        ? "text-green-600 font-medium"
                        : customerSavings < 0
                        ? "text-red-600 font-medium"
                        : ""
                    }
                  >
                    {customerSavings > 0 ? "+" : ""}
                    {formatCurrency(customerSavings)}
                    {totalRetail > 0 && (
                      <span className="ml-1 text-xs">
                        ({((customerSavings / totalRetail) * 100).toFixed(1)}%)
                      </span>
                    )}
                  </span>
                </div>
              </div>
            )}
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
              {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
              {isEditing ? "Simpan Perubahan" : "Tambah Paket"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
