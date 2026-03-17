import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { SmilePlus } from 'lucide-react';

const EMOJI_CATEGORIES = {
  'פנים': ['😀', '😁', '😂', '🤣', '😃', '😄', '😅', '😆', '😉', '😊', '😇', '🙂', '🙃', '😌', '😍', '🥰', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😌', '🤑', '🤐', '🤨', '😐', '😑', '😶', '🤫', '🤔'],
  'גופיים': ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🫰', '🤟', '🤘', '🤙', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🤜'],
  'גופי אדם': ['👶', '👧', '🧒', '👦', '👨', '👩', '👴', '👵', '👨‍⚕️', '👩‍⚕️', '👨‍🎓', '👩‍🎓', '👨‍⚖️', '👩‍⚖️'],
  'חיות': ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦'],
  'טבע': ['🌸', '🌼', '🌻', '🌷', '🌹', '🥀', '🌺', '💐', '🌾', '⭐', '🌟', '✨', '⚡', '☀️', '🌤️', '⛅', '🌥️', '☁️', '🌦️', '🌧️'],
  'אוכל': ['🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥑', '🍅', '🍆', '🥒', '🥬', '🥦', '🍕', '🍔', '🍟', '🍗', '🍖', '🌭', '🍪', '🍩', '🍰', '🎂', '☕', '🍹', '🍷', '🍸', '🍺'],
  'פעילויות': ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪃', '🏓', '🏸', '🏒', '🏑', '🥍', '🎣', '🎽', '🎿', '⛷️', '🏂', '🪂', '🪃', '🎪', '🎨', '🎬', '🎤', '🎧', '🎮', '🎯'],
  'טיולים': ['✈️', '🚀', '🚁', '🚂', '🚇', '🚊', '🚝', '🚞', '🚋', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '⛵', '🚤', '🛳️', '⛴️', '🛥️', '🚀', '🛸'],
  'סמלים': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '👑', '💎', '🔔', '🔕', '📢', '📣', '📯', '💬', '💭', '👁️‍🗨️', '🎃', '🎄', '🎆', '🎇', '🎉', '🎊'],
};

export default function EmojiPicker({ onEmojiSelect }) {
  const [openCategory, setOpenCategory] = useState('פנים');
  const [open, setOpen] = useState(false);

  const handleEmojiClick = (emoji) => {
    onEmojiSelect(emoji);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 text-gray-600 hover:bg-gray-100"
          title="בחר אמוג'י"
        >
          <SmilePlus className="w-5 h-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-0 border border-gray-200 rounded-lg shadow-lg"
        dir="rtl"
        align="end"
      >
        <div className="bg-white rounded-lg overflow-hidden">
          {/* Categories Bar */}
          <div className="flex gap-1 p-2 border-b border-gray-100 bg-gray-50 overflow-x-auto">
            {Object.keys(EMOJI_CATEGORIES).map((cat) => (
              <button
                key={cat}
                onClick={() => setOpenCategory(cat)}
                className={`px-2 py-1 text-xs font-medium whitespace-nowrap rounded transition-colors ${
                  openCategory === cat
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Emojis Grid */}
          <div className="p-2 grid grid-cols-8 gap-1 max-h-64 overflow-y-auto">
            {EMOJI_CATEGORIES[openCategory]?.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleEmojiClick(emoji)}
                className="p-2 text-2xl hover:bg-gray-100 rounded transition-colors cursor-pointer"
                title={emoji}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}