const elVideo = document.getElementById('video');
const imageUpload = document.getElementById('imageUpload');
var intervalDetector;

navigator.getMedia = (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia)

async function cargarCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    elVideo.srcObject = stream;
  } catch (error) {
    console.error(error);
  }
}

// Cargar Modelos
Promise.all([
    // faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
    faceapi.nets.ssdMobilenetv1.loadFromUri('/models'),
    faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
    faceapi.nets.ageGenderNet.loadFromUri('/models'),
    faceapi.nets.faceExpressionNet.loadFromUri('/models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
    faceapi.nets.faceLandmark68TinyNet.loadFromUri('/models'),
    // faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
]).then()

async function loadLabeledImages() {
  const labels = ['Eider','Emma Myers','Justin']
  // return Promise.all(
    labels.map(async label => {
      const descriptions = []
      for (let i = 1; i <= 3; i++) {
        const img = await faceapi.fetchImage(`./labeled_images/${label}/${i}.png`)
        // const detections = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor()
        const detections = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor()
        console.log('detections', detections)
        if (detections) {
          descriptions.push(detections.descriptor)
        }
      }
      return new faceapi.LabeledFaceDescriptors(label, descriptions)
    })
  // )
}

elVideo.addEventListener('play', async () => {
    // creamos el canvas con los elementos de la face api
    const canvas = faceapi.createCanvasFromMedia(elVideo)
    // lo añadimos al body
    document.getElementById('contenedor-general').append(canvas)
    // tamaño del canvas
    const displaySize = { width: elVideo.width, height: elVideo.height }
    faceapi.matchDimensions(canvas, displaySize);
    const labeledFaceDescriptors = await loadLabeledImages();
    debugger;
    //valores del contador para lanzar el mail
    var count = 1;
    let lastResult;

    intervalDetector = setInterval(async () => {
      // hacer las detecciones de cara
      // const detections = await faceapi.detectAllFaces(elVideo, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
      const detections = await faceapi.detectAllFaces(elVideo)
        .withFaceLandmarks()
        .withFaceExpressions()
        .withAgeAndGender()
        .withFaceDescriptors()
      // ponerlas en su sitio
      const resizedDetections = faceapi.resizeResults(detections, displaySize)
      const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors, 1)
      // limpiar el canvas
      canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
      faceapi.draw.drawDetections(canvas, resizedDetections)
      faceapi.draw.drawFaceLandmarks(canvas, resizedDetections)
      faceapi.draw.drawFaceExpressions(canvas, resizedDetections)
      // Resultado reconocedor
      console.log('resizedDetections',resizedDetections)
      const results = resizedDetections.map(d => {
        if (d.descriptor) {
          return faceMatcher.findBestMatch(d.descriptor);
        } else {
          return { label: 'Unknown' };
        }
      })
      
      // dibujar las líneas
      results.forEach((result, i) => {
        const box = resizedDetections[i].detection.box
        const drawBox = new faceapi.draw.DrawBox(box, { label: result.toString() + ' Edad: '+ Math.round(detections[i].age) +' Sexo: '+ detections[i].gender})
        drawBox.draw(canvas);
      })
      
      //validación para el mail
      if (results[0].label === lastResult) {
        count++;
      } else {
        count = 1;
      }
    
      if (count === 20) {
        // Aquí puedes llamar a la función que deseas ejecutar
        enviarCorreo(results[0].label.toString())
        count = 0;
      }
      lastResult = results[0].label;

      // Llamar al recolector de basura
      if (typeof window !== 'undefined' && window.performance && window.performance.memory) {
        window.performance.memory.detections = "";
        window.performance.memory.resizedDetections = "";
        window.performance.memory.labeledFaceDescriptors = "";
        window.performance.memory.faceMatcher = "";
        window.performance.memory.results = "";
      }
    },500)
})

imageUpload.addEventListener('change', async () => {
  const container = document.createElement('div');
  container.style.position = 'relative';
  document.getElementById('contenedor-general').append(container);
  debugger
  const labeledFaceDescriptorsIMG = await loadLabeledImages()
  const faceMatcherIMG = new faceapi.FaceMatcher(labeledFaceDescriptorsIMG, 1)
  let image
  let canvas
  if (image) image.remove()
  if (canvas) canvas.remove()
  container.innerHTML = '';
  image = await faceapi.bufferToImage(imageUpload.files[0])
  container.append(image)
  canvas = faceapi.createCanvasFromMedia(image)
  container.append(canvas)
  const displaySizeIMG = { width: image.width, height: image.height }
  faceapi.matchDimensions(canvas, displaySizeIMG)
  // hacer las detecciones de cara
  // const detectionsIMG = await faceapi.detectAllFaces(image, new faceapi.TinyFaceDetectorOptions({ fastMode: true }))
  const detectionsIMG = await faceapi.detectAllFaces(image)
  .withFaceLandmarks()
  .withFaceExpressions()
  .withAgeAndGender()
  .withFaceDescriptors()

  const resizedDetectionsIMG = await faceapi.resizeResults(detectionsIMG, displaySizeIMG)
  debugger;
  try {
    const resultsIMG = await resizedDetectionsIMG.map(d => {
      if (d.descriptor) {
        return faceMatcherIMG.findBestMatch(d.descriptor);
      } else {
        return { label: 'Unknown' };
      }
    });
    resultsIMG.forEach((result, i) => {
      const box = resizedDetectionsIMG[i].detection.box;
      const drawBox = new faceapi.draw.DrawBox(box, { label: result.toString() });
      drawBox.draw(canvas);
    });
  } catch (error) {
  }
})

function returnNameEmail(nombreFace){
  const emailDefault = 'jusrtin2010@gmail.com';
  const listaEmails ={
    'Justin':()=> 'jusrtin2010@gmail.com'
  }
  return listaEmails[nombreFace] ? listaEmails[nombreFace]() : emailDefault
}

function enviarCorreo(nombreFace) {
  // Completar con la dirección de correo electrónico del destinatario
  var destinatario = returnNameEmail(nombreFace);
  // destinatario = destinatario.slice(0, -1);
  
  // Completar con el asunto del correo electrónico
  var asunto = "Te vi";
  
  // Completar con el cuerpo del correo electrónico
  var cuerpo = "fuiste detectado por el reconocedor de rostros";
  
  // Crear el enlace de correo electrónico utilizando los datos anteriores
  var enlace = "mailto:" + encodeURIComponent(destinatario) + "?subject=" + encodeURIComponent(asunto) + "&body=" + encodeURIComponent(cuerpo);
  
  //Detener el intervalo
  clearInterval(intervalDetector)
  
  // Abrir el cliente de correo electrónico predeterminado del usuario con el enlace generado
  window.open(enlace);
}