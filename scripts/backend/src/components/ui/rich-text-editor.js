import {
  Button as WordPressButton,
  Modal,
  Notice,
  TextControl,
  __experimentalHStack as HStack,
} from "@wordpress/components";
import { __ } from "@wordpress/i18n";
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

  return `<figure class="eventkoi-video-embed eventkoi-video-embed--center"><iframe src="${src}" width="560" height="315" title="${escapeAttribute(
    __("YouTube video", "eventkoi-lite")
  )}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe></figure>`;
};

const buildMediaVideoHtml = (attachment = {}) => {
  const url = attachment.url || "";
  if (!url) {
    return "";
  }

  const title = attachment.alt || attachment.title || __("Video", "eventkoi-lite");
  return `<figure class="eventkoi-video-embed eventkoi-video-embed--center"><video controls preload="metadata" src="${escapeAttribute(
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
  const [youtubeModalOpen, setYoutubeModalOpen] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [youtubeError, setYoutubeError] = useState("");

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

    const mediaToolbar = allowVideoEmbeds
      ? " | insertVideo insertYoutube | alignVideoCenter alignVideoWide alignVideoFull"
      : "";

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
      block_formats:
        "Paragraph=p; Heading 1=h1; Heading 2=h2; Heading 3=h3; Heading 4=h4",
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
        /* Legacy unwrapped <video> (pre-alignment classes). */
        video {
          display: block;
          max-width: 560px;
          margin: 1em auto;
        }
        .eventkoi-video-embed {
          margin: 1em auto;
        }
        .eventkoi-video-embed--center {
          max-width: 560px;
          margin-left: auto;
          margin-right: auto;
        }
        .eventkoi-video-embed--wide {
          max-width: 1100px;
          margin-left: auto;
          margin-right: auto;
        }
        .eventkoi-video-embed--full {
          max-width: 100%;
          margin-left: 0;
          margin-right: 0;
        }
        .eventkoi-video-embed iframe {
          aspect-ratio: 16 / 9;
          width: 100%;
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
        .eventkoi-video-embed.mce-content-body-selected,
        .eventkoi-video-embed[data-mce-selected] {
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
            tooltip: `Heading ${label}`,
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
          tooltip: "Insert image",
          icon: "image",
          onclick: () => {
            const frame = window.wp?.media({
              title: "Insert image",
              button: { text: "Insert" },
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
            text: __("Video", "eventkoi-lite"),
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
                insertContent(buildMediaVideoHtml(attachment));
              });
              frame?.open();
            },
          });

          ed.addButton("insertYoutube", {
            text: __("YouTube", "eventkoi-lite"),
            tooltip: __("Embed YouTube video", "eventkoi-lite"),
            onclick: () => {
              setYoutubeUrl("");
              setYoutubeError("");
              setYoutubeModalOpen(true);
            },
          });

          const findSelectedVideoFigure = () => {
            const root = ed.getBody();
            let node = ed.selection.getNode();
            while (node && node !== root) {
              if (
                node.classList &&
                node.classList.contains("eventkoi-video-embed")
              ) {
                return node;
              }
              node = node.parentNode;
            }
            return null;
          };

          const applyVideoAlignment = (align) => {
            const fig = findSelectedVideoFigure();
            if (!fig) {
              return;
            }
            fig.classList.remove(
              "eventkoi-video-embed--center",
              "eventkoi-video-embed--wide",
              "eventkoi-video-embed--full"
            );
            fig.classList.add(`eventkoi-video-embed--${align}`);
            ed.fire("Change");
          };

          ed.addButton("alignVideoCenter", {
            text: __("Center video", "eventkoi-lite"),
            tooltip: __("Align video center (default)", "eventkoi-lite"),
            onclick: () => applyVideoAlignment("center"),
          });

          ed.addButton("alignVideoWide", {
            text: __("Wide video", "eventkoi-lite"),
            tooltip: __("Align video wide", "eventkoi-lite"),
            onclick: () => applyVideoAlignment("wide"),
          });

          ed.addButton("alignVideoFull", {
            text: __("Full video", "eventkoi-lite"),
            tooltip: __("Align video full width", "eventkoi-lite"),
            onclick: () => applyVideoAlignment("full"),
          });
        }

        ed.addButton("htmlToggle", {
          text: "Switch to Code Editor",
          tooltip: "Toggle HTML view",
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

  const closeYoutubeModal = () => {
    setYoutubeModalOpen(false);
    setYoutubeUrl("");
    setYoutubeError("");
    window.tinymce?.get(editorId)?.focus();
  };

  const submitYoutubeEmbed = (event) => {
    event.preventDefault();

    const html = buildYouTubeEmbedHtml(youtubeUrl);
    if (!html) {
      setYoutubeError(__("Enter a valid YouTube URL.", "eventkoi-lite"));
      return;
    }

    insertContentRef.current?.(html);
    closeYoutubeModal();
  };

  const youtubeModal = allowVideoEmbeds && youtubeModalOpen && (
    <Modal
      title={__("Embed YouTube video", "eventkoi-lite")}
      onRequestClose={closeYoutubeModal}
      className="eventkoi-youtube-embed-modal"
    >
      <form onSubmit={submitYoutubeEmbed}>
        <TextControl
          label={__("YouTube URL", "eventkoi-lite")}
          help={__(
            "Paste a YouTube watch, Shorts, Live, or youtu.be URL.",
            "eventkoi-lite"
          )}
          value={youtubeUrl}
          onChange={(nextValue) => {
            setYoutubeUrl(nextValue);
            if (youtubeError) {
              setYoutubeError("");
            }
          }}
          autoFocus
        />

        {youtubeError ? (
          <Notice status="error" isDismissible={false}>
            {youtubeError}
          </Notice>
        ) : null}

        <HStack justify="flex-end" className="mt-6">
          <WordPressButton variant="tertiary" onClick={closeYoutubeModal}>
            {__("Cancel", "eventkoi-lite")}
          </WordPressButton>
          <WordPressButton variant="primary" type="submit">
            {__("Embed video", "eventkoi-lite")}
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
      {youtubeModal}
    </>
  );
}
