import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Search, LogOut, Menu, X } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export default function UppclHeader({ activeTab, setActiveTab, language = 'en', setLanguage }) {
  const { user, signIn, signOut, authError, clearAuthError } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [dateTime, setDateTime] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
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

  const toggleLanguage = () => setLanguage(isHindi ? 'en' : 'hi');
  const skipToContent = () => document.getElementById('main-content')?.scrollIntoView({ behavior: 'smooth' });
  const openLink = (href) => window.open(href, '_blank', 'noreferrer');

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
            <button type="button" onClick={() => openLink('https://upptcl.org/upptcl')} className="px-2 text-[10px] lg:text-xs hover:underline">
              VBTS
            </button>
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
            <div className="hidden sm:block rounded-full bg-white/15 px-2 lg:px-3 py-1 text-[10px] lg:text-[11px] font-semibold whitespace-nowrap">
              {formattedTime}
            </div>
            <div className="hidden lg:block rounded-full bg-[#ffeb3b] px-3 py-1 text-[11px] font-semibold text-black">
              8th June - 18th July 2026
            </div>
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
                <span className="hidden sm:block text-xs font-normal bg-green-100 text-green-800 px-2 py-1 rounded">
                  {user.email}
                </span>
                <button
                  onClick={async () => { clearAuthError(); await signOut(); }}
                  className="flex items-center gap-1 text-red-600 hover:underline text-xs sm:text-sm"
                >
                  <LogOut size={16} /> <span className="hidden sm:inline">Sign out</span>
                </button>
              </>
            ) : (
              <button
                onClick={openModal}
                className="bg-[#1f498c] hover:bg-blue-800 text-white px-2 sm:px-4 py-1.5 rounded text-xs sm:text-sm whitespace-nowrap"
              >
                LOGIN
              </button>
            )}
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
              onClick={() => { setActiveTab('fetch'); setMobileMenuOpen(false); }}
              className={`block w-full text-left px-4 py-2 text-sm font-semibold rounded transition-colors ${activeTab === 'fetch' ? 'bg-orange-100 text-orange-600' : 'text-[#1f498c] hover:bg-gray-100'}`}
            >
              {isHindi ? 'दस्तावेज़' : 'Fetch Document'}
            </button>
          </div>
        )}
      </header>

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

          <div className="border-2 flex shrink-0 items-end justify-center pt-4 opacity-90 hover:opacity-100 transition-opacity hidden sm:flex">
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
    </>
  );
}
