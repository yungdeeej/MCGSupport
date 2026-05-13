import { db } from '@/lib/db';
import { agents } from '@/lib/db/schema';
import { requireAdmin } from '@/lib/auth/requireOwnership';
import { getSession } from '@/lib/auth/session';
import { Badge } from '@/components/ui/badge';
import { formatRelative } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  requireAdmin(await getSession());
  const rows = await db.select().from(agents);
  return (
    <div className="container-page py-8">
      <h1 className="text-2xl font-semibold tracking-tightish">Agents</h1>
      <ul className="mt-6 divide-y divide-border rounded-xl border border-border">
        {rows.map((a) => (
          <li key={a.id} className="flex items-center justify-between p-4 text-sm">
            <div>
              <p className="font-medium">{a.name}</p>
              <p className="text-xs text-muted-foreground">{a.email} · joined {formatRelative(a.createdAt)}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={a.role === 'admin' ? 'default' : 'secondary'}>{a.role}</Badge>
              <Badge variant={a.active ? 'success' : 'muted'}>{a.active ? 'active' : 'inactive'}</Badge>
              <Badge variant={a.totpEnabled ? 'success' : 'warning'}>{a.totpEnabled ? 'TOTP on' : 'TOTP off'}</Badge>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
