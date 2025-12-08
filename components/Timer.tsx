'use client';

import { useEffect, useState, useRef } from 'react';
import { GamePhase, GameState } from '@/types/game';
import { checkAllPlayersVoted } from '@/lib/gameLogic';

interface TimerProps {
  startedAt: number | null;
  duration: number; // in seconds
  onComplete?: () => void;
  phase?: GamePhase; // 'creating' or 'voting'
  gameState?: GameState | null; // Game state to check if all players have voted
}

// Audio context for generating sounds
let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

// Generate ticking sound
function playTick() {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.1);
  } catch (error) {
    console.error('Error playing tick:', error);
  }
}

// Generate upload buzz sound (lower, more urgent)
function playUploadBuzz() {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.value = 200;
    oscillator.type = 'sawtooth';
    
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.5);
    
    // Add frequency modulation for buzz effect
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.connect(lfoGain);
    lfoGain.connect(oscillator.frequency);
    lfo.frequency.value = 5;
    lfoGain.gain.value = 50;
    
    lfo.start(ctx.currentTime);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 1.5);
    lfo.stop(ctx.currentTime + 1.5);
  } catch (error) {
    console.error('Error playing upload buzz:', error);
  }
}

// Generate voting buzz sound (higher, more alert)
function playVotingBuzz() {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.value = 400;
    oscillator.type = 'square';
    
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.5);
    
    // Add frequency modulation for buzz effect
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.connect(lfoGain);
    lfoGain.connect(oscillator.frequency);
    lfo.frequency.value = 8;
    lfoGain.gain.value = 100;
    
    lfo.start(ctx.currentTime);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 1.5);
    lfo.stop(ctx.currentTime + 1.5);
  } catch (error) {
    console.error('Error playing voting buzz:', error);
  }
}

// Generate jeopardy-style suspenseful music
function playJeopardyMusic() {
  try {
    const ctx = getAudioContext();
    // Suspenseful ascending pattern (like Jeopardy theme)
    const notes = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25, 587.33, 659.25]; // C major scale extended
    let currentNote = 0;
    
    const playNote = () => {
      if (currentNote >= notes.length) {
        currentNote = 0; // Loop
      }
      
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.frequency.value = notes[currentNote];
      oscillator.type = 'triangle';
      
      const noteStartTime = ctx.currentTime;
      const noteDuration = 0.5;
      
      gainNode.gain.setValueAtTime(0.08, noteStartTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, noteStartTime + noteDuration);
      
      oscillator.start(noteStartTime);
      oscillator.stop(noteStartTime + noteDuration);
      
      currentNote++;
    };
    
    // Play notes in sequence
    const interval = setInterval(playNote, 600);
    playNote(); // Start immediately
    
    return () => clearInterval(interval);
  } catch (error) {
    console.error('Error playing jeopardy music:', error);
    return () => {};
  }
}

export default function Timer({ startedAt, duration, onComplete, phase, gameState }: TimerProps) {
  const [timeLeft, setTimeLeft] = useState<number>(duration);
  const tickIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const musicIntervalRef = useRef<(() => void) | null>(null);
  const jeopardyAudioRef = useRef<HTMLAudioElement | null>(null);
  const votingAudioRef = useRef<HTMLAudioElement | null>(null);
  const lastSecondRef = useRef<number>(duration);
  const hasPlayedBuzzRef = useRef<boolean>(false);

  // Initialize audio elements once
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!jeopardyAudioRef.current) {
        jeopardyAudioRef.current = new Audio('/jeopardy-themelq.mp3');
        jeopardyAudioRef.current.volume = 0.4;
        jeopardyAudioRef.current.loop = true;
      }
      if (!votingAudioRef.current) {
        votingAudioRef.current = new Audio('/Lyrics_trimmed.mp3');
        votingAudioRef.current.volume = 0.4;
        votingAudioRef.current.loop = true;
      }
    }
  }, []);

  useEffect(() => {
    // Cleanup function that always runs
    const cleanup = () => {
      if (tickIntervalRef.current) {
        clearInterval(tickIntervalRef.current);
        tickIntervalRef.current = null;
      }
      if (musicIntervalRef.current) {
        musicIntervalRef.current();
        musicIntervalRef.current = null;
      }
      if (jeopardyAudioRef.current) {
        jeopardyAudioRef.current.pause();
        jeopardyAudioRef.current.currentTime = 0;
      }
      if (votingAudioRef.current) {
        votingAudioRef.current.pause();
        votingAudioRef.current.currentTime = 0;
      }
    };

    if (!startedAt) {
      setTimeLeft(duration);
      lastSecondRef.current = duration;
      hasPlayedBuzzRef.current = false;
      // Stop all sounds and intervals immediately
      cleanup();
      return cleanup;
    }

    // Stop synthesized music if it's playing
    if (musicIntervalRef.current) {
      musicIntervalRef.current();
      musicIntervalRef.current = null;
    }

    // Stop ticking sounds
    if (tickIntervalRef.current) {
      clearInterval(tickIntervalRef.current);
      tickIntervalRef.current = null;
    }

    // Play actual jeopardy sound when timer starts (only for creating phase)
    if (phase === 'creating' && startedAt && jeopardyAudioRef.current) {
      // Only start playing if not already playing
      if (jeopardyAudioRef.current.paused) {
        jeopardyAudioRef.current.currentTime = 0;
        jeopardyAudioRef.current.play().catch((error) => {
          console.error('Error playing jeopardy sound:', error);
        });
      }
    }

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const remaining = Math.max(0, duration - elapsed);
      
      setTimeLeft(remaining);
      
      // Play buzz sound when timer reaches 0
      if (remaining === 0 && !hasPlayedBuzzRef.current) {
        hasPlayedBuzzRef.current = true;
        
        // Stop music
        if (musicIntervalRef.current) {
          musicIntervalRef.current();
          musicIntervalRef.current = null;
        }
        
        // Stop ticking
        if (tickIntervalRef.current) {
          clearInterval(tickIntervalRef.current);
          tickIntervalRef.current = null;
        }
        
        // Stop voting sound when voting timer ends
        if (phase === 'voting' && votingAudioRef.current) {
          votingAudioRef.current.pause();
          votingAudioRef.current.currentTime = 0;
        }
        
        // Play appropriate buzz sound based on phase
        if (phase === 'creating') {
          playUploadBuzz();
        } else if (phase === 'voting') {
          playVotingBuzz();
        }
        
        if (onComplete) {
          onComplete();
        }
        clearInterval(interval);
      }
    }, 100);

    return () => {
      clearInterval(interval);
      cleanup();
    };
  }, [startedAt, duration, onComplete, phase]);

  // Handle phase transitions for audio
  useEffect(() => {
    if (phase === 'voting') {
      // Stop jeopardy sound when voting starts
      if (jeopardyAudioRef.current) {
        jeopardyAudioRef.current.pause();
        jeopardyAudioRef.current.currentTime = 0;
      }
      
      // Start voting music when voting starts
      // The music will loop automatically (loop=true) until all players vote or time expires
      if (votingAudioRef.current && startedAt && timeLeft > 0) {
        // Only start playing if not already playing
        if (votingAudioRef.current.paused) {
          votingAudioRef.current.currentTime = 0;
          votingAudioRef.current.play().catch((error) => {
            console.error('Error playing voting sound:', error);
          });
        }
      }
    } else if (phase !== 'creating') {
      // Stop voting sound when voting phase ends (transition to results, lobby, etc.)
      if (votingAudioRef.current) {
        votingAudioRef.current.pause();
        votingAudioRef.current.currentTime = 0;
      }
    }
  }, [phase, startedAt, timeLeft]);
  
  // Check if all players have voted and stop music accordingly
  // Loop if one minute is not yet over and voting is not yet over
  useEffect(() => {
    if (phase === 'voting' && gameState && startedAt) {
      const allVoted = checkAllPlayersVoted(gameState);
      if (allVoted && votingAudioRef.current && !votingAudioRef.current.paused) {
        // Stop music when all players have voted
        votingAudioRef.current.pause();
        votingAudioRef.current.currentTime = 0;
      } else if (!allVoted && timeLeft > 0 && votingAudioRef.current && votingAudioRef.current.paused) {
        // Resume playing if not all voted and time is still remaining (loop continues)
        votingAudioRef.current.play().catch((error) => {
          console.error('Error playing voting sound:', error);
        });
      }
    }
  }, [gameState, phase, startedAt, timeLeft]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (jeopardyAudioRef.current) {
        jeopardyAudioRef.current.pause();
        jeopardyAudioRef.current = null;
      }
      if (votingAudioRef.current) {
        votingAudioRef.current.pause();
        votingAudioRef.current = null;
      }
    };
  }, []);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const percentage = ((duration - timeLeft) / duration) * 100;
  const isLow = timeLeft <= 30;
  const isVeryLow = timeLeft <= 10;

  return (
    <div className="text-center">
      <div className={`text-6xl font-bold mb-4 transition-colors ${
        isVeryLow ? 'text-red-600 animate-pulse' : 
        isLow ? 'text-orange-500' : 
        'text-banana-600'
      }`}>
        {minutes}:{seconds.toString().padStart(2, '0')}
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${
            isVeryLow ? 'bg-red-600' :
            isLow ? 'bg-orange-500' :
            'bg-banana-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      
      <p className="text-sm text-gray-600 mt-2">
        {startedAt 
          ? phase === 'voting' ? '⏱️ Voting time...' : '⏱️ Creating time...'
          : '⏳ Ready to start'}
      </p>
    </div>
  );
}

