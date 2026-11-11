export class TrieNode {
  public children: Map<string, TrieNode> = new Map();
  public isEndOfWord: boolean = false;
  public wordsCount: number = 0;
}

/**
 * High-performance, memory-efficient prefix index.
 * Stores words in compact bucketed arrays by starting character to minimize V8 object overhead
 * and guarantee low memory usage on cloud container runtimes (e.g. Render 512MB RAM).
 */
export class LexiconTrie {
  private wordSet: Set<string> = new Set();
  private buckets: Map<string, string[]> = new Map();

  public insert(word: string): void {
    const normalized = word.trim().toUpperCase();
    if (!normalized || this.wordSet.has(normalized)) return;

    this.wordSet.add(normalized);
    const firstLetter = normalized[0];
    let bucket = this.buckets.get(firstLetter);
    if (!bucket) {
      bucket = [];
      this.buckets.set(firstLetter, bucket);
    }
    bucket.push(normalized);
  }

  public hasWord(word: string): boolean {
    const normalized = word.trim().toUpperCase();
    return normalized ? this.wordSet.has(normalized) : false;
  }

  public hasPrefix(prefix: string): boolean {
    const normalized = prefix.trim().toUpperCase();
    if (!normalized) return true;
    const bucket = this.buckets.get(normalized[0]);
    if (!bucket) return false;
    for (let i = 0; i < bucket.length; i++) {
      if (bucket[i].startsWith(normalized)) return true;
    }
    return false;
  }

  public countWordsWithPrefix(prefix: string): number {
    const normalized = prefix.trim().toUpperCase();
    if (!normalized) return this.wordSet.size;
    const bucket = this.buckets.get(normalized[0]);
    if (!bucket) return 0;
    let count = 0;
    for (let i = 0; i < bucket.length; i++) {
      if (bucket[i].startsWith(normalized)) count++;
    }
    return count;
  }

  public getWordsWithPrefix(prefix: string, maxResults: number = 50): string[] {
    const normalized = prefix.trim().toUpperCase();
    const results: string[] = [];
    if (!normalized) {
      for (const w of this.wordSet) {
        results.push(w);
        if (results.length >= maxResults) break;
      }
      return results;
    }
    const bucket = this.buckets.get(normalized[0]);
    if (!bucket) return [];
    for (let i = 0; i < bucket.length; i++) {
      if (bucket[i].startsWith(normalized)) {
        results.push(bucket[i]);
        if (results.length >= maxResults) break;
      }
    }
    return results;
  }

  public size(): number {
    return this.wordSet.size;
  }
}
