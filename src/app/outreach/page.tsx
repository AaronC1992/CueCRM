'use client';
import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import Modal from '@/components/ui/Modal';
import { showToast } from '@/components/ui/Toast';
import { Template, TemplateType } from '@/lib/types';
import { Plus, Edit3, Trash2, Copy, Info } from 'lucide-react';
import ConfirmModal from '@/components/ui/ConfirmModal';

const TEMPLATE_TYPES: TemplateType[] = [
  'cold_call', 'voicemail', 'cold_email', 'facebook_message', 'text_message',
  'follow_up', 'demo_delivery', 'proposal_follow_up', 'reactivation'
];

const TYPE_LABELS: Record<TemplateType, string> = {
  cold_call: 'Cold Call Script',
  voicemail: 'Voicemail Script',
  cold_email: 'Cold Email',
  facebook_message: 'Facebook Message',
  text_message: 'Text Message',
  follow_up: 'Follow Up',
  demo_delivery: 'Demo Delivery',
  proposal_follow_up: 'Proposal Follow Up',
  reactivation: 'Reactivation',
};

const TYPE_COLORS: Record<TemplateType, string> = {
  cold_call: 'bg-blue-100 text-blue-700 border-blue-200',
  voicemail: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  cold_email: 'bg-purple-100 text-purple-700 border-purple-200',
  facebook_message: 'bg-sky-100 text-sky-700 border-sky-200',
  text_message: 'bg-teal-100 text-teal-700 border-teal-200',
  follow_up: 'bg-amber-100 text-amber-700 border-amber-200',
  demo_delivery: 'bg-green-100 text-green-700 border-green-200',
  proposal_follow_up: 'bg-orange-100 text-orange-700 border-orange-200',
  reactivation: 'bg-pink-100 text-pink-700 border-pink-200',
};

const VARIABLES = [
  '{{businessName}}', '{{contactName}}', '{{city}}', '{{industry}}',
  '{{websiteIssue}}', '{{demoUrl}}', '{{serviceOffer}}',
  '{{myName}}', '{{myPhone}}', '{{myEmail}}',
];

const EMPTY_TEMPLATE = { name: '', type: 'cold_call' as TemplateType, content: '' };

export default function OutreachPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<TemplateType | ''>('');
  const [showModal, setShowModal] = useState(false);
  const [editTemplate, setEditTemplate] = useState<Partial<Template>>(EMPTY_TEMPLATE);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showVars, setShowVars] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

  const fetchTemplates = useCallback(async () => {
    const res = await fetch('/api/templates');
    if (res.ok) setTemplates(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const openNew = () => { setEditTemplate(EMPTY_TEMPLATE); setIsNew(true); setShowModal(true); };
  const openEdit = (t: Template) => { setEditTemplate({ ...t }); setIsNew(false); setShowModal(true); };

  const save = async () => {
    if (!editTemplate.name?.trim() || !editTemplate.content?.trim()) {
      showToast('Name and content are required.', 'error'); return;
    }
    setSaving(true);
    try {
      const url = isNew ? '/api/templates' : `/api/templates/${editTemplate.id}`;
      const method = isNew ? 'POST' : 'PUT';
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editTemplate),
      });
      if (!res.ok) throw new Error();
      showToast(isNew ? 'Template created!' : 'Template updated!');
      setShowModal(false);
      fetchTemplates();
    } catch { showToast('Failed to save.', 'error'); }
    setSaving(false);
  };

  const deleteTemplate = async (id: number) => {
    await fetch(`/api/templates/${id}`, { method: 'DELETE' });
    showToast('Template deleted.', 'info');
    fetchTemplates();
  };

  const copy = (content: string) => {
    navigator.clipboard.writeText(content).then(() => showToast('Template copied!'));
  };

  const filtered = filterType ? templates.filter(t => t.type === filterType) : templates;
  const byType = TEMPLATE_TYPES.reduce((acc, type) => {
    const items = filtered.filter(t => t.type === type);
    if (items.length) acc[type] = items;
    return acc;
  }, {} as Record<string, Template[]>);

  return (
    <AppLayout title="Outreach Templates">
      <div className="max-w-5xl space-y-5">

        {/* Header actions */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filterType}
            onChange={e => setFilterType(e.target.value as TemplateType | '')}
          >
            <option value="">All Types</option>
            {TEMPLATE_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
          </select>
          <button
            onClick={() => setShowVars(v => !v)}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50"
          >
            <Info size={14} /> Variables
          </button>
          <div className="flex-1" />
          <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            <Plus size={16} /> New Template
          </button>
        </div>

        {/* Variables reference */}
        {showVars && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-amber-800 mb-2">Available Variables (auto-filled from lead data)</p>
            <div className="flex flex-wrap gap-1.5">
              {VARIABLES.map(v => (
                <button key={v} onClick={() => navigator.clipboard.writeText(v).then(() => showToast(`${v} copied!`))} className="px-2 py-1 bg-amber-100 border border-amber-300 text-amber-800 rounded text-xs font-mono hover:bg-amber-200">
                  {v}
                </button>
              ))}
            </div>
            <p className="text-xs text-amber-700 mt-2">Click a variable to copy it. Paste into template content. They&apos;ll be replaced with real lead data when used on a lead&apos;s page.</p>
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full" />
          </div>
        )}

        {!loading && Object.keys(byType).length === 0 && (
          <div className="text-center py-16 text-gray-400">No templates found.</div>
        )}

        {/* Template groups */}
        {Object.entries(byType).map(([type, items]) => (
          <div key={type} className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${TYPE_COLORS[type as TemplateType]}`}>
                {TYPE_LABELS[type as TemplateType]}
              </span>
              <span className="text-xs text-gray-400">{items.length} template{items.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="divide-y divide-gray-50">
              {items.map(t => (
                <div key={t.id} className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-medium text-gray-800 text-sm">{t.name}</h3>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => copy(t.content)} title="Copy content" className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <Copy size={14} />
                      </button>
                      <button onClick={() => openEdit(t)} title="Edit" className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <Edit3 size={14} />
                      </button>
                      <button onClick={() => setDeleteTarget(t.id)} title="Delete" className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <pre className="text-xs text-gray-600 whitespace-pre-wrap bg-gray-50 rounded-lg p-3 border border-gray-100 font-sans leading-relaxed max-h-48 overflow-y-auto">{t.content}</pre>
                </div>
              ))}
            </div>
          </div>
        ))}

      </div>

      {/* Edit/Create modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={isNew ? 'New Template' : 'Edit Template'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Template Name <span className="text-red-500">*</span></label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={editTemplate.name || ''}
                onChange={e => setEditTemplate(p => ({ ...p, name: e.target.value }))}
                placeholder="My Cold Call Script"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Type</label>
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={editTemplate.type || 'cold_call'}
                onChange={e => setEditTemplate(p => ({ ...p, type: e.target.value as TemplateType }))}
              >
                {TEMPLATE_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
              </select>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-gray-500">Content <span className="text-red-500">*</span></label>
              <span className="text-xs text-gray-400">Use variables like {'{{businessName}}'}</span>
            </div>
            <textarea
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono"
              rows={12}
              value={editTemplate.content || ''}
              onChange={e => setEditTemplate(p => ({ ...p, content: e.target.value }))}
              placeholder="Hey {{contactName}}, this is Aaron from Cue Marketing Solutions..."
            />
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <button onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
            <button onClick={save} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
              {saving ? 'Saving...' : isNew ? 'Create Template' : 'Save Changes'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => { if (deleteTarget !== null) deleteTemplate(deleteTarget); }}
        title="Delete Template"
        message="Delete this template? This cannot be undone."
      />
    </AppLayout>
  );
}
