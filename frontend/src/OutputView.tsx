import './OutputView.css';

interface OutputViewProps {
  text: string;
}

const OutputView = ({ text }: OutputViewProps) => {
  return (
    <div className="output-view-container">
      <div className="output-view-content">
        <div className="output-view-text">{text}</div>
      </div>
    </div>
  );
};

export default OutputView;
