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
    historyWords: Set<string>
  ): ValidationResult {
    const trimmed = rawWord.trim().toUpperCase();

    // Perform Lexicon and Rule Validation
    const moveValidation = this.lexicon.validateMove(trimmed, requiredLetter, historyWords);
    if (!moveValidation.isValid) {
      return {
        isValid: false,
        reason: moveValidation.reason,
      };
    }

    const acceptedWord = moveValidation.normalizedWord;
    const trailingLetter = acceptedWord.slice(-1);

    // Check if the trailing letter has available moves left in the dictionary
    const remainingCount = this.lexicon.getRemainingWordsCount(trailingLetter, historyWords);
    if (remainingCount === 0) {
      // Letter is exhausted! Pick an alternative high-frequency letter
      const replacementLetter = this.lexicon.getFallbackLetter(historyWords);
      return {
        isValid: true,
        normalizedWord: acceptedWord,
        nextLetter: replacementLetter,
        isLetterExhausted: true,
        replacementLetter,
      };
    }

    return {
      isValid: true,
      normalizedWord: acceptedWord,
      nextLetter: trailingLetter,
      isLetterExhausted: false,
    };
  }

  public getRandomSeedWord(): string {
    return this.lexicon.getRandomSeedWord();
  }
}
