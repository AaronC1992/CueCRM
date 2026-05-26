import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { Lead } from '@/lib/types';

function parseLead(row: Record<string, unknown>): Lead {
  return {
    ...row,
    tags: (() => {
      try { return JSON.parse(row.tags as string || '[]'); }
      catch { return []; }
    })(),
  } as Lead;
}

export async function GET(req: NextRequest) {
  try {
    const sql = getDb();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const priority = searchParams.get('priority') || '';
    const city = searchParams.get('city') || '';
    const state = searchParams.get('state') || '';
    const industry = searchParams.get('industry') || '';
    const sort = searchParams.get('sort') || 'createdDate';
    const dir = searchParams.get('dir') === 'asc' ? 'ASC' : 'DESC';

    const sortMap: Record<string, string> = {
      businessName: 'business_name', contactName: 'contact_name',
      address: 'address', city: 'city', state: 'state',
      leadStatus: 'lead_status', priority: 'priority', industry: 'industry',
      estimatedDealValue: 'estimated_deal_value', createdDate: 'created_date',
      updatedDate: 'updated_date', nextFollowUpDate: 'next_follow_up_date',
      lastContactedDate: 'last_contacted_date',
    };
    const safeSort = sortMap[sort] || 'created_date';

    const rows = await sql`
      SELECT * FROM leads
      WHERE 1=1
      ${search ? sql`AND (business_name ILIKE ${`%${search}%`} OR contact_name ILIKE ${`%${search}%`} OR phone ILIKE ${`%${search}%`} OR city ILIKE ${`%${search}%`} OR industry ILIKE ${`%${search}%`})` : sql``}
      ${status ? sql`AND lead_status = ${status}` : sql``}
      ${priority ? sql`AND priority = ${priority}` : sql``}
      ${city ? sql`AND city ILIKE ${`%${city}%`}` : sql``}
      ${state ? sql`AND state ILIKE ${`%${state}%`}` : sql``}
      ${industry ? sql`AND industry = ${industry}` : sql``}
      ORDER BY ${sql.unsafe(safeSort)} ${sql.unsafe(dir)}
      LIMIT 2000
    `;
    return NextResponse.json((rows as Record<string, unknown>[]).map(parseLead));
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const sql = getDb();
    const body = await req.json();
    const ts = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const tags = Array.isArray(body.tags) ? JSON.stringify(body.tags) : (body.tags || '[]');
    const data = {
      businessName: body.businessName || '',
      contactName: body.contactName || '',
      phone: body.phone || '',
      email: body.email || '',
      website: body.website || '',
      facebookPage: body.facebookPage || '',
      address: body.address || '',
      city: body.city || '',
      state: body.state || 'MO',
      industry: body.industry || '',
      currentWebsiteQuality: body.currentWebsiteQuality || '',
      hasWebsite: body.hasWebsite || '',
      hasFacebookPage: body.hasFacebookPage || '',
      googleBusinessProfile: body.googleBusinessProfile || '',
      serviceOpportunity: body.serviceOpportunity || '',
      suggestedOffer: body.suggestedOffer || '',
      estimatedDealValue: body.estimatedDealValue ?? null,
      leadSource: body.leadSource || '',
      leadStatus: body.leadStatus || 'New',
      priority: body.priority || 'Warm',
      lastContactedDate: body.lastContactedDate || '',
      nextFollowUpDate: body.nextFollowUpDate || '',
      notes: body.notes || '',
      painPoints: body.painPoints || '',
      personalizedPitch: body.personalizedPitch || '',
      demoWebsiteUrl: body.demoWebsiteUrl || '',
      crmDemoUrl: body.crmDemoUrl || '',
      marketingPackageInterest: body.marketingPackageInterest || '',
      websitePackageInterest: body.websitePackageInterest || '',
      crmPackageInterest: body.crmPackageInterest || '',
      tags,
      createdDate: ts,
      updatedDate: ts,
    };
    const [{ id }] = await sql`INSERT INTO leads ${sql(data)} RETURNING id`;
    await sql`INSERT INTO activities (lead_id, type, description) VALUES (${id}, 'note', 'Lead created via API')`;
    const [row] = await sql`SELECT * FROM leads WHERE id = ${id}`;
    return NextResponse.json(parseLead(row as Record<string, unknown>), { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 });
  }
}