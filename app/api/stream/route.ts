import { sseRegister, sseUnregister } from '../../../src/lib/sse-bus';

export const runtime = 'edge';

export async function GET() {
  let ctrl: ReadableStreamDefaultController;
  let keepAlive: number | undefined;

  const stream = new ReadableStream({
    start(controller) {
      ctrl = controller;
      sseRegister(controller);

      // Keep-alive a cada 25s
      const enc = new TextEncoder();
      keepAlive = setInterval(() => {
        try { controller.enqueue(enc.encode(': ping\n\n')); } catch {}
      }, 25000) as unknown as number;
    },
    cancel() {
      sseUnregister(ctrl);
      if (keepAlive) clearInterval(keepAlive);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
