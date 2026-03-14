import React from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { FileText, Archive, Undo2 } from 'lucide-react';

export default function TableActionsCell({
  record,
  isAdmin,
  showArchived,
  archivingRecords,
  onCommentClick,
  onWhatsAppClick,
  onArchiveToggle
}) {
  const handleArchiveClick = (e) => {
    e.stopPropagation();
    onArchiveToggle(record, e);
  };

  return (
    <div className="flex items-center justify-center gap-2 text-[#9ca7ca]">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCommentClick(record);
            }}
            className="inline-flex h-6 w-6 items-center justify-center rounded-full transition-colors hover:bg-[rgba(95,111,255,0.08)] hover:text-[#5f6fff]">
            <FileText className="h-4 w-4" strokeWidth={2} />
          </button>
        </TooltipTrigger>
        <TooltipContent><p>הוסף הערה</p></TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onWhatsAppClick(record);
            }}
            className="inline-flex h-6 w-6 items-center justify-center rounded-full transition-colors hover:bg-[rgba(95,111,255,0.08)] hover:text-[#5f6fff]">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M12.001 2C6.47813 2 2.00098 6.47715 2.00098 12C2.00098 13.8697 2.50415 15.6229 3.38687 17.1283L2.04492 21.9551L6.97168 20.6367C8.43179 21.4302 10.1614 21.9 12.001 21.9C17.5239 21.9 21.999 17.4249 21.999 11.9C22.001 6.47715 17.5239 2 12.001 2ZM12.001 20.1C10.3044 20.1 8.72168 19.6163 7.38477 18.7852L7.09961 18.6133L4.19629 19.3936L4.99121 16.5635L4.80176 16.2637C3.88672 14.8857 3.40283 13.2588 3.40283 11.5977C3.40283 6.97949 7.18457 3.19727 12.001 3.19727C16.8174 3.19727 20.5991 6.97949 20.5991 11.5977C20.5991 16.2163 16.8174 20 12.001 20.1ZM16.6025 14.0508C16.3525 13.9258 15.1025 13.3008 14.8525 13.2258C14.6025 13.1258 14.4275 13.1008 14.2525 13.3508C14.0775 13.6008 13.5775 14.1758 13.4275 14.3508C13.2775 14.5258 13.1025 14.5508 12.8525 14.4258C12.6025 14.3008 11.7275 14.0008 10.7025 13.1008C9.90254 12.4008 9.37754 11.5258 9.22754 11.2758C9.07754 11.0258 9.21254 10.9008 9.33754 10.7758C9.45254 10.6508 9.58754 10.5008 9.71254 10.3508C9.83754 10.2008 9.87754 10.1008 9.97754 9.92578C10.0775 9.75078 10.0275 9.60078 9.96504 9.47578C9.90254 9.35078 9.37754 8.10078 9.15254 7.57578C8.92754 7.07578 8.70254 7.12578 8.52754 7.12578C8.37754 7.12578 8.20254 7.10078 8.02754 7.10078C7.85254 7.10078 7.57754 7.16328 7.32754 7.41328C7.07754 7.66328 6.40234 8.28828 6.40234 9.53828C6.40234 10.7883 7.35254 12.0008 7.47754 12.1758C7.60254 12.3508 9.37754 15.1008 12.1275 16.1758C12.8775 16.4758 13.4525 16.6508 13.9025 16.7758C14.6525 17.0008 15.3275 16.9758 15.8525 16.9133C16.4275 16.8383 17.6275 16.3008 17.8525 15.7258C18.0775 15.1508 18.0775 14.6508 18.0025 14.5508C17.9275 14.4508 17.7775 14.3883 17.5275 14.2633L16.6025 14.0508Z"/>
            </svg>
          </button>
        </TooltipTrigger>
        <TooltipContent><p>שלח וואטסאפ</p></TooltipContent>
      </Tooltip>

      {isAdmin && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleArchiveClick}
              disabled={archivingRecords.has(record.id)}
              className="inline-flex h-6 w-6 items-center justify-center rounded-full transition-colors hover:bg-[rgba(95,111,255,0.08)] hover:text-[#5f6fff] disabled:opacity-50 disabled:cursor-not-allowed">
              {showArchived ?
                <Undo2 className="h-4 w-4" strokeWidth={2} /> :
                <Archive className="h-4 w-4" strokeWidth={2} />
              }
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{showArchived ? 'החזר לחייבים' : 'העבר לארכיון'}</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}