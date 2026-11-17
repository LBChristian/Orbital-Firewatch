import type { Loadout } from './catalog';

/**
 * Citations to resources listed on the official NASA Space Apps 2026 Challenge 13
 * ("Space Mission Design Game") Resources tab. Notes are paraphrased from the source;
 * page numbers are the printed page numbers in each document.
 * Read and checked against the source text on 2026-11-18. See docs/CHALLENGE_RESOURCE_COMPLIANCE.md.
 */

export type SourceId = 'cubesat101' | 'cml';

export interface SourceRef {
  id: SourceId;
  short: string;
  title: string;
  authors: string;
  publisher: string;
  year: number;
  url: string;
  /** True when listed on the official Challenge 13 Resources tab (checked 2026-11-18). */
  listedForChallenge13: boolean;
}

export const SOURCES: Record<SourceId, SourceRef> = {
  cubesat101: {
    id: 'cubesat101',
    short: 'CubeSat 101',
    title: 'CubeSat 101: Basic Concepts and Processes for First-Time CubeSat Developers',
    authors: 'Cal Poly CubeSat Systems Engineering Lab, for NASA',
    publisher: 'NASA CubeSat Launch Initiative (revision dated October 2017)',
    year: 2017,
    url: 'https://www3.nasa.gov/sites/default/files/atoms/files/nasa_csli_cubesat_101_508.pdf',
    listedForChallenge13: true,
  },
  cml: {
    id: 'cml',
    short: 'Concept Maturity Levels',
    title: 'Space Mission Concept Development Using Concept Maturity Levels',
    authors: 'R. R. Wessen, C. Borden, J. Ziemer, J. Kwok (JPL)',
    publisher: 'AIAA SPACE 2013 Conference & Exposition',
    year: 2013,
    url: 'https://dataverse.jpl.nasa.gov/dataset.xhtml?persistentId=hdl:2014/44299',
    listedForChallenge13: true,
  },
};

export interface Citation {
  source: SourceId;
  /** Printed page number(s) in the source. */
  page: string;
  /** Paraphrase of what the source says. */
  note: string;
  /** How the game uses or simplifies it. */
  inGame: string;
}

/** One CubeSat 101 citation per design-bay choice. */
export const SUBSYSTEM_CITATIONS: Record<keyof Loadout, Citation> = {
  busId: {
    source: 'cubesat101',
    page: '4',
    note: 'A small satellite is generally anything under 300 kg; CubeSats are a standardised subset built from 10 cm units of roughly 1–1.33 kg each.',
    inGame: 'Your notional bus (40–68 kg) is a small satellite but larger than a CubeSat; its structure limits how much equipment it can carry.',
  },
  payloadId: {
    source: 'cubesat101',
    page: '41, 51',
    note: 'Any spacecraft sensor that could image Earth must contact NOAA, the sole authority on whether a commercial remote-sensing licence is required.',
    inGame: 'Licensing is not simulated, but a real Earth-imaging mission like this one would need that NOAA determination before flight.',
  },
  solarId: {
    source: 'cubesat101',
    page: '16–17',
    note: 'Batteries and attitude control are major components; the attitude system may need to point the solar panels at the Sun to get the most power.',
    inGame: 'Arrays generate only in sunlight; the game assumes average pointing losses instead of modelling Sun-pointing.',
  },
  batteryId: {
    source: 'cubesat101',
    page: '16, 69',
    note: 'Batteries are a major component, and flight safety reviews ask for evidence that battery safety mechanisms are in place.',
    inGame: 'The battery carries the spacecraft through eclipse and capture bursts; below 15% the game enters safe mode.',
  },
  recorderId: {
    source: 'cubesat101',
    page: '22',
    note: 'On-board software assembles data into packets and transmits them to the ground station, where they are reassembled.',
    inGame: 'Each capture becomes a packet held in the recorder until a contact window lets it downlink.',
  },
  commsId: {
    source: 'cubesat101',
    page: '20, 22',
    note: 'The ground station locates, commands and receives data from the satellite; build and test it early, because an inadequate ground station is a mission killer. Radio transmission requires licensing.',
    inGame: 'Delivered data is limited by radio rate times contact time with notional stations; spectrum licensing is not simulated.',
  },
  pointingId: {
    source: 'cubesat101',
    page: '17, 66',
    note: 'The attitude determination and control system (ADCS) stabilises the spacecraft and orients it, for example to point a camera at a target on Earth.',
    inGame: 'Precision pointing adds off-nadir reach and removes the edge-of-swath penalty, at a cost in time and energy.',
  },
  launchId: {
    source: 'cubesat101',
    page: '9, 11',
    note: 'Launch timing depends on available rides and on how flexible your orbit requirements are: flexible missions are easier to manifest. NASA CSLI covers launch costs for selected CubeSats.',
    inGame: 'Rideshare is cheapest but only reaches common orbits; dedicated launches reach any preset at higher cost.',
  },
  altitudeId: {
    source: 'cubesat101',
    page: '54–55',
    note: 'Every mission needs an Orbital Debris Assessment Report showing safe disposal; without it, licences are not granted and the spacecraft cannot fly.',
    inGame: 'Lower orbits decay sooner (helping debris compliance) but this game does not model drag or lifetime.',
  },
  inclinationId: {
    source: 'cubesat101',
    page: '9',
    note: 'The flexibility of your orbital requirements affects how easily a launch can be found.',
    inGame: 'Inclination decides which latitudes the ground track reaches and the angle it crosses a region.',
  },
};

export interface CmlLevel {
  level: number;
  name: string;
  summary: string;
}

/** Concept Maturity Levels, paraphrased from Wessen et al. 2013, p. 2. */
export const CML_LEVELS: CmlLevel[] = [
  { level: 1, name: 'Cocktail Napkin', summary: 'The science questions and needed observations are stated, with a rough sketch of the mission and its high-level objectives.' },
  { level: 2, name: 'Initial Feasibility', summary: 'Key performance parameters are quantified and first-order calculations test whether the concept is viable.' },
  { level: 3, name: 'Trade Space', summary: 'Architectural trades between spacecraft, ground system and mission design are explored against science return, cost and risk.' },
  { level: 4, name: 'Point Design', summary: 'A specific design and cost are chosen inside the trade space and defined down to major subsystems with acceptable margins.' },
  { level: 5, name: 'Baseline Concept', summary: 'The implementation approach (partners, contracting, integration and test, cost and schedule) is defined.' },
  { level: 6, name: 'Integrated Concept', summary: 'Technical, management and cost details are expanded and documented.' },
  { level: 7, name: 'Preliminary Implementation Baseline', summary: 'Preliminary requirements, margins, prototypes and risk plans are complete.' },
  { level: 8, name: 'PDR (Integrated Baseline)', summary: 'Design and planning ready for a Preliminary Design Review.' },
  { level: 9, name: 'CDR', summary: 'Design and planning ready for a Critical Design Review.' },
];

export const CML_CITATION = { source: 'cml' as const, page: '2–3' };

/** The paper's feedback loop between CML 2 and 4 (p. 3), which the redesign loop mirrors. */
export const CML_ITERATION_NOTE =
  'Wessen et al. (p. 3) describe a feedback loop between CML 2 and CML 4: when a point design runs into problems, teams return to trade-space exploration instead of pushing ahead.';

export function cmlLevel(level: number): CmlLevel {
  const l = CML_LEVELS.find((x) => x.level === level);
  if (!l) throw new Error(`Unknown CML ${level}`);
  return l;
}
