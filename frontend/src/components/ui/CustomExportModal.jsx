'use client';

import React, { useState, useMemo } from 'react';
import Modal from './Modal';
import Button from './Button';
import Input from './Input';
import { 
  FileSpreadsheet, 
  FileText, 
  Calendar, 
  CheckSquare, 
  Square, 
  ChevronDown, 
  ChevronUp, 
  Download,
  Clock,
  Sparkles,
  Check,
  CalendarDays
} from 'lucide-react';
import { exportToSpreadsheet, filterRecordsByDateRange } from '../../lib/exportToExcel';
import { toast } from '../../lib/toast';

const TIME_OPTIONS = [
  { id: 'all', label: 'All Time (Full Record)', subtext: 'Complete dataset from inception', icon: Clock },
  { id: '3_months', label: 'Last 3 Months', subtext: 'Past 90 days period', icon: Calendar },
  { id: '6_months', label: 'Last 6 Months', subtext: 'Past 180 days (Bank Statement style)', icon: Calendar },
  { id: 'this_month', label: 'This Month', subtext: 'Current calendar month', icon: CalendarDays },
  { id: 'custom', label: 'Custom Date Range', subtext: 'Pick specific start & end dates', icon: Sparkles },
];

export default function CustomExportModal({
  isOpen,
  onClose,
  title = 'Export Data',
  subtitle = 'Download records in Excel (.xlsx) or CSV format',
  defaultFilename = 'Export_Report',
  columns = [],
  dateAccessor = 'created_at',
  onFetchData,
  transformRow,
}) {
  const [format, setFormat] = useState('xlsx');
  const [preset, setPreset] = useState('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState(new Date().toISOString().split('T')[0]);
  const [showColumns, setShowColumns] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const normalizedColumns = useMemo(() => {
    return columns.map(c => {
      if (typeof c === 'string') return { key: c, label: c };
      return { key: c.key || c.label, label: c.label || c.key };
    });
  }, [columns]);

  const [selectedColumnKeys, setSelectedColumnKeys] = useState(() =>
    normalizedColumns.map(c => c.key)
  );

  React.useEffect(() => {
    if (normalizedColumns.length > 0 && selectedColumnKeys.length === 0) {
      setSelectedColumnKeys(normalizedColumns.map(c => c.key));
    }
  }, [normalizedColumns]);

  const toggleColumn = (key) => {
    if (selectedColumnKeys.includes(key)) {
      if (selectedColumnKeys.length === 1) {
        toast.warning('At least one column must be included');
        return;
      }
      setSelectedColumnKeys(selectedColumnKeys.filter(k => k !== key));
    } else {
      setSelectedColumnKeys([...selectedColumnKeys, key]);
    }
  };

  const selectAll = () => {
    setSelectedColumnKeys(normalizedColumns.map(c => c.key));
  };

  const clearAll = () => {
    if (normalizedColumns.length > 0) {
      setSelectedColumnKeys([normalizedColumns[0].key]);
    }
  };

  const handleExport = async (e) => {
    e.preventDefault();

    if (preset === 'custom') {
      if (!customFrom || !customTo) {
        toast.error('Please select both Start Date and End Date.');
        return;
      }
      if (customTo < customFrom) {
        toast.error('End Date cannot be earlier than Start Date.');
        return;
      }
    }

    try {
      setIsExporting(true);
      toast.info('Preparing export file, please wait...');

      const rawRecords = await onFetchData();
      if (!rawRecords || rawRecords.length === 0) {
        toast.warning('No records available to export.');
        return;
      }

      const filtered = filterRecordsByDateRange(
        rawRecords,
        dateAccessor,
        preset,
        customFrom,
        customTo
      );

      if (!filtered || filtered.length === 0) {
        toast.warning('No records match the selected date range.');
        return;
      }

      const selectedColSet = new Set(selectedColumnKeys);
      const dataToExport = filtered.map(item => {
        let fullRow = typeof transformRow === 'function' ? transformRow(item) : item;

        if (normalizedColumns.length > 0) {
          const finalRow = {};
          normalizedColumns.forEach(col => {
            if (selectedColSet.has(col.key)) {
              finalRow[col.label] = fullRow[col.key] !== undefined ? fullRow[col.key] : (fullRow[col.label] ?? '—');
            }
          });
          return finalRow;
        }
        return fullRow;
      });

      const rangeTag = preset === 'all' 
        ? 'AllTime' 
        : preset === 'custom' 
          ? `${customFrom}_to_${customTo}` 
          : preset.replace('_', '-');
      const filename = `${defaultFilename}_${rangeTag}_${new Date().toISOString().split('T')[0]}`;

      exportToSpreadsheet(dataToExport, filename, format);
      toast.success(`Successfully exported ${dataToExport.length} records!`);
      onClose();
    } catch (err) {
      toast.error('Failed to generate export file. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleExport} className="p-4 sm:p-6 space-y-5">
        <div>
          <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-2.5">
            1. Select Time Duration
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {TIME_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isSelected = preset === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPreset(opt.id)}
                  className={`p-3 rounded-xl border text-left transition-all flex items-center gap-3 cursor-pointer ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/20 text-blue-900 dark:text-blue-100 ring-2 ring-blue-500/40 shadow-xs'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-blue-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate leading-tight">{opt.label}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{opt.subtext}</p>
                  </div>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {preset === 'custom' && (
            <div className="mt-3 p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in duration-150">
              <Input
                label="Start Date (From)"
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                required
              />
              <Input
                label="End Date (To)"
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                required
              />
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-2.5">
            2. Choose File Format
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setFormat('xlsx')}
              className={`p-3.5 rounded-xl border flex items-center gap-3 transition-all cursor-pointer ${
                format === 'xlsx'
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/20 text-emerald-950 dark:text-emerald-100 ring-2 ring-emerald-500/40 shadow-xs'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-emerald-300'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div className="text-left flex-1 min-w-0">
                <p className="text-sm font-bold truncate">Excel (.xlsx)</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Auto-formatted spreadsheet</p>
              </div>
              {format === 'xlsx' && (
                <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
              )}
            </button>

            <button
              type="button"
              onClick={() => setFormat('csv')}
              className={`p-3.5 rounded-xl border flex items-center gap-3 transition-all cursor-pointer ${
                format === 'csv'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/20 text-blue-950 dark:text-blue-100 ring-2 ring-blue-500/40 shadow-xs'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-blue-300'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <FileText className="w-5 h-5" />
              </div>
              <div className="text-left flex-1 min-w-0">
                <p className="text-sm font-bold truncate">CSV (.csv)</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Universal comma-separated text</p>
              </div>
              {format === 'csv' && (
                <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
              )}
            </button>
          </div>
        </div>

        {normalizedColumns.length > 0 && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50/80 dark:bg-slate-900/40">
            <button
              type="button"
              onClick={() => setShowColumns(!showColumns)}
              className="w-full px-4 py-3 flex items-center justify-between text-left text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className="font-bold">Customize Columns (Optional):</span>
                <span className="text-[11px] text-blue-600 dark:text-blue-400">
                  {selectedColumnKeys.length === normalizedColumns.length
                    ? 'All columns included'
                    : `${selectedColumnKeys.length} of ${normalizedColumns.length} columns`}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-slate-500">
                <span>{showColumns ? 'Hide' : 'Customize'}</span>
                {showColumns ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {showColumns && (
              <div className="p-3.5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Check fields to include in export:</span>
                  <div className="flex items-center gap-2 font-bold">
                    <button
                      type="button"
                      onClick={selectAll}
                      className="text-blue-600 hover:underline cursor-pointer"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={clearAll}
                      className="text-slate-500 hover:underline cursor-pointer"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                  {normalizedColumns.map((col) => {
                    const isChecked = selectedColumnKeys.includes(col.key);
                    return (
                      <button
                        key={col.key}
                        type="button"
                        onClick={() => toggleColumn(col.key)}
                        className={`flex items-center gap-2 p-2 rounded-lg text-xs text-left transition-all border cursor-pointer ${
                          isChecked
                            ? 'bg-blue-50/70 dark:bg-blue-500/15 border-blue-300 dark:border-blue-800 text-blue-900 dark:text-blue-200 font-semibold'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300'
                        }`}
                      >
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                        <span className="truncate">{col.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800">
          <Button
            variant="outline"
            size="md"
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="text-slate-600"
          >
            Cancel
          </Button>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={isExporting}
            className={`font-bold px-6 text-sm shadow-md transition-all gap-2 ${
              format === 'xlsx'
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Download {format === 'xlsx' ? 'Excel File (.xlsx)' : 'CSV File (.csv)'}</span>
          </Button>
        </div>

      </form>
    </Modal>
  );
}
