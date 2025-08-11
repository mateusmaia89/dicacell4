import { sseBroadcast } from '@/lib/sse-bus';
export const runtime = 'edge';

export async function POST(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');

  if (!token || token !== process.env.NC_WEBHOOK_TOKEN) {
    return new Response('unauthorized', { status: 401 });
  }

  let body: any;
  try { body = await req.json(); } catch { return new Response('bad json', { status: 400 }); }

  // NocoDB pode mandar formatos diferentes; mapeamos os mais comuns
  const record = body?.payload ?? body?.row ?? body?.data ?? body;

  const id =
    record?.Id ?? record?.id ?? record?.ID ?? record?._id ?? record?.recordId;

  const status =
    record?.status ?? record?.Status ?? record?.STATUS ?? record?.state;

  // Transmite para todos conectados no /api/stream
  sseBroadcast({
    type: 'nocodb:update',
    id,
    status,
    record,
    at: Date.now(),
  });

  return new Response('ok', { status: 200 });
}
