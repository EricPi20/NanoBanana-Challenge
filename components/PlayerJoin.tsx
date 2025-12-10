'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Player, ICONS } from '@/types/game';
import { addPlayer, claimAdmin, getGameState, createSession, verifySession } from '@/lib/gameLogic';
import { supabase } from '@/lib/supabase';
import SupabaseConfigError from './SupabaseConfigError';

export default function PlayerJoin() {
  const [name, setName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState(ICONS[0]);
  const [isClaimingAdmin, setIsClaimingAdmin] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [supabaseReady, setSupabaseReady] = useState(false);
  const [hasCaptain, setHasCaptain] = useState(false);
  const [sessionCode, setSessionCode] = useState('');
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [joinMode, setJoinMode] = useState<'create' | 'join'>('create');
  const router = useRouter();

  useEffect(() => {
    // Check if Supabase is configured
    setSupabaseReady(!!supabase);
    
    // Check if user already has a session in localStorage
    const existingSessionId = localStorage.getItem('sessionId');
    if (existingSessionId) {
      setSessionCode(existingSessionId);
      setJoinMode('join');
    }
  }, []);

  if (!supabaseReady) {
    return <SupabaseConfigError />;
  }

  const handleCreateSession = async () => {
    if (!name.trim()) {
      alert('Ahoy! Please enter yer name, matey!');
      return;
    }

    if (!supabase) {
      alert('Supabase not configured! Please check yer setup.');
      return;
    }

    setIsCreatingSession(true);
    
    try {
      const playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create a new session
      const newSessionId = await createSession(playerId);
      
      const player: Player = {
        id: playerId,
        name: name.trim(),
        icon: selectedIcon,
        score: 0,
        joinedAt: Date.now(),
      };

      // Add player to the session
      await addPlayer(player, newSessionId);

      // Store session and player info in localStorage
      localStorage.setItem('sessionId', newSessionId);
      localStorage.setItem('playerId', playerId);
      localStorage.setItem('playerName', name.trim());
      localStorage.setItem('playerIcon', selectedIcon);

      router.push('/game');
    } catch (error) {
      console.error('Error creating session:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Blimey! Failed to create session.\n\n${errorMessage}\n\nPlease check:\n1. Supabase configuration\n2. Database migration (run add-session-support.sql)`);
      setIsCreatingSession(false);
    }
  };

  const handleJoinSession = async () => {
    if (!name.trim()) {
      alert('Ahoy! Please enter yer name, matey!');
      return;
    }

    if (!sessionCode.trim()) {
      alert('Ahoy! Please enter a session code, matey!');
      return;
    }

    if (!supabase) {
      alert('Supabase not configured! Please check yer setup.');
      return;
    }

    setIsJoining(true);
    
    try {
      // Verify session exists
      const sessionExists = await verifySession(sessionCode.trim().toUpperCase());
      if (!sessionExists) {
        alert('Arrr! That session code be invalid, matey!');
        setIsJoining(false);
        return;
      }

      // Initialize game state if it doesn't exist (getGameState handles this)
      await getGameState(sessionCode.trim().toUpperCase());

      const playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const player: Player = {
        id: playerId,
        name: name.trim(),
        icon: selectedIcon,
        score: 0,
        joinedAt: Date.now(),
      };

      // Add player to the session
      await addPlayer(player, sessionCode.trim().toUpperCase());

      // Store session and player info in localStorage
      localStorage.setItem('sessionId', sessionCode.trim().toUpperCase());
      localStorage.setItem('playerId', playerId);
      localStorage.setItem('playerName', name.trim());
      localStorage.setItem('playerIcon', selectedIcon);

      router.push('/game');
    } catch (error) {
      console.error('Error joining game:', error);
      alert('Blimey! Failed to join the game. Check yer Supabase configuration!');
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
          {/* Mode Selection - Tabs */}
          <div className="flex gap-2 mb-4 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setJoinMode('create')}
              className={`flex-1 py-2 px-4 rounded-md font-semibold transition-all ${
                joinMode === 'create'
                  ? 'bg-white text-banana-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              ⚓ Create
            </button>
            <button
              onClick={() => setJoinMode('join')}
              className={`flex-1 py-2 px-4 rounded-md font-semibold transition-all ${
                joinMode === 'join'
                  ? 'bg-white text-banana-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              🎮 Join
            </button>
          </div>

          {/* Session Code Input (for joining) */}
          {joinMode === 'join' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Session Code
              </label>
              <input
                type="text"
                value={sessionCode}
                onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
                placeholder="Enter 6-character code"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-banana-500 focus:border-transparent outline-none transition text-center text-2xl font-bold tracking-widest uppercase"
                maxLength={6}
                disabled={isJoining || isCreatingSession}
              />
              <p className="text-xs text-gray-500 mt-1 text-center">
                Enter the session code provided by the captain
              </p>
            </div>
          )}

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
              disabled={isJoining || isCreatingSession}
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
                  disabled={isJoining || isCreatingSession}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {joinMode === 'create' && (
            <div className="p-3 bg-banana-50 rounded-lg border-2 border-banana-300">
              <p className="text-sm font-semibold text-banana-800 text-center">
                ⚓ Creating a session makes you the Captain!
              </p>
              <p className="text-xs text-gray-600 text-center mt-1">
                You&apos;ll receive a session code to share with players
              </p>
            </div>
          )}

          {/* Single Action Button */}
          {joinMode === 'create' ? (
            <button
              onClick={handleCreateSession}
              disabled={isCreatingSession || !name.trim()}
              className="w-full bg-banana-500 hover:bg-banana-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-lg transition-all transform hover:scale-105 active:scale-95 shadow-lg"
            >
              {isCreatingSession ? '⚓ Creating Session...' : '⚓ Create Session & Set Sail!'}
            </button>
          ) : (
            <button
              onClick={handleJoinSession}
              disabled={isJoining || !name.trim() || !sessionCode.trim()}
              className="w-full bg-banana-500 hover:bg-banana-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-lg transition-all transform hover:scale-105 active:scale-95 shadow-lg"
            >
              {isJoining ? '⚓ Boarding...' : '🚀 Join Session!'}
            </button>
          )}
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

