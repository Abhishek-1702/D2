import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Search, LogOut, Menu, X } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { readRequests, addRequest, updateRequestStatus } from "../utils/accessRequests";
import { readSharedJsonFile, writeSharedJsonFile } from "../utils/documentPersistence";

export default function UppclHeader({ activeTab, setActiveTab, language = 'en', setLanguage }) {
  const { user, signIn, signOut, authError, clearAuthError } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [requests, setRequests] = useState([]);
  const [requestForm, setRequestForm] = useState({ name: "", mobile: "", email: "", designation: "", office: "" });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [dateTime, setDateTime] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', designation: '' });
  const [profile, setProfile] = useState({ name: '', designation: '' });
  const [profileSaving, setProfileSaving] = useState(false);
  const isHindi = language === 'hi';

  const openModal = useCallback(() => {
    clearAuthError();
    setEmail('');
    setPassword('');
    setModalOpen(true);
  }, [clearAuthError]);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    clearAuthError();
  }, [clearAuthError]);

  useEffect(() => {
    const timer = setInterval(() => setDateTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const query = searchQuery.trim().toLowerCase();
    const root = typeof document !== 'undefined' ? document.querySelector('main') || document.body : null;
    const text = root?.innerText || '';
    const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
    const matches = lines.filter((line) => line.toLowerCase().includes(query));
    setSearchResults(matches.length ? matches.slice(0, 6) : [`No match found for "${searchQuery}."`]);
  }, [searchQuery]);

  const formattedTime = dateTime.toLocaleString(isHindi ? 'hi-IN' : 'en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const isDashboard = activeTab === 'dashboard';
  const toggleLanguage = () => setLanguage(isHindi ? 'en' : 'hi');
  const skipToContent = () => document.getElementById('main-content')?.scrollIntoView({ behavior: 'smooth' });
  const openLink = (href) => window.open(href, '_blank', 'noreferrer');

  const OWNER_EMAIL = process.env.REACT_APP_OWNER_EMAIL || null;
  const PROFILE_STORAGE_KEY = 'kesco_user_profile_v1';
  const showRequestAccess = !user;
  const PROFILE_SHARED_PATH = 'app-data/user-profiles.json';

  const readStoredProfile = useCallback((uid) => {
    if (typeof window === 'undefined' || !uid) return null;
    try {
      const raw = window.localStorage.getItem(`${PROFILE_STORAGE_KEY}:${uid}`);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.error('Failed to read stored profile', error);
      return null;
    }
  }, []);

  const writeStoredProfile = useCallback((uid, value) => {
    if (typeof window === 'undefined' || !uid) return;
    try {
      window.localStorage.setItem(`${PROFILE_STORAGE_KEY}:${uid}`, JSON.stringify(value));
    } catch (error) {
      console.error('Failed to write stored profile', error);
    }
  }, []);

  useEffect(() => {
    if (!user?.uid) {
      setProfile({ name: '', designation: '' });
      setProfileForm({ name: '', designation: '' });
      return;
    }

    let mounted = true;
    const loadProfile = async () => {
      const stored = readStoredProfile(user.uid);
      const shared = await readSharedJsonFile(PROFILE_SHARED_PATH);
      const sharedProfile = shared?.[user.uid] || null;
      const resolved = sharedProfile || stored || {};

      if (!mounted) return;
      setProfile({
        name: resolved.name || user.displayName || '',
        designation: resolved.designation || '',
      });
      setProfileForm({
        name: resolved.name || user.displayName || '',
        designation: resolved.designation || '',
      });
    };

    loadProfile();
    return () => { mounted = false; };
  }, [readStoredProfile, user]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const items = await readRequests();
        if (mounted) setRequests(items);
      } catch (e) {
        // ignore
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  const openRequestModal = () => {
    setRequestForm({ name: '', mobile: '', email: '', designation: '', office: '' });
    setRequestModalOpen(true);
  };

  const submitRequest = async (e) => {
    e.preventDefault();
    const entry = {
      id: Date.now(),
      name: requestForm.name.trim(),
      mobile: requestForm.mobile.trim(),
      email: requestForm.email.trim().toLowerCase(),
      designation: requestForm.designation.trim(),
      office: requestForm.office.trim(),
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    await addRequest(entry);
    const items = await readRequests();
    setRequests(items);
    setRequestModalOpen(false);
    // show confirmation
    // eslint-disable-next-line no-alert
    alert('Access request submitted — pending approval.');
  };

  const grantRequest = async (emailToGrant) => {
    await updateRequestStatus(emailToGrant, 'approved');
    const items = await readRequests();
    setRequests(items);
    // eslint-disable-next-line no-alert
    alert(`${emailToGrant} has been granted access.`);
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    if (!user?.uid) return;
    setProfileSaving(true);
    try {
      const nextProfile = {
        name: profileForm.name.trim(),
        designation: profileForm.designation.trim(),
        email: user.email || '',
      };
      writeStoredProfile(user.uid, nextProfile);
      const existingShared = await readSharedJsonFile(PROFILE_SHARED_PATH);
      const nextShared = {
        ...(existingShared || {}),
        [user.uid]: nextProfile,
      };
      await writeSharedJsonFile(PROFILE_SHARED_PATH, nextShared);
      setProfile(nextProfile);
      setProfileModalOpen(false);
    } finally {
      setProfileSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearAuthError();
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      setModalOpen(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!modalOpen) return;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalOpen, closeModal]);

  return (
    <>
      <header className="w-full font-sans shadow-md flex flex-col">
        {/* 1. Top Blue Bar */}
        <div className="bg-[#1f498c] text-white text-[11px] font-bold px-4 py-1.5 flex flex-col lg:flex-row justify-between items-center gap-3 flex-wrap">
          <div className="hidden md:flex flex-wrap items-center gap-2 divide-x divide-white/30">
            <button type="button" onClick={skipToContent} className="px-2 text-[10px] lg:text-xs hover:underline">
              {isHindi ? 'मुख्य' : 'SKIP'}
            </button>
            <button type="button" onClick={() => openLink('https://kesco.org.in/Sitemap')} className="px-2 text-[10px] lg:text-xs hover:underline">
              {isHindi ? 'साइटमैप' : 'SITE MAP'}
            </button>
            <button type="button" onClick={() => openLink('https://opp.uppclonline.com/uppcl/')} className="px-2 text-[10px] lg:text-xs text-orange-300 hover:underline">
              {isHindi ? 'कर्मी' : 'PORTAL'}
            </button>
            <button type="button" onClick={toggleLanguage} className="px-2 text-[10px] lg:text-xs hover:underline">
              {isHindi ? 'English' : 'हिंदी'}
            </button>
            <span className="px-2 text-[10px] lg:text-xs">♿</span>
            <div className="flex items-center gap-2 px-2">
              <button type="button" onClick={() => openLink('https://upptcl.org/upptcl')} className="text-[10px] lg:text-xs hover:underline">
                VBTS
              </button>
              {showRequestAccess ? (
                <button
                  type="button"
                  onClick={openRequestModal}
                  className="rounded-full border border-white/40 bg-white/10 px-2 py-1 text-[10px] font-semibold text-white transition hover:bg-white/20"
                >
                  Request access
                </button>
              ) : null}
              <span className="rounded-full bg-white/15 px-2 lg:px-3 py-1 text-[10px] lg:text-[11px] font-semibold whitespace-nowrap">
                {formattedTime}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-1 lg:flex-none min-w-0">
            <div className="relative flex-1 lg:flex-none">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isHindi ? 'खोजें' : 'Search'}
                className="pl-2 pr-8 py-0.5 text-black text-xs h-8 w-full lg:w-48 rounded"
              />
              <Search className="absolute right-1 top-1.5 text-gray-500" size={14} />
              {searchQuery.trim() && (
                <div className="absolute left-0 top-full mt-1 w-full lg:w-80 max-h-52 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg text-xs text-gray-700 z-30">
                  <div className="px-3 py-2 border-b border-gray-100 bg-gray-50 font-semibold">
                    {isHindi ? 'खोज' : 'Results'}
                  </div>
                  <ul className="space-y-1 p-3">
                    {searchResults.map((result, index) => (
                      <li key={`${result}-${index}`} className="rounded-lg px-2 py-1 hover:bg-gray-100">
                        {result}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            {user ? (
              <button
                type="button"
                onClick={async () => { clearAuthError(); await signOut(); }}
                className="hidden lg:flex items-center gap-1 rounded-full bg-red-500/90 px-3 py-1.5 text-[10px] font-semibold text-white shadow-sm transition hover:bg-red-600"
              >
                <LogOut size={14} />
                <span>Sign out</span>
              </button>
            ) : (
              <div className="hidden lg:block rounded-full bg-[#ffeb3b] px-3 py-1 text-[11px] font-semibold text-black">
                8th June - 18th July 2026
              </div>
            )}
          </div>
        </div>

        {/* 2. White Header Area */}
        <div className="bg-white px-3 sm:px-6 py-3 flex justify-between items-center shadow-sm relative z-20">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <img src="/kesco-logo.png" alt="KESCO Logo" className="w-10 sm:w-16 h-10 sm:h-16 object-contain" />
            <div className="hidden sm:flex flex-col">
              <span className="text-sm sm:text-xl font-bold text-[#1f498c] tracking-wide leading-tight">
                Kanpur Electricity
              </span>
              <span className="text-xs sm:text-[16px] font-bold text-orange-500 leading-tight">
                Supply Company Ltd.
              </span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2 lg:gap-4 text-xs lg:text-sm font-semibold text-[#1f498c]">
            <button
              onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); }}
              className={`hover:text-orange-500 transition-colors ${activeTab === 'dashboard' ? 'text-orange-500 border-b-2 border-orange-500' : ''}`}
            >
              {isHindi ? 'डैशबोर्ड' : 'Dashboard'}
            </button>
            <span className="text-gray-300">|</span>
            <button
              onClick={() => { setActiveTab('projects'); setMobileMenuOpen(false); }}
              className={`hover:text-orange-500 transition-colors ${activeTab === 'projects' ? 'text-orange-500 border-b-2 border-orange-500' : ''}`}
            >
              {isHindi ? 'परियोजनाएँ' : 'Projects'}
            </button>
            <span className="text-gray-300">|</span>
            <button
              onClick={() => { setActiveTab('meetings'); setMobileMenuOpen(false); }}
              className={`hover:text-orange-500 transition-colors ${activeTab === 'meetings' ? 'text-orange-500 border-b-2 border-orange-500' : ''}`}
            >
              {isHindi ? 'मीटिंग्स' : 'Meetings'}
            </button>
            <span className="text-gray-300">|</span>
            <button
              onClick={() => { setActiveTab('dailyupdates'); setMobileMenuOpen(false); }}
              className={`hover:text-orange-500 transition-colors ${activeTab === 'dailyupdates' ? 'text-orange-500 border-b-2 border-orange-500' : ''}`}
            >
              {isHindi ? 'दैनिक अपडेट' : 'Daily Updates'}
            </button>
            <span className="text-gray-300">|</span>
            <button
              onClick={() => { setActiveTab('fetch'); setMobileMenuOpen(false); }}
              className={`hover:text-orange-500 transition-colors ${activeTab === 'fetch' ? 'text-orange-500 border-b-2 border-orange-500' : ''}`}
            >
              {isHindi ? 'दस्तावेज़' : 'Fetch'}
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-[#1f498c] hover:text-orange-500 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          <div className="ml-2 sm:ml-4 flex items-center gap-2 sm:gap-3">
            {user ? (
              <>
                <div className="hidden sm:flex flex-col items-end text-right">
                  <span className="text-xs font-semibold text-green-800">
                    {profile.name || user.email}
                  </span>
                  {profile.designation ? (
                    <span className="text-[10px] text-green-700">{profile.designation}</span>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => setProfileModalOpen(true)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-gray-100 text-[#1f498c] shadow-sm transition hover:bg-gray-200"
                  aria-label="Profile"
                  title="Profile"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="8" r="3.5" />
                    <path d="M5 19c1.2-3.2 3.8-4.8 7-4.8s5.8 1.6 7 4.8" />
                  </svg>
                </button>
                {/* show pending badge if user has pending request */}
                {requests.find(r => r.email === user.email && r.status === 'pending') ? (
                  <span className="text-xs ml-2 px-2 py-1 rounded bg-yellow-100 text-yellow-800">Access request pending</span>
                ) : null}
              </>
            ) : (
              <button
                onClick={openModal}
                className="bg-[#1f498c] hover:bg-blue-800 text-white px-2 sm:px-4 py-1.5 rounded text-xs sm:text-sm whitespace-nowrap"
              >
                LOGIN
              </button>
            )}
            {/* Owner admin: show access requests panel */}
            {user && OWNER_EMAIL && user.email === OWNER_EMAIL ? (
              <button
                onClick={() => { setAdminModalOpen(true); setActiveTab('access-requests'); }}
                className="bg-white border border-gray-200 text-[#1f498c] px-2 py-1 rounded text-xs hidden sm:inline"
              >
                Access requests
              </button>
            ) : null}
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-200 px-4 py-3 space-y-2">
            <button
              onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); }}
              className={`block w-full text-left px-4 py-2 text-sm font-semibold rounded transition-colors ${activeTab === 'dashboard' ? 'bg-orange-100 text-orange-600' : 'text-[#1f498c] hover:bg-gray-100'}`}
            >
              {isHindi ? 'डैशबोर्ड' : 'Dashboard'}
            </button>
            <button
              onClick={() => { setActiveTab('projects'); setMobileMenuOpen(false); }}
              className={`block w-full text-left px-4 py-2 text-sm font-semibold rounded transition-colors ${activeTab === 'projects' ? 'bg-orange-100 text-orange-600' : 'text-[#1f498c] hover:bg-gray-100'}`}
            >
              {isHindi ? 'परियोजनाएँ' : 'Projects'}
            </button>
            <button
              onClick={() => { setActiveTab('meetings'); setMobileMenuOpen(false); }}
              className={`block w-full text-left px-4 py-2 text-sm font-semibold rounded transition-colors ${activeTab === 'meetings' ? 'bg-orange-100 text-orange-600' : 'text-[#1f498c] hover:bg-gray-100'}`}
            >
              {isHindi ? 'मीटिंग्स' : 'Meetings'}
            </button>
            <button
              onClick={() => { setActiveTab('dailyupdates'); setMobileMenuOpen(false); }}
              className={`block w-full text-left px-4 py-2 text-sm font-semibold rounded transition-colors ${activeTab === 'dailyupdates' ? 'bg-orange-100 text-orange-600' : 'text-[#1f498c] hover:bg-gray-100'}`}
            >
              {isHindi ? 'दैनिक अपडेट' : 'Daily Updates'}
            </button>
            <button
              onClick={() => { setActiveTab('fetch'); setMobileMenuOpen(false); }}
              className={`block w-full text-left px-4 py-2 text-sm font-semibold rounded transition-colors ${activeTab === 'fetch' ? 'bg-orange-100 text-orange-600' : 'text-[#1f498c] hover:bg-gray-100'}`}
            >
              {isHindi ? 'दस्तावेज़' : 'Fetch Document'}
            </button>
          </div>
        )}
      </header>

      {isDashboard && (
        <>
          {/* 3. Red Hero Banner */}
          <div className="bg-[#de1b38] w-full min-h-[200px] sm:min-h-[220px] flex items-center justify-center relative overflow-hidden">
            <div className="flex flex-col lg:flex-row w-full max-w-6xl mx-auto px-4 gap-3 lg:gap-4 items-center">
              <div className="flex-1 text-white pr-0 lg:pr-4 text-center lg:text-left">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold mb-2 leading-tight">
                  बिजली बिल <br className="hidden sm:block" />
                  जमा करने के लिए किसी<br className="hidden sm:block" />
                  को रुपए क्यों दें?
                </h1>
                <div className="bg-white text-black inline-flex items-center px-3 sm:px-4 py-2 mt-3 rounded-full font-bold text-xs sm:text-sm">
                  KESCO की वेबसाइट है ना <Search size={14} className="ml-2 text-gray-400" />
                </div>
              </div>

              <div className="border-2 shrink-0 items-end justify-center pt-4 opacity-90 hover:opacity-100 transition-opacity hidden sm:flex">
                <img
                  src="/pm_portait.png"
                  alt="Portrait of prime minister"
                  className="h-40 sm:h-56 object-contain drop-shadow-md"
                />
              </div>

              <div className="flex-1 flex flex-col gap-2 lg:gap-3 items-center lg:items-end justify-center pl-0 lg:pl-4 w-full">
                <div className="border-2 border-white rounded-[30px] px-4 lg:px-6 py-2 lg:py-3 text-center text-white bg-white/10 backdrop-blur-sm w-full max-w-sm">
                  <p className="font-bold text-xs sm:text-sm lg:text-lg leading-tight">बिजली बिल भुगतान करना है? तो लाइन में लगने या किसी बिचौलिये को रुपए देने की जरुरत नहीं।</p>
                </div>
                <div className="border-2 border-white rounded-[30px] px-4 lg:px-6 py-2 lg:py-3 text-center text-white bg-white/10 backdrop-blur-sm w-full max-w-sm">
                  <p className="font-bold text-xs sm:text-sm lg:text-lg leading-tight">KESCO की आधिकारिक वेबसाइट KESCO.ORG पर जाएं और घर बैठे ऑनलाइन बिल जमा करें सुरक्षित और आसान!</p>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Yellow Ticker */}
          <div className="bg-[#ffeb3b] border-y border-gray-300 py-1.5 overflow-hidden flex whitespace-nowrap">
            <div className="animate-[marquee_20s_linear_infinite] text-sm font-semibold text-gray-800">
              To avail the benefits of KESCO PM Surya Ghar Free Electricity Scheme, download the app now!   •   Welcome to KESCO Summer Internship 2026 Portal! Stay updated on project progress and daily tasks.   •   Never share your OTP or password with anyone. KESCO never asks for it.
            </div>
          </div>

          {/* 5. Orange Action Bars */}
          <div className="bg-gradient-to-b from-[#e3ebf3] to-white py-3 sm:py-4 flex flex-col sm:flex-row justify-center gap-2 sm:gap-4 border-b border-gray-200 px-3 sm:px-6">
            <a
              href="https://play.google.com/store/apps/details?id=com.test.kescosmartmeter&hl=en_IN&pli=1"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center bg-[#ff6f3b] hover:bg-[#e65a25] text-white font-bold px-3 sm:px-6 py-2 rounded shadow-md text-xs sm:text-sm transition-colors text-center"
            >
              Download KESCO App
            </a>
            <a
              href="https://consumer.uppcl.org/wss/pay_bill_home"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center bg-[#ff6f3b] hover:bg-[#e65a25] text-white font-bold px-3 sm:px-6 py-2 rounded shadow-md text-xs sm:text-sm transition-colors text-center"
            >
              Smart Meter Info
            </a>
            <a
              href="https://consumer.uppcl.org/wss/bill-payment-services"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center bg-[#ff6f3b] hover:bg-[#e65a25] text-white font-bold px-3 sm:px-6 py-2 rounded shadow-md text-xs sm:text-sm transition-colors text-center"
            >
              Pay Bill Online
            </a>
          </div>
        </>
      )}

      {modalOpen && createPortal(
        <div onClick={closeModal} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8">
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-lg bg-white p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-[#1f498c]">{isHindi ? 'साइन इन करें' : 'Sign in'}</h2>
                <p className="text-sm text-gray-500">{isHindi ? 'अधिकृत ईमेल और पासवर्ड दर्ज करें।' : 'Enter authorised email and password.'}</p>
              </div>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">{isHindi ? 'ईमेल' : 'Email'}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:border-[#1f498c]"
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">{isHindi ? 'पासवर्ड' : 'Password'}</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:border-[#1f498c]"
                  placeholder={isHindi ? 'पासवर्ड' : 'Password'}
                  required
                  minLength={6}
                />
              </div>
              {authError && (
                <div className="text-xs text-red-500 bg-red-50 rounded px-3 py-2">
                  {authError}
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#1f498c] hover:bg-blue-800 text-white px-4 py-2.5 rounded text-sm font-bold disabled:opacity-60"
              >
                {loading ? (isHindi ? 'साइन इन हो रहा है…' : 'Signing in…') : (isHindi ? 'जारी रखें' : 'Continue')}
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}
      {profileModalOpen && createPortal(
        <div onClick={() => setProfileModalOpen(false)} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8">
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-lg bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-[#1f498c]">Profile</h2>
                <p className="text-sm text-gray-500">Add your name and designation for the header display.</p>
              </div>
              <button onClick={() => setProfileModalOpen(false)} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
            </div>
            <form onSubmit={saveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">Name</label>
                <input
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  className="w-full rounded border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:border-[#1f498c]"
                  placeholder="Enter your full name"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">Designation</label>
                <input
                  value={profileForm.designation}
                  onChange={(e) => setProfileForm({ ...profileForm, designation: e.target.value })}
                  className="w-full rounded border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:border-[#1f498c]"
                  placeholder="e.g. Assistant Engineer"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setProfileModalOpen(false)} className="px-3 py-2 rounded border">Cancel</button>
                <button type="submit" disabled={profileSaving} className="px-4 py-2 rounded bg-[#1f498c] text-white disabled:opacity-60">
                  {profileSaving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>, document.body
      )}

      {requestModalOpen && createPortal(
        <div onClick={() => setRequestModalOpen(false)} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8">
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-lg bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-[#1f498c]">Request Access</h2>
              <button onClick={() => setRequestModalOpen(false)} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
            </div>
            <form onSubmit={submitRequest} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500">Name</label>
                  <input required value={requestForm.name} onChange={(e)=>setRequestForm({...requestForm,name:e.target.value})} className="w-full rounded border px-3 py-2" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500">Mobile</label>
                  <input required value={requestForm.mobile} onChange={(e)=>setRequestForm({...requestForm,mobile:e.target.value})} className="w-full rounded border px-3 py-2" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500">Email</label>
                  <input required type="email" value={requestForm.email} onChange={(e)=>setRequestForm({...requestForm,email:e.target.value})} className="w-full rounded border px-3 py-2" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500">Designation</label>
                  <input value={requestForm.designation} onChange={(e)=>setRequestForm({...requestForm,designation:e.target.value})} className="w-full rounded border px-3 py-2" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-500">Office</label>
                  <input value={requestForm.office} onChange={(e)=>setRequestForm({...requestForm,office:e.target.value})} className="w-full rounded border px-3 py-2" />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={()=>setRequestModalOpen(false)} className="px-3 py-2 rounded border">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded bg-[#1f498c] text-white">Submit request</button>
              </div>
            </form>
          </div>
        </div>, document.body
      )}

      {adminModalOpen && createPortal(
        <div onClick={() => setAdminModalOpen(false)} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8">
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-[#1f498c]">Access requests</h2>
              <button onClick={() => setAdminModalOpen(false)} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
            </div>
            <div className="space-y-3 max-h-[60vh] overflow-auto">
              {requests.filter(r=>r.status==='pending').length === 0 ? (
                <div className="text-sm text-gray-500">No pending requests.</div>
              ) : requests.filter(r=>r.status==='pending').map((r)=> (
                <div key={r.id} className="p-3 border rounded flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{r.name} — {r.email}</div>
                    <div className="text-xs text-gray-500">{r.designation} • {r.office} • {r.mobile}</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={()=>grantRequest(r.email)} className="px-3 py-1 rounded bg-green-600 text-white text-sm">Grant access</button>
                    <button onClick={()=>updateRequestStatus(r.email,'rejected').then(()=>readRequests().then(setRequests))} className="px-3 py-1 rounded bg-gray-100 text-sm">Reject</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>, document.body
      )}
    </>
  );
}
