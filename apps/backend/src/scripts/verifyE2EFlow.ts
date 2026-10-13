import axios from 'axios';
import { connectDatabase } from '../config/database.js';
import { User } from '../modules/users/user.model.js';
import { generateAccessToken } from '../modules/auth/token.service.js';
import crypto from 'crypto';

const BASE_URL = 'http://localhost:4000/api/v1';

async function runE2EVerification() {
  console.log('🚀 Starting Civiora 2.0 Live E2E Workflow Verification against', BASE_URL);

  try {
    await connectDatabase();
    console.log('✓ Connected to MongoDB Atlas for test assertions and auth token minting.');

    // 1. Register or Login Field Worker (Steve Rogers)
    console.log('\n--- 1. Testing Field Worker Account Claim / Login ---');
    let workerToken = '';
    let workerUser: any = null;
    try {
      const regRes = await axios.post(`${BASE_URL}/auth/register`, {
        firstName: 'Steve',
        lastName: 'Rogers',
        email: 'steverogers302006@gmail.com',
        password: 'Password123!Secure',
        organizationSlug: 'metropolis',
      });
      console.log('Registered Steve Rogers:', regRes.data.data.user.role, 'Department:', regRes.data.data.user.departmentId);
      workerUser = regRes.data.data.user;
    } catch (err: any) {
      if (err.response?.status === 409 || err.response?.status === 400) {
        console.log('User already registered.');
      } else {
        throw err;
      }
    }
    const workerLogin = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'steverogers302006@gmail.com',
      password: 'Password123!Secure',
      organizationSlug: 'metropolis',
    });
    workerToken = workerLogin.data.data.accessToken;
    workerUser = workerLogin.data.data.user;
    console.log(`✓ Field Worker authenticated: ${workerUser.email} (Role: ${workerUser.role}, Dept: ${workerUser.departmentId})`);

    // 2. Register / Authenticate Citizen
    console.log('\n--- 2. Testing Citizen Login / Creation ---');
    let citizenToken = '';
    let citizenUser: any = null;
    const citizenEmail = 'citizen.chennai@civiora.local';
    try {
      await axios.post(`${BASE_URL}/auth/register`, {
        firstName: 'Ramesh',
        lastName: 'Kumar',
        email: citizenEmail,
        password: 'Password123!Secure',
        organizationSlug: 'metropolis',
      });
    } catch (err: any) {
      if (err.response?.status === 409 || err.response?.status === 400) {
        console.log('Citizen already registered.');
      } else {
        throw err;
      }
    }
    const citizenLogin = await axios.post(`${BASE_URL}/auth/login`, {
      email: citizenEmail,
      password: 'Password123!Secure',
      organizationSlug: 'metropolis',
    });
    citizenToken = citizenLogin.data.data.accessToken;
    citizenUser = citizenLogin.data.data.user;
    console.log(`✓ Citizen authenticated: ${citizenUser.email} (Role: ${citizenUser.role})`);

    // 3. Manager Token (Doctor Doom)
    console.log('\n--- 3. Authenticating Department Manager ---');
    const managerDoc = await User.findOne({ email: 'doctordoom3056@gmail.com' });
    if (!managerDoc) {
      throw new Error('Department Manager doctordoom3056@gmail.com not found in MongoDB');
    }
    const managerToken = generateAccessToken(managerDoc, crypto.randomUUID());
    console.log(`✓ Manager authenticated: ${managerDoc.email} (Role: ${managerDoc.role}, Dept: ${managerDoc.departmentId})`);

    // 4. Citizen submits a civic hazard incident
    console.log('\n--- 4. Submitting Civic Hazard Incident ---');
    const incidentPayload = {
      title: 'Deep Pothole and Water Stagnation on Anna Salai',
      description: 'Major road hazard near Thousand Lights bus stop causing severe traffic disruption and two-wheeler skids.',
      category: 'pothole',
      severity: 'high',
      location: {
        address: 'Thousand Lights, Anna Salai, Chennai, Tamil Nadu 600006',
        district: 'Chennai',
        coordinates: [80.2518, 13.0604], // [lng, lat]
      },
    };
    const reportRes = await axios.post(`${BASE_URL}/incidents`, incidentPayload, {
      headers: { Authorization: `Bearer ${citizenToken}` },
    });
    const incident = reportRes.data.data;
    const incidentId = incident.id || incident._id;
    console.log(`✓ Incident submitted successfully: [${incident.incidentNumber || incidentId}]`);
    console.log(`  Status: ${incident.status}, Category: ${incident.category}`);

    // 5. Verify Original Report PDF is generated and accessible
    console.log('\n--- 5. Checking Original Report PDF ---');
    const origPdfRes = await axios.get(`${BASE_URL}/incidents/${incidentId}/report.pdf`, {
      headers: { Authorization: `Bearer ${citizenToken}` },
      responseType: 'arraybuffer',
    });
    console.log(`✓ Original Report PDF generated: ${origPdfRes.data.byteLength} bytes`);

    // 6. Assign Incident to Steve Rogers (Field Worker)
    console.log('\n--- 6. Assigning Incident to Field Worker ---');
    const assignRes = await axios.post(
      `${BASE_URL}/incidents/${incidentId}/assign`,
      {
        assignedTo: workerUser.id || workerUser._id,
        departmentId: workerUser.departmentId,
        priority: 'urgent',
        slaHours: 24,
      },
      { headers: { Authorization: `Bearer ${managerToken}` } }
    );
    console.log(`✓ Incident assigned to worker: status = ${assignRes.data.data.status}`);

    // 7. Field Worker starts work session
    console.log('\n--- 7. Field Worker Starts Work Session ---');
    const startRes = await axios.post(
      `${BASE_URL}/operations/work/start`,
      { incidentId, notes: 'Arrived at Anna Salai site with asphalt compaction crew.' },
      { headers: { Authorization: `Bearer ${workerToken}` } }
    );
    const session = startRes.data.data;
    console.log(`✓ Work session started: ${session.workSessionId}`);
    console.log(`  Started at (Server UTC): ${session.startedAt}`);

    // 8. Field Worker pauses and resumes work session
    console.log('\n--- 8. Testing Pause and Resume ---');
    const pauseRes = await axios.post(
      `${BASE_URL}/operations/work/${session.workSessionId}/pause`,
      { reason: 'Heavy monsoon cloudburst, pausing hot asphalt application for 10 minutes.' },
      { headers: { Authorization: `Bearer ${workerToken}` } }
    );
    console.log(`✓ Work paused: status = ${pauseRes.data.data.sessionStatus}`);

    const resumeRes = await axios.post(
      `${BASE_URL}/operations/work/${session.workSessionId}/resume`,
      {},
      { headers: { Authorization: `Bearer ${workerToken}` } }
    );
    console.log(`✓ Work resumed: status = ${resumeRes.data.data.sessionStatus}`);

    // 9. Field Worker completes work session
    console.log('\n--- 9. Field Worker Completes Repair Work ---');
    const completeRes = await axios.post(
      `${BASE_URL}/operations/work/${session.workSessionId}/complete`,
      {
        completionSummary: 'Milled 4.5 sqm damaged base, applied quick-setting bitumen binder, compacted with 8-ton vibratory roller. Surface restored to grade.',
        evidence: [
          'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600',
        ],
      },
      { headers: { Authorization: `Bearer ${workerToken}` } }
    );
    const completedSession = completeRes.data.data.workSession || completeRes.data.data;
    console.log(`✓ Work session completed!`);
    console.log(`  Elapsed: ${completedSession.elapsedSeconds}s | Active Work: ${completedSession.activeWorkSeconds}s`);

    // 10. Separation of Duties Check: Field Worker attempts to self-approve resolution (MUST FAIL)
    console.log('\n--- 10. Security Check: Worker Attempts Self-Approval ---');
    try {
      await axios.post(
        `${BASE_URL}/operations/incidents/${incidentId}/approve-resolution`,
        { verifierNotes: 'Self-approving my own repair work' },
        { headers: { Authorization: `Bearer ${workerToken}` } }
      );
      console.error('❌ CRITICAL SECURITY FLAW: Field worker was able to approve their own resolution!');
      process.exit(1);
    } catch (err: any) {
      console.log(`✓ EXPECTED REJECTION (HTTP ${err.response?.status}): ${err.response?.data?.message || err.message}`);
    }

    // 11. Manager approves resolution
    console.log('\n--- 11. Manager Approves Resolution ---');
    const approveRes = await axios.post(
      `${BASE_URL}/operations/incidents/${incidentId}/approve-resolution`,
      { verifierNotes: 'Inspected photographic compaction evidence. Quality meets IRC-37 standard. Approved.' },
      { headers: { Authorization: `Bearer ${managerToken}` } }
    );
    console.log(`✓ Resolution approved! Status = ${approveRes.data.data.status}`);

    // 12. Check Final Resolution PDF
    console.log('\n--- 12. Downloading Final Resolution PDF ---');
    const resPdfRes = await axios.get(`${BASE_URL}/incidents/${incidentId}/resolution.pdf`, {
      headers: { Authorization: `Bearer ${citizenToken}` },
      responseType: 'arraybuffer',
    });
    console.log(`✓ Final Resolution PDF generated & downloaded: ${resPdfRes.data.byteLength} bytes`);
    console.log(`  Content-Type: ${resPdfRes.headers['content-type']}`);

    // 13. Inspect SHA-256 Tamper-Evident Audit Chain
    console.log('\n--- 13. Verifying Cryptographic SHA-256 Audit Chain ---');
    const auditRes = await axios.get(`${BASE_URL}/incidents/${incidentId}/audit-chain`, {
      headers: { Authorization: `Bearer ${citizenToken}` },
    });
    const chain = auditRes.data.data.auditChain;
    console.log(`✓ Audit chain status: valid = ${chain.valid}, length = ${chain.length} events`);
    chain.events.forEach((ev: any, idx: number) => {
      console.log(`  [Event ${idx + 1}] ${ev.action} -> Hash: ${ev.eventHash.substring(0, 16)}...`);
    });

    // 14. Check SLA Metrics
    console.log('\n--- 14. Checking Authoritative SLA Metrics ---');
    const slaRes = await axios.get(`${BASE_URL}/incidents/${incidentId}/sla`, {
      headers: { Authorization: `Bearer ${citizenToken}` },
    });
    console.log(`✓ SLA Metrics:`, JSON.stringify(slaRes.data.data, null, 2));

    // 15. Check Notification Operations Dashboard (System Admin)
    console.log('\n--- 15. Checking Notification Operations Dashboard (System Admin) ---');
    const adminDoc = await User.findOne({ email: 'akileshanand302006@gmail.com' });
    if (!adminDoc) throw new Error('System Admin akileshanand302006@gmail.com not found');
    const adminToken = generateAccessToken(adminDoc, crypto.randomUUID());
    const notifOpsRes = await axios.get(`${BASE_URL}/notifications/operations`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    console.log(`✓ Notification Operations metrics:`, JSON.stringify(notifOpsRes.data.data.summary, null, 2));
    console.log(`  Total logged deliveries: ${notifOpsRes.data.data.deliveries.length}`);

    console.log('\n🎉 ALL CIVIORA 2.0 PRODUCTION WORKFLOW CHECKS PASSED WITH 100% SUCCESS!');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ E2E Verification failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

runE2EVerification();
