import React, { useState, useMemo } from 'react';
import type { AnalysisResult } from '../types';
import { 
    CheckCircleIcon, XCircleIcon, ThumbUpIcon, ThumbDownIcon, MinusCircleIcon, QuestionMarkCircleIcon, 
    ExclamationTriangleIcon, UserCircleIcon, ViewColumnsIcon, ChevronUpIcon, ChevronDownIcon, ChevronUpDownIcon 
} from './Icons';


const RecommendationBadge: React.FC<{ recommendation: AnalysisResult['recommendation'] }> = ({ recommendation }) => {
    const baseClasses = "inline-flex items-center px-4 py-1.5 text-sm font-bold rounded-full gap-2";
    switch (recommendation) {
        case 'Strong Hire':
            return <div className={`${baseClasses} bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200`}><ThumbUpIcon className="h-5 w-5" /> STRONG HIRE</div>;
        case 'Consider':
            return <div className={`${baseClasses} bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200`}><MinusCircleIcon className="h-5 w-5" /> CONSIDER</div>;
        case 'Reject':
            return <div className={`${baseClasses} bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200`}><ThumbDownIcon className="h-5 w-5" /> REJECT</div>;
        default:
            return null;
    }
};

const ScoreCircle: React.FC<{ score: number }> = ({ score }) => {
    const circumference = 2 * Math.PI * 45;
    const offset = circumference - (score / 100) * circumference;
    
    let colorClass = 'text-green-500';
    if (score < 60) colorClass = 'text-red-500';
    else if (score < 85) colorClass = 'text-yellow-500';
    
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

            {result.redFlags && result.redFlags.length > 0 && (
                <div className="pt-4">
                    <h3 className="text-xl font-bold mb-3 text-amber-600 dark:text-amber-400 flex items-center gap-2">
                        <ExclamationTriangleIcon className="h-6 w-6" />
                        Red Flags
                    </h3>
                    <ul className="space-y-2 pl-2">
                        {result.redFlags.map((flag, index) => (
                            <li key={index} className="flex items-start">
                                <span className="text-amber-500 mr-2 mt-1">&#9888;</span>
                                <span className="text-gray-600 dark:text-gray-300">{flag}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

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

type SortKey = 'name' | 'score';
type SortDirection = 'asc' | 'desc';

const ComparisonView: React.FC<{ results: { name: string; result: AnalysisResult; }[] }> = ({ results }) => {
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({ key: 'score', direction: 'desc' });
    
    const sortedResults = useMemo(() => {
        let sortableItems = [...results];
        sortableItems.sort((a, b) => {
            let aValue: string | number;
            let bValue: string | number;
            
            if (sortConfig.key === 'name') {
                aValue = a.name;
                bValue = b.name;
            } else { // score
                aValue = a.result.relevancyScore;
                bValue = b.result.relevancyScore;
            }

            if (aValue < bValue) {
                return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
        return sortableItems;
    }, [results, sortConfig]);

    const requestSort = (key: SortKey) => {
        let direction: SortDirection = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        if (sortConfig.key !== key) {
            direction = key === 'score' ? 'desc' : 'asc';
        }
        setSortConfig({ key, direction });
    };

    const SortableHeader: React.FC<{ sortKey: SortKey, children: React.ReactNode }> = ({ sortKey, children }) => {
        const isSorted = sortConfig.key === sortKey;
        const Icon = isSorted ? (sortConfig.direction === 'asc' ? ChevronUpIcon : ChevronDownIcon) : ChevronUpDownIcon;

        return (
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                <button onClick={() => requestSort(sortKey)} className="flex items-center gap-1 group">
                    {children}
                    <Icon className={`h-4 w-4 ${isSorted ? 'text-gray-700 dark:text-gray-100' : 'text-gray-400 group-hover:text-gray-500'}`} />
                </button>
            </th>
        );
    };
    
    const ListCell: React.FC<{ items: string[], icon: 'pro' | 'con' | 'flag' }> = ({ items, icon }) => {
        if (!items || items.length === 0) return <span className="text-gray-400 italic">None</span>;
        
        const iconMap = {
            pro: <span className="text-green-500 mr-2 mt-1">&#10003;</span>,
            con: <span className="text-red-500 mr-2 mt-1">&#10007;</span>,
            flag: <span className="text-amber-500 mr-2 mt-1">&#9888;</span>
        };

        return (
            <ul className="space-y-1">
                {items.map((item, index) => (
                    <li key={index} className="flex items-start">
                        {iconMap[icon]}
                        <span className="text-gray-600 dark:text-gray-300 text-sm">{item}</span>
                    </li>
                ))}
            </ul>
        );
    };

    return (
        <div className="p-1 md:p-2">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                        <tr>
                            <SortableHeader sortKey="name">Candidate</SortableHeader>
                            <SortableHeader sortKey="score">Score</SortableHeader>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Recommendation</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Pros</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Cons</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Red Flags</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {sortedResults.map(({ name, result }) => (
                            <tr key={name}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900 dark:text-white">{name}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-900 dark:text-white font-semibold">{result.relevancyScore}%</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    <RecommendationBadge recommendation={result.recommendation} />
                                </td>
                                <td className="px-6 py-4 align-top"><ListCell items={result.pros} icon="pro" /></td>
                                <td className="px-6 py-4 align-top"><ListCell items={result.cons} icon="con" /></td>
                                <td className="px-6 py-4 align-top"><ListCell items={result.redFlags} icon="flag" /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};


export const MultiResultDisplay: React.FC<{ results: { name: string; result: AnalysisResult; }[] }> = ({ results }) => {
    const [activeIndex, setActiveIndex] = useState(0);
    const [view, setView] = useState<'individual' | 'comparison'>('individual');

    if (results.length === 0) return null;

    const ViewToggleButton: React.FC<{ active: boolean, onClick: () => void, children: React.ReactNode, position: 'left' | 'right' }> = ({ active, onClick, children, position }) => {
        const positionClass = position === 'left' ? 'rounded-l-md' : 'rounded-r-md -ml-px';
        return (
            <button
                onClick={onClick}
                className={`
                    relative inline-flex items-center px-4 py-2 border text-sm font-medium focus:z-10 focus:outline-none focus:ring-1 focus:ring-blue-500
                    ${active
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600'
                    }
                    ${positionClass} transition-colors
                `}
            >
                {children}
            </button>
        );
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl animate-fade-in">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Analysis Results</h2>
                {results.length > 1 && (
                    <div className="inline-flex rounded-md shadow-sm">
                        <ViewToggleButton active={view === 'individual'} onClick={() => setView('individual')} position="left">
                            <UserCircleIcon className="h-5 w-5 mr-2" />
                            Individual
                        </ViewToggleButton>
                        <ViewToggleButton active={view === 'comparison'} onClick={() => setView('comparison')} position="right">
                            <ViewColumnsIcon className="h-5 w-5 mr-2" />
                            Compare
                        </ViewToggleButton>
                    </div>
                )}
            </div>

            {view === 'individual' || results.length === 1 ? (
                <>
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
                </>
            ) : (
                <ComparisonView results={results} />
            )}
        </div>
    );
};