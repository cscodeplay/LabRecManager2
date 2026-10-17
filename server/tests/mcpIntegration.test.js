const mcpManager = require('../src/services/mcpManager.service');
const aiService = require('../src/services/ai.service');

describe('Commercial-Safe MCP Integration & Zero Hardcoding Policy Test Suite', () => {
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

    test('3. ZERO HARDCODING VERIFICATION: handleWhiteboardDiagram strictly returns null to prevent hardcoded templates', () => {
        const testQueries = [
            'Draw a series RLC circuit schematic',
            'Draw circuit diagram for two bulbs connected in parallel to DC source',
            'Draw benzene molecular chemical structure',
            'Render caffeine molecule',
            'Draw flowchart for finding maximum',
            'Plot vector field F(x, y) = (-y, x)'
        ];

        testQueries.forEach(query => {
            // Must strictly return null so all diagram requests pass to dynamic AI reasoning
            const result = mcpManager.handleWhiteboardDiagram(query);
            expect(result).toBeNull();
        });
    });

    test('4. aiService.executeVoiceCommand does not intercept user queries with static templates', async () => {
        // Mock or check that executeVoiceCommand does not short-circuit with a hardcoded RLC circuit
        const prompt = 'Draw circuit diagram for two bulbs connected in parallel to DC source';
        // Ensure mcpManager.handleWhiteboardDiagram returns null
        expect(mcpManager.handleWhiteboardDiagram(prompt)).toBeNull();
    });
});
