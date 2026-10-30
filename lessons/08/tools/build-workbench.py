"""Authored chapter 08 furniture and interactive props. Blender 5.2+.

Game coordinates in this file are X right / Y up / Z towards the viewer.
The GLB carries geometry and projection anchors; the browser supplies wood grain,
live sand pixels, ruler marks, lighting and interaction. No concept image is baked.
"""
from pathlib import Path
import math, random
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'src' / 'scene' / 'assets'
OUT.mkdir(parents=True, exist_ok=True)
random.seed(808)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.context.preferences.filepaths.save_version = 0

def coord(p): return (p[0], -p[2], p[1])
def mat(name, color, rough=.5, metal=0):
    m=bpy.data.materials.new(name);m.use_nodes=True
    h=color.lstrip('#');rgb=[int(h[i:i+2],16)/255 for i in (0,2,4)]
    linear=[((c+.055)/1.055)**2.4 if c>.04045 else c/12.92 for c in rgb]
    p=m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value=(*linear,1)
    p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
    m.diffuse_color=(*linear,1);return m

oak=mat('oak', '#bd824a',.42)
oaktable=mat('oak_table','#b98048',.48)
inlay=mat('oak_inlay','#e5c18b',.5)
oaklight=mat('oak_light','#deb076',.4)
oakdark=mat('oak_end','#704b2d',.62)
brass=mat('brass','#a47b3f',.3,.7)
teal=mat('teal_enamel','#217c85',.26,.22)
ivory=mat('ivory_ceramic','#fff1d4',.29)
cream=mat('cream_rubber','#f4e6ca',.8)
blue=mat('blue_rubber','#416f9c',.8)
black=mat('face_glass','#071725',.18,.12)
cyan=mat('eye_glow','#64e9ff',.23)
green=mat('leaf_green','#77b944',.52)
stem=mat('stem_green','#4d7d39',.65)
brush=mat('bristle','#a88854',.88)
paper=mat('paper','#f7ecd2',.9)
sand=mat('sand_grain','#dfbd89',.95)
rope=mat('rope','#bba77a',.95)

def group(name, at=(0,0,0), parent=None):
    o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o)
    o.parent=parent;o.location=coord(at);return o

def finish(o,name,material,parent,at):
    o.name=name;o.parent=parent;o.location=coord(at)
    if material:o.data.materials.append(material)
    return o

def box(name,at,size,material,parent=None,bevel=.035):
    bpy.ops.mesh.primitive_cube_add(size=1)
    o=bpy.context.object;o.dimensions=(size[0],size[2],size[1])
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel:
        m=o.modifiers.new('Soft crafted edges','BEVEL');m.width=bevel;m.segments=3
        bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=m.name)
        for p in o.data.polygons:p.use_smooth=True
        n=o.modifiers.new('Weighted face normals','WEIGHTED_NORMAL')
        bpy.ops.object.modifier_apply(modifier=n.name)
    return finish(o,name,material,parent,at)

def ball(name,at,scale,material,parent=None):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32,ring_count=20)
    o=bpy.context.object;o.scale=(scale[0],scale[2],scale[1]);
    for p in o.data.polygons:p.use_smooth=True
    return finish(o,name,material,parent,at)

def cyl(name,at,r,depth,material,parent=None,r2=None):
    bpy.ops.mesh.primitive_cone_add(vertices=48,radius1=r,radius2=r if r2 is None else r2,depth=depth)
    o=bpy.context.object
    for p in o.data.polygons:p.use_smooth=len(p.vertices)==4
    m=o.modifiers.new('Rounded lip','BEVEL');m.width=.018;m.segments=2
    bpy.ops.object.modifier_apply(modifier=m.name)
    return finish(o,name,material,parent,at)

def lathe(name,profile,material,parent=None,at=(0,0,0)):
    verts=[];faces=[];N=64
    for r,y in profile:
        for i in range(N):
            t=2*math.pi*i/N;verts.append((r*math.cos(t),r*math.sin(t),y))
    for j in range(len(profile)-1):
        for i in range(N):faces.append((j*N+i,j*N+(i+1)%N,(j+1)*N+(i+1)%N,(j+1)*N+i))
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
    o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o)
    for p in mesh.polygons:p.use_smooth=True
    return finish(o,name,material,parent,at)

def line(name,points,r,material,parent=None):
    c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.resolution_u=12
    c.bevel_depth=r;c.bevel_resolution=3
    s=c.splines.new('POLY');s.points.add(len(points)-1)
    for p,v in zip(s.points,points):p.co=(*coord(v),1)
    o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);o.parent=parent
    o.data.materials.append(material);return o

def capsule(name,at,width,depth,height,material,parent):
    radius=depth/2;points=[]
    for side in (-1,1):
        for i in range(25):
            t=(-math.pi/2+math.pi*i/24) if side==1 else (math.pi/2+math.pi*i/24)
            points.append((side*(width/2-radius)+radius*math.cos(t),radius*math.sin(t)))
    n=len(points);verts=[(x,-z,y) for y in (-height/2,height/2) for x,z in points]
    faces=[tuple(reversed(range(n))),tuple(range(n,n*2))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
    o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o)
    bevel=o.modifiers.new('Rounded edge','BEVEL');bevel.width=.025;bevel.segments=3
    bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=bevel.name)
    return finish(o,name,material,parent,at)

def face_anchors(prefix,parent,x1,x2,y1,y2,z):
    for n,p in [('tl',(x1,y2,z)),('tr',(x2,y2,z)),('br',(x2,y1,z)),('bl',(x1,y1,z))]:group('anchor_'+prefix+'_'+n,p,parent)

def rounded_face(name,at,w,h,r,material,parent):
    boundary=[]
    for cx,cy,start in [(w/2-r,h/2-r,0),(-w/2+r,h/2-r,90),(-w/2+r,-h/2+r,180),(w/2-r,-h/2+r,270)]:
        for i in range(9):
            t=math.radians(start+i*90/8);boundary.append((cx+r*math.cos(t),cy+r*math.sin(t)))
    mesh=bpy.data.meshes.new(name);mesh.from_pydata([(x,0,y) for x,y in boundary],[],[tuple(range(len(boundary)))]);mesh.update()
    o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);return finish(o,name,material,parent,at)

world=group('workbench')
table=group('table',parent=world)
for i in range(16):
    z=-4.8+i*.78
    plank=box('table_plank_%02d'%i,(0,-.15,z),(21,.28,.754),oaktable,table,.035)
    for x in (-9.7,9.7):
        cyl('table_pin',(x,.003,z-.21),.035,.012,brass,table)
box('table_front',(0,-.42,6.75),(21,.45,.18),oakdark,table,.03)

tray=group('tray',(0,.7,0),world);tray.rotation_euler.x=.16
box('tray_base',(0,.12,0),(8.6,.22,8.15),oakdark,tray,.075)
for x in (-4.15,4.15):
    box('tray_side',(x,.39,0),(.38,.58,8.15),oak,tray,.045)
    box('tray_side_highlight',(x-.075*math.copysign(1,x),.69,0),(.13,.055,8.05),oaklight,tray,.018)
for z in (-3.93,3.93):
    box('tray_cross_rail',(0,.39,z),(8.32,.58,.38),oak,tray,.045)
    box('tray_cross_highlight',(0,.69,z-.07*math.copysign(1,z)),(8.23,.055,.14),oaklight,tray,.018)
    for x in (-3.9,3.9):
        screw=cyl('tray_screw',(x,.43,z+.2*math.copysign(1,z)),.041,.018,brass,tray)
        screw.rotation_euler.x=math.pi/2
box('sand_bed',(0,.265,0),(7.88,.10,7.5),sand,tray,.025)
for n,p in [('tl',(-3.82,.325,-3.65)),('tr',(3.82,.325,-3.65)),('br',(3.82,.325,3.65)),('bl',(-3.82,.325,3.65))]:group('anchor_sand_'+n,p,tray)

cup=group('tool_groove',(-6.65,.02,1.8),world);cup.scale=(1.1,1.1,1.1)
lathe('shell_cup',[(.03,.04),(.36,.04),(.43,.13),(.48,.8),(.53,1.15),(.53,1.25),(.49,1.28),(.46,1.22),(.45,.82),(.38,.17),(.03,.17)],ivory,cup)
for i in range(9):
    t=(i-4)*.22
    line('cup_shell_rib',[(.025*math.sin(t),.42,.48),(.1*math.sin(t),.55,.48),(.2*math.sin(t),.72-.05*abs(i-4),.47)],.012,brass,cup)
for i,(x,z,tilt) in enumerate([(-.21,-.08,-.16),(.05,-.14,.08),(.21,.08,.2),(-.12,.16,-.06)]):
    b=group('brush_%d'%i,(x,.3,z),cup);b.rotation_euler.y=tilt;b.rotation_euler.x=.1*(i-1)
    cyl('brush_wood',(0,.85,0),.045,1.7,oaklight if i!=2 else blue,b,r2=.035)
    cyl('brush_ferrule',(0,1.72,0),.066,.24,brass,b)
    if i==0:
        box('flat_brush_ferrule',(0,1.72,0),(.23,.23,.095),brass,b,.025)
        box('flat_brush_bristles',(0,1.99,0),(.22,.34,.07),brush,b,.025)
        for j in range(11):line('bristle_line',[(j*.019-.095,1.83,.04),(j*.018-.09,2.15,.035)],.003,oakdark,b)
    else:
        cyl('pointed_brush_bristles',(0,1.99,0),.072,.34,brush,b,r2=.012)
        for j in range(7):
            t=j*math.pi*2/7;line('bristle_line',[(.07*math.sin(t),1.84,.07*math.cos(t)),(.014*math.sin(t),2.15,.014*math.cos(t))],.003,oakdark,b)

bucket=group('tool_smooth',(-5.35,.02,-1.0),world)
lathe('metal_bucket',[(.48,.03),(.5,.03),(.69,1.35),(.70,1.42),(.66,1.45),(.64,1.39),(.48,.1)],teal,bucket)
lathe('bucket_rim',[(.68,1.40),(.70,1.43),(.68,1.47),(.65,1.46)],brass,bucket)
cyl('bucket_sand',(0,1.24,0),.64,.06,sand,bucket)
line('bucket_handle',[(math.cos(t)*.73,1.18-math.sin(t)*.63,.22) for t in [i*math.pi/36 for i in range(37)]],.028,brass,bucket)
for x in (-.69,.69):ball('handle_pin',(x,1.17,.12),(.065,.065,.045),brass,bucket)

eraser=group('tool_flatten',(-5.45,.21,3.2),world);eraser.rotation_euler.z=-.18
box('blue_eraser',(-.24,0,0),(.86,.39,.78),blue,eraser,.09)
box('cream_eraser',(.43,0,0),(.48,.39,.78),cream,eraser,.08)

board=group('observation_board',(6.6,.12,.6),world);board.rotation_euler.x=-.12;board.rotation_euler.z=-.10;board.scale=(.88,.88,.88)
box('board_back',(0,1.85,0),(3.52,3.75,.19),oak,board,.11)
box('board_paper',(0,1.85,.108),(3.23,3.43,.035),paper,board,.065)
for x in (-1.56,1.56):
    for y in (.3,3.4):
        b=cyl('board_pin',(x,y,.153),.055,.025,brass,board);b.rotation_euler.x=math.pi/2
face_anchors('paper',board,-1.48,1.48,.4,3.33,.138)

sign=group('task_sign',(-6.2,.16,-3.25),world);sign.rotation_euler.x=-.08;sign.rotation_euler.y=.12;sign.rotation_euler.z=-.08
for y in (.5,1.08,1.66,2.24):box('sign_slat',(0,y,0),(2.3,.56,.13),oaklight,sign,.04)
face_anchors('task',sign,-1.0,1.0,.27,2.45,.08)

ruler=group('ruler',(0,.35,4.65),world);ruler.rotation_euler.x=.6
capsule('ruler_base',(0,0,0),7.25,.86,.27,oak,ruler)
capsule('ruler_inlay',(0,.145,0),6.99,.67,.06,inlay,ruler)
for n,p in [('tl',(-3.3,.182,-.27)),('tr',(3.3,.182,-.27)),('br',(3.3,.182,.27)),('bl',(-3.3,.182,.27))]:group('anchor_ruler_'+n,p,ruler)
knob=group('ruler_knob',(-2.4,.18,0),ruler)
cyl('knob_body',(0,.23,0),.265,.46,oak,knob)
cyl('knob_cap',(0,.47,0),.263,.045,oaklight,knob)
lathe('knob_ring',[(.25,.48),(.27,.485),(.25,.51)],brass,knob)

robot=group('companion',(5.2,.06,-2.7),world);robot.scale=(.78,.78,.78)
body=ball('robot_body',(0,.65,0),(.6,.69,.49),ivory,robot)
for x in (-.6,.6):
    ball('robot_arm',(x,.53,.08),(.19,.41,.21),ivory,robot)
    ball('robot_hand',(x,.29,.24),(.21,.17,.22),teal,robot)
    ball('robot_boot',(x*.6,.13,.22),(.25,.17,.36),teal,robot)
head=group('robot_head',(0,1.7,0),robot)
box('robot_head_shell',(0,0,0),(1.55,1.12,1.05),ivory,head,.31)
rounded_face('robot_face',(0,0,.566),1.24,.79,.2,black,head)
for x in (-.29,.29):line('eye_smile',[(x+.13*math.cos(t),-.05+.13*math.sin(t),.58) for t in [math.pi*i/22 for i in range(23)]],.027,cyan,head)
for x in (-.79,.79):
    ear=cyl('robot_ear',(x,0,0),.22,.08,teal,head);ear.rotation_euler.y=math.pi/2
line('sprout_stem',[(0,.5,0),(0,.78,0),(.03,.96,0)],.035,stem,head)
leaf1=ball('sprout_leaf_left',(-.21,.9,0),(.29,.095,.15),green,head);leaf1.rotation_euler.y=-.6
leaf2=ball('sprout_leaf_right',(.2,1.0,0),(.3,.10,.15),green,head);leaf2.rotation_euler.y=.55
line('leaf_vein_left',[(0,.82,.05),(-.12,.88,.08),(-.36,1.0,.07)],.009,cream,head)
line('leaf_vein_right',[(0,.86,.04),(.17,1.03,.08),(.4,1.1,.05)],.009,cream,head)
badge=cyl('robot_badge',(0,.7,.49),.17,.025,green,robot);badge.rotation_euler.x=math.pi/2
line('badge_sprout',[(0,.6,.52),(0,.79,.52),(-.07,.84,.52)],.014,cream,robot)

rail=group('back_rail',parent=world)
for x in (-9,-6,-3,0,3,6,9):
    box('rail_post',(x,.47,-4.9),(.25,1.05,.29),oak,rail,.05)
    cyl('post_cap',(x,1.02,-4.9),.17,.10,oakdark,rail)
for y in (.4,.82):box('rail_crossbar',(0,y,-4.9),(19,.14,.16),oak,rail,.028)
for x in (-9,-6,6,9):
    line('post_rope',[(x+.18*math.cos(t),.78+t*.012,-4.9+.18*math.sin(t)) for t in [i*math.pi/20 for i in range(121)]],.025,rope,rail)


# Reference render camera stays in the .blend for later edits; runtime uses the same axis convention.
bpy.ops.object.camera_add(location=coord((0,8.8,17)))
camera=bpy.context.object;direction=Vector(coord((0,.4,.2)))-camera.location
camera.rotation_euler=direction.to_track_quat('-Z','Y').to_euler();camera.data.lens=36*direction.length/18
bpy.context.scene.camera=camera
for name,at,energy,size,color in [('Sun',(8,13,-7),1700,5,(1,.84,.62)),('Sky',(-7,9,5),900,8,(.65,.85,1))]:
    bpy.ops.object.light_add(type='AREA',location=coord(at));o=bpy.context.object;o.name=name;o.data.energy=energy;o.data.shape='DISK';o.data.size=size;o.data.color=color
    o.rotation_euler=(Vector((0,0,0))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.context.scene.render.engine='CYCLES';bpy.context.scene.cycles.samples=48
bpy.context.scene.render.resolution_x=1800;bpy.context.scene.render.resolution_y=820;bpy.context.scene.render.resolution_percentage=100
bpy.context.scene.world.color=(.22,.28,.32)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'art-source'/'coastal-workbench.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT/'coastal-workbench.glb'),export_format='GLB',export_cameras=False,export_lights=False,export_apply=True)
print('CH08 authored workbench exported:',OUT/'coastal-workbench.glb')
