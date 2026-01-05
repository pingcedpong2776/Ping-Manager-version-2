
import React, { useState } from 'react';
import { Player, Club, TransferOffer } from '../types';
import { getTransferMarketSuggestions } from '../services/geminiService';
import YouthAcademy from './YouthAcademy';

interface TransferMarketProps {
  club: Club;
  marketPlayers: Player[];
  incomingOffers: TransferOffer[];
  onBuy: (player: Player, price: number) => void;
  onSell: (offerId: string) => void;
  onRefuse: (offerId: string) => void;
  onToggleListing: (playerId: string) => void;
  onCreateNewTeam?: () => void;
  // Props pour la YouthAcademy
  youthPlayers: Player[];
  onAddYouth: (players: Player[]) => void;
  onSignYouth: (player: Player) => void;
  onRemoveYouth: (playerId: string) => void;
  onUpdateYouth: (player: Player) => void;
  onTrainYouth: (player: Player, type: 'basic' | 'stage') => void;
  
  isUnlimitedBudget: boolean;
  isOpen: boolean;
  onCloseMercato?: () => void;
}

const TransferMarket: React.FC<TransferMarketProps> = ({ 
  club, 
  marketPlayers, 
  incomingOffers, 
  onBuy, 
  onSell, 
  onRefuse,
  onToggleListing,
  onCreateNewTeam,
  youthPlayers,
  onAddYouth,
  onSignYouth,
  onRemoveYouth,
  onUpdateYouth,
  onTrainYouth,
  isUnlimitedBudget,
  isOpen,
  onCloseMercato
}) => {
  const [activeTab, setActiveTab] = useState<'buy' | 'sell' | 'offers' | 'structure'>('buy');
  const [suggestedIds, setSuggestedIds] = useState<string[]>([]);
  const [aiReason, setAiReason] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);

  const calculateValue = (p: Player) => {
    return Math.round((p.points - 400) * 8 + (p.experience * 3) + (100 - p.age) * 5);
  };

  const handleAiSuggest = async () => {
      if (isAiLoading) return;
      setIsAiLoading(true);
      setSuggestedIds([]);
      setAiReason(null);
      try {
          const result = await getTransferMarketSuggestions(club, marketPlayers);
          setSuggestedIds(result.suggestedPlayerIds);
          setAiReason(result.reason);
          setActiveTab('buy'); // Force switch to buy tab to see suggestions
      } catch (error) {
          console.error("AI Error", error);
      } finally {
          setIsAiLoading(false);
      }
  };

  const handleCreateTeamClick = async () => {
      if (onCreateNewTeam) {
          setIsCreatingTeam(true);
          await onCreateNewTeam();
          setIsCreatingTeam(false);
          setActiveTab('buy'); // Redirect to buy players for the new team
      }
  };

  const isMercatoLockedView = !isOpen && activeTab !== 'structure';

  if (isMercatoLockedView) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500 pb-20">
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter">MERCATO FFTT</h2>
            <button 
                onClick={() => setActiveTab('structure')}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all"
            >
                Accéder à la Structure Club
            </button>
         </div>
         <div className="bg-slate-50 border-4 border-dashed border-slate-200 rounded-[3rem] p-20 text-center flex flex-col items-center">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm text-slate-300">
               <i className="fa-solid fa-lock text-4xl"></i>
            </div>
            <h3 className="text-2xl font-black text-slate-400 uppercase tracking-tight">Le Mercato est fermé</h3>
            <p className="text-sm text-slate-400 font-bold uppercase mt-2 max-w-md">Les transferts ne sont autorisés que jusqu'à la fin de la 2ème journée de championnat ou lors de l'inter-phase.</p>
         </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
             <h2 className="text-4xl font-black text-slate-900 tracking-tighter">MERCATO FFTT</h2>
             {isOpen ? (
                 <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest animate-pulse">Ouvert</span>
             ) : (
                 <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest">Fermé</span>
             )}
          </div>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Période des transferts & Gestion Sportive</p>
        </div>
        <div className="flex flex-wrap gap-2 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
          {isOpen && (
              <>
                <button 
                    onClick={() => setActiveTab('buy')}
                    className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'buy' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                    Acheter
                </button>
                <button 
                    onClick={() => setActiveTab('sell')}
                    className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'sell' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                    Vendre
                </button>
                <button 
                    onClick={() => setActiveTab('offers')}
                    className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all relative ${activeTab === 'offers' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                    Offres {incomingOffers.length > 0 && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>}
                </button>
              </>
          )}
          <button 
            onClick={() => setActiveTab('structure')}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'structure' ? 'bg-blue-600 text-white' : 'text-blue-600 bg-blue-50 hover:bg-blue-100'}`}
          >
            Structure & Jeunes
          </button>
          
          {isOpen && activeTab === 'buy' && (
            <>
                <div className="w-px bg-slate-100 mx-1"></div>
                <button 
                    onClick={handleAiSuggest}
                    disabled={isAiLoading}
                    className="px-4 py-2.5 bg-purple-50 text-purple-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-purple-100 transition-all flex items-center gap-2"
                >
                    {isAiLoading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-wand-magic-sparkles"></i>}
                    Suggestion IA
                </button>
            </>
          )}
        </div>
      </div>

      {aiReason && activeTab === 'buy' && (
          <div className="bg-purple-50 border border-purple-100 p-6 rounded-[2rem] relative animate-in zoom-in-95">
              <div className="absolute -top-3 left-8 bg-purple-600 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase">Conseil du Directeur Sportif</div>
              <p className="text-purple-900 text-xs font-medium italic">"{aiReason}"</p>
          </div>
      )}

      {onCloseMercato && isOpen && activeTab !== 'structure' && (
        <div className="bg-blue-600 text-white p-6 rounded-[2.5rem] shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
           <div>
              <h3 className="font-black uppercase text-lg">Fin de période des transferts</h3>
              <p className="text-xs font-medium text-blue-200 opacity-90">Une fois validé, la nouvelle phase débutera et les montées/descentes seront appliquées.</p>
           </div>
           <button 
             onClick={onCloseMercato}
             className="px-8 py-4 bg-white text-blue-900 rounded-2xl font-black uppercase tracking-widest shadow-lg hover:scale-105 transition-all whitespace-nowrap text-xs"
           >
             Valider & Lancer la Phase
           </button>
        </div>
      )}

      {activeTab === 'structure' && (
          <div className="space-y-12">
              <YouthAcademy 
                youthPlayers={youthPlayers}
                onAddYouth={onAddYouth}
                onSignPlayer={onSignYouth}
                onRemovePlayer={onRemoveYouth}
                onUpdatePlayer={onUpdateYouth}
                onTrainYouth={onTrainYouth}
                budget={isUnlimitedBudget ? 9999999 : club.budget}
              />

              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                  <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 text-2xl mb-6">
                      <i className="fa-solid fa-users-rectangle"></i>
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-2">Expansion du Club</h3>
                  <p className="text-slate-500 text-xs leading-relaxed mb-8">
                      Inscrivez une nouvelle équipe en championnat. Elle débutera au plus bas échelon départemental (D4). 
                      Vous devrez recruter au moins 4 joueurs supplémentaires pour compléter l'effectif.
                  </p>
                  
                  <div className="bg-slate-50 p-4 rounded-2xl mb-6">
                      <div className="flex justify-between items-center text-xs font-bold text-slate-600 mb-2">
                          <span>Coût d'inscription</span>
                          <span>500€</span>
                      </div>
                      <div className="flex justify-between items-center text-xs font-bold text-slate-600">
                          <span>Équipes actuelles</span>
                          <span>{club.teamCount}</span>
                      </div>
                  </div>

                  <button 
                    onClick={handleCreateTeamClick}
                    disabled={isCreatingTeam || (!isUnlimitedBudget && club.budget < 500)}
                    className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all ${(!isUnlimitedBudget && club.budget < 500) ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg'}`}
                  >
                    {isCreatingTeam ? 'Création en cours...' : `Créer l'équipe ${club.teamCount + 1} (-500€)`}
                  </button>
              </div>
          </div>
      )}

      {activeTab === 'buy' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {marketPlayers.map(p => {
            const price = calculateValue(p);
            const canAfford = isUnlimitedBudget || club.budget >= price;
            const isSuggested = suggestedIds.includes(p.id);
            
            return (
              <div key={p.id} className={`bg-white p-6 rounded-[2.5rem] border shadow-sm transition-all group relative overflow-hidden ${isSuggested ? 'border-purple-500 ring-4 ring-purple-50 shadow-xl' : 'border-slate-100 hover:border-blue-400'}`}>
                {isSuggested && (
                    <div className="absolute top-0 right-0 bg-purple-600 text-white text-[9px] font-black uppercase px-4 py-1 rounded-bl-2xl z-10">
                        Recommandé
                    </div>
                )}
                
                <div className="flex justify-between items-start mb-6">
                   <div className="flex items-center gap-4">
                      <img src={p.photoUrl} className="w-14 h-14 rounded-2xl object-cover border-2 border-slate-50" alt="" />
                      <div>
                        <h4 className="font-black text-slate-900 uppercase text-sm leading-tight">{p.name}</h4>
                        <p className="text-[9px] text-blue-600 font-black uppercase tracking-widest">{p.style}</p>
                      </div>
                   </div>
                   <span className="bg-slate-50 px-3 py-1 rounded-full text-[9px] font-black text-slate-400 uppercase">{p.age} ANS</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                   <div className="bg-slate-50 p-3 rounded-2xl text-center">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Points</p>
                      <p className="text-sm font-black text-slate-900">{Math.round(p.points)}</p>
                   </div>
                   <div className="bg-slate-50 p-3 rounded-2xl text-center">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Physique</p>
                      <p className="text-sm font-black text-slate-900">{p.stats.stamina}%</p>
                   </div>
                </div>

                <div className={`flex justify-between items-center p-4 rounded-3xl border mb-6 ${isSuggested ? 'bg-purple-50 border-purple-100' : 'bg-blue-50/50 border-blue-100'}`}>
                   <div>
                      <p className={`text-[8px] font-black uppercase tracking-widest opacity-60 ${isSuggested ? 'text-purple-900' : 'text-blue-900'}`}>Indemnité de transfert</p>
                      <p className={`text-lg font-black ${isSuggested ? 'text-purple-700' : 'text-blue-600'}`}>{price}€</p>
                   </div>
                   {p.points > 1200 && <span className="text-[8px] bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-black uppercase">Star</span>}
                </div>

                <button 
                  onClick={() => onBuy(p, price)}
                  disabled={!canAfford}
                  className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${canAfford ? 'bg-slate-900 text-white hover:bg-blue-600 shadow-xl shadow-slate-200' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                >
                  {canAfford ? 'Signer le contrat' : 'Budget Insuffisant'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'sell' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {club.players.sort((a,b) => b.points - a.points).map(p => {
            const price = calculateValue(p);
            return (
              <div key={p.id} className={`bg-white p-6 rounded-[2.5rem] border transition-all ${p.isTransferListed ? 'border-amber-400 shadow-lg' : 'border-slate-100 shadow-sm opacity-90'}`}>
                <div className="flex justify-between items-start mb-6">
                   <div className="flex items-center gap-4">
                      <img src={p.photoUrl} className="w-14 h-14 rounded-2xl object-cover border-2 border-slate-50" alt="" />
                      <div>
                        <h4 className="font-black text-slate-900 uppercase text-sm leading-tight">{p.name}</h4>
                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{p.style}</p>
                      </div>
                   </div>
                   {p.isTransferListed && <span className="bg-amber-100 text-amber-600 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest animate-pulse">En vente</span>}
                </div>

                <div className="flex justify-between items-center mb-6 px-2">
                   <div>
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Valeur estimée</p>
                      <p className="text-lg font-black text-slate-900">{price}€</p>
                   </div>
                   <div className="text-right">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Points</p>
                      <p className="text-lg font-black text-blue-600">{Math.round(p.points)}</p>
                   </div>
                </div>

                <button 
                  onClick={() => onToggleListing(p.id)}
                  className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${p.isTransferListed ? 'bg-red-50 text-red-600 hover:bg-red-600 hover:text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-900 hover:text-white'}`}
                >
                  {p.isTransferListed ? 'Retirer du marché' : 'Placer sur la liste'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'offers' && (
        <div className="max-w-3xl mx-auto space-y-4">
          {incomingOffers.length > 0 ? (
            incomingOffers.map(offer => (
              <div key={offer.id} className="bg-white p-8 rounded-[2.5rem] border-2 border-blue-100 shadow-xl flex flex-col md:flex-row justify-between items-center gap-6 animate-in slide-in-from-bottom-4">
                 <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-blue-900 rounded-[1.5rem] flex items-center justify-center text-white shadow-lg">
                       <i className="fa-solid fa-handshake text-2xl"></i>
                    </div>
                    <div>
                       <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Offre reçue de {offer.offeringClubName}</p>
                       <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{offer.playerName}</h4>
                    </div>
                 </div>
                 
                 <div className="flex items-center gap-8">
                    <div className="text-right">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Montant proposé</p>
                       <p className="text-3xl font-black text-green-600">{offer.amount}€</p>
                    </div>
                    <div className="flex gap-2">
                       <button 
                        onClick={() => onRefuse(offer.id)}
                        className="bg-slate-100 text-slate-500 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all"
                       >
                         Refuser
                       </button>
                       <button 
                        onClick={() => onSell(offer.id)}
                        className="bg-slate-900 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-green-600 transition-all shadow-lg active:scale-95"
                       >
                         Accepter
                       </button>
                    </div>
                 </div>
              </div>
            ))
          ) : (
            <div className="bg-slate-50 border-4 border-dashed border-slate-200 rounded-[3rem] p-16 text-center">
               <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                  <i className="fa-solid fa-envelope-open text-3xl text-slate-200"></i>
               </div>
               <h3 className="text-xl font-black text-slate-400 uppercase tracking-tight">Aucune offre pour le moment</h3>
               <p className="text-xs text-slate-400 font-bold uppercase mt-2">Placez vos joueurs sur la liste des transferts pour attirer les recruteurs.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TransferMarket;
