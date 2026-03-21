export interface Entry {
  id: string;
  level: number;
  questionJp: string;
  questionEn: string;
  correctAnswerJp: string;
  correctAnswerEn: string;
  wrongAnswersJp: string[];
  wrongAnswersEn: string[];
  questionImage: string;
}
