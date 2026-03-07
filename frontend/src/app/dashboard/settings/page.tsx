import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import SettingsClient from '@/components/SettingsClient';

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/api/auth/signin');

  const user     = session.user;
  const role     = (session as any).role     ?? 'USER';
  const tenantId = (session as any).tenantId ?? '—';
  const sub      = (session as any).sub      ?? '';
  const exp      = (session as any).expires  ?? '';

  return (
    <SettingsClient
      user={user}
      role={role}
      tenantId={tenantId}
      sub={sub}
      sessionExpires={exp}
    />
  );
}
