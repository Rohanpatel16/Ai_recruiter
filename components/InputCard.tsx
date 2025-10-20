import React, { useState } from 'react';
import { DocumentPlusIcon, TrashIcon, ArrowPathIcon, DocumentCheckIcon } from './Icons';

interface FileUploadCardProps {
  title: string;
  files: File[];
  setFiles: (files: File[]) => void;
  acceptedFileTypes: string;
  isParsing: boolean;
  multiple?: boolean;
}

export const FileUploadCard: React.FC<FileUploadCardProps> = ({ title, files, setFiles, acceptedFileTypes, isParsing, multiple = false }) => {
  const [isDragging, setIsDragging] = useState(false);
  
  const handleFileChange = (newFiles: FileList | null) => {
    if (newFiles && newFiles.length > 0) {
      setFiles(multiple ? [...files, ...Array.from(newFiles)] : Array.from(newFiles));
    }
  };

  const onDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  
  const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  
  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFileChange(e.dataTransfer.files);
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileChange(e.target.files);
    e.target.value = ''; // Reset file input
  };

  const removeFile = (fileToRemove: File) => {
    setFiles(files.filter(f => f !== fileToRemove));
  };
  
  const clearFiles = () => {
    setFiles([]);
  };

  const hasFiles = files.length > 0;

  return (
    <div className="bg-gray-50 dark:bg-gray-800/70 p-4 rounded-xl shadow-inner border border-gray-200 dark:border-gray-700">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-bold text-gray-800 dark:text-white">{title}</h3>
        {hasFiles && !isParsing && (
          <button onClick={clearFiles} className="text-sm text-gray-500 hover:underline">Clear all</button>
        )}
      </div>
      <div 
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors duration-200
          ${isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-gray-300 dark:border-gray-600'}
          ${hasFiles ? 'border-green-500 bg-green-50 dark:bg-green-900/30' : ''}`}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        <input
          type="file"
          className="hidden"
          accept={acceptedFileTypes}
          onChange={onFileInputChange}
          id={`file-upload-${title.replace(/\s+/g, '-')}`}
          multiple={multiple}
        />
        
        {isParsing ? (
           <div className="flex flex-col items-center justify-center h-28">
              <ArrowPathIcon className="animate-spin h-8 w-8 text-blue-500" />
              <p className="mt-2 font-semibold text-blue-600 dark:text-blue-300">Processing...</p>
           </div>
        ) : hasFiles ? (
          <div className="flex flex-col items-center justify-center h-28 text-left">
            <ul className="w-full h-full overflow-y-auto space-y-1 pr-2">
              {files.map((file, index) => (
                <li key={index} className="flex items-center justify-between bg-white dark:bg-gray-700/50 p-2 rounded-md">
                  <DocumentCheckIcon className="h-5 w-5 text-green-600 dark:text-green-400 mr-2 flex-shrink-0"/>
                  <p className="font-medium text-gray-700 dark:text-gray-200 truncate text-sm flex-grow">{file.name}</p>
                  <button onClick={() => removeFile(file)} className="text-red-500 hover:text-red-700 ml-2 p-1">
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <label htmlFor={`file-upload-${title.replace(/\s+/g, '-')}`} className="cursor-pointer flex flex-col items-center justify-center h-28">
            <DocumentPlusIcon className="h-8 w-8 text-gray-400 dark:text-gray-500 mb-2" />
            <p className="text-gray-500 dark:text-gray-400">
              <span className="font-semibold text-blue-600 dark:text-blue-400">Click to upload</span> or drag & drop
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              ({acceptedFileTypes})
            </p>
          </label>
        )}
      </div>
    </div>
  );
};
