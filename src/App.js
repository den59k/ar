import { useEffect, useRef, useState } from "react";

import { initCanvas } from 'libs/canvas'

import { processImage } from 'process-image'

import QR from 'services/qr'
import GL from 'services/gl'
import ImageProcessor from "services/image-processor";


const waitCameraData = (videoElement) => new Promise((res, rej) => {
	let count = 0
	const interval = setInterval(() => {
		if(videoElement.readyState === 4){
			clearInterval(interval)
			res()
		}
		count++
		if(count === 20){
			clearInterval(interval)
			rej("Wrong Camera")
		}
	}, 50)
})

function App() {

	const [ fps, setFps ] = useState(0)
	const videoRef = useRef()
	const canvasRef = useRef()

	useEffect(() => {

		async function initCamera(){

			const stream = await navigator.mediaDevices.getUserMedia({
				audio: false,
				video: {
					facingMode: 'environment',
					width: 720
				},
			})

			videoRef.current.srcObject = stream
			videoRef.current.play()
			
			return stream
		}

		const imageProcessor = new ImageProcessor()

		async function init(){
			await initCamera()
			await waitCameraData(videoRef.current)
			await imageProcessor.init(videoRef.current)

			canvasRef.current.width = videoRef.current.videoWidth
			canvasRef.current.height = videoRef.current.videoHeight

			const gl = new GL(canvasRef.current)
			gl.setVideoBackground(imageProcessor.canvas)

			imageProcessor.process((data) => {
				gl.updateBackground()

				setFps(data.fps)
				gl.render(data.matrix)
			})
		}

		init()

		return () => imageProcessor.stop()
	}, [])

	return (
		<div className="App" style={{height: "100vh"}}>
			<video  ref={videoRef} muted={true} playsInline={true} autoPlay={true} 
				style={{display: "none", objectFit: "cover"}}
			/>
			<canvas ref={canvasRef} style={{objectFit: "cover", width: "100%", height: "100%"}}/>
			<div className="fps">{fps} FPS</div>
		</div>
	);
}

export default App;
