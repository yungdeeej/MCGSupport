import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { encrypt, decrypt } from './crypto';
import { db } from '../db';
import { agents } from '../db/schema';
import { eq } from 'drizzle-orm';

authenticator.options = { window: 1 };

export async function provisionTotp(agentId: number, agentEmail: string) {
  const secret = authenticator.generateSecret();
  const otpauth = authenticator.keyuri(agentEmail, 'MCG Support', secret);
  const qrDataUrl = await QRCode.toDataURL(otpauth);
  await db
    .update(agents)
    .set({ totpSecretEncrypted: encrypt(secret), totpEnabled: false })
    .where(eq(agents.id, agentId));
  return { secret, otpauth, qrDataUrl };
}

export async function enableTotp(agentId: number, code: string): Promise<boolean> {
  const [a] = await db
    .select({ enc: agents.totpSecretEncrypted })
    .from(agents)
    .where(eq(agents.id, agentId))
    .limit(1);
  if (!a?.enc) return false;
  const secret = decrypt(a.enc);
  if (!authenticator.verify({ token: code, secret })) return false;
  await db.update(agents).set({ totpEnabled: true }).where(eq(agents.id, agentId));
  return true;
}

export async function verifyTotp(agentId: number, code: string): Promise<boolean> {
  const [a] = await db
    .select({ enc: agents.totpSecretEncrypted, enabled: agents.totpEnabled })
    .from(agents)
    .where(eq(agents.id, agentId))
    .limit(1);
  if (!a?.enabled || !a.enc) return false;
  return authenticator.verify({ token: code, secret: decrypt(a.enc) });
}
