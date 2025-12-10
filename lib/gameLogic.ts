import { getSupabaseClient } from './supabase';
import { GameState, Player, RoundType } from '@/types/game';

// Generate a random session code (6 characters, alphanumeric)
export const generateSessionCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars like 0, O, I, 1
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Create a new game session
export const createSession = async (playerId: string): Promise<string> => {
  const supabase = getSupabaseClient();
  
  // Generate a unique session ID (try up to 10 times to avoid collisions)
  let sessionId = generateSessionCode();
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    // Check if session already exists (try with session_id first, fallback to id)
    let existing = null;
    const { data: dataWithSessionId, error: errorSessionId } = await supabase
      .from('game_state')
      .select('id')
      .eq('session_id', sessionId)
      .single();
    
    // If session_id column exists and we found data, use it
    if (dataWithSessionId) {
      existing = dataWithSessionId;
    } else if (errorSessionId && (
      errorSessionId.message?.toLowerCase().includes('session_id') ||
      errorSessionId.message?.toLowerCase().includes('column') ||
      errorSessionId.code === '42703' ||
      errorSessionId.code === 'PGRST116' // Not found is OK
    )) {
      // If column doesn't exist or not found, check by id as fallback
      if (errorSessionId.code !== 'PGRST116') {
        // Column doesn't exist, check by id
        const { data: dataById } = await supabase
          .from('game_state')
          .select('id')
          .eq('id', sessionId)
          .single();
        existing = dataById;
      }
      // If PGRST116 (not found), existing stays null which is correct
    }
    
    if (!existing) {
      break; // Session ID is unique
    }
    
    // Generate a new one if collision
    sessionId = generateSessionCode();
    attempts++;
  }
  
  if (attempts >= maxAttempts) {
    throw new Error('Failed to generate unique session code. Please try again.');
  }
  
  // Create game state for this session
  const defaultState = getDefaultGameState();
  
  // Try with all columns first (if migration has been run)
  let error = null;
  const { error: errorWithAllColumns } = await supabase.from('game_state').upsert({
    id: sessionId,
    session_id: sessionId,
    admin_id: playerId,
    phase: defaultState.phase,
    round_number: defaultState.roundNumber,
    timer_duration: defaultState.timerDuration,
    selected_players: defaultState.selectedPlayers,
    round_winners: defaultState.roundWinners,
    easy_round_players: defaultState.easyRoundPlayers,
    current_category_image_descr: defaultState.currentCategoryImageDescr,
  }, { onConflict: 'id' });
  
  // If error is about missing columns, try without them (backward compatibility)
  if (errorWithAllColumns && (
    errorWithAllColumns.message?.toLowerCase().includes('session_id') ||
    errorWithAllColumns.message?.toLowerCase().includes('easy_round_players') ||
    errorWithAllColumns.message?.toLowerCase().includes('column') ||
    errorWithAllColumns.code === '42703'
  )) {
    console.warn('Some columns not found, creating session with minimal columns (migration may not be run)');
    
    // Try without easy_round_players first
    const { error: errorWithoutEasyRound } = await supabase.from('game_state').upsert({
      id: sessionId,
      session_id: sessionId,
      admin_id: playerId,
      phase: defaultState.phase,
      round_number: defaultState.roundNumber,
      timer_duration: defaultState.timerDuration,
      selected_players: defaultState.selectedPlayers,
      round_winners: defaultState.roundWinners,
      current_category_image_descr: defaultState.currentCategoryImageDescr,
    }, { onConflict: 'id' });
    
    // If still error about session_id, try without it too
    if (errorWithoutEasyRound && (
      errorWithoutEasyRound.message?.toLowerCase().includes('session_id') ||
      errorWithoutEasyRound.code === '42703'
    )) {
      console.warn('session_id column not found, creating session without it');
      const { error: errorMinimal } = await supabase.from('game_state').upsert({
        id: sessionId,
        admin_id: playerId,
        phase: defaultState.phase,
        round_number: defaultState.roundNumber,
        timer_duration: defaultState.timerDuration,
        selected_players: defaultState.selectedPlayers,
        round_winners: defaultState.roundWinners,
        current_category_image_descr: defaultState.currentCategoryImageDescr,
      }, { onConflict: 'id' });
      error = errorMinimal;
    } else {
      error = errorWithoutEasyRound;
    }
  } else {
    error = errorWithAllColumns;
  }
  
  if (error) {
    console.error('Session creation error:', error);
    throw new Error(`Failed to create session: ${error.message}. Please ensure the database migration has been run.`);
  }
  
  return sessionId;
};

// Verify session exists
export const verifySession = async (sessionId: string): Promise<boolean> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('game_state')
    .select('id')
    .eq('session_id', sessionId)
    .single();
  
  return !error && !!data;
};

// Initialize default game state
export const getDefaultGameState = (): GameState => ({
  adminId: null,
  phase: 'lobby',
  currentRound: null,
  roundNumber: 0,
  selectedPlayers: [],
  timerStartedAt: null,
  timerDuration: 180, // 3 minutes
  submissions: {},
  players: {},
  roundWinners: [],
  easyRoundPlayers: [],
  currentCategoryImageDescr: null,
});

// Helper to convert database state to GameState
const buildGameState = async (stateData: any, sessionId: string): Promise<GameState> => {
  const supabase = getSupabaseClient();
  
  // Get players for this session
  const { data: playersData } = await supabase
    .from('players')
    .select('*')
    .eq('session_id', sessionId);
  const players: { [key: string]: Player } = {};
  playersData?.forEach((p: any) => {
    players[p.id] = {
      id: p.id,
      name: p.name,
      icon: p.icon,
      score: p.score || 0,
      joinedAt: p.joined_at,
    };
  });
  
  // Get submissions for this session
  const { data: submissionsData } = await supabase
    .from('submissions')
    .select('*')
    .eq('session_id', sessionId);
  const submissions: { [key: string]: any } = {};
  submissionsData?.forEach((s: any) => {
    submissions[s.player_id] = {
      id: s.id,
      playerId: s.player_id,
      imageUrl: s.image_url,
      uploadedAt: s.uploaded_at,
      votes: s.votes || [],
    };
  });
  
  return {
    adminId: stateData?.admin_id || null,
    phase: stateData?.phase || 'lobby',
    currentRound: stateData?.current_round || null,
    roundNumber: stateData?.round_number || 0,
    selectedPlayers: stateData?.selected_players || [],
    timerStartedAt: stateData?.timer_started_at || null,
    timerDuration: stateData?.timer_duration || 180,
    submissions,
    players,
    roundWinners: stateData?.round_winners || [],
    easyRoundPlayers: stateData?.easy_round_players || [],
    currentCategoryImageDescr: stateData?.current_category_image_descr || null,
  };
};

// Claim admin role (first come, first served) - for backward compatibility with 'main' session
export const claimAdmin = async (playerId: string, sessionId: string = 'main'): Promise<boolean> => {
  const supabase = getSupabaseClient();
  
  // Check if admin already exists
  const { data: existingState } = await supabase
    .from('game_state')
    .select('admin_id')
    .eq('session_id', sessionId)
    .single();
  
  if (existingState && existingState.admin_id) {
    return false; // Admin already claimed
  }
  
  // Claim admin
  const { error } = await supabase
    .from('game_state')
    .upsert({
      id: sessionId,
      session_id: sessionId,
      admin_id: playerId,
    }, { onConflict: 'id' });
  
  return !error;
};

// Add player to game
export const addPlayer = async (player: Player, sessionId: string): Promise<void> => {
  const supabase = getSupabaseClient();
  await supabase.from('players').upsert({
    id: player.id,
    session_id: sessionId,
    name: player.name,
    icon: player.icon,
    score: player.score,
    joined_at: player.joinedAt,
  });
};

// Delete a player (captain only)
export const deletePlayer = async (playerId: string, sessionId: string): Promise<void> => {
  const supabase = getSupabaseClient();
  const gameState = await getGameState(sessionId);
  
  // Prevent deleting the captain/admin
  if (gameState?.adminId === playerId) {
    throw new Error('Cannot delete the captain, matey!');
  }
  
  // Delete player's submissions first
  const { error: submissionsError } = await supabase
    .from('submissions')
    .delete()
    .eq('player_id', playerId)
    .eq('session_id', sessionId);
  
  if (submissionsError) {
    console.error('Error deleting submissions:', submissionsError);
    // Continue anyway, as cascade delete should handle this
  }
  
  // Delete the player
  const { error: playerError } = await supabase
    .from('players')
    .delete()
    .eq('id', playerId)
    .eq('session_id', sessionId);
  
  if (playerError) {
    console.error('Error deleting player:', playerError);
    throw new Error(`Failed to delete player: ${playerError.message}`);
  }
  
  // If player was in selectedPlayers, remove them from the list
  if (gameState?.selectedPlayers.includes(playerId)) {
    const updatedSelectedPlayers = gameState.selectedPlayers.filter(id => id !== playerId);
    const { error: updateError } = await supabase
      .from('game_state')
      .update({ selected_players: updatedSelectedPlayers })
      .eq('session_id', sessionId);
    
    if (updateError) {
      console.error('Error updating selected players:', updateError);
    }
  }
  
  // If player was in roundWinners, remove them from the list
  if (gameState?.roundWinners.includes(playerId)) {
    const updatedRoundWinners = gameState.roundWinners.filter(id => id !== playerId);
    const { error: updateError } = await supabase
      .from('game_state')
      .update({ round_winners: updatedRoundWinners })
      .eq('session_id', sessionId);
    
    if (updateError) {
      console.error('Error updating round winners:', updateError);
    }
  }
};

// End the game and logout captain
export const endGame = async (sessionId: string): Promise<void> => {
  const supabase = getSupabaseClient();
  
  // Set game phase to ended and clear admin
  const { error } = await supabase
    .from('game_state')
    .update({
      phase: 'game_over',
      admin_id: null,
    })
    .eq('session_id', sessionId);
  
  if (error) {
    console.error('Error ending game:', error);
    throw new Error(`Failed to end game: ${error.message}`);
  }
};

// Transfer captain role to another player
export const transferCaptain = async (newCaptainId: string, sessionId: string): Promise<void> => {
  const supabase = getSupabaseClient();
  const gameState = await getGameState(sessionId);
  
  // Verify the new captain exists
  if (!gameState?.players[newCaptainId]) {
    throw new Error('Player not found, matey!');
  }
  
  // Transfer captain role
  const { error } = await supabase
    .from('game_state')
    .update({ admin_id: newCaptainId })
    .eq('session_id', sessionId);
  
  if (error) {
    console.error('Error transferring captain:', error);
    throw new Error(`Failed to transfer captain: ${error.message}`);
  }
};

// Get game state
export const getGameState = async (sessionId: string = 'main'): Promise<GameState | null> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('game_state')
    .select('*')
    .eq('session_id', sessionId)
    .single();
  
  if (error || !data) {
    // Initialize if doesn't exist
    const defaultState = getDefaultGameState();
    await supabase.from('game_state').upsert({
      id: sessionId,
      session_id: sessionId,
      phase: defaultState.phase,
      round_number: defaultState.roundNumber,
      timer_duration: defaultState.timerDuration,
      selected_players: defaultState.selectedPlayers,
      round_winners: defaultState.roundWinners,
      easy_round_players: defaultState.easyRoundPlayers,
      current_category_image_descr: defaultState.currentCategoryImageDescr,
    });
    return defaultState;
  }
  
  return await buildGameState(data, sessionId);
};

// Subscribe to game state changes
export const subscribeToGameState = (callback: (gameState: GameState) => void, sessionId: string = 'main') => {
  const supabase = getSupabaseClient();
  
  // Initial state
  getGameState(sessionId).then(state => {
    if (state) callback(state);
  });
  
  const channel = supabase
    .channel(`game-state-changes-${sessionId}`)
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'game_state', filter: `session_id=eq.${sessionId}` },
      async () => {
        const state = await getGameState(sessionId);
        if (state) callback(state);
      }
    )
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'players', filter: `session_id=eq.${sessionId}` },
      async () => {
        const state = await getGameState(sessionId);
        if (state) callback(state);
      }
    )
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'submissions', filter: `session_id=eq.${sessionId}` },
      async () => {
        const state = await getGameState(sessionId);
        if (state) callback(state);
      }
    )
    .subscribe();
  
  return () => {
    supabase.removeChannel(channel);
  };
};

// Utility function to shuffle array
const shuffleArray = <T>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

// Select 2 random players for the round
export const selectRandomPlayers = async (sessionId: string): Promise<string[]> => {
  const gameState = await getGameState(sessionId);
  
  if (!gameState || !gameState.players) {
    return [];
  }
  
  const playerIds = Object.keys(gameState.players);
  
  // For easy round: ensure all players get a turn
  if (gameState.currentRound === 'easy') {
    // Get players who haven't played yet in easy round
    const unplayedPlayers = playerIds.filter(id => 
      !gameState.easyRoundPlayers.includes(id)
    );
    
    // If all players have played, reset and start over (shouldn't happen normally)
    if (unplayedPlayers.length === 0) {
      const nonAdminPlayers = playerIds.filter(id => id !== gameState.adminId);
      return shuffleArray(nonAdminPlayers).slice(0, 2);
    }
    
    // If odd number of unplayed players, include captain
    if (unplayedPlayers.length % 2 === 1 && gameState.adminId) {
      // Check if captain hasn't played yet
      if (!gameState.easyRoundPlayers.includes(gameState.adminId)) {
        // Include captain and one other unplayed player
        const otherPlayers = unplayedPlayers.filter(id => id !== gameState.adminId);
        if (otherPlayers.length > 0) {
          const selected = [gameState.adminId, shuffleArray(otherPlayers)[0]];
          return selected;
        }
      }
    }
    
    // Even number or captain already played - select 2 random unplayed players
    return shuffleArray(unplayedPlayers).slice(0, 2);
  }
  
  // For medium and hard rounds: select from round winners (players who advanced)
  const eligiblePlayers = gameState.roundWinners || [];
  
  if (eligiblePlayers.length < 2) {
    // Not enough players who advanced, use all players except admin
    const nonAdminPlayers = playerIds.filter(id => id !== gameState.adminId);
    return shuffleArray(nonAdminPlayers).slice(0, 2);
  }
  
  return shuffleArray(eligiblePlayers).slice(0, 2);
};

// Randomly select a category description for the round
const selectRandomCategory = async (roundType: RoundType): Promise<string | null> => {
  const supabase = getSupabaseClient();
  
  // Fetch categories that match the round type or are generic (null round_type)
  const { data: categories, error } = await supabase
    .from('categories')
    .select('*')
    .or(`round_type.eq.${roundType},round_type.is.null`);
  
  if (error || !categories || categories.length === 0) {
    console.warn('No categories found for round type:', roundType);
    return null;
  }
  
  // Randomly select one category
  const randomIndex = Math.floor(Math.random() * categories.length);
  return categories[randomIndex].image_descr;
};

// Start a new round
export const startRound = async (roundType: RoundType, sessionId: string): Promise<void> => {
  const gameState = await getGameState(sessionId);
  const supabase = getSupabaseClient();
  
  // For medium round, only allow top 4 players by score
  if (roundType === 'medium') {
    const allPlayers = Object.values(gameState?.players || {});
    // Sort by score (descending) and take top 4
    const topPlayers = allPlayers
      .filter(p => p.id !== gameState?.adminId) // Exclude captain
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 4)
      .map(p => p.id);
    
    if (topPlayers.length < 2) {
      throw new Error('Not enough players with scores to start medium round!');
    }
    
    // Update round winners to be the top 4 players (these are eligible for medium round)
    await supabase
      .from('game_state')
      .update({
        round_winners: topPlayers,
      })
      .eq('session_id', sessionId);
  }
  
  // Randomly select a category description for this round
  const categoryImageDescr = await selectRandomCategory(roundType);
  
  const selectedPlayers = await selectRandomPlayers(sessionId);
  
  await supabase
    .from('game_state')
    .update({
      phase: 'selecting_players',
      current_round: roundType,
      selected_players: selectedPlayers,
      current_category_image_descr: categoryImageDescr,
    })
    .eq('session_id', sessionId);
  
  // Clear submissions for new round (only for this session)
  if (selectedPlayers.length > 0) {
    await supabase
      .from('submissions')
      .delete()
      .in('player_id', selectedPlayers)
      .eq('session_id', sessionId);
  }
};

// Start the timer
export const startTimer = async (sessionId: string): Promise<void> => {
  const supabase = getSupabaseClient();
  await supabase
    .from('game_state')
    .update({
      phase: 'creating',
      timer_started_at: Date.now(),
    })
    .eq('session_id', sessionId);
};

// Check if both players submitted and transition to voting if so
export const checkSubmissionsAndTransition = async (sessionId: string): Promise<void> => {
  const gameState = await getGameState(sessionId);
  
  if (!gameState || gameState.phase !== 'creating') {
    return; // Only check during creating phase
  }
  
  if (gameState.selectedPlayers.length !== 2) {
    return; // Need exactly 2 players
  }
  
  // Check if both selected players have submitted
  const bothSubmitted = gameState.selectedPlayers.every(playerId => 
    gameState.submissions[playerId] !== undefined
  );
  
  if (bothSubmitted) {
    const supabase = getSupabaseClient();
    // Transition to voting phase and start 1-minute voting timer
    await supabase
      .from('game_state')
      .update({
        phase: 'voting',
        timer_started_at: Date.now(), // Start voting timer
        timer_duration: 60, // 1 minute for voting
      })
      .eq('session_id', sessionId);
  }
};

// Check if all eligible players have voted (using current game state)
export const checkAllPlayersVoted = (gameState: GameState): boolean => {
  if (!gameState || gameState.phase !== 'voting') {
    return false;
  }
  
  // Eligible voters are all players except the two selected players
  const allPlayerIds = Object.keys(gameState.players);
  const eligibleVoters = allPlayerIds.filter(
    playerId => !gameState.selectedPlayers.includes(playerId)
  );
  
  if (eligibleVoters.length === 0) {
    return false; // No eligible voters
  }
  
  // Get all unique voters from all submissions
  const allVoters = new Set<string>();
  Object.values(gameState.submissions).forEach(submission => {
    if (submission.votes) {
      submission.votes.forEach(voterId => allVoters.add(voterId));
    }
  });
  
  // Check if all eligible voters have voted
  return eligibleVoters.every(voterId => allVoters.has(voterId));
};

// Submit a vote
export const submitVote = async (voterId: string, submissionId: string, sessionId: string): Promise<void> => {
  const supabase = getSupabaseClient();
  
  // Get current game state first
  const gameState = await getGameState(sessionId);
  if (!gameState || gameState.phase !== 'voting') {
    return; // Not in voting phase
  }
  
  const { data: submission } = await supabase
    .from('submissions')
    .select('votes, player_id')
    .eq('id', submissionId)
    .single();
  
  if (submission) {
    const votes = submission.votes || [];
    if (!votes.includes(voterId)) {
      votes.push(voterId);
      await supabase
        .from('submissions')
        .update({ votes })
        .eq('id', submissionId);
      
      // Update local game state with the new vote to check immediately
      const updatedSubmissions = { ...gameState.submissions };
      if (updatedSubmissions[submission.player_id]) {
        updatedSubmissions[submission.player_id] = {
          ...updatedSubmissions[submission.player_id],
          votes: votes,
        };
      }
      const updatedGameState = {
        ...gameState,
        submissions: updatedSubmissions,
      };
      
      // Check if all players have voted - if so, consolidate scores immediately
      const allVoted = checkAllPlayersVoted(updatedGameState);
      if (allVoted) {
        // Stop the timer and consolidate scores
        await supabase
          .from('game_state')
          .update({
            timer_started_at: null, // Stop the timer
          })
          .eq('session_id', sessionId);
        
        // Consolidate scores immediately
        await consolidateVotingScores(sessionId);
      }
    }
  }
};

// Calculate round winner
export const calculateRoundWinner = async (sessionId: string): Promise<string | null> => {
  const gameState = await getGameState(sessionId);
  
  if (!gameState || !gameState.submissions) {
    return null;
  }
  
  let maxVotes = 0;
  let winnerId: string | null = null;
  
  Object.entries(gameState.submissions).forEach(([playerId, submission]) => {
    const voteCount = submission.votes?.length || 0;
    if (voteCount > maxVotes) {
      maxVotes = voteCount;
      winnerId = playerId;
    }
  });
  
  return winnerId;
};

// Advance winner to next round
export const advanceWinner = async (winnerId: string, sessionId: string): Promise<void> => {
  const gameState = await getGameState(sessionId);
  const supabase = getSupabaseClient();
  
  const roundWinners = [...(gameState?.roundWinners || []), winnerId];
  
  // Track players who played in easy round
  let easyRoundPlayers = [...(gameState?.easyRoundPlayers || [])];
  if (gameState?.currentRound === 'easy') {
    // Add both selected players to easy round players list
    gameState.selectedPlayers.forEach(playerId => {
      if (!easyRoundPlayers.includes(playerId)) {
        easyRoundPlayers.push(playerId);
      }
    });
  }
  
  const { error: updateError } = await supabase
    .from('game_state')
    .update({
      phase: 'results',
      round_winners: roundWinners,
      easy_round_players: easyRoundPlayers,
    })
    .eq('session_id', sessionId);
  
  // If error is about missing column, retry without easy_round_players
  if (updateError && (
    updateError.message?.toLowerCase().includes('easy_round_players') ||
    updateError.message?.toLowerCase().includes('could not find') ||
    updateError.message?.toLowerCase().includes('column') && updateError.message?.toLowerCase().includes('game_state') ||
    updateError.code === '42703'
  )) {
    console.warn('easy_round_players column not found, updating without it...');
    await supabase
      .from('game_state')
      .update({
        phase: 'results',
        round_winners: roundWinners,
      })
      .eq('session_id', sessionId);
  } else if (updateError) {
    console.error('Error advancing winner:', updateError);
    throw new Error(`Failed to advance winner: ${updateError.message}`);
  }
};

// Consolidate scores when voting timer completes
export const consolidateVotingScores = async (sessionId: string): Promise<void> => {
  const gameState = await getGameState(sessionId);
  const supabase = getSupabaseClient();
  
  if (!gameState || gameState.phase !== 'voting') {
    return; // Only consolidate during voting phase
  }
  
  const winnerId = await calculateRoundWinner(sessionId);
  
  if (!winnerId) {
    // No votes, pick first player as default or handle tie
    // For now, just advance to results without a winner
    await supabase
      .from('game_state')
      .update({
        phase: 'results',
        timer_started_at: null, // Stop the timer
      })
      .eq('session_id', sessionId);
    return;
  }
  
  // Update winner's score
  const winner = gameState.players[winnerId];
  if (winner) {
    await supabase
      .from('players')
      .update({ score: (winner.score || 0) + 1 })
      .eq('id', winnerId)
      .eq('session_id', sessionId);
  }
  
  // Advance winner to results phase
  await advanceWinner(winnerId, sessionId);
};

// Reset game
export const resetGame = async (sessionId: string): Promise<void> => {
  const supabase = getSupabaseClient();
  const gameState = await getGameState(sessionId);
  
  const defaultState = getDefaultGameState();
  
  // Combine all updates into a single operation to avoid race conditions
  // Start with essential fields that should always exist
  const updateData: any = {
    phase: defaultState.phase,
    current_round: null,
    round_number: 0,
    selected_players: [],
    timer_started_at: null,
    timer_duration: defaultState.timerDuration, // Reset to 180 seconds
    round_winners: [],
    current_category_image_descr: null,
  };
  
  // Keep admin if it exists
  if (gameState?.adminId) {
    updateData.admin_id = gameState.adminId;
  }
  
  // Try update with easy_round_players first (if column exists)
  let updateError = null;
  const { error: errorWithEasyRound } = await supabase
    .from('game_state')
    .update({
      ...updateData,
      easy_round_players: [],
      current_round: null, // Explicitly ensure null
    })
    .eq('session_id', sessionId);
  
  // If error is about missing column, retry without easy_round_players
  // Check for various error message patterns that indicate missing column
  const isMissingColumnError = errorWithEasyRound && (
    errorWithEasyRound.message?.toLowerCase().includes('easy_round_players') ||
    errorWithEasyRound.message?.toLowerCase().includes('could not find') ||
    errorWithEasyRound.message?.toLowerCase().includes('column') && errorWithEasyRound.message?.toLowerCase().includes('game_state') ||
    errorWithEasyRound.code === '42703' // PostgreSQL error code for undefined column
  );
  
  if (isMissingColumnError) {
    console.warn('easy_round_players column not found, updating without it...');
    const { error: errorWithoutEasyRound } = await supabase
      .from('game_state')
      .update({
        ...updateData,
        current_round: null, // Explicitly ensure null
      })
      .eq('session_id', sessionId);
    updateError = errorWithoutEasyRound;
  } else {
    updateError = errorWithEasyRound;
  }
  
  if (updateError) {
    console.error('Error resetting game state:', updateError);
    throw new Error(`Failed to reset game: ${updateError.message}`);
  }
  
  // Verify the update by reading back the state
  const { data: verifyData } = await supabase
    .from('game_state')
    .select('current_round, phase')
    .eq('session_id', sessionId)
    .single();
  
  if (verifyData && verifyData.current_round !== null) {
    // If still not null, force it one more time
    console.warn('current_round was not null after update, forcing to null...');
    await supabase
      .from('game_state')
      .update({ current_round: null })
      .eq('session_id', sessionId);
  }
  
  // Delete all players except the admin (for this session)
  if (gameState?.adminId) {
    await supabase
      .from('players')
      .delete()
      .neq('id', gameState.adminId)
      .eq('session_id', sessionId);
  } else {
    // If no admin, delete all players for this session
    await supabase
      .from('players')
      .delete()
      .eq('session_id', sessionId);
  }
  
  // Clear all submissions for this session
  await supabase
    .from('submissions')
    .delete()
    .eq('session_id', sessionId);
};

// Complete reset - clears EVERYTHING including admin (captain only)
export const completeReset = async (sessionId: string, captainId: string): Promise<void> => {
  const supabase = getSupabaseClient();
  
  // Verify the user is the captain
  const gameState = await getGameState(sessionId);
  if (!gameState || gameState.adminId !== captainId) {
    throw new Error('Only the captain can perform a complete reset!');
  }
  
  const defaultState = getDefaultGameState();
  
  // Reset game state completely (including clearing admin)
  // Try with easy_round_players first, fallback if column doesn't exist
  const updateData = {
    phase: defaultState.phase,
    current_round: null,
    round_number: 0,
    selected_players: [],
    timer_started_at: null,
    timer_duration: defaultState.timerDuration,
    round_winners: [],
    easy_round_players: [],
    current_category_image_descr: null,
    admin_id: null, // Clear admin too
  };
  
  const { error: stateErrorWithColumn } = await supabase
    .from('game_state')
    .update(updateData)
    .eq('session_id', sessionId);
  
  // Check if error is about missing column
  const isMissingColumnError = stateErrorWithColumn && (
    stateErrorWithColumn.message?.toLowerCase().includes('easy_round_players') ||
    stateErrorWithColumn.message?.toLowerCase().includes('could not find') ||
    stateErrorWithColumn.message?.toLowerCase().includes('column') && stateErrorWithColumn.message?.toLowerCase().includes('game_state') ||
    stateErrorWithColumn.code === '42703' // PostgreSQL error code for undefined column
  );
  
  let stateError = stateErrorWithColumn;
  if (isMissingColumnError) {
    console.warn('easy_round_players column not found, updating without it...');
    // Retry without easy_round_players
    const updateDataWithoutColumn = {
      phase: updateData.phase,
      current_round: updateData.current_round,
      round_number: updateData.round_number,
      selected_players: updateData.selected_players,
      timer_started_at: updateData.timer_started_at,
      timer_duration: updateData.timer_duration,
      round_winners: updateData.round_winners,
      current_category_image_descr: updateData.current_category_image_descr,
      admin_id: updateData.admin_id,
    };
    const { error: stateErrorWithoutColumn } = await supabase
      .from('game_state')
      .update(updateDataWithoutColumn)
      .eq('session_id', sessionId);
    stateError = stateErrorWithoutColumn;
  }
  
  if (stateError) {
    console.error('Error resetting game state:', stateError);
    throw new Error(`Failed to reset game state: ${stateError.message}`);
  }
  
  // Delete ALL players for this session
  const { error: playersError } = await supabase
    .from('players')
    .delete()
    .eq('session_id', sessionId);
  
  if (playersError) {
    console.error('Error deleting players:', playersError);
    throw new Error(`Failed to delete players: ${playersError.message}`);
  }
  
  // Clear ALL submissions for this session
  const { error: submissionsError } = await supabase
    .from('submissions')
    .delete()
    .eq('session_id', sessionId);
  
  if (submissionsError) {
    console.error('Error deleting submissions:', submissionsError);
    // Don't throw, as this is less critical
  }
};
