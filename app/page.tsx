'use client';

import { useState } from 'react';
import HomePage from '@/components/HomePage';
import ExercisePage from '@/components/ExercisePage';

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

export default function App() {
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);

  if (selectedExercise) {
    return (
      <ExercisePage
        exercise={selectedExercise}
        onBack={() => setSelectedExercise(null)}
      />
    );
  }

  return <HomePage onExerciseSelected={setSelectedExercise} />;
}
