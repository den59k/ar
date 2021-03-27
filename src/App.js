import { useEffect, useRef, useState } from "react";
import { delay } from 'libs/delay'
import { initCanvas } from 'libs/canvas'

import { processImage } from 'process-image'

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
			await delay(250)			//Верь мне, так нужно
			const getImageData = initCanvas(videoRef.current.videoWidth, videoRef.current.videoHeight)

			canvasRef.current.width = videoRef.current.videoWidth
			canvasRef.current.height = videoRef.current.videoHeight

			async function computeImage() {

				const imageData = getImageData(videoRef.current)
				
				const time = performance.now()
				const data = processImage(imageData)
				setFps(Math.round(1000 / (performance.now() - time)))
				
				if(data){
					const ctx = canvasRef.current.getContext('2d')
					ctx.putImageData(imageData, 0, 0)
					ctx.beginPath()
					for(let i = 0; i < data.length; i++){
						ctx.moveTo(data[i].x | 0, data[i].y | 0)
						ctx.lineTo((data[i+1] || data[0]).x | 0, (data[i+1] || data[0]).y | 0)
					}
					ctx.closePath()
					ctx.strokeStyle = "red"
					ctx.lineWidth = 2
					ctx.stroke()
				}

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
			<video  ref={videoRef}/>
			<canvas ref={canvasRef}/>
			<div className="fps">{fps} FPS</div>
		</div>
	);
}

export default App;
