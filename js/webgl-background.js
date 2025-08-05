// WebGL Background Animation
const canvas = document.getElementById('bg-canvas');
const gl = canvas.getContext('webgl');

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
}

window.addEventListener('resize', resize);
resize();

// Vertex shader (full screen quad)
const vert = `
attribute vec2 position;
void main() {
  gl_Position = vec4(position, 0, 1);
}
`;

// Fragment shader from <script>
const frag = document.getElementById('fragShader').textContent;

// Compile shader
function compile(type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw gl.getShaderInfoLog(s);
  return s;
}

const vs = compile(gl.VERTEX_SHADER, vert);
const fs = compile(gl.FRAGMENT_SHADER, frag);

// Create program
const prog = gl.createProgram();
gl.attachShader(prog, vs);
gl.attachShader(prog, fs);
gl.linkProgram(prog);
gl.useProgram(prog);

// Fullscreen quad
const pos = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, pos);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
  -1, -1, 1, -1, -1, 1,
  -1, 1, 1, -1, 1, 1
]), gl.STATIC_DRAW);

const loc = gl.getAttribLocation(prog, 'position');
gl.enableVertexAttribArray(loc);
gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

// Uniforms
const u_time = gl.getUniformLocation(prog, 'u_time');
const u_mouse = gl.getUniformLocation(prog, 'u_mouse');
const u_resolution = gl.getUniformLocation(prog, 'u_resolution');

let mouse = [0.5, 0.5];
canvas.addEventListener('mousemove', e => {
  mouse = [e.clientX / window.innerWidth, 1.0 - e.clientY / window.innerHeight];
});

// Animation loop
function render(t) {
  gl.uniform1f(u_time, t * 0.001);
  gl.uniform2f(u_mouse, mouse[0], mouse[1]);
  gl.uniform2f(u_resolution, canvas.width, canvas.height);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  requestAnimationFrame(render);
}

requestAnimationFrame(render); 