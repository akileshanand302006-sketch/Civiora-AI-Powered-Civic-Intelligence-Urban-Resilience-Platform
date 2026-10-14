// ============================================================
// Civiora — Enterprise MongoDB Atlas Database Seed Script
// Fully Idempotent • All 9 Operational Personas • Digital Twin Assets
// ============================================================

import dns from 'dns';
try {
  dns.setDefaultResultOrder('ipv4first');
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {}

import argon2 from 'argon2';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { initializeDatabaseIndexes } from '../config/initIndexes.js';
import { Organization } from '../modules/organizations/org.model.js';
import { Department } from '../modules/organizations/department.model.js';
import { User } from '../modules/users/user.model.js';
import { Incident } from '../modules/incidents/incident.model.js';
import { Zone } from '../modules/locations/zone.model.js';
import { InfrastructureAsset } from '../modules/locations/infrastructure.model.js';
import { SLAPolicy } from '../modules/operations/sla.model.js';
import { Assignment } from '../modules/operations/assignment.model.js';
import { WorkerAvailability } from '../modules/operations/workerAvailability.model.js';
import { Notification } from '../modules/notifications/notification.model.js';
import { AuditLog } from '../modules/security/auditLog.model.js';
import { ROLE_PERMISSIONS, type Role } from '@civicpulse/shared';
import { logger } from '../utils/logger.js';

const DEMO_PASSWORD = 'CivicPulse@2026';

const DEMO_ORG = {
  name: 'Metropolis Smart Municipality',
  slug: 'metropolis',
  type: 'municipality' as const,
  branding: {
    primaryColor: '#527FC7',
    logoUrl: '',
    favicon: '',
  },
  settings: {
    timezone: 'Asia/Kolkata',
    locale: 'en',
    defaultMapCenter: {
      type: 'Point' as const,
      coordinates: [77.0279, 11.0289] as [number, number], // Coimbatore / Metropolis Core
    },
    defaultMapZoom: 14,
    locationPrecisionPublic: 200,
    evidenceRetentionDays: 365,
    autoEscalationEnabled: true,
  },
  subscription: {
    plan: 'enterprise' as const,
    maxUsers: 10000,
    maxDepartments: 50,
  },
  isActive: true,
};

const DEPARTMENTS = [
  { name: 'Roads & Infrastructure', code: 'ROAD', categories: ['pothole', 'road_damage', 'sidewalk_hazard'] },
  { name: 'Water & Storm Drainage', code: 'WATER', categories: ['flooding', 'drainage_overflow', 'water_pipe_burst'] },
  { name: 'Electrical & Power Grid', code: 'ELEC', categories: ['broken_streetlight', 'fallen_powerline', 'transformer_spark'] },
  { name: 'Emergency Disaster Dispatch', code: 'EMERG', categories: ['emergency', 'fire_hazard', 'gas_leak', 'building_collapse'] },
  { name: 'Sanitation & Environment', code: 'SANIT', categories: ['garbage_accumulation', 'illegal_dumping', 'hazardous_waste'] },
];

interface DemoUser {
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  deptCode?: string;
}

const DEMO_USERS: DemoUser[] = [
  { email: 'akileshanand302006@gmail.com', firstName: 'Akilesh', lastName: 'Anand', role: 'system_admin' },
  { email: 'doctordoom3056@gmail.com', firstName: 'Doctor', lastName: 'Doom', role: 'manager', deptCode: 'ROAD' },
  { email: 'steverogers302006@gmail.com', firstName: 'Steve', lastName: 'Rogers', role: 'field_worker', deptCode: 'ROAD' },
  { email: 'citizen@civicpulse.demo', firstName: 'Priya', lastName: 'Sharma', role: 'citizen' },
  { email: 'worker@civicpulse.demo', firstName: 'Rajesh', lastName: 'Kumar', role: 'field_worker', deptCode: 'ROAD' },
  { email: 'officer@civicpulse.demo', firstName: 'Anita', lastName: 'Patel', role: 'officer', deptCode: 'ROAD' },
  { email: 'manager@civicpulse.demo', firstName: 'Vikram', lastName: 'Singh', role: 'manager', deptCode: 'ROAD' },
  { email: 'emergency@civicpulse.demo', firstName: 'Meera', lastName: 'Nair', role: 'emergency_operator', deptCode: 'EMERG' },
  { email: 'moderator@civicpulse.demo', firstName: 'Arjun', lastName: 'Reddy', role: 'moderator' },
  { email: 'tenant@civicpulse.demo', firstName: 'Deepa', lastName: 'Iyer', role: 'tenant_admin' },
  { email: 'admin@civicpulse.demo', firstName: 'Suresh', lastName: 'Menon', role: 'system_admin' },
  { email: 'auditor@civicpulse.demo', firstName: 'Kavitha', lastName: 'Rao', role: 'security_auditor' },
];

export async function runDatabaseSeed(): Promise<void> {
  logger.info('🌱 Starting Civiora MongoDB Atlas database seed...');

  await connectDatabase();
  await initializeDatabaseIndexes();

  // 1. Upsert Organization
  const org = await Organization.findOneAndUpdate(
    { slug: DEMO_ORG.slug },
    { $set: DEMO_ORG },
    { upsert: true, new: true }
  );
  logger.info(`✅ Organization verified: ${org.name} (${org.slug})`);

  // 2. Upsert Departments
  const departmentMap = new Map<string, any>();
  for (const dept of DEPARTMENTS) {
    const d = await Department.findOneAndUpdate(
      { organizationId: org._id, code: dept.code },
      {
        $set: {
          name: dept.name,
          categories: dept.categories,
          contactEmail: `${dept.code.toLowerCase()}@metropolis.gov`,
          isActive: true,
        },
      },
      { upsert: true, new: true }
    );
    departmentMap.set(dept.code, d);
  }
  logger.info(`✅ ${departmentMap.size} Municipal departments verified`);

  // 3. Upsert SLA Policies
  const slaConfigs = [
    { name: 'Road Infrastructure SLA', category: 'pothole', priority: 'medium', responseTime: 60, resolutionTime: 240 },
    { name: 'Storm Drainage Flood SLA', category: 'flooding', priority: 'high', responseTime: 20, resolutionTime: 120 },
    { name: 'Emergency Transformer SLA', category: 'emergency', priority: 'critical', isEmergency: true, responseTime: 10, resolutionTime: 60 },
  ];

  for (const sla of slaConfigs) {
    await SLAPolicy.findOneAndUpdate(
      { organizationId: org._id, category: sla.category, priority: sla.priority },
      {
        $set: {
          name: sla.name,
          isEmergency: sla.isEmergency || false,
          responseTimeMinutes: sla.responseTime,
          resolutionTimeMinutes: sla.resolutionTime,
          escalationRules: [
            { level: 1, afterMinutes: 30, notifyRoles: ['field_worker'] },
            { level: 2, afterMinutes: 90, notifyRoles: ['officer', 'manager'] },
          ],
          isActive: true,
        },
      },
      { upsert: true }
    );
  }
  logger.info('✅ Municipal SLA Policies verified');

  // 4. Hash standard demo password
  const passwordHash = await argon2.hash(DEMO_PASSWORD, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  // 5. Upsert Users
  const userMap = new Map<string, any>();
  for (const demoUser of DEMO_USERS) {
    const deptId = demoUser.deptCode ? departmentMap.get(demoUser.deptCode)?._id : undefined;

    const user = await User.findOneAndUpdate(
      { organizationId: org._id, email: demoUser.email },
      {
        $set: {
          passwordHash,
          profile: {
            firstName: demoUser.firstName,
            lastName: demoUser.lastName,
          },
          role: demoUser.role,
          permissions: ROLE_PERMISSIONS[demoUser.role] || [],
          departmentId: deptId,
          trust: {
            score: 82,
            verifiedReports: 14,
            falseReports: 0,
            spamFlags: 0,
            lastUpdated: new Date(),
          },
          security: {
            mfaEnabled: false,
            emailVerified: true,
            failedLoginAttempts: 0,
            lastPasswordChange: new Date(),
          },
          savedLocations: [
            {
              name: 'Home (Central Sector)',
              type: 'home',
              location: {
                type: 'Point',
                coordinates: [77.0279, 11.0289],
                formattedAddress: 'Central Avenue & 5th Cross Road, Metropolis',
                city: 'Coimbatore',
                state: 'Tamil Nadu',
                country: 'India',
              },
              isDefault: true,
              createdAt: new Date(),
            },
          ],
          isActive: true,
        },
      },
      { upsert: true, new: true }
    );

    userMap.set(demoUser.role, user);
    logger.info(`  👤 Verified persona: ${demoUser.role.padEnd(18)} → ${demoUser.email}`);
  }

  // 6. Upsert Municipal Zones
  const zones = [
    { name: 'Central Commercial Plaza', code: 'ZONE-A1', type: 'sector', coords: [77.0279, 11.0289], risk: 42 },
    { name: 'Sector 4 Industrial Riverfront', code: 'ZONE-B4', type: 'flood_plain', coords: [77.0315, 11.0342], risk: 88 },
    { name: 'Tech Park Transportation Corridor', code: 'ZONE-C7', type: 'high_risk', coords: [77.0212, 11.0221], risk: 65 },
  ];

  for (const z of zones) {
    await Zone.findOneAndUpdate(
      { organizationId: org._id, code: z.code },
      {
        $set: {
          name: z.name,
          type: z.type,
          centroid: { type: 'Point', coordinates: z.coords },
          riskScore: z.risk,
          activeIncidentsCount: 3,
        },
      },
      { upsert: true }
    );
  }
  logger.info('✅ Municipal GIS Zones verified');

  // 7. Upsert Infrastructure Assets (3D Digital Twin)
  const infraAssets = [
    {
      assetId: 'INFRA-RD-402',
      name: 'Sector 4 Arterial Highway (Westbound)',
      type: 'roadway',
      rating: 68,
      coords: [77.0295, 11.0298],
      predictedRisk: 'Elevated - Pothole emergence predicted in 14 days',
    },
    {
      assetId: 'INFRA-DR-108',
      name: 'Central Storm Water Main Runoff',
      type: 'drainage_culvert',
      rating: 45,
      coords: [77.0312, 11.0335],
      predictedRisk: 'High - Heavy rain overflow risk',
    },
    {
      assetId: 'INFRA-TX-022',
      name: 'North Substation High Voltage Transformer 12-B',
      type: 'power_substation',
      rating: 89,
      coords: [77.0245, 11.0256],
      predictedRisk: 'Normal - Scheduled quarterly maintenance due',
    },
  ];

  for (const asset of infraAssets) {
    await InfrastructureAsset.findOneAndUpdate(
      { organizationId: org._id, assetId: asset.assetId },
      {
        $set: {
          name: asset.name,
          type: asset.type,
          conditionRating: asset.rating,
          location: {
            type: 'Point',
            coordinates: asset.coords,
            address: `${asset.name}, Metropolis Core`,
          },
          predictedFailureRisk: asset.predictedRisk,
          sensorReadings: {
            vibrationStrain: '0.42g (Normal)',
            subsurfaceMoisture: '78% (High saturation)',
            trafficFlow: '1,420 vehicles/hour',
          },
          status: asset.rating < 50 ? 'critical_maintenance' : 'operational',
        },
      },
      { upsert: true }
    );
  }
  logger.info('✅ 3D Digital Twin Infrastructure Assets verified');

  // 8. Upsert Seed Incidents
  const citizenUser = userMap.get('citizen') || Array.from(userMap.values())[0];
  const workerUser = userMap.get('field_worker');

  const seedIncidents: Array<{
    incidentNumber: string;
    category: string;
    title: string;
    description: string;
    status: string;
    priority: string;
    isEmergency: boolean;
    coords: [number, number];
    riskScore: number;
    riskLevel: string;
    address: string;
  }> = [
    {
      incidentNumber: 'CP-2026-X8K9',
      category: 'pothole',
      title: 'Monsoon Asphalt Breach on 4th Cross Road',
      description: 'Dangerous 1.8-meter asphalt fracture in center driving lane creating severe vehicular hazard.',
      status: 'in_progress',
      priority: 'high',
      isEmergency: false,
      coords: [77.0279, 11.0289],
      address: 'Avinashi Road, Peelamedu, Coimbatore, Tamil Nadu',
      riskScore: 78,
      riskLevel: 'high',
    },
    {
      incidentNumber: 'CP-2026-F2W1',
      category: 'flooding',
      title: 'Monsoon Drainage Overflow at Sector 7 Storm Runoff',
      description: 'Storm water drain breached after heavy localized rainfall. Water table overflowing into pedestrian walk.',
      status: 'assigned',
      priority: 'critical',
      isEmergency: true,
      coords: [77.0315, 11.0342],
      address: 'Civil Aerodrome Post, Coimbatore, Tamil Nadu',
      riskScore: 92,
      riskLevel: 'critical',
    },
    {
      incidentNumber: 'CP-2026-E5T8',
      category: 'broken_streetlight',
      title: 'Dark Corridor: Faulty LED Array at 12th Avenue',
      description: 'Sequential bank of streetlights offline for 48 hours creating night pedestrian security issue.',
      status: 'reported',
      priority: 'medium',
      isEmergency: false,
      coords: [76.9558, 11.0168],
      address: 'Gandhipuram Central, Coimbatore, Tamil Nadu',
      riskScore: 45,
      riskLevel: 'medium',
    },
    {
      incidentNumber: 'CP-2026-CHN1',
      category: 'flooding',
      title: 'Buckingham Canal Storm Surge Overflow',
      description: 'Tidal surge combined with heavy rainfall causing canal water overflow into commercial transit hub.',
      status: 'in_progress',
      priority: 'critical',
      isEmergency: true,
      coords: [80.2707, 13.0827],
      address: 'Rajaji Salai, George Town, Chennai, Tamil Nadu',
      riskScore: 94,
      riskLevel: 'critical',
    },
    {
      incidentNumber: 'CP-2026-CHN2',
      category: 'fallen_powerline',
      title: 'High-Voltage Cable Severed near Metro Pillar 140',
      description: 'Tree collapse caused exposed live high-voltage conductor on primary roadway.',
      status: 'assigned',
      priority: 'critical',
      isEmergency: true,
      coords: [80.245, 13.04],
      address: 'Anna Salai, T. Nagar, Chennai, Tamil Nadu',
      riskScore: 95,
      riskLevel: 'critical',
    },
    {
      incidentNumber: 'CP-2026-MDU1',
      category: 'water_pipe_burst',
      title: 'Arterial Potable Water Main Rupture',
      description: 'Major pressurized distribution main rupture flooding North Veli Street and depleting district pressure.',
      status: 'in_progress',
      priority: 'high',
      isEmergency: false,
      coords: [78.1198, 9.9252],
      address: 'North Veli Street, Madurai Central, Tamil Nadu',
      riskScore: 76,
      riskLevel: 'high',
    },
    {
      incidentNumber: 'CP-2026-TRY1',
      category: 'drainage_overflow',
      title: 'Kaveri River Embankment Culvert Blockage',
      description: 'Accumulated silt causing backflow into low-lying residential lanes adjacent to bypass.',
      status: 'reported',
      priority: 'high',
      isEmergency: false,
      coords: [78.7047, 10.7905],
      address: 'Cantonment Central, Tiruchirappalli, Tamil Nadu',
      riskScore: 72,
      riskLevel: 'high',
    },
    {
      incidentNumber: 'CP-2026-SLM1',
      category: 'road_damage',
      title: 'Expressway Flyover Expansion Joint Displacement',
      description: 'Structural joint displacement causing heavy vibration and tire damage on elevated corridor.',
      status: 'assigned',
      priority: 'medium',
      isEmergency: false,
      coords: [78.146, 11.6643],
      address: 'Omalur Main Road, Hasthampatti, Salem, Tamil Nadu',
      riskScore: 62,
      riskLevel: 'medium',
    },
    {
      incidentNumber: 'CP-2026-TPR1',
      category: 'illegal_dumping',
      title: 'Industrial Effluent Runoff into Storm Drain',
      description: 'Unauthorized textile chemical discharge observed in secondary drainage canal.',
      status: 'reported',
      priority: 'critical',
      isEmergency: true,
      coords: [77.3411, 11.1085],
      address: 'Kumaran Road, Tiruppur Industrial Zone, Tamil Nadu',
      riskScore: 89,
      riskLevel: 'critical',
    },
    {
      incidentNumber: 'CP-2026-NIL1',
      category: 'road_damage',
      title: 'Hill Highway Retaining Wall Minor Subsidence',
      description: 'Monsoon saturation weakened rock retaining wall on hairpin curve 9.',
      status: 'in_progress',
      priority: 'high',
      isEmergency: false,
      coords: [76.7032, 11.4102],
      address: 'Coonoor-Ooty Ghat Road, The Nilgiris, Tamil Nadu',
      riskScore: 81,
      riskLevel: 'high',
    },
    {
      incidentNumber: 'CP-2026-KK1',
      category: 'coastal_hazard' as any,
      title: 'Coastal Sea-Wall Breached by High Waves',
      description: 'Wave surges breached rock revetment threatening coastal promenade and fishing craft jetty.',
      status: 'assigned',
      priority: 'high',
      isEmergency: false,
      coords: [77.5385, 8.0883],
      address: 'Beach Road, Kanniyakumari Promenade, Tamil Nadu',
      riskScore: 75,
      riskLevel: 'high',
    },
    {
      incidentNumber: 'CP-2026-VEL1',
      category: 'transformer_spark',
      title: 'Distribution Transformer Thermal Overload Sparking',
      description: 'Audible arcing and smoking oil tank in dense market perimeter.',
      status: 'assigned',
      priority: 'critical',
      isEmergency: true,
      coords: [79.1325, 12.9165],
      address: 'Fort Round Road, Vellore Central, Tamil Nadu',
      riskScore: 91,
      riskLevel: 'critical',
    },
  ];


  for (const incData of seedIncidents) {
    const inc = await Incident.findOneAndUpdate(
      { organizationId: org._id, incidentNumber: incData.incidentNumber },
      {
        $set: {
          category: incData.category,
          title: incData.title,
          description: incData.description,
          status: incData.status,
          priority: incData.priority,
          isEmergency: incData.isEmergency,
          reportedBy: citizenUser._id,
          assignedTo: incData.status !== 'reported' ? workerUser?._id : undefined,
          location: {
            type: 'Point',
            coordinates: incData.coords,
            address: incData.address || `${incData.title}, Sector Core, Metropolis`,
            precisionLevel: 'exact',
            publicCoordinates: [incData.coords[0] + 0.001, incData.coords[1] + 0.001],
          },
          risk: {
            score: incData.riskScore,
            level: incData.riskLevel,
            factors: [
              { factor: 'Proximity to Critical Transit Corridor', weight: 0.4, explanation: 'Located on high-density arterial bus route' },
              { factor: 'Weather Warning Index', weight: 0.35, explanation: 'Monsoon precipitation forecast within 6 hours' },
            ],
            calculatedAt: new Date(),
          },
          ai: {
            category: incData.category,
            confidence: 0.964,
            severity: incData.riskLevel,
            detectedObjects: [incData.category, 'road surface degradation', 'transit hazard'],
            nlpExtraction: {
              category: incData.category,
              issue: incData.title,
              severity: incData.riskLevel,
              impact: 'Immediate municipal safety impairment',
              potentialRisk: 'Accident escalation during night transit',
            },
            processedAt: new Date(),
            modelVersion: 'Civiora-Vision-v2.6-Spatial',
          },
          communityVerification: {
            yesCount: 8,
            noCount: 0,
            unsureCount: 1,
            verificationScore: 89,
          },
          tags: ['monsoon-2026', 'priority-repair', 'gps-verified'],
        },
      },
      { upsert: true, new: true }
    );

    // Create corresponding field assignment for active incidents
    if (workerUser && (incData.status === 'assigned' || incData.status === 'in_progress')) {
      await Assignment.findOneAndUpdate(
        { organizationId: org._id, incidentId: inc._id },
        {
          $set: {
            assignedTo: workerUser._id,
            assignedBy: userMap.get('officer')?._id || citizenUser._id,
            status: incData.status,
            priority: incData.priority,
            notes: 'Dispatched to Quick Response Public Works crew.',
            slaDeadline: new Date(Date.now() + 3 * 60 * 60 * 1000),
            slaBreached: false,
            workerLocation: {
              type: 'Point',
              coordinates: [77.0275, 11.0285],
              updatedAt: new Date(),
            },
            timeline: [
              { status: 'assigned', timestamp: new Date(Date.now() - 3600000), notes: 'Assigned by Officer' },
              { status: 'accepted', timestamp: new Date(Date.now() - 2400000), notes: 'Field crew en route' },
            ],
          },
        },
        { upsert: true }
      );
    }
  }
  logger.info(`✅ ${seedIncidents.length} Municipal Incidents & Field Assignments verified`);

  // 9. Upsert Live Field Worker Telemetry
  if (workerUser) {
    await WorkerAvailability.findOneAndUpdate(
      { userId: workerUser._id },
      {
        $set: {
          organizationId: org._id,
          status: 'busy',
          currentLocation: {
            type: 'Point',
            coordinates: [77.0275, 11.0285],
            speedKmph: 24,
            batteryLevel: 88,
            updatedAt: new Date(),
          },
          activeWorkOrderCount: 2,
          lastHeartbeat: new Date(),
        },
      },
      { upsert: true }
    );
  }

  // 10. Upsert Notifications
  await Notification.create({
    userId: citizenUser._id,
    organizationId: org._id,
    type: 'incident_assigned',
    title: 'Work Order Dispatched: 4th Cross Asphalt Breach',
    message: 'Field crew (Rajesh Kumar) has been dispatched. Estimated arrival in 18 minutes.',
    channels: ['in_app'],
    isRead: false,
  }).catch(() => {});

  // 11. Upsert Audit Log
  await AuditLog.create({
    organizationId: org._id,
    userId: userMap.get('admin')?._id || citizenUser._id,
    action: 'SYSTEM_BOOTSTRAP',
    resource: 'DATABASE_SEED',
    resourceId: org._id.toString(),
    ip: '127.0.0.1',
    requestId: 'seed-init-' + Date.now(),
    status: 'success',
    timestamp: new Date(),
  }).catch(() => {});

  logger.info('');
  logger.info('╔══════════════════════════════════════════════════╗');
  logger.info('║  🌱 Civiora Atlas Database Seed Complete!       ║');
  logger.info('╠══════════════════════════════════════════════════╣');
  logger.info(`║  Database: ${org.name}`);
  logger.info(`║  Tenant Slug: ${org.slug}`);
  logger.info(`║  Verified Personas: ${DEMO_USERS.length}`);
  logger.info(`║  Master Passcode: ${DEMO_PASSWORD}`);
  logger.info('╚══════════════════════════════════════════════════╝');
}

/**
 * Ensures the three critical configured role accounts exist in MongoDB Atlas.
 * Runs idempotently on server bootstrap.
 */
export async function ensureConfiguredRoleAccounts(): Promise<void> {
  try {
    const org = await Organization.findOne({ slug: 'metropolis', isActive: true });
    if (!org) return;

    const passwordHash = await argon2.hash(DEMO_PASSWORD, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    const targetUsers: DemoUser[] = [
      { email: 'akileshanand302006@gmail.com', firstName: 'Akilesh', lastName: 'Anand', role: 'system_admin' },
      { email: 'doctordoom3056@gmail.com', firstName: 'Doctor', lastName: 'Doom', role: 'manager', deptCode: 'ROAD' },
      { email: 'steverogers302006@gmail.com', firstName: 'Steve', lastName: 'Rogers', role: 'field_worker', deptCode: 'ROAD' },
    ];

    for (const tu of targetUsers) {
      await User.findOneAndUpdate(
        { email: tu.email },
        {
          $setOnInsert: {
            organizationId: org._id,
            email: tu.email,
            passwordHash,
            profile: {
              firstName: tu.firstName,
              lastName: tu.lastName,
            },
            role: tu.role,
            permissions: ROLE_PERMISSIONS[tu.role] || [],
            trust: {
              score: 95,
              verifiedReports: 20,
              falseReports: 0,
              spamFlags: 0,
              lastUpdated: new Date(),
            },
            security: {
              mfaEnabled: false,
              emailVerified: true,
              failedLoginAttempts: 0,
              lastPasswordChange: new Date(),
            },
            isActive: true,
          },
        },
        { upsert: true }
      );
    }
    logger.info('✅ Verified configured role accounts for Civiora production');
  } catch (err: any) {
    logger.warn({ err: err.message }, 'Configured role account verification notice');
  }
}

// Execute directly if run as main
if (process.argv[1]?.includes('seed')) {
  runDatabaseSeed()
    .then(async () => {
      await disconnectDatabase();
      process.exit(0);
    })
    .catch((err) => {
      logger.error({ err }, 'Seed execution failed');
      process.exit(1);
    });
}
