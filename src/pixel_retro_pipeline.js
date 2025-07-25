export default class PixelRetroPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  constructor(game) {
    const fragShader = `
precision mediump float;

uniform sampler2D uMainSampler;
uniform float pixelSize;
uniform vec2 resolution;
uniform vec3 palette[16];

varying vec2 outTexCoord;

vec3 nearestColor(vec3 c) {
  float minDist = 1000.0;
  vec3 nearest = palette[0];
  for (int i = 0; i < 16; i++) {
    vec3 p = palette[i];
    float dist = distance(c, p);
    if (dist < minDist) {
      minDist = dist;
      nearest = p;
    }
  }
  return nearest;
}

void main() {
  vec2 dxy = pixelSize / resolution;
  vec2 coord = dxy * floor(outTexCoord / dxy);
  vec4 col = texture2D(uMainSampler, coord);
  vec3 q = nearestColor(col.rgb);
  gl_FragColor = vec4(q, col.a);
}
`;
    super({
      game,
      renderTarget: true,
      fragShader
    });
    this.pixelSize = 4.0;
    this.palette = [
      [0.0, 0.0, 0.0],
      [0.1137, 0.1686, 0.3255],
      [0.4941, 0.1451, 0.3255],
      [0.0, 0.5294, 0.3176],
      [0.6706, 0.3216, 0.2118],
      [0.3725, 0.3412, 0.3098],
      [0.7608, 0.7647, 0.7804],
      [1.0, 0.9451, 0.9098],
      [1.0, 0.0, 0.3019],
      [1.0, 0.6392, 0.0],
      [1.0, 0.9255, 0.1529],
      [0.0, 0.8941, 0.2118],
      [0.1608, 0.6784, 1.0],
      [0.5137, 0.4627, 0.6118],
      [1.0, 0.4667, 0.6588],
      [1.0, 0.8, 0.6667]
    ];
  }

  onPreRender() {
    this.set1f('pixelSize', this.pixelSize);
    this.set2f('resolution', this.renderer.width, this.renderer.height);
    const arr = [];
    for (let i = 0; i < this.palette.length; i++) {
      const c = this.palette[i];
      arr.push(c[0], c[1], c[2]);
    }
    this.set3fv('palette', arr);
  }
}
