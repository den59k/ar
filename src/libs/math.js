export function rnd (i, col){
	while (i >= col)
		i -= col
	while(i < 0)
		i += col

	return i
}

export function pointToArray(point){
	return [ point.x, point.y ]
}