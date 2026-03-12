"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Car,
  Package,
  Wrench,
  Box,
  UserCog,
  BarChart3,
  Receipt,
  Wallet,
  Settings,
  LogOut,
  Menu,
  ChevronLeft,
  ClipboardList,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { getInitials } from "@/lib/utils";

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  roles?: ("ADMIN" | "CASHIER")[];
}

const navItems: NavItem[] = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard },
  { title: "POS / Transaksi", href: "/pos", icon: ShoppingCart },
  { title: "Pelanggan", href: "/customers", icon: Users },
  { title: "Kendaraan", href: "/vehicles", icon: Car },
  { title: "Produk", href: "/products", icon: Package },
  { title: "Jasa / Layanan", href: "/services", icon: Wrench },
  { title: "Paket", href: "/packages", icon: Box },
  { title: "Mekanik", href: "/mechanics", icon: UserCog },
  { title: "Inventori", href: "/inventory", icon: ClipboardList },
  { title: "Pembayaran", href: "/payments", icon: Wallet },
  { title: "Pengeluaran", href: "/expenses", icon: Receipt, roles: ["ADMIN"] },
  { title: "Laporan", href: "/reports", icon: BarChart3 },
  { title: "Pengaturan", href: "/settings", icon: Settings, roles: ["ADMIN"] },
];

function NavLink({
  item,
  isActive,
  collapsed,
}: {
  item: NavItem;
  isActive: boolean;
  collapsed?: boolean;
}) {
  const Icon = item.icon;

  const link = (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground",
        collapsed && "justify-center px-2"
      )}
    >
      <Icon className="size-5 shrink-0" />
      {!collapsed && <span>{item.title}</span>}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right">{item.title}</TooltipContent>
      </Tooltip>
    );
  }

  return link;
}

function SidebarContent({
  collapsed,
  onCollapse,
  userRole,
}: {
  collapsed: boolean;
  onCollapse?: () => void;
  userRole?: string;
}) {
  const pathname = usePathname();

  const filteredNavItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(userRole as "ADMIN" | "CASHIER")
  );

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className={cn("flex items-center gap-3 px-4 py-5", collapsed && "justify-center px-2")}>
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Wrench className="size-5" />
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold tracking-tight truncate">AutoWorkshop</h2>
            <p className="text-xs text-muted-foreground">MMS</p>
          </div>
        )}
        {onCollapse && !collapsed && (
          <Button variant="ghost" size="icon" className="size-8" onClick={onCollapse}>
            <ChevronLeft className="size-4" />
          </Button>
        )}
      </div>

      <Separator />

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {filteredNavItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <NavLink
              key={item.href}
              item={item}
              isActive={isActive}
              collapsed={collapsed}
            />
          );
        })}
      </nav>
    </div>
  );
}

export function DashboardSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useAuthStore();

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col border-r bg-card transition-all duration-300",
          collapsed ? "w-[68px]" : "w-64"
        )}
      >
        <SidebarContent
          collapsed={collapsed}
          onCollapse={() => setCollapsed(!collapsed)}
          userRole={user?.role}
        />
        {collapsed && (
          <div className="border-t p-2">
            <Button
              variant="ghost"
              size="icon"
              className="w-full"
              onClick={() => setCollapsed(false)}
            >
              <ChevronLeft className="size-4 rotate-180" />
            </Button>
          </div>
        )}
      </aside>
    </>
  );
}

export function DashboardHeader() {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    toast.success("Berhasil logout");
    router.push("/login");
  };

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:px-6">
      {/* Mobile menu */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden">
            <Menu className="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <SheetTitle className="sr-only">Menu Navigasi</SheetTitle>
          <SidebarContent collapsed={false} userRole={user?.role} />
        </SheetContent>
      </Sheet>

      <div className="flex-1" />

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative flex items-center gap-2 px-2">
            <Avatar className="size-8">
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {getInitials(user?.username || "U")}
              </AvatarFallback>
            </Avatar>
            <div className="hidden md:flex flex-col items-start">
              <span className="text-sm font-medium">{user?.username}</span>
              <span className="text-xs text-muted-foreground capitalize">
                {user?.role?.toLowerCase()}
              </span>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>Akun Saya</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push("/settings")}>
            <Settings className="size-4" />
            Pengaturan
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} variant="destructive">
            <LogOut className="size-4" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
