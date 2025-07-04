export class AdaptiveThresholding {
  // contrast limited adaptive histogram equalization
  constructor(matrix) {
    this.matrix = matrix;
    this.kernelSize = 15; // must be odd
    this.kernelHalf = Math.floor(this.kernelSize / 2);
    this.sigma = 2.0; // spread
    this.offset = 3; // subtracted from mean (affects the sensitivity to lines)
  }

  computeKernel() {
    const kernel = Array.from({ length: this.kernelSize }, () =>
      Array(this.kernelSize).fill(0),
    );

    let sum = 0; // used to normalize the kernel

    for (let y = 0; y < kernel.length; y++) {
      for (let x = 0; x < kernel[y].length; x++) {
        // distances from center
        const dx = x - this.kernelHalf;
        const dy = y - this.kernelHalf;

        // uses the gaussian formuala https://en.wikipedia.org/wiki/Gaussian_function
        const gaussianProduct =
          (1 / (2 * Math.PI * this.sigma ** 2)) *
          Math.exp(-((dx ** 2 + dy ** 2) / (2 * this.sigma ** 2)));

        kernel[y][x] = gaussianProduct;

        sum += gaussianProduct;
      }
    }

    // normalize
    for (let i = 0; i < kernel.length; i++) {
      for (let j = 0; j < kernel[i].length; j++) {
        kernel[i][j] /= sum;
      }
    }

    return kernel;
  }

  generate() {
    const kernel = this.computeKernel();
    const matrix = [];

    for (
      let i = this.kernelHalf;
      i < this.matrix.length - this.kernelHalf;
      i++
    ) {
      matrix[i - this.kernelHalf] = [];

      for (
        let j = this.kernelHalf;
        j < this.matrix[i].length - this.kernelHalf;
        j++
      ) {
        let weightedSum = 0;

        for (let y = 0; y < kernel.length; y++) {
          for (let x = 0; x < kernel.length; x++) {
            const dx = x - this.kernelHalf;
            const dy = y - this.kernelHalf;
            const kernelWeight =
              kernel[dy + this.kernelHalf][dx + this.kernelHalf];
            const pixel = this.matrix[i + dy][j + dx];

            weightedSum += kernelWeight * pixel;
          }
        }

        const threshold = weightedSum - this.offset;

        if (this.matrix[i][j] < threshold) {
          matrix[i - this.kernelHalf][j - this.kernelHalf] = 255;
        } else {
          matrix[i - this.kernelHalf][j - this.kernelHalf] = 0;
        }
      }
    }

    return matrix;
  }
}
