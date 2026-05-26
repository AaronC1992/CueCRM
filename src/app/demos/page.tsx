'use client';
import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import Modal from '@/components/ui/Modal';
import { showToast } from '@/components/ui/Toast';
import { Demo, DemoStatus, Template } from '@/lib/types';
import { formatDate, fillTemplate } from '@/lib/utils';
import { Plus, Edit3, Trash2, ExternalLink, Search, Copy } from 'lucide-react';
import ConfirmModal from '@/components/ui/ConfirmModal';

const STATUSES: DemoStatus[] = [
  'Idea', 'Started', 'Needs content', 'Ready to send', 'Sent',
  'Needs revisions', 'Approved', 'Converted to customer', 'Dead',
];

const STATUS_COLORS: Record<DemoStatus, string> = {
  'Idea': 'bg-gray-100 text-gray-600 border-gray-200',
  'Started': 'bg-blue-100 text-blue-700 border-blue-200',
  'Needs content': 'bg-amber-100 text-amber-700 border-amber-200',
  'Ready to send': 'bg-indigo-100 text-indigo-700 border-indigo-200',
  'Sent': 'bg-purple-100 text-purple-700 border-purple-200',
  'Needs revisions': 'bg-orange-100 text-orange-700 border-orange-200',
  'Approved': 'bg-teal-100 text-teal-700 border-teal-200',
  'Converted to customer': 'bg-green-100 text-green-700 border-green-200',
  'Dead': 'bg-red-100 text-red-600 border-red-200',
};

const EMPTY: Partial<Demo> = {
  leadId: undefined,
  businessName: '',
  demoUrl: '',
  originalWebsiteUrl: '',
  layoutOptionUsed: 'Website',
  demoStatus: 'Idea',
  dateSent: '',
  clientFeedback: '',
  neededChanges: '',
  notes: '',
};

export default function DemosPage() {
  const [demos, setDemos] = useState<Demo[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<DemoStatus | ''>('');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editDemo, setEditDemo] = useState<Partial<Demo>>(EMPTY);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

  const inp = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  const fetchDemos = useCallback(async () => {
    const params = filterStatus ? `?status=${encodeURIComponent(filterStatus)}` : '';
    const [demoRes, tmplRes] = await Promise.all([
      fetch(`/api/demos${params}`),
      fetch('/api/templates'),
    ]);
    if (demoRes.ok) setDemos(await demoRes.json());
    if (tmplRes.ok) setTemplates(await tmplRes.json());
    setLoading(false);
  }, [filterStatus]);

  useEffect(() => { fetchDemos(); }, [fetchDemos]);

  const openNew = () => { setEditDemo(EMPTY); setIsNew(true); setShowModal(true); };
  const openEdit = (d: Demo) => { setEditDemo({ ...d }); setIsNew(false); setShowModal(true); };

  const save = async () => {
    if (!editDemo.businessName?.trim()) {
      showToast('Business name is required.', 'error');
      return;
    }
    setSaving(true);
    try {
      const url = isNew ? '/api/demos' : `/api/demos/${editDemo.id}`;
      const method = isNew ? 'POST' : 'PUT';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editDemo),
      });
      if (!res.ok) throw new Error();
      showToast(isNew ? 'Demo added!' : 'Demo updated!');
      setShowModal(false);
      fetchDemos();
    } catch {
      showToast('Failed to save.', 'error');
    }
    setSaving(false);
  };

  const deleteDemo = async (id: number) => {
    await fetch(`/api/demos/${id}`, { method: 'DELETE' });
    showToast('Demo deleted.', 'info');
    fetchDemos();
  };

  const updateStatus = async (id: number, status: DemoStatus) => {
    await fetch(`/api/demos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ demoStatus: status }),
    });
    fetchDemos();
  };

  const copySendMessage = (demo: Demo) => {
    const tmpl = templates.find(t => t.type === 'demo_delivery');
    if (!tmpl) { showToast('Demo Delivery template not found.', 'error'); return; }
    const vars: Record<string, string> = {
      businessName: demo.businessName || '',
      contactName: demo.businessName || '',
      demoUrl: demo.demoUrl || '[DEMO URL]',
      city: '',
      industry: '',
      myName: 'Aaron',
      myPhone: '918 808 0074',
      myEmail: 'info@cuemarketingsolutions.com',
      serviceOffer: 'our services',
      websiteIssue: '',
    };
    const filled = fillTemplate(tmpl.content, vars);
    navigator.clipboard.writeText(filled).then(() => showToast('Demo delivery message copied!'));
  };

  const filtered = demos.filter(d =>
    !search || d.businessName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout title="Demo Tracker">
      <div className="max-w-5xl space-y-5">

        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-52"
              placeholder="Search demos..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as DemoStatus | '')}
          >
            <option value="">All Statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <div className="flex-1" />
          <button
            onClick={openNew}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            <Plus size={16} /> Add Demo
          </button>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {(['Sent', 'Approved', 'Converted to customer', 'Needs revisions', 'Dead'] as DemoStatus[]).map(s => {
            const count = demos.filter(d => d.demoStatus === s).length;
            return (
              <div key={s} className={`rounded-lg border px-3 py-2 text-center ${STATUS_COLORS[s]}`}>
                <p className="text-lg font-bold">{count}</p>
                <p className="text-xs">{s}</p>
              </div>
            );
          })}
        </div>

        {loading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full" />
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            No demos yet. Add one using the button above.
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 font-semibold uppercase tracking-wide border-b border-gray-100">
                  <th className="px-4 py-3 text-left">Business</th>
                  <th className="px-4 py-3 text-left hidden sm:table-cell">Type</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left hidden md:table-cell">Demo URL</th>
                  <th className="px-4 py-3 text-left hidden lg:table-cell">Created</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(demo => (
                  <tr key={demo.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{demo.businessName}</p>
                      {demo.leadName && <p className="text-xs text-gray-400">Lead: {demo.leadName}</p>}
                      {demo.originalWebsiteUrl && (
                        <a href={demo.originalWebsiteUrl.startsWith('http') ? demo.originalWebsiteUrl : `https://${demo.originalWebsiteUrl}`} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-400 hover:text-blue-500 flex items-center gap-0.5">
                          <ExternalLink size={10} /> Original site
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-gray-600 capitalize">{demo.layoutOptionUsed || 'N/A'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={demo.demoStatus}
                        onChange={e => updateStatus(demo.id, e.target.value as DemoStatus)}
                        className={`text-xs font-semibold border rounded-full px-2.5 py-1 cursor-pointer focus:outline-none ${STATUS_COLORS[demo.demoStatus]}`}
                      >
                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {demo.demoUrl ? (
                        <a href={demo.demoUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline text-xs max-w-xs truncate">
                          {demo.demoUrl} <ExternalLink size={10} />
                        </a>
                      ) : <span className="text-gray-300">--</span>}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-gray-500 text-xs">
                      {formatDate(demo.createdDate)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        {demo.demoUrl && (
                          <button onClick={() => copySendMessage(demo)} title="Copy send message" className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded transition-colors">
                            <Copy size={14} />
                          </button>
                        )}
                        <button onClick={() => openEdit(demo)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                          <Edit3 size={14} />
                        </button>
                        <button onClick={() => setDeleteTarget(demo.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={isNew ? 'Add Demo' : 'Edit Demo'} size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Business Name <span className="text-red-500">*</span></label>
              <input
                className={inp}
                value={editDemo.businessName || ''}
                onChange={e => setEditDemo(p => ({ ...p, businessName: e.target.value }))}
                placeholder="Joplin Auto Repair"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Demo Type</label>
              <select
                className={inp}
                value={editDemo.layoutOptionUsed || 'Website'}
                onChange={e => setEditDemo(p => ({ ...p, layoutOptionUsed: e.target.value }))}
              >
                <option value="Website">Website</option>
                <option value="CRM">CRM</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Status</label>
              <select
                className={inp}
                value={editDemo.demoStatus || 'Idea'}
                onChange={e => setEditDemo(p => ({ ...p, demoStatus: e.target.value as DemoStatus }))}
              >
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Date Sent</label>
              <input
                className={inp}
                type="date"
                value={editDemo.dateSent || ''}
                onChange={e => setEditDemo(p => ({ ...p, dateSent: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">Original Website URL <span className="text-gray-400">(business&apos;s current site — reference while building)</span></label>
              <input
                className={inp}
                value={editDemo.originalWebsiteUrl || ''}
                onChange={e => setEditDemo(p => ({ ...p, originalWebsiteUrl: e.target.value }))}
                placeholder="https://theirsitetorebuild.com"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">Demo URL</label>
              <input
                className={inp}
                value={editDemo.demoUrl || ''}
                onChange={e => setEditDemo(p => ({ ...p, demoUrl: e.target.value }))}
                placeholder="https://demo.cuemarketingsolutions.com/..."
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Client Feedback</label>
            <textarea
              className={inp + ' resize-none'}
              rows={2}
              value={editDemo.clientFeedback || ''}
              onChange={e => setEditDemo(p => ({ ...p, clientFeedback: e.target.value }))}
              placeholder="What did they say about the demo?"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Changes Needed</label>
            <textarea
              className={inp + ' resize-none'}
              rows={2}
              value={editDemo.neededChanges || ''}
              onChange={e => setEditDemo(p => ({ ...p, neededChanges: e.target.value }))}
              placeholder="e.g. Change hero photo, update phone number..."
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Notes</label>
            <textarea
              className={inp + ' resize-none'}
              rows={2}
              value={editDemo.notes || ''}
              onChange={e => setEditDemo(p => ({ ...p, notes: e.target.value }))}
              placeholder="Any notes about this demo..."
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button onClick={save} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
              {saving ? 'Saving...' : isNew ? 'Add Demo' : 'Save'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => { if (deleteTarget !== null) deleteDemo(deleteTarget); }}
        title="Delete Demo"
        message="Delete this demo? This cannot be undone."
      />
    </AppLayout>
  );
}
