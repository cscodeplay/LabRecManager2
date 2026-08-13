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
const meetingRoutes = require('./routes/meeting.routes');
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
const adminNotesRoutes = require('./routes/admin-notes.routes');
const compilerRoutes = require('./routes/compiler.routes');

// Import middleware
const { errorHandler } = require('./middleware/errorHandler');
const { requestLogger } = require('./middleware/requestLogger');

// Initialize Express app
const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  'http://localhost:3000',
  'https://lab-rec-client.onrender.com',
  'https://labrecordmanager.onrender.com',
  process.env.CLIENT_URL
].filter(Boolean);

// Initialize Socket.io for real-time features (viva, notifications)
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Make io accessible in routes
app.set('io', io);

// Middleware
app.use(cors({
  origin: allowedOrigins,
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
app.use('/api/meetings', meetingRoutes);
app.use('/api/viva', meetingRoutes);
app.use('/api/grades', gradeRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/syllabus', syllabusRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin-notes', adminNotesRoutes);
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
app.use('/api/compiler', compilerRoutes);

const prisma = require('./config/database');

// Simple Health check endpoint for UptimeRobot
app.get('/health', (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Comprehensive Health check endpoint (Keep-Alive)
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

// Store active whiteboard sessions and their participants
const whiteboardSessions = new Map();

function getSession(sessionId) {
  if (!whiteboardSessions.has(sessionId)) {
    whiteboardSessions.set(sessionId, {
      participants: new Map() // socketId -> { id, name, role, permissions }
    });
  }
  return whiteboardSessions.get(sessionId);
}

// Store active host cameras: { sessionId: [socketId1, socketId2] }
const activeHostCameras = {};

// Store active meeting rooms: roomId -> Map(socketId -> { socketId, userId, name, role, isCameraOn, isMicOn, isScreenSharing, joinedAt })
const activeMeetingRooms = new Map();
// Store waiting rooms: roomId -> Map(socketId -> { socketId, userId, name, role, joinedAt })
const waitingRooms = new Map();

function getMeetingRoom(roomId) {
  if (!activeMeetingRooms.has(roomId)) {
    activeMeetingRooms.set(roomId, new Map());
  }
  return activeMeetingRooms.get(roomId);
}

function getWaitingRoom(roomId) {
  if (!waitingRooms.has(roomId)) {
    waitingRooms.set(roomId, new Map());
  }
  return waitingRooms.get(roomId);
}

// Socket.io connection handling for meeting sessions
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // ===========================================
  // MULTI-DEVICE MEETING MESH SIGNALING & WAITING ROOM
  // ===========================================
  socket.on('meeting:join', (data) => {
    const { roomId, user, isCameraOn, isMicOn, isScreenSharing } = data || {};
    if (!roomId) return;

    const room = getMeetingRoom(roomId);
    const waitingRoom = getWaitingRoom(roomId);

    // If previously in waiting room, remove
    waitingRoom.delete(socket.id);

    socket.join(`meeting-${roomId}`);
    
    const participantInfo = {
      socketId: socket.id,
      userId: user?.id || socket.id,
      name: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'Participant' : 'Participant',
      role: user?.role || 'student',
      isCameraOn: !!isCameraOn,
      isMicOn: !!isMicOn,
      isScreenSharing: !!isScreenSharing,
      joinedAt: Date.now()
    };

    // Send existing participants in the room to the newly joined peer
    const existingParticipants = Array.from(room.values());
    socket.emit('meeting:room-users', {
      participants: existingParticipants,
      yourSocketId: socket.id
    });

    // Save newly joined peer to room
    room.set(socket.id, participantInfo);

    // Notify other peers in the room about the new participant
    socket.to(`meeting-${roomId}`).emit('meeting:user-joined', {
      participant: participantInfo
    });

    // If instructor/host, send current waiting list
    if (user?.role === 'instructor' || user?.role === 'admin' || user?.role === 'lab_assistant') {
      socket.emit('meeting:waiting-users', {
        waiting: Array.from(waitingRoom.values())
      });
    }

    console.log(`User ${participantInfo.name} (${socket.id}) joined meeting ${roomId}. Total participants: ${room.size}`);
  });

  // Participant Joins Waiting Room (when host has not yet admitted or autoJoin is false)
  socket.on('meeting:join-waiting-room', (data) => {
    const { roomId, user } = data || {};
    if (!roomId) return;

    socket.join(`waiting-${roomId}`);
    const waitingRoom = getWaitingRoom(roomId);

    const waitingParticipant = {
      socketId: socket.id,
      userId: user?.id || socket.id,
      name: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'Student' : 'Student',
      role: user?.role || 'student',
      joinedAt: Date.now()
    };

    waitingRoom.set(socket.id, waitingParticipant);

    // Inform the student
    socket.emit('meeting:waiting-status', {
      isWaiting: true,
      message: 'Please wait, the meeting host will let you in soon.'
    });

    // Notify host in meeting room about the new waiting user
    io.to(`meeting-${roomId}`).emit('meeting:waiting-users', {
      waiting: Array.from(waitingRoom.values())
    });

    console.log(`User ${waitingParticipant.name} (${socket.id}) entered waiting room for meeting ${roomId}`);
  });

  // Host Admits Waiting User
  socket.on('meeting:admit-user', (data) => {
    const { roomId, targetSocketId } = data || {};
    if (!roomId) return;

    const waitingRoom = getWaitingRoom(roomId);

    if (targetSocketId === 'all') {
      waitingRoom.forEach((p, sId) => {
        io.to(sId).emit('meeting:admitted');
      });
      waitingRoom.clear();
    } else if (targetSocketId && waitingRoom.has(targetSocketId)) {
      io.to(targetSocketId).emit('meeting:admitted');
      waitingRoom.delete(targetSocketId);
    }

    // Broadcast updated waiting list to meeting host
    io.to(`meeting-${roomId}`).emit('meeting:waiting-users', {
      waiting: Array.from(waitingRoom.values())
    });
  });

  // Host Denies Waiting User
  socket.on('meeting:deny-user', (data) => {
    const { roomId, targetSocketId } = data || {};
    if (!roomId) return;

    const waitingRoom = getWaitingRoom(roomId);
    if (targetSocketId && waitingRoom.has(targetSocketId)) {
      io.to(targetSocketId).emit('meeting:denied');
      waitingRoom.delete(targetSocketId);
    }

    io.to(`meeting-${roomId}`).emit('meeting:waiting-users', {
      waiting: Array.from(waitingRoom.values())
    });
  });

  // Direct Peer-to-Peer WebRTC signaling routing
  socket.on('meeting:signal', (data) => {
    const { targetSocketId, signal } = data || {};
    if (targetSocketId && signal) {
      io.to(targetSocketId).emit('meeting:signal', {
        fromSocketId: socket.id,
        signal
      });
    }
  });

  // Media toggle event broadcast (camera/mic/screenshare changes)
  socket.on('meeting:media-toggle', (data) => {
    const { roomId, isCameraOn, isMicOn, isScreenSharing } = data || {};
    if (roomId) {
      const room = getMeetingRoom(roomId);
      if (room.has(socket.id)) {
        const participant = room.get(socket.id);
        if (isCameraOn !== undefined) participant.isCameraOn = isCameraOn;
        if (isMicOn !== undefined) participant.isMicOn = isMicOn;
        if (isScreenSharing !== undefined) participant.isScreenSharing = isScreenSharing;
      }
      socket.to(`meeting-${roomId}`).emit('meeting:media-toggle', {
        socketId: socket.id,
        isCameraOn,
        isMicOn,
        isScreenSharing
      });
    }
  });

  // In-Meeting Chat Message
  socket.on('meeting:chat-message', (data) => {
    const { roomId, message } = data || {};
    if (roomId && message) {
      io.to(`meeting-${roomId}`).emit('meeting:chat-message', message);
    }
  });

  // Host Remote Control (Mute mic, stop camera, stop screen, toggle drawing)
  socket.on('meeting:host-control', (data) => {
    const { roomId, targetSocketId, action, value } = data || {};
    if (roomId && action) {
      if (targetSocketId === 'all') {
        socket.to(`meeting-${roomId}`).emit('meeting:host-action', data);
      } else if (targetSocketId) {
        io.to(targetSocketId).emit('meeting:host-action', data);
      }
    }
  });

  // Whiteboard drawing permission updates for meeting participants
  socket.on('meeting:whiteboard-permission', (data) => {
    const { roomId } = data || {};
    if (roomId) {
      io.to(`meeting-${roomId}`).emit('meeting:whiteboard-permission-update', data);
    }
  });

  // Set Active Presentation Space (whiteboard, vc_tiles, screen_share)
  socket.on('meeting:set-active-space', (data) => {
    const { roomId, space } = data || {};
    if (roomId && space) {
      io.to(`meeting-${roomId}`).emit('meeting:active-space-changed', {
        space,
        senderSocketId: socket.id
      });
    }
  });

  // End meeting for everyone
  socket.on('meeting:end-session', (data) => {
    const { roomId } = data || {};
    if (roomId) {
      io.to(`meeting-${roomId}`).emit('meeting:session-ended');
      activeMeetingRooms.delete(roomId);
      waitingRooms.delete(roomId);
    }
  });

  // Legacy room support
  socket.on('join-meeting', (meetingId) => {
    socket.join(`meeting-${meetingId}`);
  });
  socket.on('join-room', (data) => {
    const roomId = typeof data === 'object' ? data.roomId : data;
    if (roomId) socket.join(`meeting-${roomId}`);
  });
  socket.on('meeting-signal', (data) => {
    socket.to(`meeting-${data.meetingId}`).emit('meeting-signal', {
      signal: data.signal,
      from: socket.id
    });
  });
  socket.on('offer', (data) => {
    socket.to(`meeting-${data.roomId}`).emit('offer', data.offer);
  });
  socket.on('answer', (data) => {
    socket.to(`meeting-${data.roomId}`).emit('answer', data.answer);
  });
  socket.on('ice-candidate', (data) => {
    socket.to(`meeting-${data.roomId}`).emit('ice-candidate', data.candidate);
  });
  socket.on('session-ended', (data) => {
    io.to(`meeting-${data.roomId}`).emit('session-ended');
  });

  // Notifications
  socket.on('join-user', (userId) => {
    socket.join(`user-${userId}`);
  });

  // ===========================================
  // WHITEBOARD SHARING EVENTS
  // ===========================================

  // Instructor starts sharing whiteboard
  
  socket.on('whiteboard:join-session', (data) => {
    const { sessionId, userId, userName, role } = data;
    const session = getSession(sessionId);
    socket.join(`whiteboard-${sessionId}`);
    
    session.participants.set(socket.id, {
      id: userId || socket.id,
      name: userName || 'Unknown',
      role: role || 'student',
      permissions: { canDraw: role === 'instructor' || role === 'admin' || role === 'principal' ? true : false, canShareAudio: false, canShareVideo: false },
      joinedAt: Date.now(),
      isMicOn: false,
      isCameraOn: false,
      status: 'Online'
    });
    
    // Broadcast updated participants list to instructor
    io.to(`whiteboard-${sessionId}`).emit('whiteboard:participants-update', {
      participants: Array.from(session.participants.values())
    });
  });

  socket.on('whiteboard:get-participants', (data) => {
    const { sessionId } = data;
    const session = getSession(sessionId);
    socket.emit('whiteboard:participants-list', {
      participants: Array.from(session.participants.values())
    });
  });

  socket.on('whiteboard:update-permissions', (data) => {
    const { sessionId, targetUserId, permissions } = data;
    const session = getSession(sessionId);
    
    // Update locally
    let targetSocketId = null;
    for (const [sId, p] of session.participants.entries()) {
      if (p.id === targetUserId) {
        p.permissions = permissions;
        targetSocketId = sId;
        break;
      }
    }
    
    // Notify everyone (especially the target)
    io.to(`whiteboard-${sessionId}`).emit('whiteboard:permissions-updated', {
      userId: targetUserId,
      permissions
    });
  });

  socket.on('whiteboard:media-status', (data) => {
    const { sessionId, isMicOn, isCameraOn } = data;
    const session = getSession(sessionId);
    
    if (session.participants.has(socket.id)) {
      const p = session.participants.get(socket.id);
      p.isMicOn = isMicOn;
      p.isCameraOn = isCameraOn;
      io.to(`whiteboard-${sessionId}`).emit('whiteboard:participants-update', {
        participants: Array.from(session.participants.values())
      });
    }
  });

  socket.on('whiteboard:user-status', (data) => {
    const { sessionId, status } = data;
    const session = getSession(sessionId);
    
    if (session.participants.has(socket.id)) {
      const p = session.participants.get(socket.id);
      p.status = status;
      io.to(`whiteboard-${sessionId}`).emit('whiteboard:participants-update', {
        participants: Array.from(session.participants.values())
      });
    }
  });

  socket.on('whiteboard:remove-participant', (data) => {
    const { sessionId, targetUserId } = data;
    const session = getSession(sessionId);
    
    let targetSocketId = null;
    for (const [sId, p] of session.participants.entries()) {
      if (p.id === targetUserId) {
        targetSocketId = sId;
        break;
      }
    }
    
    if (targetSocketId) {
      session.participants.delete(targetSocketId);
      
      // Notify the removed participant to disconnect
      io.to(targetSocketId).emit('whiteboard:kicked', { sessionId });
      
      // Notify others
      io.to(`whiteboard-${sessionId}`).emit('whiteboard:participants-update', {
        participants: Array.from(session.participants.values())
      });
    }
  });

  
  socket.on('whiteboard:move-to-waiting-room', (data) => {
    const { sessionId, targetUserId } = data;
    const session = getSession(sessionId);
    
    let targetSocketId = null;
    let targetParticipant = null;
    for (const [sId, p] of session.participants.entries()) {
      if (p.id === targetUserId) {
        targetSocketId = sId;
        targetParticipant = p;
        break;
      }
    }
    
    if (targetParticipant) {
      targetParticipant.status = 'waiting';
      
      // Notify the removed participant
      io.to(targetSocketId).emit('whiteboard:move-to-waiting-room', { sessionId, targetUserId });
      
      // Notify others
      io.to(`whiteboard-${sessionId}`).emit('whiteboard:participants-update', {
        participants: Array.from(session.participants.values())
      });
    }
  });

  socket.on('whiteboard:admit-from-waiting-room', (data) => {
    const { sessionId, targetUserId } = data;
    const session = getSession(sessionId);
    
    let targetSocketId = null;
    let targetParticipant = null;
    for (const [sId, p] of session.participants.entries()) {
      if (p.id === targetUserId) {
        targetSocketId = sId;
        targetParticipant = p;
        break;
      }
    }
    
    if (targetParticipant) {
      targetParticipant.status = 'Live';
      
      // Notify the admitted participant
      io.to(targetSocketId).emit('whiteboard:admit-from-waiting-room', { sessionId, targetUserId });
      
      // Notify others
      io.to(`whiteboard-${sessionId}`).emit('whiteboard:participants-update', {
        participants: Array.from(session.participants.values())
      });
    }
  });

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

  // Recording events
  socket.on('whiteboard:recording-started', (data) => {
    socket.to(`whiteboard-${data.sessionId}`).emit('whiteboard:recording-started', data);
  });

  socket.on('whiteboard:recording-stopped', (data) => {
    socket.to(`whiteboard-${data.sessionId}`).emit('whiteboard:recording-stopped', data);
  });

  // WebRTC events
  socket.on('whiteboard:camera-start', (data) => {
    const { sessionId } = data;
    if (!activeHostCameras[sessionId]) {
      activeHostCameras[sessionId] = [];
    }
    
    // Check if we are already at max 50 devices
    if (!activeHostCameras[sessionId].includes(socket.id)) {
      if (activeHostCameras[sessionId].length >= 50) {
        socket.emit('whiteboard:camera-rejected', { reason: 'Maximum of 50 host cameras allowed' });
        return;
      }
      activeHostCameras[sessionId].push(socket.id);
    }
    socket.to(`whiteboard-${sessionId}`).emit('whiteboard:camera-start', { ...data, fromSocketId: socket.id });
  });

  socket.on('whiteboard:camera-stop', (data) => {
    const { sessionId } = data;
    if (activeHostCameras[sessionId]) {
      activeHostCameras[sessionId] = activeHostCameras[sessionId].filter(id => id !== socket.id);
    }
    socket.to(`whiteboard-${sessionId}`).emit('whiteboard:camera-stop', { ...data, fromSocketId: socket.id });
  });

  socket.on('whiteboard:webrtc-offer', (data) => {
    io.to(data.targetSocketId).emit('whiteboard:webrtc-offer', { ...data, fromSocketId: socket.id });
  });

  socket.on('whiteboard:webrtc-answer', (data) => {
    io.to(data.targetSocketId).emit('whiteboard:webrtc-answer', { ...data, fromSocketId: socket.id });
  });

  socket.on('whiteboard:webrtc-ice-candidate', (data) => {
    io.to(data.targetSocketId).emit('whiteboard:webrtc-ice-candidate', { ...data, fromSocketId: socket.id });
  });

  socket.on('whiteboard:webrtc-join', (data) => {
    socket.to(`whiteboard-${data.sessionId}`).emit('whiteboard:webrtc-join', { ...data, fromSocketId: socket.id });
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

  // Granular update for HTML overlay objects (shapes, text, images)
  socket.on('whiteboard:objects-update', (data) => {
    const { sessionId, imageObjects, textObjects, shapeObjects } = data;
    socket.to(`whiteboard-${sessionId}`).emit('whiteboard:objects-update', {
      sessionId,
      imageObjects,
      textObjects,
      shapeObjects
    });
  });

  socket.on('whiteboard:shape-add', (data) => {
    socket.to(`whiteboard-${data.sessionId}`).emit('whiteboard:shape-add', data);
  });

  socket.on('whiteboard:shape-delete', (data) => {
    socket.to(`whiteboard-${data.sessionId}`).emit('whiteboard:shape-delete', data);
  });


  // Real-time laser pointer position
  socket.on('whiteboard:laser-update', (data) => {
    const { sessionId, laserPos } = data;
    socket.to(`whiteboard-${sessionId}`).emit('whiteboard:laser-update', {
      sessionId,
      laserPos
    });
  });

  socket.on('whiteboard:cursor-update', (data) => {
    const { sessionId, socketId, x, y, userName, tool } = data;
    socket.to(`whiteboard-${sessionId}`).emit('whiteboard:cursor-update', {
      socketId,
      x,
      y,
      userName,
      tool
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

  // Polling Events
  socket.on('poll:start', (data) => {
    // broadcast to the room (we can use the room the socket joined, e.g., 'meeting-...' or 'viva-...')
    // Usually the user joins a specific room. 
    // In room/[id]/page.jsx, the socket joins via 'join-meeting' with the meetingId
    // But since the frontend doesn't explicitly send the room in poll:start, we will broadcast to all rooms this socket is in
    socket.rooms.forEach(room => {
      if (room !== socket.id) {
        socket.to(room).emit('poll:start', data);
      }
    });
  });

  socket.on('poll:vote', (data) => {
    socket.rooms.forEach(room => {
      if (room !== socket.id) {
        socket.to(room).emit('poll:vote', data);
      }
    });
  });

  socket.on('poll:end', (data) => {
    socket.rooms.forEach(room => {
      if (room !== socket.id) {
        socket.to(room).emit('poll:end', data);
      }
    });
  });

  socket.on('disconnect', () => {
    // Remove from active meeting rooms
    for (const [roomId, room] of activeMeetingRooms.entries()) {
      if (room.has(socket.id)) {
        room.delete(socket.id);
        io.to(`meeting-${roomId}`).emit('meeting:user-left', {
          socketId: socket.id
        });
        if (room.size === 0) {
          activeMeetingRooms.delete(roomId);
        }
      }
    }

    // Remove from whiteboard sessions
    for (const [sessionId, session] of whiteboardSessions.entries()) {
      if (session.participants.has(socket.id)) {
        session.participants.delete(socket.id);
        io.to(`whiteboard-${sessionId}`).emit('whiteboard:participants-update', {
          participants: Array.from(session.participants.values())
        });
      }
    }

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
