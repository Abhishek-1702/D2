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
    <div className="w-full max-w-7xl mx-auto px-4 py-8">
      {/* Section Title */}
      <div className="mb-6">
        <h2 className="text-3xl font-extrabold text-[#1f498c] tracking-tight border-b-2 border-[#1f498c] inline-block pr-8 pb-1">
          {isHindi ? 'डाटा कंट्रोल सेंटर' : 'DATA Control Center'}
        </h2>
        <p className="mt-4 max-w-2xl text-lg text-gray-700 leading-8">
          <span className="text-[#1f498c] font-semibold"> </span>
          <span className="font-bold text-[#1f498c]">Insight. Intelligence. Impact.</span>
        </p>
      </div>


      {/* 4-Column Layout imitating UPPCL UI */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        
        {/* Column 1 */}
        <div className="border border-gray-200 shadow-sm bg-white flex flex-col">
          <div className="bg-[#ff6f3b] text-white font-bold px-4 py-3 uppercase flex items-center gap-2">
             <span>📋</span> KPI OVERVIEW
          </div>
          <div className="p-4 flex-1">
            <ul className="space-y-4">
              <li className="flex items-start gap-2 text-sm text-gray-700">
                <Check size={16} className="text-blue-500 shrink-0 mt-0.5" />
                <div>
                   <span className="font-semibold">Total Projects: 4</span><br/>
                   <span className="text-xs text-gray-500">Across all domains</span>
                </div>
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-700">
                <Check size={16} className="text-blue-500 shrink-0 mt-0.5" />
                <div>
                   <span className="font-semibold">Team Members: 13</span><br/>
                   <span className="text-xs text-gray-500">Actively contributing</span>
                </div>
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-700">
                <Check size={16} className="text-blue-500 shrink-0 mt-0.5" />
                <div>
                   <span className="font-semibold text-orange-600">Overall Completion: 20%</span><br/>
                   <span className="text-xs text-gray-500">Milestone 1 in progress</span>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Column 2 */}
        <div className="border border-gray-200 shadow-sm bg-white flex flex-col">
          <div className="bg-[#ff6f3b] text-white font-bold px-4 py-3 uppercase flex items-center gap-2">
             <span>🚀</span> PROJECT HIGHLIGHTS
          </div>
          <div className="p-4 flex-1">
            <ul className="space-y-4">
              {PROJECTS.map((p, i) => (
                <li key={p.id} className="flex items-start gap-2 text-sm text-gray-700">
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
          <div className="bg-[#ff6f3b] text-white font-bold px-4 py-3 uppercase flex items-center gap-2">
             <span>📊</span> ANALYTICS & REPORTS
          </div>
          <div className="p-4 flex-1">
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-sm text-gray-700 hover:text-orange-600 cursor-pointer transition-colors">
                <Check size={16} className="text-blue-500 shrink-0 mt-0.5" />
                <span>Monthly Load Forecast vs Actual</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-700 hover:text-orange-600 cursor-pointer transition-colors">
                <Check size={16} className="text-blue-500 shrink-0 mt-0.5" />
                <span>Consumer Segmentation Analysis</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-700 hover:text-orange-600 cursor-pointer transition-colors">
                <Check size={16} className="text-blue-500 shrink-0 mt-0.5" />
                <span>AT&C Loss % by Division</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-700 hover:text-orange-600 cursor-pointer transition-colors">
                <Check size={16} className="text-blue-500 shrink-0 mt-0.5" />
                <span>Weekly Load Patterns</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Column 4 - Replaced with Team Members List to restore missing names if needed, or keep Activity summary */}
        <div className="border border-gray-200 shadow-sm bg-white flex flex-col">
          <div className="bg-[#ff6f3b] text-white font-bold px-4 py-3 uppercase flex items-center gap-2">
             <span>👥</span> TEAM DIRECTORY
          </div>
          <div className="p-4 flex-1 max-h-[220px] overflow-y-auto">
            <ul className="space-y-3">
              {TEAM_MEMBERS.map((m, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <div className="w-6 h-6 rounded-full bg-[#1f498c] flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                    {m.avatar}
                  </div>
                  <div>
                    <span className="font-semibold">{m.name}</span><br/>
                    <span className="text-xs text-gray-500">{m.role}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <h3 className="text-xl font-bold text-[#1f498c] mb-4 border-b pb-2 flex justify-between items-center">
        {isHindi ? 'हालिया गतिविधि' : 'Recent Activity'}
        <button
          type="button"
          onClick={() => setShowAllRecent((prev) => !prev)}
          className="text-sm font-semibold text-[#ff6f3b] hover:underline"
        >
          {showAllRecent ? (isHindi ? 'कम दिखाएँ' : 'Show less') : (isHindi ? 'सभी देखें' : 'View all')}
        </button>
      </h3>
      <div className="bg-white border border-gray-200 shadow-sm overflow-x-auto rounded-2xl mb-10">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-500 font-bold bg-gray-50 border-b border-gray-200">
              <th className="text-left py-3 px-4 uppercase">{isHindi ? 'गतिविधि' : 'Activity'}</th>
              <th className="text-left py-3 px-4 uppercase">{isHindi ? 'परियोजना' : 'Project'}</th>
              <th className="text-left py-3 px-4 uppercase">{isHindi ? 'सदस्य' : 'Member'}</th>
              <th className="text-left py-3 px-4 uppercase">{isHindi ? 'समय' : 'Time'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(showAllRecent ? RECENT_ACTIVITY : RECENT_ACTIVITY.slice(0, 4)).map((a, i) => (
              <tr key={i} className="hover:bg-blue-50/50 transition-colors">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    {activityIcons[a.type]}
                    <span className="text-gray-800 font-medium">{a.task}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-gray-600 text-xs font-semibold">{a.project}</td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#ff6f3b] flex items-center justify-center text-[10px] font-bold text-white">
                      {a.avatar}
                    </span>
                    <span className="text-gray-700 text-sm">{a.member}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-gray-500 text-xs">{a.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Visual Analytics Section */}
      <h3 className="text-xl font-bold text-[#1f498c] mb-4 border-b pb-2">
         Data Visualizations
      </h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: Monthly Load Trend */}
        <div className="bg-white border border-gray-200 shadow-sm p-4">
          <h4 className="text-sm font-bold text-gray-700 mb-4 uppercase">Monthly Load Forecast vs Actual (MW)</h4>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={PROJECTS[0].chartData.bar}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#6B7280" }} />
              <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} unit="MW" />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="forecast" stroke="#ff6f3b" strokeWidth={2.5} dot={{ r: 4 }} name="Forecast" />
              <Line type="monotone" dataKey="actual" stroke="#1f498c" strokeWidth={2.5} dot={{ r: 4 }} name="Actual" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Chart 2: Consumer Segmentation Pie */}
        <div className="bg-white border border-gray-200 shadow-sm p-4 flex flex-col md:flex-row items-center">
          <div className="flex-1 w-full">
             <h4 className="text-sm font-bold text-gray-700 mb-4 uppercase">Consumer Segmentation (CBA)</h4>
             <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={PROJECTS[1].chartData.pie}
                  cx="50%" cy="50%" innerRadius={40} outerRadius={70}
                  dataKey="value" strokeWidth={0}
                >
                  {PROJECTS[1].chartData.pie.map((e, i) => (
                    <Cell key={i} fill={e.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => [`${v}%`]} contentStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="w-full md:w-1/3 mt-4 md:mt-0 space-y-2 border-t md:border-t-0 md:border-l border-gray-200 pt-4 md:pt-0 md:pl-4">
            {PROJECTS[1].chartData.pie.map((s) => (
              <div key={s.name} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm" style={{ background: s.color }} />
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