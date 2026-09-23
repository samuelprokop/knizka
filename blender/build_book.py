"""
Procedurálna 3D animácia knihy pre hero video.
Spustenie (headless): blender --background --python blender/build_book.py

Presne kontrolovaná verzia predtým, než sa to nechávalo na odhad
generatívneho video modelu: presná farba (FF661A), presné poradie
(obálka -> strana 1 -> strana 2 -> zatvorenie), bez textu/log.
"""

import bpy
import math


def srgb_to_linear(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def hex_to_linear_rgba(hex_str):
    hex_str = hex_str.lstrip("#")
    r, g, b = (int(hex_str[i:i + 2], 16) / 255 for i in (0, 2, 4))
    return (srgb_to_linear(r), srgb_to_linear(g), srgb_to_linear(b), 1.0)


FPS = 24
W = 2.0          # šírka knihy (X)
H = 2.6          # výška knihy (Z)
PAGE_LEN = 1.9   # strany o čosi užšie ako obálka
PAGE_TOP = 2.55
PAGE_BOT = 0.05

# Hodnoty sú skutočné hex kódy prevedené do lineárneho farebného
# priestoru (Blender berie color inputy ako lineárne, nie sRGB) -
# takto sedí render presne na hex, nie na odhad.
ORANGE = hex_to_linear_rgba("FF661A")
ORANGE_DARK = hex_to_linear_rgba("5C2E0D")
CREAM = hex_to_linear_rgba("FBF4E8")
GROUND = hex_to_linear_rgba("CDBFA8")


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for block_collection in (bpy.data.meshes, bpy.data.materials, bpy.data.lights, bpy.data.cameras):
        for block in list(block_collection):
            if block.users == 0:
                block_collection.remove(block)


def make_material(name, color, roughness=0.6):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Roughness"].default_value = roughness
    if "Specular IOR Level" in bsdf.inputs:
        bsdf.inputs["Specular IOR Level"].default_value = 0.0
    # Emisná zložka drží farbu presne pri hex hodnote nezávisle od
    # kalibrácie svetiel - svetlá potom už len modelujú tvar/tiene.
    if "Emission Color" in bsdf.inputs:
        bsdf.inputs["Emission Color"].default_value = color
        bsdf.inputs["Emission Strength"].default_value = 0.6
    return mat


def add_box(name, x0, x1, y0, y1, z0, z1, material):
    bpy.ops.mesh.primitive_cube_add()
    obj = bpy.context.active_object
    obj.name = name
    cx, cy, cz = (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2
    sx, sy, sz = (x1 - x0) / 2, (y1 - y0) / 2, (z1 - z0) / 2
    obj.location = (cx, cy, cz)
    obj.scale = (sx, sy, sz)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.location = (cx, cy, cz)
    obj.data.materials.append(material)
    return obj


def add_hinge_empty(name, y):
    bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0, y, H / 2))
    empty = bpy.context.active_object
    empty.name = name
    empty.empty_display_size = 0.2
    return empty


def parent_to_hinge(obj, hinge):
    obj.parent = hinge
    obj.matrix_parent_inverse = hinge.matrix_world.inverted()


def key_rotation(hinge, frame, degrees):
    hinge.rotation_euler.z = math.radians(degrees)
    hinge.keyframe_insert(data_path="rotation_euler", index=2, frame=frame)


def ease(hinge):
    # Blender 5.x presunul fcurves pod vrstvený Action model (action.layers[...]
    # .strips[...].channelbag(...).fcurves); namiesto lámania sa cez novú
    # štruktúru nastavujeme bezier interpoláciu ako default pred vkladaním
    # keyframe-ov (viď set_default_interpolation()), takže tu netreba nič robiť.
    pass


def build():
    clear_scene()
    scene = bpy.context.scene
    scene.render.fps = FPS
    scene.frame_start = 1
    scene.frame_end = 264
    scene.view_settings.view_transform = "Standard"  # presné farby, bez AgX posunu
    bpy.context.preferences.edit.keyframe_new_interpolation_type = "BEZIER"

    mat_orange = make_material("Orange", ORANGE, roughness=0.35)
    mat_orange_dark = make_material("OrangeDark", ORANGE_DARK, roughness=0.5)
    mat_cream = make_material("Cream", CREAM, roughness=0.75)
    mat_ground = make_material("Ground", GROUND, roughness=0.9)

    # zem (tienidlo pod knihou); pozadie rieši world background nižšie
    bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 5, 0))
    ground = bpy.context.active_object
    ground.name = "Ground"
    ground.data.materials.append(mat_ground)

    # chrbát (statický)
    add_box("Spine", -0.04, 0, 0, 0.28, 0, H, mat_orange_dark)
    # zadná obálka (statická)
    add_box("BackCover", 0, W, 0, 0.02, 0, H, mat_orange)
    # blok vnútorných strán (statický - "zvyšok knihy")
    add_box("PagesBlock", 0, PAGE_LEN, 0.02, 0.22, PAGE_BOT, PAGE_TOP, mat_cream)

    # strana 2 (animovaná, otvára sa druhá)
    page2 = add_box("Page2", 0, PAGE_LEN, 0.22, 0.24, PAGE_BOT, PAGE_TOP, mat_cream)
    hinge_page2 = add_hinge_empty("HingePage2", 0.23)
    parent_to_hinge(page2, hinge_page2)

    # strana 1 (animovaná, otvára sa prvá spomedzi strán)
    page1 = add_box("Page1", 0, PAGE_LEN, 0.24, 0.26, PAGE_BOT, PAGE_TOP, mat_cream)
    hinge_page1 = add_hinge_empty("HingePage1", 0.25)
    parent_to_hinge(page1, hinge_page1)

    # predná obálka (animovaná, otvára sa úplne prvá)
    cover = add_box("FrontCover", 0, W, 0.26, 0.28, 0, H, mat_orange)
    hinge_cover = add_hinge_empty("HingeCover", 0.27)
    parent_to_hinge(cover, hinge_cover)

    # --- animácia otáčania (v tomto poradí: obálka, str.1, str.2, potom naspäť) ---
    OPEN_ANGLE = -165

    key_rotation(hinge_cover, 1, 0)
    key_rotation(hinge_cover, 48, 0)
    key_rotation(hinge_cover, 72, OPEN_ANGLE)

    key_rotation(hinge_page1, 1, 0)
    key_rotation(hinge_page1, 84, 0)
    key_rotation(hinge_page1, 120, OPEN_ANGLE)

    key_rotation(hinge_page2, 1, 0)
    key_rotation(hinge_page2, 132, 0)
    key_rotation(hinge_page2, 168, OPEN_ANGLE)

    # zatváranie: strana 2 -> strana 1 -> obálka (fyzicky správne poradie)
    key_rotation(hinge_page2, 180, OPEN_ANGLE)
    key_rotation(hinge_page2, 192, 0)

    key_rotation(hinge_page1, 192, OPEN_ANGLE)
    key_rotation(hinge_page1, 204, 0)

    key_rotation(hinge_cover, 204, OPEN_ANGLE)
    key_rotation(hinge_cover, 240, 0)
    key_rotation(hinge_cover, 264, 0)

    for h in (hinge_cover, hinge_page1, hinge_page2):
        ease(h)

    # --- kamera: pomalý nájazd, mieri na stred knihy cez Track To ---
    bpy.ops.object.empty_add(type="PLAIN_AXES", location=(W / 2, 0.15, H / 2))
    target = bpy.context.active_object
    target.name = "CameraTarget"

    # Mierny 3/4 uhol (nie čisto spredu) - inak sú prázdne strany voči
    # sebe na plochom zábere nerozoznateľné a otáčanie nie je vidno.
    CAM_X_OFFSET = 2.2
    CAM_WIDE = 9.0
    CAM_CLOSE = 6.0
    bpy.ops.object.camera_add(location=(W / 2 + CAM_X_OFFSET, CAM_WIDE, H / 2 + 0.15))
    camera = bpy.context.active_object
    camera.name = "MainCamera"
    camera.data.lens = 40
    constraint = camera.constraints.new(type="TRACK_TO")
    constraint.target = target
    constraint.track_axis = "TRACK_NEGATIVE_Z"
    constraint.up_axis = "UP_Y"
    scene.camera = camera

    camera.location = (W / 2 + CAM_X_OFFSET, CAM_WIDE, H / 2 + 0.15)
    camera.keyframe_insert(data_path="location", frame=1)
    camera.location = (W / 2 + CAM_X_OFFSET, CAM_WIDE, H / 2 + 0.15)
    camera.keyframe_insert(data_path="location", frame=12)
    camera.location = (W / 2 + CAM_X_OFFSET, CAM_CLOSE, H / 2 + 0.05)
    camera.keyframe_insert(data_path="location", frame=60)
    camera.location = (W / 2 + CAM_X_OFFSET, CAM_CLOSE, H / 2 + 0.05)
    camera.keyframe_insert(data_path="location", frame=264)
    ease(camera)

    # --- svetlá (studio) ---
    bpy.ops.object.light_add(type="AREA", location=(2.5, -1.5, 3.2))
    key_light = bpy.context.active_object
    key_light.name = "KeyLight"
    key_light.data.energy = 1400
    key_light.data.size = 2.5
    key_light.data.color = (1.0, 1.0, 1.0)

    bpy.ops.object.light_add(type="AREA", location=(-2.2, -0.8, 2.0))
    fill_light = bpy.context.active_object
    fill_light.name = "FillLight"
    fill_light.data.energy = 500
    fill_light.data.size = 3.0
    fill_light.data.color = (1.0, 1.0, 1.0)

    bpy.ops.object.light_add(type="AREA", location=(1.0, 2.5, 3.5))
    rim_light = bpy.context.active_object
    rim_light.name = "RimLight"
    rim_light.data.energy = 400
    rim_light.data.size = 2.0
    rim_light.rotation_euler = (math.radians(180), 0, 0)

    world = bpy.data.worlds.new("Studio")
    world.use_nodes = True
    bg = world.node_tree.nodes["Background"]
    bg.inputs["Color"].default_value = (0.9, 0.87, 0.82, 1.0)
    bg.inputs["Strength"].default_value = 0.15
    scene.world = world

    # --- render nastavenia ---
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1920
    scene.render.resolution_y = 1080
    scene.render.resolution_percentage = 100
    scene.eevee.taa_render_samples = 64

    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGB"
    scene.render.filepath = "/Users/samuelprokop/Desktop/knizka/blender/renders/seq/frame_"

    bpy.ops.wm.save_as_mainfile(filepath="/Users/samuelprokop/Desktop/knizka/blender/book.blend")
    print("SCENE_BUILD_OK")


build()
