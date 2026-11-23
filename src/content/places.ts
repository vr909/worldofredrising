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
        text: 'Cassius holds the castle as Primus while Mars and Jupiter warbands raid across the frozen Argos; Darrow, wounded, is gone.',
      },
      {
        season: 'thaw',
        text: 'Jupiter’s army besieges the castle across the thawing Argos; Phobos and Deimos are left in rubble.',
      },
    ],
    quotes: [{ text: 'Three walls of our hill castle stand atop eighty-meter stone cliffs.', page: 166 }],
    pages: [164, 166, 168, 169, 280, 281, 383],
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

  // ---------------------------------------------------------------------------------------------
  // Castles named on the book's printed map
  // ---------------------------------------------------------------------------------------------
  {
    id: 'castle-minerva',
    title: 'Minerva Castle',
    subtitle: 'Seat of House Minerva',
    confidence: 'canon',
    summary:
      'A sprawling sandstone fortress in olive country east of the highlands, with thirty-metre walls and a whole city inside.',
    description: [
      'House Minerva holds the rolling country east of the highlands, quilted with wildflowers and olive trees, with rocky hilltops from which its scouts watch the road. Its castle is a sprawling sandstone fortress, drier, cleaner and less oppressive than Mars’s, with a sentry on the rampart above the gate and owls hooting in the old trees.',
      'The walls rise thirty metres, and a hundred metres of bare ground around them turns to mud in heavy rain: a killing field where archers shoot the horse first and the rider second. Inside, a command room on the third level looks out over the dark plain, with an atlas of the valley, a long war table and a statue of the goddess. A city of inhabitants lives within the walls.',
    ],
    facts: [
      { label: 'Walls', value: '30 m' },
      { label: 'Stone', value: 'Sandstone, sprawling' },
      { label: 'Killing field', value: '100 m ring of bare earth' },
      { label: 'Setting', value: 'Olive trees and wildflower meadows' },
      { label: 'Standard', value: 'Golden' },
    ],
    events: [
      {
        season: 'summer',
        text: 'Darrow and Cassius ride in at night disguised as Minervans, wreck the war room and its map, and chop the name of Mars into the war table.',
      },
      {
        season: 'any',
        text: 'In autumn Darrow duels the giant Pax before the walls while Sevro’s Howlers burst from the bellies of dead horses on the killing field. The castle falls in minutes.',
      },
      {
        season: 'any',
        text: 'House Diana, Darrow’s ally in the attack, takes the fortress and enslaves the Minervans. Darrow had trapped them: Sevro spoils the food and wells from inside, and the breakout fails.',
      },
      {
        season: 'any',
        text: 'The slaves stack wood and hay through the fortress and the whole place is set ablaze while Darrow, Cassius and Roque watch.',
      },
    ],
    quotes: [
      {
        text: 'The Minervan castle lies in rolling country quilted with wildflowers and olive trees.',
        page: 217,
      },
      { text: 'We destroy House Minerva in minutes.', page: 259 },
    ],
    pages: [217, 218, 221, 243, 254, 258, 259, 260, 261],
    related: ['castle-mars', 'castle-diana', 'postern-hills', 'highlands'],
  },
  {
    id: 'castle-diana',
    title: 'Diana Castle',
    subtitle: 'Fortress of the Greatwoods hunters',
    confidence: 'canon',
    summary:
      'A hidden forest fortress of bow-wielding hunters, south of Minerva in the Greatwoods and ringed by trees.',
    description: [
      'House Diana lives among the trees of the Greatwoods, south of Minerva’s castle. Its students wear fatigues the colour of the forest, carry bows and knives, and paint the hunting moon on their faces with the juice of woodland berries. They guard the way to their fortress closely: visitors are muffled in rotting furs and spun about so they cannot learn the path.',
      'Woodpeckers hammer somewhere near its walls, a legacy of Fitchner’s prank on Diana’s Proctor. The House is not used to siege warfare. Its soldiers are tree-climbers who scale walls with the ropes they use on their trees, and they have never really left their woods behind.',
    ],
    facts: [
      { label: 'Region', value: 'The Greatwoods, south of Minerva' },
      { label: 'Dress', value: 'Forest-coloured fatigues, bows, knives' },
      { label: 'Face paint', value: 'The hunting moon, in berry juice' },
      { label: 'Primus', value: 'Tamara' },
      { label: 'Tactics', value: 'Tree-climbing ropes' },
    ],
    events: [
      {
        season: 'summer',
        text: 'Fitchner sends Diana’s Proctor a cake packed with live woodpeckers, a gift she is warned will leave her fortress riddled with holes.',
      },
      {
        season: 'any',
        text: 'Darrow and Sevro, blindfolded in furs, are led to Tamara in her glade. Darrow offers an alliance: Diana helps take Minerva, and Mars helps take Ceres.',
      },
      {
        season: 'any',
        text: 'Diana joins the assault on Minerva, seizes the fortress, and is trapped inside it. Tamara dies in the failed breakout; her saddle strap is cut, and Tactus is the suspect.',
      },
      {
        season: 'any',
        text: 'Cassius and the Howlers ride into the Greatwoods to destroy what remains of the House.',
      },
    ],
    quotes: [{ text: 'They have never really left their woods behind.', page: 260 }],
    pages: [173, 218, 249, 250, 251, 252, 259, 260, 261, 264, 312],
    related: ['greatwoods', 'castle-minerva', 'castle-apollo'],
  },
  {
    id: 'castle-apollo',
    title: 'Apollo Castle',
    subtitle: 'The white towers of House Apollo',
    confidence: 'canon',
    summary:
      'A tall, white, ornate castle of six spiralling towers in the deep woods of the south-east, with a cavalry that rules the open plain.',
    description: [
      'House Apollo’s castle is tall, white and ornate. A round plaza opens on six grand doorways, each leading up a spiralling tower, with sheep and cows penned on the far side. A parapet some hundred metres up looks out over the Greatwoods, the mountains to the west and, far to the north, the first hills of Mars’s highlands.',
      'Its heavy cavalry, archer pennants and aggressive Primus make Apollo one of the strongest Houses of the south. It raids as far as the frozen Argos and keeps slaves from other Houses. Its goats, pigs, riverboats and supply forts lie scattered around the castle, and below it are cells and dungeons.',
    ],
    facts: [
      { label: 'Towers', value: 'Six, off a round plaza' },
      { label: 'Parapet', value: 'About 100 m' },
      { label: 'Setting', value: 'Deep woods, south-east' },
      { label: 'Primus', value: 'Novas' },
      { label: 'Pennant', value: 'Archer' },
    ],
    events: [
      {
        season: 'winter',
        text: 'An Apollo rider parleys with Darrow’s army on the plain and offers him a place as a mercenary. Darrow refuses and marches south to find the castle.',
      },
      {
        season: 'winter',
        text: 'A week of raids on Apollo’s forts and boats ends when Tactus and the Howlers crawl in through the latrine holes. The castle falls in under thirty minutes, despite Proctor Apollo’s meddling.',
      },
      {
        season: 'winter',
        text: 'Darrow beats Fitchner in the Apollo war room and locks him in a cell of the castle.',
      },
      {
        season: 'thaw',
        text: 'Apollo’s students form part of the besieging force at Mars Castle, together with Jupiter’s and a quarter of Pluto’s.',
      },
    ],
    quotes: [{ text: 'The castle is tall, white, ornate.', page: 340 }],
    pages: [321, 322, 323, 334, 339, 340, 345, 347, 353, 368, 383],
    related: ['greatwoods', 'castle-diana', 'castle-venus', 'olympus'],
  },
  {
    id: 'castle-ceres',
    title: 'Ceres Castle',
    subtitle: 'The river fortress of House Ceres',
    confidence: 'canon',
    summary:
      'A walled fortress that spans a great river on the southern plain, famous for its bread, orchards and painted horses.',
    description: [
      'House Ceres holds the plain south of the highlands. Its fortress spans a great river, visible from Phobos Tower across open grass, with orchards and crops around it and painted horses in its stables. Its students are soft from bread and little meat, and Darrow calls it the bread fortress.',
      'Inside the high walls a courtyard leads to several buildings and a huge keep where the bread bakes. Archers and dogs patrol the battlements, bundles of tinder burn at the wall’s foot at night, and the approach from the water is watched. Ceres is no stranger to siege.',
    ],
    facts: [
      { label: 'Site', value: 'Spans a great river' },
      { label: 'Known for', value: 'Bread, apple orchards, horses' },
      { label: 'Defences', value: 'High walls, archers, dogs' },
      { label: 'Keep', value: 'Huge, with the ovens' },
    ],
    events: [
      {
        season: 'summer',
        text: 'On the first day the Proctors stage a food drop on the plain. Ceres’s painted horses, ridden by girls with nets, chase Mars’s students back to the woods.',
      },
      {
        season: 'summer',
        text: 'From the sixth day Titus’s raiders besiege Ceres: apple trees are hewn down, horses stolen, and a captured girl dragged from the wall.',
      },
      {
        season: 'winter',
        text: 'While Mars and Jupiter fight across the frozen Argos, Ceres stands unconquered, bread smoke still rising behind its walls.',
      },
      {
        season: 'winter',
        text: 'Darrow’s band crosses the snow with a long tree trunk, Pax holding its tip against the wall as a ramp. Mustang and Darrow go over the wall, Darrow opens the gate from inside, and Ceres falls.',
      },
    ],
    quotes: [{ text: 'an enemy fortress spans a great river', page: 169 }],
    pages: [169, 170, 172, 174, 198, 199, 298, 305, 306, 308, 309, 311, 323],
    related: ['argos', 'castle-mars', 'tower-phobos', 'castle-juno'],
  },
  {
    id: 'castle-jupiter',
    title: 'Jupiter Castle',
    subtitle: 'Triple-walled fortress of the passes',
    confidence: 'canon',
    summary:
      'A fortress on high rocky ground between two rock faces, its three tiers of wall bowing outward, in the low passes of the western mountains.',
    description: [
      'House Jupiter’s castle lies on high, rocky ground in the low mountain passes, wedged between two huge rock faces. Its three-tiered walls bow outward to fit the gap, and a tall, angular keep reaches up into the cliff behind. A postern gate opens onto the rugged mountains.',
      'Inside are a cobbled courtyard, dormitories and a war room. Jupiter is with Mars one of the two superpowers of the North, its soldiers raiding across the frozen Argos, and its Proctor is a huge man with hair like a lion’s and a lightning bolt on his collar.',
    ],
    facts: [
      { label: 'Site', value: 'High rocky ground between two rock faces' },
      { label: 'Walls', value: 'Three tiers, bowing outward' },
      { label: 'Keep', value: 'Tall, angular, built into the cliff' },
      { label: 'Gate', value: 'A postern gate' },
      { label: 'Setting', value: 'Low mountain passes, west' },
    ],
    events: [
      {
        season: 'thaw',
        text: 'Four days’ march from the south brings Darrow’s army to Jupiter’s walls. Wooden ramps carry the outer works in a day, and Jupiter’s main army is stranded across the thawed Argos.',
      },
      {
        season: 'thaw',
        text: 'On the third day a starving boy named Lucian, wearing a Jupiter ring that barely fits, comes out through the postern gate to surrender the castle.',
      },
      {
        season: 'thaw',
        text: 'The surrender is the Jackal’s trap. Darrow’s army feigns drunkenness on grape juice, and Darrow pins the Jackal’s hand to the table with a dagger.',
      },
      {
        season: 'thaw',
        text: 'Pax dies shielding Darrow from the Jackal, who escapes through the postern gate into the mountains.',
      },
    ],
    quotes: [
      {
        text: 'It is sandwiched between two huge rock faces, so its three-tiered walls bow outward.',
        page: 353,
      },
    ],
    pages: [139, 281, 352, 353, 354, 355, 359, 360, 365, 366],
    related: ['western-mountains', 'castle-juno', 'castle-pluto', 'olympus'],
  },
  {
    id: 'castle-juno',
    title: 'Juno Castle',
    subtitle: 'Mountain-framed fortress on an Argos tributary',
    confidence: 'canon',
    summary:
      'A fortress west of the Argos on one of its tributaries, framed by mountains and known for its deep cellars.',
    description: [
      'House Juno’s fortress lies to the west of the Argos on a tributary river, framed by mountains, with the wintry six-kilometre walls of the Valles Marineris standing beyond.',
      'Its cellars run deep: they hold salted beef that Darrow’s army carries away on the march to Jupiter. Juno’s students are scattered through the game by the time the book reaches them: Juno slaves toil in Ceres’s ovens, and Milia, a scornful oathbreaker whose ring says Juno, joins Darrow’s band.',
    ],
    facts: [
      { label: 'Site', value: 'West of the Argos, on a tributary' },
      { label: 'Backdrop', value: 'Mountains and the canyon wall' },
      { label: 'Cellars', value: 'Deep; stores of salted beef' },
    ],
    events: [
      {
        season: 'winter',
        text: 'At nightfall on the second day of the march south from Ceres, Darrow’s army sights the fortress of Juno, already conquered by Jupiter.',
      },
      {
        season: 'thaw',
        text: 'On the march to Jupiter, Darrow’s army raids provisions from burnt and broken castles, including salted beef from Juno’s deep cellars.',
      },
    ],
    quotes: [{ text: 'It lies to the west on a tributary of the Argos. Mountains frame it.', page: 320 }],
    pages: [297, 311, 320, 334, 352, 360],
    related: ['castle-jupiter', 'western-mountains', 'argos', 'castle-vulcan'],
  },

  // ---------------------------------------------------------------------------------------------
  // Castles assigned from clues: the five unlabeled triangles on the printed map, and Pluto
  // ---------------------------------------------------------------------------------------------
  {
    id: 'castle-vulcan',
    title: 'Vulcan Castle',
    subtitle: 'House of the forges',
    confidence: 'inferred',
    summary:
      'A mountain House known for its forges and advanced weapons, a near neighbour of Pluto. We place it in the low mountains of the west.',
    description: [
      'House Vulcan is a House of smiths. Its students arm themselves with advanced weapons from their own forges, and in the first days of the game they struck their neighbour Pluto so hard that it would have been finished within the week.',
      'No scene is set inside its walls. The only glimpse of the House is its Proctor, found by the Howlers on Olympus in a holoImmersion room, with a fire crackling in the corner, watching the game on a screen.',
    ],
    facts: [
      { label: 'Known for', value: 'Forges and advanced weapons' },
      { label: 'Neighbour', value: 'House Pluto, near it in the low mountains' },
      { label: 'Setting', value: 'Western mountains (inferred)' },
    ],
    events: [
      {
        season: 'summer',
        text: 'Vulcan blitzes Pluto on the third day of the game, coming in howling with weapons from its forges.',
      },
      {
        season: 'thaw',
        text: 'Darrow reckons that Jupiter’s army already includes Juno and much of Vulcan, and that the Jackal would command it if he held Jupiter’s castle.',
      },
      {
        season: 'thaw',
        text: 'On Olympus the Howlers find Proctor Vulcan watching Cassius on a battlement under catapult fire, and the Jackal stumbling into a mountain cave.',
      },
    ],
    quotes: [{ text: 'Vulcan came howling in with advanced weapons from their forges.', page: 335 }],
    pages: [335, 360, 371],
    inference:
      'Sevro: the Jackal’s castle is “somewhere in the low mountains. Subterranean… Just near Vulcan” (p.335), and Vulcan “came howling in with advanced weapons from their forges” (p.335), so Vulcan is a mountain House beside Pluto. The printed map shows 12 castles: seven labelled in the legend plus five unlabeled triangles. Only one unlabeled triangle sits in mountain country, in the western range, so we assign it to Vulcan. The text never states Vulcan’s position outright.',
    related: ['castle-pluto', 'western-mountains', 'castle-jupiter'],
  },
  {
    id: 'castle-bacchus',
    title: 'Bacchus Castle',
    subtitle: 'The House of feasts and well-stocked stores',
    confidence: 'inferred',
    summary:
      'A House remembered for its feasts and cellars of wine and grape juice. The book gives no place for it; we put it west of the Argos.',
    description: [
      'House Bacchus is the House of plenty. Mars’s students eat the leftovers of Bacchus’s feast on their first night in the game, and Proctor Ceres jokes that Jupiter’s new cats will grow as fat as Bacchus. Its stores hold jugs and barrels of grape juice, to Sevro’s disappointment: he hoped for wine.',
      'By the winter its students are slaves of other Houses: Apollo holds Bacchus’s students, along with those of Venus and Juno. Its castle is one of the burnt and broken ones that Darrow’s army raids for provisions on the march to Jupiter.',
    ],
    facts: [
      { label: 'Known for', value: 'Feasts and well-stocked stores' },
      { label: 'Stores', value: 'Grape juice, in jugs and barrels' },
      { label: 'Students enslaved by', value: 'Apollo (winter)' },
      { label: 'Setting', value: 'West of the Argos (inferred)' },
    ],
    events: [
      {
        season: 'summer',
        text: 'On their first night of fighting, Mars’s students eat the leftovers of Bacchus’s feast.',
      },
      {
        season: 'thaw',
        text: 'On the march to Jupiter, Darrow’s army raids Bacchus’s castle for provisions: Sevro hoped for wine and finds jugs of grape juice.',
      },
      {
        season: 'thaw',
        text: 'Barrels from Bacchus’s store are carried to Jupiter’s castle. They hold only grape juice, which suits Darrow’s pretence of drunkenness in the Jackal’s trap.',
      },
    ],
    quotes: [
      {
        text: 'jugs from Bacchus’s castle that Sevro was disappointed to discover full of grape juice instead of wine',
        page: 352,
      },
    ],
    pages: [173, 174, 334, 352, 355, 356, 357, 360],
    inference:
      'Clues: Bacchus’s feast leftovers (p.174), its jugs and wine “raided… on the march toward Jupiter” (p.352, 355), and students of Bacchus enslaved by Apollo along with Venus and Juno (p.334). The march runs from Apollo in the south-east to Jupiter in the north-west across the Argos plain. The printed map has two unlabeled triangles on that plain, one each side of the river. The text never says which House is which: we give the western one to Bacchus (on the road to Jupiter) and the eastern one to Venus (“southern lowlands”, p.382).',
    related: ['castle-venus', 'castle-juno', 'argos', 'castle-jupiter'],
  },
  {
    id: 'castle-venus',
    title: 'Venus Castle',
    subtitle: 'A House of the southern lowlands',
    confidence: 'inferred',
    summary:
      'A lowland House whose Proctor is among the sky-watchers of Olympus. The book gives no scene inside it; we put it east of the Argos.',
    description: [
      'House Venus is a lowland House of the south. Proctor Ceres jokes that the vain ones go to Apollo and Venus, and Venus’s own Proctor is among those who watch the game from Olympus, laughing at the fights below.',
      'Venus’s students do not survive the early game intact. Apollo holds some as slaves, Darrow frees them in his raids, and those who help take Jupiter’s fortress are given ceremonial wolfcloaks. The rest become targets, hunted in the southern lowlands.',
    ],
    facts: [
      { label: 'Setting', value: 'Southern lowlands, east of the Argos (inferred)' },
      { label: 'Proctor', value: 'A woman, on Olympus' },
      { label: 'Slaves', value: 'Held by Apollo in winter' },
    ],
    events: [
      {
        season: 'winter',
        text: 'Darrow takes no prisoners in his raids on Apollo’s holdings, except students of Venus, Juno or Bacchus whom Apollo has enslaved.',
      },
      {
        season: 'thaw',
        text: 'Venus slaves who help take Jupiter’s castle win their freedom and wolfcloaks.',
      },
      {
        season: 'thaw',
        text: 'The Howlers find Proctor Venus in bed on Olympus, grapes and wine beside her, and tie her to the bedposts.',
      },
      {
        season: 'thaw',
        text: 'Darrow sends Tactus to hunt down what remains of Venus and Mercury in the southern lowlands.',
      },
    ],
    quotes: [{ text: 'hunt down the remnants of Venus and Mercury in the southern lowlands', page: 382 }],
    pages: [172, 334, 338, 343, 356, 370, 371, 382],
    inference:
      'The only locating clue is p.382: Darrow orders Tactus to hunt “the remnants of Venus and Mercury in the southern lowlands”. Venus is one of the five Houses that fill the unlabeled triangles on the printed map, along with Vulcan, Bacchus, Mercury and Neptune; the text puts it and Mercury in the lowlands. The map has two unlabeled triangles on the Argos plain: we give the eastern one to Venus and the western to Bacchus, a choice the text does not settle.',
    related: ['castle-mercury', 'castle-bacchus', 'argos', 'south-sea'],
  },
  {
    id: 'castle-mercury',
    title: 'Mercury Castle',
    subtitle: 'Trickster House of the southern lowlands',
    confidence: 'inferred',
    summary:
      'The trickster House of the Institute, whose Proctor once loosed a hundred thousand rats in Jupiter’s citadel. We place it in the south.',
    description: [
      'House Mercury is the trickster. On orientation day its Proctor let a hundred thousand rats loose in Jupiter’s citadel, and Proctor Ceres notes that Jupiter was ready because Diana arranged a delivery of a thousand cats. The Proctor himself wears winged feet on his collar, cannot sit still, and has a baby face and a way with a razor that is hard to follow. He nearly picked Darrow in the Draft.',
      'The House does not last. By the first winter its students are reduced to a force of roving vagabonds, and survivors serve as slaves of Apollo until Sevro frees five of them.',
    ],
    facts: [
      { label: 'Proctor', value: 'Small, baby-faced, winged feet on his collar' },
      { label: 'Orientation prank', value: 'Rats loosed in Jupiter’s citadel' },
      { label: 'Setting', value: 'Southern lowlands (inferred)' },
    ],
    events: [
      {
        season: 'winter',
        text: 'Darrow hears that Mercury has been reduced to a force of roving vagabonds.',
      },
      {
        season: 'winter',
        text: 'After Apollo falls, Sevro frees five Mercury students from Apollo’s slave groups.',
      },
      {
        season: 'thaw',
        text: 'On Olympus, Proctor Mercury, laughing in a bathrobe, dances through a half dozen of Darrow’s soldiers until Darrow breaks his arm.',
      },
      {
        season: 'thaw',
        text: 'Darrow orders Tactus to hunt what is left of Mercury and Venus across the southern lowlands.',
      },
    ],
    quotes: [{ text: 'I hear Mercury has been reduced to a force of roving vagabonds.', page: 333 }],
    pages: [139, 173, 212, 333, 344, 373, 382],
    inference:
      'p.382 puts “Venus and Mercury” together in “the southern lowlands”; p.333 lists Mercury among the Houses left in the south. Mercury is one of five Houses that fill the five unlabeled triangles on the printed map, together with Vulcan, Bacchus, Venus and Neptune. We assign Mercury the triangle south-west of the Greatwoods. No passage fixes this: it is the plausible lowland slot left after Venus, Bacchus and Neptune.',
    related: ['castle-venus', 'greatwoods', 'castle-apollo', 'southern-marshes'],
  },
  {
    id: 'castle-neptune',
    title: 'Neptune Castle',
    subtitle: 'House of the trident, by the South Sea',
    confidence: 'inferred',
    summary:
      'The most obscure House of the thirteen, glimpsed only through its trident-crowned Proctor and one student’s ring. We place it on the South Sea shore.',
    description: [
      'Little is known of House Neptune. Its Proctor wears a trident headdress and watches the duel between Darrow and Pax from the floating mountain, swallowing a quail egg as she shouts for the fight to begin.',
      'Its only other mark in Book 1 is a sigil ring among those of the dead, spilled across a table in Jupiter’s castle: a sign that Neptune is one of thirteen Houses, though Fitchner speaks of twelve.',
    ],
    facts: [
      { label: 'Proctor', value: 'A woman with a trident headdress' },
      { label: 'Evidence', value: 'One ring among the dead students’ rings' },
      { label: 'Setting', value: 'South Sea shore (inferred)' },
    ],
    events: [
      {
        season: 'any',
        text: 'In autumn Proctor Neptune joins the other Proctors floating above Darrow’s duel with Pax and shouts for them to get on with it.',
      },
      {
        season: 'thaw',
        text: 'In Jupiter’s castle Darrow tips out a bag of dead students’ rings, among them Neptune’s, and notes that none is Pluto’s.',
      },
    ],
    quotes: [{ text: 'Neptune, her trident headdress wobbling as she swallows a quail egg', page: 257 }],
    pages: [257, 358],
    inference:
      'The text offers no place for Neptune: only a Proctor with a trident headdress (p.257) and a sigil ring among the dead students’ rings (p.358). We place it by elimination. Of the five unlabeled triangles on the printed map, three sit on the Argos plain or south of the Greatwoods (Bacchus, Venus, Mercury) and one in the western mountains (Vulcan). The last, on the South Sea shore, goes to the sea god’s House. This is the weakest placement in the set.',
    related: ['south-sea', 'castle-mercury', 'southern-marshes', 'argos'],
  },
  {
    id: 'castle-pluto',
    title: 'Pluto’s Warrens',
    subtitle: 'The House that is not on the map',
    confidence: 'inferred',
    summary:
      'A subterranean stronghold of tunnels and caves in the low mountains: the Jackal’s House, and the one castle the printed map leaves out.',
    description: [
      'House Pluto’s seat is no castle on a hill but a warren of deep tunnels in the low mountains of the west, near Vulcan. Its students are a mountain people. Their scouts ride small, lean horses, wear heavy clothes against the cold, and braid bones or teeth into hair dyed black, so that they rattle like bamboo wind chimes as they ride. Their sigil is the cypress, the mourning tree.',
      'The House avoids open fighting. Its scouts shadow Darrow’s army through the winter but never come near, however tempting the bait. By the end Darrow’s slingBlade banner flies over the castles of every House except Pluto.',
    ],
    facts: [
      { label: 'Site', value: 'Underground, in the low mountains' },
      { label: 'Sigil', value: 'The cypress, “mourning tree”' },
      { label: 'Scouts', value: 'Black horses, black-dyed bone-braided hair' },
      { label: 'Leader', value: 'The Jackal' },
      { label: 'On the map?', value: 'No' },
    ],
    events: [
      {
        season: 'summer',
        text: 'Vulcan blitzes Pluto on the third day. The Jackal orders a retreat into the deep tunnels, then collapses them behind his own House: ten die, and forty are trapped in the dark for nearly a month.',
      },
      {
        season: 'any',
        text: 'In autumn Lilath, an emissary with two burned fingers and a cypress ring, rides to Mars with the Jackal’s offer to Cassius: fifty ionBlades in exchange for the Reaper, alive or dead.',
      },
      {
        season: 'winter',
        text: 'Pluto’s riders, on black horses with hair dyed black, scout around Darrow’s army. They never fall into his traps.',
      },
      {
        season: 'thaw',
        text: 'A quarter of House Pluto joins Jupiter and Apollo in besieging Mars Castle.',
      },
      {
        season: 'thaw',
        text: 'Mustang delivers her brother, the Jackal of the Mountains, bound and gagged to Darrow on Olympus.',
      },
    ],
    quotes: [
      {
        text: 'His castle is somewhere in the low mountains. Subterranean, not in the high peaks. Just near Vulcan.',
        page: 335,
      },
    ],
    pages: [262, 263, 264, 320, 321, 325, 335, 383, 387, 389],
    inference:
      'Sevro: the Jackal’s castle is “somewhere in the low mountains. Subterranean, not in the high peaks. Just near Vulcan” (p.335). Pluto’s riders scout the woods east of the mountains (p.320–321). Fitchner says there are “twelve Houses in twelve castles” (p.164); the printed map has 12 castle symbols (seven labelled, five unlabeled), yet the text names thirteen Houses. Pluto has no triangle, which fits a castle with nothing to see: a cavern mouth in the mountains. We place it in the low mountains near Vulcan; the exact spot is ours.',
    related: ['castle-vulcan', 'western-mountains', 'castle-jupiter'],
  },

  // ---------------------------------------------------------------------------------------------
  // House Mars territory
  // ---------------------------------------------------------------------------------------------
  {
    id: 'tower-phobos',
    title: 'Phobos Tower',
    subtitle: 'South-west watchtower of House Mars',
    confidence: 'canon',
    summary:
      'A stone tower on a rocky summit five kilometres south-west of the castle, with the widest view of the battlefield.',
    description: [
      'Phobos crowns a rocky height five kilometres south-west of Mars Castle, in the far south-west of the House’s territory. From the top Fitchner shows the new students their battlefield: a snowy range along the western horizon, a primordial wood to the south-east, and between them a lush plain split by the Argos, running down to marshes.',
      'Because it commands the plain, the House uses it as a lookout. Antonia sends shovel-and-axe garrisons to it and to Deimos, Titus’s men use its height to scout Ceres, and a smoke signal from its top can raise the alarm across the valley.',
    ],
    facts: [
      { label: 'Position', value: '5 km south-west of Mars Castle' },
      { label: 'Site', value: 'Rocky summit, stone tower' },
      { label: 'View', value: 'Mountains W, Greatwoods SE, Argos plain S' },
      { label: 'Partner tower', value: 'Deimos (north-west)' },
    ],
    events: [
      {
        season: 'summer',
        text: 'On the House’s first run Fitchner brings the students up here and points out the battlefield and Olympus.',
      },
      {
        season: 'summer',
        text: 'Antonia garrisons Phobos and Deimos with students carrying axes and shovels. Titus’s pack steals the axes as they sleep.',
      },
      {
        season: 'winter',
        text: 'Mars and Jupiter warbands clash on the snowy plain in front of the tower, lances sparking, while Darrow watches and calls it foolish.',
      },
      {
        season: 'winter',
        text: 'Smoke signals from Phobos and Deimos tell Mars’s warband there is no enemy near the Metas bridge, just before Darrow’s ten spring their ambush.',
      },
      {
        season: 'thaw',
        text: 'The besiegers’ catapults reduce Phobos to rubble during the siege of Mars.',
      },
    ],
    quotes: [{ text: 'A stone tower dominates the peak.', page: 168 }],
    pages: [168, 170, 182, 183, 186, 221, 299, 300, 302, 383],
    related: ['castle-mars', 'tower-deimos', 'metas-bridge', 'castle-ceres'],
  },
  {
    id: 'tower-deimos',
    title: 'Deimos Tower',
    subtitle: 'North-west watchtower of House Mars',
    confidence: 'canon',
    summary:
      'A massive tower on the dwarf mountains just beyond the point where the Furor and Metas rivers meet.',
    description: [
      'Deimos is Mars’s northern watchtower: a massive tower on a distant range of dwarf mountains, north-west of the castle and just beyond the V where the two rivers join. With Phobos, it marks the bounds of the House’s territory.',
      'Up close it sits in low hills surrounded by thick woods, where Titus’s men can lounge around its base and Vixus can wait on a high branch. Antonia’s garrison holds it, and its watchmen send smoke signals to the castle.',
    ],
    facts: [
      { label: 'Position', value: 'North-west of the castle, beyond the river junction' },
      { label: 'Terrain', value: 'Dwarf mountains; low hills in thick woods' },
      { label: 'Size', value: 'Massive' },
      { label: 'Partner tower', value: 'Phobos (south-west)' },
    ],
    events: [
      {
        season: 'summer',
        text: 'Fitchner names Deimos on the House’s first run. Lea and Roque scout it clockwise while Darrow and Cassius scout from Phobos.',
      },
      {
        season: 'summer',
        text: 'Quinn runs to Deimos with Darrow’s apology for Antonia. Titus’s men lounge around its base and Vixus waits in a high branch.',
      },
      {
        season: 'winter',
        text: 'Watchmen on Deimos send smoke signals as Darrow’s band sprints into the dwarf mountains to the north after the bridge ambush.',
      },
      {
        season: 'thaw',
        text: 'The besiegers’ catapults leave Deimos as rubble, like Phobos.',
      },
    ],
    quotes: [
      {
        text: 'A massive tower crowns a distant dwarf mountain range just beyond the junction.',
        page: 168,
      },
    ],
    pages: [168, 182, 207, 302, 383],
    related: ['tower-phobos', 'castle-mars', 'furor', 'highlands'],
  },
  {
    id: 'metas-bridge',
    title: 'The Metas Bridge',
    subtitle: 'The open front door of House Mars',
    confidence: 'canon',
    summary:
      'The single bridge over the Metas, the one crossing on the flat, wooded road from the lowlands to Mars Castle’s gate.',
    description: [
      'A single bridge spans the Metas, and an enemy must cross it to enter between the V of the two rivers and strike north-east across easy, wooded ground to the castle. Sevro sees the danger at once: from the lowlands there is a perfect flat passage right to Mars’s gate, with one river to cross.',
      'The bridge stands near Phobos Tower, which keeps watch over it. In winter the woods around it are barren deciduous trees, where Darrow’s ten lie belly-down in white and gray cloaks while the watchmen in the towers cannot see them.',
    ],
    facts: [
      { label: 'Spans', value: 'The Metas' },
      { label: 'Number', value: 'One' },
      { label: 'Approach', value: 'Flat, wooded, north-east to the gate' },
      { label: 'Watch', value: 'Phobos and Deimos towers' },
    ],
    events: [
      {
        season: 'summer',
        text: 'Darrow, Cassius and Sevro cross the bridge by night on stolen horses, carrying Minerva’s standard, to retake the castle from Mustang’s Minervans.',
      },
      {
        season: 'winter',
        text: 'Darrow’s Oathbreakers fell trees across the bridge overnight. Mars’s warband, fearing a trap, turns back, then sends slaves to clear the logs.',
      },
      {
        season: 'winter',
        text: 'Darrow’s ten sprint out of the woods, take the highDrafts and slaves by surprise, and free the giant Pax, who joins them.',
      },
    ],
    quotes: [
      { text: 'A single bridge spans the Metas.', page: 168 },
      { text: 'anyone can just walk right in the front door.', page: 169 },
    ],
    pages: [168, 169, 221, 222, 300, 301, 302],
    related: ['metas', 'castle-mars', 'tower-phobos', 'furor'],
  },
  {
    id: 'pass-fort',
    title: 'The Pass Fort',
    subtitle: 'A weatherworn fort and a survival cache',
    confidence: 'inferred',
    summary:
      'A weatherworn stone fort on a low hill guarding a pass, about ten kilometres from Mars Castle, where the Proctors hid a survival kit.',
    description: [
      'About ten kilometres from the castle, a weatherworn stone fort stands on a low hill guarding a pass. Inside, in a rustic survival box, lie iodine, food, a compass, rope, six durobags, a toothbrush, sulfur matches and simple bandages. Darrow and Cassius gather the supplies into a clear durobag.',
      'The cache tells Darrow that the Proctors have hidden supplies about the valley. Of everything in the box, the matches matter most: he keeps them secret from the others, and fire becomes the lever that wins him a tribe.',
    ],
    facts: [
      { label: 'Distance', value: 'About 10 km from Mars Castle' },
      { label: 'Site', value: 'Low hill guarding a pass' },
      { label: 'Cache', value: 'Iodine, food, compass, rope, matches, bandages' },
      { label: 'Found by', value: 'Darrow and Cassius, on a scouting loop' },
    ],
    events: [
      {
        season: 'summer',
        text: 'Scouting from Phobos, Darrow and Cassius find the fort and its survival box.',
      },
      {
        season: 'summer',
        text: 'Darrow keeps the sulfur matches secret from Titus’s hungry pack and later makes fire the foundation of his tribe.',
      },
    ],
    quotes: [{ text: 'I have sulfur matches and that makes me the god Prometheus.', page: 190 }],
    pages: [182, 183, 190, 198],
    inference:
      'p.183 gives a distance (“some ten kilometers from our castle”), a low hill and a pass, but no direction and no name. Darrow and Cassius head to Phobos and then circle counterclockwise (p.182), which points to the southern or eastern side of the territory, so the fort sits there at the stated distance. The printed map marks only Phobos and Deimos as towers and shows no fort. The “northern fort” of p.198, a lone tower leaning over a ravine in the mist-shrouded highlands, is a different building, so we do not use it.',
    related: ['castle-mars', 'tower-phobos', 'highlands'],
  },

  // ---------------------------------------------------------------------------------------------
  // Regions
  // ---------------------------------------------------------------------------------------------
  {
    id: 'western-mountains',
    title: 'The Mountains',
    subtitle: 'The snowy range of the west',
    confidence: 'canon',
    summary:
      'A snowy range along the valley’s western edge, with Jupiter’s castle in its passes and the lair of the Jackal in its low mountains.',
    description: [
      'From Phobos Tower a snowy mountain range fills the western horizon. Beyond it stand the canyon walls of the Valles Marineris, fifty kilometres west of Mars’s valley and six kilometres high, wintry once the snow comes. The printed map runs the range down the whole west side of the valley.',
      'Several Houses lie in it. Jupiter holds the low passes, Juno’s fortress is framed by the mountains on its stream, and in the low mountains lie the forges of Vulcan and the tunnels of Pluto. The Jackal is called the Jackal of the Mountains.',
    ],
    facts: [
      { label: 'Canyon wall', value: '50 km west of Mars’s valley, 6 km high' },
      { label: 'Houses', value: 'Jupiter, Juno, Vulcan, Pluto' },
      { label: 'Low mountains', value: 'Pluto’s tunnels (south)' },
      { label: 'High passes', value: 'Snow knee-high into the thaw' },
    ],
    events: [
      {
        season: 'winter',
        text: 'Sevro goes into the mountains after the Jackal and leaps from a cliff to escape his men, who are everywhere.',
      },
      {
        season: 'thaw',
        text: 'The Jackal flees from Jupiter’s postern gate up a snowy pass between two peaks, with Darrow and the Howlers at his heels.',
      },
      {
        season: 'thaw',
        text: 'Darrow’s scouts watch the snow peaks for the Jackal’s movements. Mustang later brings him down from them, bound.',
      },
    ],
    quotes: [{ text: 'A snowy mountain range fills the western horizon.', page: 168 }],
    pages: [166, 168, 320, 331, 332, 335, 352, 365, 366, 388, 389],
    related: ['castle-jupiter', 'castle-juno', 'castle-vulcan', 'castle-pluto'],
  },
  {
    id: 'north-woods',
    title: 'The North Woods',
    subtitle: 'Forest of the far north',
    confidence: 'canon',
    summary:
      'A deep forest far north of Ceres, thick with snow in winter, where wolves howl at night and the wounded hide.',
    description: [
      'The North Woods lie far north of Ceres and north-west of the highlands. Thick forest, little creeks and caves, and a harsh winter that heaps snow between the trunks. Wolves howl at night; buzzards come out of their gulches; crows flock in from the south.',
      'On the printed map the forest sits at the top centre, astride the headwaters of the Argos. Jupiter’s soldiers sometimes come into the woods, but it is a place to hide: a wounded boy recovers here, and later a ragged band practises how to take a fortress.',
    ],
    facts: [
      { label: 'Position', value: 'North of Ceres, north-west of the highlands' },
      { label: 'Winter', value: 'Deep snow' },
      { label: 'Water', value: 'Creeks and melted snow, iodine short' },
      { label: 'Wildlife', value: 'Deer, rabbit, wolves, crows' },
    ],
    events: [
      {
        season: 'winter',
        text: 'Darrow wakes in a cave mouth after weeks of fever. Mustang has hidden and nursed him, and the Proctors have left medicine under a bush.',
      },
      {
        season: 'winter',
        text: 'He and Mustang live on rabbit and creek water, hiding from the armies of Mars and Jupiter fighting across the frozen Argos.',
      },
      {
        season: 'winter',
        text: 'Darrow gathers ten Oathbreakers, and in a cleared grove of the Northwoods they practise the long tree-trunk assault on Ceres.',
      },
    ],
    quotes: [
      {
        text: 'We live in the deep north woods, far north of Ceres, northwest of my former highlands.',
        page: 282,
      },
    ],
    pages: [279, 280, 281, 282, 298, 306],
    related: ['castle-ceres', 'highlands', 'argos'],
  },
  {
    id: 'highlands',
    title: 'The Highlands',
    subtitle: 'Misty territory of House Mars',
    confidence: 'canon',
    summary:
      'Mossy hills, craggy peaks and U-shaped glens under near-constant mist: the northern country held by House Mars.',
    description: [
      'The highlands are House Mars’s territory: mossy hills and craggy peaks that dip into U-shaped, grassy glens, with mist over everything, even the fir and oak woods that lie over the foothills like homespun quilts. Lochs, gulches and rocky heights fill the range, and goats and sheep graze the heights.',
      'The sacred animals of Mars live here. Wolves howl across the hills and stalk the woods by day, woodpeckers hammer oak and fir, snakes lurk by the river, vultures sit in quiet gulches and a single raven promises eerie things. Two rivers split a forested valley at the north of the territory, at the edge of a vast wilderness.',
    ],
    facts: [
      { label: 'Holder', value: 'House Mars' },
      { label: 'Landscape', value: 'Mossy hills, craggy peaks, U-shaped glens' },
      { label: 'Weather', value: 'Near-constant mist' },
      { label: 'Wildlife', value: 'Wolves, deerling, goats, sheep, ravens' },
    ],
    events: [
      {
        season: 'summer',
        text: 'On the House’s first run, Fitchner chases down a deerling with his razor and has the students drag it back.',
      },
      {
        season: 'summer',
        text: 'Darrow’s tribe meets for supper by a loch in the northern highlands and keeps its fire secret.',
      },
      {
        season: 'winter',
        text: 'The plain between the highlands and the Argos becomes a battlefield as Mars’s and Jupiter’s armies skirmish across it.',
      },
      {
        season: 'thaw',
        text: 'Mist swaddles the highlands as Jupiter’s army besieges Mars Castle in the mud and Darrow returns to break the siege.',
      },
    ],
    quotes: [
      {
        text: 'There rise mossy hills and craggy peaks that dip into U-shaped, grassy glens.',
        page: 166,
      },
    ],
    pages: [166, 167, 168, 182, 190, 298, 299, 383],
    related: ['castle-mars', 'tower-phobos', 'furor', 'highland-loch'],
  },
  {
    id: 'postern-hills',
    title: 'Postern Hills',
    subtitle: 'Olive country in the north-east',
    confidence: 'canon',
    summary:
      'The rolling, olive-planted hill country of the north-east, home to House Minerva, labelled on the book’s own map.',
    description: [
      'East of the highlands the land opens into rolling country quilted with wildflowers and olive trees. Minerva’s scouts watch from the rocky hilltops, and below them lie wide meadows, in autumn full of wildflowers and grass so tall Sevro could stand and not be seen.',
      'The name “Postern Hills” appears only on the printed map; the text never uses it, and calls the area simply Minerva’s country of high grass and olive trees. Minerva’s castle stands there, among the owls in the old trees.',
    ],
    facts: [
      { label: 'Position', value: 'North-east of the highlands' },
      { label: 'Landscape', value: 'Rolling, with rocky hilltops' },
      { label: 'Vegetation', value: 'Olive trees, wildflowers, tall grass' },
      { label: 'Holder', value: 'House Minerva' },
    ],
    events: [
      {
        season: 'summer',
        text: 'Darrow and Cassius ride east under the twin moons to raid Minerva’s castle.',
      },
      {
        season: 'any',
        text: 'In autumn, Darrow’s army rides into Minerva’s high grass and olive trees and draws the Minervan scouts back behind their walls.',
      },
    ],
    quotes: [{ text: 'Minerva’s scouts dart across their rocky hilltops.', page: 254 }],
    pages: [217, 254],
    related: ['castle-minerva', 'highlands', 'greatwoods'],
  },
  {
    id: 'greatwoods',
    title: 'The Greatwoods',
    subtitle: 'Primordial forest of the south-east',
    confidence: 'canon',
    summary:
      'A vast primordial forest in the south-east, home to House Diana’s hunters, with Apollo’s deep woods at its far end.',
    description: [
      'From Phobos Tower the Greatwoods are a primordial wood that knots the south-east of the landscape, large enough for an army of giants to hide in. In winter they stand dark at the edge of the open plains, and the snow lies deep under the trees.',
      'Two Houses live here. Diana’s hunters hold its northern edge, south of Minerva, and Apollo holds the deeper woods to the south-east. The forest also keeps its own dangers: a white bear as big as a wagon, built by the Carvers for sport, which hunts Darrow through the trees.',
    ],
    facts: [
      { label: 'Position', value: 'South-east, across the Argos plain' },
      { label: 'Houses', value: 'Diana (north edge), Apollo (deep south-east)' },
      { label: 'Winter', value: 'Dark treeline, deep snow' },
      { label: 'Wildlife', value: 'A Carver-made white bear' },
    ],
    events: [
      {
        season: 'any',
        text: 'Darrow and Sevro are led blindfolded through the woods to Tamara’s glade and offer House Diana an alliance.',
      },
      {
        season: 'any',
        text: 'After the fall of Minerva, Cassius and the Howlers ride into the Greatwoods to destroy what is left of Diana.',
      },
      {
        season: 'winter',
        text: 'Proctor Apollo shoves Darrow out of a tree beside a huge white bear, the same beast Darrow and Sevro heard roaring on their way to Diana.',
      },
      {
        season: 'winter',
        text: 'Reunited, Darrow, Mustang, Sevro, Pax and the others sit around a log fire in the snow of the Greatwoods.',
      },
    ],
    quotes: [{ text: 'To the southeast, a primordial wood knots the landscape.', page: 168 }],
    pages: [168, 182, 183, 218, 249, 264, 323, 329, 330, 332, 345],
    related: ['castle-diana', 'castle-apollo', 'argos', 'highlands'],
  },
  {
    id: 'southern-marshes',
    title: 'The Marshes',
    subtitle: 'Wet ground below the plains',
    confidence: 'canon',
    summary:
      'Low marshland at the southern limit of the view from Phobos, where the plains and rivers dip away toward the sea.',
    description: [
      'Seen from the top of Phobos Tower, the view runs south across the plains and rivers until the ground dips away into marshes. Darrow cannot see beyond them. On the printed map they lie between the Argos plain and the South Sea.',
      'The marshes appear only once in Book 1, at the limit of that first look from Phobos.',
    ],
    facts: [
      { label: 'Seen from', value: 'Phobos Tower' },
      { label: 'Position', value: 'South of the plains and rivers' },
      { label: 'Beyond', value: 'Out of sight' },
    ],
    events: [
      {
        season: 'summer',
        text: 'Fitchner shows the House its battlefield from Phobos. The marshes mark its southern end.',
      },
    ],
    quotes: [
      {
        text: 'Farther south, past the plains and rivers, the ground dips away into marshes.',
        page: 168,
      },
    ],
    pages: [168],
    related: ['argos', 'south-sea', 'tower-phobos', 'castle-mercury'],
  },
  {
    id: 'south-sea',
    title: 'South Sea',
    subtitle: 'The water at the valley’s southern edge',
    confidence: 'canon',
    summary: 'The broad water that closes the valley to the south, where the Argos ends.',
    description: [
      'The South Sea closes the valley at its southern end. The printed map draws it as a broad body of water where the Argos empties. The text mentions it once, as the “southern sea”, the source of hard winter winds.',
      'Darrow never sees it: from Phobos the marshes hide whatever lies beyond. On the printed map a single unlabeled castle stands on its shore.',
    ],
    facts: [
      { label: 'Position', value: 'South edge of the valley' },
      { label: 'Fed by', value: 'The Argos (printed map)' },
      { label: 'Winter', value: 'Cold winds roll in from it' },
      { label: 'Called', value: '“Southern sea” in the text' },
    ],
    events: [
      {
        season: 'winter',
        text: 'An Apollo rider whose face has been hardened by the winter winds off the southern sea comes to parley with Darrow’s army.',
      },
    ],
    quotes: [{ text: 'his face hard from the winter winds that roll in from the southern sea', page: 321 }],
    pages: [168, 321],
    related: ['argos', 'southern-marshes', 'castle-neptune', 'castle-mercury'],
  },
  {
    id: 'highland-loch',
    title: 'Highland Loch',
    subtitle: 'A loch in the northern highlands',
    confidence: 'canon',
    summary:
      'A still loch in the northern highlands where Darrow’s first tribe gathers to eat, with the highland range full of other lochs.',
    description: [
      'In the northern highlands a loch gives Darrow’s tribe a place to eat out of sight of the castle. Here the dregs and midDrafts of the House share goat and sheep killed with dull knives, and Lea skins her first sheep with Darrow’s help.',
      'The highlands hold many lochs: from Phobos the southern range looks full of lochs and goats. A different loch, in a humid glen about twenty kilometres east of the castle, is where Darrow and Cassius flee into the water from Minerva’s horsemen. We treat it as a different loch.',
    ],
    facts: [
      { label: 'Position', value: 'Northern highlands' },
      { label: 'Used for', value: 'The tribe’s supper and first kills' },
      { label: 'Other lochs', value: 'The southern range; a glen ~20 km east' },
    ],
    events: [
      {
        season: 'summer',
        text: 'Darrow’s tribe meets here for supper, each member made to kill their own goat or sheep, while the cooking stays a secret.',
      },
      {
        season: 'summer',
        text: 'Lea kills and skins her first sheep, guided by Darrow, while Thistle taunts her.',
      },
    ],
    quotes: [{ text: 'We meet our tribe for supper by a loch in the northern highlands.', page: 190 }],
    pages: [182, 190, 191, 210, 213],
    related: ['highlands', 'castle-mars', 'tower-deimos'],
  },

  // ---------------------------------------------------------------------------------------------
  // Rivers
  // ---------------------------------------------------------------------------------------------
  {
    id: 'argos',
    title: 'The Argos',
    subtitle: 'The great southbound river',
    confidence: 'canon',
    summary:
      'The massive river that divides the valley, running south to the South Sea, with Ceres’s fortress on its banks and Olympus above.',
    description: [
      'From Phobos Tower the Argos is a massive southbound river splitting a lush plain, with tributaries that drain the highlands and the mountains. On the printed map two headwater branches meet near the North Woods, and the river runs south, past Ceres’s fortress at a confluence, to the South Sea.',
      'It is the valley’s great obstacle and its highway. In winter it freezes hard enough for the warbands of Mars and Jupiter to cross and raid at will; in the thaw it opens so fast that an army can be stranded on the wrong bank. Olympus hangs almost a mile above it.',
    ],
    facts: [
      { label: 'Course', value: 'South, to the South Sea' },
      { label: 'Fortress', value: 'Ceres spans it' },
      { label: 'Winter', value: 'Frozen; crossed on foot' },
      { label: 'Thaw', value: 'Opens unexpectedly fast' },
      { label: 'Overhead', value: 'Olympus, nearly a mile up' },
    ],
    events: [
      {
        season: 'winter',
        text: 'Since the river froze, Mars’s and Jupiter’s warbands cross it to raid one another across the plain.',
      },
      {
        season: 'winter',
        text: 'Pax and his strongmen soften the thick ice beside Darrow’s camp with axes, and Apollo’s cavalry go through it in the dark.',
      },
      {
        season: 'thaw',
        text: 'The Argos thaws so quickly that Jupiter’s army is stranded across it, laying siege to Mars Castle.',
      },
    ],
    quotes: [
      {
        text: 'a lush plain split by a massive southbound river, the Argos, and its tributaries',
        page: 168,
      },
      { text: 'They did not expect the river to thaw so quickly.', page: 353 },
    ],
    pages: [168, 281, 298, 299, 323, 353, 370, 375],
    related: ['castle-ceres', 'olympus', 'south-sea', 'castle-juno'],
  },
  {
    id: 'furor',
    title: 'The Furor',
    subtitle: 'River of the northern highlands',
    confidence: 'canon',
    summary:
      'One of the two rivers that meet in a V below the highlands. Fitchner calls it the eastern river.',
    description: [
      'Fitchner names the Furor as the eastern of the two rivers that split Mars’s northern territory, running through a forested valley before they meet in a V pointing south-west. Together they flow to the lowlands as one tributary of the Argos. Darrow’s tribe keeps a supply cache near it, north of the castle.',
      'Text and map do not fully agree. The text calls the Furor the eastern river and the Metas the western, running just south of the castle. The printed map labels neither river, and its branch that passes south of the castle arrives from the east. Elsewhere the book puts the Furor north of the castle, which matches the map’s northern arm.',
    ],
    facts: [
      { label: 'Called', value: '“The eastern river” (p.168)' },
      { label: 'Valley', value: 'Forested, north of the castle' },
      { label: 'Joins', value: 'The Metas, in a V pointing south-west' },
      { label: 'Then', value: 'One tributary of the Argos' },
    ],
    events: [
      {
        season: 'summer',
        text: 'Darrow names a supply cache near the Furor as the meeting point for Antonia’s reply to his apology. Quinn does not come back from Deimos, where Titus’s men lie in wait.',
      },
    ],
    quotes: [{ text: 'The eastern river is called the Furor.', page: 168 }],
    pages: [168, 207],
    related: ['metas', 'highlands', 'tower-deimos', 'argos'],
  },
  {
    id: 'metas',
    title: 'The Metas',
    subtitle: 'The river south of Mars Castle',
    confidence: 'canon',
    summary:
      'The river that runs just south of Mars Castle, crossed by a single bridge that makes the House’s front door.',
    description: [
      'Fitchner calls the western of the two highland rivers the Metas and says it runs just south of the castle. One bridge crosses it, and beyond lies the flat, wooded ground that leads straight to Mars’s western gate. At night it gurgles through the glen below the castle.',
      'It meets the Furor in a V pointing south-west and flows on to the Argos. The names do not sit easily on the printed map, which labels neither river. There, the branch that passes south of the castle arrives from the east, while the text calls the Metas the western river. The diorama follows the text’s statement that the Metas runs just south of the castle.',
    ],
    facts: [
      { label: 'Position', value: 'Just south of Mars Castle' },
      { label: 'Crossing', value: 'One bridge' },
      { label: 'Called', value: '“The western river” (p.168)' },
      { label: 'Joins', value: 'The Furor, below the castle' },
    ],
    events: [
      {
        season: 'summer',
        text: 'Darrow, Cassius and Sevro cross the Metas bridge on stolen horses by night, to confront Mustang below the castle.',
      },
      {
        season: 'winter',
        text: 'In early winter Cassius leads Darrow north toward the Metas, claiming Sevro has found Roque, and there confronts him over the death of his brother Julian.',
      },
      {
        season: 'winter',
        text: 'Trees felled across the Metas bridge lure Mars’s warband into Darrow’s ambush.',
      },
    ],
    quotes: [{ text: 'The western, which runs just south of our castle, is the Metas.', page: 168 }],
    pages: [168, 169, 221, 222, 272, 273, 300, 301],
    related: ['metas-bridge', 'furor', 'castle-mars', 'tower-phobos'],
  },
];
