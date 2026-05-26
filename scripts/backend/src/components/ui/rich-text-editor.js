import {
  Button as WordPressButton,
  Modal,
  Notice,
  TextControl,
  __experimentalHStack as HStack,
} from "@wordpress/components";
import { __, sprintf } from "@wordpress/i18n";
import { useEffect, useId, useRef, useState } from "react";

const escapeAttribute = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const getYouTubeVideoId = (rawUrl = "") => {
  const input = String(rawUrl || "").trim();
  if (!input) {
    return "";
  }

  try {
    const url = new URL(input);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const parts = url.pathname.split("/").filter(Boolean);

    if (host === "youtu.be") {
      return parts[0] || "";
    }

    if (
      host === "youtube.com" ||
      host === "m.youtube.com" ||
      host === "youtube-nocookie.com"
    ) {
      if (parts[0] === "embed" || parts[0] === "shorts" || parts[0] === "live") {
        return parts[1] || "";
      }

      if (url.searchParams.has("v")) {
        return url.searchParams.get("v") || "";
      }
    }
  } catch (error) {
    return "";
  }

  return "";
};

const buildYouTubeEmbedHtml = (rawUrl = "") => {
  const id = getYouTubeVideoId(rawUrl);
  if (!/^[A-Za-z0-9_-]{6,}$/.test(id)) {
    return "";
  }

  const src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`;

  return `<figure class="eventkoi-video-embed"><iframe src="${src}" width="560" height="315" title="${escapeAttribute(
    __("YouTube video", "eventkoi-lite")
  )}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe></figure>`;
};

const buildMediaVideoHtml = (attachment = {}) => {
  const url = attachment.url || "";
  if (!url) {
    return "";
  }

  const title = attachment.alt || attachment.title || __("Video", "eventkoi-lite");
  return `<figure class="eventkoi-video-embed"><video controls preload="metadata" src="${escapeAttribute(
    url
  )}" title="${escapeAttribute(title)}"></video></figure>`;
};

export function RichTextEditor({
  id,
  value = "",
  onChange,
  height = 250,
  disabled = false,
  allowVideoEmbeds = false,
}) {
  const editorRef = useRef();
  const uniqueId = useId();
  const editorId = id || `eventkoi-editor-${uniqueId}`;
  const [showHTML, setShowHTML] = useState(false);
  const [htmlContent, setHtmlContent] = useState(value || "");
  const lastEditorValue = useRef(value || "");
  const latestValueRef = useRef(value || "");
  const onChangeRef = useRef(onChange);
  const insertContentRef = useRef(null);
  const [tinymceReady, setTinymceReady] = useState(!!window.tinymce);
  const [videoModal, setVideoModal] = useState(null);
  const videoEditTargetRef = useRef(null);

  useEffect(() => {
    if (tinymceReady) return;
    const interval = setInterval(() => {
      if (window.tinymce) {
        setTinymceReady(true);
        clearInterval(interval);
      }
    }, 50);
    return () => clearInterval(interval);
  }, [tinymceReady]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    latestValueRef.current = value || "";
  }, [value]);

  useEffect(() => {
    if (showHTML) {
      setHtmlContent(value || "");
      return;
    }
    if ((value || "") === lastEditorValue.current) {
      return;
    }
    const editor = window.tinymce?.get(editorId);
    if (editor && editor.getContent() !== (value || "")) {
      editor.setContent(value || "");
    }
  }, [value, editorId, showHTML]);

  useEffect(() => {
    if (!tinymceReady || !editorRef.current || showHTML) {
      return;
    }

    const oldEditor = window.tinymce.get(editorId);
    if (oldEditor) {
      oldEditor.remove();
    }

    const mediaToolbar = allowVideoEmbeds ? " insertVideo insertYoutube" : "";

    window.tinymce.init({
      target: editorRef.current,
      height,
      menubar: false,
      branding: false,
      toolbar_mode: "sliding",
      relative_urls: false,
      remove_script_host: false,
      readonly: disabled,
      plugins: "lists link image wordpress",
      toolbar:
        `undo redo | heading1 heading2 heading3 heading4 | bold italic underline | bullist numlist | link | insertImage${mediaToolbar} | removeformat | htmlToggle`,
      block_formats: `${__("Paragraph", "eventkoi-lite")}=p; ${__("Heading 1", "eventkoi-lite")}=h1; ${__("Heading 2", "eventkoi-lite")}=h2; ${__("Heading 3", "eventkoi-lite")}=h3; ${__("Heading 4", "eventkoi-lite")}=h4`,
      content_style: `
        body {
          padding: 2px 14px;
          font-family: Inter, system-ui, sans-serif;
          font-size: 14px;
          line-height: 1.6;
          color: #1f2937;
          background: transparent;
        }
        img,
        video,
        iframe {
          max-width: 100%;
        }
        img,
        video {
          height: auto;
        }
        video {
          display: block;
          width: 100%;
          max-width: 560px;
          height: auto;
          margin: 1em auto;
        }
        .eventkoi-video-embed {
          display: block;
          max-width: 560px;
          margin: 1em auto;
        }
        .eventkoi-video-embed iframe {
          aspect-ratio: 16 / 9;
          display: block;
          width: 100%;
          max-width: 100%;
          height: auto;
          min-height: 220px;
        }
        .eventkoi-video-embed video {
          display: block;
          width: 100%;
          max-width: 100%;
          height: auto;
          margin: 0;
        }
        .eventkoi-video-embed {
          position: relative;
          cursor: pointer;
        }
        .eventkoi-video-embed::after {
          content: "";
          position: absolute;
          inset: 0;
          z-index: 2;
          background: transparent;
        }
        .eventkoi-video-embed:hover {
          outline: 2px solid #2271b1;
          outline-offset: 2px;
        }
      `,
      setup: (ed) => {
        const insertContent = (html) => {
          if (!html) {
            return;
          }

          ed.execCommand("mceInsertContent", false, html);
          const content = ed.getContent();
          lastEditorValue.current = content;
          onChangeRef.current?.(content);
        };
        insertContentRef.current = insertContent;

        const headings = [
          { id: "heading1", label: "H1", block: "h1" },
          { id: "heading2", label: "H2", block: "h2" },
          { id: "heading3", label: "H3", block: "h3" },
          { id: "heading4", label: "H4", block: "h4" },
        ];

        headings.forEach(({ id, label, block }) => {
          ed.addButton(id, {
            text: label,
            tooltip: sprintf(
              /* translators: %s: heading level, for example H1. */
              __("Heading %s", "eventkoi-lite"),
              label
            ),
            onclick: () => ed.execCommand("FormatBlock", false, block),
            onPostRender() {
              const btn = this;
              ed.on("NodeChange", () => {
                btn.active(ed.formatter.match(block));
              });
            },
          });
        });

        ed.addButton("insertImage", {
          tooltip: __("Insert image", "eventkoi-lite"),
          icon: "image",
          onclick: () => {
            const frame = window.wp?.media({
              title: __("Insert image", "eventkoi-lite"),
              button: { text: __("Insert", "eventkoi-lite") },
              library: { type: "image" },
              multiple: false,
            });
            frame?.on("select", () => {
              const attachment = frame.state().get("selection").first().toJSON();
              const url = attachment.url;
              const alt = attachment.alt || attachment.title || "";
              insertContent(
                `<img src="${escapeAttribute(url)}" alt="${escapeAttribute(
                  alt
                )}" />`
              );
            });
            frame?.open();
          },
        });

        if (allowVideoEmbeds) {
          ed.addButton("insertVideo", {
            image:
              "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iIzU1NSI+PHBhdGggZD0iTTE3IDEwLjVWN2MwLS41NS0uNDUtMS0xLTFINGMtLjU1IDAtMSAuNDUtMSAxdjEwYzAgLjU1LjQ1IDEgMSAxaDEyYy41NSAwIDEtLjQ1IDEtMXYtMy41bDQgNHYtMTFsLTQgNHoiLz48L3N2Zz4=",
            tooltip: __("Insert video from media library", "eventkoi-lite"),
            onclick: () => {
              const frame = window.wp?.media({
                title: __("Insert video", "eventkoi-lite"),
                button: { text: __("Insert", "eventkoi-lite") },
                library: { type: "video" },
                multiple: false,
              });
              frame?.on("select", () => {
                const attachment = frame.state().get("selection").first().toJSON();
                videoEditTargetRef.current = null;
                setVideoModal({
                  kind: "media",
                  url: attachment.url || "",
                  urlReadOnly: true,
                  widthMode: "custom",
                  widthPx: 560,
                  error: "",
                });
              });
              frame?.open();
            },
          });

          ed.addButton("insertYoutube", {
            image:
              "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0iI0ZGMDAwMCIgZD0iTTIxLjU4MiA3LjIwN2EyLjUxIDIuNTEgMCAwIDAtMS43NjgtMS43NjhDMTguMjU0IDUgMTIgNSAxMiA1cy02LjI1NCAwLTcuODE0LjQzOUEyLjUxIDIuNTEgMCAwIDAgMi40MTggNy4yMDdDMiA4Ljc2NyAyIDEyIDIgMTJzMCAzLjIzMy40MTggNC43OTNhMi41MSAyLjUxIDAgMCAwIDEuNzY4IDEuNzY4QzUuNzQ2IDE5IDEyIDE5IDEyIDE5czYuMjU0IDAgNy44MTQtLjQzOWEyLjUxIDIuNTEgMCAwIDAgMS43NjgtMS43NjhDMjIgMTUuMjMzIDIyIDEyIDIyIDEyczAtMy4yMzMtLjQxOC00Ljc5M3oiLz48cGF0aCBmaWxsPSIjZmZmIiBkPSJNMTAgMTVWOWw1LjE5NiAzTDEwIDE1eiIvPjwvc3ZnPg==",
            tooltip: __("Embed YouTube video", "eventkoi-lite"),
            onclick: () => {
              videoEditTargetRef.current = null;
              setVideoModal({
                kind: "youtube",
                url: "",
                urlReadOnly: false,
                widthMode: "custom",
                widthPx: 560,
                error: "",
              });
            },
          });

          ed.on("click", (event) => {
            const root = ed.getBody();
            let node = event.target;
            while (node && node !== root) {
              if (
                node.classList &&
                node.classList.contains("eventkoi-video-embed")
              ) {
                break;
              }
              node = node.parentNode;
            }
            if (!node || node === root) {
              return;
            }
            const iframe = node.querySelector("iframe");
            const videoEl = node.querySelector("video");
            const kind = iframe ? "youtube" : "media";
            let url = "";
            if (iframe) {
              const match = (iframe.getAttribute("src") || "").match(
                /\/embed\/([^?&/]+)/
              );
              if (match) {
                url = `https://www.youtube.com/watch?v=${match[1]}`;
              }
            } else if (videoEl) {
              url = videoEl.getAttribute("src") || "";
            }
            const inlineMaxWidth = node.style.maxWidth || "";
            const isFull = inlineMaxWidth === "100%";
            const pxMatch = inlineMaxWidth.match(/^(\d+)px$/);
            videoEditTargetRef.current = node;
            setVideoModal({
              kind,
              url,
              urlReadOnly: kind === "media",
              widthMode: isFull ? "full" : "custom",
              widthPx: pxMatch ? parseInt(pxMatch[1], 10) : 560,
              error: "",
            });
            event.preventDefault();
            event.stopPropagation();
          });
        }

        ed.addButton("htmlToggle", {
          text: __("Switch to Code Editor", "eventkoi-lite"),
          tooltip: __("Toggle HTML view", "eventkoi-lite"),
          onclick: () => {
            const content = ed.getContent({ format: "html" });
            setHtmlContent(content);
            setShowHTML(true);
            ed.remove();
          },
        });

        ed.on("Change Input Undo Redo", () => {
          const content = ed.getContent();
          lastEditorValue.current = content;
          onChangeRef.current?.(content);
        });

        ed.on("init", () => {
          const initialValue = latestValueRef.current || "";
          lastEditorValue.current = initialValue;
          ed.setContent(initialValue);
        });
      },
    });

    return () => {
      const inst = window.tinymce?.get(editorId);
      if (inst) {
        inst.remove();
      }
      insertContentRef.current = null;
    };
  }, [tinymceReady, showHTML, editorId, height, disabled, allowVideoEmbeds]);

  const closeVideoModal = () => {
    setVideoModal(null);
    videoEditTargetRef.current = null;
    window.tinymce?.get(editorId)?.focus();
  };

  const submitVideoModal = (event) => {
    event.preventDefault();
    if (!videoModal) {
      return;
    }

    const ed = window.tinymce?.get(editorId);
    if (!ed) {
      return;
    }

    let styleAttr = "";
    if (videoModal.widthMode === "full") {
      styleAttr = ' style="max-width:100%"';
    } else {
      const px = Math.max(
        120,
        Math.min(2000, parseInt(videoModal.widthPx, 10) || 560)
      );
      styleAttr = ` style="max-width:${px}px"`;
    }

    let innerHtml;
    if (videoModal.kind === "youtube") {
      const wrapped = buildYouTubeEmbedHtml(videoModal.url);
      if (!wrapped) {
        setVideoModal({
          ...videoModal,
          error: __("Enter a valid YouTube URL.", "eventkoi-lite"),
        });
        return;
      }
      innerHtml = wrapped.replace(/^<figure[^>]*>|<\/figure>$/g, "");
    } else {
      const src = (videoModal.url || "").trim();
      if (!src) {
        setVideoModal({
          ...videoModal,
          error: __("Video URL is required.", "eventkoi-lite"),
        });
        return;
      }
      innerHtml = `<video controls preload="metadata" src="${escapeAttribute(
        src
      )}"></video>`;
    }

    const newFigureHtml = `<figure class="eventkoi-video-embed"${styleAttr}>${innerHtml}</figure>`;

    if (videoEditTargetRef.current) {
      const tmp = ed.getDoc().createElement("div");
      tmp.innerHTML = newFigureHtml;
      const newFig = tmp.firstChild;
      videoEditTargetRef.current.replaceWith(newFig);
      const content = ed.getContent();
      lastEditorValue.current = content;
      onChangeRef.current?.(content);
    } else {
      insertContentRef.current?.(newFigureHtml);
    }

    closeVideoModal();
  };

  const videoModalUI = allowVideoEmbeds && videoModal && (
    <Modal
      title={
        videoEditTargetRef.current
          ? __("Edit video", "eventkoi-lite")
          : videoModal.kind === "youtube"
          ? __("Embed YouTube video", "eventkoi-lite")
          : __("Insert video", "eventkoi-lite")
      }
      onRequestClose={closeVideoModal}
      className="eventkoi-video-embed-modal"
    >
      <form onSubmit={submitVideoModal}>
        <TextControl
          label={
            videoModal.kind === "youtube"
              ? __("YouTube URL", "eventkoi-lite")
              : __("Video URL", "eventkoi-lite")
          }
          help={
            videoModal.kind === "youtube"
              ? __(
                  "Paste a YouTube watch, Shorts, Live, or youtu.be URL.",
                  "eventkoi-lite"
                )
              : undefined
          }
          value={videoModal.url}
          readOnly={videoModal.urlReadOnly}
          disabled={videoModal.urlReadOnly}
          onChange={(nextValue) =>
            setVideoModal({ ...videoModal, url: nextValue, error: "" })
          }
          autoFocus={!videoModal.urlReadOnly}
        />

        <div style={{ marginTop: 16 }}>
          <strong style={{ display: "block", marginBottom: 8 }}>
            {__("Width", "eventkoi-lite")}
          </strong>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 6, marginRight: 16 }}>
            <input
              type="radio"
              name={`ek-video-width-${editorId}`}
              value="custom"
              checked={videoModal.widthMode === "custom"}
              onChange={() =>
                setVideoModal({ ...videoModal, widthMode: "custom" })
              }
            />
            {__("Custom", "eventkoi-lite")}
          </label>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <input
              type="radio"
              name={`ek-video-width-${editorId}`}
              value="full"
              checked={videoModal.widthMode === "full"}
              onChange={() =>
                setVideoModal({ ...videoModal, widthMode: "full" })
              }
            />
            {__("Full width", "eventkoi-lite")}
          </label>

          {videoModal.widthMode === "custom" && (
            <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="number"
                min={120}
                max={2000}
                step={10}
                value={videoModal.widthPx}
                onChange={(e) =>
                  setVideoModal({
                    ...videoModal,
                    widthPx: parseInt(e.target.value, 10) || 0,
                  })
                }
                style={{ width: 100 }}
              />
              <span>{__("px", "eventkoi-lite")}</span>
            </div>
          )}
        </div>

        {videoModal.error ? (
          <Notice status="error" isDismissible={false}>
            {videoModal.error}
          </Notice>
        ) : null}

        <HStack justify="flex-end" className="mt-6">
          <WordPressButton variant="tertiary" onClick={closeVideoModal}>
            {__("Cancel", "eventkoi-lite")}
          </WordPressButton>
          <WordPressButton variant="primary" type="submit">
            {videoEditTargetRef.current
              ? __("Update video", "eventkoi-lite")
              : __("Insert video", "eventkoi-lite")}
          </WordPressButton>
        </HStack>
      </form>
    </Modal>
  );

  if (showHTML) {
    return (
      <div className="mb-2 border border-input rounded-md">
        <div className="mce-toolbar-grp mce-container mce-panel mce-first mce-last flex justify-end py-[4px] shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <button
            type="button"
            onClick={() => setShowHTML(false)}
            className="mx-[8px] px-[6px] py-[4px] mce-btn mce-btn-has-text text-sm border-none bg-transparent cursor-pointer hover:bg-[#e5e7eb] text-[#374151]"
          >
            <span className="mce-txt">{__("Switch to Visual Editor", "eventkoi-lite")}</span>
          </button>
        </div>
        <textarea
          className="w-full min-h-[250px] rounded-md border-0 bg-background p-2 text-sm font-mono focus:outline-none focus:shadow-none"
          value={htmlContent}
          onChange={(e) => setHtmlContent(e.target.value)}
          onBlur={(e) => onChange?.(e.target.value)}
          disabled={disabled}
          aria-label={__("HTML source editor", "eventkoi-lite")}
        />
      </div>
    );
  }

  return (
    <>
      <textarea id={editorId} ref={editorRef} />
      {videoModalUI}
    </>
  );
}
