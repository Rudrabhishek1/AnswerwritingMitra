
import React from 'react';

interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
    const renderInlineFormatting = (text: string) => {
        const parts = text.split(/\*\*(.*?)\*\*/g);
        return parts.map((part, index) => {
            if (index % 2 === 1) {
                return <strong key={index} className="font-semibold text-blue-400">{part}</strong>;
            }
            return part;
        });
    };

  const renderContent = () => {
    if (!content) return null;

    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let listType: 'ol' | 'ul' | null = null;
    let listItems: React.ReactNode[] = [];

    const flushList = () => {
        if (listItems.length > 0) {
            if (listType === 'ul') {
                elements.push(<ul key={`ul-${elements.length}`} className="space-y-2 list-inside list-disc pl-2">{listItems}</ul>);
            } else if (listType === 'ol') {
                elements.push(<ol key={`ol-${elements.length}`} className="space-y-2 list-inside list-decimal pl-2">{listItems}</ol>);
            }
            listItems = [];
            listType = null;
        }
    };
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      const diagramMatch = trimmedLine.match(/^\[DIAGRAM:\s?(.*)\]$/);

      if (diagramMatch) {
          flushList();
          const diagramContent = diagramMatch[1];
          elements.push(
              <div key={index} className="my-4 p-4 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100/50 dark:bg-gray-800/50">
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Diagram / Flowchart</p>
                  <pre className="text-gray-800 dark:text-gray-400 text-sm whitespace-pre-wrap font-mono">{diagramContent.replace(/\\n/g, '\n')}</pre>
              </div>
          );
      } else if (trimmedLine.startsWith('### ')) {
        flushList();
        elements.push(<h3 key={index} className="text-xl font-semibold mt-6 mb-3 text-gray-200">{trimmedLine.substring(4)}</h3>);
      } else if (trimmedLine.startsWith('## ')) {
        flushList();
        elements.push(<h2 key={index} className="text-2xl font-bold mt-8 mb-4 text-gray-100 border-b border-gray-600/50 pb-2">{trimmedLine.substring(3)}</h2>);
      } else if (trimmedLine.startsWith('# ')) {
        flushList();
        elements.push(<h1 key={index} className="text-3xl font-extrabold mt-8 mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">{trimmedLine.substring(2)}</h1>);
      } else if (trimmedLine.startsWith('---')) {
        flushList();
        elements.push(<hr key={index} className="my-8 border-gray-300/20 dark:border-gray-700/50" />);
      } else if (trimmedLine.startsWith('* ')) {
        if (listType !== 'ul') {
            flushList();
            listType = 'ul';
        }
        listItems.push(<li key={index} className="text-gray-400 leading-relaxed">{renderInlineFormatting(trimmedLine.substring(2))}</li>);
      } else if (/^\d+\.\s/.test(trimmedLine)) {
         if (listType !== 'ol') {
            flushList();
            listType = 'ol';
         }
         listItems.push(<li key={index} className="text-gray-400 leading-relaxed">{renderInlineFormatting(trimmedLine.replace(/^\d+\.\s/, ''))}</li>);
      } else if (trimmedLine === '') {
        flushList();
        elements.push(<div key={index} className="h-2"></div>);
      } else {
        flushList();
        elements.push(<p key={index} className="my-3 text-gray-300 leading-relaxed">{renderInlineFormatting(trimmedLine)}</p>);
      }
    });

    flushList(); // Flush any remaining list items at the end
    return elements;
  };

  return <div className="prose dark:prose-invert max-w-none">{renderContent()}</div>;
};

export default MarkdownRenderer;
