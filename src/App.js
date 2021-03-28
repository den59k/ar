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
			const gl = new GL(canvasRef.current)

			const ctx = canvasRef.current.getContext('2d')

			async function computeImage() {

				const imageData = getImageData(videoRef.current)
				
				const time = performance.now()
				const data = processImage(imageData)
				setFps(Math.round(1000 / (performance.now() - time)))
				
				if(data){
					ctx.putImageData(imageData, 0, 0)
					ctx.beginPath()
					for(let i = 0; i < data.corners.length; i++){
						ctx.moveTo(data.corners[i].x | 0, data.corners[i].y | 0)
						ctx.lineTo((data.corners[i+1] || data.corners[0]).x | 0, (data.corners[i+1] || data.corners[0]).y | 0)
					}
					ctx.closePath()
					ctx.strokeStyle = "gray"
					ctx.lineWidth = 1
					ctx.stroke()
					
					const axisPoints = projectPoints(axis, data.cameraMatrix, data.matrix)

					for(let i = 0; i < 3; i++){
						ctx.beginPath()
						ctx.moveTo(axisPoints[0].x, axisPoints[0].y)
						ctx.lineTo(axisPoints[i+1].x, axisPoints[i+1].y)
						ctx.closePath()
						ctx.lineWidth = 4
						ctx.strokeStyle = axisColors[i]
						ctx.stroke()
					}
					
				}else{
					ctx.putImageData(imageData, 0, 0)
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
			<video  ref={videoRef} style={{display: "none"}}/>
			<canvas ref={canvasRef}/>
			<div className="fps">{fps} FPS</div>
		</div>
	);
}

export default App;
