import { setShaderAttributes, loadTexture } from "./helpers.js";

class Granite {
	constructor(gl) {
		const vertices = [];
		let H = 1;
		let u1 = 0; let v1 = H;
		let u2 = H; let v2 = H;
		let u3 = H; let v3 = 0;
		let u4 = 0; let v4 = 0;
		let nx = 0;
		let ny = 1;
		let nz = 0;
		vertices.push(
			5.2, 0, 5, u2, v2, nx, ny, nz,
			5.2, 0, -5, u3, v3, nx, ny, nz,
			-4.8, 0, -5, u4, v4, nx, ny, nz
		)
		this.vertexBufferObject = gl.createBuffer();
		this.vertexBufferObject.vertexCount = vertices.length / 8;
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBufferObject);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

		this.graniteTexture = loadTexture(gl, 'granite.jpg', [80, 80, 80, 255]);
	}

	draw(gl, shaderProgram) {
		gl.bindTexture(gl.TEXTURE_2D, this.graniteTexture);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBufferObject);
		setShaderAttributes(gl, shaderProgram);
		gl.drawArrays(gl.TRIANGLES, 0, this.vertexBufferObject.vertexCount);
	}
}

export { Granite };