/**
 * traditionalGenerators.js
 * 
 * Deterministic, offline, rule-based generators for Flowcharts and ER Diagrams.
 * Requires ZERO AI calls, ZERO API keys, and runs entirely in-memory at 60fps.
 */

// ============================================================================
// 1. TRADITIONAL CODE -> FLOWCHART STATIC ANALYSIS PARSER
// ============================================================================

/**
 * Parses Python, C, C++, or Java code into a visual Control Flow Graph (CFG) Flowchart.
 * @param {string} code - Source code string
 * @param {string} language - 'python' | 'c' | 'cpp' | 'java'
 * @returns {{ nodes: Array, connectors: Array }}
 */
export function generateFlowchartFromCode(code = '', language = 'python') {
    if (!code || !code.trim()) {
        return { nodes: [], connectors: [] };
    }

    const lines = code.split('\n');
    const nodes = [];
    const connectors = [];

    const xCenter = 240;
    let yCursor = 40;
    let nodeIdCounter = 1;

    const makeId = (prefix) => `node_${prefix}_${nodeIdCounter++}`;
    const makeConnId = () => `conn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // 1. Initial Start Terminator
    const startId = makeId('start');
    nodes.push({
        id: startId,
        type: 'terminator',
        text: 'Start',
        x: xCenter - 70,
        y: yCursor,
        width: 140,
        height: 50,
        color: '#dcfce7',
        borderColor: '#16a34a',
        textColor: '#14532d'
    });

    let prevNodeId = startId;
    yCursor += 85;

    // Filter relevant lines (skip comments, includes, boilerplate headers)
    const cleanStatements = [];
    for (let rawLine of lines) {
        const line = rawLine.trim();
        if (!line) continue;
        if (line.startsWith('#') || line.startsWith('//') || line.startsWith('/*') || line.startsWith('*')) continue;
        if (line.startsWith('#include') || line.startsWith('import ') || line.startsWith('from ') || line.startsWith('package ') || line.startsWith('using namespace')) continue;
        if (line === '{' || line === '}' || line === 'def main():' || line.includes('int main(') || line.includes('public static void main')) continue;
        cleanStatements.push(line);
    }

    // Limit maximum statements to keep diagram clean & pedagogical (max 12 steps)
    const activeStatements = cleanStatements.slice(0, 12);

    let activeLoopNode = null;
    let activeLoopBodyFirstNode = null;
    let activeLoopBodyLastNode = null;

    activeStatements.forEach((stmt, idx) => {
        // Classify statement type
        const isInput = stmt.includes('input(') || stmt.includes('scanf(') || stmt.includes('cin >>') || stmt.includes('Scanner');
        const isOutput = stmt.startsWith('print(') || stmt.startsWith('printf(') || stmt.includes('cout <<') || stmt.includes('System.out.print');
        const isWhileLoop = stmt.startsWith('while ') || stmt.startsWith('while(');
        const isForLoop = stmt.startsWith('for ') || stmt.startsWith('for(');
        const isIfCondition = stmt.startsWith('if ') || stmt.startsWith('if(');

        let nodeType = 'process';
        let displayText = stmt;
        let width = 170;
        let height = 54;
        let color = '#ffffff';
        let borderColor = '#64748b';
        let textColor = '#0f172a';

        if (isInput) {
            nodeType = 'io';
            width = 175;
            height = 54;
            color = '#dbeafe';
            borderColor = '#2563eb';
            textColor = '#1e3a8a';

            // Clean input expression
            const match = stmt.match(/([a-zA-Z_]\w*)\s*=\s*(?:int|float|str)?\s*\(?input\(/);
            if (match) {
                displayText = `Input ${match[1]}`;
            } else {
                displayText = stmt.replace(/;\s*$/, '');
            }
        } else if (isOutput) {
            nodeType = 'io';
            width = 175;
            height = 54;
            color = '#dbeafe';
            borderColor = '#2563eb';
            textColor = '#1e3a8a';

            // Clean output expression
            const printMatch = stmt.match(/(?:print|printf)\s*\((.*?)\)/);
            if (printMatch) {
                const inner = printMatch[1].replace(/["']/g, '').trim();
                displayText = `Display ${inner.substring(0, 24)}`;
            } else {
                displayText = stmt.replace(/;\s*$/, '');
            }
        } else if (isWhileLoop || isForLoop) {
            nodeType = 'decision';
            width = 160;
            height = 70;
            color = '#fef3c7';
            borderColor = '#d97706';
            textColor = '#78350f';

            if (isWhileLoop) {
                const cond = stmt.replace(/^while\s*\(?/, '').replace(/[:\)\{]\s*$/, '').trim();
                displayText = `${cond} ?`;
            } else {
                const forCond = stmt.replace(/^for\s*\(?/, '').replace(/[:\)\{]\s*$/, '').trim();
                displayText = `${forCond.substring(0, 20)} ?`;
            }
        } else if (isIfCondition) {
            nodeType = 'decision';
            width = 155;
            height = 70;
            color = '#fef3c7';
            borderColor = '#d97706';
            textColor = '#78350f';

            const cond = stmt.replace(/^if\s*\(?/, '').replace(/[:\)\{]\s*$/, '').trim();
            displayText = `${cond} ?`;
        } else {
            // General process / assignment
            nodeType = 'process';
            width = 170;
            height = 54;
            color = '#ffffff';
            borderColor = '#64748b';
            textColor = '#0f172a';
            displayText = stmt.replace(/;\s*$/, '').substring(0, 28);
        }

        const nodeId = makeId(nodeType);
        nodes.push({
            id: nodeId,
            type: nodeType,
            text: displayText,
            x: xCenter - width / 2,
            y: yCursor,
            width,
            height,
            color,
            borderColor,
            textColor
        });

        // Create sequential connector from previous node
        if (prevNodeId) {
            const isPrevDecision = nodes.find((n) => n.id === prevNodeId)?.type === 'decision';
            connectors.push({
                id: makeConnId(),
                from: prevNodeId,
                fromPort: 'bottom',
                to: nodeId,
                toPort: 'top',
                label: isPrevDecision ? 'Yes' : ''
            });
        }

        // Track loop nesting for loopback arrow
        if (isWhileLoop || isForLoop) {
            activeLoopNode = nodeId;
        } else if (activeLoopNode && !activeLoopBodyFirstNode) {
            activeLoopBodyFirstNode = nodeId;
            activeLoopBodyLastNode = nodeId;
        } else if (activeLoopNode) {
            activeLoopBodyLastNode = nodeId;
        }

        prevNodeId = nodeId;
        yCursor += height + 35;
    });

    // If a loop was detected, add loopback arrow from the last body node back to the loop decision
    if (activeLoopNode && activeLoopBodyLastNode) {
        connectors.push({
            id: makeConnId(),
            from: activeLoopBodyLastNode,
            fromPort: 'right',
            to: activeLoopNode,
            toPort: 'right',
            label: 'Loop'
        });
    }

    // Add End Terminator
    const endId = makeId('end');
    nodes.push({
        id: endId,
        type: 'terminator',
        text: 'End',
        x: xCenter - 70,
        y: yCursor,
        width: 140,
        height: 50,
        color: '#dcfce7',
        borderColor: '#16a34a',
        textColor: '#14532d'
    });

    if (prevNodeId) {
        const isPrevDecision = nodes.find((n) => n.id === prevNodeId)?.type === 'decision';
        connectors.push({
            id: makeConnId(),
            from: prevNodeId,
            fromPort: 'bottom',
            to: endId,
            toPort: 'top',
            label: isPrevDecision ? 'No' : ''
        });
    }

    return { nodes, connectors };
}

// ============================================================================
// 2. TRADITIONAL SQL DDL -> ER DIAGRAM SCHEMA PARSER
// ============================================================================

/**
 * Parses SQL or PL/SQL DDL code into Chen's ER Model & Relational Components.
 * @param {string} sqlCode - SQL schema code string
 * @returns {{ nodes: Array, connectors: Array }}
 */
export function generateErDiagramFromSql(sqlCode = '') {
    if (!sqlCode || !sqlCode.trim()) {
        return { nodes: [], connectors: [] };
    }

    const nodes = [];
    const connectors = [];
    let idCounter = 1;

    const makeId = (prefix) => `node_${prefix}_${idCounter++}`;
    const makeConnId = () => `conn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // Regular expression to match CREATE TABLE [IF NOT EXISTS] <tableName> ( ... );
    const tableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([`"\[]?\w+[`"\]]?)\s*\(([\s\S]*?)\)(?:\s*;|\s*$)/gi;

    const parsedTables = [];
    let match;

    while ((match = tableRegex.exec(sqlCode)) !== null) {
        const rawTableName = match[1].replace(/[`"\[\]]/g, '').trim();
        const body = match[2];

        // Split column lines by comma (handling nested parentheses in data types)
        const lines = [];
        let cur = '';
        let depth = 0;
        for (let i = 0; i < body.length; i++) {
            const char = body[i];
            if (char === '(') depth++;
            else if (char === ')') depth--;
            if (char === ',' && depth === 0) {
                if (cur.trim()) lines.push(cur.trim());
                cur = '';
            } else {
                cur += char;
            }
        }
        if (cur.trim()) lines.push(cur.trim());

        const columns = [];
        const primaryKeys = [];
        const foreignKeys = [];

        lines.forEach((line) => {
            const trimmed = line.trim();
            if (!trimmed) return;

            // Check table-level PRIMARY KEY (col1, col2)
            const pkMatch = trimmed.match(/^PRIMARY\s+KEY\s*\(([^)]+)\)/i);
            if (pkMatch) {
                const cols = pkMatch[1].split(',').map((c) => c.replace(/[`"\[\]]/g, '').trim());
                primaryKeys.push(...cols);
                return;
            }

            // Check table-level FOREIGN KEY (col) REFERENCES other_table(col)
            const fkMatch = trimmed.match(/^FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s*([`"\[]?\w+[`"\]]?)\s*\(([^)]+)\)/i);
            if (fkMatch) {
                const fromCol = fkMatch[1].replace(/[`"\[\]]/g, '').trim();
                const targetTable = fkMatch[2].replace(/[`"\[\]]/g, '').trim();
                const targetCol = fkMatch[3].replace(/[`"\[\]]/g, '').trim();
                foreignKeys.push({ fromCol, targetTable, targetCol });
                return;
            }

            // Skip constraints like CHECK, UNIQUE table-level
            if (/^(?:CONSTRAINT|CHECK|UNIQUE)\b/i.test(trimmed)) return;

            // Otherwise, it is a column definition
            const colTokens = trimmed.split(/\s+/);
            const colName = colTokens[0].replace(/[`"\[\]]/g, '');
            const colType = colTokens[1] || 'TEXT';

            let isPk = /PRIMARY\s+KEY/i.test(trimmed);
            if (isPk) primaryKeys.push(colName);

            // Inline foreign key reference: col INT REFERENCES other_table(col)
            const inlineRef = trimmed.match(/REFERENCES\s+([`"\[]?\w+[`"\]]?)\s*\(([^)]+)\)/i);
            if (inlineRef) {
                foreignKeys.push({
                    fromCol: colName,
                    targetTable: inlineRef[1].replace(/[`"\[\]]/g, ''),
                    targetCol: inlineRef[2].replace(/[`"\[\]]/g, '')
                });
            }

            columns.push({
                name: colName,
                type: colType,
                isPk
            });
        });

        // Ensure columns in table-level PK are marked
        columns.forEach((c) => {
            if (primaryKeys.includes(c.name)) c.isPk = true;
        });

        parsedTables.push({
            tableName: rawTableName,
            columns,
            primaryKeys,
            foreignKeys
        });
    }

    // Fallback if no CREATE TABLE was found in code
    if (parsedTables.length === 0) {
        return { nodes: [], connectors: [] };
    }

    // Map each table into an Entity + orbiting Attributes on canvas
    const entityMap = {};
    const tableSpacingX = 440;
    const tableSpacingY = 320;
    const colsPerRow = Math.max(1, Math.min(3, Math.ceil(Math.sqrt(parsedTables.length))));

    parsedTables.forEach((table, tIdx) => {
        const gridCol = tIdx % colsPerRow;
        const gridRow = Math.floor(tIdx / colsPerRow);

        const entityCenterX = 240 + gridCol * tableSpacingX;
        const entityCenterY = 160 + gridRow * tableSpacingY;

        // Determine if junction table (2+ FKs and only PKs/FKs)
        const isJunction = table.foreignKeys.length >= 2 && table.columns.length <= 4;

        if (isJunction) {
            // Represent as Relationship Diamond
            const relId = makeId('er_rel');
            const relWidth = 140;
            const relHeight = 66;

            const relNode = {
                id: relId,
                type: 'er_relationship',
                text: table.tableName.toUpperCase(),
                x: entityCenterX - relWidth / 2,
                y: entityCenterY - relHeight / 2,
                width: relWidth,
                height: relHeight,
                color: '#fef9c3',
                borderColor: '#ca8a04',
                textColor: '#854d0e'
            };
            nodes.push(relNode);
            entityMap[table.tableName.toLowerCase()] = { id: relId, node: relNode, isRel: true };
            return;
        }

        // Strong Entity Rectangle
        const entityId = makeId('er_ent');
        const entityWidth = 140;
        const entityHeight = 54;
        const entityNode = {
            id: entityId,
            type: 'er_entity',
            text: table.tableName.toUpperCase(),
            x: entityCenterX - entityWidth / 2,
            y: entityCenterY - entityHeight / 2,
            width: entityWidth,
            height: entityHeight,
            color: '#e0f2fe',
            borderColor: '#0284c7',
            textColor: '#0369a1'
        };
        nodes.push(entityNode);
        entityMap[table.tableName.toLowerCase()] = { id: entityId, node: entityNode, isRel: false };

        // Position Attributes around the Entity in an orbit
        const numAttrs = table.columns.length;
        const orbitRadiusX = 145;
        const orbitRadiusY = 100;

        table.columns.forEach((col, cIdx) => {
            const angle = (2 * Math.PI * cIdx) / Math.max(1, numAttrs) - Math.PI / 2;
            const attrX = Math.round(entityCenterX + orbitRadiusX * Math.cos(angle) - 55);
            const attrY = Math.round(entityCenterY + orbitRadiusY * Math.sin(angle) - 22);

            const attrId = makeId(col.isPk ? 'er_pk' : 'er_attr');
            const attrNode = {
                id: attrId,
                type: col.isPk ? 'er_key_attribute' : 'er_attribute',
                text: col.name,
                x: attrX,
                y: attrY,
                width: 110,
                height: 44,
                color: col.isPk ? '#fef3c7' : '#f0fdf4',
                borderColor: col.isPk ? '#d97706' : '#16a34a',
                textColor: col.isPk ? '#78350f' : '#15803d'
            };
            nodes.push(attrNode);

            // Connect attribute to entity
            connectors.push({
                id: makeConnId(),
                from: entityId,
                fromPort: 'top',
                to: attrId,
                toPort: 'bottom',
                label: ''
            });
        });
    });

    // Create Relationships between Entities based on Foreign Keys
    parsedTables.forEach((table) => {
        const sourceInfo = entityMap[table.tableName.toLowerCase()];
        if (!sourceInfo) return;

        table.foreignKeys.forEach((fk) => {
            const targetInfo = entityMap[fk.targetTable.toLowerCase()];
            if (!targetInfo) return;

            if (sourceInfo.isRel) {
                // Connect junction relationship to target entity
                connectors.push({
                    id: makeConnId(),
                    from: sourceInfo.id,
                    fromPort: 'right',
                    to: targetInfo.id,
                    toPort: 'left',
                    label: 'N'
                });
            } else {
                // Create a Relationship Diamond between source and target
                const relId = makeId('er_fk_rel');
                const midX = Math.round((sourceInfo.node.x + targetInfo.node.x) / 2);
                const midY = Math.round((sourceInfo.node.y + targetInfo.node.y) / 2);

                const relNode = {
                    id: relId,
                    type: 'er_relationship',
                    text: `HAS_${fk.targetTable.toUpperCase()}`,
                    x: midX - 60,
                    y: midY - 30,
                    width: 120,
                    height: 60,
                    color: '#fef9c3',
                    borderColor: '#ca8a04',
                    textColor: '#854d0e'
                };
                nodes.push(relNode);

                // Source (N) -> Relationship -> Target (1)
                connectors.push({
                    id: makeConnId(),
                    from: sourceInfo.id,
                    fromPort: 'right',
                    to: relId,
                    toPort: 'left',
                    label: 'N'
                });
                connectors.push({
                    id: makeConnId(),
                    from: relId,
                    fromPort: 'right',
                    to: targetInfo.id,
                    toPort: 'left',
                    label: '1'
                });
            }
        });
    });

    return { nodes, connectors };
}
