'use client';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import Link from 'next/link';

const NAV = [
  { href: '/dashboard',          icon: '🏠', label: 'Dashboard' },
  { href: '/dashboard/contacts', icon: '👥', label: 'Contactos' },
  { href: '/dashboard/deals',    icon: '💼', label: 'Deals' },
];

const AVATAR_COLORS = ['#4f46e5','#0891b2','#059669','#d97706','#dc2626','#7c3aed'];
function colorForName(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
function initials(name?: string | null) {
  if (!name) return '?';
  return name.split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase();
}

interface Props {
  user?: { name?: string | null; email?: string | null };
  role: string;
  tenant: string;
}

export default function SidebarClient({ user, role, tenant }: Props) {
  const path = usePathname();
  const displayName = user?.name ?? user?.email ?? 'Usuario';
  const color = colorForName(displayName);

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">⚡</div>
        <span className="sidebar-logo-text">CRM</span>
        {tenant && <span className="sidebar-logo-badge">{tenant.toUpperCase()}</span>}
      </div>

      {/* Nav */}
      <div className="sidebar-section">Menú</div>
      <nav className="sidebar-nav">
        {NAV.map(({ href, icon, label }) => {
          const active = href === '/dashboard' ? path === '/dashboard' : path.startsWith(href);
          return (
            <Link key={href} href={href} className={`sidebar-link${active ? ' active' : ''}`}>
              <span className="icon">{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="sidebar-footer">
        <div className="user-card">
          <div className="user-avatar" style={{ background: color }}>{initials(displayName)}</div>
          <div className="user-info">
            <div className="user-name">{displayName}</div>
            <div className="user-role">{role}</div>
          </div>
          <button
            className="user-logout"
            title="Cerrar sesión"
            onClick={() => signOut({ callbackUrl: '/api/auth/signin' })}
          >⏏</button>
        </div>
      </div>
    </aside>
  );
}
