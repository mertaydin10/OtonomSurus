// src/components/Simulation3D.jsx
import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';

// ─── ALT BİLEŞENLER ───

// Hareketli Altın Hedef Çemberleri
const Goal3D = ({ position }) => {
  const groupRef = useRef();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.rotation.y = t * 1.5;
      groupRef.current.position.y = position[1] + Math.sin(t * 3) * 0.15;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Merkezdeki altın küre */}
      <mesh castShadow>
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshStandardMaterial 
          color="#ffd700" 
          roughness={0.1} 
          metalness={0.8}
          emissive="#ffaa00"
          emissiveIntensity={0.5}
        />
      </mesh>
      {/* Dönen dış halka 1 */}
      <mesh rotation={[Math.PI / 4, 0, 0]}>
        <torusGeometry args={[0.45, 0.04, 16, 100]} />
        <meshStandardMaterial color="#ffd700" roughness={0.2} metalness={0.9} />
      </mesh>
      {/* Dönen dış halka 2 */}
      <mesh rotation={[-Math.PI / 4, Math.PI / 2, 0]}>
        <torusGeometry args={[0.55, 0.03, 16, 100]} />
        <meshStandardMaterial color="#ffaa00" roughness={0.2} metalness={0.9} emissive="#ffaa00" emissiveIntensity={0.2} />
      </mesh>
    </group>
  );
};

// Fütüristik Otonom Araç (Ajan)
const Agent3D = ({ position, lastAction }) => {
  const agentRef = useRef();

  // Ajanın baktığı yönü eyleme göre belirle
  const rotationY = useMemo(() => {
    if (!lastAction) return 0;
    switch (lastAction.action_label) {
      case 'LEFT':  return Math.PI / 2;
      case 'RIGHT': return -Math.PI / 2;
      case 'UP':    return Math.PI;
      case 'DOWN':  return 0;
      default:      return 0;
    }
  }, [lastAction]);

  useFrame(({ clock }) => {
    if (agentRef.current) {
      // Hafif yaylanma efekti
      agentRef.current.position.y = position[1] + Math.sin(clock.getElapsedTime() * 5) * 0.03;
    }
  });

  return (
    <group ref={agentRef} position={position} rotation={[0, rotationY, 0]}>
      {/* Şasi (Gövde) */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.7, 0.25, 0.9]} />
        <meshStandardMaterial 
          color="#00ffff" 
          roughness={0.2} 
          metalness={0.8} 
          emissive="#005577"
          emissiveIntensity={0.3}
        />
      </mesh>
      
      {/* Kokpit (Cam tavan) */}
      <mesh position={[0, 0.2, -0.05]} castShadow>
        <boxGeometry args={[0.5, 0.2, 0.45]} />
        <meshStandardMaterial 
          color="#111" 
          roughness={0.0} 
          metalness={1.0} 
          transparent 
          opacity={0.85} 
        />
      </mesh>

      {/* Parlayan Ön Farlar (Led) */}
      <mesh position={[-0.2, 0.05, -0.46]}>
        <boxGeometry args={[0.15, 0.05, 0.04]} />
        <meshBasicMaterial color="#ffffaa" />
      </mesh>
      <mesh position={[0.2, 0.05, -0.46]}>
        <boxGeometry args={[0.15, 0.05, 0.04]} />
        <meshBasicMaterial color="#ffffaa" />
      </mesh>

      {/* Parlayan Arka Stop Lambaları */}
      <mesh position={[-0.2, 0.05, 0.46]}>
        <boxGeometry args={[0.15, 0.05, 0.04]} />
        <meshBasicMaterial color="#ff0033" />
      </mesh>
      <mesh position={[0.2, 0.05, 0.46]}>
        <boxGeometry args={[0.15, 0.05, 0.04]} />
        <meshBasicMaterial color="#ff0033" />
      </mesh>

      {/* Tekerlekler */}
      {[-0.37, 0.37].map((x, i) => 
        [-0.25, 0.25].map((z, j) => (
          <mesh key={`${i}-${j}`} position={[x, -0.1, z]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.14, 0.14, 0.08, 16]} />
            <meshStandardMaterial color="#222" roughness={0.9} />
          </mesh>
        ))
      )}
    </group>
  );
};

// Hareketli Kırmızı Dron Engel (Dinamik Engel)
const DynamicObstacle3D = ({ position }) => {
  const meshRef = useRef();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (meshRef.current) {
      meshRef.current.rotation.y = t * 2;
      meshRef.current.position.y = position[1] + Math.sin(t * 4 + position[0]) * 0.1;
    }
  });

  return (
    <group ref={meshRef} position={position}>
      {/* Merkez Dron Küresi */}
      <mesh castShadow>
        <sphereGeometry args={[0.28, 32, 32]} />
        <meshStandardMaterial 
          color="#ff0055" 
          roughness={0.1} 
          metalness={0.9}
          emissive="#ff0022"
          emissiveIntensity={0.6}
        />
      </mesh>
      {/* Dış Muhafaza Halkası */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.38, 0.03, 8, 32]} />
        <meshStandardMaterial color="#444" roughness={0.5} />
      </mesh>
      {/* Minik Pervaneler */}
      {[-0.38, 0.38].map((px, i) => (
        <mesh key={i} position={[px, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <boxGeometry args={[0.02, 0.18, 0.02]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
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
        // İki nokta arası mesafe
        const start = new THREE.Vector3(agentPos[0], 0.1, agentPos[2]);
        const end = new THREE.Vector3(ray.x, 0.1, ray.z);
        const distance = start.distanceTo(end);

        // Lazerin yönünü ve açısını hesapla
        const position = start.clone().lerp(end, 0.5);
        const direction = new THREE.Vector3().subVectors(end, start).normalize();
        
        // Işının rotasyonu için Quaternion hesabı
        const up = new THREE.Vector3(0, 1, 0);
        const quaternion = new THREE.Quaternion().setFromUnitVectors(up, direction);

        return (
          <group key={idx}>
            {/* İnce Lazer Işını */}
            <mesh position={position} quaternion={quaternion}>
              <cylinderGeometry args={[0.015, 0.015, distance, 8]} />
              <meshBasicMaterial 
                color={ray.hitObstacle ? "#ff3333" : "#00ff66"} 
                transparent 
                opacity={0.4} 
              />
            </mesh>
            {/* Lazerin Engele Çarptığı Parlak Nokta */}
            {ray.hitObstacle && (
              <mesh position={end}>
                <sphereGeometry args={[0.06, 16, 16]} />
                <meshBasicMaterial color="#ff3333" />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
};

// ─── ANA 3D SIMÜLATÖR BİLEŞENİ ───

export default function Simulation3D({ size, baseGrid, agentPos, goalPos, dynamicObstacles, lastAction }) {
  const halfGrid = size / 2;

  // Izgara koordinatını 3D Dünya koordinatına dönüştür (y = yükseklik, x = satır, z = sütun)
  const to3DCoords = (row, col, height = 0.1) => {
    return [
      row - halfGrid + 0.5, 
      height, 
      col - halfGrid + 0.5
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
      const maxSteps = 7; // Raycast Max sensör yarıçapı

      // Adım adım ışını ilerleterek ilk engele çarpana kadar iz sür
      while (steps < maxSteps) {
        currR += dir.r;
        currC += dir.c;
        steps++;

        // Sınır dışı kontrolü
        if (currR < 0 || currR >= size || currC < 0 || currC >= size) {
          hit = true;
          // Sınırda durdur
          currR = Math.max(0, Math.min(size - 1, currR));
          currC = Math.max(0, Math.min(size - 1, currC));
          break;
        }

        // Statik Engel kontrolü
        if (baseGrid[currR]?.[currC] === 'obstacle') {
          hit = true;
          break;
        }

        // Dinamik Engel kontrolü
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

  // Ajan 3D Pozisyonu
  const agent3DPos = useMemo(() => {
    return agentPos ? to3DCoords(agentPos.row, agentPos.col, 0.15) : null;
  }, [agentPos, halfGrid, size]);

  // Hedef 3D Pozisyonu
  const goal3DPos = useMemo(() => {
    return goalPos ? to3DCoords(goalPos.row, goalPos.col, 0.15) : null;
  }, [goalPos, halfGrid, size]);

  // Dinamik Engellerin 3D Pozisyonları
  const dynObstacles3D = useMemo(() => {
    return dynamicObstacles.map(o => ({
      id: o.id,
      pos: to3DCoords(o.row, o.col, 0.2)
    }));
  }, [dynamicObstacles, halfGrid, size]);

  return (
    <div style={{ width: '100%', height: '580px', borderRadius: '16px', overflow: 'hidden', background: '#05070a', border: '1px solid #1a2233', position: 'relative' }}>
      <Canvas shadows camera={{ position: [0, size * 0.9, size * 0.6], fov: 45 }}>
        {/* Ortam Işıkları */}
        <ambientLight intensity={0.25} />
        <pointLight position={[0, 15, 0]} intensity={1.5} color="#00ffff" />
        
        {/* Ana Gölgeli Güneş Işığı */}
        <directionalLight 
          position={[size * 0.5, size * 1.0, size * 0.5]} 
          intensity={1.2} 
          castShadow 
          shadow-mapSize-width={2048} 
          shadow-mapSize-height={2048}
          shadow-bias={-0.0001}
        />

        {/* Bilim Kurgu Zemin Grid Sistemi */}
        <Grid 
          renderOrder={-1} 
          position={[0, -0.01, 0]} 
          args={[size, size]} 
          cellSize={1} 
          cellThickness={1} 
          cellColor="#1a2233" 
          sectionSize={5} 
          sectionThickness={1.5} 
          sectionColor="#00bbff" 
          fadeDistance={size * 1.5} 
          infiniteGrid 
        />

        {/* Arena Çerçevesi (Klip Sınırları) */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
          <planeGeometry args={[size, size]} />
          <meshStandardMaterial color="#0b111e" roughness={0.8} metalness={0.2} />
        </mesh>
        
        {/* Çevreleyici Neon Bariyerler */}
        <mesh position={[0, 0.25, -halfGrid]}>
          <boxGeometry args={[size, 0.5, 0.05]} />
          <meshStandardMaterial color="#1a2233" emissive="#0055aa" emissiveIntensity={0.2} />
        </mesh>
        <mesh position={[0, 0.25, halfGrid]}>
          <boxGeometry args={[size, 0.5, 0.05]} />
          <meshStandardMaterial color="#1a2233" emissive="#0055aa" emissiveIntensity={0.2} />
        </mesh>
        <mesh position={[-halfGrid, 0.25, 0]} rotation={[0, Math.PI / 2, 0]}>
          <boxGeometry args={[size, 0.5, 0.05]} />
          <meshStandardMaterial color="#1a2233" emissive="#0055aa" emissiveIntensity={0.2} />
        </mesh>
        <mesh position={[halfGrid, 0.25, 0]} rotation={[0, Math.PI / 2, 0]}>
          <boxGeometry args={[size, 0.5, 0.05]} />
          <meshStandardMaterial color="#1a2233" emissive="#0055aa" emissiveIntensity={0.2} />
        </mesh>

        {/* Statik Engeller (Modern Obsidyen Kuleler) */}
        {staticObstacles.map(obs => (
          <mesh 
            key={obs.id} 
            position={to3DCoords(obs.r, obs.c, 0.5)} 
            castShadow 
            receiveShadow
          >
            <boxGeometry args={[0.9, 1.0, 0.9]} />
            <meshStandardMaterial 
              color="#0d1527" 
              roughness={0.1} 
              metalness={0.9} 
              emissive="#ff0055"
              emissiveIntensity={0.05}
            />
            {/* Statik Engellerin Çevresinde Kırmızı Neon Kenarlık Çerçevesi */}
            <lineSegments>
              <edgesGeometry args={[new THREE.BoxGeometry(0.91, 1.01, 0.91)]} />
              <lineBasicMaterial color="#ff3366" linewidth={2} />
            </lineSegments>
          </mesh>
        ))}

        {/* Hedef (Altın Halka Core) */}
        {goal3DPos && <Goal3D position={goal3DPos} />}

        {/* Ajan (Fütüristik Siber Araç) */}
        {agent3DPos && <Agent3D position={agent3DPos} lastAction={lastAction} />}

        {/* Dinamik Engeller (Kırmızı Pervaneli Dronlar) */}
        {dynObstacles3D.map(o => (
          <DynamicObstacle3D key={o.id} position={o.pos} />
        ))}

        {/* LiDAR Lazer Sensör Tarama Işınları */}
        {agent3DPos && <LiDARBeams agentPos={agent3DPos} calculatedRays={calculatedRays} />}

        {/* Mouse İle Serbest Bakış Kontrolü */}
        <OrbitControls 
          enableDamping 
          dampingFactor={0.05}
          maxPolarAngle={Math.PI / 2 - 0.05} // Kameranın yerin altına girmesini engelle
          minDistance={5}
          maxDistance={size * 2}
        />
      </Canvas>
      
      {/* 3D Bilgi ve Kontrol İpuçları Paneli */}
      <div style={{ position: 'absolute', bottom: '15px', left: '15px', color: '#fff', fontSize: '12px', background: 'rgba(5, 7, 10, 0.85)', padding: '10px 15px', borderRadius: '8px', border: '1px solid #1a2233', pointerEvents: 'none', fontFamily: 'monospace', backdropFilter: 'blur(4px)' }}>
        <div style={{ color: '#00ffff', fontWeight: 'bold', marginBottom: '4px' }}>📡 REAL-TIME 3D LiDAR SCANNER</div>
        <div>• MOUSE SOL TIK: Sahneyi Döndür</div>
        <div>• MOUSE SAĞ TIK: Sahneyi Kaydır</div>
        <div>• SCROLL WHEEL: Yakınlaş / Uzaklaş</div>
      </div>
    </div>
  );
}
