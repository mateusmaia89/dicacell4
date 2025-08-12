// src/api/index.ts
declare const __API_IMPL__: string;

// Depois que o Vite substituir __API_IMPL__ por uma string literal,
// isso vira "export * from './mock'" ou "export * from './live'"
export * from __API_IMPL__;
