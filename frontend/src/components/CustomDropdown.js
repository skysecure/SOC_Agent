import React, { useState, useRef, useEffect } from 'react';
import './CustomDropdown.css';

const CustomDropdown = ({ options, value, onChange, placeholder = "Select an option" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const selectedOption = options.find(option => option.key === value) || { key: '', displayName: placeholder };

  const handleSelect = (option) => {
    onChange(option.key);
    setIsOpen(false);
  };

  return (
    <div className="custom-dropdown" ref={dropdownRef}>
      <div 
        className={`dropdown-header ${isOpen ? 'open' : ''}`} 
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="dropdown-selected">{selectedOption.displayName}</span>
        <span className={`dropdown-arrow ${isOpen ? 'up' : 'down'}`}>▼</span>
      </div>
      
      {isOpen && (
        <div className="dropdown-list">
          {options.map(option => (
            <div 
              key={option.key}
              className={`dropdown-item ${value === option.key ? 'selected' : ''}`}
              onClick={() => handleSelect(option)}
            >
              {option.displayName}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomDropdown;