"use client";

import { Panel } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEventEditContext } from "@/hooks/EventEditContext";
import { showToastError } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { __ } from "@wordpress/i18n";
import apiRequest from "@wordpress/api-fetch";
import { MediaUpload } from "@wordpress/media-utils";
import {
  Image as ImageIcon,
  Link as LinkIcon,
  Loader2,
  Repeat2,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";

const ALLOWED_MEDIA_TYPES = ["image"];

export function EventImage({ isInstance = false, value, onChange }) {
  const { event, setEvent } = useEventEditContext();
  const [uploading, setUploading] = useState(false);
  const [urlMode, setUrlMode] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  const [imageError, setImageError] = useState(false);

  const image = isInstance ? value?.image : event?.image;
  const imageId = isInstance ? value?.image_id : event?.image_id;

  useEffect(() => {
    setImageError(false);
  }, [image, imageId]);

  const updateImage = (imgUrl, imgId) => {
    if (isInstance && onChange) {
      onChange({ image: imgUrl, image_id: imgId });
    } else {
      setEvent((prev) => ({
        ...prev,
        image: imgUrl,
        image_id: imgId,
      }));
    }
  };

  const deleteImage = async (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    setUploading(true);
    updateImage("", "");
    setUploading(false);
  };

  const uploadImage = async ({
    file = null,
    url = null,
    attachment_id = null,
  }) => {
    setUploading(true);

    try {
      let options = {
        path: `${eventkoi_params.api}/upload_image`,
        method: "POST",
      };

      if (file) {
        const formData = new FormData();
        formData.append("uploadedfile", file);
        formData.append("post_id", event.id);
        formData.append("set_thumbnail", !isInstance ? "1" : "0");
        options.body = formData;
        options.headers = {
          "EVENTKOI-API-KEY": eventkoi_params.api_key,
        };
      } else {
        options.body = JSON.stringify({
          post_id: event.id,
          set_thumbnail: !isInstance,
          ...(url && { url }),
          ...(attachment_id && { attachment_id }),
        });
        options.headers = {
          "EVENTKOI-API-KEY": eventkoi_params.api_key,
          "Content-Type": "application/json",
        };
      }

      const response = await apiRequest(options);
      if (response.id && response.url) {
        updateImage(response.url, response.id);
      } else {
        showToastError(__("Upload failed. Please try again.", "eventkoi-lite"));
      }
    } catch (err) {
      showToastError(__("Upload failed. Please try again.", "eventkoi-lite"));
    } finally {
      setUploading(false);
      setUrlInput("");
      setUrlMode(false);
    }
  };

  const handleFiles = (files) => {
    if (files?.length) {
      uploadImage({ file: files[0] });
    }
  };

  const handleUrlSubmit = () => {
    if (!urlInput || !urlInput.startsWith("http")) {
      showToastError(__("Please enter a valid image URL.", "eventkoi-lite"));
      return;
    }
    uploadImage({ url: urlInput });
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter((prev) => prev + 1);
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter((prev) => {
      const newCount = prev - 1;
      if (newCount <= 0) {
        setDragOver(false);
        return 0;
      }
      return newCount;
    });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(0);
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <Panel className="p-0">
      <Label htmlFor="image">{__("Header banner image", "eventkoi-lite")}</Label>
      <div className="text-muted-foreground">
        {__("Ideal size: 1600px × 600px", "eventkoi-lite")}
      </div>

      <MediaUpload
        title={__("Select event image", "eventkoi-lite")}
        onSelect={(media) =>
          uploadImage({ attachment_id: media.id, url: media.url })
        }
        allowedTypes={ALLOWED_MEDIA_TYPES}
        value={imageId}
        disabled={uploading}
        render={({ open }) => (
          <div
            role={!image && !uploading && !urlMode ? "button" : undefined}
            tabIndex={!image && !uploading && !urlMode ? 0 : undefined}
            aria-label={!image ? __("Select event image", "eventkoi-lite") : undefined}
            className={cn(
              "relative group rounded overflow-hidden transition",
              image
                ? "p-0"
                : "bg-secondary hover:border-muted-foreground/60 p-8 flex flex-col items-center justify-center gap-4 cursor-pointer"
            )}
            onClick={() => {
              if (!uploading && !urlMode && (!image || imageError)) open();
            }}
            onKeyDown={(e) => {
              if ((e.key === "Enter" || e.key === " ") && !uploading && !urlMode && (!image || imageError)) {
                e.preventDefault();
                open();
              }
            }}
            onDragEnter={handleDragEnter}
            onDragOver={(e) => e.preventDefault()}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {dragOver && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/70 text-xl font-semibold text-primary rounded-2xl">
                {__("Drop to upload", "eventkoi-lite")}
              </div>
            )}

            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-2xl">
                <Loader2 className="w-8 h-8 animate-spin" strokeWidth={1.5} />
              </div>
            )}

            {urlMode ? (
              <UrlInputBox
                urlInput={urlInput}
                setUrlInput={setUrlInput}
                onSubmit={handleUrlSubmit}
                onCancel={() => {
                  setUrlMode(false);
                  setUrlInput("");
                }}
                uploading={uploading}
              />
            ) : image && !imageError ? (
              <ImagePreviewOverlay
                imageUrl={image}
                openMediaLibrary={open}
                deleteImage={deleteImage}
                onError={() => setImageError(true)}
              />
            ) : imageError ? (
              <MissingImageOverlay
                openMediaLibrary={open}
                deleteImage={deleteImage}
              />
            ) : (
              <UploadBox onUrlMode={() => setUrlMode(true)} />
            )}
          </div>
        )}
      />
    </Panel>
  );
}

function UploadBox({ onUrlMode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 text-center">
      <ImageIcon
        className="w-10 h-10 text-muted-foreground"
        strokeWidth={1.2}
      />
      <div className="text-lg font-semibold">
        {__("Drag and drop an image", "eventkoi-lite")}
      </div>
      <div className="text-sm text-muted-foreground">
        {__("or click to upload from your media library", "eventkoi-lite")}
      </div>
      <Button
        variant="link"
        size="sm"
        className="text-xs mt-2"
        onClick={(e) => {
          e.stopPropagation();
          onUrlMode();
        }}
      >
        <LinkIcon className="w-3 h-3 mr-1" />
        {__("Paste image URL instead", "eventkoi-lite")}
      </Button>
    </div>
  );
}

function UrlInputBox({ urlInput, setUrlInput, onSubmit, onCancel, uploading }) {
  return (
    <div className="flex flex-col items-center justify-center w-full gap-4 text-center p-4">
      <LinkIcon
        className="w-8 h-8 mx-auto text-muted-foreground"
        strokeWidth={1.2}
      />
      <div className="text-lg font-semibold">
        {__("Paste an image URL", "eventkoi-lite")}
      </div>
      <div className="text-sm text-muted-foreground">
        {__("Enter a direct link to an image (https://...)", "eventkoi-lite")}
      </div>
      <Input
        type="url"
        placeholder={__("https://example.com/banner.jpg", "eventkoi-lite")}
        value={urlInput}
        onChange={(e) => setUrlInput(e.target.value)}
        className="w-full"
        disabled={uploading}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onSubmit();
          }
        }}
      />
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="default"
          onClick={onSubmit}
          disabled={uploading}
        >
          {__("Set Image", "eventkoi-lite")}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onCancel}
          disabled={uploading}
        >
          {__("Cancel", "eventkoi-lite")}
        </Button>
      </div>
    </div>
  );
}

function ImagePreviewOverlay({ imageUrl, openMediaLibrary, deleteImage, onError }) {
  return (
    <div className="relative w-full h-auto group">
      <img
        src={imageUrl}
        alt=""
        className="w-full h-auto rounded-2xl object-cover transition duration-300 group-hover:opacity-80"
        onError={onError}
      />
      <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl">
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="secondary"
            size="sm"
            className="bg-white/20 text-white hover:bg-white/30"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              openMediaLibrary();
            }}
          >
            <Repeat2 className="w-4 h-4 mr-1" />
            {__("Replace", "eventkoi-lite")}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="bg-red-500/80 hover:bg-red-600 text-white"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              deleteImage();
            }}
          >
            <Trash2 className="w-4 h-4 mr-1" />
            {__("Delete", "eventkoi-lite")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function MissingImageOverlay({ openMediaLibrary, deleteImage }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-muted/40 px-6 py-10 text-center">
      <ImageIcon className="h-10 w-10 text-muted-foreground" strokeWidth={1.2} />
      <div className="text-base font-semibold">
        {__("Image missing", "eventkoi-lite")}
      </div>
      <div className="text-sm text-muted-foreground">
        {__("This image is no longer available. Replace it to continue.", "eventkoi-lite")}
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          variant="secondary"
          size="sm"
          className="border border-solid cursor-pointer"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            openMediaLibrary();
          }}
        >
          <Repeat2 className="w-4 h-4 mr-1" />
          {__("Replace", "eventkoi-lite")}
        </Button>
        <Button
          variant="destructive"
          size="sm"
          className="border border-solid cursor-pointer"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            deleteImage();
          }}
        >
          <Trash2 className="w-4 h-4 mr-1" />
          {__("Remove", "eventkoi-lite")}
        </Button>
      </div>
    </div>
  );
}
