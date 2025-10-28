// test-railway.js
console.log('=== RAILWAY ENVIRONMENT TEST ===');
console.log('Current working directory:', process.cwd());
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('REDIS_URL exists:', !!process.env.REDIS_URL);
console.log('FRONTEND_URL:', process.env.FRONTEND_URL);
console.log('BACKEND_URL:', process.env.BACKEND_URL);
console.log('Total env vars:', Object.keys(process.env).length);
console.log('================================');

// Mantener el proceso vivo para ver los logs
setInterval(() => {
  console.log('Still running...');
}, 10000);