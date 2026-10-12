import dns from 'dns';
import { MongoClient } from 'mongodb';

dns.setServers(['8.8.8.8', '1.1.1.1']);

const uri = 'mongodb+srv://akileshanand302006_db_user:ihFDsbZcewnLkfiC@civiora-db.se5b7wx.mongodb.net/civiora?retryWrites=true&w=majority&appName=civiora-db';

async function testNativeClient() {
  console.log('Connecting with native MongoClient...');
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 10000,
  });

  try {
    await client.connect();
    console.log('✅ Connected successfully with MongoClient!');
    const db = client.db('civiora');
    const ping = await db.command({ ping: 1 });
    console.log('Ping result:', ping);

    const collections = await db.listCollections().toArray();
    console.log('Collections in civiora:', collections.map(c => c.name));
    await client.close();
  } catch (err: any) {
    console.error('❌ MongoClient error:', err);
    if (err.topologyVersion) console.error('Topology:', err.topologyVersion);
    if (err.cause) console.error('Cause:', err.cause);
  }
}

testNativeClient();
