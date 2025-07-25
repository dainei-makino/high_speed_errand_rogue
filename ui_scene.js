import { evaporateArea } from './effects.js';

const VIRTUAL_WIDTH = 480;
const VIRTUAL_HEIGHT = 270;

export default class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene', active: false });
    this.introLetters = null;
  }

  create() {
    // Center viewport for virtual resolution
    const { width, height } = this.scale.gameSize;
    this.cameras.main.setViewport((width - VIRTUAL_WIDTH * 2) / 2, (height - VIRTUAL_HEIGHT * 2) / 2, VIRTUAL_WIDTH * 2, VIRTUAL_HEIGHT * 2);

    // Display cleared chunk count; left aligned with no zero padding
    this.chunkText = this.add.text(12, 8, 'CHUNK 0', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#ffffff'
    }).setVisible(false);

    const gameScene = this.scene.get('GameScene');
    gameScene.events.on('updateChunks', this.updateChunks, this);
    gameScene.events.on('updateOxygen', this.updateOxygen, this);

    this.oxygenGfx = this.add.graphics();
    this.o2Label = this.add.text(0, 0, 'O2 Timer', {
      fontFamily: 'monospace',
      fontSize: '19px',
      color: '#ffffff'
    }).setOrigin(0.5);

    this.updateOxygen(1);


    this.fpsText = this.add.text(420, 8, '', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#ffffff'
    }).setVisible(false);

    this.scale.on('resize', (gw, gh) => {
      this.cameras.main.setViewport((gw - VIRTUAL_WIDTH * 2) / 2, (gh - VIRTUAL_HEIGHT * 2) / 2, VIRTUAL_WIDTH * 2, VIRTUAL_HEIGHT * 2);
    });
  }

  update() {
    if (this.fpsText) {
      this.fpsText.setText('FPS ' + Math.floor(this.game.loop.actualFps));
    }
  }

  updateChunks(count) {
    // Right pad with spaces to keep label position stable
    this.chunkText.setText('CHUNK ' + count.toString());
  }

  updateOxygen(ratio) {
    const centerX = VIRTUAL_WIDTH * 2 - 120;
    const centerY = VIRTUAL_HEIGHT * 2 - 120;
    const radius = 90;
    const thickness = 32;
    const start = Phaser.Math.DegToRad(-90);

    this.o2Label.setPosition(centerX, centerY - radius - 36);

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

  createFloatingText(str, centerX, y) {
    const style = {
      fontFamily: 'monospace',
      fontSize: '24px',
      color: '#ffff00',
      stroke: '#000000',
      strokeThickness: 3
    };
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
      letter.setShadow(2, 2, '#000000', 2, true, true);
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
    const offset = 60;
    const topY = offset;
    const bottomY = VIRTUAL_HEIGHT * 2 - offset;
    this.introLetters = [
      ...this.createFloatingText('BREATHLESS', VIRTUAL_WIDTH, topY),
      ...this.createFloatingText('MOVE TO WASD KEY', VIRTUAL_WIDTH, bottomY)
    ];
  }

  destroyIntroText() {
    if (!this.introLetters) return;
    for (const l of this.introLetters) {
      evaporateArea(
        this,
        l.x - l.width / 2,
        l.y - l.height / 2,
        l.width,
        l.height,
        0xffffff
      );
      l.destroy();
    }
    this.introLetters = null;
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

    const text = this.add.text(VIRTUAL_WIDTH, VIRTUAL_HEIGHT, num.toString(), {
      fontFamily: 'monospace',
      fontSize: '192px',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5);
    text.setDepth(1000);
    text.setShadow(4, 4, '#000000', 4, true, true);
    text.setTintFill(0xffffff, 0xffffff, 0xffffff, 0xcd853f);
    this.tweens.add({
      targets: text,
      scale: 2,
      alpha: 0,
      duration: 1000,
      ease: 'Quad.easeOut',
      onComplete: () => text.destroy()
    });
  }
}
