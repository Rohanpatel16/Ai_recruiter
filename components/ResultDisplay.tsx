import React, { useState } from 'react';
import type { AnalysisResult } from '../types';
import { CheckCircleIcon, XCircleIcon, ThumbUpIcon, ThumbDownIcon, MinusCircleIcon, QuestionMarkCircleIcon } from './Icons';


const RecommendationBadge: React.FC<{ recommendation: AnalysisResult['recommendation'] }> = ({ recommendation }) => {
    const baseClasses = "inline-flex items-center px-4 py-1.5 text-sm font-bold rounded-full gap-2";
    switch (recommendation) {
        case 'HIRE':
            return <div className={`${baseClasses} bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200`}><ThumbUpIcon className="h-5 w-5" /> HIRE</div>;
        case 'CONSIDER':
            return <div className={`${baseClasses} bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200`}><MinusCircleIcon className="h-5 w-5" /> CONSIDER</div>;
        case 'DO NOT HIRE':
            return <div className={`${baseClasses} bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200`}><ThumbDownIcon className="h-5 w-5" /> DO NOT HIRE</div>;
        default:
            return null;
    }
};

const ScoreCircle: React.FC<{ score: number }> = ({ score }) => {
    const circumference = 2 * Math.PI * 45;
    const offset = circumference - (score / 100) * circumference;
    
    let colorClass = 'text-green-500';
    if (score < 50) colorClass = 'text-red-500';
    else if (score < 75) colorClass = 'text-yellow-500';
    
    return (
        <div className="relative flex items-center justify-center w-32 h-32">
            <svg className="absolute w-full h-full" viewBox="0 0 100 100">
                <circle className="text-gray-200 dark:text-gray-700" strokeWidth="10" stroke="currentColor" fill="transparent" r="45" cx="50" cy="50" />
                <circle
                    className={`${colorClass} transition-all duration-1000 ease-out`}
                    strokeWidth="10"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r="45"
                    cx="50"
                    cy="50"
                    transform="rotate(-90 50 50)"
                />
            </svg>
            <span className={`text-3xl font-bold ${colorClass}`}>{score}%</span>
        </div>
    );
};

export const ResultDisplay: React.FC<{ name: string, result: AnalysisResult }> = ({ name, result }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-b-xl animate-fade-in">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 border-b border-gray-200 dark:border-gray-700 pb-6 mb-6">
            <div className="text-center md:text-left">
                <p className="inline-block bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-semibold px-4 py-1.5 rounded-full text-base mb-4 truncate max-w-sm md:max-w-md lg:max-w-lg">
                    {name}
                </p>
                <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2">Analysis Complete</h2>
                <RecommendationBadge recommendation={result.recommendation} />
            </div>
            <div className="flex flex-col items-center">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Relevancy Score</span>
                <ScoreCircle score={result.relevancyScore} />
            </div>
        </div>

        <div className="space-y-6">
            <div>
                <h3 className="text-xl font-bold mb-2 text-gray-800 dark:text-gray-200">Summary</h3>
                <p className="text-gray-600 dark:text-gray-300">{result.summary}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h3 className="text-xl font-bold mb-3 text-green-600 dark:text-green-400 flex items-center gap-2">
                        <CheckCircleIcon className="h-6 w-6" />
                        Pros
                    </h3>
                    <ul className="space-y-2 pl-2">
                        {result.pros.map((pro, index) => (
                            <li key={index} className="flex items-start">
                                <span className="text-green-500 mr-2 mt-1">&#10003;</span>
                                <span className="text-gray-600 dark:text-gray-300">{pro}</span>
                            </li>
                        ))}
                    </ul>
                </div>
                <div>
                    <h3 className="text-xl font-bold mb-3 text-red-600 dark:text-red-400 flex items-center gap-2">
                        <XCircleIcon className="h-6 w-6" />
                        Cons
                    </h3>
                    <ul className="space-y-2 pl-2">
                        {result.cons.map((con, index) => (
                             <li key={index} className="flex items-start">
                                <span className="text-red-500 mr-2 mt-1">&#10007;</span>
                                <span className="text-gray-600 dark:text-gray-300">{con}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            <div className="pt-4">
                <h3 className="text-xl font-bold mb-2 text-gray-800 dark:text-gray-200">Final Verdict</h3>
                <p className="text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">{result.finalVerdict}</p>
            </div>

            {result.interviewQuestions && result.interviewQuestions.length > 0 && (
              <div className="pt-4">
                  <h3 className="text-xl font-bold mb-3 text-blue-600 dark:text-blue-400 flex items-center gap-2">
                      <QuestionMarkCircleIcon className="h-6 w-6" />
                      Suggested Interview Questions
                  </h3>
                  <ul className="space-y-3 pl-2">
                      {result.interviewQuestions.map((question, index) => (
                           <li key={index} className="flex items-start bg-gray-50 dark:bg-gray-700/50 p-3 rounded-md">
                              <span className="text-blue-500 font-bold mr-3">{index + 1}.</span>
                              <span className="text-gray-700 dark:text-gray-200">{question}</span>
                          </li>
                      ))}
                  </ul>
              </div>
            )}
        </div>
    </div>
  );
};

export const MultiResultDisplay: React.FC<{ results: { name: string; result: AnalysisResult; }[] }> = ({ results }) => {
    const [activeIndex, setActiveIndex] = useState(0);

    if (results.length === 0) return null;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl animate-fade-in">
            <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-4 overflow-x-auto p-4" aria-label="Tabs">
                    {results.map((item, index) => (
                        <button
                            key={item.name}
                            onClick={() => setActiveIndex(index)}
                            className={`
                                ${activeIndex === index
                                    ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300'
                                    : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700/50 dark:text-gray-400 dark:hover:text-gray-200'
                                } 
                                whitespace-nowrap py-3 px-4 font-semibold text-sm rounded-lg transition-colors flex-shrink-0
                            `}
                        >
                           <span className="truncate" style={{maxWidth: '150px'}}>{item.name}</span>
                        </button>
                    ))}
                </nav>
            </div>
            <div className="p-6 md:p-8">
                {results[activeIndex] && <ResultDisplay name={results[activeIndex].name} result={results[activeIndex].result} />}
            </div>
        </div>
    );
};