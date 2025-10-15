"use client";

import { Panel } from "@/components/panel";
import { Label } from "@/components/ui/label";
import { useEventEditContext } from "@/hooks/EventEditContext";
import { useEffect, useRef, useState } from "react";

export function EventDescription({ isInstance = false, value, onChange }) {
  const { event: contextEvent, setEvent: contextSetEvent } =
    useEventEditContext();
  const event = isInstance ? null : contextEvent;
  const setEvent = isInstance ? null : contextSetEvent;

  const editorRef = useRef();
  const [showHTML, setShowHTML] = useState(false);
  const [htmlContent, setHtmlContent] = useState(
    value || event?.description || ""
  );

  useEffect(() => {
    if (!window.tinymce || !editorRef.current || showHTML) return;

    const id = "event-description";
    window.tinymce.init({
      target: editorRef.current,
      height: 250,
      menubar: false,
      branding: false,
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
      setup: (editor) => {
        const headings = [
          { id: "heading1", label: "H1", block: "h1" },
          { id: "heading2", label: "H2", block: "h2" },
          { id: "heading3", label: "H3", block: "h3" },
          { id: "heading4", label: "H4", block: "h4" },
        ];

        headings.forEach(({ id, label, block }) => {
          editor.addButton(id, {
            text: label,
            tooltip: `Heading ${label}`,
            onclick: () => {
              editor.execCommand("FormatBlock", false, block);
            },
            onPostRender: function () {
              const btn = this;
              editor.on("NodeChange", function () {
                const isActive = editor.formatter.match(block);
                btn.active(isActive);
              });
            },
          });
        });

        editor.addButton("htmlToggle", {
          text: showHTML ? "Visual" : "Raw HTML",
          tooltip: "Toggle HTML view",
          onclick: () => {
            const content = editor.getContent({ format: "html" });
            setHtmlContent(content);
            setShowHTML(true); // switch to HTML mode
            window.tinymce.remove(`#${id}`); // cleanup
          },
        });

        editor.on("Change Input Undo Redo", () => {
          const content = editor.getContent();
          if (isInstance && onChange) onChange(content);
          else setEvent((p) => ({ ...p, description: content }));
        });

        editor.on("init", () => {
          editor.setContent(htmlContent || "");
        });
      },
    });

    return () => {
      if (window.tinymce) window.tinymce.remove(`#${id}`);
    };
  }, [showHTML]); // re-init when toggling back to visual

  return (
    <Panel className="p-0">
      <Label htmlFor="event-description">Event description</Label>
      <div className="text-muted-foreground mb-2">
        Tell people what your event is about.
      </div>

      {showHTML ? (
        <textarea
          className="w-full min-h-[250px] rounded-md border border-input bg-background p-2 text-sm font-mono"
          value={htmlContent}
          onChange={(e) => setHtmlContent(e.target.value)}
          onBlur={(e) => {
            if (isInstance && onChange) onChange(e.target.value);
            else setEvent((p) => ({ ...p, description: e.target.value }));
          }}
        />
      ) : (
        <textarea
          id="event-description"
          ref={editorRef}
          defaultValue={htmlContent}
          className="w-full min-h-[250px] rounded-md border border-input bg-background p-2 text-sm"
        />
      )}

      {showHTML && (
        <button
          type="button"
          className="mt-2 text-sm text-primary underline"
          onClick={() => setShowHTML(false)}
        >
          Switch back to Visual
        </button>
      )}
    </Panel>
  );
}
