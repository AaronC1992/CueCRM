import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const sql = getDb();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const leadIdParam = searchParams.get('leadId');
    const leadId = leadIdParam ? Number(leadIdParam) : null;
    const hasLeadFilter = Number.isFinite(leadId);
    let tasks;
    if (status && hasLeadFilter) {
      tasks = await sql`SELECT t.*, l.business_name as lead_name FROM tasks t LEFT JOIN leads l ON t.lead_id = l.id WHERE t.status = ${status} AND t.lead_id = ${leadId} ORDER BY t.due_date ASC, t.priority DESC`;
    } else if (status) {
      tasks = await sql`SELECT t.*, l.business_name as lead_name FROM tasks t LEFT JOIN leads l ON t.lead_id = l.id WHERE t.status = ${status} ORDER BY t.due_date ASC, t.priority DESC`;
    } else if (hasLeadFilter) {
      tasks = await sql`SELECT t.*, l.business_name as lead_name FROM tasks t LEFT JOIN leads l ON t.lead_id = l.id WHERE t.lead_id = ${leadId} ORDER BY t.due_date ASC, t.priority DESC`;
    } else {
      tasks = await sql`SELECT t.*, l.business_name as lead_name FROM tasks t LEFT JOIN leads l ON t.lead_id = l.id ORDER BY t.due_date ASC, t.priority DESC`;
    }
    return NextResponse.json(tasks);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const sql = getDb();
    const body = await req.json();
    const ts = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const data = {
      title: body.title || '',
      leadId: body.leadId ?? null,
      dueDate: body.dueDate || '',
      taskType: body.taskType || 'Follow up',
      priority: body.priority || 'Normal',
      status: body.status || 'pending',
      notes: body.notes || '',
      createdDate: ts,
      updatedDate: ts,
    };
    const [{ id }] = await sql`INSERT INTO tasks ${sql(data)} RETURNING id`;
    const [task] = await sql`SELECT t.*, l.business_name as lead_name FROM tasks t LEFT JOIN leads l ON t.lead_id = l.id WHERE t.id = ${id}`;
    return NextResponse.json(task, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}