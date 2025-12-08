'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Player, ICONS } from '@/types/game';
import { addPlayer, claimAdmin, getGameState } from '@/lib/gameLogic';
import { supabase } from '@/lib/supabase';
import SupabaseConfigError from './SupabaseConfigError';

export default function PlayerJoin() {
  const [name, setName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState(ICONS[0]);
  const [isClaimingAdmin, setIsClaimingAdmin] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [supabaseReady, setSupabaseReady] = useState(false);
  const [hasCaptain, setHasCaptain] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if Supabase is configured
    setSupabaseReady(!!supabase);
    
    // Check if captain already exists
    const checkCaptain = async () => {
      if (supabase) {
        const gameState = await getGameState();
        if (gameState?.adminId) {
          setHasCaptain(true);
          setIsClaimingAdmin(false); // Disable if captain exists
        }
      }
    };
    
    if (supabase) {
      checkCaptain();
    }
  }, []);

  if (!supabaseReady) {
    return <SupabaseConfigError />;
  }

  const handleJoin = async () => {
    if (!name.trim()) {
      alert('Ahoy! Please enter yer name, matey!');
      return;
    }

    if (!supabase) {
      alert('Supabase not configured! Please check yer setup.');
      return;
    }

    setIsJoining(true);
    
    try {
      // Initialize game state if it doesn't exist (getGameState handles this)
      await getGameState();

      const playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const player: Player = {
        id: playerId,
        name: name.trim(),
        icon: selectedIcon,
        score: 0,
        joinedAt: Date.now(),
      };

      await addPlayer(player);

      // Claim admin if requested
      if (isClaimingAdmin) {
        const adminClaimed = await claimAdmin(playerId);
        if (!adminClaimed) {
          alert('Arrr! Another scallywag already claimed the captain\'s chair!');
        }
      }

      // Store player ID in localStorage
      localStorage.setItem('playerId', playerId);
      localStorage.setItem('playerName', name.trim());
      localStorage.setItem('playerIcon', selectedIcon);

      router.push('/game');
    } catch (error) {
      console.error('Error joining game:', error);
      alert('Blimey! Failed to join the game. Check yer Firebase configuration!');
      setIsJoining(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-banana-600 mb-2">🍌</h1>
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Nano Banana Challenge</h2>
          <p className="text-gray-600">Ahoy! Join the creative adventure, matey!</p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Yer Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-banana-500 focus:border-transparent outline-none transition"
              maxLength={20}
              disabled={isJoining}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Choose Yer Icon
            </label>
            <div className="grid grid-cols-8 gap-2">
              {ICONS.map((icon) => (
                <button
                  key={icon}
                  onClick={() => setSelectedIcon(icon)}
                  className={`text-3xl p-2 rounded-lg transition-all transform hover:scale-110 ${
                    selectedIcon === icon
                      ? 'bg-banana-400 ring-4 ring-banana-500 scale-110'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                  disabled={isJoining}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {!hasCaptain && (
            <div className="flex items-center space-x-2 p-3 bg-banana-50 rounded-lg">
              <input
                type="checkbox"
                id="claimAdmin"
                checked={isClaimingAdmin}
                onChange={(e) => setIsClaimingAdmin(e.target.checked)}
                className="w-5 h-5 text-banana-600 rounded focus:ring-2 focus:ring-banana-500"
                disabled={isJoining}
              />
              <label htmlFor="claimAdmin" className="text-sm font-medium text-gray-700 cursor-pointer">
                ⚓ Claim Captain&apos;s Chair (Admin)
              </label>
            </div>
          )}
          {hasCaptain && (
            <div className="p-3 bg-gray-100 rounded-lg">
              <p className="text-sm text-gray-600 text-center">
                ⚓ A captain already be in charge, matey!
              </p>
            </div>
          )}

          <button
            onClick={handleJoin}
            disabled={isJoining || !name.trim()}
            className="w-full bg-banana-500 hover:bg-banana-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-lg transition-all transform hover:scale-105 active:scale-95 shadow-lg"
          >
            {isJoining ? '⚓ Boarding...' : '🚀 Set Sail!'}
          </button>
        </div>

        <div className="mt-6 text-center text-xs text-gray-500">
          <p>🎨 Create AI-generated images</p>
          <p>🏆 Compete in 3 rounds: Easy, Medium, Hard</p>
          <p>⭐ Vote for the best creations</p>
        </div>
      </div>
    </div>
  );
}

