const mcpManager = require('../src/services/mcpManager.service');
const aiService = require('../src/services/ai.service');

describe('Commercial-Safe MCP Integration Test Suite', () => {
    beforeAll(async () => {
        await mcpManager.initialize();
    });

    test('1. MCP Status reports 100% free permissive commercial licenses (MIT, BSD-3-Clause)', () => {
        const status = mcpManager.getStatus();
        expect(status.success).toBe(true);
        expect(status.totalServers).toBeGreaterThanOrEqual(4);
        expect(status.licensePolicy).toContain('100% Permissive');

        const serverIds = status.servers.map(s => s.id);
        expect(serverIds).toContain('uml-mcp');
        expect(serverIds).toContain('schemdraw-mcp');
        expect(serverIds).toContain('rdkit-mcp');
        expect(serverIds).toContain('sympy-mcp');

        status.servers.forEach(s => {
            expect(s.commercialSafe).toBe(true);
            expect(['MIT', 'BSD-3-Clause', 'Apache-2.0']).toContain(s.license);
        });
    });

    test('2. SchemDraw MCP generates valid Series RLC AC Circuit with LaTeX solution', () => {
        const result = mcpManager.handleWhiteboardDiagram('Draw a series RLC circuit schematic with resistor, inductor, and capacitor');
        expect(result).not.toBeNull();
        expect(result.recognized).toBe(true);
        expect(result.diagram.svg).toContain('viewBox="0 0 380 380"');
        expect(result.diagram.svg).toContain('Series RLC AC Circuit');
        expect(result.solutionMarkdown).toContain('$$Z = \\sqrt{R^2 + \\left(X_L - X_C\\right)^2}');
        expect(result.canvasAction.type).toBe('draw_problem_with_diagram');
    });

    test('3. SchemDraw MCP generates Logic Gates schematic with Truth Table', () => {
        const result = mcpManager.handleWhiteboardDiagram('Show logic gates combinational circuit with AND gate and OR gate');
        expect(result).not.toBeNull();
        expect(result.diagram.svg).toContain('Digital Logic Gates');
        expect(result.solutionMarkdown).toContain('Y = (A \\cdot B) + C');
    });

    test('4. RDKit MCP generates Benzene molecular structure with aromatic resonance ring', () => {
        const result = mcpManager.handleWhiteboardDiagram('Draw benzene molecular chemical structure with aromatic ring');
        expect(result).not.toBeNull();
        expect(result.diagram.svg).toContain('Benzene');
        expect(result.diagram.svg).toContain('viewBox="0 0 380 380"');
        expect(result.solutionMarkdown).toContain('C}_6\\text{H}_6');
    });

    test('5. RDKit MCP generates Caffeine molecular structure', () => {
        const result = mcpManager.handleWhiteboardDiagram('Render caffeine molecule structure');
        expect(result).not.toBeNull();
        expect(result.diagram.svg).toContain('Caffeine');
        expect(result.solutionMarkdown).toContain('C}_8\\text{H}_{10}\\text{N}_4\\text{O}_2');
    });

    test('6. UML MCP generates Algorithm Flowchart', () => {
        const result = mcpManager.handleWhiteboardDiagram('Draw flowchart for finding maximum of two numbers');
        expect(result).not.toBeNull();
        expect(result.diagram.svg).toContain('Algorithm Flowchart');
        expect(result.diagram.title).toContain('Flowchart');
    });

    test('7. UML MCP generates Sequence Diagram', () => {
        const result = mcpManager.handleWhiteboardDiagram('Show sequence diagram for API request and authentication');
        expect(result).not.toBeNull();
        expect(result.diagram.svg).toContain('Sequence Diagram');
    });

    test('8. SymPy MCP generates Rotational Vector Field with Divergence and Curl', () => {
        const result = mcpManager.handleWhiteboardDiagram('Plot vector field F(x, y) = (-y, x)');
        expect(result).not.toBeNull();
        expect(result.diagram.svg).toContain('Rotational Vector Field');
        expect(result.solutionMarkdown).toContain('\\nabla \\cdot \\vec{F}');
        expect(result.solutionMarkdown).toContain('\\text{curl}(\\vec{F})');
    });

    test('9. SymPy MCP generates ODE Direction/Slope Field', () => {
        const result = mcpManager.handleWhiteboardDiagram('Show ODE direction field for dy/dx = x - y');
        expect(result).not.toBeNull();
        expect(result.diagram.svg).toContain('ODE Direction / Slope Field');
        expect(result.solutionMarkdown).toContain('y(x) = x - 1 + C e^{-x}');
    });

    test('10. AIService executeVoiceCommand routes MCP requests with zero broken UI states', async () => {
        const aiRes = await aiService.executeVoiceCommand('Draw a series RLC circuit schematic', { module: 'whiteboard' });
        expect(aiRes.recognized).toBe(true);
        expect(aiRes.success).toBe(true);
        expect(aiRes.modelUsed).toContain('schemdraw-mcp');
        expect(aiRes.diagram.svg).toContain('viewBox="0 0 380 380"');
        expect(aiRes.canvasAction.type).toBe('draw_problem_with_diagram');
    });
});
