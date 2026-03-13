"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { productsApi } from "@/lib/api";
import { toast } from "sonner";
import { AxiosError } from "axios";
import { getInitials, getUploadUrl } from "@/lib/utils";

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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Upload, X } from "lucide-react";

interface Product {
  id: number;
  sku: string;
  name: string;
  image_url: string | null;
  category: string;
  price_buy: string;
  price_sell: string;
  stock: number;
  min_stock_alert: number;
}

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  categories: string[];
}

const DEFAULT_CATEGORIES = [
  "Oli",
  "Filter",
  "Aki",
  "Ban",
  "Kampas Rem",
  "Busi",
  "Lampu",
  "Sparepart",
  "Aksesoris",
  "Lainnya",
];

export function ProductFormDialog({
  open,
  onOpenChange,
  product,
  categories,
}: ProductFormDialogProps) {
  const queryClient = useQueryClient();
  const isEditing = !!product;

  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [priceBuy, setPriceBuy] = useState("");
  const [priceSell, setPriceSell] = useState("");
  const [stock, setStock] = useState("0");
  const [minStockAlert, setMinStockAlert] = useState("5");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Merge existing categories with defaults
  const allCategories = Array.from(
    new Set([...DEFAULT_CATEGORIES, ...categories])
  ).sort();

  useEffect(() => {
    if (open) {
      if (product) {
        setSku(product.sku);
        setName(product.name);
        setCategory(product.category);
        setCustomCategory("");
        setPriceBuy(product.price_buy);
        setPriceSell(product.price_sell);
        setStock(String(product.stock));
        setMinStockAlert(String(product.min_stock_alert));
        setImagePreview(getUploadUrl(product.image_url));
      } else {
        setSku("");
        setName("");
        setCategory("");
        setCustomCategory("");
        setPriceBuy("");
        setPriceSell("");
        setStock("0");
        setMinStockAlert("5");
        setImagePreview(null);
      }
      setImageFile(null);
    }
  }, [open, product]);

  const mutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append("sku", sku.toUpperCase());
      formData.append("name", name);
      formData.append("category", customCategory || category);
      formData.append("price_buy", priceBuy);
      formData.append("price_sell", priceSell);
      formData.append("stock", stock);
      formData.append("min_stock_alert", minStockAlert);
      if (imageFile) formData.append("image", imageFile);

      if (isEditing) {
        return productsApi.update(product.id, formData);
      }
      return productsApi.create(formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success(
        isEditing
          ? "Produk berhasil diperbarui"
          : "Produk berhasil ditambahkan"
      );
      onOpenChange(false);
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      toast.error(
        error.response?.data?.message ||
          (isEditing ? "Gagal memperbarui produk" : "Gagal menambah produk")
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
    const finalCategory = customCategory || category;
    if (!sku.trim() || !name.trim() || !finalCategory || !priceBuy || !priceSell) {
      toast.error("SKU, nama, kategori, harga beli, dan harga jual wajib diisi");
      return;
    }
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Produk" : "Tambah Produk Baru"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Perbarui informasi produk"
              : "Isi data produk baru di bawah ini"}
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
              <Label htmlFor="product-image" className="cursor-pointer">
                <span className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                  <Upload className="size-3.5" />
                  {imagePreview ? "Ganti Gambar" : "Unggah Gambar"}
                </span>
              </Label>
              <input
                id="product-image"
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

          {/* SKU & Name */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="sku">
                SKU <span className="text-destructive">*</span>
              </Label>
              <Input
                id="sku"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="OLI-001"
                className="uppercase font-mono"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-name">
                Nama <span className="text-destructive">*</span>
              </Label>
              <Input
                id="product-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nama produk"
                required
              />
            </div>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>
              Kategori <span className="text-destructive">*</span>
            </Label>
            <Select value={category} onValueChange={(val) => { setCategory(val); setCustomCategory(""); }}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih kategori" />
              </SelectTrigger>
              <SelectContent>
                {allCategories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
                <SelectItem value="__custom__">+ Kategori Baru</SelectItem>
              </SelectContent>
            </Select>
            {category === "__custom__" && (
              <Input
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="Nama kategori baru"
                className="mt-2"
              />
            )}
          </div>

          {/* Prices */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="price-buy">
                Harga Beli <span className="text-destructive">*</span>
              </Label>
              <Input
                id="price-buy"
                type="number"
                value={priceBuy}
                onChange={(e) => setPriceBuy(e.target.value)}
                placeholder="0"
                min="0"
                step="100"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price-sell">
                Harga Jual <span className="text-destructive">*</span>
              </Label>
              <Input
                id="price-sell"
                type="number"
                value={priceSell}
                onChange={(e) => setPriceSell(e.target.value)}
                placeholder="0"
                min="0"
                step="100"
                required
              />
            </div>
          </div>

          {/* Stock */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="stock">Stok</Label>
              <Input
                id="stock"
                type="number"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="0"
                min="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="min-stock">Min. Stok Alert</Label>
              <Input
                id="min-stock"
                type="number"
                value={minStockAlert}
                onChange={(e) => setMinStockAlert(e.target.value)}
                placeholder="5"
                min="0"
              />
            </div>
          </div>

          {/* Margin info */}
          {priceBuy && priceSell && (
            <div className="rounded-lg bg-muted/50 p-3 text-sm">
              <p className="font-medium">Info Margin</p>
              <p className="text-muted-foreground mt-1">
                Margin: Rp {(Number(priceSell) - Number(priceBuy)).toLocaleString("id-ID")}
                {Number(priceBuy) > 0 && (
                  <span className="ml-2">
                    ({(((Number(priceSell) - Number(priceBuy)) / Number(priceBuy)) * 100).toFixed(1)}%)
                  </span>
                )}
              </p>
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
              {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
              {isEditing ? "Simpan Perubahan" : "Tambah Produk"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
