const aiService = require('../services/ai.service');
const geometrySolver = require('../services/geometrySolver.service');

/**
 * Controller for Step-by-Step Auto Math Problem Solver & Parametric Geometry
 */
class MathSolverController {
    /**
     * Solve a math problem and return structured step-by-step resolution.
     * Generates pedagogical micro-steps, LaTeX formulas, human explanations, and canvas actions.
     */
    async solveMathProblem(req, res) {
        try {
            const { problem, level = 'high_school', provider = 'auto', generateDiagram = true } = req.body;

            if (!problem || !problem.trim()) {
                return res.status(400).json({ success: false, message: 'Problem statement is required.' });
            }

            const stepsData = await MathSolverController._generateStepsWithAI(problem, level, provider, generateDiagram);

            res.json({
                success: true,
                data: stepsData
            });
        } catch (error) {
            console.error('[MathSolverController] Error solving math problem:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to solve mathematical problem'
            });
        }
    }

    /**
     * Server-Sent Events (SSE) streaming solver endpoint.
     * Streams each step sequentially with timed coordination delay.
     */
    async solveMathProblemStream(req, res) {
        const { problem, level = 'high_school', provider = 'auto', paceDelayMs = 2500 } = req.query;

        if (!problem || !problem.trim()) {
            return res.status(400).send('Problem statement is required.');
        }

        // Setup SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
        res.flushHeaders?.();

        const sendEvent = (event, data) => {
            res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
        };

        try {
            sendEvent('status', { message: 'Analyzing math problem and calculating steps...' });

            const stepsData = await MathSolverController._generateStepsWithAI(problem, level, provider, true);

            sendEvent('metadata', {
                problemTitle: stepsData.title,
                category: stepsData.category,
                totalSteps: stepsData.steps.length,
                finalAnswer: stepsData.finalAnswer,
                finalAnswerLatex: stepsData.finalAnswerLatex,
                overallDiagram: stepsData.overallDiagram
            });

            // Stream steps one by one with coordination pacing delay
            const delay = Math.max(800, Math.min(10000, parseInt(paceDelayMs, 10) || 2500));

            for (let i = 0; i < stepsData.steps.length; i++) {
                const step = stepsData.steps[i];
                sendEvent('step', {
                    ...step,
                    isLast: i === stepsData.steps.length - 1
                });

                // Wait for the human coordination pace delay before sending the next step
                if (i < stepsData.steps.length - 1) {
                    await new Promise((resolve) => setTimeout(resolve, delay));
                }
            }

            sendEvent('complete', {
                message: 'All steps generated successfully.',
                finalAnswer: stepsData.finalAnswer
            });

            res.end();
        } catch (err) {
            console.error('[MathSolverController] SSE Streaming error:', err);
            sendEvent('error', { message: err.message || 'Error occurred during step generation.' });
            res.end();
        }
    }

    /**
     * Solve parametric geometry shapes (triangles, regular polygons, curves, text-on-path, 2D partial shapes, 3D vectors, solids)
     */
    async solveGeometry(req, res) {
        try {
            const { shapeType, ...params } = req.body;

            let result = null;
            if (shapeType === 'triangle') {
                result = geometrySolver.solveTriangle(params);
            } else if (shapeType === 'regular_polygon') {
                result = geometrySolver.generateRegularPolygon(params);
            } else if (shapeType === 'function_curve') {
                result = geometrySolver.sampleFunctionCurve(params);
            } else if (shapeType === 'text_on_path') {
                result = geometrySolver.generateTextAlongCurve(params);
            } else if (shapeType === 'sector') {
                result = geometrySolver.solveSector(params);
            } else if (shapeType === 'segment') {
                result = geometrySolver.solveSegment(params);
            } else if (shapeType === 'annulus_sector') {
                result = geometrySolver.solveAnnulusSector(params);
            } else if (shapeType === 'parabolic_arch') {
                result = geometrySolver.solveParabolicArch(params);
            } else if (shapeType === 'vectors_3d' || shapeType === 'vector') {
                result = geometrySolver.solveVectors(params);
            } else if (shapeType === 'solid_measurements' || shapeType === 'solid') {
                result = geometrySolver.solveSolid(params);
            } else if (shapeType === 'circle_line_intersection') {
                result = geometrySolver.solveCircleLineIntersection(params);
            } else {
                return res.status(400).json({ success: false, message: `Unknown shapeType: ${shapeType}` });
            }

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            console.error('[MathSolverController] Geometry solve error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to solve geometry'
            });
        }
    }

    /**
     * Internal helper to prompt AI and parse structured pedagogical steps
     */
    static async _generateStepsWithAI(problem, level, provider, generateDiagram) {
        const systemPrompt = `You are a world-class master STEM teacher (Mathematics, Physics, Chemistry, Biology).
Your goal is to solve academic problems with crystal-clear pedagogical micro-steps tailored for a live classroom whiteboard.
You provide:
1. Concise titles for each step.
2. Standard LaTeX equation syntax (suitable for KaTeX) for all formulas ($$...$$).
3. Warm, conversational human explanations written in natural phrasing suitable for whiteboard handwriting (as if writing on a chalkboard).
4. Canvas action instructions when geometry, 3D solids, Cartesian graphs, or scientific diagrams are relevant.

DOMAIN KNOWLEDGE EXPECTATIONS:
- MATHEMATICS:
  * 3D Solids: Sphere (V = 4/3 π r³, S = 4πr²), Cylinder (V = πr²h, S = 2πr(h+r)), Cone (V = 1/3 πr²h, l = √(r²+h²)), Frustum of cone (V = 1/3 π h (r₁² + r₂² + r₁r₂)), Hemisphere (V = 2/3 π r³, S = 3πr²).
  * 3D Coordinate Geometry & Vectors: Vector a = a₁i + a₂j + a₃k, magnitude |a|, dot product a·b, cross product a×b, angle θ = arccos(a·b / (|a||b|)), direction cosines, equation of plane Ax + By + Cz = D.
  * 2D Coordinate Geometry: Circle x² + y² + 2gx + 2fy + c = 0, intersection with line y = mx + k by substitution and discriminant Δ = B² - 4AC, distance between points, tangent lines.
  * Calculus: Derivatives, integrals, area under curves, tangent lines.
- PHYSICS:
  * Mechanics: Newton's Laws (F = ma), inclined plane with friction (mg sinθ, mg cosθ, μ), projectile motion, work-energy theorem, conservation of momentum.
  * Electromagnetism & Circuits: Coulomb's Law, Ohm's law (V = IR), equivalent resistance (series R₁ + R₂, parallel 1/R = 1/R₁ + 1/R₂), Lorentz force F = q(E + v×B).
  * Optics: Snell's law (n₁ sinθ₁ = n₂ sinθ₂), lens formula 1/f = 1/v - 1/u.
- CHEMISTRY:
  * Stoichiometry & Gas Laws: PV = nRT, molarity M = n / V, balanced chemical equations.
  * Molecular Geometry (VSEPR): Linear (180°), Bent (H₂O, 104.5°), Trigonal Planar (BF₃, 120°), Tetrahedral (CH₄, 109.5°), Octahedral (SF₆).
  * Acids, Bases & pH: pH = -log[H⁺], buffer Henderson-Hasselbalch equation.
- BIOLOGY:
  * Cell Biology: Plant vs animal cells, organelles (nucleus, mitochondria, chloroplast, ribosome).
  * Genetics: Monohybrid & dihybrid Punnett squares, Mendelian ratios (3:1, 9:3:3:1), DNA base pairing (A=T, G≡C).
  * Bioenergetics: Photosynthesis (6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂), Cellular respiration (glycolysis, Krebs cycle, electron transport).

OUTPUT REQUIREMENT:
You must return a single valid JSON object strictly matching this schema with NO extra commentary outside JSON:
{
  "title": "<Concise problem title>",
  "category": "Mathematics | Physics | Chemistry | Biology | Geometry | Vectors | Calculus",
  "given": ["<Given parameter 1>", "<Given parameter 2>"],
  "toFind": "<What we are solving for>",
  "steps": [
    {
      "stepNumber": 1,
      "title": "<Short step title, e.g. 'State the relevant formula'>",
      "latex": "<LaTeX string for the formula, e.g. 'V = \\\\pi r^2 h'>",
      "explanation": "<Human-like handwriting explanation of why this step is taken>",
      "recommendedDelayMs": 3000,
      "canvasActions": [
        {
          "type": "draw_shape | insert_3d_model | plot_cartesian | highlight | add_label",
          "shape": "circle | rectangle | triangle | coordinate_system | vector_3d | frustum | cylinder | sphere | cone | hemisphere",
          "params": { }
        }
      ]
    }
  ],
  "finalAnswer": "<Human readable final answer with units>",
  "finalAnswerLatex": "<LaTeX final answer, e.g. 'V = 250\\pi \\approx 785.40\\text{ cm}^3'>",
  "overallDiagram": {
    "needed": true,
    "modelType": "cylinder | sphere | cone | frustum | hemisphere | vector_space_3d | coordinate_system | null",
    "svg": "<Clean self-contained SVG string if 2D visual diagram is helpful, or null>"
  }
}`;

        const userPrompt = `Problem Statement:
"${problem.trim()}"
Academic Level: ${level}
Include Diagram: ${generateDiagram ? 'Yes' : 'No'}

Solve this step-by-step so that a student or colleague can coordinate and follow along comfortably on a collaborative whiteboard.`;

        const res = await aiService.executeChatCompletion({
            messages: [{ role: 'user', content: userPrompt }],
            systemPrompt,
            preferredProvider: provider === 'auto' ? 'groq' : provider,
            temperature: 0.1,
            maxTokens: 4000,
            jsonMode: true
        });

        let raw = (res.text || '').trim();
        raw = raw.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();

        let parsed;
        try {
            parsed = JSON.parse(raw);
        } catch (e) {
            // Attempt to locate JSON block if model included commentary
            const jsonMatch = raw.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                parsed = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('Failed to parse structured math solution from AI response.');
            }
        }

        // Ensure steps array exists
        if (!parsed.steps || !Array.isArray(parsed.steps) || parsed.steps.length === 0) {
            parsed.steps = [
                {
                    stepNumber: 1,
                    title: 'Solution',
                    latex: parsed.finalAnswerLatex || '',
                    explanation: parsed.finalAnswer || 'Computed solution',
                    recommendedDelayMs: 3000,
                    canvasActions: []
                }
            ];
        }

        return parsed;
    }
}

module.exports = new MathSolverController();
