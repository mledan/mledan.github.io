class Board {
    constructor(color, mesh) {
        this.color = color;
        this.mesh = mesh; // Three.js mesh
        this.position = { x: 0, y: 0, z: 0 };
    }

    slide({ x, y, z }) {
        this.position = { x, y, z };
        this.mesh.position.set(x, y, z);
    }
}

class SceneController {
    constructor(scene, camera, renderer) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.isOrbiting = false;
        this.isAutoRotating = false;
        this.isAutoSliding = false;
        this.boards = [];
    }

    addBoard(board) {
        this.boards.push(board);
        this.scene.add(board.mesh);
    }

    toggleOrbit() {
        this.isOrbiting = !this.isOrbiting;
    }

    toggleAutoRotate() {
        this.isAutoRotating = !this.isAutoRotating;
    }

    toggleAutoSlide() {
        this.isAutoSliding = !this.isAutoSliding;
    }

    reset() {
        this.isOrbiting = false;
        this.isAutoRotating = false;
        this.isAutoSliding = false;
        this.boards.forEach(board => board.slide({ x: 0, y: 0, z: 0 }));
    }

    animate() {
        if (this.isAutoRotating) {
            this.boards.forEach(board => {
                board.mesh.rotation.y += 0.01;
            });
        }
        if (this.isAutoSliding) {
            this.boards.forEach(board => {
                board.position.x += 0.05 * (Math.random() - 0.5);
                board.mesh.position.set(board.position.x, board.position.y, board.position.z);
            });
        }
        this.renderer.render(this.scene, this.camera);
    }
}

class TextPanel {
    constructor() {
        this.state = {};
    }

    saveState(boards, sceneController) {
        this.state = {
            boards: boards.map(board => ({ color: board.color, position: board.position })),
            scene: {
                isOrbiting: sceneController.isOrbiting,
                isAutoRotating: sceneController.isAutoRotating,
                isAutoSliding: sceneController.isAutoSliding
            }
        };
        return JSON.stringify(this.state, null, 2);
    }

    loadState(state, boards, sceneController) {
        try {
            const parsed = JSON.parse(state);
            parsed.boards.forEach((savedBoard, i) => {
                boards[i].slide(savedBoard.position);
            });
            sceneController.isOrbiting = parsed.scene.isOrbiting;
            sceneController.isAutoRotating = parsed.scene.isAutoRotating;
            sceneController.isAutoSliding = parsed.scene.isAutoSliding;
        } catch (e) {
            console.error('Invalid state format:', e);
        }
    }

    exportAsCode() {
        return `// Scene State\n${this.saveState()}`;
    }

    reset() {
        this.state = {};
    }
}

class UIController {
    constructor(sceneController, textPanel) {
        this.sceneController = sceneController;
        this.textPanel = textPanel;
        this.bindEvents();
    }

    bindEvents() {
        const form = document.getElementById('position-controls');
        form.addEventListener('submit', e => {
            e.preventDefault();
            const redX = parseFloat(document.getElementById('red-x').value);
            const redY = parseFloat(document.getElementById('red-y').value);
            const redZ = parseFloat(document.getElementById('red-z').value);
            this.sceneController.boards[0].slide({ x: redX, y: redY, z: redZ });
        });

        document.getElementById('toggle-orbit').addEventListener('click', () => {
            this.sceneController.toggleOrbit();
            document.getElementById('orbit-status').textContent = this.sceneController.isOrbiting ? 'ON' : 'OFF';
        });

        document.getElementById('toggle-autorotate').addEventListener('click', () => {
            this.sceneController.toggleAutoRotate();
            document.getElementById('autorotate-status').textContent = this.sceneController.isAutoRotating ? 'ON' : 'OFF';
        });

        document.getElementById('toggle-autoslide').addEventListener('click', () => {
            this.sceneController.toggleAutoSlide();
            document.getElementById('autoslide-status').textContent = this.sceneController.isAutoSliding ? 'ON' : 'OFF';
        });

        document.getElementById('reset-position').addEventListener('click', () => {
            this.sceneController.reset();
            document.getElementById('red-x').value = 0;
            document.getElementById('red-y').value = 0;
            document.getElementById('red-z').value = 0;
            this.updateStatus();
        });

        document.getElementById('save-state').addEventListener('click', () => {
            document.getElementById('text-panel').value = this.textPanel.saveState(this.sceneController.boards, this.sceneController);
        });

        document.getElementById('load-state').addEventListener('click', () => {
            const state = document.getElementById('text-panel').value;
            this.textPanel.loadState(state, this.sceneController.boards, this.sceneController);
            this.updateStatus();
        });

        document.getElementById('export-code').addEventListener('click', () => {
            document.getElementById('text-panel').value = this.textPanel.exportAsCode();
        });

        document.getElementById('reset-text').addEventListener('click', () => {
            this.textPanel.reset();
            document.getElementById('text-panel').value = '';
        });

        document.addEventListener('keydown', e => {
            if (e.key === 'o') this.sceneController.toggleOrbit();
            if (e.key === 'r') this.sceneController.toggleAutoRotate();
            if (e.key === 'a') this.sceneController.toggleAutoSlide();
            this.updateStatus();
        });
    }

    updateStatus() {
        document.getElementById('orbit-status').textContent = this.sceneController.isOrbiting ? 'ON' : 'OFF';
        document.getElementById('autorotate-status').textContent = this.sceneController.isAutoRotating ? 'ON' : 'OFF';
        document.getElementById('autoslide-status').textContent = this.sceneController.isAutoSliding ? 'ON' : 'OFF';
    }
}

// Initialize Three.js Scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / 400, 0.1, 1000);
camera.position.z = 5;
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('canvas') });
renderer.setSize(window.innerWidth, 400);

// Create Boards
const redBoard = new Board('red', new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshBasicMaterial({ color: 0xff0000 })
));
const greenBoard = new Board('green', new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshBasicMaterial({ color: 0x00ff00 })
));
const yellowBoard = new Board('yellow', new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshBasicMaterial({ color: 0xffff00 })
));

// Initialize Controllers
const sceneController = new SceneController(scene, camera, renderer);
sceneController.addBoard(redBoard);
sceneController.addBoard(greenBoard);
sceneController.addBoard(yellowBoard);

const textPanel = new TextPanel();
const uiController = new UIController(sceneController, textPanel);

// Animation Loop
function animate() {
    requestAnimationFrame(animate);
    sceneController.animate();
}
animate();