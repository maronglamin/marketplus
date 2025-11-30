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
        // Update status on any matching external transactions
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

        // If payment succeeded/complete, ensure a 1% FEE transaction exists
        if (mapped === 'SUCCESS') {
          // Fetch the original (latest) external transaction to derive amounts and linkage
          const original = await prisma.externalTransaction.findFirst({
            where: {
              gatewayProvider: 'wave_gambia',
              OR: [
                { gatewayTransactionId: transactionId || '' },
                { gatewayResponse: { path: ['waveSessionId'], equals: waveSessionId || '' } as any },
              ],
              transactionType: 'ORIGINAL',
            },
            orderBy: { createdAt: 'desc' },
          });
          if (original) {
            // Check if a fee transaction is already present for this appTransactionId
            const existingFee = await prisma.externalTransaction.findFirst({
              where: {
                gatewayProvider: 'wave_gambia',
                transactionType: 'FEE',
                appTransactionId: original.appTransactionId,
              },
            });
            if (!existingFee) {
              const percent = 0.01;
              const baseAmount = Number(original.amount || 0);
              const currencyCode = (original.currencyCode || 'GMD').toUpperCase();
              const zeroDecimalCurrencies = ['jpy', 'bif', 'clp', 'djf', 'gnf', 'kmf', 'krw', 'mga', 'pyg', 'rwf', 'ugx', 'vnd', 'vuv', 'xaf', 'xof', 'xpf'];
              const isZero = zeroDecimalCurrencies.includes(currencyCode.toLowerCase());
              const calc = baseAmount * percent;
              const waveFee = isZero ? Math.round(calc) : Math.round(calc * 100) / 100;
              await prisma.externalTransaction.create({
                data: {
                  orderId: original.orderId || null,
                  rentalRequestId: (original as any).rentalRequestId || null,
                  rideRequestId: (original as any).rideRequestId || null,
                  customerId: original.customerId || null,
                  sellerId: original.sellerId || null,
                  gatewayProvider: 'wave_gambia',
                  gatewayTransactionId: `${original.gatewayTransactionId || transactionId}-fee`,
                  paymentReference: original.paymentReference || (transactionId || ''),
                  appTransactionId: original.appTransactionId,
                  appService: original.appService,
                  transactionType: 'FEE',
                  amount: waveFee,
                  currencyCode,
                  gatewayChargeFees: waveFee,
                  processedAmount: 0,
                  paidThroughGateway: true,
                  gatewayResponse: {
                    originalReference: original.gatewayTransactionId || transactionId,
                    percentage: percent,
                    calculated: waveFee,
                    webhookDerived: true,
                  } as any,
                  status: 'SUCCESS',
                  processedAt: new Date(),
                },
              });
            }
          }
        }
      }

      res.status(200).json({ success: true });
    } catch (error: any) {
      console.error('Wave webhook handler error:', error?.message || error);
      res.status(500).json({ success: false });
    }
  }
}

export default WaveWebhookController;


