import { useRef, useEffect, useState } from 'react';
import './SettingsWindow.css';
import './Modal.css';
import { UserModel, SubscriptionModel, PlanModel } from "wc-shared";
import { SERVER_URL } from "./constants";

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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteButtonRect, setDeleteButtonRect] = useState<DOMRect | null>(null);
  const deleteConfirmPopoverRef = useRef<HTMLDivElement>(null);

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

  const handleDeleteUser = async () => {
    try {
      const response = await fetch(`${SERVER_URL}/api/delete_user`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await response.json();
      if (data.status === 'success') {
        // Reload the page to return to login
        window.location.reload();
      } else {
        console.error('Error deleting user:', data.error);
      }
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const fetchUserSubscription = async () => {
    try {
      const response = await fetch(`${SERVER_URL}/sub/get_subscription`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.status === 'success') {
        setSubscription(SubscriptionModel.fromObject(data.subscription));
        setPlan(PlanModel.fromObject(data.plan));
      } else {
        console.error('Error fetching user subscription:', data.error);
      }
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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (deleteConfirmPopoverRef.current && !deleteConfirmPopoverRef.current.contains(event.target as Node)) {
        setShowDeleteConfirm(false);
      }
    };

    if (showDeleteConfirm) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDeleteConfirm]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" ref={contentRef}>
        <div className="modal-content-header">
          <h2>Settings</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="settings-content">
          <p>Logged in as: {user.email}</p>

          {subscription && plan && (
            <div className="settings-subscription-info">
              <h3>Subscription</h3>
              <p>Plan: {plan.name}</p>
              <p>Start Date: {subscription.startDate.toLocaleDateString()}</p>
              {/* Only show the end date for paid plans that can expire */}
              {plan.tier > 0 && <p>End Date: {subscription.endDate.toLocaleDateString()}</p>}
            </div>
          )}

          <button className="logout-button" onClick={handleLogout}>Log Out</button>
          <button
            className="delete-user-button"
            onClick={(e) => {
              e.stopPropagation();
              const rect = e.currentTarget.getBoundingClientRect();
              setDeleteButtonRect(rect);
              setShowDeleteConfirm(true);
            }}
          >
            Delete Account
          </button>

          {showDeleteConfirm && deleteButtonRect && (
            <div
              ref={deleteConfirmPopoverRef}
              className="action-confirm-popover"
              style={{
                top: `${deleteButtonRect.bottom + 5}px`,
                left: `${deleteButtonRect.left - 100}px`,
              }}
            >
              <p>Are you sure you want to delete your account?</p>
              <p>This action is irreversible.</p>
              <div className="action-confirm-actions">
                <button
                  className="action-confirm-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteUser();
                    setShowDeleteConfirm(false);
                  }}
                >
                  Yes, Delete
                </button>
                <button
                  className="action-cancel-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteConfirm(false);
                  }}
                >
                  No, Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SettingsWindow;
