import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Link2, Check } from "lucide-react";
import { toast } from "sonner";

export default function CopyLoginLink() {
  const [copied, setCopied] = useState(false);
  
  const loginUrl = `${window.location.origin}${window.location.pathname}`;
  
  const handleCopy = () => {
    navigator.clipboard.writeText(loginUrl);
    setCopied(true);
    toast.success('קישור התחברות הועתק ללוח');
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={handleCopy}
      className="gap-2 rounded-xl h-10 px-4 font-semibold border-blue-200 hover:bg-blue-50 hover:border-blue-300"
    >
      {copied ? (
        <>
          <Check className="w-5 h-5 text-green-600" />
          הקישור הועתק!
        </>
      ) : (
        <>
          <Link2 className="w-5 h-5" />
          העתק קישור כניסה
        </>
      )}
    </Button>
  );
}