import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export function middleware(req) {
  // Só aplica às rotas /api/nocodb/*
  if (!req.nextUrl.pathname.startsWith('/api/nocodb')) {
    return NextResponse.next();
  }

  const token = req.cookies.get('sid')?.value;
  const secret = process.env.AUTH_SECRET || 'demo-secret';

  try {
    if (!token) throw new Error('no cookie');
    jwt.verify(token, secret);
    return NextResponse.next();
  } catch (e) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
}

export const config = {
  matcher: ['/api/nocodb/:path*'],
};