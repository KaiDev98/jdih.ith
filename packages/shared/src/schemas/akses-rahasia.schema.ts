import { z } from 'zod';
import { skemaId, skemaWaktu, teksWajib } from './common.schema.js';
/** Admin command: document ID from route, actor from session. No request-access flow. */
export const skemaGrantRahasia = z.strictObject({
  penggunaId: skemaId,
  alasan: teksWajib(1000, 'Alasan grant'),
  expiresAt: skemaWaktu.nullable().optional(),
});
export const skemaRevokeRahasia = z.strictObject({ alasan: teksWajib(1000, 'Alasan pencabutan') });
// Expiry vs current time/account status, locks and regrant history are service responsibilities.
export type MuatanGrantRahasia = z.infer<typeof skemaGrantRahasia>;
export type MuatanRevokeRahasia = z.infer<typeof skemaRevokeRahasia>;
