import { useEffect, useRef, useState } from "react";
import { delay } from 'libs/delay'
import { initCanvas } from 'libs/canvas'

import { processImage } from 'process-image'
import { projectPoints } from "process-image/decompose";

import GL from '3d-graphics'

const axisColors = [ "red", "green", "blue"]
const axis = [
	[ 0, 0, 0, 1 ],
	[ 10, 0, 0, 1 ],
	[ 0, 10, 0, 1 ],
	[ 0, 0, -10, 1 ]
]

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


		async function init(){
			await initCamera(500)
			await waitCameraData(videoRef.current)
		
			const getImageData = initCanvas(videoRef.current.videoWidth, videoRef.current.videoHeight)

			canvasRef.current.width = videoRef.current.videoWidth
			canvasRef.current.height = videoRef.current.videoHeight

			const gl = new GL(canvasRef.current)
			gl.setVideoBackground(videoRef.current)

			async function computeImage() {

				const imageData = getImageData(videoRef.current)
				
				const time = performance.now()
				const data = processImage(imageData)
				setFps(Math.round(1000 / (performance.now() - time)))
				
				gl.render(data? data.matrix: null)

				if(!stopFlag)
					requestAnimationFrame(computeImage)
			}

			computeImage()
		}

		init()

		return () => stopFlag = true
	}, [])

	return (
		<div className="App">
			<video  ref={videoRef} style={{display: "none"}} muted={true}/>
			<canvas ref={canvasRef}/>
			<div className="fps">{fps} FPS</div>
		</div>
	);
}

export default App;
