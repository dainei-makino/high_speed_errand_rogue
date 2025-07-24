export default class CameraManager {
  constructor(scene, mazeManager) {
    this.scene = scene;
    this.mazeManager = mazeManager;
    this.cam = scene.cameras.main;
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
    const size = this.mazeManager.tileSize;
    const chunkSize = info.chunk.size || info.chunk.width || 0;
    const cx = info.offsetX + (chunkSize * size) / 2;
    const cy = info.offsetY + (chunkSize * size) / 2;
    this.expectedCenter.x = cx;
    this.expectedCenter.y = cy;
    this.cam.pan(cx, cy, duration, 'Sine.easeInOut');
  }

  /**
   * 軽い揺れ演出 (ズームバンプ)
   */
  zoomBump() {
    this.cam.zoomTo(0.95, 150)
      .once('camerazoomcomplete', () => this.cam.zoomTo(1, 200));
  }

  /**
   * 白フラッシュ
   */
  flashWhite() {
    this.cam.flash(120, 255, 255, 255);
  }

  /**
   * 任意位置へ直接パンするユーティリティ
   */
  panTo(x, y, duration = 500) {
    this.expectedCenter.x = x;
    this.expectedCenter.y = y;
    this.cam.pan(x, y, duration, 'Sine.easeInOut');
  }

  /**
   * Ensure the camera is perfectly centered after pans
   * to avoid cumulative drift.
   */
  maintainCenter() {
    if (!this.cam.panEffect || !this.cam.panEffect.isRunning) {
      const { x, y } = this.expectedCenter;
      const dx = x - this.cam.midPoint.x;
      const dy = y - this.cam.midPoint.y;
      if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
        this.cam.centerOn(x, y);
      }
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
