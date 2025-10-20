import React, { useState } from 'react';
import { DocumentPlusIcon, TrashIcon, ArrowPathIcon, DocumentCheckIcon } from './Icons';

interface FileUploadCardProps {
  title: string;
  files: File[];
  setFiles: (files: File[]) => void;
  acceptedFileTypes: string;
  isParsing: boolean;
  multiple?: boolean;
  onAddUrl?: (url: string) => Promise<void>;
  allowPlainText?: boolean;
  plainTextValue?: string;
  onTextChange?: (text: string) => void;
}

export const FileUploadCard: React.FC<FileUploadCardProps> = ({ 
  title, 
  files, 
  setFiles, 
  acceptedFileTypes, 
  isParsing, 
  multiple = false, 
  onAddUrl,
  allowPlainText = false,
  plainTextValue = '',
  onTextChange 
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [url, setUrl] = useState('');
  const [isUrlProcessing, setIsUrlProcessing] = useState(false);
  
  const handleFileChange = (newFiles: FileList | null) => {
    if (newFiles && newFiles.length > 0) {
      if (onTextChange) onTextChange(''); // Clear text area on file upload
      const fileArray = Array.from(newFiles);
      if (multiple) {
        setFiles([...files, ...fileArray]);
      } else {
        // For single file upload, replace the existing file.
        setFiles(fileArray);
      }
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

  const handleAddUrl = async () => {
    if (!url || !onAddUrl) return;
    setIsUrlProcessing(true);
    try {
        if (onTextChange) onTextChange(''); // Clear text area on URL add
        await onAddUrl(url);
        setUrl('');
    } finally {
        setIsUrlProcessing(false);
    }
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
          disabled={isParsing}
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

      {onAddUrl && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
          <label htmlFor={`url-input-${title.replace(/\s+/g, '-')}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-left">
            Or add from URL
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="url"
              id={`url-input-${title.replace(/\s+/g, '-')}`}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/job-description.pdf"
              className="flex-grow block w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              disabled={isUrlProcessing || isParsing}
              onKeyDown={(e) => e.key === 'Enter' && handleAddUrl()}
            />
            <button
              onClick={handleAddUrl}
              disabled={!url || isUrlProcessing || isParsing}
              className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200 w-20"
            >
              {isUrlProcessing ? <ArrowPathIcon className="animate-spin h-5 w-5" /> : 'Add'}
            </button>
          </div>
        </div>
      )}

      {allowPlainText && onTextChange && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
           <label htmlFor={`text-input-${title.replace(/\s+/g, '-')}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-left">
            Or paste plain text
          </label>
          <textarea
            id={`text-input-${title.replace(/\s+/g, '-')}`}
            value={plainTextValue}
            onChange={(e) => onTextChange(e.target.value)}
            placeholder="Paste the job description here..."
            className="block w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            rows={6}
            disabled={isParsing}
          />
        </div>
      )}
    </div>
  );
};