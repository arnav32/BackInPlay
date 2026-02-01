import {
  Pose,
  Results,
  POSE_LANDMARKS,
  POSE_LANDMARKS_LEFT,
  POSE_LANDMARKS_RIGHT,
  type NormalizedLandmarkList,
  type NormalizedLandmark,
} from '@mediapipe/pose';

export interface KeyFrame {
  timestamp: number;
  landmarks: Results['poseLandmarks'];
  keyAngles: {
    leftElbow: number;
    rightElbow: number;
    leftKnee: number;
    rightKnee: number;
    leftShoulder: number;
    rightShoulder: number;
    leftHip: number;
    rightHip: number;
  };
}

export const processReferenceVideo = async (
  videoElement: HTMLVideoElement
): Promise<KeyFrame[]> => {
  const keyframes: KeyFrame[] = [];
  const pose = new Pose({
    locateFile: (file) => 
      `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
  });

  pose.setOptions({
    modelComplexity: 1,
    smoothLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });

  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    const run = (): void => {
      if (
        !videoElement.videoWidth ||
        !videoElement.videoHeight ||
        videoElement.readyState < 2
      ) {
        requestAnimationFrame(run);
        return;
      }

      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;

      pose.onResults((results) => {
        if (results.poseLandmarks) {
          keyframes.push({
            timestamp: videoElement.currentTime,
            landmarks: results.poseLandmarks,
            keyAngles: calculateKeyAngles(results.poseLandmarks),
          });
        }
      });

      const sampleNext = async (): Promise<void> => {
        if (videoElement.currentTime >= videoElement.duration) {
          pose.close();
          resolve(keyframes);
          return;
        }

        ctx.drawImage(videoElement, 0, 0);
        try {
          await pose.send({ image: canvas });
        } catch {
          pose.close();
          reject(new Error('Pose processing failed'));
          return;
        }
        videoElement.currentTime += 0.1;
        setTimeout(() => sampleNext(), 100);
      };

      pose.initialize().then(() => sampleNext()).catch(reject);
    };

    run();
  });
};

export const calculateKeyAngles = (landmarks: NormalizedLandmarkList) => {
  return {
    leftElbow: calculateAngle(
      landmarks[POSE_LANDMARKS.LEFT_SHOULDER],
      landmarks[POSE_LANDMARKS.LEFT_ELBOW],
      landmarks[POSE_LANDMARKS.LEFT_WRIST]
    ),
    rightElbow: calculateAngle(
      landmarks[POSE_LANDMARKS.RIGHT_SHOULDER],
      landmarks[POSE_LANDMARKS.RIGHT_ELBOW],
      landmarks[POSE_LANDMARKS.RIGHT_WRIST]
    ),
    leftKnee: calculateAngle(
      landmarks[POSE_LANDMARKS.LEFT_HIP],
      landmarks[POSE_LANDMARKS_LEFT.LEFT_KNEE],
      landmarks[POSE_LANDMARKS_LEFT.LEFT_ANKLE]
    ),
    rightKnee: calculateAngle(
      landmarks[POSE_LANDMARKS.RIGHT_HIP],
      landmarks[POSE_LANDMARKS_RIGHT.RIGHT_KNEE],
      landmarks[POSE_LANDMARKS_RIGHT.RIGHT_ANKLE]
    ),
    leftShoulder: calculateAngle(
      landmarks[POSE_LANDMARKS.LEFT_ELBOW],
      landmarks[POSE_LANDMARKS.LEFT_SHOULDER],
      landmarks[POSE_LANDMARKS.LEFT_HIP]
    ),
    rightShoulder: calculateAngle(
      landmarks[POSE_LANDMARKS.RIGHT_ELBOW],
      landmarks[POSE_LANDMARKS.RIGHT_SHOULDER],
      landmarks[POSE_LANDMARKS.RIGHT_HIP]
    ),
    leftHip: calculateAngle(
      landmarks[POSE_LANDMARKS.LEFT_SHOULDER],
      landmarks[POSE_LANDMARKS.LEFT_HIP],
      landmarks[POSE_LANDMARKS_LEFT.LEFT_KNEE]
    ),
    rightHip: calculateAngle(
      landmarks[POSE_LANDMARKS.RIGHT_SHOULDER],
      landmarks[POSE_LANDMARKS.RIGHT_HIP],
      landmarks[POSE_LANDMARKS_RIGHT.RIGHT_KNEE]
    ),
  };
};

const calculateAngle = (
  a: NormalizedLandmark,
  b: NormalizedLandmark,
  c: NormalizedLandmark
): number => {
  const radians =
    Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);
  if (angle > 180.0) {
    angle = 360 - angle;
  }
  return angle;
};