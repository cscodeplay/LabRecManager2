const prisma = require('../server/src/config/database');

async function verify() {
  console.log('=== VERIFYING SEEDED DATABASE ===\n');

  // 1. Classes & Enrollments
  const classes = await prisma.class.findMany({
    where: { school: { code: 'DPS001' } },
    include: { enrollments: true, groups: { include: { members: true } } },
    orderBy: { name: 'asc' }
  });

  console.log('--- CLASSES ---');
  for (const c of classes) {
    console.log(`Class: ${c.name.padEnd(12)} | Grade: ${c.gradeLevel} | Sec: ${c.section} | Enrolled Students: ${c.enrollments.length} | Groups: ${c.groups.length}`);
    for (const g of c.groups) {
      console.log(`   Group: "${g.name}" (${g.members.length} members)`);
    }
  }

  // 2. Students & Gender Ratio
  const studentsByGender = await prisma.user.groupBy({
    by: ['gender'],
    where: { role: 'student', school: { code: 'DPS001' } },
    _count: { id: true }
  });

  const totalStudents = await prisma.user.count({
    where: { role: 'student', school: { code: 'DPS001' } }
  });

  console.log('\n--- STUDENTS GENDER BREAKDOWN ---');
  console.log(`Total Students: ${totalStudents}`);
  studentsByGender.forEach(g => {
    console.log(`- ${g.gender || 'unspecified'}: ${g._count.id}`);
  });

  // 3. Sample 5 students
  const sampleStudents = await prisma.user.findMany({
    where: { role: 'student', school: { code: 'DPS001' } },
    take: 5,
    orderBy: { admissionNumber: 'asc' },
    select: { id: true, firstName: true, lastName: true, email: true, gender: true, admissionNumber: true, studentId: true }
  });
  console.log('\n--- SAMPLE STUDENTS ---');
  sampleStudents.forEach(s => {
    console.log(`[${s.admissionNumber}] ${s.firstName} ${s.lastName} (${s.gender}) - ${s.email}`);
  });

  // 4. Training Modules & Exercises
  const modules = await prisma.trainingModule.findMany({
    include: {
      units: {
        include: { exercises: true },
        orderBy: { unitNumber: 'asc' }
      },
      assignments: {
        include: { targets: true }
      }
    },
    orderBy: { createdAt: 'asc' }
  });

  console.log('\n--- TRAINING MODULES ---');
  for (const m of modules) {
    const totalEx = m.units.reduce((acc, u) => acc + u.exercises.length, 0);
    const totalTargets = m.assignments.reduce((acc, a) => acc + a.targets.length, 0);
    console.log(`Module: "${m.title}" (Lang: ${m.language}, Level: ${m.classLevel})`);
    console.log(`  Units: ${m.units.length} | Exercises: ${totalEx} | Assignments: ${m.assignments.length} | Target Classes/Groups: ${totalTargets}`);
    for (const u of m.units) {
      console.log(`    ${u.title} (${u.exercises.length} exercises: ${u.exercises.map(e => e.title).join(', ')})`);
    }
  }

  // 5. Progress & Mastery
  const progressCount = await prisma.studentTrainingProgress.count();
  const masteryCount = await prisma.studentUnitMastery.count();
  console.log('\n--- PROGRESS & MASTERY METRICS ---');
  console.log(`Student Training Progress records: ${progressCount}`);
  console.log(`Student Unit Mastery records: ${masteryCount}`);

  await prisma.$disconnect();
}

verify().catch(err => {
  console.error(err);
  process.exit(1);
});
