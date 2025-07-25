export default class CameraManager {
  constructor(scene, mazeManager) {
    this.scene = scene;
    this.mazeManager = mazeManager;
    this.cam = scene.cameras.main;
    // Start a bit closer to make the maze appear larger
    this.defaultZoom = 2;
    this.cam.setZoom(this.defaultZoom);
    this.bounds = { minX: -1000, minY: -1000, maxX: 9000, maxY: 9000 };
    this.cam.setBounds(
      this.bounds.minX,
      this.bounds.minY,
      this.bounds.maxX - this.bounds.minX,
      this.bounds.maxY - this.bounds.minY
    );
    // Keep track of where the camera should be centered
    this.expectedCenter = {
      x: this.cam.midPoint.x,
      y: this.cam.midPoint.y
    };
  }

  /**
   * 新しいチャンクの中心へパン移動する
   * @param {object} info - MazeManager が返すチャンク情報
   * @param {number} duration - tween 時間 (ms)
   */
  panToChunk(info, duration = 400) {
    const { x: cx, y: cy } = this.mazeManager.getChunkCenter(info);
    this.expectedCenter.x = cx;
    this.expectedCenter.y = cy;
    // Force a new pan so it isn't ignored if a previous pan is active
    this.cam.pan(cx, cy, duration, 'Sine.easeInOut', true);
    this.cam.once('camerapancomplete', () => {
      // Snap exactly to the target to avoid drift
      this.cam.centerOn(cx, cy);
      this.expectedCenter.x = cx;
      this.expectedCenter.y = cy;
    });
  }

  /**
   * 軽い揺れ演出 (ズームバンプ)
   */
  zoomBump() {
    this.cam.zoomTo(this.defaultZoom * 0.95, 150)
      .once('camerazoomcomplete', () => this.cam.zoomTo(this.defaultZoom, 200));
  }

  /**
   * 一瞬だけズームインする演出
   */
  zoomHeroFocus() {
    this.cam.zoomTo(this.defaultZoom * 1.2, 100)
      .once('camerazoomcomplete', () => this.cam.zoomTo(this.defaultZoom, 150));
  }

  /**
   * 白フラッシュ
   */
  flashWhite() {
    this.cam.flash(120, 255, 255, 255);
  }

  /**
   * 小さく横揺れする演出
   */
  shakeSmall() {
    const intensity = { x: 2 / this.cam.width, y: 0 };
    this.cam.shake(80, intensity);
  }

  /**
   * 任意位置へ直接パンするユーティリティ
   */
  panTo(x, y, duration = 500) {
    this.expectedCenter.x = x;
    this.expectedCenter.y = y;
    // Force the pan so it always completes even if another is running
    this.cam.pan(x, y, duration, 'Sine.easeInOut', true);
    this.cam.once('camerapancomplete', () => {
      this.cam.centerOn(x, y);
      this.expectedCenter.x = x;
      this.expectedCenter.y = y;
    });
  }

  /**
   * Ensure the camera is perfectly centered after pans
   * to avoid cumulative drift.
   */
  maintainCenter() {
    if (
      (!this.cam.panEffect || !this.cam.panEffect.isRunning) &&
      (!this.cam.shakeEffect || !this.cam.shakeEffect.isRunning)
    ) {
      const { x, y } = this.expectedCenter;
      const dx = x - this.cam.midPoint.x;
      const dy = y - this.cam.midPoint.y;
      if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
        this.cam.centerOn(x, y);
      }
    }
    if (this.debugCam) {
      this.debugCam.setPosition(this.cam.midPoint.x, this.cam.midPoint.y);
    }
  }

  /**
   * Update camera bounds so all chunks remain within view.
   * Call whenever a new chunk is added.
   * @param {object} info - chunk info from MazeManager
   */
  expandBounds(info) {
    const size = this.mazeManager.tileSize * info.chunk.size;
    const minX = Math.min(this.bounds.minX, info.offsetX);
    const minY = Math.min(this.bounds.minY, info.offsetY);
    const maxX = Math.max(this.bounds.maxX, info.offsetX + size);
    const maxY = Math.max(this.bounds.maxY, info.offsetY + size);
    this.bounds = { minX, minY, maxX, maxY };
    this.cam.setBounds(minX, minY, maxX - minX, maxY - minY);
  }

  setZoom(zoom, duration = 0) {
    this.defaultZoom = zoom;
    if (duration > 0) {
      this.scene.tweens.add({
        targets: this.cam,
        zoom,
        duration,
        ease: 'Sine.easeInOut'
      });
    } else {
      this.cam.setZoom(zoom);
    }
  }
}
