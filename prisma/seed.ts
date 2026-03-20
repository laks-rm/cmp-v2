import { PrismaClient, UserRole, SourceType, SourceCategory, SourceStatus, TaskFrequency, Priority, ReviewerLogic, AssignmentLogic } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Hash password for all users
  const passwordHash = await bcrypt.hash('password123', 12)

  // ===================================
  // 1. Create Groups
  // ===================================
  console.log('Creating groups...')
  
  const groupEU = await prisma.group.create({
    data: {
      name: 'Europe',
      code: 'EU',
      description: 'European entities',
      is_active: true,
    },
  })

  const groupME = await prisma.group.create({
    data: {
      name: 'Middle East',
      code: 'ME',
      description: 'Middle East entities',
      is_active: true,
    },
  })

  const groupAPAC = await prisma.group.create({
    data: {
      name: 'Asia Pacific',
      code: 'APAC',
      description: 'Asia Pacific entities',
      is_active: true,
    },
  })

  const groupLATAM = await prisma.group.create({
    data: {
      name: 'Latin America',
      code: 'LATAM',
      description: 'Latin America entities',
      is_active: true,
    },
  })

  const groupAfrica = await prisma.group.create({
    data: {
      name: 'Africa',
      code: 'AFRICA',
      description: 'Africa entities',
      is_active: true,
    },
  })

  console.log('✅ Created 5 groups')

  // ===================================
  // 2. Create Entities
  // ===================================
  console.log('Creating entities...')

  const entityDIEL = await prisma.entity.create({
    data: {
      name: 'Deriv Investments (Europe) Limited',
      code: 'DIEL',
      country_code: 'GB',
      country_flag_emoji: '🇬🇧',
      group_id: groupEU.id,
      is_active: true,
    },
  })

  const entityDMLT = await prisma.entity.create({
    data: {
      name: 'Deriv (Europe) Limited',
      code: 'DMLT',
      country_code: 'MT',
      country_flag_emoji: '🇲🇹',
      group_id: groupEU.id,
      is_active: true,
    },
  })

  const entityDFZC = await prisma.entity.create({
    data: {
      name: 'Deriv (FX) Limited',
      code: 'DFZC',
      country_code: 'AE',
      country_flag_emoji: '🇦🇪',
      group_id: groupME.id,
      is_active: true,
    },
  })

  const entityDJO = await prisma.entity.create({
    data: {
      name: 'Deriv Jordan Limited',
      code: 'DJO',
      country_code: 'JO',
      country_flag_emoji: '🇯🇴',
      group_id: groupME.id,
      is_active: true,
    },
  })

  const entityDCR = await prisma.entity.create({
    data: {
      name: 'Deriv (BVI) Ltd',
      code: 'DCR',
      country_code: 'VG',
      country_flag_emoji: '🇻🇬',
      group_id: groupAPAC.id,
      is_active: true,
    },
  })

  const entityDLAB = await prisma.entity.create({
    data: {
      name: 'Deriv (V) Ltd',
      code: 'DLAB',
      country_code: 'LK',
      country_flag_emoji: '🇱🇰',
      group_id: groupAPAC.id,
      is_active: true,
    },
  })

  const entityDMY = await prisma.entity.create({
    data: {
      name: 'Deriv Malaysia Sdn Bhd',
      code: 'DMY',
      country_code: 'MY',
      country_flag_emoji: '🇲🇾',
      group_id: groupAPAC.id,
      is_active: true,
    },
  })

  const entityDPY = await prisma.entity.create({
    data: {
      name: 'Deriv Paraguay S.A.',
      code: 'DPY',
      country_code: 'PY',
      country_flag_emoji: '🇵🇾',
      group_id: groupLATAM.id,
      is_active: true,
    },
  })

  const entityDRW = await prisma.entity.create({
    data: {
      name: 'Deriv Rwanda Ltd',
      code: 'DRW',
      country_code: 'RW',
      country_flag_emoji: '🇷🇼',
      group_id: groupAfrica.id,
      is_active: true,
    },
  })

  console.log('✅ Created 9 entities')

  // ===================================
  // 3. Create Departments
  // ===================================
  console.log('Creating departments...')

  const deptCompliance = await prisma.department.create({
    data: {
      name: 'Compliance Operations',
      code: 'COMP',
      is_active: true,
    },
  })

  const deptAML = await prisma.department.create({
    data: {
      name: 'AML/CFT',
      code: 'AML',
      is_active: true,
    },
  })

  const deptRisk = await prisma.department.create({
    data: {
      name: 'Risk Management',
      code: 'RISK',
      is_active: true,
    },
  })

  const deptLegal = await prisma.department.create({
    data: {
      name: 'Legal',
      code: 'LEGAL',
      is_active: true,
    },
  })

  const deptFinance = await prisma.department.create({
    data: {
      name: 'Finance',
      code: 'FIN',
      is_active: true,
    },
  })

  console.log('✅ Created 5 departments')

  // ===================================
  // 4. Create Users
  // ===================================
  console.log('Creating users...')

  const userLaks = await prisma.user.create({
    data: {
      email: 'laks.r@deriv.com',
      password_hash: passwordHash,
      name: 'Laks R.',
      department_id: deptCompliance.id,
      team: 'Platform',
      role: UserRole.SUPER_ADMIN,
      is_active: true,
    },
  })

  const userSarah = await prisma.user.create({
    data: {
      email: 'sarah.m@deriv.com',
      password_hash: passwordHash,
      name: 'Sarah M.',
      department_id: deptCompliance.id,
      team: 'Operations',
      role: UserRole.CMP_MANAGER,
      is_active: true,
      manager_id: userLaks.id,
    },
  })

  const userJohn = await prisma.user.create({
    data: {
      email: 'john.d@deriv.com',
      password_hash: passwordHash,
      name: 'John D.',
      department_id: deptAML.id,
      team: 'Monitoring',
      role: UserRole.REVIEWER,
      is_active: true,
    },
  })

  const userAli = await prisma.user.create({
    data: {
      email: 'ali.k@deriv.com',
      password_hash: passwordHash,
      name: 'Ali K.',
      department_id: deptAML.id,
      team: 'Operations',
      role: UserRole.PIC,
      is_active: true,
      manager_id: userJohn.id,
    },
  })

  const userMaria = await prisma.user.create({
    data: {
      email: 'maria.t@deriv.com',
      password_hash: passwordHash,
      name: 'Maria T.',
      department_id: deptRisk.id,
      team: 'Compliance',
      role: UserRole.REVIEWER,
      is_active: true,
    },
  })

  console.log('✅ Created 5 users')

  // Grant entity access to users
  console.log('Granting entity access to users...')

  await prisma.userEntityAccess.createMany({
    data: [
      { user_id: userLaks.id, entity_id: entityDIEL.id },
      { user_id: userLaks.id, entity_id: entityDMLT.id },
      { user_id: userLaks.id, entity_id: entityDFZC.id },
      { user_id: userLaks.id, entity_id: entityDJO.id },
      { user_id: userLaks.id, entity_id: entityDCR.id },
      { user_id: userLaks.id, entity_id: entityDLAB.id },
      { user_id: userLaks.id, entity_id: entityDMY.id },
      { user_id: userLaks.id, entity_id: entityDPY.id },
      { user_id: userLaks.id, entity_id: entityDRW.id },
      { user_id: userSarah.id, entity_id: entityDIEL.id },
      { user_id: userSarah.id, entity_id: entityDMLT.id },
      { user_id: userSarah.id, entity_id: entityDFZC.id },
      { user_id: userJohn.id, entity_id: entityDIEL.id },
      { user_id: userJohn.id, entity_id: entityDMLT.id },
      { user_id: userAli.id, entity_id: entityDIEL.id },
      { user_id: userAli.id, entity_id: entityDMLT.id },
      { user_id: userMaria.id, entity_id: entityDIEL.id },
    ],
  })

  console.log('✅ Granted entity access')

  // ===================================
  // 5. Create Source 1: AML Transaction Monitoring
  // ===================================
  console.log('Creating Source 1: AML Transaction Monitoring...')

  const source1 = await prisma.source.create({
    data: {
      code: 'SRC-001',
      title: 'AML Transaction Monitoring',
      source_type: SourceType.REGULATION,
      category: SourceCategory.AML,
      description: 'Ongoing transaction monitoring requirements for AML compliance including STR reporting and system calibration.',
      department_id: deptAML.id,
      effective_from: new Date('2024-01-01'),
      pic_user_id: userAli.id,
      reviewer_user_id: userJohn.id,
      risk_level: 'HIGH',
      tags: ['AML', 'Transaction Monitoring', 'STR', 'High Risk'],
      status: SourceStatus.ACTIVE,
      version_number: 1,
      created_by: userSarah.id,
      archived: false,
    },
  })

  // Link entities to source 1
  await prisma.sourceEntity.createMany({
    data: [
      { source_id: source1.id, entity_id: entityDIEL.id },
      { source_id: source1.id, entity_id: entityDMLT.id },
    ],
  })

  // Create clauses for source 1
  const clause1_1 = await prisma.clause.create({
    data: {
      source_id: source1.id,
      source_version: 1,
      clause_number: 'STR-01',
      title: 'STR Reporting Requirements',
      description: 'Suspicious Transaction Reports must be filed with the relevant authority within prescribed timeframes. All supporting documentation must be retained.',
      sequence_order: 1,
      is_active: true,
      ai_generated: false,
    },
  })

  const clause1_2 = await prisma.clause.create({
    data: {
      source_id: source1.id,
      source_version: 1,
      clause_number: 'TM-02',
      title: 'Transaction Monitoring Calibration',
      description: 'Transaction monitoring systems must be calibrated quarterly to ensure effectiveness in detecting suspicious patterns.',
      sequence_order: 2,
      is_active: true,
      ai_generated: false,
    },
  })

  // Create task templates for clause 1.1
  const today = new Date()
  today.setHours(0, 0, 0, 0) // Set to start of day

  await prisma.taskTemplate.create({
    data: {
      clause_id: clause1_1.id,
      source_id: source1.id,
      title: 'Review and submit STR reports',
      description: 'Review all flagged suspicious transactions from the monitoring system and submit STRs as required.',
      frequency: TaskFrequency.MONTHLY,
      frequency_config: { day_of_month: 5 },
      due_date_offset_days: 0,
      review_required: true,
      reviewer_logic: ReviewerLogic.SOURCE_REVIEWER,
      evidence_required: true,
      evidence_description: 'Upload copies of submitted STR forms and supporting documentation.',
      expected_outcome: 'All identified suspicious transactions reported to authorities with complete documentation.',
      priority: Priority.HIGH,
      assignment_logic: AssignmentLogic.FIXED_PIC,
      reminder_days_before: [7, 3, 1],
      escalation_days_after: 2,
      escalation_to: 'Department Manager',
      is_active: true,
      ai_generated: false,
      sequence_order: 1,
      first_execution_date: today,
      next_due_date: today,
    },
  })

  await prisma.taskTemplate.create({
    data: {
      clause_id: clause1_1.id,
      source_id: source1.id,
      title: 'Verify STR filing confirmations',
      description: 'Confirm receipt of acknowledgments from authorities for all submitted STRs.',
      frequency: TaskFrequency.MONTHLY,
      frequency_config: { day_of_month: 20 },
      due_date_offset_days: 0,
      review_required: true,
      reviewer_logic: ReviewerLogic.SOURCE_REVIEWER,
      evidence_required: true,
      evidence_description: 'Upload confirmation receipts from regulatory authorities.',
      expected_outcome: 'All STR submissions acknowledged by authorities.',
      priority: Priority.MEDIUM,
      assignment_logic: AssignmentLogic.FIXED_PIC,
      reminder_days_before: [3, 1],
      escalation_days_after: 3,
      escalation_to: 'Department Manager',
      is_active: true,
      ai_generated: false,
      sequence_order: 2,
      first_execution_date: today,
      next_due_date: today,
    },
  })

  // Create task template for clause 1.2
  await prisma.taskTemplate.create({
    data: {
      clause_id: clause1_2.id,
      source_id: source1.id,
      title: 'Quarterly TM system calibration review',
      description: 'Review transaction monitoring system rules and thresholds. Update scenarios based on typologies and risk assessment.',
      frequency: TaskFrequency.QUARTERLY,
      frequency_config: { month_of_quarter: 1 },
      due_date_offset_days: 0,
      review_required: true,
      reviewer_logic: ReviewerLogic.DEPT_MANAGER,
      evidence_required: true,
      evidence_description: 'Upload calibration report, updated rules documentation, and approval from senior management.',
      expected_outcome: 'TM system rules and thresholds updated and approved.',
      priority: Priority.HIGH,
      assignment_logic: AssignmentLogic.FIXED_PIC,
      reminder_days_before: [7, 3],
      escalation_days_after: 5,
      escalation_to: 'CMP Manager',
      is_active: true,
      ai_generated: false,
      sequence_order: 1,
      first_execution_date: today,
      next_due_date: today,
    },
  })

  console.log('✅ Created Source 1 with 2 clauses and 3 task templates')

  // ===================================
  // 6. Create Source 2: GDPR Data Protection Review
  // ===================================
  console.log('Creating Source 2: GDPR Data Protection Review...')

  const source2 = await prisma.source.create({
    data: {
      code: 'SRC-002',
      title: 'GDPR Data Protection Review',
      source_type: SourceType.REGULATION,
      category: SourceCategory.DATA_PROTECTION,
      description: 'General Data Protection Regulation compliance monitoring for data subject rights and data processing activities.',
      department_id: deptCompliance.id,
      effective_from: new Date('2024-01-01'),
      pic_user_id: null,
      reviewer_user_id: userMaria.id,
      risk_level: 'MEDIUM',
      tags: ['GDPR', 'Data Protection', 'Privacy', 'EU'],
      status: SourceStatus.DRAFT,
      version_number: 1,
      created_by: userSarah.id,
      archived: false,
    },
  })

  // Link entity to source 2
  await prisma.sourceEntity.create({
    data: {
      source_id: source2.id,
      entity_id: entityDIEL.id,
    },
  })

  // Create clauses for source 2
  const clause2_1 = await prisma.clause.create({
    data: {
      source_id: source2.id,
      source_version: 1,
      clause_number: 'Art.15',
      title: 'Right of Access',
      description: 'Data subjects have the right to obtain confirmation as to whether personal data is being processed and access to such data.',
      sequence_order: 1,
      is_active: true,
      ai_generated: false,
    },
  })

  const clause2_2 = await prisma.clause.create({
    data: {
      source_id: source2.id,
      source_version: 1,
      clause_number: 'Art.17',
      title: 'Right to Erasure',
      description: 'Data subjects have the right to obtain erasure of personal data concerning them without undue delay under certain circumstances.',
      sequence_order: 2,
      is_active: true,
      ai_generated: false,
    },
  })

  // Create task template for clause 2.1
  await prisma.taskTemplate.create({
    data: {
      clause_id: clause2_1.id,
      source_id: source2.id,
      title: 'Process data access requests',
      description: 'Review and respond to all data subject access requests within the required 30-day timeframe.',
      frequency: TaskFrequency.MONTHLY,
      frequency_config: { day_of_month: 10 },
      due_date_offset_days: 0,
      review_required: true,
      reviewer_logic: ReviewerLogic.SOURCE_REVIEWER,
      evidence_required: true,
      evidence_description: 'Upload copies of access requests received, responses sent, and data provided to subjects.',
      expected_outcome: 'All access requests processed within 30 days with complete data disclosure.',
      priority: Priority.HIGH,
      assignment_logic: AssignmentLogic.DEPARTMENT_QUEUE,
      reminder_days_before: [7, 3, 1],
      escalation_days_after: 2,
      escalation_to: 'Department Manager',
      is_active: true,
      ai_generated: false,
      sequence_order: 1,
      first_execution_date: today,
      next_due_date: today,
    },
  })

  // Create task template for clause 2.2
  await prisma.taskTemplate.create({
    data: {
      clause_id: clause2_2.id,
      source_id: source2.id,
      title: 'Process erasure requests',
      description: 'Review and process data erasure (right to be forgotten) requests ensuring all systems are updated.',
      frequency: TaskFrequency.QUARTERLY,
      frequency_config: { month_of_quarter: 1 },
      due_date_offset_days: 0,
      review_required: true,
      reviewer_logic: ReviewerLogic.SOURCE_REVIEWER,
      evidence_required: true,
      evidence_description: 'Upload erasure request forms, deletion confirmation reports from all systems, and audit trail.',
      expected_outcome: 'All valid erasure requests processed with data removed from all systems.',
      priority: Priority.MEDIUM,
      assignment_logic: AssignmentLogic.DEPARTMENT_QUEUE,
      reminder_days_before: [7, 3],
      escalation_days_after: 3,
      escalation_to: 'CMP Manager',
      is_active: true,
      ai_generated: false,
      sequence_order: 1,
      first_execution_date: today,
      next_due_date: today,
    },
  })

  console.log('✅ Created Source 2 with 2 clauses and 2 task templates')

  // ===================================
  // 7. Create audit log entries for seed actions
  // ===================================
  console.log('Creating audit log entries...')

  await prisma.auditLog.createMany({
    data: [
      {
        user_id: userLaks.id,
        user_role: UserRole.SUPER_ADMIN,
        action_type: 'database_seeded',
        module: 'System',
        channel: 'SYSTEM',
        success: true,
        metadata: {
          groups_created: 5,
          entities_created: 9,
          departments_created: 5,
          users_created: 5,
          sources_created: 2,
        },
      },
      {
        user_id: userSarah.id,
        user_role: UserRole.CMP_MANAGER,
        action_type: 'source_created',
        module: 'Source',
        source_id: source1.id,
        channel: 'WEB',
        success: true,
        new_value: {
          code: source1.code,
          title: source1.title,
          status: source1.status,
        },
      },
      {
        user_id: userSarah.id,
        user_role: UserRole.CMP_MANAGER,
        action_type: 'source_created',
        module: 'Source',
        source_id: source2.id,
        channel: 'WEB',
        success: true,
        new_value: {
          code: source2.code,
          title: source2.title,
          status: source2.status,
        },
      },
    ],
  })

  console.log('✅ Created audit log entries')

  console.log('\n🎉 Database seed completed successfully!')
  console.log('\n📊 Summary:')
  console.log('   - 5 Groups (EU, ME, APAC, LATAM, Africa)')
  console.log('   - 9 Entities (DIEL, DMLT, DFZC, DJO, DCR, DLAB, DMY, DPY, DRW)')
  console.log('   - 5 Departments (Compliance, AML, Risk, Legal, Finance)')
  console.log('   - 5 Users (all password: password123)')
  console.log('   - 2 Sources with clauses and task templates')
  console.log('\n👤 Test Users:')
  console.log('   - laks.r@deriv.com (SUPER_ADMIN)')
  console.log('   - sarah.m@deriv.com (CMP_MANAGER)')
  console.log('   - john.d@deriv.com (REVIEWER)')
  console.log('   - ali.k@deriv.com (PIC)')
  console.log('   - maria.t@deriv.com (REVIEWER)')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Error during seed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
