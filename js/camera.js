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

    this.mode = 'third_person'; // 'third_person', 'first_person', 'vehicle'
    this.isAiming = false;
    this.isLocked = false;

    this.lookSensitivity = 0.0022;
    this.minPitch = -0.4;
    this.maxPitch = 1.25;

    // Smoothed target positions
    this.currentPosition = new THREE.Vector3();
    this.currentTarget = new THREE.Vector3();

    this.setupPointerLock();
  }

  setupPointerLock() {
    this.domElement.addEventListener('click', () => {
      if (!this.isLocked && document.pointerLockElement !== this.domElement) {
        this.domElement.requestPointerLock();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isLocked = (document.pointerLockElement === this.domElement);
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isLocked) return;

      this.yaw -= e.movementX * this.lookSensitivity;
      this.pitch += e.movementY * this.lookSensitivity;
      this.pitch = Math.max(this.minPitch, Math.min(this.maxPitch, this.pitch));
    });

    window.addEventListener('wheel', (e) => {
      if (this.mode === 'third_person') {
        this.targetDistance = Math.max(2.5, Math.min(10.0, this.targetDistance + e.deltaY * 0.005));
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyV') {
        this.toggleViewMode();
      }
    });
  }

  toggleViewMode() {
    if (this.mode === 'third_person') {
      this.mode = 'first_person';
    } else if (this.mode === 'first_person') {
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
      const carPos = vehicle.mesh.position;
      const carRot = vehicle.mesh.rotation.y;
      const speed = Math.abs(vehicle.speed || 0);

      // Speed-dependent distance and FOV
      const speedFactor = Math.min(1.0, speed / 35);
      const desiredDistance = 7.0 + speedFactor * 3.0;
      const desiredHeight = 2.8 + speedFactor * 0.8;
      const targetFov = 65 + speedFactor * 15;

      this.camera.fov += (targetFov - this.camera.fov) * delta * 4;
      this.camera.updateProjectionMatrix();

      // Camera smoothly tracks behind car, but allows mouse override
      const backAngle = carRot + Math.PI + this.yaw;
      const targetCamX = carPos.x + Math.sin(backAngle) * desiredDistance;
      const targetCamZ = carPos.z + Math.cos(backAngle) * desiredDistance;
      const targetCamY = carPos.y + desiredHeight + Math.sin(this.pitch) * 2;

      this.camera.position.lerp(new THREE.Vector3(targetCamX, targetCamY, targetCamZ), delta * 8);

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
        // Third Person Orbit & Aim Over-Shoulder
        const shoulderOffset = this.isAiming ? 0.6 : 0.0;
        const dist = this.isAiming ? 2.5 : this.targetDistance;

        // Calculate offset from player
        const offsetX = Math.sin(this.yaw) * Math.cos(this.pitch) * dist;
        const offsetY = Math.sin(this.pitch) * dist + 1.6;
        const offsetZ = Math.cos(this.yaw) * Math.cos(this.pitch) * dist;

        // Over-the-shoulder lateral shift
        const rightX = Math.cos(this.yaw) * shoulderOffset;
        const rightZ = -Math.sin(this.yaw) * shoulderOffset;

        const desiredCamPos = new THREE.Vector3(
          pPos.x + offsetX + rightX,
          pPos.y + offsetY,
          pPos.z + offsetZ + rightZ
        );

        this.camera.position.lerp(desiredCamPos, delta * 12);

        const lookTarget = pPos.clone().add(new THREE.Vector3(rightX * 0.5, 1.5, rightZ * 0.5));
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
