import React, { useState, useCallback, useEffect } from 'react';
import { analyzeResume, extractCandidateName } from './services/geminiService';
import type { AnalysisResult } from './types';
import { FileUploadCard } from './components/InputCard';
import { MultiResultDisplay } from './components/ResultDisplay';
import { ArrowPathIcon, DocumentDuplicateIcon, SparklesIcon } from './components/Icons';

declare global {
  interface Window {
    pdfjsLib: any;
  }
}

const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = () => reject(new Error(`Error reading file: ${file.name}`));
        reader.readAsText(file);
    });
};

const readPdfAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.3.136/pdf.worker.mjs`;
        const reader = new FileReader();
        reader.onload = async (event) => {
            if (!event.target?.result) {
                return reject(new Error('Failed to read PDF file.'));
            }
            try {
                const typedArray = new Uint8Array(event.target.result as ArrayBuffer);
                const pdf = await window.pdfjsLib.getDocument(typedArray).promise;
                const pagesPromises = Array.from({ length: pdf.numPages }, (_, i) => pdf.getPage(i + 1));
                const pages = await Promise.all(pagesPromises);
                let fullText = '';
                for (const page of pages) {
                    const textContent = await page.getTextContent();
                    fullText += textContent.items.map((item: any) => item.str).join(' ') + '\n';
                }
                resolve(fullText);
            } catch (err) {
                console.error("PDF Parsing Error:", err);
                reject(new Error(`Failed to parse PDF: ${file.name}. It might be corrupted.`));
            }
        };
        reader.onerror = () => reject(new Error(`Error reading file: ${file.name}`));
        reader.readAsArrayBuffer(file);
    });
};

const readPdfBlobAsText = async (blob: Blob): Promise<string> => {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.3.136/pdf.worker.mjs`;
    try {
        const arrayBuffer = await blob.arrayBuffer();
        const typedArray = new Uint8Array(arrayBuffer);
        const pdf = await window.pdfjsLib.getDocument(typedArray).promise;
        const pagesPromises = Array.from({ length: pdf.numPages }, (_, i) => pdf.getPage(i + 1));
        const pages = await Promise.all(pagesPromises);
        let fullText = '';
        for (const page of pages) {
            const textContent = await page.getTextContent();
            fullText += textContent.items.map((item: any) => item.str).join(' ') + '\n';
        }
        return fullText;
    } catch (err) {
        console.error("PDF Parsing Error:", err);
        throw new Error(`Failed to parse PDF from blob. It might be corrupted.`);
    }
};

const readFileBlobAsText = (blob: Blob): Promise<string> => {
    return blob.text();
};

const Loader: React.FC<{ message: string; subMessage?: string; }> = ({ message, subMessage }) => (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="loader">
        <svg width="100" height="100" viewBox="0 0 100 100">
          <defs>
            <mask id="clipping">
              <polygon points="0,0 100,0 100,100 0,100" fill="black"></polygon>
              <polygon points="25,25 75,25 50,75" fill="white"></polygon>
              <polygon points="50,25 75,75 25,75" fill="white"></polygon>
              <polygon points="35,35 65,35 50,65" fill="white"></polygon>
              <polygon points="35,35 65,35 50,65" fill="white"></polygon>
              <polygon points="35,35 65,35 50,65" fill="white"></polygon>
              <polygon points="35,35 65,35 50,65" fill="white"></polygon>
            </mask>
          </defs>
        </svg>
        <div className="box"></div>
      </div>
      <p className="mt-8 text-lg font-semibold text-gray-600 dark:text-gray-300">{message}</p>
      {subMessage && <p className="text-gray-500 dark:text-gray-400">{subMessage}</p>}
    </div>
);


const App: React.FC = () => {
  const [resumeFiles, setResumeFiles] = useState<File[]>([]);
  const [jobDescriptionFile, setJobDescriptionFile] = useState<File | null>(null);
  
  const [resumeTexts, setResumeTexts] = useState<{ name: string; text: string; }[]>([]);
  const [jobDescriptionText, setJobDescriptionText] = useState<string>('');
  
  const [analysisResults, setAnalysisResults] = useState<{ name: string; result: AnalysisResult; }[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [parsingMessage, setParsingMessage] = useState<string | null>(null);

  const handleAnalyze = useCallback(async () => {
    if (resumeTexts.length === 0 || !jobDescriptionText) {
      setError('Please provide at least one resume and a job description.');
      return;
    }
    setError(null);
    setLoading(true);
    setAnalysisResults([]);
    try {
      const analysisPromises = resumeTexts.map(resume =>
        analyzeResume(resume.text, jobDescriptionText)
          .then(result => ({ name: resume.name, status: 'fulfilled' as const, value: result }))
          .catch(error => ({ name: resume.name, status: 'rejected' as const, reason: error }))
      );

      const settledResults = await Promise.all(analysisPromises);
      
      const successfulResults = settledResults
        .filter((r): r is { name: string; status: 'fulfilled'; value: AnalysisResult } => r.status === 'fulfilled')
        .map(r => ({ name: r.name, result: r.value }));
      
      const failedResults = settledResults.filter(r => r.status === 'rejected');

      setAnalysisResults(successfulResults);

      if (failedResults.length > 0) {
        const errorMsg = `Failed to analyze ${failedResults.length} resume(s): ${failedResults.map(r => r.name).join(', ')}.`;
        setError(errorMsg);
        console.error("Analysis failures:", failedResults);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred during analysis.');
    } finally {
      setLoading(false);
    }
  }, [resumeTexts, jobDescriptionText]);

  const handleResumeFilesRead = useCallback(async (files: File[]) => {
    if (files.length === 0) {
        setResumeTexts([]);
        return;
    }
    setParsingMessage(`Parsing ${files.length} resume(s)...`);
    setError(null);
    setResumeTexts([]);

    try {
        // 1. Parse files to get text
        const fileReadPromises = files.map(file => {
            const promise = file.type === 'application/pdf'
                ? readPdfAsText(file)
                : readFileAsText(file);
            return promise.then(text => ({ originalName: file.name, text }));
        });
        const parsedFiles = await Promise.all(fileReadPromises);

        // 2. Extract names using Gemini if there are files
        if (parsedFiles.length > 0) {
            setParsingMessage(`Extracting candidate names...`);
            const nameExtractionPromises = parsedFiles.map(parsedFile =>
                extractCandidateName(parsedFile.text)
                    .catch(err => {
                        console.error(`Failed to extract name for ${parsedFile.originalName}:`, err);
                        return parsedFile.originalName; // Fallback to original filename on error
                    })
            );
            const extractedNames = await Promise.all(nameExtractionPromises);

            // 3. Ensure names are unique for display
            const finalNames: string[] = [];
            extractedNames.forEach(name => {
                let newName = name;
                let counter = 1;
                while (finalNames.includes(newName)) {
                    newName = `${name} (${counter})`;
                    counter++;
                }
                finalNames.push(newName);
            });
            
            // 4. Set state with new names
            const newResumeTexts = parsedFiles.map((parsedFile, index) => ({
                name: finalNames[index],
                text: parsedFile.text,
            }));
            setResumeTexts(newResumeTexts);
        }
    } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred during file processing.');
    } finally {
        setParsingMessage(null);
    }
  }, []);

  const handleJdFileRead = useCallback(async (file: File | null) => {
    if (!file) {
      // Don't clear text if there's no file, allows for plain text entry
      if (!jobDescriptionText) setJobDescriptionText('');
      return;
    }
    setParsingMessage('Parsing Job Description...');
    setError(null);
    try {
      const text = file.type === 'application/pdf'
          ? await readPdfAsText(file)
          : await readFileAsText(file);
      setJobDescriptionText(text);
    } catch(err) {
      setError(err instanceof Error ? err.message : 'An error occurred reading the job description.');
    } finally {
      setParsingMessage(null);
    }
  }, [jobDescriptionText]);

  const handleJdTextChange = (text: string) => {
    setJobDescriptionText(text);
    if (jobDescriptionFile) {
      setJobDescriptionFile(null); // Clear file if user starts typing
    }
  };

  const handleUrlAdd = async (
    url: string,
    onSuccess: (file: File, text: string) => void
  ) => {
    setParsingMessage('Fetching from URL...');
    setError(null);
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch from URL: ${response.statusText}. The server might be down or blocking the request (CORS policy).`);
        }
        const blob = await response.blob();
        
        const fileName = url.substring(url.lastIndexOf('/') + 1).split('?')[0] || 'file_from_url';
        const file = new File([blob], fileName, { type: blob.type });

        const isPdf = file.type === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');
        
        const text = isPdf
            ? await readPdfBlobAsText(blob)
            : await readFileBlobAsText(blob);
        
        onSuccess(file, text);

    } catch (err) {
        let message = 'An error occurred fetching the URL.';
        if (err instanceof Error) {
            message = err.message;
        }
        if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
            message = 'Could not fetch the URL. This may be due to the server\'s CORS policy, which prevents cross-origin requests. The file must be on a server that allows requests from this page.'
        }
        setError(message);
    } finally {
        setParsingMessage(null);
    }
  };

  const handleResumeUrlAdd = (url: string) => {
    return handleUrlAdd(url, (file) => {
        // Add file to the list; the useEffect on resumeFiles will handle processing.
        setResumeFiles(prev => [...prev, file]);
    });
  };

  const handleJdUrlAdd = (url: string) => {
      return handleUrlAdd(url, (file, text) => {
          setJobDescriptionText(text);
          setJobDescriptionFile(file);
      });
  };
  
  useEffect(() => {
    handleResumeFilesRead(resumeFiles);
  }, [resumeFiles, handleResumeFilesRead]);

  useEffect(() => {
    handleJdFileRead(jobDescriptionFile);
  }, [jobDescriptionFile, handleJdFileRead]);

  const isProcessing = loading || !!parsingMessage;
  const canAnalyze = resumeTexts.length > 0 && jobDescriptionText && !isProcessing;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans antialiased">
      <main className="flex flex-col lg:flex-row h-screen">
        {/* Left Panel: Inputs */}
        <div className="w-full lg:w-1/3 bg-white dark:bg-gray-800/50 p-6 md:p-8 flex flex-col shadow-lg z-10 lg:h-screen lg:overflow-y-auto">
          <header className="text-center mb-8">
            <div className="inline-flex items-center justify-center bg-blue-100 dark:bg-blue-900/50 p-3 rounded-full mb-4">
               <DocumentDuplicateIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
              AI Resume Analyzer
            </h1>
            <p className="mt-2 text-gray-500 dark:text-gray-400">
              Upload multiple resumes and one job description to compare.
            </p>
          </header>

          <div className="space-y-6 flex-grow">
            <FileUploadCard
              title="Upload Resumes"
              files={resumeFiles}
              setFiles={setResumeFiles}
              acceptedFileTypes=".pdf, .txt, .md"
              isParsing={parsingMessage?.includes('resume') || parsingMessage?.includes('candidate')}
              onAddUrl={handleResumeUrlAdd}
              multiple
            />
            <FileUploadCard
              title="Upload Job Description"
              files={jobDescriptionFile ? [jobDescriptionFile] : []}
              setFiles={(files) => setJobDescriptionFile(files[0] || null)}
              acceptedFileTypes=".pdf, .txt, .md"
              isParsing={parsingMessage?.includes('Job Description')}
              onAddUrl={handleJdUrlAdd}
              allowPlainText
              plainTextValue={jobDescriptionText}
              onTextChange={handleJdTextChange}
            />
          </div>
          
          <div className="mt-8">
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative mb-4" role="alert">
                  <span className="block sm:inline">{error}</span>
              </div>
            )}
            <button
              onClick={handleAnalyze}
              disabled={!canAnalyze}
              className="w-full inline-flex items-center justify-center px-8 py-4 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 disabled:scale-100"
            >
              {isProcessing ? (
                <>
                  <ArrowPathIcon className="animate-spin h-5 w-5 mr-3" />
                  {parsingMessage || 'Analyzing...'}
                </>
              ) : (
                `Analyze ${resumeTexts.length > 0 ? resumeTexts.length : ''} Candidate(s)`
              )}
            </button>
          </div>
        </div>

        {/* Right Panel: Results */}
        <div className="w-full lg:w-2/3 p-6 md:p-12 lg:h-screen lg:overflow-y-auto">
          {loading ? (
             <Loader 
                message={`Gemini is analyzing ${resumeTexts.length} document(s)...`}
                subMessage="This might take a moment."
             />
          ) : analysisResults.length > 0 ? (
            <MultiResultDisplay results={analysisResults} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center bg-gray-100 dark:bg-gray-800/50 rounded-2xl p-8">
              <SparklesIcon className="h-16 w-16 text-blue-400 mb-4"/>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Ready for Analysis</h2>
              <p className="mt-2 max-w-md text-gray-500 dark:text-gray-400">
                Once you've uploaded resumes and a job description, the detailed analysis will appear here.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;