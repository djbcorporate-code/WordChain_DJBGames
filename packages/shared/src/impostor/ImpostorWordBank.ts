import {
  ImpostorCategoryMeta,
  ImpostorConcreteCategoryId,
  ImpostorPlayerInGame,
  ImpostorResolvedCategory,
  ImpostorSettings,
} from '../types/impostor.types.js';

export interface ImpostorWordEntry {
  word: string;
  hint: string;
}

export const IMPOSTOR_CATEGORIES: ImpostorCategoryMeta[] = [
  {
    id: 'FOOD_DRINKS',
    label: 'Food & Drinks',
    emoji: '🍔',
    difficulty: 'EASY',
    description: 'Popular dishes, street snacks, desserts & refreshing drinks.',
  },
  {
    id: 'ANIMALS',
    label: 'Animals',
    emoji: '🐶',
    difficulty: 'EASY',
    description: 'Wild beasts, backyard companions & sea creatures.',
  },
  {
    id: 'HOUSEHOLD_OBJECTS',
    label: 'Household Objects',
    emoji: '🏠',
    difficulty: 'EASY',
    description: 'Everyday items, appliances & tools around the house.',
  },
  {
    id: 'SCHOOL_EDUCATION',
    label: 'School & Education',
    emoji: '🏫',
    difficulty: 'EASY',
    description: 'Classroom staples, campus life & academic subjects.',
  },
  {
    id: 'PLAYER_NAMES',
    label: 'Names of Players',
    emoji: '👥',
    difficulty: 'EASY',
    description: 'Draws a live teammate in your current lobby as the secret target!',
    isDynamic: true,
  },
  {
    id: 'SPORTS',
    label: 'Sports',
    emoji: '🏀',
    difficulty: 'MEDIUM',
    description: 'Court games, combat arenas, Olympics & outdoor athletics.',
  },
  {
    id: 'COUNTRIES_PLACES',
    label: 'Countries & Places',
    emoji: '🌍',
    difficulty: 'MEDIUM',
    description: 'Iconic nations, island paradises & world landmarks.',
  },
  {
    id: 'MOVIES_TV',
    label: 'Movies & TV Shows',
    emoji: '🎬',
    difficulty: 'MEDIUM',
    description: 'Blockbuster films, cult anime & binge-worthy series.',
  },
  {
    id: 'JOBS_PROFESSIONS',
    label: 'Jobs & Professions',
    emoji: '👨‍💼',
    difficulty: 'MEDIUM',
    description: 'Careers from emergency responders to digital creators.',
  },
  {
    id: 'TECH_GADGETS',
    label: 'Technology & Gadgets',
    emoji: '📱',
    difficulty: 'MEDIUM',
    description: 'Modern hardware, sensors, wearables & digital gear.',
  },
  {
    id: 'BRANDS_PRODUCTS',
    label: 'Brands & Products',
    emoji: '🛍️',
    difficulty: 'MEDIUM',
    description: 'Household logos, sneakers, apps & fast-food icons.',
  },
  {
    id: 'FILIPINO_CULTURE',
    label: 'Filipino Culture',
    emoji: '🇵🇭',
    difficulty: 'MEDIUM',
    description: 'Pinoy traditions, street icons, fiestas & cultural staples.',
  },
  {
    id: 'MOBILE_LEGENDS_HEROES',
    label: 'Mobile Legends Heroes',
    emoji: '🛡️',
    difficulty: 'MEDIUM',
    description: 'Land of Dawn assassins, marksmen, tanks & mid-lane mages.',
  },
  {
    id: 'DOTA2_HEROES',
    label: 'Dota 2 Heroes',
    emoji: '🐉',
    difficulty: 'MEDIUM',
    description: 'Classic Radiant & Dire carries, supports & playmakers.',
  },
  {
    id: 'LOVE_RELATIONSHIPS',
    label: 'Love & Relationships',
    emoji: '💕',
    difficulty: 'HARD',
    description: 'Modern dating tropes, courtship moments & heartbreaks.',
  },
  {
    id: 'FILIPINO_SLANG',
    label: 'Filipino Slang',
    emoji: '😂',
    difficulty: 'HARD',
    description: 'Pinoy internet expressions, barkada banter & Gen-Z lingo.',
  },
  {
    id: 'EMOTIONS_FEELINGS',
    label: 'Emotions & Feelings',
    emoji: '🎭',
    difficulty: 'HARD',
    description: 'Subtle moods, inner states & emotional reactions.',
  },
  {
    id: 'ABSTRACT_CONCEPTS',
    label: 'Abstract Concepts',
    emoji: '🧠',
    difficulty: 'EXPERT',
    description: 'Philosophical paradoxes, time phenomena & big ideas.',
  },
];

export const IMPOSTOR_WORD_POOLS: Record<
  Exclude<ImpostorConcreteCategoryId, 'PLAYER_NAMES'>,
  ImpostorWordEntry[]
> = {
  FOOD_DRINKS: [
    { word: 'Halo-Halo', hint: 'Shaved' },
    { word: 'Sinigang', hint: 'Tamarind' },
    { word: 'Milk Tea', hint: 'Pearls' },
    { word: 'Ramen', hint: 'Broth' },
    { word: 'Sisig', hint: 'Sizzling' },
    { word: 'Tiramisu', hint: 'Cocoa' },
    { word: 'Takoyaki', hint: 'Octopus' },
    { word: 'Lechon', hint: 'Crispy' },
    { word: 'Croissant', hint: 'Flaky' },
    { word: 'Matcha Latte', hint: 'Whisked' },
    { word: 'Shawarma', hint: 'Garlic' },
    { word: 'Samgyupsal', hint: 'Grill' },
    { word: 'Lumpia', hint: 'Wrapper' },
    { word: 'Espresso', hint: 'Shot' },
    { word: 'Pizza', hint: 'Crust' },
    { word: 'Taho', hint: 'Sago' },
    { word: 'Mango Float', hint: 'Graham' },
    { word: 'Sushi', hint: 'Nori' },
  ],
  ANIMALS: [
    { word: 'Penguin', hint: 'Tuxedo' },
    { word: 'Tarsier', hint: 'Nocturnal' },
    { word: 'Octopus', hint: 'Tentacles' },
    { word: 'Chameleon', hint: 'Camouflage' },
    { word: 'Dolphin', hint: 'Sonar' },
    { word: 'Capybara', hint: 'Chill' },
    { word: 'Owl', hint: 'Talons' },
    { word: 'Flamingo', hint: 'Stilt' },
    { word: 'Hedgehog', hint: 'Spines' },
    { word: 'Cheetah', hint: 'Sprint' },
    { word: 'Kangaroo', hint: 'Pouch' },
    { word: 'Sloth', hint: 'Canopy' },
    { word: 'Peacock', hint: 'Plumage' },
    { word: 'Panda', hint: 'Bamboo' },
    { word: 'Firefly', hint: 'Lantern' },
    { word: 'Shark', hint: 'Cartilage' },
    { word: 'Raccoon', hint: 'Bandit' },
    { word: 'Komodo Dragon', hint: 'Reptile' },
  ],
  HOUSEHOLD_OBJECTS: [
    { word: 'Rice Cooker', hint: 'Steam' },
    { word: 'Electric Fan', hint: 'Blades' },
    { word: 'Umbrella', hint: 'Canopy' },
    { word: 'Blender', hint: 'Puree' },
    { word: 'Extension Cord', hint: 'Outlets' },
    { word: 'Air Fryer', hint: 'Basket' },
    { word: 'Broom', hint: 'Bristles' },
    { word: 'Thermos', hint: 'Insulated' },
    { word: 'Flashlight', hint: 'Beam' },
    { word: 'Toaster', hint: 'Spring' },
    { word: 'Mirror', hint: 'Reflection' },
    { word: 'Padlock', hint: 'Keyhole' },
    { word: 'Laundry Basket', hint: 'Hamper' },
    { word: 'Alarm Clock', hint: 'Snooze' },
    { word: 'Water Dispenser', hint: 'Gallon' },
    { word: 'Microwave', hint: 'Turntable' },
    { word: 'Mosquito Net', hint: 'Mesh' },
    { word: 'Doorbell', hint: 'Chime' },
  ],
  SCHOOL_EDUCATION: [
    { word: 'Microscope', hint: 'Lens' },
    { word: 'Pop Quiz', hint: 'Surprise' },
    { word: 'Library', hint: 'Silence' },
    { word: 'Graduation', hint: 'Tassel' },
    { word: 'Whiteboard', hint: 'Marker' },
    { word: 'Scholarship', hint: 'Tuition' },
    { word: 'Field Trip', hint: 'Bus' },
    { word: 'Thesis Defense', hint: 'Panel' },
    { word: 'Cafeteria', hint: 'Tray' },
    { word: 'Detention', hint: 'Afterhours' },
    { word: 'Periodic Table', hint: 'Elements' },
    { word: 'Report Card', hint: 'Grades' },
    { word: 'Lab Coat', hint: 'Apron' },
    { word: 'Recess', hint: 'Bell' },
    { word: 'Calculator', hint: 'Digits' },
    { word: 'Yearbook', hint: 'Signatures' },
    { word: 'Group Project', hint: 'Slides' },
    { word: 'Valedictorian', hint: 'Speech' },
  ],
  SPORTS: [
    { word: 'Badminton', hint: 'Shuttlecock' },
    { word: 'Basketball', hint: 'Hoop' },
    { word: 'Archery', hint: 'Quiver' },
    { word: 'Boxing', hint: 'Gloves' },
    { word: 'Volleyball', hint: 'Spike' },
    { word: 'Esports', hint: 'Tournament' },
    { word: 'Table Tennis', hint: 'Paddle' },
    { word: 'Swimming', hint: 'Goggles' },
    { word: 'Fencing', hint: 'Foil' },
    { word: 'Billiards', hint: 'Chalk' },
    { word: 'Bowling', hint: 'Alley' },
    { word: 'Sepak Takraw', hint: 'Rattan' },
    { word: 'Chess Boxing', hint: 'Alternating' },
    { word: 'Formula 1', hint: 'Pitstop' },
    { word: 'Marathon', hint: 'Stamina' },
    { word: 'Skateboarding', hint: 'Kickflip' },
    { word: 'Golf', hint: 'Caddy' },
    { word: 'Gymnastics', hint: 'Vault' },
  ],
  COUNTRIES_PLACES: [
    { word: 'Palawan', hint: 'Lagoons' },
    { word: 'Japan', hint: 'Shinkansen' },
    { word: 'Iceland', hint: 'Geysers' },
    { word: 'Paris', hint: 'Baguette' },
    { word: 'Baguio', hint: 'Pines' },
    { word: 'Egypt', hint: 'Pyramids' },
    { word: 'Boracay', hint: 'Powder' },
    { word: 'Switzerland', hint: 'Alps' },
    { word: 'Siargao', hint: 'Surf' },
    { word: 'South Korea', hint: 'Hanbok' },
    { word: 'Brazil', hint: 'Samba' },
    { word: 'Venice', hint: 'Gondola' },
    { word: 'Singapore', hint: 'Merlion' },
    { word: 'New York', hint: 'Subway' },
    { word: 'Vigan', hint: 'Cobblestone' },
    { word: 'Greece', hint: 'Acropolis' },
    { word: 'Australia', hint: 'Outback' },
    { word: 'Dubai', hint: 'Desert' },
  ],
  MOVIES_TV: [
    { word: 'Squid Game', hint: 'Tracksuits' },
    { word: 'Spirited Away', hint: 'Bathhouse' },
    { word: 'Inception', hint: 'Totem' },
    { word: 'Breaking Bad', hint: 'Chemistry' },
    { word: 'Parasite', hint: 'Basement' },
    { word: 'Interstellar', hint: 'Gravity' },
    { word: 'Stranger Things', hint: 'Demogorgon' },
    { word: 'One Piece', hint: 'Strawhat' },
    { word: 'Spider-Man', hint: 'Webs' },
    { word: 'Attack on Titan', hint: 'Walls' },
    { word: 'Inside Out', hint: 'Memories' },
    { word: 'Heneral Luna', hint: 'Mustache' },
    { word: 'Train to Busan', hint: 'Outbreak' },
    { word: 'Avatar', hint: 'Pandora' },
    { word: 'The Dark Knight', hint: 'Gotham' },
    { word: 'Your Name', hint: 'Comet' },
    { word: 'Wednesday', hint: 'Braids' },
    { word: 'John Wick', hint: 'Continental' },
  ],
  JOBS_PROFESSIONS: [
    { word: 'Astronaut', hint: 'Orbit' },
    { word: 'Detective', hint: 'Alibi' },
    { word: 'Surgeon', hint: 'Scalpel' },
    { word: 'Barista', hint: 'Latte' },
    { word: 'Firefighter', hint: 'Hydrant' },
    { word: 'Architect', hint: 'Blueprint' },
    { word: 'Voice Actor', hint: 'Booth' },
    { word: 'Streamer', hint: 'Overlays' },
    { word: 'Air Traffic Controller', hint: 'Radar' },
    { word: 'Pastry Chef', hint: 'Fondant' },
    { word: 'Archaeologist', hint: 'Excavation' },
    { word: 'Cybersecurity Analyst', hint: 'Firewall' },
    { word: 'Paramedic', hint: 'Stretcher' },
    { word: 'Stunt Double', hint: 'Harness' },
    { word: 'Librarian', hint: 'Catalog' },
    { word: 'Pilot', hint: 'Cockpit' },
    { word: 'Tattoo Artist', hint: 'Stencils' },
    { word: 'Marine Biologist', hint: 'Reef' },
  ],
  TECH_GADGETS: [
    { word: 'Drone', hint: 'Propellers' },
    { word: 'Power Bank', hint: 'Capacity' },
    { word: 'VR Headset', hint: 'Immersion' },
    { word: 'Smartwatch', hint: 'Pulse' },
    { word: 'Mechanical Keyboard', hint: 'Switches' },
    { word: 'Noise-Canceling Earbuds', hint: 'Silence' },
    { word: '3D Printer', hint: 'Filament' },
    { word: 'E-Reader', hint: 'Matte' },
    { word: 'Dashcam', hint: 'Windshield' },
    { word: 'Graphics Card', hint: 'VRAM' },
    { word: 'AirTag', hint: 'Tracker' },
    { word: 'Ring Light', hint: 'Tripod' },
    { word: 'Action Camera', hint: 'Waterproof' },
    { word: 'Router', hint: 'Bandwidth' },
    { word: 'Robot Vacuum', hint: 'Sensors' },
    { word: 'External SSD', hint: 'Storage' },
    { word: 'USB Hub', hint: 'Ports' },
    { word: 'Smart Doorbell', hint: 'Intercom' },
  ],
  BRANDS_PRODUCTS: [
    { word: 'Jollibee', hint: 'Mascot' },
    { word: 'Spotify', hint: 'Playlists' },
    { word: 'Uniqlo', hint: 'Basics' },
    { word: 'Nike', hint: 'Swoosh' },
    { word: 'Starbucks', hint: 'Mermaid' },
    { word: 'Nintendo', hint: 'Cartridge' },
    { word: 'Gcash', hint: 'Ewallet' },
    { word: 'IKEA', hint: 'Meatballs' },
    { word: 'Lego', hint: 'Bricks' },
    { word: 'Apple', hint: 'Ecosystem' },
    { word: 'Shopee', hint: 'Vouchers' },
    { word: 'Netflix', hint: 'Streaming' },
    { word: 'Crocs', hint: 'Charms' },
    { word: 'Discord', hint: 'Channels' },
    { word: 'Toyota', hint: 'Sedan' },
    { word: 'YouTube', hint: 'Creator' },
    { word: 'Aquaflask', hint: 'Tumbler' },
    { word: 'KFC', hint: 'Bucket' },
  ],
  FILIPINO_CULTURE: [
    { word: 'Jeepney', hint: 'Chrome' },
    { word: 'Bayanihan', hint: 'Unity' },
    { word: 'Karaoke', hint: 'Microphone' },
    { word: 'Balikbayan Box', hint: 'Pasalubong' },
    { word: 'Mano Po', hint: 'Blessing' },
    { word: 'Fiesta', hint: 'Banderitas' },
    { word: 'Sari-Sari Store', hint: 'Sachet' },
    { word: 'Boodle Fight', hint: 'Banana' },
    { word: 'Harana', hint: 'Acoustic' },
    { word: 'Simbang Gabi', hint: 'Dawn' },
    { word: 'Balut', hint: 'Vinegar' },
    { word: 'Tsinelas', hint: 'Slippers' },
    { word: 'Pabebe Wave', hint: 'Viral' },
    { word: 'Tingting Broom', hint: 'Midribs' },
    { word: 'Tabo', hint: 'Dipper' },
    { word: 'Tricycle', hint: 'Sidecar' },
    { word: 'Lola', hint: 'Grandmother' },
    { word: 'Noche Buena', hint: 'Midnight' },
  ],
  MOBILE_LEGENDS_HEROES: [
    { word: 'Fanny', hint: 'Cables' },
    { word: 'Gusion', hint: 'Daggers' },
    { word: 'Chou', hint: 'Kungfu' },
    { word: 'Miya', hint: 'Moonlight' },
    { word: 'Tigreal', hint: 'Hammer' },
    { word: 'Franco', hint: 'Hook' },
    { word: 'Kagura', hint: 'Umbrella' },
    { word: 'Lancelot', hint: 'Rapier' },
    { word: 'Ling', hint: 'Walls' },
    { word: 'Aldous', hint: 'Stacks' },
    { word: 'Angela', hint: 'Puppet' },
    { word: 'Layla', hint: 'Cannon' },
    { word: 'Nana', hint: 'Polymorph' },
    { word: 'Hayabusa', hint: 'Shadows' },
    { word: 'Alucard', hint: 'Lifesteal' },
    { word: 'Yu Zhong', hint: 'Dragon' },
    { word: 'Granger', hint: 'Violin' },
    { word: 'Eudora', hint: 'Lightning' },
    { word: 'Zilong', hint: 'Spear' },
    { word: 'Estes', hint: 'Healing' },
  ],
  DOTA2_HEROES: [
    { word: 'Pudge', hint: 'Butcher' },
    { word: 'Invoker', hint: 'Quas' },
    { word: 'Anti-Mage', hint: 'Blink' },
    { word: 'Juggernaut', hint: 'Bladefury' },
    { word: 'Crystal Maiden', hint: 'Frostbite' },
    { word: 'Phantom Assassin', hint: 'Critical' },
    { word: 'Earthshaker', hint: 'Totem' },
    { word: 'Rubick', hint: 'Spellsteal' },
    { word: 'Sniper', hint: 'Assassinate' },
    { word: 'Shadow Fiend', hint: 'Souls' },
    { word: 'Axe', hint: 'Cull' },
    { word: 'Slark', hint: 'Pounce' },
    { word: 'Riki', hint: 'Stealth' },
    { word: 'Drow Ranger', hint: 'Silence' },
    { word: 'Zeus', hint: 'Thunder' },
    { word: 'Windranger', hint: 'Shackle' },
    { word: 'Techies', hint: 'Mines' },
    { word: 'Lina', hint: 'Laguna' },
    { word: 'Sven', hint: 'Cleave' },
    { word: 'Lion', hint: 'Finger' },
  ],
  LOVE_RELATIONSHIPS: [
    { word: 'Ghosting', hint: 'Silence' },
    { word: 'Friendzone', hint: 'Platonic' },
    { word: 'Situationship', hint: 'Ambiguous' },
    { word: 'Mixed Signals', hint: 'Confusing' },
    { word: 'Love Bombing', hint: 'Intense' },
    { word: 'Long Distance', hint: 'Timezones' },
    { word: 'Green Flag', hint: 'Healthy' },
    { word: 'Red Flag', hint: 'Warning' },
    { word: 'First Date', hint: 'Nervous' },
    { word: 'Rebound', hint: 'Temporary' },
    { word: 'Slow Burn', hint: 'Gradual' },
    { word: 'Closure', hint: 'Goodbye' },
    { word: 'Crush', hint: 'Secret' },
    { word: 'Anniversary', hint: 'Milestone' },
    { word: 'Jealousy', hint: 'Envy' },
    { word: 'Third Wheel', hint: 'Awkward' },
    { word: 'Breadcrumbing', hint: 'Flirting' },
    { word: 'Blind Date', hint: 'Stranger' },
  ],
  FILIPINO_SLANG: [
    { word: 'Sana All', hint: 'Wishful' },
    { word: 'Charot', hint: 'Kidding' },
    { word: 'Budol', hint: 'Impulse' },
    { word: 'Marites', hint: 'Gossip' },
    { word: 'Dasurb', hint: 'Earned' },
    { word: 'Awit', hint: 'Ouch' },
    { word: 'Forda', hint: 'Mood' },
    { word: 'Lodz', hint: 'Respect' },
    { word: 'Petmalu', hint: 'Amazing' },
    { word: 'Werpa', hint: 'Strength' },
    { word: 'Chika', hint: 'Updates' },
    { word: 'Beshie', hint: 'Bestie' },
    { word: 'Sabaw', hint: 'Spaced' },
    { word: 'Kilig', hint: 'Butterflies' },
    { word: 'Gigil', hint: 'Squeeze' },
    { word: 'Sawi', hint: 'Heartbroken' },
    { word: 'Ambag', hint: 'Contribution' },
    { word: 'Ghosted Na Naman', hint: 'Ignored' },
  ],
  EMOTIONS_FEELINGS: [
    { word: 'Nostalgia', hint: 'Yesterday' },
    { word: 'Stage Fright', hint: 'Spotlight' },
    { word: 'Gratitude', hint: 'Thankful' },
    { word: 'Relief', hint: 'Sigh' },
    { word: 'Secondhand Embarrassment', hint: 'Cringe' },
    { word: 'Anticipation', hint: 'Waiting' },
    { word: 'Envy', hint: 'Comparison' },
    { word: 'Serenity', hint: 'Stillness' },
    { word: 'Guilt', hint: 'Remorse' },
    { word: 'Awe', hint: 'Wonder' },
    { word: 'Homesickness', hint: 'Yearning' },
    { word: 'Vindication', hint: 'Proven' },
    { word: 'Overwhelmed', hint: 'Flooded' },
    { word: 'Pride', hint: 'Triumph' },
    { word: 'Empathy', hint: 'Compassion' },
    { word: 'Regret', hint: 'Hindsight' },
    { word: 'Euphoria', hint: 'Bliss' },
    { word: 'Suspicion', hint: 'Doubt' },
  ],
  ABSTRACT_CONCEPTS: [
    { word: 'Déjà Vu', hint: 'Replay' },
    { word: 'Butterfly Effect', hint: 'Ripple' },
    { word: 'Karma', hint: 'Balance' },
    { word: 'Paradox', hint: 'Contradiction' },
    { word: 'Impostor Syndrome', hint: 'Unworthy' },
    { word: 'Free Will', hint: 'Choice' },
    { word: 'Sonder', hint: 'Passersby' },
    { word: 'Entropy', hint: 'Chaos' },
    { word: 'Placebo', hint: 'Belief' },
    { word: 'Altruism', hint: 'Selfless' },
    { word: 'Irony', hint: 'Twist' },
    { word: 'Confirmation Bias', hint: 'Selective' },
    { word: 'Opportunity Cost', hint: 'Tradeoff' },
    { word: 'Solitude', hint: 'Quiet' },
    { word: 'Memento Mori', hint: 'Mortality' },
    { word: 'Dunning-Kruger Effect', hint: 'Overconfidence' },
    { word: 'Time Dilation', hint: 'Relativity' },
    { word: 'Occam Razor', hint: 'Simplicity' },
  ],
};

export function clampImpostorCount(requestedCount: number, playerCount: number): number {
  const safeMaxByLobby =
    playerCount >= 3 ? Math.max(1, Math.floor((playerCount - 1) / 2)) : 3;
  const maxAllowed = Math.min(3, safeMaxByLobby);
  return Math.max(1, Math.min(maxAllowed, Math.floor(requestedCount || 1)));
}

export function getImpostorCategoryMeta(
  id: ImpostorConcreteCategoryId
): ImpostorCategoryMeta {
  return (
    IMPOSTOR_CATEGORIES.find((cat) => cat.id === id) || IMPOSTOR_CATEGORIES[0]
  );
}

function buildDynamicPlayerHint(
  target: ImpostorPlayerInGame,
  _allPlayers: ImpostorPlayerInGame[],
  hostUserId: string
): string {
  const cleanName = target.username.trim();
  const lower = cleanName.toLowerCase();

  const candidates: Array<{ match: boolean; clue: string }> = [
    { match: target.userId === hostUserId, clue: 'Host' },
    { match: /\d/.test(cleanName), clue: 'Numbered' },
    { match: cleanName.length <= 5, clue: 'Short' },
    { match: cleanName.length >= 9, clue: 'Extended' },
    { match: true, clue: 'Seated' },
    { match: true, clue: 'Agent' },
  ];

  for (const item of candidates) {
    if (item.match && !lower.includes(item.clue.toLowerCase())) {
      return item.clue;
    }
  }
  return 'Teammate';
}

export function pickImpostorPrompt(
  settings: ImpostorSettings,
  players: ImpostorPlayerInGame[],
  hostUserId: string,
  rng: () => number = Math.random
): {
  resolvedCategory: ImpostorResolvedCategory;
  secretWord: string;
  impostorHint: string;
} {
  let candidates = IMPOSTOR_CATEGORIES;
  if (settings.category !== 'RANDOM') {
    candidates = IMPOSTOR_CATEGORIES.filter((cat) => cat.id === settings.category);
  } else if (settings.difficulty !== 'ALL') {
    const tierMatches = IMPOSTOR_CATEGORIES.filter(
      (cat) => cat.difficulty === settings.difficulty
    );
    if (tierMatches.length > 0) {
      candidates = tierMatches;
    }
  }

  // Filter out dynamic PLAYER_NAMES if zero players were somehow supplied
  if (players.length === 0) {
    const nonDynamic = candidates.filter((c) => !c.isDynamic);
    if (nonDynamic.length > 0) candidates = nonDynamic;
  }

  const chosenCat =
    candidates[Math.floor(rng() * candidates.length)] || IMPOSTOR_CATEGORIES[0];

  const resolvedCategory: ImpostorResolvedCategory = {
    id: chosenCat.id,
    label: chosenCat.label,
    emoji: chosenCat.emoji,
    difficulty: chosenCat.difficulty,
  };

  if (chosenCat.id === 'PLAYER_NAMES' && players.length > 0) {
    const targetPlayer = players[Math.floor(rng() * players.length)];
    return {
      resolvedCategory,
      secretWord: targetPlayer.username,
      impostorHint: buildDynamicPlayerHint(targetPlayer, players, hostUserId),
    };
  }

  const poolKey =
    chosenCat.id === 'PLAYER_NAMES' ? 'FOOD_DRINKS' : chosenCat.id;
  const entries = IMPOSTOR_WORD_POOLS[poolKey];
  const entry = entries[Math.floor(rng() * entries.length)];

  return {
    resolvedCategory,
    secretWord: entry.word,
    impostorHint: entry.hint,
  };
}
