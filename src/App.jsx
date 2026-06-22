// src/App.jsx
import React, { useState } from "react";
import UppclHeader from "./components/UppclHeader";
import Dashboard from "./components/Dashboard";
import Projects from "./components/Projects";
import Meetings from "./components/Meetings";
import FetchDocument from "./components/FetchDocument";
import { AuthProvider } from "./contexts/AuthContext";

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [language, setLanguage] = useState("en");

  return (
    <AuthProvider>
      <div className="flex flex-col min-h-screen bg-gray-50">
        <UppclHeader
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          language={language}
          setLanguage={setLanguage}
        />
        <main id="main-content" className="flex-1 w-full bg-[#f4f7f6]">
          {activeTab === "dashboard" && <Dashboard language={language} />}
          {activeTab === "projects" && <Projects language={language} />}
          {activeTab === "meetings" && <Meetings language={language} />}
          {activeTab === "fetch" && <FetchDocument language={language} />}
        </main>
      </div>
    </AuthProvider>
  );
}
