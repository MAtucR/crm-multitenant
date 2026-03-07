'use client';
import { signOut } from 'next-auth/react';
import { useState } from 'react';

const AVATAR_COLORS = ['#4f46e5','#0891b2','#059669','#d97706','#dc2626','#7c3aed'];
function colorForName(s: string) {
  let h = 0; for (const c of s) h = c.charCodeAt(0) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
function initials(name?: string | null) {
  if (!name) return '?';
  return name.split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase();
}

interface Props {
  user?: { name?: string | null; email?: string | null };
  role: string;
  tenantId: string;
  sub: string;
  sessionExpires: string;
}

export default function SettingsClient({ user, role, tenantId, sub, sessionExpires }: Props) {
  const displayName = user?.name ?? user?.email ?? 'Usuario';
  const color = colorForName(displayName);
  const [saved, setSaved] = useState(false);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const ROLE_BADGE: Record<string, string> = {
    ADMIN: 'badge-purple', AGENT: 'badge-blue', VIEWER: 'badge-gray',
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Configuración</h1>
          <p>Gestioná tu perfil y preferencias</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Profile */}
        <div className="card">
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20 }}>Perfil</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, fontWeight: 700, color: '#fff', flexShrink: 0,
            }}>{initials(displayName)}</div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--gray-900)' }}>{displayName}</div>
              <div style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 2 }}>{user?.email}</div>
              <div style={{ marginTop: 8 }}>
                <span className={`badge ${ROLE_BADGE[role] ?? 'badge-gray'}`}>{role}</span>
                {tenantId && tenantId !== '—' && (
                  <span className="badge badge-orange" style={{ marginLeft: 6 }}>{tenantId.toUpperCase()}</span>
                )}
              </div>
            </div>
          </div>

          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={labelStyle}>Nombre</label>
                <input style={inputStyle} defaultValue={user?.name ?? ''} placeholder="Tu nombre" />
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input style={{ ...inputStyle, background: 'var(--gray-100)', cursor: 'not-allowed' }}
                  defaultValue={user?.email ?? ''} readOnly />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button type="submit" className="btn btn-primary">Guardar cambios</button>
              {saved && <span style={{ fontSize: 13, color: 'var(--green-700)', fontWeight: 500 }}>✓ Guardado</span>}
            </div>
          </form>
        </div>

        {/* Tenant */}
        <div className="card">
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20 }}>Información del tenant</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[
              { label: 'Tenant ID',   value: tenantId },
              { label: 'Rol',         value: role },
              { label: 'User ID',     value: sub ? sub.slice(0,16) + '…' : '—' },
              { label: 'Sesión exp.', value: sessionExpires ? new Date(sessionExpires).toLocaleString('es-AR') : '—' },
            ].map(({ label, value }) => (
              <div key={label} style={{ padding: 14, background: 'var(--gray-50)', borderRadius: 8, border: '1px solid var(--gray-200)' }}>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--gray-400)', marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--gray-800)', fontFamily: 'monospace' }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Security */}
        <div className="card">
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Seguridad</h2>
          <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 20 }}>La autenticación está gestionada por Keycloak</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { icon: '🔐', title: 'Cambiar contraseña', desc: 'Gestionado desde el portal de Keycloak' },
              { icon: '📱', title: 'Autenticación de dos factores', desc: 'Configurá 2FA en tu cuenta de Keycloak' },
              { icon: '🔑', title: 'Sesiones activas', desc: 'Revisá los dispositivos conectados' },
            ].map(item => (
              <div key={item.title} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 16px', borderRadius: 8,
                border: '1px solid var(--gray-200)',
                background: 'var(--gray-50)',
              }}>
                <span style={{ fontSize: 20 }}>{item.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-800)' }}>{item.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 1 }}>{item.desc}</div>
                </div>
                <button className="btn btn-ghost" style={{ fontSize: 12, padding: '6px 12px' }}>Gestionar</button>
              </div>
            ))}
          </div>
        </div>

        {/* Danger zone */}
        <div className="card" style={{ border: '1px solid #fecaca' }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--red-700)', marginBottom: 4 }}>Zona de peligro</h2>
          <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 16 }}>Estas acciones son irreversibles</p>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              className="btn"
              style={{ background: 'var(--red-100)', color: 'var(--red-700)', border: '1px solid #fca5a5' }}
              onClick={() => signOut({ callbackUrl: '/api/auth/signin' })}
            >🚪 Cerrar sesión</button>
          </div>
        </div>

      </div>
    </>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600,
  color: 'var(--gray-600)', marginBottom: 6,
  textTransform: 'uppercase', letterSpacing: '0.05em',
};
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px',
  border: '1px solid var(--gray-200)', borderRadius: 8,
  fontSize: 14, color: 'var(--gray-800)',
  outline: 'none',
};
