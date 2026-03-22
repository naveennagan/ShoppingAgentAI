'use client';

import { ShoppingCart, Wifi, Star, Tag, Tv, Smartphone, Phone } from 'lucide-react';

export interface ProductSummary {
  id: string;
  name: string;
  price: number;
  brand: string;
  rating: number;
  promotionalLabel?: string | null;
}

export interface BroadbandSummary {
  id: string;
  name: string;
  downloadSpeed: string;
  uploadSpeed: string;
  monthlyPrice: number;
  contractLength: string;
  promotionalLabel?: string | null;
}

export interface AddonSummary {
  id: string;
  name: string;
  monthlyPrice: number;
  description: string;
  index?: number;
}

export interface TvPackageSummary {
  id: string;
  name: string;
  monthlyPrice: number;
  description: string;
  channelCount: number;
  index?: number;
}

export interface SimPlanSummary {
  id: string;
  name: string;
  monthlyPrice: number;
  description: string;
  maxSpeed: string;
  isUnlimited: boolean;
  index?: number;
}

export interface HomePhoneSummary {
  id: string;
  name: string;
  monthlyPrice: number;
  description: string;
  includesCallsTo: string;
  index?: number;
}

export interface SummaryCardProps {
  type: 'product' | 'broadband' | 'addon' | 'tv_package' | 'sim_plan' | 'home_phone';
  data: ProductSummary | BroadbandSummary | AddonSummary | TvPackageSummary | SimPlanSummary | HomePhoneSummary;
  onAction: (actionType: string, id: string) => void;
}

export default function SummaryCard({ type, data, onAction }: SummaryCardProps) {
  if (type === 'addon') {
    const addon = data as AddonSummary;
    return (
      <div style={{
        background: 'var(--surface)',
        borderRadius: '12px',
        border: '1px solid var(--border)',
        padding: '0.85rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.4rem',
        minWidth: '170px',
        maxWidth: '200px',
        position: 'relative',
        transition: 'box-shadow 0.2s, transform 0.2s',
      }}
        onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
      >
        {addon.index != null && (
          <span style={{
            position: 'absolute', top: '0.5rem', right: '0.5rem',
            background: '#e5e7eb', color: '#374151', fontSize: '0.65rem', fontWeight: 700,
            width: '20px', height: '20px', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {addon.index}
          </span>
        )}

        <h4 style={{
          margin: 0, fontSize: '0.82rem', fontWeight: 700, color: '#1f2937',
          lineHeight: 1.3, paddingRight: addon.index != null ? '1.8rem' : 0,
        }}>
          {addon.name}
        </h4>

        <p style={{
          margin: 0, fontSize: '0.7rem', color: 'var(--muted)', lineHeight: 1.4,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {addon.description}
        </p>

        <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary)' }}>
          £{addon.monthlyPrice.toFixed(2)}<span style={{ fontSize: '0.7rem', fontWeight: 500, color: 'var(--muted)' }}>/mo</span>
        </span>

        <button
          onClick={() => onAction('add_addon', addon.id)}
          style={{
            marginTop: 'auto', padding: '0.4rem 0.5rem',
            background: 'var(--primary)', color: 'white', border: 'none',
            borderRadius: '8px', fontSize: '0.72rem', fontWeight: 600,
            cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: '0.3rem', transition: 'background 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--primary-hover)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--primary)')}
        >
          <ShoppingCart size={12} /> Add
        </button>
      </div>
    );
  }

  if (type === 'tv_package') {
    const tv = data as TvPackageSummary;
    return (
      <ServiceCard
        icon={<Tv size={12} />}
        index={tv.index}
        name={tv.name}
        description={tv.description}
        monthlyPrice={tv.monthlyPrice}
        actionType="select_tv_package"
        id={tv.id}
        onAction={onAction}
        stats={[{ label: 'Channels', value: String(tv.channelCount) }]}
      />
    );
  }

  if (type === 'sim_plan') {
    const sim = data as SimPlanSummary;
    return (
      <ServiceCard
        icon={<Smartphone size={12} />}
        index={sim.index}
        name={sim.name}
        description={sim.description}
        monthlyPrice={sim.monthlyPrice}
        actionType="select_sim_plan"
        id={sim.id}
        onAction={onAction}
        stats={[
          { label: 'Speed', value: sim.maxSpeed },
          { label: 'Data', value: sim.isUnlimited ? 'Unlimited' : 'Limited' },
        ]}
      />
    );
  }

  if (type === 'home_phone') {
    const phone = data as HomePhoneSummary;
    return (
      <ServiceCard
        icon={<Phone size={12} />}
        index={phone.index}
        name={phone.name}
        description={phone.description}
        monthlyPrice={phone.monthlyPrice}
        actionType="select_home_phone"
        id={phone.id}
        onAction={onAction}
        stats={[{ label: 'Calls to', value: phone.includesCallsTo }]}
      />
    );
  }

  if (type === 'product') {
    const product = data as ProductSummary;
    return (
      <div style={{
        background: 'var(--surface)',
        borderRadius: '12px',
        border: '1px solid var(--border)',
        padding: '0.85rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        minWidth: '180px',
        maxWidth: '220px',
        position: 'relative',
        transition: 'box-shadow 0.2s, transform 0.2s',
      }}
        onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
      >
        {product.promotionalLabel && (
          <span style={{
            position: 'absolute', top: '0.5rem', right: '0.5rem',
            background: 'linear-gradient(135deg, var(--primary), var(--primary-hover))',
            color: 'white', fontSize: '0.65rem', fontWeight: 700,
            padding: '0.15rem 0.5rem', borderRadius: '999px',
          }}>
            <Tag size={9} style={{ marginRight: '2px', verticalAlign: 'middle' }} />
            {product.promotionalLabel}
          </span>
        )}

        <h4 style={{
          margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#1f2937',
          lineHeight: 1.3, paddingRight: product.promotionalLabel ? '4.5rem' : 0,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {product.name}
        </h4>

        <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{product.brand}</span>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary)' }}>
            £{product.price.toFixed(2)}
          </span>
          <span style={{ fontSize: '0.75rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '2px' }}>
            <Star size={12} fill="#f59e0b" stroke="#f59e0b" />
            {product.rating.toFixed(1)}
          </span>
        </div>

        <button
          onClick={() => onAction('add_to_cart', product.id)}
          style={{
            marginTop: 'auto', padding: '0.45rem 0.6rem',
            background: 'var(--primary)', color: 'white', border: 'none',
            borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600,
            cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: '0.3rem', transition: 'background 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--primary-hover)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--primary)')}
        >
          <ShoppingCart size={13} /> Add to Cart
        </button>
      </div>
    );
  }

  const plan = data as BroadbandSummary;
  return (
    <div style={{
      background: 'var(--surface)',
      borderRadius: '12px',
      border: '1px solid var(--border)',
      padding: '0.85rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
      minWidth: '200px',
      maxWidth: '240px',
      position: 'relative',
      transition: 'box-shadow 0.2s, transform 0.2s',
    }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
    >
      {plan.promotionalLabel && (
        <span style={{
          position: 'absolute', top: '0.5rem', right: '0.5rem',
          background: 'linear-gradient(135deg, var(--primary), var(--primary-hover))',
          color: 'white', fontSize: '0.65rem', fontWeight: 700,
          padding: '0.15rem 0.5rem', borderRadius: '999px',
        }}>
          <Tag size={9} style={{ marginRight: '2px', verticalAlign: 'middle' }} />
          {plan.promotionalLabel}
        </span>
      )}

      <h4 style={{
        margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#1f2937',
        lineHeight: 1.3, paddingRight: plan.promotionalLabel ? '4.5rem' : 0,
      }}>
        {plan.name}
      </h4>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <StatLabel label="Download" value={plan.downloadSpeed} />
        <StatLabel label="Upload" value={plan.uploadSpeed} />
        <StatLabel label="Contract" value={plan.contractLength} />
      </div>

      <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary)' }}>
        £{plan.monthlyPrice.toFixed(2)}<span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--muted)' }}>/mo</span>
      </span>

      <button
        onClick={() => onAction('add_broadband_to_cart', plan.id)}
        style={{
          marginTop: 'auto', padding: '0.45rem 0.6rem',
          background: 'var(--primary)', color: 'white', border: 'none',
          borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600,
          cursor: 'pointer', display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: '0.3rem', transition: 'background 0.2s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--primary-hover)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'var(--primary)')}
      >
        <Wifi size={13} /> Select Plan
      </button>
    </div>
  );
}

function StatLabel({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: '0.65rem', color: 'var(--muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{value}</div>
    </div>
  );
}

function ServiceCard({ icon, index, name, description, monthlyPrice, actionType, id, onAction, stats }: {
  icon: React.ReactNode;
  index?: number;
  name: string;
  description: string;
  monthlyPrice: number;
  actionType: string;
  id: string;
  onAction: (actionType: string, id: string) => void;
  stats?: { label: string; value: string }[];
}) {
  return (
    <div style={{
      background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)',
      padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.4rem',
      minWidth: '180px', maxWidth: '210px', position: 'relative',
      transition: 'box-shadow 0.2s, transform 0.2s',
    }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
    >
      {index != null && (
        <span style={{
          position: 'absolute', top: '0.5rem', right: '0.5rem',
          background: '#e5e7eb', color: '#374151', fontSize: '0.65rem', fontWeight: 700,
          width: '20px', height: '20px', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {index}
        </span>
      )}
      <h4 style={{
        margin: 0, fontSize: '0.82rem', fontWeight: 700, color: '#1f2937',
        lineHeight: 1.3, paddingRight: index != null ? '1.8rem' : 0,
      }}>
        {name}
      </h4>
      <p style={{
        margin: 0, fontSize: '0.7rem', color: 'var(--muted)', lineHeight: 1.4,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>
        {description}
      </p>
      {stats && stats.length > 0 && (
        <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
          {stats.map(s => <StatLabel key={s.label} label={s.label} value={s.value} />)}
        </div>
      )}
      <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary)' }}>
        {monthlyPrice === 0 ? 'Free' : <>£{monthlyPrice.toFixed(2)}<span style={{ fontSize: '0.7rem', fontWeight: 500, color: 'var(--muted)' }}>/mo</span></>}
      </span>
      <button
        onClick={() => onAction(actionType, id)}
        style={{
          marginTop: 'auto', padding: '0.4rem 0.5rem',
          background: 'var(--primary)', color: 'white', border: 'none',
          borderRadius: '8px', fontSize: '0.72rem', fontWeight: 600,
          cursor: 'pointer', display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: '0.3rem', transition: 'background 0.2s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--primary-hover)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'var(--primary)')}
      >
        {icon} Select
      </button>
    </div>
  );
}
