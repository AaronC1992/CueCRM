'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { StatusBadge, PriorityBadge, TagBadge } from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import { showToast } from '@/components/ui/Toast';
import { Lead, LeadStatus, Priority, Activity, Template, Demo, Task, TaskType, TaskPriority, Deal } from '@/lib/types';
import {
  formatDate, formatDateTime, formatCurrency,
  LEAD_STATUSES, PRIORITIES, INDUSTRIES, LEAD_SOURCES,
  STATES, WEBSITE_QUALITY_OPTIONS, SERVICE_OPPORTUNITIES, fillTemplate
} from '@/lib/utils';
import {
  Phone, Mail, Globe, MapPin, Calendar, DollarSign,
  Edit3, Save, X, CheckCircle, Circle, PhoneCall, Send,
  Clock, Tag, ArrowLeft, Trash2, Plus, ExternalLink, Copy, MessageSquare, Navigation
} from 'lucide-react';
import Link from 'next/link';

const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
const textareaCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none";

function InfoRow({ icon: Icon, label, value, href }: { icon: React.ElementType; label: string; value?: string | null; href?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2">
      <Icon size={14} className="text-gray-400 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <span className="text-xs text-gray-400 block">{label}</span>
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline break-all flex items-center gap-1">
            {value} <ExternalLink size={11} />
          </a>
        ) : (
          <span className="text-sm text-gray-700 break-words">{value}</span>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
      <div className="px-5 py-3.5 border-b border-gray-100">
        <h3 className="font-semibold text-gray-800 text-sm">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [lead, setLead] = useState<Lead | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Lead>>({});
  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');
  const [noteText, setNoteText] = useState('');
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [existingTags, setExistingTags] = useState<string[]>([]);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [activityFilter, setActivityFilter] = useState('');
  const tagRef = useRef<HTMLDivElement>(null);
  const [leadDemos, setLeadDemos] = useState<Demo[]>([]);
  const [leadTasks, setLeadTasks] = useState<Task[]>([]);
  const [showCreateDealModal, setShowCreateDealModal] = useState(false);
  const [newDeal, setNewDeal] = useState<Partial<Deal>>({});
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [newTask, setNewTask] = useState<Partial<Task>>({});
  const [showNewDemoModal, setShowNewDemoModal] = useState(false);
  const [newDemo, setNewDemo] = useState<Partial<Demo>>({});

  const fetchAll = useCallback(async () => {
    const [leadRes, activityRes, templateRes, demoRes, taskRes] = await Promise.all([
      fetch(`/api/leads/${params.id}`),
      fetch(`/api/activities?leadId=${params.id}`),
      fetch('/api/templates'),
      fetch(`/api/demos?leadId=${params.id}`),
      fetch(`/api/tasks?leadId=${params.id}`),
    ]);
    if (leadRes.ok) { const d = await leadRes.json(); setLead(d); setEditForm(d); }
    if (activityRes.ok) setActivities(await activityRes.json());
    if (templateRes.ok) setTemplates(await templateRes.json());
    if (demoRes.ok) setLeadDemos(await demoRes.json());
    if (taskRes.ok) setLeadTasks(await taskRes.json());
    setLoading(false);
  }, [params.id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    fetch('/api/leads/tags').then(r => r.ok ? r.json() : []).then(setExistingTags).catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (tagRef.current && !tagRef.current.contains(e.target as Node)) setShowTagSuggestions(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const save = async () => {
    if (!lead) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setLead(updated);
      setEditing(false);
      showToast('Lead updated!');
      fetchAll();
    } catch { showToast('Failed to save.', 'error'); }
    setSaving(false);
  };

  const markContacted = async () => {
    if (!lead) return;
    const today = new Date().toISOString().split('T')[0];
    const followUp = new Date();
    followUp.setDate(followUp.getDate() + 3);
    const res = await fetch(`/api/leads/${lead.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadStatus: 'Contacted', lastContactedDate: today, nextFollowUpDate: followUp.toISOString().split('T')[0] }),
    });
    if (res.ok) {
      await fetch('/api/activities', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead.id, type: 'call', description: 'Marked as contacted' }),
      });
      showToast('Marked as contacted. Follow-up set for 3 days out.');
      fetchAll();
    }
  };

  const scheduleFollowUp = async () => {
    if (!lead || !followUpDate) return;
    const res = await fetch(`/api/leads/${lead.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nextFollowUpDate: followUpDate }),
    });
    if (res.ok) {
      await fetch('/api/activities', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead.id, type: 'follow_up', description: `Follow-up scheduled for ${followUpDate}` }),
      });
      showToast('Follow-up scheduled!');
      setShowFollowUpModal(false);
      fetchAll();
    }
  };

  const markWon = async () => {
    if (!lead) return;
    await fetch(`/api/leads/${lead.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadStatus: 'Won' }),
    });
    await fetch('/api/activities', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId: lead.id, type: 'won', description: '🎉 Deal marked as WON!' }),
    });
    showToast('🎉 Deal marked as WON!');
    setNewDeal({ businessName: lead.businessName, leadId: lead.id, dealStage: 'Won', oneTimeSetupValue: lead.estimatedDealValue ?? undefined, notes: '' });
    setShowCreateDealModal(true);
    fetchAll();
  };

  const markLost = async () => {
    if (!lead) return;
    await fetch(`/api/leads/${lead.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadStatus: 'Lost' }),
    });
    await fetch('/api/activities', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId: lead.id, type: 'lost', description: 'Lead marked as lost.' }),
    });
    showToast('Lead marked as lost.', 'info');
    fetchAll();
  };

  const addNote = async () => {
    if (!noteText.trim() || !lead) return;
    await fetch('/api/activities', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId: lead.id, type: 'note', description: noteText.trim() }),
    });
    showToast('Note added!');
    setNoteText('');
    setShowNoteModal(false);
    fetchAll();
  };

  const deleteLead = async () => {
    if (!lead) return;
    await fetch(`/api/leads/${lead.id}`, { method: 'DELETE' });
    showToast('Lead deleted.', 'info');
    router.push('/leads');
  };

  const getTemplateVars = (lead: Lead) => ({
    businessName: lead.businessName || '',
    contactName: lead.contactName || lead.businessName || '',
    city: lead.city || '',
    industry: lead.industry || '',
    websiteIssue: lead.currentWebsiteQuality || 'no modern website',
    demoUrl: lead.demoWebsiteUrl || '[DEMO URL]',
    serviceOffer: lead.suggestedOffer || lead.serviceOpportunity || 'our services',
    myName: 'Aaron',
    myPhone: '918 808 0074',
    myEmail: 'info@cuemarketingsolutions.com',
  });

  const copyTemplate = (templateType: string) => {
    if (!lead) return;
    const tmpl = templates.find(t => t.type === templateType);
    if (!tmpl) { showToast('Template not found.', 'error'); return; }
    const filled = fillTemplate(tmpl.content, getTemplateVars(lead));
    navigator.clipboard.writeText(filled).then(() => showToast(`${tmpl.name} copied to clipboard!`));
  };

  const sendDemo = async () => {
    if (!lead) return;
    const tmpl = templates.find(t => t.type === 'demo_delivery');
    if (!tmpl) { showToast('Demo Delivery template not found.', 'error'); return; }
    const filled = fillTemplate(tmpl.content, getTemplateVars(lead));
    try { await navigator.clipboard.writeText(filled); } catch { /* ignore */ }
    const today = new Date().toISOString().split('T')[0];
    const followUp = new Date();
    followUp.setDate(followUp.getDate() + 3);
    await fetch(`/api/leads/${lead.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadStatus: 'Demo website sent', lastContactedDate: today, nextFollowUpDate: followUp.toISOString().split('T')[0] }),
    });
    await fetch('/api/activities', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId: lead.id, type: 'demo_sent', description: 'Demo delivery message copied to clipboard. Status set to "Demo website sent". Follow-up in 3 days.' }),
    });
    showToast('Demo delivery message copied! Lead updated.');
    fetchAll();
  };

  const createDeal = async () => {
    const res = await fetch('/api/deals', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newDeal, dealStage: 'Won' }),
    });
    if (res.ok) showToast('Deal created!');
    else showToast('Failed to create deal.', 'error');
    setShowCreateDealModal(false);
  };

  const addLeadTask = async () => {
    if (!newTask.title?.trim() || !lead) return;
    const res = await fetch('/api/tasks', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newTask, leadId: lead.id }),
    });
    if (res.ok) showToast('Task added!');
    else showToast('Failed to add task.', 'error');
    setShowAddTaskModal(false);
    setNewTask({});
    fetchAll();
  };

  const toggleLeadTask = async (taskId: number, currentStatus: string) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    await fetch(`/api/tasks/${taskId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    if (newStatus === 'completed') showToast('Task completed! ✓');
    fetchAll();
  };

  const createDemo = async () => {
    if (!lead) return;
    const res = await fetch('/api/demos', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newDemo, leadId: lead.id, businessName: lead.businessName }),
    });
    if (res.ok) showToast('Demo created!');
    else showToast('Failed to create demo.', 'error');
    setShowNewDemoModal(false);
    setNewDemo({});
    fetchAll();
  };

  const set = (field: keyof Lead, value: unknown) => setEditForm(prev => ({ ...prev, [field]: value }));

  if (loading) return (
    <AppLayout title="Lead Detail">
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    </AppLayout>
  );

  if (!lead) return (
    <AppLayout title="Lead Not Found">
      <div className="text-center py-16">
        <p className="text-gray-500 mb-4">Lead not found.</p>
        <button onClick={() => router.push('/leads')} className="text-blue-600 hover:underline">← Back to Leads</button>
      </div>
    </AppLayout>
  );

  return (
    <AppLayout title={lead.businessName}>
      <div className="max-w-6xl space-y-5">

        {/* Top bar */}
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => router.push('/leads')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft size={15} /> Leads
          </button>
          <div className="flex-1" />
          {!editing && (
            <Link href={`/routes?leads=${params.id}`}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-sm font-medium hover:bg-blue-100">
              <Navigation size={14} /> Add to Route
            </Link>
          )}
          {!editing ? (
            <>
              <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50">
                <Edit3 size={14} /> Edit
              </button>
              <button onClick={() => setShowDeleteModal(true)} className="flex items-center gap-1.5 px-3 py-2 border border-red-200 text-red-500 rounded-lg text-sm hover:bg-red-50">
                <Trash2 size={14} /> Delete
              </button>
            </>
          ) : (
            <>
              <button onClick={save} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
                <Save size={14} /> {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button onClick={() => { setEditing(false); setEditForm(lead); }} className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50">
                <X size={14} /> Cancel
              </button>
            </>
          )}
        </div>

        {/* Header card */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex flex-wrap items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shrink-0">
              <span className="text-white text-xl font-bold">{lead.businessName?.[0]?.toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              {!editing ? (
                <>
                  <h1 className="text-xl font-bold text-gray-800">{lead.businessName}</h1>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <StatusBadge status={lead.leadStatus} />
                    <PriorityBadge priority={lead.priority} />
                    {lead.industry && <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{lead.industry}</span>}
                    {lead.city && <span className="text-xs text-gray-500">{lead.city}, {lead.state}</span>}
                  </div>
                  {lead.estimatedDealValue && (
                    <p className="text-sm font-semibold text-green-600 mt-1">{formatCurrency(lead.estimatedDealValue)} estimated</p>
                  )}
                </>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input className={inputCls} value={editForm.businessName || ''} onChange={e => set('businessName', e.target.value)} placeholder="Business name" />
                  <select className={inputCls} value={editForm.leadStatus || 'New'} onChange={e => set('leadStatus', e.target.value as LeadStatus)}>
                    {LEAD_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <select className={inputCls} value={editForm.priority || 'Warm'} onChange={e => set('priority', e.target.value as Priority)}>
                    {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          <button onClick={markContacted} className="flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            <PhoneCall size={15} /> Mark Contacted
          </button>
          <button onClick={() => { setFollowUpDate(''); setShowFollowUpModal(true); }} className="flex items-center justify-center gap-2 px-3 py-2.5 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600">
            <Calendar size={15} /> Schedule Follow Up
          </button>
          <button onClick={sendDemo} className="flex items-center justify-center gap-2 px-3 py-2.5 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700">
            <Send size={15} /> Send Demo
          </button>
          <button onClick={markWon} className="flex items-center justify-center gap-2 px-3 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
            <CheckCircle size={15} /> Mark Won
          </button>
          <button onClick={markLost} className="flex items-center justify-center gap-2 px-3 py-2.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600">
            <X size={15} /> Mark Lost
          </button>
        </div>

        {/* Copy templates */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Copy Outreach Templates</p>
          <div className="flex flex-wrap gap-2">
            {[
              { type: 'cold_call', label: 'Cold Call Script', icon: Phone },
              { type: 'cold_email', label: 'Cold Email', icon: Mail },
              { type: 'facebook_message', label: 'Facebook Message', icon: MessageSquare },
              { type: 'text_message', label: 'Text Message', icon: MessageSquare },
              { type: 'follow_up', label: 'Follow Up', icon: Clock },
              { type: 'demo_delivery', label: 'Demo Delivery', icon: Send },
            ].map(({ type, label, icon: Icon }) => (
              <button
                key={type}
                onClick={() => copyTemplate(type)}
                className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 border border-gray-200 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-100 hover:border-gray-300 transition-colors"
              >
                <Icon size={13} /> <Copy size={11} className="text-gray-400" /> {label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">

            {/* Contact info */}
            <Section title="Contact Information">
              {!editing ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InfoRow icon={Phone} label="Phone" value={lead.phone} href={lead.phone ? `tel:${lead.phone}` : undefined} />
                  <InfoRow icon={Mail} label="Email" value={lead.email} href={lead.email ? `mailto:${lead.email}` : undefined} />
                  <InfoRow icon={Globe} label="Website" value={lead.website} href={lead.website} />
                  <InfoRow icon={Globe} label="Facebook" value={lead.facebookPage} href={lead.facebookPage} />
                  <InfoRow icon={MapPin} label="Address" value={[lead.address, lead.city, lead.state].filter(Boolean).join(', ')} />
                  <InfoRow icon={Globe} label="Google Business" value={lead.googleBusinessProfile} href={lead.googleBusinessProfile} />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { key: 'contactName', label: 'Contact Name', placeholder: 'John Smith' },
                    { key: 'phone', label: 'Phone', placeholder: '417-555-0100' },
                    { key: 'email', label: 'Email', placeholder: 'owner@biz.com' },
                    { key: 'website', label: 'Website', placeholder: 'https://...' },
                    { key: 'facebookPage', label: 'Facebook', placeholder: 'https://facebook.com/...' },
                    { key: 'address', label: 'Address', placeholder: '123 Main St' },
                    { key: 'city', label: 'City', placeholder: 'Joplin' },
                    { key: 'googleBusinessProfile', label: 'Google Business', placeholder: 'https://...' },
                  ].map(({ key, label, placeholder }) => (
                    <div key={key}>
                      <label className="text-xs text-gray-500 mb-1 block">{label}</label>
                      <input className={inputCls} value={(editForm as Record<string, unknown>)[key] as string || ''} onChange={e => set(key as keyof Lead, e.target.value)} placeholder={placeholder} />
                    </div>
                  ))}
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Industry</label>
                    <select className={inputCls} value={editForm.industry || ''} onChange={e => set('industry', e.target.value)}>
                      <option value="">Select...</option>
                      {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">State</label>
                    <select className={inputCls} value={editForm.state || 'MO'} onChange={e => set('state', e.target.value)}>
                      {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </Section>

            {/* Opportunity */}
            <Section title="Research & Opportunity">
              {!editing ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InfoRow icon={Globe} label="Has Website?" value={lead.hasWebsite} />
                  <InfoRow icon={Globe} label="Has Facebook?" value={lead.hasFacebookPage} />
                  <InfoRow icon={Globe} label="Website Quality" value={lead.currentWebsiteQuality} />
                  <InfoRow icon={DollarSign} label="Lead Source" value={lead.leadSource} />
                  <InfoRow icon={Send} label="Service Opportunity" value={lead.serviceOpportunity} />
                  <InfoRow icon={Tag} label="Suggested Offer" value={lead.suggestedOffer} />
                  {lead.estimatedDealValue != null && (
                    <InfoRow icon={DollarSign} label="Est. Monthly Value" value={formatCurrency(lead.estimatedDealValue)} />
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {['hasWebsite', 'hasFacebookPage'].map(k => (
                    <div key={k}>
                      <label className="text-xs text-gray-500 mb-1 block">{k === 'hasWebsite' ? 'Has Website?' : 'Has Facebook?'}</label>
                      <select className={inputCls} value={(editForm as Record<string, unknown>)[k] as string || ''} onChange={e => set(k as keyof Lead, e.target.value)}>
                        <option value="">Unknown</option><option>Yes</option><option>No</option>
                      </select>
                    </div>
                  ))}
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Website Quality</label>
                    <select className={inputCls} value={editForm.currentWebsiteQuality || ''} onChange={e => set('currentWebsiteQuality', e.target.value)}>
                      <option value="">Select...</option>
                      {WEBSITE_QUALITY_OPTIONS.map(q => <option key={q}>{q}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Service Opportunity</label>
                    <select className={inputCls} value={editForm.serviceOpportunity || ''} onChange={e => set('serviceOpportunity', e.target.value)}>
                      <option value="">Select...</option>
                      {SERVICE_OPPORTUNITIES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Suggested Offer</label>
                    <input className={inputCls} value={editForm.suggestedOffer || ''} onChange={e => set('suggestedOffer', e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Estimated Monthly Value ($)</label>
                    <input className={inputCls} type="number" value={editForm.estimatedDealValue ?? ''} onChange={e => set('estimatedDealValue', e.target.value ? Number(e.target.value) : null)} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Lead Source</label>
                    <select className={inputCls} value={editForm.leadSource || ''} onChange={e => set('leadSource', e.target.value)}>
                      {LEAD_SOURCES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </Section>

            {/* Notes & Pitch */}
            <Section title="Notes & Pitch">
              {!editing ? (
                <div className="space-y-4">
                  {lead.notes && <div><p className="text-xs text-gray-400 mb-1">Notes</p><p className="text-sm text-gray-700 whitespace-pre-wrap">{lead.notes}</p></div>}
                  {lead.painPoints && <div><p className="text-xs text-gray-400 mb-1">Pain Points</p><p className="text-sm text-gray-700 whitespace-pre-wrap">{lead.painPoints}</p></div>}
                  {lead.personalizedPitch && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs text-gray-400">Personalized Pitch</p>
                        <button onClick={() => navigator.clipboard.writeText(lead.personalizedPitch).then(() => showToast('Pitch copied!'))} className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                          <Copy size={11} /> Copy
                        </button>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap bg-blue-50 border border-blue-100 rounded-lg p-3">{lead.personalizedPitch}</p>
                    </div>
                  )}
                  {!lead.notes && !lead.painPoints && !lead.personalizedPitch && (
                    <p className="text-sm text-gray-400">No notes yet. <button onClick={() => setShowNoteModal(true)} className="text-blue-500 hover:underline">Add a note</button></p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {['notes', 'painPoints', 'personalizedPitch'].map(k => (
                    <div key={k}>
                      <label className="text-xs text-gray-500 mb-1 block capitalize">{k.replace(/([A-Z])/g, ' $1')}</label>
                      <textarea className={textareaCls} rows={3} value={(editForm as Record<string, unknown>)[k] as string || ''} onChange={e => set(k as keyof Lead, e.target.value)} />
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* Demo Links */}
            {(lead.demoWebsiteUrl || lead.crmDemoUrl || editing) && (
              <Section title="Demo Links">
                {!editing ? (
                  <div className="space-y-3">
                    {lead.demoWebsiteUrl && <InfoRow icon={Globe} label="Demo Website" value={lead.demoWebsiteUrl} href={lead.demoWebsiteUrl} />}
                    {lead.crmDemoUrl && <InfoRow icon={Globe} label="CRM Demo" value={lead.crmDemoUrl} href={lead.crmDemoUrl} />}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Demo Website URL</label>
                      <input className={inputCls} value={editForm.demoWebsiteUrl || ''} onChange={e => set('demoWebsiteUrl', e.target.value)} placeholder="https://demo..." />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">CRM Demo URL</label>
                      <input className={inputCls} value={editForm.crmDemoUrl || ''} onChange={e => set('crmDemoUrl', e.target.value)} placeholder="https://..." />
                    </div>
                  </div>
                )}
              </Section>
            )}

            {/* Tasks */}
            <Section title="Tasks">
              <div className="flex items-center justify-between mb-3">
                <Link href="/tasks" className="text-xs text-blue-600 hover:underline font-medium">
                  View all tasks
                </Link>
                <button onClick={() => { setNewTask({ title: '', taskType: 'Follow up', priority: 'Normal', dueDate: '' }); setShowAddTaskModal(true); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg text-xs font-medium hover:bg-blue-100">
                  <Plus size={12} /> Add Task
                </button>
              </div>
              {leadTasks.filter(t => t.status !== 'completed').length === 0 ? (
                <p className="text-sm text-gray-400">No open tasks.</p>
              ) : (
                <div className="space-y-2">
                  {leadTasks.filter(t => t.status !== 'completed').map(task => (
                    <div key={task.id} className="flex items-center gap-2 text-sm">
                      <button onClick={() => toggleLeadTask(task.id, task.status)} className="shrink-0 text-gray-300 hover:text-green-500 transition-colors">
                        <Circle size={16} />
                      </button>
                      <span className="flex-1 text-gray-700">{task.title}</span>
                      <span className="text-xs text-gray-400 shrink-0">{task.taskType}</span>
                      {task.dueDate && <span className={`text-xs shrink-0 ${new Date(task.dueDate) < new Date() ? 'text-red-500 font-medium' : 'text-gray-400'}`}>{formatDate(task.dueDate)}</span>}
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* Activity Timeline */}
            <Section title="Activity Timeline">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex flex-wrap gap-1">
                  {[['', 'All'], ['note', 'Notes'], ['call', 'Calls'], ['follow_up', 'Follow Ups'], ['status_change', 'Status'], ['won', 'Won'], ['lost', 'Lost']].map(([val, label]) => (
                    <button key={val} onClick={() => setActivityFilter(val)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${activityFilter === val ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}>
                      {label}
                    </button>
                  ))}
                </div>
                <button onClick={() => setShowNoteModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg text-xs font-medium hover:bg-blue-100">
                  <Plus size={12} /> Add Note
                </button>
              </div>
              <div className="space-y-3">
                {(() => {
                  const filtered = activityFilter ? activities.filter(a => a.type === activityFilter) : activities;
                  if (filtered.length === 0) return <p className="text-sm text-gray-400 text-center py-4">{activityFilter ? 'No matching activity.' : 'No activity yet.'}</p>;
                  return filtered.map(activity => (
                    <div key={activity.id} className="flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${
                        activity.type === 'won' ? 'bg-green-500' :
                        activity.type === 'lost' ? 'bg-red-400' :
                        activity.type === 'status_change' ? 'bg-purple-400' :
                        activity.type === 'call' ? 'bg-blue-400' :
                        'bg-gray-300'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{activity.description}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(activity.createdDate)}</p>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </Section>

          </div>

          {/* Right sidebar */}
          <div className="space-y-4">

            {/* Quick info */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
              <h3 className="font-semibold text-gray-800 text-sm">Quick Info</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Status</span>
                  <StatusBadge status={lead.leadStatus} size="sm" />
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Priority</span>
                  <PriorityBadge priority={lead.priority} size="sm" />
                </div>
                {lead.estimatedDealValue != null && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Est. Monthly Value</span>
                    <span className="font-medium text-green-600">{formatCurrency(lead.estimatedDealValue)}</span>
                  </div>
                )}
                {lead.lastContactedDate && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Last Contact</span>
                    <span className="text-gray-700">{formatDate(lead.lastContactedDate)}</span>
                  </div>
                )}
                {lead.nextFollowUpDate && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Follow Up</span>
                    <span className={`font-medium ${new Date(lead.nextFollowUpDate) < new Date() ? 'text-red-500' : 'text-gray-700'}`}>
                      {formatDate(lead.nextFollowUpDate)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Source</span>
                  <span className="text-gray-700">{lead.leadSource || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Added</span>
                  <span className="text-gray-700">{formatDate(lead.createdDate)}</span>
                </div>
              </div>
            </div>

            {/* Package interest */}
            {(lead.websitePackageInterest || lead.crmPackageInterest || lead.marketingPackageInterest) && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <h3 className="font-semibold text-gray-800 text-sm mb-3">Package Interest</h3>
                <div className="space-y-1.5 text-sm">
                  {lead.websitePackageInterest && <p className="text-gray-600">🌐 {lead.websitePackageInterest}</p>}
                  {lead.crmPackageInterest && <p className="text-gray-600">⚙️ {lead.crmPackageInterest}</p>}
                  {lead.marketingPackageInterest && <p className="text-gray-600">📣 {lead.marketingPackageInterest}</p>}
                </div>
              </div>
            )}

            {/* Tags */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <h3 className="font-semibold text-gray-800 text-sm mb-3">Tags</h3>
              <div className="flex flex-wrap gap-1.5">
                {lead.tags?.map(tag => <TagBadge key={tag} tag={tag} />)}
                {(!lead.tags || lead.tags.length === 0) && (
                  <p className="text-xs text-gray-400">No tags</p>
                )}
              </div>
              {editing && (
                <div className="mt-2" ref={tagRef}>
                  <div className="relative flex gap-1">
                    <input
                      className="flex-1 border border-gray-200 rounded px-2 py-1 text-xs"
                      value={tagInput}
                      onChange={e => { setTagInput(e.target.value); setShowTagSuggestions(true); }}
                      onFocus={() => setShowTagSuggestions(true)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const t = tagInput.trim().toLowerCase();
                          if (t && !editForm.tags?.includes(t)) {
                            set('tags', [...(editForm.tags || []), t]);
                          }
                          setTagInput('');
                          setShowTagSuggestions(false);
                        }
                      }}
                      placeholder="Add tag..."
                    />
                    {showTagSuggestions && tagInput.trim() && (() => {
                      const suggestions = existingTags.filter(t =>
                        t.includes(tagInput.trim().toLowerCase()) &&
                        !(editForm.tags || []).includes(t)
                      );
                      if (!suggestions.length) return null;
                      return (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-32 overflow-y-auto">
                          {suggestions.map(s => (
                            <button key={s} type="button"
                              className="w-full text-left px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                              onMouseDown={e => { e.preventDefault(); set('tags', [...(editForm.tags || []), s]); setTagInput(''); setShowTagSuggestions(false); }}
                            >{s}</button>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>

            {/* Linked Demo */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-800 text-sm">Demo</h3>
                <button onClick={() => { setNewDemo({ originalWebsiteUrl: lead.website || '', demoStatus: 'Started', layoutOptionUsed: 'Website' }); setShowNewDemoModal(true); }} className="text-xs text-blue-500 hover:underline">+ New Demo</button>
              </div>
              {leadDemos.length === 0 ? (
                <p className="text-xs text-gray-400">No demo started yet.</p>
              ) : (
                <div className="space-y-2">
                  {leadDemos.map(d => (
                    <div key={d.id} className="flex items-center justify-between text-xs">
                      <span className="text-gray-700 font-medium">{d.demoStatus}</span>
                      {d.demoUrl && <a href={d.demoUrl.startsWith('http') ? d.demoUrl : `https://${d.demoUrl}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline flex items-center gap-0.5">View <ExternalLink size={9} /></a>}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Modals */}
        <Modal open={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete Lead" size="sm">
          <p className="text-gray-600 text-sm mb-4">Are you sure you want to delete <strong>{lead.businessName}</strong>? This cannot be undone.</p>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
            <button onClick={deleteLead} className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600">Delete</button>
          </div>
        </Modal>

        <Modal open={showFollowUpModal} onClose={() => setShowFollowUpModal(false)} title="Schedule Follow Up" size="sm">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {[{ label: 'Tomorrow', days: 1 }, { label: '+3 days', days: 3 }, { label: '+1 week', days: 7 }, { label: '+2 weeks', days: 14 }].map(({ label, days }) => {
                const d = new Date(); d.setDate(d.getDate() + days);
                const val = d.toISOString().split('T')[0];
                return (
                  <button key={label} onClick={() => setFollowUpDate(val)} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${followUpDate === val ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700'}`}>
                    {label}
                  </button>
                );
              })}
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Or pick a date</label>
              <input type="date" className={inputCls} value={followUpDate} onChange={e => setFollowUpDate(e.target.value)} />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowFollowUpModal(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={scheduleFollowUp} disabled={!followUpDate} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60">Schedule</button>
            </div>
          </div>
        </Modal>

        <Modal open={showNoteModal} onClose={() => setShowNoteModal(false)} title="Add Note" size="sm">
          <div className="space-y-4">
            <textarea className={textareaCls} rows={4} value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Write a note about this lead..." />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowNoteModal(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={addNote} disabled={!noteText.trim()} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60">Add Note</button>
            </div>
          </div>
        </Modal>

        <Modal open={showCreateDealModal} onClose={() => setShowCreateDealModal(false)} title="🎉 Create Deal Record?" size="sm">
          <p className="text-sm text-gray-600 mb-4">Log this win as a deal to track your revenue.</p>
          <div className="space-y-3 mb-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Service Sold</label>
              <input className={inputCls} value={newDeal.serviceSold || ''} onChange={e => setNewDeal(p => ({ ...p, serviceSold: e.target.value }))} placeholder="Website redesign + Local SEO" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Setup Value ($)</label>
                <input className={inputCls} type="number" value={newDeal.oneTimeSetupValue ?? ''} onChange={e => setNewDeal(p => ({ ...p, oneTimeSetupValue: e.target.value ? Number(e.target.value) : undefined }))} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Monthly ($)</label>
                <input className={inputCls} type="number" value={newDeal.monthlyValue ?? ''} onChange={e => setNewDeal(p => ({ ...p, monthlyValue: e.target.value ? Number(e.target.value) : undefined }))} />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Notes</label>
              <textarea className={textareaCls} rows={2} value={newDeal.notes || ''} onChange={e => setNewDeal(p => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowCreateDealModal(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Skip</button>
            <button onClick={createDeal} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">Create Deal</button>
          </div>
        </Modal>

        <Modal open={showAddTaskModal} onClose={() => setShowAddTaskModal(false)} title="Add Task" size="sm">
          <div className="space-y-3 mb-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Task Title</label>
              <input className={inputCls} value={newTask.title || ''} onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Send follow-up email" autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Type</label>
                <select className={inputCls} value={newTask.taskType || 'Follow up'} onChange={e => setNewTask(p => ({ ...p, taskType: e.target.value as TaskType }))}>
                  {['Call','Email','Facebook message','Text','Build demo','Send demo','Follow up','Meeting','Proposal','Other'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Priority</label>
                <select className={inputCls} value={newTask.priority || 'Normal'} onChange={e => setNewTask(p => ({ ...p, priority: e.target.value as TaskPriority }))}>
                  {['Low','Normal','High','Urgent'].map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Due Date</label>
              <input type="date" className={inputCls} value={newTask.dueDate || ''} onChange={e => setNewTask(p => ({ ...p, dueDate: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowAddTaskModal(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
            <button onClick={addLeadTask} disabled={!newTask.title?.trim()} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60">Add Task</button>
          </div>
        </Modal>

        <Modal open={showNewDemoModal} onClose={() => setShowNewDemoModal(false)} title="Create Demo" size="sm">
          <div className="space-y-3 mb-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Original Website URL</label>
              <input className={inputCls} value={newDemo.originalWebsiteUrl || ''} onChange={e => setNewDemo(p => ({ ...p, originalWebsiteUrl: e.target.value }))} placeholder="https://theirsitetorebuild.com" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Demo URL (if already started)</label>
              <input className={inputCls} value={newDemo.demoUrl || ''} onChange={e => setNewDemo(p => ({ ...p, demoUrl: e.target.value }))} placeholder="https://demo.cuemarketingsolutions.com/..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Type</label>
                <select className={inputCls} value={newDemo.layoutOptionUsed || 'Website'} onChange={e => setNewDemo(p => ({ ...p, layoutOptionUsed: e.target.value }))}>
                  <option value="Website">Website</option>
                  <option value="CRM">CRM</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Status</label>
                <select className={inputCls} value={newDemo.demoStatus || 'Started'} onChange={e => setNewDemo(p => ({ ...p, demoStatus: e.target.value as Demo['demoStatus'] }))}>
                  {['Idea','Started','Needs content','Ready to send','Sent'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowNewDemoModal(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
            <button onClick={createDemo} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Create Demo</button>
          </div>
        </Modal>

      </div>
    </AppLayout>
  );
}
