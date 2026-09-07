'use client';

import React from 'react';
import Link from 'next/link';
import { PlusCircle, MapPin, ShieldAlert } from 'lucide-react';
import Button from '../ui/Button';
import { useAuthStore } from '../../store/authStore';

export default function Header({ title, subtitle, action }) {
  const { user, role } = useAuthStore();

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-30">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">{title || 'Dashboard'}</h1>
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
            <MapPin className="h-3 w-3 text-slate-500" /> Delhi HQ
          </span>
        </div>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        {action || (
          <Link href="/rentals/new">
            <Button variant="primary" size="sm" icon={PlusCircle}>
              Issue Rental
            </Button>
          </Link>
        )}
      </div>
    </header>
  );
}
