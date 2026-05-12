// src/App.jsx
import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import './App.css';
import Grid from './components/Grid';
import useInterval from './hooks/useInterval';
import { saveMap, saveMapToPython, buildGameMapDTO } from './services/api';
import { useSimulation } from './hooks/useSimulation';

/* ─── Sabitler ─── */
const GRID_SIZES   = [11, 15, 21, 31];
const DEFAULT_SIZE = 15;

const MODES = [
  { id: 'obstacle', label: '⬛ Engel',      title: 'Statik engel koy / kaldır' },
  { id: 'dynamic',  label: '🔮 Hareketli',  title: 'Hareketli engel ekle / kaldır' },
  { id: 'start',    label: '🟢 Başlangıç',  title: 'Başlangıç noktasını seç' },
  { id: 'goal',     label: '🏁 Hedef',       title: 'Hedef noktasını seç' },
];

const PATTERNS = [
  { id: 'linear-h', label: '↔ Yatay' },
  { id: 'linear-v', label: '↕ Dikey' },
  { id: 'random',   label: '⟳ Rastgele' },
];

const SPEEDS = [
  { label: 'Yavaş', ms: 900 },
  { label: 'Orta',  ms: 450 },
  { label: 'Hızlı', ms: 180 },
];

let dynCounter = 0;

/* ─── Yardımcılar ─── */
function indexToCoord(row, col, size) {
  const c = Math.floor(size / 2);
  return { x: col - c, y: c - row };
}
function createEmptyGrid(size) {
  return Array.from({ length: size }, () => Array.from({ length: size }, () => 'empty'));
}
function countType(grid, type) { return grid.flat().filter(c => c === type).length; }

/** Grid (row,col) → Kartezyen (x,y) */
function toCartesian(row, col, half) {
  return { x: col - half, y: half - row };
}

/** Kartezyen (x,y) → grid (row,col) */
function toGridPos(x, y, half) {
  return { row: half - y, col: x + half };
}

/* ─── App ─── */
export default function App() {
  const [size,             setSize]             = useState(DEFAULT_SIZE);
  const [baseGrid,         setBaseGrid]         = useState(() => createEmptyGrid(DEFAULT_SIZE));
  const [dynamicObstacles, setDynamicObstacles] = useState([]);
  const [mode,             setMode]             = useState('obstacle');
  const [pattern,          setPattern]          = useState('linear-h');
  const [startPos,         setStartPos]         = useState(null);
  const [goalPos,          setGoalPos]          = useState(null);
  const [isMoving,         setIsMoving]         = useState(false);
  const [simSpeed,         setSimSpeed]         = useState(450);

  /* ── Backend eğitim durumu ── */
  const [isSaving,         setIsSaving]         = useState(false);
  const [saveStatus,       setSaveStatus]       = useState(null); // 'ok' | 'error' | null
  const [saveStatusDetail, setSaveStatusDetail] = useState({ spring: false, python: false });
  const [isTraining,       setIsTraining]       = useState(false);
  const [lastAction,       setLastAction]       = useState(null); // SimulationResponseDTO
  const [episodeEnd,       setEpisodeEnd]       = useState(null); // 'goal' | 'collision' | null

  /* ── Ajan grid pozisyonu ── */
  const [agentGridPos,     setAgentGridPos]     = useState(null); // { row, col }

  const mapNameRef   = useRef('harita1');
  const firstTickRef = useRef(null); // İlk tick: grid + start + goal gönderilir

  /* ── WebSocket simülasyon hook ── */
  const { connect, disconnect, sendTick, connected } = useSimulation({
    onResponse: useCallback((res) => {
      setLastAction(res);

      // Ajan pozisyonunu grid üzerinde güncelle
      if (res.agent_pos != null) {
        setSize(prev => {
          const half = Math.floor(prev / 2);
          const gp = toGridPos(res.agent_pos.x, res.agent_pos.y, half);
          // Sınır kontrolü
          if (gp.row >= 0 && gp.row < prev && gp.col >= 0 && gp.col < prev) {
            console.log(`[COORD] Cartesian(${res.agent_pos.x},${res.agent_pos.y}) → Grid(${gp.row},${gp.col})`);
            setAgentGridPos(gp);
          } else {
            console.warn(`[COORD] Out of bounds: Cartesian(${res.agent_pos.x},${res.agent_pos.y}) → Grid(${gp.row},${gp.col}) (size=${prev})`);
          }
          return prev;
        });
      }

      // Episode sonu kontrol
      if (res.reached_goal) {
        console.log('[SIM] Hedefe ulasildi! Episode:', res.episode);
        setEpisodeEnd('goal');
        setIsTraining(false);
      } else if (res.stuck) {
        console.log('[SIM] Ajan salinimda sikisti, episode sonlandi.');
        setEpisodeEnd('stuck');
        setIsTraining(false);
      } else if (res.done) {
        console.log('[SIM] Episode sona erdi (engel/sinir). Episode:', res.episode);
        setEpisodeEnd('collision');
        setIsTraining(false);
      }

      console.log('[SIM]', res.action_label, '| reward:', res.reward, '| pos:', res.agent_pos);
    }, []),

    onError: useCallback((msg) => {
      console.error('[SIM] Hata:', msg);
      setSaveStatus('error');
    }, []),
  });

  /* ── İlk tick: WS açıldığında grid + start + goal gönder ── */
  useEffect(() => {
    if (connected && firstTickRef.current) {
      sendTick(firstTickRef.current);
      firstTickRef.current = null;
    }
  }, [connected, sendTick]);

  /* Görüntüleme gridi — agent üstte gösterilir */
  const displayGrid = useMemo(() => {
    const dg = baseGrid.map(r => [...r]);
    dynamicObstacles.forEach(o => { dg[o.row][o.col] = 'dynamic'; });
    if (
      agentGridPos &&
      agentGridPos.row >= 0 && agentGridPos.row < size &&
      agentGridPos.col >= 0 && agentGridPos.col < size
    ) {
      dg[agentGridPos.row][agentGridPos.col] = 'agent';
    }
    return dg;
  }, [baseGrid, dynamicObstacles, agentGridPos, size]);

  /* ─── Yerel hareket tiki (dinamik engeller) ─── */
  const tick = useCallback(() => {
    setDynamicObstacles(prev => {
      const isStaticBlocked = (r, c) =>
        r < 0 || r >= size || c < 0 || c >= size ||
        baseGrid[r]?.[c] === 'obstacle' ||
        (startPos && r === startPos.row && c === startPos.col) ||
        (goalPos  && r === goalPos.row  && c === goalPos.col);

      const moves = prev.map(obs => {
        const { row, col, direction, pattern: p } = obs;
        if (p === 'linear-h' || p === 'linear-v') {
          const dr = p === 'linear-v' ? direction : 0;
          const dc = p === 'linear-h' ? direction : 0;
          if (!isStaticBlocked(row + dr, col + dc))
            return { row: row + dr, col: col + dc, dir: direction, moved: true };
          if (!isStaticBlocked(row - dr, col - dc))
            return { row: row - dr, col: col - dc, dir: -direction, moved: true };
          return { row, col, dir: direction, moved: false };
        } else {
          const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
          const valid = dirs.filter(([dr,dc]) => !isStaticBlocked(row+dr, col+dc));
          if (!valid.length) return { row, col, dir: direction, moved: false };
          const [dr,dc] = valid[Math.floor(Math.random() * valid.length)];
          return { row: row+dr, col: col+dc, dir: direction, moved: true };
        }
      });

      const resolved = moves.map((m, i) => {
        if (!m.moved) return m;
        const obs = prev[i];
        const revert = (flipDir) => ({ row: obs.row, col: obs.col, dir: flipDir ? -m.dir : m.dir, moved: false });
        const contested = moves.some((o, j) => j !== i && o.moved && o.row === m.row && o.col === m.col);
        if (contested) return revert(obs.pattern !== 'random');
        const occupierIdx = prev.findIndex((o, j) => j !== i && o.row === m.row && o.col === m.col);
        if (occupierIdx !== -1) {
          const oMove = moves[occupierIdx];
          if (oMove.row === m.row && oMove.col === m.col) return revert(obs.pattern !== 'random');
        }
        const swapIdx = prev.findIndex((o, j) =>
          j !== i && o.row === m.row && o.col === m.col &&
          moves[j].row === obs.row && moves[j].col === obs.col
        );
        if (swapIdx !== -1) return revert(obs.pattern !== 'random');
        return m;
      });

      return prev.map((obs, i) => ({
        ...obs,
        row:       resolved[i].row,
        col:       resolved[i].col,
        direction: resolved[i].dir,
      }));
    });
  }, [size, baseGrid, startPos, goalPos]);

  useInterval(tick, isMoving ? simSpeed : null);

  /* ─── AI simülasyon tick döngüsü ─── */
  useInterval(
    useCallback(() => {
      // Sadece map_name gönder — grid /maps/load'da zaten load olmuş
      // Her tick'te grid gönderirse agent position başlangıca reset olur!
      sendTick({ map_name: mapNameRef.current });
    }, [sendTick, mapNameRef]),
    isTraining && connected ? simSpeed : null
  );

  /* ─── Hücre tıklaması ─── */
  const handleCellClick = useCallback((row, col) => {
    const cell = displayGrid[row][col];
    if (mode === 'obstacle') {
      if (cell === 'start' || cell === 'goal' || cell === 'dynamic' || cell === 'agent') return;
      setBaseGrid(prev => {
        const ng = prev.map(r => [...r]);
        ng[row][col] = cell === 'obstacle' ? 'empty' : 'obstacle';
        return ng;
      });
    } else if (mode === 'dynamic') {
      const existing = dynamicObstacles.find(o => o.row === row && o.col === col);
      if (existing) { setDynamicObstacles(prev => prev.filter(o => o.id !== existing.id)); return; }
      if (cell === 'obstacle' || cell === 'start' || cell === 'goal' || cell === 'agent') return;
      setDynamicObstacles(prev => [...prev, { id: `dyn-${++dynCounter}`, row, col, pattern, direction: 1 }]);
    } else if (mode === 'start') {
      if (cell === 'goal' || cell === 'dynamic') return;
      setBaseGrid(prev => {
        const ng = prev.map(r => [...r]);
        if (startPos) ng[startPos.row][startPos.col] = 'empty';
        ng[row][col] = 'start';
        return ng;
      });
      setStartPos({ row, col });
    } else if (mode === 'goal') {
      if (cell === 'start' || cell === 'dynamic') return;
      setBaseGrid(prev => {
        const ng = prev.map(r => [...r]);
        if (goalPos) ng[goalPos.row][goalPos.col] = 'empty';
        ng[row][col] = 'goal';
        return ng;
      });
      setGoalPos({ row, col });
    }
  }, [mode, pattern, displayGrid, dynamicObstacles, startPos, goalPos]);

  /* ─── Kontroller ─── */
  const handleSizeChange = (e) => {
    const s = Number(e.target.value);
    setSize(s); setBaseGrid(createEmptyGrid(s));
    setDynamicObstacles([]); setStartPos(null); setGoalPos(null);
    setIsMoving(false); setIsTraining(false); setLastAction(null);
    setAgentGridPos(null);
    disconnect();
  };

  const clearStatic  = () => setBaseGrid(p => p.map(r => r.map(c => c==='obstacle'?'empty':c)));
  const clearDynamic = () => { setDynamicObstacles([]); setIsMoving(false); };
  const reset        = () => {
    setBaseGrid(createEmptyGrid(size)); setDynamicObstacles([]);
    setStartPos(null); setGoalPos(null); setIsMoving(false);
    setIsTraining(false); setLastAction(null); setSaveStatus(null);
    setAgentGridPos(null); setSaveStatusDetail({ spring: false, python: false });
    setEpisodeEnd(null);
    disconnect();
  };

  /* ─── Eğitimi Başlat: haritayı Spring+Python'a kaydet + WS bağlan ─── */
  const handleTrainClick = useCallback(async () => {
    if (!startPos || !goalPos) return;

    // En az 3 engel olmadan model açık haritada salınım yapar
    const obstacleCount = countType(baseGrid, 'obstacle') + dynamicObstacles.length;
    if (obstacleCount < 3) {
      setSaveStatus('need-obstacles');
      return;
    }

    // Eğitim zaten çalışıyorsa durdur
    if (isTraining) {
      disconnect();
      setIsTraining(false);
      setLastAction(null);
      setAgentGridPos(null);
      return;
    }

    setIsSaving(true);
    setSaveStatus(null);

    try {
      console.log('[DEBUG] startPos:', startPos, 'goalPos:', goalPos);
      // buildGameMapDTO çıktısı hem Spring hem Python ile uyumlu
      const payload = buildGameMapDTO({
        mapName: mapNameRef.current,
        size,
        baseGrid,
        dynamicObstacles,
        startPos,
        goalPos,
      });
      console.log('[DEBUG] payload start_pos:', payload.start_pos, 'target_pos:', payload.target_pos);

      let springOk = false;
      let pythonOk = false;

      // 1) Spring Boot'a haritayı kaydet (DB) — opsiyonel, çalışmasa da devam
      try {
        await saveMap(payload);
        springOk = true;
        console.log('[INIT] Spring Boot harita kaydedildi');
      } catch (springErr) {
        console.warn('[INIT] Spring Boot erişilemiyor, devam ediliyor:', springErr.message);
      }

      // 2) Python modeline haritayı yükle (sim_env başlat) — zorunlu
      try {
        await saveMapToPython(payload);
        pythonOk = true;
        console.log('[INIT] Python harita yüklendi:', mapNameRef.current);
      } catch (pyErr) {
        console.warn('[INIT] Python harita yüklenemedi:', pyErr.message);
      }

      if (!pythonOk) {
        // Python da yoksa gerçek hata
        throw new Error('Python AI servisi (8000) erişilemiyor. Terminalde uvicorn çalışıyor mu?');
      }

      setSaveStatus('ok');
      setSaveStatusDetail({ spring: springOk, python: pythonOk });


      // Ajanı başlangıç pozisyonuna yerleştir
      if (startPos) {
        setAgentGridPos({ row: startPos.row, col: startPos.col });
      }

      // İlk WS tick'ini hazırla: grid + start + goal → Python sim_env'i senkronize et
      const half    = Math.floor(size / 2);
      const gridArr = baseGrid.map(row => row.map(cell => cell === 'obstacle' ? 1 : 0));
      const startC  = toCartesian(startPos.row, startPos.col, half);
      const goalC   = toCartesian(goalPos.row,  goalPos.col,  half);

      firstTickRef.current = {
        map_name:  mapNameRef.current,
        grid:      gridArr,
        agent_pos: startC,
        goal_pos:  goalC,
      };

      // WebSocket bağlantısını kur — bağlandığında useEffect ilk tick'i gönderir
      connect();
      setIsTraining(true);

    } catch (err) {
      console.error('Kayıt hatası:', err);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  }, [isTraining, startPos, goalPos, size, baseGrid, dynamicObstacles, connect, disconnect]);

  const center      = Math.floor(size / 2);
  const staticCount = countType(baseGrid, 'obstacle');
  const dynCount    = dynamicObstacles.length;
  const startCoord  = startPos ? indexToCoord(startPos.row, startPos.col, size) : null;
  const goalCoord   = goalPos  ? indexToCoord(goalPos.row,  goalPos.col,  size) : null;
  const agentCoord  = agentGridPos ? indexToCoord(agentGridPos.row, agentGridPos.col, size) : null;

  return (
    <div className="app">
      <header className="app-header">
        <h1>Grid World Simülatörü</h1>
        <p>Ortam tasarla, engelleri yerleştir ve ajanını eğit &nbsp;·&nbsp; Merkez (0, 0)</p>
      </header>

      {/* Mod seçici */}
      <div className="mode-bar">
        <span className="mode-bar__label">Mod:</span>
        {MODES.map(m => (
          <button key={m.id} id={`mode-btn-${m.id}`}
            className={`mode-btn${mode===m.id?' mode-btn--active':''}`}
            onClick={() => setMode(m.id)} title={m.title}>
            {m.label}
          </button>
        ))}
        {mode === 'dynamic' && (
          <>
            <div className="mode-bar__sep" />
            <span className="mode-bar__label">Hareket:</span>
            {PATTERNS.map(p => (
              <button key={p.id}
                className={`pattern-btn${pattern===p.id?' pattern-btn--active':''}`}
                onClick={() => setPattern(p.id)}>
                {p.label}
              </button>
            ))}
          </>
        )}
      </div>

      {/* Kontrol paneli */}
      <div className="control-panel">
        <div className="control-group">
          <label htmlFor="grid-size-select">Grid:</label>
          <select id="grid-size-select" className="select-grid-size" value={size} onChange={handleSizeChange}>
            {GRID_SIZES.map(s => <option key={s} value={s}>{s}×{s}</option>)}
          </select>
        </div>
        <div className="control-divider" />

        <div className="control-group">
          <span className="control-label">Hız:</span>
          {SPEEDS.map(sp => (
            <button key={sp.ms}
              className={`speed-btn${simSpeed===sp.ms?' speed-btn--active':''}`}
              onClick={() => setSimSpeed(sp.ms)}>
              {sp.label}
            </button>
          ))}
        </div>
        <div className="control-divider" />

        <div className="control-group">
          <button id="btn-toggle-move"
            className={`btn ${isMoving?'btn-stop':'btn-move'}`}
            onClick={() => setIsMoving(v=>!v)}
            disabled={dynCount === 0}>
            {isMoving ? '⏹ Durdur' : '▶ Hareketi Başlat'}
          </button>
        </div>
        <div className="control-divider" />

        <div className="control-group">
          <button className="btn btn-secondary" onClick={clearStatic}  disabled={staticCount===0}>🧹 Sabit ({staticCount})</button>
          <button className="btn btn-secondary" onClick={clearDynamic} disabled={dynCount===0}>🗑 Hareketli ({dynCount})</button>
          <button className="btn btn-secondary" onClick={reset}>↺ Sıfırla</button>
        </div>
        <div className="control-divider" />

        {/* Harita adı input */}
        <div className="control-group">
          <input
            id="map-name-input"
            className="map-name-input"
            type="text"
            defaultValue={mapNameRef.current}
            onChange={e => { mapNameRef.current = e.target.value.trim() || 'harita1'; }}
            placeholder="Harita adı"
            maxLength={32}
          />
        </div>

        {/* Eğitimi Başlat / Durdur */}
        <div className="control-group">
          <button id="btn-train"
            className={`btn ${isTraining ? 'btn-stop' : 'btn-primary'}`}
            onClick={handleTrainClick}
            disabled={(!startPos || !goalPos) || isSaving}
            title={!startPos||!goalPos ? 'Önce başlangıç ve hedef noktalarını seç' : ''}>
            {isSaving
              ? '⏳ Kaydediliyor…'
              : isTraining
                ? '⏹ Simülasyonu Durdur'
                : '🤖 Simülasyonu Başlat →'}
          </button>
          {!isTraining && (
            <span style={{
              fontSize: '11px',
              color: (staticCount + dynCount) >= 3 ? '#4caf50' : '#ff9800',
              marginTop: '4px',
              display: 'block',
            }}>
              Engel: {staticCount + dynCount} / 3 gerekli
            </span>
          )}
        </div>
      </div>

      {/* Backend durum bildirimi */}
      {saveStatus && (
        <div className={`save-toast save-toast--${saveStatus === 'need-obstacles' ? 'error' : saveStatus}`} role="status">
          {saveStatus === 'ok'
            ? [
                '✓',
                saveStatusDetail.spring ? ' Spring ✅' : ' Spring ⚠️ kapalı',
                saveStatusDetail.python ? ' · Python AI ✅' : ' · Python AI ❌',
                connected ? ' · WS bağlı 🟢' : ' · WS bağlanıyor…',
              ].join('')
            : saveStatus === 'need-obstacles'
            ? '⚠️ En az 3 engel gerekli — model açık haritalarda düzgün çalışmaz!'
            : '✗ Python AI (8000) erişilemiyor — terminalde uvicorn çalışıyor mu?'}
        </div>
      )}

      {/* Son aksiyon bilgisi */}
      {lastAction && (
        <div className="action-badge">
          <span className="action-badge__label">Aksiyon</span>
          <span className="action-badge__value">{lastAction.action_label}</span>
          {agentCoord && (
            <span className="action-badge__label">
              Pos ({agentCoord.x}, {agentCoord.y})
            </span>
          )}
          <span className="action-badge__q">
            Q: [{lastAction.q_values?.map(v => v.toFixed(2)).join(', ')}]
          </span>
          {lastAction.reached_goal && (
            <span className="action-badge__value" style={{ color: '#4ade80' }}>🎉 Hedefe Ulaştı!</span>
          )}
        </div>
      )}

      <Grid grid={displayGrid} onCellClick={handleCellClick}
        size={size} center={center} indexToCoord={indexToCoord} activeMode={mode} />

      <div className="legend" role="list">
        <div className="legend-item"><span className="legend-dot legend-dot--start"/>Başlangıç {startCoord?`(${startCoord.x},${startCoord.y})`:'— seçilmedi'}</div>
        <div className="legend-item"><span className="legend-dot legend-dot--goal"/>Hedef {goalCoord?`(${goalCoord.x},${goalCoord.y})`:'— seçilmedi'}</div>
        <div className="legend-item"><span className="legend-dot legend-dot--obstacle"/>Sabit Engel</div>
        <div className="legend-item"><span className="legend-dot legend-dot--dynamic"/>Hareketli Engel</div>
        {agentCoord && (
          <div className="legend-item"><span className="legend-dot legend-dot--agent"/>Ajan ({agentCoord.x},{agentCoord.y})</div>
        )}
        <div className="legend-item legend-item--axis"><span className="legend-axis-icon">＋</span>Orijin (0,0)</div>
      </div>

      {/* Episode sonu modal */}
      {episodeEnd && (
        <div className="episode-modal-overlay" onClick={() => setEpisodeEnd(null)}>
          <div className="episode-modal" onClick={(e) => e.stopPropagation()}>
            {episodeEnd === 'goal' ? (
              <>
                <h2 className="episode-modal__title" style={{ color: '#4ade80' }}>🎉 HEDEFE ULAŞTI!</h2>
                <p className="episode-modal__text">Ajan başarıyla hedefe ulaştı!</p>
              </>
            ) : episodeEnd === 'stuck' ? (
              <>
                <h2 className="episode-modal__title" style={{ color: '#f59e0b' }}>⚠️ AJAN SALINIMDA SIKIŞTI!</h2>
                <p className="episode-modal__text">Model bu konumda iki pozisyon arasında gidip geliyor. Başlangıç noktasını değiştir veya çevresine engel ekle.</p>
              </>
            ) : (
              <>
                <h2 className="episode-modal__title" style={{ color: '#ef4444' }}>❌ ENGELE ÇARPTI!</h2>
                <p className="episode-modal__text">Ajan bir engele çarptı veya sınırı aştı.</p>
              </>
            )}
            {lastAction && (
              <div className="episode-modal__stats">
                <p><strong>Episode:</strong> {lastAction.episode}</p>
                <p><strong>Adım Sayısı:</strong> {lastAction.steps}</p>
                <p><strong>Son Ödül:</strong> {lastAction.reward}</p>
              </div>
            )}
            <button
              className="episode-modal__btn"
              onClick={() => reset()}
            >
              + Yeni Simülasyon Oluştur
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
