# Lab Record Manager (LabRecManager)
# Comprehensive Test Cases: Multi-Table Analytical & Insights Reports

**Document Version:** 1.0  
**Target Environment:** Development / Staging / Production  
**Scope:** Cross-Table Analytical Reporting, Intelligent Multi-Entity Data Engine, Aggregation Pipelines, Export & Email Delivery  
**Authors:** Quality Assurance & Engineering Team  
**Last Updated:** October 2026  

---

## Table of Contents
1. [Executive Summary & Testing Objective](#1-executive-summary--testing-objective)
2. [Cross-Table Architectural Matrix & Schema Dependencies](#2-cross-table-architectural-matrix--schema-dependencies)
3. [Taxonomy of Analytical Reports & Insight Value](#3-taxonomy-of-analytical-reports--insight-value)
4. [Test Environment & Prerequisites](#4-test-environment--prerequisites)
5. [Detailed Test Cases by Report Domain](#5-detailed-test-cases-by-report-domain)
   - [5.1 Academic Performance & Student Roster Analytics](#51-academic-performance--student-roster-analytics)
   - [5.2 Lab Infrastructure, PC Allocation & Asset Health](#52-lab-infrastructure-pc-allocation--asset-health)
   - [5.3 Intelligent Unified Multi-Entity Joined Master Reports](#53-intelligent-unified-multi-entity-joined-master-reports)
   - [5.4 Lab Incident Helpdesk & SLA Resolution Analytics](#54-lab-incident-helpdesk--sla-resolution-analytics)
   - [5.5 Oral Viva Voce & Practical Exam Defense Reports](#55-oral-viva-voce--practical-exam-defense-reports)
   - [5.6 Institutional Fee Collection & Defaulter Analytics](#56-institutional-fee-collection--defaulter-analytics)
   - [5.7 Training Progression & Coding Mastery Analytics](#57-training-progression--coding-mastery-analytics)
   - [5.8 Storage Quota, Security Auditing & Query Logs](#58-storage-quota-security-auditing--query-logs)
   - [5.9 Export Fidelity, Column Customization & Email Delivery](#59-export-fidelity-column-customization--email-delivery)
6. [Boundary, Negative & Stress Test Scenarios](#6-boundary-negative--stress-test-scenarios)
7. [SQL / Prisma Verification Queries](#7-sql--prisma-verification-queries)
8. [Test Execution Matrix & Sign-Off Criteria](#8-test-execution-matrix--sign-off-criteria)

---

## 1. Executive Summary & Testing Objective

The **LabRecManager** reporting engine is designed to transform raw institutional data across disparate relational tables into actionable, executive-level insights for Administrators, Principals, and Lab Instructors. 

Rather than isolating records to single tables, the reporting engine performs complex relational joins across:
- **Academic operations** (`User`, `Class`, `ClassEnrollment`, `Assignment`, `Submission`, `Grade`)
- **Laboratory assets** (`Lab`, `LabItem`, `StudentGroup`, `GroupMember`, `ItemMaintenanceHistory`)
- **Incident management** (`Ticket`, `TicketIssueType`, `TicketComment`)
- **Skill mastery** (`TrainingModule`, `TrainingUnit`, `StudentTrainingProgress`, `CodingSubmission`)
- **Financial and administrative governance** (`StudentFee`, `FeePayment`, `Document`, `AuditLog`)

### Objectives of this Test Document
1. Validate data accuracy, mathematical aggregations (means, medians, rates, percentages), and referential integrity across multi-table joins.
2. Ensure reports deliver intended operational insights (e.g., student failure risk early detection, hardware failure bottlenecks, low inventory alerts, fee deficit recovery).
3. Verify security access controls (RBAC), multi-tenant isolation by `schoolId`, and academic term scoping (`academicYearId`).
4. Validate export fidelity (XLSX, CSV) and automated dispatch mechanisms (SMTP email delivery).

---

## 2. Cross-Table Architectural Matrix & Schema Dependencies

The table below outlines how relational tables are joined to generate specific institutional insights:

| Primary Domain | Joined Tables | Join Conditions & Foreign Keys | Key Actionable Insight |
| :--- | :--- | :--- | :--- |
| **Student Academic Roster** | `User` ⨝ `ClassEnrollment` ⨝ `Class` ⨝ `Submission` ⨝ `Grade` | `User.id = ClassEnrollment.studentId`<br>`ClassEnrollment.classId = Class.id`<br>`Submission.studentId = User.id`<br>`Grade.submissionId = Submission.id` | Pinpoints student GPA, submission completion rate, and identifies underperforming students. |
| **Class Summary & Demographics** | `Class` ⨝ `ClassEnrollment` ⨝ `User` ⨝ `StudentGroup` ⨝ `LabItem` | `Class.id = ClassEnrollment.classId`<br>`ClassEnrollment.studentId = User.id`<br>`StudentGroup.classId = Class.id`<br>`StudentGroup.assignedPcId = LabItem.id` | Evaluates classroom capacity, gender ratios (male/female breakdown), and lab workstation availability. |
| **Assignment Analytics** | `Assignment` ⨝ `AssignmentTarget` ⨝ `Class` ⨝ `Submission` ⨝ `Grade` | `Assignment.id = AssignmentTarget.assignmentId`<br>`AssignmentTarget.targetClassId = Class.id`<br>`Submission.assignmentId = Assignment.id`<br>`Grade.submissionId = Submission.id` | Measures curriculum difficulty, deadline adherence (on-time vs late), and average marks per experiment. |
| **Lab Hardware Utilization** | `LabItem` ⨝ `Lab` ⨝ `StudentGroup` ⨝ `GroupMember` ⨝ `User` | `LabItem.labId = Lab.id`<br>`StudentGroup.assignedPcId = LabItem.id`<br>`GroupMember.groupId = StudentGroup.id`<br>`GroupMember.studentId = User.id` | Uncovers hardware utilization rates, orphaned/idle PCs, and hardware sharing bottlenecks. |
| **Equipment Lifecycle & Maintenance** | `LabItem` ⨝ `Lab` ⨝ `ItemMaintenanceHistory` ⨝ `Vendor` | `LabItem.labId = Lab.id`<br>`ItemMaintenanceHistory.itemId = LabItem.id`<br>`LabItem.vendorId = Vendor.id` | Tracks Mean-Time-Between-Failures (MTBF), equipment repair costs, and warranty expiration alerts. |
| **Equipment Relocation Audit** | `EquipmentShiftRequest` ⨝ `EquipmentShiftHistory` ⨝ `LabItem` ⨝ `Lab` ⨝ `User` | `EquipmentShiftRequest.itemId = LabItem.id`<br>`EquipmentShiftRequest.fromLabId = Lab.id`<br>`EquipmentShiftRequest.requestedById = User.id` | Audits physical equipment movement between labs, preventing asset misplacement. |
| **Unified Institutional Master** | `User` ⨝ `ClassEnrollment` ⨝ `Class` ⨝ `StudentGroup` ⨝ `LabItem` ⨝ `Lab` ⨝ `Submission` ⨝ `Grade` | Comprehensive multi-way join executed in `report.service.js` | 360-degree institutional intelligence connecting each student to their class, group, physical PC, lab, and grades. |
| **Helpdesk & Incident SLA** | `Ticket` ⨝ `TicketIssueType` ⨝ `LabItem` ⨝ `Lab` ⨝ `User` ⨝ `TicketComment` | `Ticket.issueTypeId = TicketIssueType.id`<br>`Ticket.labItemId = LabItem.id`<br>`Ticket.labId = Lab.id`<br>`Ticket.createdById = User.id` | Evaluates Mean-Time-to-Resolve (MTTR), recurring equipment failures, and lab safety/infrastructure bugs. |
| **Viva Examination Defense** | `Meeting` ⨝ `MeetingParticipant` ⨝ `MeetingQuestion` ⨝ `Grade` ⨝ `User` | `Meeting.id = MeetingParticipant.meetingId`<br>`MeetingParticipant.userId = User.id`<br>`MeetingQuestion.meetingId = Meeting.id`<br>`Grade.submissionId = Submission.id` | Correlates practical code submission grades with live viva examination scores to measure genuine understanding. |
| **Fee Collection & Defaulters** | `StudentFee` ⨝ `FeeStructure` ⨝ `FeeCategory` ⨝ `FeePayment` ⨝ `User` ⨝ `Class` | `StudentFee.studentId = User.id`<br>`StudentFee.feeStructureId = FeeStructure.id`<br>`FeePayment.studentFeeId = StudentFee.id`<br>`ClassEnrollment.studentId = User.id` | Quantifies revenue realization, outstanding balance per student, and generates delinquent fee lists. |
| **Coding Skill Mastery** | `TrainingModule` ⨝ `TrainingUnit` ⨝ `StudentTrainingProgress` ⨝ `CodingSubmission` ⨝ `User` | `TrainingUnit.moduleId = TrainingModule.id`<br>`StudentTrainingProgress.unitId = TrainingUnit.id`<br>`CodingSubmission.studentId = User.id` | Discovers programming concepts where students struggle, language adoption, and exercise test failure rates. |
| **Storage & Security Governance** | `Document` ⨝ `DocumentFolder` ⨝ `School` ⨝ `AuditLog` ⨝ `User` | `Document.folderId = DocumentFolder.id`<br>`Document.schoolId = School.id`<br>`AuditLog.userId = User.id` | Audits quota limits against actual file bytes, detecting anomalous activity and unauthorized document sharing. |

---

## 3. Taxonomy of Analytical Reports & Insight Value

```
┌────────────────────────────────────────────────────────────────────────┐
│                        LabRecManager Reports Engine                    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
       ┌────────────────────────────┼────────────────────────────┐
       ▼                            ▼                            ▼
┌──────────────┐             ┌──────────────┐             ┌──────────────┐
│  Academic &  │             │     Lab      │             │  Unified 360 │
│  Curriculum  │             │Infrastructure│             │Master Matrix │
└──────┬───────┘             └──────┬───────┘             └──────┬───────┘
       │                            │                            │
       ├─ Grade Distribution        ├─ PC Seat Matrix            ├─ Student+PC+
       ├─ Top Performers            ├─ Hardware MTBF             │  Grade+Class
       ├─ Submission Timeliness     ├─ Warranty 30/60/90 Days    ├─ Demographics
       └─ Student Progress          └─ Relocation Audit          └─ Group Sync
       │                            │                            │
       ▼                            ▼                            ▼
┌──────────────┐             ┌──────────────┐             ┌──────────────┐
│  Helpdesk &  │             │Financial Fee │             │  Governance  │
│  Operations  │             │ & Compliance │             │  & Auditing  │
└──────┬───────┘             └──────┬───────┘             └──────┬───────┘
       │                            │                            │
       ├─ MTTR & Ticket SLA         ├─ Collection Realization    ├─ Storage Quota
       ├─ Viva Examination Score    ├─ Term Defaulters           ├─ Audit Trail
       └─ Coding Mastery Progress   └─ Category Breakdown        └─ Query Latency
```

---

## 4. Test Environment & Prerequisites

### 4.1 Environment Configuration
- **Application Server:** Node.js Express API (`http://localhost:5001`)
- **Client Application:** Next.js React Dashboard (`http://localhost:3000`)
- **Database Engine:** PostgreSQL (Neon Cloud / Local Instance) with Prisma ORM v5+
- **Test Runner:** Jest v29+ with Supertest
- **Email Service:** Nodemailer SMTP configured with active test sandbox (Mailtrap/Ethereal)

### 4.2 Seed Data Requirements
To execute test cases effectively, ensure the test database contains:
1. At least 1 School with 2 Academic Sessions (e.g., `2024-2025` and `2025-2026`).
2. 3 Classes with varying streams (e.g., `Class 10-A`, `Class 12-Science`, `Class 12-Commerce`).
3. 25+ Students enrolled with active statuses, divided by gender (e.g., 15 males, 10 females).
4. 6+ Student Groups (all-boys, all-girls, co-ed) with assigned leaders and members.
5. 2 Labs (`Computer Lab 1` with 20 PCs, `Robotics Lab` with 10 PCs).
6. 10 Published Assignments with submissions across statuses (`submitted`, `graded`, `needs_revision`, `late`).
7. 15 Graded submissions with varying percentages (`0%` to `100%`) using letter grades (`A+` to `F`).
8. 5 Helpdesk Tickets across `open`, `in_progress`, and `resolved` with priority weights.
9. 5 Fee Structures with partial and full payment transactions.

---

## 5. Detailed Test Cases by Report Domain

### 5.1 Academic Performance & Student Roster Analytics

#### Test Case: `TC-REP-ACAD-001`
- **Title:** Class-Filtered Academic Roster and Average Score Aggregation
- **Primary Tables:** `User`, `ClassEnrollment`, `Class`, `Submission`, `Grade`
- **Report Endpoint:** `GET /api/reports/analytics?classId={classId}&dateRange=month`
- **Analytical Insight:** Identifies students lagging behind class averages and verifies enrollment-to-submission integrity.
- **Pre-conditions:** Class `CLS-101` has 10 enrolled active students. 8 students have graded submissions; 2 students have no submissions.
- **Execution Steps:**
  1. Authenticate as an Instructor or Admin with valid JWT.
  2. Send `GET /api/reports/analytics?classId=CLS-101&dateRange=month`.
  3. Validate response data fields: `totalStudents`, `totalAssignments`, `avgScore`, `submissionRate`.
- **Expected Results:**
  - `totalStudents` equals exactly `10`.
  - `avgScore` correctly averages only published graded submissions for `CLS-101`.
  - Non-submitting students are factored into the expected submission denominator: $\text{submissionRate} = \left(\frac{\text{totalSubmissions}}{\text{totalStudents} \times \text{totalAssignments}}\right) \times 100$.
  - Students belonging to other classes are completely excluded.
- **Pass/Fail Criteria:** Pass if counts and average scores match database calculation within 0.1% margin.

---

#### Test Case: `TC-REP-ACAD-002`
- **Title:** Grade Distribution Histogram & Bell-Curve Skew Calculation
- **Primary Tables:** `Grade`, `Submission`, `Assignment`, `User`
- **Report Endpoint:** `GET /api/reports/analytics?dateRange=all`
- **Analytical Insight:** Visualizes grade inflation or high failure rates across academic terms to evaluate curriculum assessment difficulty.
- **Pre-conditions:** 20 graded submissions exist: 4 `A+`, 6 `A`, 5 `B`, 3 `C`, 1 `D`, 1 `F`.
- **Execution Steps:**
  1. Send request to `/api/reports/analytics` with `dateRange=all`.
  2. Parse `gradeDistribution` array in JSON payload.
  3. Compare grade array order `['A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'F']`.
- **Expected Results:**
  - `gradeDistribution` array contains objects `{ grade: 'A+', count: 4 }`, `{ grade: 'A', count: 6 }`, etc.
  - Grades with count `0` are filtered out or omitted as expected.
  - Total count across distribution array matches `gradedSubmissions`.
- **Pass/Fail Criteria:** Pass if total graded submissions equal the sum of histogram buckets.

---

#### Test Case: `TC-REP-ACAD-003`
- **Title:** Top Academic Performers Leaderboard with Tie-Breaker Handling
- **Primary Tables:** `Grade`, `Submission`, `User`
- **Report Endpoint:** `GET /api/reports/analytics`
- **Analytical Insight:** Recognizes high-achieving candidates for honors lists and identifies benchmark lab code exemplars.
- **Pre-conditions:** Student A has 3 submissions with avg score 98.0%. Student B has 2 submissions with avg score 95.5%. Student C has 1 submission with 98.0%.
- **Execution Steps:**
  1. Trigger analytics endpoint with active session header.
  2. Inspect `topPerformers` array in response.
  3. Verify sorting: descending by `avgScore`.
  4. Verify secondary metric: `gradedCount` is populated.
- **Expected Results:**
  - Students with highest `avgScore` appear at indices 0, 1, 2.
  - Student details (`firstName`, `lastName`, `admissionNumber`, `email`) are properly hydrated from `User`.
  - Inactive or soft-deleted students (`isActive: false`) are strictly omitted.
- **Pass/Fail Criteria:** Pass if top 10 limit is respected and students are sorted descending by score.

---

#### Test Case: `TC-REP-ACAD-004`
- **Title:** Individual Student Longitudinal Progress Report
- **Primary Tables:** `User`, `Submission`, `Assignment`, `Subject`, `Grade`
- **Report Endpoint:** `GET /api/reports/student-progress/:studentId`
- **Analytical Insight:** Evaluates student growth trajectory, chronic late submission patterns, and subject-specific aptitude.
- **Pre-conditions:** Student `STU-001` has submitted 5 lab assignments across 2 subjects (`Computer Science`, `Physics Lab`). 1 submission is marked late (`isLate: true`).
- **Execution Steps:**
  1. Request `GET /api/reports/student-progress/STU-001`.
  2. Verify authorization: Student can only view own ID; Instructor/Admin can view any ID.
  3. Inspect `stats`: `{ total, graded, onTime, avgScore }`.
  4. Inspect `submissions` list with nested `assignment.subject`.
- **Expected Results:**
  - `stats.total = 5`, `stats.onTime = 4`.
  - `stats.avgScore` correctly averages the graded items.
  - Submissions are ordered chronologically descending by `submittedAt`.
  - Attempting to query another student's ID with student credentials returns HTTP `403 Forbidden`.
- **Pass/Fail Criteria:** Pass if RBAC restriction holds and statistics match individual submission records.

---

### 5.2 Lab Infrastructure, PC Allocation & Asset Health

#### Test Case: `TC-REP-LAB-005`
- **Title:** Lab Workstation Allocation & Seating Matrix Report
- **Primary Tables:** `LabItem`, `Lab`, `StudentGroup`, `Class`, `User`
- **Report Endpoint:** `POST /api/reports/custom-generate` with `entities: ['lab_pcs']`
- **Analytical Insight:** Detects unassigned or underutilized workstations, ensuring 1:1 or group-to-PC lab availability.
- **Pre-conditions:** `Computer Lab 1` has 20 PCs (`PC-01` to `PC-20`). `PC-01` to `PC-15` are assigned to student groups in `Class 10-A`. `PC-16` to `PC-20` are unassigned.
- **Execution Steps:**
  1. POST to `/api/reports/custom-generate` with payload:
     ```json
     {
       "entities": ["lab_pcs"],
       "selectedColumns": {
         "lab_pcs": ["itemNumber", "labName", "status", "ipAddress", "assignedGroup", "assignedClass"]
       }
     }
     ```
  2. Inspect returned `reportResults.lab_pcs.rows`.
- **Expected Results:**
  - Exactly 20 rows are returned.
  - Rows for `PC-01` through `PC-15` show assigned group name and class name.
  - Rows for `PC-16` through `PC-20` show `'Unassigned'` for group and `'-'` for class.
  - IP and MAC addresses from `LabItem.specs` JSON field are formatted cleanly.
- **Pass/Fail Criteria:** Pass if all PCs are cataloged with correct association or unassigned status.

---

#### Test Case: `TC-REP-LAB-006`
- **Title:** Lab Equipment Failure Rate & Maintenance Alert Report
- **Primary Tables:** `LabItem`, `Lab`, `ItemMaintenanceHistory`
- **Report Endpoint:** `GET /api/labs/inventory-reports`
- **Analytical Insight:** Identifies high-failure hardware batches and alerts lab technicians to items currently in repair.
- **Pre-conditions:** 3 PCs have `status = 'maintenance'`. 2 printers have `status = 'retired'`. 25 PCs have `status = 'active'`.
- **Execution Steps:**
  1. Send request `GET /api/labs/inventory-reports` as `admin` or `lab_assistant`.
  2. Verify `statsByStatus` contains `{ active: 25, maintenance: 3, retired: 2 }`.
  3. Verify `maintenanceAlerts` lists the exact 3 items under maintenance.
- **Expected Results:**
  - Total items equal `30`.
  - Alert badges surface items requiring immediate technician intervention.
  - Response time is $< 250$ms.
- **Pass/Fail Criteria:** Pass if maintenance counts and alert items reflect live table status.

---

#### Test Case: `TC-REP-LAB-007`
- **Title:** Warranty Expiration 30/60/90 Day Lifecycle Forecasting
- **Primary Tables:** `LabItem`, `Lab`, `Vendor`
- **Report Endpoint:** `GET /api/labs/inventory-reports`
- **Analytical Insight:** Forecasts upcoming hardware warranty lapses to plan proactive vendor contract renewals or replacement budgeting.
- **Pre-conditions:** Item A warranty expires in 15 days; Item B in 45 days; Item C in 75 days; Item D expired 10 days ago; Item E expires in 180 days.
- **Execution Steps:**
  1. Execute `GET /api/labs/inventory-reports`.
  2. Check `warrantyAlerts.expiredOrExpiring30`: Must contain Item A and Item D.
  3. Check `warrantyAlerts.expiring60`: Must contain Item B.
  4. Check `warrantyAlerts.expiring90`: Must contain Item C.
  5. Check Item E: Must NOT be present in any of the 3 alert buckets.
- **Expected Results:**
  - Date comparisons use current server timestamp dynamically.
  - Expired and near-expiry assets are properly grouped into appropriate risk horizons.
- **Pass/Fail Criteria:** Pass if date boundary filtering accurately buckets items.

---

#### Test Case: `TC-REP-LAB-008`
- **Title:** Inter-Lab Equipment Shifting & Relocation Audit Report
- **Primary Tables:** `EquipmentShiftRequest`, `EquipmentShiftHistory`, `LabItem`, `Lab`, `User`
- **Report Endpoint:** `GET /api/labs/shifting-requests?status=completed`
- **Analytical Insight:** Audits physical asset migration between labs to prevent ghost inventory and missing items.
- **Pre-conditions:** 5 PCs were shifted from `Lab 1` to `Lab 2` under approved shift request `REQ-SH-09`.
- **Execution Steps:**
  1. Request completed equipment shifting history.
  2. Verify each shifted item reflects the new `currentLabId`.
  3. Verify shift history logs old lab name, new lab name, approver user ID, and transfer timestamp.
- **Expected Results:**
  - Audit trail matches physical relocation.
  - PC inventory reports for `Lab 1` show count reduced by 5, and `Lab 2` increased by 5.
- **Pass/Fail Criteria:** Pass if origin and destination inventories maintain conservation of total assets.

---

### 5.3 Intelligent Unified Multi-Entity Joined Master Reports

#### Test Case: `TC-REP-UNIF-009`
- **Title:** 360-Degree Unified Institutional Master Matrix Generation
- **Primary Tables:** `User`, `ClassEnrollment`, `Class`, `StudentGroup`, `GroupMember`, `LabItem`, `Lab`, `Submission`, `Grade`
- **Report Endpoint:** `POST /api/reports/custom-generate`
- **Analytical Insight:** Combines academic roster, classroom section, lab group assignment, physical PC seat, and grade percentage into a single cohesive row.
- **Pre-conditions:** Entities selected: `['students', 'classes', 'groups', 'lab_pcs', 'assignments']`.
- **Execution Steps:**
  1. Send POST request to `/api/reports/custom-generate` with payload:
     ```json
     {
       "entities": ["students", "classes", "groups", "lab_pcs", "assignments"],
       "selectedColumns": {
         "students": ["fullName", "admissionNumber", "gender", "email"],
         "classes": ["name", "section", "gradeLevel"],
         "groups": ["name", "leaderName"],
         "lab_pcs": ["itemNumber", "labName", "status"],
         "assignments": ["submissionsCount", "avgScore"]
       },
       "filters": { "gender": "all" }
     }
     ```
  2. Inspect response structure `data.reportResults.unified`.
- **Expected Results:**
  - Response contains both individual entity tabs (`students`, `classes`, etc.) AND a synthesized `unified` table.
  - In `unified.rows`, each student row contains:
    - Student Name and Admission ID from `User`
    - Class Name and Section from `Class`
    - Group Name and Leader Name from `StudentGroup` & `GroupMember`
    - PC Number and Lab Name from `LabItem` & `Lab`
    - Submissions Count and Average Score from `Submission` & `Grade`
  - No row data is collapsed or misaligned across columns.
- **Pass/Fail Criteria:** Pass if unified dataset contains all joined fields without cross-contamination.

---

#### Test Case: `TC-REP-UNIF-010`
- **Title:** Gender Filter Cascade Across Unified Master Joins
- **Primary Tables:** `User`, `StudentGroup`, `GroupMember`, `ClassEnrollment`
- **Report Endpoint:** `POST /api/reports/custom-generate` with `filters: { gender: 'female' }`
- **Analytical Insight:** Evaluates female student lab participation, girls-only group seating, and gender equity in practical lab scores.
- **Pre-conditions:** Total students = 20 (12 male, 8 female).
- **Execution Steps:**
  1. POST to `/api/reports/custom-generate` with `filters.gender = 'female'` and `entities = ['students', 'groups']`.
  2. Examine `reportResults.students.rows` and `reportResults.unified.rows`.
- **Expected Results:**
  - `reportResults.students.count` is exactly `8`.
  - All student rows have `Gender = 'Female'`.
  - Groups report surfaces groups categorized as female/girls or with female members.
  - Zero male records leak into the report output.
- **Pass/Fail Criteria:** Pass if female-only filter is strictly enforced across individual and unified tables.

---

#### Test Case: `TC-REP-UNIF-011`
- **Title:** Orphaned & Ungrouped Entity Resilience in Unified Reports
- **Primary Tables:** `User`, `StudentGroup`, `LabItem`
- **Report Endpoint:** `POST /api/reports/custom-generate`
- **Analytical Insight:** Flags students without assigned groups or computers, ensuring no students are excluded from the roster.
- **Pre-conditions:** 2 students in the database are newly enrolled and have neither a `StudentGroup` nor an `assignedPc`.
- **Execution Steps:**
  1. Execute custom report generation with `entities = ['students', 'groups', 'lab_pcs']`.
  2. Locate the 2 ungrouped students in `reportResults.unified.rows`.
- **Expected Results:**
  - The 2 students are NOT omitted (ensuring SQL `LEFT JOIN` semantics over `INNER JOIN`).
  - Columns for `Group Name` display `'Ungrouped'`.
  - Columns for `PC Number` display `'No PC'`.
  - Academic columns remain accurate.
- **Pass/Fail Criteria:** Pass if unassigned students are preserved with fallback placeholder values.

---

### 5.4 Lab Incident Helpdesk & SLA Resolution Analytics

#### Test Case: `TC-REP-TCK-012`
- **Title:** Lab Incident Ticket Breakdown & MTTR (Mean-Time-To-Resolve) Analysis
- **Primary Tables:** `Ticket`, `TicketIssueType`, `LabItem`, `Lab`, `User`
- **Report Endpoint:** `GET /api/tickets/stats`
- **Analytical Insight:** Identifies recurring failure modes (e.g. OS crash vs peripheral failure) and technician response bottlenecks.
- **Pre-conditions:** 12 tickets logged: 5 Hardware (`high` priority), 4 Software (`medium`), 3 Network (`urgent`). 8 are `resolved`, 4 are `open`.
- **Execution Steps:**
  1. Request `GET /api/tickets/stats`.
  2. Check `byStatus` dictionary: `{ open: 4, resolved: 8 }`.
  3. Check `byPriority` dictionary: `{ high: 5, medium: 4, urgent: 3 }`.
  4. Check `byCategory` grouping.
- **Expected Results:**
  - Total ticket counts reconcile across status, priority, and category dimensions.
  - Aggregations accurately reflect underlying records.
- **Pass/Fail Criteria:** Pass if aggregate metrics match database record counts.

---

#### Test Case: `TC-REP-TCK-013`
- **Title:** Chronic Defective Workstation Identification via Ticket History
- **Primary Tables:** `Ticket`, `LabItem`, `Lab`
- **Report Endpoint:** `GET /api/tickets?labItemId={id}`
- **Analytical Insight:** Pinpoints "lemon" workstations experiencing frequent breakdowns to support warranty claims or disposal.
- **Pre-conditions:** `PC-07` in `Computer Lab 1` has had 6 hardware tickets filed in the last 60 days.
- **Execution Steps:**
  1. Query tickets filtered by `labItemId = PC-07`.
  2. Verify ticket list includes timestamps, resolution notes, and issue types.
- **Expected Results:**
  - All 6 tickets are retrieved.
  - Average resolution time can be computed from `createdAt` to `resolvedAt`.
- **Pass/Fail Criteria:** Pass if complete ticket history is retrieved for the target asset.

---

### 5.5 Oral Viva Voce & Practical Exam Defense Reports

#### Test Case: `TC-REP-VIVA-014`
- **Title:** Practical Coding vs. Oral Viva Voce Score Correlation Report
- **Primary Tables:** `Meeting`, `MeetingParticipant`, `Grade`, `Submission`, `User`
- **Report Endpoint:** `GET /api/reports/analytics` / Custom Query
- **Analytical Insight:** Highlights discrepancies where students score 100% on code submission but fail live viva oral defense, detecting plagiarism or unauthorized AI assistance.
- **Pre-conditions:** Student X has: Practical code marks = 95/100; Viva marks awarded = 20/100.
- **Execution Steps:**
  1. Query student grade breakdown via report export (`/api/reports/export?format=json`).
  2. Verify individual score breakdown includes `practicalMarks`, `outputMarks`, `vivaMarks`, and `finalMarks`.
- **Expected Results:**
  - Report displays distinct sub-components:
    - Practical Marks: `95`
    - Viva Marks: `20`
    - Final Marks: weighted total
  - Insight flag highlights viva score discrepancy $> 50\%$.
- **Pass/Fail Criteria:** Pass if component marks are preserved and not prematurely collapsed.

---

### 5.6 Institutional Fee Collection & Defaulter Analytics

#### Test Case: `TC-REP-FEE-015`
- **Title:** Fee Collection Realization Rate & Class-Wise Defaulter Report
- **Primary Tables:** `StudentFee`, `FeeStructure`, `FeeCategory`, `FeePayment`, `User`, `Class`
- **Report Endpoint:** `GET /api/fees/reports/summary` (or custom fee report query)
- **Analytical Insight:** Delivers institutional cash flow visibility, pending receivables, and lists students barred from lab exams due to unpaid fees.
- **Pre-conditions:** `Class 10-A` fee requirement = \$5,000 per student (10 students = \$50,000 total). Collected = \$35,000; Outstanding = \$15,000 across 3 students.
- **Execution Steps:**
  1. Request fee summary report filtered by class `Class 10-A`.
  2. Check total fee demand, total paid, and total balance.
  3. Validate list of defaulters with student names and overdue amounts.
- **Expected Results:**
  - $\text{Total Demand} = \$50,000$.
  - $\text{Collected} = \$35,000$ (Realization rate: $70\%$).
  - Defaulters list contains exactly the 3 students with nonzero balances.
- **Pass/Fail Criteria:** Pass if sum of individual student balances equals total class outstanding balance.

---

### 5.7 Training Progression & Coding Mastery Analytics

#### Test Case: `TC-REP-TRN-016`
- **Title:** Automated Coding Curriculum Progression & Language Mastery Report
- **Primary Tables:** `TrainingModule`, `TrainingUnit`, `StudentTrainingProgress`, `CodingSubmission`, `User`
- **Report Endpoint:** `GET /api/training/modules/:id/analytics`
- **Analytical Insight:** Identifies curriculum roadblocks where students repeatedly fail automated test cases (e.g. Recursion vs Loops).
- **Pre-conditions:** Training Module `Python 101` has 5 units. Unit 3 has 15 failed test submissions out of 20 attempts.
- **Execution Steps:**
  1. Request module analytics for `Python 101`.
  2. Inspect completion rates per unit.
  3. Verify code submission pass/fail counts.
- **Expected Results:**
  - Unit 3 completion rate is calculated at $25\%$.
  - Unit drop-off and error categories (Syntax, Timeout, Logic) are reported.
- **Pass/Fail Criteria:** Pass if unit completion rates correlate with test submission pass rates.

---

### 5.8 Storage Quota, Security Auditing & Query Logs

#### Test Case: `TC-REP-SEC-017`
- **Title:** Cloud Storage Quota & File Distribution Audit Report
- **Primary Tables:** `Document`, `DocumentFolder`, `School`, `User`
- **Report Endpoint:** `GET /api/storage/quota-report`
- **Analytical Insight:** Identifies top storage consumers (students uploading large video recordings) to optimize cloud storage costs.
- **Pre-conditions:** School storage quota = 100 GB. Total files stored = 45 GB across 300 documents.
- **Execution Steps:**
  1. Trigger storage quota report.
  2. Verify total consumed bytes matches `SUM(Document.fileSize)`.
  3. Verify percentage of quota consumed equals $45\%$.
  4. Inspect top 5 largest document owners.
- **Expected Results:**
  - Document file sizes are converted to human-readable units (MB / GB).
  - Quota warning thresholds (80%, 90%) trigger appropriately.
- **Pass/Fail Criteria:** Pass if aggregate file bytes match filesystem storage allocation.

---

#### Test Case: `TC-REP-SEC-018`
- **Title:** Security Audit Trail & Entity Mutation Compliance Report
- **Primary Tables:** `AuditLog`, `User`, `School`
- **Report Endpoint:** `GET /api/audit/logs?entityType=Grade&action=UPDATE`
- **Analytical Insight:** Audits unauthorized grade modifications, detecting insider threat or academic integrity violations.
- **Pre-conditions:** Grade `GRD-44` was updated by Instructor `INS-02` on Oct 5.
- **Execution Steps:**
  1. Query audit logs with filter `entityType=Grade` and `action=UPDATE`.
  2. Examine log record: user ID, old value, new value, IP address, timestamp.
- **Expected Results:**
  - Grade change event is present in audit log.
  - Previous grade score and new grade score are preserved in the JSON delta.
  - Non-admin users cannot access or delete audit logs.
- **Pass/Fail Criteria:** Pass if immutable audit logs capture mutations with actor identity.

---

### 5.9 Export Fidelity, Column Customization & Email Delivery

#### Test Case: `TC-REP-EXP-019`
- **Title:** Dynamic Column Selection & Omission Fidelity
- **Primary Tables:** `User`, `Class`, `StudentGroup`, `LabItem`
- **Report Endpoint:** `POST /api/reports/custom-generate`
- **Analytical Insight:** Verifies user-customized reporting views exclude sensitive or irrelevant columns as requested by the user.
- **Pre-conditions:** User selects only `['fullName', 'admissionNumber']` for students, unchecking `['phone', 'email', 'gender']`.
- **Execution Steps:**
  1. Submit custom generate request with the specified column configuration.
  2. Inspect keys of objects in `reportResults.students.rows[0]`.
- **Expected Results:**
  - Keys `'Student Name'` and `'Admission / Student ID'` are present.
  - Keys `'Phone Number'`, `'Email Address'`, `'Gender'` are strictly `undefined`.
- **Pass/Fail Criteria:** Pass if output columns match selected keys with no extra columns leaked.

---

#### Test Case: `TC-REP-EXP-020`
- **Title:** Multi-Sheet Excel (XLSX) Export Data Integrity
- **Primary Tables:** `User`, `Class`, `StudentGroup`, `LabItem`
- **Component:** Client-side & Server-side XLSX Generator
- **Analytical Insight:** Ensures administrative personnel receive cleanly formatted workbooks with dedicated worksheets per entity plus a Unified Master sheet.
- **Execution Steps:**
  1. Generate custom report with 3 entities (`students`, `classes`, `lab_pcs`).
  2. Trigger XLSX generation.
  3. Parse the generated workbook buffer using `xlsx` library.
- **Expected Results:**
  - Workbook contains 4 sheets: `'Students & Roster'`, `'Classes & Enrolled'`, `'Lab PCs & Inventory'`, and `'Unified Joined Master'`.
  - Sheet column headers match configured column labels.
  - Number formats (percentages, counts) render cleanly without `NaN` or `[object Object]`.
- **Pass/Fail Criteria:** Pass if all sheets exist and rows match UI preview tables.

---

#### Test Case: `TC-REP-EXP-021`
- **Title:** CSV Export Formatting and Delimiter Escaping
- **Primary Tables:** `Grade`, `Submission`, `Assignment`, `User`
- **Report Endpoint:** `GET /api/reports/export?format=csv`
- **Analytical Insight:** Validates data export compatibility with legacy institutional SIS / ERP systems.
- **Pre-conditions:** A student's assignment title contains a comma: `"Sorting, Searching & Graph Algorithms"`.
- **Execution Steps:**
  1. Call `GET /api/reports/export?format=csv`.
  2. Verify HTTP response headers: `Content-Type: text/csv`, `Content-Disposition: attachment; filename=lab_report_...csv`.
  3. Validate CSV text content.
- **Expected Results:**
  - Values containing commas are properly enclosed in double quotes (`"..."`).
  - Column count in every data row equals header column count.
  - No broken line breaks or unescaped characters.
- **Pass/Fail Criteria:** Pass if CSV conforms to RFC 4180.

---

#### Test Case: `TC-REP-EXP-022`
- **Title:** Automated Report Email Dispatch with School Branding & Excel Attachment
- **Primary Tables:** `School`, `User`, `ReportService`, `ReportEmailService`
- **Report Endpoint:** `POST /api/reports/send-email`
- **Analytical Insight:** Verifies scheduled and on-demand report distribution to Principals and external auditors.
- **Execution Steps:**
  1. POST to `/api/reports/send-email` with:
     ```json
     {
       "to": "principal@dps.edu",
       "subject": "Q3 Comprehensive Lab Performance Report",
       "reportTitle": "Term 1 Institutional Assessment",
       "entities": ["students", "classes", "lab_pcs"],
       "formats": { "xlsx": true, "csv": false }
     }
     ```
  2. Inspect response status and mock SMTP transport inspector.
- **Expected Results:**
  - HTTP 200 with `{ success: true, message: "Report successfully dispatched..." }`.
  - Email contains school name in header branding.
  - `.xlsx` attachment is attached with non-zero byte size.
  - Passing empty `to` address returns HTTP 400 Bad Request.
- **Pass/Fail Criteria:** Pass if email is formatted and dispatched with valid spreadsheet attachment.

---

## 6. Boundary, Negative & Stress Test Scenarios

| Test ID | Scenario Description | Input / Edge Condition | Expected System Behavior |
| :--- | :--- | :--- | :--- |
| **TC-EDGE-001** | Zero Submissions in Class | A newly created class with 15 enrolled students but 0 assignments or submissions. | Report renders `totalStudents: 15`, `avgScore: 0`, `submissionRate: 0%` without `DivideByZero` exceptions or `NaN` outputs. |
| **TC-EDGE-002** | 100% Failure Rate | All students in an assignment receive marks $< 33\%$. | Grade distribution accurately plots 100% in `F` bucket; `minScore` and `maxScore` reflect values accurately without chart clipping. |
| **TC-EDGE-003** | Missing PC Hardware Specs | `LabItem.specs` JSON column is `null` or `{}`. | Unified report outputs `'-'` for IP and MAC address columns without throwing `TypeError: Cannot read property of undefined`. |
| **TC-EDGE-004** | Cross-School Data Leakage Prevention | Multi-tenant test: School A requests reports while School B has active records. | All database queries enforce `where: { schoolId: req.user.schoolId }`. Zero records from School B leak into School A's report. |
| **TC-EDGE-005** | Academic Session Boundary Filter | Previous academic year session selected in header (`x-academic-session`). | Report strictly filters assignments and grades created during that session; ongoing year records are excluded. |
| **TC-EDGE-006** | Special Characters in Student Names | Student names with apostrophes, hyphens, and Unicode (`O'Connor`, `Zoë`, `Aarav सिंह`). | Reports render characters accurately in UI, CSV exports escape quotes correctly, and XLSX encodes UTF-8 safely. |
| **TC-EDGE-007** | Extreme Record Scale (10,000+ rows) | Roster query on an institution with 10,000 student records across 100 classes. | Pagination limits initial UI fetch to 10/25/50 rows; batch stream export finishes within $< 3.5$ seconds without Node.js Heap OOM. |
| **TC-EDGE-008** | Cold DB Connection Timeout | Neon serverless database cold-start delay during report generation. | Automatic reconnection logic (`health` / Prisma retry) executes; request succeeds or returns graceful fallback message. |

---

## 7. SQL / Prisma Verification Queries

QA engineers can use the following verification queries to validate data integrity against the database:

### Query 1: Validate Student Submission Rate & Average Percentage
```sql
-- Calculate expected vs actual submissions and average score for a class
SELECT 
    c.id AS class_id,
    c.name AS class_name,
    COUNT(DISTINCT ce."studentId") AS total_students,
    COUNT(DISTINCT a.id) AS total_assignments,
    (COUNT(DISTINCT ce."studentId") * COUNT(DISTINCT a.id)) AS expected_submissions,
    COUNT(DISTINCT s.id) AS actual_submissions,
    ROUND(
        (COUNT(DISTINCT s.id)::DECIMAL / 
        NULLIF(COUNT(DISTINCT ce."studentId") * COUNT(DISTINCT a.id), 0)) * 100, 1
    ) AS calculated_submission_rate,
    ROUND(AVG(g.percentage::DECIMAL), 1) AS calculated_avg_score
FROM "Class" c
JOIN "ClassEnrollment" ce ON ce."classId" = c.id AND ce.status = 'active'
LEFT JOIN "AssignmentTarget" at ON at."targetClassId" = c.id
LEFT JOIN "Assignment" a ON a.id = at."assignmentId" AND a.status = 'published'
LEFT JOIN "Submission" s ON s."assignmentId" = a.id AND s."studentId" = ce."studentId"
LEFT JOIN "Grade" g ON g."submissionId" = s.id AND g."isPublished" = true
WHERE c."schoolId" = 'YOUR_SCHOOL_ID'
GROUP BY c.id, c.name;
```

### Query 2: Validate Workstation & Seating Allocation Matrix
```sql
-- Verify PC allocation to student groups and classes
SELECT 
    li."itemNumber" AS pc_number,
    l.name AS lab_name,
    li.status AS pc_status,
    sg.name AS assigned_group_name,
    c.name AS class_name,
    COUNT(gm."studentId") AS group_member_count
FROM "LabItem" li
JOIN "Lab" l ON l.id = li."labId"
LEFT JOIN "StudentGroup" sg ON sg."assignedPcId" = li.id
LEFT JOIN "Class" c ON c.id = sg."classId"
LEFT JOIN "GroupMember" gm ON gm."groupId" = sg.id
WHERE li."schoolId" = 'YOUR_SCHOOL_ID' AND li."itemType" = 'pc'
GROUP BY li."itemNumber", l.name, li.status, sg.name, c.name
ORDER BY li."itemNumber" ASC;
```

### Query 3: Validate Hardware Failure & Incident Frequency
```sql
-- Rank workstations by incident failure rate
SELECT 
    li."itemNumber",
    l.name AS lab_name,
    COUNT(t.id) AS total_incidents,
    COUNT(CASE WHEN t.status = 'open' THEN 1 END) AS open_tickets,
    COUNT(CASE WHEN t.priority = 'urgent' OR t.priority = 'high' THEN 1 END) AS high_severity_count
FROM "LabItem" li
JOIN "Lab" l ON l.id = li."labId"
LEFT JOIN "Ticket" t ON t."labItemId" = li.id
WHERE li."schoolId" = 'YOUR_SCHOOL_ID'
GROUP BY li."itemNumber", l.name
HAVING COUNT(t.id) > 0
ORDER BY total_incidents DESC;
```

---

## 8. Test Execution Matrix & Sign-Off Criteria

### 8.1 Test Execution Tracker

| Module / Domain | Total Test Cases | Automated Unit/API | Manual / UI | Pass Target | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Academic Performance Analytics** | 4 | 3 | 1 | 100% | Ready for Run |
| **Lab Infrastructure & Health** | 4 | 2 | 2 | 100% | Ready for Run |
| **Unified 360° Master Engine** | 3 | 2 | 1 | 100% | Ready for Run |
| **Helpdesk & Incident SLA** | 2 | 1 | 1 | 100% | Ready for Run |
| **Viva Examination Defense** | 1 | 1 | 0 | 100% | Ready for Run |
| **Fee Collection & Defaulters** | 1 | 1 | 0 | 100% | Ready for Run |
| **Training & Coding Progression** | 1 | 1 | 0 | 100% | Ready for Run |
| **Storage & Security Auditing** | 2 | 1 | 1 | 100% | Ready for Run |
| **Export & Email Dispatch** | 4 | 3 | 1 | 100% | Ready for Run |
| **Boundary & Stress Scenarios** | 8 | 5 | 3 | 100% | Ready for Run |
| **Total** | **30** | **20** | **10** | **100%** | **Sign-off Ready** |

### 8.2 Production Release Sign-Off Criteria
1. **Zero Blocker / Critical Bugs:** All multi-table join queries execute without SQL syntax errors or Prisma connection drops.
2. **Aggregations Accuracy:** 100% mathematical match between API responses and raw PostgreSQL aggregate queries.
3. **Data Isolation (Multi-Tenancy):** Zero information leakage across `schoolId` and `academicYearId` boundaries.
4. **Export Integrity:** Generated XLSX and CSV files open in Excel/Google Sheets without format warnings or corrupted strings.
5. **Performance Benchmark:** Analytics endpoints respond in $< 800$ms under a test dataset of 5,000 students and 50,000 submission records.
