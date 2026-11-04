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
 * Features:
 * - Groups consecutive variable definitions/initializations into a single compact Process block.
 * - Groups consecutive print statements into a single compact Output block.
 * - Properly structures While/For loops with 'Yes' branch, loopback arrow, and 'No' false branch.
 * @param {string} code - Source code string
 * @param {string} language - 'python' | 'c' | 'cpp' | 'java'
 * @returns {{ nodes: Array, connectors: Array }}
 */
export function generateFlowchartFromCode(code = '', language = 'python') {
    if (!code || !code.trim()) {
        return { nodes: [], connectors: [] };
    }

    // 1. Strip multi-line docstrings ("""...""" or '''...''') and block comments (/*...*/)
    let sanitizedCode = code
        .replace(/"""[\s\S]*?"""/g, '')
        .replace(/'''[\s\S]*?'''/g, '')
        .replace(/\/\*[\s\S]*?\*\//g, '');

    const rawLines = sanitizedCode.split('\n');
    const statements = [];

    for (let raw of rawLines) {
        if (!raw.trim()) continue;
        // Strip inline comments (# comment or // comment)
        let line = raw.replace(/\s*#.*$/, '').replace(/\s*\/\/.*$/, '');
        const trimmed = line.trim();
        if (!trimmed) continue;

        // Skip headers, comments, decorative lines, imports, and function wrappers
        if (trimmed.startsWith('#') || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*') || trimmed.startsWith('--')) continue;
        if (/^[=\-\*#~]{3,}/.test(trimmed)) continue; // Decorative separator lines (e.g. === or ---)
        if (/^['"][^'"]*['"]$/.test(trimmed)) continue; // Standalone string literal (e.g. 'Program Header')
        if (trimmed.startsWith('@')) continue; // Python decorators
        if (trimmed.startsWith('#include') || trimmed.startsWith('import ') || trimmed.startsWith('from ') || trimmed.startsWith('package ') || trimmed.startsWith('using namespace')) continue;
        if (trimmed === '{' || trimmed === '}' || trimmed === 'def main():' || trimmed.includes('int main(') || trimmed.includes('public static void main')) continue;
        if (/^def\s+[a-zA-Z_]\w*\s*\(.*?\)\s*:/.test(trimmed)) continue; // Function definition header (e.g. def foo(x):)
        if (/^(?:void|int|float|double|char|bool|public|private|protected|static)\s+[a-zA-Z_]\w*\s*\(.*?\)\s*\{?$/.test(trimmed)) continue; // C/Java function headers

        const indent = raw.match(/^\s*/)[0].replace(/\t/g, '    ').length;
        statements.push({ text: trimmed, indent });
    }

    if (statements.length === 0) {
        return { nodes: [], connectors: [] };
    }

    const nodes = [];
    const connectors = [];
    const xCenter = 240;
    let yCursor = 40;
    let counter = 1;

    const makeId = (prefix) => `node_${prefix}_${counter++}`;
    const makeConnId = () => `conn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // 1. Start Terminator
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

    const isFunctionCall = (text) => {
        const clean = text.replace(/^(?:let|var|const|auto|int|float|double|char)\s+/, '').trim();
        const callMatch = clean.match(/^(?:([a-zA-Z_]\w*)\s*=\s*)?([a-zA-Z_]\w*(?:\.[a-zA-Z_]\w*)*)\s*\((.*?)\)\s*;?$/);
        if (!callMatch) return null;
        const fnName = callMatch[2];
        const builtins = ['print', 'printf', 'cout', 'input', 'scanf', 'cin', 'int', 'float', 'str', 'bool', 'range', 'len', 'list', 'dict', 'set', 'tuple', 'append', 'pop', 'sort'];
        if (builtins.includes(fnName)) return null;
        return {
            assignedVar: callMatch[1] || null,
            fnName: fnName,
            args: callMatch[3] || ''
        };
    };

    const classify = (text) => {
        if (/\b(input|scanf|cin|Scanner|readline)\b/.test(text)) return 'input';
        if (/\b(print|printf|cout|System\.out\.print|println)\b/.test(text)) return 'output';
        if (text.startsWith('while ') || text.startsWith('while(')) return 'while';
        if (text.startsWith('for ') || text.startsWith('for(')) return 'for';
        if (text.startsWith('if ') || text.startsWith('if(')) return 'if';
        if (isFunctionCall(text)) return 'call';
        return 'assign';
    };

    const cleanInput = (stmt) => {
        const m = stmt.match(/([a-zA-Z_]\w*(?:\s*,\s*[a-zA-Z_]\w*)*)\s*=\s*(?:int|float|str)?\s*\(?input\(/);
        if (m) return `Input ${m[1]}`;
        const cinMatch = stmt.match(/cin\s*>>\s*([a-zA-Z_]\w*(?:\s*>>\s*[a-zA-Z_]\w*)*)/);
        if (cinMatch) return `Input ${cinMatch[1].replace(/>>/g, ',')}`;
        const scanfMatch = stmt.match(/scanf\s*\([^,]+,\s*([^)]+)\)/);
        if (scanfMatch) {
            const vars = scanfMatch[1].split(',').map(v => v.trim().replace(/^&/, '')).join(', ');
            return `Input ${vars}`;
        }
        const plainInput = stmt.match(/([a-zA-Z_]\w*)\s*=\s*input\(/);
        if (plainInput) return `Input ${plainInput[1]}`;
        return `Input ${stmt.replace(/;\s*$/, '').substring(0, 20)}`;
    };

    const cleanOutput = (stmt) => {
        const m = stmt.match(/(?:print|printf)\s*\((.*?)\)/);
        if (m) {
            const inner = m[1];
            // Strip string literals "..." and '...' to isolate variables
            const withoutQuotes = inner.replace(/"[^"]*"/g, '').replace(/'[^']*'/g, '').replace(/f"[^"]*"/g, '');
            const tokens = withoutQuotes
                .split(/[,\s]+/)
                .map((t) => t.replace(/[^a-zA-Z0-9_]/g, '').trim())
                .filter((t) => t.length > 0 && !/^(end|sep|flush)$/i.test(t));
            if (tokens.length > 0) {
                return tokens.join(', ');
            }
            const fallback = inner.replace(/["']/g, '').trim();
            return fallback.substring(0, 24);
        }
        const coutMatch = stmt.match(/cout\s*<<\s*(.*?);/);
        if (coutMatch) {
            const parts = coutMatch[1].split('<<').map(p => p.trim()).filter(p => !p.startsWith('"') && !p.startsWith("'") && p !== 'endl');
            return parts.length > 0 ? parts.join(', ') : 'result';
        }
        return stmt.replace(/;\s*$/, '').substring(0, 24);
    };

    const cleanCondition = (stmt, type) => {
        if (type === 'while') {
            return stmt.replace(/^while\s*\(?/, '').replace(/[:\)\{]\s*$/, '').trim() + ' ?';
        }
        if (type === 'for') {
            const m = stmt.match(/for\s+(.*?)\s+in\s+range\((.*?)\)/);
            if (m) return `${m[1]} in range(${m[2]}) ?`;
            const cFor = stmt.match(/for\s*\([^;]*;\s*([^;]+);/);
            if (cFor) return `${cFor[1].trim()} ?`;
            return stmt.replace(/^for\s*\(?/, '').replace(/[:\)\{]\s*$/, '').trim() + ' ?';
        }
        if (type === 'if') {
            return stmt.replace(/^if\s*\(?/, '').replace(/[:\)\{]\s*$/, '').trim() + ' ?';
        }
        return stmt;
    };

    let idx = 0;
    let pendingFalseSource = null;

    const connectIncoming = (targetNodeId, targetPort = 'top') => {
        if (pendingFalseSource) {
            const sourceId = typeof pendingFalseSource === 'object' ? pendingFalseSource.nodeId : pendingFalseSource;
            const sourcePort = typeof pendingFalseSource === 'object' ? (pendingFalseSource.port || 'right') : 'right';
            const sourceLabel = typeof pendingFalseSource === 'object' ? (pendingFalseSource.label !== undefined ? pendingFalseSource.label : 'No') : 'No';

            connectors.push({
                id: makeConnId(),
                from: sourceId,
                fromPort: sourcePort,
                to: targetNodeId,
                toPort: targetPort,
                label: sourceLabel
            });
            pendingFalseSource = null;
        }
        if (prevNodeId) {
            connectors.push({
                id: makeConnId(),
                from: prevNodeId,
                fromPort: 'bottom',
                to: targetNodeId,
                toPort: targetPort,
                label: ''
            });
            prevNodeId = null;
        }
    };

    while (idx < statements.length) {
        const item = statements[idx];
        const kind = classify(item.text);

        if (kind === 'input') {
            const width = 170;
            const height = 52;
            const nodeId = makeId('io');
            nodes.push({
                id: nodeId,
                type: 'io',
                text: cleanInput(item.text),
                x: xCenter - width / 2,
                y: yCursor,
                width,
                height,
                color: '#dbeafe',
                borderColor: '#2563eb',
                textColor: '#1e3a8a'
            });

            connectIncoming(nodeId);
            prevNodeId = nodeId;
            yCursor += height + 35;
            idx++;
        } else if (kind === 'call') {
            // Function Call (ISO 5807 Predefined Process / Subroutine)
            const callInfo = isFunctionCall(item.text);
            const callText = callInfo?.assignedVar
                ? `${callInfo.assignedVar} = Call ${callInfo.fnName}(${callInfo.args.trim()})`
                : `Call ${callInfo?.fnName || item.text}(${callInfo?.args?.trim() || ''})`;

            const width = 190;
            const height = 54;
            const nodeId = makeId('call');
            nodes.push({
                id: nodeId,
                type: 'predefined_process',
                text: callText,
                x: xCenter - width / 2,
                y: yCursor,
                width,
                height,
                color: '#f5f3ff',
                borderColor: '#7c3aed',
                textColor: '#4c1d95'
            });

            connectIncoming(nodeId);
            prevNodeId = nodeId;
            yCursor += height + 35;
            idx++;
        } else if (kind === 'assign') {
            // Group consecutive assignment/variable statements at the same scope into ONE combined process block
            const group = [];
            const startIndent = item.indent;
            while (idx < statements.length && classify(statements[idx].text) === 'assign' && statements[idx].indent === startIndent) {
                const cleanStmt = statements[idx].text
                    .replace(/^(int|float|double|long|char|auto)\s+/, '')
                    .replace(/;\s*$/, '');
                group.push(cleanStmt);
                idx++;
            }

            const width = 180;
            const height = Math.max(54, 30 + group.length * 16);
            const nodeId = makeId('process');
            nodes.push({
                id: nodeId,
                type: 'process',
                text: group.join('\n'),
                x: xCenter - width / 2,
                y: yCursor,
                width,
                height,
                color: '#ffffff',
                borderColor: '#64748b',
                textColor: '#0f172a'
            });

            connectIncoming(nodeId);
            prevNodeId = nodeId;
            yCursor += height + 35;
        } else if (kind === 'if') {
            const ifIndent = item.indent;
            const ifNodeId = makeId('decision');
            const ifWidth = 160;
            const ifHeight = 72;
            const condText = cleanCondition(item.text, 'if');

            nodes.push({
                id: ifNodeId,
                type: 'decision',
                text: condText,
                x: xCenter - ifWidth / 2,
                y: yCursor,
                width: ifWidth,
                height: ifHeight,
                color: '#fef3c7',
                borderColor: '#d97706',
                textColor: '#78350f'
            });

            connectIncoming(ifNodeId);

            idx++;
            yCursor += ifHeight + 40;

            // Collect statements in True (if) branch
            const trueStmts = [];
            while (
                idx < statements.length &&
                statements[idx].indent > ifIndent &&
                !/^(else\s*:|else\s*\{|elif\b)/.test(statements[idx].text)
            ) {
                trueStmts.push(statements[idx]);
                idx++;
            }

            // Check if there is an Else (or Elif) branch
            let elseStmts = [];
            if (
                idx < statements.length &&
                /^(else\s*:|else\s*\{|elif\b)/.test(statements[idx].text) &&
                statements[idx].indent === ifIndent
            ) {
                idx++; // consume 'else:'
                while (idx < statements.length && statements[idx].indent > ifIndent) {
                    elseStmts.push(statements[idx]);
                    idx++;
                }
            }

            // Build node for True Branch
            let trueNodeId = null;
            if (trueStmts.length > 0) {
                const firstKind = classify(trueStmts[0].text);
                trueNodeId = makeId(firstKind === 'output' ? 'io' : 'process');
                const trueTexts = trueStmts.map((s) => {
                    const k = classify(s.text);
                    if (k === 'output') return `Display ${cleanOutput(s.text)}`;
                    if (k === 'input') return cleanInput(s.text);
                    return s.text.replace(/;\s*$/, '');
                });

                const tWidth = 175;
                const tHeight = Math.max(54, 30 + trueTexts.length * 16);
                const isTrueOutput = firstKind === 'output';

                nodes.push({
                    id: trueNodeId,
                    type: isTrueOutput ? 'io' : 'process',
                    text: trueTexts.join('\n'),
                    x: elseStmts.length > 0 ? xCenter - tWidth - 25 : xCenter - tWidth / 2,
                    y: yCursor,
                    width: tWidth,
                    height: tHeight,
                    color: isTrueOutput ? '#dbeafe' : '#ffffff',
                    borderColor: isTrueOutput ? '#2563eb' : '#64748b',
                    textColor: isTrueOutput ? '#1e3a8a' : '#0f172a'
                });

                connectors.push({
                    id: makeConnId(),
                    from: ifNodeId,
                    fromPort: 'bottom',
                    to: trueNodeId,
                    toPort: 'top',
                    label: 'Yes'
                });
            }

            // Build node for False / Else Branch if present
            let elseNodeId = null;
            if (elseStmts.length > 0) {
                const firstKind = classify(elseStmts[0].text);
                elseNodeId = makeId(firstKind === 'output' ? 'io' : 'process');
                const elseTexts = elseStmts.map((s) => {
                    const k = classify(s.text);
                    if (k === 'output') return `Display ${cleanOutput(s.text)}`;
                    if (k === 'input') return cleanInput(s.text);
                    return s.text.replace(/;\s*$/, '');
                });

                const eWidth = 175;
                const eHeight = Math.max(54, 30 + elseTexts.length * 16);
                const isElseOutput = firstKind === 'output';

                nodes.push({
                    id: elseNodeId,
                    type: isElseOutput ? 'io' : 'process',
                    text: elseTexts.join('\n'),
                    x: xCenter + 25,
                    y: yCursor,
                    width: eWidth,
                    height: eHeight,
                    color: isElseOutput ? '#dbeafe' : '#ffffff',
                    borderColor: isElseOutput ? '#2563eb' : '#64748b',
                    textColor: isElseOutput ? '#1e3a8a' : '#0f172a'
                });

                connectors.push({
                    id: makeConnId(),
                    from: ifNodeId,
                    fromPort: 'right',
                    to: elseNodeId,
                    toPort: 'top',
                    label: 'No'
                });
            }

            // Convergence & cursor advancement
            if (trueNodeId && elseNodeId) {
                yCursor += Math.max(54, trueStmts.length * 16, elseStmts.length * 16) + 45;
                prevNodeId = trueNodeId;
                pendingFalseSource = { nodeId: elseNodeId, port: 'bottom', label: '' };
            } else if (trueNodeId) {
                yCursor += Math.max(54, trueStmts.length * 16) + 40;
                prevNodeId = trueNodeId;
                pendingFalseSource = { nodeId: ifNodeId, port: 'right', label: 'No' };
            } else if (elseNodeId) {
                yCursor += Math.max(54, elseStmts.length * 16) + 40;
                prevNodeId = ifNodeId;
                pendingFalseSource = { nodeId: elseNodeId, port: 'bottom', label: '' };
            } else {
                prevNodeId = ifNodeId;
                pendingFalseSource = null;
            }
        } else if (kind === 'while' || kind === 'for') {
            const loopIndent = item.indent;
            const loopNodeId = makeId('decision');
            const loopWidth = 160;
            const loopHeight = 72;
            const condText = cleanCondition(item.text, kind);

            nodes.push({
                id: loopNodeId,
                type: 'decision',
                text: condText,
                x: xCenter - loopWidth / 2,
                y: yCursor,
                width: loopWidth,
                height: loopHeight,
                color: '#fef3c7',
                borderColor: '#d97706',
                textColor: '#78350f'
            });

            connectIncoming(loopNodeId);

            idx++;
            yCursor += loopHeight + 40;

            // Collect loop body statements (statements belonging inside the loop)
            const bodyStmts = [];
            while (idx < statements.length && statements[idx].indent > loopIndent) {
                const cleanStmt = statements[idx].text
                    .replace(/^(int|float|double|long|char|auto)\s+/, '')
                    .replace(/;\s*$/, '');
                bodyStmts.push(cleanStmt);
                idx++;
            }

            if (bodyStmts.length > 0) {
                const bodyNodeId = makeId('process');
                const bodyWidth = 180;
                const bodyHeight = Math.max(54, 30 + bodyStmts.length * 16);

                nodes.push({
                    id: bodyNodeId,
                    type: 'process',
                    text: bodyStmts.join('\n'),
                    x: xCenter - bodyWidth / 2,
                    y: yCursor,
                    width: bodyWidth,
                    height: bodyHeight,
                    color: '#ffffff',
                    borderColor: '#64748b',
                    textColor: '#0f172a'
                });

                // 'Yes' connector from loop decision to loop body
                connectors.push({
                    id: makeConnId(),
                    from: loopNodeId,
                    fromPort: 'bottom',
                    to: bodyNodeId,
                    toPort: 'top',
                    label: 'Yes'
                });

                // Loopback connector returning from loop body left port back to loop condition
                connectors.push({
                    id: makeConnId(),
                    from: bodyNodeId,
                    fromPort: 'left',
                    to: loopNodeId,
                    toPort: 'left',
                    label: 'Loop'
                });

                yCursor += bodyHeight + 40;
            }

            // The loop decision's False branch connects to the subsequent statement outside loop
            prevNodeId = null;
            pendingFalseSource = { nodeId: loopNodeId, port: 'right', label: 'No' };
        } else if (kind === 'output') {
            // Group consecutive print/output statements into ONE combined display node
            const outputs = [];
            while (idx < statements.length && classify(statements[idx].text) === 'output') {
                const clean = cleanOutput(statements[idx].text);
                if (clean) outputs.push(clean);
                idx++;
            }

            const width = 185;
            const height = 54;
            const nodeId = makeId('io');
            nodes.push({
                id: nodeId,
                type: 'io',
                text: `Display ${outputs.join(', ')}`,
                x: xCenter - width / 2,
                y: yCursor,
                width,
                height,
                color: '#dbeafe',
                borderColor: '#2563eb',
                textColor: '#1e3a8a'
            });

            connectIncoming(nodeId);

            prevNodeId = nodeId;
            yCursor += height + 35;
        } else {
            idx++;
        }
    }

    // End Terminator
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

    connectIncoming(endId);

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
                connectors.push({
                    id: makeConnId(),
                    from: sourceInfo.id,
                    fromPort: 'right',
                    to: targetInfo.id,
                    toPort: 'left',
                    label: 'N'
                });
            } else {
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

// ============================================================================
// 3. RELATIONAL ER DIAGRAM GENERATOR (FROM LIVE DB SCHEMA OR PARSED DDL)
// ============================================================================

/**
 * Generates relational schema table cards with full types, PKs, FKs, constraints and relationships.
 * 100% deterministic, offline, ZERO AI.
 * 
 * @param {{ tables: Array<{ name: string, columns: Array, foreignKeys: Array }> }} schema
 * @returns {{ nodes: Array, connectors: Array }}
 */
export function generateRelationalErDiagram(schema) {
    if (!schema || !schema.tables || schema.tables.length === 0) {
        return { nodes: [], connectors: [] };
    }

    const nodes = [];
    const connectors = [];
    let idCounter = 1;

    const makeId = (prefix) => `node_${prefix}_${idCounter++}`;
    const makeConnId = () => `conn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const tables = schema.tables;
    const tableNodesMap = new Map();

    const colsPerRow = Math.max(1, Math.min(3, Math.ceil(Math.sqrt(tables.length))));
    const cardSpacingX = 360;
    const cardSpacingY = 260;

    tables.forEach((table, idx) => {
        const gridCol = idx % colsPerRow;
        const gridRow = Math.floor(idx / colsPerRow);

        const x = 100 + gridCol * cardSpacingX;
        const y = 80 + gridRow * cardSpacingY;

        // Build table card text lines
        const lines = [table.name.toUpperCase()];
        let maxLineLength = table.name.length;

        (table.columns || []).forEach(col => {
            let line = col.name;
            if (col.type) line += ` ${col.type}`;
            if (col.isPk) line += ' PK';
            if (col.isFk) line += ' FK';
            if (!col.nullable && !col.isPk) line += ' NOT NULL';
            if (col.defaultValue !== null && col.defaultValue !== undefined) {
                line += ` DEFAULT ${col.defaultValue}`;
            }

            lines.push(line);
            if (line.length > maxLineLength) maxLineLength = line.length;
        });

        const cardWidth = Math.min(340, Math.max(220, maxLineLength * 9 + 40));
        const cardHeight = Math.max(90, 36 + (table.columns ? table.columns.length : 1) * 20 + 10);

        const nodeId = makeId('tbl');
        const node = {
            id: nodeId,
            type: 'er_table',
            text: lines.join('\n'),
            x,
            y,
            width: cardWidth,
            height: cardHeight,
            color: '#f8fafc',
            borderColor: '#475569',
            textColor: '#0f172a'
        };

        nodes.push(node);
        tableNodesMap.set(table.name.toLowerCase(), { id: nodeId, node, colCount: lines.length });
    });

    // Generate relationship connectors for Foreign Keys
    tables.forEach(table => {
        const sourceInfo = tableNodesMap.get(table.name.toLowerCase());
        if (!sourceInfo) return;

        (table.foreignKeys || []).forEach(fk => {
            const targetTable = (fk.referencedTable || '').toLowerCase();
            const targetInfo = tableNodesMap.get(targetTable);

            if (targetInfo && targetInfo.id !== sourceInfo.id) {
                const isLeftToRight = sourceInfo.node.x < targetInfo.node.x;
                connectors.push({
                    id: makeConnId(),
                    from: sourceInfo.id,
                    fromPort: isLeftToRight ? 'right' : 'left',
                    to: targetInfo.id,
                    toPort: isLeftToRight ? 'left' : 'right',
                    label: `1 : N (${fk.column})`
                });
            }
        });
    });

    return { nodes, connectors };
}

/**
 * Parses SQL DDL string into structured schema definition for Database Designer.
 */
export function parseSqlDdlToSchema(sqlCode = '') {
    if (!sqlCode || !sqlCode.trim()) return { tables: [] };
    const tableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([`"\[]?\w+[`"\]]?)\s*\(([\s\S]*?)\)(?:\s*;|\s*$)/gi;
    const tables = [];
    let match;

    while ((match = tableRegex.exec(sqlCode)) !== null) {
        const rawTableName = match[1].replace(/[`"\[\]]/g, '').trim();
        const body = match[2];

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

            const pkMatch = trimmed.match(/^PRIMARY\s+KEY\s*\(([^)]+)\)/i);
            if (pkMatch) {
                const cols = pkMatch[1].split(',').map((c) => c.replace(/[`"\[\]]/g, '').trim());
                primaryKeys.push(...cols);
                return;
            }

            const fkMatch = trimmed.match(/^FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s*([`"\[]?\w+[`"\]]?)\s*\(([^)]+)\)/i);
            if (fkMatch) {
                const fromCol = fkMatch[1].replace(/[`"\[\]]/g, '').trim();
                const targetTable = fkMatch[2].replace(/[`"\[\]]/g, '').trim();
                const targetCol = fkMatch[3].replace(/[`"\[\]]/g, '').trim();
                foreignKeys.push({ column: fromCol, referencedTable: targetTable, referencedColumn: targetCol });
                return;
            }

            if (/^(?:CONSTRAINT|CHECK|UNIQUE)\b/i.test(trimmed)) return;

            const colTokens = trimmed.split(/\s+/);
            const colName = colTokens[0].replace(/[`"\[\]]/g, '');
            const colType = colTokens[1] || 'TEXT';

            let isPk = /PRIMARY\s+KEY/i.test(trimmed);
            if (isPk) primaryKeys.push(colName);

            const inlineRef = trimmed.match(/REFERENCES\s+([`"\[]?\w+[`"\]]?)\s*\(([^)]+)\)/i);
            if (inlineRef) {
                foreignKeys.push({
                    column: colName,
                    referencedTable: inlineRef[1].replace(/[`"\[\]]/g, ''),
                    referencedColumn: inlineRef[2].replace(/[`"\[\]]/g, '')
                });
            }

            columns.push({
                name: colName,
                type: colType.toUpperCase(),
                isPk,
                nullable: !/NOT\s+NULL/i.test(trimmed)
            });
        });

        columns.forEach((c) => {
            if (primaryKeys.includes(c.name)) c.isPk = true;
            if (foreignKeys.some(fk => fk.column === c.name)) c.isFk = true;
        });

        tables.push({
            name: rawTableName,
            columns,
            foreignKeys
        });
    }

    return { tables };
}

/**
 * Generates Database Designer relational tables with properties inside them directly from SQL DDL.
 */
export function generateRelationalErDiagramFromSql(sqlCode = '') {
    const schema = parseSqlDdlToSchema(sqlCode);
    return generateRelationalErDiagram(schema);
}
