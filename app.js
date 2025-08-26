    size: 2.5,
    height: 0.2,
  });
  const text4Mesh = new THREE.Mesh(text4Geo, textMaterial);
  text4Mesh.position.set(0, 0, 1);
  parts[3].add(text4Mesh);
}// Animation loop
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();// Handle window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

