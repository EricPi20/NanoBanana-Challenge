export type RoundType = 'easy' | 'medium' | 'hard';

export type GamePhase = 
  | 'lobby' 
  | 'selecting_players' 
  | 'creating' 
  | 'voting' 
  | 'results' 
  | 'game_over';

export interface Player {
  id: string;
  name: string;
  icon: string;
  score: number;
  joinedAt: number;
}

export interface Submission {
  id: string;
  playerId: string;
  imageUrl: string;
  uploadedAt: number;
  votes: string[]; // array of voter player IDs
}

export interface GameState {
  adminId: string | null;
  phase: GamePhase;
  currentRound: RoundType | null;
  roundNumber: number;
  selectedPlayers: string[]; // IDs of 2 competing players
  timerStartedAt: number | null;
  timerDuration: number; // 180 seconds = 3 minutes
  submissions: { [playerId: string]: Submission };
  players: { [playerId: string]: Player };
  roundWinners: string[]; // IDs of players who advanced
  easyRoundPlayers: string[]; // IDs of players who have played in easy round
  currentCategoryImageDescr: string | null; // Image description from CSV for current round
}

export const ICONS = [
  '🍌', '🎨', '🎭', '🎪', '🎯', '🎲', '🎸', '🎹',
  '🎺', '🎻', '🎮', '🎰', '🚀', '🌟', '⭐', '✨',
  '🔥', '💎', '👑', '🏆', '🎖️', '🏅', '🎃', '🦄',
];

