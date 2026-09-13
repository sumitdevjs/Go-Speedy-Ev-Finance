'use client';

import React, { useState } from 'react';
import ProtectedRoute from '../../components/layout/ProtectedRoute';
import Sidebar from '../../components/layout/Sidebar';
import SidebarContext from '../../store/sidebarContext';
import ToastContainer from '../../components/ui/ToastContainer';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ProtectedRoute>
      <SidebarContext.Provider
        value={{
          open: sidebarOpen,
          toggle: () => setSidebarOpen((v) => !v),
          close: () => setSidebarOpen(false),
        }}
      >
        <div className="min-h-screen bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 transition-colors">
          <Sidebar
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />
          <div className="lg:pl-64 flex flex-col min-h-screen min-w-0 overflow-x-hidden">
            <main className="flex-1 flex flex-col min-w-0 w-full">
              {children}
            </main>
          </div>
        </div>
        <ToastContainer />
        <ConfirmDialog />
      </SidebarContext.Provider>
    </ProtectedRoute>
  );
}
