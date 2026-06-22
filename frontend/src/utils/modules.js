import api from "../api/client";

/* ------------------------------------------------------------------ */
/*  Legacy hardcoded module map — preserved as static fallback so     */
/*  components that synchronously access modulesMap[grade][subject]   */
/*  still work until they are migrated to the async API.              */
/* ------------------------------------------------------------------ */

export const class9MathModules = [
  { title: "Number System and Operations", slug: "chapter-1-nsao" },
  { title: "Quadrilaterals", slug: "chapter-2-quadrilaterals" },
  { title: "Statistics", slug: "chapter-3-statistics" },
  { title: "Trigonometry", slug: "chapter-4-trigonometry" },
  { title: "Square and Square Roots", slug: "chapter-5-square-and-square-roots" },
  { title: "Cube and Cube Roots", slug: "chapter-6-cube-and-cube-roots" },
  { title: "Comparing Quantities", slug: "chapter-7-comparing-quantities" },
  { title: "Algebraic Expressions Identities", slug: "chapter-8-algebraic-expression-identities" },
  { title: "Solid Shapes", slug: "chapter-9-solid-shapes" },
  { title: "Mensuration", slug: "chapter-10-mensuration" },
  { title: "Exponents", slug: "chapter-11-exponents" },
  { title: "Direct Inverse Proportional", slug: "chapter-12-direct-inverse-proportional" },
  { title: "Factorization", slug: "chapter-13-factorization" },
  { title: "Rational Numbers", slug: "chapter-14-rational-numbers" },
  { title: "Linear Equations in one Variable", slug: "chapter-15-linear-equations-in-one-variable" },
  { title: "Percentage Profit and Loss", slug: "chapter-16-percentage-profit-and-loss" },
  { title: "Algebra", slug: "chapter-17-algebra" },
  { title: "Geometry", slug: "chapter-18-geometry" }
];

export const class9ScienceModules = [
  { title: "Magnetism", slug: "chapter-1-magnetism" },
  { title: "Population", slug: "chapter-2-population" },
  { title: "Tissue", slug: "chapter-3-tissue" },
  { title: "Acids, Bases and Salts", slug: "chapter-4-acids, bases and salts" },
  { title: "Environment", slug: "chapter-5-environment" },
  { title: "Electricity", slug: "chapter-6-electricity" },
  { title: "Sources of Energy", slug: "chapter-7-sources of energy" },
  { title: "Crop Production and Microorganisms", slug: "chapter-8-crop production and microorganisms" },
  { title: "Microorganisms", slug: "chapter-9-microorganisms" },
  { title: "Conservation of Plants and Animals", slug: "chapter-10-conservation of plants and animals" },
  { title: "Cell", slug: "chapter-11-cell" },
  { title: "Reproduction", slug: "chapter-12-reproduction" },
  { title: "Synthetic Fibres and Plastics", slug: "chapter-13-synthetic fibres and plastics" },
  { title: "Metals and Non Metals", slug: "chapter-14-metals and non metals" },
  { title: "Coal and Petroleum", slug: "chapter-15-coal and petroleum" },
  { title: "Carbon", slug: "chapter-16-carbon" },
  { title: "Pollution", slug: "chapter-17-pollution" },
  { title: "Pollution of Air and Water", slug: "chapter-18-pollution of air and water" },
  { title: "Air", slug: "chapter-19-air" },
  { title: "Motion, Force, Work and Energy", slug: "chapter-20-motion force work and energy" },
  { title: "Light", slug: "chapter-21-light" },
  { title: "Universe", slug: "chapter-22-universe" },
  { title: "Heat", slug: "chapter-23-heat" },
  { title: "Simple Machine", slug: "chapter-24-simple machine" },
  { title: "Advance Physics", slug: "chapter-25-advance physics" },
  { title: "Nitrogen Oxygen Fire Extinguisher and Buoyancy", slug: "chapter-26-Nitrogen Oxygen Fire Extinguisher and Buoyancy" },
  { title: "Transformation of Substance", slug: "chapter-27-Transformation of Substance" },
  { title: "Adaptations", slug: "chapter-28-Adaptations" },
  { title: "Diseases", slug: "chapter-29-Diseases" },
  { title: "Transportation", slug: "chapter-30-Transportation" },
  { title: "Excretion", slug: "chapter-31-Excretion" },
  { title: "Skeletal System", slug: "chapter-32-Skeletal System" },
  { title: "Respiration", slug: "chapter-33-Respiration" },
  { title: "Heredity and Variations", slug: "chapter-34-Heredity and Variations" },
  { title: "Origin of Life", slug: "chapter-35-Origin of Life" },
  { title: "Control and Co-ordination", slug: "chapter-36-Control and Co-ordination" },
  { title: "Diversity of Living Organism", slug: "chapter-37-Diversity of Living Organism" },
  { title: "Nutrition", slug: "chapter-38-Nutrition" },
  { title: "Food", slug: "chapter-39-Food" },
  { title: "Structure of Atom and Chemical Bonding", slug: "chapter-40-Structure of Atom and Chemical Bonding" }
];

export const class9EnglishModules = [
  { title: "Noun", slug: "chapter-1-Noun" },
  { title: "Pronoun", slug: "chapter-2-Pronoun" },
  { title: "Jumbled Words and Sentences", slug: "chapter-3-Jumbled Words and Sentences" },
  { title: "Verb", slug: "chapter-4-Verb" },
  { title: "Preposition", slug: "chapter-5-Preposition" },
  { title: "Articles", slug: "chapter-6-Articles" },
  { title: "Antonyms OR Synonyms", slug: "chapter-7-Antonyms OR Synonyms" },
  { title: "Comprehension", slug: "chapter-8-Comprehension" },
  { title: "Conjunction", slug: "chapter-9-Conjunction" },
  { title: "Tense", slug: "chapter-10-Tense" },
  { title: "Analogy", slug: "chapter-11-Analogy" },
  { title: "Types of Sentence", slug: "chapter-12-Types of Sentence" },
  { title: "Letters", slug: "chapter-13-Letters" },
  { title: "Modals", slug: "chapter-14-Modals" },
  { title: "Determiners", slug: "chapter-15-Determiners" },
  { title: "Voice", slug: "chapter-16-Voice" },
  { title: "Narration", slug: "chapter-17-Narration" },
  { title: "Clauses", slug: "chapter-18-Clauses" }
];

export const class6MathModules = [
  { title: "Number System", slug: "chapter-1-Number-System" },
  { title: "Data Handling", slug: "chapter-2-Data-Handling" },
  { title: "Mensuration", slug: "chapter-3-Mensuration" },
  { title: "Number Sense and Numerations", slug: "chapter-4-Number-Sense-and-Numerations" },
  { title: "Large Numbers", slug: "chapter-5-Large-Numbers" },
  { title: "Geometry", slug: "chapter-6-Geometry" },
  { title: "Roman Numerals", slug: "chapter-7-Roman-Numerals" },
  { title: "Factors and Multiples", slug: "chapter-8-Factors-and-Multiples" },
  { title: "Decimals", slug: "chapter-9-Decimals" },
  { title: "Area and Perimeter", slug: "chapter-10-Area-and-Perimeter" },
  { title: "Operations on Numbers", slug: "chapter-11-Operations-on-Numbers" },
  { title: "Ratio", slug: "chapter-12-Ratio" }
];

export const class6EnglishModules = [
  { title: "Noun", slug: "chapter-1-Noun" },
  { title: "Pronoun", slug: "chapter-2-Pronoun" },
  { title: "Verb", slug: "chapter-3-Verb" },
  { title: "Adverbs", slug: "chapter-4-Adverbs" },
  { title: "Adjectives", slug: "chapter-5-Adjectives" },
  { title: "Conjunction", slug: "chapter-6-Conjunction" },
  { title: "Preposition", slug: "chapter-7-Preposition" },
  { title: "Tenses", slug: "chapter-8-Tenses" },
  { title: "Jumbled Sentences", slug: "chapter-9-Jumbled-Sentences" },
  { title: "Vocabulary", slug: "chapter-10-Vocabulary" },
  { title: "Active and Passive Voice", slug: "chapter-11-Active-and-Passive-Voice" },
  { title: "Articles", slug: "chapter-12-Articles" },
  { title: "Reported Speech", slug: "chapter-13-Reported-Speech" },
  { title: "Notice Message Writing", slug: "chapter-14-Notice-Message-Writing" },
  { title: "Voice", slug: "chapter-15-Voice" },
  { title: "Direct And Indirect Speech", slug: "chapter-16-Direct-And-Indirect-Speech" },
  { title: "Idioms and Phrases", slug: "chapter-17-Idioms-and-Phrases" },
  { title: "Narration", slug: "chapter-18-Narration" },
  { title: "Types of Sentences", slug: "chapter-19-Types-of-Sentences" },
  { title: "Comprehension", slug: "chapter-20-Comprehension" }
];

export const class6MentalAbilityModules = [
  { title: "Algebra", slug: "chapter-1-Algebra" },
  { title: "Alphabet Test", slug: "chapter-2-Alphabet-Test" },
  { title: "Analogy", slug: "chapter-3-Analogy" },
  { title: "Analogy And Classification", slug: "chapter-4-Analogy-and-Classification" },
  { title: "Blood Relations", slug: "chapter-5-blood-relations" },
  { title: "Classification", slug: "chapter-6-classification" },
  { title: "Coding Decoding", slug: "chapter-7-coding-decoding" },
  { title: "Data Handling", slug: "chapter-8-data-handling" },
  { title: "Direction Sense Test", slug: "chapter-9-direction-sense-test" },
  { title: "Inserting Missing Number", slug: "chapter-10-inserting-missing-number" },
  { title: "Logical Venn Diagram", slug: "chapter-11-logical-venn-diagram" },
  { title: "Measurement", slug: "chapter-12-measurement" },
  { title: "Mirror And Water Image", slug: "chapter-13-mirror-and-water-image" },
  { title: "Non Verbal Reasoning", slug: "chapter-14-non-verbal-reasoning" },
  { title: "Patterns", slug: "chapter-15-patterns" },
  { title: "Series", slug: "chapter-16-series" }
];

/* ------------------------------------------------------------------ */
/*  Sainik School — Class 6  (class 9 has no content yet)            */
/* ------------------------------------------------------------------ */

const sainikClass6EnglishModules = [
  { title: "Noun", slug: "chapter-1-Noun" },
  { title: "Pronoun", slug: "chapter-2-Pronoun" },
  { title: "Verb And Modal", slug: "chapter-3-Verb-and-modal" },
  { title: "Adjective", slug: "chapter-4-Adjective" },
  { title: "Adverb", slug: "chapter-5-Adverb" },
  { title: "Conjuction", slug: "chapter-6-conjuction" },
  { title: "Preposition", slug: "chapter-7-preposition" },
  { title: "Article", slug: "chapter-8-Article" },
  { title: "Senetence", slug: "chapter-9-Senetence" },
  { title: "Framing Of Questions", slug: "chapter-10-Framing-of-Questions" },
  { title: "Tense", slug: "chapter-11-Tense" },
  { title: "Question Tag", slug: "chapter-12-Question-Tag" },
  { title: "One Word Substitution", slug: "chapter-13-One-word-substitution" },
  { title: "General Vocabulary", slug: "chapter-14-General-Vocabulary" },
  { title: "Jumble Word", slug: "chapter-15-Jumble-word" },
  { title: "Reading Comprehension", slug: "chapter-16-Reading-comprehension" },
  { title: "Noun", slug: "chapter-17-Noun" },
  { title: "Pronoun", slug: "chapter-18-Pronoun" },
  { title: "Verb Champs", slug: "chapter-19-verb-champs" },
  { title: "Adverbs", slug: "chapter-20-Adverbs" },
  { title: "Adjective", slug: "chapter-21-Adjective" },
  { title: "Conjunction", slug: "chapter-22-conjunction" },
  { title: "Preposition", slug: "chapter-23-Preposition" },
  { title: "Tenses", slug: "chapter-24-Tenses" },
  { title: "Jumbled Sentences", slug: "chapter-25-Jumbled-Sentences" },
  { title: "Vocabulary", slug: "chapter-26-Vocabulary" },
  { title: "Active And Passive Voice", slug: "chapter-27-Active-and-Passive-voice" },
  { title: "Articles", slug: "chapter-28-Articles" },
  { title: "Reported Speech", slug: "chapter-29-Reported-speech" },
  { title: "Notice And Message Writing", slug: "chapter-30-Notice-and-Message-Writing" },
  { title: "Voice", slug: "chapter-31-Voice" },
  { title: "Direct And Indirect Speech", slug: "chapter-32-Direct-and-Indirect-speech" },
  { title: "Idioms And Phrases Champs", slug: "chapter-33-Idioms-and-phrases-champs" },
  { title: "Narration", slug: "chapter-34-Narration" },
  { title: "Types Of Sentences", slug: "chapter-35-Types-of-sentences" },
  { title: "Comprehension", slug: "chapter-36-comprehension" },
];

const sainikClass6GkModules = [
  { title: "Indian History", slug: "chapter-1-Indian-History" },
  { title: "Famous Personalities Of The Freedom Movement", slug: "chapter-2-Famous-Personalities-of-The-Freedom-Movement" },
  { title: "Indian Constitution", slug: "chapter-3-Indian-Constitution" },
  { title: "The Universe", slug: "chapter-4-The-Universe" },
  { title: "World Geography", slug: "chapter-5-world-geography" },
  { title: "Geography Of India", slug: "chapter-6-geography-of-india" },
  { title: "Environment And Ecology", slug: "chapter-7-Environment-and-Ecology" },
  { title: "United Nations", slug: "chapter-8-United-Nations" },
  { title: "General Knowledge", slug: "chapter-9-General-Knowledge" },
];

const sainikClass6MathsModules = [
  { title: "Number Systems", slug: "chapter-1-Number-Systems" },
  { title: "Fraction And Decimal Fractions", slug: "chapter-2-fraction-and-decimal-fractions" },
  { title: "Square And Square Roots", slug: "chapter-3-square-and-square-roots" },
  { title: "Hcf And Lcm", slug: "chapter-3-HCF-and-LCM" },
  { title: "Simplification", slug: "chapter-4-Simplification" },
  { title: "Unitary Method", slug: "chapter-6-Unitary-Method" },
  { title: "Average", slug: "chapter-7-Average" },
  { title: "Ratio And Proportion", slug: "chapter-8-Ratio-and-Proportion" },
  { title: "Percentage", slug: "chapter-9-Percentage" },
  { title: "Profit And Loss", slug: "chapter-10-Profit-and-Loss" },
  { title: "Simple Interest", slug: "chapter-11-Simple-Interest" },
  { title: "Time Speed And Distance", slug: "chapter-12-Time-speed-and-distance" },
  { title: "Algebra", slug: "chapter-13-Algebra" },
  { title: "Geometry", slug: "chapter-14-Geometry" },
  { title: "Area And Perimeter", slug: "chapter-15-Area-and-perimeter" },
  { title: "Volume And Surface Area", slug: "chapter-16-Volume-and-Surface-Area" },
  { title: "Measurement", slug: "chapter-17-Measurement" },
  { title: "Knowing Our Numbers", slug: "chapter-18-knowing-our-numbers" },
  { title: "Whole Numbers", slug: "chapter-19-whole-numbers" },
  { title: "Playing With Numbers", slug: "chapter-20-playing-with-numbers" },
  { title: "Basic Geometrical Ideas", slug: "chapter-21-basic-geometrical-ideas" },
  { title: "Understanding Elementary Shapes", slug: "chapter-22-Understanding-Elementary-Shapes" },
  { title: "Integers", slug: "chapter-23-Integers" },
  { title: "Fractions", slug: "chapter-24-Fractions" },
  { title: "Decimals", slug: "chapter-25-Decimals" },
  { title: "Data Handling", slug: "chapter-26-Data-Handling" },
  { title: "Mensuration", slug: "chapter-27-Mensuration" },
  { title: "Algebra", slug: "chapter-28-Algebra" },
  { title: "Ratios And Proportions", slug: "chapter-29-Ratios-and-Proportions" },
  { title: "Symmetry", slug: "chapter-30-Symmetry" },
  { title: "Practical Geometry", slug: "chapter-31-Practical-Geometry" },
];

const sainikClass6ReasoningModules = [
  { title: "Analogy", slug: "chapter-1-Analogy" },
  { title: "Classification", slug: "chapter-2-classification" },
  { title: "Series", slug: "chapter-3-series" },
  { title: "Coding Decoding", slug: "chapter-4-coding-decoding" },
  { title: "Alphabetical Order Of Words", slug: "chapter-5-alphabetical-order-of-words" },
  { title: "Ranking Test", slug: "chapter-6-ranking-test" },
  { title: "Mathematical Operations", slug: "chapter-7-mathematical-operations" },
  { title: "Blood Relations", slug: "chapter-8-blood-relations" },
  { title: "Direct Sense Test", slug: "chapter-9-direct-sense-test" },
  { title: "Logical Venn Diagram", slug: "chapter-10-logical-venn-diagram" },
  { title: "Clock And Calendar", slug: "chapter-11-clock-and-calendar" },
  { title: "Sitting Arrangement", slug: "chapter-12-sitting-arrangement" },
  { title: "Non Verbal Intelligence", slug: "chapter-13-non-verbal-intelligence" },
];

const sainikClass6ScienceModules = [
  { title: "Motion", slug: "chapter-1-motion" },
  { title: "Sound", slug: "chapter-2-sound" },
  { title: "Changes In Our Surroundings", slug: "chapter-3-changes-in-our-surroundings" },
  { title: "Materials And Their Properties", slug: "chapter-4-materials-and-their-properties" },
  { title: "Human System And Sense Organs", slug: "chapter-5-human-system-and-sense-organs" },
  { title: "Human Health And Diseases", slug: "chapter-6-human-health-and-diseases" },
  { title: "Heredity", slug: "chapter-7-heredity" },
  { title: "Diversity In Living Organisms", slug: "chapter-8-diversity-in-living-organisms" },
];

export const jnvModulesMap = {
  9: {
    maths: class9MathModules,
    science: class9ScienceModules,
    english: class9EnglishModules,
  },
  6: {
    maths: class6MathModules,
    english: class6EnglishModules,
    "mental-ability": class6MentalAbilityModules,
  },
};

export const sainikModulesMap = {
  9: {
    /* class 9 in Sainik School has no content yet — leave empty */
  },
  6: {
    english: sainikClass6EnglishModules,
    maths: sainikClass6MathsModules,
    science: sainikClass6ScienceModules,
    gk: sainikClass6GkModules,
    reasoning: sainikClass6ReasoningModules,
  },
};

export const modulesMapByExam = {
  JNV: jnvModulesMap,
  Sainik: sainikModulesMap,
};

/* ------------------------------------------------------------------ */
/*  Async API helpers — primary source for module/subject data.       */
/*  Falls back to modulesMap when the API is unreachable.             */
/* ------------------------------------------------------------------ */

const moduleCache = {};

export async function fetchModules(grade, subject, target_exam = "JNV") {
  const key = `${target_exam}:${grade}:${subject}`;
  if (moduleCache[key]) return moduleCache[key];
  try {
    const { data } = await api.get("/learning/modules", { params: { grade, subject, target_exam } });
    if (Array.isArray(data) && data.length > 0) {
      moduleCache[key] = data;
      return data;
    }
  } catch {
    /* fall through to static fallback */
  }
  const map = modulesMapByExam[target_exam] || jnvModulesMap;
  const fallback = map[grade]?.[subject] || [];
  moduleCache[key] = fallback;
  return fallback;
}

export async function fetchSubjects(grade, target_exam = "JNV") {
  const key = `subjects:${target_exam}:${grade}`;
  if (moduleCache[key]) return moduleCache[key];
  try {
    const { data } = await api.get("/learning/subjects", { params: { grade, target_exam } });
    if (Array.isArray(data) && data.length > 0) {
      moduleCache[key] = data;
      return data;
    }
  } catch {
    /* fall through to static fallback */
  }
  const map = modulesMapByExam[target_exam] || jnvModulesMap;
  const fallback = Object.keys(map[grade] || {});
  moduleCache[key] = fallback;
  return fallback;
}

export function clearModuleCache() {
  Object.keys(moduleCache).forEach((k) => delete moduleCache[k]);
}
