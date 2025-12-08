'use client';

import { useState } from 'react';
import { Submission, Player } from '@/types/game';
import { submitVote } from '@/lib/gameLogic';
import ImageModal from '@/components/ImageModal';

interface VotingAreaProps {
  submissions: { [key: string]: Submission };
  players: { [key: string]: Player };
  currentPlayerId: string;
  selectedPlayers: string[];
  canVote: boolean;
  categoryDescription: string | null;
}

export default function VotingArea({ 
  submissions, 
  players, 
  currentPlayerId, 
  selectedPlayers,
  canVote,
  categoryDescription
}: VotingAreaProps) {
  const [voting, setVoting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [expandedImageUrl, setExpandedImageUrl] = useState<string | null>(null);

  const handleVote = async (submissionId: string) => {
    if (!canVote || voting || hasVoted) return;

    // Check if player already voted
    const alreadyVoted = Object.values(submissions).some(
      sub => sub.votes?.includes(currentPlayerId)
    );

    if (alreadyVoted) {
      alert('Ye already voted, matey!');
      return;
    }

    setVoting(true);
    
    try {
      await submitVote(currentPlayerId, submissionId);
      setHasVoted(true);
    } catch (error) {
      console.error('Error voting:', error);
      alert('Failed to cast yer vote!');
    } finally {
      setVoting(false);
    }
  };

  // Only show submissions from selected players
  const submissionArray = Object.entries(submissions).filter(([playerId]) =>
    selectedPlayers.includes(playerId)
  );

  if (submissionArray.length === 0) {
    return (
      <div className="text-center p-12 bg-gray-100 rounded-xl">
        <p className="text-2xl text-gray-600">⏳ Waiting for submissions...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-2xl font-bold text-gray-800 mb-4 text-center">
          ⭐ Vote for the Best Creation!
        </h3>
        <p className="text-center text-gray-600 mb-6">
          {hasVoted ? '✅ Yer vote has been cast!' : 'Choose yer favorite masterpiece!'}
        </p>

        {/* Display Category Description */}
        {categoryDescription && (
          <div className="mb-6 p-4 bg-banana-50 rounded-lg border-2 border-banana-300">
            <p className="text-sm font-semibold text-gray-700 mb-2 text-center">
              🎯 Category Description for this Round:
            </p>
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <p className="text-lg font-medium text-gray-800 text-center italic">
                &quot;{categoryDescription}&quot;
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {submissionArray.map(([playerId, submission]) => {
            const isOwnSubmission = playerId === currentPlayerId;
            const voteCount = submission.votes?.length || 0;
            
            return (
              <div
                key={playerId}
                className="relative bg-gray-50 rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all"
              >
                <div className="aspect-square relative bg-gray-200">
                  {submission.imageUrl ? (
                    <img
                      src={submission.imageUrl}
                      alt="Submission"
                      className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setExpandedImageUrl(submission.imageUrl)}
                      onError={(e) => {
                        console.error('Failed to load image:', submission.imageUrl);
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <span className="text-4xl">🖼️</span>
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl">🎨</span>
                      <span className="font-semibold text-gray-800">
                        {isOwnSubmission ? 'Your Creation' : 'Mystery Artist'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="text-2xl">⭐</span>
                      <span className="font-bold text-banana-600">{voteCount}</span>
                    </div>
                  </div>

                  {!isOwnSubmission && canVote && !hasVoted && (
                    <button
                      onClick={() => handleVote(submission.id)}
                      disabled={voting}
                      className="w-full bg-banana-500 hover:bg-banana-600 disabled:bg-gray-300 text-white font-bold py-3 px-4 rounded-lg transition-all transform hover:scale-105"
                    >
                      {voting ? '🗳️ Voting...' : '⭐ Vote for This'}
                    </button>
                  )}

                  {isOwnSubmission && (
                    <div className="w-full bg-blue-100 text-blue-800 font-semibold py-3 px-4 rounded-lg text-center">
                      🎨 Yer own creation!
                    </div>
                  )}

                  {/* Show voter icons */}
                  {submission.votes && submission.votes.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-500 mb-2">Voted by:</p>
                      <div className="flex flex-wrap gap-2">
                        {submission.votes.map((voterId) => {
                          const voter = players[voterId];
                          return voter ? (
                            <div
                              key={voterId}
                              className="flex items-center space-x-1 bg-banana-100 px-2 py-1 rounded-full"
                              title={voter.name}
                            >
                              <span className="text-lg">{voter.icon}</span>
                              <span className="text-xs font-semibold">{voter.name}</span>
                            </div>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <ImageModal
        imageUrl={expandedImageUrl}
        onClose={() => setExpandedImageUrl(null)}
      />
    </div>
  );
}

