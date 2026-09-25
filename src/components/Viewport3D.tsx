import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FaultPlane, AnalyzedEvent, GeophoneSensor, GroundSupportLevel } from '../types';
import { getFaultNormal } from '../utils/mathEngine';
import {
  Compass,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  RotateCcw,
  Sparkles,
  Layers,
  Box,
  Radio,
  FileText,
  Activity,
} from 'lucide-react';

interface Viewport3DProps {
  faults: FaultPlane[];
  analyzedEvents: AnalyzedEvent[];
  hazardThreshold: number;
  selectedEvent: AnalyzedEvent | null;
  onSelectEvent: (event: AnalyzedEvent | null) => void;
  sensors?: GeophoneSensor[];
  onOpenReport?: () => void;
  isStreaming?: boolean;
}

// Engineering colormap: Blue -> Cyan -> Lime -> Amber -> Crimson
function getHazardColor(hazard: number, maxHazard: number): THREE.Color {
  const t = Math.min(1.0, Math.max(0.0, hazard / (maxHazard || 1)));
  const color = new THREE.Color();

  if (t < 0.25) {
    color.setRGB(0.1 + t * 0.4, 0.4 + t * 2.2, 0.95);
  } else if (t < 0.5) {
    const u = (t - 0.25) * 4;
    color.setRGB(0.2 * (1 - u), 0.95, 0.95 * (1 - u) + 0.3 * u);
  } else if (t < 0.75) {
    const u = (t - 0.5) * 4;
    color.setRGB(u, 0.95 - u * 0.15, 0.1);
  } else {
    const u = (t - 0.75) * 4;
    color.setRGB(1.0, 0.8 * (1 - u) + 0.09 * u, 0.1 * (1 - u) + 0.27 * u);
  }

  return color;
}

export const Viewport3D: React.FC<Viewport3DProps> = ({
  faults,
  analyzedEvents,
  hazardThreshold,
  selectedEvent,
  onSelectEvent,
  sensors = [],
  onOpenReport,
  isStreaming = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Visibility and display states
  const [showFaults, setShowFaults] = useState(true);
  const [showEvents, setShowEvents] = useState(true);
  const [showSensors, setShowSensors] = useState(true);
  const [pulseAlarm, setPulseAlarm] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [faultOpacity, setFaultOpacity] = useState(0.4);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hoveredEvent, setHoveredEvent] = useState<AnalyzedEvent | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  // References for Three.js instance
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Group references
  const faultsGroupRef = useRef<THREE.Group>(new THREE.Group());
  const sensorsGroupRef = useRef<THREE.Group>(new THREE.Group());
  const shockwavesGroupRef = useRef<THREE.Group>(new THREE.Group());
  const normalPointsRef = useRef<THREE.Points | null>(null);
  const highPointsRef = useRef<THREE.Points | null>(null);
  const selectionMarkerRef = useRef<THREE.Mesh | null>(null);
  const gridHelperRef = useRef<THREE.Group>(new THREE.Group());

  // Center & bounds state
  const centerRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const radiusRef = useRef<number>(1000);

  // High hazard flashing uniform / material
  const pulseMaterialRef = useRef<THREE.PointsMaterial | null>(null);
  const shockwavesRef = useRef<Array<{ mesh: THREE.Mesh; createdAt: number; maxRadius: number }>>([]);

  // Initialize Scene, Camera, Renderer, Controls
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0e1014); // Deep modern obsidian
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 100000);
    camera.position.set(3000, 3000, 3000);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.replaceChildren(renderer.domElement);
    rendererRef.current = renderer;

    // 4. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.screenSpacePanning = true;
    controls.maxDistance = 50000;
    controls.minDistance = 10;
    controlsRef.current = controls;

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight1.position.set(1, 2, 1);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x38bdf8, 0.5);
    dirLight2.position.set(-1, -1, 1);
    scene.add(dirLight2);

    // Add groups
    scene.add(gridHelperRef.current);
    scene.add(faultsGroupRef.current);
    scene.add(sensorsGroupRef.current);
    scene.add(shockwavesGroupRef.current);

    // Selection ring mesh
    const selGeom = new THREE.RingGeometry(20, 28, 32);
    const selMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    });
    const selMesh = new THREE.Mesh(selGeom, selMat);
    selMesh.visible = false;
    scene.add(selMesh);
    selectionMarkerRef.current = selMesh;

    // 6. Animation Loop
    let lastPulse = performance.now();
    let flashState = true;

    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      controls.update();

      const now = performance.now();
      if (now - lastPulse > 600) {
        lastPulse = now;
        flashState = !flashState;
      }

      // High Hazard Pulse Animation
      if (highPointsRef.current && pulseMaterialRef.current) {
        if (pulseAlarm) {
          const t = now * 0.006;
          const sineScale = 0.85 + 0.35 * Math.sin(t);
          pulseMaterialRef.current.size = 18 * sineScale;
          pulseMaterialRef.current.opacity = flashState ? 1.0 : 0.45;
        } else {
          pulseMaterialRef.current.size = 14;
          pulseMaterialRef.current.opacity = 0.9;
        }
      }

      // Animate shockwaves
      const activeWaves: typeof shockwavesRef.current = [];
      for (const wave of shockwavesRef.current) {
        const elapsed = (now - wave.createdAt) / 1000;
        if (elapsed < 1.5) {
          const progress = elapsed / 1.5;
          const scale = progress * wave.maxRadius;
          wave.mesh.scale.set(scale, scale, scale);
          (wave.mesh.material as THREE.MeshBasicMaterial).opacity = (1 - progress) * 0.8;
          activeWaves.push(wave);
        } else {
          shockwavesGroupRef.current.remove(wave.mesh);
          wave.mesh.geometry.dispose();
          (wave.mesh.material as THREE.Material).dispose();
        }
      }
      shockwavesRef.current = activeWaves;

      // Selection Marker
      if (selMesh.visible) {
        selMesh.quaternion.copy(camera.quaternion);
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!containerRef.current || !renderer || !camera) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      controls.dispose();
      renderer.dispose();
    };
  }, [pulseAlarm]);

  // Update Faults with current opacity
  useEffect(() => {
    const group = faultsGroupRef.current;
    group.clear();

    if (!showFaults || faults.length === 0) return;

    for (const fault of faults) {
      const normal = getFaultNormal(fault);
      const normalVec = new THREE.Vector3(normal.x, normal.y, normal.z).normalize();

      const discGeom = new THREE.CircleGeometry(fault.radius, 48);
      const quaternion = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        normalVec
      );

      const discMat = new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: faultOpacity,
        roughness: 0.35,
        metalness: 0.15,
      });

      const discMesh = new THREE.Mesh(discGeom, discMat);
      discMesh.position.set(fault.x, fault.y, fault.z);
      discMesh.quaternion.copy(quaternion);

      // Edge border ring
      const edgeGeom = new THREE.RingGeometry(fault.radius * 0.99, fault.radius, 48);
      const edgeMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
      });
      const edgeMesh = new THREE.Mesh(edgeGeom, edgeMat);
      edgeMesh.position.set(fault.x, fault.y, fault.z);
      edgeMesh.quaternion.copy(quaternion);

      // Normal Vector Arrow
      const arrowLen = Math.min(fault.radius * 0.45, 180);
      const arrowHelper = new THREE.ArrowHelper(
        normalVec,
        new THREE.Vector3(fault.x, fault.y, fault.z),
        arrowLen,
        0x0284c7,
        arrowLen * 0.25,
        arrowLen * 0.15
      );

      const faultContainer = new THREE.Group();
      faultContainer.add(discMesh);
      faultContainer.add(edgeMesh);
      faultContainer.add(arrowHelper);
      group.add(faultContainer);
    }
  }, [faults, showFaults, faultOpacity]);

  // Update Geophone Sensor Array in 3D Scene
  useEffect(() => {
    const group = sensorsGroupRef.current;
    group.clear();

    if (!showSensors || sensors.length === 0) return;

    for (const sensor of sensors) {
      // 3D Octahedron / Diamond sensor station geometry
      const geom = new THREE.OctahedronGeometry(25, 0);
      const mat = new THREE.MeshStandardMaterial({
        color: sensor.status === 'active' ? 0x10b981 : 0xf59e0b,
        emissive: sensor.status === 'active' ? 0x065f46 : 0x78350f,
        roughness: 0.2,
        metalness: 0.8,
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(sensor.x, sensor.y, sensor.z);

      // Ground anchor post
      const postGeom = new THREE.CylinderGeometry(2, 2, 80, 8);
      const postMat = new THREE.MeshBasicMaterial({ color: 0x475569 });
      const postMesh = new THREE.Mesh(postGeom, postMat);
      postMesh.position.set(sensor.x, sensor.y, sensor.z - 40);
      postMesh.rotation.x = Math.PI / 2;

      const sensorUnit = new THREE.Group();
      sensorUnit.add(mesh);
      sensorUnit.add(postMesh);
      group.add(sensorUnit);
    }
  }, [sensors, showSensors]);

  // Update Seismic Events in Scene
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (normalPointsRef.current) {
      scene.remove(normalPointsRef.current);
      normalPointsRef.current.geometry.dispose();
      (normalPointsRef.current.material as THREE.Material).dispose();
      normalPointsRef.current = null;
    }
    if (highPointsRef.current) {
      scene.remove(highPointsRef.current);
      highPointsRef.current.geometry.dispose();
      (highPointsRef.current.material as THREE.Material).dispose();
      highPointsRef.current = null;
    }

    if (!showEvents || analyzedEvents.length === 0) return;

    let maxH = 0;
    for (const e of analyzedEvents) {
      if (e.hazard_index > maxH) maxH = e.hazard_index;
    }
    if (maxH === 0) maxH = 1;

    const normalCoords: number[] = [];
    const normalColors: number[] = [];
    const highCoords: number[] = [];
    const highColors: number[] = [];

    for (let i = 0; i < analyzedEvents.length; i++) {
      const e = analyzedEvents[i];
      const isHigh = e.hazard_index >= hazardThreshold;

      if (isHigh) {
        highCoords.push(e.x, e.y, e.z);
        highColors.push(1.0, 0.09, 0.27);
      } else {
        normalCoords.push(e.x, e.y, e.z);
        const col = getHazardColor(e.hazard_index, maxH);
        normalColors.push(col.r, col.g, col.b);
      }
    }

    if (normalCoords.length > 0) {
      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.Float32BufferAttribute(normalCoords, 3));
      geom.setAttribute('color', new THREE.Float32BufferAttribute(normalColors, 3));

      const canvas = document.createElement('canvas');
      canvas.width = 32;
      canvas.height = 32;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.beginPath();
        ctx.arc(16, 16, 14, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      }
      const texture = new THREE.CanvasTexture(canvas);

      const mat = new THREE.PointsMaterial({
        size: 9,
        vertexColors: true,
        map: texture,
        transparent: true,
        alphaTest: 0.1,
        opacity: 0.88,
      });

      const points = new THREE.Points(geom, mat);
      scene.add(points);
      normalPointsRef.current = points;
    }

    if (highCoords.length > 0) {
      const highGeom = new THREE.BufferGeometry();
      highGeom.setAttribute('position', new THREE.Float32BufferAttribute(highCoords, 3));
      highGeom.setAttribute('color', new THREE.Float32BufferAttribute(highColors, 3));

      const canvas = document.createElement('canvas');
      canvas.width = 48;
      canvas.height = 48;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const grad = ctx.createRadialGradient(24, 24, 6, 24, 24, 24);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.4, '#ef4444');
        grad.addColorStop(1, 'rgba(239, 68, 68, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 48, 48);
      }
      const highTexture = new THREE.CanvasTexture(canvas);

      const highMat = new THREE.PointsMaterial({
        size: 16,
        vertexColors: true,
        map: highTexture,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
      });
      pulseMaterialRef.current = highMat;

      const highPoints = new THREE.Points(highGeom, highMat);
      scene.add(highPoints);
      highPointsRef.current = highPoints;
    }
  }, [analyzedEvents, hazardThreshold, showEvents]);

  // Recalculate Scene Bounding Box and Center
  const resetCamera = useCallback(() => {
    if (!cameraRef.current || !controlsRef.current) return;

    let minX = Infinity,
      maxX = -Infinity;
    let minY = Infinity,
      maxY = -Infinity;
    let minZ = Infinity,
      maxZ = -Infinity;

    const includePoint = (x: number, y: number, z: number) => {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      minZ = Math.min(minZ, z);
      maxZ = Math.max(maxZ, z);
    };

    for (const f of faults) {
      includePoint(f.x - f.radius, f.y - f.radius, f.z - f.radius);
      includePoint(f.x + f.radius, f.y + f.radius, f.z + f.radius);
    }
    for (const e of analyzedEvents) {
      includePoint(e.x, e.y, e.z);
    }
    for (const s of sensors) {
      includePoint(s.x, s.y, s.z);
    }

    if (!isFinite(minX)) {
      minX = -500;
      maxX = 500;
      minY = -500;
      maxY = 500;
      minZ = -500;
      maxZ = 500;
    }

    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const cz = (minZ + maxZ) / 2;
    const spanX = maxX - minX;
    const spanY = maxY - minY;
    const spanZ = maxZ - minZ;
    const maxSpan = Math.max(spanX, spanY, spanZ, 200);

    centerRef.current.set(cx, cy, cz);
    radiusRef.current = maxSpan;

    controlsRef.current.target.set(cx, cy, cz);
    cameraRef.current.position.set(cx + maxSpan * 1.3, cy + maxSpan * 1.3, cz + maxSpan * 1.1);
    cameraRef.current.lookAt(cx, cy, cz);
    controlsRef.current.update();

    const gridGroup = gridHelperRef.current;
    gridGroup.clear();

    if (showGrid) {
      const grid = new THREE.GridHelper(maxSpan * 2, 20, 0x38bdf8, 0x1e2430);
      grid.position.set(cx, cy, minZ - maxSpan * 0.05);
      grid.rotation.x = Math.PI / 2;
      gridGroup.add(grid);

      const axes = new THREE.AxesHelper(maxSpan * 0.3);
      axes.position.set(cx, cy, cz);
      gridGroup.add(axes);
    }
  }, [faults, analyzedEvents, sensors, showGrid]);

  useEffect(() => {
    if (faults.length > 0 || analyzedEvents.length > 0) {
      resetCamera();
    }
  }, [faults.length, resetCamera]);

  // Selected event highlight ring
  useEffect(() => {
    if (!selectionMarkerRef.current) return;
    if (selectedEvent) {
      selectionMarkerRef.current.position.set(
        selectedEvent.x,
        selectedEvent.y,
        selectedEvent.z
      );
      selectionMarkerRef.current.visible = true;
    } else {
      selectionMarkerRef.current.visible = false;
    }
  }, [selectedEvent]);

  // Camera Presets
  const setViewPreset = (view: 'iso' | 'top' | 'front' | 'side') => {
    if (!cameraRef.current || !controlsRef.current) return;
    const c = centerRef.current;
    const r = radiusRef.current;

    controlsRef.current.target.copy(c);

    switch (view) {
      case 'iso':
        cameraRef.current.position.set(c.x + r * 1.3, c.y + r * 1.3, c.z + r * 1.1);
        break;
      case 'top':
        cameraRef.current.position.set(c.x, c.y, c.z + r * 2.2);
        cameraRef.current.up.set(0, 1, 0);
        break;
      case 'front':
        cameraRef.current.position.set(c.x, c.y - r * 2.0, c.z);
        cameraRef.current.up.set(0, 0, 1);
        break;
      case 'side':
        cameraRef.current.position.set(c.x + r * 2.0, c.y, c.z);
        cameraRef.current.up.set(0, 0, 1);
        break;
    }

    controlsRef.current.update();
  };

  // Pointer & Tooltip Raycaster
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current || !cameraRef.current || analyzedEvents.length === 0) return;

    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.params.Points = { threshold: radiusRef.current * 0.02 };
    raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), cameraRef.current);

    const targets: THREE.Points[] = [];
    if (normalPointsRef.current) targets.push(normalPointsRef.current);
    if (highPointsRef.current) targets.push(highPointsRef.current);

    const intersects = raycaster.intersectObjects(targets, false);

    if (intersects.length > 0) {
      const hit = intersects[0];
      const point = hit.point;

      let closest: AnalyzedEvent | null = null;
      let minD = Infinity;

      for (let i = 0; i < analyzedEvents.length; i++) {
        const ev = analyzedEvents[i];
        const distSq =
          (ev.x - point.x) ** 2 + (ev.y - point.y) ** 2 + (ev.z - point.z) ** 2;
        if (distSq < minD) {
          minD = distSq;
          closest = ev;
        }
      }

      if (closest && Math.sqrt(minD) < radiusRef.current * 0.06) {
        setHoveredEvent(closest);
        setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        return;
      }
    }

    setHoveredEvent(null);
    setTooltipPos(null);
  };

  const handleClick = () => {
    if (hoveredEvent) {
      onSelectEvent(hoveredEvent);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-[#0e1014] overflow-hidden select-none cursor-grab active:cursor-grabbing"
      onPointerMove={handlePointerMove}
      onClick={handleClick}
    >
      {/* Viewport Floating HUD - Top-Left */}
      <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-2 pointer-events-none">
        <div className="bg-[#12151b]/85 backdrop-blur-md border border-[#2b303c] rounded-md px-3 py-1.5 shadow-lg flex items-center gap-2.5 pointer-events-auto">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-semibold text-slate-200">3D Mine Viewport</span>
          <span className="text-slate-500">·</span>
          <span className="text-[11px] font-mono text-slate-400">
            {analyzedEvents.length.toLocaleString()} Events
          </span>
          <span className="text-slate-500">·</span>
          <span className="text-[11px] font-mono text-slate-400">
            {faults.length} Faults
          </span>
          {sensors.length > 0 && (
            <>
              <span className="text-slate-500">·</span>
              <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                {sensors.length} Geophones
              </span>
            </>
          )}
        </div>

        {/* View Camera Presets */}
        <div className="bg-[#12151b]/85 backdrop-blur-md border border-[#2b303c] rounded-md p-1 shadow-lg flex items-center gap-1 pointer-events-auto">
          <button
            onClick={() => setViewPreset('iso')}
            className="px-2 py-1 text-[11px] font-medium text-slate-300 hover:text-white hover:bg-[#202530] rounded transition cursor-pointer"
          >
            3D Iso
          </button>
          <button
            onClick={() => setViewPreset('top')}
            className="px-2 py-1 text-[11px] font-medium text-slate-300 hover:text-white hover:bg-[#202530] rounded transition cursor-pointer"
          >
            Plan (Z)
          </button>
          <button
            onClick={() => setViewPreset('front')}
            className="px-2 py-1 text-[11px] font-medium text-slate-300 hover:text-white hover:bg-[#202530] rounded transition cursor-pointer"
          >
            Section (N)
          </button>
          <button
            onClick={() => setViewPreset('side')}
            className="px-2 py-1 text-[11px] font-medium text-slate-300 hover:text-white hover:bg-[#202530] rounded transition cursor-pointer"
          >
            Section (E)
          </button>
          <button
            onClick={resetCamera}
            title="Reset View & Frame Scene"
            className="p-1 text-slate-400 hover:text-cyan-400 hover:bg-[#202530] rounded transition ml-1 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Viewport Control Toggles Top-Right */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 bg-[#12151b]/85 backdrop-blur-md border border-[#2b303c] rounded-md p-1 shadow-lg pointer-events-auto">
        <button
          onClick={() => setShowFaults(!showFaults)}
          title={showFaults ? 'Hide Fault Discs' : 'Show Fault Discs'}
          className={`p-1.5 rounded transition cursor-pointer ${
            showFaults ? 'text-cyan-400 bg-[#1e232d]' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          {showFaults ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>

        <button
          onClick={() => setShowSensors(!showSensors)}
          title={showSensors ? 'Hide Geophone Array Markers' : 'Show Geophone Array Markers'}
          className={`p-1.5 rounded transition cursor-pointer ${
            showSensors ? 'text-emerald-400 bg-[#1e232d]' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Radio className="w-4 h-4" />
        </button>

        <button
          onClick={() => setShowEvents(!showEvents)}
          title={showEvents ? 'Hide Seismic Scatter Points' : 'Show Seismic Scatter Points'}
          className={`p-1.5 rounded transition cursor-pointer ${
            showEvents ? 'text-cyan-400 bg-[#1e232d]' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Box className="w-4 h-4" />
        </button>

        <button
          onClick={() => setPulseAlarm(!pulseAlarm)}
          title={pulseAlarm ? 'Disable Flashing Alarm Pulse' : 'Enable Flashing Alarm Pulse'}
          className={`p-1.5 rounded transition cursor-pointer ${
            pulseAlarm ? 'text-red-400 bg-[#1e232d]' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Sparkles className="w-4 h-4" />
        </button>

        <button
          onClick={() => setShowGrid(!showGrid)}
          title={showGrid ? 'Hide Coordinate Grid & Axes' : 'Show Coordinate Grid & Axes'}
          className={`p-1.5 rounded transition cursor-pointer ${
            showGrid ? 'text-cyan-400 bg-[#1e232d]' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Compass className="w-4 h-4" />
        </button>

        <button
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Viewport'}
          className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-[#202530] transition cursor-pointer"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Fault Opacity Quick Slider Floating Control */}
      <div className="absolute top-14 right-3 z-10 bg-[#12151b]/85 backdrop-blur-md border border-[#2b303c] rounded-md px-2.5 py-1.5 shadow-lg text-[10px] font-mono text-slate-400 flex items-center gap-2 pointer-events-auto">
        <span>Fault Opacity:</span>
        <input
          type="range"
          min="0.1"
          max="0.9"
          step="0.05"
          value={faultOpacity}
          onChange={(e) => setFaultOpacity(parseFloat(e.target.value))}
          className="w-16 accent-cyan-400 cursor-pointer h-1 bg-[#252b36] rounded"
        />
        <span>{(faultOpacity * 100).toFixed(0)}%</span>
      </div>

      {/* Engineering Colormap Legend Bottom-Left */}
      <div className="absolute bottom-3 left-3 z-10 bg-[#12151b]/90 backdrop-blur-md border border-[#2b303c] rounded-md px-3 py-2 shadow-xl pointer-events-none w-60">
        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300 mb-1.5">
          <span>Hazard Index ($H_i$)</span>
          <span className="text-red-400 font-mono text-[10px]">≥ {hazardThreshold.toFixed(1)} ALERT</span>
        </div>
        <div
          className="h-2 rounded w-full mb-1 border border-white/10"
          style={{
            background:
              'linear-gradient(to right, #2979ff 0%, #00e5ff 25%, #00e676 50%, #ffd600 75%, #ef4444 100%)',
          }}
        />
        <div className="flex justify-between text-[10px] text-slate-400 font-mono">
          <span>0.0 Static</span>
          <span>{hazardThreshold.toFixed(1)} Dynamic</span>
          <span>Max Burst</span>
        </div>
      </div>

      {/* Coordinate System Indicator Bottom-Right */}
      <div className="absolute bottom-3 right-3 z-10 bg-[#12151b]/90 backdrop-blur-md border border-[#2b303c] rounded-md px-2.5 py-1.5 shadow-xl pointer-events-none text-[10px] font-mono text-slate-400 flex items-center gap-3">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
          <span>X: East</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
          <span>Y: North</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
          <span>Z: Elevation</span>
        </div>
      </div>

      {/* Hover Tooltip Card */}
      {hoveredEvent && tooltipPos && (
        <div
          ref={tooltipRef}
          className="absolute z-20 pointer-events-none bg-[#12151b]/95 backdrop-blur-md border border-cyan-500/70 rounded-lg p-3 shadow-2xl text-xs w-64 transform -translate-x-1/2 -translate-y-full mb-3"
          style={{ left: `${tooltipPos.x}px`, top: `${tooltipPos.y}px` }}
        >
          <div className="flex items-center justify-between border-b border-[#2b303c] pb-1.5 mb-1.5">
            <span className="font-bold text-white flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  hoveredEvent.hazard_index >= hazardThreshold ? 'bg-red-500 animate-ping' : 'bg-cyan-400'
                }`}
              />
              {hoveredEvent.id}
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                hoveredEvent.hazard_index >= hazardThreshold
                  ? 'bg-red-950 text-red-300 border border-red-800'
                  : 'bg-cyan-950 text-cyan-300 border border-cyan-800'
              }`}
            >
              H: {hoveredEvent.hazard_index.toFixed(3)}
            </span>
          </div>

          <div className="space-y-1 text-[11px] font-mono">
            <div className="flex justify-between text-slate-400">
              <span>Coordinates:</span>
              <span className="text-slate-200">[{hoveredEvent.x.toFixed(0)}, {hoveredEvent.y.toFixed(0)}, {hoveredEvent.z.toFixed(0)}] m</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Magnitude:</span>
              <span className="text-amber-400 font-bold">{hoveredEvent.magnitude.toFixed(2)} M</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Nearest Fault:</span>
              <span className="text-cyan-400 font-semibold">{hoveredEvent.nearest_fault_id}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Fault Proximity:</span>
              <span className="text-slate-200">{hoveredEvent.distance_to_fault.toFixed(1)} m</span>
            </div>
            <div className="pt-1.5 border-t border-[#2b303c] flex justify-between text-[10px]">
              <span className="text-slate-400">Recommended Support:</span>
              <span className={hoveredEvent.hazard_index >= hazardThreshold ? 'text-red-400 font-bold' : 'text-emerald-400'}>
                {hoveredEvent.hazard_index >= 4.0 ? 'Rockburst D-Bolts + Cables' : hoveredEvent.hazard_index >= hazardThreshold ? 'Heavy Dynamic Mesh + FRS' : 'Standard Rebar Mesh'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
