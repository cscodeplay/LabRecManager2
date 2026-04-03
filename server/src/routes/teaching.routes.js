const express = require('express');
const router = express.Router();

const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const teachingController = require('../controllers/teaching.controller');

// Protect all teaching routes
router.use(authenticate);

// ==========================================
// Lecture Plans
// ==========================================
router.route('/plans')
    .get(asyncHandler(teachingController.getLecturePlans))
    .post(authorize('instructor', 'admin', 'principal'), asyncHandler(teachingController.createLecturePlan));

router.route('/plans/:id')
    .put(authorize('instructor', 'admin', 'principal'), asyncHandler(teachingController.updateLecturePlan))
    .delete(authorize('instructor', 'admin', 'principal'), asyncHandler(teachingController.deleteLecturePlan));

router.post('/plans/:id/resources', authorize('instructor', 'admin', 'principal'), asyncHandler(teachingController.attachPlanResource));
router.post('/plans/:id/start', authorize('instructor'), asyncHandler(teachingController.startLectureSession));

// ==========================================
// Lecture Sessions (Live Class)
// ==========================================
router.route('/sessions/:id')
    .get(asyncHandler(teachingController.getLectureSession));

router.put('/sessions/:id/end', authorize('instructor', 'admin'), asyncHandler(teachingController.endLectureSession));

// Attendance
router.route('/sessions/:id/attendance')
    .get(asyncHandler(teachingController.getAttendanceList))
    .post(asyncHandler(teachingController.markAttendance));

// Live Uploads (Images/Videos)
router.post('/sessions/:id/upload', asyncHandler(teachingController.uploadSessionResource));

// Polls
router.route('/sessions/:id/polls')
    .post(authorize('instructor'), asyncHandler(teachingController.createLivePoll));

router.put('/polls/:id/end', authorize('instructor'), asyncHandler(teachingController.endLivePoll));
router.post('/polls/:id/respond', authorize('student'), asyncHandler(teachingController.respondToPoll));

// ==========================================
// Analytics (Placeholders based on plan)
// ==========================================
router.get('/analytics/class/:classId', (req, res) => {
    res.json({ status: 'success', data: { message: 'Class analytics not implemented yet' } });
});

router.get('/analytics/instructor', (req, res) => {
    res.json({ status: 'success', data: { message: 'Instructor analytics not implemented yet' } });
});

module.exports = router;
