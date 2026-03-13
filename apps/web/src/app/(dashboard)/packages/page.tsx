"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { packagesApi } from "@/lib/api";
import { formatCurrency, getUploadUrl, getInitials } from "@/lib/utils";
import { toast } from "sonner";
import { AxiosError } from "axios";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  PackageOpen,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from "lucide-react";

import { PackageFormDialog } from "@/components/packages/package-form-dialog";

interface PackageItem {
  id: number;
  package_id: number;
  product_id: number | null;
  service_id: number | null;
  qty: number;
  product?: {
    id: number;
    sku: string;
    name: string;
    price_sell: string;
    price_buy: string;
    stock: number;
  };
  service?: {
    id: number;
    name: string;
    price: string;
  };
}

interface PackageData {
  id: number;
  name: string;
  price: string;
  description: string | null;
  is_active: boolean;
  image_url: string | null;
  items: PackageItem[];
  calculated: {
    component_cost: number;
    component_retail_price: number;
    margin: number;
    margin_percent: number;
    customer_savings: number;
    savings_percent: number;
    is_available: boolean;
    unavailable_reason: string | null;
    low_margin_alert: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

interface PackagesResponse {
  success: boolean;
  data: {
    packages: PackageData[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      total_pages: number;
    };
  };
}

export default function PackagesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("true");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<PackageData | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PackageData | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["packages", search, activeFilter, page],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        page,
        limit: 25,
        active_only: activeFilter,
      };
      if (search) params.search = search;
      const res = await packagesApi.getAll(params);
      return (res.data as PackagesResponse).data;
    },
  });

  const packages = data?.packages || [];
  const pagination = data?.pagination;

  const deleteMutation = useMutation({
    mutationFn: (id: number) => packagesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["packages"] });
      toast.success("Paket berhasil dihapus");
      setDeleteTarget(null);
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      toast.error(error.response?.data?.message || "Gagal menghapus paket");
    },
  });

  const handleEdit = (pkg: PackageData) => {
    setEditingPackage(pkg);
    setFormOpen(true);
  };

  const handleCreate = () => {
    setEditingPackage(null);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <PackageOpen className="size-6" />
            Paket Layanan
          </h1>
          <p className="text-muted-foreground text-sm">
            Kelola paket layanan bundling produk & jasa
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="size-4" />
          Tambah Paket
        </Button>
      </div>

      {/* List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama paket..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
            <Select
              value={activeFilter}
              onValueChange={(val) => {
                setActiveFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Aktif Saja</SelectItem>
                <SelectItem value="false">Semua Paket</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-sm text-muted-foreground">
              {pagination?.total || 0} paket
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="size-10 rounded" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ))}
            </div>
          ) : packages.length === 0 ? (
            <div className="p-12 text-center">
              <PackageOpen className="mx-auto size-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">Belum ada paket</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {search
                  ? "Tidak ada paket yang cocok dengan pencarian"
                  : "Mulai buat paket bundling pertama Anda"}
              </p>
              {!search && (
                <Button className="mt-4" onClick={handleCreate}>
                  <Plus className="size-4" />
                  Tambah Paket
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Paket</TableHead>
                    <TableHead className="hidden md:table-cell">Isi Paket</TableHead>
                    <TableHead className="text-right">Harga Paket</TableHead>
                    <TableHead className="text-right hidden lg:table-cell">Hemat</TableHead>
                    <TableHead className="text-center hidden sm:table-cell">Status</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {packages.map((pkg, index) => (
                    <TableRow key={pkg.id}>
                      <TableCell className="text-muted-foreground">
                        {(page - 1) * 25 + index + 1}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="size-9 rounded">
                            {pkg.image_url && (
                              <AvatarImage
                                src={getUploadUrl(pkg.image_url) || ""}
                                alt={pkg.name}
                              />
                            )}
                            <AvatarFallback className="bg-primary/10 text-primary text-xs rounded">
                              {getInitials(pkg.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium text-sm">{pkg.name}</p>
                            {pkg.description && (
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {pkg.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex flex-wrap gap-1 max-w-[250px]">
                          {pkg.items.slice(0, 3).map((item) => (
                            <Badge key={item.id} variant="outline" className="text-xs">
                              {item.product?.name || item.service?.name}
                              {item.qty > 1 && ` x${item.qty}`}
                            </Badge>
                          ))}
                          {pkg.items.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{pkg.items.length - 3} lainnya
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div>
                          <p className="font-medium text-sm">
                            {formatCurrency(Number(pkg.price))}
                          </p>
                          {pkg.calculated.low_margin_alert && (
                            <p className="text-xs text-warning flex items-center justify-end gap-1">
                              <AlertTriangle className="size-3" />
                              Margin rendah
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right hidden lg:table-cell">
                        {pkg.calculated.customer_savings > 0 ? (
                          <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                            Hemat {formatCurrency(pkg.calculated.customer_savings)}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center hidden sm:table-cell">
                        <div className="flex flex-col items-center gap-1">
                          {pkg.is_active ? (
                            <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                              <CheckCircle className="size-3 mr-1" />
                              Aktif
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
                              <XCircle className="size-3 mr-1" />
                              Nonaktif
                            </Badge>
                          )}
                          {!pkg.calculated.is_available && (
                            <span className="text-xs text-destructive">Stok kurang</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(pkg)}>
                              <Pencil className="size-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => setDeleteTarget(pkg)}
                            >
                              <Trash2 className="size-4" />
                              Hapus
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination && pagination.total_pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Halaman {pagination.page} dari {pagination.total_pages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Sebelumnya
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(pagination.total_pages, p + 1))}
              disabled={page >= pagination.total_pages}
            >
              Selanjutnya
            </Button>
          </div>
        </div>
      )}

      {/* Form Dialog */}
      <PackageFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        packageData={editingPackage}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Paket?</AlertDialogTitle>
            <AlertDialogDescription>
              Anda yakin ingin menghapus paket{" "}
              <strong>{deleteTarget?.name}</strong>? Tindakan ini tidak dapat
              dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {deleteMutation.isPending ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
