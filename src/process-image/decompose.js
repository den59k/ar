import { inv, multiply, transpose, hypot, divide, cross, add, subtract, sum } from 'mathjs'
import jsfeat from 'jsfeat'

const angle = 40

export function getCameraMatrix (rows, cols){
	const f = rows/2/(Math.tan(angle/2*Math.PI/180))

	const mtx = [
		[ f, 0, cols / 2 ],
		[ 0, f, rows / 2 ],
		[ 0, 0, 1 ]
	]

	return mtx
}

export function bufferToArray(buffer, rows, cols){
	const res = []
	for(let i = 0; i < rows; i++){
		res.push([])
		for(let j = 0; j < cols; j++)
			res[i].push(buffer[i*cols+j])
	}
	return res
}

export function distance(a, b){
	let sum = 0
	for(let i = 0; i < 3; i++)
		for(let j = 0; j < 2; j++)
			sum += Math.abs(a[i][j]-b[i][j])
	
	return sum
}

export function bufferToPoints (curr_xy){
	const arr = []
	for(let i = 0; i < 4; i++)
		arr.push({ x: curr_xy[i*2], y: curr_xy[i*2+1] })

	return arr
}

export function projectPoints (_axis, cameraMatrix, matrix){
	const axis = transpose(_axis)
	const _points = transpose(multiply(multiply(cameraMatrix, matrix), axis))

	const points = _points.map(arr => ({ x: arr[0]/arr[2], y: arr[1] / arr[2] }) )

	return points
}

const matrixA = new jsfeat.matrix_t(3, 3, jsfeat.F32_t | jsfeat.C1_t);
const matrixW = new jsfeat.matrix_t(3, 3, jsfeat.F32_t | jsfeat.C1_t);
const matrixU = new jsfeat.matrix_t(3, 3, jsfeat.F32_t | jsfeat.C1_t);
const matrixV = new jsfeat.matrix_t(3, 3, jsfeat.F32_t | jsfeat.C1_t);


export function decompose (_H, mtx){
	
	const H = Array.isArray(_H)? _H: bufferToArray(_H, 3, 3)
	const _mtx = inv(mtx)

	const ext = transpose(multiply(_mtx, H))

	const l = Math.sqrt(hypot(ext[0]) * hypot(ext[1]))

	const rot1 = divide(ext[0], l)					//Мы нормализуем все по первому столбцу
	const rot2 = divide(ext[1], l)
	const rot3 = cross(ext[0], ext[1])

	matrixA.data.set(rot1, 0)
	matrixA.data.set(rot2, 3)
	matrixA.data.set(rot3, 6)

	jsfeat.linalg.svd_decompose(matrixA, matrixW, matrixU, matrixV, jsfeat.SVD_V_T)
	jsfeat.matmath.multiply(matrixA, matrixU, matrixV)

	const _rotationMatrix = []
	for(let i = 0; i < 3; i++)
		_rotationMatrix.push(Array.from(matrixA.data.slice(i*3, i*3+3)))
	
	//Ну и четвертый - вектор перемещения
	_rotationMatrix.push(divide(ext[2], l))

	const rotationMatrix = transpose(_rotationMatrix)

	return rotationMatrix
}