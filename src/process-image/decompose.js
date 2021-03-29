import { inv, multiply, transpose, hypot, divide, cross, add, subtract, sum } from 'mathjs'

const angle = 70

export function getCameraMatrix (rows, cols){
	const f = Math.max(rows, cols)/2/(Math.tan(angle/2*Math.PI/180))

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

export function projectPoints (_axis, cameraMatrix, matrix){
	const axis = transpose(_axis)
	const _points = transpose(multiply(multiply(cameraMatrix, matrix), axis))

	const points = _points.map(arr => ({ x: arr[0]/arr[2], y: arr[1] / arr[2] }) )

	return points
}

export function decompose (_H, mtx){
	
	const H = Array.isArray(_H)? _H: bufferToArray(_H, 3, 3)
	const _mtx = inv(mtx)

	const ext = transpose(multiply(_mtx, H))

	const l = Math.sqrt(hypot(ext[0]) * hypot(ext[1]))

	const rot1 = divide(ext[0], l)					//Мы нормализуем все по первому столбцу
	const rot2 = divide(ext[1], l)
	
	const c = add(rot1, rot2)
	const p = cross(rot1, rot2)
	const d = cross(c, p)

	//Потом мы собираем ту самую финальную матрицу (сначала по строкам, а потом повернем её)
	const _rotationMatrix = []
	
	//Первые два столбца - нормализованные вектора вращения
	_rotationMatrix.push(
		multiply(add( divide(c, hypot(c)), divide(d, hypot(d)) ), 1 / Math.sqrt(2))
	) 
	_rotationMatrix.push(
		multiply(subtract( divide(c, hypot(c)), divide(d, hypot(d)) ), 1 / Math.sqrt(2))
	)

	//Третий столбец - перпендикулярный им еще один вектор вращения
	_rotationMatrix.push(cross( _rotationMatrix[0], _rotationMatrix[1] ))		

	//Ну и четвертый - вектор перемещения
	_rotationMatrix.push(divide(ext[2], l))

	const rotationMatrix = transpose(_rotationMatrix)

	return rotationMatrix
}