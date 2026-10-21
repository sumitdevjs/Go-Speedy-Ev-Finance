'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Globe, ChevronDown, Check, Search, Building2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import api from '../../lib/api';

export default function BranchSwitcher({ isMobileBar = false }) {
  const { user, role, selectedBranch, setSelectedBranch, selectedHeadOffice, setSelectedHeadOffice } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [branches, setBranches] = useState([]);
  const [headOffices, setHeadOffices] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  const isSuperAdmin = role === 'super_admin' || role === 'admin';
  const isHoAdmin = role === 'ho_admin';
  const canSwitch = isSuperAdmin || isHoAdmin;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      } finally {
        setLoading(false);
      }
    };

    fetchDropdownData();
  }, [canSwitch]);

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

  const filteredBranches = branches.filter((b) => {
    if (!search.trim()) return true;
    const query = search.trim().toLowerCase();
    
    const wardNoStr = b.ward_no ? String(b.ward_no) : '';
    const wardNoPadded = b.ward_no ? String(b.ward_no).padStart(2, '0') : '';
    const wardLabel = b.ward_no ? `ward ${b.ward_no}` : '';
    const wardLabelPadded = b.ward_no ? `ward ${wardNoPadded}` : '';
    const hoName = b.head_office?.name || b.head_offices?.name || '';

    return (
      (b.name && b.name.toLowerCase().includes(query)) ||
      (b.code && b.code.toLowerCase().includes(query)) ||
      wardNoStr.includes(query) ||
      wardNoPadded.includes(query) ||
      wardLabel.includes(query) ||
      wardLabelPadded.includes(query) ||
      (b.ward_area && b.ward_area.toLowerCase().includes(query)) ||
      (b.contact_person && b.contact_person.toLowerCase().includes(query)) ||
      (b.phone && String(b.phone).includes(query)) ||
      (b.address && b.address.toLowerCase().includes(query)) ||
      hoName.toLowerCase().includes(query)
    );
  });

  const grouped = filteredBranches.reduce((acc, b) => {
    const hoName = b.head_office?.name || b.head_offices?.name || 'Head Office';
    if (!acc[hoName]) acc[hoName] = [];
    acc[hoName].push(b);
    return acc;
  }, {});

  const currentLabel = selectedBranch
    ? (selectedBranch.ward_no ? `Ward ${selectedBranch.ward_no}: ${selectedBranch.name}` : selectedBranch.name)
    : selectedHeadOffice
    ? `${selectedHeadOffice.name} (Zone)`
    : 'All Wards (Global Master)';

  return (
    <div className={`relative ${isMobileBar ? 'w-full' : 'min-w-0 shrink-0'}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={isMobileBar
          ? "h-9 w-full flex items-center justify-between rounded-xl bg-white dark:bg-slate-800/90 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200/90 dark:border-slate-700/80 px-3 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-all cursor-pointer shadow-2xs"
          : "h-9 max-w-full shrink-0 flex items-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 px-2.5 sm:px-3 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-all cursor-pointer shadow-2xs"
        }
        title="Switch active branch/ward filter"
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1 truncate pr-0.5">
          {selectedBranch ? (
            <MapPin className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
          ) : selectedHeadOffice ? (
            <Building2 className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
          ) : (
            <Globe className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
          )}
          <span className={`truncate font-semibold ${isMobileBar ? 'text-slate-900 dark:text-white' : 'max-w-[110px] xs:max-w-[130px] sm:max-w-[150px] lg:max-w-[175px] xl:max-w-[210px]'}`}>
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
            ? "absolute left-0 right-0 top-full mt-1.5 w-full max-h-[65vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
            : "absolute left-0 sm:left-auto sm:right-0 lg:left-0 lg:right-auto top-full mt-2 w-80 sm:w-96 max-w-[calc(100vw-2rem)] max-h-[75vh] sm:max-h-[460px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
          }
          onWheel={(e) => e.stopPropagation()}
        >
          <div className="p-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/90 shrink-0">
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by ward or candidate name..."
                className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded cursor-pointer"
                >
                  <span className="text-xs leading-none">×</span>
                </button>
              )}
            </div>
          </div>

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
            {(isSuperAdmin || isHoAdmin) && (
              <div className="pb-1">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBranch(null);
                    if (isSuperAdmin) setSelectedHeadOffice(null);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className={`w-full flex items-center justify-between p-2 text-xs rounded-lg text-left transition-colors cursor-pointer ${
                    !selectedBranch && !selectedHeadOffice
                      ? 'bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 font-bold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <div>
                      <p className="font-semibold">All Wards (Global Master)</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">Aggregated stats across all wards</p>
                    </div>
                  </div>
                  {!selectedBranch && !selectedHeadOffice && <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
                </button>
              </div>
            )}

            {isSuperAdmin && headOffices.length > 0 && !search.trim() && (
              <div className="py-1 border-t border-slate-100 dark:border-slate-800/60">
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Building2 className="h-3 w-3" />
                  <span>Switch Head Office Zone</span>
                </div>
                <div className="space-y-0.5">
                  {headOffices.map((ho) => {
                    const isSelectedHo = selectedHeadOffice?.id === ho.id && !selectedBranch;
                    return (
                      <button
                        key={ho.id}
                        type="button"
                        onClick={() => {
                          setSelectedHeadOffice(ho);
                          setIsOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-1.5 text-xs rounded-md text-left transition-colors cursor-pointer ${
                          isSelectedHo
                            ? 'bg-purple-50 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300 font-bold'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div>
                          <span className="font-semibold">{ho.name}</span>
                          <span className="ml-1 text-[10px] text-slate-400">({ho.code})</span>
                        </div>
                        {isSelectedHo && <Check className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {Object.keys(grouped).length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">
                No matching wards found.
              </p>
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
                            setSearch('');
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
