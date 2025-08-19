const postgres = require('postgres');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function testConnection() {
  const sql = postgres(process.env.DATABASE_URL, {
    ssl: 'require',
    max: 1
  });

  try {
    console.log('Connecting to database...');
    
    // Test basic query
    const result = await sql`SELECT version();`;
    console.log('✓ Database connection successful!');
    console.log('✓ Database version:', result[0].version.substring(0, 50) + '...');
    
    // Check if tables exist
    const tablesResult = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    
    console.log('✓ Tables in database:', tablesResult.length);
    tablesResult.forEach(row => {
      console.log('  -', row.table_name);
    });
    
    console.log('\n✓ Database setup is ready for MVP!');
    
  } catch (error) {
    console.error('✗ Database connection failed:', error.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

testConnection();