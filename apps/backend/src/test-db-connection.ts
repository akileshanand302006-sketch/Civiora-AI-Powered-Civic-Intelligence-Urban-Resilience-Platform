import dns from 'dns';
import mongoose from 'mongoose';

// Set public DNS servers to resolve MongoDB SRV records reliably on Windows
dns.setServers(['8.8.8.8', '1.1.1.1']);

const uri = 'mongodb+srv://akileshanand302006_db_user:ihFDsbZcewnLkfiC@civiora-db.se5b7wx.mongodb.net/civiora?retryWrites=true&w=majority&appName=civiora-db';

async function testConnection() {
  console.log('Testing SRV resolution with Google/Cloudflare DNS...');
  try {
    const srvRecords = await dns.promises.resolveSrv('_mongodb._tcp.civiora-db.se5b7wx.mongodb.net');
    console.log('SRV Records found:', srvRecords);

    console.log('Testing connection to MongoDB Atlas...');
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 15000,
    });
    console.log('✅ Successfully connected to MongoDB Atlas!');
    console.log('Database name:', conn.connection.name);
    console.log('Host:', conn.connection.host);
    
    // Check ping
    const admin = conn.connection.db!.admin();
    const pingResult = await admin.ping();
    console.log('Ping result:', pingResult);

    // List collections
    const collections = await conn.connection.db!.listCollections().toArray();
    console.log('Existing collections:', collections.map(c => c.name));

    await mongoose.disconnect();
    console.log('Disconnected cleanly.');
  } catch (err: any) {
    console.error('❌ Connection test error:', err);
  }
}

testConnection();
