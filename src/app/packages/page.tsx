'use client';
import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import Modal from '@/components/ui/Modal';
import { showToast } from '@/components/ui/Toast';
import { Package } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { Plus, Edit3, Trash2, Check } from 'lucide-react';
import ConfirmModal from '@/components/ui/ConfirmModal';

const EMPTY: Partial<Package> = {
  packageName: '', description: '', setupPrice: undefined,
  monthlyPrice: undefined, includedFeatures: [], bestFor: '', internalNotes: '',
};

export default function PackagesPage() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editPkg, setEditPkg] = useState<Partial<Package>>(EMPTY);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [featureInput, setFeatureInput] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

  const fetchPackages = useCallback(async () => {
    const res = await fetch('/api/packages');
    if (res.ok) setPackages(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchPackages(); }, [fetchPackages]);

  const openNew = () => { setEditPkg(EMPTY); setFeatureInput(''); setIsNew(true); setShowModal(true); };
  const openEdit = (p: Package) => { setEditPkg({ ...p, includedFeatures: [...(p.includedFeatures || [])] }); setFeatureInput(''); setIsNew(false); setShowModal(true); };

  const save = async () => {
    if (!editPkg.packageName?.trim()) { showToast('Name is required.', 'error'); return; }
    setSaving(true);
    try {
      const url = isNew ? '/api/packages' : `/api/packages/${editPkg.id}`;
      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editPkg),
      });
      if (!res.ok) throw new Error();
      showToast(isNew ? 'Package created!' : 'Package updated!');
      setShowModal(false);
      fetchPackages();
    } catch { showToast('Failed to save.', 'error'); }
    setSaving(false);
  };

  const deletePkg = async (id: number) => {
    await fetch(`/api/packages/${id}`, { method: 'DELETE' });
    showToast('Package deleted.', 'info');
    fetchPackages();
  };

  const addFeature = () => {
    const f = featureInput.trim();
    if (!f) return;
    setEditPkg(p => ({ ...p, includedFeatures: [...(p.includedFeatures || []), f] }));
    setFeatureInput('');
  };

  const removeFeature = (i: number) => {
    setEditPkg(p => ({ ...p, includedFeatures: (p.includedFeatures || []).filter((_, idx) => idx !== i) }));
  };

  const inp = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <AppLayout title="Packages & Pricing">
      <div className="max-w-5xl space-y-5">

        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">{packages.length} packages defined</p>
          <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            <Plus size={16} /> New Package
          </button>
        </div>

        {loading && <div className="flex justify-center py-12"><div className="animate-spin w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full" /></div>}

        {!loading && packages.length === 0 && (
          <div className="text-center py-16 text-gray-400">No packages yet. <button onClick={openNew} className="text-blue-500 hover:underline">Add one.</button></div>
        )}

        {!loading && packages.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {packages.map(pkg => (
                <div key={pkg.id} className="border border-gray-100 rounded-xl p-4 hover:border-gray-200 transition-colors relative group">
                  <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(pkg)} className="p-1 text-gray-400 hover:text-blue-600 bg-white rounded border border-gray-100 shadow-sm"><Edit3 size={12} /></button>
                    <button onClick={() => setDeleteTarget(pkg.id)} className="p-1 text-gray-400 hover:text-red-500 bg-white rounded border border-gray-100 shadow-sm"><Trash2 size={12} /></button>
                  </div>
                  <h3 className="font-semibold text-gray-800 text-sm pr-14">{pkg.packageName}</h3>
                  <div className="mt-2 space-y-0.5">
                    {pkg.setupPrice != null && (
                      <p className="text-lg font-bold text-gray-900">{formatCurrency(pkg.setupPrice)} <span className="text-xs font-normal text-gray-400">one-time</span></p>
                    )}
                    {pkg.monthlyPrice != null && pkg.monthlyPrice > 0 && (
                      <p className="text-xs text-gray-500">{formatCurrency(pkg.monthlyPrice)}/mo</p>
                    )}
                  </div>
                  {pkg.description && <p className="text-xs text-gray-500 mt-2">{pkg.description}</p>}
                  {pkg.includedFeatures && pkg.includedFeatures.length > 0 && (
                    <ul className="mt-3 space-y-1">
                      {pkg.includedFeatures.map((f, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs text-gray-600">
                          <Check size={12} className="text-green-500 mt-0.5 shrink-0" /> {f}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
            ))}
          </div>
        )}

      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={isNew ? 'New Package' : 'Edit Package'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">Package Name <span className="text-red-500">*</span></label>
              <input className={inp} value={editPkg.packageName || ''} onChange={e => setEditPkg(p => ({ ...p, packageName: e.target.value }))} placeholder="Starter Website Package" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">One-Time Setup Price ($)</label>
              <input className={inp} type="number" value={editPkg.setupPrice ?? ''} onChange={e => setEditPkg(p => ({ ...p, setupPrice: e.target.value ? Number(e.target.value) : undefined }))} placeholder="997" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Monthly Price ($)</label>
              <input className={inp} type="number" value={editPkg.monthlyPrice ?? ''} onChange={e => setEditPkg(p => ({ ...p, monthlyPrice: e.target.value ? Number(e.target.value) : undefined }))} placeholder="0" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Description</label>
            <textarea className={inp + ' resize-none'} rows={2} value={editPkg.description || ''} onChange={e => setEditPkg(p => ({ ...p, description: e.target.value }))} placeholder="Brief description of what's included..." />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Included Features</label>
            <div className="flex gap-2 mb-2">
              <input
                className={inp + ' flex-1'}
                value={featureInput}
                onChange={e => setFeatureInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addFeature(); } }}
                placeholder="Mobile responsive design"
              />
              <button type="button" onClick={addFeature} className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">Add</button>
            </div>
            <ul className="space-y-1.5">
              {(editPkg.includedFeatures || []).map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 rounded px-3 py-1.5">
                  <Check size={12} className="text-green-500 shrink-0" />
                  <span className="flex-1">{f}</span>
                  <button onClick={() => removeFeature(i)} className="text-gray-300 hover:text-red-500 text-base leading-none">×</button>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
            <button onClick={save} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
              {saving ? 'Saving...' : isNew ? 'Create Package' : 'Save'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => { if (deleteTarget !== null) deletePkg(deleteTarget); }}
        title="Delete Package"
        message="Delete this package? This cannot be undone."
      />
    </AppLayout>
  );
}
