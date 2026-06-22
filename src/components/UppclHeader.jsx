import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Search, LogOut } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export default function UppclHeader({ activeTab, setActiveTab, language = 'en', setLanguage }) {
  const { user, signIn, signOut, authError, clearAuthError } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
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
        <div className="bg-[#1f498c] text-white text-[11px] font-bold px-4 py-1.5 flex flex-col md:flex-row justify-between items-center gap-3">
          <div className="flex flex-wrap items-center gap-2 divide-x divide-white/30">
            <button type="button" onClick={skipToContent} className="px-3 hover:underline">
              {isHindi ? 'मुख्य सामग्री' : 'SKIP TO MAIN CONTENT'}
            </button>
            <button type="button" onClick={() => openLink('https://kesco.org.in/Sitemap')} className="px-3 hover:underline">
              {isHindi ? 'साइटमैप' : 'SITEMAP'}
            </button>
            <button type="button" onClick={() => openLink('https://opp.uppclonline.com/uppcl/')} className="px-3 text-orange-300 hover:underline">
              {isHindi ? 'कर्मी पोर्टल' : 'OUTSOURCE KARMI PORTAL'}
            </button>
            <button type="button" onClick={toggleLanguage} className="px-3 hover:underline">
              {isHindi ? 'English Version' : 'हिंदी संस्करण'}
            </button>
            <span className="px-3 flex items-center justify-center bg-yellow-400 text-black">♿</span>
            <button type="button" onClick={() => openLink('https://upptcl.org/upptcl')} className="px-3 hover:underline">
              VBTS
            </button>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 relative">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isHindi ? 'खोजें' : 'Search'}
                className="pl-2 pr-8 py-0.5 text-black text-xs h-8 w-48 rounded"
              />
              <Search className="absolute right-1 top-1.5 text-gray-500" size={14} />
              {searchQuery.trim() && (
                <div className="absolute left-0 top-full mt-1 w-80 max-h-52 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg text-xs text-gray-700 z-30">
                  <div className="px-3 py-2 border-b border-gray-100 bg-gray-50 font-semibold">
                    {isHindi ? 'खोज परिणाम' : 'Search Results'}
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
            <div className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold">
              {formattedTime}
            </div>
            <div className="rounded-full bg-[#ffeb3b] px-3 py-1 text-[11px] font-semibold text-black">
              8th June - 18th July 2026
            </div>
          </div>
        </div>

        {/* 2. White Header Area */}
        <div className="bg-white px-6 py-3 flex justify-between items-center shadow-sm relative z-20">
          <div className="flex items-center gap-4">
            <img src="/kesco-logo.png" alt="KESCO Logo" className="w-16 h-16 object-contain" />
            <div className="flex flex-col">
              <span className="text-xl font-bold text-[#1f498c] tracking-wide leading-tight">
                Kanpur Electricity
              </span>
              <span className="text-[16px] font-bold text-orange-500 leading-tight">
                Supply Company Ltd.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm font-semibold text-[#1f498c] flex-wrap">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`hover:text-orange-500 transition-colors ${activeTab === 'dashboard' ? 'text-orange-500 border-b-2 border-orange-500' : ''}`}
            >
              {isHindi ? 'डैशबोर्ड' : 'Dashboard'}
            </button>
            <span className="text-gray-300">|</span>
            <button
              onClick={() => setActiveTab('projects')}
              className={`hover:text-orange-500 transition-colors ${activeTab === 'projects' ? 'text-orange-500 border-b-2 border-orange-500' : ''}`}
            >
              {isHindi ? 'परियोजनाएँ' : 'Projects'}
            </button>
            <span className="text-gray-300">|</span>
            <button
              onClick={() => setActiveTab('meetings')}
              className={`hover:text-orange-500 transition-colors ${activeTab === 'meetings' ? 'text-orange-500 border-b-2 border-orange-500' : ''}`}
            >
              {isHindi ? 'मीटिंग्स' : 'Meetings'}
            </button>
            <span className="text-gray-300">|</span>
            <button
              onClick={() => setActiveTab('fetch')}
              className={`hover:text-orange-500 transition-colors ${activeTab === 'fetch' ? 'text-orange-500 border-b-2 border-orange-500' : ''}`}
            >
              {isHindi ? 'दस्तावेज़' : 'Fetch Document'}
            </button>
          </div>

          <div className="ml-4 flex items-center gap-3">
            {user ? (
              <>
                <span className="text-xs font-normal bg-green-100 text-green-800 px-2 py-1 rounded">
                  {user.email}
                </span>
                <button
                  onClick={async () => { clearAuthError(); await signOut(); }}
                  className="flex items-center gap-1 text-red-600 hover:underline"
                >
                  <LogOut size={16} /> Sign out
                </button>
              </>
            ) : (
              <button
                onClick={openModal}
                className="bg-[#1f498c] hover:bg-blue-800 text-white px-4 py-1.5 rounded text-xs"
              >
                LOGIN
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 3. Red Hero Banner */}
      <div className="bg-[#de1b38] w-full min-h-[220px] flex items-center justify-center relative overflow-hidden">
        <div className="flex w-full max-w-6xl mx-auto px-4 gap-4 items-center">
          <div className="flex-1 text-white pr-4">
            <h1 className="text-4xl font-extrabold mb-2 leading-tight">
              बिजली बिल <br />
              जमा करने के लिए किसी<br />
              को रुपए क्यों दें?
            </h1>
            <div className="bg-white text-black inline-flex items-center px-4 py-2 mt-4 rounded-full font-bold">
              KESCO की वेबसाइट है ना <Search size={18} className="ml-2 text-gray-400" />
            </div>
          </div>

          <div className="border-2 flex shrink-0 items-end justify-center pt-4 opacity-90 hover:opacity-100 transition-opacity">
            <img
              src="/pm_portait.png"
              alt="Portrait of prime minister"
              className="h-56 object-contain drop-shadow-md"
            />
          </div>

          <div className="flex-1 flex flex-col gap-3 items-end justify-center pl-4">
            <div className="border-2 border-white rounded-[30px] px-6 py-3 text-center text-white bg-white/10 backdrop-blur-sm max-w-md w-full">
              <p className="font-bold text-lg leading-tight">बिजली बिल भुगतान करना है? तो लाइन में लगने या किसी बिचौलिये को रुपए देने की जरुरत नहीं।</p>
            </div>
            <div className="border-2 border-white rounded-[30px] px-6 py-3 text-center text-white bg-white/10 backdrop-blur-sm max-w-md w-full">
              <p className="font-bold text-lg leading-tight">KESCO की आधिकारिक वेबसाइट KESCO.ORG पर जाएं और घर बैठे ऑनलाइन बिल जमा करें सुरक्षित और आसान!</p>
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
      <div className="bg-gradient-to-b from-[#e3ebf3] to-white py-4 flex flex-col sm:flex-row justify-center gap-4 border-b border-gray-200">
        <a
          href="https://play.google.com/store/apps/details?id=com.test.kescosmartmeter&hl=en_IN&pli=1"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center bg-[#ff6f3b] hover:bg-[#e65a25] text-white font-bold px-6 py-2 rounded shadow-md text-sm transition-colors"
        >
          Download KESCO SMART App for Bill Payment/ recharge your Smart Meters
        </a>
        <a
          href="https://consumer.uppcl.org/wss/pay_bill_home"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center bg-[#ff6f3b] hover:bg-[#e65a25] text-white font-bold px-6 py-2 rounded shadow-md text-sm transition-colors"
        >
          Smart Postpaid Meter Related Information
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
