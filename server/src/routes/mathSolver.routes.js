const express = require('express');
const router = express.Router();
const mathSolverController = require('../controllers/mathSolver.controller');
const { optionalAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @route   POST /api/whiteboard/math-solver/solve
 * @desc    Solve math problem and return complete step-by-step resolution
 * @access  Public / Authenticated
 */
router.post('/solve', optionalAuth, asyncHandler((req, res) => mathSolverController.solveMathProblem(req, res)));

/**
 * @route   GET /api/whiteboard/math-solver/stream
 * @desc    Server-Sent Events streaming of math problem steps with human coordination pacing
 * @access  Public / Authenticated
 */
router.get('/stream', optionalAuth, (req, res) => mathSolverController.solveMathProblemStream(req, res));

/**
 * @route   POST /api/whiteboard/math-solver/geometry
 * @desc    Calculate parametric geometry coordinates, polygons, curves, and text on paths
 * @access  Public / Authenticated
 */
router.post('/geometry', optionalAuth, asyncHandler((req, res) => mathSolverController.solveGeometry(req, res)));

module.exports = router;
