'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { GameState, Player } from '@/types/game';
import { subscribeToGameState, consolidateVotingScores } from '@/lib/gameLogic';
import { supabase } from '@/lib/supabase';
import AdminPanel from '@/components/AdminPanel';
import PlayerList from '@/components/PlayerList';
import Timer from '@/components/Timer';
import VotingArea from '@/components/VotingArea';
import SupabaseConfigError from '@/components/SupabaseConfigError';
import ImageModal from '@/components/ImageModal';

// Dynamic import for heic2any (optional dependency)
let heic2any: any = null;
if (typeof window !== 'undefined') {
  // @ts-ignore - heic2any may not be installed
  import('heic2any').then((module) => {
    heic2any = module.default;
  }).catch(() => {
    console.warn('heic2any not available - HEIC conversion will not work');
  });
}

export default function GameBoard() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [expandedImageUrl, setExpandedImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    // Get player info from localStorage
    const playerId = localStorage.getItem('playerId');
    if (!playerId) {
      router.push('/');
      return;
    }
    setCurrentPlayerId(playerId);

    // Subscribe to game state
    const unsubscribe = subscribeToGameState((state) => {
      setGameState(state);
    });

    return () => unsubscribe();
  }, [router]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentPlayerId) return;

    // Check if player is selected for this round
    if (!gameState?.selectedPlayers.includes(currentPlayerId)) {
      alert('Ye be not selected for this round, matey!');
      return;
    }

    // Check if timer is running
    if (gameState?.phase !== 'creating') {
      alert('Upload time has ended or not started yet!');
      return;
    }

    // Check file type - accept images and HEIC files
    const isImage = file.type.startsWith('image/');
    const isHeic = file.name.toLowerCase().endsWith('.heic') || 
                   file.name.toLowerCase().endsWith('.heif') ||
                   file.type === 'image/heic' || 
                   file.type === 'image/heif';
    
    if (!isImage && !isHeic) {
      alert('Only image files be allowed, scallywag!');
      return;
    }

    setUploading(true);

    try {
      let fileToUpload = file;

      // Convert HEIC to JPEG if needed
      if (isHeic && heic2any) {
        try {
          const convertedBlob = await heic2any({
            blob: file,
            toType: 'image/jpeg',
            quality: 0.9,
          });
          
          // heic2any returns an array, get the first element
          const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
          
          // Create a new File object with JPEG extension
          const fileName = file.name.replace(/\.(heic|heif)$/i, '.jpg');
          fileToUpload = new File([blob], fileName, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
        } catch (conversionError) {
          console.error('HEIC conversion error:', conversionError);
          alert('Failed to convert HEIC file. Please convert it to JPEG first, or install heic2any package.');
          setUploading(false);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
          return;
        }
      } else if (isHeic && !heic2any) {
        alert('HEIC files require conversion. Please install heic2any package or convert the file to JPEG first.');
        setUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      const formData = new FormData();
      formData.append('file', fileToUpload);
      formData.append('playerId', currentPlayerId);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      alert('Arrr! Yer image be uploaded successfully!');
    } catch (error) {
      console.error('Upload error:', error);
      alert('Blimey! Failed to upload yer image!');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleTimerComplete = async () => {
    if (!gameState) return;
    
    if (gameState.phase === 'creating') {
      // Move to voting phase (this shouldn't happen now since we auto-transition)
      if (!supabase) return;
      await supabase
        .from('game_state')
        .update({ phase: 'voting' })
        .eq('id', 'main');
    } else if (gameState.phase === 'voting') {
      // Voting timer completed - consolidate scores
      await consolidateVotingScores();
    }
  };

  if (!supabase) {
    return <SupabaseConfigError />;
  }

  if (!gameState || !currentPlayerId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl text-gray-600">⚓ Loading the game, matey...</p>
        </div>
      </div>
    );
  }

  const isAdmin = gameState.adminId === currentPlayerId;
  const isSelectedPlayer = gameState.selectedPlayers.includes(currentPlayerId);
  const canVote = !isSelectedPlayer && gameState.phase === 'voting';
  const currentPlayer = gameState.players[currentPlayerId];
  const hasSubmitted = gameState.submissions[currentPlayerId] !== undefined;

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-banana-600 mb-2">🍌 Nano Banana Challenge</h1>
          <div className="flex items-center justify-center space-x-4 mt-4">
            <div className="bg-white rounded-lg px-4 py-2 shadow-md">
              <span className="text-2xl mr-2">{currentPlayer?.icon}</span>
              <span className="font-semibold">{currentPlayer?.name}</span>
            </div>
            {gameState.currentRound && (
              <div className={`rounded-lg px-4 py-2 shadow-md font-bold text-white ${
                gameState.currentRound === 'easy' ? 'bg-green-500' :
                gameState.currentRound === 'medium' ? 'bg-orange-500' :
                'bg-red-500'
              }`}>
                Round: {gameState.currentRound.toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {/* Admin Panel */}
        {isAdmin && <AdminPanel gameState={gameState} isAdmin={isAdmin} />}

        {/* Timer */}
        {(gameState.phase === 'creating' || gameState.phase === 'voting') && gameState.timerStartedAt && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <Timer
              key={`${gameState.timerStartedAt}-${gameState.phase}`}
              startedAt={gameState.timerStartedAt}
              duration={gameState.timerDuration}
              onComplete={handleTimerComplete}
              phase={gameState.phase}
            />
            {gameState.phase === 'voting' && (
              <p className="text-center text-gray-600 mt-2 text-sm">
                ⏱️ Voting time remaining...
              </p>
            )}
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Player List */}
          <div className="lg:col-span-1">
            <PlayerList
              players={gameState.players}
              adminId={gameState.adminId}
              currentPlayerId={currentPlayerId}
              selectedPlayers={gameState.selectedPlayers}
              isAdmin={isAdmin}
            />
          </div>

          {/* Right Column - Game Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Upload Area for Selected Players */}
            {isSelectedPlayer && gameState.phase === 'creating' && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-2xl font-bold text-gray-800 mb-4">
                  🎨 Create Yer Masterpiece!
                </h3>
                
                {/* Display Category Description if available */}
                {gameState.currentCategoryImageDescr && (
                  <div className="mb-6 p-6 bg-banana-50 rounded-lg border-2 border-banana-300">
                    <p className="text-lg font-semibold text-gray-800 mb-3 text-center">
                      🎯 Generate an image based on this description:
                    </p>
                    <div className="bg-white rounded-lg p-4 shadow-md">
                      <p className="text-xl font-medium text-gray-800 text-center italic">
                        &quot;{gameState.currentCategoryImageDescr}&quot;
                      </p>
                    </div>
                  </div>
                )}
                
                <p className="text-gray-600 mb-4">
                  {gameState.currentCategoryImageDescr 
                    ? 'Use AI tools (like DALL-E, Midjourney, or Stable Diffusion) to create an image matching the description above, then upload it here!'
                    : 'Use AI tools (like DALL-E, Midjourney, or Stable Diffusion) to create an image with "nano banana" theme, then upload it here!'}
                </p>
                
                {hasSubmitted ? (
                  <div className="bg-green-50 border-2 border-green-500 rounded-lg p-6 text-center">
                    <p className="text-2xl mb-2">✅</p>
                    <p className="text-lg font-semibold text-green-800">
                      Yer submission be uploaded!
                    </p>
                    {gameState.submissions[currentPlayerId] && (
                      <div className="mt-4">
                        <img
                          src={gameState.submissions[currentPlayerId].imageUrl}
                          alt="Your submission"
                          className="max-w-full h-auto rounded-lg shadow-md mx-auto cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => setExpandedImageUrl(gameState.submissions[currentPlayerId].imageUrl)}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-banana-500 transition-colors">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,.heic,.heif"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="bg-banana-500 hover:bg-banana-600 disabled:bg-gray-300 text-white font-bold py-4 px-8 rounded-lg transition-all transform hover:scale-105 disabled:cursor-not-allowed"
                    >
                      {uploading ? '⏳ Uploading...' : '📤 Upload Yer Image'}
                    </button>
                    <p className="text-sm text-gray-500 mt-4">
                      PNG, JPG, GIF, or HEIC up to 10MB
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Waiting Message for Non-Selected Players */}
            {!isSelectedPlayer && gameState.phase === 'creating' && (
              <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                <p className="text-3xl mb-4">⏳</p>
                <p className="text-xl font-semibold text-gray-700">
                  Waiting for players to create their masterpieces...
                </p>
                {gameState.currentCategoryImageDescr && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm font-semibold text-gray-700 mb-3">
                      Category description for this round:
                    </p>
                    <div className="bg-white rounded-lg p-4 shadow-md">
                      <p className="text-lg font-medium text-gray-800 text-center italic">
                        &quot;{gameState.currentCategoryImageDescr}&quot;
                      </p>
                    </div>
                  </div>
                )}
                <p className="text-gray-600 mt-4">
                  Ye&apos;ll be able to vote once the timer ends!
                </p>
              </div>
            )}

            {/* Voting Area */}
            {gameState.phase === 'voting' && (
              <VotingArea
                submissions={gameState.submissions}
                players={gameState.players}
                currentPlayerId={currentPlayerId}
                selectedPlayers={gameState.selectedPlayers}
                canVote={canVote}
                categoryDescription={gameState.currentCategoryImageDescr}
              />
            )}

            {/* Results Phase */}
            {gameState.phase === 'results' && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-3xl font-bold text-center text-gray-800 mb-6">
                  🏆 Round Results
                </h3>
                {gameState.roundWinners.length > 0 && (
                  <div className="text-center">
                    <p className="text-xl text-gray-600 mb-4">Winner:</p>
                    {(() => {
                      const winnerId = gameState.roundWinners[gameState.roundWinners.length - 1];
                      const winner = gameState.players[winnerId];
                      return winner ? (
                        <div className="bg-banana-100 rounded-lg p-6">
                          <span className="text-5xl">{winner.icon}</span>
                          <p className="text-2xl font-bold text-gray-800 mt-2">{winner.name}</p>
                          <p className="text-lg text-gray-600 mt-1">Score: {winner.score} points</p>
                        </div>
                      ) : null;
                    })()}
                  </div>
                )}
              </div>
            )}

            {/* Game Over */}
            {gameState.phase === 'game_over' && (
              <div className="bg-gradient-to-r from-banana-400 to-banana-600 rounded-xl shadow-lg p-12 text-center text-white">
                <h3 className="text-4xl font-bold mb-6">🎉 Game Over! 🎉</h3>
                <p className="text-2xl mb-8">Final Scores:</p>
                <div className="space-y-3">
                  {Object.values(gameState.players)
                    .sort((a, b) => b.score - a.score)
                    .map((player, index) => (
                      <div
                        key={player.id}
                        className="bg-white bg-opacity-20 rounded-lg p-4 flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-3">
                          <span className="text-3xl">{index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '⭐'}</span>
                          <span className="text-2xl">{player.icon}</span>
                          <span className="text-xl font-bold">{player.name}</span>
                        </div>
                        <span className="text-xl font-bold">{player.score} points</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Lobby Phase */}
            {gameState.phase === 'lobby' && (
              <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                <p className="text-4xl mb-4">⚓</p>
                <p className="text-2xl font-semibold text-gray-700 mb-2">
                  Welcome to the Lobby!
                </p>
                <p className="text-gray-600">
                  {isAdmin
                    ? 'As the captain, ye can start a round when ready!'
                    : 'Waiting for the captain to start the game...'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      <ImageModal
        imageUrl={expandedImageUrl}
        onClose={() => setExpandedImageUrl(null)}
      />
    </div>
  );
}

