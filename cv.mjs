import { Gaussian } from "./gaussian.mjs";
import { HTL } from "./htl.mjs";
import { AdaptiveThresholding } from "./thresholding.mjs";
import { deg2Rad } from "./utils.mjs";

export class CV {
  constructor(canvasID, imagePath) {
    this.canvasID = canvasID;
    this.imagePath = imagePath;
    this.grayscaleMatrix = [];
    this.gaussianMatrix = [];
    this.thresholdedMatrix = [];
    this.c = null;
    this.gridIntersections = [];
  }

  rgbToGrayscale(r, g, b) {
    return 0.299 * r + 0.587 * g + 0.114 * b;
  }

  setupImageCanvas() {
    const canvas = document.getElementById(this.canvasID);
    this.c = canvas.getContext("2d");

    canvas.width = innerWidth;
    canvas.height = innerHeight;
  }

  canvasImageToGrascale() {
    const image = new Image();
    image.src = "./test.jpg";

    image.onload = () => {
      const width = Math.round(image.width / 10);
      const height = Math.round(image.height / 10);

      this.c.drawImage(image, 0, 0, width, height);

      const imageData = this.c.getImageData(0, 0, width, height).data;

      for (let i = 0; i < height; i++) {
        this.grayscaleMatrix[i] = [];

        for (let j = 0; j < width; j++) {
          const rgbIndex = (i * width + j) * 4;
          const grayscaleValue = this.rgbToGrayscale(
            imageData[rgbIndex],
            imageData[rgbIndex + 1],
            imageData[rgbIndex + 2],
          );

          this.grayscaleMatrix[i][j] = grayscaleValue;
        }
      }

      this.displayGrayscale();
      this.gaussianBlur();
      this.thresholding(900);
      this.displayLines(900, this.thresholdedMatrix);
      this.getCorners(this.gridIntersections);
    };
  }

  getCorners(intersections) {
    // we need a grid of nodes, but right now the exist in a 1d array in no particular order
    const matrix = [];

    // sort by y axis
    const sorted = intersections.sort((a, b) => a.y - b.y);

    let lastSliced = 0;

    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i];
      const next = sorted[i + 1];

      // probably need to dynamically generate this threshold
      if (next.y - current.y > 10) {
        matrix.push(intersections.slice(lastSliced, i + 1));

        lastSliced = i + 1;
      } else if (i + 1 == sorted.length - 1) {
        matrix.push(intersections.slice(lastSliced, i + 2));
      }
    }

    const smallestRow = Math.min(...matrix.map((row) => row.length));

    // we need a grid where all rows are the same length (trimmed from the center)
    const trimmedMatrix = matrix.map((row) => {
      const center = Math.floor(row.length / 2);
      const smallestRowHalf = Math.floor(smallestRow / 2);
      const right = row.slice(center, center + smallestRowHalf);
      const left = row.slice(center - smallestRowHalf, center);
      const newRow = left.concat(right);

      return newRow;
    });

    const topLeftCorner = trimmedMatrix[0][0];
    const bottomLeftCorner = trimmedMatrix[trimmedMatrix.length - 1][0];
    const topRightCorner = trimmedMatrix[0][trimmedMatrix[0].length - 1];
    const bottomRightCorner =
      trimmedMatrix[trimmedMatrix.length - 1][trimmedMatrix[0].length - 1];

    const sourceCorners = [
      topLeftCorner,
      topRightCorner,
      bottomLeftCorner,
      bottomRightCorner,
    ];
    const gridSize = 32;
    const targetCorners = [
      { x: 0, y: 0 },
      { x: gridSize * trimmedMatrix[0].length, y: 0 },
      { x: 0, y: gridSize * trimmedMatrix.length },
      {
        x: gridSize * trimmedMatrix[0].length,
        y: gridSize * trimmedMatrix.length,
      },
    ];

    const b = targetCorners.map((point) => [point.x, point.y]).flat();

    const coefficientMatrix = [];
    const identityMatrix = [];

    // solve for the homography matrix (8x8)
    for (let i = 0; i < sourceCorners.length; i++) {
      const sourceCorner = sourceCorners[i];
      const targetCorner = targetCorners[i];

      const x = [
        sourceCorner.x,
        sourceCorner.y,
        1,
        0,
        0,
        0,
        -sourceCorner.x * targetCorner.x,
        -sourceCorner.y * targetCorner.x,
      ];
      const y = [
        0,
        0,
        0,
        sourceCorner.x,
        sourceCorner.y,
        1,
        -sourceCorner.x * targetCorner.y,
        -sourceCorner.y * targetCorner.y,
      ];

      coefficientMatrix.push(x, y);
    }

    // generate identity matrix
    for (let i = 0; i < coefficientMatrix.length; i++) {
      identityMatrix[i] = new Array(coefficientMatrix.length).fill(0);

      identityMatrix[i][i] = 1;
    }

    // solve linear system: A * h = b
    // step one is to find the inverse of A
    const augmentedMatrix = [];

    for (let i = 0; i < coefficientMatrix.length; i++) {
      let pivot = coefficientMatrix[i][i];

      if (pivot === 0) {
        // scan down for the next row with a non-0 pivot, and swap
        for (let j = i + 1; j < coefficientMatrix.length; j++) {
          const newPivot = coefficientMatrix[j][i];

          if (newPivot !== 0) {
            const tmpRow = coefficientMatrix[i];

            coefficientMatrix[i] = coefficientMatrix[j];
            coefficientMatrix[j] = tmpRow;

            const tmpIdentityRow = identityMatrix[i];

            identityMatrix[i] = identityMatrix[j];
            identityMatrix[j] = tmpIdentityRow;

            break;
          }
        }
      }

      pivot = coefficientMatrix[i][i];

      if (pivot === 0) {
        throw "Matrix is singular! Cannot calculate inverse";
        return;
      }

      for (let j = 0; j < coefficientMatrix[i].length; j++) {
        coefficientMatrix[i][j] /= pivot;
        identityMatrix[i][j] /= pivot;
      }

      // zero out the other elements in rows that are not the current pivot row
      for (let row = 0; row < coefficientMatrix.length; row++) {
        if (row === i) continue;

        const factor = coefficientMatrix[row][i]; // pivot

        for (let col = 0; col < coefficientMatrix[row].length; col++) {
          coefficientMatrix[row][col] -= factor * coefficientMatrix[i][col];
          identityMatrix[row][col] -= factor * identityMatrix[i][col];
        }
      }
    }

    const multipliedMatrix = new Array(identityMatrix.length).fill(0);

    for (let i = 0; i < identityMatrix.length; i++) {
      for (let j = 0; j < identityMatrix[i].length; j++) {
        multipliedMatrix[i] += identityMatrix[i][j] * b[j];
      }
    }

    multipliedMatrix.push(1);

    // reconstruct homography matrix (3x3)
    const homographyMatrix = [];

    for (let i = 0; i < 3; i++) {
      const index = i * 3;

      homographyMatrix.push(multipliedMatrix.slice(index, index + 3));
    }

    console.log(homographyMatrix);
  }

  vect2Line(line) {
    const scalar = this.diagonalLength;

    // HTL offsets rho by the diagonal length of the image so that indexes are always positive
    // this means we have to shift it back to get the correct origin position
    const realRho = line.r - this.diagonalLength;

    const vect = {
      x: realRho * Math.cos(deg2Rad(line.theta)),
      y: realRho * Math.sin(deg2Rad(line.theta)),
    };
    const vectDir = {
      x: -Math.sin(deg2Rad(line.theta)),
      y: Math.cos(deg2Rad(line.theta)),
    };

    const l = {
      x1: vect.x + vectDir.x * scalar,
      y1: vect.y + vectDir.y * scalar,
      x2: vect.x - vectDir.x * scalar,
      y2: vect.y - vectDir.y * scalar,
    };

    return l;
  }

  drawLine(vect) {
    const l = this.vect2Line(vect);

    this.c.beginPath();
    this.c.moveTo(l.x1, l.y1); // start
    this.c.lineTo(l.x2, l.y2); // end
    this.c.strokeStyle = "red";
    this.c.stroke();
  }

  displayLines(x, matrix) {
    const htl = new HTL(matrix);
    this.htlAccumulator = htl.computeHTL();
    this.diagonalLength = Math.sqrt(matrix[0].length ** 2 + matrix.length ** 2);
    const clusterReduced = [];

    for (let i = 0; i < this.htlAccumulator.length; i++) {
      for (let j = 0; j < this.htlAccumulator[i].length; j++) {
        const votes = this.htlAccumulator[i][j];

        if (votes > 180) {
          const tooClose = clusterReduced.some(
            (other) =>
              Math.abs(other.r - i) < 10 && Math.abs(other.theta - j) < 5,
          );

          if (!tooClose) {
            clusterReduced.push({ r: i, theta: j });
          }
        }
      }
    }

    this.c.save();
    this.c.translate(x, 0);
    for (let line1 of clusterReduced) {
      // this.drawLine(line1);
      for (let line2 of clusterReduced) {
        let intersected = false;

        if (line1 !== line2) {
          const a1 = Math.cos(deg2Rad(line1.theta));
          const b1 = Math.sin(deg2Rad(line1.theta));
          const a2 = Math.cos(deg2Rad(line2.theta));
          const b2 = Math.sin(deg2Rad(line2.theta));
          const c1 = line1.r - this.diagonalLength;
          const c2 = line2.r - this.diagonalLength;

          const denominator = a1 * b2 - a2 * b1;

          if (Math.abs(denominator) >= 1e-10) {
            intersected = true;
          }

          if (intersected) {
            const x = (c1 * b2 - c2 * b1) / denominator;
            const y = (a1 * c2 - a2 * c1) / denominator;

            // only interested in intersections within image bounds
            if (x >= 0 && x < matrix[0].length && y >= 0 && y < matrix.length) {
              // filter out intersection clusters caused by close lines that are almost parallel
              const tooClose = this.gridIntersections.some((i) => {
                const dist = Math.sqrt((i.x - x) ** 2 + (i.y - y) ** 2);

                return dist < 10;
              });

              if (!tooClose) {
                this.c.fillStyle = "red";
                this.c.fillRect(x - 3, y - 3, 6, 6);

                this.gridIntersections.push({ x, y });
              }
            }
          }
        }
      }
    }
    this.c.restore();
  }

  displayGrayscale() {
    this.c.save();
    this.c.translate(300, 0);
    for (let i = 0; i < this.grayscaleMatrix.length; i++) {
      for (let j = 0; j < this.grayscaleMatrix[i].length; j++) {
        const g = this.grayscaleMatrix[i][j];

        this.c.fillStyle = `rgb(${g},${g},${g})`;
        this.c.fillRect(j, i, 1, 1);
      }
    }
    this.c.restore();
  }

  thresholding(x) {
    const thresholding = new AdaptiveThresholding(this.gaussianMatrix);
    this.thresholdedMatrix = thresholding.generate();

    this.c.save();
    this.c.translate(x, 0);
    for (let i = 0; i < this.thresholdedMatrix.length; i++) {
      for (let j = 0; j < this.thresholdedMatrix[i].length; j++) {
        const g = this.thresholdedMatrix[i][j];

        this.c.fillStyle = `rgb(${g},${g},${g})`;
        this.c.fillRect(j, i, 1, 1);
      }
    }
    this.c.restore();
  }

  gaussianBlur() {
    const gaussian = new Gaussian(this.grayscaleMatrix);
    this.gaussianMatrix = gaussian.blur();

    this.c.save();
    this.c.translate(600, 0);
    for (let i = 0; i < this.gaussianMatrix.length; i++) {
      for (let j = 0; j < this.gaussianMatrix[i].length; j++) {
        const g = this.gaussianMatrix[i][j];

        this.c.fillStyle = `rgb(${g},${g},${g})`;
        this.c.fillRect(j, i, 1, 1);
      }
    }
    this.c.restore();
  }

  processImage() {
    this.setupImageCanvas();
    this.canvasImageToGrascale();
  }
}
