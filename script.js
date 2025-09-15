let cartoonImage, paintImage;

cv['onRuntimeInitialized'] = () => {
    const uploadInput = document.getElementById('upload');
    const generateBtn = document.getElementById('generate');
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');

    uploadInput.addEventListener('change', function (e) {
        const file = e.target.files[0];
        if (!file) return;

        const img = new Image();
        img.onload = function () {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            // Show Generate button
            generateBtn.style.display = 'inline-block';
        };
        img.src = URL.createObjectURL(file);
    });

    generateBtn.addEventListener('click', function () {
        let src = cv.imread(canvas);

        // ---- Cartoon (quantized) ----
        let Z = src.reshape(1, src.cols * src.rows);
        Z.convertTo(Z, cv.CV_32F);
        let K = 9;
        let criteria = new cv.TermCriteria(cv.TermCriteria_EPS + cv.TermCriteria_MAX_ITER, 20, 1.0);
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
        cartoonImage = newImage.reshape(3, src.rows);

        // ---- Paint-like (bilateral) ----
        paintImage = new cv.Mat();
        cv.bilateralFilter(cartoonImage, paintImage, 15, 100, 100);

        // Display both images on canvas
        // Here we create two smaller canvases for output
        displayOutput(cartoonImage, 'Cartoon (Quantized)');
        displayOutput(paintImage, 'Paint-like Smooth');

        // Cleanup
        src.delete(); Z.delete(); labels.delete(); centers.delete();
    });

    // Download buttons
    document.getElementById("download-cartoon").onclick = function () {
        saveMatAsImage(cartoonImage, "cartoon.png");
    };
    document.getElementById("download-paint").onclick = function () {
        saveMatAsImage(paintImage, "paint.png");
    };
    document.getElementById("download-zip").onclick = function () {
        let zip = new JSZip();
        zip.file("cartoon.png", matToBlob(cartoonImage), { binary: true });
        zip.file("paint.png", matToBlob(paintImage), { binary: true });
        zip.generateAsync({ type: "blob" }).then(function (content) {
            saveAs(content, "cartoon_results.zip");
        });
    };

    // Helpers
    function displayOutput(mat, title) {
        const outputDiv = document.getElementById('output');
        const div = document.createElement('div');
        const h3 = document.createElement('h3');
        h3.innerText = title;
        const canvasOut = document.createElement('canvas');
        cv.imshow(canvasOut, mat);
        div.appendChild(h3);
        div.appendChild(canvasOut);
        outputDiv.appendChild(div);
    }

    function saveMatAsImage(mat, filename) {
        const canvasTemp = document.createElement("canvas");
        cv.imshow(canvasTemp, mat);
        canvasTemp.toBlob(function (blob) {
            saveAs(blob, filename);
        });
    }

    function matToBlob(mat) {
        const canvasTemp = document.createElement("canvas");
        cv.imshow(canvasTemp, mat);
        return canvasTemp.toDataURL().split(',')[1]; // Base64
    }
};
