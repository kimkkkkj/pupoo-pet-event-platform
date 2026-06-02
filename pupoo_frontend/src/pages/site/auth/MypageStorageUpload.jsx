import { useState } from "react";
import { useNavigate } from "react-router-dom";
import FilePicker from "../../../features/storage/components/FilePicker";
import { useUploader } from "../../../features/storage/hooks/useUploader";
import { resolveErrorMessage } from "../../../features/shared/forms/formError";
import {
  mypageCardStyle,
  mypageInputStyle,
  mypageLabelStyle,
  mypageOutlineButtonStyle,
  mypagePageStyle,
  mypagePrimaryButtonStyle,
  mypageTitleStyle,
} from "../../../features/shared/ui/mypageStyles";

function createCanvasImageFile({ name, title, subtitle, colors }) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      reject(new Error("canvas context를 생성하지 못했습니다."));
      return;
    }

    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, colors[0]);
    gradient.addColorStop(1, colors[1]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "rgba(255,255,255,0.16)";
    ctx.fillRect(80, 80, canvas.width - 160, canvas.height - 160);

    ctx.fillStyle = "#ffffff";
    ctx.font = "700 56px Pretendard, sans-serif";
    ctx.fillText(title, 120, 240);

    ctx.font = "400 34px Pretendard, sans-serif";
    ctx.fillText(subtitle, 120, 320);

    ctx.font = "500 24px Pretendard, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillText("PUPOO AI SAMPLE", 120, 620);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("샘플 이미지를 생성하지 못했습니다."));
          return;
        }
        resolve(new File([blob], name, { type: "image/png" }));
      },
      "image/png",
      0.92,
    );
  });
}

async function createSampleFiles() {
  const files = await Promise.all([
    createCanvasImageFile({
      name: "ai_pet_portrait_01.png",
      title: "Golden Retriever Portrait",
      subtitle: "sunset rim light, 50mm lens, shallow depth of field",
      colors: ["#6d83f2", "#4b5fd1"],
    }),
    createCanvasImageFile({
      name: "ai_pet_portrait_02.png",
      title: "Silver Tabby Studio Shot",
      subtitle: "softbox light, neutral backdrop, cinematic tone",
      colors: ["#319795", "#2c7a7b"],
    }),
    createCanvasImageFile({
      name: "ai_pet_portrait_03.png",
      title: "Pomeranian Action Frame",
      subtitle: "high shutter speed, vibrant park scene",
      colors: ["#d69e2e", "#b7791f"],
    }),
  ]);
  return files;
}

export default function MypageStorageUpload() {
  const navigate = useNavigate();
  const uploader = useUploader();

  const [contentId, setContentId] = useState("");
  const [globalError, setGlobalError] = useState("");
  const [uploaded, setUploaded] = useState([]);
  const [sampleLoading, setSampleLoading] = useState(false);

  const handleUpload = async () => {
    try {
      setGlobalError("");
      const id = Number(contentId);
      if (!id || id < 1) {
        throw new Error("contentId를 1 이상의 숫자로 입력해 주세요.");
      }

      const result = await uploader.uploadAll({
        targetType: "POST",
        contentId: id,
      });
      setUploaded(result || []);
    } catch (error) {
      setGlobalError(
        resolveErrorMessage(error, "파일 업로드에 실패했습니다."),
      );
    }
  };

  const handleAddSampleFiles = async () => {
    try {
      setSampleLoading(true);
      setGlobalError("");
      const files = await createSampleFiles();
      await uploader.addFiles(files);
    } catch (error) {
      setGlobalError(
        resolveErrorMessage(error, "샘플 파일 생성에 실패했습니다."),
      );
    } finally {
      setSampleLoading(false);
    }
  };

  return (
    <div style={mypagePageStyle}>
      <div style={{ ...mypageCardStyle, maxWidth: 920, margin: "120px auto 80px" }}>
        <h2 style={mypageTitleStyle}>파일 업로드</h2>

        <div style={{ marginBottom: 12, fontSize: 13, color: "#64748b" }}>
          스토리지 API 연동 테스트용 화면입니다. 샘플 생성 버튼으로 실사형 테스트 이미지를
          만들고 바로 업로드할 수 있습니다.
        </div>

        {globalError ? (
          <div style={{ color: "#b91c1c", fontSize: 13, marginBottom: 12 }}>
            {globalError}
          </div>
        ) : null}

        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
          <label htmlFor="contentId" style={mypageLabelStyle}>
            contentId
          </label>
          <input
            id="contentId"
            type="number"
            min={1}
            value={contentId}
            onChange={(e) => setContentId(e.target.value)}
            style={mypageInputStyle}
            placeholder="예: 1"
          />
          <button
            type="button"
            onClick={handleAddSampleFiles}
            disabled={sampleLoading || uploader.isUploading}
            style={{
              ...mypageOutlineButtonStyle,
              cursor:
                sampleLoading || uploader.isUploading ? "not-allowed" : "pointer",
            }}
          >
            {sampleLoading ? "샘플 생성 중..." : "AI 스타일 샘플 3개 추가"}
          </button>
          <button
            type="button"
            onClick={handleUpload}
            disabled={uploader.isUploading}
            style={{
              ...mypagePrimaryButtonStyle,
              cursor: uploader.isUploading ? "not-allowed" : "pointer",
            }}
          >
            {uploader.isUploading ? "업로드 중..." : "업로드 실행"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/mypage")}
            style={mypageOutlineButtonStyle}
          >
            마이페이지로
          </button>
        </div>

        <FilePicker
          items={uploader.items}
          onFilesAdded={uploader.addFiles}
          onRemove={uploader.removeFile}
          accept={uploader.policy.allowedMimeTypes.join(",")}
          multiple
          disabled={uploader.isUploading || sampleLoading}
        />

        {uploaded.length ? (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
              업로드 결과
            </div>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {uploaded.map((file) => (
                <li key={file.fileId} style={{ marginBottom: 6, fontSize: 13 }}>
                  fileId: {file.fileId}, path: {file.publicPath}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
