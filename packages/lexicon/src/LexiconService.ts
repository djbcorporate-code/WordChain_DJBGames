import {
  HIGH_FREQUENCY_LETTERS,
  INITIAL_SEED_WORDS,
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
  private wordSet: Set<string> = new Set();
  private letterBuckets: Map<string, string[]> = new Map();
  private trie: LexiconTrie = new LexiconTrie();
  private isLoaded: boolean = false;

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

    // Read words dataset
    if (fs.existsSync(wordsFile)) {
      this.loadWordsFromFile(wordsFile, blacklist);
    } else {
      console.warn(`[LexiconService] Dictionary file not found at ${wordsFile}. Using default seeds.`);
      for (const word of INITIAL_SEED_WORDS) {
        this.wordSet.add(word);
        this.trie.insert(word);
      }
    }

    // Load supplemental country names and personal names
    const countriesFile = path.join(dataDir, 'countries.txt');
    const namesFile = path.join(dataDir, 'names.txt');

    const countriesAdded = this.loadWordsFromFile(countriesFile, blacklist);
    const namesAdded = this.loadWordsFromFile(namesFile, blacklist);

    this.isLoaded = true;
    console.log(
      `[LexiconService] Indexed ${this.wordSet.size.toLocaleString()} English words into memory (including ${countriesAdded} countries and ${namesAdded} names).`
    );
  }

  private loadWordsFromFile(filePath: string, blacklist: Set<string>): number {
    if (!fs.existsSync(filePath)) return 0;
    const fileStream = fs.readFileSync(filePath, 'utf8');
    const lines = fileStream.split(/\r?\n/);
    let addedCount = 0;

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
        if (!this.wordSet.has(word)) {
          this.wordSet.add(word);
          this.trie.insert(word);

          const firstLetter = word[0];
          let bucket = this.letterBuckets.get(firstLetter);
          if (!bucket) {
            bucket = [];
            this.letterBuckets.set(firstLetter, bucket);
          }
          bucket.push(word);
          addedCount++;
        }
      }
    }
    return addedCount;
  }

  public hasWord(word: string): boolean {
    return this.wordSet.has(word.trim().toUpperCase());
  }

  public validateMove(
    candidateWord: string,
    requiredLetter: string,
    historyWords: Set<string>
  ): { isValid: boolean; reason?: WordRejectionReason; normalizedWord: string } {
    const normalized = candidateWord.trim().toUpperCase();

    // 1. Length validation (3 - 46 letters)
    if (normalized.length < WORD_MIN_LENGTH) {
      return { isValid: false, reason: 'TOO_SHORT', normalizedWord: normalized };
    }
    if (normalized.length > WORD_MAX_LENGTH) {
      return { isValid: false, reason: 'TOO_LONG', normalizedWord: normalized };
    }

    // 2. Alphabetic character validation (English letters only)
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

    // 5. Lexicon existence check
    if (!this.hasWord(normalized)) {
      return { isValid: false, reason: 'NOT_IN_DICTIONARY', normalizedWord: normalized };
    }

    return { isValid: true, normalizedWord: normalized };
  }

  public getRemainingWordsCount(startingPrefix: string, historyWords: Set<string>): number {
    const prefix = startingPrefix.toUpperCase();
    if (prefix.length === 1) {
      const bucket = this.letterBuckets.get(prefix) || [];
      let count = 0;
      for (let i = 0; i < bucket.length; i++) {
        if (!historyWords.has(bucket[i])) {
          count++;
        }
      }
      return count;
    }

    // Multi-letter prefix (e.g. 2 letters for round 20+)
    const candidateWords = this.trie.getWordsWithPrefix(prefix, 1000);
    let count = 0;
    for (let i = 0; i < candidateWords.length; i++) {
      if (!historyWords.has(candidateWords[i])) {
        count++;
      }
    }
    return count;
  }

  public getRandomSeedWord(): string {
    const seeds = INITIAL_SEED_WORDS;
    const randomSeed = seeds[Math.floor(Math.random() * seeds.length)];
    return randomSeed;
  }

  public getFallbackLetter(historyWords: Set<string>): string {
    return this.getFallbackPrefix(historyWords, 1);
  }

  public getFallbackPrefix(historyWords: Set<string>, prefixLength: number = 1): string {
    if (prefixLength >= 2) {
      const common2LetterPrefixes = ['TH', 'ST', 'CH', 'SH', 'PR', 'RE', 'IN', 'DE', 'TR', 'PL'];
      let bestPrefix = 'TH';
      let maxRemaining = 0;
      for (const prefix of common2LetterPrefixes) {
        const remaining = this.getRemainingWordsCount(prefix, historyWords);
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
      const remaining = this.getRemainingWordsCount(letter, historyWords);
      if (remaining > maxRemaining) {
        maxRemaining = remaining;
        bestLetter = letter;
      }
    }

    return bestLetter;
  }

  public getTrie(): LexiconTrie {
    return this.trie;
  }

  public addWord(word: string): boolean {
    const normalized = word.trim().toUpperCase();
    if (!normalized || this.wordSet.has(normalized)) return false;

    this.wordSet.add(normalized);
    this.trie.insert(normalized);

    const firstLetter = normalized[0];
    let bucket = this.letterBuckets.get(firstLetter);
    if (!bucket) {
      bucket = [];
      this.letterBuckets.set(firstLetter, bucket);
    }
    bucket.push(normalized);
    return true;
  }

  public banWord(word: string): boolean {
    const normalized = word.trim().toUpperCase();
    if (!this.wordSet.has(normalized)) return false;

    this.wordSet.delete(normalized);

    const firstLetter = normalized[0];
    const bucket = this.letterBuckets.get(firstLetter);
    if (bucket) {
      const idx = bucket.indexOf(normalized);
      if (idx !== -1) bucket.splice(idx, 1);
    }
    return true;
  }

  public size(): number {
    return this.wordSet.size;
  }
}
