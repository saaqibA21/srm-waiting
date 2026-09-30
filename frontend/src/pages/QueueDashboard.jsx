import React, { useState, useEffect, useCallback } from 'react';
import { getQueue, getApiStats, callNextToken, getDoctors, transferDoctorPatients, reassignToken, getDoctorWorkload, WS_BASE_URL } from '../api';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import {
  Users, Clock, CheckCircle2, Activity, TrendingUp,
  ChevronRight, Zap, RefreshCw, ArrowRightLeft, UserX,
  X, Stethoscope, AlertCircle, Check, Sparkles
} from 'lucide-react';

const StatCard = ({ label, value, icon: Icon, gradient, sub }) => (
  <div className="rounded-2xl p-3.5 sm:p-5 text-white relative overflow-hidden shadow-lg card-hover"
    style={{ background: gradient }}>
    <div className="absolute top-0 right-0 w-24 h-24 opacity-10 rounded-full"
      style={{ background: 'radial-gradient(circle,white,transparent)', transform: 'translate(30%,-30%)' }} />
    <div className="flex items-start justify-between">
      <div>
        <p className="text-white/70 text-[10px] sm:text-xs font-semibold uppercase tracking-wider">{label}</p>
        <p className="text-2xl sm:text-4xl font-black mt-1 tabular-nums">{value ?? '—'}</p>
        {sub && <p className="text-white/60 text-[10px] sm:text-xs mt-0.5 sm:mt-1 truncate max-w-[90px] sm:max-w-none">{sub}</p>}
      </div>
      <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
        <Icon size={16} className="sm:w-5 sm:h-5" />
      </div>
    </div>
  </div>
);

const StatusBadge = ({ status }) => {
  const cfg = {
    waiting: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500', label: 'Waiting' },
    called:  { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500 animate-pulse', label: 'Called' },
    done:    { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Done' },
  }[status] || { bg: 'bg-gray-50', text: 'text-gray-700', dot: 'bg-gray-400', label: status };
  return (
    <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      <span>{cfg.label}</span>
    </span>
  );
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-gray-900 text-white px-3 py-2 rounded-xl text-xs shadow-xl">
        <p className="font-semibold">{label}</p>
        <p className="text-indigo-300">{payload[0].value} tokens</p>
      </div>
    );
  }
  return null;
};

function QueueDashboard() {
  const [queue, setQueue] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [workloads, setWorkloads] = useState([]);
  const [stats, setStats] = useState({ total_today: 0, waiting: 0, called: 0, done: 0, avg_wait_minutes: 0 });
  const [wsConnected, setWsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Doctor Handover / Shift Patients Modal State
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [fromDoctorId, setFromDoctorId] = useState('');
  const [toDoctorId, setToDoctorId] = useState('');
  const [selectedTokenIds, setSelectedTokenIds] = useState([]);
  const [shiftLoading, setShiftLoading] = useState(false);
  const [shiftBanner, setShiftBanner] = useState('');

  // Row-level inline reassign state
  const [reassigningTokenId, setReassigningTokenId] = useState(null);

  const fetchQueue = useCallback(async () => {
    try {
      const [qRes, sRes, docRes, wlRes] = await Promise.all([
        getQueue(),
        getApiStats(),
        getDoctors(),
        getDoctorWorkload().catch(() => ({ data: [] }))
      ]);
      setQueue(qRes.data || []);
      setStats(sRes.data || {});
      setDoctors(docRes.data || []);
      setWorkloads(wlRes.data || []);
      setLastRefresh(new Date());
    } catch (e) {
      console.error('Queue fetch error', e);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
    let ws;
    const connect = () => {
      ws = new WebSocket(WS_BASE_URL);
      ws.onopen  = () => setWsConnected(true);
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.event === 'patients_transferred') {
            setShiftBanner(`🔄 Shift Update: ${data.count} patient(s) transferred from ${data.from_doctor} to ${data.to_doctor}`);
            setTimeout(() => setShiftBanner(''), 6000);
          }
        } catch {
          // ignore parse errors
        }
        fetchQueue();
      };
      ws.onclose = () => { setWsConnected(false); setTimeout(connect, 3000); };
      ws.onerror = () => ws.close();
    };
    connect();
    const interval = setInterval(fetchQueue, 30000);
    return () => { ws?.close(); clearInterval(interval); };
  }, [fetchQueue]);

  // When fromDoctorId changes in the Shift Modal, automatically select all their pending tokens
  useEffect(() => {
    if (fromDoctorId) {
      const pendingForDoc = queue.filter(
        t => t.doctor_id === parseInt(fromDoctorId, 10) && (t.status === 'waiting' || t.status === 'called')
      );
      setSelectedTokenIds(pendingForDoc.map(t => t.id));
    } else {
      setSelectedTokenIds([]);
    }
  }, [fromDoctorId, queue]);

  const handleNext = async () => {
    setLoading(true);
    try { await callNextToken(); await fetchQueue(); }
    catch (e) { console.error(e); }
    setLoading(false);
  };

  // Execute bulk/selective patient transfer
  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    if (!fromDoctorId || !toDoctorId) return;
    setShiftLoading(true);
    try {
      const res = await transferDoctorPatients({
        from_doctor_id: parseInt(fromDoctorId, 10),
        to_doctor_id: parseInt(toDoctorId, 10),
        token_ids: selectedTokenIds.length > 0 ? selectedTokenIds : null
      });
      setShowShiftModal(false);
      setShiftBanner(`✅ ${res.data.message}`);
      setFromDoctorId('');
      setToDoctorId('');
      setSelectedTokenIds([]);
      fetchQueue();
      setTimeout(() => setShiftBanner(''), 6000);
    } catch (err) {
      console.error(err);
      alert('Transfer failed: ' + (err.response?.data?.detail || err.message));
    }
    setShiftLoading(false);
  };

  // Row-level instant re-assignment
  const handleSingleReassign = async (tokenId, newDoctorId) => {
    if (!newDoctorId) return;
    try {
      await reassignToken(tokenId, parseInt(newDoctorId, 10));
      setReassigningTokenId(null);
      fetchQueue();
    } catch (err) {
      console.error(err);
      alert('Reassign failed');
    }
  };

  // Pending tokens for selected fromDoctor
  const doctorPendingTokens = fromDoctorId
    ? queue.filter(t => t.doctor_id === parseInt(fromDoctorId, 10) && (t.status === 'waiting' || t.status === 'called'))
    : [];

  const chartData = queue
    .reduce((acc, t) => {
      const h = new Date(t.issued_at).getHours();
      const label = `${String(h).padStart(2, '0')}:00`;
      const ex = acc.find(x => x.time === label);
      if (ex) ex.count++;
      else acc.push({ time: label, count: 1 });
      return acc;
    }, [])
    .sort((a, b) => parseInt(a.time) - parseInt(b.time));

  const calledToken = queue.find(q => q.status === 'called');
  const displayToken = calledToken || queue.find(q => q.status === 'waiting');

  return (
    <div className="space-y-6 slide-in">

      {/* Real-time Transfer Banner */}
      {shiftBanner && (
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-5 py-3.5 rounded-2xl shadow-md flex items-center justify-between animate-fadeIn">
          <div className="flex items-center space-x-2.5 text-sm font-semibold">
            <Sparkles size={18} />
            <span>{shiftBanner}</span>
          </div>
          <button onClick={() => setShiftBanner('')} className="text-white/80 hover:text-white">
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── TOP ACTION BAR: Call Next + Doctor Shift Action ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-2.5">
          <div className={`w-2.5 h-2.5 rounded-full ${wsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
          <span className="text-xs font-semibold text-gray-600">
            {wsConnected ? 'Live Queue WebSocket Connected' : 'Reconnecting...'}
          </span>
          <span className="text-xs text-gray-400">| Last refreshed: {lastRefresh.toLocaleTimeString()}</span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
          {/* Doctor Shift Patients Button */}
          <button
            onClick={() => setShowShiftModal(true)}
            type="button"
            className="flex-1 sm:flex-initial px-3 sm:px-4 py-2.5 rounded-xl font-bold text-xs text-indigo-700 bg-indigo-50 hover:bg-indigo-100
              border border-indigo-200 transition-all active:scale-95 flex items-center justify-center space-x-1.5 shadow-sm"
          >
            <ArrowRightLeft size={14} />
            <span className="truncate">Shift Patients</span>
          </button>

          {/* Call Next Button */}
          <button
            onClick={handleNext}
            disabled={loading}
            className="flex-1 sm:flex-initial px-4 sm:px-5 py-2.5 rounded-xl font-bold text-xs text-white shadow-sm transition-all active:scale-95
              flex items-center justify-center space-x-1.5 disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
          >
            {loading ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              <Zap size={14} />
            )}
            <span>Call Next</span>
          </button>
        </div>
      </div>

      {/* ── HERO: Token Display + Stats ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 sm:gap-5">

        {/* Big Now Serving Token */}
        <div
          className="lg:col-span-1 rounded-2xl overflow-hidden shadow-xl relative"
          style={{ background: 'linear-gradient(135deg,#1e1b4b 0%,#312e81 50%,#4c1d95 100%)' }}
        >
          <div
            className="absolute inset-0 opacity-20"
            style={{ backgroundImage: 'radial-gradient(circle at 70% 20%,#818cf8,transparent 60%)' }}
          />
          <div className="relative p-6 sm:p-8 text-center">
            <p className="text-indigo-300 text-[11px] sm:text-xs font-semibold uppercase tracking-widest mb-1 sm:mb-2">Now Serving</p>
            <div className="text-7xl sm:text-8xl md:text-9xl font-black text-white token-glow tabular-nums leading-none">
              {displayToken ? displayToken.token_number : '--'}
            </div>
            {displayToken && (
              <div className="mt-3 sm:mt-4 space-y-1">
                <p className="text-white font-semibold text-base sm:text-lg">{displayToken.patient_name}</p>
                <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white/10 text-indigo-200 text-xs mt-1">
                  <Stethoscope size={12} />
                  <span>{displayToken.doctor_name || 'Unassigned'}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-2.5 sm:gap-4">
          <StatCard
            label="Total Today"
            value={stats.total_today ?? stats.total}
            icon={Users}
            gradient="linear-gradient(135deg,#6366f1,#8b5cf6)"
            sub="all OPD visits"
          />
          <StatCard
            label="Waiting"
            value={stats.waiting}
            icon={Clock}
            gradient="linear-gradient(135deg,#3b82f6,#06b6d4)"
            sub="in live queue"
          />
          <StatCard
            label="Done"
            value={stats.done}
            icon={CheckCircle2}
            gradient="linear-gradient(135deg,#10b981,#059669)"
            sub="completed visits"
          />
          <StatCard
            label="Avg Wait"
            value={stats.avg_wait_minutes ? `${Math.round(stats.avg_wait_minutes)}m` : '0m'}
            icon={TrendingUp}
            gradient="linear-gradient(135deg,#f59e0b,#ef4444)"
            sub="minutes per patient"
          />
        </div>
      </div>

      {/* ── QUEUE TABLE with Reassignment Capability ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity size={18} className="text-indigo-500" />
            <h3 className="font-bold text-gray-900">Today's Queue</h3>
            <span className="ml-2 px-2.5 py-0.5 text-xs font-semibold bg-indigo-50 text-indigo-600 rounded-full">
              {queue.length} Total Patients
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowShiftModal(true)}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center space-x-1"
            >
              <ArrowRightLeft size={13} />
              <span>Shift Doctor's Queue</span>
            </button>
            <button
              onClick={fetchQueue}
              className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors"
              title="Refresh queue"
            >
              <RefreshCw size={13} className="text-gray-500" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wider">
                <th className="py-3 px-6 text-left">Token</th>
                <th className="py-3 px-6 text-left">UHID</th>
                <th className="py-3 px-6 text-left">Patient Name</th>
                <th className="py-3 px-6 text-left">Assigned Doctor</th>
                <th className="py-3 px-6 text-left">Status</th>
                <th className="py-3 px-6 text-left">Issued At</th>
                <th className="py-3 px-6 text-right">Quick Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {queue.map((t) => (
                <tr
                  key={t.id}
                  className={`hover:bg-indigo-50/20 transition-colors ${
                    t.status === 'called' ? 'bg-amber-50/40' : ''
                  }`}
                >
                  <td className="py-4 px-6">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600
                      flex items-center justify-center text-white font-bold text-sm shadow-sm">
                      {t.token_number}
                    </div>
                  </td>
                  <td className="py-4 px-6 font-mono text-xs text-gray-500 font-medium">{t.uhid}</td>
                  <td className="py-4 px-6 font-semibold text-gray-800">{t.patient_name}</td>
                  
                  {/* Doctor column with single-patient quick re-assignment */}
                  <td className="py-4 px-6">
                    {reassigningTokenId === t.id ? (
                      <div className="flex items-center space-x-1.5">
                        <select
                          className="text-xs bg-gray-50 border border-indigo-300 rounded-lg p-1.5 outline-none font-medium"
                          defaultValue={t.doctor_id}
                          onChange={(e) => handleSingleReassign(t.id, e.target.value)}
                        >
                          <option value="">Select Doctor...</option>
                          {doctors.map(d => (
                            <option key={d.id} value={d.id}>{d.name} ({d.department})</option>
                          ))}
                        </select>
                        <button
                          onClick={() => setReassigningTokenId(null)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-700 font-medium">{t.doctor_name || 'Unassigned'}</span>
                        {t.status !== 'done' && (
                          <button
                            onClick={() => setReassigningTokenId(t.id)}
                            className="text-gray-400 hover:text-indigo-600 p-1 rounded transition-colors"
                            title="Shift this patient to another doctor"
                          >
                            <ArrowRightLeft size={13} />
                          </button>
                        )}
                      </div>
                    )}
                  </td>

                  <td className="py-4 px-6"><StatusBadge status={t.status} /></td>
                  <td className="py-4 px-6 text-gray-500 text-xs">
                    {new Date(t.issued_at).toLocaleTimeString()}
                  </td>
                  <td className="py-4 px-6 text-right">
                    {t.status !== 'done' && (
                      <button
                        onClick={() => {
                          setFromDoctorId(String(t.doctor_id));
                          setSelectedTokenIds([t.id]);
                          setShowShiftModal(true);
                        }}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-colors"
                      >
                        Shift Doctor
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {queue.length === 0 && (
                <tr>
                  <td colSpan="7" className="py-16 text-center">
                    <div className="flex flex-col items-center space-y-2 text-gray-400">
                      <Users size={32} className="opacity-30" />
                      <p className="text-sm font-medium">No tokens in queue today</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── CHART ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center space-x-2 mb-6">
          <TrendingUp size={18} className="text-indigo-500" />
          <h3 className="font-bold text-gray-900">Hourly Patient Inflow</h3>
        </div>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99,102,241,0.05)', radius: 8 }} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="url(#barGradient)" />
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#a78bfa" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── MODAL: DOCTOR LEAVING MIDWAY / SHIFT PATIENTS ── */}
      {showShiftModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden border border-gray-100 animate-scaleUp">
            
            {/* Modal Header */}
            <div
              className="p-4 sm:p-6 text-white relative flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#1e1b4b,#312e81)' }}
            >
              <button
                onClick={() => setShowShiftModal(false)}
                className="absolute top-4 right-4 sm:top-5 sm:right-5 text-white/70 hover:text-white w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"
              >
                <X size={16} />
              </button>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <UserX size={20} className="text-amber-300" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold">Doctor Leaving Midway</h3>
                  <p className="text-indigo-200 text-xs mt-0.5">Shift pending patients to another doctor</p>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleTransferSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1">
              
              {/* Step 1: Departing Doctor */}
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                  1. Doctor Leaving / Unavailable
                </label>
                <select
                  required
                  value={fromDoctorId}
                  onChange={(e) => setFromDoctorId(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-medium text-gray-800 outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  <option value="">Select Doctor who is leaving...</option>
                  {doctors.map(d => {
                    const wl = workloads.find(w => w.id === d.id);
                    const pending = wl ? (wl.waiting_count + wl.called_count) : queue.filter(t => t.doctor_id === d.id && t.status !== 'done').length;
                    return (
                      <option key={d.id} value={d.id}>
                        {d.name} — {d.department} ({pending} pending patients)
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Show list of pending patients for this doctor */}
              {fromDoctorId && (
                <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-900">
                      Pending Patients to Shift ({doctorPendingTokens.length}):
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedTokenIds.length === doctorPendingTokens.length) {
                          setSelectedTokenIds([]);
                        } else {
                          setSelectedTokenIds(doctorPendingTokens.map(t => t.id));
                        }
                      }}
                      className="text-[11px] font-bold text-indigo-600 hover:underline"
                    >
                      {selectedTokenIds.length === doctorPendingTokens.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>

                  {doctorPendingTokens.length > 0 ? (
                    <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                      {doctorPendingTokens.map(t => {
                        const isSelected = selectedTokenIds.includes(t.id);
                        return (
                          <label
                            key={t.id}
                            className={`flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-white border-indigo-300 text-indigo-900 shadow-sm'
                                : 'bg-amber-100/50 border-transparent text-gray-600'
                            }`}
                          >
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedTokenIds([...selectedTokenIds, t.id]);
                                  } else {
                                    setSelectedTokenIds(selectedTokenIds.filter(id => id !== t.id));
                                  }
                                }}
                                className="rounded text-indigo-600 focus:ring-indigo-400"
                              />
                              <span className="font-bold">Token #{t.token_number}</span>
                              <span>&bull;</span>
                              <span>{t.patient_name}</span>
                            </div>
                            <span className="capitalize px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100">
                              {t.status}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-amber-700 italic">This doctor has 0 pending patients right now.</p>
                  )}
                </div>
              )}

              {/* Step 2: Receiving Doctor */}
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                  2. Transfer Patients To (New Doctor)
                </label>
                <select
                  required
                  value={toDoctorId}
                  onChange={(e) => setToDoctorId(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-medium text-gray-800 outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  <option value="">Select receiving doctor...</option>
                  {doctors
                    .filter(d => String(d.id) !== String(fromDoctorId))
                    .map(d => {
                      const wl = workloads.find(w => w.id === d.id);
                      const pending = wl ? (wl.waiting_count + wl.called_count) : queue.filter(t => t.doctor_id === d.id && t.status !== 'done').length;
                      return (
                        <option key={d.id} value={d.id}>
                          {d.name} — {d.department} ({pending} current load)
                        </option>
                      );
                    })}
                </select>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={shiftLoading || !fromDoctorId || !toDoctorId || selectedTokenIds.length === 0}
                  className="w-full py-4 rounded-xl font-bold text-white text-sm shadow-lg
                    transition-all active:scale-95 flex items-center justify-center space-x-2
                    disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)' }}
                >
                  {shiftLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      <span>Shifting Patients in Real-Time...</span>
                    </>
                  ) : (
                    <>
                      <ArrowRightLeft size={16} />
                      <span>
                        Shift {selectedTokenIds.length} Patient{selectedTokenIds.length !== 1 ? 's' : ''} Immediately
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default QueueDashboard;
