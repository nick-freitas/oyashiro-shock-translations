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
