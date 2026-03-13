import React from 'react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { Download } from 'lucide-react';

export default function ChatMessageBubble({ message }) {
  const isSent = message.direction === 'sent';
  const timestamp = new Date(message.timestamp);
  const timeStr = format(timestamp, 'HH:mm', { locale: he });
  const isToday = format(timestamp, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
  const dateStr = isToday 
    ? timeStr 
    : format(timestamp, 'd בMMMM בשעה HH:mm', { locale: he });

  return (
    <div className={`flex mb-2 ${isSent ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg text-sm leading-relaxed ${
          isSent
            ? 'bg-green-500 text-white rounded-bl-none'
            : 'bg-gray-200 text-gray-900 rounded-br-none'
        }`}
      >
        {message.message_type === 'text' && (
          <p className="break-words whitespace-pre-wrap">{message.content}</p>
        )}
        
        {message.message_type === 'image' && message.content && (
          <img 
            src={message.content} 
            alt="תמונה" 
            className="max-w-xs rounded-lg"
          />
        )}
        
        {message.message_type === 'document' && message.content && (
          <a 
            href={message.content} 
            target="_blank" 
            rel="noopener noreferrer"
            className={`flex items-center gap-2 underline ${isSent ? 'text-blue-100' : 'text-blue-600'}`}
          >
            <Download className="w-4 h-4" />
            {message.content.split('/').pop()}
          </a>
        )}
        
        <p className={`text-xs mt-1 ${isSent ? 'text-green-100' : 'text-gray-600'}`}>
          {timeStr}
        </p>
      </div>
    </div>
  );
}