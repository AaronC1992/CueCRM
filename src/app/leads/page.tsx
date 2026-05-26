'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { StatusBadge, PriorityBadge } from '@/components/ui/Badge';
import { Lead } from '@/lib/types';
import { formatDate, formatCurrency, LEAD_STATUSES, PRIORITIES, INDUSTRIES } from '@/lib/utils';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import ColumnEditor, { ColDef, ColState, mergeColState } from '@/components/ui/ColumnEditor';
import {
  Search, Plus, ExternalLink, ChevronUp, ChevronDown,
  Phone, Globe, SlidersHorizontal, X, UserX, Navigation, CheckSquare, Square, UserCheck, Columns2
} from 'lucide-react';

const LEADS_CACHE_KEY = 'cuecrm_leads_cache';
const LEADS_COLS_KEY = 'cuecrm_leads_cols';

const ALL_LEADS_COLS: ColDef[] = [
  { key: 'contact', label: 'Contact' },
  { key: 'address', label: 'Address', sortKey: 'address' },
  { key: 'city', label: 'City', sortKey: 'city' },
  { key: 'state', label: 'State', sortKey: 'state' },
  { key: 'industry', label: 'Industry' },
  { key: 'status', label: 'Status', sortKey: 'leadStatus' },
  { key: 'priority', label: 'Priority', sortKey: 'priority' },
  { key: 'value', label: 'Value', sortKey: 'estimatedDealValue' },
  { key: 'followUp', label: 'Follow Up', sortKey: 'nextFollowUpDate' },
];

const DEFAULT_LEADS_COLS: ColState[] = [
  { key: 'contact', visible: true },
  { key: 'address', visible: false },
  { key: 'city', visible: true },
  { key: 'state', visible: false },
  { key: 'industry', visible: true },
  { key: 'status', visible: true },
  { key: 'priority', visible: true },
  { key: 'value', visible: true },
  { key: 'followUp', visible: true },
];

function getInitialLeads(): Lead[] {
  if (typeof window === 'undefined') return [];
  try {
    const c = sessionStorage.getItem(LEADS_CACHE_KEY);
    return c ? JSON.parse(c) : [];
  } catch { return []; }
}

function getInitialLeadsCols(): ColState[] {
  if (typeof window === 'undefined') return DEFAULT_LEADS_COLS;
  try {
    const saved = localStorage.getItem(LEADS_COLS_KEY);
    return saved ? mergeColState(JSON.parse(saved), DEFAULT_LEADS_COLS) : DEFAULT_LEADS_COLS;
  } catch { return DEFAULT_LEADS_COLS; }
}

function LeadsContent() {
  const searchParams = useSearchParams();
  const [leads, setLeads] = useState<Lead[]>(getInitialLeads);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [colState, setColState] = useState<ColState[]>(getInitialLeadsCols);
  const [showColEditor, setShowColEditor] = useState(false);
  const leadsRef = useRef<Lead[]>([]);
  leadsRef.current = leads;
  const [filterStatus, setFilterStatus] = useState(searchParams.get('status') || '');
  const [filterPriority, setFilterPriority] = useState(searchParams.get('priority') || '');
  const [filterIndustry, setFilterIndustry] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sort, setSort] = useState('createdDate');
  const [dir, setDir] = useState<'asc' | 'desc'>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  // Save column state to localStorage
  useEffect(() => {
    try { localStorage.setItem(LEADS_COLS_KEY, JSON.stringify(colState)); } catch { /* ignore */ }
  }, [colState]);

  // Debounce search input → fetch
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const toggleSelect = (id: number) => setSelectedIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleSelectAll = () => setSelectedIds(prev => prev.size === leads.length ? new Set() : new Set(leads.map(l => l.id)));
  const buildRouteUrl = `/routes?leads=${Array.from(selectedIds).join(',')}`;  

  const fetchLeads = useCallback(async () => {
    if (leadsRef.current.length === 0) setLoading(true);
    else setRefreshing(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (filterStatus) params.set('status', filterStatus);
    if (filterPriority) params.set('priority', filterPriority);
    if (filterIndustry) params.set('industry', filterIndustry);
    params.set('sort', sort);
    params.set('dir', dir);
    try {
      const res = await fetch(`/api/leads?${params}`);
      const data = await res.json();
      const arr = Array.isArray(data) ? data : [];
      setLeads(arr);
      if (!search && !filterStatus && !filterPriority && !filterIndustry) {
        try { sessionStorage.setItem(LEADS_CACHE_KEY, JSON.stringify(arr)); } catch { /* ignore */ }
      }
    } catch {
      setLeads([]);
    }
    setLoading(false);
    setRefreshing(false);
  }, [search, filterStatus, filterPriority, filterIndustry, sort, dir]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const handleSort = (col: string) => {
    if (sort === col) setDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSort(col); setDir('asc'); }
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sort !== col) return null;
    return dir === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />;
  };

  const clearFilters = () => {
    setSearch(''); setFilterStatus(''); setFilterPriority(''); setFilterIndustry('');
  };

  const activeFilters = [filterStatus, filterPriority, filterIndustry].filter(Boolean).length;

  return (
    <AppLayout title="Leads">
      <div className="space-y-4">

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search leads..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(s => !s)}
              className={`flex items-center gap-2 px-3 py-2.5 border rounded-lg text-sm font-medium transition-colors ${showFilters || activeFilters > 0 ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              <SlidersHorizontal size={16} />
              Filters
              {activeFilters > 0 && (
                <span className="bg-blue-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{activeFilters}</span>
              )}
            </button>
            <button
              onClick={() => setShowColEditor(true)}
              className="flex items-center gap-2 px-3 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 bg-white hover:bg-gray-50 transition-colors"
            >
              <Columns2 size={16} />
              Columns
            </button>
            <Link
              href="/leads/add"
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <Plus size={16} />
              Add Lead
            </Link>
          </div>
        </div>

        {showColEditor && (
          <ColumnEditor
            allCols={ALL_LEADS_COLS}
            colState={colState}
            onChange={setColState}
            onClose={() => setShowColEditor(false)}
          />
        )}

        {/* Filters panel */}
        {showFilters && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Status</label>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                {LEAD_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Priority</label>
              <select
                value={filterPriority}
                onChange={e => setFilterPriority(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Priorities</option>
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Industry</label>
              <select
                value={filterIndustry}
                onChange={e => setFilterIndustry(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Industries</option>
                {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            {activeFilters > 0 && (
              <button onClick={clearFilters} className="text-xs text-red-500 flex items-center gap-1 hover:underline">
                <X size={12} /> Clear filters
              </button>
            )}
          </div>
        )}

        {/* Count + Route Builder */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="text-sm text-gray-500 flex items-center gap-2">
            {loading ? 'Loading...' : (
              <>
                {refreshing && <span className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin inline-block" />}
                {`${leads.length} lead${leads.length !== 1 ? 's' : ''}`}
                {selectedIds.size > 0 && <span className="ml-2 text-blue-600 font-medium">{selectedIds.size} selected</span>}
              </>
            )}
          </p>
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <Link href={buildRouteUrl}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700">
                <Navigation size={13} />Build Route from Selected ({selectedIds.size})
              </Link>
            )}
            <Link href="/api/export/leads" className="text-xs text-blue-600 hover:underline font-medium">
              Export CSV
            </Link>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              {(() => {
                const visibleCols = ALL_LEADS_COLS.filter(c => colState.find(s => s.key === c.key)?.visible);
                const colSpan = visibleCols.length + 4; // checkbox + business + 2 actions
                return (
                  <>
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="px-4 py-3 w-8">
                          <button onClick={toggleSelectAll} className="text-gray-400 hover:text-blue-600">
                            {selectedIds.size === leads.length && leads.length > 0 ? <CheckSquare size={15} className="text-blue-600" /> : <Square size={15} />}
                          </button>
                        </th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide cursor-pointer hover:text-gray-800" onClick={() => handleSort('businessName')}>
                          <span className="flex items-center gap-1">Business <SortIcon col="businessName" /></span>
                        </th>
                        {visibleCols.map(col => (
                          <th
                            key={col.key}
                            className={`text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide whitespace-nowrap ${col.sortKey ? 'cursor-pointer hover:text-gray-800' : ''}`}
                            onClick={col.sortKey ? () => handleSort(col.sortKey!) : undefined}
                          >
                            {col.sortKey ? (
                              <span className="flex items-center gap-1">{col.label} <SortIcon col={col.sortKey} /></span>
                            ) : col.label}
                          </th>
                        ))}
                        <th className="px-4 py-3"></th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {loading && (
                        <tr>
                          <td colSpan={colSpan} className="text-center py-10 text-gray-400">
                            <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto" />
                          </td>
                        </tr>
                      )}
                      {!loading && leads.length === 0 && (
                        <tr>
                          <td colSpan={colSpan} className="text-center py-12 text-gray-400">
                            <UserX size={32} className="mx-auto mb-2 opacity-30" />
                            <p>No leads found.</p>
                            <Link href="/leads/add" className="text-blue-500 text-sm hover:underline mt-1 inline-block">
                              Add your first lead →
                            </Link>
                          </td>
                        </tr>
                      )}
                      {leads.map(lead => (
                        <tr key={lead.id} className={`hover:bg-gray-50 transition-colors group ${selectedIds.has(lead.id) ? 'bg-blue-50/50' : ''}`}>
                          <td className="px-4 py-3">
                            <button onClick={() => toggleSelect(lead.id)} className="text-gray-400 hover:text-blue-600">
                              {selectedIds.has(lead.id) ? <CheckSquare size={15} className="text-blue-600" /> : <Square size={15} />}
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                                <span className="text-blue-700 text-xs font-bold">{lead.businessName?.[0]?.toUpperCase()}</span>
                              </div>
                              <div>
                                <Link href={`/leads/${lead.id}`} className="font-medium text-gray-800 hover:text-blue-600 block leading-tight">
                                  {lead.businessName}
                                </Link>
                                {lead.website && (
                                  <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-400 hover:text-blue-500 flex items-center gap-0.5">
                                    <Globe size={10} /> site
                                  </a>
                                )}
                                {lead.notes && (
                                  <p className="text-xs text-gray-400 mt-0.5 max-w-[180px] truncate" title={lead.notes}>
                                    {lead.notes.length > 60 ? lead.notes.slice(0, 60) + '\u2026' : lead.notes}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          {visibleCols.map(col => {
                            let cell: React.ReactNode = '—';
                            if (col.key === 'contact') {
                              cell = (
                                <>
                                  <p className="text-gray-700 text-xs">{lead.contactName || '—'}</p>
                                  {lead.phone && (
                                    <a href={`tel:${lead.phone}`} className="text-xs text-gray-400 hover:text-blue-500 flex items-center gap-0.5">
                                      <Phone size={10} /> {lead.phone}
                                    </a>
                                  )}
                                </>
                              );
                            } else if (col.key === 'address') {
                              cell = <span className="text-gray-600 text-xs">{lead.address || '—'}</span>;
                            } else if (col.key === 'city') {
                              cell = <span className="text-gray-600 text-xs">{lead.city || '—'}</span>;
                            } else if (col.key === 'state') {
                              cell = <span className="text-gray-600 text-xs">{lead.state || '—'}</span>;
                            } else if (col.key === 'industry') {
                              cell = <span className="text-gray-600 text-xs">{lead.industry || '—'}</span>;
                            } else if (col.key === 'status') {
                              cell = (
                                <>
                                  <StatusBadge status={lead.leadStatus} size="sm" />
                                  {lead.leadStatus === 'Won' && (
                                    <Link href="/customers" className="flex items-center gap-0.5 mt-1 text-xs text-green-600 hover:text-green-700 font-medium">
                                      <UserCheck size={10} /> Customer
                                    </Link>
                                  )}
                                </>
                              );
                            } else if (col.key === 'priority') {
                              cell = <PriorityBadge priority={lead.priority} size="sm" />;
                            } else if (col.key === 'value') {
                              cell = <span className="text-gray-600 text-xs font-medium">{lead.estimatedDealValue ? formatCurrency(lead.estimatedDealValue) : '—'}</span>;
                            } else if (col.key === 'followUp') {
                              cell = lead.nextFollowUpDate ? (
                                <span className={`text-xs ${new Date(lead.nextFollowUpDate) < new Date() ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
                                  {formatDate(lead.nextFollowUpDate)}
                                </span>
                              ) : '—';
                            }
                            return <td key={col.key} className="px-4 py-3">{cell}</td>;
                          })}
                          <td className="px-4 py-3">
                            <Link
                              href={`/leads/${lead.id}`}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-blue-600 font-medium hover:underline flex items-center gap-1 whitespace-nowrap"
                            >
                              View <ExternalLink size={11} />
                            </Link>
                          </td>
                          <td className="px-4 py-3">
                            <Link
                              href={`/routes?leads=${lead.id}`}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-gray-500 hover:text-blue-600 flex items-center gap-0.5 whitespace-nowrap"
                              title="Add to route"
                            >
                              <Navigation size={11} />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </>
                );
              })()}
            </table>
          </div>
        </div>

      </div>
    </AppLayout>
  );
}

export default function LeadsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-12"><div className="animate-spin w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full" /></div>}>
      <LeadsContent />
    </Suspense>
  );
}
