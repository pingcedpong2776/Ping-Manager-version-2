
import { PlayStyle, Player, Competition, PlayerCategory } from './types';

export const PLAYER_NAMES_MEN = [
  'Lucas Martin', 'Thomas Bernard', 'Hugo Petit', 'Enzo Robert', 'Leo Richard',
  'Louis Durand', 'Arthur Dubois', 'Mathis Moreau', 'Nathan Laurent', 'Gabriel Simon',
  'Jean Dupont', 'Michel Roux', 'Philippe Morel', 'Alain Lambert', 'Pierre Garcia',
  'Kylian Mbappé', 'Teddy Riner', 'Victor Wembanyama', 'Antoine Dupont', 'Leon Marchand'
];

export const PLAYER_NAMES_WOMEN = [
  'Emma Leroy', 'Léa Moreau', 'Chloé Petit', 'Manon Bernard', 'Inès Martin',
  'Camille Roux', 'Sarah Simon', 'Clara Dubois', 'Louise Laurent', 'Zoé Richard',
  'Marie Curie', 'Sophie Germain', 'Julie Durand', 'Alice Morel', 'Lucie Petit',
  'Caroline Garcia', 'Clarisse Agbegnenou', 'Pauline Ferrand-Prévot', 'Amélie Mauresmo'
];

export const OFFICIAL_DIVISIONS = [
  'Pro A', 'Pro B', 
  'Nationale 1', 'Nationale 2', 'Nationale 3', 
  'Pré-Nationale', 
  'Régionale 1', 'Régionale 2', 'Régionale 3', 'Régionale 4',
  'Départementale 1', 'Départementale 2', 'Départementale 3', 'Départementale 4'
];

export const DIVISION_SCALING: Record<string, number> = {
  'Pro A': 3200, 'Pro B': 2800,
  'Nationale 1': 2500, 'Nationale 2': 2200, 'Nationale 3': 2000,
  'Pré-Nationale': 1800,
  'Régionale 1': 1600, 'Régionale 2': 1400, 'Régionale 3': 1200, 'Régionale 4': 1000,
  'Départementale 1': 900, 'Départementale 2': 750, 'Départementale 3': 600, 'Départementale 4': 500
};

export const PRESTIGE_CLUBS = [
    { name: "Borussia Düsseldorf", country: "Allemagne", level: 3300 },
    { name: "Fakel Gazprom Orenburg", country: "Russie", level: 3400 },
    { name: "AS Pontoise-Cergy", country: "France", level: 3100 },
    { name: "GV Hennebont", country: "France", level: 3000 },
    { name: "FC Saarbrücken", country: "Allemagne", level: 3200 },
    { name: "Ochsenhausen", country: "Allemagne", level: 3100 },
    { name: "Kinoshita Meister Tokyo", country: "Japon", level: 3500 },
    { name: "Shandong Luneng", country: "Chine", level: 3800 },
    { name: "TTC Neu-Ulm", country: "Allemagne", level: 3300 },
    { name: "Sporting CP", country: "Portugal", level: 2900 },
    { name: "Eslövs AI", country: "Suède", level: 2800 },
    { name: "Bogoria Grodzisk", country: "Pologne", level: 2800 }
];

export const getCategoryFromAge = (age: number): PlayerCategory => {
  if (age < 9) return 'Poussin';
  if (age < 11) return 'Benjamin';
  if (age < 14) return 'Minime';
  if (age < 16) return 'Cadet';
  if (age < 19) return 'Junior';
  if (age < 40) return 'Senior';
  return 'Vétéran';
};

export const calculatePointsFromStats = (stats: Player['stats']): number => {
  const { attack, defense, speed, mental, technique, tactical } = stats;
  return Math.round(500 + (attack * 3.5) + (defense * 3) + (speed * 3) + (mental * 4) + (technique * 3.5) + (tactical * 3));
};

export const generateRandomPlayer = (id: string, targetPoints: number = 800, forceAge?: number): Player => {
  const styles = Object.values(PlayStyle);
  const gender = Math.random() > 0.5 ? 'M' : 'F';
  const namePool = gender === 'M' ? PLAYER_NAMES_MEN : PLAYER_NAMES_WOMEN;
  const photoId = Math.floor(Math.random() * 99);
  
  const baseStat = Math.min(95, Math.max(10, (targetPoints - 200) / 25));
  const variance = () => Math.floor(Math.random() * 20 - 10);

  const stats = {
    attack: Math.min(99, Math.max(10, baseStat + variance())),
    defense: Math.min(99, Math.max(10, baseStat + variance())),
    speed: Math.min(99, Math.max(10, baseStat + variance())),
    mental: Math.min(99, Math.max(10, baseStat + variance())),
    stamina: 60 + Math.floor(Math.random() * 40),
    technique: Math.min(99, Math.max(10, baseStat + variance())),
    tactical: Math.min(99, Math.max(10, baseStat + variance())),
  };

  const points = targetPoints + Math.floor(Math.random() * 60 - 30);
  // Age : Soit forcé, soit aléatoire (6 à 51 ans)
  const age = forceAge !== undefined ? forceAge : (6 + Math.floor(Math.random() * 45)); 

  // LOGIQUE PHOTO: < 18 ans = Avatar "Jeune" (DiceBear), >= 18 ans = Photo Réaliste (RandomUser)
  let photoUrl = '';
  if (age < 18) {
      const seed = Math.random().toString(36).substring(7);
      // Avatar style 'Micah' pour les jeunes (aspect cartoon/dessin)
      photoUrl = `https://api.dicebear.com/7.x/micah/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffdfbf`;
  } else {
      // Photo réaliste pour les adultes
      photoUrl = gender === 'M' 
      ? `https://randomuser.me/api/portraits/men/${photoId}.jpg` 
      : `https://randomuser.me/api/portraits/women/${photoId}.jpg`;
  }

  return {
    id,
    name: namePool[Math.floor(Math.random() * namePool.length)],
    gender,
    photoUrl,
    points: Math.max(500, Math.round(points)),
    age: age,
    category: getCategoryFromAge(age),
    handed: Math.random() > 0.8 ? 'Left' : 'Right',
    style: styles[Math.floor(Math.random() * styles.length)],
    stats,
    fatigue: 0,
    condition: 100,
    injuryStatus: 'HEALTHY',
    injuryDuration: 0,
    experience: 0,
    careerStats: {
      wins: 0,
      losses: 0,
      setsWon: 0,
      setsLost: 0,
      bestPerf: 0
    }
  };
};

export const REAL_COMPETITIONS: Competition[] = [
  // --- CHAMPIONNAT DE FRANCE SENIORS & VETERANS ---
  {
    id: 'champ-france-seniors',
    name: 'Championnat de France Seniors',
    type: 'INDIVIDUEL',
    level: 'National',
    description: 'Le titre suprême individuel. Les 64 meilleurs joueurs français s\'affrontent.',
    status: 'Fermé',
    date: 'Mars',
    minPoints: 1800,
    teamSize: 1,
    registeredPlayerIds: []
  },
  {
    id: 'champ-france-veterans',
    name: 'Championnat de France Vétérans',
    type: 'INDIVIDUEL',
    level: 'National',
    description: 'Réservé aux plus de 40 ans. L\'expérience et la tactique priment.',
    status: 'Fermé',
    date: 'Mai',
    minAge: 40,
    teamSize: 1,
    registeredPlayerIds: []
  },

  // --- CHAMPIONNAT JEUNES PAR ÉQUIPES (Formule Coupe Davis - 5 Tours + Finale) ---
  {
    id: 'champ-jeunes-t1',
    name: 'Champ. Jeunes - Tour 1',
    type: 'CHAMPIONNAT',
    level: 'Jeunes',
    description: '1er tour de brassage. Formule Coupe Davis (2 Joueurs).',
    status: 'Ouvert',
    date: 'Octobre',
    maxAge: 17,
    teamSize: 2,
    registeredPlayerIds: []
  },
  {
    id: 'champ-jeunes-t2',
    name: 'Champ. Jeunes - Tour 2',
    type: 'CHAMPIONNAT',
    level: 'Jeunes',
    description: 'Montée/Descente effective. (2 Joueurs)',
    status: 'Fermé',
    date: 'Novembre',
    maxAge: 17,
    teamSize: 2,
    registeredPlayerIds: []
  },
  {
    id: 'champ-jeunes-t3',
    name: 'Champ. Jeunes - Tour 3',
    type: 'CHAMPIONNAT',
    level: 'Jeunes',
    description: 'Mi-saison jeune. (2 Joueurs)',
    status: 'Fermé',
    date: 'Janvier',
    maxAge: 17,
    teamSize: 2,
    registeredPlayerIds: []
  },
  {
    id: 'champ-jeunes-t4',
    name: 'Champ. Jeunes - Tour 4',
    type: 'CHAMPIONNAT',
    level: 'Jeunes',
    description: 'Phase décisive. (2 Joueurs)',
    status: 'Fermé',
    date: 'Mars',
    maxAge: 17,
    teamSize: 2,
    registeredPlayerIds: []
  },
  {
    id: 'champ-jeunes-t5',
    name: 'Champ. Jeunes - Tour 5',
    type: 'CHAMPIONNAT',
    level: 'Jeunes',
    description: 'Dernier tour de poule. (2 Joueurs)',
    status: 'Fermé',
    date: 'Avril',
    maxAge: 17,
    teamSize: 2,
    registeredPlayerIds: []
  },
  {
    id: 'champ-jeunes-finales',
    name: 'Champ. Jeunes - Finales par Titres',
    type: 'CHAMPIONNAT',
    level: 'Jeunes',
    description: 'Les meilleures équipes de chaque niveau s\'affrontent pour le titre.',
    status: 'Fermé',
    date: 'Mai',
    maxAge: 17,
    teamSize: 2,
    registeredPlayerIds: []
  },

  // --- FILIÈRE DÉTECTION (Qualificative) ---
  {
    id: 'top-detection-dep',
    name: 'Top Détection Départemental',
    type: 'INDIVIDUEL',
    level: 'Jeunes',
    description: 'Regroupement des meilleurs espoirs du département. Qualificatif Région.',
    status: 'Fermé',
    date: 'Novembre',
    maxAge: 11,
    teamSize: 1,
    registeredPlayerIds: []
  },
  {
    id: 'top-detection-reg',
    name: 'Top Détection Régional',
    type: 'INDIVIDUEL',
    level: 'Régional',
    description: 'L\'élite régionale des -11 ans. Qualificatif National.',
    status: 'Fermé',
    date: 'Février',
    maxAge: 11,
    teamSize: 1,
    registeredPlayerIds: []
  },
  {
    id: 'top-detection-nat',
    name: 'Top Détection National',
    type: 'INDIVIDUEL',
    level: 'National',
    description: 'Le sommet national pour les détectés.',
    status: 'Fermé',
    date: 'Avril',
    maxAge: 11,
    teamSize: 1,
    registeredPlayerIds: []
  },

  // --- CHALLENGE 500-599 PTS (5 Tours) ---
  {
    id: 'challenge-500-t1',
    name: 'Challenge 500 - Tour 1',
    type: 'TOURNOI',
    level: 'Départemental',
    description: 'Réservé 500-599 pts. Tour Automne.',
    status: 'Fermé',
    date: 'Novembre',
    maxPoints: 599,
    maxAge: 18,
    teamSize: 1,
    registeredPlayerIds: []
  },
  {
    id: 'challenge-500-t2',
    name: 'Challenge 500 - Tour 2',
    type: 'TOURNOI',
    level: 'Départemental',
    description: 'Réservé 500-599 pts. Tour Hiver.',
    status: 'Fermé',
    date: 'Janvier',
    maxPoints: 599,
    maxAge: 18,
    teamSize: 1,
    registeredPlayerIds: []
  },
  {
    id: 'challenge-500-t3',
    name: 'Challenge 500 - Tour 3',
    type: 'TOURNOI',
    level: 'Départemental',
    description: 'Réservé 500-599 pts. Tour Printemps.',
    status: 'Fermé',
    date: 'Mars',
    maxPoints: 599,
    maxAge: 18,
    teamSize: 1,
    registeredPlayerIds: []
  },
  {
    id: 'challenge-500-t4',
    name: 'Challenge 500 - Tour 4',
    type: 'TOURNOI',
    level: 'Départemental',
    description: 'Réservé 500-599 pts. Avant-Dernier tour.',
    status: 'Fermé',
    date: 'Mai',
    maxPoints: 599,
    maxAge: 18,
    teamSize: 1,
    registeredPlayerIds: []
  },
  {
    id: 'challenge-500-final',
    name: 'Challenge 500 - Finale',
    type: 'TOURNOI',
    level: 'Départemental',
    description: 'Réservé 500-599 pts. Finale saison.',
    status: 'Fermé',
    date: 'Juin',
    maxPoints: 599,
    maxAge: 18,
    teamSize: 1,
    registeredPlayerIds: []
  },

  // --- FINALES PAR CLASSEMENT (Tableaux Intégraux) ---
  {
    id: 'finales-rank-dep',
    name: 'Finales par Classement - Départ.',
    type: 'INDIVIDUEL',
    level: 'Départemental',
    description: 'Le championnat individuel par tranche de points. Qualificatif Région.',
    status: 'Fermé',
    date: 'Février',
    teamSize: 1,
    registeredPlayerIds: []
  },
  {
    id: 'finales-rank-reg',
    name: 'Finales par Classement - Région',
    type: 'INDIVIDUEL',
    level: 'Régional',
    description: 'Les meilleurs de la région. Qualificatif France.',
    status: 'Fermé',
    date: 'Avril',
    teamSize: 1,
    registeredPlayerIds: []
  },
  {
    id: 'finales-rank-nat',
    name: 'Finales par Classement - France',
    type: 'INDIVIDUEL',
    level: 'National',
    description: 'Titre de Champion de France par classement.',
    status: 'Fermé',
    date: 'Juin',
    teamSize: 1,
    registeredPlayerIds: []
  },

  // --- TOURNOIS DIVERS ---
  {
    id: 'tournoi-dep-automne',
    name: 'Tournoi Dép. d\'Automne',
    type: 'TOURNOI',
    level: 'Départemental',
    description: 'Tournoi de rentrée, niveau modeste.',
    status: 'Ouvert',
    date: 'Octobre',
    maxPoints: 1200,
    teamSize: 1,
    registeredPlayerIds: []
  },
  {
    id: 'tournoi-reg-hiver',
    name: 'Open Régional d\'Hiver',
    type: 'TOURNOI',
    level: 'Régional',
    description: 'Gros tournoi régional homologué.',
    status: 'Fermé',
    date: 'Janvier',
    minPoints: 800,
    teamSize: 1,
    registeredPlayerIds: []
  },
  {
    id: 'tournoi-nat-printemps',
    name: 'Grand Prix National',
    type: 'TOURNOI',
    level: 'National',
    description: 'Tournoi national de haut niveau.',
    status: 'Fermé',
    date: 'Avril',
    minPoints: 1500,
    teamSize: 1,
    registeredPlayerIds: []
  },
  {
    id: 'premier-pas-pongiste',
    name: 'Premier Pas Pongiste',
    type: 'TOURNOI',
    level: 'Jeunes',
    description: 'Découverte pour les tout-petits (-11 ans).',
    status: 'Fermé',
    date: 'Octobre',
    maxAge: 11,
    teamSize: 1,
    registeredPlayerIds: []
  },
  {
    id: 'coupe-france-dep',
    name: 'Coupe de France (Départementale)',
    type: 'COUPE',
    level: 'Départemental',
    description: 'Formule Coupe Davis : 2 joueurs.',
    status: 'Fermé',
    date: 'Décembre',
    maxPoints: 1300, 
    teamSize: 2,
    registeredPlayerIds: []
  },
  {
    id: 'tournoi-national-rentree',
    name: 'Tournoi National de Rentrée',
    type: 'TOURNOI',
    level: 'National',
    description: 'Tableaux toutes séries. Le gratin national.',
    status: 'Ouvert',
    date: 'Septembre',
    minPoints: 1200,
    teamSize: 1,
    registeredPlayerIds: []
  },
  {
    id: 'euro-mini-champs',
    name: 'Euro Mini Champ\'s',
    type: 'TOURNOI',
    level: 'National',
    description: 'Le plus grand tournoi européen -13 ans.',
    status: 'Fermé',
    date: 'Août',
    maxAge: 13,
    minPoints: 800,
    teamSize: 1,
    registeredPlayerIds: []
  },
  {
    id: 'champ-france-jeunes',
    name: 'Championnat de France Jeunes',
    type: 'INDIVIDUEL',
    level: 'National',
    description: 'Le sommet pour les jeunes. Qualification requise.',
    status: 'Fermé',
    date: 'Mai',
    minPoints: 1200,
    maxAge: 18,
    teamSize: 1,
    registeredPlayerIds: []
  },
  {
    id: 'coupe-veterans',
    name: 'Coupe Nationale Vétérans',
    type: 'COUPE',
    level: 'National',
    description: 'Championnat réservé aux plus de 40 ans.',
    status: 'Fermé',
    date: 'Avril',
    minAge: 40,
    teamSize: 1,
    registeredPlayerIds: []
  },

  // --- CRITERIUM FEDERAL (Individuel, Classement Intégral) ---
  {
    id: 'crit-fed-t1',
    name: 'Critérium Fédéral - Tour 1',
    type: 'INDIVIDUEL',
    level: 'National',
    description: 'Le championnat individuel de référence (Classement intégral).',
    status: 'Fermé',
    date: 'Octobre',
    teamSize: 1,
    registeredPlayerIds: []
  },
  {
    id: 'crit-fed-t2',
    name: 'Critérium Fédéral - Tour 2',
    type: 'INDIVIDUEL',
    level: 'National',
    description: 'Deuxième tour (Classement intégral).',
    status: 'Fermé',
    date: 'Décembre',
    teamSize: 1,
    registeredPlayerIds: []
  },
  {
    id: 'crit-fed-t3',
    name: 'Critérium Fédéral - Tour 3',
    type: 'INDIVIDUEL',
    level: 'National',
    description: 'Troisième tour (Classement intégral).',
    status: 'Fermé',
    date: 'Février',
    teamSize: 1,
    registeredPlayerIds: []
  },
  {
    id: 'crit-fed-t4',
    name: 'Critérium Fédéral - Tour 4',
    type: 'INDIVIDUEL',
    level: 'National',
    description: 'Dernier tour du critérium (Classement intégral).',
    status: 'Fermé',
    date: 'Avril',
    teamSize: 1,
    registeredPlayerIds: []
  }
];
