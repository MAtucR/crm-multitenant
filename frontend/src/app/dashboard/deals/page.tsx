import { headers } from 'next/headers';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';

async function fetchDeals(token: string, traceparent?: string) {
  const base = process.env.API_URL ?? 'http://localhost:8081';
  const res = await fetch(`${base}/api/deals`, {
    headers: { Authorization: `Bearer ${token}`, ...(traceparent ? { traceparent } : {}) },
    cache: 'no-store',
  });
  if (!res.ok) return [];
  return res.json();
}

const STAGE_META: Record<string, { label: string; badge: string; color: string }> = {
  LEAD:        { label: 'Lead',        badge: 'badge-yellow', color: '#eab308' },
  QUALIFIED:   { label: 'Calificado', badge: 'badge-blue',   color: '#3b82f6' },
  PROPOSAL:    { label: 'Propuesta',  badge: 'badge-orange', color: '#f97316' },
  NEGOTIATION: { label: 'Negociación',badge: 'badge-purple', color: '#a855f7' },
  CLOSED_WON:  { label: 'Ganado',     badge: 'badge-green',  color: '#22c55e' },
  CLOSED_LOST: { label: 'Perdido',    badge: 'badge-red',    color: '#ef4444' },
};

const STAGES_ORDER = ['LEAD','QUALIFIED','PROPOSAL','NEGOTIATION','CLOSED_WON','CLOSED_LOST'];

const fmt = (n: number) =>
  n >= 1_000_000 ? `$${(n/1_000_000).toFixed(1)}M`
  : n >= 1_000   ? `$${(n/1_000).toFixed(0)}K`
  : `$${n}`;

export default async function DealsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/api/auth/signin');
  const token = (session as any).accessToken as string;
  const tp = headers().get('traceparent') ?? undefined;
  const deals: any[] = await fetchDeals(token, tp);

  const stageCounts = deals.reduce((a:any,d:any)=>({...a,[d.stage]:(a[d.stage]??0)+1}),{});
  const stageAmounts = deals.reduce((a:any,d:any)=>({...a,[d.stage]:(a[d.stage]??0)+(d.amount??0)}),{});
  const total = deals.reduce((s:number,d:any)=>s+(d.amount??0),0);

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Deals</h1>
          <p>{deals.length} deal{deals.length !== 1 ? 's' : ''} · {fmt(total)} en total</p>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button className="btn btn-ghost">↓ Exportar</button>
          <button className="btn btn-primary">+ Nuevo deal</button>
        </div>
      </div>

      {/* Pipeline summary */}
      <div className="pipeline-grid" style={{marginBottom:24}}>
        {STAGES_ORDER.map(key => {
          const meta = STAGE_META[key];
          return (
            <div key={key} className="pipeline-step">
              <div className="pipeline-step-label" style={{color:meta.color}}>{meta.label}</div>
              <div className="pipeline-step-count">{stageCounts[key]??0}</div>
              <div className="pipeline-step-amount">{fmt(stageAmounts[key]??0)}</div>
            </div>
          );
        })}
      </div>

      <div className="card">
        {deals.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">💼</div>
            <div className="empty-state-title">Sin deals aún</div>
            <div className="empty-state-text">Creá tu primer deal para comenzar</div>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Monto</th>
                  <th>Etapa</th>
                  <th>Cierre estimado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {deals.map((d: any) => {
                  const meta = STAGE_META[d.stage] ?? { label: d.stage, badge: 'badge-gray', color: '#6b7280' };
                  return (
                    <tr key={d.id}>
                      <td>
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          <div style={{width:8,height:8,borderRadius:'50%',background:meta.color,flexShrink:0}}/>
                          <span style={{fontWeight:500,color:'var(--gray-800)'}}>{d.title}</span>
                        </div>
                      </td>
                      <td style={{fontWeight:600,color:'var(--gray-900)'}}>
                        {d.amount != null ? fmt(d.amount) : '—'}
                      </td>
                      <td><span className={`badge ${meta.badge}`}>{meta.label}</span></td>
                      <td style={{color:'var(--gray-500)',fontSize:13}}>
                        {d.expectedCloseDate ?? '—'}
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
