import React, { useState, useEffect, useCallback } from 'react';
import CameraCapture from '../components/CameraCapture';
import { uploadVitalsImage, saveVitals, getQueue } from '../api';
import {
  Search, Heart, Thermometer, Wind, Scale,
  Ruler, MessageSquare, CheckCircle2, AlertCircle,
  Activity, Camera, Save, User, Sparkles, RefreshCw
} from 'lucide-react';

const VitalInput = ({ label, icon: Icon, unit, name, value, onChange, type = 'number', step }) => (
  <div className="group">
    <div className="flex items-center justify-between mb-1.5">
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
        {label}
        {unit && <span className="normal-case font-normal text-gray-400 ml-1">({unit})</span>}
      </label>
      {value !== '' && value !== null && value !== undefined && (
        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
          ✓ Auto-Filled
        </span>
      )}
    </div>
    <div className="relative">
      {Icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg bg-indigo-50
          flex items-center justify-center group-focus-within:bg-indigo-100 transition-colors">
          <Icon size={13} className="text-indigo-500" />
        </div>
      )}
      <input
        type={type} name={name} value={value ?? ''} onChange={onChange} step={step}
        className={`w-full bg-gray-50 border rounded-xl py-3 text-sm text-gray-800
          outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 focus:bg-white
          transition-all tabular-nums ${Icon ? 'pl-11 pr-3' : 'px-4'} ${
          value !== '' && value !== null && value !== undefined
            ? 'border-emerald-300 bg-emerald-50/20'
            : 'border-gray-200'
        }`}
        placeholder="—"
      />
    </div>
  </div>
);

// High-tolerance heuristic parser for extracting any visible vital from OCR text
function parseTextClient(text) {
  const result = {};
  if (!text) return result;
  const lower = text.toLowerCase();

  // 1. Blood Pressure: look for X/Y, or B/P, B/D, Systolic/Diastolic
  const bpMatch = lower.match(/\b(?:b[\.\/\s\-]?p|b[\/d]p?|blood\s*press?u?r?e?)\b[^\d]*?(\d{2,3})\s*[\/\\\-]\s*(\d{2,3})/)
    || lower.match(/\b(9\d|1\d{2}|2[0-1]\d)\s*[\/\\\-]\s*([5-9]\d|1[0-1]\d)\b/);
  if (bpMatch) {
    let s = parseInt(bpMatch[1], 10);
    let d = parseInt(bpMatch[2], 10);
    if (s < d && d >= 80) [s, d] = [d, s];
    result.bp_systolic = s;
    result.bp_diastolic = d;
  } else {
    // Check individual systolic and diastolic mentions
    const sysMatch = lower.match(/\b(?:syst|systolic|sys)\b[^\d]*?(\d{2,3})/);
    const diaMatch = lower.match(/\b(?:diast|diastolic|dia)\b[^\d]*?(\d{2,3})/);
    if (sysMatch) result.bp_systolic = parseInt(sysMatch[1], 10);
    if (diaMatch) result.bp_diastolic = parseInt(diaMatch[1], 10);
  }

  // 2. Pulse / Heart Rate
  const pulseMatch = lower.match(/\b(?:pulse|heart\s*rate|hr|pr|p)\b[^\d]*?(\d{2,3})/)
    || lower.match(/(\d{2,3})\s*(?:bpm|beats?[\/\s]?min)/);
  if (pulseMatch) {
    const p = parseInt(pulseMatch[1], 10);
    if (p >= 40 && p <= 220) result.pulse = p;
  }

  // 3. Temperature
  const tempMatch = lower.match(/\b(?:temp|temperature|femp|t)\b[^\d]*?(\d{2,3}(?:\.\d+)?)/)
    || lower.match(/\b(9[5-9]\.\d|10[0-6]\.\d)\b/);
  if (tempMatch) {
    let t = parseFloat(tempMatch[1]);
    if (t >= 34 && t <= 44) t = Math.round(((t * 9/5) + 32) * 10) / 10;
    if (t >= 90 && t <= 112) result.temperature = t;
  }

  // 4. SpO2
  const spo2Match = lower.match(/\b(?:sp\s*o\s*2|s\s*p\s*o\s*2|o\s*2|oxygen|sat|sats)\b[^\d]*?(\d{2,3})\s*%?/)
    || lower.match(/\b(8[5-9]|9\d|100)\s*%/);
  if (spo2Match) {
    const s = parseInt(spo2Match[1], 10);
    if (s >= 65 && s <= 100) result.spo2 = s;
  }

  // 5. Weight
  const wtMatch = lower.match(/\b(?:weight|wt|w)\b[^\d]*?(\d{2,3}(?:\.\d+)?)/)
    || lower.match(/(\d{2,3}(?:\.\d+)?)\s*(?:kg|kgs)/);
  if (wtMatch) {
    const w = parseFloat(wtMatch[1]);
    if (w >= 15 && w <= 250) result.weight = w;
  }

  // 6. Height
  const htMatch = lower.match(/\b(?:height|ht)\b[^\d]*?(\d{2,3}(?:\.\d+)?)/)
    || lower.match(/(\d{2,3}(?:\.\d+)?)\s*(?:cm|cms)/);
  if (htMatch) {
    const h = parseFloat(htMatch[1]);
    if (h >= 50 && h <= 250) result.height = h;
  }

  // 7. Complaint / Symptoms
  const ccMatch = lower.match(/\b(?:complaint|c[\.\/]c|presenting|symptoms|pain|reason|dx|rx)\b[:\s\-]+([^\n\r;]+)/)
    || lower.match(/\b(fever[^\n\r]*|cough[^\n\r]*|headache[^\n\r]*|chest pain[^\n\r]*|cold[^\n\r]*|pain[^\n\r]*)/);
  if (ccMatch) {
    const cleaned = ccMatch[1].trim().replace(/^[:;~,\-\s]+/, '');
    if (cleaned.length > 2) result.chief_complaint = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  return result;
}

function VitalsCapture() {
  const [searchToken, setSearchToken]   = useState('');
  const [todayQueue, setTodayQueue]     = useState([]);
  const [patientInfo, setPatientInfo]   = useState(null);
  const [blob, setBlob]                 = useState(null);
  const [loadingOcr, setLoadingOcr]     = useState(false);
  const [ocrText, setOcrText]           = useState('');
  const [showOcr, setShowOcr]           = useState(false);
  const [message, setMessage]           = useState('');
  const [msgType, setMsgType]           = useState('info');
  const [savedData, setSavedData]       = useState(null);
  const [isSaving, setIsSaving]         = useState(false);
  
  const [vitals, setVitals] = useState({
    bp_systolic: '', bp_diastolic: '', pulse: '', temperature: '',
    spo2: '', weight: '', height: '', chief_complaint: ''
  });

  // Load today's queue on mount
  useEffect(() => {
    getQueue().then(res => {
      const q = res.data || [];
      setTodayQueue(q);
      if (q.length > 0) {
        const active = q.find(t => t.status === 'called') || q[0];
        setPatientInfo(active);
        setSearchToken(String(active.token_number));
      }
    }).catch(err => console.error("Error loading queue:", err));
  }, []);

  const handleSearch = async (e) => {
    e?.preventDefault();
    setMessage('');
    try {
      const res = await getQueue();
      const q = res.data || [];
      setTodayQueue(q);
      const token = q.find(t => String(t.token_number) === String(searchToken).trim());
      if (token) {
        setPatientInfo(token);
        setMessage('');
      } else {
        setMessage(`Token #${searchToken} not found in today's queue.`);
        setMsgType('error');
      }
    } catch {
      setMessage('Error fetching token details.');
      setMsgType('error');
    }
  };

  const selectToken = (t) => {
    setPatientInfo(t);
    setSearchToken(String(t.token_number));
    setMessage('');
    setSavedData(null);
  };

  // AUTOMATIC OCR EXECUTION AND FORM FILLING AS SOON AS AN IMAGE IS CAPTURED OR UPLOADED
  const processAndAutoFill = async (imageBlob) => {
    if (!imageBlob) return;
    setLoadingOcr(true);
    setMessage('⚡ Analyzing image and automatically filling vitals...');
    setMsgType('info');

    try {
      const res = await uploadVitalsImage(imageBlob, patientInfo?.id);
      const rawText = res.data.raw_ocr_text || res.data.raw_text || '';
      setOcrText(rawText);

      // Merge backend parser + client parser
      const backendParsed = res.data.parsed_vitals || res.data.extracted || {};
      const clientParsed = parseTextClient(rawText);
      const merged = { ...clientParsed, ...backendParsed };

      // AUTOMATICALLY FILL THE FORM INPUTS DIRECTLY
      setVitals(prev => ({
        ...prev,
        bp_systolic:     merged.bp_systolic     ?? prev.bp_systolic,
        bp_diastolic:    merged.bp_diastolic    ?? prev.bp_diastolic,
        pulse:           merged.pulse           ?? prev.pulse,
        temperature:     merged.temperature     ?? prev.temperature,
        spo2:            merged.spo2            ?? prev.spo2,
        weight:          merged.weight          ?? prev.weight,
        height:          merged.height          ?? prev.height,
        chief_complaint: merged.chief_complaint ?? prev.chief_complaint,
      }));

      const filledCount = Object.keys(merged).filter(k => merged[k] !== null && merged[k] !== undefined).length;
      if (filledCount > 0) {
        setMessage(`✅ Vitals automatically filled from slip (${filledCount} fields populated)! Review anytime.`);
        setMsgType('success');
      } else {
        setMessage('Slip text captured! You can review or tweak fields below.');
        setMsgType('info');
      }
    } catch (err) {
      console.error(err);
      setMessage('Automatic OCR extraction encountered an issue. You can enter vitals directly in the fields.');
      setMsgType('error');
    }
    setLoadingOcr(false);
  };

  // Called immediately when user takes photo, selects file, or uses sample slip
  const handleCapture = useCallback((b) => {
    setBlob(b);
    setSavedData(null);
    // AUTOMATICALLY RUN OCR AND FILL IMMEDIATELY WITHOUT REQUIRING CONFIRM/CLICK!
    processAndAutoFill(b);
  }, [patientInfo]);

  const handleChange = e => setVitals({ ...vitals, [e.target.name]: e.target.value });

  // Save to database
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!patientInfo) return;
    setIsSaving(true);
    try {
      const res = await saveVitals({
        token_id: patientInfo.id,
        uhid: patientInfo.uhid,
        ...vitals
      });
      setSavedData(res.data);
      setMessage(`✅ Vitals saved to database for Token #${patientInfo.token_number} (${patientInfo.patient_name})!`);
      setMsgType('success');
      // Refresh queue
      getQueue().then(r => setTodayQueue(r.data || [])).catch(() => {});
    } catch {
      setMessage('Failed to save vitals. Please check inputs and try again.');
      setMsgType('error');
    }
    setIsSaving(false);
  };

  const hasAnyVitals = Object.values(vitals).some(v => v !== '' && v !== null);

  return (
    <div className="max-w-6xl mx-auto space-y-5 slide-in">

      {/* ── TOP SECTION: Patient Token Selection ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 space-y-3">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Enter Token Number (e.g. 1, 2)..."
              className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm
                outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 focus:bg-white transition-all"
              value={searchToken}
              onChange={e => setSearchToken(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="px-6 py-3 rounded-xl font-bold text-white text-sm shadow-sm transition-all active:scale-95 text-center"
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
          >
            Find Token
          </button>
        </form>

        {/* Quick select active tokens */}
        {todayQueue.length > 0 && (
          <div className="flex items-center space-x-2 overflow-x-auto pt-1 no-scrollbar py-0.5">
            <span className="text-xs text-gray-400 font-medium whitespace-nowrap">Active Queue:</span>
            {todayQueue.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => selectToken(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center space-x-1.5 ${
                  patientInfo?.id === t.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span>Token #{t.token_number}</span>
                <span className="opacity-75">({t.patient_name})</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Auto-fill Status Banner */}
      {message && (
        <div className={`flex items-center space-x-2 px-4 py-3 rounded-xl text-sm font-medium ${
          msgType === 'success'
            ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
            : msgType === 'error'
            ? 'bg-red-50 border border-red-200 text-red-800'
            : 'bg-indigo-50 border border-indigo-200 text-indigo-800'
        }`}>
          {msgType === 'success' ? (
            <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
          ) : loadingOcr ? (
            <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          ) : (
            <AlertCircle size={18} className="flex-shrink-0" />
          )}
          <span>{message}</span>
        </div>
      )}

      {/* Main Two-Column Layout */}
      {patientInfo ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* ── LEFT COLUMN: Patient Info & Camera / Upload (AUTOMATIC) ── */}
          <div className="space-y-5">

            {/* Patient Header Card */}
            <div className="rounded-2xl overflow-hidden shadow-sm border border-gray-100">
              <div
                className="px-5 py-3 flex items-center justify-between"
                style={{ background: 'linear-gradient(135deg,#1e1b4b,#312e81)' }}
              >
                <div className="flex items-center space-x-2">
                  <User size={15} className="text-indigo-300" />
                  <h3 className="text-sm font-bold text-white">Active Patient</h3>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/20 text-white">
                  Token #{patientInfo.token_number}
                </span>
              </div>
              <div className="bg-white p-4 sm:p-5 grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                <div>
                  <p className="text-xs text-gray-400 font-medium">Patient</p>
                  <p className="text-sm font-bold text-gray-800 mt-0.5">{patientInfo.patient_name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium">UHID</p>
                  <p className="text-sm font-mono font-bold text-indigo-600 mt-0.5">{patientInfo.uhid}</p>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <p className="text-xs text-gray-400 font-medium">Doctor</p>
                  <p className="text-sm font-medium text-gray-700 mt-0.5">{patientInfo.doctor_name || 'Unassigned'}</p>
                </div>
              </div>
            </div>

            {/* Camera & Upload Component with Auto-Extraction */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Camera size={16} className="text-indigo-600" />
                  <h3 className="font-bold text-gray-900">Vitals Slip Capture</h3>
                </div>
                <span className="text-[11px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-semibold">
                  Instant Auto-Fill Active
                </span>
              </div>

              <div className="p-4 sm:p-5 space-y-4">
                {/* When photo is taken or selected, handleCapture triggers auto-fill immediately */}
                <CameraCapture onCapture={handleCapture} />

                {loadingOcr && (
                  <div className="flex items-center justify-center space-x-2 py-3 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-700 text-xs font-semibold animate-pulse">
                    <Sparkles size={15} />
                    <span>Auto-extracting vitals into the form fields...</span>
                  </div>
                )}

                {/* Optional Raw OCR preview toggle */}
                {ocrText && (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setShowOcr(!showOcr)}
                      className="text-xs text-gray-500 hover:text-indigo-600 font-medium transition-colors"
                    >
                      {showOcr ? '▲ Hide raw slip text' : '▼ View raw slip text'}
                    </button>
                    {showOcr && (
                      <pre className="mt-2 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-xl p-3 whitespace-pre-wrap max-h-32 overflow-auto font-mono">
                        {ocrText}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN: Auto-Filled Vitals Form ── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Heart size={16} className="text-rose-500" />
                <h3 className="font-bold text-gray-900">Patient Vitals Form</h3>
              </div>
              {hasAnyVitals && (
                <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold">
                  Auto-Populated
                </span>
              )}
            </div>

            <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
              {/* Blood Pressure */}
              <div className="bg-rose-50/60 rounded-xl p-3.5 sm:p-4 border border-rose-100">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-rose-700 uppercase tracking-wider">
                    Blood Pressure (mmHg)
                  </p>
                  {vitals.bp_systolic && vitals.bp_diastolic && (
                    <span className="text-xs font-bold text-rose-800">
                      {vitals.bp_systolic}/{vitals.bp_diastolic} mmHg
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                  <VitalInput
                    label="Systolic"
                    icon={Heart}
                    unit="mmHg"
                    name="bp_systolic"
                    value={vitals.bp_systolic}
                    onChange={handleChange}
                  />
                  <VitalInput
                    label="Diastolic"
                    icon={Heart}
                    unit="mmHg"
                    name="bp_diastolic"
                    value={vitals.bp_diastolic}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {/* Grid of Other Vitals */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                <VitalInput
                  label="Pulse Rate"
                  icon={Activity}
                  unit="bpm"
                  name="pulse"
                  value={vitals.pulse}
                  onChange={handleChange}
                />
                <VitalInput
                  label="Temperature"
                  icon={Thermometer}
                  unit="°F"
                  name="temperature"
                  value={vitals.temperature}
                  onChange={handleChange}
                  step="0.1"
                />
                <VitalInput
                  label="Blood Oxygen (SpO2)"
                  icon={Wind}
                  unit="%"
                  name="spo2"
                  value={vitals.spo2}
                  onChange={handleChange}
                />
                <VitalInput
                  label="Body Weight"
                  icon={Scale}
                  unit="kg"
                  name="weight"
                  value={vitals.weight}
                  onChange={handleChange}
                  step="0.1"
                />
                <VitalInput
                  label="Height"
                  icon={Ruler}
                  unit="cm"
                  name="height"
                  value={vitals.height}
                  onChange={handleChange}
                  step="0.1"
                />
              </div>

              {/* Chief complaint textarea */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  <span className="flex items-center space-x-1">
                    <MessageSquare size={12} />
                    <span>Chief Complaints & Observations</span>
                  </span>
                </label>
                <textarea
                  name="chief_complaint"
                  value={vitals.chief_complaint}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Patient's symptoms or observations..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800
                    outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 focus:bg-white
                    transition-all resize-none placeholder:text-gray-400"
                />
              </div>

              {/* Save Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSaving || !hasAnyVitals}
                  className="w-full py-4 rounded-xl font-bold text-white text-sm shadow-lg
                    transition-all duration-200 active:scale-95 flex items-center justify-center space-x-2
                    disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: savedData
                      ? 'linear-gradient(135deg,#10b981,#059669)'
                      : hasAnyVitals
                      ? 'linear-gradient(135deg,#4f46e5,#7c3aed)'
                      : '#9ca3af'
                  }}
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      <span>Saving to Hospital Record...</span>
                    </>
                  ) : savedData ? (
                    <>
                      <CheckCircle2 size={18} />
                      <span>Saved!</span>
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      <span>Save Vitals to Database</span>
                    </>
                  )}
                </button>
              </div>

              {/* Saved confirmation summary */}
              {savedData && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-1.5 mt-3">
                  <div className="flex items-center space-x-2 text-emerald-800 font-bold text-sm">
                    <CheckCircle2 size={16} className="text-emerald-600" />
                    <span>Vitals Stored Successfully</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-emerald-700">
                    <div>BP: <strong>{savedData.bp_systolic}/{savedData.bp_diastolic} mmHg</strong></div>
                    <div>Pulse: <strong>{savedData.pulse} bpm</strong></div>
                    <div>Temp: <strong>{savedData.temperature}°F</strong></div>
                    <div>SpO2: <strong>{savedData.spo2}%</strong></div>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
          <p className="text-gray-500 font-medium">Please enter or select a token number to begin.</p>
        </div>
      )}
    </div>
  );
}

export default VitalsCapture;
