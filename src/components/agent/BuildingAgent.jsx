import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Bot, X, Send, Minimize2, Maximize2, Trash2, Sparkles } from 'lucide-react';

const QUICK_QUESTIONS = [
  'מה המשימות שלי להיום?',
  'מה הפגישות שלי היום?',
  'מה המשימות הדחופות?',
  'מה המשימות שלי השבוע?',
];

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex items-end gap-2 mb-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-sm">
          <Bot className="w-4 h-4 text-white" />
        </div>
      )}
      <div
        className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
          isUser
            ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-bl-2xl rounded-br-sm'
            : 'bg-white text-slate-800 border border-slate-100 rounded-bl-sm rounded-br-2xl'
        }`}
        style={{ direction: 'rtl', textAlign: 'right', whiteSpace: 'pre-wrap' }}
      >
        {msg.content}
      </div>
    </div>
  );
}

export default function BuildingAgent() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'שלום! אני עוזר הבניין החכם 🏢\nאני יכול לענות על שאלות לגבי:\n• דיירים, חובות וטלפונים\n• משימות ופגישות\n• כל מידע על הבניין\n\nמה תרצה לדעת?',
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const conversationHistoryRef = useRef([]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setHasUnread(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [messages, isOpen, isMinimized]);

  const sendMessage = async (text) => {
    const question = (text || input).trim();
    if (!question || isLoading) return;

    const userMsg = { role: 'user', content: question };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await base44.functions.invoke('buildingAgent', {
        question,
        conversationHistory: conversationHistoryRef.current,
      });

      const answer = response?.data?.answer || 'מצטער, לא הצלחתי לעבד את השאלה.';
      const assistantMsg = { role: 'assistant', content: answer };

      // שמור היסטוריה
      conversationHistoryRef.current = [
        ...conversationHistoryRef.current,
        userMsg,
        assistantMsg,
      ].slice(-16);

      setMessages(prev => [...prev, assistantMsg]);

      if (!isOpen || isMinimized) {
        setHasUnread(true);
      }
    } catch (err) {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'אירעה שגיאה. אנא נסה שוב.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearHistory = () => {
    conversationHistoryRef.current = [];
    setMessages([
      {
        role: 'assistant',
        content: 'השיחה נוקתה. כיצד אוכל לעזור לך?',
      },
    ]);
  };

  return (
    <>
      {/* Floating Bubble Button */}
      <button
        onClick={() => {
          setIsOpen(true);
          setIsMinimized(false);
          setHasUnread(false);
        }}
        className={`fixed bottom-6 left-6 z-50 w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 ${
          isOpen ? 'opacity-0 pointer-events-none scale-75' : 'opacity-100 scale-100'
        } bg-gradient-to-br from-blue-600 to-indigo-700`}
        title="עוזר הבניין"
      >
        <Bot className="w-7 h-7 text-white" />
        {hasUnread && (
          <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse" />
        )}
        {/* Ripple effect */}
        <span className="absolute inset-0 rounded-full bg-white opacity-0 animate-ping" style={{ animationDuration: '2s' }} />
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div
          dir="rtl"
          className={`fixed bottom-6 left-6 z-50 flex flex-col bg-white rounded-3xl shadow-2xl border border-slate-200 transition-all duration-300 overflow-hidden ${
            isMinimized ? 'h-16 w-72' : 'w-96 h-[600px]'
          }`}
          style={{ maxHeight: 'calc(100vh - 100px)' }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-4 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="text-white/70 hover:text-white transition-colors p-1"
                title={isMinimized ? 'הרחב' : 'מזער'}
              >
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/70 hover:text-white transition-colors p-1"
                title="סגור"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-2.5">
              <div>
                <p className="text-white font-bold text-sm text-right">עוזר הבניין</p>
                {!isMinimized && (
                  <p className="text-blue-200 text-xs text-right">מופעל על ידי AI</p>
                )}
              </div>
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 bg-slate-50" style={{ scrollbarWidth: 'thin' }}>
                {messages.map((msg, i) => (
                  <MessageBubble key={i} msg={msg} />
                ))}
                {isLoading && (
                  <div className="flex items-end gap-2 mb-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Questions */}
              {messages.length <= 1 && (
                <div className="px-3 pb-2 flex flex-wrap gap-1.5 justify-end bg-slate-50 border-t border-slate-100">
                  {QUICK_QUESTIONS.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(q)}
                      disabled={isLoading}
                      className="text-xs bg-white border border-blue-200 text-blue-700 rounded-full px-3 py-1.5 hover:bg-blue-50 transition-colors font-medium shadow-sm"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}

              {/* Input */}
              <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2 flex-shrink-0">
                <Button
                  onClick={sendMessage}
                  disabled={!input.trim() || isLoading}
                  size="icon"
                  className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 flex-shrink-0 shadow-sm"
                >
                  <Send className="w-4 h-4" />
                </Button>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="שאל שאלה..."
                  disabled={isLoading}
                  rows={1}
                  dir="rtl"
                  className="flex-1 resize-none border border-slate-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent bg-slate-50 text-right leading-tight"
                  style={{ maxHeight: '80px', minHeight: '40px' }}
                  onInput={(e) => {
                    e.target.style.height = 'auto';
                    e.target.style.height = Math.min(e.target.scrollHeight, 80) + 'px';
                  }}
                />
                <button
                  onClick={clearHistory}
                  className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                  title="נקה שיחה"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}