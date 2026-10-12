// ============================================================
// Civiora — MongoDB Atlas Connectivity & Health Verification
// Comprehensive Diagnostics, Shard Detection & CRUD Verification
// ============================================================

import mongoose from 'mongoose';
import dns from 'dns';
import { env } from '../config/env.js';

// Apply public DNS fallback for Windows SRV compatibility
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {}

export async function verifyAtlasConnection(): Promise<boolean> {
  console.log('\n============================================================');
  console.log('   CIVIORA — MONGODB ATLAS CONNECTIVITY VERIFICATION');
  console.log('============================================================\n');

  console.log('1. Checking MONGODB_URI environment variable...');
  const uri = env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI is not set in environment.');
    return false;
  }

  // Obfuscate password in console
  const maskedUri = uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:********@');
  console.log(`   Configured URI: ${maskedUri}`);

  // Test SRV DNS resolution
  const match = uri.match(/@([^/?]+)/);
  const clusterHost = match ? match[1] : 'civiora-db.se5b7wx.mongodb.net';
  console.log(`\n2. Resolving DNS SRV records for _mongodb._tcp.${clusterHost}...`);
  try {
    const srvRecords = await dns.promises.resolveSrv(`_mongodb._tcp.${clusterHost}`);
    console.log(`   ✅ SRV resolution successful! Found ${srvRecords.length} shard targets:`);
    srvRecords.forEach((r, idx) => console.log(`      [Shard ${idx + 1}] ${r.name}:${r.port}`));
  } catch (dnsErr: any) {
    console.warn(`   ⚠️ Direct SRV DNS resolution returned: ${dnsErr.message}`);
  }

  console.log('\n3. Connecting to MongoDB Atlas Cluster with Mongoose...');
  const startTime = Date.now();

  try {
    const conn = await mongoose.connect(uri, {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 12000,
      socketTimeoutMS: 45000,
    });

    const elapsed = Date.now() - startTime;
    console.log(`   ✅ Successfully connected in ${elapsed}ms!`);
    console.log(`   Database: ${conn.connection.name}`);
    console.log(`   Active Host: ${conn.connection.host}`);
    console.log(`   Connection ReadyState: ${conn.connection.readyState} (1 = connected)`);

    // Ping check
    console.log('\n4. Executing administrative ping...');
    const admin = conn.connection.db!.admin();
    const pingRes = await admin.ping();
    console.log(`   ✅ Ping response: ${JSON.stringify(pingRes)}`);

    // Controlled non-destructive CRUD test in dedicated test collection
    console.log('\n5. Performing non-destructive write/read/delete health check...');
    const testCollection = conn.connection.db!.collection('_atlas_health_check');
    const testDoc = {
      testId: 'atlas-health-' + Date.now(),
      platform: 'Civiora',
      timestamp: new Date(),
    };

    const insertResult = await testCollection.insertOne(testDoc);
    console.log(`   ✓ Write succeeded (Inserted ID: ${insertResult.insertedId})`);

    const readDoc = await testCollection.findOne({ _id: insertResult.insertedId });
    console.log(`   ✓ Read succeeded (Verified platform: ${readDoc?.platform})`);

    await testCollection.deleteOne({ _id: insertResult.insertedId });
    console.log('   ✓ Cleanup succeeded (Test record removed)');

    // List collections
    const collections = await conn.connection.db!.listCollections().toArray();
    console.log(`\n6. Discovered ${collections.length} collection(s) in '${conn.connection.name}':`);
    collections.forEach((c) => console.log(`   • ${c.name}`));

    console.log('\n============================================================');
    console.log('   ✅ CIVIORA MONGODB ATLAS VERIFICATION PASSED');
    console.log('============================================================\n');

    await mongoose.disconnect();
    return true;
  } catch (err: any) {
    console.error('\n❌ MongoDB Atlas Connection Failed:');
    console.error(`   Error Name: ${err.name}`);
    console.error(`   Message: ${err.message}`);

    if (err.message?.includes('tlsv1 alert internal error') || err.message?.includes('whitelist')) {
      console.log('\n────────────────────────────────────────────────────────────');
      console.log('   DIAGNOSIS: ATLAS NETWORK ACCESS (IP WHITELIST) REQUIRED');
      console.log('────────────────────────────────────────────────────────────');
      console.log('MongoDB Atlas rejected the connection at the TLS layer because');
      console.log('the incoming public IP address is not whitelisted.');
      console.log('\nTo resolve this in 30 seconds:');
      console.log('1. Open your MongoDB Atlas Console: https://cloud.mongodb.com/');
      console.log('2. Navigate to: Security → Network Access');
      console.log('3. Click "+ ADD IP ADDRESS"');
      console.log('4. Click "ALLOW ACCESS FROM ANYWHERE" (0.0.0.0/0) or "ADD CURRENT IP ADDRESS"');
      console.log('5. Click "Confirm"');
      console.log('6. Re-run: npm run test:atlas\n');
    }

    try {
      await mongoose.disconnect();
    } catch {}
    return false;
  }
}

// Execute directly if run as main script
if (process.argv[1]?.includes('verifyAtlas')) {
  verifyAtlasConnection().then((success) => {
    process.exit(success ? 0 : 1);
  });
}
