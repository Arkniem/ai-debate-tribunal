export enum Debater {
  Alpha = 'Counselor Alpha',
  Beta = 'Counselor Beta',
}

export interface Message {
  author: Debater;
  text: string;
}