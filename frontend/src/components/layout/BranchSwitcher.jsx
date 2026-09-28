'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Globe, ChevronDown, Check, Search, Building2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import api from '../../lib/api';

export default function BranchSwitcher({ isMobileBar = false }) {
  const { user, role, selectedBranch, setSelectedBranch } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [branches, setBranches] = useState([]);
  const [headOffices, setHeadOffices] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  const isSuperAdmin = role === 'super_admin' || role === 'admin';
  const isHoAdmin = role === 'ho_admin';
  const canSwitch = isSuperAdmin || isHoAdmin;

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch branches and head offices for switcher
  useEffect(() => {
    if (!canSwitch) return;

    const fetchDropdownData = async () => {
      try {
        setLoading(true);
        const [branchesRes, hoRes] = await Promise.all([
          api.get('/api/branches/dropdown'),
          api.get('/api/head-offices/dropdown').catch(() => ({ data: { data: [] } })),
        ]);
        if (branchesRes.data?.success) {
          setBranches(branchesRes.data.data || []);
        }
        if (hoRes.data?.success) {
          setHeadOffices(hoRes.data.data || []);
        }
      } catch (err) {
        console.error('Failed to load branches dropdown:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDropdownData();
  }, [canSwitch]);

  // If user is regular staff or branch admin without switch privileges:
  if (!canSwitch) {
    const branchName = user?.branch?.name
      ? (user.branch.ward_no ? `Ward ${user.branch.ward_no}: ${user.branch.name}` : user.branch.name)
      : (user?.ward_area || 'Central Branch');

    if (isMobileBar) {
      return (
        <div className="w-full flex items-center justify-between rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
          <div className="flex items-center gap-2 truncate">
            <MapPin className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="truncate">{branchName}</span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600/80 dark:text-emerald-400/80 shrink-0">Assigned Ward</span>
        </div>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 shrink-0">
        <MapPin className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
        <span className="truncate max-w-[130px] sm:max-w-[200px]">{branchName}</span>
      </span>
    );
  }

  // Filter branches by search
  const filteredBranches = branches.filter((b) => {
    if (!search.trim()) return true;
    const query = search.toLowerCase();
    return (
      b.name.toLowerCase().includes(query) ||
      b.code.toLowerCase().includes(query) ||
      (b.ward_no && String(b.ward_no).includes(query)) ||
      (b.ward_area && b.ward_area.toLowerCase().includes(query)) ||
      (b.contact_person && b.contact_person.toLowerCase().includes(query))
    );
  });

  // Group branches by Head Office
  const grouped = filteredBranches.reduce((acc, b) => {
    const hoName = b.head_offices?.name || 'Moti Nagar Head Office';
    if (!acc[hoName]) acc[hoName] = [];
    acc[hoName].push(b);
    return acc;
  }, {});

  const currentLabel = selectedBranch
    ? (selectedBranch.ward_no ? `Ward ${selectedBranch.ward_no}: ${selectedBranch.name}` : selectedBranch.name)
    : 'All Wards (Global Master)';

  return (
    <div className={`relative ${isMobileBar ? 'w-full' : 'shrink-0'}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={isMobileBar
          ? "w-full flex items-center justify-between rounded-xl bg-white dark:bg-slate-800/90 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200/90 dark:border-slate-700/80 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-all cursor-pointer shadow-2xs"
          : "flex items-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-all cursor-pointer shadow-2xs"
        }
        title="Switch active branch/ward filter"
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1 truncate pr-1">
          {selectedBranch ? (
            <MapPin className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
          ) : (
            <Globe className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
          )}
          <span className={`truncate font-semibold ${isMobileBar ? 'text-slate-900 dark:text-white' : 'max-w-[130px] sm:max-w-[180px] lg:max-w-[220px]'}`}>
            {currentLabel}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0 text-slate-400">
          {isMobileBar && (
            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-1.5 py-0.5 rounded-md">
              Switch
            </span>
          )}
          <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {isOpen && (
        <div
          data-lenis-prevent
          className={isMobileBar
            ? "absolute left-0 right-0 mt-1.5 w-full max-h-[65vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
            : "absolute left-0 sm:right-0 sm:left-auto mt-2 w-72 xs:w-84 max-h-[75vh] sm:max-h-[440px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
          }
          onWheel={(e) => e.stopPropagation()}
        >
          {/* Header & Search */}
          <div className="p-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/90 shrink-0">
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by ward or candidate name..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
              />
            </div>
          </div>

          {/* Option List */}
          <div
            data-lenis-prevent
            className="overflow-y-auto flex-1 min-h-0 p-1 divide-y divide-slate-100 dark:divide-slate-800/60 overscroll-contain dropdown-scroll"
            style={{
              overscrollBehavior: 'contain',
              WebkitOverflowScrolling: 'touch',
            }}
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
          >
            {/* Global All Option (Only for Super Admin) */}
            {isSuperAdmin && (
              <div className="pb-1">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBranch(null);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-2 text-xs rounded-lg text-left transition-colors cursor-pointer ${!selectedBranch
                      ? 'bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 font-bold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                >
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <div>
                      <p className="font-semibold">All Wards (Global Master)</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">Aggregated stats across all 50 wards</p>
                    </div>
                  </div>
                  {!selectedBranch && <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
                </button>
              </div>
            )}

            {/* Groups */}
            {Object.keys(grouped).length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No matching wards found.</p>
            ) : (
              Object.entries(grouped).map(([hoName, branchList]) => (
                <div key={hoName} className="py-1">
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Building2 className="h-3 w-3" />
                    <span>{hoName} ({branchList.length})</span>
                  </div>
                  <div className="space-y-0.5">
                    {branchList.map((branch) => {
                      const isSelected = selectedBranch?.id === branch.id;
                      return (
                        <button
                          key={branch.id}
                          type="button"
                          onClick={() => {
                            setSelectedBranch(branch);
                            setIsOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-1.5 text-xs rounded-md text-left transition-colors cursor-pointer ${isSelected
                              ? 'bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 font-bold'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                        >
                          <div className="truncate pr-2">
                            <span className="font-medium">
                              {branch.ward_no ? `Ward ${branch.ward_no}: ` : ''}
                              {branch.name}
                            </span>
                            {branch.contact_person && (
                              <span className="ml-1 text-[10px] text-slate-500 truncate block sm:inline sm:before:content-['•_']">
                                {branch.contact_person}
                              </span>
                            )}
                          </div>
                          {isSelected && <Check className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0 ml-2" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
