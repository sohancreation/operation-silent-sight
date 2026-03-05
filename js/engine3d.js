/* ──────────────────────────────────────────────────────────────
   3D ENGINE — Three.js Integration
   Operation Silent Sight: Rail Shooter Edition
   ────────────────────────────────────────────────────────────── */

const Engine3D = (() => {
    let scene, camera, renderer;
    let path = []; // Array of {pos: Vector3, look: Vector3}
    let currentPointIndex = 0;
    let isMoving = false;
    let gunGroup, gunBody, gunMuzzle;
    let environment;
    let targetX = 0, targetY = 0; // Crosshair position for raycasting
    let recoilOffset = new THREE.Vector3(0, 0, 0);

    function init(canvasContainer) {
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x020408);
        scene.fog = new THREE.FogExp2(0x020408, 0.02);

        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.shadowMap.enabled = true;
        canvasContainer.appendChild(renderer.domElement);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        scene.add(ambientLight);

        const sun = new THREE.DirectionalLight(0x00ff88, 0.8);
        sun.position.set(5, 10, 5);
        sun.castShadow = true;
        scene.add(sun);

        createGun();
        createEnvironment();

        window.addEventListener('resize', onResize);
    }

    function createGun() {
        gunGroup = new THREE.Group();

        // Piston/Body
        const bodyGeo = new THREE.BoxGeometry(0.12, 0.18, 0.6);
        const mat = new THREE.MeshPhongMaterial({ color: 0x111111, shininess: 100 });
        gunBody = new THREE.Mesh(bodyGeo, mat);
        gunGroup.add(gunBody);

        // Barrel
        const barrelGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.4, 8);
        const barrel = new THREE.Mesh(barrelGeo, mat);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(0, 0.05, -0.4);
        gunGroup.add(barrel);

        // Muzzle for flash position
        gunMuzzle = new THREE.Object3D();
        gunMuzzle.position.set(0, 0.05, -0.6);
        gunGroup.add(gunMuzzle);

        // Handle
        const handleGeo = new THREE.BoxGeometry(0.1, 0.3, 0.15);
        const handle = new THREE.Mesh(handleGeo, mat);
        handle.position.set(0, -0.15, 0.1);
        handle.rotation.x = 0.2;
        gunGroup.add(handle);

        scene.add(gunGroup);
    }

    function createEnvironment() {
        environment = new THREE.Group();

        // Floor
        const floorGeo = new THREE.PlaneGeometry(10, 500);
        const floorMat = new THREE.MeshPhongMaterial({ color: 0x0a1008 });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        environment.add(floor);

        // Road details
        const roadLineGeo = new THREE.PlaneGeometry(0.2, 2);
        const roadLineMat = new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.3 });
        for (let i = 0; i < 50; i++) {
            const line = new THREE.Mesh(roadLineGeo, roadLineMat);
            line.rotation.x = -Math.PI / 2;
            line.position.set(0, 0.01, -i * 10);
            environment.add(line);
        }

        // Generic Boxes representing buildings/walls
        for (let i = 0; i < 20; i++) {
            const side = i % 2 === 0 ? -4 : 4;
            const h = 4 + Math.random() * 8;
            const buildingGeo = new THREE.BoxGeometry(3, h, 6);
            const buildingMat = new THREE.MeshPhongMaterial({ color: 0x0d0d0d });
            const b = new THREE.Mesh(buildingGeo, buildingMat);
            b.position.set(side, h / 2, -i * 15 - 10);
            b.castShadow = true;
            b.receiveShadow = true;
            environment.add(b);
        }

        scene.add(environment);
    }

    function onResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    function update(dt, crosshairX, crosshairY) {
        // Map screen crosshair to 3D rotation
        targetX = (crosshairX / window.innerWidth) * 2 - 1;
        targetY = -(crosshairY / window.innerHeight) * 2 + 1;

        // Gun follows camera but slightly delayed/smoothed
        const gunTargetPos = new THREE.Vector3(
            camera.position.x + targetX * 0.5,
            camera.position.y - 0.4 + targetY * 0.3,
            camera.position.z - 0.8
        );
        gunGroup.position.lerp(gunTargetPos.add(recoilOffset), 0.2);

        // Tilt gun based on aim
        gunGroup.rotation.x = targetY * 0.2;
        gunGroup.rotation.y = -targetX * 0.3;

        // Recoil decay
        recoilOffset.lerp(new THREE.Vector3(0, 0, 0), 0.1);

        if (isMoving) {
            moveAlongRail(dt);
        }

        // Sync enemy meshes
        const cameraZ = camera.position.z;
        scene.children.forEach(obj => {
            if (obj.userData && obj.userData.enemyRef) {
                const e = obj.userData.enemyRef;
                // Move 3D mesh based on 2D logic state
                // X mapping: center of screen is 0. (e.x - halfWidth) / speed
                const xPos = (e.x - window.innerWidth / 2) * 0.01;
                const yPos = -(e.y - (window.innerHeight * 0.72)) * 0.01;
                const zPos = cameraZ - 10 - (e.depth || 0);

                obj.position.set(xPos, yPos, zPos);

                // If dead, sync removal
                if (!e.alive && !e.dying) {
                    obj.visible = false; // or remove
                }
            }
        });

        renderer.render(scene, camera);
    }

    function spawnEnemyMesh(e) {
        if (!EnemyTypes[e.id] || !EnemyTypes[e.id].createMesh) return;
        const mesh = EnemyTypes[e.id].createMesh(e);
        mesh.userData.enemyRef = e;
        scene.add(mesh);
        return mesh;
    }

    function clearScene() {
        const toRemove = [];
        scene.children.forEach(obj => {
            if (obj.userData && obj.userData.enemyRef) toRemove.push(obj);
        });
        toRemove.forEach(obj => scene.remove(obj));
    }

    function moveAlongRail(dt) {
        // Logic for moving camera from point A to B
        // Placeholder for now
    }

    function applyRecoil() {
        recoilOffset.z += 0.15;
        recoilOffset.y += 0.05;
    }

    function getMuzzlePosition() {
        const v = new THREE.Vector3();
        gunMuzzle.getWorldPosition(v);
        return v;
    }

    function shootRay() {
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera({ x: targetX, y: targetY }, camera);
        const intersects = raycaster.intersectObjects(scene.children, true);

        // Filter out the gun itself
        const validHits = intersects.filter(i => !gunGroup.getObjectById(i.object.id));
        return validHits.length > 0 ? validHits[0] : null;
    }

    return {
        init,
        update,
        applyRecoil,
        getMuzzlePosition,
        shootRay,
        spawnEnemyMesh,
        clearScene,
        getCamera: () => camera,
        getScene: () => scene
    };
})();
