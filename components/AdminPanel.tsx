'use client';

import { useState, useRef } from 'react';
import { GameState, RoundType } from '@/types/game';
import { startRound, startTimer, advanceWinner, resetGame, calculateRoundWinner, consolidateVotingScores, endGame, transferCaptain, completeReset } from '@/lib/gameLogic';
import { supabase } from '@/lib/supabase';

interface AdminPanelProps {
  gameState: GameState;
  isAdmin: boolean;
}

export default function AdminPanel({ gameState, isAdmin }: AdminPanelProps) {
  const [uploadingCategory, setUploadingCategory] = useState(false);
  const [showCategoryUpload, setShowCategoryUpload] = useState(false);
  const [showPassCaptain, setShowPassCaptain] = useState(false);
  const categoryFileInputRef = useRef<HTMLInputElement>(null);
  
  // Get session ID from localStorage
  const sessionId = typeof window !== 'undefined' ? (localStorage.getItem('sessionId') || 'main') : 'main';

  // Early return if not admin - but log for debugging
  if (!isAdmin) {
    console.log('[AdminPanel] Not rendering - isAdmin is false', { isAdmin, hasGameState: !!gameState });
    return null;
  }
  
  console.log('[AdminPanel] Rendering for captain!', { isAdmin, hasGameState: !!gameState });

  // Safety check for gameState
  if (!gameState) {
    return (
      <div className="bg-gradient-to-r from-banana-400 to-banana-600 rounded-xl shadow-lg p-6 text-white">
        <h3 className="text-2xl font-bold mb-4">⚓ Captain&apos;s Control Panel</h3>
        <p>Loading captain controls...</p>
      </div>
    );
  }

  // Ensure players object exists - use empty object as fallback
  const players = (gameState && gameState.players) ? gameState.players : {};
  
  // Debug: Log to help diagnose (always log, even in production for now)
  console.log('[AdminPanel] Rendering with:', {
    isAdmin,
    hasGameState: !!gameState,
    hasPlayers: !!gameState?.players,
    playerCount: gameState?.players ? Object.keys(gameState.players).length : 0,
    adminId: gameState?.adminId,
    phase: gameState?.phase
  });

  const handleCategoryUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file type - must be CSV
    const isCSV = file.name.toLowerCase().endsWith('.csv') || 
                  file.type === 'text/csv' || 
                  file.type.includes('csv');
    if (!isCSV) {
      alert('Only CSV files be allowed, scallywag! The CSV must have "category" and "image_descr" columns.');
      if (categoryFileInputRef.current) {
        categoryFileInputRef.current.value = '';
      }
      return;
    }

    setUploadingCategory(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      // Note: roundType is now determined by the category column in the CSV

      const response = await fetch('/api/upload-category', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      alert(`Arrr! Successfully uploaded ${data.count || 0} category descriptions from CSV!`);
      setShowCategoryUpload(false);
    } catch (error) {
      console.error('Category upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Blimey! Failed to upload category CSV!';
      alert(errorMessage);
    } finally {
      setUploadingCategory(false);
      if (categoryFileInputRef.current) {
        categoryFileInputRef.current.value = '';
      }
    }
  };

  const handleStartRound = async (roundType: RoundType) => {
    await startRound(roundType, sessionId);
  };

  const handleStartTimer = async () => {
    await startTimer(sessionId);
  };

  const handleEndVoting = async () => {
    const winnerId = await calculateRoundWinner(sessionId);
    
    if (!winnerId) {
      alert('No votes yet, matey!');
      return;
    }

    // Update winner's score
    if (!supabase) return;
    const winner = gameState.players[winnerId];
    await supabase
      .from('players')
      .update({ score: (winner?.score || 0) + 1 })
      .eq('id', winnerId)
      .eq('session_id', sessionId);
    
    // Advance winner and stop timer
    await advanceWinner(winnerId, sessionId);
    await supabase
      .from('game_state')
      .update({ timer_started_at: null })
      .eq('session_id', sessionId);
  };

  const handleNextRound = async () => {
    const nextRound: RoundType = 
      gameState.currentRound === 'easy' ? 'medium' :
      gameState.currentRound === 'medium' ? 'hard' :
      'easy';
    
    if (gameState.currentRound === 'hard') {
      // Game over
      if (!supabase) return;
      await supabase
        .from('game_state')
        .update({ phase: 'game_over' })
        .eq('session_id', sessionId);
    } else {
      await startRound(nextRound, sessionId);
    }
  };

  const handleResetGame = async () => {
    if (confirm('Arrr! Reset the entire game? This cannot be undone!')) {
      try {
        await resetGame(sessionId);
      } catch (error) {
        console.error('Reset error:', error);
        alert(`Failed to reset game: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  };

  const handleEndGameAndLogout = async () => {
    if (confirm('Arrr! End the game and logout? This will remove yer captain status!')) {
      try {
        await endGame(sessionId);
        // Clear player data and redirect to home
        localStorage.removeItem('playerId');
        localStorage.removeItem('sessionId');
        if (typeof window !== 'undefined') {
          window.location.href = '/';
        }
      } catch (error) {
        console.error('End game error:', error);
        alert(`Failed to end game: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  };

  const handlePassCaptain = async (newCaptainId: string) => {
    const playerName = players[newCaptainId]?.name || 'Unknown Player';
    if (!confirm(`Arrr! Pass the captain role to ${playerName}?`)) {
      return;
    }

    try {
      await transferCaptain(newCaptainId, sessionId);
      setShowPassCaptain(false);
      alert(`Captain role transferred to ${playerName}!`);
    } catch (error) {
      console.error('Transfer captain error:', error);
      alert(`Failed to transfer captain: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleCompleteReset = async () => {
    if (!confirm('⚠️ COMPLETE RESET: This will delete ALL players, clear admin, and reset everything! Are you absolutely sure? This cannot be undone!')) {
      return;
    }
    
    try {
      const currentPlayerId = typeof window !== 'undefined' ? localStorage.getItem('playerId') : null;
      if (!currentPlayerId) {
        throw new Error('Player ID not found');
      }
      
      console.log('[Reset] Starting complete reset...');
      await completeReset(sessionId, currentPlayerId);
      console.log('[Reset] Reset successful!');
      
      // Clear local storage and redirect to home
      localStorage.removeItem('playerId');
      localStorage.removeItem('playerName');
      localStorage.removeItem('playerIcon');
      localStorage.removeItem('sessionId');
      alert('✅ Game reset successfully! Redirecting to home...');
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Complete reset error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      alert(`❌ Failed to reset: ${errorMsg}\n\nCheck the browser console (F12) for details.`);
    }
  };


  return (
    <div className="bg-gradient-to-r from-banana-400 to-banana-600 rounded-xl shadow-lg p-6 text-white" style={{ minHeight: '200px' }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-2xl font-bold flex items-center">
          ⚓ Captain&apos;s Control Panel
        </h3>
        {sessionId && sessionId !== 'main' && (
          <div className="bg-white bg-opacity-20 rounded-lg px-4 py-2 border-2 border-white">
            <p className="text-xs font-semibold mb-1">Session Code</p>
            <p className="text-2xl font-bold tracking-widest">{sessionId}</p>
          </div>
        )}
      </div>
      
      {/* Captain Actions - Always Visible at Top */}
      <div className="mb-4 p-5 bg-red-800 border-4 border-red-500 rounded-xl space-y-3 shadow-2xl" style={{ backgroundColor: 'rgb(153, 27, 27)', borderColor: 'rgb(239, 68, 68)' }}>
        <h4 className="text-2xl font-extrabold mb-4 flex items-center gap-2" style={{ color: 'rgb(253, 224, 71)' }}>
          ⚓ CAPTAIN ACTIONS ⚓
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Pass Captain Button */}
          <button
            onClick={() => setShowPassCaptain(!showPassCaptain)}
            className="bg-white text-blue-700 hover:bg-blue-100 font-extrabold text-lg py-4 px-6 rounded-lg transition-all transform hover:scale-105 border-4 border-blue-500 shadow-lg"
          >
            👑 {showPassCaptain ? 'Cancel Transfer' : 'Pass Captain Role'}
          </button>

          {/* End Game and Logout Button */}
          <button
            onClick={handleEndGameAndLogout}
            className="bg-red-700 hover:bg-red-800 text-white font-extrabold text-lg py-4 px-6 rounded-lg transition-all transform hover:scale-105 border-4 border-red-900 shadow-lg"
          >
            🚪 End Game & Logout
          </button>

          {/* Complete Reset Button */}
          <button
            onClick={handleCompleteReset}
            className="bg-red-900 hover:bg-red-950 text-white font-extrabold text-lg py-4 px-6 rounded-lg transition-all transform hover:scale-105 border-4 border-red-700 shadow-lg flex items-center justify-center gap-2"
            title="Complete Reset - Clears everything including all players and admin (Captain Only)"
          >
            🗑️ Complete Reset
          </button>
        </div>

        {/* Pass Captain Selection */}
        {showPassCaptain && (
          <div className="bg-white bg-opacity-20 rounded-lg p-4 space-y-2 mt-3 border-2 border-blue-400">
            <p className="text-sm font-semibold mb-3 text-center">Select a player to become the new captain:</p>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {Object.values(players)
                .filter(player => player && player.id !== gameState.adminId)
                .map(player => (
                  <button
                    key={player.id}
                    onClick={() => handlePassCaptain(player.id)}
                    className="w-full bg-white text-gray-800 hover:bg-gray-100 font-semibold py-2 px-4 rounded-lg transition-all flex items-center justify-between border border-gray-300"
                  >
                    <span>
                      <span className="text-xl mr-2">{player.icon}</span>
                      {player.name}
                    </span>
                    <span className="text-sm text-gray-600">{player.score || 0} pts</span>
                  </button>
                ))}
              {Object.values(players).filter(player => player && player.id !== gameState.adminId).length === 0 && (
                <p className="text-sm text-center opacity-75 py-4">No other players available, matey!</p>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Game Controls Section */}
      <div className="mb-4">
        <h4 className="text-xl font-bold mb-3 flex items-center gap-2">
          🎮 Game Controls
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {gameState.phase === 'lobby' && (
            <>
              <button
                onClick={() => handleStartRound('easy')}
                className="bg-white text-green-700 hover:bg-green-50 font-bold py-3 px-4 rounded-lg transition-all transform hover:scale-105 border-2 border-green-500 shadow-md"
              >
                🟢 Start Easy Round
              </button>
              <button
                onClick={() => handleStartRound('medium')}
                className="bg-white text-orange-600 hover:bg-orange-50 font-bold py-3 px-4 rounded-lg transition-all transform hover:scale-105 border-2 border-orange-500 shadow-md"
              >
                🟡 Start Medium Round
              </button>
              <button
                onClick={() => handleStartRound('hard')}
                className="bg-white text-red-600 hover:bg-red-50 font-bold py-3 px-4 rounded-lg transition-all transform hover:scale-105 border-2 border-red-500 shadow-md"
              >
                🔴 Start Hard Round
              </button>
            </>
          )}

          {gameState.phase === 'selecting_players' && (
            <button
              onClick={handleStartTimer}
              className="bg-white text-green-600 hover:bg-green-50 font-bold py-3 px-4 rounded-lg transition-all transform hover:scale-105 border-2 border-green-500 shadow-md"
            >
              ▶️ Start Timer (3 min)
            </button>
          )}

          {gameState.phase === 'voting' && (
            <button
              onClick={handleEndVoting}
              className="bg-white text-purple-600 hover:bg-purple-50 font-bold py-3 px-4 rounded-lg transition-all transform hover:scale-105 border-2 border-purple-500 shadow-md"
            >
              🏆 End Voting Early & Declare Winner
            </button>
          )}

          {gameState.phase === 'results' && (
            <button
              onClick={handleNextRound}
              className="bg-white text-blue-600 hover:bg-blue-50 font-bold py-3 px-4 rounded-lg transition-all transform hover:scale-105 border-2 border-blue-500 shadow-md"
            >
              ➡️ {gameState.currentRound === 'hard' ? 'End Game' : 'Next Round'}
            </button>
          )}

          {gameState.phase === 'game_over' && (
            <button
              onClick={handleResetGame}
              className="bg-white text-red-600 hover:bg-red-50 font-bold py-3 px-4 rounded-lg transition-all transform hover:scale-105 border-2 border-red-500 shadow-md"
            >
              🔄 Reset Game
            </button>
          )}

          {/* Emergency Reset - Regular reset (keeps admin) */}
          <button
            onClick={handleResetGame}
            className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-4 rounded-lg transition-all transform hover:scale-105 border-2 border-orange-800 shadow-md"
            title="Emergency Reset - Resets game but keeps captain/admin"
          >
            🔄 Emergency Reset
          </button>
        </div>
      </div>

      <div className="mt-4 p-3 bg-white bg-opacity-20 rounded-lg">
        <p className="text-sm font-semibold">Current Phase: {gameState.phase}</p>
        <p className="text-sm">Round: {gameState.currentRound || 'N/A'}</p>
        <p className="text-sm">Selected Players: {gameState.selectedPlayers.length}</p>
      </div>

      {/* Category Upload Section */}
      <div className="mt-4 p-4 bg-white bg-opacity-10 rounded-lg">
        <button
          onClick={() => setShowCategoryUpload(!showCategoryUpload)}
          className="w-full text-left font-semibold text-lg mb-2 flex items-center justify-between"
        >
          <span>📁 Upload Category CSV</span>
          <span>{showCategoryUpload ? '▼' : '▶'}</span>
        </button>
        
        {showCategoryUpload && (
          <div className="space-y-3 mt-3">
            <p className="text-sm opacity-90">
              Upload a CSV file with columns: <strong>category</strong> (must be &quot;easy&quot;, &quot;medium&quot;, or &quot;hard&quot;) and <strong>image_descr</strong>. 
              The app will randomly select one description when a round starts based on the round type.
            </p>
            <div className="bg-white bg-opacity-20 p-2 rounded text-xs font-mono">
              category,image_descr<br/>
              easy,A robot wearing a headset working in a call center<br/>
              medium,An AI chatbot therapist listening to a stressed spreadsheet<br/>
              hard,IFRS9 expected credit loss model visualized as a Rube Goldberg machine
            </div>
            <input
              ref={categoryFileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleCategoryUpload}
              className="hidden"
              disabled={uploadingCategory}
            />
            <button
              onClick={() => categoryFileInputRef.current?.click()}
              disabled={uploadingCategory}
              className="w-full bg-white text-banana-600 hover:bg-banana-50 disabled:bg-gray-300 font-bold py-2 px-4 rounded-lg transition-all disabled:cursor-not-allowed"
            >
              {uploadingCategory ? '⏳ Uploading...' : '📤 Upload Category CSV'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

