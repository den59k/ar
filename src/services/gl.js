import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'

const rotationMatrix = new THREE.Matrix4()
rotationMatrix.makeRotationFromEuler(new THREE.Euler(
	-THREE.MathUtils.degToRad(90),
	0,
	0,
	'XYZ'
))

const cvToGlMatrix = new THREE.Matrix4()
cvToGlMatrix.set(
	1, 0, 0, 0,
	0, -1, 0, 0,
	0, 0, -1, 0,
	0, 0, 0, 1
)



export default class GL{
	constructor(canvas){
		this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
		this.renderer.autoClear = false

		this.scene = new THREE.Scene()
		this.camera = new THREE.PerspectiveCamera( 40, canvas.width / canvas.height, 0.1, 1000 )
		this.camera.position.z = 0;

		this.light = new THREE.AmbientLight( "#E3B1B0", 1.5);
		this.directionalLight = new THREE.DirectionalLight( 0xffffff, 2 );
		this.directionalLight.position.set(0.5, 1, 0.7)
		this.directionalLight.castShadow = true

		this.scene.add( this.light, this.directionalLight )

		this.importModel('/models/priora.glb')
	}

	setVideoBackground(video){
		this.videoTexture = new THREE.Texture( video )
		this.videoTexture.minFilter = THREE.LinearFilter
		this.videoTexture.generateMipmaps = false
		this.scene.background = this.videoTexture
	}

	updateBackground () {
		this.videoTexture.needsUpdate = true
	}

	importModel(src){
		const loader = new GLTFLoader();

		loader.load(src, gltf => {
			this.gltf = gltf.scene
			
			this.scene.add(gltf.scene)
		})
	}

	render(matrix){
		if(this.gltf){
			if(matrix){
				this.gltf.matrixAutoUpdate = false
				this.gltf.visible = true
				this.gltf.matrix.set(
					matrix[0][0], matrix[0][1], matrix[0][2], matrix[0][3], 
					matrix[1][0], matrix[1][1],	matrix[1][2], matrix[1][3], 
					matrix[2][0], matrix[2][1], matrix[2][2], matrix[2][3], 
				0, 0, 0, 1).premultiply(cvToGlMatrix).multiply(rotationMatrix)
			}else{
				this.gltf.visible = false
			}
		}
		this.renderer.render(this.scene, this.camera);
	}
}