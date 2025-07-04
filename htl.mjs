export class HTL {
  constructor(matrix) {
    this.matrix = matrix;
  }

  computeHTL() {
    const height = this.matrix.length;
    const width = this.matrix[0].length;
    const diagonalLength = Math.floor(Math.sqrt(width ** 2 + height ** 2));
    const thetaSteps = 180;

    const accumulator = Array.from({ length: 2 * diagonalLength + 1 }, () =>
      Array(thetaSteps).fill(0),
    );

    for (let i = 0; i < this.matrix.length; i++) {
      for (let j = 0; j < this.matrix[i].length; j++) {
        const luminosity = this.matrix[i][j];

        // is an edge pixel
        if (luminosity) {
          for (let theta = 0; theta < thetaSteps; theta++) {
            const thetaRad = theta * (Math.PI / 180);
            const rho = Math.round(
              j * Math.cos(thetaRad) + i * Math.sin(thetaRad) + diagonalLength,
            );

            accumulator[rho][theta]++;
          }
        }
      }
    }

    return accumulator;
  }
}
