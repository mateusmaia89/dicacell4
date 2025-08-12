// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig(() => {
  const useMock = process.env.VITE_USE_MOCK === 'true';
  return {
    define: {
      __API_IMPL__: JSON.stringify(useMock ? './mock' : './live'),
    },
  };
});
