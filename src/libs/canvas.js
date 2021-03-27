export function initCanvas (width, height){

	const canvas = document.createElement('canvas')
	canvas.width = width
	canvas.height = height


	const ctx = canvas.getContext('2d')

	return (mediaElement) => {
		ctx.drawImage(mediaElement, 0, 0, canvas.width, canvas.height)
		return ctx.getImageData(0, 0, canvas.width, canvas.height)
	}
}