import React, { useRef, useState, useEffect } from 'react';
import { Camera, CameraOff, RefreshCw, Upload, Sparkles, AlertCircle, CheckCircle2, SwitchCamera } from 'lucide-react';

function CameraCapture({ onCapture }) {
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const [stream,      setStream]      = useState(null);
  const [preview,     setPreview]     = useState('');
  const [error,       setError]       = useState('');
  const [facingMode,  setFacingMode]  = useState('user'); // default to user on laptops/desktops
  const [isStarting,  setIsStarting]  = useState(false);

  // Safely attach stream to video element whenever stream state changes and video is mounted
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(err => {
        console.warn('Video play error:', err);
      });
    }
  }, [stream]);

  // Clean up stream on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, [stream]);

  const startCamera = async (overrideFacing) => {
    setIsStarting(true);
    setError('');
    
    // Stop any existing stream
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }

    const currentFacing = overrideFacing || facingMode;

    // Progressive constraint fallback list
    const constraintAttempts = [
      { video: { facingMode: currentFacing, width: { ideal: 1280 }, height: { ideal: 720 } } },
      { video: { facingMode: currentFacing } },
      { video: true } // simple fallback for any available camera
    ];

    let activeStream = null;
    let lastError = null;

    for (const constraints of constraintAttempts) {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera API (getUserMedia) is not supported in this browser or context.');
        }
        activeStream = await navigator.mediaDevices.getUserMedia(constraints);
        if (activeStream) break;
      } catch (err) {
        lastError = err;
      }
    }

    setIsStarting(false);

    if (activeStream) {
      setStream(activeStream);
      setPreview('');
      setError('');
    } else {
      let friendlyMsg = 'Camera access unavailable.';
      if (lastError?.name === 'NotAllowedError' || lastError?.name === 'PermissionDeniedError') {
        friendlyMsg = 'Camera permission was denied. Please allow camera access in your browser address bar.';
      } else if (lastError?.name === 'NotFoundError' || lastError?.name === 'DevicesNotFoundError') {
        friendlyMsg = 'No camera device found on this system. You can use the "Upload Photo" option below instead!';
      } else if (lastError?.name === 'NotReadableError') {
        friendlyMsg = 'Camera is already in use by another application.';
      }
      setError(friendlyMsg);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }
  };

  const toggleFacingMode = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const video  = videoRef.current;
    
    canvas.width  = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setPreview(dataUrl);
    
    canvas.toBlob(blob => {
      if (onCapture && blob) onCapture(blob, dataUrl);
    }, 'image/jpeg', 0.92);
    
    stopCamera();
  };

  // Handle manual file upload from disk
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    stopCamera();
    setError('');

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      setPreview(dataUrl);
      if (onCapture) onCapture(file, dataUrl);
    };
    reader.readAsDataURL(file);
    // Reset file input
    e.target.value = '';
  };

  // Generate a realistic demo handwritten vitals slip for quick 1-click testing
  const generateSampleSlip = () => {
    stopCamera();
    setError('');

    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 700;
    const ctx = canvas.getContext('2d');

    // Paper background with subtle texture
    ctx.fillStyle = '#faf8f2';
    ctx.fillRect(0, 0, 600, 700);

    // Ruled lines
    ctx.strokeStyle = '#e2dfd5';
    ctx.lineWidth = 1;
    for (let y = 60; y < 700; y += 40) {
      ctx.beginPath();
      ctx.moveTo(30, y);
      ctx.lineTo(570, y);
      ctx.stroke();
    }

    // Header stamp
    ctx.fillStyle = '#1e3a8a';
    ctx.font = 'bold 22px Arial, sans-serif';
    ctx.fillText('SRM MEDICAL CLINIC - OPD VITALS', 50, 45);

    // Realistic handwritten vitals in dark blue pen
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 24px "Courier New", monospace';
    
    const lines = [
      'Date: 25-09-2026',
      'BP: 120/80',
      'Pulse: 74 bpm',
      'Temp: 98.6 F',
      'SpO2: 98%',
      'Weight: 68 kg',
      'Height: 172 cm',
      'Complaint: Fever and headache'
    ];

    let startY = 115;
    lines.forEach(line => {
      ctx.fillText(line, 50, startY);
      startY += 65;
    });

    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    setPreview(dataUrl);

    canvas.toBlob(blob => {
      if (onCapture && blob) onCapture(blob, dataUrl);
    }, 'image/jpeg', 0.95);
  };

  return (
    <div className="space-y-4">
      {/* Error alert with helpful guidance */}
      {error && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl p-3.5 flex items-start space-x-2.5">
          <AlertCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">{error}</p>
            <p className="text-amber-700">Tip: You can use the <strong>"Upload Photo"</strong> or <strong>"Try Sample Slip"</strong> button below!</p>
          </div>
        </div>
      )}

      {/* Hidden file input for uploading an existing photo */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/*"
        className="hidden"
      />

      {/* ── STATE 1: Initial (Camera off, no preview) ── */}
      {!stream && !preview && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {/* Live Camera Button */}
            <button
              onClick={() => startCamera()}
              disabled={isStarting}
              type="button"
              className="py-8 px-4 rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/40
                hover:border-indigo-400 hover:bg-indigo-50 transition-all group flex flex-col items-center justify-center space-y-2.5"
            >
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 group-hover:bg-indigo-200 flex items-center justify-center transition-colors">
                <Camera size={22} className="text-indigo-600" />
              </div>
              <div className="text-center">
                <p className="text-xs font-bold text-indigo-900">
                  {isStarting ? 'Accessing Camera...' : 'Start Camera'}
                </p>
                <p className="text-[11px] text-indigo-600/80 mt-0.5">Use device webcam</p>
              </div>
            </button>

            {/* File Upload Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              type="button"
              className="py-8 px-4 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50
                hover:border-gray-400 hover:bg-gray-100/70 transition-all group flex flex-col items-center justify-center space-y-2.5"
            >
              <div className="w-12 h-12 rounded-2xl bg-gray-200 group-hover:bg-gray-300 flex items-center justify-center transition-colors">
                <Upload size={22} className="text-gray-700" />
              </div>
              <div className="text-center">
                <p className="text-xs font-bold text-gray-800">Upload Photo</p>
                <p className="text-[11px] text-gray-500 mt-0.5">Select image from PC</p>
              </div>
            </button>
          </div>

          {/* Instant 1-Click Demo Slip */}
          <button
            onClick={generateSampleSlip}
            type="button"
            className="w-full py-2.5 px-4 rounded-xl border border-purple-200 bg-purple-50/60 hover:bg-purple-100/60
              text-purple-700 text-xs font-semibold transition-all flex items-center justify-center space-x-2"
          >
            <Sparkles size={14} className="text-purple-500" />
            <span>✨ Test with 1-Click Sample Vitals Slip</span>
          </button>
        </div>
      )}

      {/* ── STATE 2: Live Camera View ── */}
      {stream && (
        <div className="relative rounded-2xl overflow-hidden bg-black shadow-xl">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-64 object-cover rounded-2xl"
          />

          {/* Viewfinder Target Overlays */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-5 border-2 border-white/40 rounded-xl">
              <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-white rounded-tl" />
              <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-white rounded-tr" />
              <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-white rounded-bl" />
              <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-white rounded-br" />
            </div>
            <p className="absolute bottom-16 left-0 right-0 text-center text-white/80 text-[11px] drop-shadow-md">
              Position handwritten slip inside frame
            </p>
          </div>

          {/* Floating Action Controls */}
          <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center space-x-4">
            {/* Cancel/Stop button */}
            <button
              type="button"
              onClick={stopCamera}
              className="w-10 h-10 rounded-full bg-black/60 border border-white/30 flex items-center justify-center text-white hover:bg-red-600 transition-colors shadow-lg"
              title="Close camera"
            >
              <CameraOff size={16} />
            </button>

            {/* Main Shutter Capture Button */}
            <button
              type="button"
              onClick={capturePhoto}
              className="w-14 h-14 rounded-full border-4 border-white flex items-center justify-center
                shadow-2xl transition-all active:scale-90 text-white"
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
              title="Capture Photo"
            >
              <Camera size={22} />
            </button>

            {/* Switch Camera Button (Front/Back) */}
            <button
              type="button"
              onClick={toggleFacingMode}
              className="w-10 h-10 rounded-full bg-black/60 border border-white/30 flex items-center justify-center text-white hover:bg-white/20 transition-colors shadow-lg"
              title="Flip camera"
            >
              <SwitchCamera size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── STATE 3: Image Captured / Uploaded Preview ── */}
      {preview && (
        <div className="space-y-3">
          <div className="relative rounded-2xl overflow-hidden shadow-md border border-gray-200 bg-gray-900 max-h-64 flex items-center justify-center">
            <img src={preview} alt="Captured Slip" className="max-h-64 object-contain w-full" />
            <div className="absolute top-2.5 right-2.5">
              <span className="inline-flex items-center space-x-1 bg-emerald-500 text-white text-xs font-bold px-2.5 py-1 rounded-lg shadow-md">
                <CheckCircle2 size={13} />
                <span>Image Ready</span>
              </span>
            </div>
          </div>

          {/* Retake & Replace Options */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => startCamera()}
              className="py-2 px-3 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700
                hover:bg-gray-50 hover:text-indigo-600 hover:border-indigo-300 transition-all flex items-center justify-center space-x-1.5"
            >
              <RefreshCw size={13} />
              <span>Retake Photo</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="py-2 px-3 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700
                hover:bg-gray-50 hover:text-indigo-600 hover:border-indigo-300 transition-all flex items-center justify-center space-x-1.5"
            >
              <Upload size={13} />
              <span>Upload Another</span>
            </button>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

export default CameraCapture;
