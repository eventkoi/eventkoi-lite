import React, { useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import {
  Upload,
} from "lucide-react"

// Create the Dropzone component receiving props
export function Dropzone({
  inputKey,
  title,
  tagline,
  onChange,
  className,
  fileExtension,
  setFileInfo,
  setFileError,
  setOpen,
  ...props
}) {

  // Initialize state variables using the useState hook
  const fileInputRef = useRef(null); // Reference to file input element

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

  // Function to handle file input change event
  const handleFileInputChange = (e) => {
    const { files } = e.target;
    if (files) {
      handleFiles(files);
    }
  };

  // Function to handle processing of uploaded files
  const handleFiles = (files) => {
    const uploadedFile = files[0];

    // Check file extension
    if (fileExtension && !uploadedFile.name.endsWith(`.csv`)) {
      setFileInfo(uploadedFile);
      setFileError( `Invalid file. Please upload a ${fileExtension}` );
      setOpen(true);
      return;
    }

    const fileSizeInKB = Math.round(uploadedFile.size / 1024); // Convert to KB

    const fileList = Array.from(files).map((file) => URL.createObjectURL(file));
    onChange((prevFiles) => [...prevFiles, ...fileList]);

    // Display file information
    setFileInfo(uploadedFile);
    setFileError(null); // Reset error state
    setOpen(true);
  };

  // Function to simulate a click on the file input element
  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <Card
      className={`rounded-xl border-2 border-dashed bg-muted hover:cursor-pointer hover:border-muted-foreground/50 ${className}`}
      {...props}
    >
      <CardContent
        className="flex flex-col items-center justify-center p-6 min-h-[250px] text-sm text-foreground"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleButtonClick}
      >
        <Upload className="w-7 h-7" />
        { title && <div className="text-base font-medium pt-2">{title}</div> }
        { tagline && <div className="text-sm pt-0.5">{tagline}</div> }
        <input
          ref={fileInputRef}
          type="file"
          accept={`.${fileExtension}`}
          onChange={handleFileInputChange}
          className="hidden"
          key={ `unique-file-${inputKey}` }
        />
      </CardContent>
    </Card>
  );
}
