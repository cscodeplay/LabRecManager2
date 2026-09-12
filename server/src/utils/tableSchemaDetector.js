/**
 * Table Schema Detector & Auto-Column Mapper
 * Analyzes CSV/XLSX/JSON headers and sample values to detect target database table
 * and auto-map columns with intelligent fuzzy matching.
 */

const TABLE_SCHEMAS = {
    users: {
        id: 'users',
        label: 'Students / Users (users)',
        targetEntity: 'student',
        fields: [
            { key: 'firstName', label: 'First Name', required: true, aliases: ['first_name', 'firstname', 'name', 'student_name', 'candidate_name', 'studentname', 'given_name'] },
            { key: 'lastName', label: 'Last Name', required: false, aliases: ['last_name', 'lastname', 'surname', 'father_name', 'fathername', 'family_name'] },
            { key: 'email', label: 'Email Address', required: true, aliases: ['email', 'email_address', 'mail', 'email_id', 'student_email'] },
            { key: 'studentId', label: 'Student ID / Admission No', required: false, aliases: ['student_id', 'studentid', 'admission_number', 'admission_no', 'reg_no', 'registration_no', 'epunjab_id', 'enrollment_no'] },
            { key: 'phone', label: 'Phone Number', required: false, aliases: ['phone', 'mobile', 'mobile_no', 'contact', 'contact_no', 'phone_number', 'telephone'] },
            { key: 'gender', label: 'Gender', required: false, aliases: ['gender', 'sex'] },
            { key: 'rollNumber', label: 'Class Roll No', required: false, aliases: ['class_roll_no', 'roll_number', 'roll_no', 'roll', 'sr_no', 'serial_number'] }
        ]
    },
    lab_items: {
        id: 'lab_items',
        label: 'Lab Inventory & Hardware (lab_items)',
        targetEntity: 'inventory',
        fields: [
            { key: 'itemNumber', label: 'Item Number / Asset Tag', required: true, aliases: ['item_number', 'item_no', 'itemnumber', 'asset_id', 'asset_tag', 'tag_no', 'barcode'] },
            { key: 'itemType', label: 'Item Type', required: true, aliases: ['item_type', 'type', 'category', 'hardware_type', 'device_type', 'equipment_type'] },
            { key: 'brand', label: 'Brand / Manufacturer', required: false, aliases: ['brand', 'make', 'manufacturer', 'company', 'vendor'] },
            { key: 'modelNo', label: 'Model Number / Name', required: false, aliases: ['model', 'model_no', 'model_number', 'modelno', 'unit_model'] },
            { key: 'serialNo', label: 'Serial Number', required: false, aliases: ['serial', 'serial_no', 'serial_number', 'serialnumber', 'sn', 's_n'] },
            { key: 'status', label: 'Operating Status', required: false, aliases: ['status', 'condition', 'state', 'health'] },
            { key: 'specs', label: 'Specifications', required: false, aliases: ['specs', 'specifications', 'configuration', 'details', 'hardware_specs', 'description'] },
            { key: 'notes', label: 'Notes / Remarks', required: false, aliases: ['notes', 'remarks', 'comment', 'comments', 'remark'] }
        ]
    },
    classes: {
        id: 'classes',
        label: 'Academic Classes (classes)',
        targetEntity: 'class',
        fields: [
            { key: 'name', label: 'Class Name', required: true, aliases: ['class_name', 'name', 'classname', 'class', 'title'] },
            { key: 'gradeLevel', label: 'Grade / Class Level', required: true, aliases: ['grade_level', 'grade', 'class_level', 'level', 'standard'] },
            { key: 'section', label: 'Section', required: false, aliases: ['section', 'sec', 'division'] },
            { key: 'stream', label: 'Stream / Discipline', required: false, aliases: ['stream', 'branch', 'track'] },
            { key: 'maxStudents', label: 'Capacity / Max Students', required: false, aliases: ['max_students', 'capacity', 'seats', 'limit'] }
        ]
    },
    subjects: {
        id: 'subjects',
        label: 'Curriculum Subjects (subjects)',
        targetEntity: 'subject',
        fields: [
            { key: 'name', label: 'Subject Name', required: true, aliases: ['subject_name', 'name', 'subject', 'course_name', 'title'] },
            { key: 'code', label: 'Subject Code', required: true, aliases: ['code', 'subject_code', 'course_code', 'sub_code'] },
            { key: 'gradeLevel', label: 'Grade Level', required: false, aliases: ['grade_level', 'grade', 'class_level'] },
            { key: 'subjectType', label: 'Subject Type', required: false, aliases: ['type', 'subject_type', 'category'] },
            { key: 'totalTheoryMarks', label: 'Theory Marks', required: false, aliases: ['theory_marks', 'theory', 'total_theory_marks'] },
            { key: 'totalPracticalMarks', label: 'Practical Marks', required: false, aliases: ['practical_marks', 'practical', 'lab_marks', 'total_practical_marks'] }
        ]
    },
    tickets: {
        id: 'tickets',
        label: 'Helpdesk & Lab Tickets (tickets)',
        targetEntity: 'ticket',
        fields: [
            { key: 'title', label: 'Ticket Title / Subject', required: true, aliases: ['title', 'subject', 'ticket_title', 'issue_title', 'heading'] },
            { key: 'description', label: 'Description', required: true, aliases: ['description', 'issue_description', 'problem', 'details', 'body'] },
            { key: 'category', label: 'Category', required: false, aliases: ['category', 'issue_type', 'type', 'ticket_category'] },
            { key: 'priority', label: 'Priority', required: false, aliases: ['priority', 'urgency', 'severity', 'level'] },
            { key: 'status', label: 'Status', required: false, aliases: ['status', 'ticket_status', 'state'] }
        ]
    },
    procurement_requests: {
        id: 'procurement_requests',
        label: 'Procurement Requests (procurement_requests)',
        targetEntity: 'procurement',
        fields: [
            { key: 'itemName', label: 'Item / Equipment Name', required: true, aliases: ['item_name', 'item', 'product_name', 'equipment', 'title'] },
            { key: 'quantity', label: 'Quantity', required: true, aliases: ['quantity', 'qty', 'count', 'units'] },
            { key: 'estimatedCost', label: 'Estimated Cost', required: false, aliases: ['cost', 'estimated_cost', 'price', 'amount', 'budget'] },
            { key: 'priority', label: 'Priority', required: false, aliases: ['priority', 'urgency'] },
            { key: 'justification', label: 'Justification / Purpose', required: false, aliases: ['justification', 'reason', 'purpose', 'remarks'] }
        ]
    }
};

/**
 * Normalize string for key matching
 */
function normalizeStr(str) {
    if (!str) return '';
    return String(str)
        .toLowerCase()
        .trim()
        .replace(/[\s\-_/\\()]+/g, '_')
        .replace(/^_+|_+$/g, '');
}

/**
 * Detect the best-matching database table and produce auto column mappings
 * @param {Array<string>} rawHeaders - List of column headers from file
 * @param {Array<Object>} sampleRows - First few sample rows for inspection
 * @returns {Object} Detection result
 */
function detectTableAndMapping(rawHeaders = [], sampleRows = []) {
    if (!Array.isArray(rawHeaders) || rawHeaders.length === 0) {
        return {
            detectedTable: 'users',
            targetLabel: TABLE_SCHEMAS.users.label,
            confidence: 0,
            columnMapping: {},
            availableFields: TABLE_SCHEMAS.users.fields,
            tableOptions: Object.values(TABLE_SCHEMAS).map(t => ({ id: t.id, label: t.label }))
        };
    }

    const normHeaders = rawHeaders.map(h => ({ raw: h, norm: normalizeStr(h) }));

    let bestTableId = 'users';
    let highestScore = -1;
    let bestMappings = {};

    for (const [tableId, schema] of Object.entries(TABLE_SCHEMAS)) {
        let score = 0;
        const currentMapping = {};

        for (const { raw, norm } of normHeaders) {
            let matchedField = null;

            // 1. Direct key match
            for (const field of schema.fields) {
                const normFieldKey = normalizeStr(field.key);
                if (norm === normFieldKey) {
                    matchedField = field.key;
                    score += 15;
                    break;
                }
            }

            // 2. Exact alias match (highest priority among aliases)
            if (!matchedField) {
                for (const field of schema.fields) {
                    for (const alias of field.aliases) {
                        const normAlias = normalizeStr(alias);
                        if (norm === normAlias) {
                            matchedField = field.key;
                            score += 10;
                            break;
                        }
                    }
                    if (matchedField) break;
                }
            }

            // 3. Substring inclusion match (fallback)
            if (!matchedField) {
                for (const field of schema.fields) {
                    for (const alias of field.aliases) {
                        const normAlias = normalizeStr(alias);
                        if (norm.length > 3 && (norm.includes(normAlias) || normAlias.includes(norm))) {
                            matchedField = field.key;
                            score += 4;
                            break;
                        }
                    }
                    if (matchedField) break;
                }
            }

            currentMapping[raw] = matchedField || '__ignore__';
        }

        // Penalty if required fields are completely missing
        const mappedKeys = Object.values(currentMapping);
        const requiredMissing = schema.fields.filter(f => f.required && !mappedKeys.includes(f.key)).length;
        score -= requiredMissing * 5;

        if (score > highestScore) {
            highestScore = score;
            bestTableId = tableId;
            bestMappings = currentMapping;
        }
    }

    // Default to users if inventory or other is low confidence
    const selectedSchema = TABLE_SCHEMAS[bestTableId] || TABLE_SCHEMAS.users;

    return {
        detectedTable: bestTableId,
        targetLabel: selectedSchema.label,
        confidence: Math.max(0.1, Math.min(1.0, (highestScore / (normHeaders.length * 10)))),
        columnMapping: bestMappings,
        availableFields: selectedSchema.fields,
        tableOptions: Object.values(TABLE_SCHEMAS).map(t => ({ id: t.id, label: t.label }))
    };
}

/**
 * Apply column mapping to transform raw records into normalized DB payload objects
 * @param {Array<Object>} records - Raw file rows
 * @param {Object} columnMapping - Dict of { fileHeader: dbFieldKey }
 * @param {string} targetTable - Table ID
 * @returns {Array<Object>} Cleaned records
 */
function applyMapping(records = [], columnMapping = {}, targetTable = 'users') {
    if (!Array.isArray(records)) return [];

    return records.map((row, idx) => {
        const item = { _originalRowIndex: idx + 1 };

        for (const [fileCol, dbKey] of Object.entries(columnMapping)) {
            if (!dbKey || dbKey === '__ignore__') continue;

            const val = row[fileCol] !== undefined ? row[fileCol] : row[normalizeStr(fileCol)];
            if (val !== undefined && val !== null) {
                item[dbKey] = typeof val === 'string' ? val.trim() : val;
            }
        }

        // Specific post-processing heuristics
        if (targetTable === 'users') {
            // Split combined student name if lastName is missing
            if (item.firstName && !item.lastName && item.firstName.includes(' ')) {
                const parts = item.firstName.split(' ');
                item.firstName = parts[0];
                item.lastName = parts.slice(1).join(' ');
            }
            if (!item.lastName) item.lastName = 'Student';

            // Auto-generate student email if missing
            if (!item.email && item.firstName) {
                const cleanFirst = String(item.firstName).toLowerCase().replace(/[^a-z0-9]/g, '');
                const cleanLast = String(item.lastName).toLowerCase().replace(/[^a-z0-9]/g, '');
                const idTag = item.studentId ? String(item.studentId).toLowerCase().replace(/[^a-z0-9]/g, '') : Math.floor(100 + Math.random() * 900);
                item.email = `${cleanFirst}.${cleanLast}.${idTag}@student.school.edu`;
            }

            // Normalize gender
            if (item.gender) {
                const g = String(item.gender).toLowerCase();
                if (g.includes('f') || g.includes('girl')) item.gender = 'female';
                else item.gender = 'male';
            } else {
                item.gender = 'male';
            }

            if (item.rollNumber) {
                const rNum = parseInt(item.rollNumber, 10);
                if (!isNaN(rNum)) item.rollNumber = rNum;
            }
            item.role = 'student';
        }

        if (targetTable === 'lab_items') {
            if (!item.itemType) item.itemType = 'pc';
            if (!item.status) item.status = 'active';
            if (!item.itemNumber) item.itemNumber = `ITEM-${Date.now().toString().slice(-4)}-${idx + 1}`;
        }

        return item;
    });
}

module.exports = {
    TABLE_SCHEMAS,
    detectTableAndMapping,
    applyMapping,
    normalizeStr
};
