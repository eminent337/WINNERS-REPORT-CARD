import {
  AlignmentType,
  BorderStyle,
  Document,
  HeightRule,
  ImageRun,
  PageBorderDisplay,
  PageBorderOffsetFrom,
  PageBorderZOrder,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  UnderlineType,
  VerticalAlign,
  WidthType,
} from 'docx';
import {
  type SchoolConfig,
  type StudentReport,
  computeStudentSummary,
} from '../types/report.ts';

const NO_BORDER = {
  style: BorderStyle.NONE,
  size: 0,
  color: 'FFFFFF',
};

const SOLID_BLACK_BORDER = {
  style: BorderStyle.SINGLE,
  size: 8, // 1pt
  color: '000000',
};

const THICK_BLACK_BORDER = {
  style: BorderStyle.SINGLE,
  size: 12, // 1.5pt
  color: '000000',
};

const BOTTOM_UNDERLINE_BORDER = {
  top: NO_BORDER,
  left: NO_BORDER,
  right: NO_BORDER,
  bottom: {
    style: BorderStyle.SINGLE,
    size: 6,
    color: '000000',
  },
};

const CLEAR_CELL_BORDERS = {
  top: NO_BORDER,
  bottom: NO_BORDER,
  left: NO_BORDER,
  right: NO_BORDER,
};

function createLabeledUnderlineRow(
  leftLabel: string,
  leftValue: string,
  rightLabel: string,
  rightValue: string,
  rowHeightTwips = 380
): TableRow {
  return new TableRow({
    height: { value: rowHeightTwips, rule: HeightRule.ATLEAST },
    children: [
      new TableCell({
        width: { size: 15, type: WidthType.PERCENTAGE },
        borders: CLEAR_CELL_BORDERS,
        verticalAlign: VerticalAlign.BOTTOM,
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: leftLabel,
                bold: true,
                size: 20, // 10pt
                font: 'Arial',
              }),
            ],
          }),
        ],
      }),
      new TableCell({
        width: { size: 42, type: WidthType.PERCENTAGE },
        borders: BOTTOM_UNDERLINE_BORDER,
        verticalAlign: VerticalAlign.BOTTOM,
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: leftValue ? ` ${leftValue.toUpperCase()}` : ' ',
                size: 20,
                font: 'Arial',
              }),
            ],
          }),
        ],
      }),
      new TableCell({
        width: { size: 3, type: WidthType.PERCENTAGE },
        borders: CLEAR_CELL_BORDERS,
        children: [new Paragraph({})],
      }),
      new TableCell({
        width: { size: 13, type: WidthType.PERCENTAGE },
        borders: CLEAR_CELL_BORDERS,
        verticalAlign: VerticalAlign.BOTTOM,
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: rightLabel,
                bold: true,
                size: 20,
                font: 'Arial',
              }),
            ],
          }),
        ],
      }),
      new TableCell({
        width: { size: 27, type: WidthType.PERCENTAGE },
        borders: BOTTOM_UNDERLINE_BORDER,
        verticalAlign: VerticalAlign.BOTTOM,
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: rightValue ? ` ${rightValue.toUpperCase()}` : ' ',
                size: 20,
                font: 'Arial',
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

function buildStudentSection(
  config: SchoolConfig,
  student: StudentReport,
  crestBuffer: ArrayBuffer | Uint8Array | null
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

  // 1. Header Table (School Crest on Left + School Name/Details Centered)
  const headerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: NO_BORDER,
      bottom: NO_BORDER,
      left: NO_BORDER,
      right: NO_BORDER,
      insideHorizontal: NO_BORDER,
      insideVertical: NO_BORDER,
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 15, type: WidthType.PERCENTAGE },
            borders: CLEAR_CELL_BORDERS,
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.LEFT,
                children: crestBuffer
                  ? [
                      new ImageRun({
                        data: crestBuffer,
                        transformation: {
                          width: 78,
                          height: 88,
                        },
                        type: 'png',
                      }),
                    ]
                  : [
                      new TextRun({
                        text: 'WINNERS FAMILY SCHOOL',
                        bold: true,
                        size: 16,
                        font: 'Arial',
                      }),
                    ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 85, type: WidthType.PERCENTAGE },
            borders: CLEAR_CELL_BORDERS,
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 40 },
                children: [
                  new TextRun({
                    text: config.schoolName.toUpperCase(),
                    bold: true,
                    size: 44, // 22pt
                    font: 'Algerian',
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 60 },
                children: [
                  new TextRun({
                    text: config.department.toUpperCase(),
                    bold: true,
                    size: 26, // 13pt
                    font: 'Arial Black',
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 30 },
                children: [
                  new TextRun({
                    text: config.postalAddress.toUpperCase(),
                    size: 18, // 9pt
                    font: 'Arial',
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: config.location.toUpperCase(),
                    size: 18, // 9pt
                    font: 'Arial',
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  // 2. Report Title Paragraph ("MOCK 2 EXAMINATION REPORT")
  const reportTitleParagraph = new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 160, after: 200 },
    children: [
      new TextRun({
        text: config.reportTitle.toUpperCase(),
        bold: true,
        size: 22, // 11pt
        font: 'Arial',
        underline: {
          type: UnderlineType.SINGLE,
          color: '000000',
        },
      }),
    ],
  });

  // 3. Organized Top Student Info Table (Name, Class, No. on Roll, Position, Year, Date)
  const topStudentTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: NO_BORDER,
      bottom: NO_BORDER,
      left: NO_BORDER,
      right: NO_BORDER,
      insideHorizontal: NO_BORDER,
      insideVertical: NO_BORDER,
    },
    rows: [
      createLabeledUnderlineRow(
        'NAME:',
        student.name,
        'CLASS:',
        student.studentClass,
        400
      ),
      createLabeledUnderlineRow(
        'NO. ON ROLL:',
        student.noOnRoll,
        'POSITION:',
        student.position,
        400
      ),
      createLabeledUnderlineRow(
        'YEAR:',
        effectiveYear,
        'DATE:',
        effectiveDate,
        400
      ),
    ],
  });

  const spacerBeforeSubjects = new Paragraph({
    spacing: { before: 140, after: 80 },
    children: [],
  });

  // 4. Subjects & Scores Table (Increased size + Straight solid vertical lines across all columns)
  const subjectRows: TableRow[] = [
    new TableRow({
      height: { value: 680, rule: HeightRule.ATLEAST },
      tableHeader: true,
      children: [
        new TableCell({
          width: { size: 39, type: WidthType.PERCENTAGE },
          shading: { fill: 'DCDCDC', type: ShadingType.CLEAR, color: 'auto' },
          verticalAlign: VerticalAlign.CENTER,
          borders: {
            top: THICK_BLACK_BORDER,
            bottom: THICK_BLACK_BORDER,
            left: THICK_BLACK_BORDER,
            right: SOLID_BLACK_BORDER,
          },
          children: [
            new Paragraph({
              indent: { left: 140 },
              children: [
                new TextRun({
                  text: 'SUBJECT',
                  bold: true,
                  size: 20,
                  font: 'Arial',
                }),
              ],
            }),
          ],
        }),
        new TableCell({
          width: { size: 24, type: WidthType.PERCENTAGE },
          shading: { fill: 'DCDCDC', type: ShadingType.CLEAR, color: 'auto' },
          verticalAlign: VerticalAlign.CENTER,
          borders: {
            top: THICK_BLACK_BORDER,
            bottom: THICK_BLACK_BORDER,
            left: SOLID_BLACK_BORDER,
            right: SOLID_BLACK_BORDER,
          },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: 'EXAM SCORE',
                  bold: true,
                  size: 20,
                  font: 'Arial',
                }),
              ],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: '(100%)',
                  bold: true,
                  size: 20,
                  font: 'Arial',
                }),
              ],
            }),
          ],
        }),
        new TableCell({
          width: { size: 12, type: WidthType.PERCENTAGE },
          shading: { fill: 'DCDCDC', type: ShadingType.CLEAR, color: 'auto' },
          verticalAlign: VerticalAlign.CENTER,
          borders: {
            top: THICK_BLACK_BORDER,
            bottom: THICK_BLACK_BORDER,
            left: SOLID_BLACK_BORDER,
            right: SOLID_BLACK_BORDER,
          },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: 'GRADE',
                  bold: true,
                  size: 20,
                  font: 'Arial',
                }),
              ],
            }),
          ],
        }),
        new TableCell({
          width: { size: 25, type: WidthType.PERCENTAGE },
          shading: { fill: 'DCDCDC', type: ShadingType.CLEAR, color: 'auto' },
          verticalAlign: VerticalAlign.CENTER,
          borders: {
            top: THICK_BLACK_BORDER,
            bottom: THICK_BLACK_BORDER,
            left: SOLID_BLACK_BORDER,
            right: THICK_BLACK_BORDER,
          },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: 'MEANING',
                  bold: true,
                  size: 20,
                  font: 'Arial',
                }),
              ],
            }),
          ],
        }),
      ],
    }),
  ];

  // 10 Subject Rows
  for (const sub of summary.scoredSubjects) {
    const showCalculated =
      config.showScoresOnSheet &&
      sub.numericScore !== null &&
      sub.gradeInfo !== null;
    const scoreText = config.showScoresOnSheet ? sub.score : '';
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

    subjectRows.push(
      new TableRow({
        height: { value: 590, rule: HeightRule.ATLEAST },
        children: [
          new TableCell({
            width: { size: 39, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.CENTER,
            borders: {
              top: SOLID_BLACK_BORDER,
              bottom: SOLID_BLACK_BORDER,
              left: THICK_BLACK_BORDER,
              right: SOLID_BLACK_BORDER,
            },
            children: [
              new Paragraph({
                indent: { left: 140 },
                children: [
                  new TextRun({
                    text: sub.name,
                    bold: true,
                    size: 19,
                    font: 'Arial',
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 24, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.CENTER,
            borders: {
              top: SOLID_BLACK_BORDER,
              bottom: SOLID_BLACK_BORDER,
              left: SOLID_BLACK_BORDER,
              right: SOLID_BLACK_BORDER,
            },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: scoreText,
                    bold: true,
                    size: 19,
                    font: 'Arial',
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 12, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.CENTER,
            borders: {
              top: SOLID_BLACK_BORDER,
              bottom: SOLID_BLACK_BORDER,
              left: SOLID_BLACK_BORDER,
              right: SOLID_BLACK_BORDER,
            },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: gradeText,
                    bold: true,
                    size: 19,
                    font: 'Arial',
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.CENTER,
            borders: {
              top: SOLID_BLACK_BORDER,
              bottom: SOLID_BLACK_BORDER,
              left: SOLID_BLACK_BORDER,
              right: THICK_BLACK_BORDER,
            },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: meaningText,
                    bold: true,
                    size: 19,
                    font: 'Arial',
                  }),
                ],
              }),
            ],
          }),
        ],
      })
    );
  }

  // TOTAL MARK Row
  subjectRows.push(
    new TableRow({
      height: { value: 540, rule: HeightRule.ATLEAST },
      children: [
        new TableCell({
          width: { size: 39, type: WidthType.PERCENTAGE },
          shading: { fill: 'DCDCDC', type: ShadingType.CLEAR, color: 'auto' },
          verticalAlign: VerticalAlign.CENTER,
          borders: {
            top: SOLID_BLACK_BORDER,
            bottom: THICK_BLACK_BORDER,
            left: THICK_BLACK_BORDER,
            right: SOLID_BLACK_BORDER,
          },
          children: [
            new Paragraph({
              indent: { left: 140 },
              children: [
                new TextRun({
                  text: 'TOTAL MARK',
                  bold: true,
                  size: 19,
                  font: 'Arial',
                }),
              ],
            }),
          ],
        }),
        new TableCell({
          width: { size: 24, type: WidthType.PERCENTAGE },
          verticalAlign: VerticalAlign.CENTER,
          borders: {
            top: SOLID_BLACK_BORDER,
            bottom: THICK_BLACK_BORDER,
            left: SOLID_BLACK_BORDER,
            right: SOLID_BLACK_BORDER,
          },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: displayTotalMark,
                  bold: true,
                  size: 20,
                  font: 'Arial',
                }),
              ],
            }),
          ],
        }),
        new TableCell({
          width: { size: 37, type: WidthType.PERCENTAGE },
          columnSpan: 2,
          verticalAlign: VerticalAlign.CENTER,
          borders: {
            top: SOLID_BLACK_BORDER,
            bottom: THICK_BLACK_BORDER,
            left: SOLID_BLACK_BORDER,
            right: THICK_BLACK_BORDER,
          },
          children: [new Paragraph({})],
        }),
      ],
    })
  );

  const subjectsTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: subjectRows,
  });

  const spacerAfterSubjects = new Paragraph({
    spacing: { before: 140, after: 80 },
    children: [],
  });

  // 5. Bottom Section Table
  const createFullWidthUnderlineRow = (
    label: string,
    value: string,
    boldLabel = true,
    labelPct = 28
  ) =>
    new TableRow({
      height: { value: 420, rule: HeightRule.ATLEAST },
      children: [
        new TableCell({
          width: { size: labelPct, type: WidthType.PERCENTAGE },
          borders: CLEAR_CELL_BORDERS,
          verticalAlign: VerticalAlign.BOTTOM,
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: label,
                  bold: boldLabel,
                  size: 19,
                  font: 'Arial',
                }),
              ],
            }),
          ],
        }),
        new TableCell({
          width: { size: 100 - labelPct, type: WidthType.PERCENTAGE },
          borders: BOTTOM_UNDERLINE_BORDER,
          verticalAlign: VerticalAlign.BOTTOM,
          columnSpan: 4,
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: value ? ` ${value}` : ' ',
                  size: 19,
                  font: 'Arial',
                }),
              ],
            }),
          ],
        }),
      ],
    });

  const bottomSectionTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: NO_BORDER,
      bottom: NO_BORDER,
      left: NO_BORDER,
      right: NO_BORDER,
      insideHorizontal: NO_BORDER,
      insideVertical: NO_BORDER,
    },
    rows: [
      createLabeledUnderlineRow(
        'AGGREGATE:',
        displayAggregate,
        'RAW SCORE:',
        displayRawScore,
        420
      ),
      createFullWidthUnderlineRow(
        'BEST TWO SUBJECTS:',
        displayBestTwo,
        true,
        24
      ),
      createFullWidthUnderlineRow(
        "Class Teacher's Remarks:",
        student.classTeacherRemarks,
        false,
        24
      ),
      createFullWidthUnderlineRow(
        "Class Teacher's Signature:",
        student.classTeacherSignature,
        false,
        25
      ),
      createLabeledUnderlineRow(
        'School Fees GH¢:',
        student.schoolFees,
        'Arrears GH¢:',
        student.arrears,
        420
      ),
      createFullWidthUnderlineRow('TOTAL GH¢:', student.totalFees, true, 15),
      createFullWidthUnderlineRow(
        'Headmasters Remark / Sign / Official Stamp:',
        student.headmasterRemark,
        true,
        42
      ),
    ],
  });

  return {
    properties: {
      page: {
        size: {
          width: 11906, // A4 width in twips (210mm)
          height: 16838, // A4 height in twips (297mm)
        },
        margin: {
          top: 920,
          bottom: 860,
          left: 1080,
          right: 1080,
        },
        borders: {
          pageBorderTop: {
            style: BorderStyle.TRIPLE,
            size: 24,
            color: '14213D',
            space: 18,
          },
          pageBorderBottom: {
            style: BorderStyle.TRIPLE,
            size: 24,
            color: '14213D',
            space: 18,
          },
          pageBorderLeft: {
            style: BorderStyle.TRIPLE,
            size: 24,
            color: '14213D',
            space: 18,
          },
          pageBorderRight: {
            style: BorderStyle.TRIPLE,
            size: 24,
            color: '14213D',
            space: 18,
          },
          pageBorders: {
            display: PageBorderDisplay.ALL_PAGES,
            offsetFrom: PageBorderOffsetFrom.PAGE,
            zOrder: PageBorderZOrder.FRONT,
          },
        },
      },
    },
    children: [
      headerTable,
      reportTitleParagraph,
      topStudentTable,
      spacerBeforeSubjects,
      subjectsTable,
      spacerAfterSubjects,
      bottomSectionTable,
    ],
  };
}

export function createReportDocxDocument(
  config: SchoolConfig,
  studentsToExport: StudentReport[],
  crestBuffer: ArrayBuffer | Uint8Array | null
): Document {
  const sections = studentsToExport.map((student) =>
    buildStudentSection(config, student, crestBuffer)
  );

  return new Document({
    creator: 'Winners Family School Report Studio',
    title: `${config.schoolName} - ${config.reportTitle}`,
    sections,
  });
}

export function formatDocxFilename(
  studentsToExport: StudentReport[],
  filenamePrefix?: string
): string {
  const safeName = (
    filenamePrefix ||
    (studentsToExport.length === 1
      ? `${String(studentsToExport[0].serialNumber || 1).padStart(2, '0')}_${studentsToExport[0].name}`
      : 'MOCK_2_ALL_41_CANDIDATES')
  )
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .toUpperCase();

  return `${safeName}_MOCK_2_REPORT.docx`;
}

/**
 * Triggers a 100% synchronous native HTML <form method="POST" action="/api/download-docx">
 * submission so the server responds with HTTP Content-Disposition: attachment
 * and the browser's native Save As dialog opens immediately with zero blob/async issues.
 */
export function downloadReportAsDocxSync(
  config: SchoolConfig,
  studentsToExport: StudentReport[],
  filenamePrefix?: string
): string {
  const filename = formatDocxFilename(studentsToExport, filenamePrefix);
  const payload = JSON.stringify({
    config,
    students: studentsToExport,
    filename,
  });

  const form = document.createElement('form');
  form.method = 'POST';
  form.action = '/api/download-docx';
  form.style.display = 'none';

  const input = document.createElement('input');
  input.type = 'hidden';
  input.name = 'payload';
  input.value = payload;
  form.appendChild(input);

  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);

  return filename;
}
