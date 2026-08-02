const fs = require('fs');

const content = fs.readFileSync('/Users/charanpreetsingh/LabRecManagemer/client/src/components/Whiteboard.jsx', 'utf-8');

let stack = [];
for (let i = 0; i < content.length; i++) {
    const c = content[i];
    if (c === '{' || c === '(' || c === '[') {
        stack.push({ char: c, line: content.slice(0, i).split('\n').length });
    } else if (c === '}' || c === ')' || c === ']') {
        const expected = c === '}' ? '{' : (c === ')' ? '(' : '[');
        if (stack.length === 0 || stack[stack.length - 1].char !== expected) {
            console.log(`Mismatch at line ${content.slice(0, i).split('\n').length}: Found ${c}, expected ${stack.length ? stack[stack.length - 1].char : 'none'}`);
        } else {
            stack.pop();
        }
    }
}
console.log("Remaining stack size:", stack.length);
if (stack.length > 0) {
    console.log("First unclosed:", stack[0]);
}
