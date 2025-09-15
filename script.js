let cartoonImage, paintImage;

document.getElementById('upload').addEventListener('change', function (e) {
  let file = e.target.files[0];
  if (!file) return;

  let img = new Image();
  img.onload = function () {
    let canvas = document.getElementById('canvas');
    let ctx = canvas.getContext('2d');
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    // Convert to OpenCV Mat
    let src = cv.imread(canvas);

    // ---- Cartoon (quantized) ----
    let Z = src.reshape(1, src.cols * src.rows);
    Z.convertTo(Z, cv.CV_32F);
    let K = 9, criteria = new cv.TermCriteria(cv.TermCriteria_EPS + cv.TermCriteria_MAX_ITER, 20, 1.0);
    let labels = new cv.Mat(), centers = new cv.Mat();
    cv.kmeans(Z, K, labels, criteria, 10, cv.KMEANS_RANDOM_CENTERS, centers);

    centers = centers.convertTo(centers, cv.CV_8U);
    let newImage = new cv.Mat(src.rows * src.cols, 1, src.type());
    for (let i = 0; i < labels.rows; i++) {
      let idx = labels.intAt(i, 0);
      newImage.data[i * 3] = centers.data[idx * 3];
      newImage.data[i * 3 + 1] = centers.data[idx * 3 + 1];
      newImage.data[i * 3 + 2] = centers.data[idx * 3 + 2];
    }
    let cartoon = newImage.reshape(3, src.rows);

    // ---- Paint-like (bilateral) ----
    let paint = new cv.Mat();
    cv.bilateralFilter(cartoon, paint, 15, 100, 100);

    // Save copies for download
    cartoonImage = cartoon.clone();
    paintImage = paint.clone();

    cv.imshow("canvas", paint); // Display paint version by default

    // Cleanup
    src.delete(); Z.delete(); labels.delete(); centers.delete();
  };
  img.src = URL.createObjectURL(file);
});

// Download Cartoon
document.getElementById("download-cartoon").onclick = function () {
  saveMatAsImage(cartoonImage, "cartoon.png");
};

// Download Paint-like
document.getElementById("download-paint").onclick = function () {
  saveMatAsImage(paintImage, "paint.png");
};

// Download ZIP
document.getElementById("download-zip").onclick = function () {
  let zip = new JSZip();
  zip.file("cartoon.png", matToBlob(cartoonImage), { binary: true });
  zip.file("paint.png", matToBlob(paintImage), { binary: true });
  zip.generateAsync({ type: "blob" }).then(function (content) {
    saveAs(content, "cartoon_results.zip");
  });
};

// Helper: Save Mat as PNG
function saveMatAsImage(mat, filename) {
  let canvas = document.createElement("canvas");
  cv.imshow(canvas, mat);
  canvas.toBlob(function (blob) {
    saveAs(blob, filename);
  });
}

// Helper: Convert Mat to Blob
function matToBlob(mat) {
  let canvas = document.createElement("canvas");
  cv.imshow(canvas, mat);
  return new Promise(resolve => {
    canvas.toBlob(blob => resolve(blob));
  });
}
