window.PACKET_DATA_URL = 'boards_packet_2026_2027_clean_v2.json';

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
  sections.coast_guard_ethos.items.forEach((item, index) => facts.push({ id: `ethos-${index}`, category: 'ethos', section: sections.coast_guard_ethos.section, front: `Ethos line ${index + 1}`, back: item.phrase }));
  sections.general_orders_of_the_sentry.items.forEach((item) => facts.push({ id: `sentry-${item.number}`, category: 'sentry', section: sections.general_orders_of_the_sentry.section, front: `General Order ${item.number}`, back: item.order }));
  add('helm', sections.helm_commands.section, sections.helm_commands.items, 'command', 'action');
  add('lines', sections.line_handling_commands.section, sections.line_handling_commands.items, 'command', 'action');
  add('radio', sections.radio_prowords.section, sections.radio_prowords.items, 'proword', 'meaning');
  sections.coast_guard_missions.items.forEach((item, index) => facts.push({ id: `mission-${index + 2}`, category: 'missions', section: sections.coast_guard_missions.section, front: item.mission, back: item.activities.join(' ') }));
  return { title: packet.title, facts };
};
