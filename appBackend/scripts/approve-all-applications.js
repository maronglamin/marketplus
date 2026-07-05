/**
 * Approve service-provider and property-agent applications the same way
 * the API does — not just status on the application row.
 *
 * Prisma Studio often sets application.status = APPROVED without creating
 * ServiceProvider / PropertyAgent rows; the app checks those records.
 *
 * Usage (from appBackend/):
 *   node scripts/approve-all-applications.js              # pending + fix approved-without-record
 *   node scripts/approve-all-applications.js --dry-run  # preview only
 *   node scripts/approve-all-applications.js --pending-only
 *   node scripts/approve-all-applications.js --fix-only   # only APPROVED apps missing provider/agent
 *
 * Options:
 *   --dry-run       Log actions without writing
 *   --pending-only  Only process status PENDING (skip fix-approved pass)
 *   --fix-only      Only create missing provider/agent for already APPROVED applications
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const pendingOnly = args.has('--pending-only');
const fixOnly = args.has('--fix-only');

function parseCategoryIds(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean);
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
      return [];
    }
  }
  return [];
}

async function approveServiceProviderApplication(application, { reason }) {
  const existing = await prisma.serviceProvider.findUnique({
    where: { userId: application.userId },
  });
  if (existing) {
    console.log(`  ↷ Service provider already exists for user ${application.userId} (${existing.id})`);
    if (application.status !== 'APPROVED' && !dryRun) {
      await prisma.serviceProviderApplication.update({
        where: { id: application.id },
        data: { status: 'APPROVED', reviewedAt: application.reviewedAt ?? new Date() },
      });
    }
    return { skipped: true, providerId: existing.id };
  }

  const displayName = `${application.firstName} ${application.lastName}`.trim();
  console.log(`  ✓ Service provider: ${displayName} (${application.id}) — ${reason}`);

  if (dryRun) return { dryRun: true };

  const provider = await prisma.$transaction(async (tx) => {
    await tx.serviceProviderApplication.update({
      where: { id: application.id },
      data: { status: 'APPROVED', reviewedAt: new Date() },
    });

    const created = await tx.serviceProvider.create({
      data: {
        userId: application.userId,
        applicationId: application.id,
        displayName,
        bio: application.bio,
        address: application.address,
        city: application.city,
        latitude: application.latitude,
        longitude: application.longitude,
      },
    });

    const categoryIds = parseCategoryIds(application.categoryIds);
    for (const categoryId of categoryIds) {
      await tx.serviceProviderCategory
        .create({ data: { providerId: created.id, categoryId } })
        .catch(() => {});
    }

    return created;
  });

  return { created: true, providerId: provider.id };
}

async function approvePropertyAgentApplication(application, { reason }) {
  const existing = await prisma.propertyAgent.findUnique({
    where: { userId: application.userId },
  });
  if (existing) {
    console.log(`  ↷ Property agent already exists for user ${application.userId} (${existing.id})`);
    if (application.status !== 'APPROVED' && !dryRun) {
      await prisma.propertyAgentApplication.update({
        where: { id: application.id },
        data: { status: 'APPROVED', reviewedAt: application.reviewedAt ?? new Date() },
      });
    }
    return { skipped: true, agentId: existing.id };
  }

  const displayName = `${application.firstName} ${application.lastName}`.trim();
  console.log(`  ✓ Property agent: ${displayName} (${application.id}) — ${reason}`);

  if (dryRun) return { dryRun: true };

  const agent = await prisma.$transaction(async (tx) => {
    await tx.propertyAgentApplication.update({
      where: { id: application.id },
      data: { status: 'APPROVED', reviewedAt: new Date() },
    });

    return tx.propertyAgent.create({
      data: {
        userId: application.userId,
        applicationId: application.id,
        displayName,
        companyName: application.companyName,
        bio: application.bio,
        specializationTypes: application.specializationTypes,
        latitude: application.latitude,
        longitude: application.longitude,
      },
    });
  });

  return { created: true, agentId: agent.id };
}

async function processServiceProviders() {
  console.log('\n── Service provider applications ──');

  const include = { provider: true };
  let created = 0;
  let skipped = 0;

  if (!fixOnly) {
    const pending = await prisma.serviceProviderApplication.findMany({
      where: { status: 'PENDING' },
      include,
      orderBy: { createdAt: 'asc' },
    });
    console.log(`Pending: ${pending.length}`);
    for (const app of pending) {
      const result = await approveServiceProviderApplication(app, { reason: 'pending → approved' });
      if (result.created) created++;
      if (result.skipped) skipped++;
    }
  }

  if (!pendingOnly) {
    const approvedMissingProvider = await prisma.serviceProviderApplication.findMany({
      where: {
        status: 'APPROVED',
        provider: null,
      },
      include,
      orderBy: { createdAt: 'asc' },
    });
    console.log(`Approved but missing ServiceProvider row: ${approvedMissingProvider.length}`);
    for (const app of approvedMissingProvider) {
      const result = await approveServiceProviderApplication(app, { reason: 'fix approved without provider' });
      if (result.created) created++;
      if (result.skipped) skipped++;
    }
  }

  return { created, skipped };
}

async function processPropertyAgents() {
  console.log('\n── Property agent applications ──');

  const include = { agent: true };
  let created = 0;
  let skipped = 0;

  if (!fixOnly) {
    const pending = await prisma.propertyAgentApplication.findMany({
      where: { status: 'PENDING' },
      include,
      orderBy: { createdAt: 'asc' },
    });
    console.log(`Pending: ${pending.length}`);
    for (const app of pending) {
      const result = await approvePropertyAgentApplication(app, { reason: 'pending → approved' });
      if (result.created) created++;
      if (result.skipped) skipped++;
    }
  }

  if (!pendingOnly) {
    const approvedMissingAgent = await prisma.propertyAgentApplication.findMany({
      where: {
        status: 'APPROVED',
        agent: null,
      },
      include,
      orderBy: { createdAt: 'asc' },
    });
    console.log(`Approved but missing PropertyAgent row: ${approvedMissingAgent.length}`);
    for (const app of approvedMissingAgent) {
      const result = await approvePropertyAgentApplication(app, { reason: 'fix approved without agent' });
      if (result.created) created++;
      if (result.skipped) skipped++;
    }
  }

  return { created, skipped };
}

async function main() {
  console.log('Approve all applications (service providers + property agents)');
  if (dryRun) console.log('DRY RUN — no database writes\n');
  if (pendingOnly) console.log('Mode: pending applications only\n');
  if (fixOnly) console.log('Mode: fix APPROVED apps missing provider/agent only\n');

  const svc = await processServiceProviders();
  const prop = await processPropertyAgents();

  console.log('\n── Summary ──');
  console.log(`Service providers created/fixed: ${svc.created} (skipped existing: ${svc.skipped})`);
  console.log(`Property agents created/fixed: ${prop.created} (skipped existing: ${prop.skipped})`);
  if (dryRun) console.log('\nRe-run without --dry-run to apply changes.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
