import jsfeat from 'jsfeat'
import jsQR from 'jsqr'
import { multiply, subtract } from 'mathjs'
import { bufferToArray, decompose, getCameraMatrix, projectPoints } from './decompose'
import { pointToArray, rnd } from 'libs/math'

let history = null

const options = {
	win_size: 20,
	max_iterations: 30,
	epsilon: 0.01,
	min_eigen: 0.005
}

const point_status = new Uint8Array(10000)

const homo_kernel = new jsfeat.motion_model.homography2d()

const homo_transform = new jsfeat.matrix_t(3, 3, jsfeat.F32_t | jsfeat.C1_t)
const affine_transform = new jsfeat.matrix_t(3, 3, jsfeat.F32_t | jsfeat.C1_t)

const scale = 2
const initialPoints = [
	{ x: -scale, y: scale },
	{ x: scale, y: scale },
	{ x: scale, y: -scale },
	{ x: -scale, y: -scale }
]


function bufferToPoints (curr_xy, count, point_status){
	const arr = []
	for(let i = 0; i < count; i++)
		if(point_status[i] !== 0)
			arr.push({ x: curr_xy[i*2], y: curr_xy[i*2+1] })

	return arr
}

const threshold = 40
jsfeat.fast_corners.set_threshold(threshold)

export function processImage (imageData){

	const { width, height } = imageData

	if(history === null){
		const code = jsQR(imageData.data, width, height)

		if(code){
			const { 
				bottomLeftFinderPattern, bottomRightAlignmentPattern, topRightFinderPattern, topLeftFinderPattern,
				bottomLeftCorner, bottomRightCorner, topRightCorner, topLeftCorner
			} = code.location

			const corners = [ bottomLeftCorner, bottomRightCorner, topRightCorner, topLeftCorner ]

			const points = [
				bottomLeftFinderPattern, bottomRightAlignmentPattern, topRightFinderPattern, topLeftFinderPattern
			]

			const curr_img_pyr = new jsfeat.pyramid_t(3)
			const prev_img_pyr = new jsfeat.pyramid_t(3)
			curr_img_pyr.allocate(width, height, jsfeat.U8_t|jsfeat.C1_t)
			prev_img_pyr.allocate(width, height, jsfeat.U8_t|jsfeat.C1_t)
				
			jsfeat.imgproc.grayscale(imageData.data, width, height, prev_img_pyr.data[0])
			prev_img_pyr.build(prev_img_pyr.data[0], true)

			homo_kernel.run(initialPoints, corners, homo_transform, 4)
			
			//Сообразим матрицу для камеры
			const cameraMatrix = getCameraMatrix(height, width)

			const trackingCorners = []
			for(let i = 0; i < width*height; i++) 
				trackingCorners[i] = new jsfeat.keypoint_t(0,0,0,0);
			

			const count = jsfeat.fast_corners.detect(prev_img_pyr.data[0], trackingCorners, 3)

			const prev_xy = new Float32Array(count*2)
			const curr_xy = new Float32Array(count*2)
			let countCorners = 0

			for(let i = 0; i < count; i++){
				let add = true
				for(let j = 0; j < 4; j++){
					const vec1 = [ points[rnd(j+1, 4)].x - points[j].x, points[rnd(j+1, 4)].y - points[j].y ]
					const vec2 = [ trackingCorners[i].x - points[j].x, trackingCorners[i].y - points[j].y ]
					if(vec1[0]*vec2[1] - vec1[1]*vec2[0] > 0)
						add = false
				}
				if(!add) continue

				prev_xy[countCorners*2] = trackingCorners[i].x
				prev_xy[countCorners*2+1] = trackingCorners[i].y
				countCorners++
			}

	
			//Запоминаем нашу матрицу хомографии 
			const lastHomo = bufferToArray(homo_transform.data, 3, 3)

			history = { corners, cameraMatrix, curr_img_pyr, prev_img_pyr, prev_xy, curr_xy, countCorners, lastHomo }
			
			const matrix = decompose(homo_transform.data, cameraMatrix)

			return {
				matrix,
				prev_xy,
				countCorners,
				cameraMatrix
			}
		}
	}else{

		//Мы меняем местами предыдущее изображение и текущее, чтобы не выделять новую память
		const { lastHomo, cameraMatrix, prev_img_pyr, curr_img_pyr, prev_xy, curr_xy, countCorners } = history			

		jsfeat.imgproc.grayscale(imageData.data, width, height, curr_img_pyr.data[0])
		curr_img_pyr.build(curr_img_pyr.data[0], true)

		jsfeat.optical_flow_lk.track(
			prev_img_pyr, curr_img_pyr, 
			prev_xy, curr_xy, 
			countCorners, 
			options.win_size, 
			options.max_iterations, 
			point_status, 
			options.epsilon, 
			options.min_eigen
		);
		
		const prev_points = bufferToPoints(prev_xy, countCorners, point_status)
		const curr_points = bufferToPoints(curr_xy, countCorners, point_status)

		homo_kernel.run(prev_points, curr_points, affine_transform, prev_points.length)

		const T = bufferToArray(affine_transform.data, 3, 3)
		const currentHomo = multiply(T, lastHomo)
		const matrix = decompose(currentHomo, cameraMatrix)

		
		history.curr_img_pyr = prev_img_pyr
		history.prev_img_pyr = curr_img_pyr

		let nextCountCorners = 0
		let err = 0;
		for(let i = 0; i < countCorners; i++){
			if(point_status[i] !== 0)
				prev_xy[nextCountCorners++] = curr_xy[i]
			else	
				err++
		}

		if(nextCountCorners < 5){
			history = null
			return null
		}

		history.countCorners = nextCountCorners
		history.lastHomo = currentHomo

		return {
			matrix,
			cameraMatrix
		}
	}

	return null
}