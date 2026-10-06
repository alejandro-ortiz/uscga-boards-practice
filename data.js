window.PACKET_DATA_URL = 'boards_packet_2026_2027_clean_v2.json?v=6d384ae';

window.loadStudyData = async function () {
  const response = await fetch(window.PACKET_DATA_URL);
  if (!response.ok) throw new Error(`Could not load packet data: ${response.status}`);
  const packet = await response.json();
  const facts = [];
  const add = (category, section, items, frontKey, backKey, transform = (value) => value) => {
    items.forEach((item, index) => {
      const front = transform(item[frontKey], item);
      const back = transform(item[backKey], item);
      if (front && back) facts.push({ id: `${category}-${index}`, category, section, front, back });
    });
  };
  const sections = packet.matching;
  add('mission', sections.academy_mission.section, sections.academy_mission.items, 'title', 'meaning');
  sections.coast_guard_ethos.items.forEach((item) => facts.push({ id: 'ethos-full', category: 'ethos', section: sections.coast_guard_ethos.section, front: 'The Coast Guard Ethos', back: item.phrase }));
  sections.general_orders_of_the_sentry.items.forEach((item) => facts.push({ id: `sentry-${item.number}`, category: 'sentry', section: sections.general_orders_of_the_sentry.section, front: `General Order ${item.number}`, back: item.order }));
  add('helm', sections.helm_commands.section, sections.helm_commands.items, 'command', 'action');
  add('lines', sections.line_handling_commands.section, sections.line_handling_commands.items, 'command', 'action');
  add('radio', sections.radio_prowords.section, sections.radio_prowords.items, 'proword', 'meaning');
  sections.coast_guard_missions.items.forEach((item, index) => facts.push({ id: `mission-${index + 2}`, category: 'missions', section: sections.coast_guard_missions.section, front: item.mission, back: item.activities.join(' ') }));
  const flagFiles = { Alfa: 'alpha.png', Bravo: 'bravo.png', Charlie: 'charlie.png', Delta: 'delta.png', Echo: 'echo.png', Foxtrot: 'foxtrot.png', Golf: 'golf.png', Hotel: 'hotel.png', India: 'india.png', Juliet: 'juliet.png', Kilo: 'kilo.png', Lima: 'lima.png', Mike: 'mike.png', November: 'november.png', Oscar: 'oscar.png', Papa: 'papa.png', Quebec: 'quebec.png', Romeo: 'romeo.png', Sierra: 'sierra.png', Tango: 'tango.png', Uniform: 'uniform.png', Victor: 'victor.png', Whiskey: 'whisky.png', Xray: 'xray.png', Yankee: 'yankee.png', Zulu: 'zulu.png', 'Code/Answer': 'code-answer.webp', 'First substitute': 'first-substitute.webp', 'Second substitute': 'second-substitute.webp', 'Third substitute': 'third-substitute.webp', 'Fourth substitute': 'fourth-substitute.webp' };
  const flagSection = packet.visual_and_identification.nautical_flags;
  flagSection.items.forEach((item, index) => {
    const international = item.international_meaning?.trim(); const navy = item.navy_meaning?.trim();
    const back = navy && navy !== 'None.' ? international && international !== navy ? `International: ${international} Navy: ${navy}` : navy : international || '';
    facts.push({ id: `flag-${index}`, category: 'flags', section: flagSection.section, front: item.name, back, image: `images/nauticalflags/${flagFiles[item.name] || ''}` });
  });
  const assetImages = {
    cutters: ['coastal-patrol-boat.jpg', 'patrol-boat.jpg', 'fast-response-cutter.jpg', 'small-harbor-tug.jpg', 'inland-construction-tender.jpg', 'costal-bouy-tender.jpg', 'costal-bouy-tender.jpg', 'seagoing-bouy-tender.jpg', 'great-lake-ice-breaker.jpg', 'polar-ice-breaker.webp', 'polar-ice-breaker.webp', 'medium-endurance-cutter-class-reliance.png', 'medium-endurance-cuttter-class-famous.jpg', 'offshore-patrol-cutter.jpg', 'national-security-cutter.jpg', 'barque-eagle.webp'],
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
  return { title: packet.title, facts };
};
