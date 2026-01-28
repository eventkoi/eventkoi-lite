import { useEffect, useId, useRef, useState } from "react";

export function RichTextEditor({
  id,
  value = "",
  onChange,
  height = 250,
  disabled = false,
}) {
  const editorRef = useRef();
  const uniqueId = useId();
  const editorId = id || `eventkoi-editor-${uniqueId}`;
  const [showHTML, setShowHTML] = useState(false);
  const [htmlContent, setHtmlContent] = useState(value || "");
  const lastEditorValue = useRef(value || "");
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

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
    if (!window.tinymce || !editorRef.current || showHTML) {
      return;
    }

    const oldEditor = window.tinymce.get(editorId);
    if (oldEditor) {
      oldEditor.remove();
    }

    window.tinymce.init({
      target: editorRef.current,
      height,
      menubar: false,
      branding: false,
      toolbar_mode: "sliding",
      readonly: disabled,
      plugins: "lists link wordpress",
      toolbar:
        "undo redo | heading1 heading2 heading3 heading4 | bold italic underline | bullist numlist | link | removeformat | htmlToggle",
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
      `,
      setup: (ed) => {
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
          const initialValue = value || "";
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
    };
  }, [showHTML, editorId, height, disabled]);

  if (showHTML) {
    return (
      <div className="mb-2 border border-input rounded-md">
        <div className="mce-toolbar-grp mce-container mce-panel mce-first mce-last flex justify-end py-[4px] shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <button
            type="button"
            onClick={() => setShowHTML(false)}
            className="mx-[8px] px-[6px] py-[4px] mce-btn mce-btn-has-text text-sm border-none bg-transparent cursor-pointer hover:bg-[#e5e7eb] text-[#374151]"
          >
            <span className="mce-txt">Switch to Visual Editor</span>
          </button>
        </div>
        <textarea
          className="w-full min-h-[250px] rounded-md border-0 bg-background p-2 text-sm font-mono focus:outline-none focus:shadow-none"
          value={htmlContent}
          onChange={(e) => setHtmlContent(e.target.value)}
          onBlur={(e) => onChange?.(e.target.value)}
          disabled={disabled}
        />
      </div>
    );
  }

  return <textarea id={editorId} ref={editorRef} />;
}
