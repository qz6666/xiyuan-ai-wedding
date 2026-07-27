"use client";

import { Maximize2, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

type WeddingScene3DProps = {
  style: string;
};

const palettes: Record<string, { red: number; gold: number; accent: number; floor: number }> = {
  红金中式: { red: 0x8f1725, gold: 0xd8a84e, accent: 0x315c45, floor: 0xf6ead4 },
  清透森系: { red: 0x9c5260, gold: 0xc8a96b, accent: 0x3f755a, floor: 0xe9eee4 },
  现代极简: { red: 0x7d2938, gold: 0xc4a46b, accent: 0x4f5b59, floor: 0xeee9e0 },
  复古电影: { red: 0x7a2830, gold: 0xb58a4b, accent: 0x415344, floor: 0xd9c8ac },
};

export function WeddingScene3D({ style }: WeddingScene3DProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [resetSignal, setResetSignal] = useState(0);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let frameId = 0;
    let disposed = false;
    const palette = palettes[style] || palettes["红金中式"];
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x2b1016);
    scene.fog = new THREE.Fog(0x2b1016, 17, 34);

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(10.5, 7.4, 12.5);
    camera.lookAt(0, 1.5, 0);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    } catch {
      host.textContent = "当前设备无法启动 3D 预览。";
      host.classList.add("has-error");
      return;
    }

    host.classList.remove("has-error");
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.setAttribute("aria-label", `${style}婚礼空间 3D 预览`);
    renderer.domElement.tabIndex = 0;
    host.replaceChildren(renderer.domElement);

    const venue = new THREE.Group();
    scene.add(venue);

    const material = (color: number, roughness = 0.62, metalness = 0.05) =>
      new THREE.MeshStandardMaterial({ color, roughness, metalness });
    const redMaterial = material(palette.red, 0.45, 0.12);
    const goldMaterial = material(palette.gold, 0.28, 0.62);
    const ivoryMaterial = material(0xfff4df, 0.76);
    const greenMaterial = material(palette.accent, 0.82);
    const floorMaterial = material(palette.floor, 0.88);

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 15), floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    venue.add(floor);

    const aisle = new THREE.Mesh(new THREE.BoxGeometry(3, 0.05, 12), redMaterial);
    aisle.position.set(0, 0.035, 1);
    aisle.receiveShadow = true;
    venue.add(aisle);

    const stage = new THREE.Mesh(new THREE.BoxGeometry(9.4, 0.62, 3.2), redMaterial);
    stage.position.set(0, 0.3, -5.1);
    stage.castShadow = true;
    stage.receiveShadow = true;
    venue.add(stage);

    const backdrop = new THREE.Mesh(new THREE.BoxGeometry(9, 5.2, 0.35), ivoryMaterial);
    backdrop.position.set(0, 3.05, -6.45);
    backdrop.castShadow = true;
    venue.add(backdrop);

    const arch = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.15, 18, 72, Math.PI), goldMaterial);
    arch.position.set(0, 2.35, -6.15);
    arch.rotation.z = Math.PI;
    arch.castShadow = true;
    venue.add(arch);

    for (const side of [-1, 1]) {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 3.4, 20), goldMaterial);
      pillar.position.set(side * 2.2, 1.7, -6.15);
      pillar.castShadow = true;
      venue.add(pillar);
    }

    const addFlowers = (x: number, y: number, z: number, scale = 1) => {
      const cluster = new THREE.Group();
      for (let index = 0; index < 9; index += 1) {
        const flower = new THREE.Mesh(
          new THREE.SphereGeometry((index % 3 === 0 ? 0.26 : 0.19) * scale, 12, 10),
          index % 3 === 0 ? redMaterial : index % 2 === 0 ? ivoryMaterial : greenMaterial,
        );
        flower.position.set(
          ((index % 3) - 1) * 0.3 * scale,
          (Math.floor(index / 3) - 1) * 0.24 * scale,
          ((index * 7) % 3) * 0.13 * scale,
        );
        flower.castShadow = true;
        cluster.add(flower);
      }
      cluster.position.set(x, y, z);
      venue.add(cluster);
    };

    addFlowers(-2.25, 3.7, -5.95, 1.2);
    addFlowers(2.25, 3.7, -5.95, 1.2);
    addFlowers(-3.7, 0.72, -4.15, 1.1);
    addFlowers(3.7, 0.72, -4.15, 1.1);

    for (const side of [-1, 1]) {
      for (let row = 0; row < 4; row += 1) {
        const table = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 0.92, 0.08, 30), ivoryMaterial);
        table.position.set(side * 4.15, 0.92, -1.8 + row * 2.6);
        table.castShadow = true;
        venue.add(table);

        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.32, 0.9, 18), goldMaterial);
        base.position.set(side * 4.15, 0.45, -1.8 + row * 2.6);
        base.castShadow = true;
        venue.add(base);

        addFlowers(side * 4.15, 1.22, -1.8 + row * 2.6, 0.62);
      }
    }

    const ambient = new THREE.HemisphereLight(0xfff2dc, 0x35151b, 2.4);
    scene.add(ambient);
    const keyLight = new THREE.DirectionalLight(0xffd991, 4.2);
    keyLight.position.set(5, 10, 7);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    scene.add(keyLight);
    const stageLight = new THREE.SpotLight(0xffc76a, 48, 28, Math.PI / 5, 0.45, 1);
    stageLight.position.set(0, 8, 4);
    stageLight.target.position.set(0, 1.5, -5);
    scene.add(stageLight, stageLight.target);

    let targetRotation = -0.16;
    let currentRotation = targetRotation;
    let dragging = false;
    let pointerX = 0;
    const onPointerDown = (event: PointerEvent) => {
      dragging = true;
      pointerX = event.clientX;
      renderer.domElement.setPointerCapture(event.pointerId);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!dragging) return;
      targetRotation += (event.clientX - pointerX) * 0.008;
      pointerX = event.clientX;
    };
    const onPointerUp = (event: PointerEvent) => {
      dragging = false;
      if (renderer.domElement.hasPointerCapture(event.pointerId)) {
        renderer.domElement.releasePointerCapture(event.pointerId);
      }
    };
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      camera.position.multiplyScalar(event.deltaY > 0 ? 1.06 : 0.94);
      camera.position.clampLength(9, 23);
      camera.lookAt(0, 1.5, 0);
    };
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerup", onPointerUp);
    renderer.domElement.addEventListener("pointercancel", onPointerUp);
    renderer.domElement.addEventListener("wheel", onWheel, { passive: false });

    const resize = () => {
      const width = Math.max(1, host.clientWidth);
      const height = Math.max(1, host.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    resize();

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const animate = () => {
      if (disposed) return;
      currentRotation += (targetRotation - currentRotation) * 0.08;
      venue.rotation.y = currentRotation;
      if (!reduceMotion && !dragging) targetRotation += 0.00035;
      renderer.render(scene, camera);
      frameId = window.requestAnimationFrame(animate);
    };
    animate();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("pointercancel", onPointerUp);
      renderer.domElement.removeEventListener("wheel", onWheel);
      venue.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
      });
      [redMaterial, goldMaterial, ivoryMaterial, greenMaterial, floorMaterial].forEach((item) =>
        item.dispose(),
      );
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [resetSignal, style]);

  function enterFullscreen() {
    void hostRef.current?.parentElement?.requestFullscreen?.();
  }

  return (
    <section className="scene-3d-band" aria-labelledby="scene-3d-title">
      <div className="scene-3d-copy">
        <span>实时空间方案</span>
        <h3 id="scene-3d-title">3D 婚礼现场预览</h3>
        <p>拖动画面旋转视角，滚轮或触控板缩放，快速检查舞台、通道与宴会桌布局。</p>
      </div>
      <div className="scene-3d-viewport" ref={hostRef} />
      <div className="scene-3d-toolbar">
        <button type="button" onClick={() => setResetSignal((value) => value + 1)} title="重置视角">
          <RotateCcw size={17} aria-hidden="true" />
          <span>重置视角</span>
        </button>
        <button type="button" onClick={enterFullscreen} title="全屏预览">
          <Maximize2 size={17} aria-hidden="true" />
          <span>全屏预览</span>
        </button>
      </div>
    </section>
  );
}
