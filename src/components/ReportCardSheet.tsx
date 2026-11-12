import React, { useState } from 'react';
import {
  SchoolConfig,
  StudentReport,
  computeStudentSummary,
} from '../types/report';

interface ReportCardSheetProps {
  config: SchoolConfig;
  student: StudentReport;
  onUpdateStudent?: (updated: StudentReport) => void;
  onUpdateConfig?: (updated: Partial<SchoolConfig>) => void;
  readOnly?: boolean;
}

export const ReportCardSheet: React.FC<ReportCardSheetProps> = ({
  config,
  student,
  onUpdateStudent,
  onUpdateConfig,
  readOnly = false,
}) => {
  const [crestError, setCrestError] = useState(false);
  const summary = computeStudentSummary(
    student,
    config.gesScaleStyle || 'ges-standard'
  );

  const effectiveYear = student.yearOverride !== undefined ? student.yearOverride : config.year;
  const effectiveDate = student.dateOverride !== undefined ? student.dateOverride : config.date;

  const displayTotalMark =
    student.manualTotalMark !== ''
      ? student.manualTotalMark
      : config.showScoresOnSheet && config.autoCalculateGrades && summary.hasAnyScore
      ? summary.totalMark
      : '';

  const displayAggregate =
    student.manualAggregate !== ''
      ? student.manualAggregate
      : config.showScoresOnSheet && config.autoCalculateGrades && summary.hasAnyScore
      ? summary.aggregateBest6
      : '';

  const displayRawScore =
    student.manualRawScore !== ''
      ? student.manualRawScore
      : config.showScoresOnSheet && config.autoCalculateGrades && summary.hasAnyScore
      ? summary.rawScoreBest6
      : '';

  const displayBestTwo =
    student.manualBestTwoSubjects !== ''
      ? student.manualBestTwoSubjects
      : config.showScoresOnSheet && config.autoCalculateGrades && summary.hasAnyScore
      ? summary.bestTwoSubjects
      : '';

  const nameLen = student.name.trim().length;
  const nameFontSize =
    nameLen > 40
      ? '10px'
      : nameLen > 34
      ? '10.8px'
      : nameLen > 28
      ? '11.5px'
      : '12.5px';

  const updateField = <K extends keyof StudentReport>(field: K, value: StudentReport[K]) => {
    if (!onUpdateStudent || readOnly) return;
    onUpdateStudent({
      ...student,
      [field]: value,
    });
  };

  const updateSubjectScore = (subjectId: string, newScore: string) => {
    if (!onUpdateStudent || readOnly) return;
    onUpdateStudent({
      ...student,
      subjects: student.subjects.map((sub) =>
        sub.id === subjectId ? { ...sub, score: newScore } : sub
      ),
    });
  };

  return (
    <div className="report-sheet relative bg-white text-black mx-auto shadow-2xl print:shadow-none">
      {/* 1. Outer Dark Navy Border (#14213d) */}
      <div
        className="pointer-events-none absolute"
        style={{
          left: '40.5px',
          top: '32.5px',
          width: '713px',
          height: '1057px',
          border: '3.5px solid #14213d',
          borderRadius: '7px',
        }}
      />

      {/* 2. Middle Navy Border (#14213d) */}
      <div
        className="pointer-events-none absolute"
        style={{
          left: '59px',
          top: '51px',
          width: '676px',
          height: '1020px',
          border: '2px solid #14213d',
          borderRadius: '5px',
        }}
      />

      {/* 3. Inner Fine Black Border */}
      <div
        className="pointer-events-none absolute"
        style={{
          left: '67.5px',
          top: '60.5px',
          width: '658px',
          height: '1002px',
          border: '1px solid #000000',
          borderRadius: '3px',
        }}
      />

      {/* 4. Four Corner Ornamental Diamonds (❖) with White Corner Masks */}
      {/* Top-Left Diamond */}
      <div
        className="pointer-events-none absolute bg-white flex items-center justify-center leading-none select-none"
        style={{
          left: '48px',
          top: '41px',
          width: '22px',
          height: '23px',
          color: '#14213d',
          fontSize: '21px',
        }}
      >
        &#10070;
      </div>
      {/* Top-Right Diamond */}
      <div
        className="pointer-events-none absolute bg-white flex items-center justify-center leading-none select-none"
        style={{
          left: '724px',
          top: '41px',
          width: '22px',
          height: '23px',
          color: '#14213d',
          fontSize: '21px',
        }}
      >
        &#10070;
      </div>
      {/* Bottom-Left Diamond */}
      <div
        className="pointer-events-none absolute bg-white flex items-center justify-center leading-none select-none"
        style={{
          left: '48px',
          top: '1058px',
          width: '22px',
          height: '23px',
          color: '#14213d',
          fontSize: '21px',
        }}
      >
        &#10070;
      </div>
      {/* Bottom-Right Diamond */}
      <div
        className="pointer-events-none absolute bg-white flex items-center justify-center leading-none select-none"
        style={{
          left: '724px',
          top: '1058px',
          width: '22px',
          height: '23px',
          color: '#14213d',
          fontSize: '21px',
        }}
      >
        &#10070;
      </div>

      {/* Main Report Content Area (x: 81px to 713px => width: 632px) */}
      <div
        className="relative flex flex-col justify-between"
        style={{
          paddingLeft: '81px',
          paddingRight: '81px',
          paddingTop: '69px',
          paddingBottom: '68px',
          height: '1123px',
        }}
      >
        {/* TOP SECTION: School Header + Report Title + Organized Student Metadata */}
        <div>
          {/* School Emblem & Name Header */}
          <div className="relative flex items-start" style={{ minHeight: '86px' }}>
            {/* School Crest on Left */}
            <div
              className="shrink-0 flex items-center justify-center"
              style={{ width: '84px', height: '86px' }}
            >
              {!crestError ? (
                <img
                  src="/assets/school_crest.png"
                  alt="Winners Family School Crest"
                  referrerPolicy="no-referrer"
                  onError={() => setCrestError(true)}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-20 h-20 border-2 border-black flex flex-col items-center justify-center text-center p-1 text-[8px] font-bold leading-tight">
                  <span>WINNERS</span>
                  <span>FAMILY SCHOOL</span>
                </div>
              )}
            </div>

            {/* Centered School Title, Department, Address & Location */}
            <div className="flex-1 flex flex-col items-center text-center pl-2">
              {config.schoolName.trim().toUpperCase() === 'WINNERS FAMILY SCHOOL' ? (
                <img
                  src="/assets/school_title.svg"
                  alt="WINNERS FAMILY SCHOOL"
                  className="h-[32px] w-auto object-contain mt-1.5 mb-1 select-none"
                />
              ) : (
                <h1
                  className="text-[31px] font-black tracking-wide text-black uppercase leading-none mt-1 mb-1"
                  style={{ fontFamily: "Algerian, 'Cinzel Decorative', Georgia, serif" }}
                >
                  {config.schoolName}
                </h1>
              )}

              <div
                className="font-black text-black uppercase tracking-wider leading-tight mt-0.5"
                style={{
                  fontSize: '17.3px',
                  fontFamily: "'Arial Black', Impact, Arial, sans-serif",
                }}
              >
                {config.department}
              </div>

              <div
                className="text-black uppercase tracking-normal mt-1.5 leading-snug"
                style={{ fontSize: '11.4px', fontFamily: 'Arial, Helvetica, sans-serif' }}
              >
                {config.postalAddress}
              </div>

              <div
                className="text-black uppercase tracking-normal leading-snug"
                style={{ fontSize: '11.4px', fontFamily: 'Arial, Helvetica, sans-serif' }}
              >
                {config.location}
              </div>
            </div>
          </div>

          {/* Report Title: MOCK 2 EXAMINATION REPORT */}
          <div className="mt-3 mb-4 text-center">
            <div className="inline-block border-b-[1.5px] border-black pb-[1px]">
              {!readOnly && onUpdateConfig ? (
                <input
                  type="text"
                  value={config.reportTitle}
                  onChange={(e) => onUpdateConfig({ reportTitle: e.target.value })}
                  aria-label="Examination Report Title"
                  className="text-center font-bold uppercase text-black bg-transparent focus:outline-none focus:bg-amber-50/60 print:bg-transparent tracking-wide"
                  style={{
                    fontSize: '13.5px',
                    width: `${Math.max(config.reportTitle.length + 2, 26)}ch`,
                  }}
                />
              ) : (
                <span
                  className="font-bold uppercase text-black tracking-wide"
                  style={{ fontSize: '13.5px' }}
                >
                  {config.reportTitle}
                </span>
              )}
            </div>
          </div>

          {/* ORGANIZED TOP STUDENT METADATA SECTION */}
          {/* (Removed: TERM: ONE, TERM ENDING, NEXT TERM BEGINS, TOTAL ATTENDANCE / OUT OF) */}
          {config.topLayout === 'symmetrical-3row' && (
            <div className="mt-2 mb-3 space-y-3.5 text-[12.7px] leading-none">
              {/* Row 1: NAME (Left, 60%) & CLASS (Right, 40%) */}
              <div className="grid grid-cols-12 gap-5 items-end">
                <div className="col-span-7 flex items-end">
                  <span className="font-bold uppercase text-black shrink-0 pr-2">
                    NAME:
                  </span>
                  <div className="flex-1 border-b border-black pb-[2px]">
                    <input
                      type="text"
                      readOnly={readOnly}
                      value={student.name}
                      onChange={(e) => updateField('name', e.target.value)}
                      style={{ fontSize: nameFontSize }}
                      className="w-full bg-transparent text-black font-normal uppercase pl-1 focus:outline-none focus:bg-amber-50/70 print:bg-transparent"
                    />
                  </div>
                </div>

                <div className="col-span-5 flex items-end">
                  <span className="font-bold uppercase text-black shrink-0 pr-2">
                    CLASS:
                  </span>
                  <div className="flex-1 border-b border-black pb-[2px]">
                    <input
                      type="text"
                      readOnly={readOnly}
                      value={student.studentClass}
                      onChange={(e) => updateField('studentClass', e.target.value)}
                      className="w-full bg-transparent text-black font-normal uppercase pl-1 focus:outline-none focus:bg-amber-50/70 print:bg-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Row 2: NO. ON ROLL (Left) & POSITION (Right) */}
              <div className="grid grid-cols-12 gap-5 items-end">
                <div className="col-span-7 flex items-end">
                  <span className="font-bold uppercase text-black shrink-0 pr-2">
                    NO. ON ROLL:
                  </span>
                  <div className="flex-1 border-b border-black pb-[2px]">
                    <input
                      type="text"
                      readOnly={readOnly}
                      value={student.noOnRoll}
                      onChange={(e) => updateField('noOnRoll', e.target.value)}
                      className="w-full bg-transparent text-black font-normal uppercase pl-1 focus:outline-none focus:bg-amber-50/70 print:bg-transparent"
                    />
                  </div>
                </div>

                <div className="col-span-5 flex items-end">
                  <span className="font-bold uppercase text-black shrink-0 pr-2">
                    POSITION:
                  </span>
                  <div className="flex-1 border-b border-black pb-[2px]">
                    <input
                      type="text"
                      readOnly={readOnly}
                      value={student.position}
                      onChange={(e) => updateField('position', e.target.value)}
                      className="w-full bg-transparent text-black font-normal uppercase pl-1 focus:outline-none focus:bg-amber-50/70 print:bg-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Row 3: YEAR (Left) & DATE (Right) */}
              <div className="grid grid-cols-12 gap-5 items-end">
                <div className="col-span-7 flex items-end">
                  <span className="font-bold uppercase text-black shrink-0 pr-2">
                    YEAR:
                  </span>
                  <div className="flex-1 border-b border-black pb-[2px]">
                    <input
                      type="text"
                      readOnly={readOnly}
                      value={effectiveYear}
                      onChange={(e) =>
                        onUpdateConfig
                          ? onUpdateConfig({ year: e.target.value })
                          : updateField('yearOverride', e.target.value)
                      }
                      className="w-full bg-transparent text-black font-normal uppercase pl-1 focus:outline-none focus:bg-amber-50/70 print:bg-transparent"
                    />
                  </div>
                </div>

                <div className="col-span-5 flex items-end">
                  <span className="font-bold uppercase text-black shrink-0 pr-2">
                    DATE:
                  </span>
                  <div className="flex-1 border-b border-black pb-[2px]">
                    <input
                      type="text"
                      readOnly={readOnly}
                      value={effectiveDate}
                      onChange={(e) =>
                        onUpdateConfig
                          ? onUpdateConfig({ date: e.target.value })
                          : updateField('dateOverride', e.target.value)
                      }
                      className="w-full bg-transparent text-black font-normal uppercase pl-1 focus:outline-none focus:bg-amber-50/70 print:bg-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {config.topLayout === 'compact-2row' && (
            <div className="mt-2.5 mb-3.5 space-y-4 text-[12.7px] leading-none">
              {/* Row 1: NAME & CLASS */}
              <div className="grid grid-cols-12 gap-5 items-end">
                <div className="col-span-7 flex items-end">
                  <span className="font-bold uppercase text-black shrink-0 pr-2">
                    NAME:
                  </span>
                  <div className="flex-1 border-b border-black pb-[2px]">
                    <input
                      type="text"
                      readOnly={readOnly}
                      value={student.name}
                      onChange={(e) => updateField('name', e.target.value)}
                      style={{ fontSize: nameFontSize }}
                      className="w-full bg-transparent text-black font-normal uppercase pl-1 focus:outline-none focus:bg-amber-50/70 print:bg-transparent"
                    />
                  </div>
                </div>

                <div className="col-span-5 flex items-end">
                  <span className="font-bold uppercase text-black shrink-0 pr-2">
                    CLASS:
                  </span>
                  <div className="flex-1 border-b border-black pb-[2px]">
                    <input
                      type="text"
                      readOnly={readOnly}
                      value={student.studentClass}
                      onChange={(e) => updateField('studentClass', e.target.value)}
                      className="w-full bg-transparent text-black font-normal uppercase pl-1 focus:outline-none focus:bg-amber-50/70 print:bg-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Row 2: NO. ON ROLL | POSITION | YEAR | DATE */}
              <div className="grid grid-cols-12 gap-3.5 items-end">
                <div className="col-span-3 flex items-end">
                  <span className="font-bold uppercase text-black shrink-0 pr-1.5">
                    NO. ON ROLL:
                  </span>
                  <div className="flex-1 border-b border-black pb-[2px]">
                    <input
                      type="text"
                      readOnly={readOnly}
                      value={student.noOnRoll}
                      onChange={(e) => updateField('noOnRoll', e.target.value)}
                      className="w-full bg-transparent text-black font-normal uppercase text-center focus:outline-none focus:bg-amber-50/70 print:bg-transparent"
                    />
                  </div>
                </div>

                <div className="col-span-2 flex items-end">
                  <span className="font-bold uppercase text-black shrink-0 pr-1.5">
                    POS:
                  </span>
                  <div className="flex-1 border-b border-black pb-[2px]">
                    <input
                      type="text"
                      readOnly={readOnly}
                      value={student.position}
                      onChange={(e) => updateField('position', e.target.value)}
                      className="w-full bg-transparent text-black font-normal uppercase text-center focus:outline-none focus:bg-amber-50/70 print:bg-transparent"
                    />
                  </div>
                </div>

                <div className="col-span-3 flex items-end">
                  <span className="font-bold uppercase text-black shrink-0 pr-1.5">
                    YEAR:
                  </span>
                  <div className="flex-1 border-b border-black pb-[2px]">
                    <input
                      type="text"
                      readOnly={readOnly}
                      value={effectiveYear}
                      onChange={(e) =>
                        onUpdateConfig
                          ? onUpdateConfig({ year: e.target.value })
                          : updateField('yearOverride', e.target.value)
                      }
                      className="w-full bg-transparent text-black font-normal uppercase text-center focus:outline-none focus:bg-amber-50/70 print:bg-transparent"
                    />
                  </div>
                </div>

                <div className="col-span-4 flex items-end">
                  <span className="font-bold uppercase text-black shrink-0 pr-1.5">
                    DATE:
                  </span>
                  <div className="flex-1 border-b border-black pb-[2px]">
                    <input
                      type="text"
                      readOnly={readOnly}
                      value={effectiveDate}
                      onChange={(e) =>
                        onUpdateConfig
                          ? onUpdateConfig({ date: e.target.value })
                          : updateField('dateOverride', e.target.value)
                      }
                      className="w-full bg-transparent text-black font-normal uppercase pl-1 focus:outline-none focus:bg-amber-50/70 print:bg-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {config.topLayout === 'card-boxed' && (
            <div className="mt-2 mb-3 border-[1.5px] border-black text-[12px]">
              {/* Top Row */}
              <div className="grid grid-cols-12 border-b border-black">
                <div className="col-span-7 flex items-center px-2.5 py-2 border-r border-black">
                  <span className="font-bold uppercase text-black shrink-0 pr-2">
                    NAME:
                  </span>
                  <input
                    type="text"
                    readOnly={readOnly}
                    value={student.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    className="w-full bg-transparent text-black font-semibold uppercase focus:outline-none focus:bg-amber-50/70 print:bg-transparent"
                  />
                </div>
                <div className="col-span-5 flex items-center px-2.5 py-2">
                  <span className="font-bold uppercase text-black shrink-0 pr-2">
                    CLASS:
                  </span>
                  <input
                    type="text"
                    readOnly={readOnly}
                    value={student.studentClass}
                    onChange={(e) => updateField('studentClass', e.target.value)}
                    className="w-full bg-transparent text-black font-semibold uppercase focus:outline-none focus:bg-amber-50/70 print:bg-transparent"
                  />
                </div>
              </div>
              {/* Second Row */}
              <div className="grid grid-cols-12 bg-[#f8f9fa]">
                <div className="col-span-3 flex items-center px-2.5 py-2 border-r border-black">
                  <span className="font-bold uppercase text-black shrink-0 pr-1.5">
                    NO. ON ROLL:
                  </span>
                  <input
                    type="text"
                    readOnly={readOnly}
                    value={student.noOnRoll}
                    onChange={(e) => updateField('noOnRoll', e.target.value)}
                    className="w-full bg-transparent text-black font-medium uppercase focus:outline-none focus:bg-amber-50/70 print:bg-transparent"
                  />
                </div>
                <div className="col-span-3 flex items-center px-2.5 py-2 border-r border-black">
                  <span className="font-bold uppercase text-black shrink-0 pr-1.5">
                    POSITION:
                  </span>
                  <input
                    type="text"
                    readOnly={readOnly}
                    value={student.position}
                    onChange={(e) => updateField('position', e.target.value)}
                    className="w-full bg-transparent text-black font-medium uppercase focus:outline-none focus:bg-amber-50/70 print:bg-transparent"
                  />
                </div>
                <div className="col-span-2 flex items-center px-2 py-2 border-r border-black">
                  <span className="font-bold uppercase text-black shrink-0 pr-1">
                    YEAR:
                  </span>
                  <input
                    type="text"
                    readOnly={readOnly}
                    value={effectiveYear}
                    onChange={(e) =>
                      onUpdateConfig
                        ? onUpdateConfig({ year: e.target.value })
                        : updateField('yearOverride', e.target.value)
                    }
                    className="w-full bg-transparent text-black font-medium uppercase focus:outline-none focus:bg-amber-50/70 print:bg-transparent"
                  />
                </div>
                <div className="col-span-4 flex items-center px-2.5 py-2">
                  <span className="font-bold uppercase text-black shrink-0 pr-1.5">
                    DATE:
                  </span>
                  <input
                    type="text"
                    readOnly={readOnly}
                    value={effectiveDate}
                    onChange={(e) =>
                      onUpdateConfig
                        ? onUpdateConfig({ date: e.target.value })
                        : updateField('dateOverride', e.target.value)
                    }
                    className="w-full bg-transparent text-black font-medium uppercase focus:outline-none focus:bg-amber-50/70 print:bg-transparent"
                  />
                </div>
              </div>
            </div>
          )}

          {config.topLayout === 'with-aggregates' && (
            <div className="mt-2 mb-3 space-y-3 text-[12.5px] leading-none">
              {/* Row 1: NAME & CLASS */}
              <div className="grid grid-cols-12 gap-5 items-end">
                <div className="col-span-7 flex items-end">
                  <span className="font-bold uppercase text-black shrink-0 pr-2">
                    NAME:
                  </span>
                  <div className="flex-1 border-b border-black pb-[2px]">
                    <input
                      type="text"
                      readOnly={readOnly}
                      value={student.name}
                      onChange={(e) => updateField('name', e.target.value)}
                      className="w-full bg-transparent text-black font-normal uppercase pl-1 focus:outline-none focus:bg-amber-50/70 print:bg-transparent"
                    />
                  </div>
                </div>

                <div className="col-span-5 flex items-end">
                  <span className="font-bold uppercase text-black shrink-0 pr-2">
                    CLASS:
                  </span>
                  <div className="flex-1 border-b border-black pb-[2px]">
                    <input
                      type="text"
                      readOnly={readOnly}
                      value={student.studentClass}
                      onChange={(e) => updateField('studentClass', e.target.value)}
                      className="w-full bg-transparent text-black font-normal uppercase pl-1 focus:outline-none focus:bg-amber-50/70 print:bg-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Row 2: NO. ON ROLL | YEAR | DATE */}
              <div className="grid grid-cols-12 gap-4 items-end">
                <div className="col-span-3 flex items-end">
                  <span className="font-bold uppercase text-black shrink-0 pr-1.5">
                    NO. ON ROLL:
                  </span>
                  <div className="flex-1 border-b border-black pb-[2px]">
                    <input
                      type="text"
                      readOnly={readOnly}
                      value={student.noOnRoll}
                      onChange={(e) => updateField('noOnRoll', e.target.value)}
                      className="w-full bg-transparent text-black font-normal uppercase pl-1 focus:outline-none focus:bg-amber-50/70 print:bg-transparent"
                    />
                  </div>
                </div>

                <div className="col-span-4 flex items-end">
                  <span className="font-bold uppercase text-black shrink-0 pr-1.5">
                    YEAR:
                  </span>
                  <div className="flex-1 border-b border-black pb-[2px]">
                    <input
                      type="text"
                      readOnly={readOnly}
                      value={effectiveYear}
                      onChange={(e) =>
                        onUpdateConfig
                          ? onUpdateConfig({ year: e.target.value })
                          : updateField('yearOverride', e.target.value)
                      }
                      className="w-full bg-transparent text-black font-normal uppercase pl-1 focus:outline-none focus:bg-amber-50/70 print:bg-transparent"
                    />
                  </div>
                </div>

                <div className="col-span-5 flex items-end">
                  <span className="font-bold uppercase text-black shrink-0 pr-1.5">
                    DATE:
                  </span>
                  <div className="flex-1 border-b border-black pb-[2px]">
                    <input
                      type="text"
                      readOnly={readOnly}
                      value={effectiveDate}
                      onChange={(e) =>
                        onUpdateConfig
                          ? onUpdateConfig({ date: e.target.value })
                          : updateField('dateOverride', e.target.value)
                      }
                      className="w-full bg-transparent text-black font-normal uppercase pl-1 focus:outline-none focus:bg-amber-50/70 print:bg-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Row 3: POSITION | AGGREGATE | RAW SCORE */}
              <div className="grid grid-cols-12 gap-4 items-end">
                <div className="col-span-4 flex items-end">
                  <span className="font-bold uppercase text-black shrink-0 pr-1.5">
                    POSITION:
                  </span>
                  <div className="flex-1 border-b border-black pb-[2px]">
                    <input
                      type="text"
                      readOnly={readOnly}
                      value={student.position}
                      onChange={(e) => updateField('position', e.target.value)}
                      className="w-full bg-transparent text-black font-normal uppercase pl-1 focus:outline-none focus:bg-amber-50/70 print:bg-transparent"
                    />
                  </div>
                </div>

                <div className="col-span-4 flex items-end">
                  <span className="font-bold uppercase text-black shrink-0 pr-1.5">
                    AGGREGATE:
                  </span>
                  <div className="flex-1 border-b border-black pb-[2px]">
                    <input
                      type="text"
                      readOnly={readOnly}
                      value={displayAggregate}
                      onChange={(e) => updateField('manualAggregate', e.target.value)}
                      className="w-full bg-transparent text-black font-normal uppercase pl-1 focus:outline-none focus:bg-amber-50/70 print:bg-transparent"
                    />
                  </div>
                </div>

                <div className="col-span-4 flex items-end">
                  <span className="font-bold uppercase text-black shrink-0 pr-1.5">
                    RAW SCORE:
                  </span>
                  <div className="flex-1 border-b border-black pb-[2px]">
                    <input
                      type="text"
                      readOnly={readOnly}
                      value={displayRawScore}
                      onChange={(e) => updateField('manualRawScore', e.target.value)}
                      className="w-full bg-transparent text-black font-normal uppercase pl-1 focus:outline-none focus:bg-amber-50/70 print:bg-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MIDDLE SECTION: SUBJECTS & SCORES TABLE (Expanded height + Continuous straight column lines) */}
        <div className="my-1.5">
          <table
            className="w-full border-collapse border-[1.8px] border-black text-black"
            style={{ tableLayout: 'fixed' }}
          >
            <colgroup>
              <col style={{ width: '246px' }} />
              <col style={{ width: '150px' }} />
              <col style={{ width: '74px' }} />
              <col style={{ width: '162px' }} />
            </colgroup>
            <thead>
              <tr
                className="bg-[#dcdcdc] border-b-[1.5px] border-black font-bold text-[13.5px] uppercase"
                style={{ height: '48px' }}
              >
                <th className="border-r border-black text-left px-3.5 py-1.5">
                  SUBJECT
                </th>
                <th className="border-r border-black text-center px-2 py-1 leading-tight">
                  <div>EXAM SCORE</div>
                  <div>(100%)</div>
                </th>
                <th className="border-r border-black text-center px-1.5 py-1.5">
                  GRADE
                </th>
                <th className="text-center px-2 py-1.5">MEANING</th>
              </tr>
            </thead>
            <tbody>
              {summary.scoredSubjects.map((sub, idx) => {
                const showCalculated =
                  config.showScoresOnSheet &&
                  sub.numericScore !== null &&
                  sub.gradeInfo !== null;
                const gradeText =
                  sub.customGrade !== undefined && sub.customGrade !== ''
                    ? sub.customGrade
                    : showCalculated && config.autoCalculateGrades
                    ? String(sub.gradeInfo?.grade ?? '')
                    : '';
                const meaningText =
                  sub.customMeaning !== undefined && sub.customMeaning !== ''
                    ? sub.customMeaning
                    : showCalculated && config.autoCalculateGrades
                    ? sub.gradeInfo?.meaning ?? ''
                    : '';

                return (
                  <tr
                    key={sub.id}
                    className="border-b border-black text-[13px]"
                    style={{ height: '44px' }}
                  >
                    {/* Subject Name */}
                    <td className="border-r border-black font-bold uppercase px-3.5 py-1 text-left align-middle">
                      {sub.name}
                    </td>

                    {/* Exam Score (100%) - Continuous straight line on right */}
                    <td
                      className={`relative px-2 py-1 text-center align-middle ${
                        config.showTableTickMarks ? '' : 'border-r border-black'
                      }`}
                    >
                      {config.showScoresOnSheet ? (
                        <input
                          type="text"
                          readOnly={readOnly}
                          value={sub.score}
                          onChange={(e) => updateSubjectScore(sub.id, e.target.value)}
                          className="w-full text-center font-semibold text-black bg-transparent focus:outline-none focus:bg-amber-50/70 print:bg-transparent tabular-nums text-[13.5px]"
                        />
                      ) : null}

                      {config.showTableTickMarks && (
                        <span
                          className="pointer-events-none absolute right-[-1px] bottom-[-4.5px] w-[1.2px] h-[8px] bg-black z-10"
                          aria-hidden="true"
                        />
                      )}
                    </td>

                    {/* Grade - Continuous straight line on right */}
                    <td
                      className={`relative px-1.5 py-1 text-center align-middle font-semibold tabular-nums text-[13.5px] ${
                        config.showTableTickMarks ? '' : 'border-r border-black'
                      }`}
                    >
                      {gradeText}

                      {config.showTableTickMarks && (
                        <span
                          className="pointer-events-none absolute right-[-1px] bottom-[-4.5px] w-[1.2px] h-[8px] bg-black z-10"
                          aria-hidden="true"
                        />
                      )}
                    </td>

                    {/* Meaning */}
                    <td className="relative px-2 py-1 text-center align-middle font-semibold uppercase text-[13px]">
                      {meaningText}
                      {config.showTableTickMarks && idx < summary.scoredSubjects.length - 1 && (
                        <span
                          className="pointer-events-none absolute right-[0.5px] bottom-[-4.5px] w-[2px] h-[8px] bg-black z-10"
                          aria-hidden="true"
                        />
                      )}
                    </td>
                  </tr>
                );
              })}

              {/* TOTAL MARK ROW */}
              <tr style={{ height: '40px' }} className="text-[13px]">
                <td className="bg-[#dcdcdc] border-r border-black font-bold uppercase px-3.5 py-1 text-left align-middle">
                  TOTAL MARK
                </td>
                <td className="border-r border-black px-2 py-1 text-center align-middle font-bold tabular-nums">
                  <input
                    type="text"
                    readOnly={readOnly}
                    value={displayTotalMark}
                    onChange={(e) => updateField('manualTotalMark', e.target.value)}
                    className="w-full text-center font-bold text-black bg-transparent focus:outline-none focus:bg-amber-50/70 print:bg-transparent tabular-nums text-[13.5px]"
                  />
                </td>
                <td className="border-r border-black px-1.5 py-1 text-center align-middle font-bold tabular-nums" />
                <td className="px-3 py-1 text-right align-middle font-bold text-[12px]" />
              </tr>
            </tbody>
          </table>
        </div>

        {/* BOTTOM SECTION: AGGREGATE, REMARKS, SIGNATURE, FEES & HEADMASTER STAMP */}
        <div className="space-y-4 text-[13px] leading-none pt-1">
          {/* Aggregate & Raw Score Row */}
          <div className="flex items-end justify-between gap-6">
            <div className="flex items-end w-[285px]">
              <span className="font-bold uppercase text-black shrink-0 pr-3">
                AGGREGATE:
              </span>
              <div className="flex-1 border-b border-black pb-[2px]">
                <input
                  type="text"
                  readOnly={readOnly}
                  value={displayAggregate}
                  onChange={(e) => updateField('manualAggregate', e.target.value)}
                  className="w-full text-center font-bold bg-transparent text-black focus:outline-none focus:bg-amber-50/70 print:bg-transparent tabular-nums text-[13.5px]"
                />
              </div>
            </div>

            <div className="flex items-end flex-1 max-w-[310px]">
              <span className="font-bold uppercase text-black shrink-0 pr-3">
                RAW SCORE:
              </span>
              <div className="flex-1 border-b border-black pb-[2px]">
                <input
                  type="text"
                  readOnly={readOnly}
                  value={displayRawScore}
                  onChange={(e) => updateField('manualRawScore', e.target.value)}
                  className="w-full text-center font-bold bg-transparent text-black focus:outline-none focus:bg-amber-50/70 print:bg-transparent tabular-nums text-[13.5px]"
                />
              </div>
            </div>
          </div>

          {/* Best Two Subjects */}
          <div className="flex items-end">
            <span className="font-bold uppercase text-black shrink-0 pr-2.5">
              BEST TWO SUBJECTS:
            </span>
            <div className="flex-1 border-b border-black pb-[2px]">
              <input
                type="text"
                readOnly={readOnly}
                value={displayBestTwo}
                onChange={(e) => updateField('manualBestTwoSubjects', e.target.value)}
                className="w-full bg-transparent text-black font-semibold uppercase pl-1 focus:outline-none focus:bg-amber-50/70 print:bg-transparent text-[13px]"
              />
            </div>
          </div>

          {/* Class Teacher's Remarks */}
          <div className="flex items-end">
            <span className="font-bold text-black shrink-0 pr-2.5 text-[14px]">
              Class Teacher&apos;s Remarks:
            </span>
            <div className="flex-1 border-b border-black pb-[2px]">
              <input
                type="text"
                readOnly={readOnly}
                value={student.classTeacherRemarks}
                onChange={(e) => updateField('classTeacherRemarks', e.target.value)}
                className="w-full bg-transparent text-black italic font-medium pl-1 focus:outline-none focus:bg-amber-50/70 print:bg-transparent text-[14.5px]"
              />
            </div>
          </div>

          {/* Class Teacher's Signature */}
          <div className="flex items-end relative">
            <span className="font-normal text-black shrink-0 pr-2.5 pb-[2px]">
              Class Teacher&apos;s Signature:
            </span>
            <div className="flex-1 border-b border-black relative pb-[2px] min-h-[38px] flex items-end">
              <img
                src="/assets/teacher_signature.png"
                alt="Class Teacher Signature"
                className="h-9 max-w-[180px] object-contain absolute left-4 -bottom-1 pointer-events-none print:h-9"
              />
              <input
                type="text"
                readOnly={readOnly}
                value={student.classTeacherSignature}
                onChange={(e) => updateField('classTeacherSignature', e.target.value)}
                className="w-full bg-transparent text-black pl-44 focus:outline-none focus:bg-amber-50/70 print:bg-transparent relative z-10 font-medium text-[13px]"
              />
            </div>
          </div>

          {/* Headmasters Remark / Sign / Official Stamp */}
          <div className="flex items-end pt-1 relative">
            <span className="font-bold text-black shrink-0 pr-2 pb-[2px]">
              Headmasters Remark / Sign / Official Stamp:
            </span>
            <div className="flex-1 border-b border-black relative pb-[2px] min-h-[32px] flex items-end">
              <img
                src="/assets/headmaster_signature.png"
                alt="Headmaster Signature"
                className="h-6 max-w-[160px] object-contain absolute left-4 -bottom-0.5 pointer-events-none print:h-6"
              />
              <input
                type="text"
                readOnly={readOnly}
                value={student.headmasterRemark}
                onChange={(e) => updateField('headmasterRemark', e.target.value)}
                className="w-full bg-transparent text-black pl-40 focus:outline-none focus:bg-amber-50/70 print:bg-transparent relative z-10 font-medium text-[13px]"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
