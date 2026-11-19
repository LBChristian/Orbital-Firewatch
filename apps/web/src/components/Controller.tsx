import { CONTROLLER } from '../game/content/missionVoice';

/** One line from the flight controller. Kept short on purpose; the details live elsewhere. */
export function ControllerLine({ text, tone = 'calm' }: { text: string; tone?: 'calm' | 'urgent' | 'good' }) {
  return (
    <div className={`controller tone-${tone}`} role="status" aria-live="polite">
      <span className="ctl-avatar" aria-hidden="true">
        {CONTROLLER.name[0]}
      </span>
      <p>
        <span className="ctl-name">
          {CONTROLLER.name}, {CONTROLLER.role.toLowerCase()}
        </span>
        <span className="ctl-text">{text}</span>
      </p>
    </div>
  );
}
