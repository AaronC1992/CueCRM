'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { showToast } from '@/components/ui/Toast';
import { Save } from 'lucide-react';

const SETTINGS_FIELDS = [
  { key: 'businessName', label: 'Business Name', placeholder: 'Cue Marketing Solutions', type: 'text' },
  { key: 'ownerName', label: 'Owner Name', placeholder: 'Aaron Cue', type: 'text' },
  { key: 'email', label: 'Email', placeholder: 'info@cuemarketingsolutions.com', type: 'email' },
  { key: 'phone', label: 'Phone', placeholder: '918 808 0074', type: 'text' },
  { key: 'defaultCity', label: 'Default City', placeholder: 'Joplin', type: 'text' },
  { key: 'defaultState', label: 'Default State', placeholder: 'MO', type: 'text' },
  { key: 'defaultLeadSource', label: 'Default Lead Source', placeholder: 'Manual research', type: 'text' },
  { key: 'defaultFollowUpDays', label: 'Default Follow-Up Days', placeholder: '3', type: 'number' },
  { key: 'defaultEstimatedValue', label: 'Default Estimated Value ($)', placeholder: '1500', type: 'number' },
];

const TEXTAREA_FIELDS = [
  { key: 'defaultServices', label: 'Default Services Offered', placeholder: 'Website design, Local SEO, Social media management...' },
  { key: 'defaultSignature', label: 'Default Email Signature', placeholder: 'Aaron Cue\nCue Marketing Solutions\n918 808 0074\ninfo@cuemarketingsolutions.com' },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(data => {
      setSettings(data);
      setLoading(false);
    });
  }, []);

  const set = (key: string, value: string) => setSettings(prev => ({ ...prev, [key]: value }));

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error();
      showToast('Settings saved!');
    } catch { showToast('Failed to save settings.', 'error'); }
    setSaving(false);
  };

  const inp = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";

  if (loading) return (
    <AppLayout title="Settings">
      <div className="flex justify-center py-16"><div className="animate-spin w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full" /></div>
    </AppLayout>
  );

  return (
    <AppLayout title="Settings">
      <div className="max-w-2xl space-y-6">

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Business Info</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {SETTINGS_FIELDS.map(({ key, label, placeholder, type }) => (
              <div key={key}>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">{label}</label>
                <input
                  className={inp}
                  type={type}
                  value={settings[key] || ''}
                  onChange={e => set(key, e.target.value)}
                  placeholder={placeholder}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Defaults & Templates</h2>
          <div className="space-y-4">
            {TEXTAREA_FIELDS.map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">{label}</label>
                <textarea
                  className={inp + ' resize-none'}
                  rows={4}
                  value={settings[key] || ''}
                  onChange={e => set(key, e.target.value)}
                  placeholder={placeholder}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
          <p className="font-semibold mb-1">Service Area</p>
          <p>Joplin, Webb City, Carthage, Neosho, Carl Junction, Pittsburg MO</p>
          <p className="mt-2 font-semibold">Contact</p>
          <p>info@cuemarketingsolutions.com · 918 808 0074</p>
        </div>

        <div className="pb-4">
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>

      </div>
    </AppLayout>
  );
}
