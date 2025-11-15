import { Request, Response } from 'express';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function validateWaveSignature(waveSignature: string, rawBody: string, webhookSecret: string): boolean {
  try {
    const parts = waveSignature.split(',');
    const timestampPart = parts.find((comp) => comp.startsWith('t='));
    const timestamp = timestampPart?.split('=')[1];
    const signatureParts = parts.filter((comp) => comp.startsWith('v1='));
    const signatures = signatureParts.map((s) => s.split('=')[1]);
    const payload = `${timestamp}${rawBody}`;
    const calculatedSignature = crypto.createHmac('sha256', webhookSecret).update(payload).digest('hex');
    return signatures.includes(calculatedSignature);
  } catch {
    return false;
  }
}

export class WaveWebhookController {
  async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      const webhookSecret = process.env.WAVE_WEBHOOK_SECRET;
      if (!webhookSecret) {
        res.status(500).json({ success: false, message: 'Webhook secret not configured' });
        return;
      }

      // Header can be 'Wave-Signature' or 'wave-signature'
      const signatureHeader =
        (req.headers['wave-signature'] as string) ||
        (req.headers['Wave-Signature'] as unknown as string) ||
        '';

      const raw = (req as any).rawBody ? String((req as any).rawBody) : (req as any).body?.toString?.() || '';

      if (!signatureHeader || !raw) {
        res.status(400).json({ success: false, message: 'Missing signature or body' });
        return;
      }

      const valid = validateWaveSignature(signatureHeader, raw, webhookSecret);
      if (!valid) {
        res.status(400).json({ success: false, message: 'Invalid signature' });
        return;
      }

      const payload = JSON.parse(raw);
      // Attempt to update external transaction status by session or transaction id
      const waveSessionId = payload?.id;
      const transactionId = payload?.transaction_id;
      const paymentStatus = payload?.payment_status; // processing | cancelled | succeeded
      const checkoutStatus = payload?.checkout_status; // open | complete | expired

      const statusMap: Record<string, string> = {
        succeeded: 'SUCCESS',
        processing: 'PENDING',
        cancelled: 'CANCELLED',
        complete: 'SUCCESS',
        expired: 'FAILED',
        open: 'PENDING',
      };
      const mapped =
        statusMap[paymentStatus as string] ||
        statusMap[checkoutStatus as string] ||
        'PENDING';

      if (waveSessionId || transactionId) {
        await prisma.externalTransaction.updateMany({
          where: {
            gatewayProvider: 'wave_gambia',
            OR: [
              { gatewayTransactionId: transactionId || '' },
              { gatewayResponse: { path: ['waveSessionId'], equals: waveSessionId || '' } as any },
            ],
          },
          data: {
            status: mapped,
            gatewayResponse: {
              ...(payload || {}),
            } as any,
          },
        });
      }

      res.status(200).json({ success: true });
    } catch (error: any) {
      console.error('Wave webhook handler error:', error?.message || error);
      res.status(500).json({ success: false });
    }
  }
}

export default WaveWebhookController;


