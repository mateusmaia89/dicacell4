const encoder = new TextEncoder();

// Mantém os controladores (conexões) ativos do SSE
const clients = new Set<any>();

export function sseRegister(controller: any) {
  clients.add(controller);
  controller.enqueue(encoder.encode(': connected\n\n'));
}

export function sseUnregister(controller: any) {
  clients.delete(controller);
}

export function sseBroadcast(data: unknown) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  const bytes = encoder.encode(payload);
  for (const c of clients) {
    try { c.enqueue(bytes); } catch {}
  }
}
