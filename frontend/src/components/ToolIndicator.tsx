interface Props {
  label: string;
}

export default function ToolIndicator({ label }: Props) {
  return (
    <div className="msg ai">
      <div className="msg-avatar">⚽</div>
      <div className="msg-body">
        <div className="tool-indicator">
          <div className="tool-spinner"></div>
          <span>{label}</span>
        </div>
      </div>
    </div>
  );
}
