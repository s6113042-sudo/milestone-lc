import { STATUS_LABELS, STATUS_COLORS } from '../constants';

interface Props {
  status: number;
}

export default function StatusBadge({ status }: Props) {
  const label = STATUS_LABELS[status] ?? '未知';
  const color = STATUS_COLORS[status] ?? '#6b7280';

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 10px',
        borderRadius: '999px',
        fontSize: '12px',
        fontWeight: 600,
        color: '#fff',
        background: color,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  );
}
