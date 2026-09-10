import { PrismaClient, User } from '@prisma/client';

const prisma = new PrismaClient();

const ACCOUNT_STATUS_TERMINATED = 'TERMINATED' as const;

export async function findActiveUserByEmail(email: string): Promise<User | null> {
  return prisma.user.findFirst({
    where: {
      email,
      NOT: { status: ACCOUNT_STATUS_TERMINATED as any },
    },
    orderBy: { createdAt: 'asc' },
  });
}

export async function findActiveUserByPhone(phoneNumber: string): Promise<User | null> {
  return prisma.user.findFirst({
    where: {
      phoneNumber,
      NOT: { status: ACCOUNT_STATUS_TERMINATED as any },
    },
    orderBy: { createdAt: 'asc' },
  });
}

function pickCanonical(a: User, b: User): { canonical: User; duplicate: User } {
  if (a.createdAt <= b.createdAt) {
    return { canonical: a, duplicate: b };
  }
  return { canonical: a.createdAt > b.createdAt ? b : a, duplicate: a.createdAt > b.createdAt ? a : b };
}

async function reassignIfCanonicalEmpty(
  tx: any,
  model: string,
  uniqueField: string,
  canonicalId: string,
  duplicateId: string,
) {
  const canonicalHas = await tx[model].findFirst({ where: { [uniqueField]: canonicalId } });
  if (canonicalHas) return;
  await tx[model].updateMany({
    where: { [uniqueField]: duplicateId },
    data: { [uniqueField]: canonicalId },
  });
}

export async function mergeUsers(canonicalId: string, duplicateId: string): Promise<User> {
  if (canonicalId === duplicateId) {
    const same = await prisma.user.findUnique({ where: { id: canonicalId } });
    if (!same) throw new Error('User not found');
    return same;
  }

  return prisma.$transaction(async (tx) => {
    const canonical = await tx.user.findUnique({ where: { id: canonicalId } });
    const duplicate = await tx.user.findUnique({ where: { id: duplicateId } });
    if (!canonical || !duplicate) {
      throw new Error('User not found for merge');
    }

    const email = canonical.email || duplicate.email;
    const phoneNumber = canonical.phoneNumber || duplicate.phoneNumber;
    const pin = canonical.pin || duplicate.pin;
    const preferredAuthMethod = canonical.preferredAuthMethod || duplicate.preferredAuthMethod;
    const firstName = canonical.firstName?.trim() ? canonical.firstName : duplicate.firstName;
    const lastName = canonical.lastName?.trim() ? canonical.lastName : duplicate.lastName;
    const middleName = canonical.middleName || duplicate.middleName;

    if (duplicate.email && duplicate.email !== email) {
      await tx.user.update({
        where: { id: duplicate.id },
        data: { email: null },
      });
    }
    if (duplicate.phoneNumber && duplicate.phoneNumber !== phoneNumber) {
      await tx.user.update({
        where: { id: duplicate.id },
        data: { phoneNumber: null },
      });
    }

    const canonicalDevices = await tx.device.findMany({ where: { userId: canonical.id } });
    const canonicalDeviceIds = new Set(canonicalDevices.map((d: { deviceId: string }) => d.deviceId));
    const conflictingDevices = await tx.device.findMany({
      where: {
        userId: duplicate.id,
        deviceId: { in: Array.from(canonicalDeviceIds) },
      },
      select: { id: true },
    });
    const conflictingIds = conflictingDevices.map((d: { id: string }) => d.id);
    if (conflictingIds.length) {
      await tx.session.deleteMany({ where: { deviceId: { in: conflictingIds } } });
      await tx.device.deleteMany({ where: { id: { in: conflictingIds } } });
    }
    await tx.device.updateMany({
      where: { userId: duplicate.id },
      data: { userId: canonical.id, phoneNumber: phoneNumber ?? undefined },
    });
    await tx.session.updateMany({
      where: { userId: duplicate.id },
      data: { userId: canonical.id },
    });

    await tx.deliveryAddress.updateMany({ where: { userId: duplicate.id }, data: { userId: canonical.id } });
    await tx.paymentMethod.updateMany({ where: { userId: duplicate.id }, data: { userId: canonical.id } });
    await tx.product.updateMany({ where: { sellerId: duplicate.id }, data: { sellerId: canonical.id } });
    await tx.orders.updateMany({ where: { userId: duplicate.id }, data: { userId: canonical.id } });
    await tx.orders.updateMany({ where: { sellerId: duplicate.id }, data: { sellerId: canonical.id } });
    await tx.productOrderInterest.updateMany({ where: { userId: duplicate.id }, data: { userId: canonical.id } });
    await tx.productView.updateMany({ where: { userId: duplicate.id }, data: { userId: canonical.id } });
    await tx.fCMToken.updateMany({ where: { userId: duplicate.id }, data: { userId: canonical.id } });
    await tx.userMonthlyDevice.updateMany({ where: { userId: duplicate.id }, data: { userId: canonical.id } });
    await tx.deviceMonthlyUser.updateMany({ where: { userId: duplicate.id }, data: { userId: canonical.id } });

    await reassignIfCanonicalEmpty(tx, 'sellerKyc', 'userId', canonical.id, duplicate.id);
    await reassignIfCanonicalEmpty(tx, 'driver', 'userId', canonical.id, duplicate.id);
    await reassignIfCanonicalEmpty(tx, 'serviceProvider', 'userId', canonical.id, duplicate.id);
    await reassignIfCanonicalEmpty(tx, 'propertyAgent', 'userId', canonical.id, duplicate.id);
    await reassignIfCanonicalEmpty(tx, 'salesRep', 'userId', canonical.id, duplicate.id);

    await tx.user.update({
      where: { id: duplicate.id },
      data: {
        email: null,
        phoneNumber: null,
        status: ACCOUNT_STATUS_TERMINATED as any,
        mergedIntoUserId: canonical.id,
      },
    });

    return tx.user.update({
      where: { id: canonical.id },
      data: {
        email,
        phoneNumber,
        pin,
        preferredAuthMethod,
        firstName,
        lastName,
        middleName,
        status: canonical.status === ACCOUNT_STATUS_TERMINATED ? 'ACTIVE' : canonical.status,
      },
    });
  });
}

export async function resolveUserForIdentifier(params: {
  email?: string | null;
  phoneNumber?: string | null;
  lastUserId?: string | null;
}): Promise<{ user: User | null; shouldCreate: boolean; mergeFromId?: string }> {
  const { email, phoneNumber, lastUserId } = params;

  const byEmail = email ? await findActiveUserByEmail(email) : null;
  const byPhone = phoneNumber ? await findActiveUserByPhone(phoneNumber) : null;
  const lastUser = lastUserId
    ? await prisma.user.findFirst({
        where: { id: lastUserId, NOT: { status: ACCOUNT_STATUS_TERMINATED as any } },
      })
    : null;

  if (byEmail && byPhone && byEmail.id !== byPhone.id) {
    const preferred = lastUser?.id === byEmail.id ? byEmail : lastUser?.id === byPhone.id ? byPhone : null;
    const { canonical, duplicate } = preferred
      ? { canonical: preferred, duplicate: preferred.id === byEmail.id ? byPhone : byEmail }
      : pickCanonical(byEmail, byPhone);
    return { user: canonical, shouldCreate: false, mergeFromId: duplicate.id };
  }

  const existing = byEmail || byPhone;
  if (existing && lastUser && existing.id !== lastUser.id) {
    return { user: lastUser, shouldCreate: false, mergeFromId: existing.id };
  }

  if (existing) {
    return { user: existing, shouldCreate: false };
  }

  if (lastUser) {
    return { user: lastUser, shouldCreate: false };
  }

  return { user: null, shouldCreate: true };
}

export { pickCanonical };
