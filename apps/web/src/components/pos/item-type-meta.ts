import { Package, PackageOpen, Wrench, Tag } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ItemType } from '@/lib/api/transactions';

/** Badge label + icon per line-item type. Shared by the catalog grid and the cart list. */
export const TYPE_META: Record<ItemType, { badge: string; Icon: LucideIcon }> = {
  PRODUCT: { badge: 'PRODUK', Icon: Package },
  SERVICE: { badge: 'LAYANAN', Icon: Wrench },
  PACKAGE: { badge: 'PAKET', Icon: PackageOpen },
  EXTERNAL: { badge: 'LAINNYA', Icon: Tag },
};
