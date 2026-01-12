import { useStore } from "../store";

interface ShortcutGroup {
  title: string;
  shortcuts: { key: string; description: string }[];
}

const shortcutGroups: ShortcutGroup[] = [
  {
    title: "Navigation",
    shortcuts: [
      { key: "↑ ↓ ← →", description: "Navigate through images" },
      { key: "/", description: "Focus search box" },
      { key: "Home", description: "Go to first image" },
      { key: "End", description: "Go to last image" },
    ],
  },
  {
    title: "Preview & View",
    shortcuts: [
      { key: "Space", description: "Toggle Quick Look preview" },
      { key: "Enter", description: "Open detail view" },
      { key: "G", description: "Switch to grid view" },
      { key: "C", description: "Switch to compare view" },
      { key: "I", description: "Toggle info panel" },
    ],
  },
  {
    title: "Selection",
    shortcuts: [
      { key: "Tab", description: "Toggle selection, move to next" },
      { key: "Shift+Tab", description: "Toggle selection, move to previous" },
      { key: "⌘A", description: "Select all visible images" },
      { key: "⌘D", description: "Deselect all" },
      { key: "⌘I", description: "Invert selection" },
    ],
  },
  {
    title: "Zoom & Size",
    shortcuts: [
      { key: "+ / =", description: "Increase thumbnail size" },
      { key: "-", description: "Decrease thumbnail size" },
      { key: "Scroll", description: "Zoom in detail view" },
    ],
  },
  {
    title: "General",
    shortcuts: [
      { key: "⌘⇧P", description: "Open command palette" },
      { key: "?", description: "Show this help" },
      { key: "Esc", description: "Close overlay / Clear selection" },
    ],
  },
];

export function KeyboardHelp() {
  const { setKeyboardHelpOpen } = useStore();

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setKeyboardHelpOpen(false);
    }
  };

  return (
    <div className="keyboard-help-overlay" onClick={handleBackdropClick}>
      <div className="keyboard-help">
        <div className="keyboard-help-header">
          <h2>Keyboard Shortcuts</h2>
          <button
            className="keyboard-help-close"
            onClick={() => setKeyboardHelpOpen(false)}
          >
            ×
          </button>
        </div>
        <div className="keyboard-help-content">
          {shortcutGroups.map((group) => (
            <div key={group.title} className="keyboard-help-group">
              <h3 className="keyboard-help-group-title">{group.title}</h3>
              <div className="keyboard-help-shortcuts">
                {group.shortcuts.map((shortcut) => (
                  <div key={shortcut.key} className="keyboard-help-shortcut">
                    <kbd className="keyboard-help-key">{shortcut.key}</kbd>
                    <span className="keyboard-help-description">
                      {shortcut.description}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="keyboard-help-footer">
          <span>Press <kbd>?</kbd> or <kbd>Esc</kbd> to close</span>
        </div>
      </div>
    </div>
  );
}
