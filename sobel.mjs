export class Sobel {
  constructor(matrix) {
    this.matrix = matrix;
    this.GxMatrix = [
      [-1, 0, 1],
      [-2, 0, 2],
      [-1, 0, 1],
    ];
    this.GyMatrix = [
      [-1, -2, -1],
      [0, 0, 0],
      [1, 2, 1],
    ];
  }

  generateEdgeMatrix() {
    const newMatrix = [];

    // iterate over every pixel in the grayscale matrix, skipping a 1 pixel border
    // around the edge (Sobel kernels require 3x3 grids)
    for (let i = 1; i < this.matrix.length - 2; i++) {
      newMatrix[i - 1] = [];

      for (let j = 1; j < this.matrix[i].length - 2; j++) {
        const gradient = this.computeSobelGradientMagnitude(j, i);

        newMatrix[i - 1][j - 1] = gradient;
      }
    }

    return newMatrix;
  }

  computeSobelGradientMagnitude(x, y) {
    const topLeft = this.matrix[y - 1][x - 1];
    const topMiddle = this.matrix[y][x - 1];
    const topRight = this.matrix[y + 1][x - 1];
    const rightMiddle = this.matrix[y + 1][x];
    const bottomRight = this.matrix[y + 1][x + 1];
    const bottomMiddle = this.matrix[y][x + 1];
    const bottomLeft = this.matrix[y - 1][x + 1];
    const leftMiddle = this.matrix[y - 1][x];
    const middle = this.matrix[y][x];

    const grid = [
      [topLeft, topMiddle, topRight],
      [leftMiddle, middle, rightMiddle],
      [bottomLeft, bottomMiddle, bottomRight],
    ];

    let gx = 0;
    let gy = 0;

    for (let i = 0; i < grid.length; i++) {
      for (let j = 0; j < grid[i].length; j++) {
        const xKernelWeight = this.GxMatrix[i][j];
        const yKernelWeight = this.GyMatrix[i][j];
        const pixelValue = grid[i][j];

        gx += xKernelWeight * pixelValue;
        gy += yKernelWeight * pixelValue;
      }
    }

    const magnitude = Math.sqrt(gx ** 2 + gy ** 2);
    const clampedMagnitude = Math.max(0, Math.min(magnitude, 255)); // clamp to 0-255

    return clampedMagnitude;
  }
}
