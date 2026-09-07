'use client';

import React from 'react';
import ProtectedRoute from '../../components/layout/ProtectedRoute';
import Sidebar from '../../components/layout/Sidebar';

export default function DashboardLayout({ children }) {
  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}
