import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Ticket, Activity, History,
  Stethoscope, Bell, ChevronRight, Menu, X
} from 'lucide-react';
import QueueDashboard from './pages/QueueDashboard';
import TokenDesk from './pages/TokenDesk';
import VitalsCapture from './pages/VitalsCapture';
import PatientHistory from './pages/PatientHistory';

function App() {
  const [time, setTime] = useState(new Date());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const navItems = [
    { path: '/',        label: 'Queue Dashboard', shortLabel: 'Queue',   icon: LayoutDashboard, color: 'from-indigo-500 to-purple-600' },
    { path: '/token',   label: 'Token Desk',      shortLabel: 'Tokens',  icon: Ticket,          color: 'from-blue-500 to-cyan-500' },
    { path: '/vitals',  label: 'Vitals Capture',  shortLabel: 'Vitals',  icon: Activity,        color: 'from-emerald-500 to-teal-500' },
    { path: '/history', label: 'Patient History', shortLabel: 'History', icon: History,         color: 'from-orange-500 to-pink-500' },
  ];

  const currentNav = navItems.find(i => i.path === location.pathname) || navItems[0];

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#0f172a' }}>

      {/* ── DESKTOP SIDEBAR (Visible on md and up) ── */}
      <aside
        className="hidden md:flex w-64 flex-col flex-shrink-0 relative z-20"
        style={{ background: 'linear-gradient(180deg,#1e1b4b 0%,#0f172a 100%)' }}
      >
        {/* Decorative blobs */}
        <div
          className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10 pointer-events-none"
          style={{ background: 'radial-gradient(circle,#818cf8,transparent)', transform: 'translate(30%,-30%)' }}
        />
        <div
          className="absolute bottom-20 left-0 w-24 h-24 rounded-full opacity-10 pointer-events-none"
          style={{ background: 'radial-gradient(circle,#a78bfa,transparent)', transform: 'translate(-30%,0)' }}
        />

        {/* Logo */}
        <div className="px-6 pt-8 pb-6">
          <div className="flex items-center space-x-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
            >
              <Stethoscope size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg leading-none">SRM Medical</h1>
              <p className="text-indigo-300 text-xs mt-0.5">OPD Dashboard</p>
            </div>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-3 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-3 px-4 py-3.5 rounded-xl transition-all duration-200 group relative overflow-hidden ${
                  isActive
                    ? 'text-white shadow-lg'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
                style={
                  isActive
                    ? {
                        background: 'linear-gradient(135deg,rgba(99,102,241,0.3),rgba(139,92,246,0.2))',
                        border: '1px solid rgba(99,102,241,0.3)'
                      }
                    : {}
                }
              >
                {isActive && (
                  <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-r-full bg-gradient-to-b ${item.color}`} />
                )}
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                    isActive ? `bg-gradient-to-br ${item.color} shadow-md text-white` : 'bg-white/5 group-hover:bg-white/10'
                  }`}
                >
                  <Icon size={16} />
                </div>
                <span className="font-medium text-sm">{item.label}</span>
                {isActive && <ChevronRight size={14} className="ml-auto opacity-60" />}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Status */}
        <div className="px-4 py-6 border-t border-white/5">
          <div className="glass rounded-xl p-3 text-center">
            <div className="text-indigo-300 text-xs font-medium">Hospital Live System</div>
            <div className="flex items-center justify-center space-x-2 mt-1">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-white text-xs font-semibold">All Systems Online</span>
            </div>
          </div>
        </div>
      </aside>

      {/* ── MOBILE SLIDE-OVER DRAWER (Visible when hamburger clicked) ── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
          />

          {/* Drawer content */}
          <div
            className="relative w-72 max-w-[80vw] h-full flex flex-col shadow-2xl z-10"
            style={{ background: 'linear-gradient(180deg,#1e1b4b 0%,#0f172a 100%)' }}
          >
            {/* Drawer Header */}
            <div className="p-5 flex items-center justify-between border-b border-white/10">
              <div className="flex items-center space-x-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md"
                  style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
                >
                  <Stethoscope size={18} className="text-white" />
                </div>
                <div>
                  <h2 className="text-white font-bold text-base leading-none">SRM Medical</h2>
                  <p className="text-indigo-300 text-[11px] mt-0.5">OPD Dashboard</p>
                </div>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white/80 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            {/* Drawer Nav */}
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                      isActive
                        ? 'text-white bg-indigo-600/30 border border-indigo-500/40 shadow-md'
                        : 'text-slate-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isActive ? `bg-gradient-to-br ${item.color} text-white` : 'bg-white/10'
                      }`}
                    >
                      <Icon size={16} />
                    </div>
                    <span className="font-semibold text-sm">{item.label}</span>
                    {isActive && <ChevronRight size={14} className="ml-auto opacity-70" />}
                  </Link>
                );
              })}
            </nav>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-white/10 text-center">
              <p className="text-indigo-200 text-xs font-semibold">SRM Medical Centre</p>
              <p className="text-slate-400 text-[10px] mt-0.5">Real-time OPD Token System</p>
            </div>
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT AREA ── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">

        {/* Top Header (Responsive for Mobile and Desktop) */}
        <header className="bg-white border-b border-gray-100 px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex justify-between items-center flex-shrink-0 shadow-sm z-10">
          
          {/* Left: Mobile Hamburger + Current Title */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden w-9 h-9 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-200 active:scale-95 transition-all"
              aria-label="Open navigation menu"
            >
              <Menu size={18} />
            </button>

            <div className="flex items-center space-x-2">
              <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center bg-gradient-to-br ${currentNav.color} flex-shrink-0`}>
                <currentNav.icon size={15} className="text-white" />
              </div>
              <div>
                <h2 className="text-base sm:text-xl font-bold text-gray-900 leading-tight">
                  {currentNav.label}
                </h2>
                <p className="hidden sm:block text-xs text-gray-400">
                  {time.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            </div>
          </div>

          {/* Right: Notification + Live Time */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            <button className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors relative">
              <Bell size={15} className="text-gray-500" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            </button>
            <div className="text-right">
              <div className="text-sm sm:text-2xl font-bold text-gray-900 tabular-nums leading-tight">
                {time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
              <p className="sm:hidden text-[10px] text-gray-400 leading-none">
                {time.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
              </p>
            </div>
          </div>
        </header>

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-auto p-3.5 sm:p-6 lg:p-8 pb-24 md:pb-8">
          <Routes>
            <Route path="/"        element={<QueueDashboard />} />
            <Route path="/token"   element={<TokenDesk />} />
            <Route path="/vitals"  element={<VitalsCapture />} />
            <Route path="/history" element={<PatientHistory />} />
          </Routes>
        </main>

        {/* ── MOBILE BOTTOM NAVIGATION BAR (Visible on mobile only < md) ── */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 px-2 py-1.5 shadow-2xl flex justify-around items-center">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all duration-150 ${
                  isActive ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <div
                  className={`w-9 h-7 rounded-lg flex items-center justify-center transition-all ${
                    isActive
                      ? `bg-gradient-to-br ${item.color} text-white shadow-sm`
                      : 'text-gray-400'
                  }`}
                >
                  <Icon size={16} />
                </div>
                <span className={`text-[10px] mt-1 font-semibold leading-none ${isActive ? 'text-indigo-700' : 'text-gray-500'}`}>
                  {item.shortLabel}
                </span>
              </Link>
            );
          })}
        </div>

      </div>
    </div>
  );
}

export default App;
