const prisma = require('../server/src/config/database');

async function main() {
  console.log('🚀 Starting Seeding of Classes, 52 Students (32 Girls, 20 Boys), Groups, and Python Training Modules...');

  // 1. Get or verify school
  let school = await prisma.school.findFirst({
    where: { code: 'DPS001' }
  });

  if (!school) {
    school = await prisma.school.findFirst();
  }

  if (!school) {
    throw new Error('No school found in database. Please run seed_all_tables.sql first.');
  }

  console.log(`Using school: ${school.name} (${school.id})`);

  // 2. Get Academic Years for this school
  const academicYears = await prisma.academicYear.findMany({
    where: { schoolId: school.id },
    orderBy: { startDate: 'desc' }
  });

  const currentYear = academicYears.find(y => y.isCurrent) || academicYears[0];
  if (!currentYear) {
    throw new Error('No academic year found for school.');
  }
  console.log(`Active session: ${currentYear.yearLabel} (${currentYear.id})`);

  // 3. Get Instructors to assign as class teachers
  const instructors = await prisma.user.findMany({
    where: {
      schoolId: school.id,
      role: { in: ['instructor', 'admin'] }
    }
  });

  const teacher1 = instructors[0]?.id;
  const teacher2 = instructors[1]?.id || teacher1;

  // 4. Create Classes (11 NM A, 11 NM B, 11 Med A, 12 NM A, 12 NM B, 12 Med A)
  const classDefs = [
    { name: '11 NM A', nameHindi: '11 नॉन-मेडिकल ए', gradeLevel: 11, section: 'A', stream: 'Non-Medical', teacherId: teacher1 },
    { name: '11 NM B', nameHindi: '11 नॉन-मेडिकल बी', gradeLevel: 11, section: 'B', stream: 'Non-Medical', teacherId: teacher2 },
    { name: '11 Med A', nameHindi: '11 मेडिकल ए', gradeLevel: 11, section: 'A', stream: 'Medical', teacherId: teacher1 },
    { name: '12 NM A', nameHindi: '12 नॉन-मेडिकल ए', gradeLevel: 12, section: 'A', stream: 'Non-Medical', teacherId: teacher1 },
    { name: '12 NM B', nameHindi: '12 नॉन-मेडिकल बी', gradeLevel: 12, section: 'B', stream: 'Non-Medical', teacherId: teacher2 },
    { name: '12 Med A', nameHindi: '12 मेडिकल ए', gradeLevel: 12, section: 'A', stream: 'Medical', teacherId: teacher2 },
  ];

  const createdClasses = {};

  for (const c of classDefs) {
    // For each academic year, make sure class exists so switching sessions in UI always works
    for (const yr of academicYears) {
      const cls = await prisma.class.upsert({
        where: {
          unique_class_name_per_school: {
            schoolId: school.id,
            name: c.name,
            academicYearId: yr.id
          }
        },
        update: {
          nameHindi: c.nameHindi,
          gradeLevel: c.gradeLevel,
          section: c.section,
          stream: c.stream,
          classTeacherId: c.teacherId,
          maxStudents: 50
        },
        create: {
          schoolId: school.id,
          academicYearId: yr.id,
          name: c.name,
          nameHindi: c.nameHindi,
          gradeLevel: c.gradeLevel,
          section: c.section,
          stream: c.stream,
          classTeacherId: c.teacherId,
          maxStudents: 50
        }
      });
      if (yr.id === currentYear.id) {
        createdClasses[c.name] = cls;
      }
    }
    console.log(`✅ Class ready: ${c.name} (Grade ${c.gradeLevel}, Section ${c.section}, Stream ${c.stream})`);
  }

  // 5. Define 52 Students (32 Girls and 20 Boys)
  // bcrypt hash for 'student123'
  const studentPasswordHash = '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa';

  const girlsList = [
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
    { first: 'Lavanya', hindiFirst: 'लावण्या', last: 'Jain', hindiLast: 'जैन' },
    { first: 'Nandini', hindiFirst: 'नंदिनी', last: 'Mittal', hindiLast: 'मित्तल' },
    { first: 'Pallavi', hindiFirst: 'पल्लवी', last: 'Sethi', hindiLast: 'सेठी' }
  ];

  const boysList = [
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

  console.log(`\nCreating ${girlsList.length} Girls and ${boysList.length} Boys (Total: ${girlsList.length + boysList.length} students)...`);

  const createdStudents = [];
  let studentIndex = 1;

  // Function to create student
  async function createStudent(item, gender) {
    const numStr = studentIndex.toString().padStart(3, '0');
    const email = `${item.first.toLowerCase()}.${item.last.toLowerCase()}${studentIndex}@dps.edu`;
    const admNo = `ADM-2025-${numStr}`;
    const stuId = `STU-2025-${numStr}`;

    const student = await prisma.user.upsert({
      where: { email },
      update: {
        role: 'student',
        firstName: item.first,
        firstNameHindi: item.hindiFirst,
        lastName: item.last,
        lastNameHindi: item.hindiLast,
        gender: gender,
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
        firstName: item.first,
        firstNameHindi: item.hindiFirst,
        lastName: item.last,
        lastNameHindi: item.hindiLast,
        gender: gender,
        admissionNumber: admNo,
        studentId: stuId,
        isActive: true
      }
    });

    createdStudents.push({ ...student, gender });
    studentIndex++;
  }

  // Create girls first
  for (const girl of girlsList) {
    await createStudent(girl, 'female');
  }

  // Create boys
  for (const boy of boysList) {
    await createStudent(boy, 'male');
  }

  console.log(`✅ Successfully created ${createdStudents.length} students (${girlsList.length} girls, ${boysList.length} boys).`);

  // 6. Enroll Students into Classes
  // Distribute students evenly across 11 NM A, 11 NM B, 12 NM A, 12 NM B, 11 Med A, 12 Med A
  const targetClassNames = ['11 NM A', '11 NM B', '12 NM A', '12 NM B', '11 Med A', '12 Med A'];
  const studentsByClass = {};
  targetClassNames.forEach(name => studentsByClass[name] = []);

  createdStudents.forEach((stu, idx) => {
    const targetClass = targetClassNames[idx % targetClassNames.length];
    studentsByClass[targetClass].push(stu);
  });

  for (const className of targetClassNames) {
    const cls = createdClasses[className];
    const stus = studentsByClass[className];
    let roll = 1;
    for (const s of stus) {
      await prisma.classEnrollment.upsert({
        where: {
          studentId_classId: {
            studentId: s.id,
            classId: cls.id
          }
        },
        update: {
          rollNumber: roll,
          status: 'active'
        },
        create: {
          studentId: s.id,
          classId: cls.id,
          rollNumber: roll,
          status: 'active',
          enrollmentDate: new Date()
        }
      });
      roll++;
    }
    console.log(`✅ Enrolled ${stus.length} students into ${className}`);
  }

  // 7. Create Student Groups and Add Group Members
  console.log('\nCreating student groups and assigning group members...');

  const groupTemplates = [
    { className: '11 NM A', name: '11 NM A - Python Group Alpha', desc: 'Core Python syntax and algorithmic problem solving' },
    { className: '11 NM A', name: '11 NM A - Python Group Beta', desc: 'Data operations and procedural logic' },
    { className: '11 NM B', name: '11 NM B - Byte Knights', desc: 'Python control flow and looping challenges' },
    { className: '11 NM B', name: '11 NM B - CodeCrafters', desc: 'Mathematical modeling and logic builders' },
    { className: '12 NM A', name: '12 NM A - Turing Titans', desc: 'Advanced Python collections and dictionary structures' },
    { className: '12 NM A', name: '12 NM A - Binary Beasts', desc: 'Data structures, list comprehensions, and nested mapping' },
    { className: '12 NM B', name: '12 NM B - Logic Legends', desc: 'Set theory and tuple serialization in Python' },
    { className: '12 NM B', name: '12 NM B - Syntax Stars', desc: 'Practical lab assessments and viva preparation' }
  ];

  const createdGroups = [];

  for (const gt of groupTemplates) {
    const cls = createdClasses[gt.className];
    const classStus = studentsByClass[gt.className];
    if (!classStus || classStus.length === 0) continue;

    const group = await prisma.studentGroup.upsert({
      where: {
        unique_group_name_per_class: {
          classId: cls.id,
          name: gt.name
        }
      },
      update: {
        description: gt.desc
      },
      create: {
        classId: cls.id,
        name: gt.name,
        description: gt.desc,
        createdById: teacher1
      }
    });

    createdGroups.push(group);

    // Assign 4 students to this group
    const membersToAdd = classStus.slice(0, 4);
    for (let i = 0; i < membersToAdd.length; i++) {
      const member = membersToAdd[i];
      const role = i === 0 ? 'leader' : 'member';
      await prisma.groupMember.upsert({
        where: {
          groupId_studentId: {
            groupId: group.id,
            studentId: member.id
          }
        },
        update: {
          role
        },
        create: {
          groupId: group.id,
          studentId: member.id,
          role
        }
      });
    }
    console.log(`✅ Group ready: "${gt.name}" in ${gt.className} with ${membersToAdd.length} members`);
  }

  // 8. Create 3 Python Training Modules
  console.log('\nCreating Python Training Modules (Basics, Control Structures, Collections)...');

  // Module 1: Python Basics & Fundamentals
  const mod1 = await prisma.trainingModule.upsert({
    where: { id: '00000017-0000-0000-0000-000000000001' },
    update: {
      title: 'Python Basics & Fundamentals',
      titleHindi: 'पायथन मूल बातें और बुनियादी सिद्धांत',
      description: 'Master Python syntax, primitive types (int, float, str, bool), standard input/output, type casting, and arithmetic expressions.',
      language: 'python',
      boardAligned: 'CBSE',
      classLevel: 11,
      totalUnits: 2,
      totalExercises: 4,
      isPublished: true,
      academicYearId: currentYear.id
    },
    create: {
      id: '00000017-0000-0000-0000-000000000001',
      schoolId: school.id,
      academicYearId: currentYear.id,
      title: 'Python Basics & Fundamentals',
      titleHindi: 'पायथन मूल बातें और बुनियादी सिद्धांत',
      description: 'Master Python syntax, primitive types (int, float, str, bool), standard input/output, type casting, and arithmetic expressions.',
      language: 'python',
      boardAligned: 'CBSE',
      classLevel: 11,
      totalUnits: 2,
      totalExercises: 4,
      isPublished: true
    }
  });

  // Mod 1 Units
  const mod1Unit1 = await prisma.trainingUnit.upsert({
    where: { id: '00000018-0000-0000-0000-000000000001' },
    update: {
      title: 'Unit 1: Variables, Memory & Built-in Types',
      description: 'Understanding Python variables, dynamic typing, type conversion, and boolean evaluations.',
      expectedHours: 4,
      unlockThreshold: 80,
      sequenceOrder: 1
    },
    create: {
      id: '00000018-0000-0000-0000-000000000001',
      moduleId: mod1.id,
      unitNumber: 1,
      title: 'Unit 1: Variables, Memory & Built-in Types',
      description: 'Understanding Python variables, dynamic typing, type conversion, and boolean evaluations.',
      expectedHours: 4,
      unlockThreshold: 80,
      sequenceOrder: 1
    }
  });

  const mod1Unit2 = await prisma.trainingUnit.upsert({
    where: { id: '00000018-0000-0000-0000-000000000002' },
    update: {
      title: 'Unit 2: Standard I/O, Arithmetic & Comparison Operators',
      description: 'Interactive input with input(), formatted output with f-strings, arithmetic precedence, and relational operators.',
      expectedHours: 4,
      unlockThreshold: 80,
      sequenceOrder: 2
    },
    create: {
      id: '00000018-0000-0000-0000-000000000002',
      moduleId: mod1.id,
      unitNumber: 2,
      title: 'Unit 2: Standard I/O, Arithmetic & Comparison Operators',
      description: 'Interactive input with input(), formatted output with f-strings, arithmetic precedence, and relational operators.',
      expectedHours: 4,
      unlockThreshold: 80,
      sequenceOrder: 2
    }
  });

  // Exercises for Module 1
  await prisma.trainingExercise.upsert({
    where: { id: '00000019-0000-0000-0000-000000000001' },
    update: {
      title: 'Calculate Circle Area',
      description: 'Write a function get_circle_area(radius) that computes and returns the area of a circle with pi = 3.14159.',
      difficulty: 'easy',
      scaffoldLevel: 'guided',
      exerciseType: 'coding',
      starterCode: 'def get_circle_area(radius):\n    # Calculate and return circle area\n    pass',
      solutionCode: 'def get_circle_area(radius):\n    return 3.14159 * radius * radius',
      testCases: [{ input: '5', expected: '78.53975' }, { input: '10', expected: '314.159' }],
      hints: ['Use the formula Area = pi * r * r', 'Make sure to return the numeric float value.'],
      xpReward: 20
    },
    create: {
      id: '00000019-0000-0000-0000-000000000001',
      unitId: mod1Unit1.id,
      title: 'Calculate Circle Area',
      description: 'Write a function get_circle_area(radius) that computes and returns the area of a circle with pi = 3.14159.',
      difficulty: 'easy',
      scaffoldLevel: 'guided',
      exerciseType: 'coding',
      starterCode: 'def get_circle_area(radius):\n    # Calculate and return circle area\n    pass',
      solutionCode: 'def get_circle_area(radius):\n    return 3.14159 * radius * radius',
      testCases: [{ input: '5', expected: '78.53975' }, { input: '10', expected: '314.159' }],
      hints: ['Use the formula Area = pi * r * r', 'Make sure to return the numeric float value.'],
      xpReward: 20
    }
  });

  await prisma.trainingExercise.upsert({
    where: { id: '00000019-0000-0000-0000-000000000002' },
    update: {
      title: 'Celsius to Fahrenheit Converter',
      description: 'Write a function c_to_f(celsius) that returns Fahrenheit using F = (C * 9/5) + 32.',
      difficulty: 'easy',
      scaffoldLevel: 'independent',
      exerciseType: 'coding',
      starterCode: 'def c_to_f(celsius):\n    pass',
      solutionCode: 'def c_to_f(celsius):\n    return (celsius * 9/5) + 32',
      testCases: [{ input: '0', expected: '32.0' }, { input: '100', expected: '212.0' }],
      hints: ['Multiply celsius by 9/5 first, then add 32.'],
      xpReward: 25
    },
    create: {
      id: '00000019-0000-0000-0000-000000000002',
      unitId: mod1Unit2.id,
      title: 'Celsius to Fahrenheit Converter',
      description: 'Write a function c_to_f(celsius) that returns Fahrenheit using F = (C * 9/5) + 32.',
      difficulty: 'easy',
      scaffoldLevel: 'independent',
      exerciseType: 'coding',
      starterCode: 'def c_to_f(celsius):\n    pass',
      solutionCode: 'def c_to_f(celsius):\n    return (celsius * 9/5) + 32',
      testCases: [{ input: '0', expected: '32.0' }, { input: '100', expected: '212.0' }],
      hints: ['Multiply celsius by 9/5 first, then add 32.'],
      xpReward: 25
    }
  });

  // Module 2: Python Control Structures (Conditionals & Loops)
  const mod2 = await prisma.trainingModule.upsert({
    where: { id: '00000017-0000-0000-0000-000000000002' },
    update: {
      title: 'Python Control Structures: Conditionals & Loops',
      titleHindi: 'पायथन नियंत्रण संरचनाएं: स्थितियां और लूप',
      description: 'Master conditional logic (if-elif-else), while loops, for loops with range(), break, continue, and accumulator algorithms.',
      language: 'python',
      boardAligned: 'CBSE',
      classLevel: 11,
      totalUnits: 2,
      totalExercises: 4,
      isPublished: true,
      academicYearId: currentYear.id
    },
    create: {
      id: '00000017-0000-0000-0000-000000000002',
      schoolId: school.id,
      academicYearId: currentYear.id,
      title: 'Python Control Structures: Conditionals & Loops',
      titleHindi: 'पायथन नियंत्रण संरचनाएं: स्थितियां और लूप',
      description: 'Master conditional logic (if-elif-else), while loops, for loops with range(), break, continue, and accumulator algorithms.',
      language: 'python',
      boardAligned: 'CBSE',
      classLevel: 11,
      totalUnits: 2,
      totalExercises: 4,
      isPublished: true
    }
  });

  const mod2Unit1 = await prisma.trainingUnit.upsert({
    where: { id: '00000018-0000-0000-0000-000000000003' },
    update: {
      title: 'Unit 1: Decision Making & Branching (if-elif-else)',
      description: 'Boolean condition branching, logical operators (and, or, not), and nested conditions.',
      expectedHours: 4,
      unlockThreshold: 80,
      sequenceOrder: 1
    },
    create: {
      id: '00000018-0000-0000-0000-000000000003',
      moduleId: mod2.id,
      unitNumber: 1,
      title: 'Unit 1: Decision Making & Branching (if-elif-else)',
      description: 'Boolean condition branching, logical operators (and, or, not), and nested conditions.',
      expectedHours: 4,
      unlockThreshold: 80,
      sequenceOrder: 1
    }
  });

  const mod2Unit2 = await prisma.trainingUnit.upsert({
    where: { id: '00000018-0000-0000-0000-000000000004' },
    update: {
      title: 'Unit 2: Iteration with for & while Loops',
      description: 'Iterating with range(), while condition loops, loop termination with break, and skipping with continue.',
      expectedHours: 6,
      unlockThreshold: 80,
      sequenceOrder: 2
    },
    create: {
      id: '00000018-0000-0000-0000-000000000004',
      moduleId: mod2.id,
      unitNumber: 2,
      title: 'Unit 2: Iteration with for & while Loops',
      description: 'Iterating with range(), while condition loops, loop termination with break, and skipping with continue.',
      expectedHours: 6,
      unlockThreshold: 80,
      sequenceOrder: 2
    }
  });

  await prisma.trainingExercise.upsert({
    where: { id: '00000019-0000-0000-0000-000000000003' },
    update: {
      title: 'Leap Year Checker',
      description: 'Write a function is_leap_year(year) returning True if the year is a leap year, otherwise False.',
      difficulty: 'medium',
      scaffoldLevel: 'independent',
      exerciseType: 'coding',
      starterCode: 'def is_leap_year(year):\n    pass',
      solutionCode: 'def is_leap_year(year):\n    return (year % 4 == 0 and year % 100 != 0) or (year % 400 == 0)',
      testCases: [{ input: '2024', expected: 'True' }, { input: '1900', expected: 'False' }, { input: '2000', expected: 'True' }],
      hints: ['A year is leap if divisible by 4, except century years unless divisible by 400.'],
      xpReward: 30
    },
    create: {
      id: '00000019-0000-0000-0000-000000000003',
      unitId: mod2Unit1.id,
      title: 'Leap Year Checker',
      description: 'Write a function is_leap_year(year) returning True if the year is a leap year, otherwise False.',
      difficulty: 'medium',
      scaffoldLevel: 'independent',
      exerciseType: 'coding',
      starterCode: 'def is_leap_year(year):\n    pass',
      solutionCode: 'def is_leap_year(year):\n    return (year % 4 == 0 and year % 100 != 0) or (year % 400 == 0)',
      testCases: [{ input: '2024', expected: 'True' }, { input: '1900', expected: 'False' }, { input: '2000', expected: 'True' }],
      hints: ['A year is leap if divisible by 4, except century years unless divisible by 400.'],
      xpReward: 30
    }
  });

  await prisma.trainingExercise.upsert({
    where: { id: '00000019-0000-0000-0000-000000000004' },
    update: {
      title: 'Sum of Even Numbers',
      description: 'Write a function sum_even(n) returning the sum of all even numbers from 2 up to n inclusive.',
      difficulty: 'medium',
      scaffoldLevel: 'guided',
      exerciseType: 'coding',
      starterCode: 'def sum_even(n):\n    pass',
      solutionCode: 'def sum_even(n):\n    return sum(x for x in range(2, n + 1, 2))',
      testCases: [{ input: '10', expected: '30' }, { input: '20', expected: '110' }],
      hints: ['Use range(2, n + 1, 2) or iterate and check x % 2 == 0.'],
      xpReward: 25
    },
    create: {
      id: '00000019-0000-0000-0000-000000000004',
      unitId: mod2Unit2.id,
      title: 'Sum of Even Numbers',
      description: 'Write a function sum_even(n) returning the sum of all even numbers from 2 up to n inclusive.',
      difficulty: 'medium',
      scaffoldLevel: 'guided',
      exerciseType: 'coding',
      starterCode: 'def sum_even(n):\n    pass',
      solutionCode: 'def sum_even(n):\n    return sum(x for x in range(2, n + 1, 2))',
      testCases: [{ input: '10', expected: '30' }, { input: '20', expected: '110' }],
      hints: ['Use range(2, n + 1, 2) or iterate and check x % 2 == 0.'],
      xpReward: 25
    }
  });

  // Module 3: Python Collections (Lists, Tuples, Dictionaries, Sets)
  const mod3 = await prisma.trainingModule.upsert({
    where: { id: '00000017-0000-0000-0000-000000000003' },
    update: {
      title: 'Python Collections: Lists, Tuples, Dictionaries & Sets',
      titleHindi: 'पायथन संग्रह: सूचियाँ, टुपल्स, शब्दकोश और सेट',
      description: 'In-depth mastery of Python data structures: indexed lists, slicing, immutable tuples, key-value dictionaries, unique sets, and list comprehensions.',
      language: 'python',
      boardAligned: 'CBSE',
      classLevel: 12,
      totalUnits: 2,
      totalExercises: 4,
      isPublished: true,
      academicYearId: currentYear.id
    },
    create: {
      id: '00000017-0000-0000-0000-000000000003',
      schoolId: school.id,
      academicYearId: currentYear.id,
      title: 'Python Collections: Lists, Tuples, Dictionaries & Sets',
      titleHindi: 'पायथन संग्रह: सूचियाँ, टुपल्स, शब्दकोश और सेट',
      description: 'In-depth mastery of Python data structures: indexed lists, slicing, immutable tuples, key-value dictionaries, unique sets, and list comprehensions.',
      language: 'python',
      boardAligned: 'CBSE',
      classLevel: 12,
      totalUnits: 2,
      totalExercises: 4,
      isPublished: true
    }
  });

  const mod3Unit1 = await prisma.trainingUnit.upsert({
    where: { id: '00000018-0000-0000-0000-000000000005' },
    update: {
      title: 'Unit 1: Lists & Tuples in Python',
      description: 'Indexing, negative slicing, appending, inserting, list comprehensions, and tuple unpacking.',
      expectedHours: 5,
      unlockThreshold: 80,
      sequenceOrder: 1
    },
    create: {
      id: '00000018-0000-0000-0000-000000000005',
      moduleId: mod3.id,
      unitNumber: 1,
      title: 'Unit 1: Lists & Tuples in Python',
      description: 'Indexing, negative slicing, appending, inserting, list comprehensions, and tuple unpacking.',
      expectedHours: 5,
      unlockThreshold: 80,
      sequenceOrder: 1
    }
  });

  const mod3Unit2 = await prisma.trainingUnit.upsert({
    where: { id: '00000018-0000-0000-0000-000000000006' },
    update: {
      title: 'Unit 2: Dictionaries & Sets',
      description: 'Key-value mapping, dictionary methods (.get(), .keys(), .items()), frequency hashing, and set algebra (union, intersection).',
      expectedHours: 5,
      unlockThreshold: 80,
      sequenceOrder: 2
    },
    create: {
      id: '00000018-0000-0000-0000-000000000006',
      moduleId: mod3.id,
      unitNumber: 2,
      title: 'Unit 2: Dictionaries & Sets',
      description: 'Key-value mapping, dictionary methods (.get(), .keys(), .items()), frequency hashing, and set algebra (union, intersection).',
      expectedHours: 5,
      unlockThreshold: 80,
      sequenceOrder: 2
    }
  });

  await prisma.trainingExercise.upsert({
    where: { id: '00000019-0000-0000-0000-000000000005' },
    update: {
      title: 'Remove Duplicates While Preserving Order',
      description: 'Write a function deduplicate(items) that returns a new list containing elements in order without duplicates.',
      difficulty: 'medium',
      scaffoldLevel: 'independent',
      exerciseType: 'coding',
      starterCode: 'def deduplicate(items):\n    pass',
      solutionCode: 'def deduplicate(items):\n    seen = set()\n    return [x for x in items if not (x in seen or seen.add(x))]',
      testCases: [{ input: '[1, 2, 2, 3, 4, 3, 5]', expected: '[1, 2, 3, 4, 5]' }],
      hints: ['Use an auxiliary set to keep track of already seen items while iterating.'],
      xpReward: 35
    },
    create: {
      id: '00000019-0000-0000-0000-000000000005',
      unitId: mod3Unit1.id,
      title: 'Remove Duplicates While Preserving Order',
      description: 'Write a function deduplicate(items) that returns a new list containing elements in order without duplicates.',
      difficulty: 'medium',
      scaffoldLevel: 'independent',
      exerciseType: 'coding',
      starterCode: 'def deduplicate(items):\n    pass',
      solutionCode: 'def deduplicate(items):\n    seen = set()\n    return [x for x in items if not (x in seen or seen.add(x))]',
      testCases: [{ input: '[1, 2, 2, 3, 4, 3, 5]', expected: '[1, 2, 3, 4, 5]' }],
      hints: ['Use an auxiliary set to keep track of already seen items while iterating.'],
      xpReward: 35
    }
  });

  await prisma.trainingExercise.upsert({
    where: { id: '00000019-0000-0000-0000-000000000006' },
    update: {
      title: 'Word Frequency Counter',
      description: 'Write a function count_words(text) returning a dictionary mapping each lowercase word to its occurrence frequency.',
      difficulty: 'medium',
      scaffoldLevel: 'guided',
      exerciseType: 'coding',
      starterCode: 'def count_words(text):\n    pass',
      solutionCode: 'def count_words(text):\n    words = text.lower().split()\n    counts = {}\n    for w in words:\n        counts[w] = counts.get(w, 0) + 1\n    return counts',
      testCases: [{ input: '"apple banana apple orange banana apple"', expected: '{"apple": 3, "banana": 2, "orange": 1}' }],
      hints: ['Split text with .split(), then use a loop with counts.get(w, 0) + 1.'],
      xpReward: 35
    },
    create: {
      id: '00000019-0000-0000-0000-000000000006',
      unitId: mod3Unit2.id,
      title: 'Word Frequency Counter',
      description: 'Write a function count_words(text) returning a dictionary mapping each lowercase word to its occurrence frequency.',
      difficulty: 'medium',
      scaffoldLevel: 'guided',
      exerciseType: 'coding',
      starterCode: 'def count_words(text):\n    pass',
      solutionCode: 'def count_words(text):\n    words = text.lower().split()\n    counts = {}\n    for w in words:\n        counts[w] = counts.get(w, 0) + 1\n    return counts',
      testCases: [{ input: '"apple banana apple orange banana apple"', expected: '{"apple": 3, "banana": 2, "orange": 1}' }],
      hints: ['Split text with .split(), then use a loop with counts.get(w, 0) + 1.'],
      xpReward: 35
    }
  });

  console.log('✅ Created 3 comprehensive Python modules with units, exercises, test cases & solutions.');

  // 9. Assign Trainings to Classes and Groups
  console.log('\nAssigning Python training modules to classes and groups...');

  // Helper to assign module
  async function assignModuleToClasses(moduleObj, classesToAssign, groupsToAssign) {
    // 1. Create or update Assignment record of type 'training_module'
    const assignmentTitle = `Training: ${moduleObj.title}`;
    const subject = await prisma.subject.findFirst({ where: { schoolId: school.id } });

    let assign = await prisma.assignment.findFirst({
      where: {
        schoolId: school.id,
        trainingModuleId: moduleObj.id
      }
    });

    if (!assign) {
      assign = await prisma.assignment.create({
        data: {
          schoolId: school.id,
          subjectId: subject.id,
          createdById: teacher1,
          academicYearId: currentYear.id,
          title: assignmentTitle,
          assignmentType: 'training_module',
          trainingModuleId: moduleObj.id,
          description: moduleObj.description,
          aim: `Complete all interactive exercises in ${moduleObj.title}`,
          maxMarks: 100,
          passingMarks: 40,
          status: 'published',
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
      });
    }

    // 2. Add assignment targets for classes
    for (const c of classesToAssign) {
      const existing = await prisma.assignmentTarget.findFirst({
        where: {
          assignmentId: assign.id,
          targetType: 'class',
          targetClassId: c.id
        }
      });
      if (!existing) {
        await prisma.assignmentTarget.create({
          data: {
            assignmentId: assign.id,
            targetType: 'class',
            targetClassId: c.id,
            assignedById: teacher1,
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            isLocked: false
          }
        });
      }
    }

    // 3. Add assignment targets for groups
    for (const g of groupsToAssign) {
      const existing = await prisma.assignmentTarget.findFirst({
        where: {
          assignmentId: assign.id,
          targetType: 'group',
          targetGroupId: g.id
        }
      });
      if (!existing) {
        await prisma.assignmentTarget.create({
          data: {
            assignmentId: assign.id,
            targetType: 'group',
            targetGroupId: g.id,
            assignedById: teacher1,
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            isLocked: false
          }
        });
      }
    }

    console.log(`✅ Assigned "${moduleObj.title}" to ${classesToAssign.length} classes and ${groupsToAssign.length} groups.`);
  }

  // Assign Module 1 (Basics) to 11 NM A, 11 NM B, 11 Med A + groups
  const class11List = [createdClasses['11 NM A'], createdClasses['11 NM B'], createdClasses['11 Med A']].filter(Boolean);
  const groups11 = createdGroups.filter(g => g.name.includes('11 NM'));
  await assignModuleToClasses(mod1, class11List, groups11);

  // Assign Module 2 (Control Structures) to 11 NM A, 11 NM B, 12 NM A + groups
  const classControlList = [createdClasses['11 NM A'], createdClasses['11 NM B'], createdClasses['12 NM A']].filter(Boolean);
  await assignModuleToClasses(mod2, classControlList, groups11);

  // Assign Module 3 (Collections) to 12 NM A, 12 NM B, 12 Med A + groups
  const class12List = [createdClasses['12 NM A'], createdClasses['12 NM B'], createdClasses['12 Med A']].filter(Boolean);
  const groups12 = createdGroups.filter(g => g.name.includes('12 NM'));
  await assignModuleToClasses(mod3, class12List, groups12);

  // 10. Seed Student Progress & Mastery
  console.log('\nSeeding student training progress and unit mastery...');
  const first10Students = createdStudents.slice(0, 15);

  for (let i = 0; i < first10Students.length; i++) {
    const s = first10Students[i];
    const progressPct = 40 + (i * 4);
    const xp = 100 + (i * 25);
    const streak = 1 + (i % 7);

    await prisma.studentTrainingProgress.upsert({
      where: {
        studentId_moduleId: {
          studentId: s.id,
          moduleId: mod1.id
        }
      },
      update: {
        overallProgress: progressPct,
        totalXP: xp,
        streak: streak,
        currentUnitId: mod1Unit1.id,
        lastActiveAt: new Date()
      },
      create: {
        studentId: s.id,
        moduleId: mod1.id,
        currentUnitId: mod1Unit1.id,
        overallProgress: progressPct,
        totalXP: xp,
        streak: streak
      }
    });

    await prisma.studentUnitMastery.upsert({
      where: {
        studentId_unitId: {
          studentId: s.id,
          unitId: mod1Unit1.id
        }
      },
      update: {
        masteryScore: 85.0 + (i % 15),
        exercisesDone: 2,
        status: 'mastered'
      },
      create: {
        studentId: s.id,
        unitId: mod1Unit1.id,
        masteryScore: 85.0 + (i % 15),
        exercisesDone: 2,
        status: 'mastered'
      }
    });
  }

  console.log('✅ Seeded live student progress records.');

  console.log('\n================================================================');
  console.log('🎉 COMPLETED SUCCESSFULLY!');
  console.log(`- Classes: ${Object.keys(createdClasses).join(', ')}`);
  console.log(`- Total Students: ${createdStudents.length} (Girls: ${girlsList.length}, Boys: ${boysList.length})`);
  console.log(`- Enrolled in: 11 NM A, 11 NM B, 11 Med A, 12 NM A, 12 NM B, 12 Med A`);
  console.log(`- Groups Created: ${createdGroups.length}`);
  console.log(`- Modules Created & Assigned: Python Basics, Control Structures, Collections`);
  console.log('================================================================\n');

  await prisma.$disconnect();
}

main().catch(err => {
  console.error('Seeding encountered an error:', err);
  process.exit(1);
});
