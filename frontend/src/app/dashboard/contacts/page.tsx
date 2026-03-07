import { headers } from 'next/headers';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';

async function fetchContacts(token: string, traceparent?: string) {
  const base = process.env.API_URL ?? 'http://localhost:8081';
  const res = await fetch(`${base}/api/contacts`, {
    headers: { Authorization: `Bearer ${token}`, ...(traceparent ? { traceparent } : {}) },
    cache: 'no-store',
  });
  if (!res.ok) return [];
  return res.json();
}

const COLORS = ['#4f46e5','#0891b2','#059669','#d97706','#dc2626','#7c3aed','#0f766e','#b45309'];
function color(s: string) { let h=0; for(const c of s) h=c.charCodeAt(0)+((h<<5)-h); return COLORS[Math.abs(h)%COLORS.length]; }
function initials(name: string) { return name.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase(); }

export default async function ContactsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/api/auth/signin');
  const token = (session as any).accessToken as string;
  const tp = headers().get('traceparent') ?? undefined;
  const contacts: any[] = await fetchContacts(token, tp);

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Contactos</h1>
          <p>{contacts.length} contacto{contacts.length !== 1 ? 's' : ''} en total</p>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button className="btn btn-ghost">↓ Exportar</button>
          <button className="btn btn-primary">+ Nuevo contacto</button>
        </div>
      </div>

      <div className="card">
        {contacts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            <div className="empty-state-title">Sin contactos aún</div>
            <div className="empty-state-text">Creá tu primer contacto para comenzar</div>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Contacto</th>
                  <th>Email</th>
                  <th>Empresa</th>
                  <th>Teléfono</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((c: any) => {
                  const name = c.name ?? c.email ?? 'Sin nombre';
                  const bg = color(name);
                  const ini = initials(name);
                  return (
                    <tr key={c.id}>
                      <td>
                        <div className="avatar-row">
                          <div className="avatar" style={{background:bg}}>{ini}</div>
                          <div>
                            <div className="avatar-name">{name}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{color:'var(--gray-500)'}}>{c.email ?? '—'}</td>
                      <td>{c.company ?? '—'}</td>
                      <td style={{color:'var(--gray-500)'}}>{c.phone ?? '—'}</td>
                      <td>
                        <span className="badge badge-green">● Activo</span>
                      </td>
                      <td>
                        <div style={{display:'flex',gap:4,justifyContent:'flex-end'}}>
                          <button className="btn-icon" title="Editar" style={{width:28,height:28,fontSize:13}}>✏️</button>
                          <button className="btn-icon" title="Eliminar" style={{width:28,height:28,fontSize:13}}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
