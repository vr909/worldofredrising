/**
 * Software-renderer detection (T14). A browser without GPU acceleration still gives us WebGL, but through a CPU rasteriser
 * (SwiftShader, llvmpipe, "Microsoft Basic Render Driver"...), which is 50-100x slower. The unmasked renderer string says so.
 */
const SOFTWARE =
  /swiftshader|llvmpipe|softpipe|lavapipe|software|basic render|mesa offscreen|microsoft basic/i;

export function isSoftwareRenderer(renderer: string): boolean {
  return SOFTWARE.test(renderer);
}

/** Renderer string from an existing context. */
export function rendererName(gl: WebGLRenderingContext | WebGL2RenderingContext): string {
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  const name = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  return typeof name === 'string' ? name : '';
}

let cached: { renderer: string; software: boolean } | null = null;

/**
 * Probe with a throwaway 1x1 canvas (released immediately). Callable before the heightfield is built, so the lead's
 * defaultQuality() can start software renderers on the 'low' heightfield tier.
 */
export function detectRenderer(): { renderer: string; software: boolean } {
  if (cached) return cached;
  let renderer = '';
  try {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    if (gl) {
      renderer = rendererName(gl);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
  } catch {
    /* no WebGL at all: leave empty */
  }
  cached = { renderer, software: isSoftwareRenderer(renderer) };
  return cached;
}
