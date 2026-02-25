let scene, camera, renderer, cup1, cup2;
let isTossing = false;

init();
animate();

function init() {
    // 1. 場景與相機
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xfff9e6);
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    updateCameraPosition();
    scene.add(camera);

    // 2. 渲染器
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    // 3. 燈光
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // 4. 地面
    const floorGeometry = new THREE.PlaneGeometry(500, 500); 
    const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x221100 });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // 增強燈光，讓紅漆質感更明顯
    const spotLight = new THREE.SpotLight(0xffffff, 1);
    spotLight.position.set(0, 15, 5);
    spotLight.castShadow = true;
    spotLight.angle = Math.PI / 4;
    scene.add(spotLight);


    // 5. 建立 3D 筊杯模型 (自定義形狀)

    const cupShape = new THREE.Shape();
    cupShape.moveTo(-3, 0);
    cupShape.absarc(0, 0, 3, Math.PI, 0, true);
    cupShape.quadraticCurveTo(0, 1.5, -3, 0);

    const extrudeSettings = { 
        depth: 0.8,              // 厚度
        bevelEnabled: true, 
        bevelThickness: 0.3,    // 倒角厚度（讓邊緣圓滑）
        bevelSize: 0.2, 
        bevelSegments: 8        // 增加段數讓圓角更細緻
    };

    // 2. 創建立體幾何體並調整中心點
    const geometry = new THREE.ExtrudeGeometry(cupShape, extrudeSettings);
    geometry.center(); // 確保旋轉中心在物體中央
    geometry.rotateX(Math.PI / 2);

    // 3. 仿木漆材質：深紅色、低反光、帶點粗糙感
    const cupMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x8b0000,      // 深紅色 (Dark Red)
        roughness: 0.7,       // 增加粗糙度，不像塑膠
        metalness: 0.1,       // 低金屬感
    });

    cup1 = new THREE.Mesh(geometry, cupMaterial);
    cup2 = new THREE.Mesh(geometry, cupMaterial);
    cup1.castShadow = cup2.castShadow = true;

    // 初始位置
    cup1.position.set(-4, 0.5, 0);
    cup2.position.set(4, 0.5, 0);
    scene.add(cup1, cup2);

    // 視窗縮放處理
    window.addEventListener('resize', () => {
        // const width = window.innerWidth;
        // const height = window.innerHeight;

        // camera.aspect = width / height;
        
        // if (width < height) {
        //     camera.position.set(0, 22, 25);
        // } else {
        //     camera.position.set(0, 18, 20);
        // }

        // camera.updateProjectionMatrix();
        // renderer.setSize(width, height);
        camera.aspect = window.innerWidth / window.innerHeight;
        updateCameraPosition();
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);

    });

    window.dispatchEvent(new Event('resize'));
}

// 擲杯主程式
document.getElementById('throwBtn').onclick = function() {
    if (isTossing) return;
    isTossing = true;
    this.disabled = true;
    document.getElementById('result').innerText = "擲杯中...";

    const duration = 1500; // 動畫時間
    const startTime = Date.now();

    // 隨機決定結果：0 = 平面朝上 (仰), 1 = 凸面朝上 (俯)
    const res1 = Math.floor(Math.random() * 2);
    const res2 = Math.floor(Math.random() * 2);

    function updatePhysics() {
        const elapsed = Date.now() - startTime;
        const progress = elapsed / duration;

        if (progress < 1) {
            // 拋物線高度
            const height = Math.sin(progress * Math.PI) * 7;
            
            // 讓杯子在飛行過程中稍微往兩側外拋 (Progress 0 到 1 逐漸拉開 X 軸)
            const outward1 = -progress * 2; 
            const outward2 = progress * 2;

            cup1.position.set(-2 + outward1, 0.5 + height, Math.sin(progress * 3));
            cup2.position.set(2 + outward2, 0.5 + height, Math.cos(progress * 3));
            
            // 增加混亂的旋轉感
            cup1.rotation.x += 0.2;
            cup1.rotation.y += 0.15;
            cup2.rotation.x += 0.1;
            cup2.rotation.z += 0.2;

            requestAnimationFrame(updatePhysics);
        } else {
            setFinalState(cup1, res1);
            setFinalState(cup2, res2);
            showResultText(res1, res2);
            isTossing = false;
            document.getElementById('throwBtn').disabled = false;
        }
    }
    updatePhysics();
};

function updateCameraPosition() {
    const isMobile = window.innerWidth < window.innerHeight;
    if (isMobile) {
        // 手機版：高度 Y=35, 距離 Z=45 (拉遠讓杯子變小)
        camera.position.set(0, 35, 45);
    } else {
        // 電腦版
        camera.position.set(0, 25, 30);
    }
    camera.lookAt(0, 0, 0);
}

function setFinalState(mesh, res) {

    mesh.position.y = 0.5; // 落地高度

    // 判斷是否為手機版 (螢幕寬度小於 500)
    const isMobile = window.innerWidth < 500;
    
    // 手機版間距縮小到 1.2，散佈範圍縮小到 1.5
    const minGap = isMobile ? 1.2 : 2.0;   
    const spread = isMobile ? 1.5 : 3.0;

    let targetX, targetZ;

    if (mesh === cup1) {
        // 杯 1 落在左半邊：範圍從 -minGap 到 -(minGap + spread)
        targetX = -(minGap + Math.random() * spread);
        targetZ = (Math.random() - 0.5) * 4; // Z 軸上下隨機
    } else {
        // 杯 2 落在右半邊：範圍從 minGap 到 (minGap + spread)
        targetX = (minGap + Math.random() * spread);
        targetZ = (Math.random() - 0.5) * 4; // Z 軸上下隨機
    }
    targetZ = (Math.random() - 0.5) * (isMobile ? 2 : 4);

    mesh.position.x = targetX;
    mesh.position.z = targetZ;

    // 隨機旋轉角度 (Yaw)，模擬落地後的自然朝向
    const randomYaw = Math.random() * Math.PI * 2;
    
    // 處理 3D 翻面邏輯
    // res 0 = 平面(仰)，我們讓 Z 軸旋轉為 0
    // res 1 = 凸面(俯)，我們讓 Z 軸旋轉為 PI (180度)
    // 同時加入一點微小的傾斜 (Pitch/Roll)，讓它看起來不像完美的數學模型
    const tiltX = (Math.random() - 0.5) * 0.1; 
    const tiltY = randomYaw;
    const flipZ = (res === 0 ? 0 : Math.PI);

    mesh.rotation.set(tiltX, tiltY, flipZ);
}

function showResultText(r1, r2) {
    const display = document.getElementById('result');
    if (r1 !== r2) {
        display.innerText = "【 聖杯 】";
        display.style.color = "#ff4d4d";
    } else if (r1 === 0 && r2 === 0) {
        display.innerText = "【 笑杯 】";
        display.style.color = "#ffcc00";
    } else {
        display.innerText = "【 陰杯 】";
        display.style.color = "#999";
    }
}

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}