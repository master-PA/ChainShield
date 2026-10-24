import React, { useState } from 'react';
import { X, Send, Headphones, ExternalLink, HelpCircle, CheckCircle, ShieldAlert } from 'lucide-react';
import { useSecurity, ChatMessageItem } from '../../context/SecurityContext';

interface ChatPanelProps {
  navigate: (route: string) => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ navigate }) => {
  const { chatOpen, setChatOpen, chatMessages, sendChatMessage, language } = useSecurity();
  const [inputText, setInputText] = useState('');

  if (!chatOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    sendChatMessage(inputText.trim());
    setInputText('');
  };

  const suggestionChips = [
    'How is risk score calculated?',
    'What is Claim-vs-Reality?',
    'How do I revoke approvals?',
    'What is an EIP-2612 Permit?',
    'Why is unlimited approval dangerous?',
  ];

  return (
    <aside className="fixed top-14 right-0 bottom-0 w-80 sm:w-96 bg-[#11161D] border-l border-[#1F2630] z-40 flex flex-col justify-between shadow-2xl">
      {/* Header */}
      <div className="p-3 border-b border-[#1F2630] flex items-center justify-between bg-[#0E131A]">
        <div className="flex items-center space-x-2">
          <Headphones className="w-4 h-4 text-teal-400" />
          <div>
            <div className="text-xs font-semibold text-zinc-100">Sentinel Support</div>
            <div className="text-[10px] text-zinc-400 font-mono">Supervised KB • 0% Generative AI</div>
          </div>
        </div>
        <button
          onClick={() => setChatOpen(false)}
          className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-[#161D26]"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 p-3 overflow-y-auto space-y-3">
        {chatMessages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            {/* Sender & Category */}
            {msg.sender === 'sentinel' && msg.categoryLabel && (
              <div className="flex items-center space-x-1.5 mb-1 px-1">
                <span className="text-[10px] font-mono text-teal-400 font-medium">
                  {msg.categoryLabel}
                </span>
                {msg.confidence !== undefined && (
                  <span className="text-[9px] font-mono text-zinc-500">
                    ({Math.round(msg.confidence * 100)}% match)
                  </span>
                )}
              </div>
            )}

            <div
              className={`p-3 rounded-lg text-xs leading-relaxed max-w-[90%] border ${
                msg.sender === 'user'
                  ? 'bg-teal-950/60 text-zinc-100 border-teal-800/80 rounded-br-none'
                  : 'bg-[#161D26] text-zinc-200 border-[#1F2630] rounded-bl-none'
              }`}
            >
              <p>{msg.text}</p>

              {/* Action Link button */}
              {msg.action && (
                <button
                  onClick={() => {
                    navigate(msg.action!.route);
                    setChatOpen(false);
                  }}
                  className="mt-2.5 inline-flex items-center space-x-1.5 px-2.5 py-1 rounded bg-teal-950 text-teal-300 border border-teal-700 hover:bg-teal-900 text-[11px] font-medium"
                >
                  <span>{msg.action.label}</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}

              {/* Suggested Followups */}
              {msg.suggestedTopics && msg.suggestedTopics.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-[#1F2630]/80 space-y-1">
                  <div className="text-[10px] text-zinc-400 font-mono">Related Questions:</div>
                  {msg.suggestedTopics.map((topic, i) => (
                    <button
                      key={i}
                      onClick={() => sendChatMessage(topic.question)}
                      className="block text-left text-[11px] text-teal-400 hover:underline"
                    >
                      • {topic.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Suggestion Chips */}
      <div className="p-2 border-t border-[#1F2630] bg-[#0E131A] overflow-x-auto whitespace-nowrap scrollbar-none flex gap-1.5">
        {suggestionChips.map((chip, idx) => (
          <button
            key={idx}
            onClick={() => sendChatMessage(chip)}
            className="px-2 py-1 rounded text-[11px] bg-[#161D26] border border-[#1F2630] text-zinc-300 hover:border-teal-500/50 hover:text-teal-300 shrink-0 transition-colors"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Input Field */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-[#1F2630] bg-[#11161D]">
        <div className="relative">
          <input
            type="text"
            placeholder={language === 'hinglish' ? 'Apna sawaal ya target yahan likhein...' : 'Ask a security question or paste a URL/hash...'}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="w-full bg-[#161D26] border border-[#1F2630] rounded-md pl-3 pr-9 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-teal-500 transition-colors"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-teal-400 hover:text-teal-300 disabled:opacity-30"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </aside>
  );
};
