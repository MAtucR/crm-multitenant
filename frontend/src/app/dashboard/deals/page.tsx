import { headers } from 'next/headers';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';

async function fetchDeals(accessToken: string, traceparent?: string) {
  const backendUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8081';

  const res = await fetch(`${backendUrl}/api/deals`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(traceparent ? { traceparent } : {}),
    },
    cache: 'no-store',
  });

  if (!res.ok) return [];
  return res.json();
}

export default async function DealsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/api/auth/signin');

  const accessToken = (session as any).accessToken as string;
  const traceparent = headers().get('traceparent') ?? undefined;

  const deals = await fetchDeals(accessToken, traceparent);

  const STAGE_LABEL: Record<string, string> = {
    LEAD: '🟡 Lead',
    QUALIFIED: '🔵 Calificado',
    PROPOSAL: '🟠 Propuesta',
    NEGOTIATION: '🟣 Negociación',
    CLOSED_WON: '🟢 Ganado',
    CLOSED_LOST: '🔴 Perdido',
  };

  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>💼 Deals</h1>
      {deals.length === 0
        ? <p>Sin deals aún.</p>
        : (
          <table border={1} cellPadding={8} style={{ borderCollapse: 'collapse', marginTop: '1rem' }}>
            <thead>
              <tr><th>Título</th><th>Monto</th><th>Etapa</th></tr>
            </thead>
            <tbody>
              {deals.map((d: any) => (
                <tr key={d.id}>
                  <td>{d.title}</td>
                  <td>{d.amount ? `$${d.amount.toLocaleString()}` : '-'}</td>
                  <td>{STAGE_LABEL[d.stage] ?? d.stage}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
    </main>
  );
}
