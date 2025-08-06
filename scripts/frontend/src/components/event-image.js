import { useState } from "react";

import apiRequest from "@wordpress/api-fetch";
import { MediaUpload } from "@wordpress/media-utils";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

import { Image, Loader2, Repeat2, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";

import { Panel } from "@/components/panel";

const ALLOWED_MEDIA_TYPES = ["image"];

export function EventImage({ event, setEvent }) {
  const [uploading, setUploading] = useState(false);

  const deleteImage = () => {
    setEvent((prevState) => ({
      ...prevState,
      image: "",
      image_id: "",
    }));

    setUploading(false);
  };

  // Function to handle drag over event
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // Function to handle drop event
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const { files } = e.dataTransfer;
    handleFiles(files);
  };

  // Function to handle processing of uploaded files
  const handleFiles = (files) => {
    setUploading(true);

    const uploadedFile = files[0];

    const fileSizeInKB = Math.round(uploadedFile.size / 1024); // Convert to KB

    const fileList = Array.from(files).map((file) => URL.createObjectURL(file));

    const formData = new FormData();
    formData.append("uploadedfile", uploadedFile);

    apiRequest({
      path: `${eventkoi_params.api}/upload_image`,
      method: "post",
      body: formData,
      headers: {
        "EVENTKOI-API-KEY": eventkoi_params.api_key,
      },
    })
      .then((response) => {
        if (response.id) {
          setEvent((prevState) => ({
            ...prevState,
            image: response.url,
            image_id: response.id,
          }));
        }
      })
      .catch((error) => {
        setUploading(false);
      });
  };

  return (
    <Panel>
      <Label htmlFor="image">Header banner image</Label>
      <div className="text-muted-foreground">Ideal size: 1800px x 900px</div>
      <MediaUpload
        title={"Select event image"}
        onSelect={(media) => {
          setEvent((prevState) => ({
            ...prevState,
            image: media.url,
            image_id: media.id,
          }));

          setUploading(false);
        }}
        allowedTypes={ALLOWED_MEDIA_TYPES}
        value={event?.image_id}
        render={({ open }) => (
          <div
            className={cn(event.image && "relative p-0 cursor-pointer group")}
          >
            {event?.image && (
              <div
                className="absolute top-0 left-0 flex opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-out w-full h-full bg-background/50 rounded-lg items-center justify-center gap-4 border border-dashed border-muted-foreground/80"
                onClick={(e) => e.preventDefault}
              >
                <Button variant="default" onClick={open}>
                  <Repeat2 className="mr-2 h-4 w-4" />
                  Replace
                </Button>
                <Button variant="default" onClick={(e) => deleteImage()}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </div>
            )}
            {event?.image && (
              <img
                src={event?.image}
                alt=""
                className="rounded-lg w-full h-auto"
              />
            )}
            {!event.image && (
              <div
                className="flex items-center justify-center flex-col gap-1 p-10 cursor-pointer border border-dashed border-muted-foreground/40 bg-secondary rounded-lg cursor-default"
                onClick={open}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                {uploading ? (
                  <Loader2 className="animate-spin w-6 h-6" strokeWidth={1} />
                ) : (
                  <Image className="w-6 h-6" strokeWidth={1} />
                )}
                <div className="pt-1 text-lg font-medium">
                  Drag and drop your image here.
                </div>
                <div className="text-sm">
                  Or click to select from media gallery.
                </div>
              </div>
            )}
          </div>
        )}
      />
    </Panel>
  );
}
