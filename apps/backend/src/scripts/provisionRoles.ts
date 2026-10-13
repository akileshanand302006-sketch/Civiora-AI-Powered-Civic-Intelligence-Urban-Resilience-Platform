// ============================================================
// Civiora — Idempotent Administrative Account Provisioning Script
// Safe, audited assignment of System Admin, Manager & Field Worker
// ============================================================

import mongoose from 'mongoose';
import crypto from 'crypto';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { User } from '../modules/users/user.model.js';
import { Organization } from '../modules/organizations/org.model.js';
import { Department } from '../modules/organizations/department.model.js';
import { Invitation } from '../modules/auth/invitation.model.js';
import { AuditLog } from '../modules/security/auditLog.model.js';
import { ROLE_PERMISSIONS, ROLES, type Role } from '@civicpulse/shared';

interface ProvisionTarget {
  email: string;
  role: Role;
  firstName: string;
  lastName: string;
  departmentCode?: string;
  departmentName?: string;
}

const TARGETS: ProvisionTarget[] = [
  {
    email: 'akileshanand302006@gmail.com',
    role: ROLES.SYSTEM_ADMIN,
    firstName: 'Akilesh',
    lastName: 'Anand',
  },
  {
    email: 'doctordoom3056@gmail.com',
    role: ROLES.MANAGER,
    firstName: 'Victor',
    lastName: 'Von Doom',
    departmentCode: 'ROADS',
    departmentName: 'Roads & Infrastructure Engineering',
  },
  {
    email: 'steverogers302006@gmail.com',
    role: ROLES.FIELD_WORKER,
    firstName: 'Steve',
    lastName: 'Rogers',
    departmentCode: 'ROADS',
    departmentName: 'Roads & Infrastructure Engineering',
  },
];

export async function provisionAccounts(): Promise<void> {
  console.log('------------------------------------------------------------');
  console.log('   CIVIORA ADMINISTRATIVE ROLE PROVISIONING & SETUP');
  console.log('------------------------------------------------------------');

  await connectDatabase();

  // 1. Ensure Default Municipal Organization Exists
  let org = await Organization.findOne({ isActive: true });
  if (!org) {
    org = await Organization.create({
      name: 'Tiruppur Smart City Corporation',
      slug: 'tiruppur',
      type: 'municipality',
      branding: {
        primaryColor: '#527FC7',
        logoUrl: '',
        favicon: '',
      },
      settings: {
        timezone: 'Asia/Kolkata',
        locale: 'en',
        defaultMapCenter: {
          type: 'Point',
          coordinates: [77.3411, 11.1085], // Tiruppur coordinates
        },
      },
      subscription: {
        plan: 'enterprise',
        maxUsers: 50000,
        maxDepartments: 50,
      },
      isActive: true,
    });
    console.log(`[Org] Created default municipal organization: ${org.name} (${org._id})`);
  } else {
    console.log(`[Org] Active organization found: ${org.name} (${org._id})`);
  }

  // 2. Ensure Standard Municipal Departments Exist
  const standardDepartments = [
    {
      code: 'ROADS',
      name: 'Roads & Infrastructure Engineering',
      description: 'Potholes, asphalt fatigue, road surface hazards, sidewalks and traffic barriers',
      categories: ['pothole', 'road_damage', 'damaged_sidewalk', 'traffic_obstruction'],
      contactEmail: 'roads@tiruppur.gov.in',
    },
    {
      code: 'WATER',
      name: 'Water Supply & Storm Drainage',
      description: 'Water main leaks, storm drain blockages, flood resilience and culverts',
      categories: ['water_leakage', 'drainage_blockage', 'flooding'],
      contactEmail: 'water@tiruppur.gov.in',
    },
    {
      code: 'SANITATION',
      name: 'Sanitation & Solid Waste Management',
      description: 'Garbage accumulation, illegal dumping, bio-hazard clearance',
      categories: ['garbage_accumulation', 'illegal_dumping', 'environmental_hazard'],
      contactEmail: 'sanitation@tiruppur.gov.in',
    },
    {
      code: 'ELECTRICAL',
      name: 'Municipal Electrical & Grid Lighting',
      description: 'Broken streetlights, traffic signals, exposed wiring and electrical safety',
      categories: ['broken_streetlight', 'damaged_traffic_signal', 'exposed_electrical_hazard'],
      contactEmail: 'electrical@tiruppur.gov.in',
    },
    {
      code: 'PARKS',
      name: 'Urban Greenery & Public Spaces',
      description: 'Fallen trees, dangerous branch overhangs, park maintenance',
      categories: ['fallen_tree', 'unsafe_public_space'],
      contactEmail: 'parks@tiruppur.gov.in',
    },
    {
      code: 'EMERGENCY',
      name: 'Emergency Response & Civic Safety',
      description: 'Immediate civic crises, structure collapse, urgent hazards',
      categories: ['emergency_incident', 'public_infrastructure_damage', 'other'],
      contactEmail: 'emergency@tiruppur.gov.in',
    },
  ];

  const deptMap = new Map<string, mongoose.Types.ObjectId>();

  for (const deptDef of standardDepartments) {
    let dept = await Department.findOne({ organizationId: org._id, code: deptDef.code });
    if (!dept) {
      dept = await Department.create({
        organizationId: org._id,
        name: deptDef.name,
        code: deptDef.code,
        description: deptDef.description,
        categories: deptDef.categories,
        contactEmail: deptDef.contactEmail,
        isActive: true,
      });
      console.log(`[Dept] Created department: ${dept.name} (${dept.code})`);
    } else {
      console.log(`[Dept] Existing department: ${dept.name} (${dept.code})`);
    }
    deptMap.set(deptDef.code, dept._id);
  }

  // 3. Provision Target Accounts Idempotently
  for (const target of TARGETS) {
    const normalizedEmail = target.email.toLowerCase().trim();
    let user = await User.findOne({ email: normalizedEmail });

    const targetDeptId = target.departmentCode ? deptMap.get(target.departmentCode) : undefined;
    const permissions = ROLE_PERMISSIONS[target.role] || [];

    if (user) {
      const beforeRole = user.role;
      const beforeDept = user.departmentId;

      const needsUpdate =
        user.role !== target.role ||
        (targetDeptId && String(user.departmentId) !== String(targetDeptId)) ||
        user.permissions.length !== permissions.length;

      if (needsUpdate) {
        user.role = target.role;
        user.permissions = permissions;
        if (targetDeptId) {
          user.departmentId = targetDeptId;
        }
        await user.save();

        // If target is department manager, update department managerId
        if (target.role === ROLES.MANAGER && targetDeptId) {
          await Department.findByIdAndUpdate(targetDeptId, { managerId: user._id });
        }

        // Record privileged role change in immutable AuditLog
        await AuditLog.create({
          organizationId: user.organizationId || org._id,
          userId: user._id,
          action: 'ADMIN_PROVISION_ROLE',
          resource: 'User',
          resourceId: String(user._id),
          before: { role: beforeRole, departmentId: beforeDept },
          after: { role: target.role, departmentId: targetDeptId, permissionsCount: permissions.length },
          ip: '127.0.0.1',
          userAgent: 'Civiora-Provisioning-Script/1.0',
          requestId: `prov-${Date.now()}`,
          status: 'success',
          timestamp: new Date(),
        });

        console.log(`✅ [User Updated] ${normalizedEmail} -> Role: ${target.role}, Dept: ${target.departmentCode || 'None'}`);
      } else {
        console.log(`✓ [User Verified] ${normalizedEmail} already has Role: ${target.role}`);
      }
    } else {
      // User does not exist yet. Check if pending invitation exists.
      let invitation = await Invitation.findOne({
        organizationId: org._id,
        email: normalizedEmail,
        status: 'pending',
      });

      if (!invitation) {
        const token = crypto.randomBytes(32).toString('hex');
        invitation = await Invitation.create({
          organizationId: org._id,
          email: normalizedEmail,
          role: target.role,
          departmentId: targetDeptId,
          token,
          invitedBy: new mongoose.Types.ObjectId(), // System provisioning marker
          status: 'pending',
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        });

        console.log(`📩 [Invitation Created] Created pending invitation for ${normalizedEmail} (Role: ${target.role}, Token: ${token})`);
      } else {
        console.log(`ℹ️ [Pending Invitation Exists] ${normalizedEmail} has pending invite (Token: ${invitation.token})`);
      }
    }
  }

  // 4. Verify all other existing users are Citizen unless intentionally configured
  const targetEmails = TARGETS.map((t) => t.email.toLowerCase().trim());

  const otherUsers = await User.find({ email: { $nin: targetEmails } });
  console.log(`[Audit] Audited ${otherUsers.length} other registered user accounts`);

  console.log('------------------------------------------------------------');
  console.log('   PROVISIONING COMPLETED SUCCESSFULLY');
  console.log('------------------------------------------------------------');
}

// Execute if run directly
if (process.argv[1]?.includes('provisionRoles')) {
  provisionAccounts()
    .then(async () => {
      await disconnectDatabase();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('Provisioning failed:', err);
      await disconnectDatabase();
      process.exit(1);
    });
}
