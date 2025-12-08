'use client';

import { useState, useRef } from 'react';
import { GameState, RoundType } from '@/types/game';
import { startRound, startTimer, advanceWinner, resetGame, calculateRoundWinner, consolidateVotingScores } from '@/lib/gameLogic';
import { supabase } from '@/lib/supabase';

interface AdminPanelProps {
  gameState: GameState;
  isAdmin: boolean;
}

export default function AdminPanel({ gameState, isAdmin }: AdminPanelProps) {
  const [uploadingCategory, setUploadingCategory] = useState(false);
  const [showCategoryUpload, setShowCategoryUpload] = useState(false);
  const categoryFileInputRef = useRef<HTMLInputElement>(null);

  if (!isAdmin) {
    return null;
  }

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
    await startRound(roundType);
  };

  const handleStartTimer = async () => {
    await startTimer();
  };

  const handleEndVoting = async () => {
    const winnerId = await calculateRoundWinner();
    
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
      .eq('id', winnerId);
    
    // Advance winner and stop timer
    await advanceWinner(winnerId);
    await supabase
      .from('game_state')
      .update({ timer_started_at: null })
      .eq('id', 'main');
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
        .eq('id', 'main');
    } else {
      await startRound(nextRound);
    }
  };

  const handleResetGame = async () => {
    if (confirm('Arrr! Reset the entire game? This cannot be undone!')) {
      try {
        await resetGame();
      } catch (error) {
        console.error('Reset error:', error);
        alert(`Failed to reset game: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  };

  return (
    <div className="bg-gradient-to-r from-banana-400 to-banana-600 rounded-xl shadow-lg p-6 text-white">
      <h3 className="text-2xl font-bold mb-4 flex items-center">
        ⚓ Captain&apos;s Control Panel
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {gameState.phase === 'lobby' && (
          <>
            <button
              onClick={() => handleStartRound('easy')}
              className="bg-white text-banana-600 hover:bg-banana-50 font-bold py-3 px-4 rounded-lg transition-all transform hover:scale-105"
            >
              🟢 Start Easy Round
            </button>
            <button
              onClick={() => handleStartRound('medium')}
              className="bg-white text-orange-600 hover:bg-orange-50 font-bold py-3 px-4 rounded-lg transition-all transform hover:scale-105"
            >
              🟡 Start Medium Round
            </button>
            <button
              onClick={() => handleStartRound('hard')}
              className="bg-white text-red-600 hover:bg-red-50 font-bold py-3 px-4 rounded-lg transition-all transform hover:scale-105"
            >
              🔴 Start Hard Round
            </button>
          </>
        )}

        {gameState.phase === 'selecting_players' && (
          <button
            onClick={handleStartTimer}
            className="bg-white text-green-600 hover:bg-green-50 font-bold py-3 px-4 rounded-lg transition-all transform hover:scale-105"
          >
            ▶️ Start Timer (3 min)
          </button>
        )}

        {gameState.phase === 'voting' && (
          <button
            onClick={handleEndVoting}
            className="bg-white text-purple-600 hover:bg-purple-50 font-bold py-3 px-4 rounded-lg transition-all transform hover:scale-105"
          >
            🏆 End Voting Early & Declare Winner
          </button>
        )}

        {gameState.phase === 'results' && (
          <button
            onClick={handleNextRound}
            className="bg-white text-blue-600 hover:bg-blue-50 font-bold py-3 px-4 rounded-lg transition-all transform hover:scale-105"
          >
            ➡️ {gameState.currentRound === 'hard' ? 'End Game' : 'Next Round'}
          </button>
        )}

        {gameState.phase === 'game_over' && (
          <button
            onClick={handleResetGame}
            className="bg-white text-red-600 hover:bg-red-50 font-bold py-3 px-4 rounded-lg transition-all transform hover:scale-105"
          >
            🔄 Reset Game
          </button>
        )}

        <button
          onClick={handleResetGame}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg transition-all"
        >
          🔄 Emergency Reset
        </button>
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

