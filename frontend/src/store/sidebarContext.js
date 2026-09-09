'use client';

import React, { createContext, useContext } from 'react';

const SidebarContext = createContext({
  open: false,
  toggle: () => {},
  close: () => {},
});

export function useSidebar() {
  return useContext(SidebarContext);
}

export default SidebarContext;
