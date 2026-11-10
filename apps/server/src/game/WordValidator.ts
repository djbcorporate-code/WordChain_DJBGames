import { LexiconService } from '@wordchain/lexicon';
import { WordRejectionReason } from '@wordchain/shared';

export interface ValidationResult {
  isValid: boolean;
  reason?: WordRejectionReason;
  normalizedWord?: string;
  nextLetter?: string;
  isLetterExhausted?: boolean;
  replacementLetter?: string;
}

export class WordValidator {
  private lexicon: LexiconService;

  constructor() {
    this.lexicon = LexiconService.getInstance();
  }

  public validateSubmission(
    rawWord: string,
    requiredLetter: string,
    historyWords: Set<string>,
    nextRoundNumber: number = 1
  ): ValidationResult {
    const trimmed = rawWord.trim().toUpperCase();
    const expectedPrefix = requiredLetter.trim().toUpperCase();

    // Suffix-only candidate assembly: candidate word is strictly expectedPrefix + typed suffix.
    const candidateWord = `${expectedPrefix}${trimmed}`;

    // Perform Lexicon and Rule Validation
    const moveValidation = this.lexicon.validateMove(candidateWord, expectedPrefix, historyWords);
    if (!moveValidation.isValid) {
      return {
        isValid: false,
        reason: moveValidation.reason,
        normalizedWord: candidateWord,
      };
    }

    const acceptedWord = moveValidation.normalizedWord;
    const prefixLength = nextRoundNumber >= 20 ? 2 : 1;
    const trailingPrefix = acceptedWord.slice(-prefixLength);

    // Check if the trailing prefix has available moves left in the dictionary
    const remainingCount = this.lexicon.getRemainingWordsCount(trailingPrefix, historyWords);
    if (remainingCount === 0) {
      // Prefix is exhausted! Pick an alternative fallback prefix
      const replacementPrefix = this.lexicon.getFallbackPrefix(historyWords, prefixLength);
      return {
        isValid: true,
        normalizedWord: acceptedWord,
        nextLetter: replacementPrefix,
        isLetterExhausted: true,
        replacementLetter: replacementPrefix,
      };
    }

    return {
      isValid: true,
      normalizedWord: acceptedWord,
      nextLetter: trailingPrefix,
      isLetterExhausted: false,
    };
  }

  public getRandomSeedWord(): string {
    return this.lexicon.getRandomSeedWord();
  }
}
