import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/api/auth/signin');

  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>🏢 CRM Dashboard</h1>
      <p>Bienvenido, <strong>{session.user?.name ?? session.user?.email}</strong></p>
      <nav style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
        <a href="/dashboard/contacts">Contactos</a>
        <a href="/dashboard/deals">Deals</a>
      </nav>
    </main>
  );
}
