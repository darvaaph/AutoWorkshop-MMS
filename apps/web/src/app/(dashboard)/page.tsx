"use client";

import { useQuery } from "@tanstack/react-query";
import { reportsApi, productsApi, vehiclesApi } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { formatCurrency } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ShoppingCart,
  DollarSign,
  Users,
  Car,
  Package,
  AlertTriangle,
  TrendingUp,
  CalendarClock,
} from "lucide-react";

interface DashboardData {
  today: { sales: number; transactions: number };
  month: { sales: number; transactions: number };
  inventory: { totalProducts: number; lowStock: number };
  customers: { total: number; vehicles: number };
  serviceReminders?: Array<{
    id: number;
    license_plate: string;
    brand: string;
    model: string;
    next_service_date: string;
    next_service_km: number;
    Customer?: { name: string };
  }>;
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
}: {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            {trend === "up" && <TrendingUp className="size-3 text-success" />}
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-3 w-20 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();

  const { data: dashboard, isLoading: isDashboardLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const res = await reportsApi.getDashboard();
      return res.data.data as DashboardData;
    },
  });

  const { data: lowStock } = useQuery({
    queryKey: ["products", "low-stock"],
    queryFn: async () => {
      const res = await productsApi.getLowStock();
      return res.data.data as Array<{
        id: number;
        name: string;
        stock: number;
        min_stock_alert: number;
      }>;
    },
  });

  const { data: dueService } = useQuery({
    queryKey: ["vehicles", "due-service"],
    queryFn: async () => {
      const res = await vehiclesApi.getDueService();
      return res.data.data as Array<{
        id: number;
        license_plate: string;
        brand: string;
        model: string;
        next_service_date: string;
        next_service_km: number;
        Customer?: { name: string };
      }>;
    },
  });

  if (isDashboardLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Selamat Datang, {user?.username}! 👋
        </h1>
        <p className="text-muted-foreground">
          Ringkasan aktivitas bengkel hari ini
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Penjualan Hari Ini"
          value={formatCurrency(dashboard?.today.sales || 0)}
          description={`${dashboard?.today.transactions || 0} transaksi`}
          icon={DollarSign}
          trend="up"
        />
        <StatCard
          title="Penjualan Bulan Ini"
          value={formatCurrency(dashboard?.month.sales || 0)}
          description={`${dashboard?.month.transactions || 0} transaksi`}
          icon={ShoppingCart}
        />
        <StatCard
          title="Total Pelanggan"
          value={dashboard?.customers.total || 0}
          description={`${dashboard?.customers.vehicles || 0} kendaraan`}
          icon={Users}
        />
        <StatCard
          title="Produk"
          value={dashboard?.inventory.totalProducts || 0}
          description={
            dashboard?.inventory.lowStock
              ? `${dashboard.inventory.lowStock} stok rendah`
              : "Semua stok aman"
          }
          icon={Package}
        />
      </div>

      {/* Bottom cards */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Low stock alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="size-4 text-warning" />
              Peringatan Stok Rendah
            </CardTitle>
            <CardDescription>
              Produk yang perlu segera di-restock
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(!lowStock || lowStock.length === 0) ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Tidak ada produk dengan stok rendah 🎉
              </p>
            ) : (
              <div className="space-y-3">
                {lowStock.slice(0, 5).map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Min. stok: {product.min_stock_alert}
                      </p>
                    </div>
                    <Badge variant={product.stock === 0 ? "destructive" : "warning"}>
                      Stok: {product.stock}
                    </Badge>
                  </div>
                ))}
                {lowStock.length > 5 && (
                  <p className="text-xs text-center text-muted-foreground">
                    +{lowStock.length - 5} produk lainnya
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Service reminders */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="size-4 text-primary" />
              Pengingat Servis
            </CardTitle>
            <CardDescription>
              Kendaraan yang mendekati jadwal servis
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(!dueService || dueService.length === 0) ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Tidak ada kendaraan yang perlu servis saat ini
              </p>
            ) : (
              <div className="space-y-3">
                {dueService.slice(0, 5).map((vehicle) => (
                  <div
                    key={vehicle.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <Car className="size-8 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-sm font-medium">
                          {vehicle.license_plate}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {vehicle.brand} {vehicle.model}
                          {vehicle.Customer && ` • ${vehicle.Customer.name}`}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {vehicle.next_service_date
                        ? new Date(vehicle.next_service_date).toLocaleDateString("id-ID")
                        : `${vehicle.next_service_km?.toLocaleString()} km`}
                    </Badge>
                  </div>
                ))}
                {dueService.length > 5 && (
                  <p className="text-xs text-center text-muted-foreground">
                    +{dueService.length - 5} kendaraan lainnya
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
