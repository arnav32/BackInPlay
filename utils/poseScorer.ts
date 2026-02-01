export interface Phase {
  name: 'ready' | 'raise' | 'hold' | 'lower';
  duration: number; // seconds
}

export interface ExerciseConfig {
  tracked_joint: string;
  resting_angle: number;
  target_angle: number;
  tolerance: number;
  phases: Phase[];
}

export interface ScoreResult {
  overallScore: number;
  currentPhase: string;
  expectedAngle: number;
  currentAngle: number;
  feedback: string;
  phaseProgress: number; // 0-1 progress through current phase
  cycleProgress: number; // 0-1 progress through entire cycle
}

const JOINT_NAMES: { [key: string]: string } = {
  leftElbow: 'left elbow',
  rightElbow: 'right elbow',
  leftKnee: 'left knee',
  rightKnee: 'right knee',
  leftShoulder: 'left shoulder',
  rightShoulder: 'right shoulder',
  leftHip: 'left hip',
  rightHip: 'right hip',
};

/**
 * Calculate the expected angle at a given time in the exercise cycle
 */
function getExpectedAngle(
  elapsedSeconds: number,
  config: ExerciseConfig
): { expectedAngle: number; phaseName: string; phaseProgress: number; cycleProgress: number } {
  const { resting_angle, target_angle, phases } = config;
  
  // Calculate total cycle duration
  const cycleDuration = phases.reduce((sum, p) => sum + p.duration, 0);
  
  // Get position within current cycle (loop the exercise)
  const cycleTime = elapsedSeconds % cycleDuration;
  const cycleProgress = cycleTime / cycleDuration;
  
  // Find current phase
  let timeInCycle = 0;
  for (const phase of phases) {
    const phaseStart = timeInCycle;
    const phaseEnd = timeInCycle + phase.duration;
    
    if (cycleTime >= phaseStart && cycleTime < phaseEnd) {
      const phaseProgress = (cycleTime - phaseStart) / phase.duration;
      
      let expectedAngle: number;
      
      switch (phase.name) {
        case 'ready':
          // Stay at resting position
          expectedAngle = resting_angle;
          break;
        case 'raise':
          // Interpolate from resting to target
          expectedAngle = resting_angle + (target_angle - resting_angle) * phaseProgress;
          break;
        case 'hold':
          // Stay at target
          expectedAngle = target_angle;
          break;
        case 'lower':
          // Interpolate from target to resting
          expectedAngle = target_angle + (resting_angle - target_angle) * phaseProgress;
          break;
        default:
          expectedAngle = target_angle;
      }
      
      return {
        expectedAngle,
        phaseName: phase.name,
        phaseProgress,
        cycleProgress,
      };
    }
    
    timeInCycle = phaseEnd;
  }
  
  // Fallback (shouldn't happen)
  return {
    expectedAngle: resting_angle,
    phaseName: 'raise',
    phaseProgress: 0,
    cycleProgress: 0,
  };
}

/**
 * Score the user's pose based on time-based expected angles
 */
export function scoreExercise(
  currentAngles: { [key: string]: number },
  config: ExerciseConfig,
  elapsedSeconds: number
): ScoreResult {
  const { tracked_joint, tolerance } = config;
  const currentAngle = currentAngles[tracked_joint] ?? 0;
  
  const { expectedAngle, phaseName, phaseProgress, cycleProgress } = getExpectedAngle(
    elapsedSeconds,
    config
  );
  
  // Calculate how close the user is to the expected angle
  const diff = Math.abs(currentAngle - expectedAngle);
  
  let score: number;
  let feedback: string;
  
  const jointName = JOINT_NAMES[tracked_joint] || tracked_joint;
  
  // Scoring based on deviation from expected angle
  if (diff <= tolerance * 0.5) {
    score = 100;
    feedback = 'Perfect! Keep it up!';
  } else if (diff <= tolerance) {
    score = 100 - ((diff - tolerance * 0.5) / (tolerance * 0.5)) * 15;
    feedback = 'Great form!';
  } else if (diff <= tolerance * 2) {
    score = 85 - ((diff - tolerance) / tolerance) * 35;
    
    // Give directional feedback based on phase
    if (phaseName === 'ready') {
      if (currentAngle > expectedAngle) {
        feedback = `Lower your ${jointName} and get ready`;
      } else {
        feedback = `Hold steady, get ready`;
      }
    } else if (phaseName === 'raise') {
      if (currentAngle < expectedAngle) {
        feedback = `Raise your ${jointName} faster`;
      } else {
        feedback = `Slow down, you're ahead`;
      }
    } else if (phaseName === 'hold') {
      if (currentAngle < expectedAngle) {
        feedback = `Raise your ${jointName} higher and hold`;
      } else {
        feedback = `Lower your ${jointName} slightly and hold`;
      }
    } else if (phaseName === 'lower') {
      if (currentAngle > expectedAngle) {
        feedback = `Lower your ${jointName} faster`;
      } else {
        feedback = `Slow down the lowering`;
      }
    } else {
      feedback = `Adjust your ${jointName}`;
    }
  } else {
    score = Math.max(20, 50 - ((diff - tolerance * 2) / tolerance) * 30);
    
    // Strong correction needed
    if (phaseName === 'ready') {
      feedback = currentAngle > expectedAngle
        ? `Lower your ${jointName} to starting position`
        : `Hold your starting position`;
    } else if (phaseName === 'raise') {
      feedback = currentAngle < expectedAngle
        ? `Raise your ${jointName} now!`
        : `Wait - you're moving too fast`;
    } else if (phaseName === 'hold') {
      feedback = currentAngle < expectedAngle
        ? `Raise your ${jointName} and hold steady`
        : `Lower your ${jointName} and hold steady`;
    } else {
      feedback = currentAngle > expectedAngle
        ? `Lower your ${jointName} now!`
        : `You're lowering too fast`;
    }
  }
  
  return {
    overallScore: Math.round(score),
    currentPhase: phaseName,
    expectedAngle: Math.round(expectedAngle),
    currentAngle: Math.round(currentAngle),
    feedback,
    phaseProgress,
    cycleProgress,
  };
}

/**
 * Generate coaching text for speech synthesis
 */
export function generateCoachingText(scoreResult: ScoreResult): string | null {
  if (scoreResult.overallScore >= 85) {
    return null;
  }
  return scoreResult.feedback;
}

// Keep old interface for backward compatibility with other exercises
export interface TargetMetrics {
  leftElbow?: number;
  rightElbow?: number;
  leftKnee?: number;
  rightKnee?: number;
  leftShoulder?: number;
  rightShoulder?: number;
  leftHip?: number;
  rightHip?: number;
}

export interface Tolerances {
  leftElbow?: number;
  rightElbow?: number;
  leftKnee?: number;
  rightKnee?: number;
  leftShoulder?: number;
  rightShoulder?: number;
  leftHip?: number;
  rightHip?: number;
}
