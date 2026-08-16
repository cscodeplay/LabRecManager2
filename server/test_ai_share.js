require('dotenv').config();
const aiService = require('./src/services/ai.service');

async function test() {
    try {
        const documents = [{ id: 'doc1', name: 'final_exam.pdf' }, { id: 'doc2', name: 'Physics Notes' }];
        const classes = [{ id: 'class1', name: '10A', gradeLevel: 10, section: 'A' }, { id: 'class2', name: '12 COM A', gradeLevel: 12, section: 'A' }];
        const groups = [{ id: 'group1', name: 'Alpha', class: { name: '10A' } }];
        const students = [{ id: 'student1', firstName: 'John', lastName: 'Doe', admissionNumber: '101' }, { id: 'student2', firstName: 'Jane', lastName: 'Smith', admissionNumber: '102' }];

        const prompt = "Please share the 'final_exam.pdf' document with class 10A and John Doe.";
        console.log(`\nPROMPT: "${prompt}"`);

        const resolution = await aiService.parseDocumentShareTargets(prompt, { documents, classes, groups, students }, 'groq');
        console.log('\nRESOLUTION:');
        console.log(JSON.stringify(resolution, null, 2));

        if (resolution.matchedDocumentId) {
            const doc = documents.find(d => d.id === resolution.matchedDocumentId);
            console.log(`Matched Document: ${doc?.name}`);
        } else {
            console.log('No document matched.');
        }

    } catch (err) {
        console.error('Error:', err);
    }
}

test();
