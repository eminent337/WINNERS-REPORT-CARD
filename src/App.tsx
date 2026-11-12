/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  Printer,
  Download,
  FolderDown,
  FileDown,
  Plus,
  Trash2,
  Check,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  FileText,
  Users,
  Sliders,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Search,
} from 'lucide-react';
import {
  DEFAULT_SUBJECTS,
  INITIAL_SCHOOL_CONFIG,
  INITIAL_STUDENTS,
  SchoolConfig,
  StudentReport,
  TopHeaderLayoutStyle,
  computeStudentSummary,
  getBeceGrade,
} from './types/report';
import { ReportCardSheet } from './components/ReportCardSheet';
import { downloadReportAsDocxSync } from './utils/exportDocx';
import {
  downloadAllReportsAsFolderZipSync,
  downloadCombinedRosterPdfSync,
  downloadSingleStudentPdfSync,
  preloadPdfAssets,
  printReportsPdfSync,
} from './utils/exportPdf';

type EditorTab = 'roster' | 'layout' | 'student' | 'scores';

export default function App() {
  const [config, setConfig] = useState<SchoolConfig>(INITIAL_SCHOOL_CONFIG);
  const [students, setStudents] = useState<StudentReport[]>(INITIAL_STUDENTS);
  const [activeStudentId, setActiveStudentId] = useState<string>(
    INITIAL_STUDENTS[0].id
  );
  const [activeTab, setActiveTab] = useState<EditorTab>('roster');
  const [zoom, setZoom] = useState<number>(0.88);
  const [printBatchMode, setPrintBatchMode] = useState<boolean>(false);
  const [newStudentName, setNewStudentName] = useState<string>('');
  const [rosterSearch, setRosterSearch] = useState<string>('');
  const [folderName, setFolderName] = useState<string>(
    'MOCK_2_REPORTS_BASIC_NINE'
  );
  const [isExportingDocx, setIsExportingDocx] = useState<boolean>(false);
  const [isExportingZip, setIsExportingZip] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    preloadPdfAssets();
  }, []);

  const showTransientStatus = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => {
      setStatusMessage((prev) => (prev === msg ? null : prev));
    }, 5000);
  };

  const activeIndex = Math.max(
    0,
    students.findIndex((s) => s.id === activeStudentId)
  );
  const activeStudent = students[activeIndex] || students[0];
  const activeSummary = computeStudentSummary(
    activeStudent,
    config.gesScaleStyle || 'ges-standard'
  );

  const filteredStudents = students.filter((s) => {
    const q = rosterSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      s.name.toLowerCase().includes(q) ||
      String(s.serialNumber).includes(q)
    );
  });

  const handleUpdateConfig = (partial: Partial<SchoolConfig>) => {
    setConfig((prev) => ({ ...prev, ...partial }));
  };

  const handleUpdateStudent = (updated: StudentReport) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === updated.id ? updated : s))
    );
  };

  const handleClearScores = () => {
    handleUpdateStudent({
      ...activeStudent,
      subjects: activeStudent.subjects.map((sub) => ({ ...sub, score: '' })),
      manualTotalMark: '',
      manualAggregate: '',
      manualRawScore: '',
      manualBestTwoSubjects: '',
    });
  };

  const handleLoadSampleScores = () => {
    const sampleScores: Record<string, string> = {
      eng: '82',
      math: '86',
      sci: '78',
      soc: '80',
      rme: '85',
      cted: '74',
      comp: '81',
      arts: '76',
      twi: '72',
      fre: '67',
    };
    handleUpdateStudent({
      ...activeStudent,
      subjects: activeStudent.subjects.map((sub) => ({
        ...sub,
        score: sampleScores[sub.id] ?? '75',
      })),
    });
    handleUpdateConfig({ showScoresOnSheet: true, autoCalculateGrades: true });
  };

  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newStudentName.trim().toUpperCase();
    if (!trimmed) return;
    const nextSn = students.length + 1;
    const newStu: StudentReport = {
      id: `stu-${Date.now()}`,
      serialNumber: nextSn,
      name: trimmed,
      studentClass: activeStudent.studentClass || 'BASIC NINE (9)',
      noOnRoll: String(nextSn),
      position: '',
      subjects: DEFAULT_SUBJECTS.map((s) => ({ ...s, score: '' })),
      manualTotalMark: '',
      manualAggregate: '',
      manualRawScore: '',
      manualBestTwoSubjects: '',
      classTeacherRemarks: '',
      classTeacherSignature: '',
      schoolFees: '',
      arrears: '',
      totalFees: '',
      headmasterRemark: '',
    };
    const nextList = [...students, newStu].map((s, idx) => ({
      ...s,
      serialNumber: idx + 1,
      noOnRoll: String(students.length + 1),
    }));
    setStudents(nextList);
    setActiveStudentId(newStu.id);
    setNewStudentName('');
  };

  const handleDeleteStudent = (id: string) => {
    if (students.length <= 1) return;
    const filtered = students
      .filter((s) => s.id !== id)
      .map((s, idx, arr) => ({
        ...s,
        serialNumber: idx + 1,
        noOnRoll: String(arr.length),
      }));
    setStudents(filtered);
    if (activeStudentId === id) {
      setActiveStudentId(filtered[0].id);
    }
  };

  const handleResetAll41Candidates = () => {
    setStudents(INITIAL_STUDENTS);
    setActiveStudentId(INITIAL_STUDENTS[0].id);
    showTransientStatus(
      'Restored all 41 BECE 2027 candidates from the Winners Family School Bio Data Form.'
    );
  };

  const handlePrint = (batch = printBatchMode) => {
    const listToPrint = batch ? students : [activeStudent];
    const filename = printReportsPdfSync(config, listToPrint, activeIndex);
    showTransientStatus(
      batch
        ? `Opened print view for all ${students.length} reports (${filename})`
        : `Opened print view for ${activeStudent.name} (${filename})`
    );
  };

  // Direct 1-click Word (.docx) save via server Content-Disposition: attachment
  const handleDownloadDocx = (batch = false) => {
    setIsExportingDocx(true);
    const listToExport = batch ? students : [activeStudent];
    const filename = downloadReportAsDocxSync(
      config,
      listToExport,
      batch ? folderName : undefined
    );
    showTransientStatus(`Download started: ${filename}`);
    setTimeout(() => setIsExportingDocx(false), 800);
  };

  // Direct 1-click Single Student PDF save via server Content-Disposition: attachment
  const handleDownloadCurrentStudentPdf = () => {
    const filename = downloadSingleStudentPdfSync(
      config,
      activeStudent,
      activeIndex
    );
    showTransientStatus(`Download started: ${filename}`);
  };

  // Direct 1-click All 41 Students PDF save via server Content-Disposition: attachment
  const handleDownloadAll41Pdf = () => {
    const filename = downloadCombinedRosterPdfSync(
      config,
      students,
      folderName
    );
    showTransientStatus(`Download started: ${filename}`);
  };

  // Direct 1-click Folder (.ZIP) containing 41 separate PDFs save via server Content-Disposition: attachment
  const handleDownloadAll41FolderZip = () => {
    setIsExportingZip(true);
    const filename = downloadAllReportsAsFolderZipSync(
      config,
      students,
      folderName
    );
    showTransientStatus(
      `Download started: ${filename} (${students.length} individual PDFs)`
    );
    setTimeout(() => setIsExportingZip(false), 1200);
  };

  const layoutOptions: {
    id: TopHeaderLayoutStyle;
    title: string;
    description: string;
  }[] = [
    {
      id: 'symmetrical-3row',
      title: 'Balanced 3-Row Grid (Recommended)',
      description:
        'Clean 2-column alignment: Row 1 (Name & Class), Row 2 (No. on Roll & Position), Row 3 (Year & Date).',
    },
    {
      id: 'compact-2row',
      title: 'Compact 2-Row Executive',
      description:
        'Row 1 features Name & Class; Row 2 aligns No. on Roll, Position, Year, and Date on a single line.',
    },
    {
      id: 'card-boxed',
      title: 'Framed Structured Table',
      description:
        'Encases the top student metadata inside a crisp bordered table matching the examination grid below.',
    },
    {
      id: 'with-aggregates',
      title: 'Top Header with Aggregate & Raw Score',
      description:
        'Places Position, Aggregate, and Raw Score directly in Row 3 of the top student section.',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 text-slate-900">
      {/* TOP NAVIGATION BAR (3-Zone Contract, Hidden in Print) */}
      <header className="no-print sticky top-0 z-30 flex items-center justify-between gap-8 px-6 py-3.5 bg-white border-b border-slate-200">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('roster');
          }}
          className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
        >
          Winners Family School
        </a>

        {/* Zone 2: 4 single-line navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <button
            type="button"
            onClick={() => setActiveTab('roster')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 cursor-pointer ${
              activeTab === 'roster'
                ? 'border-slate-900 text-slate-900 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            BECE Roster ({students.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('layout')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 cursor-pointer ${
              activeTab === 'layout'
                ? 'border-slate-900 text-slate-900 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Top Layout
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('student')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 cursor-pointer ${
              activeTab === 'student'
                ? 'border-slate-900 text-slate-900 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Student Details
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('scores')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 cursor-pointer ${
              activeTab === 'scores'
                ? 'border-slate-900 text-slate-900 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Subject Scores
          </button>
        </nav>

        {/* Zone 3: 1 primary action (Direct 1-Click PDF Download of All 41 Students) */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={handleDownloadAll41Pdf}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Download All {students.length} PDFs</span>
          </button>
        </div>
      </header>

      {/* MAIN WORKSPACE */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* LEFT CONTROL PANEL (Hidden in Print) */}
        <aside className="no-print w-full lg:w-[420px] xl:w-[450px] shrink-0 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col lg:h-[calc(100vh-57px)] lg:sticky lg:top-[57px]">
          {/* Segmented Tab Switcher */}
          <div className="p-3 border-b border-slate-200 bg-slate-50/70">
            <div className="grid grid-cols-4 gap-1 p-1 bg-slate-200/75 rounded-lg">
              <button
                type="button"
                onClick={() => setActiveTab('roster')}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'roster'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Roster ({students.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('layout')}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'layout'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Top Layout</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('student')}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'student'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Student</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('scores')}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'scores'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Scores</span>
              </button>
            </div>
          </div>

          {/* Scrollable Control Deck */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {/* TAB: BECE 2027 CLASS ROSTER & DIRECT DOWNLOADS */}
            {activeTab === 'roster' && (
              <div className="space-y-5">
                {/* DIRECT SAVE / DOWNLOAD BOX */}
                <div className="p-4 rounded-xl bg-slate-900 text-white space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                      Save Reports to Computer ({students.length} Students)
                    </span>
                    <span className="text-[11px] text-slate-400 tabular-nums">
                      Direct Save
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">
                      File / Folder Name Prefix
                    </label>
                    <input
                      type="text"
                      value={folderName}
                      onChange={(e) => setFolderName(e.target.value)}
                      placeholder="e.g. MOCK_2_REPORTS_BASIC_NINE"
                      className="w-full px-3 py-1.5 text-xs font-mono font-semibold bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  {statusMessage && (
                    <div className="p-2 rounded-lg bg-emerald-950 border border-emerald-700 text-emerald-200 text-xs font-medium">
                      {statusMessage}
                    </div>
                  )}

                  {/* Direct 1-Click Save Buttons (No Modal Popups) */}
                  <div className="space-y-2 pt-1">
                    <button
                      type="button"
                      onClick={handleDownloadAll41Pdf}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors cursor-pointer"
                    >
                      <FileDown className="w-4 h-4" />
                      <span>
                        Download All {students.length} Reports (Single PDF)
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadAll41FolderZip}
                      disabled={isExportingZip}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-teal-700 hover:bg-teal-600 disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
                    >
                      <FolderDown className="w-4 h-4" />
                      <span>
                        {isExportingZip
                          ? 'Preparing 41 PDFs Folder (.ZIP)...'
                          : `Download Folder of ${students.length} Separate PDFs (.ZIP)`}
                      </span>
                    </button>

                    <div className="grid grid-cols-2 gap-2 pt-0.5">
                      <button
                        type="button"
                        onClick={() => handleDownloadDocx(false)}
                        disabled={isExportingDocx}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-600 disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>This Student Word</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDownloadDocx(true)}
                        disabled={isExportingDocx}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-100 bg-slate-800 hover:bg-slate-700 border border-slate-700 disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 text-blue-400" />
                        <span>All {students.length} Word (.docx)</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-0.5">
                      <button
                        type="button"
                        onClick={() => handlePrint(false)}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-900 bg-white hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print This Student</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handlePrint(true)}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-100 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Print All {students.length}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Search & Filter Candidates */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      BECE 2027 Candidates ({filteredStudents.length} of{' '}
                      {students.length})
                    </span>
                    <button
                      type="button"
                      onClick={handleResetAll41Candidates}
                      className="text-xs font-medium text-slate-600 hover:text-slate-900 underline cursor-pointer"
                    >
                      Reset 41 Names
                    </button>
                  </div>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search candidate by name or S/N (1–41)..."
                      value={rosterSearch}
                      onChange={(e) => setRosterSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900"
                    />
                  </div>

                  {/* Scrollable List of All 41 Students */}
                  <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
                    {filteredStudents.map((stu) => {
                      const isSelected = stu.id === activeStudent.id;
                      const sum = computeStudentSummary(
                        stu,
                        config.gesScaleStyle || 'ges-standard'
                      );
                      const idx = students.findIndex((s) => s.id === stu.id);
                      const rawDisp = stu.manualRawScore || sum.rawScoreBest6;
                      return (
                        <div
                          key={stu.id}
                          onClick={() => setActiveStudentId(stu.id)}
                          className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                            isSelected
                              ? 'border-slate-900 bg-slate-900/5 ring-1 ring-slate-900'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div className="min-w-0 pr-2 flex items-center gap-2.5">
                            <span
                              className={`w-6 h-6 rounded-md text-[11px] font-mono font-bold flex items-center justify-center shrink-0 tabular-nums ${
                                isSelected
                                  ? 'bg-slate-900 text-white'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {String(stu.serialNumber || idx + 1).padStart(
                                2,
                                '0'
                              )}
                            </span>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-900 truncate">
                                {stu.name}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {sum.hasAnyScore ? (
                                  <span>
                                    Pos: <strong>{stu.position || '—'}</strong> · Raw:{' '}
                                    <strong>{rawDisp}</strong> · Agg:{' '}
                                    <strong>{sum.aggregateBest6}</strong>
                                  </span>
                                ) : (
                                  <span>
                                    {stu.gender ? `${stu.gender} · ` : ''}Roll:{' '}
                                    {stu.noOnRoll || '41'} · Pending Scores
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const fname = downloadSingleStudentPdfSync(
                                  config,
                                  stu,
                                  idx
                                );
                                showTransientStatus(`Saving PDF: ${fname}`);
                              }}
                              title={`Download ${stu.name} PDF`}
                              className="px-2 py-1 text-[10px] font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              PDF
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const fname = downloadReportAsDocxSync(config, [stu]);
                                showTransientStatus(`Download started: ${fname}`);
                              }}
                              title={`Download ${stu.name} Word (.docx)`}
                              className="px-2 py-1 text-[10px] font-semibold text-blue-800 bg-blue-50 hover:bg-blue-100 rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              DOCX
                            </button>
                            {students.length > 1 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteStudent(stu.id);
                                }}
                                aria-label={`Remove ${stu.name}`}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Add Extra Candidate Form */}
                <form
                  onSubmit={handleAddStudent}
                  className="pt-3 border-t border-slate-200 space-y-2"
                >
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Add Additional Candidate
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter candidate full name..."
                      value={newStudentName}
                      onChange={(e) => setNewStudentName(e.target.value)}
                      className="flex-1 px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 uppercase"
                    />
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  </div>
                </form>

                {/* Browser Print All Pages Toggle */}
                <div className="pt-2 border-t border-slate-200">
                  <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                    <div>
                      <div className="text-xs font-semibold text-slate-900">
                        Preview &amp; Browser-Print All {students.length} Pages
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Stack all {students.length} report sheets on screen for direct printing
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={printBatchMode}
                      onChange={(e) => setPrintBatchMode(e.target.checked)}
                      className="w-4 h-4 accent-slate-900 rounded cursor-pointer"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* TAB 1: TOP LAYOUT & HEADER CONFIGURATION */}
            {activeTab === 'layout' && (
              <div className="space-y-6">
                {/* Summary of Applied Revisions */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Applied Report Card Revisions
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-700">
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>
                        Report heading updated to{' '}
                        <strong className="font-semibold text-slate-900">
                          MOCK 2 EXAMINATION REPORT
                        </strong>
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>
                        Removed <strong className="font-semibold">TERM: ONE</strong>,{' '}
                        <strong className="font-semibold">TERM ENDING</strong>,{' '}
                        <strong className="font-semibold">NEXT TERM BEGINS</strong>, and{' '}
                        <strong className="font-semibold">
                          TOTAL ATTENDANCE / OUT OF
                        </strong>
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>
                        Expanded subjects table height &amp; set{' '}
                        <strong className="font-semibold">Grade / Score</strong>{' '}
                        column dividers to{' '}
                        <strong className="font-semibold">
                          continuous straight lines
                        </strong>
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>
                        Loaded all{' '}
                        <strong className="font-semibold">
                          41 BECE 2027 Candidates
                        </strong>{' '}
                        for direct PDF &amp; Word download
                      </span>
                    </li>
                  </ul>
                </div>

                {/* Top Header Arrangement Style Selector */}
                <div className="space-y-2.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Top Section Organization Style
                  </label>
                  <div className="space-y-2">
                    {layoutOptions.map((opt) => {
                      const active = config.topLayout === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleUpdateConfig({ topLayout: opt.id })}
                          className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                            active
                              ? 'border-slate-900 bg-slate-900/4 ring-1 ring-slate-900'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-slate-900">
                              {opt.title}
                            </span>
                            <span
                              className={`w-4 h-4 rounded-full flex items-center justify-center border ${
                                active
                                  ? 'border-slate-900 bg-slate-900 text-white'
                                  : 'border-slate-300'
                              }`}
                            >
                              {active && <Check className="w-2.5 h-2.5" />}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                            {opt.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Report Header Text Fields */}
                <div className="space-y-3 pt-2 border-t border-slate-200">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Report Heading &amp; Dates
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Examination Report Title
                    </label>
                    <input
                      type="text"
                      value={config.reportTitle}
                      onChange={(e) =>
                        handleUpdateConfig({ reportTitle: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 font-semibold uppercase"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Academic Year
                      </label>
                      <input
                        type="text"
                        value={config.year}
                        onChange={(e) =>
                          handleUpdateConfig({ year: e.target.value })
                        }
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Report Date
                      </label>
                      <input
                        type="text"
                        value={config.date}
                        onChange={(e) =>
                          handleUpdateConfig({ date: e.target.value })
                        }
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 uppercase"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Department Subtitle
                    </label>
                    <input
                      type="text"
                      value={config.department}
                      onChange={(e) =>
                        handleUpdateConfig({ department: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Postal Address &amp; Telephone
                    </label>
                    <input
                      type="text"
                      value={config.postalAddress}
                      onChange={(e) =>
                        handleUpdateConfig({ postalAddress: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Location Line
                    </label>
                    <input
                      type="text"
                      value={config.location}
                      onChange={(e) =>
                        handleUpdateConfig({ location: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 uppercase"
                    />
                  </div>
                </div>

                {/* Sheet Formatting Options */}
                <div className="space-y-3 pt-2 border-t border-slate-200">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Table &amp; Grading Options
                  </div>

                  <label className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50/60 cursor-pointer">
                    <div>
                      <div className="text-xs font-semibold text-slate-900">
                        Continuous Straight Column Lines
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Draw full straight vertical borders for Exam Score and Grade columns
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={!config.showTableTickMarks}
                      onChange={(e) =>
                        handleUpdateConfig({
                          showTableTickMarks: !e.target.checked,
                        })
                      }
                      className="w-4 h-4 accent-slate-900 rounded cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50/60 cursor-pointer">
                    <div>
                      <div className="text-xs font-semibold text-slate-900">
                        Auto-Compute Grades &amp; Aggregate
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Automatically calculate Grade (1–9), Meaning, Total, and Best 6 Aggregate
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={config.autoCalculateGrades}
                      onChange={(e) =>
                        handleUpdateConfig({
                          autoCalculateGrades: e.target.checked,
                        })
                      }
                      className="w-4 h-4 accent-slate-900 rounded cursor-pointer"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* TAB 2: STUDENT DETAILS & BOTTOM REMARKS */}
            {activeTab === 'student' && (
              <div className="space-y-5">
                <div className="space-y-3">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Top Student Information (Candidate #{activeStudent.serialNumber})
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Student Full Name
                    </label>
                    <input
                      type="text"
                      value={activeStudent.name}
                      onChange={(e) =>
                        handleUpdateStudent({
                          ...activeStudent,
                          name: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 font-semibold uppercase"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Class
                      </label>
                      <input
                        type="text"
                        value={activeStudent.studentClass}
                        onChange={(e) =>
                          handleUpdateStudent({
                            ...activeStudent,
                            studentClass: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        No. on Roll
                      </label>
                      <input
                        type="text"
                        value={activeStudent.noOnRoll}
                        onChange={(e) =>
                          handleUpdateStudent({
                            ...activeStudent,
                            noOnRoll: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 uppercase tabular-nums"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Position in Class (Leave blank for hand-filling)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 1ST, 2ND, or leave empty"
                      value={activeStudent.position}
                      onChange={(e) =>
                        handleUpdateStudent({
                          ...activeStudent,
                          position: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 uppercase"
                    />
                  </div>
                </div>

                {/* Bottom Section Overrides */}
                <div className="space-y-3 pt-3 border-t border-slate-200">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Summary &amp; Remarks (Bottom Section)
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Aggregate (Override / Manual)
                      </label>
                      <input
                        type="text"
                        placeholder={
                          activeSummary.hasAnyScore
                            ? `Auto: ${activeSummary.aggregateBest6}`
                            : 'Blank line'
                        }
                        value={activeStudent.manualAggregate}
                        onChange={(e) =>
                          handleUpdateStudent({
                            ...activeStudent,
                            manualAggregate: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Raw Score (Override / Manual)
                      </label>
                      <input
                        type="text"
                        placeholder={
                          activeSummary.hasAnyScore
                            ? `Auto: ${activeSummary.rawScoreBest6}`
                            : 'Blank line'
                        }
                        value={activeStudent.manualRawScore}
                        onChange={(e) =>
                          handleUpdateStudent({
                            ...activeStudent,
                            manualRawScore: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 tabular-nums"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Best Two Subjects
                    </label>
                    <input
                      type="text"
                      placeholder={
                        activeSummary.hasAnyScore
                          ? `Auto: ${activeSummary.bestTwoSubjects}`
                          : 'Leave empty for blank line'
                      }
                      value={activeStudent.manualBestTwoSubjects}
                      onChange={(e) =>
                        handleUpdateStudent({
                          ...activeStudent,
                          manualBestTwoSubjects: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Class Teacher&apos;s Remarks
                    </label>
                    <input
                      type="text"
                      placeholder="Leave empty for blank line"
                      value={activeStudent.classTeacherRemarks}
                      onChange={(e) =>
                        handleUpdateStudent({
                          ...activeStudent,
                          classTeacherRemarks: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>



                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Headmaster&apos;s Remark
                    </label>
                    <input
                      type="text"
                      placeholder="Leave empty for official stamp / signature"
                      value={activeStudent.headmasterRemark}
                      onChange={(e) =>
                        handleUpdateStudent({
                          ...activeStudent,
                          headmasterRemark: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: SUBJECT SCORES & BECE AUTO-GRADER */}
            {activeTab === 'scores' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Exam Scores (0–100%)
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Leave scores empty for a blank print sheet, or enter marks to auto-grade.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={handleLoadSampleScores}
                      className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Fill Sample
                    </button>
                    <button
                      type="button"
                      onClick={handleClearScores}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Clear All</span>
                    </button>
                  </div>
                </div>

                {/* GES Standard Meaning Scale Selector */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    GES Standard Grading Meaning Style
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateConfig({ gesScaleStyle: 'ges-standard' })
                      }
                      className={`px-2.5 py-2 text-xs font-semibold rounded-lg border text-left transition-colors cursor-pointer ${
                        (config.gesScaleStyle || 'ges-standard') ===
                        'ges-standard'
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div>GES / BECE (1–9)</div>
                      <div className="text-[10px] opacity-80 font-normal">
                        HIGHEST, HIGHER, HIGH...
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateConfig({ gesScaleStyle: 'ges-remarks' })
                      }
                      className={`px-2.5 py-2 text-xs font-semibold rounded-lg border text-left transition-colors cursor-pointer ${
                        config.gesScaleStyle === 'ges-remarks'
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div>GES Remarks (1–9)</div>
                      <div className="text-[10px] opacity-80 font-normal">
                        EXCELLENT, VERY GOOD...
                      </div>
                    </button>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                        <th className="py-2.5 px-3">Subject (Twi Excluded)</th>
                        <th className="py-2.5 px-2 text-center w-20">Score</th>
                        <th className="py-2.5 px-2 text-center w-14">Grade</th>
                        <th className="py-2.5 px-3 text-right">Meaning</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {activeStudent.subjects.map((sub) => {
                        const num =
                          sub.score.trim() === '' ? NaN : Number(sub.score);
                        const valid = !Number.isNaN(num) && num >= 0 && num <= 100;
                        const info = valid
                          ? getBeceGrade(
                              num,
                              config.gesScaleStyle || 'ges-standard'
                            )
                          : null;

                        return (
                          <tr key={sub.id} className="hover:bg-slate-50/80">
                            <td className="py-2 px-3 font-medium text-slate-900">
                              <div>{sub.name}</div>
                              <div className="text-[10px] text-slate-400">
                                {sub.isCore ? 'Core Subject' : 'Elective'}
                              </div>
                            </td>
                            <td className="py-1.5 px-2 text-center">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                placeholder="—"
                                value={sub.score}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  handleUpdateStudent({
                                    ...activeStudent,
                                    subjects: activeStudent.subjects.map((s) =>
                                      s.id === sub.id ? { ...s, score: val } : s
                                    ),
                                  });
                                }}
                                className="w-16 px-2 py-1 text-center text-xs font-semibold bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900 tabular-nums"
                              />
                            </td>
                            <td className="py-2 px-2 text-center font-mono font-semibold text-slate-800 tabular-nums">
                              {info ? info.grade : '—'}
                            </td>
                            <td className="py-2 px-3 text-right font-medium text-slate-600">
                              {info ? info.meaning : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {activeSummary.hasAnyScore && (
                  <div className="p-3.5 rounded-xl bg-slate-900 text-white grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-slate-400">
                        Total Mark
                      </div>
                      <div className="text-base font-bold tabular-nums mt-0.5">
                        {activeSummary.totalMark}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-slate-400">
                        Best 6 Aggregate
                      </div>
                      <div className="text-base font-bold tabular-nums mt-0.5">
                        {activeSummary.aggregateBest6}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-slate-400">
                        Best 6 Raw Score
                      </div>
                      <div className="text-base font-bold tabular-nums mt-0.5">
                        {activeSummary.rawScoreBest6}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>

        {/* RIGHT A4 REPORT PREVIEW STAGE */}
        <main className="flex-1 flex flex-col items-center bg-slate-200/70 overflow-x-auto">
          {/* Stage Utility Toolbar (Hidden in Print) */}
          <div className="no-print w-full bg-white/90 backdrop-blur-xs border-b border-slate-200 px-6 py-2.5 flex flex-wrap items-center justify-between gap-4">
            {/* Student Prev / Next Switcher */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const prevIdx =
                    (activeIndex - 1 + students.length) % students.length;
                  setActiveStudentId(students[prevIdx].id);
                }}
                aria-label="Previous candidate"
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="text-xs text-slate-600 px-1">
                <span className="font-mono font-bold text-slate-900 tabular-nums">
                  {String(activeIndex + 1).padStart(2, '0')} /{' '}
                  {String(students.length).padStart(2, '0')}
                </span>
                <span className="mx-1.5" aria-hidden="true">
                  ·
                </span>
                <span className="font-semibold text-slate-900">
                  {activeStudent.name}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const nextIdx = (activeIndex + 1) % students.length;
                  setActiveStudentId(students[nextIdx].id);
                }}
                aria-label="Next candidate"
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Direct 1-Click Export & Zoom Controls */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Single Student PDF */}
              <button
                type="button"
                onClick={handleDownloadCurrentStudentPdf}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <FileDown className="w-3.5 h-3.5 text-emerald-700" />
                <span>PDF (This Student)</span>
              </button>

              {/* All 41 Students PDF */}
              <button
                type="button"
                onClick={handleDownloadAll41Pdf}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>All {students.length} PDFs</span>
              </button>

              {/* All 41 Students Folder (.ZIP) */}
              <button
                type="button"
                onClick={handleDownloadAll41FolderZip}
                disabled={isExportingZip}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <FolderDown className="w-3.5 h-3.5" />
                <span>
                  {isExportingZip ? 'Zipping...' : `Folder (${students.length} PDFs)`}
                </span>
              </button>

              {/* Save / Download DOCX Button */}
              <button
                type="button"
                onClick={() => handleDownloadDocx(printBatchMode)}
                disabled={isExportingDocx}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>
                  {isExportingDocx
                    ? 'Saving DOCX...'
                    : printBatchMode
                    ? `All ${students.length} Word (.docx)`
                    : 'Word (.docx)'}
                </span>
              </button>

              {/* Direct Print Button (AutoPrint PDF outside sandboxed iframe) */}
              <button
                type="button"
                onClick={() => handlePrint(printBatchMode)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>
                  {printBatchMode ? `Print All ${students.length}` : 'Print'}
                </span>
              </button>

              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() =>
                    setZoom((z) => Math.max(0.6, +(z - 0.1).toFixed(2)))
                  }
                  aria-label="Zoom out"
                  className="p-1 text-slate-600 hover:text-slate-900 rounded cursor-pointer"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs font-mono font-semibold px-2 text-slate-700 tabular-nums">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setZoom((z) => Math.min(1.15, +(z + 0.1).toFixed(2)))
                  }
                  aria-label="Zoom in"
                  className="p-1 text-slate-600 hover:text-slate-900 rounded cursor-pointer"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoom(1)}
                  className="px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:text-slate-900 border-l border-slate-200 cursor-pointer"
                >
                  100%
                </button>
              </div>
            </div>
          </div>

          {/* Printable A4 Sheet Container */}
          <div className="print-container py-8 px-4 flex flex-col items-center justify-start w-full">
            {printBatchMode ? (
              students.map((stu) => (
                <div
                  key={stu.id}
                  className="report-sheet-wrapper mb-10 last:mb-0 origin-top transition-transform"
                  style={{
                    transform: `scale(${zoom})`,
                    marginBottom: `${(zoom - 1) * 1123 + 32}px`,
                  }}
                >
                  <ReportCardSheet
                    config={config}
                    student={stu}
                    onUpdateStudent={handleUpdateStudent}
                    onUpdateConfig={handleUpdateConfig}
                  />
                </div>
              ))
            ) : (
              <div
                className="report-sheet-wrapper origin-top transition-transform"
                style={{
                  transform: `scale(${zoom})`,
                  marginBottom: `${(zoom - 1) * 1123 + 24}px`,
                }}
              >
                <ReportCardSheet
                  config={config}
                  student={activeStudent}
                  onUpdateStudent={handleUpdateStudent}
                  onUpdateConfig={handleUpdateConfig}
                />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
