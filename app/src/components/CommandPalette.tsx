import { useState, useEffect, useRef, useMemo } from "react";
import { useStore } from "../store";

interface Command {
  id: string;
  label: string;
  shortcut?: string;
  category: "view" | "selection" | "navigation" | "actions" | "settings";
  action: () => void;
}

export function CommandPalette() {
  const {
    setCommandPaletteOpen,
    setViewMode,
    setThumbSize,
    thumbSize,
    selectAll,
    clearSelection,
    invertSelection,
    filteredImages,
    setActiveId,
    setKeyboardHelpOpen,
    setInfoPanelOpen,
    infoPanelOpen,
  } = useStore();

  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: Command[] = useMemo(
    () => [
      // View commands
      {
        id: "grid-view",
        label: "Switch to Grid View",
        shortcut: "G",
        category: "view",
        action: () => {
          setViewMode("grid");
          setCommandPaletteOpen(false);
        },
      },
      {
        id: "compare-view",
        label: "Switch to Compare View",
        shortcut: "C",
        category: "view",
        action: () => {
          setViewMode("compare");
          setCommandPaletteOpen(false);
        },
      },
      {
        id: "quicklook",
        label: "Toggle Quick Look",
        shortcut: "Space",
        category: "view",
        action: () => {
          setViewMode("quicklook");
          setCommandPaletteOpen(false);
        },
      },
      {
        id: "increase-thumbs",
        label: "Increase Thumbnail Size",
        shortcut: "+",
        category: "view",
        action: () => {
          setThumbSize(thumbSize + 50);
          setCommandPaletteOpen(false);
        },
      },
      {
        id: "decrease-thumbs",
        label: "Decrease Thumbnail Size",
        shortcut: "-",
        category: "view",
        action: () => {
          setThumbSize(thumbSize - 50);
          setCommandPaletteOpen(false);
        },
      },
      {
        id: "toggle-info",
        label: "Toggle Info Panel",
        shortcut: "I",
        category: "view",
        action: () => {
          setInfoPanelOpen(!infoPanelOpen);
          setCommandPaletteOpen(false);
        },
      },

      // Selection commands
      {
        id: "select-all",
        label: "Select All",
        shortcut: "⌘A",
        category: "selection",
        action: () => {
          selectAll();
          setCommandPaletteOpen(false);
        },
      },
      {
        id: "deselect-all",
        label: "Deselect All",
        shortcut: "⌘D",
        category: "selection",
        action: () => {
          clearSelection();
          setCommandPaletteOpen(false);
        },
      },
      {
        id: "invert-selection",
        label: "Invert Selection",
        shortcut: "⌘I",
        category: "selection",
        action: () => {
          invertSelection();
          setCommandPaletteOpen(false);
        },
      },

      // Navigation commands
      {
        id: "go-first",
        label: "Go to First Image",
        shortcut: "Home",
        category: "navigation",
        action: () => {
          if (filteredImages.length > 0) {
            setActiveId(filteredImages[0].id);
          }
          setCommandPaletteOpen(false);
        },
      },
      {
        id: "go-last",
        label: "Go to Last Image",
        shortcut: "End",
        category: "navigation",
        action: () => {
          if (filteredImages.length > 0) {
            setActiveId(filteredImages[filteredImages.length - 1].id);
          }
          setCommandPaletteOpen(false);
        },
      },
      {
        id: "focus-search",
        label: "Focus Search",
        shortcut: "/",
        category: "navigation",
        action: () => {
          setCommandPaletteOpen(false);
          setTimeout(() => {
            document.querySelector<HTMLInputElement>(".search-box")?.focus();
          }, 100);
        },
      },

      // Settings/Help commands
      {
        id: "keyboard-help",
        label: "Show Keyboard Shortcuts",
        shortcut: "?",
        category: "settings",
        action: () => {
          setCommandPaletteOpen(false);
          setKeyboardHelpOpen(true);
        },
      },
    ],
    [
      setViewMode,
      setCommandPaletteOpen,
      setThumbSize,
      thumbSize,
      selectAll,
      clearSelection,
      invertSelection,
      filteredImages,
      setActiveId,
      setKeyboardHelpOpen,
      setInfoPanelOpen,
      infoPanelOpen,
    ]
  );

  // Filter commands based on query
  const filteredCommands = useMemo(() => {
    if (!query) return commands;
    const lowerQuery = query.toLowerCase();
    return commands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(lowerQuery) ||
        cmd.category.toLowerCase().includes(lowerQuery)
    );
  }, [commands, query]);

  // Reset selection when filtered results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredCommands.length]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          Math.min(prev + 1, filteredCommands.length - 1)
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
        }
        break;
      case "Escape":
        e.preventDefault();
        setCommandPaletteOpen(false);
        break;
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setCommandPaletteOpen(false);
    }
  };

  // Group commands by category
  const groupedCommands = useMemo(() => {
    const groups: Record<string, Command[]> = {};
    filteredCommands.forEach((cmd) => {
      if (!groups[cmd.category]) {
        groups[cmd.category] = [];
      }
      groups[cmd.category].push(cmd);
    });
    return groups;
  }, [filteredCommands]);

  const categoryLabels: Record<string, string> = {
    view: "View",
    selection: "Selection",
    navigation: "Navigation",
    actions: "Actions",
    settings: "Settings",
  };

  let flatIndex = 0;

  return (
    <div className="command-palette-overlay" onClick={handleBackdropClick}>
      <div className="command-palette">
        <div className="command-palette-header">
          <input
            ref={inputRef}
            type="text"
            className="command-palette-input"
            placeholder="Type a command..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        <div className="command-palette-list">
          {Object.entries(groupedCommands).map(([category, cmds]) => (
            <div key={category} className="command-palette-group">
              <div className="command-palette-group-label">
                {categoryLabels[category] || category}
              </div>
              {cmds.map((cmd) => {
                const currentFlatIndex = flatIndex++;
                const isSelected = currentFlatIndex === selectedIndex;
                return (
                  <div
                    key={cmd.id}
                    className={`command-palette-item ${isSelected ? "selected" : ""}`}
                    onClick={() => cmd.action()}
                    onMouseEnter={() => setSelectedIndex(currentFlatIndex)}
                  >
                    <span className="command-palette-item-label">{cmd.label}</span>
                    {cmd.shortcut && (
                      <span className="command-palette-item-shortcut">
                        {cmd.shortcut}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
          {filteredCommands.length === 0 && (
            <div className="command-palette-empty">No commands found</div>
          )}
        </div>
      </div>
    </div>
  );
}
