import { useRef, useEffect, useState } from 'react';
import './SettingsWindow.css';
import './Modal.css';
import { UserModel } from "../../shared/types/src/models/user";
import { SERVER_URL } from "./constants";
import { SubscriptionModel, PlanModel } from "../../shared/types/src/models/subscription";

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
  const [subscription, setSubscription] = useState<SubscriptionModel | null>(null);
  const [plan, setPlan] = useState<PlanModel | null>(null);

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

  const fetchUserSubscription = async () => {
    try {
      const response = await fetch(`${SERVER_URL}/sub/get_subscription`, {
        credentials: 'include',
      });
      const data = await response.json();
      setSubscription(data.subscription);
      setPlan(data.plan);
    } catch (error) {
      console.error('Error fetching user subscription:', error);
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

  useEffect(() => {
    // Weird that this runs when the modal is closed
    // It's probably because the model exists but isn't... like... visible
    if (isOpen) {
      fetchUserSubscription();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" ref={contentRef}>
        <div className="modal-content-header">
          <h2>Settings</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {subscription && plan && (
          <div className="subscription-info">
            <h3>Subscription</h3>
            <p>Plan: {plan.name}</p>
            <p>Start Date: {subscription.startDate.toLocaleDateString()}</p>
            <p>End Date: {subscription.endDate.toLocaleDateString()}</p>
          </div>
        )}

        <p className="settings-window-email">Email: <span className="settings-window-email-value">{user.email}</span></p>
        <button className="logout-button" onClick={handleLogout}>Log Out</button>
      </div>
    </div>
  );
}

export default SettingsWindow;
