const mcpManager = require('../src/services/mcpManager.service');
const aiService = require('../src/services/ai.service');

describe('Commercial-Safe MCP Integration & Dynamic SchemDraw Engine Test Suite', () => {
    beforeAll(async () => {
        await mcpManager.initialize();
    });

    test('1. MCP Status reports 100% free permissive commercial licenses (MIT, BSD-3-Clause) with zeroHardcoding policy', () => {
        const status = mcpManager.getStatus();
        expect(status.success).toBe(true);
        expect(status.totalServers).toBeGreaterThanOrEqual(4);
        expect(status.licensePolicy).toContain('100% Permissive');
        expect(status.zeroHardcoding).toBe(true);

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

    test('2. canHandle detects circuit domain correctly', () => {
        const res = mcpManager.canHandle('Draw circuit diagram for two bulbs connected in parallel to DC source');
        expect(res).not.toBeNull();
        expect(res.server).toBe('schemdraw-mcp');
        expect(res.domain).toBe('circuit');
    });

    test('3. DYNAMIC SCHEMDRAW COMPILATION: handleWhiteboardDiagram renders dynamic parallel circuit and never returns hardcoded RLC', async () => {
        const query = 'Draw circuit diagram for two bulbs connected in parallel to DC source';
        const result = await mcpManager.handleWhiteboardDiagram(query);

        expect(result).not.toBeNull();
        expect(result.success).toBe(true);
        expect(result.providerUsed).toBe('schemdraw-mcp');
        expect(result.diagram.title).toContain('Parallel');
        expect(result.diagram.title).toContain('Bulb');
        expect(result.diagram.svg).toContain('<svg');
        // Crucial: Must NEVER contain an inductor or RLC fallback
        expect(result.diagram.title).not.toContain('RLC');
        expect(result.solutionMarkdown).toContain('Parallel');
    });

    test('4. DYNAMIC SCHEMDRAW COMPILATION: handleWhiteboardDiagram renders series bulbs correctly', async () => {
        const query = 'draw a circuit diagram with two bulbs in series.';
        const result = await mcpManager.handleWhiteboardDiagram(query);

        expect(result).not.toBeNull();
        expect(result.success).toBe(true);
        expect(result.providerUsed).toBe('schemdraw-mcp');
        expect(result.diagram.title).toContain('Series');
        expect(result.diagram.title).toContain('Bulb');
        expect(result.diagram.svg).toContain('<svg');
        expect(result.diagram.title).not.toContain('RLC');
    });

    test('5. Non-circuit domains safely return null for AI reasoning fallback', async () => {
        const testQueries = [
            'Draw benzene molecular chemical structure',
            'Render caffeine molecule',
            'Draw flowchart for finding maximum',
            'Plot vector field F(x, y) = (-y, x)'
        ];

        for (const query of testQueries) {
            const result = await mcpManager.handleWhiteboardDiagram(query);
            expect(result).toBeNull();
        }
    });
});
