// src/App.jsx
import { useState, useCallback, useMemo } from 'react';
import './App.css';
import Grid from './components/Grid';
import useInterval from './hooks/useInterval';

/* ─── Sabitler ─── */
const GRID_SIZES = [11, 15, 21, 31];
const DEFAULT_SIZE = 15;

const MODES = [
  { id: 'obstacle', label: '🧱 Engel',      title: 'Statik engel koy/kaldır' },
  { id: 'dynamic',  label: '🚗 Hareketli',  title: 'Hareketli engel ekle/kaldır' },
  { id: 'start',    label: '🤖 Başlangıç',  title: 'Başlangıç konumunu seç' },
  { id: 'goal',     label: '🎯 Hedef',       title: 'Hedef konumunu seç' },
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

  /* Görüntüleme gridi: baseGrid üstüne dinamik engelleri bindiriyoruz */
  const displayGrid = useMemo(() => {
    const dg = baseGrid.map(r => [...r]);
    dynamicObstacles.forEach(o => { dg[o.row][o.col] = 'dynamic'; });
    return dg;
  }, [baseGrid, dynamicObstacles]);

  /* ─── Hareket tiki ─── */
  const tick = useCallback(() => {
    setDynamicObstacles(prev => {

      /* Statik engel / sınır kontrolü */
      const isStaticBlocked = (r, c) =>
        r < 0 || r >= size || c < 0 || c >= size ||
        baseGrid[r]?.[c] === 'obstacle' ||
        (startPos && r === startPos.row && c === startPos.col) ||
        (goalPos  && r === goalPos.row  && c === goalPos.col);

      /* ── Faz 1: her engel için hedef pozisyonu hesapla ── */
      const moves = prev.map(obs => {
        const { row, col, direction, pattern: p } = obs;

        if (p === 'linear-h' || p === 'linear-v') {
          const dr = p === 'linear-v' ? direction : 0;
          const dc = p === 'linear-h' ? direction : 0;
          if (!isStaticBlocked(row + dr, col + dc))
            return { row: row + dr, col: col + dc, dir: direction, moved: true };
          // Statik engele çarptı — ters yöne dön
          if (!isStaticBlocked(row - dr, col - dc))
            return { row: row - dr, col: col - dc, dir: -direction, moved: true };
          return { row, col, dir: direction, moved: false }; // sıkıştı
        } else { // random
          const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
          const valid = dirs.filter(([dr,dc]) => !isStaticBlocked(row+dr, col+dc));
          if (!valid.length) return { row, col, dir: direction, moved: false };
          const [dr,dc] = valid[Math.floor(Math.random() * valid.length)];
          return { row: row+dr, col: col+dc, dir: direction, moved: true };
        }
      });

      /* ── Faz 2: dinamik çarpışmaları çöz ── */
      const resolved = moves.map((m, i) => {
        if (!m.moved) return m;

        const obs = prev[i];
        const revert = (flipDir) => ({
          row: obs.row, col: obs.col,
          dir: flipDir ? -m.dir : m.dir,
          moved: false,
        });

        // 1) Aynı hedefe iki engel gitmek istiyor mu?
        const contested = moves.some((o, j) =>
          j !== i && o.moved && o.row === m.row && o.col === m.col
        );
        if (contested) return revert(obs.pattern !== 'random');

        // 2) Hedef hücre başka bir engel tarafından işgal edilmiş
        //    ve o engel oradan ayrılmıyor mu?
        const occupierIdx = prev.findIndex((o, j) =>
          j !== i && o.row === m.row && o.col === m.col
        );
        if (occupierIdx !== -1) {
          const oMove = moves[occupierIdx];
          // İşgalci hâlâ orada duruyorsa hareket etme
          if (oMove.row === m.row && oMove.col === m.col)
            return revert(obs.pattern !== 'random');
        }

        // 3) Swap tespiti: A→B, B→A durumunda ikisi de geri dönsün
        const swapIdx = prev.findIndex((o, j) =>
          j !== i &&
          o.row === m.row && o.col === m.col &&       // B şu an A'nın gideceği yerde
          moves[j].row === obs.row && moves[j].col === obs.col // B de A'nın yerine gitmek istiyor
        );
        if (swapIdx !== -1) return revert(obs.pattern !== 'random');

        return m;
      });

      /* Sonuçları state'e uygula */
      return prev.map((obs, i) => ({
        ...obs,
        row:       resolved[i].row,
        col:       resolved[i].col,
        direction: resolved[i].dir,
      }));
    });
  }, [size, baseGrid, startPos, goalPos]);

  useInterval(tick, isMoving ? simSpeed : null);

  /* ─── Hücre tıklaması ─── */
  const handleCellClick = useCallback((row, col) => {
    const cell = displayGrid[row][col];

    if (mode === 'obstacle') {
      if (cell === 'start' || cell === 'goal' || cell === 'dynamic') return;
      setBaseGrid(prev => {
        const ng = prev.map(r => [...r]);
        ng[row][col] = cell === 'obstacle' ? 'empty' : 'obstacle';
        return ng;
      });

    } else if (mode === 'dynamic') {
      const existing = dynamicObstacles.find(o => o.row === row && o.col === col);
      if (existing) {
        setDynamicObstacles(prev => prev.filter(o => o.id !== existing.id));
        return;
      }
      if (cell === 'obstacle' || cell === 'start' || cell === 'goal') return;
      setDynamicObstacles(prev => [...prev, {
        id: `dyn-${++dynCounter}`, row, col, pattern, direction: 1,
      }]);

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
    setDynamicObstacles([]); setStartPos(null); setGoalPos(null); setIsMoving(false);
  };
  const clearStatic  = () => setBaseGrid(p => p.map(r => r.map(c => c==='obstacle'?'empty':c)));
  const clearDynamic = () => { setDynamicObstacles([]); setIsMoving(false); };
  const reset        = () => {
    setBaseGrid(createEmptyGrid(size)); setDynamicObstacles([]);
    setStartPos(null); setGoalPos(null); setIsMoving(false);
  };

  const center      = Math.floor(size / 2);
  const staticCount = countType(baseGrid, 'obstacle');
  const dynCount    = dynamicObstacles.length;
  const startCoord  = startPos ? indexToCoord(startPos.row, startPos.col, size) : null;
  const goalCoord   = goalPos  ? indexToCoord(goalPos.row,  goalPos.col,  size) : null;

  return (
    <div className="app">
      <header className="app-header">
        <h1>Grid World — DRL Simülatörü</h1>
        <p>Koordinat düzlemi · Orijin (0,0) gridin tam ortası</p>
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
              onClick={() => setSimSpeed(sp.ms)}
              disabled={mode !== 'dynamic'}>
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

        <div className="control-group">
          <button id="btn-train" className="btn btn-primary"
            disabled={!startPos||!goalPos}
            title={!startPos||!goalPos?'Önce başlangıç ve hedef seç':''}>
            ▶ Eğitimi Başlat
          </button>
        </div>
      </div>

      <Grid grid={displayGrid} onCellClick={handleCellClick}
        size={size} center={center} indexToCoord={indexToCoord} activeMode={mode} />

      <div className="legend" role="list">
        <div className="legend-item"><span className="legend-dot legend-dot--start"/>Başlangıç {startCoord?`(${startCoord.x},${startCoord.y})`:'— seçilmedi'}</div>
        <div className="legend-item"><span className="legend-dot legend-dot--goal"/>Hedef {goalCoord?`(${goalCoord.x},${goalCoord.y})`:'— seçilmedi'}</div>
        <div className="legend-item"><span className="legend-dot legend-dot--obstacle"/>Sabit Engel</div>
        <div className="legend-item"><span className="legend-dot legend-dot--dynamic"/>Hareketli Engel</div>
        <div className="legend-item legend-item--axis"><span className="legend-axis-icon">＋</span>Orijin (0,0)</div>
      </div>
    </div>
  );
}
