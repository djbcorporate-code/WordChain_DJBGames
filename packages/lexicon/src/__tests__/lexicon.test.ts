import path from 'path';
import { beforeAll, describe, expect, it } from 'vitest';
import { LexiconService } from '../LexiconService.js';
import { LexiconTrie } from '../LexiconTrie.js';

describe('LexiconService & Trie Tests', () => {
  let lexicon: LexiconService;

  beforeAll(async () => {
    lexicon = LexiconService.getInstance();
    const dataDir = path.resolve(__dirname, '..', '..', 'data');
    await lexicon.initialize(dataDir);
  });

  it('should load words into memory with > 100,000 words', () => {
    expect(lexicon.size()).toBeGreaterThan(100000);
  });

  it('should accurately identify real English words', () => {
    expect(lexicon.hasWord('apple')).toBe(true);
    expect(lexicon.hasWord('ELEPHANT')).toBe(true);
    expect(lexicon.hasWord('Tiger')).toBe(true);
    expect(lexicon.hasWord('Quantum')).toBe(true);
    expect(lexicon.hasWord('Xylophone')).toBe(true);
    expect(lexicon.hasWord('notarealwordxyz99')).toBe(false);
  });

  it('validateMove: should accept valid chain word', () => {
    const history = new Set(['PLANET']);
    const result = lexicon.validateMove('TIGER', 'T', history);

    expect(result.isValid).toBe(true);
    expect(result.normalizedWord).toBe('TIGER');
  });

  it('validateMove: should reject wrong starting letter', () => {
    const history = new Set(['PLANET']);
    const result = lexicon.validateMove('RABBIT', 'T', history);

    expect(result.isValid).toBe(false);
    expect(result.reason).toBe('INVALID_PREFIX');
  });

  it('validateMove: should reject word already chained in match', () => {
    const history = new Set(['PLANET', 'TIGER']);
    const result = lexicon.validateMove('TIGER', 'T', history);

    expect(result.isValid).toBe(false);
    expect(result.reason).toBe('ALREADY_USED');
  });

  it('validateMove: should reject words shorter than 3 letters', () => {
    const history = new Set<string>();
    const result = lexicon.validateMove('TO', 'T', history);

    expect(result.isValid).toBe(false);
    expect(result.reason).toBe('TOO_SHORT');
  });

  it('validateMove: should reject non-dictionary words', () => {
    const history = new Set<string>();
    const result = lexicon.validateMove('TURTLEXQZ', 'T', history);

    expect(result.isValid).toBe(false);
    expect(result.reason).toBe('NOT_IN_DICTIONARY');
  });

  it('Trie: should correctly query prefixes and count words', () => {
    const trie = new LexiconTrie();
    trie.insert('APPLE');
    trie.insert('APPLICATION');
    trie.insert('APPLY');
    trie.insert('BANANA');

    expect(trie.hasWord('APPLE')).toBe(true);
    expect(trie.hasWord('APP')).toBe(false);
    expect(trie.hasPrefix('APP')).toBe(true);
    expect(trie.hasPrefix('BAN')).toBe(true);
    expect(trie.hasPrefix('CAT')).toBe(false);

    expect(trie.countWordsWithPrefix('APP')).toBe(3);
    const words = trie.getWordsWithPrefix('APP');
    expect(words).toContain('APPLE');
    expect(words).toContain('APPLICATION');
    expect(words).toContain('APPLY');
  });

  it('should return random seed words and alternative fallback letters', () => {
    const seed = lexicon.getRandomSeedWord();
    expect(seed.length).toBeGreaterThanOrEqual(3);
    expect(lexicon.hasWord(seed)).toBe(true);

    const fallback = lexicon.getFallbackLetter(new Set());
    expect(['A', 'C', 'D', 'E', 'M', 'P', 'R', 'S', 'T']).toContain(fallback);
  });
});
