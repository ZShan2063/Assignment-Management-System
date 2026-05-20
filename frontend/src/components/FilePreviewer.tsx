import { useEffect, useState } from "react";

interface FilePreviewerProps {
  fileUrl?: string | null;
  label?: string;
}

export default function FilePreviewer({ fileUrl, label = "File" }: FilePreviewerProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  useEffect(() => {
    if (!isPreviewOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsPreviewOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPreviewOpen]);

  if (!fileUrl) {
    return <span>-</span>;
  }

  const cleanUrl = fileUrl.split("?")[0];
  const filename = decodeURIComponent(cleanUrl.split("/").filter(Boolean).pop() || label);
  const extension = filename.split(".").pop()?.toLowerCase() || "";
  const isImage = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(extension);
  const isPdf = extension === "pdf";
  const titleId = `file-preview-${filename.replace(/[^a-z0-9]/gi, "-").toLowerCase()}`;

  return (
    <div className="file-preview">
      <span className="file-name">{filename}</span>
      <div className="file-actions">
        <button className="compact-button" type="button" onClick={() => setIsPreviewOpen(true)} aria-label={`Preview ${filename}`}>Preview</button>
        <a className="compact-button" href={fileUrl} download>Download</a>
      </div>
      {isPreviewOpen && (
        <div className="file-modal-backdrop" role="presentation" onMouseDown={() => setIsPreviewOpen(false)}>
          <div className="file-modal" role="dialog" aria-modal="true" aria-labelledby={titleId} onMouseDown={(event) => event.stopPropagation()}>
            <div className="file-modal-header">
              <div>
                <span>File Preview</span>
                <strong id={titleId}>{filename}</strong>
              </div>
              <button className="compact-button secondary-button" type="button" onClick={() => setIsPreviewOpen(false)} aria-label="Close file preview">Close</button>
            </div>
            <div className="file-modal-body">
              {isImage ? (
                <img src={fileUrl} alt={filename} />
              ) : isPdf ? (
                <iframe src={fileUrl} title={filename} />
              ) : (
                <div className="file-preview-fallback">
                  <strong>Preview is not available for this file type.</strong>
                  <p>You can still download the file and open it on your device.</p>
                </div>
              )}
            </div>
            <div className="file-modal-actions">
              <a className="compact-button" href={fileUrl} download>Download</a>
              <a className="compact-button secondary-button" href={fileUrl} target="_blank" rel="noreferrer">Open in new tab</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
