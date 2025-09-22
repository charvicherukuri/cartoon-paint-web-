function onOpenCvReady() {
  console.log("OpenCV.js is ready!");
  const fileInput = document.getElementById("fileInput");
  const generateBtn = document.getElementById("generateBtn");
  const downloadAllBtn = document.getElementById("downloadAllBtn");
  let imgElement = new Image();

  fileInput.addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
      imgElement.src = URL.createObjectURL(e.target.files[0]);
      imgElement.onload = () => {
        let canvas = document.getElementById("canvasOriginal");
        let ctx = canvas.getContext("2d");
        canvas.width = imgElement.width;
        canvas.height = imgElement.height;
        ctx.drawImage(imgElement, 0, 0);
        generateBtn.disabled = false;
      };
    }
  });

  generateBtn.addEventListener("click", () => {
    if (!imgElement.src) return;

    let src = cv.imread(imgElement);

    // Paint-like smooth
    let paintDst = new cv.Mat();
    cv.edgePreservingFilter(src, paintDst, 1, 50, 0.4);
    cv.imshow("canvasPaint", paintDst);

    // Cartoon effect (mean shift filtering)
    let cartoonDst = new cv.Mat();
    cv.pyrMeanShiftFiltering(src, cartoonDst, 20, 45, 3);
    cv.imshow("canvasCartoon", cartoonDst);

    // Enable individual download links
    document.getElementById("downloadPaint").href = document.getElementById("canvasPaint").toDataURL();
    document.getElementById("downloadCartoon").href = document.getElementById("canvasCartoon").toDataURL();
    downloadAllBtn.disabled = false;

    src.delete();
    paintDst.delete();
    cartoonDst.delete();
  });

  // Download both as ZIP
  downloadAllBtn.addEventListener("click", () => {
    const zip = new JSZip();
    zip.file("paint.png", document.getElementById("canvasPaint").toDataURL().split(",")[1], {base64: true});
    zip.file("cartoon.png", document.getElementById("canvasCartoon").toDataURL().split(",")[1], {base64: true});
    zip.generateAsync({type:"blob"}).then(function(content) {
      saveAs(content, "cartoon_paint.zip");
    });
  });
}
