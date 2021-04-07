import { initCanvas } from "libs/canvas"
import { det, multiply, subtract, transpose } from "mathjs"
import QR from "./qr"
import jsfeat from 'jsfeat'
import { bufferToArray, bufferToPoints, decompose, getCameraMatrix, distance } from "process-image/decompose"

const point_status = new Uint8Array(4)
const homo_kernel = new jsfeat.motion_model.homography2d();
const affine_kernel = new jsfeat.motion_model.affine2d();

const homo_transform = new jsfeat.matrix_t(3, 3, jsfeat.F32_t | jsfeat.C1_t)
const affine_transform = new jsfeat.matrix_t(3, 3, jsfeat.F32_t | jsfeat.C1_t)

const one = [
	[ 1, 0, 0 ],
	[ 0, 1, 0 ],
	[ 0, 0, 1 ]
]

class ImageProcessor {
	constructor(){
		this.delay = 0
		this.lastTimeQuery = 0
	}

	async init(video){
		this.qr = new QR()
		await this.qr.init()

		this.width = video.videoWidth
		this.height = video.videoHeight
		const { getImageData, canvas } = initCanvas(this.width, this.height )
		
		this.video = video
		this.getImageData = getImageData
		this.canvas = canvas

		this.curr_img_pyr = new jsfeat.pyramid_t(10)
		this.prev_img_pyr = new jsfeat.pyramid_t(10)
		this.curr_img_pyr.allocate(this.width, this.height, jsfeat.U8_t|jsfeat.C1_t)
		this.prev_img_pyr.allocate(this.width, this.height, jsfeat.U8_t|jsfeat.C1_t)

		this.prev_xy = new Float32Array(4*2);
		this.curr_xy = new Float32Array(4*2);

		this.options = {
			win_size: 30,
			max_iterations: 40,
			epsilon: 0.01,
			min_eigen: 0.008
		}

		const scale = 2
		this.initialPoints = [
			{ x: -scale, y: scale },
			{ x: scale, y: scale },
			{ x: scale, y: -scale },
			{ x: -scale, y: -scale }
		]

		this.cameraMatrix = getCameraMatrix(this.height, this.width)

		this.lastTime = Date.now()
	}

	canFindQR(){
		return this.lastTimeQuery >= 0 && Date.now() > this.lastTimeQuery+this.delay
	}

	findQR(imageData){
		this.lastTimeQuery = -1
		this.qr.findQR(imageData).then((data) => {

			this.lastTimeQuery = Date.now()
			if(data.code === null) return

			const { 
				bottomLeftFinderPattern, bottomRightAlignmentPattern, topRightFinderPattern, topLeftFinderPattern,
				bottomLeftCorner, bottomRightCorner, topRightCorner, topLeftCorner
			} = data.code.location

			const corners = [ bottomLeftCorner, bottomRightCorner, topRightCorner, topLeftCorner ]

			const points = [
				bottomLeftFinderPattern, bottomRightAlignmentPattern, topRightFinderPattern, topLeftFinderPattern
			]

			homo_kernel.run(this.initialPoints, corners, homo_transform, 4)

			this.homography = bufferToArray(homo_transform.data, 3, 3)
			
			for(let i = 0; i < 4; i++){
				this.curr_xy[i*2] = points[i].x
				this.curr_xy[i*2+1] = points[i].y
			}
			
			this.delay = 5000
			this.saveFrame(imageData)
			this.swap()
		})
	}

	saveFrame(imageData){
		jsfeat.imgproc.grayscale(imageData.data, this.width, this.height, this.curr_img_pyr.data[0])
		this.curr_img_pyr.build(this.curr_img_pyr.data[0], true)
	}

	swap(){
		const xy = this.curr_xy
		this.curr_xy = this.prev_xy
		this.prev_xy = xy

		const img_pyr = this.curr_img_pyr
		this.curr_img_pyr = this.prev_img_pyr
		this.prev_img_pyr = img_pyr

	}

	computeOpticalFlow(imageData){
		this.saveFrame(imageData)
		
		jsfeat.optical_flow_lk.track(
			this.prev_img_pyr, this.curr_img_pyr, 
			this.prev_xy, this.curr_xy, 
			4, 
			this.options.win_size, 
			this.options.max_iterations, 
			point_status, 
			this.options.epsilon, 
			this.options.min_eigen
		)

		for(let i = 0; i < 4; i++)
			if(point_status[i] === 0){
				this.homography = null
				this.delay = 0
				return null
			}
		
		homo_kernel.run(bufferToPoints(this.prev_xy), bufferToPoints(this.curr_xy), affine_transform, 4)

		const T = bufferToArray(affine_transform.data, 3, 3)
		
		const delta = distance (T, one)

		const d = Math.abs(det(subtract(T, one)))

		this.lastTime = Date.now()

		if(delta < 0.4){
			this.homography = multiply(T, this.homography)
			this.swap()
		}else{
			this.delay = 0
		}
		
		if(delta > 1){
			this.homography = null
			return null
		}

		const matrix = decompose(this.homography, this.cameraMatrix)
		return matrix
	}

	process(callback) {
		

		const computeImage = () => {

			const imageData = this.getImageData(this.video)

			if(this.canFindQR())
				this.findQR(imageData)

			const fps = 1/(Date.now() - this.lastTime)*1000

			if(this.homography){
				const matrix = this.computeOpticalFlow(imageData)
				if(matrix) callback({ fps, imageData, matrix })
			}else{
				this.lastTime = Date.now()
				callback({ fps, imageData })
			}

			requestAnimationFrame(computeImage)
		}
		computeImage()
	}

	stop(){
		this.stopFlag = true
	}


}

export default ImageProcessor