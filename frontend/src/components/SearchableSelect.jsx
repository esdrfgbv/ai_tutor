import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Search } from "lucide-react";

export function SearchableSelect({ 
  options, 
  value, 
  onChange, 
  placeholder, 
  required,
  disabled,
  allowCustom
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => 
    opt.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Hidden input for HTML5 validation if required */}
      {required && (
        <input 
          tabIndex={-1}
          className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
          value={value}
          onChange={() => {}}
          required={required}
        />
      )}
      
      {/* Trigger */}
      <div 
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`input flex items-center justify-between cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        style={{ minHeight: '44px' }}
      >
        <span className={value ? "text-white" : "text-[#8a8a8a]"}>
          {value || placeholder}
        </span>
        <ChevronDown size={16} className="text-[#8a8a8a]" />
      </div>

      {/* Dropdown Menu */}
      {isOpen && !disabled && (
        <div 
          className="absolute z-50 w-full mt-1 rounded-xl shadow-xl overflow-hidden"
          style={{ 
            background: "rgba(17,17,17,0.98)", 
            border: "1px solid rgba(255,255,255,0.1)",
            backdropFilter: "blur(20px)"
          }}
        >
          {/* Search box */}
          <div className="p-2 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a8a8a]" />
              <input
                autoFocus
                type="text"
                className="w-full bg-black/50 rounded-lg pl-8 pr-3 py-2 text-sm outline-none text-white focus:ring-1 focus:ring-[#adff44]/50"
                placeholder="Search..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          {/* Options list */}
          <div className="max-h-60 overflow-y-auto p-1 custom-scrollbar">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => (
                <div
                  key={opt}
                  onClick={() => {
                    onChange(opt);
                    setIsOpen(false);
                    setQuery("");
                  }}
                  className={`px-3 py-2 text-sm rounded-lg cursor-pointer transition-colors ${
                    value === opt 
                      ? "bg-[#adff44]/10 text-[#adff44]" 
                      : "text-white/80 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {opt}
                </div>
              ))
            ) : (
              <div className="px-3 py-4 text-sm text-center text-[#8a8a8a]">
                {allowCustom ? "Press Enter to use custom value" : "No matches found"}
              </div>
            )}
            
            {/* Allow custom input if allowed and query isn't empty and doesn't exactly match an option */}
            {allowCustom && query.trim() !== "" && !options.some(o => o.toLowerCase() === query.trim().toLowerCase()) && (
              <div
                onClick={() => {
                  onChange(query.trim());
                  setIsOpen(false);
                  setQuery("");
                }}
                className="px-3 py-2 mt-1 text-sm rounded-lg cursor-pointer transition-colors text-[#adff44] bg-[#adff44]/10 border border-[#adff44]/20"
              >
                Use "{query.trim()}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
