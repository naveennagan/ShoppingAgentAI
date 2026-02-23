interface ComparisonData {
    products: string[];
    rows: { field: string; values: string[] }[];
}

export default function ComparisonTable({ comparison }: { comparison: ComparisonData }) {
    const { products, rows } = comparison;
    const colW = `${Math.floor(100 / (products.length + 1))}%`;

    return (
        <div style={{ overflowX: 'auto', width: '100%', marginTop: '0.25rem' }}>
            <table style={{
                width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem',
                background: '#fff', borderRadius: '10px', overflow: 'hidden',
                boxShadow: '0 1px 4px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb'
            }}>
                <thead>
                    <tr style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-hover))' }}>
                        <th style={{ padding: '0.55rem 0.75rem', textAlign: 'left', color: 'rgba(255,255,255,0.7)', fontWeight: 600, width: colW, borderRight: '1px solid rgba(255,255,255,0.15)' }}></th>
                        {products.map((name, i) => (
                            <th key={i} style={{
                                padding: '0.55rem 0.75rem', textAlign: 'center', color: 'white',
                                fontWeight: 700, width: colW,
                                borderRight: i < products.length - 1 ? '1px solid rgba(255,255,255,0.15)' : 'none'
                            }}>{name}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, ri) => (
                        <tr key={ri} style={{ background: ri % 2 === 0 ? '#fafafa' : '#fff' }}>
                            <td style={{
                                padding: '0.5rem 0.75rem', fontWeight: 600, color: '#525252',
                                borderRight: '1px solid #e5e7eb',
                                borderBottom: ri < rows.length - 1 ? '1px solid #f0f0f0' : 'none',
                                whiteSpace: 'nowrap'
                            }}>{row.field}</td>
                            {row.values.map((val, vi) => (
                                <td key={vi} style={{
                                    padding: '0.5rem 0.75rem', textAlign: 'center',
                                    borderRight: vi < row.values.length - 1 ? '1px solid #f0f0f0' : 'none',
                                    borderBottom: ri < rows.length - 1 ? '1px solid #f0f0f0' : 'none',
                                    fontWeight: row.field.toLowerCase() === 'price' ? 700 : 400,
                                    color: row.field.toLowerCase() === 'price' ? 'var(--primary)' : '#1f2937',
                                }}>{val}</td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
