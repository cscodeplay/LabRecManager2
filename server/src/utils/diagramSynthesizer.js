/**
 * diagramSynthesizer.js
 * High-precision Diagram Synthesizer for Student Practice IDE.
 * Generates:
 * 1. Conventional Python Flowcharts using textbook ANSI/ISO standard shapes:
 *    - Oval / Pill: Start & End (Terminator)
 *    - Parallelogram: Input & Output (I/O)
 *    - Rectangle: Process / Assignment / Calculation
 *    - Diamond: Decision / Branching (Yes / No)
 *    - Hexagon: Loop / Iteration header
 * 2. Conventional SQL ER Diagrams:
 *    - Chen Notation: Rectangles (Entities), Ovals (Attributes), Underlined Ovals (Primary Keys), Diamonds (Relationships), 1:N / M:N Cardinality
 *    - Relational Table Notation: Standard Mermaid erDiagram
 */

const aiService = require('../services/ai.service');

/**
 * Sanitize strings for Mermaid node labels
 */
function sanitizeMermaidText(str) {
    if (!str) return '';
    return str
        .replace(/"/g, "'")
        .replace(/[<>{}[\]()]/g, ' ')
        .replace(/;/g, ' ')
        .replace(/\n+/g, ' ')
        .trim();
}

/**
 * Deterministic Python to Conventional Flowchart Generator
 * Parses lines of code to identify flow control, I/O, loops, and conditions.
 */
function deterministicPythonFlowchart(pythonCode) {
    const rawLines = (pythonCode || '').split('\n');
    const cleanLines = [];

    for (let line of rawLines) {
        line = line.replace(/#.*$/, '').trim();
        if (line) cleanLines.push(line);
    }

    if (cleanLines.length === 0) {
        return `flowchart TD
    startNode(["Start"]):::terminator
    noCode[/"No Python code provided"/]:::io
    endNode(["End"]):::terminator

    startNode --> noCode --> endNode

    classDef terminator fill:#dcfce7,stroke:#16a34a,stroke-width:2px,font-weight:bold;
    classDef io fill:#dbeafe,stroke:#2563eb,stroke-width:2px;
    classDef process fill:#f8fafc,stroke:#475569,stroke-width:2px;
    classDef decision fill:#fef3c7,stroke:#d97706,stroke-width:2px,font-weight:bold;`;
    }

    let mermaid = `flowchart TD\n`;
    mermaid += `    startNode(["Start"]):::terminator\n`;

    let prevNode = 'startNode';
    let nodeIndex = 1;
    let pendingDecision = null;

    for (let i = 0; i < cleanLines.length; i++) {
        const line = cleanLines[i];
        const safeText = sanitizeMermaidText(line);

        // 1. Input statement
        if (/input\s*\(/.test(line)) {
            const nodeId = `node_${nodeIndex++}`;
            mermaid += `    ${nodeId}[/"${safeText}"/]:::io\n`;
            if (pendingDecision) {
                mermaid += `    ${pendingDecision.id} -->|${pendingDecision.branch}| ${nodeId}\n`;
                pendingDecision = null;
            } else {
                mermaid += `    ${prevNode} --> ${nodeId}\n`;
            }
            prevNode = nodeId;
        }
        // 2. Output / Print statement
        else if (/^print\s*\(/.test(line)) {
            const nodeId = `node_${nodeIndex++}`;
            mermaid += `    ${nodeId}[\\"${safeText}"\\]:::io\n`;
            if (pendingDecision) {
                mermaid += `    ${pendingDecision.id} -->|${pendingDecision.branch}| ${nodeId}\n`;
                pendingDecision = null;
            } else {
                mermaid += `    ${prevNode} --> ${nodeId}\n`;
            }
            prevNode = nodeId;
        }
        // 3. Decision (if / elif)
        else if (/^(if|elif)\s+/.test(line)) {
            const cond = line.replace(/^(if|elif)\s+/, '').replace(/:$/, '').trim();
            const nodeId = `decision_${nodeIndex++}`;
            mermaid += `    ${nodeId}{"${sanitizeMermaidText(cond)}?"}:::decision\n`;
            if (pendingDecision) {
                mermaid += `    ${pendingDecision.id} -->|${pendingDecision.branch}| ${nodeId}\n`;
            } else {
                mermaid += `    ${prevNode} --> ${nodeId}\n`;
            }
            pendingDecision = { id: nodeId, branch: 'Yes' };
            prevNode = nodeId;
        }
        // 4. Else branch
        else if (/^else\s*:/.test(line)) {
            // Find parent decision if available
            pendingDecision = { id: prevNode, branch: 'No' };
        }
        // 5. Loops (for / while)
        else if (/^(while|for)\s+/.test(line)) {
            const loopCond = line.replace(/:$/, '').trim();
            const nodeId = `loop_${nodeIndex++}`;
            mermaid += `    ${nodeId}{{"${sanitizeMermaidText(loopCond)}"}}:::loop\n`;
            if (pendingDecision) {
                mermaid += `    ${pendingDecision.id} -->|${pendingDecision.branch}| ${nodeId}\n`;
                pendingDecision = null;
            } else {
                mermaid += `    ${prevNode} --> ${nodeId}\n`;
            }
            pendingDecision = { id: nodeId, branch: 'Iterate' };
            prevNode = nodeId;
        }
        // 6. Regular Process / Assignment
        else {
            const nodeId = `process_${nodeIndex++}`;
            mermaid += `    ${nodeId}["${safeText}"]:::process\n`;
            if (pendingDecision) {
                mermaid += `    ${pendingDecision.id} -->|${pendingDecision.branch}| ${nodeId}\n`;
                pendingDecision = null;
            } else {
                mermaid += `    ${prevNode} --> ${nodeId}\n`;
            }
            prevNode = nodeId;
        }
    }

    const endNode = `endNode(["End"]):::terminator`;
    mermaid += `    ${endNode}\n`;
    mermaid += `    ${prevNode} --> endNode\n\n`;

    // Conventional Shape Styling Classes
    mermaid += `    classDef terminator fill:#dcfce7,stroke:#16a34a,stroke-width:2px,font-weight:bold,color:#14532d;\n`;
    mermaid += `    classDef io fill:#dbeafe,stroke:#2563eb,stroke-width:2px,color:#1e3a8a;\n`;
    mermaid += `    classDef process fill:#f8fafc,stroke:#475569,stroke-width:2px,color:#0f172a;\n`;
    mermaid += `    classDef decision fill:#fef3c7,stroke:#d97706,stroke-width:2px,font-weight:bold,color:#78350f;\n`;
    mermaid += `    classDef loop fill:#f3e8ff,stroke:#9333ea,stroke-width:2px,font-weight:bold,color:#581c87;\n`;

    return mermaid;
}

/**
 * Deterministic SQL to ER Diagram Generator
 * Extracts tables, columns, primary keys, and foreign keys from SQL DDL.
 */
function deterministicSqlERDiagram(sqlCode, notation = 'conventional') {
    const tableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_]+)\s*\(([\s\S]*?)\);/gi;
    const tables = [];
    let match;

    while ((match = tableRegex.exec(sqlCode)) !== null) {
        const tableName = match[1];
        const body = match[2];
        const lines = body.split(',\n').map(l => l.trim()).filter(Boolean);
        const columns = [];
        const fks = [];

        for (const line of lines) {
            const fkMatch = line.match(/FOREIGN\s+KEY\s*\(([a-zA-Z0-9_]+)\)\s*REFERENCES\s*([a-zA-Z0-9_]+)\s*\(([a-zA-Z0-9_]+)\)/i);
            if (fkMatch) {
                fks.push({ fromCol: fkMatch[1], targetTable: fkMatch[2], targetCol: fkMatch[3] });
                continue;
            }
            const colMatch = line.match(/^([a-zA-Z0-9_]+)\s+([a-zA-Z0-9_]+(?:\([0-9, ]+\))?)(.*)$/i);
            if (colMatch) {
                const colName = colMatch[1];
                let colType = colMatch[2].replace(/\(.*?\)/, '').trim();
                const rest = colMatch[3] || '';
                const isPK = /PRIMARY\s+KEY/i.test(rest) || /PRIMARY\s+KEY/i.test(line);
                columns.push({ name: colName, type: colType || 'TEXT', isPK });
            }
        }
        tables.push({ name: tableName, columns, fks });
    }

    if (tables.length === 0) {
        // Fallback demo schema if student wrote raw queries without CREATE TABLE
        return notation === 'relational' ? 
`erDiagram
    STUDENTS ||--o{ ENROLLMENT : enrolls
    COURSES ||--o{ ENROLLMENT : contains
    STUDENTS {
        int id PK
        string name
        string email
    }
    COURSES {
        int id PK
        string title
        int credits
    }
    ENROLLMENT {
        int id PK
        int student_id FK
        int course_id FK
        date enrolled_at
    }` :
`flowchart TD
    ent_stud["STUDENT"]:::entity
    ent_course["COURSE"]:::entity
    rel_enroll{"ENROLLS_IN"}:::relationship

    attr_s1(["<u>id</u> (PK)"]):::pkAttr
    attr_s2(["name"]):::attr
    attr_c1(["<u>id</u> (PK)"]):::pkAttr
    attr_c2(["title"]):::attr

    ent_stud --- attr_s1
    ent_stud --- attr_s2
    ent_course --- attr_c1
    ent_course --- attr_c2

    ent_stud ---|N| rel_enroll
    rel_enroll ---|M| ent_course

    classDef entity fill:#e0e7ff,stroke:#4338ca,stroke-width:2px,font-weight:bold,color:#1e1b4b;
    classDef relationship fill:#fef3c7,stroke:#d97706,stroke-width:2px,font-weight:bold,color:#78350f;
    classDef pkAttr fill:#dcfce7,stroke:#16a34a,stroke-width:2px,font-weight:bold,color:#14532d;
    classDef attr fill:#f8fafc,stroke:#64748b,stroke-width:1.5px,color:#334155;`;
    }

    if (notation === 'relational') {
        let er = `erDiagram\n`;
        // Relationships
        for (const tbl of tables) {
            for (const fk of tbl.fks) {
                er += `    ${fk.targetTable} ||--o{ ${tbl.name} : "references"\n`;
            }
        }
        // Table columns
        for (const tbl of tables) {
            er += `    ${tbl.name} {\n`;
            for (const col of tbl.columns) {
                const pkFlag = col.isPK ? ' PK' : (tbl.fks.some(f => f.fromCol === col.name) ? ' FK' : '');
                er += `        ${col.type.toLowerCase()} ${col.name}${pkFlag}\n`;
            }
            er += `    }\n`;
        }
        return er;
    }

    // Conventional Chen Notation
    let chen = `flowchart TD\n`;
    for (const tbl of tables) {
        const entId = `ent_${tbl.name}`;
        chen += `    ${entId}["${tbl.name.toUpperCase()}"]:::entity\n`;

        tbl.columns.forEach((col, idx) => {
            const attrId = `attr_${tbl.name}_${idx}`;
            if (col.isPK) {
                chen += `    ${attrId}(["<u>${col.name}</u> (PK)"]):::pkAttr\n`;
            } else {
                chen += `    ${attrId}(["${col.name}"]):::attr\n`;
            }
            chen += `    ${entId} --- ${attrId}\n`;
        });
    }

    // Relationships (Diamonds)
    let relIndex = 1;
    for (const tbl of tables) {
        for (const fk of tbl.fks) {
            const relId = `rel_${relIndex++}`;
            const relName = `HAS_${tbl.name.toUpperCase()}`;
            chen += `    ${relId}{"${relName}"}:::relationship\n`;
            chen += `    ent_${fk.targetTable} ---|1| ${relId}\n`;
            chen += `    ${relId} ---|N| ent_${tbl.name}\n`;
        }
    }

    // Chen Styling
    chen += `\n    classDef entity fill:#e0e7ff,stroke:#4338ca,stroke-width:2px,font-weight:bold,color:#1e1b4b;\n`;
    chen += `    classDef relationship fill:#fef3c7,stroke:#d97706,stroke-width:2px,font-weight:bold,color:#78350f;\n`;
    chen += `    classDef pkAttr fill:#dcfce7,stroke:#16a34a,stroke-width:2px,font-weight:bold,color:#14532d;\n`;
    chen += `    classDef attr fill:#f8fafc,stroke:#64748b,stroke-width:1.5px,color:#334155;\n`;

    return chen;
}

/**
 * High-Level Diagram Synthesizer with AI + Deterministic Fallback
 */
async function synthesizeDiagram({ language, code, diagramType = 'flowchart', notation = 'conventional' }) {
    const isPython = (language || '').toLowerCase().startsWith('py');
    const isSql = (language || '').toLowerCase().startsWith('sql');

    // 1. Try AI-powered synthesis for rich flow logic / relationships
    try {
        let systemPrompt = '';
        let userPrompt = '';

        if (isPython) {
            systemPrompt = `You are a Computer Science educator specializing in Flowcharts.
Convert the given Python code into a valid Mermaid flowchart TD string.
CRITICAL MANDATORY RULES for Conventional Flowchart Shapes:
1. Start and End MUST use rounded oval/pill nodes: ([Start]) and ([End]) with class :::terminator.
2. ALL Input and Output (input() or print()) MUST use parallelograms: [/Input text/] and [\\Print text\\] with class :::io.
3. Process/Assignment/Calculations MUST use rectangles: [sum = a + b] with class :::process.
4. Decision conditions (if, elif, while, for) MUST use diamonds: {condition?} with class :::decision.
   Branches from diamonds MUST be labeled: -->|Yes| or -->|No| or -->|True| or -->|False|.
5. Loops must have clear loopback arrows.
6. Include the following class definitions at the end:
   classDef terminator fill:#dcfce7,stroke:#16a34a,stroke-width:2px,font-weight:bold;
   classDef io fill:#dbeafe,stroke:#2563eb,stroke-width:2px;
   classDef process fill:#f8fafc,stroke:#475569,stroke-width:2px;
   classDef decision fill:#fef3c7,stroke:#d97706,stroke-width:2px,font-weight:bold;
7. Output ONLY the raw Mermaid diagram code inside \`\`\`mermaid ... \`\`\`. Do not include conversational text.`;
            userPrompt = `Generate a conventional flowchart for this Python code:\n\n${code}`;
        } else if (isSql) {
            if (notation === 'conventional') {
                systemPrompt = `You are a Database educator specializing in Entity-Relationship (ER) modeling using Peter Chen conventional notation.
Generate a valid Mermaid flowchart TD representing the ER diagram of the provided SQL schema.
CRITICAL MANDATORY RULES for Chen ER Notation:
1. Entities MUST be Rectangles: ent_table["ENTITY_NAME"] with class :::entity.
2. Attributes MUST be Ovals/Ellipses: attr_name(["attribute_name"]) with class :::attr.
3. Primary Key Attributes MUST be underlined or clearly marked: attr_pk(["<u>id</u> (PK)"]) with class :::pkAttr.
4. Relationships MUST be Diamonds: rel_name{"RELATIONSHIP_NAME"} with class :::relationship.
5. Cardinality MUST be labeled on lines: ent_1 ---|1| rel_name ---|N| ent_2.
6. Connect all attributes to their respective entity with lines (---).
7. Include class definitions:
   classDef entity fill:#e0e7ff,stroke:#4338ca,stroke-width:2px,font-weight:bold;
   classDef relationship fill:#fef3c7,stroke:#d97706,stroke-width:2px,font-weight:bold;
   classDef pkAttr fill:#dcfce7,stroke:#16a34a,stroke-width:2px,font-weight:bold;
   classDef attr fill:#f8fafc,stroke:#64748b,stroke-width:1.5px;
8. Output ONLY the raw Mermaid diagram code inside \`\`\`mermaid ... \`\`\`.`;
            } else {
                systemPrompt = `You are a Database educator. Convert the given SQL schema into a standard Mermaid erDiagram.
Include entities, columns, data types, PK and FK markers, and Crow's Foot relationships (||--o{, etc.).
Output ONLY the raw Mermaid code inside \`\`\`mermaid ... \`\`\`.`;
            }
            userPrompt = `Generate an ER diagram for this SQL code:\n\n${code}`;
        }

        const aiResponse = await Promise.race([
            aiService.executeChatCompletion({
                messages: [{ role: 'user', content: userPrompt }],
                systemPrompt,
                temperature: 0.1
            }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('AI diagram timeout')), 6000))
        ]);

        const rawText = aiResponse?.text || aiResponse?.content || '';
        const match = rawText.match(/```(?:mermaid)?\s*([\s\S]*?)```/i);
        if (match && match[1] && match[1].trim().length > 10) {
            return {
                mermaidCode: match[1].trim(),
                isAiGenerated: true,
                notation
            };
        }
    } catch (err) {
        // Fall through to deterministic fallback
    }

    // 2. Deterministic Fallback
    if (isPython) {
        return {
            mermaidCode: deterministicPythonFlowchart(code),
            isAiGenerated: false,
            notation: 'conventional'
        };
    } else {
        return {
            mermaidCode: deterministicSqlERDiagram(code, notation),
            isAiGenerated: false,
            notation
        };
    }
}

module.exports = {
    synthesizeDiagram,
    deterministicPythonFlowchart,
    deterministicSqlERDiagram
};
