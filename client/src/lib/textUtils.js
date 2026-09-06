/**
 * textUtils.js
 * Comprehensive document text cleaner, styler, and Markdown formatter.
 * Cleans extracted PDF/syllabus text, fixes hyphenated line breaks, 
 * turns headings and bullet points into clean Markdown, and formats code blocks.
 */

export function formatAndStyleDocumentText(rawText) {
    if (!rawText || typeof rawText !== 'string') return '';

    let text = rawText
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n');

    // 1. Remove common NCERT / textbook page headers, footers & pagination artifacts
    text = text.replace(/^[ \t]*(?:chapter\s*[0-9ivx.-]*\.indd|rationali[sz]ed\s*\d{4}[-\d]*|[0-9]+\s+computer\s+science|computer\s+science\s+[–-]\s+class\s*[ivx0-9]+|page\s*[0-9]+).*$/gmi, '');
    text = text.replace(/\b\d{1,2}-[A-Za-z]{3}-\d{2,4}\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?\b/gi, '');

    // 2. Fix broken hyphenations at line ends (e.g. "orga-\nnized" -> "organized")
    text = text.replace(/([A-Za-z]{2,})-\s*\n\s*([a-z]{2,})/g, '$1$2');

    // 3. Process lines into logical paragraphs and markdown headers
    const rawLines = text.split('\n');
    const processedLines = [];
    let currentParagraph = [];

    const flushParagraph = () => {
        if (currentParagraph.length > 0) {
            const joined = currentParagraph.join(' ').replace(/[ \t]{2,}/g, ' ').trim();
            if (joined) processedLines.push(joined);
            currentParagraph = [];
        }
    };

    for (let i = 0; i < rawLines.length; i++) {
        let line = rawLines[i].trim();
        if (!line) {
            flushParagraph();
            continue;
        }

        // Clean out bullet points at start of line
        const isBullet = /^[»•›▪▫*o\-]\s+/i.test(line);
        if (isBullet) {
            flushParagraph();
            const cleanBulletText = line.replace(/^[»•›▪▫*o\-]\s+/i, '').replace(/\s+/g, ' ').trim();
            processedLines.push(`- ${cleanBulletText}`);
            continue;
        }

        // Detect Chapter/Unit headings (e.g. "Chapter 7: Database Concepts", "Unit 2: Computer Systems")
        const chapterMatch = line.match(/^(?:chapter|unit)\s+([0-9ivx]+)[:\-\s]+(.+)/i);
        if (chapterMatch) {
            flushParagraph();
            processedLines.push(`\n## Chapter ${chapterMatch[1]}: ${chapterMatch[2].trim()}\n`);
            continue;
        }

        // Detect Section headings (e.g. "7.1 Introduction", "7.2.1 Relational Data Model")
        const sectionMatch = line.match(/^(\d+\.\d+(?:\.\d+)?)\s+([A-Za-z0-9\s,–\-()&]+)$/);
        if (sectionMatch && sectionMatch[2].length <= 65) {
            flushParagraph();
            processedLines.push(`\n### ${sectionMatch[1]} ${sectionMatch[2].trim()}\n`);
            continue;
        }

        // Standalone short uppercase or Title Case heading
        const isHeadingCandidate = line.length >= 4 && line.length <= 55 &&
            !/[.,;:]$/.test(line) &&
            !/^(and|or|the|in|at|by|for|with|to|from|is|are|which|that)\b/i.test(line) &&
            (line === line.toUpperCase() && /[A-Z]/.test(line) || /^[A-Z][A-Za-z0-9\s,–\-()]{3,50}$/.test(line)) &&
            (rawLines[i + 1]?.trim() === '' || i === 0);

        if (isHeadingCandidate && !isBullet) {
            flushParagraph();
            processedLines.push(`\n### ${line}\n`);
            continue;
        }

        // Detect SQL code blocks (SELECT, CREATE TABLE, INSERT, etc.)
        if (/^(SELECT|CREATE\s+TABLE|INSERT\s+INTO|UPDATE|DELETE\s+FROM|ALTER\s+TABLE)\b/i.test(line)) {
            flushParagraph();
            processedLines.push(`\`\`\`sql\n${line}`);
            let qIdx = i + 1;
            while (qIdx < rawLines.length && rawLines[qIdx].trim() && !/^[A-Z0-9.\s]+:/.test(rawLines[qIdx].trim())) {
                processedLines.push(rawLines[qIdx].trim());
                if (rawLines[qIdx].trim().endsWith(';')) {
                    qIdx++;
                    break;
                }
                qIdx++;
            }
            processedLines.push('\n\`\`\`\n');
            i = qIdx - 1;
            continue;
        }

        currentParagraph.push(line);
    }

    flushParagraph();

    return processedLines
        .join('\n\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

/**
 * Calculates human-friendly statistics for extracted text (words, chars, reading time).
 */
export function getTextStats(text) {
    if (!text || typeof text !== 'string') return { words: 0, characters: 0, readingTimeMinutes: 0 };
    const characters = text.length;
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const readingTimeMinutes = Math.max(1, Math.ceil(words / 200));
    return { words, characters, readingTimeMinutes };
}
