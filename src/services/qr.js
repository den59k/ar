class QR {
	constructor(){
		this.worker = new Worker('/js/qr.worker.js') // load worker
		this.waiting = {}
		
		this.worker.onmessage = (e) => {
			const { action, payload } = e.data
			if(this.waiting[action]){
				this.waiting[action](payload)
				delete this.waiting[action]
			}
		}

		this.worker.onerror = (e) => {
			console.log(e)
		}
	}

	//Мы промисифицируем данный метод, чтобы ожидать ответ
	_dispatch = (action, payload) => new Promise ((res, rej) => {
		if(this.waiting[action]) return rej (`Action ${action} is not completed`)

		this.worker.postMessage({ action, payload })
		this.waiting[action] = res
	})

	init() {
		return this._dispatch("init")
	}

	findQR(imageData) {
		return this._dispatch("findQR", imageData)
	}
}

export default QR