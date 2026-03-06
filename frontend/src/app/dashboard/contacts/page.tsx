import { headers } from 'next/headers';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';

async function fetchContacts(accessToken: string, traceparent?: string) {
  const backendUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8081';

  const res = await fetch(`${backendUrl}/api/contacts`, {
    headers: {
      Authorization:  `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(traceparent ? { traceparent } : {}),
    },
    // RSC: no cachear, siempre fresco
    cache: 'no-store',
  });

  if (!res.ok) return [];
  return res.json();
}

export default async function ContactsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/api/auth/signin');

  const accessToken = (session as any).accessToken as string;
  const traceparent = headers().get('traceparent') ?? undefined;

  const contacts = await fetchContacts(accessToken, traceparent);

  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>📧 Contactos</h1>
      {contacts.length === 0
        ? <p>Sin contactos aún.</p>
        : (
          <table border={1} cellPadding={8} style={{ borderCollapse: 'collapse', marginTop: '1rem' }}>
            <thead>
              <tr><th>Nombre</th><th>Email</th><th>Empresa</th></tr>
            </thead>
            <tbody>
              {contacts.map((c: any) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.email}</td>
                  <td>{c.company}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
    </main>
  );
}
