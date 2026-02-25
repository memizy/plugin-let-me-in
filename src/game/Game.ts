import * as THREE from 'three'
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js'
import RAPIER from '@dimforge/rapier3d-compat'
import { Howler } from 'howler'
import { useGameStore } from '../stores/game'
import { SpriteHPBarSystem } from './SpriteHPBarSystem'
import { CombatSystem } from './CombatSystem'
import { ShootingSystem } from './ShootingSystem'
import { TowerSystem, TOWER_CONFIGS } from './TowerSystem'
import { WaveSystem } from './WaveSystem'
import { audioService } from '../services/AudioService'
import type { SavedGameState } from './SaveSystem'

// ECS Types
export type EntityId = number

export interface Component {
  type: string
}

export interface TransformComponent extends Component {
  type: 'transform'
  position: THREE.Vector3
  rotation: THREE.Euler
  scale: THREE.Vector3
}

export interface MeshComponent extends Component {
  type: 'mesh'
  mesh: THREE.Mesh
}

export interface RigidBodyComponent extends Component {
  type: 'rigidbody'
  body: RAPIER.RigidBody
  collider: RAPIER.Collider
}

export interface HealthComponent extends Component {
  type: 'health'
  current: number
  max: number
}

export interface CombatComponent extends Component {
  type: 'combat'
  damage: number
  attackCooldown: number
  lastAttackTime: number
}

export interface System {
  update(dt: number): void
}

// Main Game Class
export default class Game {
  canvas: HTMLCanvasElement
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  controls: PointerLockControls
  
  // Rapier Physics
  world!: RAPIER.World
  
  // ECS
  entities = new Map<EntityId, Map<string, Component>>()
  nextEntityId = 1
  systems: System[] = []
  
  // Game State
  running = false
  lastTime = 0
  
  // Quiz callback
  onShowQuiz: (() => void) | null = null
  onShowPause: (() => void) | null = null
  
  // Player
  playerEntity!: EntityId
  libraryEntity!: EntityId
  groundEntity!: EntityId
  playerVelocity = new THREE.Vector3()
  moveForward = false
  moveBackward = false
  moveLeft = false
  moveRight = false
  canJump = false
  
  // Mobile controls
  isMobile = false
  mobileInput = {
    moveX: 0,
    moveY: 0,
    lookX: 0,
    lookY: 0, // NEBUDE SE POUŽÍVAT na mobilu - jen horizontální otáčení
    shoot: false,
    jump: false
  }
  mobileLookSensitivity = 1.0 // Citlivost horizontálního otáčení
  
  // Raycaster for shooting and interaction
  raycaster = new THREE.Raycaster()
  
  // Library reference for interaction
  libraryMesh!: THREE.Mesh
  
  // Enemies
  enemies: EntityId[] = []
  spawnTimer = 0
  waveNumber = 0
  
  // HP Bar System (Sprite-based)
  hpBarSystem!: SpriteHPBarSystem
  
  // Combat system
  combatSystem!: CombatSystem
  shootingSystem!: ShootingSystem
  towerSystem!: TowerSystem
  waveSystem!: WaveSystem
  gameOver = false
  damageFlashTime = 0

  private mobileControlListener: EventListener | null = null
  
  constructor(canvas: HTMLCanvasElement, onShowQuiz?: () => void, onShowPause?: () => void) {
    this.canvas = canvas
    this.onShowQuiz = onShowQuiz || null
    this.onShowPause = onShowPause || null
    
    
    // Three.js setup
    this.renderer = new THREE.WebGLRenderer({ 
      canvas: this.canvas, 
      antialias: true,
      alpha: false 
    })
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    
    // Ensure canvas can receive pointer events
    this.canvas.style.position = 'absolute'
    this.canvas.style.top = '0'
    this.canvas.style.left = '0'
    this.canvas.style.width = '100%'
    this.canvas.style.height = '100%'
    
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x87ceeb) // Sky blue
    this.scene.fog = new THREE.Fog(0x87ceeb, 50, 200)
    
    // Camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )
    this.camera.position.set(0, 10, 20)
    
    // Controls
    this.controls = new PointerLockControls(this.camera, this.canvas)
    
    // Event listeners - DON'T lock on canvas click here, it interferes with shooting
    this.controls.addEventListener('lock', () => {
      console.log('Controls locked')
    })
    
    this.controls.addEventListener('unlock', () => {
      console.log('Controls unlocked')
    })
    
    // Keyboard controls
    this.setupKeyboardControls()
    
    // Mobile controls
    this.setupMobileControls()
    
    // Window resize
    window.addEventListener('resize', this.onResize.bind(this))
    this.onResize()
  }
  
  async init() {
    console.log('Initializing game...')
    
    // Initialize Rapier physics
    await RAPIER.init()
    const gravity = { x: 0.0, y: -9.81, z: 0.0 }
    this.world = new RAPIER.World(gravity)
    
    // Initialize HP Bar System (Sprite-based, no CSS3D!)
    this.hpBarSystem = new SpriteHPBarSystem(this.scene)
    
    // Initialize Combat System
    this.combatSystem = new CombatSystem(this)
    
    // Initialize Shooting System
    this.shootingSystem = new ShootingSystem(this)
    
    // Initialize Tower System
    this.towerSystem = new TowerSystem(this)
    
    // Initialize Wave System
    this.waveSystem = new WaveSystem(this)
    
    // Initialize audio
    audioService.initThreeAudio(this.camera)
    await audioService.loadAll()
    audioService.startGameMusic() // Start alternating game music (ambient <-> battle)
    
    // Setup scene
    this.setupLights()
    this.createGround()
    this.createLibrary()
    this.createPlayer()
    
    // 🔒 NEBUDEME auto-lockovat při startu - způsobuje to SecurityError
    // Hráč musí kliknout na canvas pro lock (standardní chování)
    console.log('✅ Game initialized - click to start!')
  }
  
  setupLights() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    this.scene.add(ambientLight)
    
    // Directional light (sun)
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8)
    dirLight.position.set(50, 50, 25)
    dirLight.castShadow = true
    dirLight.shadow.camera.left = -50
    dirLight.shadow.camera.right = 50
    dirLight.shadow.camera.top = 50
    dirLight.shadow.camera.bottom = -50
    dirLight.shadow.camera.near = 0.1
    dirLight.shadow.camera.far = 200
    dirLight.shadow.mapSize.width = 2048
    dirLight.shadow.mapSize.height = 2048
    this.scene.add(dirLight)
    
    // Hemisphere light for more natural lighting
    const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x4a6b3a, 0.4)
    this.scene.add(hemiLight)
  }
  
  createGround() {
    // Visual ground
    const groundGeometry = new THREE.PlaneGeometry(200, 200)
    const groundMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x3a6b3a,
      roughness: 0.8,
      metalness: 0.2
    })
    const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial)
    groundMesh.rotation.x = -Math.PI / 2
    groundMesh.receiveShadow = true
    groundMesh.userData.isGround = true // For tower placement raycasting
    this.scene.add(groundMesh)
    
    // Physics ground
    const groundBodyDesc = RAPIER.RigidBodyDesc.fixed()
    const groundBody = this.world.createRigidBody(groundBodyDesc)
    const groundColliderDesc = RAPIER.ColliderDesc.cuboid(100, 0.1, 100)
    this.world.createCollider(groundColliderDesc, groundBody)
  }
  
  createLibrary() {
    // Library building in center - rozdělená na tři části
    
    // Spodní část (oranžová - vymodelovaná ze stěn s průchodem)
    const wallMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xff8c00, // Tmavě oranžová
      roughness: 0.7
    })
    
    // Rozměry: budova 10x10, průchod 3 jednotky široký
    const wallThickness = 0.5
    const buildingSize = 10
    const doorWidth = 3
    const wallHeight = 4
    
    // Severní stěna (+Z) - rozdělená na 2 části kvůli průchodu uprostřed (hráč začíná na Z=20, tak dáme dveře sem)
    const sideWallLength = (buildingSize - wallThickness - doorWidth) / 2
    const northWallLeftGeometry = new THREE.BoxGeometry(sideWallLength, wallHeight, wallThickness)
    const northWallLeft = new THREE.Mesh(northWallLeftGeometry, wallMaterial)
    northWallLeft.position.set(-buildingSize / 2 + wallThickness / 2 + sideWallLength / 2, 2, (buildingSize / 2) - (wallThickness / 2))
    northWallLeft.castShadow = true
    northWallLeft.receiveShadow = true
    northWallLeft.userData.isLibrary = true
    northWallLeft.userData.isLibraryBase = true
    this.scene.add(northWallLeft)
    
    const northWallRight = new THREE.Mesh(northWallLeftGeometry, wallMaterial)
    northWallRight.position.set(buildingSize / 2 - wallThickness / 2 - sideWallLength / 2, 2, (buildingSize / 2) - (wallThickness / 2))
    northWallRight.castShadow = true
    northWallRight.receiveShadow = true
    northWallRight.userData.isLibrary = true
    northWallRight.userData.isLibraryBase = true
    this.scene.add(northWallRight)
    
    // Jižní stěna (-Z) - plná, zarovnaná s horním patrem
    const southWallGeometry = new THREE.BoxGeometry(buildingSize - wallThickness, wallHeight, wallThickness)
    const southWall = new THREE.Mesh(southWallGeometry, wallMaterial)
    southWall.position.set(0, 2, -(buildingSize / 2) + (wallThickness / 2))
    southWall.castShadow = true
    southWall.receiveShadow = true
    southWall.userData.isLibrary = true
    southWall.userData.isLibraryBase = true
    this.scene.add(southWall)
    
    // Východní stěna (+X) - plná, zarovnaná s horním patrem
    const eastWallGeometry = new THREE.BoxGeometry(wallThickness, wallHeight, buildingSize - wallThickness)
    const eastWall = new THREE.Mesh(eastWallGeometry, wallMaterial)
    eastWall.position.set((buildingSize / 2) - (wallThickness / 2), 2, 0)
    eastWall.castShadow = true
    eastWall.receiveShadow = true
    eastWall.userData.isLibrary = true
    eastWall.userData.isLibraryBase = true
    this.scene.add(eastWall)
    
    // Západní stěna (-X) - plná, zarovnaná s horním patrem
    const westWall = new THREE.Mesh(eastWallGeometry, wallMaterial)
    westWall.position.set(-(buildingSize / 2) + (wallThickness / 2), 2, 0)
    westWall.castShadow = true
    westWall.receiveShadow = true
    westWall.userData.isLibrary = true
    westWall.userData.isLibraryBase = true
    this.scene.add(westWall)
    
    // Rohové sloupce - vyplní mezery v rozích
    const cornerPillarGeometry = new THREE.BoxGeometry(wallThickness, wallHeight, wallThickness)
    const cornerPillarMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xff8c00, // Stejná barva jako stěny
      roughness: 0.7
    })
    
    // Severovýchodní roh (+X, +Z)
    const cornerNE = new THREE.Mesh(cornerPillarGeometry, cornerPillarMaterial)
    cornerNE.position.set((buildingSize / 2) - (wallThickness / 2), 2, (buildingSize / 2) - (wallThickness / 2))
    cornerNE.castShadow = true
    cornerNE.receiveShadow = true
    cornerNE.userData.isLibrary = true
    cornerNE.userData.isLibraryBase = true
    this.scene.add(cornerNE)
    
    // Severozápadní roh (-X, +Z)
    const cornerNW = new THREE.Mesh(cornerPillarGeometry, cornerPillarMaterial)
    cornerNW.position.set(-(buildingSize / 2) + (wallThickness / 2), 2, (buildingSize / 2) - (wallThickness / 2))
    cornerNW.castShadow = true
    cornerNW.receiveShadow = true
    cornerNW.userData.isLibrary = true
    cornerNW.userData.isLibraryBase = true
    this.scene.add(cornerNW)
    
    // Jihovýchodní roh (+X, -Z)
    const cornerSE = new THREE.Mesh(cornerPillarGeometry, cornerPillarMaterial)
    cornerSE.position.set((buildingSize / 2) - (wallThickness / 2), 2, -(buildingSize / 2) + (wallThickness / 2))
    cornerSE.castShadow = true
    cornerSE.receiveShadow = true
    cornerSE.userData.isLibrary = true
    cornerSE.userData.isLibraryBase = true
    this.scene.add(cornerSE)
    
    // Jihozápadní roh (-X, -Z)
    const cornerSW = new THREE.Mesh(cornerPillarGeometry, cornerPillarMaterial)
    cornerSW.position.set(-(buildingSize / 2) + (wallThickness / 2), 2, -(buildingSize / 2) + (wallThickness / 2))
    cornerSW.castShadow = true
    cornerSW.receiveShadow = true
    cornerSW.userData.isLibrary = true
    cornerSW.userData.isLibraryBase = true
    this.scene.add(cornerSW)
    
    // Podlaha (vnitřní)
    const floorGeometry = new THREE.BoxGeometry(buildingSize - wallThickness, 0.2, buildingSize - wallThickness)
    const floorMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x8b4513, // Hnědá podlaha
      roughness: 0.8
    })
    const floor = new THREE.Mesh(floorGeometry, floorMaterial)
    floor.position.set(0, 0.1, 0)
    floor.receiveShadow = true
    floor.userData.isLibrary = true
    floor.userData.isLibraryBase = true
    this.scene.add(floor)
    
    // Druhé patro (žluté s okny)
    const secondFloorGeometry = new THREE.BoxGeometry(10, 4, 10)
    const secondFloorMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xffd700, // Zlatožlutá
      roughness: 0.6
    })
    const secondFloorMesh = new THREE.Mesh(secondFloorGeometry, secondFloorMaterial)
    secondFloorMesh.position.set(0, 6, 0) // Výška 6 = nad spodní částí
    secondFloorMesh.castShadow = true
    secondFloorMesh.receiveShadow = true
    secondFloorMesh.userData.isLibrary = true
    secondFloorMesh.userData.isLibraryBase = true // Také bez flash efektu
    this.scene.add(secondFloorMesh)
    
    // Okna na druhém patře
    const windowMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x87ceeb, // Světle modrá (sklo)
      roughness: 0.1,
      metalness: 0.8,
      emissive: 0x4682b4,
      emissiveIntensity: 0.3
    })
    
    // 4 okna - jedno na každé straně
    const windowGeometry = new THREE.BoxGeometry(2, 2, 0.2)
    
    // Severní okno (+Z)
    const northWindow = new THREE.Mesh(windowGeometry, windowMaterial)
    northWindow.position.set(0, 6, 5.1)
    northWindow.userData.isLibrary = true
    this.scene.add(northWindow)
    
    // Jižní okno (-Z)
    const southWindow = new THREE.Mesh(windowGeometry, windowMaterial)
    southWindow.position.set(0, 6, -5.1)
    southWindow.userData.isLibrary = true
    this.scene.add(southWindow)
    
    // Východní okno (+X)
    const eastWindow = new THREE.Mesh(windowGeometry, windowMaterial)
    eastWindow.position.set(5.1, 6, 0)
    eastWindow.rotation.y = Math.PI / 2
    eastWindow.userData.isLibrary = true
    this.scene.add(eastWindow)
    
    // Západní okno (-X)
    const westWindow = new THREE.Mesh(windowGeometry, windowMaterial)
    westWindow.position.set(-5.1, 6, 0)
    westWindow.rotation.y = Math.PI / 2
    westWindow.userData.isLibrary = true
    this.scene.add(westWindow)
    
    // Vrchní část (hnědá - může se blikat červeně)
    const topGeometry = new THREE.BoxGeometry(10, 4, 10)
    const topMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x8b4513,
      roughness: 0.7
    })
    this.libraryMesh = new THREE.Mesh(topGeometry, topMaterial)
    this.libraryMesh.position.set(0, 10, 0) // Výška 10 = nad druhým patrem
    this.libraryMesh.castShadow = true
    this.libraryMesh.receiveShadow = true
    this.libraryMesh.userData.isLibrary = true
    this.libraryMesh.userData.originalColor = 0x8b4513 // Uložíme původní barvu pro flash efekt
    this.scene.add(this.libraryMesh)
    
    // Physics colliders pro jednotlivé stěny - zarovnané s visuály
    const libraryBodyDesc = RAPIER.RigidBodyDesc.fixed()
      .setTranslation(0, 0, 0)
    const libraryBody = this.world.createRigidBody(libraryBodyDesc)
    
    // Severní stěna collidery (+Z) - 2 části kvůli průchodu (dveře na severní straně)
    const northWallCollider = RAPIER.ColliderDesc.cuboid(sideWallLength / 2, wallHeight / 2, wallThickness / 2)
      .setTranslation(-buildingSize / 2 + wallThickness / 2 + sideWallLength / 2, 2, (buildingSize / 2) - (wallThickness / 2))
      .setSensor(false)
    this.world.createCollider(northWallCollider, libraryBody)
    
    const northWallCollider2 = RAPIER.ColliderDesc.cuboid(sideWallLength / 2, wallHeight / 2, wallThickness / 2)
      .setTranslation(buildingSize / 2 - wallThickness / 2 - sideWallLength / 2, 2, (buildingSize / 2) - (wallThickness / 2))
      .setSensor(false)
    this.world.createCollider(northWallCollider2, libraryBody)
    
    // Jižní stěna collider (-Z) - plná, zarovnaná
    const southWallCollider = RAPIER.ColliderDesc.cuboid((buildingSize - wallThickness) / 2, wallHeight / 2, wallThickness / 2)
      .setTranslation(0, 2, -(buildingSize / 2) + (wallThickness / 2))
      .setSensor(false)
    this.world.createCollider(southWallCollider, libraryBody)
    
    // Východní stěna collider (+X) - zarovnaný
    const eastWallCollider = RAPIER.ColliderDesc.cuboid(wallThickness / 2, wallHeight / 2, (buildingSize - wallThickness) / 2)
      .setTranslation((buildingSize / 2) - (wallThickness / 2), 2, 0)
      .setSensor(false)
    this.world.createCollider(eastWallCollider, libraryBody)
    
    // Západní stěna collider (-X) - zarovnaný
    const westWallCollider = RAPIER.ColliderDesc.cuboid(wallThickness / 2, wallHeight / 2, (buildingSize - wallThickness) / 2)
      .setTranslation(-(buildingSize / 2) + (wallThickness / 2), 2, 0)
      .setSensor(false)
    this.world.createCollider(westWallCollider, libraryBody)
    
    // Horní patra (solid box - celá budova)
    const upperFloorsCollider = RAPIER.ColliderDesc.cuboid(5, 4, 5)
      .setTranslation(0, 8, 0) // Nad spodním patrem
      .setSensor(false)
    this.world.createCollider(upperFloorsCollider, libraryBody)
    
    // PRÁH ODSTRANĚN - hráč i nepřátelé mohou volně vcházet
    
    // Trigger zone kolem knihovny pro quiz (větší radius, je to sensor)
    const triggerColliderDesc = RAPIER.ColliderDesc.cuboid(7, 6, 7) // Také vyšší
      .setTranslation(0, 6, 0)
      .setSensor(true)
    this.world.createCollider(triggerColliderDesc, libraryBody)
    
    // Add a roof
    const roofGeometry = new THREE.ConeGeometry(8, 4, 4)
    const roofMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x654321 
    })
    const roofMesh = new THREE.Mesh(roofGeometry, roofMaterial)
    roofMesh.position.set(0, 14, 0) // Výše kvůli novému patru
    roofMesh.rotation.y = Math.PI / 4
    roofMesh.castShadow = true
    roofMesh.userData.isLibrary = true // Mark roof as library too
    this.scene.add(roofMesh)
    
    // Create library entity with health
    this.libraryEntity = this.createEntity()
    this.addComponent(this.libraryEntity, { type: 'mesh', mesh: this.libraryMesh } as MeshComponent)
    this.addComponent(this.libraryEntity, { type: 'health', current: 1000, max: 1000 } as HealthComponent)
    this.addComponent(this.libraryEntity, { 
      type: 'transform',
      position: new THREE.Vector3(0, 6, 0), // Změněno kvůli nové výšce
      rotation: new THREE.Euler(), 
      scale: new THREE.Vector3(1, 1, 1) 
    } as TransformComponent)
    
    // Create HP bar for library - EXTRA VELKÝ sprite, vysoko nad střechou
    this.hpBarSystem.createHPBar(
      this.libraryEntity, 
      1000, 
      1000, 
      { width: 160, height: 24, fontSize: 14, showText: true },
      14.0 // Výše nad střechou - upraveno kvůli vyšší budově
    )
    
    console.log('📚 Library created with HP bar at position:', this.libraryMesh.position)
  }
  
  createPlayer() {
    // Player is controlled by PointerLockControls camera
    // Create physics body for player
    const playerBodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(0, 10, 20)
      .lockRotations() // Prevent player from tipping over
      .enabledRotations(false, false, false)
    
    const playerBody = this.world.createRigidBody(playerBodyDesc)
    
    // Capsule collider for player
    const playerColliderDesc = RAPIER.ColliderDesc.capsule(0.5, 0.3)
    const playerCollider = this.world.createCollider(playerColliderDesc, playerBody)
    
    // Create player entity
    this.playerEntity = this.createEntity()
    this.addComponent(this.playerEntity, {
      type: 'transform',
      position: new THREE.Vector3(0, 10, 20),
      rotation: new THREE.Euler(),
      scale: new THREE.Vector3(1, 1, 1)
    } as TransformComponent)
    
    this.addComponent(this.playerEntity, {
      type: 'rigidbody',
      body: playerBody,
      collider: playerCollider
    } as RigidBodyComponent)
    
    this.addComponent(this.playerEntity, {
      type: 'health',
      current: 100,
      max: 100
    } as HealthComponent)
    
    // HRÁČ NEMÁ HP BAR NAD HLAVOU - má ho v UI dole
  }
  
  setupKeyboardControls() {
    document.addEventListener('keydown', (e) => {
      // 🔒 Zabráníme výchozímu chování u herních kláves
      const gameKeys = ['KeyW', 'KeyS', 'KeyA', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space']
      if (gameKeys.includes(e.code)) {
        e.preventDefault() // Zabrání scrollování stránky atd.
      }
      
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.moveForward = true
          break
        case 'KeyS':
        case 'ArrowDown':
          this.moveBackward = true
          break
        case 'KeyA':
        case 'ArrowLeft':
          this.moveLeft = true
          break
        case 'KeyD':
        case 'ArrowRight':
          this.moveRight = true
          break
        case 'Space':
          // Secret jump feature - not shown in controls
          if (this.canJump) {
            const rb = this.getComponent(this.playerEntity, 'rigidbody') as RigidBodyComponent
            if (rb) {
              const vel = rb.body.linvel()
              rb.body.setLinvel({ x: vel.x, y: 5, z: vel.z }, true)
              this.canJump = false
            }
          }
          break
      }
    })
    
    document.addEventListener('keyup', (e) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.moveForward = false
          break
        case 'KeyS':
        case 'ArrowDown':
          this.moveBackward = false
          break
        case 'KeyA':
        case 'ArrowLeft':
          this.moveLeft = false
          break
        case 'KeyD':
        case 'ArrowRight':
          this.moveRight = false
          break
      }
    })
    
    // Mouse controls - setup here to ensure they work properly
    // Left click to shoot or lock controls (POUZE NA PC!)
    this.canvas.addEventListener('click', (e) => {
      // ✨ Probuď AudioContext při prvním kliknutí (autoplay policy fix)
      if (Howler.ctx && Howler.ctx.state === 'suspended') {
        Howler.ctx.resume().then(() => {
          console.log('🎧 AudioContext resumed on user interaction')
        })
      }
      
      // ⚠️ Na mobilu NEvyužíváme click events - máme touch controls!
      if (this.isMobile) return
      
      console.log('CLICK EVENT:', e.button, 'isLocked:', this.controls.isLocked)
      if (this.controls.isLocked && e.button === 0) {
        console.log('👆 Left click - shooting')
        this.shootingSystem.shoot()
      } else if (!this.controls.isLocked) {
        console.log('👆 Left click - locking controls')
        this.controls.lock()
      }
    })
    
    // Right click for interaction (quiz) - use mousedown instead of contextmenu (POUZE NA PC!)
    this.canvas.addEventListener('mousedown', (e) => {
      if (this.isMobile) return // Na mobilu nepoužíváme pravé tlačítko
      
      console.log('MOUSEDOWN EVENT:', e.button, 'isLocked:', this.controls.isLocked)
      if (e.button === 2) { // Right button
        e.preventDefault()
        console.log('👆 RIGHT BUTTON DETECTED - checking interaction')
        if (this.controls.isLocked) {
          this.checkInteraction()
        } else {
          console.log('❌ Controls not locked, cannot interact')
        }
      }
    })
    
    // Prevent context menu
    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault()
      e.stopPropagation()
      return false
    }, true) // Use capture phase
    
    // Also prevent on document level
    document.addEventListener('contextmenu', (e) => {
      if (e.target === this.canvas) {
        e.preventDefault()
        e.stopPropagation()
        return false
      }
    }, true)
  }
  
  setupMobileControls() {
    // Detect mobile device
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      || window.innerWidth < 768
    
    if (!this.isMobile) return
    
    console.log('📱 Mobile device detected - setting up mobile controls')
    
    // ⚠️ DŮLEŽITÉ: Na mobilu NEPOTŘEBUJEME pointer lock!
    // Joysticky fungují bez něj a lock způsobuje problémy
    // Jednoduše nastavíme že jsme "ready" bez locku
    
    // Listen for mobile control events from MobileControls.vue
    this.mobileControlListener = ((e: CustomEvent) => {
      const { type, data } = e.detail
      
      switch (type) {
        case 'ready':
          console.log('📱 Mobile controls ready - NO pointer lock needed!')
          // Na mobilu NEPOUŽÍVÁME pointer lock - joysticky fungují přímo
          break
          
        case 'joystick':
          if (data.type === 'move') {
            // Convert joystick to movement
            this.mobileInput.moveX = data.x
            this.mobileInput.moveY = data.y
            console.log(`📱 Game received move joystick: X=${data.x.toFixed(2)}, Y=${data.y.toFixed(2)}`)
          } else if (data.type === 'look') {
            // Apply look rotation
            this.mobileInput.lookX = data.x
            this.mobileInput.lookY = data.y
            console.log(`📱 Game received look joystick: X=${data.x.toFixed(2)}, Y=${data.y.toFixed(2)}`)
          }
          break
          
        case 'shoot':
          if (data.start) {
            this.mobileInput.shoot = true
          } else {
            this.mobileInput.shoot = false
          }
          break
          
        case 'toggleBuildMode':
          // Toggle build mode through TowerSystem (creates/destroys ghost tower)
          this.towerSystem.toggleBuildMode()
          break
          
        case 'selectTowerType':
          // Change selected tower type through TowerSystem
          if (data && data.type) {
            this.towerSystem.selectTowerType(data.type)
          }
          break
          
        case 'placeTower':
          // Trigger tower placement from center of screen
          this.towerSystem.placeTowerAtScreenCenter()
          break
          
        case 'openQuiz':
          // Open quiz modal (call callback from GameView)
          if (this.onShowQuiz) {
            this.onShowQuiz()
          }
          break
          
        case 'openMenu':
          console.log('📱 Mobile event: openMenu')
          if (this.onShowPause) {
            this.onShowPause()
          } else {
            console.warn('⚠️ onShowPause callback not defined!')
          }
          break
          
        case 'requestPointerLock':
          // Na mobilu pointer lock NECHCEME - joysticky fungují bez něj
          console.log('📱 Mobile: ignoring pointer lock request')
          break
      }
    }) as EventListener
    window.addEventListener('mobileControl', this.mobileControlListener)
  }
  
  checkInteraction() {
    // Raycast from camera center
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera)
    const intersects = this.raycaster.intersectObjects(this.scene.children, true)
    
    console.log('🔍 Checking interaction, intersects:', intersects.length)
    
    if (intersects.length === 0) {
      console.log('👻 No intersects at all')
      return
    }
    
    for (const intersect of intersects) {
      console.log('🎯 Intersect:', intersect.object.type, intersect.object.userData)
      
      // Check if we hit the library
      if (intersect.object.userData.isLibrary) {
        console.log('📚 Hit library! Distance:', intersect.distance)
        // Check distance (must be within 15 units)
        if (intersect.distance < 15) {
          console.log('✅ Distance OK, showing quiz...')
          console.log('onShowQuiz callback:', this.onShowQuiz)
          if (this.onShowQuiz) {
            console.log('🎯 Calling onShowQuiz callback')
            this.onShowQuiz()
          } else {
            console.warn('⚠️ onShowQuiz callback not defined!')
          }
          return
        } else {
          console.log('❌ Too far from library! Distance:', intersect.distance)
        }
      }
    }
    console.log('👻 No library hit detected')
  }
  
  shoot() {
    // Shooting is now handled by ShootingSystem
    console.log('Bang!')
  }
  
  spawnEnemy(spawnX?: number, spawnZ?: number): number {
    // Spawn enemy at specified position or random edge
    const angle = Math.random() * Math.PI * 2
    const distance = 40 + Math.random() * 20
    const x = spawnX !== undefined ? spawnX : Math.cos(angle) * distance
    const z = spawnZ !== undefined ? spawnZ : Math.sin(angle) * distance
    
    // Enemy visual
    const enemyGeometry = new THREE.BoxGeometry(1, 2, 1)
    const enemyMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xff0000,
      roughness: 0.6
    })
    const enemyMesh = new THREE.Mesh(enemyGeometry, enemyMaterial)
    enemyMesh.position.set(x, 1, z)
    enemyMesh.castShadow = true
    this.scene.add(enemyMesh)
    
    // Enemy physics
    const enemyBodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(x, 1, z)
      .lockRotations()
      .enabledRotations(false, false, false)
    
    const enemyBody = this.world.createRigidBody(enemyBodyDesc)
    const enemyColliderDesc = RAPIER.ColliderDesc.cuboid(0.5, 1, 0.5)
    const enemyCollider = this.world.createCollider(enemyColliderDesc, enemyBody)
    
    // Create enemy entity
    const enemyEntity = this.createEntity()
    this.addComponent(enemyEntity, {
      type: 'transform',
      position: new THREE.Vector3(x, 1, z),
      rotation: new THREE.Euler(),
      scale: new THREE.Vector3(1, 1, 1)
    } as TransformComponent)
    
    this.addComponent(enemyEntity, {
      type: 'mesh',
      mesh: enemyMesh
    } as MeshComponent)
    
    this.addComponent(enemyEntity, {
      type: 'rigidbody',
      body: enemyBody,
      collider: enemyCollider
    } as RigidBodyComponent)
    
    this.addComponent(enemyEntity, {
      type: 'health',
      current: 100,
      max: 100
    } as HealthComponent)
    
    // Add combat component - enemy can attack
    this.addComponent(enemyEntity, {
      type: 'combat',
      damage: 10, // 10 HP damage per hit
      attackCooldown: 1.0, // Attack every 1 second
      lastAttackTime: 0
    } as CombatComponent)
    
    // Create HP bar for enemy - malý sprite, těsně nad nepřítelem
    this.hpBarSystem.createHPBar(
      enemyEntity, 
      100, 
      100, 
      { width: 64, height: 12, fontSize: 8, showText: true },
      2.2
    )
    
    this.enemies.push(enemyEntity)
    console.log(`👾 Enemy spawned at (${x.toFixed(1)}, ${z.toFixed(1)}) with HP bar`)
    
    return enemyEntity
  }
  
  start() {
    this.running = true
    this.lastTime = performance.now()
    this.animate()
  }
  
  stop() {
    this.running = false
    
    // Stop audio
    audioService.stopMusic()

    if (this.mobileControlListener) {
      window.removeEventListener('mobileControl', this.mobileControlListener)
      this.mobileControlListener = null
      console.log('📱 Mobile control listener removed')
    }
    
    // Unlock controls
    if (this.controls.isLocked) {
      this.controls.unlock()
    }
    
    // Dispose HP bar system
    if (this.hpBarSystem) {
      this.hpBarSystem.dispose()
    }
    
    // Clear scene
    while(this.scene.children.length > 0) {
      const obj = this.scene.children[0]
      if (obj) {
        this.scene.remove(obj)
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose()
          if (obj.material instanceof THREE.Material) {
            obj.material.dispose()
          }
        }
      }
    }
    
    // Dispose renderer
    this.renderer.dispose()
    
    // Free physics world (Rapier cleanup)
    this.world.free()
  }
  
  private animate = () => {
    if (!this.running) return
    
    const currentTime = performance.now()
    const dt = Math.min(0.05, (currentTime - this.lastTime) / 1000)
    this.lastTime = currentTime
    
    this.update(dt)
    this.renderer.render(this.scene, this.camera)
    // HP bary jsou nyní THREE.Sprite - renderují se automaticky se scénou!
    
    requestAnimationFrame(this.animate)
  }
  
  private update(dt: number) {
    // Check game over
    if (this.gameOver) return
    
    // 🔄 REFRESH počtu nepřátel každý frame (spolehlivější než jen při spawnu/zabití)
    const gameStore = useGameStore()
    gameStore.enemiesAlive = this.enemies.length
    
    // Update physics
    this.world.step()
    
    // Update player movement
    this.updatePlayerMovement(dt)
    
    // Update combat system
    this.combatSystem.update(dt)
    
    // Update shooting system
    this.shootingSystem.update(dt)
    
    // Update tower system
    this.towerSystem.update(dt)
    
    // Update wave system
    this.waveSystem.update(dt)
    
    // Update library HP bar
    const libraryHP = this.getComponent(this.libraryEntity, 'health') as HealthComponent
    const libraryMesh = this.getComponent(this.libraryEntity, 'mesh') as MeshComponent
    if (libraryHP && libraryMesh) {
      // Pozice knihovny (HP bar bude nad ní díky offsetY v systému)
      this.hpBarSystem.updateHPBar(
        this.libraryEntity,
        Math.floor(libraryHP.current),
        libraryHP.max,
        libraryMesh.mesh.position
      )
    }
    
    // Wave system handles enemy spawning now
    // (removed old spawn timer)
    
    // Update enemy AI
    this.updateEnemies(dt)
    
    // Update systems
    for (const system of this.systems) {
      system.update(dt)
    }
    
    // Sync camera with player physics body
    const playerRB = this.getComponent(this.playerEntity, 'rigidbody') as RigidBodyComponent
    if (playerRB) {
      const pos = playerRB.body.translation()
      this.camera.position.set(pos.x, pos.y + 1.6, pos.z) // 1.6m eye height
      
      // Check if player can jump (on ground)
      const vel = playerRB.body.linvel()
      if (Math.abs(vel.y) < 0.1) {
        this.canJump = true
      }
    }
  }
  
  private updateEnemies(dt: number) {
    for (const enemyId of this.enemies) {
      const enemyRB = this.getComponent(enemyId, 'rigidbody') as RigidBodyComponent
      const enemyMesh = this.getComponent(enemyId, 'mesh') as MeshComponent
      const enemyHP = this.getComponent(enemyId, 'health') as HealthComponent
      
      if (!enemyRB || !enemyMesh) continue
      
      // Sync mesh with physics
      const pos = enemyRB.body.translation()
      enemyMesh.mesh.position.set(pos.x, pos.y, pos.z)
      
      // Update HP bar - offsetY se aplikuje automaticky v systému
      if (enemyHP) {
        this.hpBarSystem.updateHPBar(
          enemyId, 
          Math.floor(enemyHP.current), 
          enemyHP.max, 
          enemyMesh.mesh.position
        )
      }
      
      // AI target update - pouze každých 0.5s (ne každý frame!)
      if (!enemyMesh.mesh.userData.lastTargetUpdate) {
        enemyMesh.mesh.userData.lastTargetUpdate = 0
      }
      
      enemyMesh.mesh.userData.lastTargetUpdate += dt
      
      if (enemyMesh.mesh.userData.lastTargetUpdate >= 0.5) {
        enemyMesh.mesh.userData.lastTargetUpdate = 0
        
        // Advanced AI: Find nearest target (player, library, or towers)
        let nearestTarget: THREE.Vector3 | null = null
        let nearestDistance = Infinity
        
        // Check player
        const playerRB = this.getComponent(this.playerEntity, 'rigidbody') as RigidBodyComponent
        if (playerRB) {
          const playerPos = playerRB.body.translation()
          const dist = Math.sqrt(
            Math.pow(playerPos.x - pos.x, 2) + 
            Math.pow(playerPos.z - pos.z, 2)
          )
          if (dist < nearestDistance) {
            nearestDistance = dist
            nearestTarget = new THREE.Vector3(playerPos.x, playerPos.y, playerPos.z)
          }
        }
        
        // Check library
        const libraryTransform = this.getComponent(this.libraryEntity, 'transform') as TransformComponent
        if (libraryTransform) {
          const libPos = libraryTransform.position
          const dist = Math.sqrt(
            Math.pow(libPos.x - pos.x, 2) + 
            Math.pow(libPos.z - pos.z, 2)
          )
          if (dist < nearestDistance) {
            nearestDistance = dist
            nearestTarget = libPos.clone()
          }
        }
        
        // Check towers
        for (const tower of this.towerSystem.towers) {
          const towerTransform = this.getComponent(tower.entityId, 'transform') as TransformComponent
          if (towerTransform) {
            const towerPos = towerTransform.position
            const dist = Math.sqrt(
              Math.pow(towerPos.x - pos.x, 2) + 
              Math.pow(towerPos.z - pos.z, 2)
            )
            if (dist < nearestDistance) {
              nearestDistance = dist
              nearestTarget = towerPos.clone()
            }
          }
        }
        
        // Uložit target
        enemyMesh.mesh.userData.currentTarget = nearestTarget
      }
      
      // Move towards stored target
      const currentTarget = enemyMesh.mesh.userData.currentTarget
      if (currentTarget) {
        const direction = new THREE.Vector3(
          currentTarget.x - pos.x,
          0,
          currentTarget.z - pos.z
        )
        
        const distance = direction.length()
        
        // Pokud je příliš blízko (< 1.5 jednotky), nezasekávat se - zpomalit
        const speed = distance < 1.5 ? 0.5 : 2
        
        direction.normalize()
        
        enemyRB.body.setLinvel({ 
          x: direction.x * speed, 
          y: enemyRB.body.linvel().y, 
          z: direction.z * speed 
        }, true)
        
        // Rotate enemy to face target
        const angle = Math.atan2(direction.x, direction.z)
        enemyMesh.mesh.rotation.y = angle
      }
    }
  }
  
  private updatePlayerMovement(_dt: number) {
    // Na mobilu NEvyžadujeme pointer lock - funguje bez něj!
    if (!this.isMobile && !this.controls.isLocked) return
    
    const playerRB = this.getComponent(this.playerEntity, 'rigidbody') as RigidBodyComponent
    if (!playerRB) return
    
    const vel = playerRB.body.linvel()
    const direction = new THREE.Vector3()
    const forward = new THREE.Vector3()
    const right = new THREE.Vector3()
    
    this.camera.getWorldDirection(forward)
    forward.y = 0
    forward.normalize()
    
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize()
    
    // Handle both keyboard and mobile input
    if (this.isMobile) {
      // Mobile joystick input
      if (Math.abs(this.mobileInput.moveX) > 0.1 || Math.abs(this.mobileInput.moveY) > 0.1) {
        // moveY is inverted (forward is negative Y in joystick)
        direction.add(forward.multiplyScalar(-this.mobileInput.moveY))
        direction.add(right.multiplyScalar(this.mobileInput.moveX))
      }
      
      // Mobile look input - omezené vertikální míření (nahoru/dolů v rozumném rozsahu)
      if (Math.abs(this.mobileInput.lookX) > 0.05 || Math.abs(this.mobileInput.lookY) > 0.05) {
        const euler = new THREE.Euler(0, 0, 0, 'YXZ')
        euler.setFromQuaternion(this.camera.quaternion)
        
        // Horizontální rotace (Y osa) - neomezená
        euler.y -= this.mobileInput.lookX * this.mobileLookSensitivity * 0.02
        
        // Vertikální rotace (X osa) - OMEZENÁ na rozumný rozsah
        euler.x -= this.mobileInput.lookY * this.mobileLookSensitivity * 0.02
        // Omezení: -60° až +30° (větší rozsah dolů pro míření na blízké nepřátele)
        euler.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 6, euler.x))
        
        this.camera.quaternion.setFromEuler(euler)
      }
      
      // Mobile shooting
      if (this.mobileInput.shoot) {
        this.shootingSystem.shoot()
      }
    } else {
      // Keyboard input
      if (this.moveForward) direction.add(forward)
      if (this.moveBackward) direction.sub(forward)
      if (this.moveLeft) direction.sub(right)
      if (this.moveRight) direction.add(right)
    }
    
    direction.normalize()
    
    const speed = 5
    const newVelX = direction.x * speed
    const newVelZ = direction.z * speed
    
    playerRB.body.setLinvel({ x: newVelX, y: vel.y, z: newVelZ }, true)
  }
  
  private onResize() {
    const width = this.canvas.clientWidth
    const height = this.canvas.clientHeight
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height, false)
    // Sprite HP bary se škálují automaticky s kamerou, není potřeba resize
  }
  
  // ECS Methods
  createEntity(): EntityId {
    const id = this.nextEntityId++
    this.entities.set(id, new Map())
    return id
  }
  
  destroyEntity(id: EntityId) {
    this.entities.delete(id)
  }
  
  addComponent(entityId: EntityId, component: Component) {
    const entity = this.entities.get(entityId)
    if (entity) {
      entity.set(component.type, component)
    }
  }
  
  getComponent(entityId: EntityId, type: string): Component | undefined {
    const entity = this.entities.get(entityId)
    return entity?.get(type)
  }
  
  removeComponent(entityId: EntityId, type: string) {
    const entity = this.entities.get(entityId)
    entity?.delete(type)
  }
  
  /**
   * Restore game from saved state
   * Recreates enemies, towers, and library HP
   */
  restoreFromSave(saveData: SavedGameState) {
    console.log('🔄 Restoring game from save...', saveData)
    
    // 1. Restore library HP
    if (saveData.library && this.libraryEntity) {
      const libraryHealth = this.getComponent(this.libraryEntity, 'health') as HealthComponent
      if (libraryHealth) {
        libraryHealth.current = saveData.library.health
        libraryHealth.max = saveData.library.maxHealth
        console.log(`📚 Library HP restored: ${libraryHealth.current}/${libraryHealth.max}`)
        
        // Update HP bar
        const libraryMesh = this.getComponent(this.libraryEntity, 'mesh') as MeshComponent
        if (libraryMesh) {
          this.hpBarSystem.updateHPBar(
            this.libraryEntity,
            libraryHealth.current,
            libraryHealth.max,
            libraryMesh.mesh.position
          )
        }
      }
    }
    
    // 2. Restore towers
    if (saveData.towers && Array.isArray(saveData.towers)) {
      console.log(`🏰 Restoring ${saveData.towers.length} towers...`)
      for (const towerData of saveData.towers) {
        // Get tower config
        const config = TOWER_CONFIGS[towerData.type]
        if (!config) {
          console.warn(`Unknown tower type: ${towerData.type}`)
          continue
        }
        
        // Calculate world position from grid
        const GRID_SIZE = this.towerSystem.GRID_SIZE
        const worldX = towerData.gridX * GRID_SIZE
        const worldZ = towerData.gridZ * GRID_SIZE
        
        // Create tower entity (reuse existing method)
        const towerEntity = this.towerSystem.createTowerEntity(config, worldX, worldZ)
        
        // Set saved HP
        const towerHealth = this.getComponent(towerEntity.entityId, 'health') as HealthComponent
        if (towerHealth) {
          towerHealth.current = towerData.health
          towerHealth.max = towerData.maxHealth
          
          // Update HP bar
          const towerMesh = this.getComponent(towerEntity.entityId, 'mesh') as MeshComponent
          if (towerMesh) {
            this.hpBarSystem.updateHPBar(
              towerEntity.entityId,
              towerHealth.current,
              towerHealth.max,
              towerMesh.mesh.position
            )
          }
        }
        
        // Add to tower system
        this.towerSystem.towers.push({
          entityId: towerEntity.entityId,
          config,
          lastShotTime: 0,
          gridX: towerData.gridX,
          gridZ: towerData.gridZ
        })
        
        // Mark grid as occupied
        const gridKey = `${towerData.gridX},${towerData.gridZ}`
        this.towerSystem.occupiedGrids.add(gridKey)
        
        console.log(`  ✅ Tower restored at (${towerData.gridX}, ${towerData.gridZ}) with HP ${towerData.health}/${towerData.maxHealth}`)
      }
    }
    
    // 3. Restore enemies
    if (saveData.enemies && Array.isArray(saveData.enemies)) {
      console.log(`👹 Restoring ${saveData.enemies.length} enemies...`)
      for (const enemyData of saveData.enemies) {
        // Spawn enemy at saved position
        const enemyId = this.spawnEnemy(enemyData.posX, enemyData.posZ)
        
        // Set saved HP
        const enemyHealth = this.getComponent(enemyId, 'health') as HealthComponent
        if (enemyHealth) {
          enemyHealth.current = enemyData.health
          enemyHealth.max = enemyData.maxHealth
          
          // Update HP bar
          const enemyMesh = this.getComponent(enemyId, 'mesh') as MeshComponent
          if (enemyMesh) {
            // Mark enemy with wave number
            enemyMesh.mesh.userData = { waveNumber: enemyData.waveNumber }
            
            this.hpBarSystem.updateHPBar(
              enemyId,
              enemyHealth.current,
              enemyHealth.max,
              enemyMesh.mesh.position
            )
          }
        }
        
        console.log(`  ✅ Enemy restored at (${enemyData.posX.toFixed(1)}, ${enemyData.posZ.toFixed(1)}) with HP ${enemyData.health}/${enemyData.maxHealth}`)
      }
    }
    
    // 4. Restore player position
    if (saveData.player) {
      this.camera.position.set(
        saveData.player.posX,
        saveData.player.posY,
        saveData.player.posZ
      )
      
      // Update player rigidbody
      const playerRB = this.getComponent(this.playerEntity, 'rigidbody') as RigidBodyComponent
      if (playerRB) {
        playerRB.body.setTranslation({
          x: saveData.player.posX,
          y: saveData.player.posY,
          z: saveData.player.posZ
        }, true)
      }
      
      console.log(`👤 Player position restored: (${saveData.player.posX.toFixed(1)}, ${saveData.player.posY.toFixed(1)}, ${saveData.player.posZ.toFixed(1)})`)
    }
    
    console.log('✅ Game restored successfully!')
  }
}
