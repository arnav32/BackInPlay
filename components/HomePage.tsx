'use client';

import React, { useState, useEffect } from 'react';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';

interface Phase {
  name: 'ready' | 'raise' | 'hold' | 'lower';
  duration: number;
}

interface Exercise {
  id: string;
  name: string;
  description: string;
  ailments: string[];
  video_url: string;
  tracked_joint: string;
  resting_angle: number;
  target_angle: number;
  tolerance: number;
  phases: Phase[];
  instructions: string;
}

interface HomePageProps {
  onExerciseSelected: (exercise: Exercise) => void;
}

export default function HomePage({ onExerciseSelected }: HomePageProps) {
  const [painDescription, setPainDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    isListening,
    transcript,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition();

  const handleVoiceToggle = () => {
    if (isListening) {
      stopListening();
      setPainDescription((prev) => prev + transcript);
      resetTranscript();
    } else {
      resetTranscript();
      startListening();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const description = painDescription + (isListening ? transcript : '');
    if (!description.trim()) {
      setError('Please describe your pain or injury');
      return;
    }

    if (isListening) {
      stopListening();
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/selectExercise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ painDescription: description }),
      });

      const data = await response.json();

      if (data.success && data.exercise) {
        onExerciseSelected(data.exercise);
      } else {
        setError(data.message || 'No matching exercise found. Try describing your symptoms differently.');
      }
    } catch {
      setError('Failed to find an exercise. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const displayText = painDescription + (isListening ? transcript : '');

  return (
    <div className="page page--home">
      <header className="brand-header">
        <h1 className="brand-title">BackInPlay</h1>
        <p className="brand-tagline">Your AI-powered physiotherapy coach</p>
      </header>

      <div className="intake-card">
        <h2 className="intake-title">Tell us about your pain</h2>
        <p className="intake-subtitle">
          Describe your injury, pain location, or what's bothering you. You can type or use voice input.
        </p>

        <form onSubmit={handleSubmit} className="intake-form">
          <div className="input-group">
            <textarea
              value={displayText}
              onChange={(e) => {
                if (!isListening) {
                  setPainDescription(e.target.value);
                }
              }}
              placeholder="e.g., I have shoulder pain when I raise my arm, my knee hurts after running, I injured my elbow playing tennis..."
              className="pain-input"
              rows={4}
              disabled={isListening}
            />

            {isSupported && (
              <button
                type="button"
                onClick={handleVoiceToggle}
                className={`voice-btn ${isListening ? 'voice-btn--active' : ''}`}
                aria-label={isListening ? 'Stop recording' : 'Start voice input'}
              >
                {isListening ? (
                  <span className="voice-icon voice-icon--recording">●</span>
                ) : (
                  <span className="voice-icon">🎤</span>
                )}
              </button>
            )}
          </div>

          {isListening && (
            <p className="listening-indicator">Listening... speak now</p>
          )}

          {error && <p className="error-message">{error}</p>}

          <button
            type="submit"
            className="btn btn-primary btn-large"
            disabled={isLoading || (!displayText.trim() && !isListening)}
          >
            {isLoading ? 'Finding your exercise...' : 'Get My Exercise'}
          </button>
        </form>

        <div className="examples">
          <p className="examples-title">Examples:</p>
          <div className="example-chips">
            <button
              type="button"
              className="chip"
              onClick={() => setPainDescription('My shoulder hurts when I lift my arm overhead')}
            >
              Shoulder pain
            </button>
            <button
              type="button"
              className="chip"
              onClick={() => setPainDescription('I have knee pain after running and it feels stiff')}
            >
              Knee pain
            </button>
            <button
              type="button"
              className="chip"
              onClick={() => setPainDescription('My lower back aches and my hip feels tight')}
            >
              Hip/back pain
            </button>
            <button
              type="button"
              className="chip"
              onClick={() => setPainDescription('I have tennis elbow and pain in my forearm')}
            >
              Elbow pain
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
