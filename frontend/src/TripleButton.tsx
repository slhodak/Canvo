import './TripleButton.css';

interface TripleButtonProps {
  onChange: (choice: number) => void;
}

const TripleButton = ({ onChange }: TripleButtonProps) => {
  return (
    <div className="triple-button-container">
      <button
        className="triple-button-square-left"
        onClick={() => onChange(0)}
      >
      </button>

      <button
        className="triple-button-square-center"
        onClick={() => onChange(1)}
      >
      </button>

      <button
        className="triple-button-square-right"
        onClick={() => onChange(2)}
      >
      </button>
    </div >
  );
};

export default TripleButton;
