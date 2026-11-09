// Per-section study/test configuration (behavior, not packet content).
// `category` keys match the checkbox values in index.html and the `category` on each fact.
//
// Grading (set by the owner):
//   - Whole test: need `passOverall`% of all questions correct to pass.
//   - Verbatim sections: answer must be typed word-for-word.
//   - Everything else: answer passes if it contains at least `keywordThreshold` of the
//     expected answer's key terms — sentence structure does not matter.
// verbatim — true means cadets must know it word-for-word.
// unit     — a light topical label (for grouping/filtering only; not a required path).
window.CURRICULUM = {
  units: [
    'Core Knowledge',
    'Customs & Courtesies',
    'Seamanship & Commands',
    'Communications',
    'Organization & Missions',
    'Visual Identification',
    'Damage Control & Firefighting',
    'Uniforms & Grooming'
  ],
  passOverall: 90,       // percent of the whole test needed to pass
  keywordThreshold: 0.7, // fraction of key terms a non-verbatim answer must contain
  default: { unit: 'Reference', verbatim: false },
  sections: {
    // Verbatim — must be word-for-word.
    mission:    { unit: 'Core Knowledge',        verbatim: true },
    ethos:      { unit: 'Core Knowledge',        verbatim: true },
    sentry:     { unit: 'Core Knowledge',        verbatim: true },
    distress:   { unit: 'Visual Identification', verbatim: true }, // when added

    // Keywords / understanding (verbatim defaults to false).
    etiquette:  { unit: 'Customs & Courtesies' },
    colors:     { unit: 'Customs & Courtesies' },
    shipboard:  { unit: 'Customs & Courtesies' },
    saluting:   { unit: 'Customs & Courtesies' },
    helm:       { unit: 'Seamanship & Commands' },
    lines:      { unit: 'Seamanship & Commands' },
    nautical:   { unit: 'Seamanship & Commands' },
    radio:      { unit: 'Communications' },
    radio_proc: { unit: 'Communications' },
    missions:   { unit: 'Organization & Missions' },
    districts:  { unit: 'Organization & Missions' },
    ratings:    { unit: 'Organization & Missions', recognition: true }, // short identifiers → test by recognition
    ranks:      { unit: 'Organization & Missions', recognition: true },
    flags:      { unit: 'Visual Identification' },
    assets:     { unit: 'Visual Identification' },
    damage:     { unit: 'Damage Control & Firefighting' },
    fires:      { unit: 'Damage Control & Firefighting' }
  },
  // Resolve a fact's category (incl. asset_* subtypes) to its section config.
  for(category) {
    const key = String(category || '').startsWith('asset_') ? 'assets' : category;
    return this.sections[key] || this.default;
  }
};
