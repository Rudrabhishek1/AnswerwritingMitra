
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { EXAM_OPTIONS, GENERAL_PAPER_TYPE_OPTIONS, CAPF_PAPER_TYPE_OPTIONS, PAPER_NAME_SUGGESTIONS, UPSC_OPTIONAL_SUBJECTS, OPTIONAL_PAPER_PARTS } from './constants';
import type { EvaluationConfig, Source, HistoryItem } from './types';
import { evaluateAnswerStream, generateModelAnswerStream } from './services/geminiService';
import Card from './components/ui/Card';
import Button from './components/ui/Button';
import Select from './components/ui/Select';
import Input from './components/ui/Input';
import Textarea from './components/ui/Textarea';
import MarkdownRenderer from './components/MarkdownRenderer';
import Toggle from './components/ui/Toggle';
import Logo from './components/Logo';

const App: React.FC = () => {
  const INITIAL_CONFIG: EvaluationConfig = {
    exam: EXAM_OPTIONS[0],
    phase: GENERAL_PAPER_TYPE_OPTIONS[0],
    paper: '',
    section: '',
    question: '',
    marks: 10,
    wordLimit: 150,
    originalPassage: '',
    optionalPart: OPTIONAL_PAPER_PARTS[0]
  };

  const [config, setConfig] = useState<EvaluationConfig>(INITIAL_CONFIG);
  const [answer, setAnswer] = useState('');
  const [evaluation, setEvaluation] = useState('');
  const [modelAnswer, setModelAnswer] = useState('');
  const [sources, setSources] = useState<Source[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingModel, setIsGeneratingModel] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useWebSearch, setUseWebSearch] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');
  const [viewingHistoryItem, setViewingHistoryItem] = useState<HistoryItem | null>(null);
  const [copied, setCopied] = useState(false);
  const [evaluationCompleted, setEvaluationCompleted] = useState(false);
  const [lastEvaluated, setLastEvaluated] = useState<HistoryItem | null>(null);
  
  const evaluationPanelRef = useRef<HTMLDivElement>(null);
  const currentEvaluationId = useRef<string | null>(null);

  useEffect(() => {
    try {
        const savedHistory = localStorage.getItem('answerWritingMitraHistory');
        if (savedHistory) {
            setHistory(JSON.parse(savedHistory));
        }
    } catch (e) {
        console.error("Could not load history from localStorage", e);
    }
  }, []);

  useEffect(() => {
    if (evaluationPanelRef.current) {
        evaluationPanelRef.current.scrollTop = evaluationPanelRef.current.scrollHeight;
    }
  }, [evaluation, sources, modelAnswer, viewingHistoryItem]);


  const handleConfigChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    setEvaluationCompleted(false);
    setLastEvaluated(null);
    
    setConfig(prev => {
        let newConfig = { ...prev };

        if (name === 'exam') {
            const isCapf = value === 'UPSC CAPF';
            const newPaperTypes = isCapf ? CAPF_PAPER_TYPE_OPTIONS : GENERAL_PAPER_TYPE_OPTIONS;
            newConfig = {
                ...INITIAL_CONFIG,
                exam: value,
                phase: newPaperTypes[0],
            };
        } else if (name === 'phase') {
            newConfig.phase = value;
            newConfig.paper = ''; 
            newConfig.optionalPart = OPTIONAL_PAPER_PARTS[0];
            newConfig.originalPassage = '';
        } else {
             newConfig = {
                ...prev,
                [name]: name === 'marks' || name === 'wordLimit' ? Number(value) : value
            };
        }
        
        if (newConfig.phase !== 'Optional/Specialized Paper') {
            delete newConfig.optionalPart;
        }

        return newConfig;
    });
  }, []);

  const handleAnswerChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setAnswer(e.target.value);
      setEvaluationCompleted(false);
      setLastEvaluated(null);
  }
  
  const getScoreFromEvaluation = (text: string): string => {
    const match = text.match(/Final Score\s*:\s*([\d.]+\s*\/\s*\d+)/);
    return match ? match[1].replace(/\s/g, '') : "N/A";
  };
  
  const saveToHistory = (item: HistoryItem) => {
    setHistory(prev => {
        const newHistory = [item, ...prev.filter(h => h.id !== item.id)];
        try {
            localStorage.setItem('answerWritingMitraHistory', JSON.stringify(newHistory));
        } catch (e) {
            console.error("Could not save history to localStorage", e);
            setError("Could not save to history. Your browser's storage might be full.");
        }
        return newHistory;
    });
  };

  const handleEvaluate = useCallback(async () => {
    if (isFormInvalid) {
      setError("Please fill in all required fields.");
      return;
    }
    setIsLoading(true);
    setEvaluationCompleted(false);
    setLastEvaluated(null);
    setError(null);
    setEvaluation('');
    setModelAnswer('');
    setSources([]);
    setActiveTab('current');
    setViewingHistoryItem(null);
    currentEvaluationId.current = new Date().toISOString();

    let fullEvaluation = '';
    evaluateAnswerStream(
      config,
      answer,
      useWebSearch,
      (chunk) => {
        setEvaluation(prev => prev + chunk);
        fullEvaluation += chunk;
      },
      (err) => {
          setError(err.message || 'An unexpected error occurred.');
          setIsLoading(false);
       },
      (data) => {
        setIsLoading(false);
        setSources(data.sources);
        const score = getScoreFromEvaluation(fullEvaluation);
        const historyItem: HistoryItem = {
            id: currentEvaluationId.current!,
            ...config,
            answer,
            evaluation: fullEvaluation,
            sources: data.sources,
            score,
            timestamp: Date.now()
        };
        saveToHistory(historyItem);
        setLastEvaluated(historyItem);
        setEvaluationCompleted(true);
      }
    );
  }, [config, answer, useWebSearch]);

  const handleGenerateModelAnswer = useCallback(async () => {
    const context = viewingHistoryItem || lastEvaluated;
    if (!context) return;
    
    setIsGeneratingModel(true);
    setModelAnswer('');
    setError(null);
    
    // Switch to current tab if generating for the last evaluated item
    if (!viewingHistoryItem) {
        setActiveTab('current');
    }

    let fullModelAnswer = '';
    generateModelAnswerStream(
        context,
        (chunk) => {
            setModelAnswer(prev => prev + chunk)
            fullModelAnswer += chunk;
        },
        (err) => {
            setError(err.message || 'Failed to generate model answer.');
            setIsGeneratingModel(false);
        },
        () => {
            setIsGeneratingModel(false);
            
            if (viewingHistoryItem?.id === context.id) {
                setViewingHistoryItem(prev => prev ? {...prev, modelAnswer: fullModelAnswer} : null);
            }
            if (lastEvaluated?.id === context.id) {
                setLastEvaluated(prev => prev ? {...prev, modelAnswer: fullModelAnswer} : null);
            }

            setHistory(prev => {
                const newHistory = prev.map(item => 
                    item.id === context.id
                    ? { ...item, modelAnswer: fullModelAnswer } 
                    : item
                );
                try {
                     localStorage.setItem('answerWritingMitraHistory', JSON.stringify(newHistory));
                } catch(e) { console.error(e); }
                return newHistory;
            });
        }
    )
  }, [lastEvaluated, viewingHistoryItem]);
  
  const handleClearForm = () => {
    setConfig(INITIAL_CONFIG);
    setAnswer('');
    setEvaluation('');
    setModelAnswer('');
    setSources([]);
    setError(null);
    setIsLoading(false);
    setEvaluationCompleted(false);
    setLastEvaluated(null);
    setActiveTab('current');
    setViewingHistoryItem(null);
  }
  
  const handleCopy = () => {
      const item = viewingHistoryItem || {evaluation};
      const contentToCopy = item.evaluation;
      if (!contentToCopy) return;
      navigator.clipboard.writeText(contentToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  }

  const getAnswerLabel = () => {
    const phase = viewingHistoryItem?.phase || config.phase;
    switch(phase) {
        case 'Precis Writing': return 'Your Precis';
        case 'Report Writing': return 'Your Report';
        case 'Argument/Counterargument': return 'Your Argument / Counterargument';
        case 'Essay': return 'Your Essay';
        default: return 'Your Answer';
    }
  }

  const isFormInvalid = !answer.trim() || !config.question.trim() || !config.paper.trim() || config.marks <= 0 || config.wordLimit <= 0 || (config.phase === 'Precis Writing' && !config.originalPassage?.trim());

  const availablePaperTypes = config.exam === 'UPSC CAPF' ? CAPF_PAPER_TYPE_OPTIONS : GENERAL_PAPER_TYPE_OPTIONS;

  const renderEvaluationContent = (item: HistoryItem | null) => {
      const content = item ? item.evaluation : evaluation;
      const src = item ? item.sources : sources;
      const model = item ? item.modelAnswer : modelAnswer;
      const originalPassage = item ? item.originalPassage : config.originalPassage;

      return <>
        {item && item.phase === 'Precis Writing' && originalPassage && (
             <div className="mb-6 p-4 bg-gray-900/50 rounded-lg border border-gray-700/50">
                <h4 className="text-md font-semibold text-gray-300 mb-2">Original Passage</h4>
                <p className="text-sm text-gray-400 whitespace-pre-wrap font-mono">{originalPassage}</p>
            </div>
        )}
        {content && <MarkdownRenderer content={content} />}
        {src.length > 0 && (
            <div className="mt-8 pt-6 border-t border-gray-300/20 dark:border-gray-700/50">
                <h3 className="text-lg font-semibold text-gray-200 mb-3">Sources from the Web</h3>
                <ul className="space-y-2">
                    {src.map((source, index) => (
                        <li key={index}>
                            <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 hover:underline text-sm truncate block" title={source.title}>
                                <i className="hi-solid hi-link h-4 w-4 inline-block mr-2 align-middle"></i>
                                {source.title}
                            </a>
                        </li>
                    ))}
                </ul>
            </div>
        )}
        {isGeneratingModel && (
            <div className="mt-8 pt-6 border-t border-gray-300/20 dark:border-gray-700/50">
                <h3 className="text-lg font-semibold text-gray-200 mb-3 animate-pulse">Generating Model Answer...</h3>
            </div>
        )}
        {model && (
            <div className="mt-8 pt-6 border-t border-gray-300/20 dark:border-gray-700/50">
                <h3 className="text-lg font-semibold text-gray-200 mb-3">Model Answer</h3>
                <MarkdownRenderer content={model} />
            </div>
        )}
      </>
  }


  return (
    <div className="min-h-screen text-gray-900 dark:text-gray-200 p-4 sm:p-6 lg:p-8 font-sans">
      <header className="mb-12 animate-fade-in-up" style={{animationDelay: '100ms'}}>
        <div className="flex justify-center items-center gap-4 relative">
            <Logo className="h-12 w-12" />
            <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-400 tracking-tight">
                AnswerWritingMitra
            </h1>
        </div>
        <p className="mt-3 text-center text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
          Your free AI answer evaluation partner for mastering answer writing in UPSC, State PCS, and other exams
        </p>
      </header>
      
      <main className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-screen-xl mx-auto animate-fade-in-up" style={{animationDelay: '200ms'}}>
        <div className="flex flex-col gap-8">
          <Card>
            <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">1. Configure Your Test</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Select label="Examination Type" name="exam" value={config.exam} onChange={handleConfigChange} options={EXAM_OPTIONS} />
              <Select label="Paper Type" name="phase" value={config.phase} onChange={handleConfigChange} options={availablePaperTypes} />
              
              {config.phase === 'Optional/Specialized Paper' ? (
                <>
                  <Select
                    label="Optional Subject"
                    name="paper"
                    value={config.paper}
                    onChange={handleConfigChange}
                    options={UPSC_OPTIONAL_SUBJECTS}
                    placeholder="Select an Optional Subject..."
                    required
                  />
                  <Select
                    label="Paper Part"
                    name="optionalPart"
                    value={config.optionalPart || OPTIONAL_PAPER_PARTS[0]}
                    onChange={handleConfigChange}
                    options={OPTIONAL_PAPER_PARTS}
                    required
                  />
                </>
              ) : (
                <Input 
                  label="Paper Name" 
                  name="paper" 
                  value={config.paper} 
                  onChange={handleConfigChange} 
                  placeholder={config.exam === 'UPSC CAPF' ? 'e.g., CAPF Paper 2' : 'e.g., GS-1, Modern History'}
                  required 
                  datalistId="paper-name-suggestions"
                  datalistOptions={PAPER_NAME_SUGGESTIONS}
                />
              )}

              <Input label="Section (Optional)" name="section" value={config.section} onChange={handleConfigChange} placeholder="Section A" />
              <Input label="Marks Allotted" name="marks" type="number" value={config.marks} onChange={handleConfigChange} required />
              <Input label="Word Limit" name="wordLimit" type="number" value={config.wordLimit} onChange={handleConfigChange} required />
              <div className="md:col-span-2">
                <Toggle
                    label="Enable Web Search"
                    description="For questions on current events or recent topics."
                    enabled={useWebSearch}
                    onChange={setUseWebSearch}
                />
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">2. Provide Content for Evaluation</h2>
            <div className="space-y-6">
              <Textarea label="Question / Topic" name="question" value={config.question} onChange={handleConfigChange} placeholder="Paste the full question, report topic, or argument motion here..." rows={3} required />
              {config.phase === 'Precis Writing' && (
                <Textarea label="Original Passage for Precis" name="originalPassage" value={config.originalPassage || ''} onChange={handleConfigChange} placeholder="Paste the original passage to be summarized here..." rows={8} required />
              )}
              <Textarea label={getAnswerLabel()} name="answer" value={answer} onChange={handleAnswerChange} placeholder="Paste your complete content here..." rows={15} required />
            </div>
          </Card>
          
          <div className="sticky bottom-0 py-4 bg-gray-50/80 dark:bg-gray-900/60 backdrop-blur-sm lg:static lg:p-0 lg:bg-transparent z-10 space-y-4">
             <Button onClick={handleEvaluate} isLoading={isLoading} disabled={isFormInvalid || isGeneratingModel} className="w-full">
                {isLoading ? 'Evaluating...' : 'Evaluate My Writing'}
             </Button>
             <div className="grid grid-cols-2 gap-4">
                 <Button onClick={handleClearForm} variant="secondary">Clear Form</Button>
                 <Button 
                    onClick={handleGenerateModelAnswer} 
                    variant="secondary"
                    disabled={(!evaluationCompleted && !viewingHistoryItem) || isLoading || isGeneratingModel}
                  >
                    {isGeneratingModel ? 'Generating...' : 'Generate Model Answer'}
                 </Button>
             </div>
          </div>

        </div>

        <div className="lg:sticky top-8 self-start">
            <Card className="h-full">
                <div className="flex justify-between items-center mb-4">
                     <div className="border-b border-gray-700/50">
                        <nav className="-mb-px flex space-x-4" aria-label="Tabs">
                            <button onClick={() => { setActiveTab('current'); setViewingHistoryItem(null); }} className={`${activeTab === 'current' ? 'border-blue-400 text-blue-300' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}>
                                Current Evaluation
                            </button>
                            <button onClick={() => { setActiveTab('history'); setViewingHistoryItem(null); }} className={`${activeTab === 'history' ? 'border-blue-400 text-blue-300' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}>
                                History ({history.length})
                            </button>
                        </nav>
                    </div>
                    {((activeTab === 'current' && evaluation) || (activeTab === 'history' && viewingHistoryItem)) &&
                        <button onClick={handleCopy} className="text-gray-400 hover:text-white transition-colors p-2 rounded-md">
                            {copied ? <i className="hi-solid hi-check h-5 w-5 text-green-400"></i> : <i className="hi-solid hi-clipboard-document h-5 w-5"></i>}
                        </button>
                    }
                </div>
                 <div ref={evaluationPanelRef} className="h-[calc(100vh-220px)] lg:h-[calc(100vh-160px)] overflow-y-auto pr-4 -mr-4 custom-scrollbar">
                    {activeTab === 'current' && (
                        <>
                            {isLoading && !evaluation && (
                                <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400 animate-pulse">
                                    <div className="w-16 h-16 mb-4 rounded-full bg-blue-500/20"></div>
                                    <p className="font-medium text-lg">Generating feedback...</p>
                                    <p className="text-sm">The AI is analyzing your writing.</p>
                                </div>
                            )}
                            {error && (
                              <div className="p-4 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600/50 rounded-lg">
                                  <p className="text-red-700 dark:text-red-200 font-semibold">An Error Occurred</p>
                                  <p className="text-red-600 dark:text-red-300 mt-1">{error}</p>
                              </div>
                            )}
                            {!isLoading && !error && !evaluation && (
                              <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                                <Logo className="h-16 w-16 mb-4 text-gray-400/80" />
                                <h3 className="font-medium text-lg text-gray-400">Welcome to AnswerWritingMitra!</h3>
                                <p className="text-sm text-center text-gray-500 max-w-xs mt-1">
                                    Fill out the form on the left and your detailed evaluation will appear here.
                                </p>
                              </div>
                            )}
                            
                            {renderEvaluationContent(null)}

                        </>
                    )}
                    {activeTab === 'history' && (
                        <>
                         {viewingHistoryItem ? (
                           <div>
                               <button onClick={() => setViewingHistoryItem(null)} className="mb-4 text-sm text-blue-400 hover:underline">&larr; Back to History</button>
                               <h3 className="text-xl font-bold mb-2 text-gray-100">{viewingHistoryItem.question}</h3>
                               <p className="text-sm text-gray-400 mb-4">{viewingHistoryItem.paper} &bull; {new Date(viewingHistoryItem.timestamp).toLocaleString()}</p>
                               {renderEvaluationContent(viewingHistoryItem)}
                           </div>
                         ) : (
                           <div>
                            {history.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                                    <i className="hi-solid hi-archive-box h-16 w-16 mb-4 text-gray-400/80"></i>
                                    <h3 className="font-medium text-lg text-gray-400">No History Yet</h3>
                                    <p className="text-sm text-center text-gray-500 max-w-xs mt-1">
                                        Your completed evaluations will be saved here automatically.
                                    </p>
                                </div>
                            ) : (
                                <ul className="space-y-4">
                                    {history.map(item => (
                                        <li key={item.id} onClick={() => setViewingHistoryItem(item)} className="bg-gray-800/50 hover:bg-gray-700/60 p-4 rounded-lg cursor-pointer transition-all duration-200 hover:scale-[1.02]">
                                            <div className="flex justify-between items-start">
                                                <p className="font-semibold text-gray-200 flex-1 pr-4 truncate" title={item.question}>{item.question}</p>
                                                <p className="text-sm font-bold text-blue-400 bg-blue-900/50 px-2 py-1 rounded">{item.score}</p>
                                            </div>
                                            <p className="text-sm text-gray-400 mt-2">{item.paper} ({item.phase}) &bull; {new Date(item.timestamp).toLocaleDateString()}</p>
                                        </li>
                                    ))}
                                </ul>
                            )}
                           </div>
                         )}
                        </>
                    )}
                  </div>
            </Card>
        </div>
      </main>
      <footer className="text-center mt-12 py-8 border-t border-gray-200/10 dark:border-gray-700/20 animate-fade-in-up" style={{animationDelay: '300ms'}}>
          <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              ABHISHEK ANAND
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
             Your friend in answer writing excellence.
          </p>
          <div className="mt-4 flex flex-wrap justify-center items-center gap-x-6 gap-y-2 text-gray-600 dark:text-gray-400">
            <a href="mailto:abhishekanand1official@gmail.com" className="group flex items-center gap-2 hover:text-blue-500 transition-colors">
                <i className="hi-solid hi-envelope h-5 w-5"></i>
                <span className="group-hover:underline">abhishekanand1official@gmail.com</span>
            </a>
             <a href="mailto:anandabhishek9879@gmail.com" className="group flex items-center gap-2 hover:text-blue-500 transition-colors">
                <i className="hi-solid hi-envelope h-5 w-5"></i>
                <span className="group-hover:underline">anandabhishek9879@gmail.com</span>
            </a>
          </div>
      </footer>
    </div>
  );
};

export default App;