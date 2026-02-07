export type RoundPhase =
  | "INIT"
  | "SUBMISSION"
  | "GENERATION"
  | "SELECTION"
  | "REVEAL"
  | "SCORING";

export interface Submission {
  submissionId: string;
  playerId: string;
  text: string;
}

export interface ImageVariant {
  variantId: string;
  submissionId: string;
  imageUrl: string;
  isSelected: boolean;
}

export interface Vote {
  voterId: string;
  submissionId: string;
}

export interface RoundState {
  roundId: string;
  gameId: string;
  phase: RoundPhase;
  basePrompt: string;
  styleModifier: string;
  submissions: Submission[];
  variants: ImageVariant[];
  votes: Vote[];
}
