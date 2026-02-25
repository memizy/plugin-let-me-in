import { Howl, Howler } from 'howler'
import * as THREE from 'three'

type SoundName = 
  // UI Sounds
  | 'button_click'
  | 'quiz_correct'
  | 'quiz_wrong'
  | 'tower_place'
  | 'wave_start'
  | 'wave_complete'
  | 'game_over'
  
  // Weapon and Player SFX
  | 'player_shoot'
  | 'player_reload'
  | 'player_hit'
  
  // Enemy SFX  
  | 'enemy_hit'
  | 'enemy_death'
  | 'enemy_spawn'
  
  // Tower SFX
  | 'tower_shoot'
  | 'tower_hit'
  | 'tower_destroyed'
  
  // Building SFX
  | 'library_hit'
  | 'explosion'

type MusicName = 'menu' | 'ambient' | 'battle'

/**
 * AudioService - Hybrid audio system
 * - Howler.js for 2D sounds (UI, music)
 * - THREE.PositionalAudio for 3D sounds (gameplay)
 */
class AudioService {
  private sounds: Map<SoundName, Howl> = new Map()
  private music: Map<MusicName, Howl> = new Map()
  private currentMusic: MusicName | null = null
  private musicVolume: number = 0.5
  private sfxVolume: number = 0.5
  private isLoaded: boolean = false // Track if audio has been loaded
  
  // Three.js audio
  private audioListener: THREE.AudioListener | null = null
  private positionalSounds: Map<string, THREE.PositionalAudio> = new Map()
  
  // Game music alternation
  private gameModeMusicActive = false
  private currentGameTrack: 'ambient' | 'battle' = 'ambient'
  
  constructor() {
    // Load saved volumes from localStorage
    const savedMusicVolume = localStorage.getItem('musicVolume')
    const savedSfxVolume = localStorage.getItem('sfxVolume')
    
    if (savedMusicVolume !== null) {
      this.musicVolume = parseFloat(savedMusicVolume)
    }
    if (savedSfxVolume !== null) {
      this.sfxVolume = parseFloat(savedSfxVolume)
    }
    
    // Set global volume
    Howler.volume(1.0)
  }
  
  /**
   * Initialize Three.js audio listener (attach to camera)
   */
  initThreeAudio(camera: THREE.Camera): void {
    this.audioListener = new THREE.AudioListener()
    camera.add(this.audioListener)
    console.log('🎧 Three.js AudioListener initialized')
  }
  
  /**
   * Load all audio files
   */
  async loadAll(): Promise<void> {
    // Prevent loading multiple times
    if (this.isLoaded) {
      console.log('🎵 Audio already loaded, skipping...')
      return
    }
    
    console.log('🎵 Loading audio assets...')
    
    const soundPromises = [
      // UI sounds
    //   this.loadSound('button_click', '/audio/sfx/click.ogg'),
    //   this.loadSound('quiz_correct', '/audio/sfx/correct.ogg'),
    //   this.loadSound('quiz_wrong', '/audio/sfx/wrong.ogg'),
    //   this.loadSound('tower_place', '/audio/sfx/build.ogg'),
    //   this.loadSound('wave_start', '/audio/sfx/wave_start.ogg'),
    //   this.loadSound('wave_complete', '/audio/sfx/wave_complete.ogg'),
    //   this.loadSound('game_over', '/audio/sfx/game_over.ogg'),
      
    //   // Weapon and player sounds
      this.loadSound('player_shoot', '/audio/sfx/shoot.mp3', 0.3),
    //   this.loadSound('player_reload', '/audio/sfx/reload.ogg'),
    this.loadSound('player_hit', '/audio/sfx/player_hit.mp3'),
      
    //   // Enemy sounds
    //   this.loadSound('enemy_hit', '/audio/sfx/hit.ogg'),
    //   this.loadSound('enemy_death', '/audio/sfx/death.ogg'),
    //   this.loadSound('enemy_spawn', '/audio/sfx/spawn.ogg'),
      
    //   // Tower sounds
    //   this.loadSound('tower_shoot', '/audio/sfx/tower_shoot.ogg'),
       this.loadSound('tower_hit', '/audio/sfx/tower_hit.mp3'),
    //   this.loadSound('tower_destroyed', '/audio/sfx/tower_destroyed.mp3'),
      
    //   // Building sounds
       this.loadSound('library_hit', '/audio/sfx/library_hit.mp3'),
    //   this.loadSound('explosion', '/audio/sfx/explosion.ogg')
    ]
    
    const musicPromises = [
      this.loadMusic('menu', '/audio/music/menu.mp3'),
      this.loadMusic('ambient', '/audio/music/ambient.mp3'),
      this.loadMusic('battle', '/audio/music/battle.mp3')
    ]
    
    try {
      // Počkáme, až se VŠECHNY zvuky a hudba stáhnou a dekódují
      await Promise.all([...soundPromises, ...musicPromises])
      console.log('✅ All audio assets loaded successfully')
      
      // Ensure no music is playing after load
      this.music.forEach(musicHowl => {
        if (musicHowl.playing()) {
          musicHowl.stop()
        }
      })
      
      this.isLoaded = true // Mark as loaded
    } catch (error) {
      console.error('❌ Error loading one or more audio assets:', error)
      this.isLoaded = true // Mark as loaded even on error to prevent repeated attempts
    }
  }

  private loadSound(name: SoundName, src: string, volumeMultiplier: number = 1): Promise<void> {
    const fullPath = import.meta.env.BASE_URL + src;

    return new Promise((resolve, reject) => {
      const howl = new Howl({
        src: [fullPath],
        volume: this.sfxVolume*volumeMultiplier,
        preload: true,
        onload: () => {
          this.sounds.set(name, howl)
          console.log(`✅ Loaded sound: ${name}`)
          resolve()
        },
        onloaderror: (_id, err) => {
          console.warn(`⚠️ Failed to load sound: ${name} from ${src}`, err)
          reject(err)
        }
      })
    })
  }
  
  private loadMusic(name: MusicName, src: string): Promise<void> {
    const fullPath = import.meta.env.BASE_URL + src;
    return new Promise((resolve, reject) => {
      const howl = new Howl({
        src: [fullPath],
        volume: this.musicVolume,
        loop: false, // Nastavíme na false - budeme loop řídit manuálně pro střídání
        preload: true,
        onload: () => {
          this.music.set(name, howl)
          console.log(`✅ Loaded music: ${name}`)
          resolve()
        },
        onloaderror: (_id, err) => {
          console.warn(`⚠️ Failed to load music: ${name} from ${src}`, err)
          reject(err)
        },
        onend: () => {
          // Když hudba skončí, automaticky přepneme na další track v game módu
          if (this.gameModeMusicActive && (name === 'ambient' || name === 'battle')) {
            this.playNextGameTrack()
          }
        }
      })
    })
  }
  
  /**
   * Play 2D sound (UI, global effects)
   */
  play(name: SoundName): void {
    const sound = this.sounds.get(name)
    if (sound) {
      // Probuď AudioContext při prvním přehrání (autoplay policy fix)
      if (Howler.ctx && Howler.ctx.state === 'suspended') {
        Howler.ctx.resume().then(() => {
          console.log('🎧 AudioContext resumed')
          sound.play()
        })
      } else {
        sound.play()
      }
    } else {
      console.warn(`⚠️ Sound not found: ${name}`)
    }
  }
  
  /**
   * Play 3D positional sound at a specific location
   * NOTE: Currently using 2D fallback - proper 3D audio would need THREE.AudioLoader
   */
  playAt(name: SoundName, _position: THREE.Vector3, _scene: THREE.Scene): void {
    if (!this.audioListener) {
      console.warn('AudioListener not initialized!')
      return
    }
    
    const sound = this.sounds.get(name)
    if (!sound) return
    
    // TODO: Implement proper 3D audio with THREE.AudioLoader and AudioBuffer
    // For now, using 2D Howler as fallback
    sound.play()
  }
  
playMusic(name: MusicName, fadeDuration: number = 2000): void {
  // 1. Zkontroluj, jestli už tento track není aktivní a nehraje
  if (this.currentMusic === name) {
    const currentHowl = this.music.get(name);
    // Pokud hraje A ZÁROVEŇ není ztlumený, nedělej nic
    if (currentHowl && currentHowl.playing() && currentHowl.volume() > 0) {
      console.log(`🎵 ${name} is already playing or fading in`);
      return;
    }
  }

  console.log(`🎵 Požadavek na přehrání: ${name}`);
  // 2. OKAMŽITĚ nastav nový cílový stav
  this.currentMusic = name; 

  // 3. Projdi VŠECHNY hudební stopy
  this.music.forEach((howl, musicName) => {
    
    if (musicName === name) {
      // TOTO JE NOVÁ HUDBA (kterou chceme hrát)
      
      // Pokud ještě nehraje, spusť ji
      if (!howl.playing()) {
        howl.play();
      }
      // Dej jí příkaz k zesílení (fade-in)
      howl.fade(howl.volume(), this.musicVolume, fadeDuration); 
      console.log(`▶️ Fading IN: ${musicName}`);

    } else {
      // TOTO JE STARÁ HUDBA (kterou chceme zastavit)
      
      if (howl.playing()) {
        // Dej jí příkaz k ztlumení (fade-out)
        howl.fade(howl.volume(), 0, fadeDuration); 
        console.log(`🔇 Fading OUT: ${musicName}`);
        
        // Jakmile se ztlumí, úplně ji zastav
        howl.once('fade', () => {
          if (howl.volume() === 0) {
            howl.stop();
            howl.volume(this.musicVolume); // Reset hlasitosti pro příští spuštění
          }
        });
      }
    }
  });
}
  
  /**
   * Stop all music
   */
// AudioService.ts

stopMusic(fadeDuration: number = 1000): void {
  console.log('🔇 Požadavek na zastavení veškeré hudby');
  // 1. OKAMŽITĚ zruš cílový stav
  this.currentMusic = null; 

  // 2. Projdi VŠECHNY hudební stopy
  this.music.forEach((howl, musicName) => {
    if (howl.playing()) {
      // Dej příkaz k ztlumení (fade-out)
      console.log(`🔇 Fading OUT: ${musicName}`);
      howl.fade(howl.volume(), 0, fadeDuration);
      
      // Jakmile se ztlumí, úplně ji zastav
      howl.once('fade', () => {
        if (howl.volume() === 0) {
          howl.stop();
          howl.volume(this.musicVolume); // Reset
        }
      });
    }
  });
}
  
  /**
   * Start game mode music (alternating ambient and battle)
   */
  startGameMusic(): void {
    console.log('🎮 Starting game mode music (alternating)')
    
    this.gameModeMusicActive = true
    this.currentGameTrack = 'ambient'
    this.playMusic('ambient', 2000)
  }
  
  /**
   * Stop game mode and return to normal music
   */
  stopGameMusic(): void {
    console.log('🎮 Stopping game mode music')
    this.gameModeMusicActive = false
    this.stopMusic(2000)
  }
  
  /**
   * Play next track in game mode rotation
   */
  private playNextGameTrack(): void {
    if (!this.gameModeMusicActive) return
    
    // Přepnout na druhý track
    this.currentGameTrack = this.currentGameTrack === 'ambient' ? 'battle' : 'ambient'
    console.log(`🔄 Switching to: ${this.currentGameTrack}`)
    
    // Přehrát další track bez fade (už skončil předchozí)
    const nextMusic = this.music.get(this.currentGameTrack)
    if (nextMusic) {
      nextMusic.volume(this.musicVolume)
      nextMusic.play()
      this.currentMusic = this.currentGameTrack
    }
  }
  
  /**
   * Set volumes
   */
  setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, volume))
    this.music.forEach(m => m.volume(this.musicVolume))
    // Save to localStorage
    localStorage.setItem('musicVolume', this.musicVolume.toString())
  }
  
  setSFXVolume(volume: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, volume))
    this.sounds.forEach(s => s.volume(this.sfxVolume))
    // Save to localStorage
    localStorage.setItem('sfxVolume', this.sfxVolume.toString())
  }
  
  /**
   * Mute/unmute
   */
  mute(): void {
    Howler.mute(true)
  }
  
  unmute(): void {
    Howler.mute(false)
  }
  
  /**
   * Cleanup
   */
  dispose(): void {
    this.sounds.forEach(s => s.unload())
    this.music.forEach(m => m.unload())
    this.sounds.clear()
    this.music.clear()
    this.positionalSounds.clear()
  }
}

// Singleton instance
export const audioService = new AudioService()
