import React, { useState, useRef, useEffect } from 'react';
import { Video, VideoOff, Mic, MicOff, Circle, Square } from 'lucide-react';
import { toast } from 'react-hot-toast';

const WhiteboardRecorder = ({ canvasRef, sessionId, onRecordingComplete }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [hasCamera, setHasCamera] = useState(false);
    const [hasMic, setHasMic] = useState(false);
    
    const mediaRecorderRef = useRef(null);
    const recordedChunksRef = useRef([]);
    const streamRef = useRef(null);
    const videoPreviewRef = useRef(null);

    // Initialize media stream for camera/mic
    useEffect(() => {
        const initMedia = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: true
                });
                streamRef.current = stream;
                setHasCamera(true);
                setHasMic(true);
                if (videoPreviewRef.current) {
                    videoPreviewRef.current.srcObject = stream;
                }
            } catch (err) {
                console.warn('Camera/Mic access denied or unavailable', err);
                // Fallback to audio only if video fails, or no AV
                try {
                    const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    streamRef.current = audioStream;
                    setHasMic(true);
                } catch (audioErr) {
                    console.warn('Mic access denied', audioErr);
                }
            }
        };

        initMedia();

        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const toggleCamera = () => {
        if (streamRef.current) {
            const videoTrack = streamRef.current.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setHasCamera(videoTrack.enabled);
            }
        }
    };

    const toggleMic = () => {
        if (streamRef.current) {
            const audioTrack = streamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setHasMic(audioTrack.enabled);
            }
        }
    };

    const startRecording = async () => {
        if (!canvasRef.current) {
            toast.error('Canvas not ready for recording');
            return;
        }

        try {
            recordedChunksRef.current = [];
            
            // Capture canvas stream at 30 fps
            const canvasStream = canvasRef.current.captureStream(30);
            
            // Combine with camera/mic stream if available
            const combinedTracks = [...canvasStream.getTracks()];
            if (streamRef.current) {
                combinedTracks.push(...streamRef.current.getTracks());
            }

            const combinedStream = new MediaStream(combinedTracks);

            const options = { mimeType: 'video/webm; codecs=vp9' };
            let mediaRecorder;
            try {
                mediaRecorder = new MediaRecorder(combinedStream, options);
            } catch (e) {
                // Fallback to default if vp9 isn't supported
                mediaRecorder = new MediaRecorder(combinedStream);
            }

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    recordedChunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
                await uploadRecording(blob);
            };

            mediaRecorderRef.current = mediaRecorder;
            mediaRecorder.start(1000); // collect data every second
            setIsRecording(true);
            toast.success('Recording started');
        } catch (err) {
            console.error('Error starting recording:', err);
            toast.error('Failed to start recording');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            toast.loading('Uploading recording...', { id: 'recording-upload' });
        }
    };

    const uploadRecording = async (blob) => {
        try {
            // Convert Blob to File for upload API
            const file = new File([blob], `whiteboard_recording_${Date.now()}.webm`, {
                type: 'video/webm'
            });

            // Need to wrap in FormData based on the filesAPI implementation
            const formData = new FormData();
            formData.append('file', file);

            // Fetch token for API call
            const authStore = JSON.parse(localStorage.getItem('auth-storage') || '{}');
            const token = authStore?.state?.accessToken;
            
            // Upload to Cloudinary using existing API endpoint
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/files/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            
            const uploadData = await res.json();
            
            if (uploadData.success && uploadData.data?.url) {
                // Save metadata to WhiteboardRecording DB
                await saveRecordingMetadata(uploadData.data);
                toast.success('Recording saved successfully!', { id: 'recording-upload' });
                
                if (onRecordingComplete) {
                    onRecordingComplete(uploadData.data);
                }
            } else {
                throw new Error('Upload failed');
            }
        } catch (err) {
            console.error('Error uploading recording:', err);
            toast.error('Failed to upload recording', { id: 'recording-upload' });
        }
    };

    const saveRecordingMetadata = async (fileData) => {
        try {
            const authStore = JSON.parse(localStorage.getItem('auth-storage') || '{}');
            const token = authStore?.state?.accessToken;

            await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/whiteboard/recordings`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: `Whiteboard Lecture - ${new Date().toLocaleDateString()}`,
                    cloudinaryId: fileData.public_id,
                    cloudinaryUrl: fileData.url,
                    sessionId: sessionId,
                    fileSize: fileData.bytes,
                    isPublic: true
                })
            });
        } catch (err) {
            console.error('Error saving recording metadata:', err);
        }
    };

    return (
        <div className="absolute bottom-6 left-6 z-40 flex items-end gap-4 pointer-events-none">
            {/* Video Preview Picture-in-Picture */}
            <div className={`w-48 h-36 bg-slate-900 rounded-xl overflow-hidden shadow-2xl border-2 border-slate-700 pointer-events-auto transition-opacity duration-300 ${hasCamera ? 'opacity-100' : 'opacity-0 hidden'}`}>
                <video 
                    ref={videoPreviewRef} 
                    autoPlay 
                    muted 
                    playsInline 
                    className="w-full h-full object-cover transform scale-x-[-1]"
                />
            </div>

            {/* Recording Controls */}
            <div className="bg-slate-800/95 backdrop-blur-md p-2 rounded-2xl shadow-xl border border-slate-700/50 flex items-center gap-2 pointer-events-auto">
                <button
                    onClick={toggleMic}
                    className={`p-2 rounded-xl transition-all ${hasMic ? 'text-slate-200 hover:bg-slate-700' : 'text-red-400 hover:bg-red-500/20 bg-red-500/10'}`}
                    title={hasMic ? 'Mute Microphone' : 'Unmute Microphone'}
                >
                    {hasMic ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                </button>
                <button
                    onClick={toggleCamera}
                    className={`p-2 rounded-xl transition-all ${hasCamera ? 'text-slate-200 hover:bg-slate-700' : 'text-red-400 hover:bg-red-500/20 bg-red-500/10'}`}
                    title={hasCamera ? 'Turn Camera Off' : 'Turn Camera On'}
                >
                    {hasCamera ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                </button>
                
                <div className="w-px h-8 bg-slate-700 mx-1"></div>
                
                {isRecording ? (
                    <button
                        onClick={stopRecording}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors"
                    >
                        <Square className="w-4 h-4 fill-current" />
                        Stop Recording
                    </button>
                ) : (
                    <button
                        onClick={startRecording}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-colors group"
                    >
                        <Circle className="w-4 h-4 fill-red-500 text-red-500 group-hover:scale-110 transition-transform" />
                        Record Lecture
                    </button>
                )}
                
                {isRecording && (
                    <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-red-500/10 border border-red-500/30 px-3 py-1 rounded-full flex items-center gap-2 pointer-events-none">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                        <span className="text-red-500 font-medium text-sm">Recording...</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WhiteboardRecorder;
