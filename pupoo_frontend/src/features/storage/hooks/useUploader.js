import { useCallback, useEffect, useMemo, useState } from "react";
import { storageApi } from "../api/storageApi";
import { UPLOAD_POLICY } from "../constants/uploadPolicy";

function createId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function fileToImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = String(reader.result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function processImage(file, imageOptions) {
  const img = await fileToImage(file);

  const ratio = Math.min(
    1,
    imageOptions.maxWidth / img.width,
    imageOptions.maxHeight / img.height,
  );

  const w = Math.round(img.width * ratio);
  const h = Math.round(img.height * ratio);

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;

  const rotate = Number(imageOptions.rotateDegrees || 0);
  const isRightAngle = Math.abs(rotate) % 180 === 90;
  canvas.width = isRightAngle ? h : w;
  canvas.height = isRightAngle ? w : h;

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rotate * Math.PI) / 180);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();

  const blob = await new Promise((resolve) => {
    canvas.toBlob(
      (b) => resolve(b || file),
      file.type === "image/png" ? "image/png" : "image/jpeg",
      imageOptions.quality,
    );
  });

  if (blob instanceof File) return blob;
  return new File([blob], file.name, { type: blob.type || file.type });
}

function validateFile(file, policy) {
  if (!policy.allowedMimeTypes.includes(file.type)) {
    return "허용되지 않은 파일 형식입니다.";
  }

  const maxBytes = policy.maxFileSizeMb * 1024 * 1024;
  if (file.size > maxBytes) {
    return `파일 크기는 ${policy.maxFileSizeMb}MB 이하여야 합니다.`;
  }

  return "";
}

export function useUploader(options = {}) {
  const policy = {
    ...UPLOAD_POLICY,
    ...(options.policy || {}),
    image: {
      ...UPLOAD_POLICY.image,
      ...(options.policy?.image || {}),
    },
  };

  const [items, setItems] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  const addFiles = useCallback(
    async (incoming) => {
      const files = Array.from(incoming || []);
      if (!files.length) return;

      setItems((prev) => {
        const available = Math.max(0, policy.maxFiles - prev.length);
        return prev.concat(
          files.slice(0, available).map((file) => ({
            id: createId(),
            file,
            previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : "",
            status: "idle",
            error: "",
            uploaded: null,
          })),
        );
      });
    },
    [policy.maxFiles],
  );

  const removeFile = useCallback((id) => {
    setItems((prev) => {
      const target = prev.find((x) => x.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((x) => x.id !== id);
    });
  }, []);

  const clear = useCallback(() => {
    setItems((prev) => {
      prev.forEach((x) => x.previewUrl && URL.revokeObjectURL(x.previewUrl));
      return [];
    });
  }, []);

  useEffect(() => clear, [clear]);

  const uploadAll = useCallback(
    async ({ targetType = "POST", contentId, processImages = true } = {}) => {
      if (!contentId) {
        throw new Error("contentId는 필수입니다.");
      }

      setIsUploading(true);

      const current = [...items];
      const next = [...items];
      const uploaded = [];

      for (let i = 0; i < current.length; i += 1) {
        const item = current[i];
        const err = validateFile(item.file, policy);
        if (err) {
          next[i] = { ...item, status: "error", error: err };
          continue;
        }

        try {
          next[i] = { ...next[i], status: "uploading", error: "" };
          setItems([...next]);

          const toUpload =
            processImages && item.file.type.startsWith("image/")
              ? await processImage(item.file, policy.image)
              : item.file;

          const result = await storageApi.uploadFile({
            file: toUpload,
            targetType,
            contentId,
          });

          next[i] = { ...next[i], status: "done", uploaded: result, error: "" };
          uploaded.push(result);
          setItems([...next]);
        } catch (e) {
          next[i] = {
            ...next[i],
            status: "error",
            error: e?.message || "업로드에 실패했습니다.",
          };
          setItems([...next]);
        }
      }

      setIsUploading(false);
      return uploaded;
    },
    [items, policy],
  );

  return useMemo(
    () => ({
      items,
      isUploading,
      addFiles,
      removeFile,
      clear,
      uploadAll,
      policy,
    }),
    [items, isUploading, addFiles, removeFile, clear, uploadAll, policy],
  );
}
