'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Results } from '@mediapipe/pose';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { POSE_CONNECTIONS } from '@mediapipe/pose';
import { usePoseDetection } from '@/hooks/usePoseDetection';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import {
  processReferenceVideo,
  calculateKeyAngles,
  KeyFrame,
} from '@/utils/referenceVideoProcessor';
import {
  comparePoses,
  findClosestKeyframe,
  Feedback,
} from '@/utils/feedbackGenerator';

export default function PhysioExercise() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const referenceVideoRef = useRef<HTMLVideoElement>(null);

  const [keyframes, setKeyframes] = useState<KeyFrame[]>([]);
  const [isProcessingReference, setIsProcessingReference] = useState(false);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [exerciseStarted, setExerciseStarted] = useState(false);
  const [referenceVideoTime, setReferenceVideoTime] = useState(0);

  const { speak } = useTextToSpeech();
  const latestPoseRef = useRef<Results | null>(null);

  const onResults = useCallback(
    (results: Results) => {
      latestPoseRef.current = results;
      if (!results.poseLandmarks) return;
      try {
        if (keyframes.length > 0 && exerciseStarted) {
          const userAngles = calculateKeyAngles(results.poseLandmarks);
          const closestKeyframe = findClosestKeyframe(keyframes, referenceVideoTime);
          const newFeedback = comparePoses(userAngles, closestKeyframe);
          setFeedback(newFeedback);
          const majorIssues = newFeedback.filter((f) => f.severity === 'major');
          if (majorIssues.length > 0) {
            speak(majorIssues[0].message);
          } else if (newFeedback[0]?.severity === 'good') {
            speak(newFeedback[0].message, 5000);
          }
        }
      } catch {
        // Ignore
      }
    },
    [keyframes, exerciseStarted, referenceVideoTime, speak]
  );

  const { isReady } = usePoseDetection(videoRef, onResults);

  // Single draw loop: video + skeleton so feed always shows
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

  const handleProcessReference = async () => {
    if (!referenceVideoRef.current) return;
    
    setIsProcessingReference(true);
    const frames = await processReferenceVideo(referenceVideoRef.current);
    setKeyframes(frames);
    setIsProcessingReference(false);
    
    // Reset video to start
    referenceVideoRef.current.currentTime = 0;
  };

  const handleStartExercise = () => {
    if (!referenceVideoRef.current || !keyframes.length) return;
    
    setExerciseStarted(true);
    referenceVideoRef.current.play();
  };

  // Sync reference video time
  useEffect(() => {
    if (!referenceVideoRef.current || !exerciseStarted) return;

    const interval = setInterval(() => {
      if (referenceVideoRef.current) {
        setReferenceVideoTime(referenceVideoRef.current.currentTime);
        
        // Loop the video
        if (referenceVideoRef.current.currentTime >= referenceVideoRef.current.duration) {
          referenceVideoRef.current.currentTime = 0;
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [exerciseStarted]);

  return (
    <div className="page">
      <header className="brand-header">
        <h1 className="brand-title">BackInPlay</h1>
        <p className="brand-tagline">Smart form coach for your recovery</p>
      </header>

      <div className="panels">
        {/* Reference Video */}
        <div className="panel">
          <h2 className="section-title">Reference Exercise</h2>
          <div className="panel-video">
            <video
              ref={referenceVideoRef}
              src="/reference-exercise.mp4"
              muted
              playsInline
            />
          </div>
          <button
            onClick={handleProcessReference}
            disabled={isProcessingReference}
            className="btn btn-primary"
          >
            {isProcessingReference ? 'Processing...' : 'Process Reference Video'}
          </button>
        </div>

        {/* User Camera: video is hidden, canvas shows feed + skeleton (like before) */}
        <div className="panel">
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
          </div>
          <button
            onClick={handleStartExercise}
            disabled={!keyframes.length || exerciseStarted}
            className="btn btn-success"
          >
            {exerciseStarted ? 'Exercise in Progress' : 'Start Exercise'}
          </button>
        </div>
      </div>

      {/* Feedback Display */}
      <div className="feedback-card">
        <h3>Real-time Feedback</h3>
        {feedback.length === 0 ? (
          <p className="feedback-empty">Waiting for movement...</p>
        ) : (
          <ul className="feedback-list">
            {feedback.map((item, idx) => (
              <li
                key={idx}
                className={`feedback-item ${
                  item.severity === 'good'
                    ? 'feedback-good'
                    : item.severity === 'minor'
                    ? 'feedback-minor'
                    : 'feedback-major'
                }`}
              >
                <strong>{item.joint}:</strong> {item.message}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}