import {
  BISAYA_SEED_WORDS,
  GameLanguage,
  HIGH_FREQUENCY_LETTERS,
  INITIAL_SEED_WORDS,
  TAGALOG_SEED_WORDS,
  WORD_MAX_LENGTH,
  WORD_MIN_LENGTH,
  WordRejectionReason,
} from '@wordchain/shared';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { LexiconTrie } from './LexiconTrie.js';

export class LexiconService {
  private static instance: LexiconService | null = null;
  private wordSets: Map<GameLanguage, Set<string>> = new Map([
    ['ENGLISH', new Set()],
    ['TAGALOG', new Set()],
    ['BISAYA', new Set()],
    ['MIXED', new Set()],
  ]);
  private letterBuckets: Map<GameLanguage, Map<string, string[]>> = new Map([
    ['ENGLISH', new Map()],
    ['TAGALOG', new Map()],
    ['BISAYA', new Map()],
    ['MIXED', new Map()],
  ]);
  private tries: Map<GameLanguage, LexiconTrie> = new Map([
    ['ENGLISH', new LexiconTrie()],
    ['TAGALOG', new LexiconTrie()],
    ['BISAYA', new LexiconTrie()],
    ['MIXED', new LexiconTrie()],
  ]);
  private isLoaded: boolean = false;

  // Backwards-compatible accessors for default English dictionary
  public get wordSet(): Set<string> {
    return this.wordSets.get('ENGLISH')!;
  }

  public get trie(): LexiconTrie {
    return this.tries.get('ENGLISH')!;
  }

  public static getInstance(): LexiconService {
    if (!LexiconService.instance) {
      LexiconService.instance = new LexiconService();
    }
    return LexiconService.instance;
  }

  public async initialize(customDataDir?: string): Promise<void> {
    if (this.isLoaded) return;

    let dataDir = customDataDir;
    if (!dataDir) {
      const candidates = [
        path.resolve(process.cwd(), 'packages', 'lexicon', 'data'),
        path.resolve(process.cwd(), '..', '..', 'packages', 'lexicon', 'data'),
        path.resolve(process.cwd(), '..', 'packages', 'lexicon', 'data'),
      ];

      try {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        candidates.unshift(path.resolve(__dirname, '..', 'data'));
        candidates.unshift(path.resolve(__dirname, '..', '..', 'data'));
      } catch {
        // ignore
      }

      for (const candidate of candidates) {
        if (fs.existsSync(path.join(candidate, 'words_enable1.txt'))) {
          dataDir = candidate;
          break;
        }
      }

      if (!dataDir) {
        dataDir = candidates[0];
      }
    }

    const wordsFile = path.join(dataDir, 'words_enable1.txt');
    const blacklistFile = path.join(dataDir, 'slurs_blacklist.txt');

    // Read blacklist if exists
    const blacklist = new Set<string>();
    if (fs.existsSync(blacklistFile)) {
      const blacklistContent = fs.readFileSync(blacklistFile, 'utf8');
      blacklistContent.split(/\r?\n/).forEach((line) => {
        const trimmed = line.trim().toUpperCase();
        if (trimmed && !trimmed.startsWith('#')) {
          blacklist.add(trimmed);
        }
      });
    }

    // 1. Read English words datasets:
    // - Classic ENABLE1
    // - CSW19 (Collins Official Scrabble Words tournament dictionary)
    // - Comprehensive English wordlist (dwyl)
    // - Modern English 2020-2026 neologisms, tech terms & internet slang
    const englishFiles = [
      wordsFile,
      path.join(dataDir, 'csw19.txt'),
      path.join(dataDir, 'words_dwyl.txt'),
      path.join(dataDir, 'modern_english.txt'),
    ];

    let loadedEnglish = 0;
    for (const file of englishFiles) {
      if (fs.existsSync(file)) {
        loadedEnglish += this.loadWordsFromFile(file, blacklist, 'ENGLISH');
      }
    }
    if (loadedEnglish === 0) {
      console.warn(`[LexiconService] Dictionary files not found. Using default seeds.`);
      for (const word of INITIAL_SEED_WORDS) {
        this.wordSets.get('ENGLISH')!.add(word);
        this.tries.get('ENGLISH')!.insert(word);
      }
    }

    // Supplemental country names, personal names, and popular brand names
    const countriesFile = path.join(dataDir, 'countries.txt');
    const namesFile = path.join(dataDir, 'names.txt');
    const brandsFile = path.join(dataDir, 'brands.txt');

    this.loadWordsFromFile(countriesFile, blacklist, 'ENGLISH');
    this.loadWordsFromFile(namesFile, blacklist, 'ENGLISH');
    this.loadWordsFromFile(brandsFile, blacklist, 'ENGLISH');

    // 2. Read Tagalog words dataset
    const tagalogFile = path.join(dataDir, 'words_tagalog.txt');
    if (fs.existsSync(tagalogFile)) {
      this.loadWordsFromFile(tagalogFile, blacklist, 'TAGALOG');
    } else {
      for (const word of TAGALOG_SEED_WORDS) {
        this.wordSets.get('TAGALOG')!.add(word);
        this.tries.get('TAGALOG')!.insert(word);
      }
    }
    // Also include countries, names, and brands in Tagalog
    this.loadWordsFromFile(countriesFile, blacklist, 'TAGALOG');
    this.loadWordsFromFile(namesFile, blacklist, 'TAGALOG');
    this.loadWordsFromFile(brandsFile, blacklist, 'TAGALOG');

    // 3. Read Bisaya words dataset
    const bisayaFile = path.join(dataDir, 'words_bisaya.txt');
    if (fs.existsSync(bisayaFile)) {
      this.loadWordsFromFile(bisayaFile, blacklist, 'BISAYA');
    } else {
      for (const word of BISAYA_SEED_WORDS) {
        this.wordSets.get('BISAYA')!.add(word);
        this.tries.get('BISAYA')!.insert(word);
      }
    }
    // Also include countries, names, and brands in Bisaya
    this.loadWordsFromFile(countriesFile, blacklist, 'BISAYA');
    this.loadWordsFromFile(namesFile, blacklist, 'BISAYA');
    this.loadWordsFromFile(brandsFile, blacklist, 'BISAYA');

    this.isLoaded = true;
    console.log(
      `[LexiconService] Indexed dictionaries into memory: English (${this.size('ENGLISH').toLocaleString()}), Tagalog (${this.size('TAGALOG').toLocaleString()}), Bisaya (${this.size('BISAYA').toLocaleString()}), Mixed (${this.size('MIXED').toLocaleString()}) words.`
    );
  }

  private loadWordsFromFile(filePath: string, blacklist: Set<string>, language: GameLanguage): number {
    if (!fs.existsSync(filePath)) return 0;
    const fileStream = fs.readFileSync(filePath, 'utf8');
    const lines = fileStream.split(/\r?\n/);
    let addedCount = 0;

    const set = this.wordSets.get(language)!;
    const buckets = this.letterBuckets.get(language)!;
    const trie = this.tries.get(language)!;

    for (let i = 0; i < lines.length; i++) {
      const word = lines[i].trim().toUpperCase();
      if (
        word &&
        !word.startsWith('#') &&
        !blacklist.has(word) &&
        /^[A-Z]+$/.test(word) &&
        word.length >= WORD_MIN_LENGTH &&
        word.length <= WORD_MAX_LENGTH
      ) {
        if (!set.has(word)) {
          set.add(word);
          trie.insert(word);

          const firstLetter = word[0];
          let bucket = buckets.get(firstLetter);
          if (!bucket) {
            bucket = [];
            buckets.set(firstLetter, bucket);
          }
          bucket.push(word);
          addedCount++;
        }
      }
    }
    return addedCount;
  }

  public size(language: GameLanguage = 'ENGLISH'): number {
    if (language === 'MIXED') {
      const eng = this.wordSets.get('ENGLISH')?.size || 0;
      const tag = this.wordSets.get('TAGALOG')?.size || 0;
      const bis = this.wordSets.get('BISAYA')?.size || 0;
      return eng + tag + bis;
    }
    return this.wordSets.get(language)?.size || 0;
  }

  public hasWord(word: string, language: GameLanguage = 'ENGLISH'): boolean {
    const normalized = word.trim().toUpperCase();
    if (language === 'MIXED') {
      return (
        (this.wordSets.get('ENGLISH')?.has(normalized) ?? false) ||
        (this.wordSets.get('TAGALOG')?.has(normalized) ?? false) ||
        (this.wordSets.get('BISAYA')?.has(normalized) ?? false)
      );
    }
    return this.wordSets.get(language)?.has(normalized) ?? false;
  }

  public validateMove(
    candidateWord: string,
    requiredLetter: string,
    historyWords: Set<string>,
    language: GameLanguage = 'ENGLISH'
  ): { isValid: boolean; reason?: WordRejectionReason; normalizedWord: string } {
    const normalized = candidateWord.trim().toUpperCase();

    // 1. Length validation (3 - 46 letters)
    if (normalized.length < WORD_MIN_LENGTH) {
      return { isValid: false, reason: 'TOO_SHORT', normalizedWord: normalized };
    }
    if (normalized.length > WORD_MAX_LENGTH) {
      return { isValid: false, reason: 'TOO_LONG', normalizedWord: normalized };
    }

    // 2. Alphabetic character validation (letters only)
    if (!/^[A-Z]+$/.test(normalized)) {
      return { isValid: false, reason: 'NOT_IN_DICTIONARY', normalizedWord: normalized };
    }

    // 3. Starting prefix validation (1 or 2 letters)
    const expectedPrefix = requiredLetter.trim().toUpperCase();
    if (!normalized.startsWith(expectedPrefix)) {
      return { isValid: false, reason: 'INVALID_PREFIX', normalizedWord: normalized };
    }

    // 4. Repeat check in the current match
    if (historyWords.has(normalized)) {
      return { isValid: false, reason: 'ALREADY_USED', normalizedWord: normalized };
    }

    // 5. Lexicon existence check for the match's language
    if (!this.hasWord(normalized, language)) {
      return { isValid: false, reason: 'NOT_IN_DICTIONARY', normalizedWord: normalized };
    }

    return { isValid: true, normalizedWord: normalized };
  }

  public getRemainingWordsCount(
    startingPrefix: string,
    historyWords: Set<string>,
    language: GameLanguage = 'ENGLISH'
  ): number {
    if (language === 'MIXED') {
      return (
        this.getRemainingWordsCount(startingPrefix, historyWords, 'ENGLISH') +
        this.getRemainingWordsCount(startingPrefix, historyWords, 'TAGALOG') +
        this.getRemainingWordsCount(startingPrefix, historyWords, 'BISAYA')
      );
    }

    const prefix = startingPrefix.toUpperCase();
    const buckets = this.letterBuckets.get(language);
    if (!buckets) return 0;

    if (prefix.length === 1) {
      const bucket = buckets.get(prefix) || [];
      let count = 0;
      for (let i = 0; i < bucket.length; i++) {
        if (!historyWords.has(bucket[i])) {
          count++;
        }
      }
      return count;
    }

    // Multi-letter prefix (e.g. 2 letters for round 20+)
    const trie = this.tries.get(language) || this.tries.get('ENGLISH')!;
    const candidateWords = trie.getWordsWithPrefix(prefix, 1000);
    let count = 0;
    for (let i = 0; i < candidateWords.length; i++) {
      if (!historyWords.has(candidateWords[i])) {
        count++;
      }
    }
    return count;
  }

  public getRandomSeedWord(language: GameLanguage = 'ENGLISH'): string {
    if (language === 'TAGALOG') {
      return TAGALOG_SEED_WORDS[Math.floor(Math.random() * TAGALOG_SEED_WORDS.length)];
    }
    if (language === 'BISAYA') {
      return BISAYA_SEED_WORDS[Math.floor(Math.random() * BISAYA_SEED_WORDS.length)];
    }
    if (language === 'MIXED') {
      const allSeeds = [...INITIAL_SEED_WORDS, ...TAGALOG_SEED_WORDS, ...BISAYA_SEED_WORDS];
      return allSeeds[Math.floor(Math.random() * allSeeds.length)];
    }
    const seeds = INITIAL_SEED_WORDS;
    return seeds[Math.floor(Math.random() * seeds.length)];
  }

  public getFallbackLetter(historyWords: Set<string>, language: GameLanguage = 'ENGLISH'): string {
    return this.getFallbackPrefix(historyWords, 1, language);
  }

  public getFallbackPrefix(
    historyWords: Set<string>,
    prefixLength: number = 1,
    language: GameLanguage = 'ENGLISH'
  ): string {
    if (prefixLength >= 2) {
      const common2LetterPrefixes = ['TH', 'ST', 'CH', 'SH', 'PR', 'RE', 'IN', 'DE', 'TR', 'PL', 'MA', 'PA', 'KA'];
      let bestPrefix = common2LetterPrefixes[0];
      let maxRemaining = 0;
      for (const prefix of common2LetterPrefixes) {
        const remaining = this.getRemainingWordsCount(prefix, historyWords, language);
        if (remaining > maxRemaining) {
          maxRemaining = remaining;
          bestPrefix = prefix;
        }
      }
      return bestPrefix;
    }

    // Single letter fallback
    let bestLetter = 'T';
    let maxRemaining = 0;

    for (const letter of HIGH_FREQUENCY_LETTERS) {
      const remaining = this.getRemainingWordsCount(letter, historyWords, language);
      if (remaining > maxRemaining) {
        maxRemaining = remaining;
        bestLetter = letter;
      }
    }

    return bestLetter;
  }

  public getTrie(language: GameLanguage = 'ENGLISH'): LexiconTrie {
    if (language === 'MIXED') {
      return {
        insert: (w: string) => {
          this.addWord(w, 'ENGLISH');
        },
        hasWord: (w: string) => this.hasWord(w, 'MIXED'),
        hasPrefix: (p: string) =>
          this.tries.get('ENGLISH')!.hasPrefix(p) ||
          this.tries.get('TAGALOG')!.hasPrefix(p) ||
          this.tries.get('BISAYA')!.hasPrefix(p),
        countWordsWithPrefix: (p: string) =>
          this.tries.get('ENGLISH')!.countWordsWithPrefix(p) +
          this.tries.get('TAGALOG')!.countWordsWithPrefix(p) +
          this.tries.get('BISAYA')!.countWordsWithPrefix(p),
        getWordsWithPrefix: (p: string, maxResults: number = 50) => {
          const res = new Set<string>();
          for (const lang of ['ENGLISH', 'TAGALOG', 'BISAYA'] as GameLanguage[]) {
            const words = this.tries.get(lang)?.getWordsWithPrefix(p, maxResults) || [];
            for (const w of words) {
              res.add(w);
              if (res.size >= maxResults) break;
            }
            if (res.size >= maxResults) break;
          }
          return Array.from(res);
        },
        size: () => this.size('MIXED'),
      } as LexiconTrie;
    }
    return this.tries.get(language) || this.tries.get('ENGLISH')!;
  }

  public addWord(word: string, language: GameLanguage = 'ENGLISH'): boolean {
    const normalized = word.trim().toUpperCase();
    const set = this.wordSets.get(language);
    const buckets = this.letterBuckets.get(language);
    const trie = this.tries.get(language);
    if (!set || !buckets || !trie || !normalized || set.has(normalized)) return false;

    set.add(normalized);
    trie.insert(normalized);

    const firstLetter = normalized[0];
    let bucket = buckets.get(firstLetter);
    if (!bucket) {
      bucket = [];
      buckets.set(firstLetter, bucket);
    }
    bucket.push(normalized);

    if (language !== 'MIXED') {
      this.addWord(normalized, 'MIXED');
    }

    return true;
  }

  public banWord(word: string, language?: GameLanguage): boolean {
    const normalized = word.trim().toUpperCase();
    if (!normalized) return false;

    const langs: GameLanguage[] = language ? [language] : ['ENGLISH', 'TAGALOG', 'BISAYA', 'MIXED'];
    let removedAny = false;

    for (const lang of langs) {
      const set = this.wordSets.get(lang);
      const buckets = this.letterBuckets.get(lang);
      if (set && set.has(normalized)) {
        set.delete(normalized);
        if (buckets) {
          const firstLetter = normalized[0];
          const bucket = buckets.get(firstLetter);
          if (bucket) {
            const idx = bucket.indexOf(normalized);
            if (idx !== -1) bucket.splice(idx, 1);
          }
        }
        removedAny = true;
      }
    }
    return removedAny;
  }
}
