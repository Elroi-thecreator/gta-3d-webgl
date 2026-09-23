// ==========================================
// GTA 3D - DYNAMIC CAMERA SYSTEM
// ==========================================
class CameraController {
  constructor(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement;

    this.yaw = 0;
    this.pitch = 0.2;
    this.distance = 5.5;
    this.targetDistance = 5.5;

    this.mode = 'third_person'; // 'third_person', 'first_person'
    this.isAiming = false;
    this.isLocked = false;

    this.lookSensitivity = 0.0024;
    this.minPitch = -0.45;
    this.maxPitch = 1.25;

    this.setupPointerLock();
  }

  setupPointerLock() {
    this.domElement.addEventListener('click', () => {
      if (!this.isLocked && document.pointerLockElement !== this.domElement) {
        try {
          this.domElement.requestPointerLock();
        } catch(e) {}
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isLocked = (document.pointerLockElement === this.domElement);
    });

    let isMouseDown = false;
    let lastX = 0, lastY = 0;

    window.addEventListener('mousedown', (e) => {
      isMouseDown = true;
      lastX = e.clientX;
      lastY = e.clientY;
    });

    window.addEventListener('mouseup', () => {
      isMouseDown = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isLocked) {
        this.yaw -= e.movementX * this.lookSensitivity;
        this.pitch += e.movementY * this.lookSensitivity;
      } else if (isMouseDown) {
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        this.yaw -= dx * this.lookSensitivity;
        this.pitch += dy * this.lookSensitivity;
        lastX = e.clientX;
        lastY = e.clientY;
      }
      this.pitch = Math.max(this.minPitch, Math.min(this.maxPitch, this.pitch));
    });

    window.addEventListener('wheel', (e) => {
      if (this.mode === 'third_person') {
        this.targetDistance = Math.max(2.5, Math.min(10.0, this.targetDistance + e.deltaY * 0.005));
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyV' || e.key === 'v' || e.key === 'V') {
        this.toggleViewMode();
      }
    });
  }

  toggleViewMode() {
    if (this.mode === 'third_person') {
      this.mode = 'first_person';
    } else {
      this.mode = 'third_person';
    }
  }

  setAiming(aiming) {
    this.isAiming = aiming;
  }

  update(delta, targetMesh, vehicle = null) {
    if (!targetMesh && !vehicle) return;

    if (vehicle) {
      // VEHICLE CHASE CAMERA
      const carPos = vehicle.position;
      const carRot = vehicle.rotation;
      const speed = Math.abs(vehicle.speed || 0);

      const speedFactor = Math.min(1.0, speed / 35);
      const desiredDistance = 7.5 + speedFactor * 3.5;
      const desiredHeight = 2.8 + speedFactor * 0.8;
      const targetFov = 65 + speedFactor * 16;

      this.camera.fov += (targetFov - this.camera.fov) * delta * 4;
      this.camera.updateProjectionMatrix();

      const backAngle = carRot + Math.PI + this.yaw;
      const targetCamX = carPos.x + Math.sin(backAngle) * desiredDistance;
      const targetCamZ = carPos.z + Math.cos(backAngle) * desiredDistance;
      const targetCamY = carPos.y + desiredHeight + Math.sin(this.pitch) * 2;

      this.camera.position.lerp(new THREE.Vector3(targetCamX, targetCamY, targetCamZ), delta * 9);

      const lookTarget = carPos.clone().add(new THREE.Vector3(0, 1.2, 0));
      this.camera.lookAt(lookTarget);

    } else {
      // ON-FOOT PLAYER CAMERA
      const pPos = targetMesh.position;
      let targetFov = this.isAiming ? 45 : 65;
      this.camera.fov += (targetFov - this.camera.fov) * delta * 8;
      this.camera.updateProjectionMatrix();

      if (this.mode === 'first_person') {
        const eyeHeight = 1.7;
        const eyePos = pPos.clone().add(new THREE.Vector3(0, eyeHeight, 0));
        this.camera.position.copy(eyePos);

        const lookTarget = new THREE.Vector3(
          eyePos.x - Math.sin(this.yaw) * Math.cos(this.pitch) * 10,
          eyePos.y - Math.sin(this.pitch) * 10,
          eyePos.z - Math.cos(this.yaw) * Math.cos(this.pitch) * 10
        );
        this.camera.lookAt(lookTarget);
      } else {
        const shoulderOffset = this.isAiming ? 0.6 : 0.0;
        const dist = this.isAiming ? 2.5 : this.targetDistance;

        const offsetX = Math.sin(this.yaw) * Math.cos(this.pitch) * dist;
        const offsetY = Math.sin(this.pitch) * dist + 1.6;
        const offsetZ = Math.cos(this.yaw) * Math.cos(this.pitch) * dist;

        const rightX = Math.cos(this.yaw) * shoulderOffset;
        const rightZ = -Math.sin(this.yaw) * shoulderOffset;

        const desiredCamPos = new THREE.Vector3(
          pPos.x + offsetX + rightX,
          pPos.y + offsetY,
          pPos.z + offsetZ + rightZ
        );

        this.camera.position.lerp(desiredCamPos, delta * 14);

        const lookTarget = pPos.clone().add(new THREE.Vector3(rightX * 0.5, 1.45, rightZ * 0.5));
        this.camera.lookAt(lookTarget);
      }
    }
  }

  getForwardVector() {
    const v = new THREE.Vector3(0, 0, -1);
    v.applyEuler(new THREE.Euler(0, this.yaw, 0, 'YXZ'));
    return v;
  }

  getRightVector() {
    const v = new THREE.Vector3(1, 0, 0);
    v.applyEuler(new THREE.Euler(0, this.yaw, 0, 'YXZ'));
    return v;
  }
}
