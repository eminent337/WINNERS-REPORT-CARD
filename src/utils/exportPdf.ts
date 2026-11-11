import { jsPDF } from 'jspdf';
import {
  SchoolConfig,
  StudentReport,
  computeStudentSummary,
} from '../types/report';

export interface LoadedPdfAssets {
  crestDataUrl: string | null;
  titleDataUrl: string | null;
}

async function loadImageAsDataUrl(
  url: string,
  targetWidth?: number,
  targetHeight?: number
): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const scale = 2;
        const w = (targetWidth || img.naturalWidth || 300) * scale;
        const h = (targetHeight || img.naturalHeight || 80) * scale;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/png'));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

let cachedAssets: LoadedPdfAssets = {
  crestDataUrl: null,
  titleDataUrl: null,
};
let assetsLoaded = false;

export async function preloadPdfAssets(): Promise<LoadedPdfAssets> {
  if (assetsLoaded) return cachedAssets;
  const [crestDataUrl, titleDataUrl] = await Promise.all([
    loadImageAsDataUrl('/assets/school_crest.png', 168, 172),
    loadImageAsDataUrl('/assets/school_title.svg', 449, 32),
  ]);
  cachedAssets = { crestDataUrl, titleDataUrl };
  assetsLoaded = true;
  return cachedAssets;
}

export function getCachedPdfAssetsSync(): LoadedPdfAssets {
  return cachedAssets;
}

function toPdfSafeText(str: string): string {
  return str.replace(/\u20B5/g, '¢');
}

function drawVectorFourDiamondCluster(
  doc: jsPDF,
  centerX: number,
  centerY: number
) {
  doc.setFillColor(20, 33, 61);
  const drawSmallDiamond = (cx: number, cy: number, r: number) => {
    doc.triangle(cx, cy - r, cx + r, cy, cx - r, cy, 'F');
    doc.triangle(cx + r, cy, cx, cy + r, cx - r, cy, 'F');
  };
  const offset = 3.8;
  const radius = 2.7;
  drawSmallDiamond(centerX, centerY - offset, radius);
  drawSmallDiamond(centerX + offset, centerY, radius);
  drawSmallDiamond(centerX, centerY + offset, radius);
  drawSmallDiamond(centerX - offset, centerY, radius);
}

function drawLabeledUnderlineField(
  doc: jsPDF,
  x: number,
  yBaseline: number,
  totalWidth: number,
  label: string,
  value: string,
  options?: {
    boldLabel?: boolean;
    italicValue?: boolean;
    centerValue?: boolean;
    maxValueFontSize?: number;
  }
) {
  const boldLabel = options?.boldLabel ?? true;
  const italicValue = options?.italicValue ?? false;
  const centerValue = options?.centerValue ?? false;
  const labelFontSize = 11.8;
  const safeLabel = toPdfSafeText(label);

  doc.setFont('helvetica', boldLabel ? 'bold' : 'normal');
  doc.setFontSize(labelFontSize);
  doc.setTextColor(0, 0, 0);
  doc.text(safeLabel, x, yBaseline);

  const labelWidth = doc.getTextWidth(safeLabel) + 6;
  const lineStartX = x + labelWidth;
  const lineEndX = x + totalWidth;
  const availableLineWidth = Math.max(20, lineEndX - lineStartX);

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.9);
  doc.line(lineStartX, yBaseline + 3, lineEndX, yBaseline + 3);

  if (value && value.trim() !== '') {
    const cleanVal = toPdfSafeText(value.trim());
    let valFontSize = options?.maxValueFontSize ?? 11.5;
    doc.setFont('helvetica', italicValue ? 'italic' : 'normal');
    doc.setFontSize(valFontSize);

    while (
      doc.getTextWidth(cleanVal) > availableLineWidth - 6 &&
      valFontSize > 7.5
    ) {
      valFontSize -= 0.4;
      doc.setFontSize(valFontSize);
    }

    if (centerValue) {
      doc.text(cleanVal, lineStartX + availableLineWidth / 2, yBaseline, {
        align: 'center',
      });
    } else {
      doc.text(cleanVal, lineStartX + 4, yBaseline);
    }
  }
}

export function renderStudentPageOnJsPdf(
  doc: jsPDF,
  config: SchoolConfig,
  student: StudentReport,
  assets: LoadedPdfAssets
) {
  const summary = computeStudentSummary(
    student,
    config.gesScaleStyle || 'ges-standard'
  );
  const effectiveYear =
    student.yearOverride !== undefined ? student.yearOverride : config.year;
  const effectiveDate =
    student.dateOverride !== undefined ? student.dateOverride : config.date;

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

  // Page background
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, 794, 1123, 'F');

  // 1. Outer Dark Navy Border (#14213d)
  doc.setDrawColor(20, 33, 61);
  doc.setLineWidth(3.5);
  doc.roundedRect(40.5, 32.5, 713, 1057, 7, 7, 'S');

  // 2. Middle Navy Border (#14213d)
  doc.setDrawColor(20, 33, 61);
  doc.setLineWidth(2);
  doc.roundedRect(59, 51, 676, 1020, 5, 5, 'S');

  // 3. Inner Fine Black Border
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(1);
  doc.roundedRect(67.5, 60.5, 658, 1002, 3, 3, 'S');

  // 4. Four Corner Ornamental Diamonds (❖) with White Corner Masks (Pure Vector)
  const corners = [
    { x: 48, y: 41 },
    { x: 724, y: 41 },
    { x: 48, y: 1058 },
    { x: 724, y: 1058 },
  ];
  for (const c of corners) {
    doc.setFillColor(255, 255, 255);
    doc.rect(c.x, c.y, 22, 23, 'F');
    drawVectorFourDiamondCluster(doc, c.x + 11, c.y + 11.5);
  }

  // 5. School Crest & Header (Using alias so jsPDF embeds image only ONCE across all 41 pages!)
  if (assets.crestDataUrl) {
    doc.addImage(
      assets.crestDataUrl,
      'PNG',
      81,
      69,
      84,
      86,
      'winners_crest',
      'FAST'
    );
  }

  const headerCenterX = 442;
  if (
    assets.titleDataUrl &&
    config.schoolName.trim().toUpperCase() === 'WINNERS FAMILY SCHOOL'
  ) {
    doc.addImage(
      assets.titleDataUrl,
      'PNG',
      headerCenterX - 215,
      75,
      430,
      31,
      'winners_title',
      'FAST'
    );
  } else {
    doc.setFont('times', 'bold');
    doc.setFontSize(28);
    doc.setTextColor(0, 0, 0);
    doc.text(toPdfSafeText(config.schoolName.toUpperCase()), headerCenterX, 102, {
      align: 'center',
    });
  }

  // Department
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16.5);
  doc.setTextColor(0, 0, 0);
  doc.text(toPdfSafeText(config.department.toUpperCase()), headerCenterX, 127, {
    align: 'center',
  });

  // Postal Address & Location
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.8);
  doc.text(toPdfSafeText(config.postalAddress.toUpperCase()), headerCenterX, 145, {
    align: 'center',
  });
  doc.text(toPdfSafeText(config.location.toUpperCase()), headerCenterX, 160, {
    align: 'center',
  });

  // Report Title: MOCK 2 EXAMINATION REPORT
  const titleText = toPdfSafeText(config.reportTitle.toUpperCase());
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(titleText, headerCenterX, 186, { align: 'center' });
  const titleW = doc.getTextWidth(titleText);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(1.3);
  doc.line(
    headerCenterX - titleW / 2 - 2,
    189,
    headerCenterX + titleW / 2 + 2,
    189
  );

  // 6. Organized Top Student Metadata Section
  const contentLeft = 81;
  const contentWidth = 632;

  if (config.topLayout === 'compact-2row') {
    drawLabeledUnderlineField(
      doc,
      contentLeft,
      222,
      368,
      'NAME:',
      student.name.toUpperCase()
    );
    drawLabeledUnderlineField(
      doc,
      contentLeft + 388,
      222,
      244,
      'CLASS:',
      student.studentClass.toUpperCase()
    );

    drawLabeledUnderlineField(
      doc,
      contentLeft,
      254,
      145,
      'NO. ON ROLL:',
      student.noOnRoll.toUpperCase(),
      { centerValue: true }
    );
    drawLabeledUnderlineField(
      doc,
      contentLeft + 158,
      254,
      102,
      'POS:',
      student.position.toUpperCase(),
      { centerValue: true }
    );
    drawLabeledUnderlineField(
      doc,
      contentLeft + 273,
      254,
      145,
      'YEAR:',
      effectiveYear.toUpperCase(),
      { centerValue: true }
    );
    drawLabeledUnderlineField(
      doc,
      contentLeft + 431,
      254,
      201,
      'DATE:',
      effectiveDate.toUpperCase()
    );
  } else if (config.topLayout === 'with-aggregates') {
    drawLabeledUnderlineField(
      doc,
      contentLeft,
      216,
      368,
      'NAME:',
      student.name.toUpperCase()
    );
    drawLabeledUnderlineField(
      doc,
      contentLeft + 388,
      216,
      244,
      'CLASS:',
      student.studentClass.toUpperCase()
    );

    drawLabeledUnderlineField(
      doc,
      contentLeft,
      244,
      150,
      'NO. ON ROLL:',
      student.noOnRoll.toUpperCase(),
      { centerValue: true }
    );
    drawLabeledUnderlineField(
      doc,
      contentLeft + 166,
      244,
      195,
      'YEAR:',
      effectiveYear.toUpperCase(),
      { centerValue: true }
    );
    drawLabeledUnderlineField(
      doc,
      contentLeft + 377,
      244,
      255,
      'DATE:',
      effectiveDate.toUpperCase()
    );

    drawLabeledUnderlineField(
      doc,
      contentLeft,
      272,
      198,
      'POSITION:',
      student.position.toUpperCase(),
      { centerValue: true }
    );
    drawLabeledUnderlineField(
      doc,
      contentLeft + 214,
      272,
      198,
      'AGGREGATE:',
      displayAggregate.toUpperCase(),
      { centerValue: true }
    );
    drawLabeledUnderlineField(
      doc,
      contentLeft + 428,
      272,
      204,
      'RAW SCORE:',
      displayRawScore.toUpperCase(),
      { centerValue: true }
    );
  } else {
    drawLabeledUnderlineField(
      doc,
      contentLeft,
      216,
      368,
      'NAME:',
      student.name.toUpperCase()
    );
    drawLabeledUnderlineField(
      doc,
      contentLeft + 388,
      216,
      244,
      'CLASS:',
      student.studentClass.toUpperCase()
    );

    drawLabeledUnderlineField(
      doc,
      contentLeft,
      244,
      368,
      'NO. ON ROLL:',
      student.noOnRoll.toUpperCase()
    );
    drawLabeledUnderlineField(
      doc,
      contentLeft + 388,
      244,
      244,
      'POSITION:',
      student.position.toUpperCase()
    );

    drawLabeledUnderlineField(
      doc,
      contentLeft,
      272,
      368,
      'YEAR:',
      effectiveYear.toUpperCase()
    );
    drawLabeledUnderlineField(
      doc,
      contentLeft + 388,
      272,
      244,
      'DATE:',
      effectiveDate.toUpperCase()
    );
  }

  // 7. Subjects & Scores Table (Expanded size + Straight continuous vertical lines)
  const tableTop = 294;
  const colWidths = [246, 150, 74, 162];
  const colX = [
    contentLeft,
    contentLeft + colWidths[0],
    contentLeft + colWidths[0] + colWidths[1],
    contentLeft + colWidths[0] + colWidths[1] + colWidths[2],
    contentLeft + contentWidth,
  ];
  const headerH = 47;
  const rowH = summary.scoredSubjects.length === 9 ? 40 : 36;
  const totalMarkRowH = 36;
  const numSubjectRows = summary.scoredSubjects.length;
  const totalTableH = headerH + numSubjectRows * rowH + totalMarkRowH;

  // Header Gray Fill
  doc.setFillColor(220, 220, 220);
  doc.rect(contentLeft, tableTop, contentWidth, headerH, 'F');

  // TOTAL MARK Cell Gray Fill
  const totalRowY = tableTop + headerH + numSubjectRows * rowH;
  doc.setFillColor(220, 220, 220);
  doc.rect(contentLeft, totalRowY, colWidths[0], totalMarkRowH, 'F');

  // Outer Table Border
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(1.8);
  doc.rect(contentLeft, tableTop, contentWidth, totalTableH, 'S');

  // Header Bottom Border
  doc.setLineWidth(1.5);
  doc.line(
    contentLeft,
    tableTop + headerH,
    contentLeft + contentWidth,
    tableTop + headerH
  );

  // Header Text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.8);
  doc.setTextColor(0, 0, 0);
  doc.text('SUBJECT', colX[0] + 12, tableTop + 28);
  doc.text('EXAM SCORE', colX[1] + colWidths[1] / 2, tableTop + 21, {
    align: 'center',
  });
  doc.text('(100%)', colX[1] + colWidths[1] / 2, tableTop + 36, {
    align: 'center',
  });
  doc.text('GRADE', colX[2] + colWidths[2] / 2, tableTop + 28, {
    align: 'center',
  });
  doc.text('MEANING', colX[3] + colWidths[3] / 2, tableTop + 28, {
    align: 'center',
  });

  // Vertical Column Borders (Straight continuous lines)
  doc.setLineWidth(1);
  doc.line(colX[1], tableTop, colX[1], tableTop + totalTableH);

  if (!config.showTableTickMarks) {
    doc.line(colX[2], tableTop, colX[2], tableTop + totalTableH);
    doc.line(colX[3], tableTop, colX[3], tableTop + totalTableH);
  } else {
    doc.line(colX[2], tableTop, colX[2], tableTop + headerH);
    doc.line(colX[3], tableTop, colX[3], tableTop + headerH);
  }

  // Subject Rows
  summary.scoredSubjects.forEach((sub, idx) => {
    const rY = tableTop + headerH + idx * rowH;
    const rBottom = rY + rowH;

    doc.setLineWidth(1);
    doc.line(contentLeft, rBottom, contentLeft + contentWidth, rBottom);

    if (config.showTableTickMarks) {
      doc.line(colX[2], rBottom - 4, colX[2], rBottom + 4);
      doc.line(colX[3], rBottom - 4, colX[3], rBottom + 4);
    }

    const textY = rY + rowH * 0.62;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.3);
    doc.text(toPdfSafeText(sub.name), colX[0] + 12, textY);

    const showCalculated =
      config.showScoresOnSheet &&
      sub.numericScore !== null &&
      sub.gradeInfo !== null;
    const scoreText = config.showScoresOnSheet ? sub.score.trim() : '';
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

    if (scoreText) {
      doc.text(toPdfSafeText(scoreText), colX[1] + colWidths[1] / 2, textY, {
        align: 'center',
      });
    }
    if (gradeText) {
      doc.text(toPdfSafeText(gradeText), colX[2] + colWidths[2] / 2, textY, {
        align: 'center',
      });
    }
    if (meaningText) {
      doc.text(toPdfSafeText(meaningText), colX[3] + colWidths[3] / 2, textY, {
        align: 'center',
      });
    }
  });

  // TOTAL MARK Row Text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.text('TOTAL MARK', colX[0] + 12, totalRowY + 23);
  if (displayTotalMark) {
    doc.text(
      toPdfSafeText(displayTotalMark),
      colX[1] + colWidths[1] / 2,
      totalRowY + 23,
      { align: 'center' }
    );
  }

  // 8. Bottom Summary & Remarks Section
  let curY = tableTop + totalTableH + 34;
  const rowGap = 35;

  drawLabeledUnderlineField(
    doc,
    contentLeft,
    curY,
    275,
    'AGGREGATE:',
    displayAggregate,
    { centerValue: true }
  );
  drawLabeledUnderlineField(
    doc,
    contentLeft + 332,
    curY,
    300,
    'RAW SCORE:',
    displayRawScore,
    { centerValue: true }
  );

  curY += rowGap;
  drawLabeledUnderlineField(
    doc,
    contentLeft,
    curY,
    contentWidth,
    'BEST TWO SUBJECTS:',
    displayBestTwo.toUpperCase()
  );

  curY += rowGap;
  drawLabeledUnderlineField(
    doc,
    contentLeft,
    curY,
    contentWidth,
    "Class Teacher's Remarks:",
    student.classTeacherRemarks,
    { boldLabel: false, italicValue: true }
  );

  curY += rowGap;
  drawLabeledUnderlineField(
    doc,
    contentLeft,
    curY,
    contentWidth,
    "Class Teacher's Signature:",
    student.classTeacherSignature,
    { boldLabel: false }
  );

  curY += rowGap;
  drawLabeledUnderlineField(
    doc,
    contentLeft,
    curY,
    300,
    'School Fees GH¢:',
    student.schoolFees
  );
  drawLabeledUnderlineField(
    doc,
    contentLeft + 332,
    curY,
    300,
    'Arrears GH¢:',
    student.arrears
  );

  curY += rowGap;
  drawLabeledUnderlineField(
    doc,
    contentLeft,
    curY,
    contentWidth,
    'TOTAL GH¢:',
    student.totalFees
  );

  curY += rowGap;
  drawLabeledUnderlineField(
    doc,
    contentLeft,
    curY,
    contentWidth,
    'Headmasters Remark / Sign / Official Stamp:',
    student.headmasterRemark
  );
}

export function formatStudentPdfFilename(
  student: StudentReport,
  index: number
): string {
  const num = String(student.serialNumber || index + 1).padStart(2, '0');
  const cleanName = student.name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return `${num}_${cleanName}.pdf`;
}

function sanitizeFolderName(name: string): string {
  const cleaned = name
    .trim()
    .replace(/[^a-zA-Z0-9 _()-]+/g, '_')
    .replace(/\s+/g, '_');
  return cleaned || 'MOCK_2_REPORTS_BASIC_NINE';
}

function extractBase64FromJsPdf(doc: jsPDF): string {
  const dataUri = doc.output('datauristring');
  const commaIdx = dataUri.indexOf(',');
  return commaIdx >= 0 ? dataUri.slice(commaIdx + 1) : dataUri;
}

function submitServerDownloadForm(
  actionUrl: string,
  fields: Record<string, string>,
  target?: string
) {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = actionUrl;
  if (target) {
    form.target = target;
  }
  form.style.display = 'none';

  for (const [key, value] of Object.entries(fields)) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = key;
    input.value = value;
    form.appendChild(input);
  }

  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);
}

/**
 * 100% Synchronous Print Action:
 * Embeds the PDF standard AutoPrint action into the generated A4 PDF and opens it
 * via a native HTML <form method="POST" action="/api/print-pdf" target="_blank">
 * so it opens outside the sandboxed preview iframe and immediately launches the OS Print dialog.
 */
export function printReportsPdfSync(
  config: SchoolConfig,
  studentsToPrint: StudentReport[],
  activeIndex = 0
): string {
  const assets = getCachedPdfAssetsSync();
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'px',
    format: [794, 1123],
    hotfixes: ['px_scaling'],
  });

  for (let i = 0; i < studentsToPrint.length; i++) {
    if (i > 0) {
      doc.addPage([794, 1123], 'portrait');
    }
    renderStudentPageOnJsPdf(doc, config, studentsToPrint[i], assets);
  }

  // Embed standard PDF OpenAction Print trigger so Chrome's PDF viewer opens the Print dialog automatically
  doc.autoPrint();

  const filename =
    studentsToPrint.length === 1
      ? formatStudentPdfFilename(studentsToPrint[0], activeIndex)
      : `MOCK_2_ALL_${studentsToPrint.length}_REPORTS_PRINT.pdf`;

  const base64Data = extractBase64FromJsPdf(doc);

  submitServerDownloadForm(
    '/api/print-pdf',
    {
      filename,
      base64Data,
    },
    '_blank'
  );

  return filename;
}

/**
 * 100% Synchronous Single Student PDF Download via native HTML <form method="POST">
 * to /api/download-file (returns Content-Disposition: attachment).
 */
export function downloadSingleStudentPdfSync(
  config: SchoolConfig,
  student: StudentReport,
  index = 0
): string {
  const assets = getCachedPdfAssetsSync();
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'px',
    format: [794, 1123],
    hotfixes: ['px_scaling'],
  });
  renderStudentPageOnJsPdf(doc, config, student, assets);
  const filename = formatStudentPdfFilename(student, index);
  const base64Data = extractBase64FromJsPdf(doc);

  submitServerDownloadForm('/api/download-file', {
    filename,
    mimeType: 'application/pdf',
    base64Data,
  });

  return filename;
}

/**
 * 100% Synchronous Combined 41-Page PDF Download via native HTML <form method="POST">
 * to /api/download-file (returns Content-Disposition: attachment).
 */
export function downloadCombinedRosterPdfSync(
  config: SchoolConfig,
  students: StudentReport[],
  folderName: string
): string {
  const assets = getCachedPdfAssetsSync();
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'px',
    format: [794, 1123],
    hotfixes: ['px_scaling'],
  });

  for (let i = 0; i < students.length; i++) {
    if (i > 0) {
      doc.addPage([794, 1123], 'portrait');
    }
    renderStudentPageOnJsPdf(doc, config, students[i], assets);
  }

  const cleanFolder = sanitizeFolderName(folderName);
  const filename = `${cleanFolder}_ALL_${students.length}_REPORTS.pdf`;
  const base64Data = extractBase64FromJsPdf(doc);

  submitServerDownloadForm('/api/download-file', {
    filename,
    mimeType: 'application/pdf',
    base64Data,
  });

  return filename;
}

/**
 * 100% Synchronous Folder (.ZIP) Download containing all 41 separate student PDFs
 * (01_ABRAHAM_EZAN_NYAMEAYE.pdf to 41_YEBOAH_KINGSLEY_KOFI_AGYAPONG.pdf)
 * via native HTML <form method="POST"> to /api/download-zip.
 */
export function downloadAllReportsAsFolderZipSync(
  config: SchoolConfig,
  students: StudentReport[],
  folderName: string
): string {
  const assets = getCachedPdfAssetsSync();
  const cleanFolder = sanitizeFolderName(folderName);

  const files: Array<{ name: string; base64: string }> = [];

  for (let i = 0; i < students.length; i++) {
    const stu = students[i];
    const singleDoc = new jsPDF({
      orientation: 'portrait',
      unit: 'px',
      format: [794, 1123],
      hotfixes: ['px_scaling'],
    });
    renderStudentPageOnJsPdf(singleDoc, config, stu, assets);
    files.push({
      name: formatStudentPdfFilename(stu, i),
      base64: extractBase64FromJsPdf(singleDoc),
    });
  }

  const zipFilename = `${cleanFolder}.zip`;
  submitServerDownloadForm('/api/download-zip', {
    payload: JSON.stringify({
      folderName: cleanFolder,
      zipFilename,
      files,
    }),
  });

  return zipFilename;
}
