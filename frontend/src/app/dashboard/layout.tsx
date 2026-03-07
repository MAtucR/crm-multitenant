import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import SidebarClient from '@/components/SidebarClient';
import Link from 'next/link';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/api/auth/signin');

  const user = session.user;
  const role = (session as any).role ?? 'USER';
  const tenant = (session as any).tenantId ?? '';

  return (
    <div className="app-shell">
      <SidebarClient user={user} role={role} tenant={tenant} />
      <header className="topbar">
        <span className="topbar-title">CRM Multitenant</span>
        <div className="topbar-search">
          <span>🔍</span>
          <span style={{ color: 'var(--gray-400)' }}>Buscar contactos, deals...</span>
        </div>
        <div className="topbar-actions">
          <Link href="/dashboard/reports" title="Reportes">
            <button className="btn-icon">📊</button>
          </Link>
          <Link href="/dashboard/settings" title="Configuración">
            <button className="btn-icon">⚙️</button>
          </Link>
        </div>
      </header>
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
