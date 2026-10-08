
/* Poly Heart model by Quaternius [CC0] (https://creativecommons.org/publicdomain/zero/1.0/) via Poly Pizza (https://poly.pizza/m/1yCRUwFnwX)
 */

import * as THREE from "three";
import { gsap } from "gsap";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { CONFIG } from "./js/config.js";
import { heartVertexShader, heartFragmentShader, particleVertexShader, particleFragmentShader } from "./js/shaders.js";
class World {
  constructor({
    canvas,
    width,
    height,
    cameraPosition,
    fieldOfView = 75,
    nearPlane = 0.1,
    farPlane = 100 }) {
    this.parameters = {
      count: CONFIG.particles.heartCount,
      max: 12.5 * Math.PI,
      a: 2,
      c: 4.5
    };

    this.textureLoader = new THREE.TextureLoader();
    this.scene = new THREE.Scene();

    this.clock = new THREE.Clock();
    this.data = 0;
    this.time = { current: 0, t0: 0, t1: 0, t: 0, frequency: 0.0005 };
    this.angle = { x: 0, z: 0 };
    this.targetTilt = { x: 0, y: 0 };
    this.currentTilt = { x: 0, y: 0 };
    this.width = width || window.innerWidth;
    this.height = height || window.innerHeight;
    
    this.createBackground();
    this.aspectRatio = this.width / this.height;
    this.fieldOfView = fieldOfView;
    this.camera = new THREE.PerspectiveCamera(
      fieldOfView,
      this.aspectRatio,
      nearPlane,
      farPlane);

    this.camera.position.set(
      cameraPosition.x,
      cameraPosition.y,
      cameraPosition.z);

    this.scene.add(this.camera);
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true
    });

    this.pixelRatio = Math.min(window.devicePixelRatio, 2);
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setSize(this.width, this.height);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    // Remove RoomEnvironment to eliminate the circular milky halo burn artifact.
    // We only rely on direct lights for sharp facets.
    
    // Add Lights for MeshPhysicalMaterial
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    this.scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0xffffff, 2.0); // 1.5 - 2.0
    pointLight.position.set(2, 2, 5); // positioned at (2, 2, 5)
    this.scene.add(pointLight);
    const backLight = new THREE.PointLight(0xffffff, 1.2);
    backLight.position.set(-2, -5, -5);
    this.scene.add(backLight);

    const renderScene = new RenderPass(this.scene, this.camera);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(this.width, this.height), 1.0, 0.4, 0.85);
    bloomPass.threshold = 0.2;
    bloomPass.strength = 1.0;
    bloomPass.radius = 0.5;

    this.composer = new EffectComposer(this.renderer);
    this.composer.setPixelRatio(this.pixelRatio);
    this.composer.addPass(renderScene);
    this.composer.addPass(bloomPass);
    this.timer = 0;
    this.addToScene();
    this.setupAudioAutoplay();
    this.initHeartEmitter();
    this.startIntro();

    this.render();
    this.listenToResize();
    this.listenToMouseMove();
  }
  startIntro() {
    gsap.fromTo("h1", 
      { y: -50, opacity: 0 }, 
      { y: 0, opacity: 1, duration: 2, ease: "power3.out", delay: 0.5 }
    );
    
    gsap.to("h1", {
      y: -10,
      duration: 2,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
      delay: 2.5
    });

    if (this.heartMaterial) {
      this.heartMaterial.uniforms.uSize.value = 0.0;
      gsap.to(this.heartMaterial.uniforms.uSize, {
        value: 0.2,
        duration: 3,
        ease: "power2.out",
        delay: 0.5
      });
    }
    if (this.snowMaterial) {
      this.snowMaterial.uniforms.uSize.value = 0.0;
      gsap.to(this.snowMaterial.uniforms.uSize, {
        value: 0.3,
        duration: 4,
        ease: "power2.out",
        delay: 1
      });
    }
  }
  start() { }
  render() {
    if (this.composer) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }
  loop() {
    this.time.elapsed = this.clock.getElapsedTime();
    this.time.delta = Math.min(
      60,
      (this.time.current - this.time.elapsed) * 1000);

    if (this.analyser && this.isRunning) {
      this.time.t = this.time.elapsed - this.time.t0 + this.time.t1;
      this.data = this.analyser.getAverageFrequency();
      this.data *= this.data / 2000;
      this.angle.x += this.time.delta * 0.001 * 0.63;
      this.angle.z += this.time.delta * 0.001 * 0.39;
      const justFinished = this.isRunning && !this.sound.isPlaying;
      if (justFinished) {
        this.time.t1 = this.time.t;
        this.audioBtn.disabled = false;
        this.isRunning = false;
        const tl = gsap.timeline();
        this.angle.x = 0;
        this.angle.z = 0;
        tl.to(this.camera.position, {
          x: 0,
          z: 4.5,
          duration: 4,
          ease: "expo.in"
        });

        tl.to(this.audioBtn, {
          opacity: () => 1,
          duration: 1,
          ease: "power1.out"
        });

      } else {
        this.camera.position.x = Math.sin(this.angle.x) * this.parameters.a;
        this.camera.position.z = Math.min(
          Math.max(Math.cos(this.angle.z) * this.parameters.c, 1.75),
          6.5);

      }
    }
    this.camera.lookAt(this.scene.position);
    if (this.heartMaterial) {
      this.heartMaterial.uniforms.uTime.value +=
        this.time.delta * this.time.frequency * (1 + this.data * 0.2);
    }
    if (this.modelGroup) {
      this.model.rotation.y -= 0.0005 * this.time.delta * (1 + this.data);
      if (this.model.userData.baseY !== undefined) {
        this.model.position.y = this.model.userData.baseY + Math.sin(this.time.elapsed * 1.5) * 0.15;
      }
      
      const t = (this.heartMaterial ? this.heartMaterial.uniforms.uTime.value : this.time.elapsed) * 2.0; 
      const beat1 = Math.pow(Math.max(0, Math.sin(t * Math.PI)), 20);
      const beat2 = Math.pow(Math.max(0, Math.sin(t * Math.PI - 0.5)), 20);
      const pulse = (beat1 * 0.04) + (beat2 * 0.015) + (this.data * 0.001);
      
      this.modelGroup.scale.set(1 + pulse, 1 + pulse, 1 + pulse);
      
      this.currentTilt.x += (this.targetTilt.x - this.currentTilt.x) * 0.05;
      this.currentTilt.y += (this.targetTilt.y - this.currentTilt.y) * 0.05;
      this.modelGroup.rotation.x = this.currentTilt.x;
      this.modelGroup.rotation.z = this.currentTilt.y;
    }
    if (this.snowMaterial) {
      this.snowMaterial.uniforms.uTime.value +=
        this.time.delta * 0.0004 * (1 + this.data);
    }
    this.render();

    this.time.current = this.time.elapsed;
    requestAnimationFrame(this.loop.bind(this));
  }
  listenToResize() {
    window.addEventListener("resize", () => {
      // Update sizes
      this.width = window.innerWidth;
      this.height = window.innerHeight;

      // Update background
      this.createBackground();

      // Update camera
      this.camera.aspect = this.width / this.height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(this.width, this.height);
      if (this.composer) {
        this.composer.setSize(this.width, this.height);
      }
    });
  }

  createBackground() {
    if(!this.canvasBg) {
      this.canvasBg = document.createElement("canvas");
    }
    this.canvasBg.width = this.width;
    this.canvasBg.height = this.height;
    const ctx = this.canvasBg.getContext("2d");
    const cx = this.width / 2;
    const cy = this.height / 2;
    const maxR = Math.max(cx, cy) * 1.5;
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR);
    gradient.addColorStop(0, "#2e0817");
    gradient.addColorStop(0.6, "#12020a");
    gradient.addColorStop(1, "#050003");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);
    
    if(!this.bgTexture) {
      this.bgTexture = new THREE.CanvasTexture(this.canvasBg);
      this.scene.background = this.bgTexture;
    } else {
      this.bgTexture.needsUpdate = true;
    }
  }

  createRipple(x, y) {
    if(!this.camera) return;
    const vec = new THREE.Vector3((x / this.width) * 2 - 1, -(y / this.height) * 2 + 1, 0.5);
    vec.unproject(this.camera);
    vec.sub(this.camera.position).normalize();
    const distance = -this.camera.position.z / vec.z;
    const pos = this.camera.position.clone().add(vec.multiplyScalar(distance));

    const geom = new THREE.BufferGeometry();
    const posArr = new Float32Array(40 * 3);
    for(let i=0; i<40; i++) {
        const theta = Math.random() * Math.PI * 2;
        const r = Math.random() * 0.15;
        posArr[i*3] = pos.x + Math.cos(theta)*r;
        posArr[i*3+1] = pos.y + Math.sin(theta)*r;
        posArr[i*3+2] = pos.z;
    }
    geom.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
    const mat = new THREE.PointsMaterial({ color: 0xffaaff, size: 0.1, transparent: true, opacity: 1, blending: THREE.AdditiveBlending });
    const pts = new THREE.Points(geom, mat);
    this.scene.add(pts);

    gsap.to(mat, { opacity: 0, size: 0.0, duration: 1.2, ease: "power2.out", onComplete: () => {
        this.scene.remove(pts);
        geom.dispose();
        mat.dispose();
    }});
    gsap.to(pts.scale, { x: 3, y: 3, z: 3, duration: 1.2, ease: "power2.out" });
  }

  listenToMouseMove() {
    const updateTarget = (clientX, clientY) => {
      gsap.to(this.camera.position, {
        x: gsap.utils.mapRange(0, window.innerWidth, 0.2, -0.2, clientX),
        y: gsap.utils.mapRange(0, window.innerHeight, 0.2, -0.2, -clientY),
        duration: 2,
        ease: "power3.out"
      });
      this.targetTilt.x = ((clientY / this.height) - 0.5) * 0.4;
      this.targetTilt.y = ((clientX / this.width) - 0.5) * 0.4;
    };

    window.addEventListener("mousemove", e => updateTarget(e.clientX, e.clientY));
    window.addEventListener("touchmove", e => {
      if(e.touches.length > 0) updateTarget(e.touches[0].clientX, e.touches[0].clientY);
    });
    
    window.addEventListener("click", e => {
      this.createRipple(e.clientX, e.clientY);
    });
  }

  initHeartEmitter() {
    this.heartEmitterInterval = null;
    this.pointerX = 0;
    this.pointerY = 0;
    this.isPointerDown = false;
    this.holdTimer = null;
    this.downTime = 0;
    this.downX = 0;
    this.downY = 0;

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const container = document.getElementById("mini-hearts-container");
    if(!container) return;

    const spawnHeart = () => {
      const heart = document.createElement("div");
      heart.innerHTML = "❤️";
      heart.style.position = "absolute";
      heart.style.left = this.pointerX + "px";
      heart.style.top = this.pointerY + "px";
      const size = 12 + Math.random() * 12;
      heart.style.fontSize = size + "px";
      heart.style.pointerEvents = "none";
      container.appendChild(heart);

      const duration = 1.5 + Math.random();
      const xDrift = (Math.random() - 0.5) * 100;
      
      gsap.to(heart, {
        x: xDrift,
        y: window.innerHeight * 0.3 + Math.random() * 100,
        rotation: (Math.random() - 0.5) * 90,
        opacity: 0,
        duration: duration,
        ease: "power1.in",
        onComplete: () => {
          heart.remove();
        }
      });
    };

    const spawnSparkle = (x, y) => {
      const sparkle = document.createElement("div");
      sparkle.innerHTML = "✨";
      sparkle.style.position = "absolute";
      sparkle.style.left = x + "px";
      sparkle.style.top = y + "px";
      sparkle.style.fontSize = (14 + Math.random() * 14) + "px";
      sparkle.style.pointerEvents = "none";
      container.appendChild(sparkle);

      const angle = Math.random() * Math.PI * 2;
      const radius = 60 + Math.random() * 150;
      
      gsap.to(sparkle, {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        rotation: (Math.random() - 0.5) * 360,
        scale: 0.2,
        opacity: 0,
        duration: 0.6 + Math.random() * 0.4,
        ease: "power3.out",
        onComplete: () => sparkle.remove()
      });
    };

    const triggerHeartClick = (x, y) => {
      if(this.modelGroup) {
        gsap.killTweensOf(this.modelGroup.scale);
        this.modelGroup.scale.set(1, 1, 1);
        gsap.timeline()
          .to(this.modelGroup.scale, { x: 1.35, y: 1.35, z: 1.35, duration: 0.12, ease: "power2.out" })
          .to(this.modelGroup.scale, { x: 1.0, y: 1.0, z: 1.0, duration: 0.6, ease: "elastic.out(1.2, 0.4)" });
      }
      
      if(this.heartMaterial) {
        gsap.killTweensOf(this.heartMaterial.uniforms.uSize);
        this.heartMaterial.uniforms.uSize.value = 0.2;
        gsap.timeline()
          .to(this.heartMaterial.uniforms.uSize, { value: 0.5, duration: 0.15, ease: "power2.out" })
          .to(this.heartMaterial.uniforms.uSize, { value: 0.2, duration: 0.6, ease: "power2.in" });
      }

      for(let i=0; i<15; i++) {
        spawnSparkle(x, y);
      }

      if (!this.audioInitialized) {
        this.audioInitialized = true;
        this.loadMusic();
      }
    };

    const startHold = (x, y) => {
      this.pointerX = x;
      this.pointerY = y;
      this.downX = x;
      this.downY = y;
      this.downTime = Date.now();
      this.isPointerDown = true;
      clearTimeout(this.holdTimer);
      this.holdTimer = setTimeout(() => {
        if(this.isPointerDown) {
          this.heartEmitterInterval = setInterval(spawnHeart, 80);
        }
      }, 200);
    };

    const endHold = (e) => {
      this.isPointerDown = false;
      clearTimeout(this.holdTimer);
      clearInterval(this.heartEmitterInterval);
      
      if(e && e.type === "pointerup") {
        const duration = Date.now() - this.downTime;
        const dist = Math.hypot(e.clientX - this.downX, e.clientY - this.downY);
        
        if(duration < 250 && dist < 10) {
          mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
          mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
          raycaster.setFromCamera(mouse, this.camera);
          
          let intersected = false;
          if (this.model) {
             const intersects = raycaster.intersectObjects([this.model], true);
             if (intersects.length > 0) intersected = true;
          }
          if(intersected || (Math.abs(mouse.x) < 0.3 && Math.abs(mouse.y) < 0.3)) {
             triggerHeartClick(e.clientX, e.clientY);
          }
        }
      }
    };

    window.addEventListener("contextmenu", e => {
      if(e.cancelable) e.preventDefault();
    });

    window.addEventListener("pointerdown", e => {
      if (e.pointerType === "touch" || e.pointerType === "mouse") {
        if(e.cancelable) e.preventDefault();
      }
      startHold(e.clientX, e.clientY);
    }, { passive: false });
    
    window.addEventListener("pointermove", e => {
      this.pointerX = e.clientX;
      this.pointerY = e.clientY;
    });

    window.addEventListener("pointerup", endHold);
    window.addEventListener("pointercancel", endHold);
  }

  addHeart() {
    this.heartMaterial = new THREE.ShaderMaterial({
      fragmentShader: heartFragmentShader,
      vertexShader: heartVertexShader,
      uniforms: {
        uTime: { value: 0 },
        uSize: { value: 0.2 },
        uTex: {
          value: new THREE.TextureLoader().load(CONFIG.urls.heartTexture)
        }
      },



      depthWrite: false,
      blending: THREE.AdditiveBlending,
      transparent: true
    });

    const count = this.parameters.count; //2000
    const scales = new Float32Array(count * 1);
    const colors = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    const randoms = new Float32Array(count);
    const randoms1 = new Float32Array(count);
    const colorChoices = [
      "white",
      "red",
      "pink",
      "crimson",
      "hotpink",
      "green"];


    const squareGeometry = new THREE.PlaneGeometry(1, 1);
    this.instancedGeometry = new THREE.InstancedBufferGeometry();
    Object.keys(squareGeometry.attributes).forEach(attr => {
      this.instancedGeometry.attributes[attr] = squareGeometry.attributes[attr];
    });
    this.instancedGeometry.index = squareGeometry.index;
    this.instancedGeometry.maxInstancedCount = count;

    for (let i = 0; i < count; i++) {
      const phi = Math.random() * Math.PI * 2;
      const i3 = 3 * i;
      randoms[i] = Math.random();
      randoms1[i] = Math.random();
      scales[i] = Math.random() * 0.35;
      const colorIndex = Math.floor(Math.random() * colorChoices.length);
      const color = new THREE.Color(colorChoices[colorIndex]);
      colors[i3 + 0] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;
      speeds[i] = Math.random() * this.parameters.max;
    }
    this.instancedGeometry.setAttribute(
      "random",
      new THREE.InstancedBufferAttribute(randoms, 1, false));

    this.instancedGeometry.setAttribute(
      "random1",
      new THREE.InstancedBufferAttribute(randoms1, 1, false));

    this.instancedGeometry.setAttribute(
      "aScale",
      new THREE.InstancedBufferAttribute(scales, 1, false));

    this.instancedGeometry.setAttribute(
      "aSpeed",
      new THREE.InstancedBufferAttribute(speeds, 1, false));

    this.instancedGeometry.setAttribute(
      "aColor",
      new THREE.InstancedBufferAttribute(colors, 3, false));

    this.heart = new THREE.Mesh(this.instancedGeometry, this.heartMaterial);
    console.log(this.heart);
    this.scene.add(this.heart);
  }
  addToScene() {
    this.addModel();
    this.addHeart();
    this.addSnow();
  }
  async addModel() {
    this.model = await this.loadObj(CONFIG.urls.heartModel);

    this.model.scale.set(0.01, 0.01, 0.01);
    this.model.userData.baseY = -1;
    this.model.position.y = this.model.userData.baseY;
    this.model.material = new THREE.MeshPhysicalMaterial({
      color: 0xff4081, // Vibrant hot/rose pink
      emissive: 0x220510,
      metalness: 0.1,
      roughness: 0.08,
      transmission: 0.85, // Glass/crystal transparency
      ior: 2.2,          // Diamond refraction index
      reflectivity: 0.9,
      thickness: 1.2,
      specularIntensity: 1.0,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1
    });

    gsap.to(this.model.scale, {
      x: 0.35, y: 0.35, z: 0.35,
      duration: 2,
      ease: "Elastic.easeOut.config(1, 0.5)"
    });
    gsap.to(this.model.userData, {
      baseY: 0,
      duration: 1.5,
      ease: "power3.out"
    });

    this.modelGroup = new THREE.Group();
    this.modelGroup.add(this.model);
    this.scene.add(this.modelGroup);
  }
  setupAudioAutoplay() {
    const startAudio = () => {
      if (!this.audioInitialized) {
        this.audioInitialized = true;
        this.loadMusic();
      }
      window.removeEventListener("pointerdown", startAudio);
      window.removeEventListener("keydown", startAudio);
    };
    window.addEventListener("pointerdown", startAudio);
    window.addEventListener("keydown", startAudio);
  }

  loadObj(path) {
    const loader = new GLTFLoader();
    return new Promise(resolve => {
      loader.load(
        path,
        response => {
          resolve(response.scene.children[0]);
        },
        xhr => { },
        err => {
          console.log(err);
        });

    });
  }

  loadMusic() {
    return new Promise(resolve => {
      const listener = new THREE.AudioListener();
      this.camera.add(listener);
      this.sound = new THREE.Audio(listener);
      const audioLoader = new THREE.AudioLoader();
      audioLoader.load(
        CONFIG.urls.music,
        buffer => {
          this.sound.setBuffer(buffer);
          this.sound.setLoop(true);
          this.sound.setVolume(0);
          
          try {
            const playPromise = this.sound.play();
            if (playPromise !== undefined && playPromise.catch) {
              playPromise.catch(error => console.warn("Audio playback waiting for direct user gesture:", error));
            }
          } catch(e) {
            console.warn("Audio context error:", e);
          }

          if(this.sound.gain) {
            gsap.to(this.sound.gain.gain, { value: 1, duration: 2 });
          }

          this.analyser = new THREE.AudioAnalyser(this.sound, 32);
          this.isRunning = true;
          this.time.t0 = this.time.elapsed;
          
          if (this.model) {
            gsap.to(this.model.scale, { x: 0.5, y: 0.5, z: 0.5, duration: 0.2, yoyo: true, repeat: 1, ease: "power2.out" });
            gsap.to(this.model.rotation, { y: "-=6.28", duration: 1.5, ease: "expo.out" });
            gsap.fromTo(this.parameters, { c: 2.0 }, { c: 4.5, duration: 2.5, ease: "power3.out" });
          }

          if (this.heartMaterial) {
            gsap.fromTo(this.heartMaterial.uniforms.uSize, 
              { value: 0.4 }, 
              { value: 0.2, duration: 1.5, ease: "power2.out" }
            );
          }
          resolve();
        },
        progress => {},
        error => {
          console.warn("Audio load error:", error);
        }
      );
    });
  }
  addSnow() {
    this.snowMaterial = new THREE.ShaderMaterial({
      fragmentShader: particleFragmentShader,
      vertexShader: particleVertexShader,
      uniforms: {
        uTime: { value: 0 },
        uSize: { value: 0.3 },
        uTex: {
          value: new THREE.TextureLoader().load(CONFIG.urls.heartTexture)
        }
      },



      depthWrite: false,
      blending: THREE.AdditiveBlending,
      transparent: true
    });

    const count = CONFIG.particles.snowCount;
    const scales = new Float32Array(count * 1);
    const colors = new Float32Array(count * 3);
    const phis = new Float32Array(count);
    const randoms = new Float32Array(count);
    const randoms1 = new Float32Array(count);
    const colorChoices = ["red", "pink", "hotpink", "green"];

    const squareGeometry = new THREE.PlaneGeometry(1, 1);
    this.instancedGeometry = new THREE.InstancedBufferGeometry();
    Object.keys(squareGeometry.attributes).forEach(attr => {
      this.instancedGeometry.attributes[attr] = squareGeometry.attributes[attr];
    });
    this.instancedGeometry.index = squareGeometry.index;
    this.instancedGeometry.maxInstancedCount = count;

    for (let i = 0; i < count; i++) {
      const phi = (Math.random() - 0.5) * 10;
      const i3 = 3 * i;
      phis[i] = phi;
      randoms[i] = Math.random();
      randoms1[i] = Math.random();
      scales[i] = Math.random() * 0.35;
      const colorIndex = Math.floor(Math.random() * colorChoices.length);
      const color = new THREE.Color(colorChoices[colorIndex]);
      colors[i3 + 0] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;
    }
    this.instancedGeometry.setAttribute(
      "phi",
      new THREE.InstancedBufferAttribute(phis, 1, false));

    this.instancedGeometry.setAttribute(
      "random",
      new THREE.InstancedBufferAttribute(randoms, 1, false));

    this.instancedGeometry.setAttribute(
      "random1",
      new THREE.InstancedBufferAttribute(randoms1, 1, false));

    this.instancedGeometry.setAttribute(
      "aScale",
      new THREE.InstancedBufferAttribute(scales, 1, false));

    this.instancedGeometry.setAttribute(
      "aColor",
      new THREE.InstancedBufferAttribute(colors, 3, false));

    this.snow = new THREE.Mesh(this.instancedGeometry, this.snowMaterial);
    this.scene.add(this.snow);
  }
}

const world = new World({
  canvas: document.querySelector("canvas.webgl"),
  cameraPosition: CONFIG.camera.defaultPosition
});

world.loop();

window.addEventListener("load", () => {
  const preloader = document.getElementById("preloader");
  if (preloader) {
    gsap.to(preloader, {
      opacity: 0,
      duration: 0.8,
      ease: "power2.inOut",
      onComplete: () => {
        preloader.remove();
      }
    });
  }
});