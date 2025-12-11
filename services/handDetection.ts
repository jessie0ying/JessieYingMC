import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";
import { GestureType } from "../types";

export class HandDetectionService {
  private handLandmarker: HandLandmarker | null = null;
  private video: HTMLVideoElement | null = null;
  private lastVideoTime = -1;
  private animationFrameId: number | null = null;

  async initialize() {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
    );
    this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      numHands: 1,
    });
  }

  async start(
    videoElement: HTMLVideoElement,
    onResults: (gesture: GestureType, position: { x: number; y: number }) => void
  ) {
    this.video = videoElement;

    const predict = () => {
      if (!this.handLandmarker || !this.video) return;

      if (this.video.currentTime !== this.lastVideoTime && this.video.readyState >= 2) {
        this.lastVideoTime = this.video.currentTime;
        const results = this.handLandmarker.detectForVideo(this.video, performance.now());

        if (results.landmarks && results.landmarks.length > 0) {
          const landmarks = results.landmarks[0];
          const gesture = this.detectGesture(landmarks);
          
          // Calculate center of palm roughly
          const x = landmarks[9].x; // Middle finger MCP
          const y = landmarks[9].y;

          onResults(gesture, { x, y });
        } else {
          onResults(GestureType.NONE, { x: 0.5, y: 0.5 });
        }
      }
      this.animationFrameId = requestAnimationFrame(predict);
    };

    this.animationFrameId = requestAnimationFrame(predict);
  }

  stop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  private detectGesture(landmarks: any[]): GestureType {
    // Finger Indices:
    // Thumb: Tip 4, IP 3, MCP 2
    // Index: Tip 8, PIP 6
    // Middle: Tip 12, PIP 10
    // Ring: Tip 16, PIP 14
    // Pinky: Tip 20, PIP 18

    const wrist = landmarks[0];

    const isExtended = (tipIdx: number, pipIdx: number) => {
        const tip = landmarks[tipIdx];
        const pip = landmarks[pipIdx];
        const distTip = Math.hypot(tip.x - wrist.x, tip.y - wrist.y);
        const distPip = Math.hypot(pip.x - wrist.x, pip.y - wrist.y);
        // Tip must be significantly further from wrist than PIP
        return distTip > distPip * 1.2;
    };

    const indexExt = isExtended(8, 6);
    const middleExt = isExtended(12, 10);
    const ringExt = isExtended(16, 14);
    const pinkyExt = isExtended(20, 18);

    // Thumb check (looser check)
    const thumbTip = landmarks[4];
    const thumbMCP = landmarks[2];
    const distThumbTip = Math.hypot(thumbTip.x - wrist.x, thumbTip.y - wrist.y);
    const distThumbMCP = Math.hypot(thumbMCP.x - wrist.x, thumbMCP.y - wrist.y);
    const thumbExt = distThumbTip > distThumbMCP * 1.1;

    const extendedCount = (indexExt ? 1 : 0) + (middleExt ? 1 : 0) + (ringExt ? 1 : 0) + (pinkyExt ? 1 : 0) + (thumbExt ? 1 : 0);

    // POINTING: Index extended, Middle/Ring/Pinky curled. Thumb doesn't matter much but usually curled.
    if (indexExt && !middleExt && !ringExt && !pinkyExt) {
        return GestureType.POINTING;
    }

    if (extendedCount >= 4) return GestureType.OPEN_HAND;
    if (extendedCount <= 1) return GestureType.FIST;
    
    return GestureType.MOVING;
  }
}