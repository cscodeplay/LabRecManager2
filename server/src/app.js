require('dotenv').config();

const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

// Import routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const schoolRoutes = require('./routes/school.routes');
const classRoutes = require('./routes/class.routes');
const subjectRoutes = require('./routes/subject.routes');
const assignmentRoutes = require('./routes/assignment.routes');
const submissionRoutes = require('./routes/submission.routes');
const vivaRoutes = require('./routes/viva.routes');
const gradeRoutes = require('./routes/grade.routes');
const feeRoutes = require('./routes/fee.routes');
const reportRoutes = require('./routes/report.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const syllabusRoutes = require('./routes/syllabus.routes');
const notificationRoutes = require('./routes/notification.routes');
const activityLogRoutes = require('./routes/activitylog.routes');
const gradeScaleRoutes = require('./routes/gradeScale.routes');
const adminRoutes = require('./routes/admin.routes');
const deviceRoutes = require('./routes/device.routes');
const aiRoutes = require('./routes/ai.routes');
const academicYearRoutes = require('./routes/academicYear.routes');
const pinRoutes = require('./routes/pin.routes');
const labRoutes = require('./routes/lab.routes');
const fileRoutes = require('./routes/file.routes');
const documentRoutes = require('./routes/document.routes');
const whiteboardRoutes = require('./routes/whiteboard.routes');
const auditRoutes = require('./routes/audit.routes');
const ticketRoutes = require('./routes/ticket.routes');
const procurementRoutes = require('./routes/procurement.routes');
const uploadRoutes = require('./routes/upload.routes');
const queryLogRoutes = require('./routes/querylog.routes');
const recordingRoutes = require('./routes/recording.routes');
const storageRoutes = require('./routes/storage.routes');
const timetableRoutes = require('./routes/timetable.routes');
const teachingRoutes = require('./routes/teaching.routes');
const trainingRoutes = require('./routes/training.routes');
const chatbotRoutes = require('./routes/chatbot.routes');

// Import middleware
const { errorHandler } = require('./middleware/errorHandler');
const { requestLogger } = require('./middleware/requestLogger');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.io for real-time features (viva, notifications)
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Make io accessible in routes
app.set('io', io);

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(requestLogger);

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/schools', schoolRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/viva', vivaRoutes);
app.use('/api/grades', gradeRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/syllabus', syllabusRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/activity-logs', activityLogRoutes);
app.use('/api/grade-scales', gradeScaleRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/academic-years', academicYearRoutes);
app.use('/api/pin', pinRoutes);
app.use('/api/labs', labRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/whiteboard', whiteboardRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/procurement', procurementRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/admin/query-logs', queryLogRoutes);
app.use('/api/recordings', recordingRoutes);
app.use('/api/storage', storageRoutes);
app.use('/api/folders', require('./routes/folder.routes'));
app.use('/api/timetable', timetableRoutes);
app.use('/api/teaching', teachingRoutes);
app.use('/api/training', trainingRoutes);
app.use('/api/admin/chatbot', chatbotRoutes);

const prisma = require('./config/database');

// Health check endpoint (Keep-Alive)
app.get('/api/health', async (req, res) => {
  const startTime = Date.now();
  try {
    // Lightweight query to keep DB awake
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      success: true,
      status: 'ok',
      server: 'online',
      database: 'online',
      responseTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  } catch (error) {
    console.error('Health check DB error:', error);
    try {
      await prisma.$connect();
      await prisma.$queryRaw`SELECT 1`;
      res.json({
        success: true,
        status: 'ok',
        server: 'online',
        database: 'online',
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      });
    } catch (retryErr) {
      res.status(500).json({
        success: false,
        status: 'error',
        server: 'online',
        database: 'offline',
        error: error.message
      });
    }
  }
});

const whiteboardChatHistory = new Map();

// Socket.io connection handling for viva sessions
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join viva room
  socket.on('join-viva', (vivaSessionId) => {
    socket.join(`viva-${vivaSessionId}`);
    console.log(`User ${socket.id} joined viva session ${vivaSessionId}`);
  });

  // WebRTC signaling for viva
  socket.on('viva-signal', (data) => {
    socket.to(`viva-${data.vivaSessionId}`).emit('viva-signal', {
      signal: data.signal,
      from: socket.id
    });
  });

  // Viva questions and responses
  socket.on('viva-question', (data) => {
    socket.to(`viva-${data.vivaSessionId}`).emit('viva-question', data);
  });

  socket.on('viva-response', (data) => {
    socket.to(`viva-${data.vivaSessionId}`).emit('viva-response', data);
  });

  // Notifications
  socket.on('join-user', (userId) => {
    socket.join(`user-${userId}`);
  });

  // ===========================================
  // WHITEBOARD SHARING EVENTS
  // ===========================================

  // Instructor starts sharing whiteboard
  socket.on('whiteboard:start-share', (data) => {
    const { sessionId, instructorId, instructorName, targetType, targets, classId } = data;

    // Store session info on socket for later reference
    socket.whiteboardSession = { sessionId, instructorId, instructorName };

    // Join the whiteboard room
    socket.join(`whiteboard-${sessionId}`);

    console.log(`[Whiteboard] Instructor ${instructorName} started sharing session ${sessionId}`);

    // Broadcast to targets based on type
    if (targetType === 'class') {
      // Notify all students in the class
      io.to(`class-${classId}`).emit('whiteboard:shared-with-you', {
        sessionId,
        instructorName,
        targetType: 'class'
      });
    } else if (targetType === 'group') {
      // Notify students in selected groups
      targets.forEach(groupId => {
        io.to(`group-${groupId}`).emit('whiteboard:shared-with-you', {
          sessionId,
          instructorName,
          targetType: 'group'
        });
      });
    } else if (targetType === 'student') {
      // Notify specific students
      targets.forEach(studentId => {
        io.to(`user-${studentId}`).emit('whiteboard:shared-with-you', {
          sessionId,
          instructorName,
          targetType: 'student'
        });
      });
    }
  });

  // Instructor stops sharing whiteboard
  socket.on('whiteboard:stop-share', (data) => {
    const { sessionId } = data;

    console.log(`[Whiteboard] Session ${sessionId} stopped sharing`);
    
    // Clear chat history
    whiteboardChatHistory.delete(sessionId);

    // Notify all viewers
    io.to(`whiteboard-${sessionId}`).emit('whiteboard:ended', { sessionId });

    // Leave the room
    socket.leave(`whiteboard-${sessionId}`);
    socket.whiteboardSession = null;
  });

  // Drawing event from instructor - broadcast to viewers
  socket.on('whiteboard:draw', (data) => {
    const { sessionId } = data;

    // Broadcast to all viewers except sender
    socket.to(`whiteboard-${sessionId}`).emit('whiteboard:draw', data);
  });

  // Clear canvas event
  socket.on('whiteboard:clear', (data) => {
    const { sessionId } = data;

    socket.to(`whiteboard-${sessionId}`).emit('whiteboard:clear', data);
  });

  // Background change event
  socket.on('whiteboard:background-change', (data) => {
    const { sessionId } = data;
    socket.to(`whiteboard-${sessionId}`).emit('whiteboard:background-change', data);
  });

  // Instructor broadcasts canvas state to all viewers
  socket.on('whiteboard:canvas-state', (data) => {
    const { sessionId, imageData, bgColor, bgPattern, imageObjects, textObjects, shapeObjects, laserPos } = data;

    // Broadcast to all viewers in the session room
    socket.to(`whiteboard-${sessionId}`).emit('whiteboard:canvas-state', {
      sessionId,
      imageData,
      bgColor,
      bgPattern,
      imageObjects,
      textObjects,
      shapeObjects,
      laserPos
    });
  });

  // Student requests current canvas state when joining (Enforces 1 active classroom session lock per student)
  socket.on('whiteboard:request-state', (data) => {
    const { sessionId } = data;

    // Leave any previous whiteboard session room to prevent attending multiple classrooms simultaneously
    if (socket.currentWhiteboardRoom && socket.currentWhiteboardRoom !== `whiteboard-${sessionId}`) {
      socket.leave(socket.currentWhiteboardRoom);
      console.log(`[Whiteboard] Student socket ${socket.id} left previous room ${socket.currentWhiteboardRoom}`);
    }

    socket.currentWhiteboardRoom = `whiteboard-${sessionId}`;
    socket.join(`whiteboard-${sessionId}`);

    // Request the instructor to send current canvas state
    socket.to(`whiteboard-${sessionId}`).emit('whiteboard:state-requested', {
      sessionId,
      requesterId: socket.id
    });
  });

  // Whiteboard live chat message relay
  socket.on('whiteboard:chat-message', (data) => {
    const { sessionId } = data;
    if (!whiteboardChatHistory.has(sessionId)) {
      whiteboardChatHistory.set(sessionId, []);
    }
    whiteboardChatHistory.get(sessionId).push(data);
    socket.to(`whiteboard-${sessionId}`).emit('whiteboard:chat-message', data);
  });
  
  // Whiteboard chat history request
  socket.on('whiteboard:request-chat-history', (data) => {
    const { sessionId } = data;
    const history = whiteboardChatHistory.get(sessionId) || [];
    socket.emit('whiteboard:chat-history', history);
  });

  // Instructor sends canvas state to new viewer
  socket.on('whiteboard:send-state', (data) => {
    const { sessionId, imageData, bgColor, bgPattern, imageObjects, textObjects, shapeObjects, laserPos, targetSocketId } = data;

    io.to(targetSocketId).emit('whiteboard:canvas-state', {
      sessionId,
      imageData,
      bgColor,
      bgPattern,
      imageObjects,
      textObjects,
      shapeObjects,
      laserPos
    });
  });

  // Join class/group rooms for whiteboard notifications
  socket.on('join-class', (classId) => {
    socket.join(`class-${classId}`);
  });

  socket.on('join-group', (groupId) => {
    socket.join(`group-${groupId}`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
// Initialize cron jobs
const cronService = require('./services/cron.service');
cronService.setSocketIO(io);
cronService.initCronJobs();

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📚 Lab Record Manager API ready`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
});

module.exports = { app, server, io };
