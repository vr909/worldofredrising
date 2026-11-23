/**
 * House lore: Proctor, notable students and fate in Book 1. Pages are PDF page numbers of the reference
 * edition (see docs/research/institute-canon.md). Book 1 only; students are those the book names.
 * Only Fitchner (Mars) is named as a Proctor; the others are called by their House name in the text.
 */
import type { HouseId } from '../world/types';
import type { HouseContent } from './schema';

export const HOUSE_LORE: Record<HouseId, HouseContent> = {
  mars: {
    id: 'mars',
    proctor: 'Fitchner',
    proctorNote: 'Pops gumbubbles, wears gravBoots and watches his House from Olympus.',
    students: [
      {
        name: 'Darrow',
        note: 'A Red Helldiver passing as Gold, drafted into Mars; he ends the game as Primus.',
        page: 387,
      },
      {
        name: 'Cassius au Bellona',
        note: 'Darrow’s closest friend and rival; the Primus who takes over when Darrow falls.',
        page: 280,
      },
      {
        name: 'Sevro',
        note: 'The small, fierce “Goblin” in a wolfcloak, first of the Howlers, Darrow’s band for quiet tasks.',
        page: 243,
      },
      { name: 'Roque', note: 'A gentle Gold who looks and speaks like a poet.', page: 146 },
      {
        name: 'Titus au Ladros',
        note: 'A giant of a student, over two metres tall, who seizes the castle and rules by raids.',
        page: 164,
      },
      {
        name: 'Antonia',
        note: 'A spoiled but not stupid Gold who garrisons the towers and builds her own following.',
        page: 183,
      },
    ],
    fate: 'The House splinters into tribes after the Passage. Darrow retakes the castle, has Titus tried, and is made Primus, then is wounded by Cassius’s betrayal. Starved by a winter siege from Jupiter, Apollo and a quarter of Pluto, the House is relieved when Darrow and the Howlers land and enslave the besiegers with the standard of Mars.',
    pages: [146, 162, 164, 183, 222, 234, 241, 243, 261, 272, 280, 383, 384, 385, 387],
  },
  minerva: {
    id: 'minerva',
    students: [
      {
        name: 'Mustang',
        note: 'Virginia au Augustus, the clever rider who leads Minerva’s horse; sister of the Jackal.',
        page: 382,
      },
      {
        name: 'Pax au Telemanus',
        note: 'A giant, genetically bred to fight, who roars his name in battle and later joins Darrow.',
        page: 223,
      },
    ],
    fate: 'In autumn the sandstone fortress falls in minutes to Darrow’s army, and Minerva’s students are enslaved, first by Diana and then by Darrow. Mustang escapes, nurses Darrow in the North Woods and becomes his ally; Pax is made a slave of Mars and becomes his friend.',
    pages: [222, 223, 259, 260, 261, 280, 281, 382],
  },
  diana: {
    id: 'diana',
    proctorNote: 'A woman, the target of Fitchner’s prank cake of live woodpeckers.',
    students: [
      {
        name: 'Tamara',
        note: 'The Primus of Diana, who negotiates with Darrow in her glade and dies in the breakout.',
        page: 261,
      },
      {
        name: 'Tactus',
        note: 'A languid, cruel Iron Gold of an old family; he becomes Darrow’s slave and then one of his lieutenants.',
        page: 313,
      },
    ],
    fate: 'Diana allies with Mars against Minerva, but takes the Minervan fortress for itself and is trapped inside it. Tamara dies in the failed breakout and the House is enslaved; Cassius and the Howlers hunt down the remnant in the Greatwoods.',
    pages: [173, 249, 250, 252, 259, 260, 261, 264, 312, 313, 376],
  },
  apollo: {
    id: 'apollo',
    proctorNote:
      'Beautiful, with coiled hair and a bow on his collar; he later takes the field against Darrow with a pulseSpear.',
    students: [
      { name: 'Novas', note: 'The Apollo Primus, who carries a pulseSpear lent by his Proctor.', page: 340 },
    ],
    fate: 'In winter Darrow’s army enters Apollo’s castle through the latrine holes and wins it in under thirty minutes, despite Proctor Apollo’s interference. Its students later appear among the besiegers of Mars, whom Darrow enslaves.',
    pages: [139, 321, 334, 339, 340, 343, 383, 384],
  },
  ceres: {
    id: 'ceres',
    proctorNote: 'A laughing woman who drinks wine with Fitchner and trades barbs with him.',
    students: [
      {
        name: 'Nyla',
        note: 'A quiet, clever Ceres girl who becomes one of Darrow’s division commanders.',
        page: 314,
      },
    ],
    fate: 'Besieged by Mars’s raiders in the summer and unconquered through the first winter, Ceres falls to Darrow’s dawn assault out of the snow, with a tree-trunk ramp. Darrow gains its ovens, its standard and many recruits.',
    pages: [169, 172, 198, 199, 298, 308, 309, 311, 314, 323, 352],
  },
  jupiter: {
    id: 'jupiter',
    proctorNote: 'A huge Scarred man with hair like a lion and a lightning bolt on his collar.',
    students: [
      {
        name: 'Lucian',
        note: 'The starving “boy” who surrenders the castle wearing Jupiter’s ring; the Jackal in disguise.',
        page: 353,
      },
    ],
    fate: 'Jupiter and Mars are the two superpowers of the North, and Jupiter conquers Juno. At the thaw its army is stranded across the Argos and Darrow takes its castle, where the Jackal’s trap fails. Its Proctor is beaten and taken on Olympus.',
    pages: [139, 281, 320, 353, 354, 359, 360, 376],
  },
  juno: {
    id: 'juno',
    proctorNote: 'A woman, wrestled out of the baths on Olympus by the Howlers.',
    students: [
      {
        name: 'Milia',
        note: 'A scornful oathbreaker whose ring says Juno; she joins Darrow’s band.',
        page: 297,
      },
      {
        name: 'Dax',
        note: 'A Juno oathbreaker who minds the shame of being twice an oathbreaker more than Milia does.',
        page: 297,
      },
    ],
    fate: 'Juno’s mountain-framed fortress is already conquered by Jupiter when Darrow’s army passes it in winter. Its students survive as slaves of other Houses, and Darrow’s army later raids its deep cellars for salted beef.',
    pages: [297, 311, 320, 334, 352, 360, 371],
  },
  pluto: {
    id: 'pluto',
    students: [
      {
        name: 'The Jackal',
        note: 'Adrius au Augustus, Pluto’s leader and Mustang’s brother, who collapses his own tunnels to survive.',
        page: 389,
      },
      {
        name: 'Lilath',
        note: 'The Jackal’s emissary, a hard-faced girl with a cypress ring and two fingers burned away.',
        page: 262,
      },
    ],
    fate: 'Blitzed by Vulcan in the first days, Pluto retreats into its tunnels, where the Jackal collapses the roof on his own people and strands forty for nearly a month. The Jackal springs a trap at Jupiter’s castle, escapes, and is delivered bound to Darrow on Olympus by Mustang.',
    pages: [262, 263, 320, 335, 359, 363, 383, 389],
  },
  vulcan: {
    id: 'vulcan',
    proctorNote: 'Found on Olympus watching the game from a holoImmersion room beside a crackling fire.',
    students: [],
    fate: 'Vulcan blitzes Pluto with forged weapons in the first days and would have crushed it but for the Jackal’s tunnel collapse. By the thaw Darrow reckons that much of Vulcan has been absorbed into Jupiter’s army; its Proctor is found on Olympus when the Howlers invade.',
    pages: [335, 360, 371],
  },
  venus: {
    id: 'venus',
    proctorNote: 'A woman, found in bed on Olympus and tied to the bedposts by the Howlers.',
    students: [],
    fate: 'Some Venus students end up as slaves of Apollo; Darrow frees those who help him take Jupiter’s castle, and then sends Tactus to hunt the remnant of Venus and Mercury in the southern lowlands.',
    pages: [334, 356, 370, 371, 382],
  },
  mercury: {
    id: 'mercury',
    proctorNote: 'Small and baby-faced, with winged feet on his collar; he nearly drafted Darrow.',
    students: [],
    fate: 'Mercury is reduced to a force of roving vagabonds by winter. Sevro frees five of its students from Apollo’s slave groups, and Darrow sends Tactus to hunt the rest in the southern lowlands.',
    pages: [139, 173, 333, 344, 373, 382],
  },
  neptune: {
    id: 'neptune',
    proctorNote: 'A woman with a trident headdress who watches the duel with Pax from above.',
    students: [],
    fate: 'Book 1 never narrates the fall of Neptune. The only trace of its students is a sigil ring among those of the dead that Darrow tips out on a table in Jupiter’s castle.',
    pages: [257, 358],
  },
  bacchus: {
    id: 'bacchus',
    students: [],
    fate: 'Bacchus’s students are enslaved by Apollo and freed by Darrow, while its castle is raided for jugs and barrels of grape juice on the march to Jupiter.',
    pages: [173, 174, 334, 352, 355, 356],
  },
};
