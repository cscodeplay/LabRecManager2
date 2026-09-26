const prisma = require('../server/src/config/database');

async function main() {
  console.log('🚀 Starting Seeding: 25 PCs per Lab, and 30 Girls + 20 Boys per Class...\n');

  // 1. Get or verify school
  let school = await prisma.school.findFirst({
    where: { code: 'DPS001' }
  });
  if (!school) {
    school = await prisma.school.findFirst();
  }
  if (!school) {
    throw new Error('No school found in database.');
  }
  console.log(`Using school: ${school.name} (${school.id})`);

  // 2. Get Academic Years for this school
  const academicYears = await prisma.academicYear.findMany({
    where: { schoolId: school.id },
    orderBy: { startDate: 'desc' }
  });
  const currentYear = academicYears.find(y => y.isCurrent) || academicYears[0];
  console.log(`Active session: ${currentYear.yearLabel} (${currentYear.id})`);

  // 3. SEED 25 PCs PER LAB
  console.log('\n--- SEEDING 25 PCs PER LAB ---');
  const labs = await prisma.lab.findMany({
    where: { schoolId: school.id }
  });
  console.log(`Found ${labs.length} labs: ${labs.map(l => l.name).join(', ')}`);

  const instructor = await prisma.user.findFirst({
    where: { schoolId: school.id, role: { in: ['instructor', 'admin'] } }
  });
  const instructorId = instructor?.id;

  const createdPcs = [];

  for (const lab of labs) {
    let prefix = 'PC';
    if (lab.name.toLowerCase().includes('physics')) prefix = 'PHY-PC';
    else if (lab.name.toLowerCase().includes('chem')) prefix = 'CHM-PC';
    else if (lab.name.toLowerCase().includes('comp')) prefix = 'CL1-PC';

    console.log(`Creating 25 PCs for lab: "${lab.name}" (Prefix: ${prefix})...`);

    for (let i = 1; i <= 25; i++) {
      const numStr = i.toString().padStart(2, '0');
      const itemNumber = `${prefix}-${numStr}`;
      const serialNo = `SN-${prefix}-${numStr}-${lab.roomNumber || 'R1'}`;
      const brand = i % 3 === 0 ? 'Lenovo' : (i % 2 === 0 ? 'HP' : 'Dell');
      const modelNo = brand === 'Dell' ? 'OptiPlex 7090' : (brand === 'HP' ? 'ProDesk 400 G7' : 'ThinkCentre M70q');

      const pc = await prisma.labItem.upsert({
        where: {
          labId_itemNumber: {
            labId: lab.id,
            itemNumber: itemNumber
          }
        },
        update: {
          schoolId: school.id,
          itemType: 'pc',
          status: 'active',
          brand,
          modelNo,
          serialNo,
          specs: {
            processor: 'Intel Core i7-11700 @ 2.50GHz',
            ram: '16GB DDR4',
            storage: '512GB NVMe SSD',
            os: 'Ubuntu 22.04 LTS / Windows 11 Pro',
            monitor: '24" Full HD IPS Display',
            graphics: 'Intel UHD Graphics 750'
          },
          quantity: 1,
          notes: `Workstation ${itemNumber} for student lab experiments and coding exercises.`
        },
        create: {
          labId: lab.id,
          schoolId: school.id,
          itemType: 'pc',
          itemNumber: itemNumber,
          brand,
          modelNo,
          serialNo,
          status: 'active',
          specs: {
            processor: 'Intel Core i7-11700 @ 2.50GHz',
            ram: '16GB DDR4',
            storage: '512GB NVMe SSD',
            os: 'Ubuntu 22.04 LTS / Windows 11 Pro',
            monitor: '24" Full HD IPS Display',
            graphics: 'Intel UHD Graphics 750'
          },
          quantity: 1,
          notes: `Workstation ${itemNumber} for student lab experiments and coding exercises.`,
          purchaseDate: new Date(),
          warrantyEnd: new Date(Date.now() + 730 * 24 * 60 * 60 * 1000)
        }
      });
      createdPcs.push(pc);
    }
    console.log(`✅ 25 PCs ready in "${lab.name}"`);
  }
  console.log(`Total PCs created across all labs: ${createdPcs.length}`);

  // 4. PREPARE 30 GIRLS AND 20 BOYS DATA TEMPLATES
  const femaleTemplates = [
    { first: 'Ananya', hindiFirst: 'अनन्या', last: 'Sharma', hindiLast: 'शर्मा' },
    { first: 'Diya', hindiFirst: 'दिया', last: 'Patel', hindiLast: 'पटेल' },
    { first: 'Ishita', hindiFirst: 'इशिता', last: 'Gupta', hindiLast: 'गुप्ता' },
    { first: 'Riya', hindiFirst: 'रिया', last: 'Singh', hindiLast: 'सिंह' },
    { first: 'Sneha', hindiFirst: 'स्नेहा', last: 'Reddy', hindiLast: 'रेड्डी' },
    { first: 'Pooja', hindiFirst: 'पूजा', last: 'Verma', hindiLast: 'वर्मा' },
    { first: 'Simran', hindiFirst: 'सिमरन', last: 'Kaur', hindiLast: 'कौर' },
    { first: 'Tanvi', hindiFirst: 'तन्वी', last: 'Joshi', hindiLast: 'जोशी' },
    { first: 'Kavya', hindiFirst: 'काव्या', last: 'Nair', hindiLast: 'नायर' },
    { first: 'Meera', hindiFirst: 'मीरा', last: 'Iyer', hindiLast: 'अय्यर' },
    { first: 'Shreya', hindiFirst: 'श्रेया', last: 'Sen', hindiLast: 'सेन' },
    { first: 'Neha', hindiFirst: 'नेहा', last: 'Bhatia', hindiLast: 'भाटिया' },
    { first: 'Aditi', hindiFirst: 'अदिति', last: 'Rao', hindiLast: 'राव' },
    { first: 'Priyanka', hindiFirst: 'प्रियंका', last: 'Das', hindiLast: 'दास' },
    { first: 'Khushi', hindiFirst: 'खुशी', last: 'Mehta', hindiLast: 'मेहता' },
    { first: 'Roshni', hindiFirst: 'रोशनी', last: 'Saxena', hindiLast: 'सक्सेना' },
    { first: 'Navya', hindiFirst: 'नव्या', last: 'Choudhary', hindiLast: 'चौधरी' },
    { first: 'Mansi', hindiFirst: 'मानसी', last: 'Agarwal', hindiLast: 'अग्रवाल' },
    { first: 'Jaspreet', hindiFirst: 'जसप्रीत', last: 'Kaur', hindiLast: 'कौर' },
    { first: 'Harleen', hindiFirst: 'हरलीन', last: 'Kaur', hindiLast: 'कौर' },
    { first: 'Avani', hindiFirst: 'अवनी', last: 'Deshmukh', hindiLast: 'देशमुख' },
    { first: 'Bhavya', hindiFirst: 'भव्या', last: 'Trivedi', hindiLast: 'त्रिवेदी' },
    { first: 'Chhavi', hindiFirst: 'छवि', last: 'Singhania', hindiLast: 'सिंघानिया' },
    { first: 'Drishti', hindiFirst: 'दृष्टि', last: 'Malhotra', hindiLast: 'मल्होत्रा' },
    { first: 'Esha', hindiFirst: 'ईशा', last: 'Pillai', hindiLast: 'पिल्लई' },
    { first: 'Gargi', hindiFirst: 'गार्गी', last: 'Mukherjee', hindiLast: 'मुखर्जी' },
    { first: 'Ishani', hindiFirst: 'ईशानी', last: 'Banerjee', hindiLast: 'बनर्जी' },
    { first: 'Jiya', hindiFirst: 'जिया', last: 'Kulkarni', hindiLast: 'कुलकर्णी' },
    { first: 'Kriti', hindiFirst: 'कृति', last: 'Menon', hindiLast: 'मेनन' },
    { first: 'Lavanya', hindiFirst: 'लावण्या', last: 'Jain', hindiLast: 'जैन' }
  ];

  const maleTemplates = [
    { first: 'Aarav', hindiFirst: 'आरव', last: 'Sharma', hindiLast: 'शर्मा' },
    { first: 'Rohan', hindiFirst: 'रोहन', last: 'Verma', hindiLast: 'वर्मा' },
    { first: 'Kabir', hindiFirst: 'कबीर', last: 'Mehta', hindiLast: 'मेहता' },
    { first: 'Vikram', hindiFirst: 'विक्रम', last: 'Malhotra', hindiLast: 'मल्होत्रा' },
    { first: 'Aditya', hindiFirst: 'आदित्य', last: 'Singh', hindiLast: 'सिंह' },
    { first: 'Manpreet', hindiFirst: 'मनप्रीत', last: 'Singh', hindiLast: 'सिंह' },
    { first: 'Gurpreet', hindiFirst: 'गुरप्रीत', last: 'Singh', hindiLast: 'सिंह' },
    { first: 'Aryan', hindiFirst: 'आर्यन', last: 'Kapoor', hindiLast: 'कपूर' },
    { first: 'Karan', hindiFirst: 'करण', last: 'Johar', hindiLast: 'जौहर' },
    { first: 'Yash', hindiFirst: 'यश', last: 'Khanna', hindiLast: 'खन्ना' },
    { first: 'Rahul', hindiFirst: 'राहुल', last: 'Gupta', hindiLast: 'गुप्ता' },
    { first: 'Arjun', hindiFirst: 'अर्जुन', last: 'Nair', hindiLast: 'नायर' },
    { first: 'Dev', hindiFirst: 'देव', last: 'Patel', hindiLast: 'पटेल' },
    { first: 'Kunal', hindiFirst: 'कुणाल', last: 'Bhatia', hindiLast: 'भाटिया' },
    { first: 'Sahil', hindiFirst: 'साहिल', last: 'Sethi', hindiLast: 'सेठी' },
    { first: 'Pranav', hindiFirst: 'प्रणव', last: 'Joshi', hindiLast: 'जोशी' },
    { first: 'Varun', hindiFirst: 'वरुण', last: 'Dhawan', hindiLast: 'धवन' },
    { first: 'Siddharth', hindiFirst: 'सिद्धार्थ', last: 'Roy', hindiLast: 'रॉय' },
    { first: 'Harshit', hindiFirst: 'हर्षित', last: 'Bansal', hindiLast: 'बंसल' },
    { first: 'Ritvik', hindiFirst: 'ऋत्विक', last: 'Soni', hindiLast: 'सोनी' }
  ];

  const studentPasswordHash = '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa'; // student123

  // 5. TARGET CLASSES: 11 NM A, 11 NM B, 11 Med A, 12 NM A, 12 NM B, 12 Med A
  const targetClassNames = [
    { name: '11 NM A', grade: 11, sec: 'A', stream: 'Non-Medical', tag: '11nma' },
    { name: '11 NM B', grade: 11, sec: 'B', stream: 'Non-Medical', tag: '11nmb' },
    { name: '11 Med A', grade: 11, sec: 'A', stream: 'Medical', tag: '11meda' },
    { name: '12 NM A', grade: 12, sec: 'A', stream: 'Non-Medical', tag: '12nma' },
    { name: '12 NM B', grade: 12, sec: 'B', stream: 'Non-Medical', tag: '12nmb' },
    { name: '12 Med A', grade: 12, sec: 'A', stream: 'Medical', tag: '12meda' }
  ];

  console.log('\n--- SEEDING AT LEAST 30 GIRLS AND 20 BOYS PER CLASS ---');

  for (const cDef of targetClassNames) {
    console.log(`\nProcessing Class: "${cDef.name}" (${cDef.grade}-${cDef.sec}, ${cDef.stream})...`);

    // Ensure class exists for each academic session
    const classesByYear = {};
    for (const yr of academicYears) {
      const cls = await prisma.class.upsert({
        where: {
          unique_class_name_per_school: {
            schoolId: school.id,
            name: cDef.name,
            academicYearId: yr.id
          }
        },
        update: {
          gradeLevel: cDef.grade,
          section: cDef.sec,
          stream: cDef.stream,
          maxStudents: 60
        },
        create: {
          schoolId: school.id,
          academicYearId: yr.id,
          name: cDef.name,
          gradeLevel: cDef.grade,
          section: cDef.sec,
          stream: cDef.stream,
          maxStudents: 60
        }
      });
      classesByYear[yr.id] = cls;
    }

    const currentClass = classesByYear[currentYear.id];

    // Seed 30 Girls for this class
    let roll = 1;
    const classGirls = [];
    for (let i = 0; i < femaleTemplates.length; i++) {
      const t = femaleTemplates[i];
      const rollStr = roll.toString().padStart(3, '0');
      const email = `${t.first.toLowerCase()}.${t.last.toLowerCase()}.${cDef.tag}.${rollStr}@dps.edu`;
      const admNo = `ADM-2025-${cDef.tag.toUpperCase()}-${rollStr}`;
      const stuId = `STU-2025-${cDef.tag.toUpperCase()}-${rollStr}`;

      const student = await prisma.user.upsert({
        where: { email },
        update: {
          role: 'student',
          gender: 'female',
          firstName: t.first,
          firstNameHindi: t.hindiFirst,
          lastName: t.last,
          lastNameHindi: t.hindiLast,
          admissionNumber: admNo,
          studentId: stuId,
          isActive: true,
          schoolId: school.id
        },
        create: {
          schoolId: school.id,
          email,
          passwordHash: studentPasswordHash,
          role: 'student',
          gender: 'female',
          firstName: t.first,
          firstNameHindi: t.hindiFirst,
          lastName: t.last,
          lastNameHindi: t.hindiLast,
          admissionNumber: admNo,
          studentId: stuId,
          isActive: true
        }
      });

      // Enroll in class
      await prisma.classEnrollment.upsert({
        where: {
          studentId_classId: {
            studentId: student.id,
            classId: currentClass.id
          }
        },
        update: {
          rollNumber: roll,
          status: 'active'
        },
        create: {
          studentId: student.id,
          classId: currentClass.id,
          rollNumber: roll,
          status: 'active',
          enrollmentDate: new Date()
        }
      });

      classGirls.push(student);
      roll++;
    }

    // Seed 20 Boys for this class
    const classBoys = [];
    for (let i = 0; i < maleTemplates.length; i++) {
      const t = maleTemplates[i];
      const rollStr = roll.toString().padStart(3, '0');
      const email = `${t.first.toLowerCase()}.${t.last.toLowerCase()}.${cDef.tag}.${rollStr}@dps.edu`;
      const admNo = `ADM-2025-${cDef.tag.toUpperCase()}-${rollStr}`;
      const stuId = `STU-2025-${cDef.tag.toUpperCase()}-${rollStr}`;

      const student = await prisma.user.upsert({
        where: { email },
        update: {
          role: 'student',
          gender: 'male',
          firstName: t.first,
          firstNameHindi: t.hindiFirst,
          lastName: t.last,
          lastNameHindi: t.hindiLast,
          admissionNumber: admNo,
          studentId: stuId,
          isActive: true,
          schoolId: school.id
        },
        create: {
          schoolId: school.id,
          email,
          passwordHash: studentPasswordHash,
          role: 'student',
          gender: 'male',
          firstName: t.first,
          firstNameHindi: t.hindiFirst,
          lastName: t.last,
          lastNameHindi: t.hindiLast,
          admissionNumber: admNo,
          studentId: stuId,
          isActive: true
        }
      });

      // Enroll in class
      await prisma.classEnrollment.upsert({
        where: {
          studentId_classId: {
            studentId: student.id,
            classId: currentClass.id
          }
        },
        update: {
          rollNumber: roll,
          status: 'active'
        },
        create: {
          studentId: student.id,
          classId: currentClass.id,
          rollNumber: roll,
          status: 'active',
          enrollmentDate: new Date()
        }
      });

      classBoys.push(student);
      roll++;
    }

    console.log(`✅ Class ${cDef.name}: Enrolled ${classGirls.length} Girls + ${classBoys.length} Boys = Total ${classGirls.length + classBoys.length} Students.`);

    // 6. CREATE GROUPS & ASSIGN PCs
    console.log(`  Setting up groups and PC assignments for ${cDef.name}...`);
    // Create 6 groups per class: 3 Girl groups and 3 Boy groups
    const groupsConfig = [
      { name: `${cDef.name} - Girl Team Alpha`, students: classGirls.slice(0, 5), gender: 'female' },
      { name: `${cDef.name} - Girl Team Beta`, students: classGirls.slice(5, 10), gender: 'female' },
      { name: `${cDef.name} - Girl Team Gamma`, students: classGirls.slice(10, 15), gender: 'female' },
      { name: `${cDef.name} - Boy Team Delta`, students: classBoys.slice(0, 5), gender: 'male' },
      { name: `${cDef.name} - Boy Team Epsilon`, students: classBoys.slice(5, 10), gender: 'male' },
      { name: `${cDef.name} - Boy Team Zeta`, students: classBoys.slice(10, 15), gender: 'male' }
    ];

    // Get computer lab PCs
    const compLabPcs = createdPcs.filter(p => p.itemNumber.startsWith('CL1-PC') || p.itemNumber.startsWith('PC'));

    for (let gIdx = 0; gIdx < groupsConfig.length; gIdx++) {
      const gConf = groupsConfig[gIdx];
      const assignedPc = compLabPcs[gIdx % compLabPcs.length];

      const group = await prisma.studentGroup.upsert({
        where: {
          unique_group_name_per_class: {
            classId: currentClass.id,
            name: gConf.name
          }
        },
        update: {
          description: `Practical lab and coding syndicate (${gConf.gender})`,
          assignedPcId: assignedPc ? assignedPc.id : null
        },
        create: {
          classId: currentClass.id,
          name: gConf.name,
          description: `Practical lab and coding syndicate (${gConf.gender})`,
          createdById: instructorId,
          assignedPcId: assignedPc ? assignedPc.id : null
        }
      });

      // Add group members
      for (let mIdx = 0; mIdx < gConf.students.length; mIdx++) {
        const member = gConf.students[mIdx];
        const role = mIdx === 0 ? 'leader' : 'member';
        await prisma.groupMember.upsert({
          where: {
            groupId_studentId: {
              groupId: group.id,
              studentId: member.id
            }
          },
          update: { role },
          create: {
            groupId: group.id,
            studentId: member.id,
            role
          }
        });
      }
    }
    console.log(`  ✅ 6 groups created with members and assigned PCs in ${cDef.name}`);
  }

  console.log('\n================================================================');
  console.log('🎉 COMPLETED SUCCESSFULLY!');
  console.log(`- 25 PCs created in each of the ${labs.length} labs (Total: ${createdPcs.length} PCs)`);
  console.log(`- 6 Classes (${targetClassNames.map(c => c.name).join(', ')})`);
  console.log(`- Each class has 30 Girls and 20 Boys (50 students per class, 300 total students)`);
  console.log(`- Student groups created and assigned workstations`);
  console.log('================================================================\n');

  await prisma.$disconnect();
}

main().catch(err => {
  console.error('Seeding encountered an error:', err);
  process.exit(1);
});
