export default class CameraManager {
  constructor(scene, mazeManager) {
    this.scene = scene;
    this.mazeManager = mazeManager;
    this.cam = scene.cameras.main;
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
    this.cam.pan(x, y, duration, 'Sine.easeInOut');
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
