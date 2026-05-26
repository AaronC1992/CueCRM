'use client';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { StatusBadge, PriorityBadge } from '@/components/ui/Badge';
import { DashboardStats, Lead, Activity } from '@/lib/types';
import { formatDate, formatDateTime, formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import {
  Users, TrendingUp, Star, AlertCircle, CheckCircle2,
  XCircle, PhoneCall, Send, Calendar, DollarSign, Flame, Clock, MapPin
} from 'lucide-react';

function StatCard({ label, value, icon: Icon, color, sub }: {
  label: string; value: number | string; icon: React.ElementType;
  color: string; sub?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-start gap-4">
      <div className={`p-2.5 rounded-lg ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-gray-800">{value}</p>
        <p className="text-sm text-gray-500 font-medium">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`API ${r.status}`)))
      .then(data => { setStats(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <AppLayout title="Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      </AppLayout>
    );
  }

  if (!stats) return <AppLayout title="Dashboard"><p className="text-red-500">Failed to load dashboard.</p></AppLayout>;

  return (
    <AppLayout title="Dashboard">
      <div className="space-y-6">

        {/* Follow-up alert */}
        {stats.followUpDueToday > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <AlertCircle size={18} className="text-amber-600 shrink-0" />
            <p className="text-sm font-medium text-amber-800">
              You have <strong>{stats.followUpDueToday}</strong> follow-up{stats.followUpDueToday > 1 ? 's' : ''} due today.
            </p>
            <Link href="/leads?filter=followup" className="ml-auto text-xs font-semibold text-amber-700 underline whitespace-nowrap">
              View leads →
            </Link>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          <StatCard label="Total Leads" value={stats.totalLeads} icon={Users} color="bg-blue-500" />
          <StatCard label="New Leads" value={stats.newLeads} icon={TrendingUp} color="bg-indigo-500" />
          <StatCard label="Contacted" value={stats.contactedLeads} icon={PhoneCall} color="bg-cyan-500" />
          <StatCard label="Interested" value={stats.interestedLeads} icon={Star} color="bg-teal-500" />
          <StatCard label="Demo Sent" value={stats.demoSentLeads} icon={Send} color="bg-violet-500" />
          <StatCard label="Follow Up Due" value={stats.followUpDueToday} icon={Clock} color="bg-amber-500" />
          <StatCard label="Won Deals" value={stats.wonDeals} icon={CheckCircle2} color="bg-green-500" />
          <StatCard label="Lost Deals" value={stats.lostDeals} icon={XCircle} color="bg-red-400" />
        </div>

        {/* Route Stats */}
        {((stats.routesToday ?? 0) > 0 || (stats.completedRoutesThisMonth ?? 0) > 0 || (stats.stopsCompletedThisMonth ?? 0) > 0) && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <MapPin size={16} className="text-blue-500" />
              <h3 className="font-semibold text-gray-800 text-sm">Route Activity</h3>
              <Link href="/routes" className="ml-auto text-xs text-blue-600 hover:underline font-medium">Route Builder →</Link>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-800">{stats.routesToday ?? 0}</p>
                <p className="text-xs text-gray-500">Routes today</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-800">{stats.stopsCompletedThisMonth ?? 0}</p>
                <p className="text-xs text-gray-500">Visits this month</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-800">{stats.completedRoutesThisMonth ?? 0}</p>
                <p className="text-xs text-gray-500">Routes completed</p>
              </div>
            </div>
          </div>
        )}

        {/* Monthly value */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-5 text-white">
            <div className="flex items-center gap-3">
              <DollarSign size={22} className="opacity-80 shrink-0" />
              <div>
                <p className="text-blue-100 text-sm font-medium">Pipeline This Month</p>
                <p className="text-3xl font-bold">{formatCurrency(stats.monthlyEstimatedValue)}</p>
                <p className="text-blue-200 text-xs mt-0.5">New leads added this month</p>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl p-5 text-white">
            <div className="flex items-center gap-3">
              <CheckCircle2 size={22} className="opacity-80 shrink-0" />
              <div>
                <p className="text-green-100 text-sm font-medium">Won This Month</p>
                <p className="text-3xl font-bold">{formatCurrency(stats.wonThisMonthValue)}</p>
                <p className="text-green-200 text-xs mt-0.5">Closed deals this month</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Hot Leads */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <Flame size={17} className="text-orange-500" />
              <h2 className="font-semibold text-gray-800">Hot Leads</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {stats.hotLeads.length === 0 && (
                <p className="px-5 py-6 text-sm text-gray-400 text-center">No hot leads yet.</p>
              )}
              {stats.hotLeads.map((lead: Lead) => (
                <Link
                  key={lead.id as number}
                  href={`/leads/${lead.id}`}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                    <span className="text-orange-700 text-xs font-bold">
                      {(lead.businessName as string)?.[0]?.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 text-sm truncate">{lead.businessName as string}</p>
                    <p className="text-xs text-gray-400">{lead.city as string} · {lead.industry as string}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <PriorityBadge priority={lead.priority as 'Cold'|'Warm'|'Hot'|'Urgent'} size="sm" />
                    <StatusBadge status={lead.leadStatus as 'New'} size="sm" />
                  </div>
                </Link>
              ))}
            </div>
            <div className="px-5 py-3 border-t border-gray-50">
              <Link href="/leads?priority=Hot" className="text-xs text-blue-600 font-medium hover:underline">
                View all hot leads →
              </Link>
            </div>
          </div>

          {/* Upcoming Follow Ups */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <Calendar size={17} className="text-blue-500" />
              <h2 className="font-semibold text-gray-800">Upcoming Follow Ups</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {stats.upcomingFollowUps.length === 0 && (
                <p className="px-5 py-6 text-sm text-gray-400 text-center">No upcoming follow-ups scheduled.</p>
              )}
              {stats.upcomingFollowUps.map((lead: Lead) => (
                <Link
                  key={lead.id as number}
                  href={`/leads/${lead.id}`}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <Calendar size={14} className="text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 text-sm truncate">{lead.businessName as string}</p>
                    <p className="text-xs text-gray-400">{lead.city as string}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-medium text-gray-600">{formatDate(lead.nextFollowUpDate as string)}</p>
                    <StatusBadge status={lead.leadStatus as 'New'} size="sm" />
                  </div>
                </Link>
              ))}
            </div>
            <div className="px-5 py-3 border-t border-gray-50">
              <Link href="/tasks" className="text-xs text-blue-600 font-medium hover:underline">
                View all tasks →
              </Link>
            </div>
          </div>

        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Recent Activity</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {stats.recentActivity.length === 0 && (
              <p className="px-5 py-6 text-sm text-gray-400 text-center">No activity yet. Add some leads to get started!</p>
            )}
            {stats.recentActivity.map((activity: Activity) => (
              <div key={activity.id as number} className="px-5 py-3 flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-400 mt-2 shrink-0" />
                <div className="flex-1 min-w-0">
                  {activity.businessName && (
                    <Link href={`/leads/${activity.leadId}`} className="text-xs font-semibold text-blue-600 hover:underline">
                      {activity.businessName as string}
                    </Link>
                  )}
                  <p className="text-sm text-gray-600">{activity.description as string}</p>
                </div>
                <span className="text-xs text-gray-400 shrink-0 whitespace-nowrap">
                  {formatDateTime(activity.createdDate as string)}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </AppLayout>
  );
}
