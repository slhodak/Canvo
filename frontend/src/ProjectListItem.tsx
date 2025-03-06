import { useState, useEffect, useRef } from 'react';
import { ProjectModel } from 'wc-shared';
import TrashIcon from './assets/TrashIcon';

interface ProjectListItemProps {
  highlighted: boolean;
  project: ProjectModel;
  deleteProject: (projectId: string) => void;
  setProject: (project: ProjectModel) => void;
}

const ProjectListItem = ({ highlighted, project, deleteProject, setProject }: ProjectListItemProps) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteButtonRect, setDeleteButtonRect] = useState<DOMRect | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
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

  return (
    <div
      role="button"
      tabIndex={0}
      className={`project-preview-container ${highlighted ? 'highlighted-project-preview' : ''}`}
      onClick={() => setProject(project)}
    >
      <span>{project.title.length > 0 ? project.title : 'untitled'}</span>
      <button
        className="project-preview-delete-button"
        onClick={(e) => {
          e.stopPropagation();
          const rect = e.currentTarget.getBoundingClientRect();
          setDeleteButtonRect(rect);
          setShowDeleteConfirm(true);
        }}
      >
        <TrashIcon />
      </button>
      {showDeleteConfirm && deleteButtonRect && (
        <div
          ref={popoverRef}
          className="delete-confirm-popover"
          style={{
            top: `${deleteButtonRect.bottom + 5}px`,
            left: `${deleteButtonRect.left - 100}px`,
          }}
        >
          <p>Delete this project?</p>
          <div className="delete-confirm-actions">
            <button
              className="project-preview-confirm-button"
              onClick={(e) => {
                e.stopPropagation();
                deleteProject(project.projectId);
                setShowDeleteConfirm(false);
              }}
            >
              Delete
            </button>
            <button
              className="project-preview-cancel-button"
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteConfirm(false);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProjectListItem;
