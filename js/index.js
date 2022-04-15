import * as THREE from '../plugins/Three/build/three.module.js';
import {
    OrbitControls
} from '../plugins/Three/module/jsm/controls/OrbitControls.js';
import {
    GLTFLoader
} from '../plugins/Three/module/jsm/loaders/GLTFLoader.js';
import {
    VRButton
} from '../plugins/Three/module/jsm/webxr/VRButton.js';
import {
    XRControllerModelFactory
} from '../plugins/Three/module/jsm/webxr/XRControllerModelFactory.js';

var container;
var camera, scene, renderer;
var controller1, controller2;
var controllerGrip1, controllerGrip2;

var raycaster, intersected = [];
var tempMatrix = new THREE.Matrix4();

var controls, group;

init();
animate();

function init() {

    container = document.getElementById('container');

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x808080);

    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100000);
    camera.position.set(2.4, 2.4, 0);

    controls = new OrbitControls(camera, container);
    controls.target.set(0, 1.6, 0);
    controls.update();

    scene.add(new THREE.HemisphereLight(0x808080, 0x606060));

    var light = new THREE.DirectionalLight(0xffffff);
    light.position.set(0, 6, 0);
    light.castShadow = true;
    light.shadow.camera.top = 2;
    light.shadow.camera.bottom = -2;
    light.shadow.camera.right = 2;
    light.shadow.camera.left = -2;
    light.shadow.mapSize.set(4096, 4096);
    scene.add(light);

    group = new THREE.Group();
    scene.add(group);

    // 加载场景、模型
    addSky()
    loadModel()

    renderer = new THREE.WebGLRenderer({
        antialias: true
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.shadowMap.enabled = true;
    renderer.xr.enabled = true;
    container.appendChild(renderer.domElement);

    document.body.appendChild(VRButton.createButton(renderer));

    // controllers

    controller1 = renderer.xr.getController(0);
    controller1.addEventListener('selectstart', onSelectStart);
    controller1.addEventListener('selectend', onSelectEnd);
    scene.add(controller1);

    controller2 = renderer.xr.getController(1);
    controller2.addEventListener('selectstart', onSelectStart);
    controller2.addEventListener('selectend', onSelectEnd);
    scene.add(controller2);

    var controllerModelFactory = new XRControllerModelFactory();

    controllerGrip1 = renderer.xr.getControllerGrip(0);
    controllerGrip1.add(controllerModelFactory.createControllerModel(controllerGrip1));
    scene.add(controllerGrip1);

    controllerGrip2 = renderer.xr.getControllerGrip(1);
    controllerGrip2.add(controllerModelFactory.createControllerModel(controllerGrip2));
    scene.add(controllerGrip2);

    var geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)]);

    var line = new THREE.Line(geometry);
    line.name = 'line';
    line.scale.z = 5;

    controller1.add(line.clone());
    controller2.add(line.clone());

    raycaster = new THREE.Raycaster();

    window.addEventListener('resize', onWindowResize, false);

}

function addSky() {
    const texture = new THREE.CubeTextureLoader()
        .setPath('../images/sky/')
        .load([
            'sky.right.jpg', //右(-1,0,0)
            'sky.left.jpg', //左(1,0,0)
            'sky.top.jpg', //上(0,1,0)
            'sky.bottom.jpg', //下(0,-1,0)
            'sky.front.jpg', //前(0,0,1)
            'sky.back.jpg' //后(0,0,-1)
        ]);
    scene.background = texture
}

function loadModel() {
    var loader = new GLTFLoader().setPath('../models/island/');
    loader.load('scene.gltf', function (gltf) {
        const obj = gltf.scene
        obj.position.set(-4, 0, 0)
        obj.scale.set(0.04, 0.04, 0.04)
        scene.add(obj);
    });
}

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);

}

function onSelectStart(event) {

    var controller = event.target;

    var intersections = getIntersections(controller);

    if (intersections.length > 0) {

        var intersection = intersections[0];

        var object = intersection.object;
        object.material.emissive.b = 1;
        controller.attach(object);

        controller.userData.selected = object;

    }

}

function onSelectEnd(event) {

    var controller = event.target;

    if (controller.userData.selected !== undefined) {

        var object = controller.userData.selected;
        object.material.emissive.b = 0;
        group.attach(object);

        controller.userData.selected = undefined;

    }


}

function getIntersections(controller) {

    tempMatrix.identity().extractRotation(controller.matrixWorld);

    raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

    return raycaster.intersectObjects(group.children);

}

function intersectObjects(controller) {

    // Do not highlight when already selected

    if (controller.userData.selected !== undefined) return;

    var line = controller.getObjectByName('line');
    var intersections = getIntersections(controller);

    if (intersections.length > 0) {

        var intersection = intersections[0];

        var object = intersection.object;
        object.material.emissive.r = 1;
        intersected.push(object);

        line.scale.z = intersection.distance;

    } else {

        line.scale.z = 5;

    }

}

function cleanIntersected() {

    while (intersected.length) {

        var object = intersected.pop();
        object.material.emissive.r = 0;

    }

}

function animate() {

    renderer.setAnimationLoop(render);

}

function render() {

    cleanIntersected();

    intersectObjects(controller1);
    intersectObjects(controller2);

    renderer.render(scene, camera);

}