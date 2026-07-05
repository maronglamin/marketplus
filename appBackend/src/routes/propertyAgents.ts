import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { notificationService } from '../services/notificationService';

const router = Router();
const prisma = new PrismaClient();

const ID_TYPES = ['PASSPORT', 'DRIVERS_LICENSE'];
const LISTING_TYPES = ['HOTEL', 'APARTMENT_RENTAL', 'HOME_SALE', 'LAND_SALE'];

function parseCoords(latitude: unknown, longitude: unknown): { lat: number; lng: number } | null {
  const lat = parseFloat(String(latitude));
  const lng = parseFloat(String(longitude));
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

function validateSpecializationTypes(types: unknown): string[] | null {
  if (!Array.isArray(types) || types.length === 0) return null;
  const valid = types.filter((t) => typeof t === 'string' && LISTING_TYPES.includes(t));
  return valid.length > 0 ? valid : null;
}

function isAddressProofRecent(dateStr?: string | null): boolean {
  if (!dateStr) return false;
  const proofDate = new Date(dateStr);
  if (Number.isNaN(proofDate.getTime())) return false;
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  return proofDate >= sixMonthsAgo;
}

// POST /apply
router.post('/apply', authenticate, async (req: any, res) => {
  try {
    const {
      firstName, lastName, phoneNumber, email, companyName, licenseNumber,
      address, city, latitude, longitude, specializationTypes, bio,
      idType, idNumber, idDocumentUrl,
      businessRegistrationNumber, businessRegistrationDocUrl,
      taxIdentificationNumber,
      addressProofUrl, addressProofDate,
      bankingInfo,
    } = req.body;

    const coords = parseCoords(latitude, longitude);
    if (!coords) {
      return res.status(400).json({ success: false, message: 'Valid latitude and longitude are required. Please pin your address on the map.' });
    }
    const specs = validateSpecializationTypes(specializationTypes);
    if (!specs) {
      return res.status(400).json({ success: false, message: 'Select at least one property specialization (hotel, apartment, etc.)' });
    }

    if (!idType || !ID_TYPES.includes(idType)) {
      return res.status(400).json({ success: false, message: 'Valid government-issued ID type is required (passport or driver\'s license)' });
    }
    if (!idNumber?.trim() || !idDocumentUrl?.trim()) {
      return res.status(400).json({ success: false, message: 'ID number and ID document upload are required' });
    }
    if (!businessRegistrationNumber?.trim() || !businessRegistrationDocUrl?.trim()) {
      return res.status(400).json({ success: false, message: 'Business registration number and document are required' });
    }
    if (!addressProofUrl?.trim() || !addressProofDate) {
      return res.status(400).json({ success: false, message: 'Proof of address document and date are required' });
    }
    if (!isAddressProofRecent(addressProofDate)) {
      return res.status(400).json({ success: false, message: 'Proof of address must be less than 6 months old' });
    }
    if (!bankingInfo?.bankName?.trim() || !bankingInfo?.accountName?.trim() || !bankingInfo?.accountNumber?.trim()) {
      return res.status(400).json({ success: false, message: 'Complete banking details are required for payouts' });
    }

    const existingAgent = await prisma.propertyAgent.findUnique({
      where: { userId: req.user.id },
    });
    if (existingAgent) {
      return res.status(400).json({ success: false, message: 'You are already an approved property agent' });
    }

    const existing = await prisma.propertyAgentApplication.findFirst({
      where: { userId: req.user.id, status: 'PENDING' },
    });
    if (existing) {
      return res.status(400).json({ success: false, message: 'You already have a pending application' });
    }

    const application = await prisma.propertyAgentApplication.create({
      data: {
        userId: req.user.id,
        firstName,
        lastName,
        phoneNumber,
        email: email || null,
        companyName: companyName || null,
        licenseNumber: licenseNumber || null,
        address,
        city,
        latitude: coords.lat,
        longitude: coords.lng,
        specializationTypes: specs,
        bio: bio || null,
        idType,
        idNumber: idNumber.trim(),
        idDocumentUrl: idDocumentUrl.trim(),
        businessRegistrationNumber: businessRegistrationNumber.trim(),
        businessRegistrationDocUrl: businessRegistrationDocUrl.trim(),
        taxIdentificationNumber: taxIdentificationNumber?.trim() || null,
        addressProofUrl: addressProofUrl.trim(),
        addressProofDate: new Date(addressProofDate),
        bankingInfo,
        status: 'PENDING',
      },
    });

    void notificationService.sendApplicationSubmittedNotification(req.user.id, 'property_agent');

    return res.json({ success: true, data: { application } });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

// GET /application/me
router.get('/application/me', authenticate, async (req: any, res) => {
  try {
    const application = await prisma.propertyAgentApplication.findFirst({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });
    const agent = await prisma.propertyAgent.findUnique({ where: { userId: req.user.id } });
    return res.json({ success: true, data: { application, agent } });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

// POST /applications/:id/approve — disabled; use snap-admin panel for approvals
router.post('/applications/:id/approve', authenticate, async (_req: any, res) => {
  return res.status(403).json({
    success: false,
    message: 'Application approvals are managed through snap-admin. Contact your administrator.',
  });
});

export default router;
