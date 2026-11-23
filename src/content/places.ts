/**
 * Lore cards. The first two entries are the GOLDEN EXAMPLES written by the lead: match their
 * voice, length and citation style exactly. T09 fills in the rest (see docs/CONTENT_GUIDE.md).
 */
import type { PlaceContent } from './schema';

export const PLACES: PlaceContent[] = [
  {
    id: 'castle-mars',
    title: 'Mars Castle',
    subtitle: 'Seat of House Mars',
    confidence: 'canon',
    summary:
      'A lonely hill fortress in the misty highlands, guarded by cliffs on three sides and wide open on the fourth.',
    description: [
      'House Mars holds the northern highlands: mossy hills, craggy peaks and U-shaped glens under near-constant mist. Its castle stands on a hill in the middle of a bowl-shaped glen, just north of the river Metas.',
      'Three of its walls rise thirty metres from the top of eighty-metre cliffs. A square keep, fifty metres tall, is built into the north-west wall. The western gate faces it across the courtyard, and a gentle slope leads up to that gate from the glen floor.',
      'Its weakness was obvious from day one. A single bridge over the Metas opens a flat, wooded road from the lowlands straight to the gate.',
    ],
    facts: [
      { label: 'Walls', value: '30 m, atop 80 m cliffs' },
      { label: 'Keep', value: '50 m, square, in the NW wall' },
      { label: 'Gate', value: 'West, reached by a gentle slope' },
      { label: 'Watchtowers', value: 'Phobos (SW) and Deimos (NW)' },
    ],
    events: [
      {
        season: 'summer',
        text: 'The Passage is held within these walls: each student must kill another to join the House.',
      },
      {
        season: 'summer',
        text: 'Titus seizes the castle with raiders and slaves while the House fractures into tribes.',
      },
      {
        season: 'winter',
        text: 'Darrow returns with an army and the castle becomes the base for his campaign south.',
      },
      {
        season: 'thaw',
        text: 'Jupiter’s army besieges the castle across the thawing Argos; Phobos and Deimos are left in rubble.',
      },
    ],
    quotes: [{ text: 'Three walls of our hill castle stand atop eighty-meter stone cliffs.', page: 166 }],
    pages: [164, 166, 168, 169],
    related: ['tower-phobos', 'tower-deimos', 'metas-bridge', 'castle-ceres'],
  },
  {
    id: 'olympus',
    title: 'Olympus',
    subtitle: 'Mountain of the Proctors',
    confidence: 'canon',
    summary:
      'An artificial mountain floating above the Argos, where the Proctors watch the game from a marble citadel.',
    description: [
      'From the valley floor Olympus is a great floating mountain hanging in the blue sky, its peak glimmering with a fairy-tale castle. The Proctors of every House live and watch there, and the medBots that rescue dying students fly out from its slopes.',
      'Up close, its slopes are under snow and its summit hides in cloud. The citadel is bone-pale marble that strikes up out of the rock like a sword, with high balconies and stone terraces. There are no doors and no dock: nobody is meant to arrive uninvited.',
    ],
    facts: [
      { label: 'Altitude', value: '~2 km above the Argos' },
      { label: 'Built', value: 'Artificial, floating' },
      { label: 'Residents', value: 'The Proctors' },
      { label: 'Access', value: 'No doors, no dock' },
    ],
    events: [
      { season: 'summer', text: 'Fitchner first points Olympus out from the top of Phobos Tower.' },
      {
        season: 'thaw',
        text: 'Darrow and the Howlers fly up through a snowstorm and storm the citadel, the first students in history to invade it.',
      },
    ],
    quotes: [{ text: 'It strikes up out of the mountain like a marble sword.', page: 370 }],
    pages: [168, 370],
    related: ['castle-mars', 'castle-jupiter', 'argos'],
  },
];
