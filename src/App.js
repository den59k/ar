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
		let stopFlag = false
		async function initCamera(maxVideoSize){

			const stream = await navigator.mediaDevices.getUserMedia({
				audio: false,
				video: {
					facingMode: 'environment',
					width: maxVideoSize,
					height: maxVideoSize,
				},
			})

			videoRef.current.srcObject = stream
			videoRef.current.play()
			
			return stream
		}

		const imageProcessor = new ImageProcessor()

		async function init(){
			await initCamera(500)
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
		<div className="App">
			<video  ref={videoRef} muted={true} playsInline={true} autoPlay={true} style={{display: "none"}}/>
			<canvas ref={canvasRef}/>
			<div className="fps">{fps} FPS</div>
		</div>
	);
}

export default App;
