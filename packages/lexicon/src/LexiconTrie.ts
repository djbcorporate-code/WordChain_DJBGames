export class TrieNode {
  public children: Map<string, TrieNode> = new Map();
  public isEndOfWord: boolean = false;
  public wordsCount: number = 0; // Number of words in this subtree
}

export class LexiconTrie {
  private root: TrieNode = new TrieNode();

  public insert(word: string): void {
    const normalized = word.trim().toUpperCase();
    if (!normalized) return;

    let current = this.root;
    current.wordsCount++;

    for (let i = 0; i < normalized.length; i++) {
      const char = normalized[i];
      let child = current.children.get(char);
      if (!child) {
        child = new TrieNode();
        current.children.set(char, child);
      }
      current = child;
      current.wordsCount++;
    }

    current.isEndOfWord = true;
  }

  public hasWord(word: string): boolean {
    const normalized = word.trim().toUpperCase();
    if (!normalized) return false;

    let current = this.root;
    for (let i = 0; i < normalized.length; i++) {
      const child = current.children.get(normalized[i]);
      if (!child) return false;
      current = child;
    }

    return current.isEndOfWord;
  }

  public hasPrefix(prefix: string): boolean {
    const normalized = prefix.trim().toUpperCase();
    if (!normalized) return true;

    let current = this.root;
    for (let i = 0; i < normalized.length; i++) {
      const child = current.children.get(normalized[i]);
      if (!child) return false;
      current = child;
    }

    return true;
  }

  public countWordsWithPrefix(prefix: string): number {
    const normalized = prefix.trim().toUpperCase();
    if (!normalized) return this.root.wordsCount;

    let current = this.root;
    for (let i = 0; i < normalized.length; i++) {
      const child = current.children.get(normalized[i]);
      if (!child) return 0;
      current = child;
    }

    return current.wordsCount;
  }

  public getWordsWithPrefix(prefix: string, maxResults: number = 50): string[] {
    const normalized = prefix.trim().toUpperCase();
    let current = this.root;

    for (let i = 0; i < normalized.length; i++) {
      const child = current.children.get(normalized[i]);
      if (!child) return [];
      current = child;
    }

    const results: string[] = [];
    this.collectWords(current, normalized, results, maxResults);
    return results;
  }

  private collectWords(node: TrieNode, currentPrefix: string, results: string[], maxResults: number): void {
    if (results.length >= maxResults) return;

    if (node.isEndOfWord) {
      results.push(currentPrefix);
    }

    for (const [char, child] of node.children.entries()) {
      this.collectWords(child, currentPrefix + char, results, maxResults);
      if (results.length >= maxResults) break;
    }
  }

  public size(): number {
    return this.root.wordsCount;
  }
}
