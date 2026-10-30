"""Bake static room AO from room-shading-source.cjs with local Blender/Cycles CPU.

blender -b --factory-startup --python tools/bake-room-occlusion.py -- \
  .work/polish-005/room-bake-source.json assets/shading/rooms --size 2048 --samples 32

Each room shares one UV atlas. Output UV1 float32 values follow the original
non-indexed Three.js vertex order; no authoritative geometry is duplicated in
the shipped assets. --prepare-only checks import/unwrap without baking or writes.
"""
import argparse
import base64
import hashlib
import json
import math
import os
import struct
import sys
import time
from pathlib import Path

import bpy
import numpy as np


PROJECT = Path(__file__).resolve().parents[1]


def digest(data):
    return hashlib.sha256(data).hexdigest()


def emit(event, **values):
    print(json.dumps({'event': event, **values}, ensure_ascii=False), flush=True)


def decode(mesh, name, width, dtype='<f4'):
    raw = base64.b64decode(mesh[name], validate=True)
    values = np.frombuffer(raw, dtype=dtype)
    if values.size != mesh['vertices'] * width or not np.isfinite(values).all():
        raise ValueError(f"{mesh['name']}: invalid {name} data length or value")
    return values.reshape(-1, width)


def original_faces(mesh):
    if mesh['index'] is None:
        indices = np.arange(mesh['vertices'], dtype=np.uint32)
    else:
        indices = np.frombuffer(base64.b64decode(mesh['index'], validate=True), dtype='<u4')
    if len(indices) != mesh['triangles'] * 3 or np.max(indices) >= mesh['vertices']:
        raise ValueError(f"{mesh['name']}: invalid triangle index or count")
    return indices.reshape(-1, 3)


def transform_mesh(mesh):
    points = decode(mesh, 'position', 3).astype(np.float64)
    normals = decode(mesh, 'normal', 3).astype(np.float64)
    matrix = np.asarray(mesh['matrix'], dtype=np.float64).reshape(4, 4).T
    if matrix.shape != (4, 4) or not np.isfinite(matrix).all():
        raise ValueError(f"{mesh['name']}: invalid transform")
    linear = matrix[:3, :3]
    if np.linalg.det(linear) <= 0:
        raise ValueError(f"{mesh['name']}: mirrored/degenerate transform needs explicit winding")
    points = points @ linear.T + matrix[:3, 3]
    normals = normals @ np.linalg.inv(linear)
    lengths = np.linalg.norm(normals, axis=1)
    if np.any(lengths < 0.5) or not np.isfinite(normals).all():
        raise ValueError(f"{mesh['name']}: invalid normal")
    normals /= lengths[:, None]
    return points, normals


def build_receiver(room_id, meshes):
    vertices, faces, normals, spans = [], [], [], []
    vertex_offset = loop_offset = 0
    for index, source in enumerate(meshes):
        if source['meshIndex'] != index or source['index'] is not None:
            raise ValueError(f'{room_id}: receiver traversal/index contract changed')
        points, source_normals = transform_mesh(source)
        source_faces = original_faces(source)
        triangles = points[source_faces]
        areas = np.linalg.norm(np.cross(triangles[:, 1] - triangles[:, 0],
                                       triangles[:, 2] - triangles[:, 0]), axis=1)
        if np.any(areas < 1e-12):
            raise ValueError(f"{source['name']}: zero-area receiver triangle")
        # Only the Blender working mesh is welded. Each original Three vertex
        # remains one face corner, including normal/UV seams and hard edges.
        unique, inverse = np.unique(points, axis=0, return_inverse=True)
        mapped = inverse[source_faces] + vertex_offset
        vertices.extend(unique.tolist())
        faces.extend(mapped.tolist())
        normals.extend(source_normals.tolist())
        spans.append((loop_offset, source['vertices'], source))
        vertex_offset += len(unique)
        loop_offset += source['vertices']
    geometry = bpy.data.meshes.new(room_id + '-receivers')
    geometry.from_pydata(vertices, [], faces)
    geometry.update()
    if len(geometry.loops) != loop_offset or len(geometry.polygons) * 3 != loop_offset:
        raise ValueError(f'{room_id}: Blender changed receiver topology')
    actual = np.empty(loop_offset, dtype=np.int32)
    geometry.loops.foreach_get('vertex_index', actual)
    expected = np.asarray(faces, dtype=np.int32).reshape(-1)
    if not np.array_equal(actual, expected):
        raise ValueError(f'{room_id}: Blender reordered original polygon corners')
    for polygon in geometry.polygons:
        polygon.use_smooth = True
    geometry.normals_split_custom_set(normals)
    geometry.uv_layers.new(name='RoomAO')
    obj = bpy.data.objects.new(room_id + '-receivers', geometry)
    bpy.context.collection.objects.link(obj)
    return obj, spans, expected


def build_occluders(room_id, meshes):
    vertices, faces = [], []
    offset = 0
    for source in meshes:
        points, _ = transform_mesh(source)
        source_faces = original_faces(source)
        vertices.extend(points.tolist())
        faces.extend((source_faces + offset).tolist())
        offset += len(points)
    geometry = bpy.data.meshes.new(room_id + '-physical-shell')
    geometry.from_pydata(vertices, [], faces)
    geometry.update()
    if len(geometry.polygons) != sum(mesh['triangles'] for mesh in meshes):
        raise ValueError(f'{room_id}: Blender changed occluder triangle count')
    obj = bpy.data.objects.new(room_id + '-physical-shell', geometry)
    bpy.context.collection.objects.link(obj)
    return obj


def unwrap(obj, size, padding):
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0,
                             area_weight=0, correct_aspect=True, scale_to_bounds=False)
    bpy.ops.uv.average_islands_scale()
    bpy.ops.uv.pack_islands(rotate=True, rotate_method='ANY', scale=True,
                            merge_overlap=False, margin_method='FRACTION',
                            margin=padding / size, shape_method='CONVEX')
    bpy.ops.object.mode_set(mode='OBJECT')


def read_uvs(obj, expected):
    actual = np.empty(len(expected), dtype=np.int32)
    obj.data.loops.foreach_get('vertex_index', actual)
    if not np.array_equal(actual, expected):
        raise ValueError('UV unwrap changed original polygon-corner mapping')
    uv = np.empty((len(expected), 2), dtype=np.float32)
    obj.data.uv_layers.active.data.foreach_get('uv', uv.reshape(-1))
    if not np.isfinite(uv).all() or uv.min() < -1e-6 or uv.max() > 1 + 1e-6:
        raise ValueError('UV unwrap produced non-finite or out-of-atlas coordinates')
    triangles = uv.reshape(-1, 3, 2)
    a, b = triangles[:, 1] - triangles[:, 0], triangles[:, 2] - triangles[:, 0]
    areas = np.abs(a[:, 0] * b[:, 1] - a[:, 1] * b[:, 0]) * .5
    collapsed = int(np.count_nonzero(areas == 0))
    if collapsed:
        raise ValueError(f'UV packing collapsed {collapsed} receiver triangles')
    return uv, {
        'vertices': len(uv), 'triangles': len(triangles),
        'min': float(uv.min()), 'max': float(uv.max()),
        'surfaceAreaFraction': float(areas.sum()),
        'collapsedTriangles': collapsed, 'allOriginalCornersMapped': True,
    }


def configure_cpu(args):
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.samples = args.samples
    scene.cycles.use_adaptive_sampling = False
    scene.cycles.use_denoising = False
    scene.cycles.seed = 37
    scene.render.threads_mode = 'FIXED'
    scene.render.threads = args.threads
    scene.world.light_settings.distance = args.distance
    scene.world.light_settings.ao_factor = 1
    scene.render.bake.use_selected_to_active = False
    scene.render.bake.use_clear = False
    scene.render.bake.margin = args.bake_margin
    scene.render.bake.margin_type = 'EXTEND'
    scene.view_settings.view_transform = 'Standard'
    scene.view_settings.look = 'None'
    scene.view_settings.exposure = 0
    scene.view_settings.gamma = 1
    preferences = bpy.context.preferences.addons['cycles'].preferences
    preferences.compute_device_type = 'NONE'


def bake_image(obj, room_id, args):
    image = bpy.data.images.new(room_id + '-ao', width=args.size, height=args.size,
                                alpha=False, float_buffer=False)
    image.generated_color = (1, 1, 1, 1)
    image.colorspace_settings.name = 'Non-Color'
    material = bpy.data.materials.new(room_id + '-ao-bake')
    material.use_nodes = True
    nodes = material.node_tree.nodes
    target = nodes.new('ShaderNodeTexImage')
    target.image = image
    nodes.active = target
    obj.data.materials.append(material)
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    started = time.perf_counter()
    bpy.ops.object.bake(type='AO')
    seconds = time.perf_counter() - started
    pixels = np.empty(args.size * args.size * 4, dtype=np.float32)
    image.pixels.foreach_get(pixels)
    red = pixels.reshape(-1, 4)[:, 0]
    if not np.isfinite(pixels).all() or red.min() < -1e-6 or red.max() > 1 + 1e-6:
        raise ValueError(f'{room_id}: invalid AO pixel range')
    if red.min() > .98 or red.max() < .99:
        raise ValueError(f'{room_id}: AO lacks both occluded and white unoccluded texels')
    stats = {
        'min': float(red.min()), 'max': float(red.max()), 'mean': float(red.mean()),
        'belowHalfFraction': float(np.mean(red < .5)),
        'belowPoint98Fraction': float(np.mean(red < .98)),
        'whiteFraction': float(np.mean(red >= .999)),
    }
    return image, seconds, stats


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('output', type=Path)
    parser.add_argument('--room', choices=['photo', 'bakery'], action='append')
    parser.add_argument('--size', type=int, choices=[1024, 2048], default=2048)
    parser.add_argument('--samples', type=int, choices=[32, 48, 64], default=32)
    parser.add_argument('--distance', type=float, default=1.0)
    parser.add_argument('--threads', type=int, default=min(8, os.cpu_count() or 1))
    parser.add_argument('--padding', type=int, default=6)
    parser.add_argument('--bake-margin', type=int, default=3)
    parser.add_argument('--prepare-only', action='store_true')
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
    source_path, output = args.source.resolve(), args.output.resolve()
    asset_root = (PROJECT / 'assets/shading/rooms').resolve()
    if not source_path.is_relative_to(PROJECT) or output != asset_root:
        raise ValueError('Source must be inside this project; output must be assets/shading/rooms')
    if not output.parent.is_dir():
        raise ValueError('Output parent must already exist')
    if not (0 < args.distance <= 3 and 1 <= args.threads <= 32):
        raise ValueError('AO distance or CPU thread count is outside the bounded bake budget')
    if args.padding < args.bake_margin * 2 or args.padding > 16:
        raise ValueError('UV padding must cover both sides of the bake margin')
    source_bytes = source_path.read_bytes()
    source = json.loads(source_bytes)
    if source['version'] != 1:
        raise ValueError('Unsupported source version')
    for room_id in args.room or ['photo', 'bakery']:
        started = time.perf_counter()
        bpy.ops.wm.read_factory_settings(use_empty=True)
        if bpy.context.scene.world is None:
            bpy.context.scene.world = bpy.data.worlds.new('AO world')
        configure_cpu(args)
        room = source['rooms'][room_id]
        obj, spans, expected = build_receiver(room_id, room['receivers'])
        shell = build_occluders(room_id, room['occluders'])
        imported = time.perf_counter()
        emit('room-imported', room=room_id, vertices=len(expected),
             triangles=len(obj.data.polygons), weldedVertices=len(obj.data.vertices),
             occluderTriangles=len(shell.data.polygons), seconds=round(imported - started, 3))
        unwrap(obj, args.size, args.padding)
        uv, uv_stats = read_uvs(obj, expected)
        unwrapped = time.perf_counter()
        emit('room-uv-verified', room=room_id, seconds=round(unwrapped - imported, 3), **uv_stats)
        if args.prepare_only:
            continue
        emit('room-bake-start', room=room_id, device='CPU', size=args.size,
             samples=args.samples, distance=args.distance, threads=args.threads)
        image, bake_seconds, image_stats = bake_image(obj, room_id, args)
        output.mkdir(exist_ok=True)
        image_path = output / (room_id + '-ao.png')
        uv_path = output / (room_id + '-uv1.bin')
        metadata_path = output / (room_id + '-ao.json')
        image.filepath_raw = str(image_path)
        image.file_format = 'PNG'
        image.save()
        png = image_path.read_bytes()
        if png[:8] != b'\x89PNG\r\n\x1a\n' or struct.unpack('>II', png[16:24]) != (args.size, args.size):
            raise ValueError(f'{room_id}: saved PNG dimensions/signature are invalid')
        uv_bytes = uv.astype('<f4', copy=False).tobytes()
        if len(uv_bytes) != len(expected) * 8:
            raise ValueError(f'{room_id}: UV1 byte count does not match source vertices')
        uv_path.write_bytes(uv_bytes)
        metadata = {
            'version': 1, 'room': room_id, 'signature': room['signature'],
            'source': {**source['source'], 'exportSha256': digest(source_bytes)},
            'tool': {'name': 'Blender', 'version': bpy.app.version_string,
                     'buildHash': bpy.app.build_hash.decode('ascii'),
                     'script': 'tools/bake-room-occlusion.py'},
            'method': 'Cycles AO bake, physical shell and static furnishings, no directional illumination',
            'parameters': {'device': 'CPU', 'size': args.size, 'samples': args.samples,
                           'distance': args.distance, 'threads': args.threads, 'seed': 37,
                           'smartProjectAngleDegrees': 66, 'uvPaddingPixels': args.padding,
                           'bakeMarginPixels': args.bake_margin},
            'ao': {'file': image_path.name, 'sha256': digest(png), 'bytes': len(png),
                   'width': args.size, 'height': args.size, 'colorSpace': 'NoColorSpace',
                   'textureFlipY': True, 'statistics': image_stats},
            'uv1': {'file': uv_path.name, 'sha256': digest(uv_bytes), 'bytes': len(uv_bytes),
                    'encoding': 'float32-le', 'itemSize': 2, 'validation': uv_stats},
            'meshes': [{'meshIndex': mesh['meshIndex'], 'signature': mesh['signature'],
                        'vertices': count, 'uvByteOffset': offset * 8, 'uvByteLength': count * 8}
                       for offset, count, mesh in spans],
            'excluded': room['excluded'],
            'timingsSeconds': {'import': imported - started, 'unwrap': unwrapped - imported,
                              'bake': bake_seconds, 'total': time.perf_counter() - started},
        }
        metadata_path.write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        emit('room-bake-saved', room=room_id, pngBytes=len(png), uvBytes=len(uv_bytes),
             seconds=round(time.perf_counter() - started, 3), pixels=image_stats)


if __name__ == '__main__':
    main()
