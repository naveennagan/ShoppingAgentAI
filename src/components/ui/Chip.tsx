interface ChipProps {
    label: string;
    onClick: () => void;
}

export default function Chip({ label, onClick }: ChipProps) {
    return (
        <button className="chip" onClick={onClick}>
            {label}
        </button>
    );
}
