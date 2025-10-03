console.log('Environment variables check:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('DATABASE_URL length:', process.env.DATABASE_URL?.length || 0);
console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
console.log('OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);

if (process.env.DATABASE_URL) {
  try {
    const url = new URL(process.env.DATABASE_URL);
    console.log('Database host:', url.host);
    console.log('Database name:', url.pathname.replace('/', ''));
    console.log('Database protocol:', url.protocol);
  } catch (error) {
    console.error('Invalid DATABASE_URL format:', error.message);
  }
}