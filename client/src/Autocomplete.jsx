import { useState, useEffect, useRef } from "react";
import "./Autocomplete.css";

export default function Autocomplete({
  options,
  value,
  onChange,
  placeholder,
}) {
  const [query, setQuery] = useState(value || "");
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const ref = useRef(null);

  // Keep query in sync if parent resets value
  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = options.filter((o) =>
    o.toLowerCase().includes(query.toLowerCase()),
  );

  const select = (val) => {
    setQuery(val);
    onChange(val);
    setOpen(false);
  };

  const handleKey = (e) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[highlighted]) select(filtered[highlighted]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="ac-wrapper" ref={ref}>
      <input
        className="ac-input"
        value={query}
        placeholder={placeholder}
        onChange={(e) => {
          setQuery(e.target.value);
          onChange(e.target.value);
          setOpen(true);
          setHighlighted(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKey}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <ul className="ac-dropdown">
          {filtered.map((opt, i) => (
            <li
              key={opt}
              className={`ac-option ${i === highlighted ? "ac-option-active" : ""}`}
              onMouseDown={() => select(opt)}
              onMouseEnter={() => setHighlighted(i)}
            >
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
