'use client';

import { Player } from '@/types/game';
import { deletePlayer } from '@/lib/gameLogic';

interface PlayerListProps {
  players: { [key: string]: Player };
  adminId: string | null;
  currentPlayerId: string;
  selectedPlayers?: string[];
  isAdmin?: boolean;
}

export default function PlayerList({ players, adminId, currentPlayerId, selectedPlayers = [], isAdmin = false }: PlayerListProps) {
  const playerArray = Object.values(players).sort((a, b) => b.score - a.score);

  const handleDeletePlayer = async (playerId: string, playerName: string) => {
    if (!confirm(`Arrr! Ye sure ye want to remove ${playerName} from the crew?`)) {
      return;
    }

    try {
      await deletePlayer(playerId);
    } catch (error: any) {
      alert(error.message || 'Blimey! Failed to remove the player!');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
        👥 Players ({playerArray.length})
      </h3>
      
      <div className="space-y-2">
        {playerArray.map((player) => {
          const isPlayerAdmin = player.id === adminId;
          const isCurrentPlayer = player.id === currentPlayerId;
          const isSelected = selectedPlayers.includes(player.id);
          const canDelete = isAdmin && !isPlayerAdmin; // Captain can delete anyone except themselves
          
          return (
            <div
              key={player.id}
              className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                isSelected ? 'bg-banana-100 ring-2 ring-banana-500' :
                isCurrentPlayer ? 'bg-blue-50' :
                'bg-gray-50 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{player.icon}</span>
                <div>
                  <p className="font-semibold text-gray-800 flex items-center gap-2">
                    {player.name}
                    {isPlayerAdmin && <span className="text-xs bg-banana-500 text-white px-2 py-1 rounded">⚓ CAPTAIN</span>}
                    {isCurrentPlayer && <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded">You</span>}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                {isSelected && (
                  <span className="text-sm font-bold text-banana-600 animate-pulse">
                    ⚔️ COMPETING
                  </span>
                )}
                <span className="text-sm font-bold text-gray-600">
                  {player.score} pts
                </span>
                {canDelete && (
                  <button
                    onClick={() => handleDeletePlayer(player.id, player.name)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded transition-all"
                    title="Remove player"
                  >
                    🗑️
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

