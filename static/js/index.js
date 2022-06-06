const video = document.getElementById('video');

var socket = io.connect('http://127.0.0.1:5000');
socket.on( 'connect', function() {
  console.log("SOCKET CONNECTED")
})



navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;

Promise.all([
    faceapi.loadFaceLandmarkModel("http://127.0.0.1:5000/static/models/"),
    faceapi.loadFaceRecognitionModel("http://127.0.0.1:5000/static/models/"),
    faceapi.loadTinyFaceDetectorModel("http://127.0.0.1:5000/static/models/"),
    faceapi.loadFaceLandmarkModel("http://127.0.0.1:5000/static/models/"),
    faceapi.loadFaceLandmarkTinyModel("http://127.0.0.1:5000/static/models/"),
    faceapi.loadFaceRecognitionModel("http://127.0.0.1:5000/static/models/"),
    faceapi.loadFaceExpressionModel("http://127.0.0.1:5000/static/models/"),
]).then(startVideo).catch(err => console.error(err));

function startVideo() {
    console.log("access");
    navigator.getUserMedia({
        video: {}
    },
    stream => video.srcObject = stream,
    err => console.error(err)
)}

video.addEventListener('play', () => {
  // console.log('thiru');

    const canvas = faceapi.createCanvasFromMedia(video);
    document.body.append(canvas);
    const displaySize = { width: video.width, height: video.height };
    faceapi.matchDimensions(canvas, displaySize);

    setInterval(async () => {
        const faceDescription = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptors();
        console.log(faceDescription)
        socket.emit( 'my event', {
            data: faceDescription
        })

        const resizedDetections = faceapi.resizeResults(faceDescription, displaySize);
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
        faceapi.draw.drawDetections(canvas, resizedDetections);
        console.log(faceDescription);

        const labels = ['Darvik']

        const labeledFaceDescriptors = await Promise.all(
            labels.map(async label => {

                const imgUrl = `static/pics/${label}.jpg`
                const img = await faceapi.fetchImage(imgUrl)

                const faceDescription = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor()

                if (!faceDescription) {
                throw new Error(`no faces detected for ${label}`)
                }

                const faceDescriptors = [faceDescription.descriptor]
                return new faceapi.LabeledFaceDescriptors(label, faceDescriptors)
            })
        );

        const threshold = 0.8

        const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors, threshold)
        console.log(faceMatcher);

        const results = faceDescription.map(fd => faceMatcher.findBestMatch(fd.descriptor))
        console.log(results);

        results.forEach((bestMatch, i) => {
            const box = faceDescription[i].detection.box
            const text = bestMatch.toString()
            const drawBox = new faceapi.draw.DrawBox(box, { label: text })
            drawBox.draw(canvas)
        })

    }, 100)
})

