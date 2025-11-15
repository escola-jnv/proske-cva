import { useState, useRef, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';

type User = {
  id: string;
  name: string;
  avatar_url: string | null;
};

type MentionInputProps = {
  value: string;
  onChange: (value: string) => void;
  onMention: (userId: string) => void;
  users: User[];
  placeholder?: string;
  className?: string;
};

export const MentionInput = ({
  value,
  onChange,
  onMention,
  users,
  placeholder,
  className,
}: MentionInputProps) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionQuery, setMentionQuery] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = inputRef.current;
    if (!textarea) return;

    const text = value;
    const cursorPos = textarea.selectionStart || 0;
    setCursorPosition(cursorPos);

    // Check if we're typing a mention
    const textBeforeCursor = text.substring(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      const query = mentionMatch[1].toLowerCase();
      setMentionQuery(query);
      
      const filtered = users.filter(user =>
        user.name.toLowerCase().includes(query)
      );
      
      setFilteredUsers(filtered);
      setShowSuggestions(filtered.length > 0);
      setSelectedIndex(0);
    } else {
      setShowSuggestions(false);
      setMentionQuery('');
    }
  }, [value, users]);

  const insertMention = (user: User) => {
    const textarea = inputRef.current;
    if (!textarea) return;

    const textBeforeCursor = value.substring(0, cursorPosition);
    const textAfterCursor = value.substring(cursorPosition);
    
    // Remove the @ and query text
    const beforeMention = textBeforeCursor.replace(/@\w*$/, '');
    const newText = `${beforeMention}@${user.name} ${textAfterCursor}`;
    
    onChange(newText);
    onMention(user.id);
    setShowSuggestions(false);
    
    // Set cursor position after mention
    setTimeout(() => {
      const newCursorPos = beforeMention.length + user.name.length + 2;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
      textarea.focus();
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => 
        prev < filteredUsers.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter' && filteredUsers.length > 0) {
      e.preventDefault();
      insertMention(filteredUsers[selectedIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <div className="relative w-full">
      <textarea
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
        rows={1}
        style={{ minHeight: '40px', maxHeight: '120px', resize: 'none' }}
      />
      
      {showSuggestions && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
          <ScrollArea className="max-h-[200px]">
            <div className="p-1">
              {filteredUsers.map((user, index) => (
                <button
                  key={user.id}
                  onClick={() => insertMention(user)}
                  className={`w-full flex items-center gap-2 p-2 rounded-md hover:bg-accent transition-colors ${
                    index === selectedIndex ? 'bg-accent' : ''
                  }`}
                >
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={user.avatar_url || ''} />
                    <AvatarFallback className="text-xs">
                      {user.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{user.name}</span>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
};
