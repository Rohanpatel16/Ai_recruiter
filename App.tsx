import React, { useState, useCallback, useEffect } from 'react';
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
      
      // FIX: Use a type predicate to narrow the type of `r` so `r.value` is accessible in `map`.
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

    const fileReadPromises = files.map(file => {
      const promise = file.type === 'application/pdf'
          ? readPdfAsText(file)
          : readFileAsText(file);
      return promise.then(text => ({ name: file.name, text }));
    });

    try {
        const results = await Promise.all(fileReadPromises);
        setResumeTexts(results);
    } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred during file processing.');
    } finally {
        setParsingMessage(null);
    }
  }, []);

  const handleJdFileRead = useCallback(async (file: File | null) => {
    if (!file) {
      setJobDescriptionText('');
      return;
    }
    setParsingMessage('Parsing Job Description...');
    setError(null);
    try {
      const text = await readFileAsText(file);
      setJobDescriptionText(text);
    } catch(err) {
      setError(err instanceof Error ? err.message : 'An error occurred reading the job description.');
    } finally {
      setParsingMessage(null);
    }
  }, []);
  
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
              isParsing={parsingMessage?.includes('resume')}
              multiple
            />
            <FileUploadCard
              title="Upload Job Description"
              files={jobDescriptionFile ? [jobDescriptionFile] : []}
              setFiles={(files) => setJobDescriptionFile(files[0] || null)}
              acceptedFileTypes=".txt, .md"
              isParsing={parsingMessage?.includes('Job Description')}
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
                `Analyze ${resumeFiles.length > 0 ? resumeFiles.length : ''} Candidate(s)`
              )}
            </button>
          </div>
        </div>

        {/* Right Panel: Results */}
        <div className="w-full lg:w-2/3 p-6 md:p-12 lg:h-screen lg:overflow-y-auto">
          {loading ? (
             <div className="flex flex-col items-center justify-center h-full">
                <ArrowPathIcon className="animate-spin h-12 w-12 text-blue-500" />
                <p className="mt-4 text-lg font-semibold text-gray-600 dark:text-gray-300">Gemini is analyzing {resumeTexts.length} document(s)...</p>
                <p className="text-gray-500 dark:text-gray-400">This might take a moment.</p>
             </div>
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