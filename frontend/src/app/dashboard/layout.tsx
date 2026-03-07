import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import SidebarClient from '@/components/SidebarClient';

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
        <span className="topbar-title" id="page-title">Dashboard</span>
        <div className="topbar-search">
          <span>🔍</span>
          <span>Buscar...</span>
        </div>
        <div className="topbar-actions">
          <button className="btn-icon" title="Notificaciones">🔔</button>
          <button className="btn-icon" title="Configuración">⚙️</button>
        </div>
      </header>
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
