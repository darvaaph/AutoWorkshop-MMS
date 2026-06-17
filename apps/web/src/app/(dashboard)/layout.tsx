import type { ReactNode } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 bg-slate-50 pb-[calc(5rem_+_env(safe-area-inset-bottom))] md:pb-6">
          {children}
        </main>
      </div>
    </div>
  );
}
