export interface AvatarConfig {
  id: string;
  name: string;
  title: string;
  requiredAccountLevel: number;
  iconName: string;
}

export const COSMETIC_AVATARS: AvatarConfig[] = [
  {
    id: 'avatar_default_01',
    name: 'Novice Scholar',
    title: 'Apprentice',
    requiredAccountLevel: 1,
    iconName: 'GraduationCap',
  },
  {
    id: 'avatar_scholar_05',
    name: "Dean's Lister",
    title: 'Honors Student',
    requiredAccountLevel: 5,
    iconName: 'Award',
  },
  {
    id: 'avatar_honor_10',
    name: 'Philosopher',
    title: 'Logician',
    requiredAccountLevel: 10,
    iconName: 'BookOpen',
  },
  {
    id: 'avatar_master_20',
    name: 'Lexicon Master',
    title: 'Etymologist',
    requiredAccountLevel: 20,
    iconName: 'Scroll',
  },
  {
    id: 'avatar_legend_30',
    name: 'Grand Polymath',
    title: 'Grandmaster',
    requiredAccountLevel: 30,
    iconName: 'Compass',
  },
  {
    id: 'avatar_quantum_50',
    name: 'Quantum Theorist',
    title: 'Noble Laureate',
    requiredAccountLevel: 50,
    iconName: 'Atom',
  },
];
