import './SettingsWindow.css';
import './Modal.css';
import { UserModel } from "../../shared/types/src/models/user";
import { SERVER_URL } from "./constants";
import { useRef } from 'react';
import { useEffect } from 'react';

// A simple component that shows the user's settings
// - User's email
// - Log out button

interface SettingsWindowProps {
  user: UserModel;
  isOpen: boolean;
  onClose: () => void;
}

const SettingsWindow = ({ user, isOpen, onClose }: SettingsWindowProps) => {
  const contentRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    try {
      // Call our backend logout endpoint
      await fetch(`${SERVER_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
      // Reload the page to return to login
      window.location.reload();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contentRef.current && !contentRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" ref={contentRef}>
        <div className="modal-content-header">
          <h2>Settings</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <p className="settings-window-email">Email: <span className="settings-window-email-value">{user.email}</span></p>
        <button className="logout-button" onClick={handleLogout}>Log Out</button>
      </div>
    </div>
  );
}

export default SettingsWindow;
