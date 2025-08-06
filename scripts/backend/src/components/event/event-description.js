"use client";

import { Panel } from "@/components/panel";
import { Label } from "@/components/ui/label";
import { useEventEditContext } from "@/hooks/EventEditContext";
import { useEffect, useRef } from "react";

export function EventDescription({ isInstance = false, value, onChange }) {
  const context = useEventEditContext();
  const contextEvent = context.event;
  const contextSetEvent = context.setEvent;

  const event = isInstance ? null : contextEvent;
  const setEvent = isInstance ? null : contextSetEvent;

  const editorRef = useRef();

  useEffect(() => {
    if (!window.tinymce || !editorRef.current) return;

    setTimeout(() => {
      window.tinymce.init({
        target: editorRef.current,
        height: 250,
        menubar: false,
        branding: false,
        plugins: "lists link",
        toolbar:
          "undo redo | heading1 heading2 heading3 heading4 | bold italic underline | bullist numlist | link",
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

          editor.on("Change Input Undo Redo", () => {
            const content = editor.getContent();

            if (isInstance && onChange) {
              onChange(content);
            } else {
              setEvent((prevState) => ({
                ...prevState,
                description: content,
              }));
            }
          });

          editor.on("init", () => {
            const initialContent = isInstance ? value : event?.description;
            editor.setContent(initialContent || "");
          });
        },
      });
    }, 100);
  }, [value, isInstance]);

  useEffect(() => {
    return () => {
      if (window.tinymce) {
        window.tinymce.remove();
      }
    };
  }, []);

  return (
    <Panel className="p-0">
      <Label htmlFor="event-description">Event description</Label>
      <div className="text-muted-foreground mb-2">
        Tell people what your event is about.
      </div>
      <textarea
        id="event-description"
        ref={editorRef}
        defaultValue={isInstance ? value : event?.description}
        className="hidden"
      />
    </Panel>
  );
}
