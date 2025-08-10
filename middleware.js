const { NextResponse } = require('next/server');
const jwt = require('jsonwebtoken');

module.exports = function middleware(req) {
  if (!req.nextUrl.pathname.startsWith('/api/nocodb')) return NextResponse.next();
  const token = req.cookies.get('sid')?.value;
  const secret = process.env.AUTH_SECRET || 'demo-secret';
  try {
    if (!token) throw new Error('no cookie');
    jwt.verify(token, secret);
    return NextResponse.next();
  } catch (e) {
    return new NextResponse(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
  }
}