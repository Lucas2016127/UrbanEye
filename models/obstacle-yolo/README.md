# Dedicated obstacle model

The browser loads `yolov11best.onnx` from this directory and runs the dedicated
model at `320x320` through ONNX Runtime Web. Its raw output is shaped as
`[1, 4 + classCount, 2100]`; the browser adapter decodes boxes and applies
class-wise NMS.

COCO-SSD Lite is also stored locally under `vendor/tensorflow/coco-ssd/` and
is used when the user selects the fallback or the YOLO model cannot load.

## Train

1. Install dependencies: `python -m pip install ultralytics onnx onnxscript onnxslim`.
2. Put YOLO images and labels under `dataset/images/{train,val}` and
   `dataset/labels/{train,val}`.
3. Run `python train_obstacle_model.py`.
4. Export with `imgsz=320` and copy the exported ONNX file here as
   `yolov11best.onnx`.

The class order is defined in `obstacle_dataset.yaml` and must not be changed
after annotation without retraining. Collect examples from Hong Kong streets,
including different lighting, camera heights, weather, occlusion, and object
distances. Keep a held-out test set from different streets for evaluation.