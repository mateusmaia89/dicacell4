export async function ncFetch(path, init = {}) {
  const baseUrl = process.env.NOCODB_URL || 'https://nocodb.liggas.shop';
  const table = process.env.NOCODB_TABLE || 'm1kkxdnyftu2uaa';
  const url = `${baseUrl}/api/v2/tables/${table}${path}`;
  const headers = { 'xc-token': process.env.NOCODB_TOKEN, 'Content-Type': 'application/json' };
  const res = await fetch(url, { ...init, headers: { ...headers, ...(init.headers||{}) } });
  if (!res.ok) throw new Error(`NocoDB ${res.status}`);
  return res.json();
}