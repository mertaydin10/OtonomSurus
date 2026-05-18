// src/components/Simulation3D.jsx
import React, { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Sky } from '@react-three/drei';
import * as THREE from 'three';

// ─── GEOMETRİK VE ESTETİK BİLEŞENLER ───

// Havada Dönen Enerji Çekirdeği (Hedef)
const Goal3D = ({ position }) => {
  const groupRef = useRef();
  const ringRef = useRef();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.position.y = position[1] + Math.sin(t * 3) * 0.1 + 0.1;
      groupRef.current.rotation.y = t * 0.4;
    }
    if (ringRef.current) {
      ringRef.current.rotation.x = t * 1.5;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      <mesh>
        <sphereGeometry args={[0.2, 12, 12]} />
        <meshStandardMaterial 
          color="#38bdf8" 
          roughness={0.1} 
          metalness={0.9}
          emissive="#0284c7"
          emissiveIntensity={1.0}
        />
      </mesh>
      <mesh ref={ringRef}>
        <torusGeometry args={[0.34, 0.02, 6, 32]} />
        <meshStandardMaterial color="#0ea5e9" roughness={0.2} metalness={0.8} />
      </mesh>
    </group>
  );
};

// Havada Dönen Enerji Konisi (Uğrak Noktası / Durak)
const Waypoint3D = ({ position }) => {
  const groupRef = useRef();
  const ringRef = useRef();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.position.y = position[1] + Math.sin(t * 3.5) * 0.08 + 0.1;
      groupRef.current.rotation.y = -t * 0.5;
    }
    if (ringRef.current) {
      ringRef.current.rotation.z = t * 1.8;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      <mesh>
        <coneGeometry args={[0.16, 0.35, 8]} />
        <meshStandardMaterial 
          color="#fbbf24" 
          roughness={0.1} 
          metalness={0.8}
          emissive="#d97706"
          emissiveIntensity={1.2}
        />
      </mesh>
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.26, 0.015, 6, 24]} />
        <meshStandardMaterial color="#fbbf24" roughness={0.2} metalness={0.8} />
      </mesh>
    </group>
  );
};

// Akıllı Parıldayan 3D Trafik Işığı Direği
const TrafficLight3D = ({ position, isGreen }) => {
  const lightRef = useRef();

  useFrame(({ clock }) => {
    if (lightRef.current) {
      const t = clock.getElapsedTime();
      lightRef.current.emissiveIntensity = 1.0 + Math.sin(t * 4) * 0.3;
    }
  });

  return (
    <group position={position}>
      {/* İnce Metalik Direk */}
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.5, 8]} />
        <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Sinyal Lambası Gövdesi */}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[0.1, 0.18, 0.1]} />
        <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Aktif Işık Haznesi */}
      <mesh ref={lightRef} position={[0, 0.5, 0.05]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial 
          color={isGreen ? "#22c55e" : "#ef4444"} 
          roughness={0.1}
          metalness={0.1}
          emissive={isGreen ? "#22c55e" : "#ef4444"}
          emissiveIntensity={1.2}
        />
      </mesh>
    </group>
  );
};

// Otonom Akıllı Şehir Teslimat AGV'si (Ajan)
const Agent3D = ({ position, lastAction }) => {
  const agentRef = useRef();
  const lidarRef = useRef();

  // 🔄 Kamyonun Grid ve 3D Dünya Uyumlu Dönüş Açısı (Kamyon varsayılan olarak Kuzeye yani -Z yönüne bakar)
  const rotationY = useMemo(() => {
    if (!lastAction) return 0; // Başlangıçta kuzeye baksın
    switch (lastAction.action_label) {
      case 'UP':    return 0;              // Kuzey (-Z)
      case 'DOWN':  return Math.PI;        // Güney (+Z)
      case 'LEFT':  return Math.PI / 2;    // Batı (-X)
      case 'RIGHT': return -Math.PI / 2;   // Doğu (+X)
      default:      return 0;
    }
  }, [lastAction]);

  useFrame(({ clock }) => {
    if (lidarRef.current) {
      lidarRef.current.rotation.y = clock.getElapsedTime() * 5;
    }
  });

  return (
    <group ref={agentRef} position={position} rotation={[0, rotationY, 0]}>
      {/* Şasi */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.7, 0.15, 0.85]} />
        <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.8} />
      </mesh>

      {/* Kokpit */}
      <mesh position={[0, 0.16, -0.05]} castShadow>
        <boxGeometry args={[0.55, 0.18, 0.65]} />
        <meshStandardMaterial 
          color="#0284c7" 
          roughness={0.1} 
          metalness={0.9} 
          emissive="#0369a1" 
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* LiDAR Sensör Kafası */}
      <group position={[0, 0.25, -0.15]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.07, 0.07, 0.05, 8]} />
          <meshStandardMaterial color="#334155" metalness={0.8} />
        </mesh>
        <mesh ref={lidarRef} position={[0, 0.03, 0]}>
          <cylinderGeometry args={[0.09, 0.09, 0.03, 8]} />
          <meshStandardMaterial color="#0f172a" emissive="#38bdf8" emissiveIntensity={0.6} />
        </mesh>
      </group>

      {/* Farlar */}
      {[-0.22, 0.22].map((x, idx) => (
        <mesh key={idx} position={[x, 0.04, -0.44]}>
          <boxGeometry args={[0.08, 0.04, 0.02]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      ))}

      {/* Stop Lambaları */}
      {[-0.22, 0.22].map((x, idx) => (
        <mesh key={idx} position={[x, 0.04, 0.44]}>
          <boxGeometry args={[0.08, 0.04, 0.02]} />
          <meshBasicMaterial color="#f43f5e" />
        </mesh>
      ))}

      {/* Tekerlekler */}
      {[-0.35, 0.35].map((x, i) => 
        [-0.22, 0.22].map((z, j) => (
          <mesh key={`${i}-${j}`} position={[x, -0.06, z]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.13, 0.13, 0.07, 8]} />
            <meshStandardMaterial color="#111827" roughness={0.9} />
          </mesh>
        ))
      )}
    </group>
  );
};

// Şehir İçi Otonom Araç (Dinamik Engel)
const CityCarObstacle3D = ({ position }) => {
  return (
    <group position={position}>
      {/* Gövde */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.62, 0.18, 0.75]} />
        <meshStandardMaterial color="#eab308" roughness={0.2} metalness={0.7} />
      </mesh>
      
      {/* Cam Kokpit */}
      <mesh position={[0, 0.14, -0.04]} castShadow>
        <boxGeometry args={[0.48, 0.12, 0.42]} />
        <meshStandardMaterial color="#0f172a" roughness={0.0} metalness={1.0} />
      </mesh>

      {/* Ön Farlar */}
      {[-0.2, 0.2].map((x, idx) => (
        <mesh key={idx} position={[x, 0.03, -0.38]}>
          <boxGeometry args={[0.07, 0.03, 0.02]} />
          <meshBasicMaterial color="#ffffcc" />
        </mesh>
      ))}

      {/* Tekerlekler */}
      {[-0.32, 0.32].map((x, i) => 
        [-0.20, 0.20].map((z, j) => (
          <mesh key={`${i}-${j}`} position={[x, -0.07, z]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.1, 0.1, 0.05, 8]} />
            <meshStandardMaterial color="#1f2937" roughness={0.9} />
          </mesh>
        ))
      )}
    </group>
  );
};

// Şehir Binası (Sabit Engel)
const CityBuilding3D = ({ position }) => {
  return (
    <group position={position}>
      {/* Ana Cam Kule */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.9, 1.2, 0.9]} />
        <meshStandardMaterial 
          color="#1e293b" 
          roughness={0.15} 
          metalness={0.85} 
          emissive="#38bdf8"
          emissiveIntensity={0.08}
        />
      </mesh>
      
      {/* Tepedeki Paratoner */}
      <group position={[0, 0.6, 0]}>
        <mesh>
          <cylinderGeometry args={[0.015, 0.015, 0.2, 6]} />
          <meshStandardMaterial color="#64748b" metalness={0.9} />
        </mesh>
        <mesh position={[0, 0.1, 0]}>
          <sphereGeometry args={[0.035, 8, 8]} />
          <meshBasicMaterial color="#ef4444" />
        </mesh>
      </group>
    </group>
  );
};

// Çevrede Akan Trafik
const BackgroundHighwayTraffic = ({ size }) => {
  const carsCount = 6;
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
        speed: (12 + Math.random() * 8) * (idx % 2 === 0 ? -1 : 1),
        color: idx % 3 === 0 ? '#ef4444' : idx % 3 === 1 ? '#eab308' : '#3b82f6',
        offset: -40 + Math.random() * 80
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
          <mesh>
            <boxGeometry args={[0.38, 0.12, 0.55]} />
            <meshStandardMaterial color={car.color} roughness={0.3} metalness={0.7} />
          </mesh>
          <mesh position={[0, 0.09, -0.04]}>
            <boxGeometry args={[0.28, 0.07, 0.28]} />
            <meshStandardMaterial color="#0f172a" roughness={0.0} metalness={1.0} />
          </mesh>
          {/* Farlar */}
          {[-0.12, 0.12].map((lx, lIdx) => (
            <mesh key={lIdx} position={[lx, 0.02, -0.28]}>
              <boxGeometry args={[0.05, 0.03, 0.02]} />
              <meshBasicMaterial color="#ffffaa" />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
};

// 3D LiDAR Lazer Işınları
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
              <cylinderGeometry args={[0.006, 0.006, distance, 4]} />
              <meshBasicMaterial 
                color={ray.hitObstacle ? "#ef4444" : "#10b981"} 
                transparent 
                opacity={0.3} 
              />
            </mesh>
            {ray.hitObstacle && (
              <mesh position={end}>
                <sphereGeometry args={[0.035, 6, 6]} />
                <meshBasicMaterial color="#ef4444" />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
};

// ─── KAMERA YÖNETİCİSİ (DİNAMİK KAMERA AÇILARI) ───
const CameraController = ({ cameraMode, agent3DPos, lastAction }) => {
  const { camera } = useThree();
  
  // Kameranın anlık pürüzsüz dönüş açısını saklayan referans (Sıçramaları engellemek için)
  const currentAngleRef = useRef(0);

  useFrame((state, delta) => {
    if (!agent3DPos) return;

    // 🔄 Kamyonun Gitmek İstediği Hedef Açı
    let targetAngle = 0;
    if (lastAction) {
      switch (lastAction.action_label) {
        case 'UP':    targetAngle = 0; break;
        case 'DOWN':  targetAngle = Math.PI; break;
        case 'LEFT':  targetAngle = Math.PI / 2; break;
        case 'RIGHT': targetAngle = -Math.PI / 2; break;
        default:      targetAngle = 0; break;
      }
    }

    // 🔄 En Kısa Yoldan Pürüzsüz Dönüş Açı İnterpolasyonu (Angle Lerp)
    let diff = targetAngle - currentAngleRef.current;
    // Açı farkını [-PI, PI] aralığına alarak en kısa yönden dönmesini garanti ediyoruz
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    
    // Saniyede ~6 radyan hızla pürüzsüzce dön
    const lerpSpeed = 6.5; 
    currentAngleRef.current += diff * Math.min(delta * lerpSpeed, 1.0);

    // 🎯 Yumuşatılmış açıya göre fiziksel yön vektörleri
    const fx = -Math.sin(currentAngleRef.current); // İleri X
    const fz = -Math.cos(currentAngleRef.current); // İleri Z
    const bx = -fx;                                // Geri X
    const bz = -fz;                                // Geri Z

    if (cameraMode === 'fps') {
      // 👁️ Robot Gözü (FPS): Daha yüksek kaput üstü sürüş kamerası (Yükseklik 0.65 -> 1.00 yapıldı)
      const targetCamPos = [
        agent3DPos[0] + bx * 0.12,
        1.0, // Daha yüksek ve ferah bir kaput üstü görüşü
        agent3DPos[2] + bz * 0.12
      ];
      const targetLookAt = [
        agent3DPos[0] + fx * 4.5,
        0.22, // Hafif yola eğimli
        agent3DPos[2] + fz * 4.5
      ];

      camera.position.lerp(new THREE.Vector3(...targetCamPos), 0.15);
      camera.lookAt(new THREE.Vector3(...targetLookAt));
    } 
    else if (cameraMode === 'tps') {
      // 🚗 Takip Kamerası (TPS): Pürüzsüz arkadan takip kamerası
      const targetCamPos = [
        agent3DPos[0] + bx * 3.6,
        2.2,
        agent3DPos[2] + bz * 3.6
      ];
      const targetLookAt = [
        agent3DPos[0] + fx * 0.8,
        0.2,
        agent3DPos[2] + fz * 0.8
      ];

      camera.position.lerp(new THREE.Vector3(...targetCamPos), 0.12);
      camera.lookAt(new THREE.Vector3(...targetLookAt));
    }
  });

  return null;
};

// ─── ANA 3D SIMÜLATÖR BİLEŞENİ ───

export default function Simulation3D({ size, baseGrid, agentPos, goalPos, waypoints = [], currentWaypointIndex = 0, trafficLights = [], lightsGreen = false, dynamicObstacles, lastAction }) {
  const [cameraMode, setCameraMode] = useState('orbit');
  const halfGrid = size / 2;

  // 🌐 Izgara koordinatını 3D Dünya koordinatına doğru eşleme (Sütun -> X, Satır -> Z)
  const to3DCoords = (row, col, height = 0.1) => {
    return [
      col - halfGrid + 0.5, // Sütun X ekseni
      height, 
      row - halfGrid + 0.5  // Satır Z ekseni
    ];
  };

  // 8 Yöndeki LiDAR Lazer Işınlarını Matematiksel Olarak Hesapla
  const calculatedRays = useMemo(() => {
    if (!agentPos) return [];

    const dirs = [
      { r: 0,  c: -1 }, // SOL
      { r: 1,  c: -1 }, // SOL-AŞAĞI
      { r: 1,  c: 0  }, // AŞAĞI
      { r: 1,  c: 1  }, // SAĞ-AŞAĞI
      { r: 0,  c: 1  }, // SAĞ
      { r: -1, c: 1  }, // SAĞ-YUKARI
      { r: -1, c: 0  }, // YUKARI
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

      const endCoords = to3DCoords(currR, currC, 0.1);
      return {
        x: endCoords[0],
        z: endCoords[2],
        hitObstacle: hit
      };
    });
  }, [agentPos, size, baseGrid, dynamicObstacles]);

  // Statik engellerin listesi
  const staticObstacles = useMemo(() => {
    const list = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (baseGrid[r]?.[c] === 'obstacle') {
          list.push({ r, c, id: `${r}-${c}` });
        }
      }
    }
    return list;
  }, [baseGrid, size]);

  // Çevredeki Gökdelenler
  const backgroundSkyscrapers = useMemo(() => {
    const list = [];
    const count = 18;
    const radius = size / 2 + 11.0;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const r = radius + Math.random() * 6.0;
      const h = 5.0 + Math.random() * 11.0;
      const w = 2.2 + Math.random() * 1.8;
      const d = 2.2 + Math.random() * 1.8;
      
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;

      const colors = ['#0f172a', '#1e293b', '#0b0f19', '#111827'];
      const color = colors[Math.floor(Math.random() * colors.length)];

      list.push({
        id: i,
        x,
        z,
        h,
        w,
        d,
        color,
        emissiveColor: Math.random() > 0.5 ? '#38bdf8' : '#0ea5e9'
      });
    }
    return list;
  }, [size]);

  // Ajan 3D Pozisyonu
  const agent3DPos = useMemo(() => {
    return agentPos ? to3DCoords(agentPos.row, agentPos.col, 0.1) : null;
  }, [agentPos, size]);

  // Hedef 3D Pozisyonu
  const goal3DPos = useMemo(() => {
    return goalPos ? to3DCoords(goalPos.row, goalPos.col, 0.15) : null;
  }, [goalPos, size]);

  // Henüz ulaşılmamış duraklar (Waypoints) 3D Pozisyonları
  const remainingWaypoints3D = useMemo(() => {
    return waypoints.slice(currentWaypointIndex).map((w, idx) => ({
      id: `wp-${idx}-${w.row}-${w.col}`,
      pos: to3DCoords(w.row, w.col, 0.15)
    }));
  }, [waypoints, currentWaypointIndex, size]);

  // Trafik Işıkları 3D Pozisyonları
  const trafficLights3D = useMemo(() => {
    return trafficLights.map((t, idx) => ({
      id: `tl-${idx}-${t.row}-${t.col}`,
      pos: to3DCoords(t.row, t.col, 0.0)
    }));
  }, [trafficLights, size]);

  // Dinamik Engellerin 3D Pozisyonları
  const dynObstacles3D = useMemo(() => {
    return dynamicObstacles.map(o => ({
      id: o.id,
      pos: to3DCoords(o.row, o.col, 0.1)
    }));
  }, [dynamicObstacles, size]);

  return (
    <div style={{ width: '100%', height: '580px', borderRadius: '16px', overflow: 'hidden', border: '1px solid #1e293b', position: 'relative', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
      {/* ── KAMERA AÇISI DEĞİŞTİRME BUTONLARI (MODERN FLOATING TABS) ── */}
      <div style={{ position: 'absolute', top: '15px', right: '15px', zIndex: 10, display: 'flex', gap: '4px', background: 'rgba(15, 23, 42, 0.85)', padding: '4px', borderRadius: '8px', border: '1px solid #334155', backdropFilter: 'blur(4px)' }}>
        <button 
          onClick={() => setCameraMode('orbit')}
          style={{
            background: cameraMode === 'orbit' ? '#0ea5e9' : 'transparent',
            color: '#fff',
            border: 'none',
            padding: '6px 12px',
            fontSize: '11px',
            fontWeight: 'bold',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            fontFamily: 'monospace'
          }}
        >
          🎥 SERBEST
        </button>
        <button 
          onClick={() => setCameraMode('tps')}
          style={{
            background: cameraMode === 'tps' ? '#0ea5e9' : 'transparent',
            color: '#fff',
            border: 'none',
            padding: '6px 12px',
            fontSize: '11px',
            fontWeight: 'bold',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            fontFamily: 'monospace'
          }}
        >
          🚗 TAKİP (TPS)
        </button>
        <button 
          onClick={() => setCameraMode('fps')}
          style={{
            background: cameraMode === 'fps' ? '#0ea5e9' : 'transparent',
            color: '#fff',
            border: 'none',
            padding: '6px 12px',
            fontSize: '11px',
            fontWeight: 'bold',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            fontFamily: 'monospace'
          }}
        >
          👁️ ROBOT GÖZÜ (FPS)
        </button>
      </div>

      <Canvas camera={{ position: [0, size * 0.9, size * 0.70], fov: 48 }}>
        {/* Gökyüzü */}
        <Sky 
          distance={450000} 
          sunPosition={[60, 32, 100]} 
          turbidity={5} 
          rayleigh={1.2} 
          mieCoefficient={0.005} 
          mieDirectionalG={0.8} 
        />

        {/* Aydınlatma */}
        <ambientLight intensity={0.65} />
        <pointLight position={[0, 15, 0]} intensity={1.5} color="#0284c7" />
        <directionalLight position={[40, 90, 60]} intensity={1.2} />

        {/* Çimenlik */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
          <planeGeometry args={[600, 600]} />
          <meshStandardMaterial color="#1e3a1e" roughness={0.9} />
        </mesh>

        {/* Dış Çevre Gökdelenleri */}
        {backgroundSkyscrapers.map(b => (
          <group key={b.id} position={[b.x, b.h / 2, b.z]}>
            <mesh>
              <boxGeometry args={[b.w, b.h, b.d]} />
              <meshStandardMaterial 
                color={b.color} 
                roughness={0.15} 
                metalness={0.85} 
                emissive={b.emissiveColor}
                emissiveIntensity={0.08}
              />
            </mesh>
          </group>
        ))}

        {/* Otoyollar */}
        {[-size / 2 - 4.5, size / 2 + 4.5].map((xVal, idx) => (
          <mesh key={`h-v-${idx}`} rotation={[-Math.PI / 2, 0, 0]} position={[xVal, 0.01, 0]}>
            <planeGeometry args={[1.5, 80]} />
            <meshStandardMaterial color="#1e293b" roughness={0.8} />
          </mesh>
        ))}
        {[-size / 2 - 4.5, size / 2 + 4.5].map((zVal, idx) => (
          <mesh key={`h-h-${idx}`} rotation={[-Math.PI / 2, 0, Math.PI / 2]} position={[0, 0.01, zVal]}>
            <planeGeometry args={[1.5, 80]} />
            <meshStandardMaterial color="#1e293b" roughness={0.8} />
          </mesh>
        ))}

        {/* Otoyol Trafiği */}
        <BackgroundHighwayTraffic size={size} />

        {/* Asfalt Test Arenası */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
          <planeGeometry args={[size + 0.2, size + 0.2]} />
          <meshStandardMaterial color="#334155" roughness={0.85} metalness={0.15} />
        </mesh>

        {/* Emniyet Çizgisi */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]}>
          <ringGeometry args={[size / 2 - 0.04, size / 2 + 0.04, 4]} />
          <meshBasicMaterial color="#ffffff" opacity={0.5} transparent />
        </mesh>

        {/* Kılavuz Yol Çizgileri */}
        {Array.from({ length: size }).map((_, i) => (
          <group key={i}>
            {i % 2 === 0 && (
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.007, i - halfGrid + 0.5]}>
                <planeGeometry args={[size, 0.02]} />
                <meshBasicMaterial color="#eab308" opacity={0.35} transparent />
              </mesh>
            )}
            {i % 2 === 0 && (
              <mesh rotation={[-Math.PI / 2, 0, Math.PI / 2]} position={[i - halfGrid + 0.5, 0.007, 0]}>
                <planeGeometry args={[size, 0.02]} />
                <meshBasicMaterial color="#eab308" opacity={0.35} transparent />
              </mesh>
            )}
          </group>
        ))}

        {/* Binalar (Statik Engeller) */}
        {staticObstacles.map(obs => (
          <CityBuilding3D key={obs.id} position={to3DCoords(obs.r, obs.c, 0.6)} />
        ))}

        {/* Hedef */}
        {goal3DPos && <Goal3D position={goal3DPos} />}

        {/* Duraklar (Waypoints) */}
        {remainingWaypoints3D.map(w => (
          <Waypoint3D key={w.id} position={w.pos} />
        ))}

        {/* Trafik Işıkları */}
        {trafficLights3D.map(t => (
          <TrafficLight3D key={t.id} position={t.pos} isGreen={lightsGreen} />
        ))}

        {/* Ajan (Siber Kamyon) */}
        {agent3DPos && <Agent3D position={agent3DPos} lastAction={lastAction} />}

        {/* Sarı Arabalar (Dinamik Engeller) */}
        {dynObstacles3D.map(o => (
          <CityCarObstacle3D key={o.id} position={o.pos} />
        ))}

        {/* LiDAR Işınları */}
        {agent3DPos && <LiDARBeams agentPos={agent3DPos} calculatedRays={calculatedRays} />}

        {/* Dinamik Kamera Kontrolü (FPS / TPS) */}
        <CameraController cameraMode={cameraMode} agent3DPos={agent3DPos} lastAction={lastAction} />

        {/* Serbest Fare Kontrolü (Sadece Orbit modunda aktif!) */}
        <OrbitControls 
          enabled={cameraMode === 'orbit'}
          enableDamping 
          dampingFactor={0.06}
          maxPolarAngle={Math.PI / 2 - 0.08}
          minDistance={3}
          maxDistance={size * 1.8}
        />
      </Canvas>
      
      {/* 3D Bilgi ve Kontrol İpuçları Paneli */}
      <div style={{ position: 'absolute', bottom: '15px', left: '15px', color: '#fff', fontSize: '12px', background: 'rgba(15, 23, 42, 0.95)', padding: '12px 18px', borderRadius: '10px', border: '1px solid #334155', pointerEvents: 'none', fontFamily: 'monospace', backdropFilter: 'blur(6px)', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
        <div style={{ color: '#38bdf8', fontWeight: 'bold', marginBottom: '6px', fontSize: '13px', letterSpacing: '0.5px' }}>🏢 SMART CITY DIGITAL TWIN (AKILLI ŞEHİR SİMÜLATÖRÜ)</div>
        <div>• MOUSE SOL TIK: Kamerayı Serbestçe Döndür (Serbest Mod)</div>
        <div>• SAĞ ÜST PANEL: Kamera Açıları Arasında Geçiş Yap</div>
        <div style={{ color: '#0ea5e9', marginTop: '6px', fontWeight: 'bold' }}>🏙️ KAMERA: {cameraMode.toUpperCase()} AKTİF · 60 FPS ULTRA AKICI</div>
      </div>
    </div>
  );
}
