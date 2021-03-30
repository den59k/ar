const methods = {
	init: () => {
		self.importScripts('./jsQR-min.js')
		return { status: "loaded" }
	},

	findQR: (imageData) => {
		const code = jsQR(imageData.data, imageData.width, imageData.height)
		return { code }
	}
}

//В этой функции мы просто вызываем нужный метод и возвращаем ответ
onmessage = async function(e) {
	const { action, payload } = e.data

	const response = methods[action](payload)
	if(!response.then)
		postMessage({ action, payload: response })
	else
		response.then(response => {
			postMessage({ action, payload: response })
		})
}