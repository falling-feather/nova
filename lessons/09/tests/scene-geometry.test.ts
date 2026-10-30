import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { batch } from '../src/scene/geometry.ts';

test('静态合批保留地形顶点色及其世界位置，不把彩色地面变黑', () => {
  const group = new T.Group();
  const geometry = new T.PlaneGeometry(2, 2);
  const colors = Array.from({ length: geometry.attributes.position.count }, () => [
    0.2, 0.5, 0.3,
  ]).flat();
  geometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
  const material = new T.MeshStandardMaterial({ vertexColors: true });
  const source = new T.Mesh(geometry, material);
  source.position.x = 4;
  group.add(source);
  batch(group);
  const result = group.children.find((o) => o instanceof T.Mesh) as T.Mesh;
  assert.equal(result.material, material);
  assert.equal(result.geometry.attributes.color.count, result.geometry.attributes.position.count);
  assert.ok(Math.abs(result.geometry.attributes.color.getY(0) - 0.5) < 1e-6);
  result.geometry.computeBoundingBox();
  assert.equal(result.geometry.boundingBox!.min.x, 3);
  assert.equal(result.geometry.boundingBox!.max.x, 5);
});
