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
     * Solve parametric geometry shapes (triangles, regular polygons, curves, text-on-path)
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
        const systemPrompt = `You are an expert master mathematics teacher and tutor.
Your goal is to solve mathematical, physical, or geometric problems with crystal-clear pedagogical micro-steps.
You provide:
1. Concise titles for each step.
2. Standard LaTeX equation syntax (suitable for KaTeX) for all formulas.
3. Warm, conversational human explanations written in natural phrasing suitable for whiteboard handwriting.
4. Canvas action instructions when geometry or diagrams are relevant (e.g., drawing shapes, angles, slopes, or tangents).

OUTPUT REQUIREMENT:
You must return a single valid JSON object strictly matching this schema with NO extra commentary outside JSON:
{
  "title": "<Concise problem title>",
  "category": "Algebra | Calculus | Geometry | Trigonometry | Physics | Arithmetic | Statistics",
  "given": ["<Given parameter 1>", "<Given parameter 2>"],
  "toFind": "<What we are solving for>",
  "steps": [
    {
      "stepNumber": 1,
      "title": "<Short step title, e.g. 'State the relevant formula'>",
      "latex": "<LaTeX string for the formula, e.g. 'A = \\\\frac{1}{2} b h'>",
      "explanation": "<Human-like handwriting explanation of why this step is taken>",
      "recommendedDelayMs": 3000,
      "canvasActions": [
        {
          "type": "draw_shape | highlight | add_label | draw_line",
          "shape": "triangle | rectangle | circle | curve | line",
          "params": { ... }
        }
      ]
    }
  ],
  "finalAnswer": "<Human readable final answer>",
  "finalAnswerLatex": "<LaTeX final answer, e.g. 'x = 5\\\\sqrt{2}'>",
  "overallDiagram": {
    "needed": true,
    "svg": "<Clean self-contained SVG string if visual diagram is helpful, or null>"
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
