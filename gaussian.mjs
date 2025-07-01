export class Gaussian {
  constructor(matrix) {
    this.matrix = matrix;

    // kernel weights sum to 16
    this.kernel = [
      [1, 2, 1],
      [2, 4, 2],
      [1, 2, 1],
    ];

    this.kernelWeightSum = this.kernel.flat().reduce((acc, val) => acc + val);
  }

  blur() {
    const newMatrix = [];

    // iterate over every pixel in the grayscale matrix, skipping a 1 pixel border
    // around the edge (Sobel kernels require 3x3 grids)
    for (let i = 1; i < this.matrix.length - 2; i++) {
      newMatrix[i - 1] = [];

      for (let j = 1; j < this.matrix[i].length - 2; j++) {
        const newValue = this.applyKernelAt(j, i);

        newMatrix[i - 1][j - 1] = newValue;
      }
    }

    return newMatrix;
  }

  applyKernelAt(x, y) {
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

    let newPixelValue = 0;

    for (let i = 0; i < grid.length; i++) {
      for (let j = 0; j < grid[i].length; j++) {
        // normalize the kernel weight so the brightness value remains consistent
        const kernelWeight = this.kernel[i][j] / this.kernelWeightSum;
        const pixelValue = grid[i][j];

        newPixelValue += kernelWeight * pixelValue;
      }
    }

    return newPixelValue;
  }
}
