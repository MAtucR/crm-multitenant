import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { headers } from 'next/headers';

async function fetchStats(token: string, traceparent?: string) {
  const base = process.env.API_URL ?? 'http://localhost:8081';
  const h: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    ...(traceparent ? { traceparent } : {}),
  };
  const [contactsRes, dealsRes] = await Promise.allSettled([
    fetch(`${base}/api/contacts`, { headers: h, cache: 'no-store' }),
    fetch(`${base}/api/deals`,    { headers: h, cache: 'no-store' }),
  ]);
  const contacts: any[] = contactsRes.status === 'fulfilled' && contactsRes.value.ok
    ? await contactsRes.value.json() : [];
  const deals: any[] = dealsRes.status === 'fulfilled' && dealsRes.value.ok
    ? await dealsRes.value.json() : [];
  return { contacts, deals };
}

const STAGE_META: Record<string, { label: string; color: string }> = {
  LEAD:        { label: 'Lead',        color: '#eab308' },
  QUALIFIED:   { label: 'Calificado', color: '#3b82f6' },
  PROPOSAL:    { label: 'Propuesta',  color: '#f97316' },
  NEGOTIATION: { label: 'Negociación',color: '#a855f7' },
  CLOSED_WON:  { label: 'Ganado',     color: '#22c55e' },
  CLOSED_LOST: { label: 'Perdido',    color: '#ef4444' },
};

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const token = (session as any)?.accessToken as string;
  const tp = headers().get('traceparent') ?? undefined;
  const { contacts, deals } = await fetchStats(token, tp);

  const revenue = deals
    .filter(d => d.stage === 'CLOSED_WON')
    .reduce((s, d) => s + (d.amount ?? 0), 0);
  const pipeline = deals
    .filter(d => !['CLOSED_WON','CLOSED_LOST'].includes(d.stage))
    .reduce((s, d) => s + (d.amount ?? 0), 0);
  const winRate = deals.length
    ? Math.round(deals.filter(d => d.stage === 'CLOSED_WON').length / deals.length * 100)
    : 0;

  const stageCounts = deals.reduce((acc: Record<string, number>, d) => {
    acc[d.stage] = (acc[d.stage] ?? 0) + 1; return acc;
  }, {});
  const stageAmounts = deals.reduce((acc: Record<string, number>, d) => {
    acc[d.stage] = (acc[d.stage] ?? 0) + (d.amount ?? 0); return acc;
  }, {});

  const fmt = (n: number) =>
    n >= 1_000_000 ? `$${(n/1_000_000).toFixed(1)}M`
    : n >= 1_000   ? `$${(n/1_000).toFixed(0)}K`
    : `$${n}`;

  return (
    <>
      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">Contactos</span>
            <div className="stat-icon" style={{background:'#e0e7ff'}}>👥</div>
          </div>
          <div className="stat-value">{contacts.length}</div>
          <div className="stat-delta up">↑ activos</div>
        </div>
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">Deals abiertos</span>
            <div className="stat-icon" style={{background:'#fef9c3'}}>💼</div>
          </div>
          <div className="stat-value">{deals.filter(d=>!['CLOSED_WON','CLOSED_LOST'].includes(d.stage)).length}</div>
          <div className="stat-delta">{fmt(pipeline)} en pipeline</div>
        </div>
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">Revenue ganado</span>
            <div className="stat-icon" style={{background:'#dcfce7'}}>💰</div>
          </div>
          <div className="stat-value">{fmt(revenue)}</div>
          <div className="stat-delta up">CLOSED_WON</div>
        </div>
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">Win rate</span>
            <div className="stat-icon" style={{background:'#f3e8ff'}}>🎯</div>
          </div>
          <div className="stat-value">{winRate}%</div>
          <div className="stat-delta">{deals.length} deals totales</div>
        </div>
      </div>

      {/* Pipeline por etapa */}
      <div className="card" style={{marginBottom:24}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
          <h2 style={{fontSize:15,fontWeight:600}}>Pipeline por etapa</h2>
        </div>
        <div className="pipeline-grid">
          {Object.entries(STAGE_META).map(([key, meta]) => (
            <div key={key} className="pipeline-step">
              <div className="pipeline-step-label" style={{color:meta.color}}>{meta.label}</div>
              <div className="pipeline-step-count">{stageCounts[key] ?? 0}</div>
              <div className="pipeline-step-amount">{fmt(stageAmounts[key] ?? 0)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom grid */}
      <div className="grid-2">
        {/* Últimos deals */}
        <div className="card">
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
            <h2 style={{fontSize:15,fontWeight:600}}>Últimos deals</h2>
            <a href="/dashboard/deals" style={{fontSize:12,color:'var(--brand-600)',fontWeight:600}}>Ver todos →</a>
          </div>
          {deals.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">💼</div>
              <div className="empty-state-title">Sin deals</div>
            </div>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:0}}>
              {deals.slice(0,5).map((d:any) => {
                const meta = STAGE_META[d.stage] ?? {label:d.stage,color:'#6b7280'};
                return (
                  <div key={d.id} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:'1px solid var(--gray-100)'}}>
                    <div style={{width:8,height:8,borderRadius:'50%',background:meta.color,flexShrink:0}}/>
                    <div style={{flex:1,fontSize:13,fontWeight:500,color:'var(--gray-800)',minWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{d.title}</div>
                    <div style={{fontSize:12,fontWeight:600,color:'var(--gray-600)',flexShrink:0}}>{d.amount ? fmt(d.amount) : '—'}</div>
                    <span className={`badge badge-${
                      d.stage==='CLOSED_WON'?'green':d.stage==='CLOSED_LOST'?'red':
                      d.stage==='LEAD'?'yellow':d.stage==='QUALIFIED'?'blue':
                      d.stage==='PROPOSAL'?'orange':'purple'
                    }`}>{meta.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Últimos contactos */}
        <div className="card">
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
            <h2 style={{fontSize:15,fontWeight:600}}>Contactos recientes</h2>
            <a href="/dashboard/contacts" style={{fontSize:12,color:'var(--brand-600)',fontWeight:600}}>Ver todos →</a>
          </div>
          {contacts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">👥</div>
              <div className="empty-state-title">Sin contactos</div>
            </div>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:0}}>
              {contacts.slice(0,5).map((c:any,i:number) => {
                const colors=['#4f46e5','#0891b2','#059669','#d97706','#dc2626'];
                const color=colors[i%colors.length];
                const ini=(c.name??c.email??'?').split(' ').slice(0,2).map((w:string)=>w[0]).join('').toUpperCase();
                return (
                  <div key={c.id} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:'1px solid var(--gray-100)'}}>
                    <div className="avatar" style={{background:color,width:32,height:32,fontSize:12}}>{ini}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:500,color:'var(--gray-800)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{c.name}</div>
                      <div style={{fontSize:11,color:'var(--gray-400)'}}>{c.email}</div>
                    </div>
                    <div style={{fontSize:12,color:'var(--gray-500)',flexShrink:0}}>{c.company}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
