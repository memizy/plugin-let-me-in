# Audio Assets

## Struktura
```
/public/audio/
├── sfx/          # Zvukové efekty
└── music/        # Hudba na pozadí
```

## 🎵 Kde získat zvuky

### Kenney.nl (Doporučeno - Zdarma, CC0)
Kenney nabízí obrovskou kolekci herních assetů zdarma:

**Interface Sounds**: https://kenney.nl/assets/interface-sounds
- button_click.ogg
- quiz_correct.ogg
- quiz_wrong.ogg
- wave_start.ogg
- wave_complete.ogg

**Digital Audio**: https://kenney.nl/assets/digital-audio
- player_shoot.ogg
- tower_shoot.ogg
- enemy_hit.ogg

**Impact Sounds**: https://kenney.nl/assets/impact-sounds
- enemy_death.ogg
- tower_destroyed.ogg
- library_hit.ogg
- explosion.ogg

### Hudba
Pro hudbu můžeš použít:

**1. Hudba z AI generátorů:**
- Suno.ai (https://suno.ai)
- Udio (https://udio.com)

**2. Royalty-free hudba:**
- incompetech.com (Kevin MacLeod)
- freemusicarchive.org

**3. Vlastní kompozice v FL Studio/Ableton**

## 📋 Potřebné zvuky

### SFX (/audio/sfx/)
- [ ] click.ogg - Kliknutí na tlačítko
- [ ] correct.ogg - Správná odpověď v kvízu
- [ ] wrong.ogg - Špatná odpověď
- [ ] build.ogg - Postavení věže
- [ ] wave_start.ogg - Start vlny
- [ ] wave_complete.ogg - Dokončení vlny
- [ ] game_over.ogg - Game over
- [ ] shoot.ogg - Střelba hráče
- [ ] reload.ogg - Přebíjení
- [ ] hit.ogg - Zásah nepřítele
- [ ] death.ogg - Smrt nepřítele
- [ ] spawn.ogg - Spawn nepřítele
- [ ] tower_shoot.ogg - Střelba věže
- [ ] tower_hit.ogg - Zásah věže
- [ ] tower_destroyed.ogg - Zničení věže
- [ ] library_hit.ogg - Zásah knihovny
- [ ] explosion.ogg - Exploze

### Music (/audio/music/)
- [ ] menu.ogg - Hlavní menu (epické, klidné téma)
- [ ] ambient.ogg - Stavění/příprava (ambientní, strategické)
- [ ] battle.ogg - Boj (napínavé, intenzivní)

## 🎧 Použití v kódu

```typescript
import { audioService } from '@/services/AudioService'

// Při startu hry
await audioService.loadAll()
audioService.initThreeAudio(camera)

// Přehrání zvuku
audioService.play('player_shoot')

// Přehrání hudby s crossfadem
audioService.playMusic('battle', 2000)

// 3D poziční zvuk (v budoucnu)
audioService.playAt('enemy_death', enemyPosition, scene)
```

## 💡 Tipy

1. **Formát**: Používej OGG Vorbis (nejlepší komprese + kompatibilita)
2. **Velikost**: SFX do 100KB, hudba do 2MB
3. **Normalizace**: Nastavuj hlasitost v Audacity aby všechny zvuky měly podobnou úroveň
4. **Looping**: Hudba musí bezešvě loopovat (fade in/out na koncích)
