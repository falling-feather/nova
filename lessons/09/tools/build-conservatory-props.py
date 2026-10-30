"""Authored mesh library for chapter 9. Blender 5.2, Z-up authoring, glTF Y-up export.

Run: blender --background --factory-startup --python tools/build-conservatory-props.py
Materials are remapped to the chapter's PBR surfaces at runtime. Vertex AO keeps
small seams readable without adding a real-time light to every prop.
"""
from pathlib import Path
import math, random, json
import bpy
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

HERE = Path(__file__).resolve().parent
OUT = HERE.parent / 'public' / 'art' / 'models'
OUT.mkdir(parents=True, exist_ok=True)
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
random.seed(9142)
TAU = math.tau
ASSETS = {}
CURRENT = None

def linear(hexcode):
    h = hexcode.lstrip('#')
    rgb = [int(h[i:i+2], 16)/255 for i in (0,2,4)]
    return tuple(v/12.92 if v <= .04045 else ((v+.055)/1.055)**2.4 for v in rgb)+(1,)

def mat(name, color, roughness=.6, metal=0):
    m = bpy.data.materials.new(name)
    m.diffuse_color = linear(color)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = linear(color)
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metal
    return m

M = {
    'wood': mat('wood', '#ba936a'), 'darkWood': mat('darkWood', '#73553b'),
    'brass': mat('brass', '#b99a61', .35, .8), 'darkBrass': mat('darkBrass', '#71603c', .52, .7),
    'teal': mat('teal', '#426459', .5), 'iron': mat('iron', '#33453e', .6, .7),
    'paper': mat('paper', '#e7dcc0', .95), 'leather': mat('leather', '#395147', .75),
    'terracotta': mat('terracotta', '#b98560', .87), 'porcelain': mat('porcelain', '#ded7c0', .28),
    'linen': mat('linen', '#7c8971', .95), 'soil': mat('soil', '#4d4634', .98),
    'leaf': mat('leaf', '#68874a', .8), 'glow': mat('glow', '#ffcf86', .4),
}
M['glow'].node_tree.nodes.get('Principled BSDF').inputs['Emission Color'].default_value=linear('#ffd396')
M['glow'].node_tree.nodes.get('Principled BSDF').inputs['Emission Strength'].default_value=.5

def asset(name):
    global CURRENT
    CURRENT = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(CURRENT)
    ASSETS[name] = CURRENT
    return CURRENT

def finish(obj, material, bevel=0, smooth=False):
    obj.name = CURRENT.name + '/' + obj.name
    obj.parent = CURRENT
    obj.data.materials.clear()
    obj.data.materials.append(M[material])
    if bevel:
        mod = obj.modifiers.new('Soft manufactured edge', 'BEVEL')
        mod.width = bevel; mod.segments = 3
        mod.harden_normals = True
        normal = obj.modifiers.new('Weighted corner normals', 'WEIGHTED_NORMAL')
        normal.keep_sharp = True
    if smooth:
        for p in obj.data.polygons: p.use_smooth=True
    return obj

def box(name, size, at, material='wood', bevel=.008, rotation=(0,0,0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=at, rotation=rotation)
    obj=bpy.context.object; obj.name=name; obj.scale=size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(obj,material,bevel,True)

def ellipsoid(name, at, scale, material, segments=24):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=12, radius=1, location=at)
    obj=bpy.context.object; obj.name=name; obj.scale=scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(obj,material,0,True)

def lathe(name, profile, material, at=(0,0,0), segments=48):
    vertices=[]; faces=[]
    for r,z in profile:
        for k in range(segments):
            a=k/segments*TAU
            vertices.append((at[0]+math.cos(a)*r,at[1]+math.sin(a)*r,at[2]+z))
    for row in range(len(profile)-1):
        for k in range(segments):
            a=row*segments+k; b=row*segments+(k+1)%segments
            faces.append((a,b,b+segments,a+segments))
    geo=bpy.data.meshes.new(name); geo.from_pydata(vertices,[],faces); geo.update()
    obj=bpy.data.objects.new(name,geo); bpy.context.collection.objects.link(obj)
    return finish(obj,material,0,True)

def tube(name, points, radius, material, resolution=4, radii=None):
    curve=bpy.data.curves.new(name,'CURVE');curve.dimensions='3D'
    curve.resolution_u=8;curve.bevel_depth=radius;curve.bevel_resolution=resolution
    spline=curve.splines.new('POLY');spline.points.add(len(points)-1)
    for i,p in enumerate(points):
        spline.points[i].co=tuple(p)+(1,)
        if radii:spline.points[i].radius=radii[i]
    obj=bpy.data.objects.new(name,curve);bpy.context.collection.objects.link(obj)
    bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
    bpy.ops.object.convert(target='MESH')
    return finish(bpy.context.object,material,0,True)

def ring(name, radius, height, thickness, material, at=(0,0)):
    return tube(name,[(at[0]+math.cos(i/64*TAU)*radius,at[1]+math.sin(i/64*TAU)*radius,height) for i in range(65)],thickness,material,3)

def branch(name, a, b, radius, material):
    delta=Vector(b)-Vector(a)
    bpy.ops.mesh.primitive_cone_add(vertices=16,radius1=radius,radius2=radius*.72,depth=delta.length,location=(Vector(a)+Vector(b))*.5)
    obj=bpy.context.object;obj.name=name;obj.rotation_euler=delta.to_track_quat('Z','Y').to_euler()
    return finish(obj,material,.003,True)

def leaf(name, start, end, width=.1, material='leaf'):
    direction=Vector(end)-Vector(start)
    axis=direction.normalized(); across=axis.cross(Vector((0,0,1)))
    if across.length<.01:across=Vector((1,0,0))
    across.normalize(); vertices=[];faces=[]
    for row in range(9):
        t=row/8;center=Vector(start)+direction*t+Vector((0,0,math.sin(t*math.pi)*width*.4))
        for side in [-1,0,1]:
            p=center+across*(side*math.sin(math.pi*t)*width)
            p.z-=side*side*math.sin(math.pi*t)*width*.22
            vertices.append(p)
    for row in range(8):
        for side in range(2):
            a=row*3+side;faces.append((a,a+1,a+4,a+3))
    geo=bpy.data.meshes.new(name);geo.from_pydata(vertices,[],faces);geo.update()
    obj=bpy.data.objects.new(name,geo);bpy.context.collection.objects.link(obj)
    return finish(obj,material,0,True)

def book(at, size=(.28,.39,.07), material='leather', tilt=0):
    x,y,z=at;w,d,h=size
    box('Page block',(w-.018,d-.014,h),(x,y,z+h*.5),'paper',.006)
    for dz in [0,h]:box('Book cover',(w,d,.012),(x,y,z+dz),material,.006)
    box('Rounded spine',(.025,d,h+.014),(x-w*.5,y,z+h*.5),material,.01)
    for k in range(6):box('Page edges',(w-.016,d-.012,.001),(x,y,z+.008+k*(h-.016)/6),'paper',0)
    for yoff in [-.13,0,.13]:box('Spine binding',(.027,.012,h+.016),(x-w*.5,y+yoff*d/.39,z+h*.5),'brass',.003)

# A metal watering can with a swept handle, rolled seams and drilled rose.
asset('watering-can')
lathe('Pressed copper body',[(0,0),(.17,0),(.185,.025),(.175,.31),(.145,.34),(.10,.34),(.10,.325),(.14,.32),(.16,.30)],'teal')
ring('Foot seam',.176,.022,.008,'brass');ring('Shoulder seam',.159,.317,.007,'brass')
tube('Top handle',[(-.14*math.cos(i/24*math.pi),0,.32+.18*math.sin(i/24*math.pi)) for i in range(25)],.012,'darkBrass')
tube('Rear handle',[(0,-.15-.15*math.sin(i/32*math.pi),.05+i/32*.26) for i in range(33)],.015,'brass')
tube('Swept spout',[(0,.12+.37*t,.09+.12*t+.22*t*t) for t in [i/24 for i in range(25)]],.047,'teal',4,[1-.48*i/24 for i in range(25)])
rose=lathe('Watering rose',[(.018,0),(.04,.025),(.08,.04),(.085,.055),(.077,.06),(.015,.06)],'brass')
rose.location=(0,.49,.43);rose.rotation_euler=(math.pi*.25,0,0)
for k in range(12):
    a=k/12*TAU
    ellipsoid('Rose hole',(math.cos(a)*.058,.49+math.sin(a)*.04,.48+math.sin(a)*.04),(.007,.006,.004),'iron',12)

asset('desk-bell')
lathe('Bell foot',[(0,0),(.13,0),(.14,.018),(.13,.035),(.09,.05),(.03,.05)],'darkWood')
lathe('Bell shell',[(.115,.04),(.118,.065),(.10,.085),(.08,.12),(.055,.155),(.025,.165),(.015,.165)],'brass')
lathe('Bell plunger',[(.014,.15),(.014,.20),(.034,.20),(.035,.212),(.025,.22),(0,.22)],'brass')
ring('Bell base bead',.12,.052,.004,'darkBrass')

asset('hanging-basket')
lathe('Woven basket base',[(0,0),(.16,0),(.22,.05),(.28,.22),(.29,.25),(.26,.26),(.245,.23),(.18,.03)],'darkWood',segments=64)
for k in range(16):
    a=k/16*TAU
    tube('Wicker upright',[(math.cos(a)*(.17+.11*t),math.sin(a)*(.17+.11*t),t*.25) for t in [i/16 for i in range(17)]],.006,'wood',2)
for k in range(12):
    z=.025+k*.019;r=.17+z/.25*.11
    tube('Interlaced wicker',[(math.cos(a)*(r+.004*math.sin(a*16)),math.sin(a)*(r+.004*math.sin(a*16)),z) for a in [i/96*TAU for i in range(97)]],.0055,'wood',2)
lathe('Soil',[(0,.235),(.25,.235)],'soil')
ring('Rolled basket rim',.282,.255,.015,'wood')
for k in range(3):
    a=k/3*TAU
    tube('Hanging cord',[(math.cos(a)*.27,math.sin(a)*.27,.25),(math.cos(a)*.12,math.sin(a)*.12,.66),(0,0,.9)],.008,'linen',2)
for k in range(9):
    a=k*2.39996
    points=[]
    for j in range(16):
        t=j/15;reach=.08+t*.37
        points.append((math.cos(a)*reach,math.sin(a)*reach,.26+.12*math.sin(t*math.pi)-.55*t*t))
    tube('Trailing stem',points,.004,'leaf',2)
    for j in range(2,15,2):
        start=points[j];angle=a+(-1 if j%4 else 1)*1.2
        end=(start[0]+math.cos(angle)*.17,start[1]+math.sin(angle)*.17,start[2]-.035)
        leaf('Trailing heart leaf',start,end,.055)

asset('pendant-lamp')
lathe('Enamel shade',[(.28,0),(.29,.018),(.245,.05),(.17,.14),(.075,.22),(.045,.23),(.035,.22),(.07,.205),(.16,.125),(.235,.035),(.28,0)],'teal',segments=64)
ring('Shade rim',.283,.012,.008,'brass')
lathe('Lamp cap',[(.045,.20),(.06,.22),(.05,.26),(.018,.29),(.018,.33)],'brass')
ellipsoid('Warm bulb',(0,0,.05),(.065,.065,.09),'glow')
tube('Braided cord',[(0,0,.32),(0,0,.85)],.009,'iron',3)

asset('garden-stool')
lathe('Round wooden seat',[(0,.56),(.26,.56),(.28,.575),(.28,.61),(.26,.625),(0,.625)],'wood')
for k in range(4):
    a=math.pi/4+k*math.pi/2
    branch('Splayed leg',(math.cos(a)*.25,math.sin(a)*.25,.025),(math.cos(a)*.19,math.sin(a)*.19,.57),.032,'darkWood')
    b=a+math.pi/2
    branch('Seat stretcher',(math.cos(a)*.23,math.sin(a)*.23,.2),(math.cos(b)*.23,math.sin(b)*.23,.2),.018,'wood')

asset('books-stack')
book((0,0,.012),(.36,.48,.1),'leather')
book((.035,-.02,.13),(.31,.43,.065),'linen')
book((-.015,.02,.21),(.34,.46,.08),'darkWood')

asset('specimen-tray')
box('Tray floor',(.68,.46,.035),(0,0,.018),'wood',.012)
for x in [-.335,.335]:box('Dovetailed side',(.035,.49,.12),(x,0,.067),'darkWood',.008)
for y in [-.225,.225]:box('Tray end',(.65,.035,.12),(0,y,.067),'wood',.008)
for x in [-.11,.11]:box('Inner divider',(.012,.43,.08),(x,0,.06),'wood',.003)
box('Inner divider',(.65,.012,.08),(0,0,.06),'wood',.003)
for k in range(6):
    x=(k%3-1)*.22;y=(-1 if k<3 else 1)*.105
    box('Cotton card',(.19,.18,.003),(x,y,.039),'paper',.001)
    leaf('Specimen leaf',(x-.035,y-.055,.045),(x+.03,y+.055,.047),.025)
    branch('Pressed stem',(x-.02,y-.065,.046),(x+.02,y+.055,.048),.0018,'darkWood')

asset('writing-set')
box('Blotter',(.58,.4,.012),(0,0,.007),'leather',.018)
for x in [-.255,.255]:box('Blotter brass corner',(.07,.06,.014),(x,-.164,.009),'brass',.006)
lathe('Ink bottle',[(0,0),(.04,0),(.046,.015),(.046,.08),(.025,.1),(.025,.12),(0,.12)],'teal',(.16,.09,.014),32)
lathe('Ink stopper',[(0,.12),(.03,.12),(.03,.137),(0,.137)],'brass',(.16,.09,.014),32)
branch('Pen shaft',(-.21,-.09,.025),(.19,-.04,.025),.005,'darkWood')
branch('Pen nib',(.19,-.04,.025),(.235,-.034,.025),.004,'brass')
for i in range(4):box('Loose note',(.25,.21,.0015),(-.095,.04,.014+i*.002),'paper',.001,rotation=(0,0,.04*i))

asset('seed-crate')
for k in range(5):box('Crate floor slat',(.11,.43,.025),(-.24+k*.12,0,.018),'wood',.004)
for sign in [-1,1]:
    for k in range(3):box('Crate long slat',(.62,.025,.065),(0,sign*.22,.07+k*.08),'wood',.006)
    for k in range(3):box('Crate end slat',(.025,.43,.065),(sign*.30,0,.07+k*.08),'darkWood',.005)
    for other in [-1,1]:box('Crate corner',(.045,.045,.31),(sign*.285,other*.205,.16),'wood',.006)
for i in range(5):
    lathe('Seedling pot',[(0,0),(.045,0),(.055,.08),(.06,.09),(.049,.095),(.04,.02)],'terracotta',(-.23+i*.115,0,.045),24)
    leaf('Seedling',(-.23+i*.115,0,.13),(-.2+i*.115,.05,.23),.03)

asset('ceramic-planter')
lathe('Glazed stoneware',[(0,0),(.22,0),(.25,.04),(.29,.39),(.30,.44),(.28,.46),(.25,.43),(.24,.39),(.19,.045)],'porcelain',segments=64)
for z in [.06,.1,.4]:ring('Incised band',.25+(z-.04)/.35*.04,z,.0035,'brass')
lathe('Dark potting soil',[(0,.41),(.25,.41)],'soil')
for k in range(8):
    a=k*2.39996;start=(0,0,.42);end=(math.cos(a)*(.32+random.random()*.15),math.sin(a)*(.32+random.random()*.15),.68+random.random()*.3)
    branch('Plant petiole',start,end,.005,'leaf')
    leaf('Broad leaf',end,(end[0]+math.cos(a)*.25,end[1]+math.sin(a)*.25,end[2]-.1),.10)

asset('botanical-press')
box('Press lower board',(.45,.55,.035),(0,0,.022),'wood',.012)
for i in range(12):box('Press blotting paper',(.405,.505,.005),(0,0,.048+i*.006),'paper',.001)
box('Press upper board',(.45,.55,.035),(0,0,.139),'wood',.012)
for x in [-.19,.19]:
    for y in [-.235,.235]:
        branch('Threaded press rod',(x,y,.01),(x,y,.22),.006,'brass')
        ellipsoid('Wing nut',(x,y,.19),(.031,.012,.009),'brass',16)

print('PROPS_MODELED', list(ASSETS), flush=True)

# Resolve the bevel geometry before exporting; UVs are in metres, not stretched per box.
bpy.context.view_layer.update()
depsgraph=bpy.context.evaluated_depsgraph_get()
for root in ASSETS.values():
    for obj in list(root.children):
        if obj.type!='MESH':continue
        if obj.modifiers:
            obj.data=bpy.data.meshes.new_from_object(obj.evaluated_get(depsgraph),preserve_all_data_layers=True,depsgraph=depsgraph)
            obj.modifiers.clear()
        uv=obj.data.uv_layers.new(name='Material metres')
        for face in obj.data.polygons:
            n=obj.matrix_world.to_3x3()@face.normal
            axis=max(range(3),key=lambda i:abs(n[i]))
            for loop_id in face.loop_indices:
                v=obj.matrix_world@obj.data.vertices[obj.data.loops[loop_id].vertex_index].co
                uv.data[loop_id].uv=(v.x,v.y) if axis==2 else (v.x,v.z) if axis==1 else (v.y,v.z)

def bake_contact(root):
    objects=[o for o in root.children if o.type=='MESH']
    vertices=[];faces=[]
    for obj in objects:
        start=len(vertices)
        vertices.extend([obj.matrix_world@v.co for v in obj.data.vertices])
        faces.extend([tuple(start+i for i in p.vertices) for p in obj.data.polygons])
    bvh=BVHTree.FromPolygons(vertices,faces)
    for obj in objects:
        ao=obj.data.color_attributes.new(name='AO',type='FLOAT_COLOR',domain='CORNER')
        cache={}
        for vertex in obj.data.vertices:
            p=obj.matrix_world@vertex.co
            normal=(obj.matrix_world.to_3x3()@vertex.normal).normalized()
            tangent=normal.cross(Vector((0,0,1)))
            if tangent.length<.01:tangent=normal.cross(Vector((1,0,0)))
            tangent.normalize();bitangent=normal.cross(tangent).normalized()
            occlusion=0
            for i in range(12):
                a=i*2.39996;up=math.sqrt((i+.5)/12);reach=math.sqrt(1-up*up)
                ray=(normal*up+tangent*(math.cos(a)*reach)+bitangent*(math.sin(a)*reach)).normalized()
                hit,_,_,distance=bvh.ray_cast(p+normal*.0015,ray,.19)
                if hit is not None:occlusion+=1-distance/.19
            cache[vertex.index]=1-min(.3,occlusion/12*.38)
        for i,loop in enumerate(obj.data.loops):
            a=cache[loop.vertex_index];ao.data[i].color=(a,a,a,1)
        obj.data.color_attributes.active_color=ao
    # Merge each material in the prop, retaining named roots for placement.
    groups={}
    for obj in objects:groups.setdefault(obj.data.materials[0].name,[]).append(obj)
    for name,items in groups.items():
        bpy.ops.object.select_all(action='DESELECT')
        for obj in items:obj.select_set(True)
        bpy.context.view_layer.objects.active=items[0]
        if len(items)>1:bpy.ops.object.join()
        bpy.context.object.name=root.name+'/'+name
    print('PROP_BAKED',root.name,len(vertices),'vertices',flush=True)

for root in ASSETS.values():bake_contact(root)

# An editable source library is laid out for inspection; the web loader zeroes root translations.
for i,root in enumerate(ASSETS.values()):root.location=((i%4)*1.5,(i//4)*1.5,0)
bpy.context.scene.unit_settings.system='METRIC'
bpy.context.scene.world.color=(.15,.15,.15)
bpy.ops.wm.save_as_mainfile(filepath=str(HERE/'conservatory-props.blend'))
bpy.ops.object.select_all(action='DESELECT')
for root in ASSETS.values():
    root.select_set(True)
    for child in root.children:child.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'conservatory-props.glb'),export_format='GLB',use_selection=True,export_apply=True,export_animations=False,export_vertex_color='NAME',export_vertex_color_name='AO',export_all_vertex_colors=False)
manifest={'tool':'Blender 5.2.3','source':'tools/build-conservatory-props.py','assets':list(ASSETS),'technique':'Original beveled meshes, metre UVs, hemispherical vertex-contact bake; runtime PBR material assignment.'}
(OUT/'provenance.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
print('PROPS_EXPORTED',OUT/'conservatory-props.glb',flush=True)
