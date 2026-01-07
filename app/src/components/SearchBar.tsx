import { useStore } from "../store";
import { useState, useRef, useEffect } from "react";
import { getHighlightSegments } from "../search";

export function SearchBar() {
  const {
    query,
    setQuery,
    filteredImages,
    images,
    thumbSize,
    setThumbSize,
    setActiveId,
    setViewMode,
    searchSelectedIds,
    setSearchSelectedIds,
    clearSearchSelection,
    folderPath,
  } = useStore();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isDropdownOpen) {
      setSelectedIndex(0);
    }
  }, [filteredImages, isDropdownOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isDropdownOpen) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filteredImages.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case "Tab":
        e.preventDefault();
        // Toggle selection of current item
        if (filteredImages[selectedIndex]) {
          const imageId = filteredImages[selectedIndex].id;
          const newSet = new Set(searchSelectedIds);
          if (newSet.has(imageId)) {
            newSet.delete(imageId);
          } else {
            newSet.add(imageId);
          }
          setSearchSelectedIds(newSet);
          // Move to next item after selecting (like fzf)
          setSelectedIndex((prev) => Math.min(prev + 1, filteredImages.length - 1));
        }
        break;
      case " ":
        // Space also toggles selection (alternative to Tab)
        e.preventDefault();
        if (filteredImages[selectedIndex]) {
          const imageId = filteredImages[selectedIndex].id;
          const newSet = new Set(searchSelectedIds);
          if (newSet.has(imageId)) {
            newSet.delete(imageId);
          } else {
            newSet.add(imageId);
          }
          setSearchSelectedIds(newSet);
        }
        break;
      case "Enter":
        e.preventDefault();
        if (searchSelectedIds.size > 0) {
          // If items are selected, close dropdown and show them in grid
          setIsDropdownOpen(false);
          inputRef.current?.blur();
        } else if (filteredImages[selectedIndex]) {
          // If no items selected, open current item in viewer
          setActiveId(filteredImages[selectedIndex].id);
          setViewMode("viewer");
          setIsDropdownOpen(false);
          inputRef.current?.blur();
        }
        break;
      case "Escape":
        e.preventDefault();
        if (searchSelectedIds.size > 0) {
          // First escape clears selection
          clearSearchSelection();
        } else {
          // Second escape closes dropdown
          setIsDropdownOpen(false);
          inputRef.current?.blur();
        }
        break;
      case "a":
        // Ctrl+A or Cmd+A to select all visible
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          const allIds = new Set(filteredImages.map((img) => img.id));
          setSearchSelectedIds(allIds);
        }
        break;
    }
  };

  const handleSelectFile = (index: number) => {
    setActiveId(filteredImages[index].id);
    setViewMode("viewer");
    setIsDropdownOpen(false);
    inputRef.current?.blur();
  };

  useEffect(() => {
    if (isDropdownOpen && dropdownRef.current) {
      const selectedElement = dropdownRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [selectedIndex, isDropdownOpen]);

  const folderName = folderPath ? folderPath.split("/").filter(Boolean).slice(-1)[0] : "No folder selected";

  return (
    <div className="search-header">
      <div className="search-hero">
        <div className="search-hero-copy">
          <h1>Photo Library</h1>
          <p>
            {folderPath
              ? `Browsing ${folderName} • ${images.length.toLocaleString()} captures`
              : "Choose a folder to start exploring your captures"}
          </p>
        </div>
      </div>
      <div className="search-container">
        <input
          ref={inputRef}
          type="text"
          className="search-box"
          placeholder="Search images (fuzzy search)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsDropdownOpen(true)}
          onKeyDown={handleKeyDown}
          autoFocus
        />
        {isDropdownOpen && filteredImages.length > 0 && (
          <div ref={dropdownRef} className="search-dropdown">
            {filteredImages.slice(0, 100).map((image, index) => {
              const isHighlighted = index === selectedIndex;
              const isChecked = searchSelectedIds.has(image.id);
              return (
                <div
                  key={image.id}
                  className={`search-dropdown-item ${isHighlighted ? "highlighted" : ""} ${
                    isChecked ? "checked" : ""
                  }`}
                  onClick={() => handleSelectFile(index)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="search-dropdown-item-content">
                    <span className="search-dropdown-checkbox">
                      {isChecked ? "✓" : " "}
                    </span>
                    <div className="search-dropdown-text">
                      <span>
                        {getHighlightSegments(image.filename, query).map((seg, i) =>
                          seg.isMatch ? <mark key={i}>{seg.text}</mark> : <span key={i}>{seg.text}</span>
                        )}
                      </span>
                      <span className="search-dropdown-path">{image.parent_path}</span>
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredImages.length > 100 && (
              <div className="search-dropdown-item disabled">
                ... and {filteredImages.length - 100} more files
              </div>
            )}
          </div>
        )}
      </div>
      <div className="search-info">
        <div className="search-info-details">
          <span className="search-info-summary">
            {searchSelectedIds.size > 0 ? (
              <>
                {searchSelectedIds.size} selected • Showing {filteredImages.length} of {images.length} images
              </>
            ) : (
              <>
                Showing {filteredImages.length} of {images.length} images
              </>
            )}
          </span>
          <div className="search-info-stats">
            <span className="info-chip">Visible {filteredImages.length.toLocaleString()}</span>
            <span className="info-chip">Selected {searchSelectedIds.size.toLocaleString()}</span>
            <span className="info-chip">Thumb {thumbSize}px</span>
          </div>
        </div>
        <div className="toolbar">
          {searchSelectedIds.size > 0 && (
            <button onClick={() => clearSearchSelection()}>Clear</button>
          )}
          <button onClick={() => setThumbSize(thumbSize - 50)}>-</button>
          <span style={{ minWidth: "60px", textAlign: "center" }}>
            {thumbSize}px
          </span>
          <button onClick={() => setThumbSize(thumbSize + 50)}>+</button>
        </div>
      </div>
    </div>
  );
}
