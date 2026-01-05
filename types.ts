
export enum PlayStyle {
  Attacker = 'Attaquant Topspin',
  Blocker = 'Bloqueur',
  Defender = 'Défenseur Classique',
  ModernDef = 'Défenseur Moderne',
  Crabe = 'Crabe (Picots)',
  Pivot = 'Attaquant Pivot',
  Allround = 'Complet (Allround)',
  Hitter = 'Frappeur'
}

export type PlayerCategory = 'Poussin' | 'Benjamin' | 'Minime' | 'Cadet' | 'Junior' | 'Senior' | 'Vétéran';

export interface Player {
  id: string;
  name: string;
  photoUrl: string;
  gender: 'M' | 'F';
  points: number;
  age: number;
  category: PlayerCategory;
  handed: 'Right' | 'Left';
  style: PlayStyle;
  stats: {
    attack: number;
    defense: number;
    speed: number;
    mental: number;
    stamina: number;
    technique: number;
    tactical: number;
  };
  fatigue: number;
  condition?: number; // Forme du jour (0-100), calculé au moment du match
  injuryStatus?: 'HEALTHY' | 'LIGHT' | 'SERIOUS';
  injuryDuration?: number; // Nombre de journées d'indisponibilité restantes
  experience: number;
  careerStats: {
    wins: number;
    losses: number;
    setsWon: number;
    setsLost: number;
    bestPerf: number;
  };
  isTransferListed?: boolean;
  marketValue?: number;
}

export interface SeasonArchive {
  seasonId: number;
  yearLabel: string; // "2025/2026"
  finalBudget: number;
  teamResults: {
    teamNumber: number;
    division: string;
    rank: number;
    wins: number;
    losses: number;
  }[];
  topScorerName: string;
  topScorerPoints: number;
  trophies: string[]; // Liste des titres gagnés cette saison (ex: "Champion D1", "Coupe Vétérans")
}

export interface Club {
  id: string;
  name: string;
  city: string;
  managerName: string;
  primaryColor: string;
  secondaryColor: string;
  players: Player[];
  budget: number;
  teamCount: number;
  teamDivisions: Record<number, string>;
  aiStrategy?: 'MANUAL' | 'STRATEGIC';
  history: SeasonArchive[];
}

export interface TransferOffer {
  id: string;
  playerId: string;
  playerName: string;
  offeringClubName: string;
  amount: number;
}

export interface MatchSet {
  scoreA: number;
  scoreB: number;
}

export type PointType = 'ACE' | 'WINNER' | 'UNFORCED_ERROR' | 'FORCED_ERROR' | 'LUCKY';

export interface PointResult {
    winner: 'A' | 'B';
    type: PointType;
    description: string;
}

export interface Match {
  playerAId: string;
  playerBId: string;
  sets: MatchSet[];
  winnerId?: string;
  pointCalculation?: { gain: number; loss: number }; // Gain pour le vainqueur, Perte (négative) pour le perdant
  events?: string[]; // Journaux d'événements (blessure, temps mort...)
  injuredPlayerIds?: string[]; // Liste des IDs des joueurs blessés durant ce match
  // Simulation détaillée (optionnel pour stockage, mais utile pour le live)
  detailedLog?: PointResult[]; 
}

export interface Meeting {
  id: string;
  date: string;
  teamNumber: number;
  competitionName?: string;
  divisionName?: string;
  homeClubName: string;
  awayClubName: string;
  homePlayers: string[];
  awayPlayers: string[];
  matches: Match[];
  homeScore: number;
  awayScore: number;
  isCompleted: boolean;
  phaseId: number; // 1 ou 2
  type?: 'LEAGUE' | 'FRIENDLY' | 'CUP'; // Distinction du type de match
  dayNumber?: number; // Numéro de la journée (1 à 7) pour le calendrier
  friendlyData?: { advPlayers: Player[] }; // Données spécifiques aux amicaux (joueurs générés)
  cachedPlayers?: Player[]; // Stockage des joueurs pour les matchs simulés (IA vs IA)
}

export interface RankingEntry {
  clubName: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  matchesWon: number;
  matchesLost: number;
}

export interface CompetitionResult {
  playerId: string;
  playerName: string;
  playerPoints: number; // Points au moment de la compète
  rank: string; // "Vainqueur", "1/4 Finale", "Poule"
  exactRank?: number; // 1 pour 1er, 16 pour 16ème...
  partnerName?: string; // Pour les compétitions par équipes/double
  divisionLevel?: string; // "N2", "R1", "D1" pour le critérium
  isPromoted?: boolean;
  isRelegated?: boolean;
  isQualified?: boolean;
  // Stats ajoutées pour l'évolution
  pointChange: number;
  matchesPlayed: number;
  wins: number;
  losses: number;
}

export interface Competition {
  id: string;
  name: string;
  type: 'CHAMPIONNAT' | 'INDIVIDUEL' | 'COUPE' | 'TOURNOI';
  level: 'Départemental' | 'Régional' | 'National' | 'Jeunes';
  description: string;
  status: 'Ouvert' | 'Fermé' | 'En cours' | 'Terminé';
  date: string;
  minPoints?: number;
  maxPoints?: number;
  minAge?: number;
  maxAge?: number;
  teamSize?: number; // 1 pour indiv, 2 pour coupe, 4 pour champ
  registeredPlayerIds: string[];
  results?: CompetitionResult[];
}
