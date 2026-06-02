import { useMemo, useRef, useState } from "react";

export default function FilePicker({
  items = [],
  onFilesAdded,
  onRemove,
  accept = "*/*",
  multiple = true,
  disabled = false,
}) {
  const inputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const label = useMemo(() => {
    if (!items.length) return "파일을 드래그하거나 클릭해서 선택하세요.";
    return `${items.length}개 파일 선택됨`;
  }, [items.length]);

  const triggerPick = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const handleFiles = (files) => {
    if (!files?.length || disabled) return;
    onFilesAdded?.(files);
  };

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={triggerPick}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          handleFiles(e.dataTransfer?.files);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        style={{
          border: `2px dashed ${isDragOver ? "#2563eb" : "#cbd5e1"}`,
          background: isDragOver ? "#eff6ff" : "#fff",
          borderRadius: 10,
          padding: 16,
          cursor: disabled ? "not-allowed" : "pointer",
        }}
      >
        <div style={{ fontSize: 14, color: "#334155" }}>{label}</div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        style={{ display: "none" }}
        onChange={(e) => handleFiles(e.target.files)}
      />

      {items.length > 0 && (
        <ul style={{ marginTop: 12, paddingLeft: 18 }}>
          {items.map((item) => (
            <li key={item.id} style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span>{item.file?.name}</span>
                <span style={{ color: "#64748b", fontSize: 12 }}>{item.status}</span>
                {item.error ? <span style={{ color: "#b91c1c", fontSize: 12 }}>{item.error}</span> : null}
                <button type="button" onClick={() => onRemove?.(item.id)}>
                  제거
                </button>
              </div>
              {item.previewUrl ? (
                <img
                  src={item.previewUrl}
                  alt={item.file?.name || "preview"}
                  style={{ width: 80, height: 80, objectFit: "cover", marginTop: 6 }}
                />
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
