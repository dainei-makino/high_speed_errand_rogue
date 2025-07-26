import { evaporateArea } from './effects.js';
import Characters from './characters.js';
import { DEBUG_CHUNK_COUNTER } from './debug_flags.js';

const VIRTUAL_WIDTH = 480;
const VIRTUAL_HEIGHT = 270;
const GAUGE_CENTER_X = VIRTUAL_WIDTH * 2 - 120;
const GAUGE_CENTER_Y = VIRTUAL_HEIGHT * 2 - 120;
const GAUGE_RADIUS = 90;
const GAUGE_THICKNESS = 32;
const RIVAL_GAUGE_CENTER_X = 120;

export default class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene', active: false });
    this.introLetters = null;
  }

  create() {
    // Center viewport for virtual resolution
    const { width, height } = this.scale.gameSize;
    this.cameras.main.setViewport((width - VIRTUAL_WIDTH * 2) / 2, (height - VIRTUAL_HEIGHT * 2) / 2, VIRTUAL_WIDTH * 2, VIRTUAL_HEIGHT * 2);

    // Display cleared chunk count; primarily used for debugging
    this.chunkText = this.add.text(12, 8, 'CHUNK 0', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#ffffff'
    }).setVisible(false);

    this.debugChunkText = this.add
      .text(VIRTUAL_WIDTH * 2 - 12, 8, 'CHUNK 0', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#ffffff'
      })
      .setOrigin(1, 0)
      .setVisible(false);

    const gameScene = this.scene.get('GameScene');
    gameScene.events.on('updateChunks', this.updateChunks, this);
    gameScene.events.on('updateOxygen', this.updateOxygen, this);
    gameScene.events.on('updateRivalOxygen', this.updateRivalOxygen, this);
    gameScene.events.on('updateKeys', this.updateKeys, this);
    this.debugVisibleHandler = visible => {
      if (this.debugChunkText) this.debugChunkText.setVisible(visible);
    };
    gameScene.events.on('showDebugChunks', this.debugVisibleHandler, this);

    this.shutdownHandler = () => {
      this.scale.off('resize', this.resizeHandler);
      gameScene.events.off('updateChunks', this.updateChunks, this);
      gameScene.events.off('updateOxygen', this.updateOxygen, this);
      gameScene.events.off('updateRivalOxygen', this.updateRivalOxygen, this);
      gameScene.events.off('updateKeys', this.updateKeys, this);
      gameScene.events.off('showDebugChunks', this.debugVisibleHandler, this);
    };
    this.events.once('shutdown', this.shutdownHandler);

    this.oxygenGfx = this.add.graphics();
    this.o2Label = this.add.text(0, 0, 'O2 Timer', {
      fontFamily: 'monospace',
      fontSize: '19px',
      color: '#ffffff'
    }).setOrigin(0.5);

    this.rivalOxygenGfx = this.add.graphics();
    this.rivalLabel = this.add.text(0, 0, 'Rival O2', {
      fontFamily: 'monospace',
      fontSize: '19px',
      color: '#ffffff'
    }).setOrigin(0.5);

    const innerRadius = GAUGE_RADIUS - GAUGE_THICKNESS / 2 - 4;
    this.keyContainer = this.add.container(GAUGE_CENTER_X, GAUGE_CENTER_Y);
    this.keyCircle = this.add.circle(0, 0, innerRadius, 0xffffff).setOrigin(0.5);
    this.keyImage = Characters.createKey(this);
    this.keyImage.setOrigin(0.5);
    this.keyImage.setDisplaySize(innerRadius * 1.5, innerRadius * 1.5);
    this.keyContainer.add([this.keyCircle, this.keyImage]);
    this.keyContainer.setDepth(5);
    this.keyContainer.setVisible(false);

    this.updateOxygen(1);
    this.updateRivalOxygen(0);


    this.fpsText = this.add.text(420, 8, '', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#ffffff'
    }).setVisible(false);

    this.resizeHandler = (gw, gh) => {
      if (!this.cameras || !this.cameras.main) return;
      this.cameras.main.setViewport((gw - VIRTUAL_WIDTH * 2) / 2, (gh - VIRTUAL_HEIGHT * 2) / 2, VIRTUAL_WIDTH * 2, VIRTUAL_HEIGHT * 2);
    };
    this.scale.on('resize', this.resizeHandler);

    // Show the intro text once UI elements are ready
    this.showIntroText();

    if (DEBUG_CHUNK_COUNTER) {
      this.debugChunkText.setVisible(true);
    }
  }

  update() {
    if (this.fpsText) {
      this.fpsText.setText('FPS ' + Math.floor(this.game.loop.actualFps));
    }
  }

  updateChunks(count) {
    if (this.chunkText && this.chunkText.setText) {
      this.chunkText.setText('CHUNK ' + count.toString());
    }
    if (this.debugChunkText && this.debugChunkText.setText) {
      this.debugChunkText.setText('CHUNK ' + count.toString());
    }
  }

  updateKeys(count) {
    if (!this.keyContainer) return;
    this.keyContainer.setVisible(count > 0);
  }

  updateOxygen(ratio) {
    const centerX = GAUGE_CENTER_X;
    const centerY = GAUGE_CENTER_Y;
    const radius = GAUGE_RADIUS;
    const thickness = GAUGE_THICKNESS;
    const start = Phaser.Math.DegToRad(-90);

    this.o2Label.setPosition(centerX, centerY - radius - 36);

    if (this.keyContainer) {
      this.keyContainer.setPosition(centerX, centerY);
    }

    this.oxygenGfx.clear();
    this.oxygenGfx.lineStyle(thickness, 0x333333, 0.5);
    this.oxygenGfx.beginPath();
    this.oxygenGfx.arc(centerX, centerY, radius, 0, Phaser.Math.PI2, false);
    this.oxygenGfx.strokePath();

    const mainRatio = Math.min(ratio, 1);
    const extraRatio = Math.max(Math.min(ratio - 1, 1), 0);

    let ringColor = 0xffff00;
    if (mainRatio <= 0.25) {
      ringColor = 0xff0000;
    } else if (mainRatio <= 0.5) {
      ringColor = 0xffa500;
    }

    this.oxygenGfx.lineStyle(thickness, ringColor, 1);
    this.oxygenGfx.beginPath();
    this.oxygenGfx.arc(centerX, centerY, radius, start, start + Phaser.Math.DegToRad(360 * mainRatio), false);
    this.oxygenGfx.strokePath();

    if (extraRatio > 0) {
      const innerRadius = radius - thickness - 4;
      this.oxygenGfx.lineStyle(thickness, 0x00ff00, 1);
      this.oxygenGfx.beginPath();
      this.oxygenGfx.arc(centerX, centerY, innerRadius, start, start + Phaser.Math.DegToRad(360 * extraRatio), false);
      this.oxygenGfx.strokePath();
    }
  }

  updateRivalOxygen(ratio) {
    if (!this.rivalOxygenGfx) return;
    const centerX = RIVAL_GAUGE_CENTER_X;
    const centerY = GAUGE_CENTER_Y;
    const radius = GAUGE_RADIUS;
    const thickness = GAUGE_THICKNESS;
    const start = Phaser.Math.DegToRad(-90);

    this.rivalLabel.setPosition(centerX, centerY - radius - 36);

    this.rivalOxygenGfx.clear();
    this.rivalOxygenGfx.lineStyle(thickness, 0x333333, 0.5);
    this.rivalOxygenGfx.beginPath();
    this.rivalOxygenGfx.arc(centerX, centerY, radius, 0, Phaser.Math.PI2, false);
    this.rivalOxygenGfx.strokePath();

    const mainRatio = Math.min(ratio, 1);
    const extraRatio = Math.max(Math.min(ratio - 1, 1), 0);

    const ringColor = 0x00aaff;

    this.rivalOxygenGfx.lineStyle(thickness, ringColor, 1);
    this.rivalOxygenGfx.beginPath();
    this.rivalOxygenGfx.arc(
      centerX,
      centerY,
      radius,
      start,
      start + Phaser.Math.DegToRad(360 * mainRatio),
      false
    );
    this.rivalOxygenGfx.strokePath();

    if (extraRatio > 0) {
      const innerRadius = radius - thickness - 4;
      this.rivalOxygenGfx.lineStyle(thickness, 0x00ffff, 1);
      this.rivalOxygenGfx.beginPath();
      this.rivalOxygenGfx.arc(
        centerX,
        centerY,
        innerRadius,
        start,
        start + Phaser.Math.DegToRad(360 * extraRatio),
        false
      );
      this.rivalOxygenGfx.strokePath();
    }
    this.rivalOxygenGfx.setVisible(ratio > 0);
    this.rivalLabel.setVisible(ratio > 0);
  }

  showMidpoint(num) {
    const flash = this.add.rectangle(
      VIRTUAL_WIDTH,
      VIRTUAL_HEIGHT,
      VIRTUAL_WIDTH * 2,
      12,
      0xffffff
    ).setOrigin(0.5);
    flash.setDepth(999);
    flash.setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({
      targets: flash,
      scaleX: 2,
      alpha: 0,
      duration: 400,
      ease: 'Cubic.easeOut',
      onComplete: () => flash.destroy()
    });

    const str = num === 1 ? 'RUN!' : num.toString();
    const style = {
      fontFamily: 'monospace',
      fontSize: '192px',
      stroke: '#000000',
      strokeThickness: 4,
      color: '#ffffff'
    };
    const base = this.add.text(VIRTUAL_WIDTH, VIRTUAL_HEIGHT, str, style).setOrigin(0.5);
    base.setDepth(1000);
    // Neon glow
    base.setShadow(0, 0, '#00ffff', 16, true, true);

    // Create tinted duplicates for a simple glitch effect
    const glitchStyle1 = { ...style, color: '#ff00ff' };
    const glitchStyle2 = { ...style, color: '#00ffff' };
    const g1 = this.add.text(VIRTUAL_WIDTH, VIRTUAL_HEIGHT, str, glitchStyle1).setOrigin(0.5);
    const g2 = this.add.text(VIRTUAL_WIDTH, VIRTUAL_HEIGHT, str, glitchStyle2).setOrigin(0.5);
    g1.setDepth(999);
    g2.setDepth(999);
    g1.setBlendMode(Phaser.BlendModes.ADD);
    g2.setBlendMode(Phaser.BlendModes.ADD);

    const jitter = () => {
      g1.x = VIRTUAL_WIDTH + Phaser.Math.Between(-4, 4);
      g1.y = VIRTUAL_HEIGHT + Phaser.Math.Between(-4, 4);
      g2.x = VIRTUAL_WIDTH + Phaser.Math.Between(-4, 4);
      g2.y = VIRTUAL_HEIGHT + Phaser.Math.Between(-4, 4);
    };
    // Shorten the jitter cycle to match the faster midpoint display
    this.time.addEvent({ delay: 50, repeat: 7, callback: jitter });

    this.tweens.add({
      targets: [base, g1, g2],
      scale: 2,
      alpha: 0,
      // Shortened from 2000ms so the whole effect plays 60% faster
      duration: 800,
      ease: 'Quad.easeOut',
      onComplete: () => {
        base.destroy();
        g1.destroy();
        g2.destroy();
      }
    });
  }

  createFloatingText(str, centerX, y) {
    const style = { fontFamily: 'monospace', fontSize: '36px', color: '#ffffff' };
    const measure = this.add.text(0, 0, str, style).setOrigin(0.5);
    const total = measure.width;
    measure.destroy();
    let x = centerX - total / 2;
    const letters = [];
    for (const ch of str) {
      const letter = this.add.text(0, 0, ch, style).setOrigin(0.5);
      letter.x = x + letter.width / 2;
      letter.y = y;
      letter.setDepth(1000);
      this.tweens.add({
        targets: letter,
        y: letter.y + Phaser.Math.Between(-6, 6),
        duration: 800 + Phaser.Math.Between(0, 400),
        repeat: -1,
        yoyo: true,
        ease: 'Sine.easeInOut',
        delay: Phaser.Math.Between(0, 300)
      });
      letters.push(letter);
      x += letter.width;
    }
    return letters;
  }

  showIntroText() {
    if (this.introLetters) return;
    const topY = 80;
    const bottomY = VIRTUAL_HEIGHT * 2 - 80;
    this.introLetters = [
      ...this.createFloatingText('BREATHLESS', VIRTUAL_WIDTH, topY),
      ...this.createFloatingText('MOVE TO WASD KEY', VIRTUAL_WIDTH, bottomY)
    ];
  }

  destroyIntroText() {
    if (!this.introLetters) return;
    for (const l of this.introLetters) {
      evaporateArea(this, l.x - l.width / 2, l.y - l.height / 2, l.width, l.height, 0xffffff);
      l.destroy();
    }
    this.introLetters = null;
  }
}
