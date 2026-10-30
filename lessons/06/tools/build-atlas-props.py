"""Authored Blender sources for the atlas's independent UI props.

Run with Blender --background --factory-startup --python this_file.
Each object has an isolated transparent render; no interface screenshot is used.
"""
from pathlib import Path
import math, random, json
import bpy
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / 'shared' / 'neural' / 'atlas-art'
OUT.mkdir(exist_ok=True)
random.seed(61)
bpy.context.preferences.filepaths.save_version=0

def rgba(hexcode):
    h=hexcode.lstrip('#'); values=[int(h[i:i+2],16)/255 for i in (0,2,4)]
    return tuple(((v+.055)/1.055)**2.4 if v>.04045 else v/12.92 for v in values)+(1,)

def material(name,color,rough=.6,metal=0,texture=None):
    m=bpy.data.materials.new(name);m.diffuse_color=rgba(color);m.use_nodes=True
    n=m.node_tree.nodes;p=n.get('Principled BSDF');p.inputs['Base Color'].default_value=rgba(color)
    p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
    tex=n.new('ShaderNodeTexNoise');tex.inputs['Scale'].default_value=65;tex.inputs['Detail'].default_value=3
    bump=n.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.035 if metal else .14;bump.inputs['Distance'].default_value=.0015 if metal else .009
    m.node_tree.links.new(tex.outputs['Fac'],bump.inputs['Height']);m.node_tree.links.new(bump.outputs['Normal'],p.inputs['Normal'])
    if texture:
        image=n.new('ShaderNodeTexImage');image.image=bpy.data.images.load(str(texture),check_existing=True)
        image.projection='BOX';image.projection_blend=.12
        coord=n.new('ShaderNodeTexCoord');mapping=n.new('ShaderNodeMapping')
        mapping.inputs['Scale'].default_value=(1,1,1)
        m.node_tree.links.new(coord.outputs['Generated'],mapping.inputs['Vector']);m.node_tree.links.new(mapping.outputs['Vector'],image.inputs['Vector'])
        tint=n.new('ShaderNodeMixRGB');tint.blend_type='MULTIPLY';tint.inputs[0].default_value=.65;tint.inputs[2].default_value=rgba(color)
        m.node_tree.links.new(image.outputs['Color'],tint.inputs[1]);m.node_tree.links.new(tint.outputs[0],p.inputs['Base Color'])
    return m

wood=material('Old walnut — visible grain', '#b48a60',.45,0,OUT/'wood-source.png')
wooddark=material('Walnut end grain','#352519',.66)
paper=material('Cotton parchment','#e8d3a6',.95,0,OUT/'paper-source.png')
brass=material('Aged solid brass','#9b712e',.36,.9)
brassdark=material('Recessed brass patina','#5b4d2d',.58,.7)
iron=material('Black iron fittings','#273b36',.38,.7)
ivory=material('Lighthouse chalk paint','#f2ead3',.77)
red=material('Oxide red paint','#9c4128',.5,.08)
stone=material('Weathered limestone','#b7ab8e',.94)
glass=material('Pale glass','#cce3dc',.12,.1)
glass.node_tree.nodes.get('Principled BSDF').inputs['Alpha'].default_value=.26
for link in list(glass.node_tree.links):
    if link.to_socket == glass.node_tree.nodes.get('Principled BSDF').inputs['Normal']:glass.node_tree.links.remove(link)

def new_scene(name,width,height,location,target,scale):
    s=bpy.data.scenes.new(name);bpy.context.window.scene=s
    s.render.engine='CYCLES';s.cycles.samples=48;s.cycles.use_denoising=True
    s.render.resolution_x=width;s.render.resolution_y=height;s.render.resolution_percentage=100
    s.render.image_settings.file_format='PNG';s.render.image_settings.color_mode='RGBA';s.render.film_transparent=True
    s.world=bpy.data.worlds.new(name+' studio');s.world.use_nodes=True
    s.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.7,.78,.82,1)
    s.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.25
    s.view_settings.view_transform='AgX'
    bpy.ops.object.camera_add(location=location);cam=bpy.context.object;cam.name=name+' orthographic camera'
    cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=scale;s.camera=cam
    for p,energy,size in [((-4,-7,7),850,5),((4,-3,1),220,4),((-2,2,5),450,3)]:
        bpy.ops.object.light_add(type='AREA',location=p);light=bpy.context.object;light.data.energy=energy;light.data.shape='DISK';light.data.size=size;light.rotation_euler=(Vector(target)-light.location).to_track_quat('-Z','Y').to_euler()
    return s

def cube(name,loc,scale,mat,bevel=.025):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mat)
    if bevel:
        b=o.modifiers.new('Soft hand-finished edge','BEVEL');b.width=bevel;b.segments=3
        o.modifiers.new('Weighted corner normals','WEIGHTED_NORMAL')
    return o

def cylinder(name,loc,radius,depth,mat,rotation=None,vertices=48):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=radius,depth=depth,location=loc);o=bpy.context.object;o.name=name
    if rotation:o.rotation_euler=rotation
    o.data.materials.append(mat);b=o.modifiers.new('Machined bevel','BEVEL');b.width=min(.01,depth*.15);b.segments=3;o.modifiers.new('Normals','WEIGHTED_NORMAL');return o

def curve(name,points,radius,mat):
    c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.resolution_u=12;c.bevel_depth=radius;c.bevel_resolution=3
    spline=c.splines.new('POLY');spline.points.add(len(points)-1)
    for p,co in zip(spline.points,points):p.co=(*co,1)
    o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);o.data.materials.append(mat);return o

metadata={}
def finish(s,name,landmarks=None):
    if landmarks:
        metadata[name]={}
        for label,obj in landmarks.items():
            points=[world_to_camera_view(s,s.camera,obj.matrix_world@Vector(c)) for c in obj.bound_box]
            metadata[name][label]={'left':min(p.x for p in points),'top':1-max(p.y for p in points),'right':max(p.x for p in points),'bottom':1-min(p.y for p in points)}
    s.render.filepath=str(OUT/(name+'.png'));bpy.ops.render.render(write_still=True)

s=new_scene('Atlas model cabinet',400,1600,(1.05,-16,1.3),(0,0,0),6.2)
cube('Deep walnut carcass',(0,.12,0),(1.10,.34,5.45),wooddark,.035)
cube('Raised lid',(0,-.08,0),(1.01,.12,5.32),wood,.025)
for x in [-.48,.48]:
    cube('Outer moulding',(x,-.17,0),(.075,.09,5.25),wood,.02)
    cube('Inset brass hairline',(x*.86,-.184,0),(.009,.012,5.06),brass,.003)
for z in [-2.60,2.60]:
    cube('End moulding',(0,-.17,z),(.97,.09,.085),wood,.025)
    cube('Inner end moulding',(0,-.15,z*.96),(.82,.05,.025),brassdark,.004)
for z in [-1.7,0,1.7]:
    cube('Hinge',( .525,.0,z),(.10,.25,.23),brassdark,.018)
    cylinder('Hinge pin',(.58,.015,z),.035,.28,brass)
plate=cube('Blank native UI nameplate',(0,-.215,.94),(.63,.045,1.63),brass,.025)
cube('Engraved plate inset',(0,-.241,.94),(.58,.005,1.58),brass,.01)
for x in [-.25,.25]:
    for z in [.22,1.66]:
        cylinder('Plate screw',(x,-.251,z),.024,.012,brassdark,(math.pi/2,0,0),24)
        cube('Screw slot',(x,-.26,z),(.025,.006,.003),iron,.001)
# A handle bent from one solid brass rod, with raised flared feet.
handle_points=[]
for i in range(81):
    t=i/80;handle_points.append((.02,-.26-.16*math.sin(math.pi*t),-2.03+t*.89))
curve('Cast brass handle',handle_points,.04,brass)
for z in [-2.03,-1.14]:
    cylinder('Handle mounting plate',(.02,-.23,z),.085,.025,brass,(math.pi/2,0,0))
for z in [-2.42,2.42]:
    for x in [-.43,.43]:cylinder('Case pin',(x,-.226,z),.014,.009,brass,(math.pi/2,0,0),16)
finish(s,'model-cabinet',{'plaque':plate})

s=new_scene('Parchment route scroll',384,1536,(.3,-16,.5),(0,0,0),6.6)
verts=[];faces=[];nx=24;nz=130
for j in range(nz+1):
    z=-3+j/nz*6
    for i in range(nx+1):
        x=-.67+i/nx*1.34
        if i in [0,nx]:x+=(random.random()-.5)*.035
        depth=.018*math.sin(z*9+i*.17)+.025*math.sin(i*.6)+.09*math.exp(-((z+2.83)/.2)**2)-.1*math.exp(-((z-2.86)/.2)**2)
        verts.append((x,depth,z))
for j in range(nz):
    for i in range(nx):a=j*(nx+1)+i;faces.append((a,a+1,a+nx+2,a+nx+1))
mesh=bpy.data.meshes.new('Ragged cotton fibres mesh');mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new('Unrolled parchment',mesh);bpy.context.collection.objects.link(o);o.data.materials.append(paper)
sol=o.modifiers.new('Paper thickness','SOLIDIFY');sol.thickness=.012
for p in mesh.polygons:p.use_smooth=True
for z in [-3.01,3.01]:
    cylinder('Rolled parchment edge',(0,.055,z),.095,1.42,paper,(0,math.pi/2,0))
    cylinder('Dark roll hollow',(-.715,.055,z),.062,.006,wooddark,(0,math.pi/2,0))
finish(s,'route-scroll')

s=new_scene('Cape lighthouse',512,768,(4,-8,6),(0,0,1.15),3.45)
cylinder('Stone footing',(0,0,.09),.56,.18,stone,vertices=64)
cylinder('Terrace',(0,0,.20),.48,.09,ivory,vertices=64)
bpy.ops.mesh.primitive_cone_add(vertices=64,radius1=.30,radius2=.20,depth=1.65,location=(0,0,1.05));tower=bpy.context.object;tower.name='Tapered plaster tower';tower.data.materials.append(ivory)
for z,r in [(.70,.272),(1.20,.244)]:cylinder('Red navigation band',(0,0,z),r,.16,red,vertices=64)
cube('Door frame',(0,-.289,.38),(.14,.025,.26),wooddark,.025)
for z in [.93,1.49]:cube('Narrow window',(0,-(.28-z*.04),z),(.075,.025,.15),iron,.015)
cylinder('Lantern platform',(0,0,1.91),.36,.08,iron,vertices=64)
cylinder('Lantern glazing',(0,0,2.10),.21,.32,glass,vertices=32)
lightMat=material('Warm lamp','#ffe7a2',.35,.2);cylinder('Lamp',(0,0,2.1),.08,.24,lightMat)
for i in range(12):
    a=i*math.tau/12;cylinder('Balustrade',(math.cos(a)*.33,math.sin(a)*.33,2.03),.008,.20,iron,vertices=8)
for z in [1.98,2.12]:
    curve('Gallery rail',[(math.cos(i*math.tau/96)*.33,math.sin(i*math.tau/96)*.33,z) for i in range(97)],.009,iron)
for i in range(8):
    a=i*math.tau/8;cylinder('Lantern mullion',(math.cos(a)*.212,math.sin(a)*.212,2.1),.012,.33,iron,vertices=8)
bpy.ops.mesh.primitive_cone_add(vertices=64,radius1=.31,radius2=.02,depth=.24,location=(0,0,2.37));bpy.context.object.data.materials.append(red)
cylinder('Finial',(0,0,2.55),.018,.18,brass,vertices=16)
finish(s,'cape-lighthouse')

s=new_scene('Brass map dividers',768,768,(3,-6,9),(0,0,0),3.2)
for direction in [-1,1]:
    points=[(-.11,.8),(.11,.8),(.10,-.65),(.035,-1.25),(-.035,-1.25),(-.10,-.65)]
    angle=direction*.46;vs=[]
    for z in [-.04,.04]:
        for x,y in points:vs.append((x*math.cos(angle)-(y-.78)*math.sin(angle),x*math.sin(angle)+(y-.78)*math.cos(angle)+.78,z))
    fs=[tuple(range(5,-1,-1)),tuple(range(6,12))]+[(i,(i+1)%6,(i+1)%6+6,i+6) for i in range(6)]
    me=bpy.data.meshes.new('Forged leg');me.from_pydata(vs,[],fs);me.update();ob=bpy.data.objects.new('Divider leg',me);bpy.context.collection.objects.link(ob);ob.data.materials.append(brass);b=ob.modifiers.new('Forged bevel','BEVEL');b.width=.025;b.segments=3;ob.modifiers.new('Normals','WEIGHTED_NORMAL')
cylinder('Central pivot',(0,.78,.02),.22,.19,brass);cylinder('Pivot screw',(0,.78,.13),.09,.025,brassdark)
cube('Pivot screw slot',(0,.78,.15),(.12,.025,.01),iron,.003)
curve('Adjustment arc',[(math.sin(a)*.53,.78-math.cos(a)*.53,.03) for a in [-.5+i/50 for i in range(51)]],.028,brassdark)
s.view_settings.exposure=-.7
finish(s,'brass-dividers')

s=new_scene('Coiled mooring line',768,640,(2,-4,7),(0,0,.05),1.65)
ropeM=[material('Hemp strand '+str(i),color,.95) for i,color in enumerate(['#b49b6e','#d6bd8d','#8e7958'])]
for ring in range(4):
    radius=.23+ring*.075
    for strand in range(3):
        points=[]
        for i in range(361):
            a=i*math.tau/360;twist=a*45+strand*math.tau/3;rad=radius+.018*math.cos(twist)
            points.append((math.cos(a)*rad,math.sin(a)*rad,.05+.018*math.sin(twist)+ring*.006))
        curve('Braided coil',points,.013,ropeM[strand])
for strand in range(3):
    points=[]
    for i in range(170):
        t=i/169;tw=t*math.tau*22+strand*math.tau/3
        points.append((.4+.28*t+.018*math.cos(tw),-.12-.44*t,.05+.025*math.sin(t*math.pi)+.018*math.sin(tw)))
    curve('Loose hemp end',points,.013,ropeM[strand])
finish(s,'mooring-rope')

s=new_scene('Brass magnifying glass',640,768,(2,-4,9),(0,-.35,0),2.8)
bpy.ops.mesh.primitive_torus_add(major_radius=.52,minor_radius=.045,major_segments=96,minor_segments=16,location=(0,.24,.05));bpy.context.object.name='Polished double rim';bpy.context.object.data.materials.append(brass)
cylinder('Lens',(0,.24,.05),.49,.024,glass,vertices=96)
curve('Handle neck',[(0,-.28,.05),(0,-.49,.05)],.07,brass)
handle=cylinder('Walnut handle',(0,-.95,.05),.085,.95,wood,(math.pi/2,0,0),48)
for y in [-.51,-1.40]:cylinder('Handle ferrule',(0,y,.05),.094,.09,brass,(math.pi/2,0,0),48)
s.view_settings.exposure=-.55
finish(s,'brass-magnifier')

(OUT/'model-landmarks.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2),encoding='utf8')
bpy.context.window.scene=bpy.data.scenes['Atlas model cabinet']
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'lessons'/'06'/'tools'/'atlas-props.blend'))
print('ATLAS_PROPS_COMPLETE',str(OUT))
