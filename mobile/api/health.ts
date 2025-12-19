export type HealthResponse = { status: string };

export async function getHealth(url: string): Promise<HealthResponse> {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
