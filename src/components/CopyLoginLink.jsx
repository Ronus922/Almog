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
      className="gap-2"
    >
      {copied ? (
        <>
          <Check className="w-4 h-4 text-green-600" />
          הועתק
        </>
      ) : (
        <>
          <Link2 className="w-4 h-4" />
          העתק קישור כניסה
        </>
      )}
    </Button>
  );
}