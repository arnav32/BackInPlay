import { useEffect, useRef, useState, type RefObject } from 'react';
import { Pose, Results } from '@mediapipe/pose';
import { Camera } from '@mediapipe/camera_utils';

export const usePoseDetection = (
  videoRef: RefObject<HTMLVideoElement>,
  onResults: (results: Results) => void
) => {
  const [isReady, setIsReady] = useState(false);
  const poseRef = useRef<Pose | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  const onResultsRef = useRef(onResults);
  const sendingRef = useRef(false);
  const closedRef = useRef(false);
  onResultsRef.current = onResults;

  useEffect(() => {
    if (!videoRef.current) return;
    closedRef.current = false;

    const pose = new Pose({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
      },
    });

    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    pose.onResults((results) => onResultsRef.current(results));

    poseRef.current = pose;

    const camera = new Camera(videoRef.current, {
      onFrame: async () => {
        const video = videoRef.current;
        if (
          !video ||
          closedRef.current ||
          sendingRef.current ||
          video.videoWidth <= 0 ||
          video.videoHeight <= 0
        ) {
          return;
        }
        sendingRef.current = true;
        try {
          await pose.send({ image: video });
        } catch {
          // Ignore WASM/pose errors to avoid crashing the app
        } finally {
          sendingRef.current = false;
        }
      },
      width: 640,
      height: 480,
    });

    cameraRef.current = camera;

    // Start camera and pose in parallel so video gets stream even if WASM is slow
    Promise.all([
      pose.initialize().catch(() => {}),
      camera.start().catch(() => {}),
    ]).then(() => {
      if (!closedRef.current) setIsReady(true);
    });

    return () => {
      closedRef.current = true;
      camera.stop();
      pose.close();
    };
  }, [videoRef]);

  return { isReady };
};