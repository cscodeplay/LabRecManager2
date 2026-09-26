const prisma = require('../server/src/config/database');

async function verify() {
  console.log('=== VERIFYING DATABASE FOR PCS, CLASSES, AND GENDER DISTRIBUTIONS ===\n');

  // 1. Labs and 25 PCs per Lab
  console.log('--- 1. LABS & PC INVENTORY ---');
  const labs = await prisma.lab.findMany({
    where: { school: { code: 'DPS001' } },
    include: {
      items: {
        where: { itemType: 'pc' },
        orderBy: { itemNumber: 'asc' }
      }
    }
  });

  let allPcsCount = 0;
  for (const lab of labs) {
    allPcsCount += lab.items.length;
    console.log(`Lab: "${lab.name}" (${lab.roomNumber}) | PCs Count: ${lab.items.length}`);
    const samplePcs = lab.items.slice(0, 3).map(p => p.itemNumber).join(', ');
    const lastPcs = lab.items.slice(-2).map(p => p.itemNumber).join(', ');
    console.log(`   Sample PCs: [${samplePcs}, ... , ${lastPcs}] | Status: ${lab.items[0]?.status}`);
  }
  console.log(`Total active PCs across all labs: ${allPcsCount}\n`);

  // 2. Classes and Students per Class (30 Girls + 20 Boys)
  console.log('--- 2. CLASSES & GENDER BREAKDOWN PER CLASS ---');
  const academicYears = await prisma.academicYear.findMany({
    where: { school: { code: 'DPS001' } },
    orderBy: { startDate: 'desc' }
  });
  const currentYear = academicYears.find(y => y.isCurrent) || academicYears[0];
  console.log(`Session: ${currentYear.yearLabel} (${currentYear.id})`);

  const targetClassNames = ['11 NM A', '11 NM B', '11 Med A', '12 NM A', '12 NM B', '12 Med A'];

  for (const className of targetClassNames) {
    const cls = await prisma.class.findFirst({
      where: {
        school: { code: 'DPS001' },
        name: className,
        academicYearId: currentYear.id
      },
      include: {
        enrollments: {
          include: { student: true }
        },
        groups: {
          include: {
            assignedPc: true,
            members: { include: { student: true } }
          }
        }
      }
    });

    if (!cls) {
      console.log(`❌ Class not found: ${className}`);
      continue;
    }

    const girls = cls.enrollments.filter(e => e.student.gender === 'female');
    const boys = cls.enrollments.filter(e => e.student.gender === 'male');
    const total = cls.enrollments.length;

    console.log(`Class: ${cls.name.padEnd(10)} | Total Students: ${total} | Girls: ${girls.length} | Boys: ${boys.length} | Groups: ${cls.groups.length}`);

    // Show groups and assigned PCs
    cls.groups.forEach(g => {
      const pcInfo = g.assignedPc ? `${g.assignedPc.itemNumber} (${g.assignedPc.brand})` : 'No PC';
      console.log(`   Group: "${g.name}" -> Assigned PC: ${pcInfo} (${g.members.length} members)`);
    });
  }

  // 3. Total Student Count across school
  const totalStudents = await prisma.user.count({
    where: { role: 'student', school: { code: 'DPS001' } }
  });
  const girlsCount = await prisma.user.count({
    where: { role: 'student', gender: 'female', school: { code: 'DPS001' } }
  });
  const boysCount = await prisma.user.count({
    where: { role: 'student', gender: 'male', school: { code: 'DPS001' } }
  });

  console.log('\n--- 3. OVERALL SCHOOL TOTALS ---');
  console.log(`Total Students: ${totalStudents} (Girls: ${girlsCount}, Boys: ${boysCount})`);

  await prisma.$disconnect();
}

verify().catch(err => {
  console.error(err);
  process.exit(1);
});
