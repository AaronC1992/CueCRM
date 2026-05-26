'use client';
import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import Modal from '@/components/ui/Modal';
import { showToast } from '@/components/ui/Toast';
import { Deal, DealStage, ContractStatus, PaymentStatus } from '@/lib/types';
import { formatDate, formatCurrency } from '@/lib/utils';
import { Plus, Edit3, Trash2, DollarSign } from 'lucide-react';
import ConfirmModal from '@/components/ui/ConfirmModal';

const STAGES: DealStage[] = ['Opportunity', 'Quoted', 'Proposal sent', 'Negotiating', 'Won', 'Lost'];

const STAGE_COLORS: Record<DealStage, string> = {
  'Opportunity': 'bg-gray-100 text-gray-700 border-gray-200',
  'Quoted': 'bg-blue-100 text-blue-700 border-blue-200',
  'Proposal sent': 'bg-indigo-100 text-indigo-700 border-indigo-200',
  'Negotiating': 'bg-amber-100 text-amber-700 border-amber-200',
  'Won': 'bg-green-100 text-green-700 border-green-200',
  'Lost': 'bg-red-100 text-red-600 border-red-200',
};

const EMPTY: Partial<Deal> = { leadId: undefined, businessName: '', dealStage: 'Opportunity', serviceSold: '', packageType: '', monthlyValue: undefined, oneTimeSetupValue: undefined, estimatedCloseDate: '', proposalUrl: '', contractStatus: 'None', paymentStatus: 'Unpaid', notes: '' };

export default function DealsPage() {
  const [deals, setDeals] = useState<(Deal & { leadName?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStage, setFilterStage] = useState<DealStage | ''>('');
  const [showModal, setShowModal] = useState(false);
  const [editDeal, setEditDeal] = useState<Partial<Deal>>(EMPTY);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

  const fetchDeals = useCallback(async () => {
    const params = filterStage ? `?stage=${encodeURIComponent(filterStage)}` : '';
    const res = await fetch(`/api/deals${params}`);
    if (res.ok) setDeals(await res.json());
    setLoading(false);
  }, [filterStage]);

  useEffect(() => { fetchDeals(); }, [fetchDeals]);

  const openNew = () => { setEditDeal(EMPTY); setIsNew(true); setShowModal(true); };
  const openEdit = (d: Deal) => { setEditDeal({ ...d }); setIsNew(false); setShowModal(true); };

  const save = async () => {
    if (!editDeal.businessName?.trim()) { showToast('Business name is required.', 'error'); return; }
    setSaving(true);
    try {
      const url = isNew ? '/api/deals' : `/api/deals/${editDeal.id}`;
      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editDeal, dealStage: editDeal.dealStage || 'Opportunity' }),
      });
      if (!res.ok) throw new Error();
      showToast(isNew ? 'Deal added!' : 'Deal updated!');
      setShowModal(false);
      fetchDeals();
    } catch { showToast('Failed to save.', 'error'); }
    setSaving(false);
  };

  const deleteDeal = async (id: number) => {
    await fetch(`/api/deals/${id}`, { method: 'DELETE' });
    showToast('Deal deleted.', 'info');
    fetchDeals();
  };

  const updateStage = async (id: number, stage: DealStage) => {
    await fetch(`/api/deals/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dealStage: stage }),
    });
    fetchDeals();
  };

  const totalValue = deals.filter(d => d.dealStage !== 'Lost').reduce((sum, d) => sum + (d.oneTimeSetupValue || 0), 0);
  const wonValue = deals.filter(d => d.dealStage === 'Won').reduce((sum, d) => sum + (d.oneTimeSetupValue || 0), 0);
  const monthlyRecurring = deals.filter(d => d.dealStage === 'Won').reduce((sum, d) => sum + (d.monthlyValue || 0), 0);

  const inp = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <AppLayout title="Deals">
      <div className="max-w-5xl space-y-5">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Deals', value: deals.length, color: 'text-gray-800' },
            { label: 'Pipeline Value', value: formatCurrency(totalValue), color: 'text-blue-600' },
            { label: 'Won Value', value: formatCurrency(wonValue), color: 'text-green-600' },
            { label: 'Monthly Recurring', value: formatCurrency(monthlyRecurring), color: monthlyRecurring > 0 ? 'text-emerald-600' : 'text-gray-800' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <p className="text-xs text-gray-500 mb-1">{label}</p>
              <p className={`text-xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Filters + Add */}
        <div className="flex flex-wrap gap-3 items-center">
          <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={filterStage} onChange={e => setFilterStage(e.target.value as DealStage | '')}>
            <option value="">All Stages</option>
            {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <div className="flex-1" />
          <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            <Plus size={16} /> Add Deal
          </button>
        </div>

        {/* Pipeline stages */}
        {!filterStage && !loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {STAGES.map(stage => {
              const count = deals.filter(d => d.dealStage === stage).length;
              const val = deals.filter(d => d.dealStage === stage).reduce((s, d) => s + (d.oneTimeSetupValue || 0), 0);
              return (
                <button key={stage} onClick={() => setFilterStage(stage)} className={`rounded-xl border p-3 text-center hover:opacity-80 transition-opacity ${STAGE_COLORS[stage]}`}>
                  <p className="text-lg font-bold">{count}</p>
                  <p className="text-xs font-medium">{stage}</p>
                  {val > 0 && <p className="text-xs opacity-75">{formatCurrency(val)}</p>}
                </button>
              );
            })}
          </div>
        )}

        {loading && <div className="flex justify-center py-12"><div className="animate-spin w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full" /></div>}

        {!loading && deals.length === 0 && (
          <div className="text-center py-16 text-gray-400">No deals yet. <button onClick={openNew} className="text-blue-500 hover:underline">Add one.</button></div>
        )}

        {/* Deals table */}
        {!loading && deals.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 font-semibold uppercase tracking-wide border-b border-gray-100">
                  <th className="px-4 py-3 text-left">Deal / Lead</th>
                  <th className="px-4 py-3 text-left">Stage</th>
                  <th className="px-4 py-3 text-left hidden sm:table-cell">Value</th>
                  <th className="px-4 py-3 text-left hidden md:table-cell">Close Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {deals.map(deal => (
                  <tr key={deal.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{deal.businessName}</p>
                      {deal.leadName && <p className="text-xs text-gray-400">{deal.leadName}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={deal.dealStage}
                        onChange={e => updateStage(deal.id, e.target.value as DealStage)}
                        className={`text-xs font-semibold border rounded-full px-2.5 py-1 cursor-pointer focus:outline-none ${STAGE_COLORS[deal.dealStage]}`}
                      >
                        {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {deal.oneTimeSetupValue ? (
                        <span className="flex items-center gap-1 font-semibold text-green-600">
                          <DollarSign size={12} />{formatCurrency(deal.oneTimeSetupValue).replace('$', '')}
                        </span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-gray-500 text-xs">
                      {deal.estimatedCloseDate ? formatDate(deal.estimatedCloseDate) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(deal)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"><Edit3 size={14} /></button>
                        <button onClick={() => setDeleteTarget(deal.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={isNew ? 'Add Deal' : 'Edit Deal'} size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">Business Name / Deal Title <span className="text-red-500">*</span></label>
              <input className={inp} value={editDeal.businessName || ''} onChange={e => setEditDeal(p => ({ ...p, businessName: e.target.value }))} placeholder="Joplin Auto Repair — Website + SEO" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Stage</label>
              <select className={inp} value={editDeal.dealStage || 'Opportunity'} onChange={e => setEditDeal(p => ({ ...p, dealStage: e.target.value as DealStage }))}>
                {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Service Sold</label>
              <input className={inp} value={editDeal.serviceSold || ''} onChange={e => setEditDeal(p => ({ ...p, serviceSold: e.target.value }))} placeholder="Website redesign + SEO" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Setup Value ($)</label>
              <input className={inp} type="number" value={editDeal.oneTimeSetupValue ?? ''} onChange={e => setEditDeal(p => ({ ...p, oneTimeSetupValue: e.target.value ? Number(e.target.value) : undefined }))} placeholder="1997" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Monthly Value ($)</label>
              <input className={inp} type="number" value={editDeal.monthlyValue ?? ''} onChange={e => setEditDeal(p => ({ ...p, monthlyValue: e.target.value ? Number(e.target.value) : undefined }))} placeholder="297" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Package Type</label>
              <input className={inp} value={editDeal.packageType || ''} onChange={e => setEditDeal(p => ({ ...p, packageType: e.target.value }))} placeholder="Business Starter Bundle" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Expected Close Date</label>
              <input className={inp} type="date" value={editDeal.estimatedCloseDate || ''} onChange={e => setEditDeal(p => ({ ...p, estimatedCloseDate: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Contract Status</label>
              <select className={inp} value={editDeal.contractStatus || 'None'} onChange={e => setEditDeal(p => ({ ...p, contractStatus: e.target.value as ContractStatus }))}>
                {['None','Sent','Signed','Declined'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Payment Status</label>
              <select className={inp} value={editDeal.paymentStatus || 'Unpaid'} onChange={e => setEditDeal(p => ({ ...p, paymentStatus: e.target.value as PaymentStatus }))}>
                {['Unpaid','Partial','Paid','Recurring'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">Proposal URL</label>
              <input className={inp} value={editDeal.proposalUrl || ''} onChange={e => setEditDeal(p => ({ ...p, proposalUrl: e.target.value }))} placeholder="https://docs.google.com/..." />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Notes</label>
            <textarea className={inp + ' resize-none'} rows={3} value={editDeal.notes || ''} onChange={e => setEditDeal(p => ({ ...p, notes: e.target.value }))} />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
            <button onClick={save} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
              {saving ? 'Saving...' : isNew ? 'Add Deal' : 'Save'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => { if (deleteTarget !== null) deleteDeal(deleteTarget); }}
        title="Delete Deal"
        message="Delete this deal? This cannot be undone."
      />
    </AppLayout>
  );
}
