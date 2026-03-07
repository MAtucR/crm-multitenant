import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

async function fetchAll(token: string, tp?: string) {
  const base = process.env.API_URL ?? 'http://localhost:8081';
  const h = { Authorization: `Bearer ${token}`, ...(tp ? { traceparent: tp } : {}) };
  const [cr, dr] = await Promise.allSettled([
    fetch(`${base}/api/contacts`, { headers: h, cache: 'no-store' }),
    fetch(`${base}/api/deals`,    { headers: h, cache: 'no-store' }),
  ]);
  const contacts = cr.status === 'fulfilled' && cr.value.ok ? await cr.value.json() : [];
  const deals    = dr.status === 'fulfilled' && dr.value.ok ? await dr.value.json() : [];
  return { contacts, deals };
}

const STAGES = [
  { key: 'LEAD',        label: 'Lead',        color: '#eab308' },
  { key: 'QUALIFIED',   label: 'Calificado',  color: '#3b82f6' },
  { key: 'PROPOSAL',    label: 'Propuesta',   color: '#f97316' },
  { key: 'NEGOTIATION', label: 'Negociación', color: '#a855f7' },
  { key: 'CLOSED_WON',  label: 'Ganado',      color: '#22c55e' },
  { key: 'CLOSED_LOST', label: 'Perdido',     color: '#ef4444' },
];

const fmt = (n: number) =>
  n >= 1_000_000 ? `$${(n/1_000_000).toFixed(1)}M`
  : n >= 1_000   ? `$${(n/1_000).toFixed(0)}K`
  : `$${n}`;

export default async function ReportsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/api/auth/signin');
  const token = (session as any).accessToken as string;
  const tp = headers().get('traceparent') ?? undefined;
  const { contacts, deals } = await fetchAll(token, tp);

  const totalRevenue  = deals.filter((d:any) => d.stage === 'CLOSED_WON').reduce((s:number,d:any) => s+(d.amount??0), 0);
  const totalPipeline = deals.filter((d:any) => !['CLOSED_WON','CLOSED_LOST'].includes(d.stage)).reduce((s:number,d:any) => s+(d.amount??0), 0);
  const winRate       = deals.length ? Math.round(deals.filter((d:any) => d.stage==='CLOSED_WON').length / deals.length * 100) : 0;
  const avgDeal       = deals.length ? Math.round(deals.reduce((s:number,d:any) => s+(d.amount??0),0) / deals.length) : 0;

  const stageCounts  = deals.reduce((a:any,d:any) => ({...a,[d.stage]:(a[d.stage]??0)+1}), {});
  const stageAmounts = deals.reduce((a:any,d:any) => ({...a,[d.stage]:(a[d.stage]??0)+(d.amount??0)}), {});
  const maxCount = Math.max(1, ...Object.values(stageCounts as Record<string,number>));

  // Contacts with most associated company (simple grouping)
  const byCompany: Record<string, number> = {};
  contacts.forEach((c:any) => {
    if (c.company) byCompany[c.company] = (byCompany[c.company] ?? 0) + 1;
  });
  const topCompanies = Object.entries(byCompany)
    .sort((a,b) => b[1]-a[1]).slice(0,5);

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Reportes</h1>
          <p>Resumen de actividad del tenant</p>
        </div>
        <button className="btn btn-ghost">↓ Exportar PDF</button>
      </div>

      {/* KPI row */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        {[
          { label: 'Revenue total',    value: fmt(totalRevenue),        icon: '💰', bg: '#dcfce7', delta: 'CLOSED_WON' },
          { label: 'Pipeline activo',  value: fmt(totalPipeline),       icon: '🔥', bg: '#fef9c3', delta: 'deals abiertos' },
          { label: 'Win rate',         value: `${winRate}%`,            icon: '🎯', bg: '#f3e8ff', delta: `${deals.length} deals` },
          { label: 'Ticket promedio',  value: fmt(avgDeal),             icon: '📈', bg: '#dbeafe', delta: 'por deal' },
        ].map(k => (
          <div key={k.label} className="stat-card">
            <div className="stat-header">
              <span className="stat-label">{k.label}</span>
              <div className="stat-icon" style={{ background: k.bg }}>{k.icon}</div>
            </div>
            <div className="stat-value">{k.value}</div>
            <div className="stat-delta">{k.delta}</div>
          </div>
        ))}
      </div>

      <div className="grid-2" style={{ marginBottom: 24 }}>
        {/* Bar chart — deals por etapa */}
        <div className="card">
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20 }}>Deals por etapa</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {STAGES.map(s => {
              const count  = (stageCounts[s.key]  ?? 0) as number;
              const amount = (stageAmounts[s.key] ?? 0) as number;
              const pct    = Math.round((count / maxCount) * 100);
              return (
                <div key={s.key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
                    <span style={{ fontWeight: 500, color: 'var(--gray-700)' }}>{s.label}</span>
                    <span style={{ color: 'var(--gray-500)' }}>{count} · {fmt(amount)}</span>
                  </div>
                  <div style={{ height: 8, background: 'var(--gray-100)', borderRadius: 999 }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: s.color, borderRadius: 999, transition: 'width 0.3s' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top empresas */}
        <div className="card">
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20 }}>Contactos por empresa</h2>
          {topCompanies.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🏢</div>
              <div className="empty-state-title">Sin datos</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {topCompanies.map(([company, count], i) => {
                const colors = ['#4f46e5','#0891b2','#059669','#d97706','#dc2626'];
                return (
                  <div key={company} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: i < topCompanies.length-1 ? '1px solid var(--gray-100)' : 'none' }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: colors[i % colors.length], display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700 }}>
                      {company[0].toUpperCase()}
                    </div>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--gray-800)' }}>{company}</span>
                    <span className="badge badge-blue">{count} contacto{count !== 1 ? 's' : ''}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Resumen de todos los deals */}
      <div className="card">
        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Todos los deals</h2>
        {deals.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">💼</div>
            <div className="empty-state-title">Sin deals</div>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Título</th>
                  <th>Monto</th>
                  <th>Etapa</th>
                  <th>% del total</th>
                </tr>
              </thead>
              <tbody>
                {[...deals].sort((a:any,b:any) => (b.amount??0)-(a.amount??0)).map((d:any, i:number) => {
                  const stage  = STAGES.find(s => s.key === d.stage);
                  const badgeMap: Record<string,string> = {
                    LEAD:'badge-yellow',QUALIFIED:'badge-blue',PROPOSAL:'badge-orange',
                    NEGOTIATION:'badge-purple',CLOSED_WON:'badge-green',CLOSED_LOST:'badge-red'
                  };
                  const totalAll = deals.reduce((s:number,x:any) => s+(x.amount??0), 0) || 1;
                  const pct = d.amount ? Math.round(d.amount / totalAll * 100) : 0;
                  return (
                    <tr key={d.id}>
                      <td style={{ color: 'var(--gray-400)', fontSize: 12 }}>{i+1}</td>
                      <td style={{ fontWeight: 500 }}>{d.title}</td>
                      <td style={{ fontWeight: 600 }}>{d.amount != null ? fmt(d.amount) : '—'}</td>
                      <td><span className={`badge ${badgeMap[d.stage] ?? 'badge-gray'}`}>{stage?.label ?? d.stage}</span></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 6, background: 'var(--gray-100)', borderRadius: 999 }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: stage?.color ?? '#6b7280', borderRadius: 999 }} />
                          </div>
                          <span style={{ fontSize: 11, color: 'var(--gray-500)', width: 30, textAlign: 'right' }}>{pct}%</span>
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
