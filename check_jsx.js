const fs = require('fs');

const content = fs.readFileSync('client/src/components/Whiteboard_copy.jsx', 'utf-8');

// Strip out contents of {} within JSX as it's just JS, but wait, JS can contain JSX!
// Let's just use a simple regex to extract all <tag> and </tag>
const tagRegex = /<\/?([a-zA-Z0-9_.-]+)[^>]*>/g;
let match;
let stack = [];
let lines = content.split('\n');

function getLine(index) {
    return content.substring(0, index).split('\n').length;
}

while ((match = tagRegex.exec(content)) !== null) {
    const fullTag = match[0];
    const tagName = match[1];
    const isSelfClosing = fullTag.endsWith('/>');
    const isClosing = fullTag.startsWith('</');
    
    // Ignore self-closing tags
    if (isSelfClosing) continue;
    
    // Ignore br, img, input, etc if they happen to not have /> (though they should in JSX)
    if (['br', 'img', 'input', 'hr', 'meta', 'link'].includes(tagName)) continue;

    if (!isClosing) {
        stack.push({ name: tagName, line: getLine(match.index), fullTag });
    } else {
        if (stack.length === 0) {
            console.log(`Unmatched closing tag ${fullTag} at line ${getLine(match.index)}`);
        } else {
            const top = stack.pop();
            if (top.name !== tagName) {
                console.log(`Mismatch at line ${getLine(match.index)}: expected </${top.name}> (from line ${top.line}), but found ${fullTag}`);
            }
        }
    }
}

if (stack.length > 0) {
    console.log("Unclosed tags remaining:");
    stack.forEach(t => console.log(`<${t.name}> from line ${t.line}`));
} else {
    console.log("All tags matched perfectly!");
}
