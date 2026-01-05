
import React, { useState } from 'react';
import { Player, Club, Meeting } from '../types';
import { generateRandomPlayer, DIVISION_SCALING } from '../constants';

interface ManualMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  club: Club;
  adversaries: Club[];
  currentPhase: number;
  onCreate: (meeting: Meeting) => void;
}

const REGIONS = [
    { id: 'FR', label: 'France (Local)', levels: ['Départemental', 'Régional', 'National', 'Pro'] },
    { id: 'EU', label: 'Europe (Continental)', levels: ['Inter-Régional', 'National', 'Elite'] },
    { id: 'AS', label: 'Asie (Ping Power)', levels: ['National', 'Elite', 'World Class'] },
    { id: 'WO', label: 'Reste du Monde', levels: ['National', 'Elite'] }
];

const ManualMeetingModal: React.FC<ManualMeetingModalProps> = ({ isOpen, onClose, club, adversaries, currentPhase, onCreate }) => {
  const [matchType, setMatchType] = useState<'LEAGUE' | 'FRIENDLY'>('LEAGUE');
  const [teamNumber, setTeamNumber] = useState(1);
  
  // League Inputs
  const [selectedAdversaryId, setSelectedAdversaryId] = useState(adversaries[0]?.id || '');
  
  // Friendly Inputs
  const [selectedRegion, setSelectedRegion] = useState('FR');
  const [selectedLevel, setSelectedLevel] = useState('Régional');
  const [customClubName, setCustomClubName] = useState(''); // Nom optionnel

  const [selectedHomePlayerIds, setSelectedHomePlayerIds] = useState<string[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  if (!isOpen) return null;

  const togglePlayer = (id: string) => {
    if (selectedHomePlayerIds.includes(id)) {
      setSelectedHomePlayerIds(prev => prev.filter(pid => pid !== id));
    } else {
      if (selectedHomePlayerIds.length < 4) {
        setSelectedHomePlayerIds(prev => [...prev, id]);
      }
    }
  };

  const getPointsForLevel = (region: string, level: string): number => {
      let base = 800;
      if (level === 'Départemental') base = 800;
      if (level === 'Régional') base = 1400;
      if (level === 'Inter-Régional') base = 1800;
      if (level === 'National') base = 2200;
      if (level === 'Elite' || level === 'Pro') base = 2800;
      if (level === 'World Class') base = 3200;

      // Bonus Asie
      if (region === 'AS') base += 200;
      
      return base;
  };

  const generateClubName = (region: string, level: string) => {
      if (customClubName) return customClubName;
      if (region === 'FR') return `AS ${level} ${Math.floor(Math.random() * 100)}`;
      if (region === 'EU') return `TTC ${level} Euro`;
      if (region === 'AS') return `Dragon ${level} Ping`;
      return `World ${level} TT`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedHomePlayerIds.length !== 4) return;

    let advName = '';
    let advPlayers: Player[] = [];
    let divisionName = '';
    let competitionName = '';

    if (matchType === 'LEAGUE') {
        const adversary = adversaries.find(a => a.id === selectedAdversaryId);
        if (!adversary) return;
        advName = adversary.name;
        advPlayers = adversary.players; // Utiliser les vrais objets Player
        divisionName = club.teamDivisions[teamNumber];
        competitionName = "Championnat par équipes";
    } else {
        // Génération d'un adversaire amical sur mesure
        const targetPoints = getPointsForLevel(selectedRegion, selectedLevel);
        advName = generateClubName(selectedRegion, selectedLevel);
        divisionName = `${selectedLevel} (${REGIONS.find(r => r.id === selectedRegion)?.label})`;
        competitionName = "Match Amical International";
        
        advPlayers = Array.from({length: 4}).map((_, i) => {
            const variance = Math.floor(Math.random() * 300 - 150);
            return generateRandomPlayer(`p-amical-${Date.now()}-${i}`, targetPoints + variance);
        });
    }

    const newMeeting: any = {
      id: `meet-${matchType.toLowerCase()}-${Date.now()}`,
      date: new Date(date).toLocaleDateString(),
      teamNumber,
      competitionName,
      divisionName,
      homeClubName: club.name,
      awayClubName: advName,
      homePlayers: selectedHomePlayerIds,
      awayPlayers: [], // La simulation utilise ces objets
      matches: [],
      homeScore: 0,
      awayScore: 0,
      isCompleted: false,
      phaseId: currentPhase,
      type: matchType,
      _friendlyData: {
          advPlayers: advPlayers // On passe les joueurs générés pour que App.tsx les utilise
      }
    };

    onCreate(newMeeting);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="ping-gradient p-6 text-white flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tight">Planifier une Rencontre</h2>
            <p className="text-blue-100 text-xs font-bold uppercase">4 joueurs • 3 Simples + 1 Double</p>
          </div>
          <button onClick={onClose} className="hover:rotate-90 transition-transform bg-white/10 w-10 h-10 rounded-full flex items-center justify-center">
            <i className="fa-solid fa-xmark text-xl"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8 max-h-[80vh] overflow-y-auto">
          
          {/* Type Selector */}
          <div className="flex bg-gray-100 p-1 rounded-xl">
             <button
               type="button"
               onClick={() => setMatchType('LEAGUE')}
               className={`flex-1 py-3 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${matchType === 'LEAGUE' ? 'bg-white shadow-sm text-blue-900' : 'text-gray-400 hover:text-gray-600'}`}
             >
               Championnat
             </button>
             <button
               type="button"
               onClick={() => setMatchType('FRIENDLY')}
               className={`flex-1 py-3 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${matchType === 'FRIENDLY' ? 'bg-white shadow-sm text-purple-900' : 'text-gray-400 hover:text-gray-600'}`}
             >
               Amical International
             </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Date</label>
                <input 
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-black"
                />
              </div>
              
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Votre Équipe</label>
                <div className="flex gap-2 flex-wrap">
                  {Array.from({ length: club.teamCount }, (_, i) => i + 1).map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setTeamNumber(n)}
                      className={`px-4 py-2 rounded-lg text-xs font-black transition-all border ${teamNumber === n ? 'bg-black text-white border-black' : 'bg-white text-gray-400 border-gray-200 hover:border-black'}`}
                    >
                      Équipe {n}
                    </button>
                  ))}
                </div>
              </div>

              {matchType === 'LEAGUE' ? (
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Adversaire (Poule)</label>
                    <select 
                        value={selectedAdversaryId}
                        onChange={(e) => setSelectedAdversaryId(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-black"
                    >
                        {adversaries.map(adv => <option key={adv.id} value={adv.id}>{adv.name}</option>)}
                    </select>
                  </div>
              ) : (
                  <div className="space-y-3 p-4 bg-purple-50 rounded-2xl border border-purple-100">
                      <label className="block text-[10px] font-black text-purple-400 uppercase tracking-widest">Configuration Adversaire</label>
                      
                      <select 
                        value={selectedRegion}
                        onChange={(e) => { setSelectedRegion(e.target.value); setSelectedLevel(REGIONS.find(r => r.id === e.target.value)?.levels[0] || ''); }}
                        className="w-full px-4 py-2 bg-white border border-purple-200 rounded-lg text-sm font-bold text-purple-900"
                      >
                          {REGIONS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                      </select>

                      <select 
                        value={selectedLevel}
                        onChange={(e) => setSelectedLevel(e.target.value)}
                        className="w-full px-4 py-2 bg-white border border-purple-200 rounded-lg text-sm font-bold text-purple-900"
                      >
                          {REGIONS.find(r => r.id === selectedRegion)?.levels.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>

                      <input 
                        placeholder="Nom du club (Optionnel)" 
                        value={customClubName}
                        onChange={(e) => setCustomClubName(e.target.value)}
                        className="w-full px-4 py-2 bg-white border border-purple-200 rounded-lg text-sm font-bold"
                      />
                      <p className="text-[10px] text-purple-400 italic">Estimation Moyenne : ~{getPointsForLevel(selectedRegion, selectedLevel)} pts</p>
                  </div>
              )}
            </div>

            <div className="space-y-4">
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">
                Sélection des Joueurs (4 requis : {selectedHomePlayerIds.length}/4)
              </label>
              <div className="grid grid-cols-1 gap-2 overflow-y-auto max-h-[250px] pr-2 custom-scrollbar">
                {club.players.sort((a,b) => b.points - a.points).map(player => (
                  <div 
                    key={player.id}
                    onClick={() => togglePlayer(player.id)}
                    className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${selectedHomePlayerIds.includes(player.id) ? 'bg-blue-50 border-blue-600' : 'bg-gray-50 border-transparent hover:border-gray-200'}`}
                  >
                    <div className="flex items-center gap-3">
                       <img src={player.photoUrl} className="w-8 h-8 rounded-full border" alt="" />
                       <div className="flex flex-col">
                          <span className="text-xs font-black text-black">{player.name}</span>
                          <span className="text-[9px] text-gray-500 uppercase font-bold">{player.points} pts</span>
                       </div>
                    </div>
                    {selectedHomePlayerIds.includes(player.id) && <i className="fa-solid fa-check-circle text-blue-600"></i>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <button 
            type="submit"
            disabled={selectedHomePlayerIds.length !== 4}
            className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-xl active:scale-95 ${
                selectedHomePlayerIds.length !== 4 
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : matchType === 'FRIENDLY' 
                    ? 'bg-purple-600 text-white hover:bg-purple-700' 
                    : 'bg-black text-white hover:bg-gray-800'
            }`}
          >
            {matchType === 'FRIENDLY' ? 'Lancer le Match Amical' : 'Créer la Rencontre Officielle'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ManualMeetingModal;
