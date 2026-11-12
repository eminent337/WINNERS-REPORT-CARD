export interface SubjectEntry {
  id: string;
  name: string;
  isCore: boolean;
  score: string; // Empty string for blank form, or numeric string "0"-"100"
  customGrade?: string;
  customMeaning?: string;
}

export type TopHeaderLayoutStyle =
  | 'symmetrical-3row' // Clean 2x3 grid (Name/Class, No. on Roll/Position, Year/Date)
  | 'compact-2row'     // Compact 2-row (Name/Class on row 1, No. on Roll/Position/Year/Date on row 2)
  | 'card-boxed'       // Boxed executive grid with subtle hairlines
  | 'with-aggregates'; // Includes Aggregate & Raw Score in top section

export type GesGradingScaleStyle = 'ges-standard' | 'ges-remarks';

export interface SchoolConfig {
  schoolName: string;
  department: string;
  postalAddress: string;
  location: string;
  reportTitle: string;
  year: string;
  date: string;
  topLayout: TopHeaderLayoutStyle;
  showTableTickMarks: boolean;
  autoCalculateGrades: boolean;
  showScoresOnSheet: boolean;
  gesScaleStyle?: GesGradingScaleStyle;
}

export interface StudentReport {
  id: string;
  serialNumber: number;
  name: string;
  gender?: 'Male' | 'Female';
  dateOfBirth?: string;
  parentContact?: string;
  studentClass: string;
  noOnRoll: string;
  position: string;
  yearOverride?: string;
  dateOverride?: string;
  subjects: SubjectEntry[];
  manualTotalMark: string;
  manualAggregate: string;
  manualRawScore: string;
  manualBestTwoSubjects: string;
  classTeacherRemarks: string;
  classTeacherSignature: string;
  schoolFees: string;
  arrears: string;
  totalFees: string;
  headmasterRemark: string;
}

// Excludes ASANTE TWI as requested (9 Mock 2 Examination Subjects)
export const DEFAULT_SUBJECTS: Omit<SubjectEntry, 'score'>[] = [
  { id: 'eng', name: 'ENGLISH LANGUAGE', isCore: true },
  { id: 'math', name: 'MATHEMATICS', isCore: true },
  { id: 'sci', name: 'INTEGRATED SCIENCE', isCore: true },
  { id: 'soc', name: 'SOCIAL STUDIES', isCore: true },
  { id: 'rme', name: 'RME', isCore: false },
  { id: 'cted', name: 'CAREER TECHNOLOGY', isCore: false },
  { id: 'comp', name: 'COMPUTING', isCore: false },
  { id: 'arts', name: 'CREATIVE ARTS', isCore: false },
  { id: 'fre', name: 'FRENCH', isCore: false },
];

export interface GradeInfo {
  grade: number;
  meaning: string;
}

/**
 * Official Ghana Education Service (GES) / WAEC BECE 9-Point Grading Scale
 *
 * GES Standard Meanings:
 * 80 - 100 : Grade 1 - HIGHEST (or EXCELLENT)
 * 70 - 79  : Grade 2 - HIGHER (or VERY GOOD)
 * 60 - 69  : Grade 3 - HIGH (or GOOD)
 * 55 - 59  : Grade 4 - HIGH AVERAGE (or CREDIT)
 * 50 - 54  : Grade 5 - AVERAGE (or CREDIT)
 * 45 - 49  : Grade 6 - LOW AVERAGE (or CREDIT)
 * 40 - 44  : Grade 7 - LOW (or PASS)
 * 35 - 39  : Grade 8 - LOWER (or PASS)
 * 0  - 34  : Grade 9 - LOWEST (or FAIL)
 */
export function getBeceGrade(
  score: number,
  scaleStyle: GesGradingScaleStyle = 'ges-standard'
): GradeInfo {
  if (scaleStyle === 'ges-remarks') {
    if (score >= 80) return { grade: 1, meaning: 'EXCELLENT' };
    if (score >= 70) return { grade: 2, meaning: 'VERY GOOD' };
    if (score >= 60) return { grade: 3, meaning: 'GOOD' };
    if (score >= 55) return { grade: 4, meaning: 'CREDIT' };
    if (score >= 50) return { grade: 5, meaning: 'CREDIT' };
    if (score >= 45) return { grade: 6, meaning: 'CREDIT' };
    if (score >= 40) return { grade: 7, meaning: 'PASS' };
    if (score >= 35) return { grade: 8, meaning: 'PASS' };
    return { grade: 9, meaning: 'FAIL' };
  }

  // Default Official GES / BECE Standard (1-9: HIGHEST to LOWEST)
  if (score >= 80) return { grade: 1, meaning: 'HIGHEST' };
  if (score >= 70) return { grade: 2, meaning: 'HIGHER' };
  if (score >= 60) return { grade: 3, meaning: 'HIGH' };
  if (score >= 55) return { grade: 4, meaning: 'HIGH AVERAGE' };
  if (score >= 50) return { grade: 5, meaning: 'AVERAGE' };
  if (score >= 45) return { grade: 6, meaning: 'LOW AVERAGE' };
  if (score >= 40) return { grade: 7, meaning: 'LOW' };
  if (score >= 35) return { grade: 8, meaning: 'LOWER' };
  return { grade: 9, meaning: 'LOWEST' };
}

export function computeStudentSummary(
  student: StudentReport,
  scaleStyle: GesGradingScaleStyle = 'ges-standard'
) {
  const scoredSubjects = student.subjects.map((s) => {
    const parsed = s.score.trim() === '' ? NaN : Number(s.score);
    if (Number.isNaN(parsed) || parsed < 0 || parsed > 100) {
      return {
        ...s,
        numericScore: null as number | null,
        gradeInfo: null as GradeInfo | null,
      };
    }
    return {
      ...s,
      numericScore: parsed,
      gradeInfo: getBeceGrade(parsed, scaleStyle),
    };
  });

  const validSubjects = scoredSubjects.filter((s) => s.numericScore !== null);
  if (validSubjects.length === 0) {
    return {
      scoredSubjects,
      hasAnyScore: false,
      totalMark: '',
      rawScoreBest6: '',
      aggregateBest6: '',
      bestTwoSubjects: '',
    };
  }

  const totalMark = validSubjects.reduce(
    (acc, s) => acc + (s.numericScore ?? 0),
    0
  );

  // 4 Core subjects (English, Math, Science, Social Studies) + Best 2 Electives
  const coreValid = validSubjects.filter((s) => s.isCore);
  const electiveValid = validSubjects
    .filter((s) => !s.isCore)
    .sort((a, b) => (b.numericScore ?? 0) - (a.numericScore ?? 0));

  const best2Electives = electiveValid.slice(0, 2);
  const best6 = [...coreValid, ...best2Electives];

  const rawScoreBest6 = best6.reduce(
    (acc, s) => acc + (s.numericScore ?? 0),
    0
  );
  const aggregateBest6 = best6.reduce(
    (acc, s) => acc + (s.gradeInfo?.grade ?? 9),
    0
  );

  // Best Two Subjects must come strictly from the Elective subjects (the 2 electives in Best 6)
  const bestTwoSubjects = best2Electives
    .map((s) => s.name)
    .join(', ');

  return {
    scoredSubjects,
    hasAnyScore: true,
    totalMark: String(totalMark),
    rawScoreBest6: String(rawScoreBest6),
    aggregateBest6: String(aggregateBest6).padStart(2, '0'),
    bestTwoSubjects,
  };
}

export function getOrdinal(n: number): string {
  const s = ['TH', 'ST', 'ND', 'RD'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function computeClassPositions(
  students: StudentReport[],
  scaleStyle: GesGradingScaleStyle = 'ges-standard'
): Map<string, string> {
  const scoresWithId = students.map((stu) => {
    const summary = computeStudentSummary(stu, scaleStyle);
    const raw = Number(stu.manualRawScore || summary.rawScoreBest6) || 0;
    const agg = Number(stu.manualAggregate || summary.aggregateBest6) || 99;
    return { id: stu.id, raw, agg };
  });

  const sorted = [...scoresWithId].sort(
    (a, b) => b.raw - a.raw || a.agg - b.agg
  );

  const positionMap = new Map<string, string>();
  let currentRank = 1;

  for (let i = 0; i < sorted.length; i++) {
    if (
      i > 0 &&
      (sorted[i].raw < sorted[i - 1].raw || sorted[i].agg > sorted[i - 1].agg)
    ) {
      currentRank = i + 1;
    }
    positionMap.set(sorted[i].id, getOrdinal(currentRank));
  }

  return positionMap;
}

export const INITIAL_SCHOOL_CONFIG: SchoolConfig = {
  schoolName: 'WINNERS FAMILY SCHOOL',
  department: 'JHS DEPARTMENT',
  postalAddress: 'P.O. BOX DC 452, DANSOMAN - ACCRA, TEL : 0277484410',
  location: 'LOCATION: UPPER - WEIJA',
  reportTitle: 'MOCK 2 EXAMINATION REPORT',
  year: '2026/2027',
  date: '11TH NOVEMBER 2026',
  topLayout: 'symmetrical-3row',
  showTableTickMarks: false,
  autoCalculateGrades: true,
  showScoresOnSheet: true,
  gesScaleStyle: 'ges-standard',
};

export interface BioDataCandidate {
  sn: number;
  name: string;
  gender: 'Male' | 'Female';
  dob: string;
  contact: string;
  scores?: Partial<Record<'eng' | 'math' | 'sci' | 'soc' | 'rme' | 'cted' | 'comp' | 'arts' | 'fre', string>>;
  rawScoreSheet?: string;
  positionSheet?: string;
}

export const BECE_2027_CANDIDATES: BioDataCandidate[] = [
  {
    sn: 1,
    name: 'ABRAHAM EZAN NYAMEAYE',
    gender: 'Male',
    dob: '28 - 11 - 2013',
    contact: '0248907473',
    scores: { eng: '50', math: '29', sci: '61', soc: '68', rme: '50', comp: '44', arts: '65', cted: '50', fre: '42' },
    rawScoreSheet: '323',
    positionSheet: '21ST',
  },
  {
    sn: 2,
    name: 'ACKON CHRISTIANA NANA AMA NHYIRA OWUSUWAA',
    gender: 'Female',
    dob: '24 - 12 - 2011',
    contact: '0531867572',
    scores: { eng: '67', math: '63', sci: '91', soc: '86', rme: '84', comp: '80', arts: '62', cted: '55', fre: '45' },
    rawScoreSheet: '463',
    positionSheet: '1ST',
  },
  {
    sn: 3,
    name: 'ADDEY JOSEPHINE AKUA BABYIE',
    gender: 'Female',
    dob: '18 - 07 - 2012',
    contact: '0538604588',
    scores: { eng: '48', math: '34', sci: '67', soc: '68', rme: '59', comp: '45', arts: '57', cted: '43', fre: '50' },
    rawScoreSheet: '334',
    positionSheet: '16TH',
  },
  {
    sn: 4,
    name: 'ADU-BOAHEN DANIEL KWAKU',
    gender: 'Male',
    dob: '12 - 08 - 2010',
    contact: '0555288127',
    scores: { eng: '35', math: '19', sci: '42', soc: '52', rme: '39', comp: '40', arts: '47', cted: '48', fre: '35' },
    rawScoreSheet: '231',
    positionSheet: '40TH',
  },
  {
    sn: 5,
    name: 'AFOAKWA KINGSLEY OHENE AKESE',
    gender: 'Male',
    dob: '23 - 07 - 2012',
    contact: '0277085003',
    scores: { eng: '46', math: '48', sci: '67', soc: '63', rme: '47', comp: '57', arts: '54', cted: '56', fre: '51' },
    rawScoreSheet: '327',
    positionSheet: '17TH',
  },
  {
    sn: 6,
    name: 'ADJEI RANSFORD APPIAH',
    gender: 'Male',
    dob: '8 - 09 - 2012',
    contact: '0531561451',
    scores: { eng: '49', math: '26', sci: '49', soc: '53', rme: '44', comp: '', arts: '49', cted: '46', fre: '' },
    rawScoreSheet: '272',
    positionSheet: '29TH',
  },
  {
    sn: 7,
    name: 'AIDOO KINGSLEY NANA KWEKU',
    gender: 'Male',
    dob: '3 - 04 - 2013',
    contact: '0248013336',
    scores: { eng: '39', math: '25', sci: '52', soc: '56', rme: '47', comp: '61', arts: '59', cted: '40', fre: '36' },
    rawScoreSheet: '292',
    positionSheet: '25TH',
  },
  {
    sn: 8,
    name: 'AKUTUSI PRINCESS BRYANA IMORO',
    gender: 'Female',
    dob: '9 - 03 - 2012',
    contact: '0244898939',
    scores: { eng: '59', math: '36', sci: '61', soc: '53', rme: '55', comp: '52', arts: '62', cted: '42', fre: '40' },
    rawScoreSheet: '336',
    positionSheet: '9TH',
  },
  {
    sn: 9,
    name: 'AKWADAH MIRACLE PENIEL',
    gender: 'Female',
    dob: '29 - 10 - 2012',
    contact: '0544803281',
    scores: { eng: '57', math: '42', sci: '60', soc: '54', rme: '54', comp: '51', arts: '52', cted: '36', fre: '58' },
    rawScoreSheet: '325',
    positionSheet: '19TH',
  },
  {
    sn: 10,
    name: 'AMANBOHWE MCNELLE',
    gender: 'Male',
    dob: '15 - 11 - 2012',
    contact: '0591464349',
    scores: { eng: '44', math: '72', sci: '91', soc: '68', rme: '58', comp: '70', arts: '62', cted: '53', fre: '50' },
    rawScoreSheet: '407',
    positionSheet: '5TH',
  },
  {
    sn: 11,
    name: 'AMEMUKU QUEEN LORLORNYO',
    gender: 'Female',
    dob: '18 - 03 - 2013',
    contact: '0240490005',
    scores: { eng: '41', math: '38', sci: '46', soc: '52', rme: '34', comp: '51', arts: '60', cted: '54', fre: '52' },
    rawScoreSheet: '291',
    positionSheet: '26TH',
  },
  {
    sn: 12,
    name: 'ANANE ANGELA NANA ADJOA',
    gender: 'Female',
    dob: '12 - 11 - 2012',
    contact: '0242223245',
    scores: { eng: '58', math: '34', sci: '56', soc: '59', rme: '38', comp: '49', arts: '53', cted: '45', fre: '38' },
    rawScoreSheet: '301',
    positionSheet: '23RD',
  },
  {
    sn: 13,
    name: 'ANIM YESULEEN ANATE',
    gender: 'Female',
    dob: '01 - 07 - 2012',
    contact: '0556370307',
    scores: { eng: '52', math: '40', sci: '63', soc: '62', rme: '58', comp: '57', arts: '52', cted: '48', fre: '43' },
    rawScoreSheet: '332',
    positionSheet: '12TH',
  },
  {
    sn: 14,
    name: 'ANKUVIE THEODORE GREAT ANGEL ENYONAM NHYIRA',
    gender: 'Female',
    dob: '22 - 06 - 2012',
    contact: '0535135855',
    scores: { eng: '54', math: '33', sci: '56', soc: '73', rme: '57', comp: '36', arts: '58', cted: '53', fre: '45' },
    rawScoreSheet: '331',
    positionSheet: '13TH',
  },
  {
    sn: 15,
    name: 'ANNAN EPHRAIM BOAKYE',
    gender: 'Male',
    dob: '22 - 08 - 2012',
    contact: '0242424551',
    scores: { eng: '32', math: '28', sci: '49', soc: '54', rme: '39', comp: '40', arts: '69', cted: '42', fre: '26' },
    rawScoreSheet: '275',
    positionSheet: '28TH',
  },
  {
    sn: 16,
    name: 'AYIKPA PRINCELLA DOYOE',
    gender: 'Female',
    dob: '09 - 09 - 2009',
    contact: '',
    scores: { eng: '27', math: '18', sci: '46', soc: '43', rme: '29', comp: '29', arts: '57', cted: '47', fre: '35' },
    rawScoreSheet: '238',
    positionSheet: '38TH',
  },
  {
    sn: 17,
    name: 'BADASU DENNIS NUKPLEM GODWINS',
    gender: 'Male',
    dob: '11 - 07 - 2012',
    contact: '0242284984',
    scores: { eng: '38', math: '24', sci: '44', soc: '44', rme: '35', comp: '37', arts: '64', cted: '43', fre: '40' },
    rawScoreSheet: '254',
    positionSheet: '37TH',
  },
  {
    sn: 18,
    name: 'BOATENG PRINCE ACHEMPONG',
    gender: 'Male',
    dob: '15 - 05 - 2011',
    contact: '0244656132',
    scores: { eng: '34', math: '19', sci: '52', soc: '59', rme: '37', comp: '43', arts: '60', cted: '45', fre: '42' },
    rawScoreSheet: '270',
    positionSheet: '30TH',
  },
  {
    sn: 19,
    name: 'BOATENG SEFA ISAAC RIGORBERT NANA KOFI AGYEMAN',
    gender: 'Male',
    dob: '13 - 04 - 2012',
    contact: '0540546542',
    scores: { eng: '43', math: '19', sci: '47', soc: '54', rme: '46', comp: '28', arts: '48', cted: '30', fre: '40' },
    rawScoreSheet: '257',
    positionSheet: '34TH',
  },
  {
    sn: 20,
    name: 'BRUCE NOWELL NII ODARTEY',
    gender: 'Male',
    dob: '20 - 02 - 2011',
    contact: '0257004175',
    scores: { eng: '41', math: '20', sci: '43', soc: '29', rme: '30', comp: '28', arts: '65', cted: '35', fre: '35' },
    rawScoreSheet: '233',
    positionSheet: '39TH',
  },
  {
    sn: 21,
    name: 'BUABENG BRIGHT FOSU',
    gender: 'Male',
    dob: '18 - 11 - 2011',
    contact: '0553477947',
    scores: { eng: '47', math: '31', sci: '43', soc: '46', rme: '30', comp: '30', arts: '55', cted: '33', fre: '33' },
    rawScoreSheet: '255',
    positionSheet: '36TH',
  },
  {
    sn: 22,
    name: 'CHASANTY HALISA HABIL',
    gender: 'Female',
    dob: '20 - 07 - 2013',
    contact: '0557202129',
    scores: { eng: '48', math: '32', sci: '71', soc: '66', rme: '50', comp: '40', arts: '53', cted: '48', fre: '60' },
    rawScoreSheet: '326',
    positionSheet: '18TH',
  },
  {
    sn: 23,
    name: 'COFIE GABRIELLE NAKI',
    gender: 'Female',
    dob: '29 - 05 - 2012',
    contact: '0244111594',
    scores: { eng: '58', math: '41', sci: '66', soc: '64', rme: '71', comp: '61', arts: '75', cted: '55', fre: '41' },
    rawScoreSheet: '375',
    positionSheet: '8TH',
  },
  {
    sn: 24,
    name: 'DADSON ZILLAH KWEGYIREBA',
    gender: 'Female',
    dob: '11 - 03 - 2013',
    contact: '0247810007',
    scores: { eng: '60', math: '43', sci: '73', soc: '71', rme: '68', comp: '61', arts: '73', cted: '52', fre: '42' },
    rawScoreSheet: '388',
    positionSheet: '7TH',
  },
  {
    sn: 25,
    name: 'ESIAKU EMMANUEL GERALD',
    gender: 'Male',
    dob: '29 - 04 - 2011',
    contact: '0549515031',
    scores: { eng: '43', math: '38', sci: '56', soc: '66', rme: '44', comp: '50', arts: '65', cted: '52', fre: '41' },
    rawScoreSheet: '320',
    positionSheet: '16TH',
  },
  {
    sn: 26,
    name: 'KUMOR KHLOE EMEFA',
    gender: 'Female',
    dob: '10 - 03 - 2012',
    contact: '0242945725',
    scores: { eng: '60', math: '31', sci: '58', soc: '58', rme: '56', comp: '45', arts: '63', cted: '42', fre: '47' },
    rawScoreSheet: '326',
    positionSheet: '6TH',
  },
  {
    sn: 27,
    name: 'MAVOR KAREN NHYIRA',
    gender: 'Female',
    dob: '22 - 03 - 2013',
    contact: '0545257688',
    scores: { eng: '42', math: '41', sci: '49', soc: '52', rme: '42', comp: '51', arts: '59', cted: '45', fre: '30' },
    rawScoreSheet: '294',
    positionSheet: '24TH',
  },
  {
    sn: 28,
    name: 'MIREKU VIDA AWURA ESI',
    gender: 'Female',
    dob: '15 - 04 - 2012',
    contact: '0241797236',
    scores: { eng: '28', math: '35', sci: '45', soc: '35', rme: '33', comp: '41', arts: '63', cted: '44', fre: '35' },
    rawScoreSheet: '260',
    positionSheet: '35TH',
  },
  {
    sn: 29,
    name: 'NYAMEDOR EMMANUELLA',
    gender: 'Female',
    dob: '28 - 12 - 2010',
    contact: '0244889491',
    scores: { eng: '23', math: '24', sci: '39', soc: '13', rme: '16', comp: '20', arts: '40', cted: '7', fre: '35' },
    rawScoreSheet: '174',
    positionSheet: '41ST',
  },
  {
    sn: 30,
    name: 'OFORIWAA NANCY',
    gender: 'Female',
    dob: '29 - 09 - 2012',
    contact: '0553843928',
    scores: { eng: '65', math: '34', sci: '67', soc: '87', rme: '75', comp: '68', arts: '', cted: '52', fre: '51' },
    rawScoreSheet: '396',
    positionSheet: '6TH',
  },
  {
    sn: 31,
    name: 'OKRAH TETTEH CHRISTABEL ABIGAIL',
    gender: 'Female',
    dob: '6 - 05 - 2012',
    contact: '0543701713',
    scores: { eng: '47', math: '22', sci: '39', soc: '40', rme: '42', comp: '26', arts: '68', cted: '42', fre: '47' },
    rawScoreSheet: '263',
    positionSheet: '32ND',
  },
  {
    sn: 32,
    name: 'OPOKU ALBERTA AMPOMAH',
    gender: 'Female',
    dob: '31 - 01 - 2012',
    contact: '0249321910',
    scores: { eng: '56', math: '41', sci: '43', soc: '60', rme: '48', comp: '46', arts: '73', cted: '55', fre: '50' },
    rawScoreSheet: '328',
    positionSheet: '14TH',
  },
  {
    sn: 33,
    name: 'OWUSU LOIS TUTU',
    gender: 'Female',
    dob: '31 - 05 - 2012',
    contact: '0555533067',
    scores: { eng: '66', math: '65', sci: '61', soc: '79', rme: '61', comp: '60', arts: '78', cted: '55', fre: '65' },
    rawScoreSheet: '414',
    positionSheet: '4TH',
  },
  {
    sn: 34,
    name: 'QUAIDOO NHYIRA',
    gender: 'Female',
    dob: '3 - 07 - 2012',
    contact: '0242238567',
    scores: { eng: '67', math: '65', sci: '77', soc: '84', rme: '79', comp: '70', arts: '75', cted: '59', fre: '70' },
    rawScoreSheet: '447',
    positionSheet: '2ND',
  },
  {
    sn: 35,
    name: 'SAKYI CHRISTABEL MAFIA GLADYS',
    gender: 'Female',
    dob: '28 - 10 - 2011',
    contact: '0242365365',
    scores: { eng: '50', math: '20', sci: '56', soc: '66', rme: '49', comp: '45', arts: '74', cted: '47', fre: '30' },
    rawScoreSheet: '315',
    positionSheet: '20TH',
  },
  {
    sn: 36,
    name: 'SOMUAH CHRISTABEL OFOSUAH NANA ADJOA',
    gender: 'Female',
    dob: '04 - 02 - 2013',
    contact: '0244384545',
    scores: { eng: '62', math: '59', sci: '77', soc: '84', rme: '61', comp: '61', arts: '75', cted: '54', fre: '46' },
    rawScoreSheet: '418',
    positionSheet: '3RD',
  },
  {
    sn: 37,
    name: 'TAWIAH EMMANUEL KOFI',
    gender: 'Male',
    dob: '21 - 10 - 2012',
    contact: '0243277271',
    scores: { eng: '36', math: '24', sci: '55', soc: '46', rme: '42', comp: '50', arts: '68', cted: '41', fre: '41' },
    rawScoreSheet: '279',
    positionSheet: '27TH',
  },
  {
    sn: 38,
    name: 'TETTEH STEPHANIE OKAIKOR',
    gender: 'Female',
    dob: '25 - 02 - 2012',
    contact: '0240075738',
    scores: { eng: '22', math: '29', sci: '40', soc: '52', rme: '40', comp: '47', arts: '58', cted: '43', fre: '50' },
    rawScoreSheet: '261',
    positionSheet: '33RD',
  },
  {
    sn: 39,
    name: 'TOHOUNGOLIME ELIZABETH',
    gender: 'Female',
    dob: '5 - 01 - 2012',
    contact: '0550314623',
    scores: { eng: '55', math: '39', sci: '50', soc: '68', rme: '54', comp: '51', arts: '67', cted: '55', fre: '43' },
    rawScoreSheet: '334',
    positionSheet: '10TH',
  },
  {
    sn: 40,
    name: 'WILSON WILHELMINA',
    gender: 'Female',
    dob: '01 - 08 - 2014',
    contact: '0243855880',
    scores: { eng: '43', math: '31', sci: '47', soc: '42', rme: '44', comp: '42', arts: '53', cted: '45', fre: '40' },
    rawScoreSheet: '261',
    positionSheet: '33RD',
  },
  {
    sn: 41,
    name: 'YEBOAH KINGSLEY KOFI AGYAPONG',
    gender: 'Male',
    dob: '9 - 03 - 2012',
    contact: '02422261416',
    scores: { eng: '38', math: '45', sci: '52', soc: '59', rme: '44', comp: '48', arts: '69', cted: '48', fre: '40' },
    rawScoreSheet: '311',
    positionSheet: '22ND',
  },
];

export const INITIAL_STUDENTS: StudentReport[] = BECE_2027_CANDIDATES.map(
  (cand) => ({
    id: `stu-${String(cand.sn).padStart(2, '0')}`,
    serialNumber: cand.sn,
    name: cand.name,
    gender: cand.gender,
    dateOfBirth: cand.dob,
    parentContact: cand.contact,
    studentClass: 'BASIC NINE (9)',
    noOnRoll: '41',
    position: cand.positionSheet ?? '',
    subjects: DEFAULT_SUBJECTS.map((s) => ({
      ...s,
      score:
        cand.scores?.[s.id as keyof NonNullable<BioDataCandidate['scores']>] ??
        '',
    })),
    manualTotalMark: '',
    manualAggregate: '',
    manualRawScore: cand.rawScoreSheet ?? '',
    manualBestTwoSubjects: '',
    classTeacherRemarks: '',
    classTeacherSignature: '',
    schoolFees: '',
    arrears: '',
    totalFees: '',
    headmasterRemark: '',
  })
);
