window.PACKET_DATA_URL = 'boards_packet_2026_2027_clean_v2.json?v=8d3fe46';

window.loadStudyData = async function () {
  const response = await fetch(window.PACKET_DATA_URL);
  if (!response.ok) throw new Error(`Could not load packet data: ${response.status}`);
  const packet = await response.json();
  const facts = [];
  const add = (category, section, items, frontKey, backKey, transform = (value) => value, extra = {}) => {
    items.forEach((item, index) => {
      const front = transform(item[frontKey], item);
      const back = transform(item[backKey], item);
      if (front && back) facts.push({ id: `${category}-${index}`, category, section, front, back, ...extra });
    });
  };
  const sections = packet.matching;
  // Only the mission statement itself is tested — the origin/composition (who composed it, when) is not needed.
  add('mission', sections.academy_mission.section, sections.academy_mission.items.filter((item) => item.title === 'Mission'), 'title', 'meaning');
  sections.coast_guard_ethos.items.forEach((item) => facts.push({ id: 'ethos-full', category: 'ethos', section: sections.coast_guard_ethos.section, front: 'The Coast Guard Ethos', back: item.phrase }));
  sections.general_orders_of_the_sentry.items.forEach((item) => facts.push({ id: `sentry-${item.number}`, category: 'sentry', section: sections.general_orders_of_the_sentry.section, front: `General Order ${item.number}`, back: item.order }));
  // Helm/line commands and prowords: keyword "what does it mean" plus a verbatim "type the exact term"
  // question (termSet, handled by makeTermQuestions in app.js). The exact half is skipped for terms that
  // can't be typed word-for-word (slashes/placeholders, e.g. "RIGHT/LEFT ### DEGREES RUDDER").
  add('helm', sections.helm_commands.section, sections.helm_commands.items, 'command', 'action', undefined, { termSet: true });
  add('lines', sections.line_handling_commands.section, sections.line_handling_commands.items, 'command', 'action', undefined, { termSet: true });
  add('radio', sections.radio_prowords.section, sections.radio_prowords.items, 'proword', 'meaning', undefined, { termSet: true });
  // The 11 missions each fall under one of the three maritime roles (packet pp. 31-33). Knowing which
  // role a mission belongs to is the key fact tested; the activities become study detail.
  const missionRole = { 'Search and Rescue': 'Maritime Safety', 'Marine Safety': 'Maritime Safety', 'Ports, Waterways, and Coastal Security': 'Maritime Security', 'Drug Interdiction': 'Maritime Security', 'Migrant Interdiction': 'Maritime Security', 'Defense Readiness': 'Maritime Security', 'Ice Operations': 'Maritime Stewardship', 'Aids to Navigation and Waterways Management': 'Maritime Stewardship', 'Marine Environmental Protection': 'Maritime Stewardship', 'Living Marine Resources': 'Maritime Stewardship', 'Other Law Enforcement': 'Maritime Stewardship' };
  sections.coast_guard_missions.items.forEach((item, index) => { const name = item.mission.replace(/\s+/g, ' ').trim(); facts.push({ id: `mission-${index + 2}`, category: 'missions', section: sections.coast_guard_missions.section, front: name, back: missionRole[name] || '', detail: item.activities.join(' '), roleChoice: true }); });
  const flagFiles = { Alfa: 'alpha.png', Bravo: 'bravo.png', Charlie: 'charlie.png', Delta: 'delta.png', Echo: 'echo.png', Foxtrot: 'foxtrot.png', Golf: 'golf.png', Hotel: 'hotel.png', India: 'india.png', Juliet: 'juliet.png', Kilo: 'kilo.png', Lima: 'lima.png', Mike: 'mike.png', November: 'november.png', Oscar: 'oscar.png', Papa: 'papa.png', Quebec: 'quebec.png', Romeo: 'romeo.png', Sierra: 'sierra.png', Tango: 'tango.png', Uniform: 'uniform.png', Victor: 'victor.png', Whiskey: 'whisky.png', Xray: 'xray.png', Yankee: 'yankee.png', Zulu: 'zulu.png', 'Code/Answer': 'code-answer.webp', 'First substitute': 'first-substitute.webp', 'Second substitute': 'second-substitute.webp', 'Third substitute': 'third-substitute.webp', 'Fourth substitute': 'fourth-substitute.webp' };
  const flagSection = packet.visual_and_identification.nautical_flags;
  flagSection.items.forEach((item, index) => {
    const international = item.international_meaning?.trim(); const navy = item.navy_meaning?.trim();
    const back = navy && navy !== 'None.' ? international && international !== navy ? `International: ${international} Navy: ${navy}` : navy : international || '';
    facts.push({ id: `flag-${index}`, category: 'flags', section: flagSection.section, front: item.name, back, image: `images/nauticalflags/${flagFiles[item.name] || ''}` });
  });
  const assetImages = {
    cutters: ['coastal-patrol-boat.jpg', 'patrol-boat.jpg', 'fast-response-cutter.jpg', 'small-harbor-tug.jpg', 'ice-breaking-tug.jpg', 'inland-construction-tender.jpg', 'costal-bouy-tender.jpg', 'seagoing-bouy-tender.jpg', 'great-lake-ice-breaker.jpg', 'polar-ice-breaker.webp', 'polar-ice-breaker.webp', 'medium-endurance-cutter-class-reliance.png', 'medium-endurance-cuttter-class-famous.jpg', 'offshore-patrol-cutter.jpg', 'national-security-cutter.jpg', 'barque-eagle.webp'],
    small_boats: ['over-the-horizon-IV.webp', 'trailerable-aids-to-navigation-boat.webp', 'trailerable-port-security-boat.jpg', 'long-range-interceptor.jpg', 'bouy-utility-stern-loading.jpg', 'aids-to-navigation-boat.jpg', 'defender-class.png', 'special-purpose-craft-law-enforcement.png', 'response-boat-medium.jpg', 'special-purpose-craft-screening-vessel.webp', 'motor-life-boat.jpg'],
    aircraft: ['MH-60T-DE-jayhawk.png', 'MH-65-dolphin.png', 'HC-130J-super-hercules.jpg', 'HC-27J-spartan.jpg', 'HC-144A-CASA-ocean-sentry.jpg', 'C-37-AB-gulfstream-V.jpg']
  };
  const assetGroups = [
    ['asset_cutters', 'Coast Guard Cutters', packet.visual_and_identification.cutters.items, assetImages.cutters],
    ['asset_small_boats', 'Coast Guard Small Boats', packet.visual_and_identification.small_boats.items, assetImages.small_boats],
    ['asset_aircraft', 'Coast Guard Aircraft', [...packet.visual_and_identification.aircraft.categories.rotary_wing.items, ...packet.visual_and_identification.aircraft.categories.fixed_wing.items], assetImages.aircraft]
  ];
  assetGroups.forEach(([category, section, items, images]) => items.forEach((item, index) => {
    const match = String(item.name).match(/^(.*?)\s*\(([^)]+)\)$/); const name = match ? match[1].trim() : item.name; const callSign = match ? match[2].trim() : '';
    const fields = { name, callSign, class: item.Class || '', length: item.Length || '', hullNumber: item['Hull Number'] || '', range: item.Range || '' };
    const image = images[index] ? `images/assets/${images[index]}` : '';
    facts.push({ id: `${category}-${index}`, category, section, front: name, back: fields.callSign || fields.class || fields.length || fields.hullNumber, asset: { fields, image } });
  }));

  // Basic Nautical Dictionary (packet pp. 20-22) — 88 term/definition pairs.
  add('nautical', packet.term_definitions.nautical_dictionary.section, packet.term_definitions.nautical_dictionary.items, 'term', 'definition');

  // Authored Q&A study sets (customs pp. 26-29, radio procedures p. 36, damage control & fires pp. 34-35).
  const slug = (value) => String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  Object.values(packet.study_additions.curated).forEach((set) => set.groups.forEach((group) => {
    const category = group.category || set.category;
    group.items.forEach((item, index) => facts.push({ id: `${category}-${slug(group.section)}-${index}`, category, section: group.section, front: item.front, back: item.back }));
  }));

  // Coast Guard Districts (packet p. 30) — the interactive coverage map is the lead study slide; recall
  // is name <-> location (HQ) and name <-> area (LANT/PAC). District numbers are NOT tested.
  const districts = packet.study_additions.districts;
  facts.push({ id: 'districts-map', category: 'districts', section: districts.section, front: 'Coast Guard Districts map', back: 'Nine districts in two areas: Atlantic (LANT) and Pacific (PAC).', districtsMap: districts });
  districts.items.forEach((dist) => facts.push({ id: `district-${dist.num}`, category: 'districts', section: districts.section, front: dist.name, back: `${dist.hq} · ${dist.area} Area`, detail: `${dist.name} — headquarters ${dist.hq}; ${dist.area} Area.`, hq: dist.hq, area: dist.area, districtQ: true }));
  facts.push({ id: 'district-lant-cmd', category: 'districts', section: districts.section, front: 'LANT Area Command headquarters', back: districts.areas.LANT.command_hq, districtQ: true });
  facts.push({ id: 'district-pac-cmd', category: 'districts', section: districts.section, front: 'PAC Area Command headquarters', back: districts.areas.PAC.command_hq, districtQ: true });
  facts.push({ id: 'district-hq', category: 'districts', section: districts.section, front: 'Coast Guard Headquarters', back: districts.headquarters.replace(/^.*—\s*/, ''), districtQ: true });

  // U.S. Coast Guard Enlisted Ratings (packet pp. 10-12) — identify the rating name AND abbreviation
  // from the specialty mark, plus a keyword-graded definition. Marks are public-domain U.S. Government
  // works (see images/ratings/CREDITS.md). Keywords below are the core duties from each packet entry.
  const ratings = packet.term_definitions.enlisted_ratings;
  const ratingKeywords = {
    AMT: ['aircraft', 'engines', 'maintain', 'repair', 'airframe'],
    AST: ['survival', 'rescue', 'aircrew', 'equipment', 'training'],
    AET: ['avionics', 'communications', 'navigation', 'electrical', 'flight'],
    BM: ['seamanship', 'deck', 'boat', 'navigation', 'law enforcement'],
    GM: ['weapons', 'ordnance', 'ammunition', 'gunnery', 'boarding'],
    OS: ['command', 'control', 'communications', 'rescue', 'law enforcement'],
    IS: ['intelligence', 'collects', 'analyzes', 'briefs', 'databases'],
    ME: ['law enforcement', 'security', 'anti-terrorism', 'response', 'protection'],
    DV: ['diving', 'underwater', 'searches', 'recoveries', 'repair'],
    DC: ['hulls', 'emergency', 'welding', 'decontamination', 'plumbing'],
    EM: ['propulsion', 'power', 'lighting', 'motors', 'machinery'],
    MK: ['engines', 'boilers', 'propulsion', 'refrigeration', 'machinery'],
    MST: ['inspections', 'vessels', 'facilities', 'environmental', 'regulations'],
    ET: ['electronic', 'communications', 'navigation', 'radar', 'weapons'],
    IT: ['computer', 'voice', 'network', 'infrastructure', 'systems'],
    HS: ['medical', 'treatment', 'diagnostic', 'medications', 'immunizations'],
    CS: ['food', 'baking', 'cookery', 'menus', 'sanitation'],
    SK: ['procurements', 'financial', 'shipping', 'receiving', 'property'],
    YN: ['clerical', 'administrative', 'typing', 'filing', 'records'],
    MU: ['perform', 'band', 'musical', 'ceremonies', 'ensembles'],
    PA: ['interviews', 'news', 'imagery', 'spokespersons', 'websites'],
    CMS: ['cyber', 'secure', 'protecting', 'adversaries', 'operations'],
    IV: ['criminal', 'background', 'intelligence', 'enforcement', 'protection']
  };
  ratings.items.forEach((item, index) => {
    const ab = item.abbreviation;
    facts.push({ id: `ratings-${index}`, category: 'ratings', section: ratings.section, front: item.name, back: ab, detail: item.description, image: `images/ratings/${ab.toLowerCase()}.png`, rating: true, insigniaGroup: 'cg_rating', keywords: ratingKeywords[ab] });
  });

  // Officer, Warrant & Enlisted Ranks (packet pp. 6-9) — identify the rank from its insignia image.
  // Images are public-domain U.S. Government insignia (see images/ranks/CREDITS.md).
  const ranks = packet.visual_and_identification.ranks;
  const rankImg = (file) => `images/ranks/${file}`;
  ranks.coast_guard_navy_commissioned.forEach((item, index) => facts.push({ id: `rank-o-${index}`, category: 'ranks', section: 'Commissioned Officer Ranks (Coast Guard / Navy)', front: item.name, back: `${item.rank} · ${item.abbreviation}`, image: rankImg(`cg-o${index + 1}.png`), insignia: true, insigniaGroup: 'cg_officer', detail: `Pay grade ${item.rank} · ${item.abbreviation}. Shown: U.S. Coast Guard shoulder board.` }));
  ranks.warrant_officer.forEach((item, index) => facts.push({ id: `rank-w-${index}`, category: 'ranks', section: 'Warrant Officer Ranks (Coast Guard)', front: item.name, back: item.abbreviation, image: rankImg(`cg-${item.abbreviation.toLowerCase()}.png`), insignia: true, insigniaGroup: 'cg_warrant', detail: `${item.rank} · ${item.abbreviation}. Shown: U.S. Coast Guard shoulder board.` }));
  const enlistedImg = { 3: 'cg-e4.png', 4: 'cg-e5.png', 5: 'cg-e6.png', 6: 'cg-e7.png', 7: 'cg-e8.png', 8: 'cg-e9.png', 9: 'cg-cpocg.png' };
  ranks.enlisted.forEach((item, index) => {
    const name = item.rank === 'E-9' ? 'Master Chief Petty Officer' : item.name.replace(/\s+/g, ' ');
    const grade = item.rank === 'Special' ? 'E-9 · Chief Petty Officer of the Coast Guard' : item.rank;
    const base = { id: `rank-e-${index}`, category: 'ranks', section: 'Enlisted Ranks (Coast Guard)', front: name, back: grade };
    const file = enlistedImg[index];
    if (file) facts.push({ ...base, image: rankImg(file), insignia: true, insigniaGroup: 'cg_enlisted', detail: `Pay grade ${grade}${item.rank === 'E-9' ? ' (or Command Master Chief Petty Officer)' : ''}. Shown: U.S. Coast Guard collar device.` });
    else facts.push(base); // E-1 / E-2 / E-3 have no distinct device in the packet
  });
  ranks.marine_corps_army_air_force.forEach((item, index) => facts.push({ id: `rank-s-${index}`, category: 'ranks', section: 'Commissioned Officer Ranks (Army / Marine Corps / Air Force)', front: item.name, back: item.rank, image: rankImg(`joint-o${index + 1}.png`), insignia: true, insigniaGroup: 'joint_officer', detail: `Pay grade ${item.rank}. Shown: collar device (shared by Army, Marine Corps, and Air Force).` }));

  // Common Lights and Dayshapes (packet p. 18) — recognition with COLREGS diagrams.
  const lights = packet.study_additions.lights;
  lights.items.forEach((item, index) => facts.push({ id: `lights-${index}`, category: 'lights', section: lights.section, front: item.name, back: item.summary, detail: item.detail, image: `images/lights/${item.image}` }));

  // Recognized Distress Signals (packet p. 33) — verbatim. Each carries a self-authored SVG
  // depiction (images/distress/, order matches the packet list) so the signal can be recognized visually.
  const distress = packet.study_additions.distress;
  const distressImages = ['red-star-shells', 'fog-horn', 'flames', 'gun-intervals', 'orange-flag', 'sos-morse', 'mayday-radio', 'parachute-flare', 'dye-marker', 'november-charlie', 'square-flag-ball', 'wave-arms', 'inmarsat', 'dsc', 'epirb', 'orange-smoke', 'white-flashing-light'];
  distress.items.forEach((item, index) => facts.push({ id: `distress-${index}`, category: 'distress', section: distress.section, front: item.front, back: item.back, image: distressImages[index] ? `images/distress/${distressImages[index]}.svg` : undefined, imageRecognition: true }));

  return { title: packet.title, facts };
};
