const encoder = new TextEncoder();

// Lista de conexões abertas para o SSE
const clients = new Set<ReadableStreamDefaultController>();

export function sseRegister(controller: ReadableStreamDefaultController) {
  clients.add(controller);
  controller.enqueue(encoder.encode(': connected\n\n'));
}

export function sseUnregister(controller: ReadableStreamDefaultController) {
  clients.delete(controller);
}

export function sseBroadcast(data: unknown) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  const bytes = encoder.encode(payload);
  for (const c of clients) {
    try { c.enqueue(bytes); } catch {}
  }
}
