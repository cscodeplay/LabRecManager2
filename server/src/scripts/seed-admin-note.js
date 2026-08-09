const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const admin = await prisma.user.findFirst({
        where: { role: 'admin' }
    });

    if (!admin) {
        console.log("No admin found, cannot seed note.");
        return;
    }

    const title = "App Features & Capabilities Overview";
    
    // Ensure we don't duplicate
    const existing = await prisma.adminNote.findFirst({
        where: { title: title }
    });
    if (existing) {
        console.log("Note already exists.");
        return;
    }

    const htmlContent = `
        <h2>App Features & Capabilities Overview</h2>
        <p>This note outlines the detailed functionalities of each major module in the Unified Lab Records Management System (ULRMS).</p>
        
        <h3>1. Users & Roles Management</h3>
        <ul>
            <li><strong>Roles:</strong> Supports multiple roles including Admin, Principal, Instructor, Lab Assistant, and Student.</li>
            <li><strong>Permissions:</strong> Granular control over what each role can access and perform.</li>
            <li><strong>Profiles:</strong> Comprehensive user profiles with academic and institutional information.</li>
        </ul>

        <h3>2. Classes & Timetable</h3>
        <ul>
            <li><strong>Class Management:</strong> Organize students into sections and groups.</li>
            <li><strong>Timetable:</strong> Schedule regular classes, labs, and assignments.</li>
            <li><strong>Calendar:</strong> Centralized view of all academic events, holidays, and milestones.</li>
        </ul>

        <h3>3. Virtual Learning & Collaboration</h3>
        <ul>
            <li><strong>Live Whiteboard:</strong> Interactive, real-time shared whiteboard with mathematical instruments (ruler, protractor, compass), drawing tools, shape tools, and media insertion.</li>
            <li><strong>Whiteboard Scheduling:</strong> Ability to schedule upcoming live classes with specific duration and permission settings.</li>
            <li><strong>Chat & Audience Controls:</strong> Instructors can manage chat during live sessions, monitor participant's audio/video status, and enforce permissions (e.g. kicking disruptive participants).</li>
            <li><strong>Recordings:</strong> Screen recording and archiving of whiteboard sessions for later playback.</li>
        </ul>

        <h3>4. Assignments & Submissions</h3>
        <ul>
            <li><strong>Creation:</strong> Instructors can distribute assignments, coding challenges, and lab tasks.</li>
            <li><strong>Submissions:</strong> Students submit their work (documents, code, logs).</li>
            <li><strong>Grading & Reviews:</strong> A dedicated pipeline to grade, comment, and provide feedback on student submissions.</li>
            <li><strong>Viva:</strong> Live video capabilities to conduct oral examinations and assessments.</li>
        </ul>

        <h3>5. Documents & Storage</h3>
        <ul>
            <li><strong>Cloud Storage:</strong> Secure storage space for institutional files, syllabi, and resources.</li>
            <li><strong>File Sharing:</strong> Controlled distribution of materials to specific groups or classes.</li>
        </ul>

        <h3>6. Infrastructure & Support</h3>
        <ul>
            <li><strong>Labs & PCs:</strong> Tracking of physical lab assets, PC assignments, and machine statuses.</li>
            <li><strong>Ticketing System:</strong> Students and staff can report issues (hardware, software, administrative) which are tracked and resolved by Admins.</li>
        </ul>

        <h3>7. Reporting & Logs</h3>
        <ul>
            <li><strong>Activity Logs:</strong> System-wide audit trails for security and usage tracking.</li>
            <li><strong>Reports:</strong> Analytics and dashboards showing attendance, performance metrics, and system utilization.</li>
            <li><strong>Admin Notes:</strong> Secure repository for internal administrative documentation, configuration details, and updates (like this note!).</li>
        </ul>
    `;

    await prisma.adminNote.create({
        data: {
            title,
            content: htmlContent,
            category: 'general',
            isPinned: true,
            authorId: admin.id
        }
    });

    console.log("Admin note seeded successfully.");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
