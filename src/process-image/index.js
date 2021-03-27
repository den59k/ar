import jsfeat from 'jsfeat'
import jsQR from 'jsqr'

let history = null

const options = {
	win_size: 20,
	max_iterations: 30,
	epsilon: 0.01,
	min_eigen: 0.001
}

const point_status = new Uint8Array(4)

function bufferToPoints (curr_xy){
	const arr = []
	for(let i = 0; i < 4; i++)
		arr.push({ x: curr_xy[i*2], y: curr_xy[i*2+1] })

	return arr
}

export function processImage (imageData){

	const { width, height } = imageData

	if(history === null){
		const code = jsQR(imageData.data, width, height)

		if(code){
			const { 
				bottomLeftFinderPattern, bottomRightAlignmentPattern, topRightFinderPattern, topLeftFinderPattern,
				bottomLeftCorner, bottomRightCorner, topRightCorner, topLeftCorner
			} = code.location

			const points = [
				bottomLeftFinderPattern, bottomRightAlignmentPattern, topRightFinderPattern, topLeftFinderPattern
			]

			const curr_img_pyr = new jsfeat.pyramid_t(3)
			const prev_img_pyr = new jsfeat.pyramid_t(3)
			curr_img_pyr.allocate(width, height, jsfeat.U8_t|jsfeat.C1_t)
			prev_img_pyr.allocate(width, height, jsfeat.U8_t|jsfeat.C1_t)
			
			const prev_xy = new Float32Array(4*2);
			const curr_xy = new Float32Array(4*2);

			jsfeat.imgproc.grayscale(imageData.data, width, height, prev_img_pyr.data[0])
			prev_img_pyr.build(prev_img_pyr.data[0], true)

			for(let i = 0; i < 4; i++){
				prev_xy[i*2] = points[i].x
				prev_xy[i*2+1] = points[i].y
			}

			history = { curr_img_pyr, prev_img_pyr, prev_xy, curr_xy, points }
			
			return [ bottomLeftCorner, bottomRightCorner, topRightCorner, topLeftCorner ]
		}
	}else{
		//Не знаю, но по моему, это забавно :)
		//Мы меняем местами предыдущее изображение и текущее, чтобы не выделять новую память
		const { prev_img_pyr, curr_img_pyr, prev_xy, curr_xy } = history			

		jsfeat.imgproc.grayscale(imageData.data, width, height, curr_img_pyr.data[0])
		curr_img_pyr.build(curr_img_pyr.data[0], true)

		jsfeat.optical_flow_lk.track(
			prev_img_pyr, curr_img_pyr, 
			prev_xy, curr_xy, 
			4, 
			options.win_size, 
			options.max_iterations, 
			point_status, 
			options.epsilon, 
			options.min_eigen
		);

		for(let i = 0; i < 4; i++)
			if(point_status[i] === 0){
				history = null
				return bufferToPoints(prev_xy)
			}
		
		history.curr_img_pyr = prev_img_pyr
		history.prev_img_pyr = curr_img_pyr

		history.curr_xy = prev_xy
		history.prev_xy = curr_xy
		
		return bufferToPoints(curr_xy)
	}

	return null
}