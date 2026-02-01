import { KeyFrame } from './referenceVideoProcessor';

export interface Feedback {
  joint: string;
  message: string;
  severity: 'good' | 'minor' | 'major';
}

export const comparePoses = (
  userAngles: KeyFrame['keyAngles'],
  referenceKeyframe: KeyFrame,
  thresholds = { minor: 15, major: 30 }
): Feedback[] => {
  const feedback: Feedback[] = [];
  const refAngles = referenceKeyframe.keyAngles;

  type KeyAngles = KeyFrame['keyAngles'];
  type KeyAngleKey = keyof KeyAngles;
  const joints: { key: KeyAngleKey; name: string }[] = [
    { key: 'leftElbow', name: 'left elbow' },
    { key: 'rightElbow', name: 'right elbow' },
    { key: 'leftKnee', name: 'left knee' },
    { key: 'rightKnee', name: 'right knee' },
    { key: 'leftShoulder', name: 'left shoulder' },
    { key: 'rightShoulder', name: 'right shoulder' },
    { key: 'leftHip', name: 'left hip' },
    { key: 'rightHip', name: 'right hip' },
  ];

  joints.forEach(({ key, name }: { key: KeyAngleKey; name: string }) => {
    const diff = Math.abs(userAngles[key] - refAngles[key]);

    if (diff > thresholds.major) {
      feedback.push({
        joint: name,
        message: `Straighten your ${name} more`,
        severity: 'major',
      });
    } else if (diff > thresholds.minor) {
      feedback.push({
        joint: name,
        message: `Adjust your ${name} slightly`,
        severity: 'minor',
      });
    }
  });

  if (feedback.length === 0) {
    feedback.push({
      joint: 'overall',
      message: 'Good form! Keep it up',
      severity: 'good',
    });
  }

  return feedback;
};

export const findClosestKeyframe = (
  keyframes: KeyFrame[],
  currentTime: number
): KeyFrame => {
  return keyframes.reduce((prev, curr) =>
    Math.abs(curr.timestamp - currentTime) < 
    Math.abs(prev.timestamp - currentTime)
      ? curr
      : prev
  );
};