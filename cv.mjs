import { Gaussian } from "./gaussian.mjs";
import { HTL } from "./htl.mjs";
import { Sobel } from "./sobel.mjs";

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

  displayLines(x) {
    const htl = new HTL(this.sobelMatrix);
    this.htlAccumulator = htl.computeHTL();
    const diagonalLength = Math.sqrt(
      this.sobelMatrix[0].length ** 2 + this.sobelMatrix.length ** 2,
    );

    // for (let line of this.htlAccumulator) {
    //   const tooClose = deduped.some(
    //     (other) =>
    //       Math.abs(other.r - line.r) < 50 && Math.abs(other.t - line.t) < 20,
    //   );

    //   if (!tooClose) deduped.push(line);
    // }
    //

    // for (let i = 0; i < this.htlAccumulator.length; i++) {
    //   for (let j = 0; j < this.htlAccumulator[i].length; j++) {
    //     const tooClose = deduped.some((other) => Math.abs()
    //     // theta = this.htlAccumulator[i][j]
    //     // accumulator[p][theta]++;
    //   }
    // }

    // const deduped = this.htlAccumulator;
    const lines = [];
    const deduped = [];

    for (let i = 0; i < this.htlAccumulator.length; i++) {
      for (let j = 0; j < this.htlAccumulator[i].length; j++) {
        // const tooClose = deduped.some(
        //   (other) => Math.abs(other.r - i) < 5 && Math.abs(other.t - j) < 2,
        // );

        // if (!tooClose) deduped.push({ r: i, theta: j });
        //
        deduped.push({ r: i, theta: j });
      }
    }

    this.c.save();
    this.c.translate(x, 0);
    for (let line of deduped) {
      const voteCount = this.htlAccumulator[line.r][line.theta];

      if (voteCount > 190) {
        const theta = line.theta * (Math.PI / 180);
        const r = line.r - diagonalLength; // magnitude
        const x = Math.cos(theta);
        const y = Math.sin(theta);
        const x0 = x * r;
        const y0 = y * r;
        const scale = diagonalLength;
        const x1 = Math.round(x0 + scale * -y);
        const y1 = Math.round(y0 + scale * x);
        const x2 = Math.round(x0 - scale * -y);
        const y2 = Math.round(y0 - scale * x);
        this.c.beginPath();
        this.c.moveTo(x1, y1);
        this.c.lineTo(x2, y2);
        this.c.strokeStyle = "red";
        this.c.stroke();
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
