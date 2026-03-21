export interface Entry {
  id: string;
  level: number;
  questionJp: string;
  questionEn: string;
  questionRomaji: string;
  correctAnswerJp: string;
  correctAnswerEn: string;
  correctAnswerRomaji: string;
  wrongAnswersJp: string[];
  wrongAnswersEn: string[];
  wrongAnswersRomaji: string[];
  questionImage: string;
}
