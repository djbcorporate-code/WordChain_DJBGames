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
    { word: 'Halo-Halo', hint: 'Layered chilled summer sweet bowl' },
    { word: 'Sinigang', hint: 'Comforting warm sour broth' },
    { word: 'Milk Tea', hint: 'Cup with chewy dark spheres' },
    { word: 'Ramen', hint: 'Steaming savory noodle bowl' },
    { word: 'Sisig', hint: 'Cast-iron platter with citrus kick' },
    { word: 'Tiramisu', hint: 'Layered cocoa and espresso chill' },
    { word: 'Takoyaki', hint: 'Crispy round savory street bites' },
    { word: 'Lechon', hint: 'Crispy golden fiesta centerpiece' },
    { word: 'Croissant', hint: 'Flaky curved bakery morning treat' },
    { word: 'Matcha Latte', hint: 'Earthy green whisked cafe drink' },
    { word: 'Shawarma', hint: 'Spiced wrap carved off a vertical spit' },
    { word: 'Samgyupsal', hint: 'Tabletop grill with leafy wraps' },
    { word: 'Lumpia', hint: 'Crisp rolled finger food for dipping' },
    { word: 'Espresso', hint: 'Concentrated small wake-up shot' },
    { word: 'Pizza', hint: 'Shared triangular slice with melted topping' },
    { word: 'Taho', hint: 'Warm morning cup with sweet syrup' },
    { word: 'Mango Float', hint: 'No-bake chilled tropical layers' },
    { word: 'Sushi', hint: 'Bite-sized vinegared rice craft' },
  ],
  ANIMALS: [
    { word: 'Penguin', hint: 'Tuxedo swimmer thriving in freezing air' },
    { word: 'Tarsier', hint: 'Nocturnal clinger with oversized eyes' },
    { word: 'Octopus', hint: 'Clever escape artist with suction arms' },
    { word: 'Chameleon', hint: 'Slow stalker shifting outer hues' },
    { word: 'Dolphin', hint: 'Playful ocean traveler using echoes' },
    { word: 'Capybara', hint: 'Unbothered giant riverside rodent' },
    { word: 'Owl', hint: 'Silent night hunter with swiveling head' },
    { word: 'Flamingo', hint: 'Long-legged wading bird balancing upright' },
    { word: 'Hedgehog', hint: 'Compact curled ball of sharp spines' },
    { word: 'Cheetah', hint: 'Built for explosive short daylight sprints' },
    { word: 'Kangaroo', hint: 'Spring-loaded traveler carrying youth forward' },
    { word: 'Sloth', hint: 'Deliberate canopy dweller conserving energy' },
    { word: 'Peacock', hint: 'Dramatic iridescent tail display' },
    { word: 'Panda', hint: 'Monochrome bear devoted to woody stalks' },
    { word: 'Firefly', hint: 'Dusk insect blinking silent signals' },
    { word: 'Shark', hint: 'Cartilage predator always cruising forward' },
    { word: 'Raccoon', hint: 'Masked midnight forager with nimble paws' },
    { word: 'Komodo Dragon', hint: 'Heavy island reptile with armored scales' },
  ],
  HOUSEHOLD_OBJECTS: [
    { word: 'Rice Cooker', hint: 'Countertop steamer clicking when done' },
    { word: 'Electric Fan', hint: 'Spinning blades humming through summer heat' },
    { word: 'Umbrella', hint: 'Ribbed shelter popping open outdoors' },
    { word: 'Blender', hint: 'High-speed pitcher turning solids smooth' },
    { word: 'Extension Cord', hint: 'Tethered outlets stretching across rooms' },
    { word: 'Air Fryer', hint: 'Countertop basket crisping without deep oil' },
    { word: 'Broom', hint: 'Sweeping bristles chasing corner dust' },
    { word: 'Thermos', hint: 'Insulated cylinder guarding temperature' },
    { word: 'Flashlight', hint: 'Portable beam cutting sudden darkness' },
    { word: 'Toaster', hint: 'Spring-loaded slots browning morning slices' },
    { word: 'Mirror', hint: 'Silent glass showing backward reflections' },
    { word: 'Padlock', hint: 'Heavy clasp awaiting a matching notch' },
    { word: 'Laundry Basket', hint: 'Mesh bin carrying heaps between rooms' },
    { word: 'Alarm Clock', hint: 'Relentless chime ending deep sleep' },
    { word: 'Water Dispenser', hint: 'Dual taps offering hot or chilled pours' },
    { word: 'Microwave', hint: 'Rotating glass dish warming leftovers fast' },
    { word: 'Mosquito Net', hint: 'Fine hanging mesh guarding sleepers' },
    { word: 'Doorbell', hint: 'Entry chime announcing outside visitors' },
  ],
  SCHOOL_EDUCATION: [
    { word: 'Microscope', hint: 'Twin lenses magnifying invisible textures' },
    { word: 'Pop Quiz', hint: 'Unannounced test sparking instant panic' },
    { word: 'Library', hint: 'Whisper-only stacks organized by numbers' },
    { word: 'Graduation', hint: 'Ceremonial toss marking the final milestone' },
    { word: 'Whiteboard', hint: 'Slick wall panel wiped clean daily' },
    { word: 'Scholarship', hint: 'Earned financial passport to study' },
    { word: 'Field Trip', hint: 'Bus ride turning outings into lessons' },
    { word: 'Thesis Defense', hint: 'High-stakes Q&A before panel judges' },
    { word: 'Cafeteria', hint: 'Noisy midday tray-carrying hub' },
    { word: 'Detention', hint: 'After-hours stay inside a quiet room' },
    { word: 'Periodic Table', hint: 'Color-coded wall grid of building blocks' },
    { word: 'Report Card', hint: 'Folded summary carried home each term' },
    { word: 'Lab Coat', hint: 'Protective white layer worn at benches' },
    { word: 'Recess', hint: 'Brief bell-ringing break between periods' },
    { word: 'Calculator', hint: 'Buttoned pocket savior during exams' },
    { word: 'Yearbook', hint: 'Bound collection of signed parting photos' },
    { word: 'Group Project', hint: 'Shared grade often carried unevenly' },
    { word: 'Valedictorian', hint: 'Top scholar delivering farewell remarks' },
  ],
  SPORTS: [
    { word: 'Badminton', hint: 'Feathered projectile flicked across high mesh' },
    { word: 'Basketball', hint: 'Fast hardwood rhythm chasing an elevated ring' },
    { word: 'Archery', hint: 'Controlled breathing before releasing tension' },
    { word: 'Boxing', hint: 'Measured footwork inside four tight ropes' },
    { word: 'Volleyball', hint: 'Three rapid touches before crossing over' },
    { word: 'Esports', hint: 'Arena competition played through peripherals' },
    { word: 'Table Tennis', hint: 'Lightning-fast spin rallies on wood' },
    { word: 'Swimming', hint: 'Goggled sprints guided by bottom lane lines' },
    { word: 'Fencing', hint: 'Dueling steps along a narrow wired strip' },
    { word: 'Billiards', hint: 'Calculated angles rolling over green felt' },
    { word: 'Bowling', hint: 'Heavy curve aimed at triangular targets' },
    { word: 'Sepak Takraw', hint: 'Acrobatic kicks lifting a woven sphere' },
    { word: 'Chess Boxing', hint: 'Alternating silent board strategy with rounds' },
    { word: 'Formula 1', hint: 'Split-second pit stops at roaring speed' },
    { word: 'Marathon', hint: 'Endurance test stretching past forty kilometers' },
    { word: 'Skateboarding', hint: 'Urban balance flipping wooden decks' },
    { word: 'Golf', hint: 'Quiet precision tracking distance on grass' },
    { word: 'Gymnastics', hint: 'Weightless flips judged to clean landings' },
  ],
  COUNTRIES_PLACES: [
    { word: 'Palawan', hint: 'Limestone cliffs rising from turquoise lagoons' },
    { word: 'Japan', hint: 'High-speed rails beside ancient shrines' },
    { word: 'Iceland', hint: 'Steaming volcanic pools beside blue glaciers' },
    { word: 'Paris', hint: 'Riverfront avenues under a wrought-iron spire' },
    { word: 'Baguio', hint: 'Pine-scented cool retreat high in the cordillera' },
    { word: 'Egypt', hint: 'Desert horizon marked by stone triangles' },
    { word: 'Boracay', hint: 'Powdery white shore glowing at sunset' },
    { word: 'Switzerland', hint: 'Snowy alpine peaks famous for precision' },
    { word: 'Siargao', hint: 'Tropical boardwalk facing rolling ocean swells' },
    { word: 'South Korea', hint: 'Neon nightlife paired with palace rooftops' },
    { word: 'Brazil', hint: 'Samba rhythms meeting sprawling rainforests' },
    { word: 'Venice', hint: 'Floating city navigated without car lanes' },
    { word: 'Singapore', hint: 'Compact island packed with glowing supertrees' },
    { word: 'New York', hint: 'Sleepless grid of yellow cabs and towers' },
    { word: 'Vigan', hint: 'Cobblestone streets lined with Spanish heritage' },
    { word: 'Greece', hint: 'Whitewashed cliff homes over deep blue sea' },
    { word: 'Australia', hint: 'Vast red outback rimmed by coral reefs' },
    { word: 'Dubai', hint: 'Glass skyscrapers rising out of golden dunes' },
  ],
  MOVIES_TV: [
    { word: 'Squid Game', hint: 'High-stakes childhood contests in tracksuits' },
    { word: 'Spirited Away', hint: 'Lost girl working inside a spirit bathhouse' },
    { word: 'Inception', hint: 'Spinning top testing layered dream realities' },
    { word: 'Breaking Bad', hint: 'Chemistry talent turning desert RV outlaw' },
    { word: 'Parasite', hint: 'Clever infiltration across a wealthy hillside home' },
    { word: 'Interstellar', hint: 'Space voyage bending time near a black hole' },
    { word: 'Stranger Things', hint: 'Small town kids cycling toward an upside mystery' },
    { word: 'One Piece', hint: 'Straw-hat voyage chasing a legendary treasure' },
    { word: 'Spider-Man', hint: 'Masked web-slinger balancing homework and city' },
    { word: 'Attack on Titan', hint: 'Walled humanity facing towering outsiders' },
    { word: 'Inside Out', hint: 'Control room voices steering a young mind' },
    { word: 'Heneral Luna', hint: 'Fierce mustached commander battling betrayal' },
    { word: 'Train to Busan', hint: 'Desperate rail passengers racing locked doors' },
    { word: 'Avatar', hint: 'Bioluminescent moon defended by tall blue natives' },
    { word: 'The Dark Knight', hint: 'Caped vigilante tested by chaotic street cards' },
    { word: 'Your Name', hint: 'Red thread tying waking lives across time' },
    { word: 'Wednesday', hint: 'Deadpan braided student investigating a dark academy' },
    { word: 'John Wick', hint: 'Tailored retired legend provoked over a pup' },
  ],
  JOBS_PROFESSIONS: [
    { word: 'Astronaut', hint: 'Zero-gravity specialist living inside pressurized hulls' },
    { word: 'Detective', hint: 'Quiet observer connecting scattered alibis' },
    { word: 'Surgeon', hint: 'Steady hands operating under bright overhead lamps' },
    { word: 'Barista', hint: 'Steaming milk art served across early counters' },
    { word: 'Firefighter', hint: 'Heavy gear running toward thick smoke' },
    { word: 'Architect', hint: 'Blueprint visionary balancing light and load' },
    { word: 'Voice Actor', hint: 'Hidden behind studio glass giving life to characters' },
    { word: 'Streamer', hint: 'Live webcam host reacting with scrolling chat' },
    { word: 'Air Traffic Controller', hint: 'Tower headset guiding invisible sky highways' },
    { word: 'Pastry Chef', hint: 'Pre-dawn kitchen craft measured to grams' },
    { word: 'Archaeologist', hint: 'Patient brush uncovering buried centuries' },
    { word: 'Cybersecurity Analyst', hint: 'Digital sentinel hunting quiet network breaches' },
    { word: 'Paramedic', hint: 'Siren-lit urgency stabilizing patients mid-ride' },
    { word: 'Stunt Double', hint: 'Trained risk-taker absorbing cinematic falls' },
    { word: 'Librarian', hint: 'Archivist matching curious minds to rare sources' },
    { word: 'Pilot', hint: 'Checklist discipline steering above cloud decks' },
    { word: 'Tattoo Artist', hint: 'Permanent ink drawn by steady buzzing needle' },
    { word: 'Marine Biologist', hint: 'Wetsuit researcher logging deep reef ecosystems' },
  ],
  TECH_GADGETS: [
    { word: 'Drone', hint: 'Buzzing quad-blade camera riding wind currents' },
    { word: 'Power Bank', hint: 'Pocket reservoir reviving fading battery bars' },
    { word: 'VR Headset', hint: 'Opaque visor swapping walls for digital worlds' },
    { word: 'Smartwatch', hint: 'Wrist screen buzzing with heartbeats and alerts' },
    { word: 'Mechanical Keyboard', hint: 'Tactile switches clicking through late-night typing' },
    { word: 'Noise-Canceling Earbuds', hint: 'Compact shells silencing noisy commuter cabins' },
    { word: '3D Printer', hint: 'Heated nozzle building physical layers from spools' },
    { word: 'E-Reader', hint: 'Glare-free matte screen holding entire shelves' },
    { word: 'Dashcam', hint: 'Windshield lens looping silent traffic evidence' },
    { word: 'Graphics Card', hint: 'Multi-fan silicon powerhouse rendering crisp frames' },
    { word: 'AirTag', hint: 'Coin-sized beacon hiding inside luggage corners' },
    { word: 'Ring Light', hint: 'Circular studio glow softening webcam portraits' },
    { word: 'Action Camera', hint: 'Waterproof wide lens strapped to helmets' },
    { word: 'Router', hint: 'Blinking antennas feeding household airwaves' },
    { word: 'Robot Vacuum', hint: 'Disk floor cruiser mapping furniture automatically' },
    { word: 'External SSD', hint: 'Palm-sized flash vault moving huge files fast' },
    { word: 'USB Hub', hint: 'Slim adapter multiplying scarce laptop ports' },
    { word: 'Smart Doorbell', hint: 'Porch lens pinging phones when motion passes' },
  ],
  BRANDS_PRODUCTS: [
    { word: 'Jollibee', hint: 'Cheerful red bee guarding crispy fried favorites' },
    { word: 'Spotify', hint: 'Green soundwaves curating annual listening recaps' },
    { word: 'Uniqlo', hint: 'Minimalist red square famous for breathable basics' },
    { word: 'Nike', hint: 'Simple curved swoosh stamping marathon shoes' },
    { word: 'Starbucks', hint: 'Green mermaid emblem misspelled on warm cups' },
    { word: 'Nintendo', hint: 'Iconic red-and-blue joy-filled portable fun' },
    { word: 'Gcash', hint: 'Blue pocket wallet scanning everyday street QR codes' },
    { word: 'IKEA', hint: 'Flat-packed labyrinth paired with Swedish meatballs' },
    { word: 'Lego', hint: 'Interlocking colored bricks feared under bare feet' },
    { word: 'Apple', hint: 'Bitten silhouette driving minimalist sleek hardware' },
    { word: 'Shopee', hint: 'Orange checkout cart surging on double-digit dates' },
    { word: 'Netflix', hint: 'Bold red opening chime before weekend binges' },
    { word: 'Crocs', hint: 'Perforated foam clogs personalized with snap charms' },
    { word: 'Discord', hint: 'Purple controller emblem hosting midnight voice rooms' },
    { word: 'Toyota', hint: 'Reliable silver ovals dominating daily commutes' },
    { word: 'YouTube', hint: 'Red play button turning bedrooms into studios' },
    { word: 'Aquaflask', hint: 'Insulated colored bottle echoing loudly when dropped' },
    { word: 'KFC', hint: 'White-haired founder guarding secret herb recipes' },
  ],
  FILIPINO_CULTURE: [
    { word: 'Jeepney', hint: 'Hand-painted chrome road king passing coins forward' },
    { word: 'Bayanihan', hint: 'Neighbors uniting shoulders to lift heavy loads' },
    { word: 'Karaoke', hint: 'Living room scoreboard rating off-key high notes' },
    { word: 'Balikbayan Box', hint: 'Taped cardboard crate packed with abroad gifts' },
    { word: 'Mano Po', hint: 'Respectful forehead gesture greeting elders first' },
    { word: 'Fiesta', hint: 'Colorful street bunting inviting open-door feasts' },
    { word: 'Sari-Sari Store', hint: 'Neighborhood window grille selling single sachets' },
    { word: 'Boodle Fight', hint: 'Banana-leaf spread eaten shoulder to shoulder' },
    { word: 'Harana', hint: 'Moonlit acoustic song played beneath a window' },
    { word: 'Simbang Gabi', hint: 'Pre-dawn December walk chasing warm rice cakes' },
    { word: 'Balut', hint: 'Nighttime street delicacy cracked with pinch of salt' },
    { word: 'Tsinelas', hint: 'Everyday rubber footwear doubling as precision aim' },
    { word: 'Pabebe Wave', hint: 'Playful shy wrist greeting from camera days' },
    { word: 'Tingting Broom', hint: 'Tied coconut ribs sweeping fallen yard leaves' },
    { word: 'Tabo', hint: 'Indispensable colorful plastic scoop in every bath' },
    { word: 'Tricycle', hint: 'Sidecar commute squeezing extra passengers along alleys' },
    { word: 'Lola', hint: 'Warm matriarch spoiling visiting grandkids discreetly' },
    { word: 'Noche Buena', hint: 'Midnight holiday feast unwrapping after countdown' },
  ],
  MOBILE_LEGENDS_HEROES: [
    { word: 'Fanny', hint: 'High-skill assassin zipping across jungle walls on cables' },
    { word: 'Gusion', hint: 'Burst blade dancer recalling flying daggers back' },
    { word: 'Chou', hint: 'Freestyle martial artist kicking targets toward allies' },
    { word: 'Miya', hint: 'Moonlit bow veteran splitting arrows in teamfights' },
    { word: 'Tigreal', hint: 'Heavy shield vanguard slamming whole squads together' },
    { word: 'Franco', hint: 'Viking hooker pulling unsuspecting enemies out of bushes' },
    { word: 'Kagura', hint: 'Mystic umbrella mage teleporting straight into combos' },
    { word: 'Lancelot', hint: 'Dashing fencer weaving untargetable slashes through minions' },
    { word: 'Ling', hint: 'Graceful lightfoot assassin perched atop stone walls' },
    { word: 'Aldous', hint: 'Stack-farming brawler crashing globally onto lonely foes' },
    { word: 'Angela', hint: 'Attached support doll shielding carries from afar' },
    { word: 'Layla', hint: 'Long-range cannon marksman scaling hard into late game' },
    { word: 'Nana', hint: 'Mischievous raccoon caster turning divers into stuffed toys' },
    { word: 'Hayabusa', hint: 'Four-shadow ninja slicing isolated targets in seconds' },
    { word: 'Alucard', hint: 'Lifesteal swordsman leaping straight into crowd control' },
    { word: 'Yu Zhong', hint: 'Soaring black dragon diving straight through backlines' },
    { word: 'Granger', hint: 'Six-bullet violinist marksman firing final cannon shots' },
    { word: 'Eudora', hint: 'Campfire bush mage waiting to stun-zap in one blink' },
    { word: 'Zilong', hint: 'Spear sprinter flipping towers before slipping away' },
    { word: 'Estes', hint: 'Elven moon priest chaining endless green healing' },
  ],
  DOTA2_HEROES: [
    { word: 'Pudge', hint: 'Lumbering butcher threading blind hooks from tree fog' },
    { word: 'Invoker', hint: 'Prideful arcanist blending three orbs into ten spells' },
    { word: 'Anti-Mage', hint: 'Blinking ascetic punishing full mana pools ruthlessly' },
    { word: 'Juggernaut', hint: 'Masked swordsman spinning safely before multi-slashing' },
    { word: 'Crystal Maiden', hint: 'Slow frosty support fueling allies passive mana flow' },
    { word: 'Phantom Assassin', hint: 'Blurred killer fishing for massive red critical strikes' },
    { word: 'Earthshaker', hint: 'Totem initiator punishing tightly clumped waves' },
    { word: 'Rubick', hint: 'Quirky grand magus borrowing enemies signature ultimates' },
    { word: 'Sniper', hint: 'Distant marksman plinking towers from high ground' },
    { word: 'Shadow Fiend', hint: 'Soul-collecting demon lining triple dark raze blasts' },
    { word: 'Axe', hint: 'Red berserker daring foes to strike his spinning counter' },
    { word: 'Slark', hint: 'Slippery dark reef crawler regenerating out of enemy vision' },
    { word: 'Riki', hint: 'Permanent stealth stalker backstabbing inside smoke' },
    { word: 'Drow Ranger', hint: 'Silent frost archer melting armor from long range' },
    { word: 'Zeus', hint: 'Thunder god zapping low survivors anywhere on the map' },
    { word: 'Windranger', hint: 'Shackling ginger archer firing rapid focus volleys' },
    { word: 'Techies', hint: 'Chaotic explosive trio guarding choke points with traps' },
    { word: 'Lina', hint: 'Fiery sorceress stacking attack speed after bright strikes' },
    { word: 'Sven', hint: 'Armored cleave knight turning crimson for giant swings' },
    { word: 'Lion', hint: 'Spiked demon witch juggling disables before one burst zap' },
  ],
  LOVE_RELATIONSHIPS: [
    { word: 'Ghosting', hint: 'Warm daily chats ending in sudden unexplained silence' },
    { word: 'Friendzone', hint: 'Endless closeness walled off from romance' },
    { word: 'Situationship', hint: 'Undefined bond carrying jealousy without clear labels' },
    { word: 'Mixed Signals', hint: 'Sweet late-night texts followed by cold daylight distance' },
    { word: 'Love Bombing', hint: 'Overwhelming early praise sweeping pacing aside' },
    { word: 'Long Distance', hint: 'Timezone countdowns held together by glowing screens' },
    { word: 'Green Flag', hint: 'Small thoughtful habit proving steady emotional care' },
    { word: 'Red Flag', hint: 'Subtle warning sign often excused during infatuation' },
    { word: 'First Date', hint: 'Overthought outfit paired with nervous small talk' },
    { word: 'Rebound', hint: 'Quick distraction soothing fresh heartbreak noise' },
    { word: 'Slow Burn', hint: 'Quiet trust deepening carefully across seasons' },
    { word: 'Closure', hint: 'Final honest talk letting lingering questions rest' },
    { word: 'Crush', hint: 'Secret grin every time one name pops up' },
    { word: 'Anniversary', hint: 'Calendar milestone recalling how it began' },
    { word: 'Jealousy', hint: 'Quiet tightness sparked by divided attention' },
    { word: 'Third Wheel', hint: 'Tag-along guest walking slightly behind the pair' },
    { word: 'Breadcrumbing', hint: 'Occasional tiny check-ins keeping hope barely alive' },
    { word: 'Blind Date', hint: 'Table for two arranged solely by mutual friends' },
  ],
  FILIPINO_SLANG: [
    { word: 'Sana All', hint: 'Wistful chorus praising someone else good fortune' },
    { word: 'Charot', hint: 'Quick playful disclaimer erasing a bold remark' },
    { word: 'Budol', hint: 'Unexpected checkout spree blamed on peer hype' },
    { word: 'Marites', hint: 'Neighborhood radar updating faster than evening news' },
    { word: 'Dasurb', hint: 'Emphatic cheer declaring someone earned their reward' },
    { word: 'Awit', hint: 'Heavy sigh blending sudden pain with quiet pity' },
    { word: 'Forda', hint: 'Prefix framing whatever dramatic mood drives the moment' },
    { word: 'Lodz', hint: 'Casual inverted compliment praising respected friends' },
    { word: 'Petmalu', hint: 'Reversed adjective cheering astonishing skill' },
    { word: 'Werpa', hint: 'Flipped cheer sending instant morale and strength' },
    { word: 'Chika', hint: 'Juicy table catch-up lasting far past coffee' },
    { word: 'Beshie', hint: 'Ride-or-die confidant hearing unfiltered stories' },
    { word: 'Sabaw', hint: 'Spacey brain fog after pulling sleepless hours' },
    { word: 'Kilig', hint: 'Uncontrollable giddy shiver over subtle gestures' },
    { word: 'Gigil', hint: 'Squeezing urge born from extreme cuteness or rage' },
    { word: 'Sawi', hint: 'Dramatic ballad playlist mood after rejection' },
    { word: 'Ambag', hint: 'Small group chip-in separating planners from freeloaders' },
    { word: 'Ghosted Na Naman', hint: 'Familiar sting when read receipts never reply' },
  ],
  EMOTIONS_FEELINGS: [
    { word: 'Nostalgia', hint: 'Bittersweet tug triggered by an old scent or song' },
    { word: 'Stage Fright', hint: 'Sudden dry throat right before eyes turn on you' },
    { word: 'Gratitude', hint: 'Quiet warmth appreciating what easily went unnoticed' },
    { word: 'Relief', hint: 'Heavy shoulder drop after bracing for bad news' },
    { word: 'Secondhand Embarrassment', hint: 'Cringing inward while watching someone else stumble' },
    { word: 'Anticipation', hint: 'Restless clock-watching just before doors open' },
    { word: 'Envy', hint: 'Sharp quiet comparison measuring someone else spotlight' },
    { word: 'Serenity', hint: 'Unshaken stillness louder than outside chaos' },
    { word: 'Guilt', hint: 'Lingering replay wishing one choice ran differently' },
    { word: 'Awe', hint: 'Speechless pause beside something impossibly vast' },
    { word: 'Homesickness', hint: 'Familiar ache missing ordinary routines back home' },
    { word: 'Vindication', hint: 'Calm satisfaction when ignored warnings come true' },
    { word: 'Overwhelmed', hint: 'Too many open tabs demanding focus at once' },
    { word: 'Pride', hint: 'Standing taller after finishing something genuinely tough' },
    { word: 'Empathy', hint: 'Stepping gently inside someone else unseen weight' },
    { word: 'Regret', hint: 'Hindsight clarity arriving slightly past the moment' },
    { word: 'Euphoria', hint: 'Brief weightless peak feeling unstoppable inside' },
    { word: 'Suspicion', hint: 'Narrowed gaze questioning why a story sounds too neat' },
  ],
  ABSTRACT_CONCEPTS: [
    { word: 'Déjà Vu', hint: 'Eerie flash insisting this new moment played before' },
    { word: 'Butterfly Effect', hint: 'Trivial choice snowballing into unimagined history' },
    { word: 'Karma', hint: 'Silent ledger balancing deeds long after they pass' },
    { word: 'Paradox', hint: 'Tight logic loop contradicting itself cleanly' },
    { word: 'Impostor Syndrome', hint: 'Self-doubt whispering earned praise was luck' },
    { word: 'Free Will', hint: 'Question of whether choices are truly unscripted' },
    { word: 'Sonder', hint: 'Sudden realization that passersby hold vivid worlds' },
    { word: 'Entropy', hint: 'Quiet drift carrying tidy order toward scatter' },
    { word: 'Placebo', hint: 'Measurable shift sparked purely by belief alone' },
    { word: 'Altruism', hint: 'Quiet generosity carrying zero expectation of return' },
    { word: 'Irony', hint: 'Outcome twisting squarely against surface expectations' },
    { word: 'Confirmation Bias', hint: 'Spotlight favoring clues that agree with existing bets' },
    { word: 'Opportunity Cost', hint: 'Hidden price measured by paths left untaken' },
    { word: 'Solitude', hint: 'Intentional quiet chosen without feeling lonely' },
    { word: 'Memento Mori', hint: 'Quiet reminder keeping fleeting hours precious' },
    { word: 'Dunning-Kruger Effect', hint: 'Early confidence towering highest before deep mastery' },
    { word: 'Time Dilation', hint: 'Clocks ticking out of step at extreme speeds or heights' },
    { word: 'Occam Razor', hint: 'Rule trusting the leanest answer over twisted plots' },
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
  allPlayers: ImpostorPlayerInGame[],
  hostUserId: string
): string {
  const cleanName = target.username.trim();
  const initialUpper = cleanName.charAt(0).toUpperCase();
  const alphabetBracket =
    initialUpper >= 'A' && initialUpper <= 'M' ? 'A–M' : 'N–Z';
  const lengthBand =
    cleanName.length <= 5
      ? 'Short codename (<=5 chars)'
      : cleanName.length <= 8
        ? 'Mid-length codename (6–8 chars)'
        : 'Long codename (9+ chars)';
  const vowelCount = (cleanName.match(/[aeiou]/gi) || []).length;
  const roleStanding =
    target.userId === hostUserId ? 'Holds room host keys' : `Agent among ${allPlayers.length} seated`;

  return `Dossier clue: Initial in ${alphabetBracket} · ${lengthBand} · ${vowelCount} vowels (${roleStanding})`;
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
