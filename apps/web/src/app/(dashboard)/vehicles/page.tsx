"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { vehiclesApi, customersApi } from "@/lib/api";
import { formatDate, getUploadUrl } from "@/lib/utils";
import { toast } from "sonner";
import { AxiosError } from "axios";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Car,
  Gauge,
  CalendarClock,
} from "lucide-react";

import { VehicleFormDialog } from "@/components/vehicles/vehicle-form-dialog";

export interface Vehicle {
  id: number;
  customer_id: number;
  license_plate: string;
  brand: string;
  model: string;
  current_km: number | null;
  next_service_date: string | null;
  next_service_km: number | null;
  reminder_sent_at: string | null;
  reminder_sent_by: number | null;
  reminder_notes: string | null;
  image_url: string | null;
  createdAt: string;
  updatedAt: string;
  Customer?: { id: number; name: string; phone: string };
}

export interface CustomerOption {
  id: number;
  name: string;
  phone: string;
}

export default function VehiclesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Vehicle | null>(null);

  const { data: vehicles, isLoading } = useQuery({
    queryKey: ["vehicles"],
    queryFn: async () => {
      const res = await vehiclesApi.getAll();
      return res.data as Vehicle[];
    },
  });

  const { data: customers } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const res = await customersApi.getAll();
      return res.data as CustomerOption[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => vehiclesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      toast.success("Kendaraan berhasil dihapus");
      setDeleteTarget(null);
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      toast.error(error.response?.data?.message || "Gagal menghapus kendaraan");
    },
  });

  // Helper: get customer name by ID
  const getCustomerName = (customerId: number) => {
    const customer = customers?.find((c) => c.id === customerId);
    return customer?.name || `ID: ${customerId}`;
  };

  // Check if service is due
  const isServiceDue = (vehicle: Vehicle) => {
    if (vehicle.next_service_date) {
      const dueDate = new Date(vehicle.next_service_date);
      const today = new Date();
      const diffDays = Math.ceil(
        (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
      return diffDays <= 7;
    }
    return false;
  };

  const filtered = vehicles?.filter(
    (v) =>
      v.license_plate.toLowerCase().includes(search.toLowerCase()) ||
      v.brand.toLowerCase().includes(search.toLowerCase()) ||
      v.model.toLowerCase().includes(search.toLowerCase()) ||
      getCustomerName(v.customer_id).toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setFormOpen(true);
  };

  const handleCreate = () => {
    setEditingVehicle(null);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Car className="size-6" />
            Kendaraan
          </h1>
          <p className="text-muted-foreground text-sm">
            Kelola data kendaraan pelanggan
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="size-4" />
          Tambah Kendaraan
        </Button>
      </div>

      {/* Search + Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Cari plat, merk, model, pemilik..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              {filtered?.length || 0} kendaraan
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="size-10 rounded" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ))}
            </div>
          ) : !filtered || filtered.length === 0 ? (
            <div className="p-12 text-center">
              <Car className="mx-auto size-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">Belum ada kendaraan</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {search
                  ? "Tidak ada kendaraan yang cocok dengan pencarian"
                  : "Mulai tambahkan kendaraan pertama"}
              </p>
              {!search && (
                <Button className="mt-4" onClick={handleCreate}>
                  <Plus className="size-4" />
                  Tambah Kendaraan
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Plat Nomor</TableHead>
                  <TableHead>Kendaraan</TableHead>
                  <TableHead className="hidden md:table-cell">Pemilik</TableHead>
                  <TableHead className="hidden lg:table-cell">KM Saat Ini</TableHead>
                  <TableHead className="hidden lg:table-cell">Servis Berikutnya</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((vehicle, index) => (
                  <TableRow key={vehicle.id}>
                    <TableCell className="text-muted-foreground">
                      {index + 1}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {vehicle.image_url ? (
                          <img
                            src={getUploadUrl(vehicle.image_url) || ""}
                            alt={vehicle.license_plate}
                            className="size-10 rounded object-cover border"
                          />
                        ) : (
                          <div className="size-10 rounded border bg-muted flex items-center justify-center">
                            <Car className="size-5 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <p className="font-mono font-semibold text-sm">
                            {vehicle.license_plate}
                          </p>
                          <p className="text-xs text-muted-foreground md:hidden">
                            {getCustomerName(vehicle.customer_id)}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-medium">
                        {vehicle.brand} {vehicle.model}
                      </p>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">
                      {getCustomerName(vehicle.customer_id)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {vehicle.current_km ? (
                        <span className="flex items-center gap-1 text-sm">
                          <Gauge className="size-3 text-muted-foreground" />
                          {vehicle.current_km.toLocaleString("id-ID")} km
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {vehicle.next_service_date ? (
                        <Badge
                          variant={isServiceDue(vehicle) ? "warning" : "outline"}
                          className="flex items-center gap-1 w-fit"
                        >
                          <CalendarClock className="size-3" />
                          {formatDate(vehicle.next_service_date)}
                        </Badge>
                      ) : vehicle.next_service_km ? (
                        <Badge variant="outline" className="flex items-center gap-1 w-fit">
                          <Gauge className="size-3" />
                          {vehicle.next_service_km.toLocaleString("id-ID")} km
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(vehicle)}>
                            <Pencil className="size-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setDeleteTarget(vehicle)}
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
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <VehicleFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        vehicle={editingVehicle}
        customers={customers || []}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Kendaraan?</AlertDialogTitle>
            <AlertDialogDescription>
              Anda yakin ingin menghapus kendaraan{" "}
              <strong>
                {deleteTarget?.license_plate} ({deleteTarget?.brand}{" "}
                {deleteTarget?.model})
              </strong>
              ? Tindakan ini tidak dapat dibatalkan.
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
