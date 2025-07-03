import { Gaussian } from "./gaussian.mjs";
import { HTL } from "./htl.mjs";
import { Sobel } from "./sobel.mjs";
import { deg2Rad, rad2Deg } from "./utils.mjs";

export class CV {
  constructor(canvasID, imagePath) {
    this.canvasID = canvasID;
    this.imagePath = imagePath;
    this.grayscaleMatrix = [];
    this.gaussianMatrix = [];
    this.sobelMatrix = [];
    this.c = null;
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
      this.edgeDetection(900);
      this.displayLines(900);

      const htl = new HTL(this.sobelMatrix);
      htl.computeHTL();
    };
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

  displayLines(x) {
    const htl = new HTL(this.sobelMatrix);
    this.htlAccumulator = htl.computeHTL();
    this.diagonalLength = Math.sqrt(
      this.sobelMatrix[0].length ** 2 + this.sobelMatrix.length ** 2,
    );
    const clusterReduced = [];

    for (let i = 0; i < this.htlAccumulator.length; i++) {
      for (let j = 0; j < this.htlAccumulator[i].length; j++) {
        const votes = this.htlAccumulator[i][j];

        if (votes > 190) {
          const tooClose = clusterReduced.some(
            (other) =>
              Math.abs(other.r - i) < 16 && Math.abs(other.theta - j) < 5,
          );

          if (!tooClose) {
            clusterReduced.push({ r: i, theta: j });
          }
        }
      }
    }

    const intersections = [];

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
            if (
              x >= 0 &&
              x < this.sobelMatrix[0].length &&
              y >= 0 &&
              y < this.sobelMatrix.length
            ) {
              // filter out intersection clusters caused by close lines that are almost parallel
              const tooClose = intersections.some((i) => {
                const dist = Math.sqrt((i.x - x) ** 2 + (i.y - y) ** 2);

                return dist < 10;
              });

              if (!tooClose) {
                this.c.fillStyle = "red";
                this.c.fillRect(x - 3, y - 3, 6, 6);

                intersections.push({ x, y });
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

  edgeDetection(x) {
    const sobel = new Sobel(this.gaussianMatrix);
    this.sobelMatrix = sobel.generateEdgeMatrix();

    this.c.save();
    this.c.translate(x, 0);
    for (let i = 0; i < this.sobelMatrix.length; i++) {
      for (let j = 0; j < this.sobelMatrix[i].length; j++) {
        const g = this.sobelMatrix[i][j];

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
