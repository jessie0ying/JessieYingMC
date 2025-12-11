export enum GestureType {
  NONE = 'NONE',
  FIST = 'FIST', // Close tree
  OPEN_HAND = 'OPEN_HAND', // Explode tree
  MOVING = 'MOVING', // Rotate scene
  POINTING = 'POINTING' // Zoom into photo
}

export interface HandData {
  gesture: GestureType;
  x: number; // Normalized 0-1
  y: number; // Normalized 0-1
  tiltX: number;
  tiltY: number;
}

export interface ParticleData {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  color: string;
  type: 'sphere' | 'box' | 'photo';
}