import type { SurveyQuestion } from '../config/contracts';
import '../styles/QuestionCard.css';

type Props = {
  question: SurveyQuestion;
  selectedOption: number | null;
  onSelect: (optionIndex: number) => void;
  disabled?: boolean;
};

export function QuestionCard({ question, selectedOption, onSelect, disabled }: Props) {
  return (
    <div className="question-card">
      <div className="question-meta">
        <span className="question-pill">Q{question.id + 1}</span>
        <h3>{question.title}</h3>
        <p>{question.description}</p>
      </div>
      <div className="options-grid">
        {question.options.map((option, index) => {
          const isSelected = selectedOption === index;
          return (
            <button
              key={option}
              type="button"
              className={`option-button ${isSelected ? 'selected' : ''}`}
              onClick={() => onSelect(index)}
              disabled={disabled}
            >
              <span className="option-index">{index + 1}</span>
              <span className="option-label">{option}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
