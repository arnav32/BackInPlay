'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Results } from '@mediapipe/pose';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { POSE_CONNECTIONS } from '@mediapipe/pose';
import { usePoseDetection } from '@/hooks/usePoseDetection';
import { useElevenLabs } from '@/hooks/useElevenLabs';
import { calculateKeyAngles } from '@/utils/referenceVideoProcessor';
import {
  scoreExercise,
  generateCoachingText,
  type ScoreResult,
  type ExerciseConfig,
  type Phase,
} from '@/utils/poseScorer';

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

interface ExercisePageProps {
  exercise: Exercise;
  onBack: () => void;
}

export default function ExercisePage({ exercise, onBack }: ExercisePageProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const demoVideoRef = useRef<HTMLVideoElement>(null);

  const [exerciseStarted, setExerciseStarted] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [restCountdown, setRestCountdown] = useState<number | null>(null);
  const [repCount, setRepCount] = useState(0);
  const [currentScore, setCurrentScore] = useState<ScoreResult>({
    overallScore: 50,
    currentPhase: 'ready',
    expectedAngle: 0,
    currentAngle: 0,
    feedback: 'Get ready...',
    phaseProgress: 0,
    cycleProgress: 0,
  });
  const [displayedScore, setDisplayedScore] = useState(50);
  const [coachingText, setCoachingText] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  const { speak, speakCountdown, isSpeaking } = useElevenLabs();
  const latestPoseRef = useRef<Results | null>(null);
  const lastCoachTimeRef = useRef<number>(0);
  const exerciseStartTimeRef = useRef<number>(0);
  const lastCycleRef = useRef<number>(0);
  const restPausedTimeRef = useRef<number>(0);
  const lastScoreUpdateRef = useRef<number>(0);

  // Build exercise config from the exercise data
  const exerciseConfig: ExerciseConfig = {
    tracked_joint: exercise.tracked_joint,
    resting_angle: exercise.resting_angle,
    target_angle: exercise.target_angle,
    tolerance: exercise.tolerance,
    phases: exercise.phases,
  };

  // Timer to track elapsed time
  useEffect(() => {
    if (!exerciseStarted) return;
    
    exerciseStartTimeRef.current = Date.now();
    
    const interval = setInterval(() => {
      const elapsed = (Date.now() - exerciseStartTimeRef.current) / 1000;
      setElapsedTime(elapsed);
    }, 100);
    
    return () => clearInterval(interval);
  }, [exerciseStarted]);

  // Calculate cycle duration
  const cycleDuration = exercise.phases.reduce((sum, p) => sum + p.duration, 0);

  // Smooth score updates - only update displayed score every 500ms
  useEffect(() => {
    const now = Date.now();
    if (now - lastScoreUpdateRef.current > 500) {
      setDisplayedScore(currentScore.overallScore);
      lastScoreUpdateRef.current = now;
    }
  }, [currentScore.overallScore]);

  const onResults = useCallback(
    (results: Results) => {
      latestPoseRef.current = results;
      if (!results.poseLandmarks || !exerciseStarted || restCountdown !== null) return;

      try {
        const userAngles = calculateKeyAngles(results.poseLandmarks);
        const elapsed = (Date.now() - exerciseStartTimeRef.current) / 1000;
        const scoreResult = scoreExercise(userAngles, exerciseConfig, elapsed);
        setCurrentScore(scoreResult);

        // Detect cycle completion (when we wrap back to start)
        const currentCycle = Math.floor(elapsed / cycleDuration);
        if (currentCycle > lastCycleRef.current) {
          // Completed a rep - trigger rest
          lastCycleRef.current = currentCycle;
          setRepCount((prev) => prev + 1);
          restPausedTimeRef.current = Date.now();
          setRestCountdown(5);
          return;
        }

        // Generate coaching if score < 85 and not speaking
        if (scoreResult.overallScore < 85 && !isSpeaking) {
          const now = Date.now();
          // Coach at most every 3 seconds
          if (now - lastCoachTimeRef.current > 3000) {
            const coaching = generateCoachingText(scoreResult);
            if (coaching) {
              setCoachingText(coaching);
              speak(coaching);
              lastCoachTimeRef.current = now;
            }
          }
        } else if (scoreResult.overallScore >= 85) {
          setCoachingText(null);
        }
      } catch {
        // Ignore
      }
    },
    [exerciseConfig, exerciseStarted, restCountdown, cycleDuration, speak, isSpeaking]
  );

  // Rest countdown effect
  useEffect(() => {
    if (restCountdown === null) return;
    
    if (restCountdown === 0) {
      // Rest finished, resume exercise
      speakCountdown('Go!');
      // Adjust start time to account for rest period
      const restDuration = (Date.now() - restPausedTimeRef.current) / 1000;
      exerciseStartTimeRef.current += restDuration * 1000;
      setRestCountdown(null);
      return;
    }
    
    // Speak the rest countdown
    if (restCountdown === 5) {
      speakCountdown(`Rep ${repCount} complete! Rest.`);
    } else {
      speakCountdown(String(restCountdown));
    }
    
    const timer = setTimeout(() => {
      setRestCountdown(restCountdown - 1);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [restCountdown, repCount, speakCountdown]);

  const { isReady } = usePoseDetection(videoRef, onResults);

  // Draw loop
  useEffect(() => {
    if (!isReady || !canvasRef.current || !videoRef.current) return;
    let rafId: number;
    const draw = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) {
        rafId = requestAnimationFrame(draw);
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        rafId = requestAnimationFrame(draw);
        return;
      }
      const { width, height } = canvas;
      ctx.save();
      ctx.clearRect(0, 0, width, height);
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
      if (video.videoWidth > 0) {
        ctx.drawImage(video, 0, 0, width, height);
      }
      const pose = latestPoseRef.current;
      if (pose?.poseLandmarks) {
        drawConnectors(ctx, pose.poseLandmarks, POSE_CONNECTIONS, {
          color: '#00FF00',
          lineWidth: 4,
        });
        drawLandmarks(ctx, pose.poseLandmarks, {
          color: '#FF0000',
          lineWidth: 2,
        });
      }
      ctx.restore();
      rafId = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(rafId);
  }, [isReady]);

  const handleStartExercise = () => {
    // Start countdown
    setCountdown(5);
  };

  // Countdown effect
  useEffect(() => {
    if (countdown === null) return;
    
    if (countdown === 0) {
      // Countdown finished, start the exercise
      speakCountdown('Go!');
      setCountdown(null);
      setExerciseStarted(true);
      if (demoVideoRef.current) {
        demoVideoRef.current.play();
      }
      return;
    }
    
    // Speak the countdown number (skip "Get ready" to avoid overlap)
    if (countdown <= 4) {
      speakCountdown(String(countdown));
    }
    
    // Tick down every second
    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [countdown, speakCountdown]);

  // Loop demo video
  useEffect(() => {
    const video = demoVideoRef.current;
    if (!video || !exerciseStarted) return;

    const handleEnded = () => {
      video.currentTime = 0;
      video.play();
    };

    video.addEventListener('ended', handleEnded);
    return () => video.removeEventListener('ended', handleEnded);
  }, [exerciseStarted]);

  const getScoreClass = (score: number) => {
    if (score >= 85) return 'score-circle--good';
    if (score >= 60) return 'score-circle--warning';
    return 'score-circle--bad';
  };

  return (
    <div className="page page--exercise">
      {/* Top bar with back button and brand */}
      <div className="exercise-topbar">
        <button onClick={onBack} className="back-btn">
          ← Back
        </button>
        <div className="brand-header">
          <h1 className="brand-title">BackInPlay</h1>
          <p className="brand-tagline">Smart form coach for your recovery</p>
        </div>
        <div className="exercise-info-inline">
          <span className="exercise-name-inline">{exercise.name}</span>
          <span className="exercise-instructions-inline">{exercise.instructions}</span>
        </div>
      </div>

      {/* Main content area */}
      <div className="exercise-main">
        {/* Left: Demo Video */}
        <div className="panel panel--demo">
          <h2 className="section-title">Watch & Follow</h2>
          <div className="panel-video">
            <video
              ref={demoVideoRef}
              src={exercise.video_url}
              muted
              playsInline
              loop
            />
          </div>
        </div>

        {/* Center: User Camera */}
        <div className="panel panel--camera">
          <h2 className="section-title">Your Form</h2>
          <div className="canvas-wrap canvas-wrap--camera">
            <video
              ref={videoRef}
              className="camera-video-hidden"
              width={640}
              height={480}
              playsInline
              muted
            />
            <canvas ref={canvasRef} width={640} height={480} />
            {!isReady && <div className="loading-overlay">Loading camera...</div>}
            
            {/* Countdown overlay */}
            {countdown !== null && (
              <div className="countdown-overlay">
                <div className="countdown-content">
                  <p className="countdown-label">Get Ready!</p>
                  <div className="countdown-number">{countdown}</div>
                  <p className="countdown-hint">Position yourself in frame</p>
                </div>
              </div>
            )}
            
            {/* Rest overlay between reps */}
            {restCountdown !== null && (
              <div className="countdown-overlay rest-overlay">
                <div className="countdown-content">
                  <p className="rest-rep-count">Rep {repCount} Complete!</p>
                  <p className="countdown-label">Rest</p>
                  <div className="countdown-number">{restCountdown}</div>
                  <p className="countdown-hint">Relax and breathe</p>
                </div>
              </div>
            )}
          </div>
          {!exerciseStarted && countdown === null && (
            <button
              onClick={handleStartExercise}
              disabled={!isReady}
              className="btn btn-success"
            >
              Start Exercise
            </button>
          )}
          {countdown !== null && (
            <p className="countdown-status">Starting in {countdown}...</p>
          )}
        </div>

        {/* Right: Coaching panel */}
        <div className={`panel panel--coaching ${exerciseStarted ? '' : 'panel--hidden'}`}>
          <h2 className="section-title">Coaching</h2>
          
          {exerciseStarted ? (
            <>
              {/* Rep counter */}
              <div className="rep-counter">
                <span className="rep-label">Rep</span>
                <span className="rep-number">{repCount + 1}</span>
              </div>

              <div className="score-display">
                <div className={`score-circle ${getScoreClass(displayedScore)}`}>
                  {displayedScore}
                </div>
                <div>
                  <p className="score-label">Form Score</p>
                  <p className="score-text">
                    {displayedScore >= 85
                      ? 'Great form!'
                      : displayedScore >= 60
                      ? 'Minor adjustments'
                      : 'Needs work'}
                  </p>
                </div>
              </div>

              {coachingText && (
                <div className="feedback-item feedback-major">
                  <strong>Coach:</strong> {coachingText}
                  {isSpeaking && <span className="speaking-icon">🔊</span>}
                </div>
              )}

              {displayedScore >= 85 && (
                <div className="feedback-item feedback-good">
                  Excellent form! Keep going!
                </div>
              )}
            </>
          ) : (
            <p className="coaching-placeholder">Start the exercise to see coaching</p>
          )}
        </div>
      </div>

      {/* Bottom: Phase timeline indicator */}
      {exerciseStarted && (
        <div className="phase-timeline">
          <div className="phase-timeline-bar">
            <div 
              className="phase-timeline-progress" 
              style={{ width: `${currentScore.cycleProgress * 100}%` }}
            />
          </div>
          <div className="phase-timeline-labels">
            {exercise.phases.map((phase, idx) => {
              // Calculate the position of each phase
              const phasesBeforeWidth = exercise.phases
                .slice(0, idx)
                .reduce((sum, p) => sum + p.duration, 0) / cycleDuration * 100;
              const phaseWidth = phase.duration / cycleDuration * 100;
              
              return (
                <div 
                  key={idx}
                  className={`phase-timeline-item ${currentScore.currentPhase === phase.name ? 'phase-timeline-item--active' : ''}`}
                  style={{ 
                    left: `${phasesBeforeWidth}%`,
                    width: `${phaseWidth}%`
                  }}
                >
                  <span className="phase-timeline-name">
                    {phase.name.charAt(0).toUpperCase() + phase.name.slice(1)}
                  </span>
                  <span className="phase-timeline-duration">{phase.duration}s</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
