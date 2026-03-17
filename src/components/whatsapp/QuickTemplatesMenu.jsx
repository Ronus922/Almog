import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Zap } from 'lucide-react';

export default function QuickTemplatesMenu({ onSelectTemplate }) {
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['whatsapp-templates'],
    queryFn: () => base44.entities.WhatsAppTemplate.list(),
    staleTime: 1000 * 60 * 5,
  });

  const availableTemplates = templates.slice(0, 5);
  const hasTemplates = availableTemplates.length > 0;

  if (!hasTemplates) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 text-gray-600 hover:bg-gray-100"
          title="תבניות מהירות"
        >
          <Zap className="w-5 h-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-72 p-0 border border-gray-200 rounded-lg shadow-lg"
        dir="rtl"
        align="end"
      >
        <div className="bg-white rounded-lg overflow-hidden">
          <div className="p-3 border-b border-gray-100 bg-gray-50">
            <h3 className="font-semibold text-sm text-gray-700">תבניות מהירות</h3>
          </div>
          
          {isLoading ? (
            <div className="p-4 text-center text-sm text-gray-500">טוען...</div>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              {availableTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => onSelectTemplate(template.content)}
                  className="w-full text-right p-3 border-b border-gray-100 hover:bg-blue-50 transition-colors last:border-b-0"
                >
                  <div className="font-medium text-sm text-gray-800 mb-1">{template.name}</div>
                  <div className="text-xs text-gray-500 line-clamp-2 whitespace-pre-wrap">{template.content}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}