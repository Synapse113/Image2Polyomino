import { Sobel } from "./sobel.mjs";

export class CV {
  constructor(canvasID, imagePath) {
    this.canvasID = canvasID;
    this.imagePath = imagePath;
    this.grayscaleMatrix = [];
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

      this.edgeDetection();
    };
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

  edgeDetection() {
    const sobel = new Sobel(this.grayscaleMatrix);
    const sobelMatrix = sobel.generateEdgeMatrix();

    this.c.save();
    this.c.translate(600, 0);
    for (let i = 0; i < sobelMatrix.length; i++) {
      for (let j = 0; j < sobelMatrix[i].length; j++) {
        const g = sobelMatrix[i][j];
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
