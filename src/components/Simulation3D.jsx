// src/components/Simulation3D.jsx
import React, { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Sky } from '@react-three/drei';
import * as THREE from 'three';

// ─── PROCEDURAL TEXTURE GENERATORS (HIGH REALISM) ───

// Realistic Asphalt Texture (Dark, granular road surface)
const createAsphaltTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Base dark gray asphalt
  ctx.fillStyle = '#2d3748'; // Cool gray 700
  ctx.fillRect(0, 0, 256, 256);

  // Granular noise for stones and wear
  for (let i = 0; i < 6000; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const size = Math.random() * 1.5;
    ctx.fillStyle = Math.random() > 0.5 ? '#1a202c' : '#4a5568';
    ctx.fillRect(x, y, size, size);
  }

  // Fine dirt patches
  for (let i = 0; i < 20; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const radius = 5 + Math.random() * 15;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
    grad.addColorStop(0, 'rgba(26,32,44,0.15)');
    grad.addColorStop(1, 'rgba(26,32,44,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 1);
  return texture;
};

// Realistic Grass Texture (Lush green lawn with soil variance)
const createGrassTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#22543d'; // Forest green
  ctx.fillRect(0, 0, 128, 128);

  // Grass blades variance
  for (let i = 0; i < 3000; i++) {
    const x = Math.random() * 128;
    const y = Math.random() * 128;
    const size = Math.random() * 2.5;
    ctx.fillStyle = Math.random() > 0.4 ? '#2f855a' : '#1c4532';
    ctx.fillRect(x, y, size, size);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
};

// ─── GEOMETRIC REALISTIC COMPONENTS ───

// Realistic Pine/Jungle Tree (Optimized low-poly 3D green model)
const Tree3D = ({ position, scale = 1.0 }) => {
  return (
    <group position={position} scale={[scale, scale, scale]}>
      {/* Wood Trunk (Ağaç Gövdesi) */}
      <mesh position={[0, 0.15, 0]} castShadow>
        <cylinderGeometry args={[0.015, 0.025, 0.3, 5]} />
        <meshStandardMaterial color="#5c4033" roughness={0.9} />
      </mesh>
      {/* Foliage - Layer 1 (Bottom leaves - Koyu Yeşil) */}
      <mesh position={[0, 0.38, 0]} castShadow>
        <coneGeometry args={[0.16, 0.36, 5]} />
        <meshStandardMaterial color="#1b4332" roughness={0.8} />
      </mesh>
      {/* Foliage - Layer 2 (Top leaves - Açık Yeşil) */}
      <mesh position={[0, 0.54, 0]} castShadow>
        <coneGeometry args={[0.10, 0.22, 5]} />
        <meshStandardMaterial color="#2d6a4f" roughness={0.8} />
      </mesh>
    </group>
  );
};

// Realistic Goal (Floating Golden Trophy & Checkered Portal)
const Goal3D = ({ position }) => {
  const trophyRef = useRef();

  useFrame(({ clock }) => {
    if (trophyRef.current) {
      const t = clock.getElapsedTime();
      trophyRef.current.position.y = position[1] + 0.4 + Math.sin(t * 3) * 0.1;
      trophyRef.current.rotation.y = t * 1.5;
    }
  });

  return (
    <group position={position}>
      {/* Target Marker Cone (Yere yansıyan hafif beyaz ışık halkası) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[0.3, 0.35, 32]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.6} />
      </mesh>

      {/* Floating Golden Trophy Cup */}
      <group ref={trophyRef}>
        {/* Trophy Base */}
        <mesh position={[0, 0, 0]} castShadow>
          <cylinderGeometry args={[0.1, 0.12, 0.08, 12]} />
          <meshStandardMaterial color="#1a202c" roughness={0.5} metalness={0.8} />
        </mesh>
        {/* Trophy Stem */}
        <mesh position={[0, 0.1, 0]} castShadow>
          <cylinderGeometry args={[0.03, 0.03, 0.14, 8]} />
          <meshStandardMaterial color="#ecc94b" roughness={0.1} metalness={0.9} />
        </mesh>
        {/* Trophy Cup */}
        <mesh position={[0, 0.24, 0]} castShadow>
          <cylinderGeometry args={[0.14, 0.06, 0.18, 12]} />
          <meshStandardMaterial color="#ecc94b" roughness={0.1} metalness={0.9} />
        </mesh>
        {/* Trophy Handles */}
        {[-0.11, 0.11].map((x, idx) => (
          <mesh key={idx} position={[x, 0.26, 0]} rotation={[0, 0, idx === 0 ? 0.3 : -0.3]} castShadow>
            <torusGeometry args={[0.06, 0.012, 6, 16, Math.PI]} />
            <meshStandardMaterial color="#ecc94b" roughness={0.1} metalness={0.9} />
          </mesh>
        ))}
      </group>
    </group>
  );
};

// Realistic Waypoint (Floating Orange Traffic Cone / Checkpoint)
const Waypoint3D = ({ position }) => {
  const coneRef = useRef();

  useFrame(({ clock }) => {
    if (coneRef.current) {
      coneRef.current.position.y = position[1] + 0.3 + Math.sin(clock.getElapsedTime() * 3.5) * 0.06;
      coneRef.current.rotation.y = clock.getElapsedTime() * 1.0;
    }
  });

  return (
    <group position={position}>
      {/* Checkpoint base ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[0.22, 0.25, 24]} />
        <meshBasicMaterial color="#dd6b20" transparent opacity={0.5} />
      </mesh>

      {/* Floating Checkpoint Cone */}
      <group ref={coneRef}>
        {/* Cone Base */}
        <mesh position={[0, 0, 0]} castShadow>
          <boxGeometry args={[0.2, 0.02, 0.2]} />
          <meshStandardMaterial color="#dd6b20" roughness={0.4} />
        </mesh>
        {/* Cone Body */}
        <mesh position={[0, 0.14, 0]} castShadow>
          <coneGeometry args={[0.07, 0.28, 12]} />
          <meshStandardMaterial color="#dd6b20" roughness={0.4} />
        </mesh>
        {/* Cone White Stripe */}
        <mesh position={[0, 0.12, 0]} castShadow>
          <cylinderGeometry args={[0.045, 0.052, 0.08, 12]} />
          <meshStandardMaterial color="#ffffff" roughness={0.5} />
        </mesh>
      </group>
    </group>
  );
};

// Realistic Smart Traffic Light (True-to-life street design)
const TrafficLight3D = ({ position, isGreen }) => {
  return (
    <group position={position}>
      {/* Concrete base pad */}
      <mesh position={[0, 0.04, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.08, 0.08, 12]} />
        <meshStandardMaterial color="#718096" roughness={0.8} />
      </mesh>

      {/* Realistic metal pole */}
      <mesh position={[0, 0.55, 0]} castShadow>
        <cylinderGeometry args={[0.018, 0.02, 1.0, 12]} />
        <meshStandardMaterial color="#2d3748" metalness={0.5} roughness={0.4} />
      </mesh>

      {/* Horizontal extension arm */}
      <mesh position={[0, 1.05, 0.1]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.012, 0.012, 0.22, 8]} />
        <meshStandardMaterial color="#2d3748" metalness={0.5} roughness={0.4} />
      </mesh>

      {/* Signal housing box */}
      <mesh position={[0, 1.05, 0.22]} castShadow>
        <boxGeometry args={[0.1, 0.24, 0.1]} />
        <meshStandardMaterial color="#1a202c" metalness={0.6} roughness={0.3} />
      </mesh>

      {/* Sun shades/visors for lamps */}
      {[-0.07, 0.0, 0.07].map((yOffset, idx) => (
        <mesh key={idx} position={[0, 1.05 + yOffset, 0.28]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.02, 12, 1, true]} />
          <meshStandardMaterial color="#1a202c" side={THREE.DoubleSide} />
        </mesh>
      ))}

      {/* Red Light (Top) - High Saturated Pure Red */}
      <mesh position={[0, 1.12, 0.26]}>
        <sphereGeometry args={[0.046, 8, 8]} />
        <meshBasicMaterial color={!isGreen ? "#ff0000" : "#2d3748"} />
      </mesh>

      {/* Amber Light (Middle - Solid off) */}
      <mesh position={[0, 1.05, 0.26]}>
        <sphereGeometry args={[0.046, 8, 8]} />
        <meshBasicMaterial color="#2d3748" />
      </mesh>

      {/* Green Light (Bottom) - High Saturated Pure Green */}
      <mesh position={[0, 0.98, 0.26]}>
        <sphereGeometry args={[0.046, 8, 8]} />
        <meshBasicMaterial color={isGreen ? "#00ff00" : "#2d3748"} />
      </mesh>
    </group>
  );
};

// Realistic Cyber Truck / AGV (Silver metallic body, rotating wheels)
const Agent3D = ({ position, lastAction }) => {
  const agentRef = useRef();
  const frontLeftWheelRef = useRef();
  const frontRightWheelRef = useRef();
  const rearLeftWheelRef = useRef();
  const rearRightWheelRef = useRef();

  const rotationY = useMemo(() => {
    if (!lastAction) return 0;
    switch (lastAction.action_label) {
      case 'UP': return 0;              // North (-Z)
      case 'DOWN': return Math.PI;        // South (+Z)
      case 'LEFT': return Math.PI / 2;    // West (-X)
      case 'RIGHT': return -Math.PI / 2;   // East (+X)
      default: return 0;
    }
  }, [lastAction]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    // Simulate wheel rotation based on time (ticks)
    const wheelRot = t * 9;
    if (frontLeftWheelRef.current) frontLeftWheelRef.current.rotation.x = wheelRot;
    if (frontRightWheelRef.current) frontRightWheelRef.current.rotation.x = wheelRot;
    if (rearLeftWheelRef.current) rearLeftWheelRef.current.rotation.x = wheelRot;
    if (rearRightWheelRef.current) rearRightWheelRef.current.rotation.x = wheelRot;
  });

  return (
    <group ref={agentRef} position={position} rotation={[0, rotationY, 0]}>

      {/* 1. Vibrant Lime Green Metallic Body */}
      <mesh castShadow receiveShadow position={[0, 0.12, 0]}>
        <boxGeometry args={[0.62, 0.14, 0.82]} />
        <meshStandardMaterial color="#9bff05ff" roughness={0.15} metalness={0.8} />
      </mesh>

      {/* Sporty Racing Stripe (Matte Black) down the hood & tail */}
      <mesh position={[0, 0.191, 0]} castShadow>
        <boxGeometry args={[0.12, 0.002, 0.822]} />
        <meshStandardMaterial color="#1a202c" roughness={0.85} />
      </mesh>

      {/* 2. Sleek Slanted Roof cabin */}
      <mesh position={[0, 0.25, -0.05]} castShadow>
        <boxGeometry args={[0.52, 0.14, 0.54]} />
        <meshStandardMaterial color="#4a5568" roughness={0.15} metalness={0.6} />
      </mesh>

      {/* Windows (Dark glass panes) */}
      <mesh position={[0, 0.25, -0.05]}>
        <boxGeometry args={[0.526, 0.13, 0.53]} />
        <meshStandardMaterial color="#1a202c" roughness={0.0} metalness={1.0} />
      </mesh>

      {/* Front Windshield slant */}
      <mesh position={[0, 0.21, -0.28]} rotation={[-0.45, 0, 0]} castShadow>
        <boxGeometry args={[0.52, 0.04, 0.24]} />
        <meshStandardMaterial color="#1a202c" roughness={0.0} metalness={1.0} />
      </mesh>

      {/* Black Wheel Fenders */}
      {[-0.32, 0.32].map((x, i) =>
        [-0.20, 0.20].map((z, j) => (
          <mesh key={`${i}-${j}`} position={[x, 0.08, z]} castShadow>
            <boxGeometry args={[0.04, 0.12, 0.22]} />
            <meshStandardMaterial color="#1a202c" roughness={0.7} />
          </mesh>
        ))
      )}

      {/* Bright Headlights */}
      {[-0.22, 0.22].map((x, idx) => (
        <mesh key={idx} position={[x, 0.13, -0.425]}>
          <boxGeometry args={[0.06, 0.02, 0.015]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={2.0} />
        </mesh>
      ))}

      {/* Red Tail Brake Lights */}
      {[-0.22, 0.22].map((x, idx) => (
        <mesh key={idx} position={[x, 0.13, 0.425]}>
          <boxGeometry args={[0.06, 0.02, 0.015]} />
          <meshStandardMaterial color="#e53e3e" emissive="#e53e3e" emissiveIntensity={1.5} />
        </mesh>
      ))}

      {/* Heavy Rubber Tires with silver rims */}

      {/* Front Left */}
      <group position={[-0.33, 0.03, -0.20]}>
        <mesh ref={frontLeftWheelRef} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.125, 0.125, 0.06, 16]} />
          <meshStandardMaterial color="#1a202c" roughness={0.9} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.06, 0.06, 0.065, 8]} />
          <meshStandardMaterial color="#a0aec0" metalness={0.7} roughness={0.3} />
        </mesh>
      </group>

      {/* Front Right */}
      <group position={[0.33, 0.03, -0.20]}>
        <mesh ref={frontRightWheelRef} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.125, 0.125, 0.06, 16]} />
          <meshStandardMaterial color="#1a202c" roughness={0.9} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.06, 0.06, 0.065, 8]} />
          <meshStandardMaterial color="#a0aec0" metalness={0.7} roughness={0.3} />
        </mesh>
      </group>

      {/* Rear Left */}
      <group position={[-0.33, 0.03, 0.20]}>
        <mesh ref={rearLeftWheelRef} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.125, 0.125, 0.06, 16]} />
          <meshStandardMaterial color="#1a202c" roughness={0.9} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.06, 0.06, 0.065, 8]} />
          <meshStandardMaterial color="#a0aec0" metalness={0.7} roughness={0.3} />
        </mesh>
      </group>

      {/* Rear Right */}
      <group position={[0.33, 0.03, 0.20]}>
        <mesh ref={rearRightWheelRef} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.125, 0.125, 0.06, 16]} />
          <meshStandardMaterial color="#1a202c" roughness={0.9} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.06, 0.06, 0.065, 8]} />
          <meshStandardMaterial color="#a0aec0" metalness={0.7} roughness={0.3} />
        </mesh>
      </group>

    </group>
  );
};

// Realistic Sports Car (Dynamic Obstacle)
const CityCarObstacle3D = ({ position }) => {
  const wheelRef = useRef();

  useFrame(({ clock }) => {
    if (wheelRef.current) wheelRef.current.rotation.x = clock.getElapsedTime() * 9.5;
  });

  return (
    <group position={position}>
      {/* 1. Red Metallic Sports Car Chassis */}
      <mesh castShadow receiveShadow position={[0, 0.09, 0]}>
        <boxGeometry args={[0.58, 0.13, 0.76]} />
        <meshStandardMaterial color="#e53e3e" roughness={0.2} metalness={0.8} />
      </mesh>

      {/* Sports cabin */}
      <mesh position={[0, 0.18, -0.04]} castShadow>
        <boxGeometry args={[0.46, 0.10, 0.44]} />
        <meshStandardMaterial color="#2d3748" roughness={0.1} metalness={0.6} />
      </mesh>

      {/* Glass windshield windows */}
      <mesh position={[0, 0.18, -0.04]}>
        <boxGeometry args={[0.466, 0.09, 0.43]} />
        <meshStandardMaterial color="#1a202c" roughness={0.0} metalness={1.0} />
      </mesh>

      {/* Front Yellowish Headlights */}
      {[-0.18, 0.18].map((x, idx) => (
        <mesh key={idx} position={[x, 0.10, -0.39]}>
          <boxGeometry args={[0.05, 0.02, 0.015]} />
          <meshStandardMaterial color="#fffff0" emissive="#fffff0" emissiveIntensity={1.8} />
        </mesh>
      ))}

      {/* Rubber Tires */}
      {[-0.30, 0.30].map((x, i) =>
        [-0.18, 0.18].map((z, j) => (
          <mesh
            key={`${i}-${j}`}
            ref={i === 0 && j === 0 ? wheelRef : null}
            position={[x, 0.02, z]}
            rotation={[0, 0, Math.PI / 2]}
            castShadow
          >
            <cylinderGeometry args={[0.11, 0.11, 0.05, 12]} />
            <meshStandardMaterial color="#1a202c" roughness={0.9} />
          </mesh>
        ))
      )}
    </group>
  );
};

// Realistic Brick / Concrete Building (Static Obstacle)
const CityBuilding3D = ({ position, seed }) => {
  const buildingHeight = useMemo(() => 1.4 + (seed % 3) * 0.25, [seed]);

  // Custom texture color based on seed - Highly diverse town colors
  const buildingColor = useMemo(() => {
    const colors = [
      '#a0aec0', // Slate gray concrete
      '#e2e8f0', // Cream plaster
      '#ecc94b', // Sunny yellow stucco
      '#dd6b20', // Mediterranean terracotta
      '#e53e3e', // Classic red brick
      '#319795', // Olive teal plaster
      '#ed8936', // Warm orange brick
      '#48bb78', // Pastel green wood
      '#3182ce', // Coastal blue siding
      '#b7791f'  // Ochre stone
    ];
    return colors[seed % colors.length];
  }, [seed]);

  return (
    <group position={[position[0], buildingHeight / 2, position[2]]}>

      {/* Main Building Structure (Brick/Concrete look) */}
      <mesh castShadow receiveShadow position={[0, 0, 0]}>
        <boxGeometry args={[0.88, buildingHeight, 0.88]} />
        <meshStandardMaterial color={buildingColor} roughness={0.7} />
      </mesh>

      {/* Concrete structural base border */}
      <mesh position={[0, -buildingHeight / 2 + 0.06, 0]} receiveShadow>
        <boxGeometry args={[0.92, 0.12, 0.92]} />
        <meshStandardMaterial color="#718096" roughness={0.8} />
      </mesh>

      {/* Classical Grid Multi-pane Glass Windows on all 4 faces (Front, Back, Left, Right) - Highly Optimized for FPS! */}
      {(() => {
        const renderWindowsForFace = (facePos, faceRot) => {
          return (
            <group position={facePos} rotation={faceRot}>
              {[-0.20, 0.20].map((xOffset, xIdx) => 
                [-0.22, 0.22].map((yRatio, yIdx) => {
                  const yPos = buildingHeight * yRatio;
                  return (
                    <group key={`${xIdx}-${yIdx}`} position={[xOffset, yPos, 0.002]}>
                      {/* Dark Blue Reflective Glass Window Pane (Shadow rendering disabled for ultra FPS boost!) */}
                      <mesh>
                        <planeGeometry args={[0.20, 0.16]} />
                        <meshStandardMaterial color="#1a365d" roughness={0.05} metalness={0.9} />
                      </mesh>
                      {/* Subtle elegant window framing outline around the pane */}
                      <mesh position={[0, 0, -0.001]}>
                        <planeGeometry args={[0.216, 0.176]} />
                        <meshStandardMaterial color="#1a202c" roughness={0.5} />
                      </mesh>
                    </group>
                  );
                })
              )}
            </group>
          );
        };

        return (
          <group>
            {/* Front Side */}
            {renderWindowsForFace([0, 0, 0.441], [0, 0, 0])}
            {/* Back Side */}
            {renderWindowsForFace([0, 0, -0.441], [0, Math.PI, 0])}
            {/* Left Side */}
            {renderWindowsForFace([-0.441, 0, 0], [0, -Math.PI / 2, 0])}
            {/* Right Side */}
            {renderWindowsForFace([0.441, 0, 0], [0, Math.PI / 2, 0])}
          </group>
        );
      })()}

      {/* Concrete Roof Ledge (Slightly lifted by 0.02 to completely avoid Y-overlap Z-fighting/flickering!) */}
      <mesh position={[0, buildingHeight / 2 + 0.02, 0]} castShadow>
        <boxGeometry args={[0.92, 0.04, 0.92]} />
        <meshStandardMaterial color="#4a5568" roughness={0.8} />
      </mesh>

      {/* Roof Chimney / AC Ventilation unit */}
      <mesh position={[0.15, buildingHeight / 2 + 0.06, -0.15]} castShadow>
        <boxGeometry args={[0.18, 0.12, 0.18]} />
        <meshStandardMaterial color="#718096" roughness={0.5} metalness={0.5} />
      </mesh>
    </group>
  );
};

// Background Highway Traffic (Realistic cars in distant paths)
const BackgroundHighwayTraffic = ({ size }) => {
  const carsCount = 4;
  const highwayX1 = -size / 2 - 4.5;
  const highwayX2 = size / 2 + 4.5;
  const highwayZ1 = -size / 2 - 4.5;
  const highwayZ2 = size / 2 + 4.5;

  const cars = useMemo(() => {
    return Array.from({ length: carsCount }).map((_, idx) => {
      const isVertical = idx >= carsCount / 2;
      return {
        id: idx,
        isVertical,
        fixed: isVertical ? (idx % 2 === 0 ? highwayX1 : highwayX2) : (idx % 2 === 0 ? highwayZ1 : highwayZ2),
        speed: (8 + Math.random() * 4) * (idx % 2 === 0 ? -1 : 1),
        color: idx % 3 === 0 ? '#3182ce' : idx % 3 === 1 ? '#d69e2e' : '#e53e3e',
        offset: -45 + Math.random() * 90
      };
    });
  }, [size, carsCount, highwayX1, highwayX2, highwayZ1, highwayZ2]);

  const carRefs = useRef([]);

  useFrame(({ clock }) => {
    const elapsed = clock.getElapsedTime();
    cars.forEach((car, idx) => {
      const ref = carRefs.current[idx];
      if (ref) {
        let currentPos = car.offset + car.speed * elapsed;
        const limit = 45;
        if (currentPos > limit) currentPos = -limit;
        if (currentPos < -limit) currentPos = limit;

        if (car.isVertical) {
          ref.position.set(car.fixed, 0.08, currentPos);
          ref.rotation.set(0, car.speed > 0 ? 0 : Math.PI, 0);
        } else {
          ref.position.set(currentPos, 0.08, car.fixed);
          ref.rotation.set(0, car.speed > 0 ? Math.PI / 2 : -Math.PI / 2, 0);
        }
      }
    });
  });

  return (
    <group>
      {cars.map((car, idx) => (
        <group key={car.id} ref={el => carRefs.current[idx] = el}>
          {/* Realistic sedan car */}
          <mesh castShadow>
            <boxGeometry args={[0.32, 0.11, 0.50]} />
            <meshStandardMaterial color={car.color} roughness={0.3} metalness={0.7} />
          </mesh>
          <mesh position={[0, 0.08, -0.02]} castShadow>
            <boxGeometry args={[0.24, 0.06, 0.24]} />
            <meshStandardMaterial color="#2d3748" roughness={0.1} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

// 3D LiDAR Sensor Laser Rays (Fine visual grid scan lines)
const LiDARBeams = ({ agentPos, calculatedRays }) => {
  if (!agentPos || !calculatedRays.length) return null;

  return (
    <group>
      {calculatedRays.map((ray, idx) => {
        const start = new THREE.Vector3(agentPos[0], 0.25, agentPos[2]);
        const end = new THREE.Vector3(ray.x, 0.25, ray.z);
        const distance = start.distanceTo(end);

        const position = start.clone().lerp(end, 0.5);
        const direction = new THREE.Vector3().subVectors(end, start).normalize();

        const up = new THREE.Vector3(0, 1, 0);
        const quaternion = new THREE.Quaternion().setFromUnitVectors(up, direction);

        return (
          <group key={idx}>
            <mesh position={position} quaternion={quaternion}>
              <cylinderGeometry args={[0.004, 0.004, distance, 3]} />
              <meshBasicMaterial
                color={ray.hitObstacle ? "#ef4444" : "#10b981"}
                transparent
                opacity={0.25}
              />
            </mesh>
            {ray.hitObstacle && (
              <mesh position={end}>
                <sphereGeometry args={[0.028, 4, 4]} />
                <meshBasicMaterial color="#ef4444" />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
};

// ─── CAMERA MANAGER (SMOOTH CHASE & FIRST PERSON VIEWPORTS) ───
const CameraController = ({ cameraMode, agent3DPos, lastAction }) => {
  const { camera } = useThree();
  const currentAngleRef = useRef(0);

  useFrame((state, delta) => {
    if (!agent3DPos) return;

    let targetAngle = 0;
    if (lastAction) {
      switch (lastAction.action_label) {
        case 'UP': targetAngle = 0; break;
        case 'DOWN': targetAngle = Math.PI; break;
        case 'LEFT': targetAngle = Math.PI / 2; break;
        case 'RIGHT': targetAngle = -Math.PI / 2; break;
        default: targetAngle = 0; break;
      }
    }

    let diff = targetAngle - currentAngleRef.current;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));

    const lerpSpeed = 7.0;
    currentAngleRef.current += diff * Math.min(delta * lerpSpeed, 1.0);

    const fx = -Math.sin(currentAngleRef.current);
    const fz = -Math.cos(currentAngleRef.current);
    const bx = -fx;
    const bz = -fz;

    if (cameraMode === 'fps') {
      const targetCamPos = [
        agent3DPos[0] + bx * 0.05,
        0.34,
        agent3DPos[2] + bz * 0.05
      ];
      const targetLookAt = [
        agent3DPos[0] + fx * 4.0,
        0.18,
        agent3DPos[2] + fz * 4.0
      ];

      camera.position.lerp(new THREE.Vector3(...targetCamPos), 0.18);
      camera.lookAt(new THREE.Vector3(...targetLookAt));
    }
    else if (cameraMode === 'tps') {
      const targetCamPos = [
        agent3DPos[0] + bx * 3.2,
        1.7,
        agent3DPos[2] + bz * 3.2
      ];
      const targetLookAt = [
        agent3DPos[0] + fx * 1.0,
        0.2,
        agent3DPos[2] + fz * 1.0
      ];

      camera.position.lerp(new THREE.Vector3(...targetCamPos), 0.14);
      camera.lookAt(new THREE.Vector3(...targetLookAt));
    }
  });

  return null;
};

// ─── MAIN 3D SIMULATOR COMPONENT ───

export default function Simulation3D({ size, baseGrid, agentPos, goalPos, waypoints = [], currentWaypointIndex = 0, trafficLights = [], lightsGreen = false, dynamicObstacles, lastAction }) {
  const [cameraMode, setCameraMode] = useState('orbit');
  const halfGrid = size / 2;

  const to3DCoords = (row, col, height = 0.0) => {
    return [
      col - halfGrid + 0.5,
      height,
      row - halfGrid + 0.5
    ];
  };

  const asphaltTexture = useMemo(() => createAsphaltTexture(), []);
  const grassTexture = useMemo(() => createGrassTexture(), []);

  // 8-Directional LiDAR Calculation
  const calculatedRays = useMemo(() => {
    if (!agentPos) return [];

    const dirs = [
      { r: 0, c: -1 }, // SOL
      { r: 1, c: -1 }, // SOL-AŞAĞI
      { r: 1, c: 0 }, // AŞAĞI
      { r: 1, c: 1 }, // SAĞ-AŞAĞI
      { r: 0, c: 1 }, // SAĞ
      { r: -1, c: 1 }, // SAĞ-YUKARI
      { r: -1, c: 0 }, // YUKARI
      { r: -1, c: -1 }  // SOL-YUKARI
    ];

    return dirs.map(dir => {
      let currR = agentPos.row;
      let currC = agentPos.col;
      let hit = false;
      let steps = 0;
      const maxSteps = 7;

      while (steps < maxSteps) {
        currR += dir.r;
        currC += dir.c;
        steps++;

        if (currR < 0 || currR >= size || currC < 0 || currC >= size) {
          hit = true;
          currR = Math.max(0, Math.min(size - 1, currR));
          currC = Math.max(0, Math.min(size - 1, currC));
          break;
        }

        if (baseGrid[currR]?.[currC] === 'obstacle') {
          hit = true;
          break;
        }

        const isDyn = dynamicObstacles.some(o => o.row === currR && o.col === currC);
        if (isDyn) {
          hit = true;
          break;
        }
      }

      const endCoords = to3DCoords(currR, currC, 0.0);
      return {
        x: endCoords[0],
        z: endCoords[2],
        hitObstacle: hit
      };
    });
  }, [agentPos, size, baseGrid, dynamicObstacles]);

  // Static Obstacles list
  const staticObstacles = useMemo(() => {
    const list = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (baseGrid[r]?.[c] === 'obstacle') {
          list.push({ r, c, id: `${r}-${c}`, seed: r * 13 + c * 7 });
        }
      }
    }
    return list;
  }, [baseGrid, size]);

  // Beautiful Scattered Trees on the sidewalks and surrounding grass fields
  const treePositions = useMemo(() => {
    const list = [];

    // 1. Scattered pine trees on the green grass outside the city pavement grid
    const countOnGrass = 28;
    const radiusStart = size / 2 + 1.2;
    for (let i = 0; i < countOnGrass; i++) {
      const angle = (i / countOnGrass) * Math.PI * 2 + (i % 3) * 0.15;
      const dist = radiusStart + 1.0 + (i % 4) * 2.0;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      list.push({
        id: `tree-g-${i}`,
        pos: [x, 0, z],
        scale: 0.8 + (i % 4) * 0.12 // diverse tree heights
      });
    }

    // 2. Sidewalk trees along the outer concrete boundaries of the town grid (safe zones)
    for (let i = -halfGrid + 1.5; i < halfGrid; i += 3) {
      // North sidewalk boundary
      list.push({ id: `tree-s-n-${i}`, pos: [i, 0, -halfGrid - 0.25], scale: 0.75 + (i % 2) * 0.1 });
      // South sidewalk boundary
      list.push({ id: `tree-s-s-${i}`, pos: [i, 0, halfGrid + 0.25], scale: 0.75 + (i % 2) * 0.1 });
      // West sidewalk boundary
      list.push({ id: `tree-s-w-${i}`, pos: [-halfGrid - 0.25, 0, i], scale: 0.75 + (i % 2) * 0.1 });
      // East sidewalk boundary
      list.push({ id: `tree-s-e-${i}`, pos: [halfGrid + 0.25, 0, i], scale: 0.75 + (i % 2) * 0.1 });
    }

    return list;
  }, [size, halfGrid]);

  const agent3DPos = useMemo(() => {
    return agentPos ? to3DCoords(agentPos.row, agentPos.col, 0.01) : null;
  }, [agentPos, size]);

  const goal3DPos = useMemo(() => {
    return goalPos ? to3DCoords(goalPos.row, goalPos.col, 0.0) : null;
  }, [goalPos, size]);

  const remainingWaypoints3D = useMemo(() => {
    return waypoints.slice(currentWaypointIndex).map((w, idx) => ({
      id: `wp-${idx}-${w.row}-${w.col}`,
      pos: to3DCoords(w.row, w.col, 0.0)
    }));
  }, [waypoints, currentWaypointIndex, size]);

  const trafficLights3D = useMemo(() => {
    return trafficLights.map((t, idx) => ({
      id: `tl-${idx}-${t.row}-${t.col}`,
      pos: to3DCoords(t.row, t.col, 0.0)
    }));
  }, [trafficLights, size]);

  const dynObstacles3D = useMemo(() => {
    return dynamicObstacles.map(o => ({
      id: o.id,
      pos: to3DCoords(o.row, o.col, 0.01)
    }));
  }, [dynamicObstacles, size]);

  return (
    <div style={{ width: '100%', height: '620px', borderRadius: '24px', overflow: 'hidden', border: '1px solid #4a5568', position: 'relative', boxShadow: '0 20px 45px rgba(0,0,0,0.5)', background: '#1a202c' }}>

      {/* ── CAMERA VIEW CONTROLLER ── */}
      <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 10, display: 'flex', gap: '6px', background: 'rgba(26, 32, 44, 0.9)', padding: '5px', borderRadius: '10px', border: '1px solid #4a5568', backdropFilter: 'blur(8px)' }}>
        <button
          onClick={() => setCameraMode('orbit')}
          style={{
            background: cameraMode === 'orbit' ? '#3182ce' : 'transparent',
            color: '#fff',
            border: 'none',
            padding: '7px 14px',
            fontSize: '11px',
            fontWeight: 'bold',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            fontFamily: 'monospace'
          }}
        >
          🎥 SERBEST KAMERA
        </button>
        <button
          onClick={() => setCameraMode('tps')}
          style={{
            background: cameraMode === 'tps' ? '#3182ce' : 'transparent',
            color: '#fff',
            border: 'none',
            padding: '7px 14px',
            fontSize: '11px',
            fontWeight: 'bold',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            fontFamily: 'monospace'
          }}
        >
          🚗 TPS TAKİP
        </button>
        <button
          onClick={() => setCameraMode('fps')}
          style={{
            background: cameraMode === 'fps' ? '#3182ce' : 'transparent',
            color: '#fff',
            border: 'none',
            padding: '7px 14px',
            fontSize: '11px',
            fontWeight: 'bold',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            fontFamily: 'monospace'
          }}
        >
          👁️ SÜRÜCÜ GÖZÜ (FPS)
        </button>
      </div>

      {/* R3F Canvas - High realism, highly optimized, SHADOWS ENABLED for only 1 directional light! */}
      <Canvas shadows camera={{ position: [0, size * 0.8, size * 0.8], fov: 42 }}>

        {/* Beautiful Natural Sky and Sun setting */}
        <Sky
          distance={450000}
          sunPosition={[20, 25, 20]}
          turbidity={4}
          rayleigh={1.0}
          mieCoefficient={0.005}
          mieDirectionalG={0.8}
        />

        {/* Ambient fill light */}
        <ambientLight intensity={0.55} />

        {/* Primary Sunlight (The ONLY shadow-casting light in the entire scene! Highly Optimized!) */}
        <directionalLight
          castShadow
          position={[25, 45, 20]}
          intensity={1.2}
          shadow-mapSize={[1024, 1024]}
          shadow-camera-far={100}
          shadow-camera-left={-size}
          shadow-camera-right={size}
          shadow-camera-top={size}
          shadow-camera-bottom={-size}
        />

        {/* Outer Grass Field Terrain (Receive Shadow) */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
          <planeGeometry args={[800, 800]} />
          <meshStandardMaterial
            map={grassTexture}
            map-repeat={[24, 24]}
            roughness={0.9}
          />
        </mesh>

        {/* Outer Ring Road (Realistic dark concrete highway) */}
        {[-size / 2 - 4.5, size / 2 + 4.5].map((xVal, idx) => (
          <mesh key={`h-v-${idx}`} rotation={[-Math.PI / 2, 0, 0]} position={[xVal, 0.005, 0]} receiveShadow>
            <planeGeometry args={[1.5, 90]} />
            <meshStandardMaterial map={asphaltTexture} map-repeat={[1, 10]} roughness={0.7} />
          </mesh>
        ))}
        {[-size / 2 - 4.5, size / 2 + 4.5].map((zVal, idx) => (
          <mesh key={`h-h-${idx}`} rotation={[-Math.PI / 2, 0, Math.PI / 2]} position={[0, 0.005, zVal]} receiveShadow>
            <planeGeometry args={[1.5, 90]} />
            <meshStandardMaterial map={asphaltTexture} map-repeat={[1, 10]} roughness={0.7} />
          </mesh>
        ))}

        {/* Highway Traffic */}
        <BackgroundHighwayTraffic size={size} />

        {/* Main Test Arena Asphalt Surface */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]} receiveShadow>
          <planeGeometry args={[size + 0.1, size + 0.1]} />
          <meshStandardMaterial
            map={asphaltTexture}
            map-repeat={[size / 2, size / 2]}
            roughness={0.75}
            metalness={0.1}
          />
        </mesh>

        {/* Realistic Concrete Sidewalk Borders (Çevre Bordür Taşları ve Kaldırım) */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]} receiveShadow>
          <ringGeometry args={[size / 2, size / 2 + 0.12, 4]} />
          <meshStandardMaterial color="#a0aec0" roughness={0.8} />
        </mesh>

        {/* Road Lane Markings (White dashed outer edge borders) */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]}>
          <ringGeometry args={[size / 2 - 0.03, size / 2, 4]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.6} />
        </mesh>

        {/* Grid Road Lane Dividers (Dashed Yellow/White Highway lines) */}
        {Array.from({ length: size }).map((_, i) => (
          <group key={i}>
            {i % 2 === 0 && (
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, i - halfGrid + 0.5]}>
                <planeGeometry args={[size, 0.012]} />
                <meshBasicMaterial color="#ffffff" opacity={0.25} transparent />
              </mesh>
            )}
            {i % 2 === 0 && (
              <mesh rotation={[-Math.PI / 2, 0, Math.PI / 2]} position={[i - halfGrid + 0.5, 0.004, 0]}>
                <planeGeometry args={[size, 0.012]} />
                <meshBasicMaterial color="#ffffff" opacity={0.25} transparent />
              </mesh>
            )}
          </group>
        ))}

        {/* Beautiful Scattered Pine Trees */}
        {treePositions.map(t => (
          <Tree3D key={t.id} position={t.pos} scale={t.scale} />
        ))}

        {/* Realistic Static Buildings (Brick/Concrete houses) */}
        {staticObstacles.map(obs => (
          <CityBuilding3D key={obs.id} position={to3DCoords(obs.r, obs.c, 0.0)} seed={obs.seed} />
        ))}

        {/* Realistic Golden Goal Trophy */}
        {goal3DPos && <Goal3D position={goal3DPos} />}

        {/* Realistic Orange Checkpoint Waypoints */}
        {remainingWaypoints3D.map(w => (
          <Waypoint3D key={w.id} position={w.pos} />
        ))}

        {/* Realistic Traffic Lights */}
        {trafficLights3D.map(t => (
          <TrafficLight3D key={t.id} position={t.pos} isGreen={lightsGreen} />
        ))}

        {/* Agent (Brushed Steel Cybertruck) */}
        {agent3DPos && <Agent3D position={agent3DPos} lastAction={lastAction} />}

        {/* Red Sports Cars (Dynamic Obstacles) */}
        {dynObstacles3D.map(o => (
          <CityCarObstacle3D key={o.id} position={o.pos} />
        ))}

        {/* LiDAR Lazeri Işınları */}
        {agent3DPos && <LiDARBeams agentPos={agent3DPos} calculatedRays={calculatedRays} />}

        {/* Dynamic Camera Controllers */}
        <CameraController cameraMode={cameraMode} agent3DPos={agent3DPos} lastAction={lastAction} />

        {/* Orbit Controls (Only active in free orbit mode) */}
        <OrbitControls
          enabled={cameraMode === 'orbit'}
          enableDamping
          dampingFactor={0.08}
          maxPolarAngle={Math.PI / 2 - 0.06}
          minDistance={2.0}
          maxDistance={size * 1.5}
        />
      </Canvas>

      {/* City Twin Info Panel Card */}
      <div style={{ position: 'absolute', bottom: '20px', left: '20px', color: '#fff', fontSize: '11px', background: 'rgba(26, 32, 44, 0.95)', padding: '15px 20px', borderRadius: '14px', border: '1px solid #4a5568', pointerEvents: 'none', fontFamily: 'monospace', backdropFilter: 'blur(8px)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', lineHeight: '1.6' }}>
        <div style={{ color: '#3182ce', fontWeight: 'bold', marginBottom: '6px', fontSize: '13px', letterSpacing: '0.5px' }}>
          🏡 TOWN SIMULATOR (UNITY 3D ENGINE STYLE)
        </div>
        <div>• SOL TIK + SÜRÜKLE: Kamerayı Serbest Döndür</div>
        <div>• MAUSE TEKERLEĞİ: Yakınlaşma / Uzaklaşma Kontrolü</div>
        <div>• SAĞ ÜST PANEL: Kamera Açıları Arası Geçiş Yap</div>
        <div style={{ color: '#48bb78', marginTop: '6px', fontWeight: 'bold' }}>
          ENGINE STATUS: ACTIVE · REAL SHADOWS: ON · 60 FPS SOLID
        </div>
      </div>
    </div>
  );
}
