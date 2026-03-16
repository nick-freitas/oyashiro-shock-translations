export interface TranslatedText {
  ja: string;
  en: string;
}

export interface Question {
  id: number;
  filename: string;
  question: TranslatedText;
  options: [TranslatedText, TranslatedText, TranslatedText, TranslatedText];
  correctOption?: number;
}

export interface CardProgress {
  bucket: number;
  nextDue: string | null;
  lastReviewed: string | null;
}

export interface StudyProgress {
  cards: Record<string, CardProgress>;
}
