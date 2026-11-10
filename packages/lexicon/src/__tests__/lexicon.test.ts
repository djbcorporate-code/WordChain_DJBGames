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

  it('should accept country names as valid playable words', () => {
    expect(lexicon.hasWord('FRANCE')).toBe(true);
    expect(lexicon.hasWord('CANADA')).toBe(true);
    expect(lexicon.hasWord('JAPAN')).toBe(true);
    expect(lexicon.hasWord('BRAZIL')).toBe(true);
    expect(lexicon.hasWord('PHILIPPINES')).toBe(true);
    expect(lexicon.hasWord('GERMANY')).toBe(true);
    expect(lexicon.hasWord('SPAIN')).toBe(true);
    expect(lexicon.hasWord('ITALY')).toBe(true);

    const history = new Set(['PARIS']);
    const move = lexicon.validateMove('SPAIN', 'S', history);
    expect(move.isValid).toBe(true);
    expect(move.normalizedWord).toBe('SPAIN');
  });

  it('should accept personal first names as valid playable words', () => {
    expect(lexicon.hasWord('JOHN')).toBe(true);
    expect(lexicon.hasWord('EMMA')).toBe(true);
    expect(lexicon.hasWord('ALEX')).toBe(true);
    expect(lexicon.hasWord('SARAH')).toBe(true);
    expect(lexicon.hasWord('NOAH')).toBe(true);
    expect(lexicon.hasWord('CHLOE')).toBe(true);
    expect(lexicon.hasWord('LUCAS')).toBe(true);

    const history = new Set(['LION']);
    const move = lexicon.validateMove('NOAH', 'N', history);
    expect(move.isValid).toBe(true);
    expect(move.normalizedWord).toBe('NOAH');
  });

  it('should accept Tagalog words in Tagalog language mode', () => {
    expect(lexicon.hasWord('BAYANI', 'TAGALOG')).toBe(true);
    expect(lexicon.hasWord('SALAMAT', 'TAGALOG')).toBe(true);
    expect(lexicon.hasWord('PAGIBIG', 'TAGALOG')).toBe(true);
    expect(lexicon.hasWord('KAPATID', 'TAGALOG')).toBe(true);

    const history = new Set(['ARAW']);
    const move = lexicon.validateMove('WIKA', 'W', history, 'TAGALOG');
    expect(move.isValid).toBe(true);
    expect(move.normalizedWord).toBe('WIKA');
  });

  it('should accept Bisaya words in Bisaya language mode', () => {
    expect(lexicon.hasWord('SUGBO', 'BISAYA')).toBe(true);
    expect(lexicon.hasWord('DAGHAN', 'BISAYA')).toBe(true);
    expect(lexicon.hasWord('GUGMA', 'BISAYA')).toBe(true);
    expect(lexicon.hasWord('IGSOON', 'BISAYA')).toBe(true);

    const history = new Set(['BALAY']);
    const move = lexicon.validateMove('YUTA', 'Y', history, 'BISAYA');
    expect(move.isValid).toBe(true);
    expect(move.normalizedWord).toBe('YUTA');
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
