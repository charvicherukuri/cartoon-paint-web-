let originalMat;

function onOpenCvReady() {
  console.log("✅ OpenCV.js is ready!");
}

// Load uploaded image
document.getElementById("upload").addEventListener("change", function (e) {
  let file = e.target.files[0];
  let img = new Image();
  img.onload = function () {
    let canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    let ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);

    let src = cv.imread(canvas);
    originalMat = src.clone();
    src.delete();
  };
  img.src = URL.createObjectURL(file);
});

// Generate cartoon + paint
document.getElementById("generate").addEventListener("click", function () {
  if (!originalMat) {
    alert("Please upload an image first!");
    return;
  }

  let src = originalMat.clone();

  // --- Cartoon Effect (K-means quantization) ---
  let samples = src.reshape(1, src.rows * src.cols);
  samples.convertTo(samples, cv.CV_32F);
  let k = 9;
  let criteria = new cv.TermCriteria(cv.TermCriteria_EPS + cv.TermCriteria_MAX_ITER, 20, 1.0);
  let labels = new cv.Mat();
  let centers = new cv.Mat();
  cv.kmeans(samples, k, labels, criteria, 10, cv.KMEANS_RANDOM_CENTERS, centers);

  centers.convertTo(centers, cv.CV_8U);
  let newImage = new cv.Mat(src.rows * src.cols, 1, src.type());
  for (let i = 0; i < labels.rows; i++) {
    newImage.data[i * 3] = centers.data[labels.intAt(i, 0) * 3];
    newImage.data[i * 3 + 1] = centers.data[labels.intAt(i, 0) * 3 + 1];
    newImage.data[i * 3 + 2] = centers.data[labels.intAt(i, 0) * 3 + 2];
  }
  let cartoon = newImage.reshape(3, src.rows);

  // --- Paint-like (Bilateral filter on cartoon) ---
  let paint = new cv.Mat();
  cv.bilateralFilter(cartoon, paint, 15, 100, 100);

  // Show results
  cv.imshow("cartoonCanvas", cartoon);
  cv.imshow("paintCanvas", paint);

  // Enable download
  function enableDownload(canvasId, linkId) {
    let canvas = document.getElementById(canvasId);
    let link = document.getElementById(linkId);
    link.href = canvas.toDataURL("image/png");
  }
  enableDownload("cartoonCanvas", "downloadCartoon");
  enableDownload("paintCanvas", "downloadPaint");

  // Cleanup
  src.delete(); samples.delete(); labels.delete(); centers.delete();
  cartoon.delete(); paint.delete(); newImage.delete();
});
