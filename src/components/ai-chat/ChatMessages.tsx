'use client';

import { ChatBubble, Chip, ComparisonTable, TypingIndicator } from '../ui';
import SummaryCard, { ProductSummary, BroadbandSummary, AddonSummary, TvPackageSummary, SimPlanSummary, HomePhoneSummary } from '../SummaryCard';
import SuggestionChip from '../SuggestionChip';
import type { ChatMessage } from './types';
import { QUICK_ACTIONS } from './constants';

interface ChatMessagesProps {
    messages: ChatMessage[];
    isTyping: boolean;
    showQuickActions: boolean;
    panelWidth: number;
    messagesEndRef: React.RefObject<HTMLDivElement | null>;
    onSendMessage: (text: string) => void;
    onCardAction: (actionType: string, id: string) => void;
}




export default function ChatMessages({
    messages, isTyping, showQuickActions, panelWidth,
    messagesEndRef, onSendMessage, onCardAction,
}: ChatMessagesProps) {
    return (
        <div className="chat-messages">
            {messages.map((msg, i) => (
                <div key={i} style={{
                    display: 'flex', flexDirection: 'column',
                    alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    gap: '0.5rem'
                }}>
                    <ChatBubble role={msg.role}>{msg.text}</ChatBubble>

                    {msg.comparison && Array.isArray(msg.comparison.rows) && msg.comparison.rows.length > 0 && (
                        <div style={{ width: '100%', maxWidth: `${panelWidth - 40}px` }}>
                            <ComparisonTable comparison={msg.comparison} />
                        </div>
                    )}

                    {msg.summaryCards && msg.summaryCards.length > 0 && (
                        <div style={{ width: '100%', maxWidth: `${panelWidth - 40}px` }}>
                            <div style={{
                                display: 'flex', gap: '0.6rem', overflowX: 'auto',
                                paddingBottom: '0.5rem', paddingTop: '0.25rem',
                                scrollbarWidth: 'thin', scrollbarColor: '#d1d5db transparent'
                            }}>
                                {msg.summaryCards.map(card => {
                                    let cardData: ProductSummary | BroadbandSummary | AddonSummary | TvPackageSummary | SimPlanSummary | HomePhoneSummary;
                                    if (card.type === 'product') {
                                        cardData = { id: card.id, name: card.name, price: card.price ?? 0, brand: card.brand ?? '', rating: card.rating ?? 0, promotionalLabel: card.promotionalLabel } as ProductSummary;
                                    } else if (card.type === 'addon') {
                                        cardData = { id: card.id, name: card.name, monthlyPrice: card.monthlyPrice ?? 0, description: card.description ?? '', index: card.index } as AddonSummary;
                                    } else if (card.type === 'tv_package') {
                                        cardData = { id: card.id, name: card.name, monthlyPrice: card.monthlyPrice ?? 0, description: card.description ?? '', channelCount: card.channelCount ?? 0, index: card.index } as TvPackageSummary;
                                    } else if (card.type === 'sim_plan') {
                                        cardData = { id: card.id, name: card.name, monthlyPrice: card.monthlyPrice ?? 0, description: card.description ?? '', maxSpeed: card.maxSpeed ?? '', isUnlimited: card.isUnlimited ?? false, index: card.index } as SimPlanSummary;
                                    } else if (card.type === 'home_phone') {
                                        cardData = { id: card.id, name: card.name, monthlyPrice: card.monthlyPrice ?? 0, description: card.description ?? '', includesCallsTo: card.includesCallsTo ?? '', index: card.index } as HomePhoneSummary;
                                    } else {
                                        cardData = { id: card.id, name: card.name, downloadSpeed: card.downloadSpeed ?? '', uploadSpeed: card.uploadSpeed ?? '', monthlyPrice: card.monthlyPrice ?? 0, contractLength: card.contractLength ?? '', promotionalLabel: card.promotionalLabel } as BroadbandSummary;
                                    }
                                    return (
                                        <SummaryCard
                                            key={card.id}
                                            type={card.type}
                                            data={cardData}
                                            onAction={onCardAction}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {msg.role === 'ai' && i > 0 && msg.suggestedActions && msg.suggestedActions.length > 0 && (
                        <div style={{
                            display: 'flex', flexWrap: 'wrap', gap: '0.4rem',
                            paddingTop: '0.25rem', maxWidth: `${panelWidth - 40}px`,
                            maxHeight: '150px', overflowY: 'auto',
                        }}>
                            {msg.suggestedActions.map(label => (
                                <SuggestionChip key={label} label={label} onClick={onSendMessage} />
                            ))}
                        </div>
                    )}
                </div>
            ))}

            {isTyping && <TypingIndicator />}

            {showQuickActions && messages.length === 1 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                    {QUICK_ACTIONS.map(a => (
                        <Chip key={a.label} label={a.label} onClick={() => onSendMessage(a.msg)} />
                    ))}
                </div>
            )}

            <div ref={messagesEndRef} />
        </div>
    );
}
