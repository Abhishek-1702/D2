import React, { useState } from "react";
import {
  PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import { Check, Clock, AlertCircle } from "lucide-react";
import { PROJECTS, RECENT_ACTIVITY, TEAM_MEMBERS } from "../data/projects";

const activityIcons = {
  complete: <Check size={14} className="text-[#1f498c] mt-0.5 shrink-0" />,
  update: <Clock size={14} className="text-[#1f498c] mt-0.5 shrink-0" />,
  new: <AlertCircle size={14} className="text-[#1f498c] mt-0.5 shrink-0" />,
};

export default function Dashboard({ language }) {
  const [showAllRecent, setShowAllRecent] = useState(false);
  const isHindi = language === 'hi';

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
      {/* Section Title */}
      <div className="mb-4 sm:mb-6">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1f498c] tracking-tight border-b-2 border-[#1f498c] inline-block pr-4 sm:pr-8 pb-1">
          {isHindi ? 'डाटा कंट्रोल सेंटर' : 'DATA Control Center'}
        </h2>
        <p className="mt-2 sm:mt-4 max-w-2xl text-sm sm:text-lg text-gray-700 leading-7 sm:leading-8">
          <span className="text-[#1f498c] font-semibold"> </span>
          <span className="font-bold text-[#1f498c]">Insight. Intelligence. Impact.</span>
        </p>
      </div>


      {/* 4-Column Layout imitating UPPCL UI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-8 sm:mb-10">
        
        {/* Column 1 */}
        <div className="border border-gray-200 shadow-sm bg-white flex flex-col">
          <div className="bg-[#ff6f3b] text-white font-bold px-3 sm:px-4 py-2 sm:py-3 uppercase flex items-center gap-2 text-xs sm:text-sm">
             <span>📋</span> <span className="hidden sm:inline">KPI OVERVIEW</span><span className="sm:hidden">KPI</span>
          </div>
          <div className="p-3 sm:p-4 flex-1">
            <ul className="space-y-3 sm:space-y-4">
              <li className="flex items-start gap-2 text-xs sm:text-sm text-gray-700">
                <Check size={16} className="text-blue-500 shrink-0 mt-0.5" />
                <div>
                   <span className="font-semibold">Total Projects: 5</span><br/>
                   <span className="text-xs text-gray-500">Across all domains</span>
                </div>
              </li>
              <li className="flex items-start gap-2 text-xs sm:text-sm text-gray-700">
                <Check size={16} className="text-blue-500 shrink-0 mt-0.5" />
                <div>
                   <span className="font-semibold">Team Members: 15</span><br/>
                   <span className="text-xs text-gray-500">Actively contributing</span>
                </div>
              </li>
              <li className="flex items-start gap-2 text-xs sm:text-sm text-gray-700">
                <Check size={16} className="text-blue-500 shrink-0 mt-0.5" />
                <div>
                   <span className="font-semibold text-orange-600">Overall Completion: 45%</span><br/>
                   <span className="text-xs text-gray-500">Milestone 1 in progress</span>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Column 2 */}
        <div className="border border-gray-200 shadow-sm bg-white flex flex-col">
          <div className="bg-[#ff6f3b] text-white font-bold px-3 sm:px-4 py-2 sm:py-3 uppercase flex items-center gap-2 text-xs sm:text-sm">
             <span>🚀</span> <span className="hidden sm:inline">PROJECT HIGHLIGHTS</span><span className="sm:hidden">PROJECTS</span>
          </div>
          <div className="p-3 sm:p-4 flex-1">
            <ul className="space-y-3 sm:space-y-4">
              {PROJECTS.map((p, i) => (
                <li key={p.id} className="flex items-start gap-2 text-xs sm:text-sm text-gray-700">
                  <Check size={16} className="text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">{p.shortName || p.name}</span><br/>
                    <span className="text-xs text-gray-500">Progress: {p.progress}%</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Column 3 */}
        <div className="border border-gray-200 shadow-sm bg-white flex flex-col">
          <div className="bg-[#ff6f3b] text-white font-bold px-3 sm:px-4 py-2 sm:py-3 uppercase flex items-center gap-2 text-xs sm:text-sm">
             <span>📊</span> <span className="hidden sm:inline">ANALYTICS</span><span className="sm:hidden">ANALYTICS</span>
          </div>
          <div className="p-3 sm:p-4 flex-1">
            <ul className="space-y-2 sm:space-y-3">
              <li className="flex items-start gap-2 text-xs sm:text-sm text-gray-700 hover:text-orange-600 cursor-pointer transition-colors">
                <Check size={16} className="text-blue-500 shrink-0 mt-0.5" />
                <span>Monthly Load Forecast</span>
              </li>
              <li className="flex items-start gap-2 text-xs sm:text-sm text-gray-700 hover:text-orange-600 cursor-pointer transition-colors">
                <Check size={16} className="text-blue-500 shrink-0 mt-0.5" />
                <span>Consumer Segmentation</span>
              </li>
              <li className="flex items-start gap-2 text-xs sm:text-sm text-gray-700 hover:text-orange-600 cursor-pointer transition-colors">
                <Check size={16} className="text-blue-500 shrink-0 mt-0.5" />
                <span>AT&C Loss %</span>
              </li>
              <li className="flex items-start gap-2 text-xs sm:text-sm text-gray-700 hover:text-orange-600 cursor-pointer transition-colors">
                <Check size={16} className="text-blue-500 shrink-0 mt-0.5" />
                <span>Weekly Load Patterns</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Column 4 - Replaced with Team Members List to restore missing names if needed, or keep Activity summary */}
        <div className="border border-gray-200 shadow-sm bg-white flex flex-col">
          <div className="bg-[#ff6f3b] text-white font-bold px-3 sm:px-4 py-2 sm:py-3 uppercase flex items-center gap-2 text-xs sm:text-sm">
             <span>👥</span> <span className="hidden sm:inline">TEAM DIRECTORY</span><span className="sm:hidden">TEAM</span>
          </div>
          <div className="p-3 sm:p-4 flex-1 max-h-[220px] overflow-y-auto">
            <ul className="space-y-2 sm:space-y-3">
              {TEAM_MEMBERS.map((m, i) => (
                <li key={i} className="flex items-start gap-2 text-xs sm:text-sm text-gray-700">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#1f498c] flex items-center justify-center text-[9px] sm:text-[10px] font-bold text-white shrink-0">
                    {m.avatar}
                  </div>
                  <div>
                    <span className="font-semibold text-xs sm:text-sm">{m.name}</span><br/>
                    <span className="text-xs text-gray-500">{m.role}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <h3 className="text-lg sm:text-xl font-bold text-[#1f498c] mb-3 sm:mb-4 border-b pb-2 flex justify-between items-center flex-wrap gap-2">
        {isHindi ? 'हालिया गतिविधि' : 'Recent Activity'}
        <button
          type="button"
          onClick={() => setShowAllRecent((prev) => !prev)}
          className="text-xs sm:text-sm font-semibold text-[#ff6f3b] hover:underline"
        >
          {showAllRecent ? (isHindi ? 'कम दिखाएँ' : 'Show less') : (isHindi ? 'सभी देखें' : 'View all')}
        </button>
      </h3>
      <div className="bg-white border border-gray-200 shadow-sm overflow-x-auto rounded-2xl mb-8 sm:mb-10">
        <table className="w-full text-xs sm:text-sm">
          <thead>
            <tr className="text-xs text-gray-500 font-bold bg-gray-50 border-b border-gray-200">
              <th className="text-left py-2 sm:py-3 px-2 sm:px-4 uppercase">{isHindi ? 'गतिविधि' : 'Activity'}</th>
              <th className="text-left py-2 sm:py-3 px-2 sm:px-4 uppercase">{isHindi ? 'परियोजना' : 'Project'}</th>
              <th className="text-left py-2 sm:py-3 px-2 sm:px-4 uppercase">{isHindi ? 'सदस्य' : 'Member'}</th>
              <th className="text-left py-2 sm:py-3 px-2 sm:px-4 uppercase">{isHindi ? 'समय' : 'Time'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(showAllRecent ? RECENT_ACTIVITY : RECENT_ACTIVITY.slice(0, 4)).map((a, i) => (
              <tr key={i} className="hover:bg-blue-50/50 transition-colors">
                <td className="py-2 sm:py-3 px-2 sm:px-4">
                  <div className="flex items-center gap-2">
                    {activityIcons[a.type]}
                    <span className="text-gray-800 font-medium text-xs sm:text-sm">{a.task}</span>
                  </div>
                </td>
                <td className="py-2 sm:py-3 px-2 sm:px-4 text-gray-600 text-xs font-semibold">{a.project}</td>
                <td className="py-2 sm:py-3 px-2 sm:px-4">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#ff6f3b] flex items-center justify-center text-[10px] font-bold text-white">
                      {a.avatar}
                    </span>
                    <span className="text-gray-700 text-xs sm:text-sm">{a.member}</span>
                  </div>
                </td>
                <td className="py-2 sm:py-3 px-2 sm:px-4 text-gray-500 text-xs">{a.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Visual Analytics Section */}
      <h3 className="text-lg sm:text-xl font-bold text-[#1f498c] mb-3 sm:mb-4 border-b pb-2">
         Data Visualizations
      </h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        
        {/* Chart 1: Monthly Load Trend */}
        <div className="bg-white border border-gray-200 shadow-sm p-3 sm:p-4">
          <h4 className="text-xs sm:text-sm font-bold text-gray-700 mb-3 sm:mb-4 uppercase">Monthly Load Forecast vs Actual (MW)</h4>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={PROJECTS[0].chartData.bar}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#6B7280" }} />
              <YAxis tick={{ fontSize: 10, fill: "#6B7280" }} unit="MW" />
              <Tooltip contentStyle={{ fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="forecast" stroke="#ff6f3b" strokeWidth={2.5} dot={{ r: 3 }} name="Forecast" />
              <Line type="monotone" dataKey="actual" stroke="#1f498c" strokeWidth={2.5} dot={{ r: 3 }} name="Actual" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Chart 2: Consumer Segmentation Pie */}
        <div className="bg-white border border-gray-200 shadow-sm p-3 sm:p-4 flex flex-col md:flex-row items-center">
          <div className="flex-1 w-full">
             <h4 className="text-xs sm:text-sm font-bold text-gray-700 mb-3 sm:mb-4 uppercase">Consumer Segmentation (CBA)</h4>
             <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={PROJECTS[1].chartData.pie}
                  cx="50%" cy="50%" innerRadius={30} outerRadius={60}
                  dataKey="value" strokeWidth={0}
                >
                  {PROJECTS[1].chartData.pie.map((e, i) => (
                    <Cell key={i} fill={e.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => [`${v}%`]} contentStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="w-full md:w-1/3 mt-3 md:mt-0 space-y-1.5 border-t md:border-t-0 md:border-l border-gray-200 pt-3 md:pt-0 md:pl-4">
            {PROJECTS[1].chartData.pie.map((s) => (
              <div key={s.name} className="flex items-center gap-2">
                <span className="w-2 h-2 sm:w-3 sm:h-3 rounded-sm" style={{ background: s.color }} />
                <span className="text-xs text-gray-600 flex-1">{s.name}</span>
                <span className="text-xs font-bold text-gray-800">{s.value}%</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}