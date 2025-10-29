
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { analyzeResume } from './services/geminiService';
import type { AnalysisResult } from './types';
import { FileUploadCard } from './components/InputCard';
import { MultiResultDisplay } from './components/ResultDisplay';
import { ArrowPathIcon, DocumentDuplicateIcon, SparklesIcon } from './components/Icons';

declare global {
  interface Window {
    pdfjsLib: any;
  }
}

export type FileStatus = 'queued' | 'parsing' | 'ready' | 'analyzing' | 'done' | 'error';

export interface ResumeFile {
  id: string; // Unique ID like `file.name-file.size-file.lastModified`
  file: File;
  status: FileStatus;
  text: string;
  candidateName: string; // Starts as file.name, gets updated after analysis
  error?: string;
}

const BATCH_SIZE = 5;

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

const readBlobAsText = (blob: Blob, isPdf: boolean): Promise<string> => {
    return new Promise((resolve, reject) => {
        if (isPdf) {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.3.136/pdf.worker.mjs`;
            const reader = new FileReader();
            reader.onload = async (event) => {
                if (!event.target?.result) return reject(new Error('Failed to read PDF blob.'));
                try {
                    const typedArray = new Uint8Array(event.target.result as ArrayBuffer);
                    const pdf = await window.pdfjsLib.getDocument(typedArray).promise;
                    let fullText = '';
                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const textContent = await page.getTextContent();
                        fullText += textContent.items.map((item: any) => item.str).join(' ') + '\n';
                    }
                    resolve(fullText);
                } catch (err) {
                    reject(new Error(`Failed to parse PDF from blob.`));
                }
            };
            reader.onerror = () => reject(new Error(`Error reading blob.`));
            reader.readAsArrayBuffer(blob);
        } else {
            blob.text().then(resolve).catch(reject);
        }
    });
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
  const [resumes, setResumes] = useState<ResumeFile[]>([]);
  const [jobDescriptionFile, setJobDescriptionFile] = useState<File | null>(null);
  const [jobDescriptionText, setJobDescriptionText] = useState<string>('');
  
  const [analysisResults, setAnalysisResults] = useState<{ name: string; result: AnalysisResult; }[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const updateResumeStatus = useCallback((id: string, status: Partial<ResumeFile>) => {
    setResumes(prev => prev.map(r => r.id === id ? { ...r, ...status } : r));
  }, []);

  // Process queued resumes for parsing
  useEffect(() => {
    const queuedResumes = resumes.filter(r => r.status === 'queued');
    if (queuedResumes.length === 0) return;

    const processBatch = async () => {
        const batch = queuedResumes.slice(0, BATCH_SIZE);
        for (const resume of batch) {
            updateResumeStatus(resume.id, { status: 'parsing' });
            try {
                const text = resume.file.type === 'application/pdf'
                    ? await readPdfAsText(resume.file)
                    : await readFileAsText(resume.file);

                const isDuplicate = resumes.some(r => r.id !== resume.id && r.text && r.text === text);
                if (isDuplicate) {
                    throw new Error('Duplicate content detected.');
                }

                updateResumeStatus(resume.id, { text, status: 'ready' });
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Failed to parse file.';
                updateResumeStatus(resume.id, { status: 'error', error: message });
            }
        }
    };
    processBatch();
  }, [resumes, updateResumeStatus]);
  

  const handleAnalyze = useCallback(async () => {
    const resumesToAnalyze = resumes.filter(r => r.status === 'ready');
    if (resumesToAnalyze.length === 0 || !jobDescriptionText) {
      setError('Please provide at least one valid resume and a job description.');
      return;
    }
    setError(null);
    setLoading(true);
    setAnalysisResults([]);

    resumesToAnalyze.forEach(r => updateResumeStatus(r.id, { status: 'analyzing' }));

    const totalBatches = Math.ceil(resumesToAnalyze.length / BATCH_SIZE);
    
    try {
        for (let i = 0; i < resumesToAnalyze.length; i += BATCH_SIZE) {
            const batch = resumesToAnalyze.slice(i, i + BATCH_SIZE);
            const currentBatchNum = i / BATCH_SIZE + 1;
            setLoadingMessage(`Analyzing batch ${currentBatchNum} of ${totalBatches}...`);

            const batchPromises = batch.map(resume =>
              analyzeResume(resume.text, jobDescriptionText)
                .then(result => ({ status: 'fulfilled' as const, value: result, id: resume.id }))
                .catch(error => ({ name: resume.candidateName, status: 'rejected' as const, reason: error, id: resume.id }))
            );
            
            const settledResults = await Promise.all(batchPromises);

            const successfulResults = settledResults
              .filter((r): r is { status: 'fulfilled'; value: AnalysisResult; id: string } => r.status === 'fulfilled')
              .map(r => {
                updateResumeStatus(r.id, { status: 'done', candidateName: r.value.candidateName });
                return { name: r.value.candidateName, result: r.value };
              });
            
            const failedResults = settledResults.filter((r): r is { name: string; status: 'rejected'; reason: any; id: string } => r.status === 'rejected');
            failedResults.forEach(r => {
                const message = r.reason instanceof Error ? r.reason.message : 'Analysis failed.';
                updateResumeStatus(r.id, { status: 'error', error: message });
            });

            setAnalysisResults(prev => [...prev, ...successfulResults]);
        }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred during analysis.');
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  }, [resumes, jobDescriptionText, updateResumeStatus]);

  
  const handleJdFileRead = useCallback(async (file: File | null) => {
    if (!file) {
      if (!jobDescriptionText) setJobDescriptionText('');
      return;
    }
    setError(null);
    try {
      const text = file.type === 'application/pdf'
          ? await readPdfAsText(file)
          : await readFileAsText(file);
      setJobDescriptionText(text);
    } catch(err) {
      setError(err instanceof Error ? err.message : 'An error occurred reading the job description.');
    }
  }, [jobDescriptionText]);

  const handleJdTextChange = (text: string) => {
    setJobDescriptionText(text);
    if (jobDescriptionFile) {
      setJobDescriptionFile(null);
    }
  };
  
  type FileData = File | { file: File; name?: string };

  const addResumeFiles = (filesToAdd: FileData[]) => {
    const newResumeFiles = filesToAdd
        .map(item => {
            const file = item instanceof File ? item : item.file;
            const name = !(item instanceof File) ? item.name : undefined;
            const id = `${file.name}-${file.size}-${file.lastModified}`;
            if (resumes.some(r => r.id === id)) return null; // Prevent adding the exact same file object
            return {
                id,
                file,
                status: 'queued' as FileStatus,
                text: '',
                candidateName: name || file.name,
            };
        })
        .filter((f): f is ResumeFile => f !== null);

    setResumes(prev => [...prev, ...newResumeFiles]);
  };

  const removeResume = (id: string) => {
    setResumes(prev => prev.filter(r => r.id !== id));
  };
  
  const clearResumes = () => {
    setResumes([]);
  }

  const handleUrlsAdd = async (urls: string[]) => {
    setError(null);
    
    const filesData: { file: File; name: string }[] = [];
    
    for (const url of urls) {
        try {
            let resumeUrl = url;
            let candidateNameFromApi: string | undefined;

            if (url.startsWith('https://tigihr.com/talent/')) {
                const profileId = url.split('/').filter(p => p).pop();
                if (profileId) {
                    const profileResponse = await fetch('https://api-v1.tigihr.com/profile/getProfileBaseUserDetail', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ profile_id: profileId }),
                    });
                    if (!profileResponse.ok) throw new Error(`TigiHR API failed: ${profileResponse.statusText}`);
                    const profileData = await profileResponse.json();
                    if (profileData.isError || !profileData.data?.resume_path) {
                        throw new Error('Could not find resume in TigiHR profile.');
                    }
                    resumeUrl = profileData.data.resume_path;
                    candidateNameFromApi = profileData.data.full_name;
                } else {
                    throw new Error('Invalid TigiHR URL.');
                }
            }

            const response = await fetch(resumeUrl);
            if (!response.ok) throw new Error(`Fetch failed: ${response.statusText}`);
            
            const blob = await response.blob();
            const fileName = resumeUrl.substring(resumeUrl.lastIndexOf('/') + 1).split('?')[0] || 'file_from_url';
            const file = new File([blob], fileName, { type: blob.type });
            filesData.push({ file, name: candidateNameFromApi || fileName });

        } catch (err) {
            const message = err instanceof Error ? err.message : 'An error occurred fetching URL.';
            setError(`Failed to fetch ${url}: ${message}`);
        }
    }
    
    if (filesData.length > 0) {
        addResumeFiles(filesData);
    }
  };

  const handleJdUrlAdd = async (url: string) => {
      setError(null);
      try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch from URL: ${response.statusText}.`);
        }
        const blob = await response.blob();
        
        const fileName = url.substring(url.lastIndexOf('/') + 1).split('?')[0] || 'file_from_url';
        const file = new File([blob], fileName, { type: blob.type });

        const isPdf = file.type === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');
        const text = await readBlobAsText(blob, isPdf);
        
        setJobDescriptionText(text);
        setJobDescriptionFile(file);

    } catch (err) {
        let message = err instanceof Error ? err.message : 'An error occurred fetching the URL.';
        if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
            message = 'Could not fetch the URL. This may be due to a CORS policy.'
        }
        setError(message);
    }
  };
  
  useEffect(() => {
    handleJdFileRead(jobDescriptionFile);
  }, [jobDescriptionFile, handleJdFileRead]);

  const readyResumesCount = useMemo(() => resumes.filter(r => ['ready', 'done'].includes(r.status)).length, [resumes]);
  const isProcessing = useMemo(() => resumes.some(r => ['queued', 'parsing'].includes(r.status)), [resumes]);
  const canAnalyze = readyResumesCount > 0 && !!jobDescriptionText && !isProcessing && !loading;

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
              Upload resumes and one job description to compare.
            </p>
          </header>

          <div className="space-y-6 flex-grow">
            <FileUploadCard
              title="Upload Resumes"
              resumes={resumes}
              onAddFiles={(files) => addResumeFiles(files)}
              onRemoveResume={removeResume}
              onClearResumes={clearResumes}
              acceptedFileTypes=".pdf, .txt, .md"
              onAddUrls={handleUrlsAdd}
              multiple
            />
            <FileUploadCard
              title="Upload Job Description"
              files={jobDescriptionFile ? [jobDescriptionFile] : []}
              setFiles={(files) => setJobDescriptionFile(files[0] || null)}
              acceptedFileTypes=".pdf, .txt, .md"
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
                  <button onClick={() => setError(null)} className="absolute top-0 bottom-0 right-0 px-4 py-3">
                    <span className="text-2xl">&times;</span>
                  </button>
              </div>
            )}
            <button
              onClick={handleAnalyze}
              disabled={!canAnalyze}
              className="w-full inline-flex items-center justify-center px-8 py-4 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 disabled:scale-100"
            >
              {isProcessing || loading ? (
                <>
                  <ArrowPathIcon className="animate-spin h-5 w-5 mr-3" />
                  {loading ? loadingMessage : 'Processing resumes...'}
                </>
              ) : (
                `Analyze ${readyResumesCount > 0 ? readyResumesCount : ''} Candidate(s)`
              )}
            </button>
          </div>
        </div>

        {/* Right Panel: Results */}
        <div className="w-full lg:w-2/3 p-6 md:p-12 lg:h-screen lg:overflow-y-auto">
          {loading && analysisResults.length === 0 ? (
             <Loader 
                message={loadingMessage || `Gemini is analyzing documents...`}
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
