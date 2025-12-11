import React, { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GestureType } from '../types';

interface TreeParticlesProps {
  gesture: GestureType;
  handPosition: { x: number; y: number };
  photos?: string[];
}

// Counts for different types
const COUNTS = {
  ORNAMENTS: 450,
  LIGHTS: 500,
  GIFTS: 150,
  DIAMONDS: 150,
  SILVERS: 200,
};

// Reusable objects
const DUMMY = new THREE.Object3D();
const _color = new THREE.Color();

// Data interfaces
interface ParticleGroupData {
  posClosed: Float32Array;
  posOpen: Float32Array;
  scales: Float32Array | Float32Array[]; // number or [x,y,z]
  colors: Float32Array;
  count: number;
}

// Helper to generate data
const generateParticleData = (count: number, type: 'ornament' | 'light' | 'gift' | 'diamond' | 'silver'): ParticleGroupData => {
  const posClosed = new Float32Array(count * 3);
  const posOpen = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const isGift = type === 'gift';
  const scales = isGift ? new Float32Array(count * 3) : new Float32Array(count);

  // Palette - Removed White/Silver from Ornaments
  const ornamentColors = [
    '#FFD700', // Gold
    '#D4AF37', // Metallic Gold
    '#C41E3A', // Cardinal Red
    '#228B22', // Forest Green
  ].map(c => new THREE.Color(c));

  const giftColors = [
    '#8B0000', // Dark Red
    '#006400', // Dark Green
    '#DAA520', // Goldenrod
  ].map(c => new THREE.Color(c));
  
  const lightColors = [
    '#FFD700', // Warm
    '#FF4500', // Red-Orange
    '#32CD32', // Lime
    '#00FFFF', // Cyan
    '#FFFFFF', // White
  ].map(c => new THREE.Color(c));

  for (let i = 0; i < count; i++) {
    // --- Closed State (Cone) ---
    const t = i / count; 
    const hInfo = Math.random(); 
    const yClosed = (hInfo * 9) - 4.5; // -4.5 to 4.5
    const radiusAtHeight = 0.1 + (1 - (yClosed + 4.5)/9) * 4.5;
    
    const angle = hInfo * Math.PI * 40 + (Math.random() * Math.PI / 2);
    
    const noiseAmp = type === 'light' ? 0.1 : 0.6;
    const r = radiusAtHeight + (Math.random() - 0.5) * noiseAmp;
    
    posClosed[i * 3] = Math.cos(angle) * r;
    posClosed[i * 3 + 1] = yClosed;
    posClosed[i * 3 + 2] = Math.sin(angle) * r;

    // --- Open State (Explosion) ---
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const rOpen = 4 + Math.random() * 6;

    posOpen[i * 3] = rOpen * Math.sin(phi) * Math.cos(theta);
    posOpen[i * 3 + 1] = rOpen * Math.sin(phi) * Math.sin(theta);
    posOpen[i * 3 + 2] = rOpen * Math.cos(phi);

    // --- Scale ---
    // Applying the 0.46 multiplier (approx 0.7x * (1/1.5))
    if (isGift) {
       const sBase = (0.2 + Math.random() * 0.2) * 0.46;
       (scales as Float32Array)[i * 3] = sBase * (0.8 + Math.random() * 0.4);
       (scales as Float32Array)[i * 3 + 1] = sBase * (0.8 + Math.random() * 0.4);
       (scales as Float32Array)[i * 3 + 2] = sBase * (0.8 + Math.random() * 0.4);
    } else {
       let sBase = 0.1;
       if (type === 'ornament') sBase = 0.25 + Math.random() * 0.25;
       if (type === 'light') sBase = 0.12 + Math.random() * 0.1;
       if (type === 'diamond') sBase = 0.2 + Math.random() * 0.2;
       if (type === 'silver') sBase = 0.2 + Math.random() * 0.25; // Sizing for silver chunks

       (scales as Float32Array)[i] = sBase * 0.46;
    }

    // --- Color ---
    let c = new THREE.Color();
    if (type === 'light') c = lightColors[Math.floor(Math.random() * lightColors.length)];
    else if (type === 'gift') c = giftColors[Math.floor(Math.random() * giftColors.length)];
    else if (type === 'ornament') c = ornamentColors[Math.floor(Math.random() * ornamentColors.length)];
    else if (type === 'diamond') c = ornamentColors[Math.floor(Math.random() * ornamentColors.length)];
    else if (type === 'silver') c.setHex(0xffffff); // Pure white/silver
    else c.setHex(0xffffff);

    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }

  return { posClosed, posOpen, scales, colors, count };
};

// Generate data
const dataOrnaments = generateParticleData(COUNTS.ORNAMENTS, 'ornament');
const dataLights = generateParticleData(COUNTS.LIGHTS, 'light');
const dataGifts = generateParticleData(COUNTS.GIFTS, 'gift');
const dataDiamonds = generateParticleData(COUNTS.DIAMONDS, 'diamond');
const dataSilvers = generateParticleData(COUNTS.SILVERS, 'silver');

// Star Shape Generation
const createStarShape = () => {
  const shape = new THREE.Shape();
  const outerRadius = 1;
  const innerRadius = 0.4;
  const points = 5;
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerRadius : innerRadius;
    const a = (i / (points * 2)) * Math.PI * 2;
    const x = Math.cos(a + Math.PI / 2) * r; 
    const y = Math.sin(a + Math.PI / 2) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
};
const starShape = createStarShape();

const Star = ({ gesture }: { gesture: GestureType }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state, delta) => {
    if(!meshRef.current) return;
    
    const targetY = (gesture === GestureType.OPEN_HAND || gesture === GestureType.MOVING) ? 7 : 4.8;
    const targetScale = (gesture === GestureType.OPEN_HAND || gesture === GestureType.MOVING) ? 1.5 : 1;

    meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, targetY, delta * 2);
    
    meshRef.current.rotation.y += delta * 0.5;
    meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime) * 0.1;
    
    const s = THREE.MathUtils.lerp(meshRef.current.scale.x, targetScale, delta * 2);
    meshRef.current.scale.setScalar(s);
  });

  return (
    <mesh ref={meshRef} position={[0, 4.8, 0]}>
      <extrudeGeometry args={[starShape, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 2 }]} />
      <meshStandardMaterial 
        color="#FFD700" 
        emissive="#FFD700" 
        emissiveIntensity={2} 
        roughness={0.2} 
        metalness={1} 
      />
    </mesh>
  );
};

// Polaroid Component for user photos
interface PolaroidProps {
    url: string;
    gesture: GestureType;
    isFocused: boolean;
}

const Polaroid: React.FC<PolaroidProps> = ({ url, gesture, isFocused }) => {
    const group = useRef<THREE.Group>(null);
    const [texture, setTexture] = useState<THREE.Texture | null>(null);

    useEffect(() => {
        const loader = new THREE.TextureLoader();
        loader.load(url, (t) => {
            t.colorSpace = THREE.SRGBColorSpace;
            t.minFilter = THREE.LinearFilter;
            t.magFilter = THREE.LinearFilter;
            setTexture(t);
        });
    }, [url]);

    // Compute tree/explosion positions once
    const { posClosed, posOpen, initialRotation } = useMemo(() => {
        const hNorm = Math.random(); 
        const y = (hNorm * 8) - 4; 
        const radiusBase = 0.1 + (1 - (y + 4.5)/9) * 4.5;
        const r = radiusBase + 0.5 + Math.random() * 0.4;
        const angle = Math.random() * Math.PI * 2;

        const posClosed = new THREE.Vector3(Math.cos(angle)*r, y, Math.sin(angle)*r);

        const rOpen = 5 + Math.random() * 4;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const posOpen = new THREE.Vector3(
            rOpen * Math.sin(phi) * Math.cos(theta),
            rOpen * Math.sin(phi) * Math.sin(theta),
            rOpen * Math.cos(phi)
        );

        const initialRotation = new THREE.Euler(
            (Math.random() - 0.5) * 0.5, 
            0, 
            (Math.random() - 0.5) * 0.2
        );

        return { posClosed, posOpen, initialRotation };
    }, []);

    useFrame((state, delta) => {
        if (!group.current) return;

        let targetPos = posClosed;
        let targetScale = 0.5;
        let speed = 2;
        
        // Use a dummy object to calculate target rotation quaternion
        // This helps us blend smoothly between the complex "LookAt" logic and the "Identity" logic
        const targetObj = new THREE.Object3D();
        
        // Determine Targets based on State
        if (isFocused && group.current.parent) {
            // Focus Mode: Move close to camera (Camera is at z=12)
            // Target World Pos = (0, 0, 9) -> 3 units in front of camera
            // PROBLEM: The tree (parent) is rotating. Local (0,0,9) moves with the tree.
            // SOLUTION: Calculate the Local Position required to be at World (0,0,9).
            
            speed = 4; // Move fast when focusing
            targetScale = 1.5; 
            
            // 1. Get Parent Rotation
            const parentRot = group.current.parent.rotation;
            
            // 2. We want a vector that, when rotated by ParentRot, equals (0,0,9).
            // So we take (0,0,9) and rotate it by Inverse(ParentRot).
            // Euler Inverse for XYZ is ZYX with negated angles.
            const vec = new THREE.Vector3(0, 0, 9);
            const eulerInv = new THREE.Euler(-parentRot.x, -parentRot.y, -parentRot.z, 'ZYX');
            vec.applyEuler(eulerInv);
            targetPos = vec;

            // 3. Target Rotation: We want to face the camera (World rotation 0,0,0).
            // So LocalRot must cancel out ParentRot.
            targetObj.setRotationFromEuler(eulerInv);

        } else if (gesture === GestureType.OPEN_HAND || gesture === GestureType.MOVING) {
            targetPos = posOpen;
            targetScale = 0.5;
            speed = 3;
            
            // Continuous tumble for explosion
            // We handle this via manual rotation increment below, but set a base here
            targetObj.rotation.set(
                group.current.rotation.x + delta,
                group.current.rotation.y + delta,
                0
            );
        } else {
            // Standard Tree Behavior
            targetPos = posClosed;
            
            // Re-calculate the "Tree Look" rotation
            // We use targetPos here so the rotation target is where it *should* be
            targetObj.position.copy(targetPos);
            targetObj.lookAt(0, targetPos.y, 0);
            targetObj.rotateY(Math.PI); // Face out
            
            // Add initial random tilt
            targetObj.rotateX(initialRotation.x);
            targetObj.rotateZ(initialRotation.z);
            
            // Add Gentle sway
            targetObj.rotateZ(Math.sin(state.clock.elapsedTime + posClosed.y) * 0.002);
        }

        // Interpolate Position
        group.current.position.lerp(targetPos, delta * speed);
        
        // Interpolate Scale
        const currentScale = group.current.scale.x;
        const newScale = THREE.MathUtils.lerp(currentScale, targetScale, delta * speed);
        group.current.scale.setScalar(newScale);

        // Interpolate Rotation
        if (gesture === GestureType.OPEN_HAND) {
             // Tumble freely when exploding
             group.current.rotation.x += delta;
             group.current.rotation.y += delta;
        } else {
             // Slerp to the calculated target quaternion (works for both Focused and Tree modes)
             group.current.quaternion.slerp(targetObj.quaternion, delta * speed);
        }
    });

    if (!texture) return null;

    return (
        <group ref={group}> 
             {/* White Card Backing */}
             <mesh position={[0, 0, 0]}>
                <boxGeometry args={[1, 1.2, 0.05]} />
                <meshStandardMaterial color="#ffffff" roughness={0.4} />
             </mesh>
             {/* Photo Image */}
             <mesh position={[0, 0.1, 0.03]}>
                <planeGeometry args={[0.85, 0.85]} />
                <meshBasicMaterial map={texture} side={THREE.DoubleSide} />
             </mesh>
        </group>
    )
};

export const TreeParticles: React.FC<TreeParticlesProps> = ({ gesture, handPosition, photos = [] }) => {
  const ornamentsRef = useRef<THREE.InstancedMesh>(null);
  const lightsRef = useRef<THREE.InstancedMesh>(null);
  const giftsRef = useRef<THREE.InstancedMesh>(null);
  const diamondsRef = useRef<THREE.InstancedMesh>(null);
  const silversRef = useRef<THREE.InstancedMesh>(null);
  
  const groupRef = useRef<THREE.Group>(null);
  
  // State for which photo is currently zoomed
  const [focusedPhotoIndex, setFocusedPhotoIndex] = useState<number | null>(null);

  // Manage Focus State
  useEffect(() => {
    if (gesture === GestureType.POINTING) {
        // If nothing is focused yet and we have photos, pick one
        if (focusedPhotoIndex === null && photos.length > 0) {
            const randomIndex = Math.floor(Math.random() * photos.length);
            setFocusedPhotoIndex(randomIndex);
        }
    } else {
        // Release focus
        setFocusedPhotoIndex(null);
    }
  }, [gesture, photos.length]); // Intentionally not including focusedPhotoIndex to avoid re-randomizing while holding

  // Current positions interpolators
  const curPosOrnaments = useRef(new Float32Array(dataOrnaments.posClosed));
  const curPosLights = useRef(new Float32Array(dataLights.posClosed));
  const curPosGifts = useRef(new Float32Array(dataGifts.posClosed));
  const curPosDiamonds = useRef(new Float32Array(dataDiamonds.posClosed));
  const curPosSilvers = useRef(new Float32Array(dataSilvers.posClosed));

  // Generic Update Function
  const updateMesh = (
    ref: React.RefObject<THREE.InstancedMesh>, 
    data: ParticleGroupData, 
    currentPos: Float32Array, 
    delta: number,
    state: any,
    isNonUniformScale: boolean = false
  ) => {
    if (!ref.current) return;

    const target = gesture === GestureType.OPEN_HAND || gesture === GestureType.MOVING ? data.posOpen : data.posClosed;
    const lerpSpeed = gesture === GestureType.OPEN_HAND ? 3.0 : 2.0;
    
    let idx = 0;
    for (let i = 0; i < data.count; i++) {
        const cx = currentPos[idx];
        const cy = currentPos[idx + 1];
        const cz = currentPos[idx + 2];

        const tx = target[idx];
        const ty = target[idx + 1];
        const tz = target[idx + 2];

        const nx = THREE.MathUtils.lerp(cx, tx, delta * lerpSpeed);
        const ny = THREE.MathUtils.lerp(cy, ty, delta * lerpSpeed);
        const nz = THREE.MathUtils.lerp(cz, tz, delta * lerpSpeed);

        currentPos[idx] = nx;
        currentPos[idx + 1] = ny;
        currentPos[idx + 2] = nz;

        DUMMY.position.set(nx, ny, nz);
        
        if (gesture === GestureType.OPEN_HAND) {
            DUMMY.position.y += Math.sin(state.clock.elapsedTime * 2 + i) * 0.02;
            DUMMY.rotation.x += delta * 0.5;
            DUMMY.rotation.z += delta * 0.5;
        } else {
             DUMMY.rotation.set(i, i, i); 
        }

        if (isNonUniformScale) {
            const s = data.scales as Float32Array;
            DUMMY.scale.set(s[idx], s[idx+1], s[idx+2]);
        } else {
            const s = data.scales as Float32Array;
            DUMMY.scale.setScalar(s[i]);
        }

        DUMMY.updateMatrix();
        ref.current.setMatrixAt(i, DUMMY.matrix);
        idx += 3;
    }
    ref.current.instanceMatrix.needsUpdate = true;
  };

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    // Group Rotation
    // Stop rotating the tree container if we are focusing on a photo, so it doesn't drift away
    if (gesture === GestureType.POINTING) {
        // Slow down rotation to a stop
        groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, groupRef.current.rotation.y, delta);
    } 
    else if ((gesture === GestureType.OPEN_HAND || gesture === GestureType.MOVING) && handPosition) {
        const rotX = (handPosition.y - 0.5) * 1.5;
        const rotY = (handPosition.x - 0.5) * 1.5;
        groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, rotX, delta * 3);
        groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, rotY, delta * 3);
    } else {
        // Auto rotate normal
        groupRef.current.rotation.y += delta * 0.1;
        groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0, delta * 2);
    }

    updateMesh(ornamentsRef, dataOrnaments, curPosOrnaments.current, delta, state);
    updateMesh(lightsRef, dataLights, curPosLights.current, delta, state);
    updateMesh(giftsRef, dataGifts, curPosGifts.current, delta, state, true);
    updateMesh(diamondsRef, dataDiamonds, curPosDiamonds.current, delta, state);
    updateMesh(silversRef, dataSilvers, curPosSilvers.current, delta, state);
  });

  // Init Colors
  useEffect(() => {
    const setColors = (ref: React.RefObject<THREE.InstancedMesh>, data: ParticleGroupData) => {
        if (!ref.current) return;
        for (let i = 0; i < data.count; i++) {
            _color.setRGB(data.colors[i*3], data.colors[i*3+1], data.colors[i*3+2]);
            ref.current.setColorAt(i, _color);
        }
        if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
    };

    setColors(ornamentsRef, dataOrnaments);
    setColors(lightsRef, dataLights);
    setColors(giftsRef, dataGifts);
    setColors(diamondsRef, dataDiamonds);
    setColors(silversRef, dataSilvers);
  }, []);

  return (
    <group ref={groupRef}>
      <Star gesture={gesture} />

      {/* Render Uploaded Polaroids */}
      {photos.map((url, i) => (
         <Polaroid 
            key={`photo-${i}`} 
            url={url} 
            gesture={gesture} 
            isFocused={i === focusedPhotoIndex}
         />
      ))}

      {/* 1. ORNAMENTS: Metallic Spheres (Gold, Red, Green) */}
      <instancedMesh ref={ornamentsRef} args={[undefined, undefined, COUNTS.ORNAMENTS]}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial roughness={0.15} metalness={0.8} envMapIntensity={1.5} />
      </instancedMesh>

      {/* 2. LIGHTS: Glowing Spheres */}
      <instancedMesh ref={lightsRef} args={[undefined, undefined, COUNTS.LIGHTS]}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial toneMapped={false} /> 
      </instancedMesh>

      {/* 3. GIFTS: Boxes */}
      <instancedMesh ref={giftsRef} args={[undefined, undefined, COUNTS.GIFTS]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.3} metalness={0.3} />
      </instancedMesh>

      {/* 4. DIAMONDS/PENDANTS: Octahedrons */}
      <instancedMesh ref={diamondsRef} args={[undefined, undefined, COUNTS.DIAMONDS]}>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial roughness={0.1} metalness={0.9} envMapIntensity={2} flatShading={true} />
      </instancedMesh>

      {/* 5. SPARKLING SILVERS: Faceted Icosahedrons for glitter effect */}
      <instancedMesh ref={silversRef} args={[undefined, undefined, COUNTS.SILVERS]}>
        {/* Detail=0 means 20 faces, very faceted */}
        <icosahedronGeometry args={[0.9, 0]} /> 
        <meshStandardMaterial 
          color="#ffffff" 
          roughness={0.1} 
          metalness={1.0} 
          envMapIntensity={3.0} 
          flatShading={true} 
        />
      </instancedMesh>
    </group>
  );
};