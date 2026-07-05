// src/components/Projects.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import {
  ChevronLeft, Upload, FileText, Users,
  Target, CheckSquare, BookOpen, AlertCircle, X, Link as LinkIcon, Eye
} from "lucide-react";
import { PROJECTS } from "../data/projects";
import { deleteFile, uploadFileToStorage, isSupabaseConfigured } from "../supabase";
import { appendSectionDocument, buildUploadedDocument, getSectionDocuments, getStoragePathFromUrl, isAdminUser, readSharedJsonFile, removeSectionDocument, writeSharedJsonFile } from "../utils/documentPersistence";
import { useAuth } from "../contexts/AuthContext";
import Toast from "./Toast";

const STATUS_STYLES = {
  "In Progress": "bg-blue-100 text-blue-700 border border-blue-200",
  "Completed": "bg-green-100 text-green-700 border border-green-200",
  "Not Started": "bg-gray-100 text-gray-500 border border-gray-200",
};

export default function Projects() {
  const [projects, setProjects] = useState(
    PROJECTS.map(p => ({ ...p, links: p.links || [], documents: p.documents || [] }))
  );
  const [toast, setToast] = useState(null);
  const [selected, setSelected] = useState(null);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [activeTab, setActiveTab] = useState("overview");
  const [pptModal, setPptModal] = useState(false);
  const listRef = useRef(null);
  const fileInputRef = useRef(null);
  const { user } = useAuth();
  const canManageDocuments = isAdminUser(user);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e) => {
      if (selected) {
        if (e.key === "Escape") setSelected(null);
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIndex((i) => Math.min(i + 1, projects.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        setSelected(projects[focusedIndex]);
        setActiveTab("overview");
      }
    },
    [selected, focusedIndex, projects]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    try {
      const savedView = window.localStorage.getItem("kesco_project_view");
      if (!savedView) return;
      const parsed = JSON.parse(savedView);
      if (parsed.projectId) {
        const restoredIndex = projects.findIndex((project) => project.id === parsed.projectId);
        if (restoredIndex >= 0) {
          // restore focus to that project but do not auto-open the project detail
          setFocusedIndex(restoredIndex);
          if (parsed.subTab) setActiveTab(parsed.subTab);
        }
      }
    } catch (error) {
      console.error("Failed to restore project view", error);
    }
  }, [projects]);

  useEffect(() => {
    if (!selected) {
      window.localStorage.removeItem("kesco_project_view");
      return;
    }

    window.localStorage.setItem(
      "kesco_project_view",
      JSON.stringify({ projectId: selected.id, subTab: activeTab })
    );
  }, [selected, activeTab]);

  useEffect(() => {
    if (!selected) return;
    const syncedProject = projects.find((project) => project.id === selected.id);
    if (syncedProject && JSON.stringify(syncedProject) !== JSON.stringify(selected)) {
      setSelected(syncedProject);
    }
  }, [projects, selected]);

  const persistProjectsState = async (nextProjects) => {
    try {
      const key = 'projects_links_v1';
      const store = JSON.parse(localStorage.getItem(key) || '{}');
      const nextStore = { ...store };
      nextProjects.forEach((project) => {
        nextStore[project.id] = project.links || [];
      });
      localStorage.setItem(key, JSON.stringify(nextStore));
      await writeSharedJsonFile('app-data/projects-state.json', nextProjects);
    } catch (error) {
      console.error('Failed to sync projects state', error);
    }
  };

  useEffect(() => {
    let mounted = true;

    const loadProjectState = async () => {
      try {
        const key = 'projects_links_v1';
        const store = JSON.parse(localStorage.getItem(key) || '{}');
        const remoteProjects = await readSharedJsonFile('app-data/projects-state.json');
        // build a projects array from local store and remote state
        const remoteById = Array.isArray(remoteProjects)
          ? Object.fromEntries(remoteProjects.map((project) => [project.id, project]))
          : {};
        const updated = PROJECTS.map((p) => {
          const remoteProject = remoteById[p.id] || {};
          return {
            ...p,
            ...remoteProject,
            links: remoteProject.links || store[p.id] || p.links || [],
            ppt: remoteProject.ppt || p.ppt || null,
            pptName: remoteProject.pptName || p.pptName || null,
            documents: remoteProject.documents || getSectionDocuments("project", p.id) || p.documents || [],
          };
        });
        if (mounted) setProjects(updated);
        if (Array.isArray(remoteProjects)) {
          await persistProjectsState(updated);
        }
      } catch (e) {
        if (mounted) setProjects(PROJECTS.map((p) => ({ ...p, links: p.links || [], documents: p.documents || [] })));
      }
    };

    loadProjectState();
    return () => { mounted = false; };
  }, []);

  const handlePptUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !selected) return;

    try {
      setPptModal(false);
      let url = URL.createObjectURL(file);
      let path = null;

      if (isSupabaseConfigured) {
        const res = await uploadFileToStorage(file, 'projects');
        url = res.url;
        path = res.path;
      }

      const docEntry = buildUploadedDocument(file, url, path);
      appendSectionDocument('project', selected.id, docEntry);

      const updatedDocuments = [docEntry, ...(selected.documents || [])];
      const updated = projects.map((p) =>
        p.id === selected.id ? { ...p, ppt: url, pptName: file.name, documents: updatedDocuments } : p
      );
      setProjects(updated);
      setSelected((prev) => ({ ...prev, ppt: url, pptName: file.name, documents: updatedDocuments }));
      await persistProjectsState(updated);
      if (setToast) { setToast({ type: 'success', message: 'Presentation uploaded' }); setTimeout(() => setToast(null), 3000); }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('uploadFileToStorage failed, using local URL', err);
      const url = URL.createObjectURL(file);
      const docEntry = buildUploadedDocument(file, url);
      appendSectionDocument('project', selected.id, docEntry);
      const updatedDocuments = [docEntry, ...(selected.documents || [])];
      const updated = projects.map((p) =>
        p.id === selected.id ? { ...p, ppt: url, pptName: file.name, documents: updatedDocuments } : p
      );
      setProjects(updated);
      setSelected((prev) => ({ ...prev, ppt: url, pptName: file.name, documents: updatedDocuments }));
      await persistProjectsState(updated);
      if (setToast) {
        setToast({ type: 'error', message: 'Upload failed — saved locally only' });
        setTimeout(() => setToast(null), 4000);
      }
    }
  };

  const handleSaveLink = (link) => {
    const updated = projects.map((p) =>
      p.id === selected.id ? { ...p, links: [...(p.links || []), link] } : p
    );
    setProjects(updated);
    setSelected((prev) => ({ ...prev, links: [...(prev.links || []), link] }));
    void persistProjectsState(updated);

    try {
      const key = 'projects_links_v1';
      const store = JSON.parse(localStorage.getItem(key) || '{}');
      store[selected.id] = (store[selected.id] || []).concat(link);
      localStorage.setItem(key, JSON.stringify(store));
    } catch (e) {
      // ignore
    }
  };

  const handleDeleteLink = (index) => {
    if (!selected) return;
    const nextLinks = (selected.links || []).filter((_, i) => i !== index);
    const updated = projects.map((p) =>
      p.id === selected.id ? { ...p, links: nextLinks } : p
    );
    setProjects(updated);
    setSelected((prev) => (prev ? { ...prev, links: nextLinks } : prev));
    void persistProjectsState(updated);

    try {
      const key = 'projects_links_v1';
      const store = JSON.parse(localStorage.getItem(key) || '{}');
      store[selected.id] = nextLinks;
      localStorage.setItem(key, JSON.stringify(store));
    } catch (e) {
      // ignore
    }
  };

  const handleDeleteProjectDocument = async (documentId, documentPath) => {
    if (!selected) return;
    const nextDocuments = (selected.documents || []).filter((item) => item.id !== documentId);
    removeSectionDocument('project', selected.id, documentId);
    const nextProjects = projects.map((p) => p.id === selected.id ? { ...p, documents: nextDocuments } : p);
    setProjects(nextProjects);
    setSelected((prev) => prev ? { ...prev, documents: nextDocuments } : prev);
    void persistProjectsState(nextProjects);

    const resolvedPath = documentPath || getStoragePathFromUrl((selected.documents || []).find((item) => item.id === documentId)?.url);
    if (resolvedPath) {
      try {
        await deleteFile(resolvedPath);
      } catch (error) {
        console.error('delete failed', error);
      }
    }
  };

  if (selected) {
    return (
      <ProjectDetail
        project={selected}
        onBack={() => setSelected(null)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onUploadPpt={() => setPptModal(true)}
        fileInputRef={fileInputRef}
        handlePptUpload={handlePptUpload}
        pptModal={pptModal}
        setPptModal={setPptModal}
        onSaveLink={handleSaveLink}
        onDeleteLink={handleDeleteLink}
        onDeleteDocument={handleDeleteProjectDocument}
        canManageDocuments={canManageDocuments}
        toast={toast}
        setToast={setToast}
      />
    );
  }

  // non-selected view should still render global toast
  // Toast is also rendered inside ProjectDetail when a project is selected
  // so either branch shows notifications

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-br from-white via-[#FFFBEA]/30 to-white">
      <Toast toast={toast} setToast={setToast} />
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100 px-8 py-4">
        <h1 className="text-2xl font-display font-bold text-gray-900">Projects</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Overview of all projects under KESCO Summer Internship 2026
        </p>
      </div>

      <div className="px-8 py-6" ref={listRef}>
        {/*
        <div className="mb-4 flex items-center gap-2 text-xs text-gray-400 bg-gray-50 rounded-xl px-4 py-2.5 w-fit border border-gray-100">
          <span>Use</span>
          <kbd className="px-1.5 py-0.5 bg-white rounded border border-gray-200 font-mono text-gray-600">↑</kbd>
          <kbd className="px-1.5 py-0.5 bg-white rounded border border-gray-200 font-mono text-gray-600">↓</kbd>
          <span>to navigate and</span>
          <kbd className="px-1.5 py-0.5 bg-white rounded border border-gray-200 font-mono text-gray-600">Enter</kbd>
          <span>to view project details</span>
        </div>
        */}

        <div className="space-y-3">
          {projects.map((project, index) => (
            <ProjectRow
              key={project.id}
              project={project}
              index={index + 1}
              focused={focusedIndex === index}
              onClick={() => {
                setSelected(project);
                setFocusedIndex(index);
                setActiveTab("overview");
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ProjectRow({ project, index, focused, onClick }) {
  return (
    <div
      tabIndex={0}
      onClick={onClick}
      className={`group flex items-center gap-5 bg-white/80 backdrop-blur-sm rounded-2xl border px-6 py-4 cursor-pointer transition-all duration-150 shadow-sm hover:shadow-md hover:border-yellow-300 ${
        focused ? "border-yellow-400 ring-2 ring-yellow-200 shadow-md" : "border-gray-100"
      }`}
    >
      <span className="w-7 h-7 rounded-full bg-yellow-50 border border-yellow-200 flex items-center justify-center text-xs font-bold text-yellow-700 shrink-0">
        {index}
      </span>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 text-sm group-hover:text-yellow-700 transition-colors">
          {project.name}
        </p>
        <p className="text-xs text-gray-400 mt-0.5 truncate">
          {project.members.join(", ")}
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-36 hidden sm:block">
        <div className="flex justify-between mb-1">
          <span className="text-[10px] text-gray-400">Progress</span>
          <span className="text-[10px] font-bold text-gray-600">{project.progress}%</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${project.progress}%`,
              background: project.progress > 50 ? "#F5C400" : project.progress > 20 ? "#3B82F6" : "#D1D5DB",
            }}
          />
        </div>
      </div>

      <span className={`text-xs font-medium px-3 py-1 rounded-full shrink-0 ${STATUS_STYLES[project.status]}`}>
        {project.status}
      </span>

      <ChevronLeft
        size={16}
        className="rotate-180 text-gray-300 group-hover:text-yellow-500 transition-colors shrink-0"
      />
    </div>
  );
}

function ProjectDetail({ project, onBack, activeTab, setActiveTab, onUploadPpt, fileInputRef, handlePptUpload, pptModal, setPptModal, onSaveLink, onDeleteLink, onDeleteDocument, canManageDocuments, toast, setToast }) {
  const tabs = ["overview", "upload", "saved docs and links"];

  // toast and its setter are passed through props from parent
  // keep for rendering in this scope via closure

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-br from-white via-[#FFFBEA]/30 to-white">
      {toast && (
        <div className="fixed right-6 top-6 z-50">
          <div className={`px-4 py-2 rounded-xl shadow-lg ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-gray-800 text-white'}`}>
            {toast.message}
          </div>
        </div>
      )}
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ChevronLeft size={16} />
            Back
          </button>
          <div className="w-px h-5 bg-gray-200" />
          <div>
            <h1 className="text-xl font-display font-bold text-gray-900">{project.name}</h1>
            <p className="text-xs text-gray-400">{project.members.join(", ")}</p>
          </div>
          <span className={`text-xs font-medium px-3 py-1 rounded-full ${STATUS_STYLES[project.status]}`}>
            {project.status}
          </span>
        </div>
        <button
          onClick={onUploadPpt}
          className="flex items-center gap-2 bg-[#F5C400] hover:bg-yellow-400 text-gray-900 font-semibold text-sm px-4 py-2 rounded-xl transition-colors shadow-sm"
        >
          <Upload size={15} />
          Upload PPT
        </button>
      </div>

      {/* Tabs */}
      <div className="px-8 pt-4 border-b border-gray-100 flex gap-1">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize rounded-t-lg transition-colors border-b-2 ${
              activeTab === tab
                ? "text-yellow-700 border-yellow-400 bg-yellow-50/60"
                : "text-gray-500 border-transparent hover:text-gray-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="px-8 py-6">
        {activeTab === "overview" && <OverviewTab project={project} />}
        {activeTab === "upload" && <UploadTab project={project} onUploadPpt={onUploadPpt} />}
        {activeTab === "saved docs and links" && (
          <SavedDocsLinksTab
            project={project}
            onSaveLink={onSaveLink}
            onDeleteLink={onDeleteLink}
            onDeleteDocument={onDeleteDocument}
            canManageDocuments={canManageDocuments}
            toast={toast}
            setToast={setToast}
          />
        )}
      </div>

      {/* PPT Upload Modal */}
      {pptModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-96 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-gray-900">Upload File</h3>
              <button onClick={() => setPptModal(false)}>
                <X size={18} className="text-gray-400 hover:text-gray-700" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-5"> 
              Upload a presentation, Excel, or CSV file for <strong>{project.name}</strong>.
            </p>
            <div
              className="border-2 border-dashed border-yellow-300 rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer hover:bg-yellow-50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={32} className="text-yellow-400" />
              <p className="text-sm font-medium text-gray-700">Click to browse</p>
              <p className="text-xs text-gray-400">.pptx, .ppt, .pdf accepted</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="*/*"
              className="hidden"
              onChange={handlePptUpload}
            />
            {project.pptName && (
              <div className="mt-3 flex items-center gap-2 text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                <FileText size={14} className="text-blue-500" />
                Current: {project.pptName}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function OverviewTab({ project }) {
  return (
    <div className="grid grid-cols-5 gap-6">
      {/* Left: About + Progress */}
      <div className="col-span-3 space-y-4">
        <InfoCard title="About the Project" icon={<BookOpen size={15} />}>
          <p className="text-sm text-gray-600 leading-relaxed">{project.objective}</p>
        </InfoCard>

        <InfoCard title="What we're working on" icon={<Target size={15} />}>
          <ul className="space-y-2">
            {project.workingOn.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 mt-2 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </InfoCard>

        <InfoCard title="Methodology" icon={<BookOpen size={15} />}>
          <ul className="space-y-1.5">
            {project.methodology.map((m, i) => (
              <li key={i} className="text-sm text-gray-600 flex gap-2">
                <span className="text-yellow-500 font-bold shrink-0">{i + 1}.</span>
                {m}
              </li>
            ))}
          </ul>
        </InfoCard>

        <InfoCard title="Deliverables" icon={<CheckSquare size={15} />}>
          <div className="space-y-2">
            {project.deliverables.map((d, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="w-5 h-5 rounded-full bg-yellow-100 border border-yellow-200 flex items-center justify-center text-[10px] font-bold text-yellow-700">
                  {i + 1}
                </span>
                <span className="text-gray-700">{d}</span>
              </div>
            ))}
          </div>
        </InfoCard>
      </div>

      {/* Right: Charts + Progress */}
      <div className="col-span-2 space-y-4">
        {/* Progress */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold text-gray-600">Overall Progress</span>
            <span className="text-lg font-display font-bold text-gray-900">{project.progress}%</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${project.progress}%`,
                background: "linear-gradient(90deg, #F5C400, #E6B800)",
              }}
            />
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Users size={13} className="text-gray-400" />
            <span className="text-xs text-gray-500">{project.members.join(" · ")}</span>
          </div>
        </div>

        {/* Charts */}
        <ProjectCharts project={project} />
      </div>
    </div>
  );
}

function ProjectCharts({ project }) {
  const { chartData, id } = project;

  if (id === 1) {
    return (
      <>
        <ChartCard title="Forecast vs Actual (MW)">
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={chartData.bar}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} unit="MW" />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="forecast" stroke="#F5C400" strokeWidth={2} dot={{ r: 3 }} name="Forecast" />
              <Line type="monotone" dataKey="actual" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} name="Actual" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Weekly Load Pattern">
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={chartData.line} barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} unit="MW" />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 11 }} />
              <Bar dataKey="load" fill="#F5C400" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </>
    );
  }

  if (id === 2) {
    return (
      <>
        <ChartCard title="Consumer Segmentation">
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={chartData.pie} cx="50%" cy="50%" innerRadius={35} outerRadius={65} dataKey="value" strokeWidth={0}>
                {chartData.pie.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip formatter={(v) => [`${v}%`]} contentStyle={{ borderRadius: 8, fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Avg Consumption by Segment (kWh)">
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={chartData.bar} barSize={22}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
              <XAxis dataKey="segment" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 11 }} />
              <Bar dataKey="avgKwh" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Avg kWh" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </>
    );
  }

  if (id === 3) {
    return (
      <>
        <ChartCard title="AT&C Loss % by Division">
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData.bar} barSize={18}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
              <XAxis dataKey="division" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} unit="%" />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 11 }} />
              <Bar dataKey="loss" radius={[4, 4, 0, 0]}>
                {chartData.bar.map((e, i) => (
                  <Cell key={i} fill={e.loss > 35 ? "#EF4444" : e.loss > 25 ? "#F59E0B" : "#10B981"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Loss Causes Breakdown">
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie data={chartData.pie} cx="50%" cy="50%" innerRadius={30} outerRadius={60} dataKey="value" strokeWidth={0}>
                {chartData.pie.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </>
    );
  }

  if (id === 4) {
    return (
      <ChartCard title="Complaint Categories">
        <div className="flex flex-col items-center justify-center h-36 text-center">
          <AlertCircle size={28} className="text-gray-300 mb-2" />
          <p className="text-xs text-gray-400 font-medium">Data collection in progress</p>
          <p className="text-[11px] text-gray-300 mt-1">Charts will appear once data is available</p>
        </div>
      </ChartCard>
    );
  }

  return null;
}

function UploadTab({ project, onUploadPpt }) {
  return (
    <div className="max-w-xl space-y-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Upload</p>
        <div
          onClick={onUploadPpt}
          className="border-2 border-dashed border-yellow-200 rounded-2xl p-8 flex flex-col items-center gap-3 cursor-pointer hover:bg-yellow-50 transition-colors group"
        >
          <div className="w-12 h-12 rounded-2xl bg-yellow-100 group-hover:bg-yellow-200 flex items-center justify-center transition-colors">
            <Upload size={20} className="text-yellow-600" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-700">Upload a Presentation</p>
            <p className="text-xs text-gray-400 mt-1">
              Click to upload .pptx, .ppt, or .pdf files for {project.name}
            </p>
          </div>
          <span className="text-xs bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full font-medium">
            Upload PPT
          </span>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-yellow-50/40 p-4 text-sm text-gray-600">
        <p className="font-semibold text-gray-700 mb-1">Upload section</p>
        <p>Upload a new document or presentation for this project. Files uploaded here will appear in the saved documents section.</p>
      </div>
    </div>
  );
}

function SavedDocsLinksTab({ project, onSaveLink, onDeleteLink, onDeleteDocument, canManageDocuments, setToast }) {
  const [linkUrl, setLinkUrl] = useState("");
  const [linkName, setLinkName] = useState("");
  const [linkError, setLinkError] = useState("");
  const [previewDoc, setPreviewDoc] = useState(null);

  const handleSaveLink = () => {
    if (!linkUrl.trim()) { setLinkError("Please enter a URL."); return; }
    try { new URL(linkUrl.trim()); } catch {
      setLinkError("Please enter a valid URL (include https://)."); return;
    }
    onSaveLink({ url: linkUrl.trim(), name: linkName.trim() || linkUrl.trim() });
    setLinkUrl("");
    setLinkName("");
    setLinkError("");
    if (setToast) {
      setToast({ type: 'success', message: 'Link saved' });
      setTimeout(() => setToast(null), 3000);
    }
  };

  const confirmDelete = (label, callback) => {
    if (window.confirm(`Delete ${label}?`)) {
      callback();
    }
  };

  const getPreviewSource = (doc) => {
    if (!doc?.url) return null;
    const name = (doc.name || "").toLowerCase();
    const ext = name.split(".").pop() || "";
    const imageExts = ["png", "jpg", "jpeg", "gif", "webp", "svg"];
    const officeExts = ["doc", "docx", "ppt", "pptx", "xls", "xlsx", "csv", "txt", "xlsm", "xltx"];

    if (imageExts.includes(ext)) return { src: doc.url, type: "image" };
    if (ext === "pdf") return { src: doc.url, type: "pdf" };
    if (officeExts.includes(ext)) return { src: `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(doc.url)}`, type: "office" };
    return { src: doc.url, type: "fallback" };
  };

  return (
    <div className="max-w-xl space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Saved documents</p>
        {project.documents && project.documents.length > 0 ? (
          <div className="space-y-2">
            {project.documents.map((doc) => (
              <div key={doc.id} className="flex items-center gap-3 bg-gray-50 rounded-xl border border-gray-100 px-4 py-3 group">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                  <FileText size={15} className="text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{doc.name}</p>
                  <p className="text-xs text-gray-400">{doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleString() : "Uploaded recently"}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewDoc(doc)}
                  className="text-xs font-semibold text-gray-700 hover:text-yellow-600 shrink-0 px-2 inline-flex items-center gap-1"
                >
                  <Eye size={13} /> Preview
                </button>
                <a href={doc.url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-blue-600 hover:underline shrink-0 px-2">
                  Open ↗
                </a>
                {canManageDocuments && (
                  <button
                    onClick={() => confirmDelete(`"${doc.name}"`, () => onDeleteDocument(doc.id, doc.path))}
                    className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 text-gray-300 hover:text-red-400"
                    title="Delete document"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-gray-400">No documents uploaded for this project yet.</div>
        )}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Saved links</p>

        {project.links && project.links.length > 0 && (
          <div className="space-y-2 mb-3">
            {project.links.map((link, i) => (
              <div
                key={i}
                className="flex items-center gap-3 bg-gray-50 rounded-xl border border-gray-100 px-4 py-3 group"
              >
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                  <LinkIcon size={15} className="text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{link.name}</p>
                  <p className="text-xs text-gray-400 truncate">{link.url}</p>
                </div>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-blue-600 hover:underline shrink-0 px-2"
                >
                  Open ↗
                </a>
                {canManageDocuments && (
                  <button
                    onClick={() => confirmDelete(`"${link.name || link.url}"`, () => onDeleteLink(i))}
                    className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 text-gray-300 hover:text-red-400"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="bg-gray-50 rounded-2xl border border-gray-200 p-4 space-y-2.5">
          <p className="text-xs font-semibold text-gray-600">Add a Link</p>
          <input
            type="text"
            placeholder="Link name (e.g. Project Report — Drive)"
            value={linkName}
            onChange={e => setLinkName(e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-yellow-300 focus:border-transparent"
          />
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="https://drive.google.com/... or any URL"
              value={linkUrl}
              onChange={e => { setLinkUrl(e.target.value); setLinkError(""); }}
              onKeyDown={e => e.key === "Enter" && handleSaveLink()}
              className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-yellow-300 focus:border-transparent"
            />
            <button
              onClick={handleSaveLink}
              className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold text-xs px-4 py-2 rounded-xl transition-colors shrink-0"
            >
              Save Link
            </button>
          </div>
          {linkError && <p className="text-xs text-red-500">{linkError}</p>}
          <p className="text-[10px] text-gray-400">Press Enter or click Save Link. Name is optional.</p>
        </div>
      </div>

      {previewDoc && (() => {
        const preview = getPreviewSource(previewDoc);
        return (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-5xl rounded-2xl bg-white shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-gray-800">Preview</p>
                  <p className="text-xs text-gray-500">{previewDoc.name}</p>
                </div>
                <button type="button" onClick={() => setPreviewDoc(null)} className="text-gray-400 hover:text-gray-700">
                  <X size={18} />
                </button>
              </div>
              <div className="bg-gray-50 p-3 min-h-[420px] max-h-[70vh] overflow-auto">
                {preview?.type === "image" ? (
                  <img src={preview.src} alt={previewDoc.name} className="mx-auto max-h-[65vh] object-contain" />
                ) : preview?.type === "pdf" || preview?.type === "office" ? (
                  <iframe title={previewDoc.name} src={preview.src} className="w-full h-[65vh] rounded-xl border border-gray-200" />
                ) : (
                  <div className="flex h-[65vh] flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white text-center text-sm text-gray-500">
                    <FileText size={28} className="mb-2 text-gray-300" />
                    <p className="font-medium text-gray-700">Preview is not available for this file type.</p>
                    <p className="mt-1">You can still open it directly using the link above.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function InfoCard({ title, icon, children }) {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-3 text-gray-700 font-semibold text-sm">
        <span className="text-yellow-600">{icon}</span>
        {title}
      </div>
      {children}
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-100 shadow-sm p-4">
      <p className="text-xs font-semibold text-gray-600 mb-3">{title}</p>
      {children}
    </div>
  );
}
