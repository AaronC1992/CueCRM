const fs = require('fs');
const path = require('path');
const postgres = require('postgres');

function readDatabaseUrl() {
	const envPath = path.join(__dirname, '..', '.env.local');
	if (!fs.existsSync(envPath)) {
		throw new Error('.env.local not found');
	}
	const env = fs.readFileSync(envPath, 'utf8');
	const match = env.match(/^DATABASE_URL=(.+)$/m);
	if (!match || !match[1]) {
		throw new Error('DATABASE_URL missing in .env.local');
	}
	return match[1].trim();
}

function getSql() {
	return postgres(readDatabaseUrl(), {
		ssl: 'require',
		prepare: false,
		max: 1,
		idle_timeout: 20,
		connect_timeout: 10,
	});
}

async function initSession(sql) {
	await sql.unsafe("set statement_timeout = '120s'");
}

async function audit() {
	const sql = getSql();
	try {
		await initSession(sql);
		const [total] = await sql.unsafe('select count(*)::int as count from leads');
		const bySource = await sql.unsafe(
			"select coalesce(lead_source,'') as source, count(*)::int as count from leads group by 1 order by 2 desc"
		);
		const recent = await sql.unsafe(
			'select id, business_name, lead_source, city, state, created_date from leads order by id desc limit 40'
		);
		console.log('Live leads total:', total.count);
		console.log('\nLive leads by source:');
		console.table(bySource);
		console.log('\nRecent 40 leads:');
		console.table(recent);
	} finally {
		await sql.end();
	}
}

async function backup(outFile) {
	if (!outFile) {
		throw new Error('backup requires output file path');
	}
	const sql = getSql();
	try {
		await initSession(sql);
		const payload = {
			exportedAt: new Date().toISOString(),
			leads: await sql.unsafe('select * from leads order by id'),
			activities: await sql.unsafe('select * from activities order by id'),
			tasks: await sql.unsafe('select * from tasks order by id'),
			deals: await sql.unsafe('select * from deals order by id'),
			demos: await sql.unsafe('select * from demos order by id'),
		};
		const absoluteOut = path.isAbsolute(outFile) ? outFile : path.join(process.cwd(), outFile);
		fs.writeFileSync(absoluteOut, JSON.stringify(payload, null, 2), 'utf8');
		console.log('Backup written:', absoluteOut);
		console.log('Leads:', payload.leads.length);
		console.log('Activities:', payload.activities.length);
		console.log('Tasks:', payload.tasks.length);
		console.log('Deals:', payload.deals.length);
		console.log('Demos:', payload.demos.length);
	} finally {
		await sql.end();
	}
}

async function wipeLeadGraph() {
	const sql = getSql();
	try {
		await initSession(sql);
		await sql.unsafe('begin');
		await sql.unsafe('delete from activities');
		await sql.unsafe('delete from tasks');
		await sql.unsafe('delete from deals');
		await sql.unsafe('delete from demos');
		await sql.unsafe('delete from route_stops where lead_id is not null');
		await sql.unsafe('delete from leads');
		await sql.unsafe('commit');
	} catch (err) {
		await sql.unsafe('rollback');
		throw err;
	} finally {
		await sql.end();
	}
}

function mapLocalLead(row) {
	const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
	return {
		business_name: row.businessName || '',
		contact_name: row.contactName || '',
		phone: row.phone || '',
		email: row.email || '',
		website: row.website || '',
		facebook_page: row.facebookPage || '',
		address: row.address || '',
		city: row.city || '',
		state: row.state || 'MO',
		industry: row.industry || '',
		current_website_quality: row.currentWebsiteQuality || '',
		has_website: row.hasWebsite || '',
		has_facebook_page: row.hasFacebookPage || '',
		google_business_profile: row.googleBusinessProfile || '',
		service_opportunity: row.serviceOpportunity || '',
		suggested_offer: row.suggestedOffer || '',
		estimated_deal_value: row.estimatedDealValue ?? null,
		lead_source: row.leadSource || '',
		lead_status: row.leadStatus || 'New',
		priority: row.priority || 'Warm',
		last_contacted_date: row.lastContactedDate || '',
		next_follow_up_date: row.nextFollowUpDate || '',
		notes: row.notes || '',
		pain_points: row.painPoints || '',
		personalized_pitch: row.personalizedPitch || '',
		demo_website_url: row.demoWebsiteUrl || '',
		crm_demo_url: row.crmDemoUrl || '',
		marketing_package_interest: row.marketingPackageInterest || '',
		website_package_interest: row.websitePackageInterest || '',
		crm_package_interest: row.crmPackageInterest || '',
		tags: row.tags || '[]',
		latitude: row.latitude ?? null,
		longitude: row.longitude ?? null,
		place_id: row.placeId || '',
		route_eligible: row.routeEligible ?? 1,
		last_visited_date: row.lastVisitedDate || '',
		next_visit_date: row.nextVisitDate || '',
		in_person_visit_status: row.inPersonVisitStatus || 'Not visited',
		visit_notes: row.visitNotes || '',
		do_not_visit: row.doNotVisit ?? 0,
		preferred_visit_time: row.preferredVisitTime || '',
		business_hours: row.businessHours || '',
		route_score: row.routeScore ?? null,
		route_notes: row.routeNotes || '',
		created_date: row.createdDate || now,
		updated_date: row.updatedDate || now,
	};
}

async function restoreFromLocalSqlite(sqlitePath) {
	if (!sqlitePath) {
		throw new Error('restore-local requires sqlite file path');
	}
	let Database;
	try {
		Database = require('better-sqlite3');
	} catch {
		throw new Error('better-sqlite3 is required. Install with: npm install better-sqlite3 --no-save --no-package-lock');
	}

	const absolute = path.isAbsolute(sqlitePath) ? sqlitePath : path.join(process.cwd(), sqlitePath);
	if (!fs.existsSync(absolute)) {
		throw new Error(`sqlite file not found: ${absolute}`);
	}

	const localDb = new Database(absolute, { readonly: true });
	const localLeads = localDb.prepare('select * from leads order by id').all();
	const localActivities = localDb.prepare('select * from activities order by id').all();
	const localTasks = localDb.prepare('select * from tasks order by id').all();
	const localDeals = localDb.prepare('select * from deals order by id').all();
	const localDemos = localDb.prepare('select * from demos order by id').all();
	localDb.close();

	await wipeLeadGraph();

	const sql = getSql();
	try {
		await initSession(sql);
		await sql.unsafe('begin');

		const leadIdMap = new Map();
		for (const lead of localLeads) {
			const mapped = mapLocalLead(lead);
			const inserted = await sql`insert into leads ${sql(mapped)} returning id`;
			leadIdMap.set(lead.id, inserted[0].id);
		}

		for (const activity of localActivities) {
			const leadId = leadIdMap.get(activity.leadId) || null;
			await sql`insert into activities (lead_id, type, description, created_date) values (${leadId}, ${activity.type || 'note'}, ${activity.description || ''}, ${activity.createdDate || null})`;
		}

		for (const task of localTasks) {
			const leadId = leadIdMap.get(task.leadId) || null;
			await sql`insert into tasks (title, lead_id, due_date, task_type, priority, status, notes, created_date, updated_date) values (${task.title || ''}, ${leadId}, ${task.dueDate || ''}, ${task.taskType || 'Follow up'}, ${task.priority || 'Normal'}, ${task.status || 'pending'}, ${task.notes || ''}, ${task.createdDate || null}, ${task.updatedDate || null})`;
		}

		for (const deal of localDeals) {
			const leadId = leadIdMap.get(deal.leadId) || null;
			await sql`insert into deals (business_name, lead_id, service_sold, package_type, monthly_value, one_time_setup_value, estimated_close_date, deal_stage, proposal_url, contract_status, payment_status, notes, created_date, updated_date) values (${deal.businessName || ''}, ${leadId}, ${deal.serviceSold || ''}, ${deal.packageType || ''}, ${deal.monthlyValue ?? null}, ${deal.oneTimeSetupValue ?? null}, ${deal.estimatedCloseDate || ''}, ${deal.dealStage || 'Opportunity'}, ${deal.proposalUrl || ''}, ${deal.contractStatus || 'None'}, ${deal.paymentStatus || 'Unpaid'}, ${deal.notes || ''}, ${deal.createdDate || null}, ${deal.updatedDate || null})`;
		}

		for (const demo of localDemos) {
			const leadId = leadIdMap.get(demo.leadId) || null;
			await sql`insert into demos (business_name, lead_id, demo_url, original_website_url, demo_status, layout_option_used, date_started, date_completed, date_sent, client_feedback, needed_changes, follow_up_date, notes, created_date, updated_date) values (${demo.businessName || ''}, ${leadId}, ${demo.demoUrl || ''}, ${demo.originalWebsiteUrl || ''}, ${demo.demoStatus || 'Idea'}, ${demo.layoutOptionUsed || ''}, ${demo.dateStarted || ''}, ${demo.dateCompleted || ''}, ${demo.dateSent || ''}, ${demo.clientFeedback || ''}, ${demo.neededChanges || ''}, ${demo.followUpDate || ''}, ${demo.notes || ''}, ${demo.createdDate || null}, ${demo.updatedDate || null})`;
		}

		await sql.unsafe("select setval(pg_get_serial_sequence('leads','id'), coalesce((select max(id) from leads),0)+1, false)");
		await sql.unsafe("select setval(pg_get_serial_sequence('activities','id'), coalesce((select max(id) from activities),0)+1, false)");
		await sql.unsafe("select setval(pg_get_serial_sequence('tasks','id'), coalesce((select max(id) from tasks),0)+1, false)");
		await sql.unsafe("select setval(pg_get_serial_sequence('deals','id'), coalesce((select max(id) from deals),0)+1, false)");
		await sql.unsafe("select setval(pg_get_serial_sequence('demos','id'), coalesce((select max(id) from demos),0)+1, false)");

		await sql.unsafe('commit');
		console.log('Restore complete.');
		console.log('Leads:', localLeads.length);
		console.log('Activities:', localActivities.length);
		console.log('Tasks:', localTasks.length);
		console.log('Deals:', localDeals.length);
		console.log('Demos:', localDemos.length);
	} catch (err) {
		await sql.unsafe('rollback');
		throw err;
	} finally {
		await sql.end();
	}
}

async function main() {
	const [, , cmd, arg] = process.argv;
	if (!cmd) {
		console.log('Usage:');
		console.log('  node scripts/lead-recovery.cjs audit');
		console.log('  node scripts/lead-recovery.cjs backup backups/leads-YYYYMMDD.json');
		console.log('  node scripts/lead-recovery.cjs restore-local data/crm.db');
		process.exit(1);
	}

	if (cmd === 'audit') {
		await audit();
		return;
	}
	if (cmd === 'backup') {
		await backup(arg);
		return;
	}
	if (cmd === 'restore-local') {
		await restoreFromLocalSqlite(arg);
		return;
	}

	throw new Error(`Unknown command: ${cmd}`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
