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
      // Attempt to update external transaction status by session or transaction id (robust extraction)
      const firstString = (...vals: Array<any>) =>
        vals.find(v => typeof v === 'string' && v.length > 0) as string | undefined;
      const waveSessionId =
        firstString(
          payload?.id,
          payload?.session_id,
          payload?.session?.id,
          payload?.checkout_session_id,
          payload?.checkout_session?.id,
          payload?.data?.id,
          payload?.data?.session?.id,
          payload?.data?.object?.id,
        ) || undefined;
      const transactionId =
        firstString(
          payload?.transaction_id,
          payload?.transaction?.id,
          payload?.data?.transaction_id,
          payload?.data?.object?.transaction_id,
        ) || undefined;
      const clientReference =
        firstString(
          payload?.client_reference,
          payload?.clientReference,
          payload?.data?.client_reference,
          payload?.data?.object?.client_reference,
        ) || undefined;
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

      // Log identifiers we received to help with integration issues
      try {
        console.log('Wave webhook ids:', {
          waveSessionId,
          transactionId,
          clientReference,
          paymentStatus,
          checkoutStatus,
        });
      } catch {}

      if (waveSessionId || transactionId || clientReference) {
        // Update status on any matching external transactions
        await prisma.externalTransaction.updateMany({
          where: {
            gatewayProvider: 'wave_gambia',
            OR: [
              ...(transactionId ? [{ gatewayTransactionId: transactionId }] : []),
              ...(waveSessionId ? [{ gatewayResponse: { path: ['waveSessionId'], equals: waveSessionId } as any }] : []),
              ...(clientReference ? [{ gatewayResponse: { path: ['clientReference'], equals: clientReference } as any }] : []),
            ] as any,
          },
          data: {
            status: mapped as any,
            gatewayResponse: {
              ...(payload || {}),
            } as any,
          },
        });

        // If payment succeeded/complete, ensure a 1% FEE transaction exists
        if (mapped === 'SUCCESS') {
          // Fetch the original (latest) external transaction to derive amounts and linkage
          const original =
            (await prisma.externalTransaction.findFirst({
              where: {
                gatewayProvider: 'wave_gambia',
                OR: [
                  ...(transactionId ? [{ gatewayTransactionId: transactionId }] : []),
                  ...(waveSessionId ? [{ gatewayResponse: { path: ['waveSessionId'], equals: waveSessionId } as any }] : []),
                ] as any,
                transactionType: 'ORIGINAL',
              },
              orderBy: { createdAt: 'desc' },
            })) ||
            (clientReference
              ? await prisma.externalTransaction.findFirst({
                  where: {
                    gatewayProvider: 'wave_gambia',
                    transactionType: 'ORIGINAL',
                    OR: [
                      { gatewayResponse: { path: ['clientReference'], equals: clientReference } as any },
                      { appTransactionId: clientReference },
                    ] as any,
                  },
                  orderBy: { createdAt: 'desc' },
                })
              : null);
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
                  customerId: (original.customerId ?? undefined) as any,
                  sellerId: (original.sellerId ?? undefined) as any,
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

            // If linked to an ecommerce order, finalize it similar to other providers
            if (original.orderId) {
              try {
                const order = await prisma.orders.findUnique({
                  where: { id: original.orderId },
                  select: { id: true, paymentStatus: true, status: true },
                });
                const alreadyPaid = (order?.paymentStatus || '').toUpperCase() === 'PAID';
                if (order && !alreadyPaid) {
                  await prisma.orders.update({
                    where: { id: order.id },
                    data: {
                      paymentStatus: 'PAID',
                      status: 'CONFIRMED',
                      paymentReference: original.gatewayTransactionId || transactionId || '',
                      paidAt: new Date(),
                      updatedAt: new Date(),
                    },
                  });
                }
              } catch (e) {
                // Do not fail the webhook for order update issues; they can be reconciled later
                console.warn('Wave webhook: order finalize warning:', (e as any)?.message || e);
              }
            }

            // If linked to a rental request, mark rental as PAID
            if ((original as any).rentalRequestId) {
              try {
                await prisma.rentalRequest.update({
                  where: { id: (original as any).rentalRequestId },
                  data: { status: 'PAID' as any, updatedAt: new Date() },
                });
              } catch (e) {
                console.warn('Wave webhook: rental finalize warning:', (e as any)?.message || e);
              }
            }

            // If linked to a ride request, set Ride.paymentStatus = PAID
            if ((original as any).rideRequestId) {
              try {
                const ride = await prisma.ride.findUnique({
                  where: { rideRequestId: (original as any).rideRequestId },
                  select: { id: true },
                });
                if (ride) {
                  await prisma.ride.update({
                    where: { id: ride.id },
                    data: { paymentStatus: 'PAID' as any, updatedAt: new Date() },
                  });
                }
              } catch (e) {
                console.warn('Wave webhook: ride finalize warning:', (e as any)?.message || e);
              }
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


