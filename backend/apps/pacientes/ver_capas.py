import tensorflow as tf
import json
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "modelos", "retinopathy_model.keras")
GRADCAM_MODEL_PATH = os.path.join(BASE_DIR, "modelos", "retinopathy_model_gradcam.keras")
METADATA_PATH = os.path.join(BASE_DIR, "modelos", "retinopathy_model_metadata.json")

print("=== ANÁLISIS DEL NUEVO MODELO DE RETINOPATÍA ===\n")

# Cargar metadata
if os.path.exists(METADATA_PATH):
    with open(METADATA_PATH, 'r', encoding='utf-8') as f:
        metadata = json.load(f)
    print("📋 METADATA DEL MODELO:")
    for key, value in metadata.items():
        print(f"  {key}: {value}")
    print()

# Cargar y analizar modelo principal
if os.path.exists(MODEL_PATH):
    print("🔍 CAPAS DEL MODELO PRINCIPAL:")
    model = tf.keras.models.load_model(MODEL_PATH)
    
    for i, layer in enumerate(model.layers):
        print(f"  {i:2d}: {layer.name:<20} – {layer.__class__.__name__}")
    
    print(f"\n📊 Input shape: {model.input_shape}")
    print(f"📊 Output shape: {model.output_shape}")
    print()

# Cargar y analizar modelo GradCAM
if os.path.exists(GRADCAM_MODEL_PATH):
    print("🎯 CAPAS DEL MODELO GRADCAM:")
    gradcam_model = tf.keras.models.load_model(GRADCAM_MODEL_PATH)
    
    for i, layer in enumerate(gradcam_model.layers):
        layer_type = layer.__class__.__name__
        if 'conv' in layer.name.lower() or 'Conv' in layer_type:
            print(f"  {i:2d}: {layer.name:<20} – {layer_type} ⭐ (Conv)")
        else:
            print(f"  {i:2d}: {layer.name:<20} – {layer_type}")
    
    print(f"\n📊 Input shape: {gradcam_model.input_shape}")
    print(f"📊 Output shape: {gradcam_model.output_shape}")
    
    # Verificar capa GradCAM
    gradcam_metadata_path = os.path.join(BASE_DIR, "modelos", "retinopathy_model_gradcam_metadata.json")
    if os.path.exists(gradcam_metadata_path):
        with open(gradcam_metadata_path, 'r') as f:
            gradcam_meta = json.load(f)
        target_layer = gradcam_meta.get('gradcam_layer', 'conv2d_2')
        try:
            layer = gradcam_model.get_layer(target_layer)
            print(f"\n✅ Capa GradCAM '{target_layer}' encontrada:")
            print(f"   Tipo: {layer.__class__.__name__}")
            print(f"   Output shape: {layer.output_shape}")
        except:
            print(f"\n❌ Capa GradCAM '{target_layer}' NO encontrada")

print("\n=== ANÁLISIS COMPLETADO ===")
