'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings } from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const { isAdmin } = useAuth();

  useEffect(() => {
    // Redirect cashier to dashboard
    if (!isAdmin) {
      router.replace('/');
    }
  }, [isAdmin, router]);

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-6 w-6" />
            System Settings
          </CardTitle>
          <CardDescription>
            Halaman settings akan dibuat di phase selanjutnya
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Fitur: Shop info, printer config, user management, change password.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}