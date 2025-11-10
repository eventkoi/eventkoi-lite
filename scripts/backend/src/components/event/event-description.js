"use client";

import { Panel } from "@/components/panel";
import { Label } from "@/components/ui/label";
import { useEventEditContext } from "@/hooks/EventEditContext";
import { useEffect, useId, useRef, useState } from "react";

export function EventDescription({ isInstance = false, value, onChange }) {
  const { event: contextEvent, setEvent: contextSetEvent } =
    useEventEditContext();
  const event = isInstance ? null : contextEvent;
  const setEvent = isInstance ? null : contextSetEvent;

  const editorRef = useRef();
  const uniqueId = useId(); // React 18+ built-in unique id
  const editorId = `event-description-${uniqueId}`;

  const [showHTML, setShowHTML] = useState(false);
  const [htmlContent, setHtmlContent] = useState(
    value || event?.description || ""
  );

  useEffect(() => {
    // Wait until TinyMCE + ref + DOM ready
    if (!window.tinymce || !editorRef.current || showHTML) {
      return;
    }

    // Always remove previous instance before init
    const oldEditor = window.tinymce.get(editorId);
    if (oldEditor) {
      oldEditor.remove();
    }

    const editor = window.tinymce.init({
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
      setup: (ed) => {
        // Heading buttons
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

        // HTML toggle
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
          if (isInstance && onChange) onChange(content);
          else setEvent?.((p) => ({ ...p, description: content }));
        });

        ed.on("init", () => {
          ed.setContent(htmlContent || "");
        });
      },
    });

    return () => {
      const inst = window.tinymce?.get(editorId);
      if (inst) inst.remove();
    };
  }, [showHTML, editorId]);

  // Re-sync when external value changes (for instance edit load)
  useEffect(() => {
    setHtmlContent(value || event?.description || "");
  }, [value, event?.description]);

  return (
    <Panel className="p-0">
      <Label htmlFor={editorId}>Event description</Label>
      <div className="text-muted-foreground mb-2">
        Tell people what your event is about.
      </div>

      {showHTML ? (
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
            onBlur={(e) => {
              if (isInstance && onChange) onChange(e.target.value);
              else setEvent?.((p) => ({ ...p, description: e.target.value }));
            }}
          />
        </div>
      ) : (
        <textarea
          id={editorId}
          ref={editorRef}
          defaultValue={htmlContent}
          className="w-full min-h-[250px] rounded-md border border-input bg-background p-2 text-sm"
        />
      )}
    </Panel>
  );
}
